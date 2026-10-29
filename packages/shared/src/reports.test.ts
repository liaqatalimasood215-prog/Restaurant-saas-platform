import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NO_TAX, calculateBill, summarizeDay, type Order, type OrderItem, type PaymentEntry } from './index';

const scoped = { restaurantId: 'r', branchId: 'b' };
let n = 0;

function line(name: string, unitPrice: number, quantity: number, extra: Partial<OrderItem> = {}): OrderItem {
  return {
    ...scoped,
    id: `i${++n}`,
    orderId: '',
    menuItemId: null,
    name,
    variantName: null,
    modifiers: [],
    unitPrice,
    quantity,
    unit: 'piece',
    lineTotal: unitPrice * quantity,
    note: '',
    roundNo: 1,
    stationId: 's',
    ticketId: 't',
    isVoid: false,
    voidReason: null,
    voidedBy: null,
    voidedAt: null,
    ...extra,
  };
}

function pay(kind: PaymentEntry['kind'], method: PaymentEntry['method'], amount: number, tipAmount = 0, reason: string | null = null): PaymentEntry {
  return { ...scoped, id: `p${++n}`, orderId: '', kind, method, amount, tipAmount, cashReceived: null, changeGiven: null, reference: null, receivedBy: 'cashier', relatedPaymentId: null, reason, createdAt: '' };
}

function order(o: Partial<Order> & Pick<Order, 'type' | 'status' | 'items'>): Order {
  const pricing = { tax: NO_TAX, serviceChargeBps: 0, roundToRupee: true, deliveryFee: 0 };
  const totals = calculateBill({
    orderType: o.type,
    lines: o.items,
    discount: o.discount?.input ?? null,
    deliveryFee: pricing.deliveryFee,
    settings: pricing,
  });
  const payments = o.payments ?? [];
  const paidTotal = payments.reduce((s, p) => s + (p.kind === 'PAYMENT' ? p.amount : p.kind === 'REVERSAL' ? -p.amount : 0), 0);
  return {
    ...scoped,
    id: `o${++n}`,
    channel: 'POS',
    businessDate: '2026-10-30',
    dailyNumber: n,
    invoiceNumber: null,
    tableId: null,
    waiterId: null,
    guests: null,
    customerName: null,
    customerPhone: null,
    customerAddress: null,
    riderId: null,
    prepMinutes: null,
    note: '',
    tickets: [],
    discount: null,
    pricing,
    totals,
    paidTotal,
    refundedTotal: 0,
    tipTotal: 0,
    billRequest: null,
    trackingToken: null,
    cashSettlementId: null,
    receiptPrints: 0,
    history: [],
    createdBy: null,
    createdAt: '',
    ...o,
    payments,
  };
}

test('Test A step 7: Rs. 5,900 cash dine-in, Rs. 100 tip to the waiter, Rs. 6,000 cash received, top items', () => {
  const table5 = order({
    type: 'DINE_IN',
    status: 'PAID',
    waiterId: 'imran',
    items: [
      line('Classic Pizza', 85_000, 2),
      line('Zinger Burger', 45_000, 4),
      line('Loaded Fries', 35_000, 2),
      line('Alfredo Pasta', 60_000, 2),
      line('Cold Drink', 12_500, 4),
    ],
    payments: [pay('PAYMENT', 'CASH', 590_000, 10_000)],
  });
  const day = summarizeDay([table5]);
  assert.equal(day.sales, 590_000);
  assert.equal(day.paidOrders, 1);
  assert.deepEqual(day.byType.find((t) => t.type === 'DINE_IN'), { type: 'DINE_IN', orders: 1, sales: 590_000 });
  assert.equal(day.byMethod.find((m) => m.method === 'CASH')?.amount, 590_000);
  assert.equal(day.tips, 10_000);
  assert.deepEqual(day.tipsByWaiter, [{ waiterId: 'imran', amount: 10_000 }]);
  assert.equal(day.cashReceived, 600_000);
  assert.deepEqual(day.topItems.slice(0, 3).map((i) => `${i.quantity} ${i.name}`), ['4 Zinger Burger', '2 Classic Pizza', '2 Alfredo Pasta']);
});

test('open bills, discounts with who and why, voids, refunds and cancelled orders are counted apart', () => {
  const discounted = order({
    type: 'TAKEAWAY',
    status: 'PICKED_UP',
    items: [line('Beef Burger', 55_000, 2)],
    discount: { input: { kind: 'FIXED', amount: 10_000 }, reason: 'Staff meal', givenBy: 'owner' },
    payments: [pay('PAYMENT', 'CARD', 100_000), pay('REFUND', 'CARD', 45_000, 0, 'Cold burger')],
  });
  const withVoid = order({
    type: 'DINE_IN',
    status: 'OPEN',
    items: [line('Wings', 55_000, 1), line('Cold Drink', 12_500, 1, { isVoid: true, voidReason: 'Wrong item', voidedBy: 'manager' })],
  });
  const cancelled = order({
    type: 'DELIVERY',
    status: 'CANCELLED',
    items: [line('Classic Pizza', 85_000, 1)],
    history: [{ fromStatus: 'ACCEPTED', toStatus: 'CANCELLED', changedBy: 'cashier', reason: 'Customer called', changedAt: '' }],
  });
  const day = summarizeDay([discounted, withVoid, cancelled]);
  assert.equal(day.sales, 100_000);
  assert.equal(day.openOrders, 1);
  assert.equal(day.amountDue, 55_000);
  assert.deepEqual(day.discounts.map((d) => [d.amount, d.reason, d.by]), [[10_000, 'Staff meal', 'owner']]);
  assert.deepEqual(day.voids.map((v) => [v.item, v.amount, v.reason, v.by]), [['Cold Drink', 12_500, 'Wrong item', 'manager']]);
  assert.equal(day.refundTotal, 45_000);
  assert.equal(day.byMethod.find((m) => m.method === 'CARD')?.amount, 100_000, 'a refund is shown apart; the payment stays');
  assert.deepEqual(day.cancelled.map((c) => [c.type, c.reason]), [['DELIVERY', 'Customer called']]);
  assert.ok(!day.topItems.some((i) => i.name === 'Classic Pizza'), 'a cancelled order sells nothing');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_TAX,
  amountDue,
  calculateBill,
  can,
  cashChange,
  checkPaymentAmount,
  checkRefund,
  checkTransition,
  formatPaisa,
  isFullyPaid,
  summarizeMoney,
  tableStatusFor,
  unitPriceFor,
  type BillLine,
  type BillSettings,
  type MoneyEntry,
} from './index';

// DEMO test data (MASTER_PROMPT.md §12): tax 0%, service charge off.
const DEMO_SETTINGS: BillSettings = { tax: NO_TAX, serviceChargeBps: 0, roundToRupee: true };
const ROUND_1: BillLine[] = [
  { unitPrice: 85000, quantity: 2 }, // Classic Pizza (Medium)
  { unitPrice: 45000, quantity: 4 }, // Zinger Burger
  { unitPrice: 35000, quantity: 2 }, // Loaded Fries
];
const ROUND_2: BillLine[] = [
  { unitPrice: 60000, quantity: 2 }, // Alfredo Pasta
  { unitPrice: 12500, quantity: 4 }, // Cold Drink
];

test('Test A: Table 5 is Rs. 4,200 after round 1 and Rs. 5,900 after round 2', () => {
  const r1 = calculateBill({ orderType: 'DINE_IN', lines: ROUND_1, settings: DEMO_SETTINGS });
  assert.equal(formatPaisa(r1.total), 'Rs. 4,200');
  const r2 = calculateBill({ orderType: 'DINE_IN', lines: [...ROUND_1, ...ROUND_2], settings: DEMO_SETTINGS });
  assert.equal(formatPaisa(r2.total), 'Rs. 5,900');
  assert.equal(r2.rounding, 0);
});

test('Test A: Rs. 6,000 cash with a Rs. 100 tip → change Rs. 0, order paid, table free', () => {
  const total = 590000;
  const due = amountDue(total, 0);
  assert.deepEqual(checkPaymentAmount(due, due), { ok: true });
  assert.equal(cashChange({ amount: due, tipAmount: 10000, cashReceived: 600000 }), 0);
  const money = summarizeMoney([{ kind: 'PAYMENT', method: 'CASH', amount: due, tipAmount: 10000 }]);
  assert.deepEqual(money, { paidTotal: 590000, refundedTotal: 0, tipTotal: 10000 });
  const paid = isFullyPaid(total, money.paidTotal);
  assert.equal(checkTransition({ type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'PAID', role: 'CASHIER', isFullyPaid: paid }).ok, true);
  assert.equal(tableStatusFor('PAID'), 'FREE');
});

test('Test B: only Owner/Manager refund; refunds are new entries; the payment stays unchanged', () => {
  assert.equal(can('CASHIER', 'payment.refund'), false);
  assert.equal(can('MANAGER', 'payment.refund'), true);
  const payment: MoneyEntry = { kind: 'PAYMENT', method: 'CASH', amount: 590000, tipAmount: 10000 };
  const before = { ...payment };
  assert.deepEqual(checkRefund({ amount: 45000, paidTotal: 590000, refundedTotal: 0, reason: 'Cold burger' }), {
    ok: true,
  });
  const money = summarizeMoney([payment, { kind: 'REFUND', method: 'CASH', amount: 45000, tipAmount: 0 }]);
  assert.deepEqual(money, { paidTotal: 590000, refundedTotal: 45000, tipTotal: 10000 });
  assert.deepEqual(payment, before);
});

test('Test B: a voided item is removed from the bill', () => {
  const lines = [...ROUND_1, { unitPrice: 60000, quantity: 1, isVoid: true }];
  assert.equal(calculateBill({ orderType: 'DINE_IN', lines, settings: DEMO_SETTINGS }).total, 420000);
});

test('Test C: service charge 10% and an EXAMPLE tax of 16% follow the §8 formula', () => {
  const bill = calculateBill({
    orderType: 'DINE_IN',
    lines: [...ROUND_1, ...ROUND_2],
    settings: {
      tax: { rateBps: 1600, pricesIncludeTax: false, appliesToServiceCharge: true, appliesToDeliveryFee: false },
      serviceChargeBps: 1000,
      roundToRupee: true,
    },
  });
  // 5,900 + 590 service charge = 6,490; tax 16% of 6,490 = 1,038.40; 7,528.40 rounds to 7,528.
  assert.deepEqual(bill, {
    itemsSubtotal: 590000,
    discount: 0,
    serviceCharge: 59000,
    tax: 103840,
    taxIncludedInPrices: 0,
    deliveryFee: 0,
    rounding: -40,
    total: 752800,
  });
});

test('tax-inclusive prices: the tax inside the prices is shown, not added', () => {
  const bill = calculateBill({
    orderType: 'DINE_IN',
    lines: [...ROUND_1, ...ROUND_2],
    settings: {
      tax: { rateBps: 1600, pricesIncludeTax: true, appliesToServiceCharge: false, appliesToDeliveryFee: false },
      serviceChargeBps: 0,
      roundToRupee: true,
    },
  });
  assert.equal(bill.total, 590000);
  assert.equal(bill.tax, 0);
  assert.equal(bill.taxIncludedInPrices, 81379); // 5,900 × 16 / 116
});

test('delivery: fee added, no service charge, tax on the fee only when the setting says so', () => {
  const settings: BillSettings = {
    tax: { rateBps: 1600, pricesIncludeTax: false, appliesToServiceCharge: true, appliesToDeliveryFee: true },
    serviceChargeBps: 1000,
    roundToRupee: false,
  };
  const lines: BillLine[] = [
    { unitPrice: 85000, quantity: 1 },
    { unitPrice: 12500, quantity: 1 },
  ];
  const bill = calculateBill({ orderType: 'DELIVERY', lines, deliveryFee: 15000, settings });
  assert.equal(bill.serviceCharge, 0);
  assert.equal(bill.tax, 18000); // 16% of (975 + 150)
  assert.equal(bill.total, 130500);
  const takeaway = calculateBill({ orderType: 'TAKEAWAY', lines, deliveryFee: 15000, settings });
  assert.equal(takeaway.deliveryFee, 0);
});

test('discounts: percent or fixed, never more than the items subtotal', () => {
  const lines = [...ROUND_1, ...ROUND_2];
  const pct = calculateBill({ orderType: 'DINE_IN', lines, discount: { kind: 'PERCENT', bps: 1000 }, settings: DEMO_SETTINGS });
  assert.equal(pct.discount, 59000);
  assert.equal(pct.total, 531000);
  const fixed = calculateBill({ orderType: 'DINE_IN', lines, discount: { kind: 'FIXED', amount: 50000 }, settings: DEMO_SETTINGS });
  assert.equal(fixed.total, 540000);
  assert.throws(() =>
    calculateBill({ orderType: 'DINE_IN', lines, discount: { kind: 'FIXED', amount: 600000 }, settings: DEMO_SETTINGS }),
  );
  assert.throws(() =>
    calculateBill({ orderType: 'DINE_IN', lines, discount: { kind: 'PERCENT', bps: 12000 }, settings: DEMO_SETTINGS }),
  );
});

test('unit price = size price (or base price) + add-ons', () => {
  assert.equal(unitPriceFor({ basePrice: 85000 }), 85000);
  assert.equal(unitPriceFor({ basePrice: 85000, variantPrice: 120000, modifierPrices: [15000, 5000] }), 140000);
  assert.throws(() => unitPriceFor({ basePrice: -1 }));
});

test('split payments: the order is paid only when payments cover the total', () => {
  const total = 590000;
  const entries: MoneyEntry[] = [{ kind: 'PAYMENT', method: 'CARD', amount: 300000, tipAmount: 0 }];
  let money = summarizeMoney(entries);
  assert.equal(isFullyPaid(total, money.paidTotal), false);
  assert.equal(amountDue(total, money.paidTotal), 290000);
  assert.deepEqual(checkPaymentAmount(300000, 290000), { ok: false, reason: 'MORE_THAN_DUE' });
  entries.push({ kind: 'PAYMENT', method: 'WALLET', amount: 290000, tipAmount: 0 });
  money = summarizeMoney(entries);
  assert.equal(isFullyPaid(total, money.paidTotal), true);
});

test('partial refunds never exceed what was paid; a reason is required', () => {
  assert.deepEqual(checkRefund({ amount: 30000, paidTotal: 50000, refundedTotal: 20000, reason: 'x' }), { ok: true });
  assert.deepEqual(checkRefund({ amount: 1, paidTotal: 50000, refundedTotal: 50000, reason: 'x' }), {
    ok: false,
    reason: 'MORE_THAN_PAID',
  });
  assert.deepEqual(checkRefund({ amount: 100, paidTotal: 50000, refundedTotal: 0 }), {
    ok: false,
    reason: 'REASON_REQUIRED',
  });
  assert.deepEqual(checkRefund({ amount: 0, paidTotal: 50000, refundedTotal: 0, reason: 'x' }), {
    ok: false,
    reason: 'INVALID_AMOUNT',
  });
});

test('a reversal cancels a wrongly recorded payment and its tip', () => {
  const money = summarizeMoney([
    { kind: 'PAYMENT', method: 'CARD', amount: 50000, tipAmount: 5000 },
    { kind: 'REVERSAL', method: 'CARD', amount: 50000, tipAmount: 5000 },
  ]);
  assert.deepEqual(money, { paidTotal: 0, refundedTotal: 0, tipTotal: 0 });
});

test('cash must cover payment and tip', () => {
  assert.equal(cashChange({ amount: 45000, tipAmount: 0, cashReceived: 50000 }), 5000);
  assert.throws(() => cashChange({ amount: 45000, tipAmount: 10000, cashReceived: 50000 }));
});

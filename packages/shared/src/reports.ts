import type { OrderType } from './order-status';
import { PAYMENT_METHODS, type PaymentMethod } from './payments';
import type { IsoDateTime, Order, Paisa, PaymentEntry, Uuid } from './types';
import type { MenuUnit } from './units';

/**
 * Today's Summary (MASTER_PROMPT.md §5.7, Test A step 7): sales by order type and payment method,
 * refunds, number of orders, tips per waiter, top items, voids and discounts with who and why.
 * One business day's orders in, plain numbers out — the server will use the same function (Phase 4).
 * Roman Urdu: Din ka hisaab — kitni sale, kis tarah paisa aaya, tips, discount aur void kis ne kiye.
 */
const CLOSED_WITHOUT_SALE = ['REJECTED', 'CANCELLED'];
const ORDER_TYPES: readonly OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];

export interface DaySummary {
  /** Totals of bills that are fully paid */
  sales: Paisa;
  paidOrders: number;
  averageBill: Paisa;
  /** Bills still running or paid only in part ("Pay later") */
  openOrders: number;
  amountDue: Paisa;
  /** Rejected or cancelled orders: not sales */
  cancelled: { orderId: Uuid; dailyNumber: number; type: OrderType; reason: string | null; by: Uuid | null }[];
  byType: { type: OrderType; orders: number; sales: Paisa }[];
  /** Money received for bills per method (payments minus reversals); tips are not included */
  byMethod: { method: PaymentMethod; amount: Paisa }[];
  /** Cash that came in: cash payments + cash tips − cash given back */
  cashReceived: Paisa;
  tips: Paisa;
  /** Per waiter of the order; null = counter / no waiter */
  tipsByWaiter: { waiterId: Uuid | null; amount: Paisa }[];
  refunds: { orderId: Uuid; dailyNumber: number; method: PaymentMethod; amount: Paisa; reason: string | null; by: Uuid }[];
  refundTotal: Paisa;
  /** Payments recorded with the wrong method and replaced: the total stays the same, the method moves */
  corrections: { orderId: Uuid; dailyNumber: number; from: PaymentMethod; to: PaymentMethod | null; amount: Paisa; reason: string | null; by: Uuid }[];
  discounts: { orderId: Uuid; dailyNumber: number; amount: Paisa; reason: string; by: Uuid }[];
  discountTotal: Paisa;
  voids: { orderId: Uuid; dailyNumber: number; item: string; quantity: number; unit: MenuUnit; amount: Paisa; reason: string | null; by: Uuid | null }[];
  voidTotal: Paisa;
  /** Most money first (pieces and kilograms cannot be compared, rupees can), then quantity */
  topItems: { name: string; quantity: number; unit: MenuUnit; amount: Paisa }[];
  serviceCharge: Paisa;
  /** Tax added on top plus tax inside tax-inclusive prices */
  tax: Paisa;
}

/**
 * Refunds and corrections count on the day they were made, not the day of the order (owner, 2026-11-02): a refund given
 * today on yesterday's order leaves today's cash, and yesterday's report stays as it was.
 */
export interface LaterMoney {
  date: string;
  dayOf: (iso: IsoDateTime) => string;
  allOrders: readonly Order[];
}

const isLaterMoney = (p: PaymentEntry) => p.kind !== 'PAYMENT' || p.relatedPaymentId !== null;

/** One business day's summary. Pass the orders of that day only. */
export function summarizeDay(orders: readonly Order[], topCount = 10, later?: LaterMoney): DaySummary {
  const counted = orders.filter((o) => !CLOSED_WITHOUT_SALE.includes(o.status));
  const paid = counted.filter((o) => o.paidTotal >= o.totals.total);
  const open = counted.filter((o) => o.paidTotal < o.totals.total);
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const sales = sum(paid.map((o) => o.totals.total));

  const methods = new Map<PaymentMethod, number>(PAYMENT_METHODS.map((m) => [m, 0]));
  const tipsByWaiter = new Map<Uuid | null, number>();
  let cashReceived = 0;
  let tips = 0;
  const refunds: DaySummary['refunds'] = [];
  const corrections: DaySummary['corrections'] = [];
  const entries: { order: Order; p: PaymentEntry }[] = later
    ? [
        ...orders.flatMap((order) => order.payments.filter((p) => !isLaterMoney(p)).map((p) => ({ order, p }))),
        ...later.allOrders.flatMap((order) => order.payments.filter((p) => isLaterMoney(p) && later.dayOf(p.createdAt) === later.date).map((p) => ({ order, p }))),
      ]
    : orders.flatMap((order) => order.payments.map((p) => ({ order, p })));
  for (const { order, p } of entries) {
    const sign = p.kind === 'REVERSAL' ? -1 : 1;
    if (p.kind === 'REFUND') {
      refunds.push({ orderId: order.id, dailyNumber: order.dailyNumber, method: p.method, amount: p.amount, reason: p.reason, by: p.receivedBy });
      if (p.method === 'CASH') cashReceived -= p.amount;
      continue;
    }
    if (p.kind === 'REVERSAL') {
      const to = order.payments.find((other) => other.relatedPaymentId === p.id)?.method ?? null;
      corrections.push({ orderId: order.id, dailyNumber: order.dailyNumber, from: p.method, to, amount: p.amount, reason: p.reason, by: p.receivedBy });
    }
    methods.set(p.method, (methods.get(p.method) ?? 0) + sign * p.amount);
    tips += sign * p.tipAmount;
    if (p.tipAmount > 0) tipsByWaiter.set(order.waiterId, (tipsByWaiter.get(order.waiterId) ?? 0) + sign * p.tipAmount);
    if (p.method === 'CASH') cashReceived += sign * (p.amount + p.tipAmount);
  }

  const items = new Map<string, { name: string; quantity: number; unit: MenuUnit; amount: number }>();
  const voids: DaySummary['voids'] = [];
  for (const order of counted) {
    for (const line of order.items) {
      if (line.isVoid) {
        voids.push({ orderId: order.id, dailyNumber: order.dailyNumber, item: line.name, quantity: line.quantity, unit: line.unit, amount: line.lineTotal, reason: line.voidReason, by: line.voidedBy });
        continue;
      }
      const entry = items.get(line.name) ?? { name: line.name, quantity: 0, unit: line.unit, amount: 0 };
      entry.quantity += line.quantity;
      entry.amount += line.lineTotal;
      items.set(line.name, entry);
    }
  }

  const discounts = counted
    .filter((o) => o.discount && o.totals.discount > 0)
    .map((o) => ({ orderId: o.id, dailyNumber: o.dailyNumber, amount: o.totals.discount, reason: o.discount?.reason ?? '', by: o.discount?.givenBy ?? '' }));

  return {
    sales,
    paidOrders: paid.length,
    averageBill: paid.length > 0 ? Math.round(sales / paid.length) : 0,
    openOrders: open.length,
    amountDue: sum(open.map((o) => o.totals.total - o.paidTotal)),
    cancelled: orders
      .filter((o) => CLOSED_WITHOUT_SALE.includes(o.status))
      .map((o) => {
        const last = [...o.history].reverse().find((h) => CLOSED_WITHOUT_SALE.includes(h.toStatus));
        return { orderId: o.id, dailyNumber: o.dailyNumber, type: o.type, reason: last?.reason ?? null, by: last?.changedBy ?? null };
      }),
    byType: ORDER_TYPES.map((type) => {
      const ofType = paid.filter((o) => o.type === type);
      return { type, orders: ofType.length, sales: sum(ofType.map((o) => o.totals.total)) };
    }),
    byMethod: [...methods].map(([method, amount]) => ({ method, amount })),
    cashReceived,
    tips,
    tipsByWaiter: [...tipsByWaiter].map(([waiterId, amount]) => ({ waiterId, amount })).sort((a, b) => b.amount - a.amount),
    refunds,
    refundTotal: sum(refunds.map((r) => r.amount)),
    corrections,
    discounts,
    discountTotal: sum(discounts.map((d) => d.amount)),
    voids,
    voidTotal: sum(voids.map((v) => v.amount)),
    topItems: [...items.values()].sort((a, b) => b.amount - a.amount || b.quantity - a.quantity).slice(0, topCount),
    serviceCharge: sum(paid.map((o) => o.totals.serviceCharge)),
    tax: sum(paid.map((o) => o.totals.tax + o.totals.taxIncludedInPrices)),
  };
}

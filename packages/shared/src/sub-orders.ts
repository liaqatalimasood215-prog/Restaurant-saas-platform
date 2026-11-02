import type { OrderStatus } from './order-status';

/**
 * Sub-orders (owner, 2026-11-02): strangers share a table and come and go at different times. Each customer is an own order on
 * that table (T1-1, T1-2) with an own bill and invoice, so one can pay and leave while the others stay. The table is free when no
 * sub-order is open. A table with one customer shows plain "T1", as before.
 * Roman Urdu: Ek table par kai customer; har ek ka apna sub-order, apna bill. Ek ja sakta hai, baaqi baithe rehte hain.
 */
export const MAX_OPEN_SUB_ORDERS = 20;

export interface SubOrderPlace {
  subOrderNo?: number;
  /** Set once a second customer sat at this table; the number stays on the order for good */
  tableShared?: boolean;
}

export function subOrderLabel(tableName: string, subOrderNo: number): string {
  return `${tableName}-${subOrderNo}`;
}

/** What screens and bills call this order: "T1" alone, "T1-2" on a shared table. */
export function orderPlaceName(tableName: string, order: SubOrderPlace): string {
  return order.tableShared ? subOrderLabel(tableName, order.subOrderNo ?? 1) : tableName;
}

/**
 * The next customer's number. Pass the table's orders since it was last empty, the paid ones too: T1-2 paid and left while T1-1
 * still eats, so the next is T1-3, never a second T1-2. An empty table starts again at 1.
 */
export function nextSubOrderNo(sinceEmpty: readonly SubOrderPlace[]): number {
  return Math.max(0, ...sinceEmpty.map((o) => o.subOrderNo ?? 1)) + 1;
}

/** The table board: a table where anyone asked for the bill shows that. */
export function openStatusOfTable(open: readonly { status: OrderStatus }[]): OrderStatus | null {
  if (open.length === 0) return null;
  return open.some((o) => o.status === 'BILL_REQUESTED') ? 'BILL_REQUESTED' : 'OPEN';
}

export type TablePaymentCheck = { ok: true; payments: { cashReceived: number | null }[] } | { ok: false; reason: 'NOTHING_DUE' | 'NOT_ENOUGH_CASH' };

/**
 * The whole table on one bill: every sub-order is paid in full. Cash is shared so each order takes exactly what it owes and the
 * last one holds the change.
 */
export function checkTablePayment(dues: readonly number[], cashReceived: number | null): TablePaymentCheck {
  const total = dues.reduce((sum, due) => sum + due, 0);
  if (total <= 0) return { ok: false, reason: 'NOTHING_DUE' };
  if (cashReceived === null) return { ok: true, payments: dues.map(() => ({ cashReceived: null })) };
  if (!Number.isSafeInteger(cashReceived) || cashReceived < total) return { ok: false, reason: 'NOT_ENOUGH_CASH' };
  return { ok: true, payments: dues.map((due, i) => ({ cashReceived: i === dues.length - 1 ? due + cashReceived - total : due })) };
}

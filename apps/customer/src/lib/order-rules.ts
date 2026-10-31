import { checkCheckout, type CheckoutField, type CheckoutProblem, type OnlineOrderKind, type OrderStatus } from '@restaurant-saas/shared';
import type { OrderMode } from './api/client';

/** The order has reached its end on the customer's path. */
export function isFinished(status: OrderStatus): boolean {
  return status === 'DELIVERED' || status === 'PICKED_UP' || status === 'REJECTED' || status === 'CANCELLED';
}

/**
 * DEMO: Dine-in is a website option only. It is not joined to the tables and waiters of Restaurant OS, so it borrows
 * the pickup steps of the shared order rules. Whether customers may order from their table is the owner's later decision.
 */
export function stepsKind(mode: OrderMode): OnlineOrderKind {
  return mode === 'DELIVERY' ? 'DELIVERY' : 'TAKEAWAY';
}

export type OrderField = CheckoutField | 'table';
export type OrderProblem = CheckoutProblem | 'TABLE_REQUIRED';

/** The shared checkout rule, and a table number for Dine-in. */
export function checkOrderDetails(d: { mode: OrderMode; name: string; phone: string; address: string; tableNumber: string }): { field: OrderField; problem: OrderProblem } | null {
  const problem = checkCheckout({ kind: stepsKind(d.mode), name: d.name, phone: d.phone, address: d.address });
  if (problem) return problem;
  if (d.mode === 'DINE_IN' && !d.tableNumber.trim()) return { field: 'table', problem: 'TABLE_REQUIRED' };
  return null;
}

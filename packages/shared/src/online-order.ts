import { DELIVERY_STEPS, TAKEAWAY_STEPS, type OrderStatus } from './order-status';
import { normalizePhone } from './phone';

/**
 * Customer online order rules (MASTER_PROMPT.md §5.2, §7.2): the Customer App shows these mistakes before
 * sending; the server checks the same at checkout.
 * Roman Urdu: Online order ke qaide — naam, phone, pata aur kam se kam order.
 */
export type OnlineOrderKind = 'DELIVERY' | 'TAKEAWAY';

export type CheckoutField = 'name' | 'phone' | 'address';
export type CheckoutProblem = 'NAME_REQUIRED' | 'PHONE_INVALID' | 'ADDRESS_REQUIRED';

export interface CheckoutDetails {
  kind: OnlineOrderKind;
  name: string;
  phone: string;
  address: string;
}

/** Name and a mobile number always; an address only for delivery. */
export function checkCheckout(d: CheckoutDetails): { field: CheckoutField; problem: CheckoutProblem } | null {
  if (d.name.trim().length < 2) return { field: 'name', problem: 'NAME_REQUIRED' };
  if (!normalizePhone(d.phone)) return { field: 'phone', problem: 'PHONE_INVALID' };
  if (d.kind === 'DELIVERY' && d.address.trim().length < 5) return { field: 'address', problem: 'ADDRESS_REQUIRED' };
  return null;
}

/** How much more food the cart needs to reach the minimum order; 0 = enough. */
export function amountToMinimum(itemsSubtotal: number, minOrder: number): number {
  return Math.max(0, minOrder - itemsSubtotal);
}

export function canPickAddons(group: { minSelect: number; maxSelect: number }, picked: number): boolean {
  return picked >= group.minSelect && picked <= group.maxSelect;
}

/** The steps a customer sees on the tracking page, in order. */
export function trackingSteps(kind: OnlineOrderKind): readonly OrderStatus[] {
  return kind === 'DELIVERY' ? DELIVERY_STEPS : TAKEAWAY_STEPS;
}

/** The status after this one on the customer's path, or null at the end (or after Rejected / Cancelled). */
export function nextTrackingStep(kind: OnlineOrderKind, status: OrderStatus): OrderStatus | null {
  const steps = trackingSteps(kind);
  const at = steps.indexOf(status);
  return at === -1 ? null : (steps[at + 1] ?? null);
}

import type { StaffRole } from './roles';

/**
 * The ONE order lifecycle used by every app.
 * Roman Urdu: Ek hi order shuru se aakhir tak inhi steps se guzarta hai.
 */
export const ORDER_STATUSES = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'RIDER_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'REJECTED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Normal delivery path, in order. Used for customer tracking progress. */
export const DELIVERY_STEPS: readonly OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'RIDER_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const FINAL_STATUSES: readonly OrderStatus[] = ['DELIVERED', 'REJECTED', 'CANCELLED'];

export function isFinalStatus(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export interface StatusInfo {
  /** Short label for staff screens */
  staffLabel: string;
  /** Friendly text for the customer tracking page */
  customerLabel: string;
}

export const STATUS_INFO: Record<OrderStatus, StatusInfo> = {
  PLACED: { staffLabel: 'New', customerLabel: 'Order placed — waiting for the restaurant' },
  ACCEPTED: { staffLabel: 'Accepted', customerLabel: 'Restaurant accepted your order' },
  PREPARING: { staffLabel: 'Preparing', customerLabel: 'Your food is being prepared' },
  READY: { staffLabel: 'Ready', customerLabel: 'Your food is ready' },
  RIDER_ASSIGNED: { staffLabel: 'Rider assigned', customerLabel: 'A rider has been assigned' },
  OUT_FOR_DELIVERY: { staffLabel: 'On the way', customerLabel: 'Rider picked up your order — on the way' },
  DELIVERED: { staffLabel: 'Delivered', customerLabel: 'Delivered — enjoy your meal!' },
  REJECTED: { staffLabel: 'Rejected', customerLabel: 'Sorry, the restaurant could not accept this order' },
  CANCELLED: { staffLabel: 'Cancelled', customerLabel: 'This order was cancelled' },
};

/** Who changes the status. CUSTOMER only creates the order (→ PLACED). */
export type Actor = StaffRole | 'CUSTOMER';

export interface TransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  roles: readonly StaffRole[];
  /** Only the rider assigned to this order may do it. */
  assignedRiderOnly?: boolean;
  /** This step needs a rider id (READY → RIDER_ASSIGNED). */
  needsRider?: boolean;
  /** Button text in the apps */
  buttonLabel: string;
}

const CANCEL_ROLES: readonly StaffRole[] = ['OWNER', 'CASHIER'];
const CANCELLABLE_FROM: readonly OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED'];

/** Every allowed status change. Anything not listed here is rejected by the server. */
export const ORDER_TRANSITIONS: readonly TransitionRule[] = [
  { from: 'PLACED', to: 'ACCEPTED', roles: ['OWNER', 'CASHIER'], buttonLabel: 'Accept' },
  { from: 'PLACED', to: 'REJECTED', roles: ['OWNER', 'CASHIER'], buttonLabel: 'Reject' },
  { from: 'ACCEPTED', to: 'PREPARING', roles: ['OWNER', 'KITCHEN'], buttonLabel: 'Start preparing' },
  { from: 'PREPARING', to: 'READY', roles: ['OWNER', 'KITCHEN'], buttonLabel: 'Ready' },
  { from: 'READY', to: 'RIDER_ASSIGNED', roles: ['OWNER', 'CASHIER'], needsRider: true, buttonLabel: 'Assign rider' },
  {
    from: 'RIDER_ASSIGNED',
    to: 'OUT_FOR_DELIVERY',
    roles: ['RIDER'],
    assignedRiderOnly: true,
    buttonLabel: 'Picked up – On the way',
  },
  { from: 'OUT_FOR_DELIVERY', to: 'DELIVERED', roles: ['RIDER'], assignedRiderOnly: true, buttonLabel: 'Delivered' },
  // PLACED → CANCELLED is not listed: a new order is Rejected, not Cancelled.
  ...CANCELLABLE_FROM.filter((from) => from !== 'PLACED').map(
    (from): TransitionRule => ({ from, to: 'CANCELLED', roles: CANCEL_ROLES, buttonLabel: 'Cancel' }),
  ),
];

export function findTransition(from: OrderStatus, to: OrderStatus): TransitionRule | undefined {
  return ORDER_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

export type TransitionCheck =
  | { ok: true; rule: TransitionRule }
  | { ok: false; reason: 'NOT_ALLOWED_STEP' | 'WRONG_ROLE' | 'NOT_ASSIGNED_RIDER' | 'RIDER_REQUIRED' };

/**
 * Pure rule check. The backend calls this before every status change
 * (and still also checks restaurant/branch ownership itself).
 */
export function checkTransition(input: {
  from: OrderStatus;
  to: OrderStatus;
  role: StaffRole;
  /** true when the logged-in user is the rider assigned to this order */
  isAssignedRider?: boolean;
  /** rider id sent with READY → RIDER_ASSIGNED */
  riderId?: string | null;
}): TransitionCheck {
  const rule = findTransition(input.from, input.to);
  if (!rule) return { ok: false, reason: 'NOT_ALLOWED_STEP' };
  if (!rule.roles.includes(input.role)) return { ok: false, reason: 'WRONG_ROLE' };
  if (rule.assignedRiderOnly && !input.isAssignedRider) return { ok: false, reason: 'NOT_ASSIGNED_RIDER' };
  if (rule.needsRider && !input.riderId) return { ok: false, reason: 'RIDER_REQUIRED' };
  return { ok: true, rule };
}

/** Buttons a role should see for an order in this status. */
export function availableActions(status: OrderStatus, role: StaffRole, isAssignedRider = false): TransitionRule[] {
  return ORDER_TRANSITIONS.filter(
    (t) => t.from === status && t.roles.includes(role) && (!t.assignedRiderOnly || isAssignedRider),
  );
}

/** 0-based position on the delivery path, or -1 for Rejected/Cancelled. */
export function deliveryStepIndex(status: OrderStatus): number {
  return DELIVERY_STEPS.indexOf(status);
}

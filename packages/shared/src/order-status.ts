import type { StaffRole } from './roles';

/**
 * The ONE order engine used by every app (MASTER_PROMPT.md §6).
 * Roman Urdu: Har order (dine-in, delivery, takeaway) inhi steps se guzarta hai — koi step chhod nahi sakta.
 */
export const ORDER_TYPES = ['DINE_IN', 'DELIVERY', 'TAKEAWAY'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_CHANNELS = ['WAITER', 'POS', 'CUSTOMER_APP', 'PHONE'] as const;
export type OrderChannel = (typeof ORDER_CHANNELS)[number];

export const ORDER_STATUSES = [
  'OPEN',
  'BILL_REQUESTED',
  'PAID',
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'RIDER_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
  'REJECTED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUSES_BY_TYPE: Record<OrderType, readonly OrderStatus[]> = {
  DINE_IN: ['OPEN', 'BILL_REQUESTED', 'PAID', 'CANCELLED'],
  DELIVERY: [
    'PLACED',
    'ACCEPTED',
    'PREPARING',
    'READY',
    'RIDER_ASSIGNED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'REJECTED',
    'CANCELLED',
  ],
  TAKEAWAY: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP', 'REJECTED', 'CANCELLED'],
};

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

/** Normal takeaway path, in order. */
export const TAKEAWAY_STEPS: readonly OrderStatus[] = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'PICKED_UP'];

export const FINAL_STATUSES: readonly OrderStatus[] = ['PAID', 'DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'];

export function isFinalStatus(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** Staff-created delivery/takeaway orders (phone, counter) start here; customer orders start at PLACED. */
export function initialStatus(type: OrderType, channel: OrderChannel): OrderStatus {
  if (type === 'DINE_IN') return 'OPEN';
  return channel === 'CUSTOMER_APP' ? 'PLACED' : 'ACCEPTED';
}

export interface StatusInfo {
  /** Short label for staff screens */
  staffLabel: string;
  /** Friendly text for the customer tracking page / receipt */
  customerLabel: string;
}

export const STATUS_INFO: Record<OrderStatus, StatusInfo> = {
  OPEN: { staffLabel: 'Open', customerLabel: 'Your table is open' },
  BILL_REQUESTED: { staffLabel: 'Bill requested', customerLabel: 'Your bill is on the way' },
  PAID: { staffLabel: 'Paid', customerLabel: 'Paid — thank you!' },
  PLACED: { staffLabel: 'New', customerLabel: 'Order placed — waiting for the restaurant' },
  ACCEPTED: { staffLabel: 'Accepted', customerLabel: 'Restaurant accepted your order' },
  PREPARING: { staffLabel: 'Preparing', customerLabel: 'Your food is being prepared' },
  READY: { staffLabel: 'Ready', customerLabel: 'Your food is ready' },
  RIDER_ASSIGNED: { staffLabel: 'Rider assigned', customerLabel: 'A rider has been assigned' },
  OUT_FOR_DELIVERY: { staffLabel: 'On the way', customerLabel: 'Rider picked up your order — on the way' },
  DELIVERED: { staffLabel: 'Delivered', customerLabel: 'Delivered — enjoy your meal!' },
  PICKED_UP: { staffLabel: 'Picked up', customerLabel: 'Picked up — enjoy your meal!' },
  REJECTED: { staffLabel: 'Rejected', customerLabel: 'Sorry, the restaurant could not accept this order' },
  CANCELLED: { staffLabel: 'Cancelled', customerLabel: 'This order was cancelled' },
};

export interface TransitionRule {
  type: OrderType;
  from: OrderStatus;
  to: OrderStatus;
  /** Roles that may press the button. Empty for automatic steps. */
  roles: readonly StaffRole[];
  /** Set by the server from the kitchen tickets, never by a button. */
  automatic?: boolean;
  /** Only the rider assigned to this order may do it. */
  assignedRiderOnly?: boolean;
  /** This step needs a rider id (READY → RIDER_ASSIGNED). */
  needsRider?: boolean;
  /** A reason must be written (reject, cancel). */
  needsReason?: boolean;
  /** Only allowed while the order has no payments (dine-in cancel). */
  needsNoPayments?: boolean;
  /** Only allowed when payments cover the total (→ PAID). */
  needsFullPayment?: boolean;
  /** Button text in the apps */
  buttonLabel: string;
}

const FLOOR: readonly StaffRole[] = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'];
const COUNTER: readonly StaffRole[] = ['OWNER', 'MANAGER', 'CASHIER'];
const MANAGEMENT: readonly StaffRole[] = ['OWNER', 'MANAGER'];

function cancelRules(type: OrderType, fromStatuses: readonly OrderStatus[]): TransitionRule[] {
  // Cashier may cancel only before the kitchen starts (ACCEPTED); Owner and Manager until the order leaves.
  return fromStatuses.map((from) => ({
    type,
    from,
    to: 'CANCELLED',
    roles: from === 'ACCEPTED' ? COUNTER : MANAGEMENT,
    needsReason: true,
    buttonLabel: 'Cancel',
  }));
}

function onlineIntakeRules(type: OrderType): TransitionRule[] {
  return [
    { type, from: 'PLACED', to: 'ACCEPTED', roles: COUNTER, buttonLabel: 'Accept' },
    { type, from: 'PLACED', to: 'REJECTED', roles: COUNTER, needsReason: true, buttonLabel: 'Reject' },
    { type, from: 'ACCEPTED', to: 'PREPARING', roles: [], automatic: true, buttonLabel: 'Preparing' },
    { type, from: 'PREPARING', to: 'READY', roles: [], automatic: true, buttonLabel: 'Ready' },
    // Kitchen Undo within 2 minutes while the order is still READY (MASTER_PROMPT.md §6.4).
    { type, from: 'READY', to: 'PREPARING', roles: [], automatic: true, buttonLabel: 'Back to preparing' },
  ];
}

/** Every allowed status change (MASTER_PROMPT.md §6.3, §6.5). Anything not listed here is rejected. */
export const ORDER_TRANSITIONS: readonly TransitionRule[] = [
  // Dine-in
  { type: 'DINE_IN', from: 'OPEN', to: 'BILL_REQUESTED', roles: FLOOR, buttonLabel: 'Print bill' },
  { type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'OPEN', roles: FLOOR, buttonLabel: 'Add round' },
  { type: 'DINE_IN', from: 'OPEN', to: 'PAID', roles: COUNTER, needsFullPayment: true, buttonLabel: 'Pay' },
  { type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'PAID', roles: COUNTER, needsFullPayment: true, buttonLabel: 'Pay' },
  ...(['OPEN', 'BILL_REQUESTED'] as const).map(
    (from): TransitionRule => ({
      type: 'DINE_IN',
      from,
      to: 'CANCELLED',
      roles: MANAGEMENT,
      needsReason: true,
      needsNoPayments: true,
      buttonLabel: 'Cancel',
    }),
  ),

  // Delivery
  ...onlineIntakeRules('DELIVERY'),
  { type: 'DELIVERY', from: 'READY', to: 'RIDER_ASSIGNED', roles: COUNTER, needsRider: true, buttonLabel: 'Assign rider' },
  {
    type: 'DELIVERY',
    from: 'RIDER_ASSIGNED',
    to: 'OUT_FOR_DELIVERY',
    roles: ['RIDER'],
    assignedRiderOnly: true,
    buttonLabel: 'Picked up – On the way',
  },
  {
    type: 'DELIVERY',
    from: 'OUT_FOR_DELIVERY',
    to: 'DELIVERED',
    roles: ['RIDER'],
    assignedRiderOnly: true,
    buttonLabel: 'Delivered',
  },
  ...cancelRules('DELIVERY', ['ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED']),

  // Takeaway
  ...onlineIntakeRules('TAKEAWAY'),
  { type: 'TAKEAWAY', from: 'READY', to: 'PICKED_UP', roles: COUNTER, buttonLabel: 'Picked up' },
  ...cancelRules('TAKEAWAY', ['ACCEPTED', 'PREPARING', 'READY']),
];

export function findTransition(type: OrderType, from: OrderStatus, to: OrderStatus): TransitionRule | undefined {
  return ORDER_TRANSITIONS.find((t) => t.type === type && t.from === from && t.to === to);
}

export type TransitionFailure =
  | 'NOT_ALLOWED_STEP'
  | 'AUTOMATIC_ONLY'
  | 'WRONG_ROLE'
  | 'NOT_ASSIGNED_RIDER'
  | 'RIDER_REQUIRED'
  | 'REASON_REQUIRED'
  | 'HAS_PAYMENTS'
  | 'NOT_FULLY_PAID';

export type TransitionCheck = { ok: true; rule: TransitionRule } | { ok: false; reason: TransitionFailure };

/**
 * Pure rule check for a button press. The backend calls this before every status change
 * (and still also checks restaurant/branch ownership itself).
 */
export function checkTransition(input: {
  type: OrderType;
  from: OrderStatus;
  to: OrderStatus;
  role: StaffRole;
  /** true when the logged-in user is the rider assigned to this order */
  isAssignedRider?: boolean;
  /** rider id sent with READY → RIDER_ASSIGNED */
  riderId?: string | null;
  reason?: string | null;
  hasPayments?: boolean;
  isFullyPaid?: boolean;
}): TransitionCheck {
  const rule = findTransition(input.type, input.from, input.to);
  if (!rule) return { ok: false, reason: 'NOT_ALLOWED_STEP' };
  if (rule.automatic) return { ok: false, reason: 'AUTOMATIC_ONLY' };
  if (!rule.roles.includes(input.role)) return { ok: false, reason: 'WRONG_ROLE' };
  if (rule.assignedRiderOnly && !input.isAssignedRider) return { ok: false, reason: 'NOT_ASSIGNED_RIDER' };
  if (rule.needsRider && !input.riderId) return { ok: false, reason: 'RIDER_REQUIRED' };
  if (rule.needsReason && !input.reason?.trim()) return { ok: false, reason: 'REASON_REQUIRED' };
  if (rule.needsNoPayments && input.hasPayments) return { ok: false, reason: 'HAS_PAYMENTS' };
  if (rule.needsFullPayment && !input.isFullyPaid) return { ok: false, reason: 'NOT_FULLY_PAID' };
  return { ok: true, rule };
}

/** Buttons a role should see for an order in this status. Automatic steps never get a button. */
export function availableActions(
  type: OrderType,
  status: OrderStatus,
  role: StaffRole,
  isAssignedRider = false,
): TransitionRule[] {
  return ORDER_TRANSITIONS.filter(
    (t) =>
      t.type === type &&
      t.from === status &&
      !t.automatic &&
      t.roles.includes(role) &&
      (!t.assignedRiderOnly || isAssignedRider),
  );
}

/** 0-based position on the delivery path, or -1 for Rejected/Cancelled. */
export function deliveryStepIndex(status: OrderStatus): number {
  return DELIVERY_STEPS.indexOf(status);
}

/** Dine-in table status is derived from the table's open order, never stored twice (§6.6). */
export type TableStatus = 'FREE' | 'OCCUPIED' | 'BILL_REQUESTED';

export function tableStatusFor(openOrderStatus: OrderStatus | null | undefined): TableStatus {
  if (openOrderStatus === 'OPEN') return 'OCCUPIED';
  if (openOrderStatus === 'BILL_REQUESTED') return 'BILL_REQUESTED';
  return 'FREE';
}

import type { OrderStatus, OrderType } from './order-status';
import { can, type Permission } from './permissions';
import type { StaffRole } from './roles';

/**
 * Kitchen tickets (MASTER_PROMPT.md §6.4). The kitchen works on tickets, not whole orders:
 * one ticket = the items of one round for one station.
 * Roman Urdu: Har station ko sirf apni "parchi" milti hai — pizza oven ko pizza, grill ko burger.
 */
export const TICKET_STATUSES = ['NEW', 'PREPARING', 'READY', 'SERVED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** READY → PREPARING is allowed for this long after Ready was pressed (for mistakes). */
export const TICKET_UNDO_WINDOW_MS = 2 * 60 * 1000;
export const DEFAULT_WARN_MINUTES = 10;
export const DEFAULT_LATE_MINUTES = 20;

export interface TicketTransitionRule {
  from: TicketStatus;
  to: TicketStatus;
  permission: Permission;
  /** SERVED is used for dine-in only. */
  dineInOnly?: boolean;
  /** Only within TICKET_UNDO_WINDOW_MS after the ticket became READY. */
  undo?: boolean;
  buttonLabel: string;
}

export const TICKET_TRANSITIONS: readonly TicketTransitionRule[] = [
  { from: 'NEW', to: 'PREPARING', permission: 'ticket.update', buttonLabel: 'Start' },
  { from: 'PREPARING', to: 'READY', permission: 'ticket.update', buttonLabel: 'Ready' },
  { from: 'READY', to: 'PREPARING', permission: 'ticket.update', undo: true, buttonLabel: 'Undo' },
  { from: 'READY', to: 'SERVED', permission: 'ticket.serve', dineInOnly: true, buttonLabel: 'Served' },
];

/** Order statuses after which a delivery/takeaway ticket can no longer be undone. */
const UNDO_CLOSED_ORDER_STATUSES: readonly OrderStatus[] = [
  'RIDER_ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'PICKED_UP',
  'CANCELLED',
];

export type TicketTransitionFailure =
  | 'NOT_ALLOWED_STEP'
  | 'WRONG_ROLE'
  | 'NOT_OWN_STATION'
  | 'DINE_IN_ONLY'
  | 'UNDO_EXPIRED'
  | 'ORDER_CLOSED';

export type TicketTransitionCheck =
  | { ok: true; rule: TicketTransitionRule }
  | { ok: false; reason: TicketTransitionFailure };

export function checkTicketTransition(input: {
  from: TicketStatus;
  to: TicketStatus;
  role: StaffRole;
  orderType: OrderType;
  orderStatus: OrderStatus;
  /** Kitchen users work only on their own stations; ignored for other roles. */
  isOwnStation?: boolean;
  /** Epoch ms when the ticket became READY (needed for Undo). */
  readyAt?: number | null;
  /** Epoch ms of "now" — passed in so the rule stays pure and testable. */
  now?: number;
}): TicketTransitionCheck {
  const rule = TICKET_TRANSITIONS.find((t) => t.from === input.from && t.to === input.to);
  if (!rule) return { ok: false, reason: 'NOT_ALLOWED_STEP' };
  if (!can(input.role, rule.permission)) return { ok: false, reason: 'WRONG_ROLE' };
  if (input.role === 'KITCHEN' && !input.isOwnStation) return { ok: false, reason: 'NOT_OWN_STATION' };
  if (rule.dineInOnly && input.orderType !== 'DINE_IN') return { ok: false, reason: 'DINE_IN_ONLY' };
  if (rule.undo) {
    if (UNDO_CLOSED_ORDER_STATUSES.includes(input.orderStatus)) return { ok: false, reason: 'ORDER_CLOSED' };
    const now = input.now ?? Date.now();
    if (input.readyAt == null || now - input.readyAt > TICKET_UNDO_WINDOW_MS) {
      return { ok: false, reason: 'UNDO_EXPIRED' };
    }
  }
  return { ok: true, rule };
}

export interface StationRef {
  id: string;
  /** Bottled drinks etc.: tickets are READY at once. */
  autoReady: boolean;
}

export interface TicketDraft<T> {
  stationId: string;
  initialStatus: TicketStatus;
  items: T[];
}

/**
 * Split the items of one round into one ticket per station, in station order.
 * Auto-ready stations get tickets that are READY at once.
 */
export function splitRoundIntoTickets<T extends { stationId: string }>(
  items: readonly T[],
  stations: readonly StationRef[],
): TicketDraft<T>[] {
  if (items.length === 0) throw new Error('A round needs at least one item');
  for (const item of items) {
    if (!stations.some((s) => s.id === item.stationId)) throw new Error(`Unknown kitchen station: ${item.stationId}`);
  }
  return stations
    .map((station) => ({
      stationId: station.id,
      initialStatus: (station.autoReady ? 'READY' : 'NEW') as TicketStatus,
      items: items.filter((i) => i.stationId === station.id),
    }))
    .filter((t) => t.items.length > 0);
}

function isDone(status: TicketStatus): boolean {
  return status === 'READY' || status === 'SERVED';
}

/**
 * Automatic order steps for delivery/takeaway orders, derived from their tickets (§6.3):
 * PREPARING when a cook starts the first ticket (auto-ready drinks do not count: they were never
 * started), READY when all tickets are ready,
 * back to PREPARING when a ticket is undone while the order is READY.
 * Dine-in orders are not driven by tickets.
 */
export function automaticOrderSteps(
  type: OrderType,
  current: OrderStatus,
  tickets: readonly { status: TicketStatus; startedAt?: string | null }[],
): OrderStatus[] {
  if (type === 'DINE_IN' || tickets.length === 0) return [];
  const allDone = tickets.every((t) => isDone(t.status));
  const anyStarted = tickets.some((t) => t.status === 'PREPARING' || (t.status !== 'NEW' && t.startedAt != null));
  if (current === 'ACCEPTED') {
    if (allDone) return ['PREPARING', 'READY'];
    return anyStarted ? ['PREPARING'] : [];
  }
  if (current === 'PREPARING') return allDone ? ['READY'] : [];
  if (current === 'READY') return allDone ? [] : ['PREPARING'];
  return [];
}

export type TicketTimerLevel = 'ON_TIME' | 'WARN' | 'LATE';

/** Ticket timer colour: orange after warnMinutes, red after lateMinutes (per station). */
export function ticketTimerLevel(
  sentAt: number,
  now: number,
  warnMinutes = DEFAULT_WARN_MINUTES,
  lateMinutes = DEFAULT_LATE_MINUTES,
): TicketTimerLevel {
  const minutes = (now - sentAt) / 60_000;
  if (minutes >= lateMinutes) return 'LATE';
  if (minutes >= warnMinutes) return 'WARN';
  return 'ON_TIME';
}

// ── Pickup at the pass (owner, 2026-11-09) ─────────────────────────────────────────────────────

/**
 * Three separate steps: the kitchen marks Ready; the waiter (dine-in), the rider (delivery) or the counter (takeaway) picks the
 * food up; the waiter serves it at the table. A picked-up card stays on the KDS for PICKUP_VISIBLE_MS (with Undo for a dine-in
 * pickup), then hides; nothing is deleted. Food nobody picks up stays, with a reminder after READY_REMINDER_MS. Both times are
 * named here so a branch setting can change them later.
 * Roman Urdu: Ready → Picked up → Served, teen alag qadam. Utha liya to 5 minute baad card chhup jata hai; 10 minute tak koi
 * na aaye to yaad-dihani.
 */
export const PICKUP_VISIBLE_MS = 5 * 60 * 1000;
export const READY_REMINDER_MS = 10 * 60 * 1000;

/** Delivery and takeaway food leaves the pass with these order steps: the rider's "On the way", the counter's "Picked up". */
const ORDER_PICKUP_STATUSES: readonly OrderStatus[] = ['OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'];

export interface TicketPickup {
  at: string;
  byId: string | null;
  /** TICKET = a waiter's Picked up (may be undone for 5 minutes); SERVED = served without a pickup first; ORDER = the rider or counter step */
  source: 'TICKET' | 'SERVED' | 'ORDER';
}

/** When and how a ticket's food left the pass, or null while it is still there. */
export function ticketPickup(
  ticket: { status: TicketStatus; servedAt: string | null; pickedUpAt?: string | null; pickedUpBy?: string | null },
  order: { type: OrderType; history: readonly { toStatus: OrderStatus; changedBy: string | null; changedAt: string }[] },
): TicketPickup | null {
  if (ticket.pickedUpAt) return { at: ticket.pickedUpAt, byId: ticket.pickedUpBy ?? null, source: 'TICKET' };
  if (ticket.status === 'SERVED' && ticket.servedAt) return { at: ticket.servedAt, byId: null, source: 'SERVED' };
  if (order.type !== 'DINE_IN') {
    const step = order.history.find((h) => ORDER_PICKUP_STATUSES.includes(h.toStatus));
    if (step) return { at: step.changedAt, byId: step.changedBy, source: 'ORDER' };
  }
  return null;
}

/** On the KDS: still to do or waiting at the pass (ACTIVE), picked up in the last 5 minutes (PICKED_UP), or gone (HIDDEN). */
export function kdsState(pickup: Pick<TicketPickup, 'at'> | null, now: number): 'ACTIVE' | 'PICKED_UP' | 'HIDDEN' {
  if (!pickup) return 'ACTIVE';
  return now - Date.parse(pickup.at) < PICKUP_VISIBLE_MS ? 'PICKED_UP' : 'HIDDEN';
}

/** Ready and still at the pass for READY_REMINDER_MS or longer. */
export function waitingTooLong(ticket: { status: TicketStatus; readyAt: string | null }, pickedUp: boolean, now: number): boolean {
  return ticket.status === 'READY' && !pickedUp && ticket.readyAt !== null && now - Date.parse(ticket.readyAt) >= READY_REMINDER_MS;
}

export type PickupFailure = 'WRONG_ROLE' | 'DINE_IN_ONLY' | 'NOT_READY' | 'NOT_PICKED_UP' | 'ALREADY_SERVED' | 'UNDO_EXPIRED' | 'NOT_OWN_STATION';

/**
 * Picked up: a dine-in ticket that is READY, by someone who may serve food (Owner, Manager, waiters). Delivery and takeaway are
 * picked up by the rider's and the counter's own order steps.
 */
export function checkPickup(input: { role: StaffRole; orderType: OrderType; status: TicketStatus }): PickupFailure | null {
  if (!can(input.role, 'ticket.serve')) return 'WRONG_ROLE';
  if (input.orderType !== 'DINE_IN') return 'DINE_IN_ONLY';
  if (input.status !== 'READY') return input.status === 'SERVED' ? 'ALREADY_SERVED' : 'NOT_READY';
  return null;
}

/** Undo a waiter's pickup while the card is still on the KDS (5 minutes) and the food is not served; the kitchen may too (own stations). */
export function checkUndoPickup(input: { role: StaffRole; status: TicketStatus; pickedUpAt: string | null | undefined; isOwnStation?: boolean; now: number }): PickupFailure | null {
  if (!can(input.role, 'ticket.serve') && !can(input.role, 'ticket.update')) return 'WRONG_ROLE';
  if (input.role === 'KITCHEN' && !input.isOwnStation) return 'NOT_OWN_STATION';
  if (!input.pickedUpAt) return 'NOT_PICKED_UP';
  if (input.status === 'SERVED') return 'ALREADY_SERVED';
  if (input.now - Date.parse(input.pickedUpAt) >= PICKUP_VISIBLE_MS) return 'UNDO_EXPIRED';
  return null;
}

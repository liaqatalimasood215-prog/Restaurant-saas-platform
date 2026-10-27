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
 * PREPARING when the first ticket starts, READY when all tickets are ready,
 * back to PREPARING when a ticket is undone while the order is READY.
 * Dine-in orders are not driven by tickets.
 */
export function automaticOrderSteps(
  type: OrderType,
  current: OrderStatus,
  tickets: readonly { status: TicketStatus }[],
): OrderStatus[] {
  if (type === 'DINE_IN' || tickets.length === 0) return [];
  const allDone = tickets.every((t) => isDone(t.status));
  const anyStarted = tickets.some((t) => t.status !== 'NEW');
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

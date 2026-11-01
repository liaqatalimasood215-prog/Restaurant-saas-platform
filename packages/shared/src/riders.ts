import { amountDue } from './payments';
import { formatQuantity } from './units';
import type { IsoDateTime, Order, Paisa, Uuid } from './types';

/**
 * Riders (MASTER_PROMPT.md §5.6, §7.3; owner, 2026-11-01). The Owner creates riders, there is no public sign-up.
 * The rider sets Online / Offline: an Offline rider gets no new order, and a rider with a running delivery stays Online.
 * Roman Urdu: Offline rider ko naya order nahi milta; chalti delivery ke dauran rider Offline nahi ho sakta.
 */
export interface RiderAvailability {
  isActive: boolean;
  activatedAt: IsoDateTime | null;
  /** Set by the rider; missing = Online */
  riderOnline?: boolean;
}

export const isRiderOnline = (rider: Pick<RiderAvailability, 'riderOnline'>): boolean => rider.riderOnline !== false;

export type RiderAssignBlock = 'DISABLED' | 'NOT_ACTIVATED' | 'OFFLINE';

/** Why this rider cannot get a new order; null = free to assign. */
export function riderAssignBlock(rider: RiderAvailability): RiderAssignBlock | null {
  if (!rider.isActive) return 'DISABLED';
  if (!rider.activatedAt) return 'NOT_ACTIVATED';
  return isRiderOnline(rider) ? null : 'OFFLINE';
}

export const RIDER_ASSIGN_MESSAGES: Record<RiderAssignBlock, string> = {
  DISABLED: 'This rider is disabled. Choose an active rider.',
  NOT_ACTIVATED: 'This rider has not opened the activation link yet.',
  OFFLINE: 'This rider is Offline. Choose a rider who is Online.',
};

export const canRiderGoOffline = (runningDeliveries: number): boolean => runningDeliveries === 0;

export const RIDER_BUSY_MESSAGE = 'Finish your running deliveries first, then you can go Offline.';

/** A rider with a running delivery cannot be disabled: first change the rider or finish the delivery. */
export const canDisableRider = (runningDeliveries: number): boolean => runningDeliveries === 0;

export const RIDER_DISABLE_MESSAGE = 'This rider has a running delivery. Change the rider or finish the delivery first.';

/** The address on Google Maps: a free link, no paid maps service (MASTER_PROMPT.md §7.3). */
export function googleMapsLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export const RIDER_STATUSES = ['RIDER_ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const;
export type RiderDeliveryStatus = (typeof RIDER_STATUSES)[number];

/** Only what a rider needs for one delivery. A rider never sees another rider's orders or the rest of the bill. */
export interface RiderDelivery {
  id: Uuid;
  riderId: Uuid;
  dailyNumber: number;
  status: RiderDeliveryStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note: string;
  items: { id: Uuid; label: string; note: string }[];
  total: Paisa;
  /** Still to take from the customer; 0 = already paid */
  amountToCollect: Paisa;
  /** Cash taken from the customer for this delivery */
  cashCollected: Paisa;
  /** The cash was handed over to the restaurant */
  cashSettled: boolean;
  assignedAt: IsoDateTime | null;
  pickedUpAt: IsoDateTime | null;
  deliveredAt: IsoDateTime | null;
}

const isRiderStatus = (status: string): status is RiderDeliveryStatus => (RIDER_STATUSES as readonly string[]).includes(status);

/** The rider's view of an order; null when the order is not with a rider. */
export function riderDeliveryFromOrder(order: Order): RiderDelivery | null {
  if (order.type !== 'DELIVERY' || !order.riderId || !isRiderStatus(order.status)) return null;
  const riderId = order.riderId;
  const reachedAt = (status: RiderDeliveryStatus) => order.history.filter((h) => h.toStatus === status).at(-1)?.changedAt ?? null;
  return {
    id: order.id,
    riderId,
    dailyNumber: order.dailyNumber,
    status: order.status,
    customerName: order.customerName ?? '',
    customerPhone: order.customerPhone ?? '',
    customerAddress: order.customerAddress ?? '',
    note: order.note,
    items: order.items
      .filter((item) => !item.isVoid)
      .map((item) => ({
        id: item.id,
        label: `${formatQuantity(item.quantity, item.unit)} ${item.name}${item.variantName ? ` (${item.variantName})` : ''}${item.modifiers.map((m) => ` + ${m.name}`).join('')}`,
        note: item.note,
      })),
    total: order.totals.total,
    amountToCollect: amountDue(order.totals.total, order.paidTotal),
    cashCollected: order.payments
      .filter((p) => p.kind === 'PAYMENT' && p.method === 'CASH' && p.receivedBy === riderId)
      .reduce((sum, p) => sum + p.amount + p.tipAmount, 0),
    cashSettled: order.cashSettlementId !== null,
    assignedAt: reachedAt('RIDER_ASSIGNED'),
    pickedUpAt: reachedAt('OUT_FOR_DELIVERY'),
    deliveredAt: reachedAt('DELIVERED'),
  };
}

export interface RiderDayTotals {
  delivered: number;
  cashCollected: Paisa;
  cashSettled: Paisa;
  /** Collected and not handed over yet */
  cashWithRider: Paisa;
}

/** One rider's day, from that rider's deliveries (MASTER_PROMPT.md §7.3). */
export function riderDayTotals(deliveries: readonly RiderDelivery[]): RiderDayTotals {
  const done = deliveries.filter((d) => d.status === 'DELIVERED');
  const cashCollected = done.reduce((sum, d) => sum + d.cashCollected, 0);
  const cashSettled = done.filter((d) => d.cashSettled).reduce((sum, d) => sum + d.cashCollected, 0);
  return { delivered: done.length, cashCollected, cashSettled, cashWithRider: cashCollected - cashSettled };
}

/** A login choice in the Rider App. */
export interface RiderAccount {
  id: Uuid;
  name: string;
  phone: string;
  isActive: boolean;
  activatedAt: IsoDateTime | null;
  riderOnline: boolean;
}

/** A rider on the Riders page of Restaurant OS. */
export interface RiderOverview {
  account: RiderAccount;
  employeeCode: string;
  email: string | null;
  branchId: Uuid | null;
  /** A pending activation link */
  invited: boolean;
  running: { orderId: Uuid; dailyNumber: number; status: RiderDeliveryStatus; customerName: string }[];
  deliveredToday: number;
  cashToSettle: Paisa;
}

/**
 * DEMO link until the backend joins the apps (Phase 4): a Rider App frame, or a tab opened from Restaurant OS, asks that
 * page for its riders and that rider's deliveries, and sends the rider's steps back. A direct visit keeps sample data.
 */
export const RIDER_LINK_ASK = 'lala-rider-link-ask';
export const RIDER_LINK_DATA = 'lala-rider-link-data';
export const RIDER_LINK_COMMAND = 'lala-rider-link-command';
export const RIDER_LINK_RESULT = 'lala-rider-link-result';

export interface RiderLinkData {
  restaurantSlug: string;
  branchSlug: string;
  restaurantName: string;
  branchName: string;
  riders: RiderAccount[];
  /** The asking rider's deliveries of this business day, and any still running */
  deliveries: RiderDelivery[];
}

export type RiderLinkCommand =
  | { kind: 'LOGIN'; riderId: Uuid }
  | { kind: 'SET_ONLINE'; riderId: Uuid; online: boolean }
  | { kind: 'PICKED_UP'; riderId: Uuid; orderId: Uuid }
  | { kind: 'DELIVERED'; riderId: Uuid; orderId: Uuid };

/** Checks the shape of what came through the link, so a broken message never reaches a screen. */
export function isRiderLinkData(value: unknown): value is RiderLinkData {
  const data = value as Partial<RiderLinkData> | null;
  return (
    !!data &&
    typeof data.restaurantSlug === 'string' &&
    typeof data.branchSlug === 'string' &&
    typeof data.restaurantName === 'string' &&
    typeof data.branchName === 'string' &&
    Array.isArray(data.riders) &&
    Array.isArray(data.deliveries)
  );
}

import { daysBetween } from './inventory';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Stock lots and expiry (owner's Prompt 1 "Wastage & Expiry", step W3, 2026-11-11). Every supplier bill line and every cooking
 * batch is its own lot with its own date; the stock that was there before lots is one "old stock" lot per item, its date not
 * confirmed. A lot is never deleted.
 *
 * - Use-by passed → EXPIRED: blocked, never cooked with, sold, eaten by staff or given away. Nothing is thrown away by itself.
 * - Best-before passed → PAST_BEST: usable, to be looked at.
 * - No date, or a date nobody confirmed → NEEDS_REVIEW: usable but never shown as safe (owner, 2026-11-11).
 * - Food put back by a reversal → HELD until the Owner or a Manager releases it; expired food is never released.
 *
 * Sales and cooking name no lot: they take from the usable lots, earliest date first (FEFO), and never from an expired or held
 * lot. A waste line may name its lot. The remaining quantity of every lot is worked out from the stock movements, so the total
 * always equals the stock on hand.
 * Roman Urdu: Har delivery ka apna lot aur apni date. Expired maal block, istemal nahi hota. Bina date ka maal "Needs review".
 */

export const DATE_KINDS = ['USE_BY', 'BEST_BEFORE', 'UNKNOWN'] as const;
export type DateKind = (typeof DATE_KINDS)[number];

/** OLD_STOCK = stock from before lots; RETURNED = put back by a waste reversal (held); REQUEST = held by a waste report (W4); NONE = stock on no lot (a correction that added stock) */
export type LotSource = 'OLD_STOCK' | 'PURCHASE' | 'BATCH' | 'RETURNED' | 'REQUEST' | 'NONE';

export interface StockLot extends BranchScoped {
  id: Uuid;
  ingredientId: Uuid;
  source: LotSource;
  /** The supplier bill (khata entry), the cooking batch or the waste event it came from */
  sourceId: Uuid | null;
  supplierId?: Uuid | null;
  receivedAt: IsoDateTime;
  /** What came in (stock-unit thousandths) and what it cost; the remaining quantity comes from the movements */
  firstMilli: number;
  cost: Paisa | null;
  /** The date on the label (YYYY-MM-DD, Asia/Karachi); null = not known */
  date: string | null;
  dateKind: DateKind;
  /** Cooked food: thrown away from this time (the dish's own hours; no default, owner 2026-11-11) */
  discardAt?: IsoDateTime | null;
  /** Typed by a person, copied from the old one-date-per-item field, from the dish's hours, or none */
  dateFrom: 'TYPED' | 'OLD_STOCK' | 'DISH_HOURS' | 'NONE';
  /** The date was not confirmed by a person: Needs review until someone does */
  unverified: boolean;
  held: boolean;
  holdReason?: string;
  release?: { by: Uuid; at: IsoDateTime; note: string } | null;
  dateSetBy?: Uuid | null;
  dateSetAt?: IsoDateTime | null;
  createdBy: Uuid;
  createdAt: IsoDateTime;
}

export type LotState = 'OK' | 'SOON' | 'PAST_BEST' | 'NEEDS_REVIEW' | 'EXPIRED' | 'HELD' | 'EMPTY';

/** States that may be cooked with, sold, eaten or given away. Expired and held stock never is. */
export const USABLE_LOT_STATES: readonly LotState[] = ['OK', 'SOON', 'PAST_BEST', 'NEEDS_REVIEW'];
export const isUsableState = (state: LotState): boolean => USABLE_LOT_STATES.includes(state);

/** Now in the branch's time zone: its calendar date (YYYY-MM-DD) and the instant */
export interface LotClock {
  date: string;
  at: number;
}

/**
 * The state of a lot whatever is left in it: held first, then a passed use-by date or discard time (EXPIRED, also when the date
 * was never confirmed), then a date nobody confirmed or no date (NEEDS_REVIEW), then a passed best-before date, then SOON
 * within `soonDays` of a date.
 */
export function lotDateState(lot: Pick<StockLot, 'held' | 'date' | 'dateKind' | 'discardAt' | 'unverified'>, now: LotClock, soonDays: number): Exclude<LotState, 'EMPTY'> {
  if (lot.held) return 'HELD';
  if (lot.discardAt) return now.at >= Date.parse(lot.discardAt) ? 'EXPIRED' : lot.unverified ? 'NEEDS_REVIEW' : 'OK';
  if (!lot.date || lot.dateKind === 'UNKNOWN') return 'NEEDS_REVIEW';
  const days = daysBetween(now.date, lot.date);
  if (lot.dateKind === 'USE_BY' && days < 0) return 'EXPIRED';
  // A warning is never hidden: past best-before and expiring soon show even on a date nobody confirmed (it still needs review)
  if (days < 0) return 'PAST_BEST';
  if (days <= soonDays) return 'SOON';
  return lot.unverified ? 'NEEDS_REVIEW' : 'OK';
}

/** Needs review: no date, or a date nobody confirmed, on stock that is not expired or held (those have their own lists). */
export function needsReview(lot: Pick<StockLot, 'date' | 'dateKind' | 'discardAt' | 'unverified'>, state: LotState): boolean {
  return state === 'NEEDS_REVIEW' || (lot.unverified && (state === 'SOON' || state === 'PAST_BEST'));
}

export function lotState(lot: Pick<StockLot, 'held' | 'date' | 'dateKind' | 'discardAt' | 'unverified'>, remainingMilli: number, now: LotClock, soonDays: number): LotState {
  return remainingMilli <= 0 ? 'EMPTY' : lotDateState(lot, now, soonDays);
}

/** Earliest date first; a discard time counts by its day; no date last; then the oldest delivery. */
export function fefoOrder(a: Pick<StockLot, 'date' | 'discardAt' | 'receivedAt'>, b: Pick<StockLot, 'date' | 'discardAt' | 'receivedAt'>): number {
  const key = (l: Pick<StockLot, 'date' | 'discardAt'>) => l.discardAt ?? (l.date ? `${l.date}T23:59:59.999+05:00` : null);
  const ka = key(a);
  const kb = key(b);
  if (ka && kb && ka !== kb) return Date.parse(ka) - Date.parse(kb);
  if (ka && !kb) return -1;
  if (!ka && kb) return 1;
  return a.receivedAt.localeCompare(b.receivedAt);
}

// ── Remaining per lot ─────────────────────────────────────────────────────────────────────────

export interface LotMovement {
  id: Uuid;
  ingredientId: Uuid;
  type: string;
  quantityMilli: number;
  createdAt: IsoDateTime;
  lotId?: Uuid;
  orderItemId?: Uuid;
  batchId?: Uuid;
  wasteId?: Uuid;
  /** A correction puts back exactly what this movement took, into the same lots */
  restoresMovementId?: Uuid;
}

export interface LotLedger {
  /** Remaining per lot id (stock-unit thousandths); a lot with no movement left has 0 */
  remaining: Map<Uuid, number>;
  /** Stock that is on no lot, per item: corrections that added stock (positive), or use beyond the usable lots (negative) */
  none: Map<Uuid, number>;
  /** Which lots each movement took from or added to */
  taken: Map<Uuid, { lotId: Uuid | null; milli: number }[]>;
  /** Items whose use went beyond the usable lots: an expired or held lot may be in use — check it */
  overdrawn: Set<Uuid>;
}

/** Thrown away, or held for a waste report (W4): the expired stock first */
const WASTE_TYPES = new Set(['WASTE', 'WASTE_HOLD']);

/**
 * Replays the movements, oldest first. Before `since` (the day lots started) everything belongs to the item's old-stock lot. After
 * it: a movement that names its lot goes to that lot; use that names none comes from the usable lots, earliest date first (waste
 * may also take the expired lots first: they are the ones thrown away); stock coming back (an Undo, a reversed batch, a corrected
 * waste) goes back to the lots it came from; anything else is on no lot.
 */
export function lotLedger(lots: readonly StockLot[], movements: readonly LotMovement[], since: IsoDateTime | null, blocked: (lot: StockLot, at: IsoDateTime) => boolean): LotLedger {
  const remaining = new Map<Uuid, number>(lots.map((l) => [l.id, 0]));
  const none = new Map<Uuid, number>();
  const taken = new Map<Uuid, { lotId: Uuid | null; milli: number }[]>();
  const overdrawn = new Set<Uuid>();
  const byItem = new Map<Uuid, StockLot[]>();
  for (const lot of lots) byItem.set(lot.ingredientId, [...(byItem.get(lot.ingredientId) ?? []), lot]);
  const oldLot = new Map(lots.filter((l) => l.source === 'OLD_STOCK').map((l) => [l.ingredientId, l.id]));
  const add = (lotId: Uuid | null, ingredientId: Uuid, milli: number) => {
    if (lotId && remaining.has(lotId)) remaining.set(lotId, remaining.get(lotId)! + milli);
    else none.set(ingredientId, (none.get(ingredientId) ?? 0) + milli);
  };
  const ordered = movements.map((m, index) => ({ m, index })).sort((a, b) => a.m.createdAt.localeCompare(b.m.createdAt) || a.index - b.index);
  for (const { m } of ordered) {
    const parts: { lotId: Uuid | null; milli: number }[] = [];
    if (since !== null && m.createdAt < since) {
      parts.push({ lotId: oldLot.get(m.ingredientId) ?? null, milli: m.quantityMilli });
    } else if (m.lotId && remaining.has(m.lotId)) {
      parts.push({ lotId: m.lotId, milli: m.quantityMilli });
    } else if (m.quantityMilli < 0) {
      let left = -m.quantityMilli;
      // Only deliveries that were there at that time, judged as they were then (a lot that expired later was fine then)
      const candidates = [...(byItem.get(m.ingredientId) ?? [])].filter((l) => l.createdAt <= m.createdAt).sort(fefoOrder);
      const isBlocked = (l: StockLot) => blocked(l, m.createdAt);
      const usable = candidates.filter((l) => !isBlocked(l));
      // Thrown away without naming a lot: the expired lots first, then the oldest; held food last
      const order = WASTE_TYPES.has(m.type) ? [...candidates.filter((l) => isBlocked(l) && !l.held), ...usable, ...candidates.filter((l) => l.held)] : usable;
      for (const lot of order) {
        if (left <= 0) break;
        const have = remaining.get(lot.id)!;
        if (have <= 0) continue;
        const take = Math.min(have, left);
        parts.push({ lotId: lot.id, milli: -take });
        left -= take;
      }
      if (left > 0) {
        // Stock on no lot is used last; beyond it, while an expired or held lot still has stock, someone may be using it
        if (left > Math.max(0, none.get(m.ingredientId) ?? 0) && candidates.some((l) => remaining.get(l.id)! > 0)) overdrawn.add(m.ingredientId);
        parts.push({ lotId: null, milli: -left });
      }
    } else if (m.quantityMilli > 0 && (m.restoresMovementId || m.orderItemId || m.batchId)) {
      // Coming back: the lots that the linked movements took from, the last ones first
      const from = ordered
        .filter(({ m: o }) => o !== m && o.ingredientId === m.ingredientId && o.quantityMilli < 0 && o.createdAt <= m.createdAt && linked(m, o))
        .flatMap(({ m: o }) => taken.get(o.id) ?? [])
        .filter((p) => p.milli < 0)
        .reverse();
      let left = m.quantityMilli;
      for (const p of from) {
        if (left <= 0) break;
        const back = Math.min(-p.milli, left);
        // Never more than was taken: a part that was given back already is used up
        p.milli += back;
        parts.push({ lotId: p.lotId, milli: back });
        left -= back;
      }
      if (left > 0) parts.push({ lotId: null, milli: left });
    } else if (m.quantityMilli > 0) {
      parts.push({ lotId: null, milli: m.quantityMilli });
    }
    for (const p of parts) add(p.lotId, m.ingredientId, p.milli);
    taken.set(m.id, parts.map((p) => ({ ...p })));
  }
  return { remaining, none, taken, overdrawn };
}

/** Stock coming back belongs to the use it undoes: the same order line, the same cooking batch, or the corrected waste line. */
function linked(back: LotMovement, use: LotMovement): boolean {
  if (back.restoresMovementId) return back.restoresMovementId === use.id;
  if (back.orderItemId) return use.orderItemId === back.orderItemId;
  if (back.batchId) return use.batchId === back.batchId;
  return false;
}

/** What may be used now: the usable lots plus stock on no lot (Needs review), never below zero. */
export function usableOfLots(ingredientId: Uuid, lots: readonly StockLot[], ledger: Pick<LotLedger, 'remaining' | 'none'>, isUsable: (lot: StockLot) => boolean): number {
  const inLots = lots.filter((l) => l.ingredientId === ingredientId && isUsable(l)).reduce((sum, l) => sum + Math.max(0, ledger.remaining.get(l.id) ?? 0), 0);
  return Math.max(0, inLots + (ledger.none.get(ingredientId) ?? 0));
}

// ── Checks ────────────────────────────────────────────────────────────────────────────────────

export const MAX_DISCARD_HOURS = 72;

export type LotDateProblem = 'DATE_INVALID' | 'KIND_INVALID' | 'HOURS_INVALID';

/** A date on a bill line or a lot: a real YYYY-MM-DD date with Use-by or Best-before, or none (Unknown). */
export function checkLotDate(input: { date: string | null; dateKind: string }): LotDateProblem | null {
  if (!(DATE_KINDS as readonly string[]).includes(input.dateKind)) return 'KIND_INVALID';
  if (input.date === null) return input.dateKind === 'UNKNOWN' ? null : 'DATE_INVALID';
  if (input.dateKind === 'UNKNOWN') return 'KIND_INVALID';
  return /^\d{4}-\d{2}-\d{2}$/.test(input.date) && !Number.isNaN(Date.parse(`${input.date}T00:00:00Z`)) ? null : 'DATE_INVALID';
}

/** A cooked dish's discard time: whole hours, 1–72. */
export function checkDiscardHours(hours: number): LotDateProblem | null {
  return Number.isInteger(hours) && hours >= 1 && hours <= MAX_DISCARD_HOURS ? null : 'HOURS_INVALID';
}

export const discardAtOf = (madeAt: IsoDateTime, hours: number): IsoDateTime => new Date(Date.parse(madeAt) + hours * 3_600_000).toISOString();

export type ReleaseProblem = 'NOT_HELD' | 'EXPIRED' | 'NOT_SAFE' | 'NOTHING_LEFT';

/** Held food comes back only when a person confirms it is safe, and never when its date has passed. */
export function checkRelease(lot: Pick<StockLot, 'held' | 'date' | 'dateKind' | 'discardAt' | 'unverified'>, remainingMilli: number, safe: boolean, now: LotClock, soonDays: number): ReleaseProblem | null {
  if (!lot.held) return 'NOT_HELD';
  if (remainingMilli <= 0) return 'NOTHING_LEFT';
  if (lotDateState({ ...lot, held: false }, now, soonDays) === 'EXPIRED') return 'EXPIRED';
  if (!safe) return 'NOT_SAFE';
  return null;
}

// ── What the screens get ──────────────────────────────────────────────────────────────────────

export interface LotRow {
  lot: StockLot;
  ingredientName: string;
  cooked: boolean;
  purchaseUnit: string;
  stockUnit: string;
  remainingMilli: number;
  state: LotState;
  supplierName: string | null;
  billNo: string | null;
  /** Days to its date (negative = passed); null without a date */
  days: number | null;
  setByName: string | null;
  releasedByName: string | null;
  /** A cooked dish's own discard hours, if set */
  dishHours: number | null;
}

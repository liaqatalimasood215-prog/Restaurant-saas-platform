import { MAX_QUANTITY, MILLI, buyStockMilli, findBuyOption, type Ingredient, type IngredientCategory, type PurchaseUnit } from './inventory';
import type { WastePart } from './wastage';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Stock Count (owner's Stage A, 2026-11-12): count what is really on the shelf — all stock, one category or one storage place.
 * A count keeps the stock it expected when it started (snapshot). Each item is counted in any of its units (1 carton + 3 bottles);
 * a blank row is NOT counted, never zero. Sales, cooking and waste go on while counting: an item's expected stock is the stock at
 * the moment it was counted, so the difference never counts them twice. The Owner or a Manager approves (a Manager never his own
 * count); then one COUNT movement per item that differs is posted, once: less = taken from the lots (the expired stock first),
 * more = stock without a delivery (Needs review). A count is never edited after approval or deleted; its history stays.
 * Roman Urdu: Shelf par asal maal gino. Khali khana = nahi gina. Farq approve ke baad stock mein, ek dafa.
 */

export const COUNT_SCOPES = ['ALL', 'CATEGORY', 'LOCATION'] as const;
export type CountScopeKind = (typeof COUNT_SCOPES)[number];
export type CountScope = { kind: 'ALL' } | { kind: 'CATEGORY'; category: IngredientCategory } | { kind: 'LOCATION'; locationId: Uuid };

export type CountStatus = 'COUNTING' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED';

export interface CountLine {
  ingredientId: Uuid;
  /** What the system expected when the count started */
  snapshotMilli: number;
  /** As typed (null = not counted); the unit sizes kept so a later packing edit changes nothing */
  parts: WastePart[] | null;
  countedMilli: number | null;
  /** When it was counted: the expected stock is the stock at this moment (sales, cooking and waste after it are not counted twice) */
  countedAt: IsoDateTime | null;
  countedBy: Uuid | null;
  note: string;
  /** Filled at approval: expected at the moment it was counted, the difference, its value at cost and the movement posted */
  expectedMilli?: number;
  diffMilli?: number;
  cost?: Paisa | null;
  movementId?: Uuid | null;
}

export type CountAction = 'STARTED' | 'SUBMITTED' | 'RETURNED' | 'APPROVED' | 'CANCELLED';

export interface StockCount extends BranchScoped {
  id: Uuid;
  /** Short number for people: Count #3 */
  number: number;
  scope: CountScope;
  status: CountStatus;
  lines: CountLine[];
  note: string;
  startedBy: Uuid;
  startedAt: IsoDateTime;
  /** Every step, never edited: who, when, why */
  history: { action: CountAction; by: Uuid; at: IsoDateTime; note: string }[];
}

export const MAX_COUNT_PARTS = 3;
export const MAX_COUNT_NOTE = 140;

/** The items a count covers: active items (raw, packaging and cooked) of the chosen category or storage place, or all. */
export function inScope(item: Pick<Ingredient, 'isActive' | 'category' | 'locationId'>, scope: CountScope): boolean {
  if (!item.isActive) return false;
  if (scope.kind === 'CATEGORY') return item.category === scope.category;
  if (scope.kind === 'LOCATION') return item.locationId === scope.locationId;
  return true;
}

type CountItem = Parameters<typeof findBuyOption>[0];

/**
 * Stock-unit thousandths of a count typed in one or more units (1 carton of 24 + 3 bottles = 27 bottles). Zero is a real count;
 * null when a unit is unknown, a quantity is missing or negative, or a unit is used twice.
 */
export function countStockMilli(parts: readonly { unitKey: string; quantityMilli: number | null }[], item: CountItem): number | null {
  if (parts.length === 0 || parts.length > MAX_COUNT_PARTS) return null;
  if (new Set(parts.map((p) => p.unitKey)).size !== parts.length) return null;
  let total = 0;
  for (const part of parts) {
    const option = findBuyOption(item, part.unitKey);
    if (!option || part.quantityMilli === null || !Number.isInteger(part.quantityMilli) || part.quantityMilli < 0 || part.quantityMilli > MAX_QUANTITY * MILLI) return null;
    total += buyStockMilli(part.quantityMilli, option.sizeMilli);
  }
  return total;
}

/** The difference of one counted line: counted − expected at the moment it was counted (positive = more on the shelf). */
export const countDiff = (countedMilli: number, expectedMilli: number): number => countedMilli - expectedMilli;

export type CountProblem = 'NOT_COUNTING' | 'NOT_SUBMITTED' | 'NOTHING_COUNTED' | 'OWN_COUNT' | 'REASON_REQUIRED' | 'NOTE_TOO_LONG' | 'ALREADY_OPEN' | 'NO_ITEMS';

/** Submit for approval: still counting and at least one item counted. */
export function checkSubmit(count: Pick<StockCount, 'status' | 'lines'>): CountProblem | null {
  if (count.status !== 'COUNTING') return 'NOT_COUNTING';
  return count.lines.some((l) => l.countedMilli !== null) ? null : 'NOTHING_COUNTED';
}

/**
 * Approve: a submitted count, by the Owner or a Manager — a Manager never approves a count he started, submitted or counted in
 * (audit decision #6); the Owner may approve his own.
 */
export function checkApprove(count: Pick<StockCount, 'status' | 'lines' | 'startedBy' | 'history'>, approver: { id: Uuid; role: string }): CountProblem | null {
  if (count.status !== 'SUBMITTED') return 'NOT_SUBMITTED';
  if (approver.role === 'OWNER') return null;
  const own = count.startedBy === approver.id || count.lines.some((l) => l.countedBy === approver.id) || count.history.some((h) => h.action === 'SUBMITTED' && h.by === approver.id);
  return own ? 'OWN_COUNT' : null;
}

/** Send back for a recount or cancel: a reason, and not after approval. */
export function checkReturnOrCancel(count: Pick<StockCount, 'status'>, reason: string, action: 'RETURN' | 'CANCEL'): CountProblem | null {
  if (action === 'RETURN' && count.status !== 'SUBMITTED') return 'NOT_SUBMITTED';
  if (action === 'CANCEL' && count.status !== 'COUNTING' && count.status !== 'SUBMITTED') return 'NOT_COUNTING';
  if (!reason.trim()) return 'REASON_REQUIRED';
  return reason.trim().length > MAX_COUNT_NOTE ? 'NOTE_TOO_LONG' : null;
}

// ── What the screens get ──────────────────────────────────────────────────────────────────────

export interface CountRow {
  line: CountLine;
  name: string;
  cooked: boolean;
  purchaseUnit: PurchaseUnit;
  stockUnit: Ingredient['stockUnit'];
  /** The stock expected now (open count) or when it was counted / at approval (counted, approved) */
  expectedMilli: number;
  diffMilli: number | null;
  /** The difference at cost (null = no price); for the Owner and a Manager */
  cost: Paisa | null;
  /** Some of its stock is expired or held (it is counted with the rest) */
  blockedMilli: number;
  countedByName: string | null;
}

export interface CountSummary {
  items: number;
  counted: number;
  withDifference: number;
  /** Value of what is missing (negative) and extra (positive), at cost; unknown prices left out */
  lossCost: Paisa;
  gainCost: Paisa;
  unknownCost: number;
}

export function summarizeCount(rows: readonly Pick<CountRow, 'line' | 'diffMilli' | 'cost'>[]): CountSummary {
  const sum: CountSummary = { items: rows.length, counted: 0, withDifference: 0, lossCost: 0, gainCost: 0, unknownCost: 0 };
  for (const row of rows) {
    if (row.line.countedMilli === null) continue;
    sum.counted += 1;
    if (!row.diffMilli) continue;
    sum.withDifference += 1;
    if (row.cost === null) sum.unknownCost += 1;
    else if (row.diffMilli < 0) sum.lossCost += row.cost;
    else sum.gainCost += row.cost;
  }
  return sum;
}

export interface CountListRow {
  count: StockCount;
  scopeLabel: string;
  startedByName: string | null;
  lastByName: string | null;
  summary: CountSummary;
}

export interface CountView {
  count: StockCount;
  scopeLabel: string;
  rows: CountRow[];
  summary: CountSummary;
  historyNames: Record<Uuid, string>;
  /** May this person approve it (Owner / Manager, not a Manager's own count)? */
  canApprove: boolean;
}

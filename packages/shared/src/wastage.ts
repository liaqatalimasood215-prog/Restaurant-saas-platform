import { businessDate, DEFAULT_TIME_ZONE } from './business-day';
import { MAX_QUANTITY, MILLI, buyStockMilli, findBuyOption, mulDivRound, purchaseConversion, type Ingredient, type PurchaseUnit } from './inventory';
import type { LotRow } from './lots';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Stock wastage (owner's Prompt 1 "Wastage & Expiry", step W1, 2026-11-11): raw ingredients and packaging that were thrown
 * away. One incident = one waste event with one or more lines; posting it writes one WASTE stock movement per line, once
 * (idempotency key), all lines together or none. The loss is valued at the ingredient's last purchase price (an estimate;
 * lot costs come with W3), never at the selling price; no price = Unknown, never Rs. 0. A posted event is never edited.
 * W2 (2026-11-11): cooked stock (one movement on the cooked dish, never on its raw ingredients: they left at the batch),
 * cancelled-order food (no movement at all: its stock left at the kitchen's Ready), Staff meal and Donation as their own kinds
 * with their own totals, and Reverse / Correct (Owner / Manager, a reason; the event is never edited, a reversal is linked).
 * Lots and approval follow in W3–W4.
 * Roman Urdu: Kharab maal ek dafa likhein: kya, kitna, kyun. Stock ek dafa kam hota hai, nuqsan khareed ki qeemat par.
 */

/** What happened to it: thrown away, eaten by the staff, or given away. Staff meals and donations are never waste cost. */
export const WASTE_KINDS = ['WASTE', 'STAFF_MEAL', 'DONATION'] as const;
export type WasteKind = (typeof WASTE_KINDS)[number];

/** Why it was thrown away. "Unsold cooked food at closing" and "Cancelled prepared food" are for prepared food (W2). */
export const STOCK_WASTE_REASONS = ['EXPIRED', 'SPOILED', 'DAMAGED', 'SPILLED', 'BURNT', 'PREP_MISTAKE', 'CLOSING_DISCARD', 'CANCELLED_DISCARD', 'OTHER'] as const;
export type StockWasteReason = (typeof STOCK_WASTE_REASONS)[number];
/** The reasons offered for raw ingredients and packaging (W1) */
export const RAW_WASTE_REASONS: readonly StockWasteReason[] = ['EXPIRED', 'SPOILED', 'DAMAGED', 'SPILLED', 'BURNT', 'PREP_MISTAKE', 'OTHER'];
/** The reasons offered for cooked stock (W2) */
export const COOKED_WASTE_REASONS: readonly StockWasteReason[] = ['SPOILED', 'BURNT', 'SPILLED', 'EXPIRED', 'CLOSING_DISCARD', 'PREP_MISTAKE', 'OTHER'];

/** The reasons offered for one item: cooked stock or a raw ingredient / packaging */
export function wasteReasonsFor(kind: Ingredient['kind']): readonly StockWasteReason[] {
  return kind === 'PREPARED' ? COOKED_WASTE_REASONS : RAW_WASTE_REASONS;
}

/** Where in the day it happened. Holding, cancelled order and served leftover come with prepared food (W2). */
export const WASTE_STAGES = ['STORAGE', 'PREPARATION', 'COOKING', 'HOLDING', 'CANCELLED_ORDER', 'SERVED_LEFTOVER'] as const;
export type WasteStage = (typeof WASTE_STAGES)[number];
export const RAW_WASTE_STAGES: readonly WasteStage[] = ['STORAGE', 'PREPARATION', 'COOKING'];
/** Stages of Record Waste from W2: cooked food kept warm or in the fridge is HOLDING */
export const STOCK_WASTE_STAGES: readonly WasteStage[] = ['STORAGE', 'PREPARATION', 'COOKING', 'HOLDING'];

export const MAX_WASTE_LINES = 20;
/** Ways to type one line's quantity: 1 carton + 2 bottles */
export const MAX_WASTE_PARTS = 3;
export const MAX_WASTE_NOTE = 140;
/** An incident may be recorded up to 7 days late, never in the future (a typing guard) */
export const MAX_WASTE_AGE_DAYS = 7;
export const MAX_REVERSE_REASON = 140;

/** One way the quantity was typed, as it was at posting (the unit's size is kept, so a later packing edit changes nothing). */
export interface WastePart {
  /** 'main', 'loose:kg', 'pack:<id>' */
  unitKey: string;
  unit: PurchaseUnit;
  /** Stock-unit thousandths in one of this unit */
  unitSizeMilli: number;
  /** Thousandths of this unit as typed */
  quantityMilli: number;
}

/**
 * How the loss was valued: the last purchase price (raw, packaging), the cooking batch that made it (its cost shared by what it
 * actually made), the recipe estimate (no batch yet), or the cost the order line kept at the kitchen's Ready.
 */
export type WasteCostBasis = 'PURCHASE_PRICE' | 'BATCH' | 'RECIPE' | 'ORDER';

/** Cancelled-order or Available Food portions (W2): no stock movement, the stock left once at the kitchen's Ready. */
export interface WasteOrderFood {
  menuItemId: Uuid | null;
  name: string;
  variantName: string | null;
  /** Portions as sold (1 = one plate / one 1 kg) */
  quantity: number;
  unit: string;
  orderId: Uuid | null;
  dailyNumber: number | null;
  availableId: Uuid | null;
}

export interface WasteLine {
  /** The stock item; null for order food */
  ingredientId: Uuid | null;
  /** W3: the lot the line named */
  lotId?: Uuid | null;
  /** W2: STOCK (raw / packaging, also every W1 line), COOKED (cooked stock), ORDER_FOOD (missing = STOCK) */
  itemKind?: 'STOCK' | 'COOKED' | 'ORDER_FOOD';
  orderFood?: WasteOrderFood;
  parts: WastePart[];
  /** Stock-unit thousandths that left the stock (positive) */
  stockMilli: number;
  /** Why it was thrown away; null for a staff meal or a donation */
  reason: StockWasteReason | null;
  note: string;
  /** The loss at the last purchase price; null = no price, Unknown */
  cost: Paisa | null;
  /** W2: how the cost was found (missing = PURCHASE_PRICE) */
  costBasis?: WasteCostBasis;
  /** The price it was valued at (paisa per one main purchase unit) and that unit's size, kept so a later price changes nothing */
  pricePaisa: Paisa | null;
  priceUnitMilli: number | null;
  /** Stock before and after this line */
  beforeMilli: number;
  afterMilli: number;
  /** The stock movement; null for order food (no movement) */
  movementId: Uuid | null;
}

/** A reversal (W2): who, when, why, the movements that put the stock back, and the new event when it was a correction. */
export interface WasteReversal {
  by: Uuid;
  at: IsoDateTime;
  reason: string;
  movementIds: Uuid[];
  correctedById: Uuid | null;
}

export interface WasteEvent extends BranchScoped {
  id: Uuid;
  /** When it happened (may be earlier than createdAt) and the business day that counts */
  at: IsoDateTime;
  businessDate: string;
  stage: WasteStage;
  /** W2: missing = WASTE */
  kind?: WasteKind;
  /** W2: Record Waste, Available Food (closing / its buttons) or a cancelled order line; W4: an approved staff report; missing = RECORD */
  source?: 'RECORD' | 'AVAILABLE_FOOD' | 'ORDER_CANCEL' | 'REQUEST';
  /** W4: the staff report it came from (createdBy = who reported it, approvedBy = who approved it) */
  requestId?: Uuid;
  lines: WasteLine[];
  note: string;
  /** REVERSED: put back by a linked reversal; never edited or deleted */
  status: 'POSTED' | 'REVERSED';
  reversal?: WasteReversal;
  /** The event this one corrects (W2) */
  correctsId?: Uuid;
  createdBy: Uuid;
  createdAt: IsoDateTime;
  /** W1: the Owner or Manager who records also posts; staff requests and approval come with W4 */
  approvedBy: Uuid;
}

export const kindOf = (event: Pick<WasteEvent, 'kind'>): WasteKind => event.kind ?? 'WASTE';

export interface WasteLineInput {
  ingredientId: Uuid;
  /** W3: the lot it came from; missing = the expired lots first, then the oldest (waste), or the usable lots (staff meal, donation) */
  lotId?: Uuid | null;
  parts: { unitKey: string; quantityMilli: number | null }[];
  reason: StockWasteReason | null;
  note: string;
}

type WasteItem = Pick<Ingredient, 'id' | 'kind' | 'isActive' | 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice' | 'packings' | 'loosePrice'>;

/**
 * What a cooked dish costs for a waste line: the latest batch that made it (its cost shared by what it actually made), else
 * the recipe estimate. Null = Unknown.
 */
export interface CookedPrice {
  basis: 'BATCH' | 'RECIPE';
  /** Paisa for `perMilli` stock-unit thousandths */
  paisa: Paisa;
  perMilli: number;
}

export function cookedWasteCost(price: CookedPrice | null | undefined, stockMilli: number): Paisa | null {
  return price && price.perMilli > 0 ? mulDivRound(stockMilli, price.paisa, price.perMilli) : null;
}

/** Stock-unit thousandths of a line's parts (1 carton of 12 + 2 bottles = 14 bottles), or null when a part is wrong. */
export function wasteStockMilli(parts: readonly { unitKey: string; quantityMilli: number | null }[], item: WasteItem): number | null {
  let total = 0;
  for (const part of parts) {
    const option = findBuyOption(item, part.unitKey);
    if (!option || part.quantityMilli === null || !Number.isInteger(part.quantityMilli) || part.quantityMilli <= 0) return null;
    total += buyStockMilli(part.quantityMilli, option.sizeMilli);
  }
  return total;
}

/** The loss at the last purchase price (per main purchase unit): 2 L of milk at Rs. 220 / L = Rs. 440. Null without a price. */
export function wasteCost(item: Pick<Ingredient, 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice'>, stockMilli: number): { cost: Paisa; pricePaisa: Paisa; priceUnitMilli: number } | null {
  const conversion = purchaseConversion(item.purchaseUnit, item.stockUnit, item.packSizeMilli);
  if (!conversion.ok || !Number.isInteger(item.purchasePrice) || item.purchasePrice <= 0) return null;
  return { cost: mulDivRound(stockMilli, item.purchasePrice, conversion.factorMilli), pricePaisa: item.purchasePrice, priceUnitMilli: conversion.factorMilli };
}

export type WasteProblem =
  | 'NO_LINES'
  | 'TOO_MANY_LINES'
  | 'STAGE_INVALID'
  | 'TIME_INVALID'
  | 'NOTE_TOO_LONG'
  | 'ITEM_REQUIRED'
  | 'DUPLICATE_ITEM'
  | 'TOO_MANY_PARTS'
  | 'DUPLICATE_UNIT'
  | 'QUANTITY_INVALID'
  | 'REASON_REQUIRED'
  | 'NOTE_REQUIRED'
  | 'MORE_THAN_ON_HAND'
  | 'KIND_INVALID'
  | 'LOT_INVALID'
  | 'MORE_THAN_IN_LOT'
  | 'NOT_USABLE';

/** W3: what the lots hold, for the check: a lot's item, what is left in it and whether it may be used; an item's usable stock */
export interface WasteLotCheck {
  lot: (lotId: Uuid) => { ingredientId: Uuid; remainingMilli: number; usable: boolean } | null;
  usable: (ingredientId: Uuid) => number;
}

/**
 * The first problem with a waste incident, or null: a kind, a stage of Record Waste, a time not in the future and at most 7
 * days back, 1–20 lines, each an item in use (raw, packaging or cooked stock) listed once, 1–3 parts in different units with a
 * real quantity, for waste a reason of that item (a note for Other), never more than is on hand.
 */
export function checkWaste(
  input: { at: IsoDateTime; stage: string; lines: readonly WasteLineInput[]; note: string; kind?: string },
  items: readonly WasteItem[],
  onHand: (ingredientId: Uuid) => number,
  now: number,
  lots?: WasteLotCheck,
): { line: number | null; problem: WasteProblem } | null {
  const kind = input.kind ?? 'WASTE';
  if (!(WASTE_KINDS as readonly string[]).includes(kind)) return { line: null, problem: 'KIND_INVALID' };
  if (!(STOCK_WASTE_STAGES as readonly string[]).includes(input.stage)) return { line: null, problem: 'STAGE_INVALID' };
  const at = Date.parse(input.at);
  if (Number.isNaN(at) || at > now + 60_000 || at < now - MAX_WASTE_AGE_DAYS * 86_400_000) return { line: null, problem: 'TIME_INVALID' };
  if (input.note.trim().length > MAX_WASTE_NOTE) return { line: null, problem: 'NOTE_TOO_LONG' };
  if (input.lines.length === 0) return { line: null, problem: 'NO_LINES' };
  if (input.lines.length > MAX_WASTE_LINES) return { line: null, problem: 'TOO_MANY_LINES' };
  const seen = new Set<Uuid>();
  for (const [index, line] of input.lines.entries()) {
    const item = items.find((i) => i.id === line.ingredientId);
    if (!item || !item.isActive) return { line: index, problem: 'ITEM_REQUIRED' };
    if (seen.has(item.id)) return { line: index, problem: 'DUPLICATE_ITEM' };
    seen.add(item.id);
    if (line.parts.length === 0) return { line: index, problem: 'QUANTITY_INVALID' };
    if (line.parts.length > MAX_WASTE_PARTS) return { line: index, problem: 'TOO_MANY_PARTS' };
    if (new Set(line.parts.map((p) => p.unitKey)).size !== line.parts.length) return { line: index, problem: 'DUPLICATE_UNIT' };
    if (line.parts.some((p) => p.quantityMilli !== null && p.quantityMilli > MAX_QUANTITY * MILLI)) return { line: index, problem: 'QUANTITY_INVALID' };
    const stockMilli = wasteStockMilli(line.parts, item);
    if (stockMilli === null || stockMilli <= 0) return { line: index, problem: 'QUANTITY_INVALID' };
    if (kind === 'WASTE' && (!line.reason || !wasteReasonsFor(item.kind).includes(line.reason))) return { line: index, problem: 'REASON_REQUIRED' };
    if (line.note.trim().length > MAX_WASTE_NOTE) return { line: index, problem: 'NOTE_TOO_LONG' };
    if (kind === 'WASTE' && line.reason === 'OTHER' && !line.note.trim()) return { line: index, problem: 'NOTE_REQUIRED' };
    if (stockMilli > onHand(item.id)) return { line: index, problem: 'MORE_THAN_ON_HAND' };
    if (!lots) continue;
    // W3: a named lot of this item, never more than is left in it; food for the staff or given away only from usable stock
    if (line.lotId) {
      const lot = lots.lot(line.lotId);
      if (!lot || lot.ingredientId !== item.id) return { line: index, problem: 'LOT_INVALID' };
      if (stockMilli > lot.remainingMilli) return { line: index, problem: 'MORE_THAN_IN_LOT' };
      if (kind !== 'WASTE' && !lot.usable) return { line: index, problem: 'NOT_USABLE' };
    } else if (kind !== 'WASTE' && stockMilli > lots.usable(item.id)) {
      return { line: index, problem: 'NOT_USABLE' };
    }
  }
  return null;
}

export interface WasteSummary {
  /** Posted losses that have a price (paisa); lines without a price are counted apart */
  todayCost: Paisa;
  todayLines: number;
  todayUnknown: number;
  weekCost: Paisa;
  weekLines: number;
  weekUnknown: number;
}

/**
 * Today's and the last 7 business days' posted events of one kind (today included), by the business day of the incident.
 * Reversed events count nowhere; staff meals and donations never count as waste.
 */
export function summarizeWaste(events: readonly Pick<WasteEvent, 'businessDate' | 'lines' | 'status' | 'kind'>[], today: string, kind: WasteKind = 'WASTE'): WasteSummary {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 6);
  const weekStart = from.toISOString().slice(0, 10);
  const sum: WasteSummary = { todayCost: 0, todayLines: 0, todayUnknown: 0, weekCost: 0, weekLines: 0, weekUnknown: 0 };
  for (const event of events) {
    if (event.status !== 'POSTED' || kindOf(event) !== kind || event.businessDate < weekStart || event.businessDate > today) continue;
    for (const line of event.lines) {
      sum.weekLines += 1;
      if (line.cost === null) sum.weekUnknown += 1;
      else sum.weekCost += line.cost;
      if (event.businessDate !== today) continue;
      sum.todayLines += 1;
      if (line.cost === null) sum.todayUnknown += 1;
      else sum.todayCost += line.cost;
    }
  }
  return sum;
}

/** The business day an incident counts for (Asia/Karachi, the branch's day start). */
export function wasteBusinessDate(at: IsoDateTime, timeZone: string = DEFAULT_TIME_ZONE, dayStart?: string): string {
  return businessDate(new Date(at), timeZone, dayStart);
}

// ── Staff waste reports (W4, owner 2026-11-12) ────────────────────────────────────────────────

/**
 * A waste report from the Kitchen (or other staff the Owner allows): nothing is a loss and the supplier khata never changes, but the
 * food is held at once (a held lot), so it is never cooked, sold or eaten while it waits. The Owner or a Manager approves it (one
 * waste event from the held lot, once) or rejects it (with a reason) and then releases the food — only when it is safe and not
 * expired — or keeps it held. No Rs. limit: every report waits (owner's decision 3). A report is never edited or deleted.
 */
export interface WasteRequest extends BranchScoped {
  id: Uuid;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  at: IsoDateTime;
  businessDate: string;
  stage: WasteStage;
  lines: { ingredientId: Uuid; parts: WastePart[]; stockMilli: number; reason: StockWasteReason; note: string; heldLotId: Uuid }[];
  note: string;
  /** "Already thrown away": the person says it is gone; approval posts it as it is */
  thrownAway: boolean;
  requestedBy: Uuid;
  requestedAt: IsoDateTime;
  decidedBy?: Uuid | null;
  decidedAt?: IsoDateTime | null;
  /** Rejected: why, and whether the food went back to use or stays held */
  rejectReason?: string;
  released?: boolean;
  wasteEventId?: Uuid | null;
}

export type DecisionProblem = 'NOT_PENDING' | 'REASON_REQUIRED' | 'NOTE_TOO_LONG';

/** A report is decided once; a rejection needs a reason. */
export function checkDecision(request: Pick<WasteRequest, 'status'>, approve: boolean, reason: string): DecisionProblem | null {
  if (request.status !== 'PENDING') return 'NOT_PENDING';
  if (approve) return null;
  if (!reason.trim()) return 'REASON_REQUIRED';
  return reason.trim().length > MAX_REVERSE_REASON ? 'NOTE_TOO_LONG' : null;
}

export interface WasteRequestRow {
  request: WasteRequest;
  lines: { name: string; purchaseUnit: PurchaseUnit; stockUnit: Ingredient['stockUnit']; stockMilli: number; reason: StockWasteReason; note: string; cooked: boolean }[];
  requestedByName: string | null;
  decidedByName: string | null;
  /** At the last purchase price / batch cost; for the Owner and Manager only (null for the Kitchen's own list) */
  cost: Paisa | null;
}

export type ReverseProblem = 'NOT_POSTED' | 'ORDER_FOOD' | 'REASON_REQUIRED' | 'NOTE_TOO_LONG';

/**
 * Whether a posted event may be reversed: still POSTED (a reversal is done once), stock lines only (order food left the
 * restaurant: its record stays in W2), and a reason. Putting stock back can never take it below zero.
 */
export function checkReverse(event: Pick<WasteEvent, 'status' | 'lines'>, reason: string): ReverseProblem | null {
  if (event.status !== 'POSTED') return 'NOT_POSTED';
  if (event.lines.some((l) => l.itemKind === 'ORDER_FOOD')) return 'ORDER_FOOD';
  if (!reason.trim()) return 'REASON_REQUIRED';
  if (reason.trim().length > MAX_REVERSE_REASON) return 'NOTE_TOO_LONG';
  return null;
}

// ── What the screens get ─────────────────────────────────────────────────────────────────────

export interface WasteLogRow {
  event: WasteEvent;
  line: WasteLine;
  /** The item, or the order food's name with its size */
  ingredientName: string;
  /** The first line of its event (where Reverse / Correct are shown) */
  first: boolean;
  reversedByName: string | null;
  purchaseUnit: PurchaseUnit;
  stockUnit: Ingredient['stockUnit'];
  byName: string | null;
}

export interface WasteView {
  /** The business day (YYYY-MM-DD) */
  today: string;
  summary: WasteSummary;
  /** W2: staff meals and donations, apart from waste */
  meals: WasteSummary;
  donations: WasteSummary;
  /** W2: what a cooked dish costs for a waste line, by prepared item id */
  cookedPrices: Record<Uuid, CookedPrice | null>;
  /** W3: every lot with stock left (also held and expired ones), earliest date first */
  lots: LotRow[];
  /** W4: staff waste reports: pending ones first, then those decided in the last 7 days */
  requests: WasteRequestRow[];
  /** One row per line, newest first, at most `limit` */
  rows: WasteLogRow[];
  total: number;
  limit: number;
}

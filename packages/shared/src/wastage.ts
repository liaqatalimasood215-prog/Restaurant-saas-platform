import { businessDate, DEFAULT_TIME_ZONE } from './business-day';
import { MAX_QUANTITY, MILLI, buyStockMilli, findBuyOption, mulDivRound, purchaseConversion, type Ingredient, type PurchaseUnit } from './inventory';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Stock wastage (owner's Prompt 1 "Wastage & Expiry", step W1, 2026-11-11): raw ingredients and packaging that were thrown
 * away. One incident = one waste event with one or more lines; posting it writes one WASTE stock movement per line, once
 * (idempotency key), all lines together or none. The loss is valued at the ingredient's last purchase price (an estimate;
 * lot costs come with W3), never at the selling price; no price = Unknown, never Rs. 0. A posted event is never edited.
 * Prepared food, cancelled-order food, staff meals, donations, approval and reversal follow in W2–W4.
 * Roman Urdu: Kharab maal ek dafa likhein: kya, kitna, kyun. Stock ek dafa kam hota hai, nuqsan khareed ki qeemat par.
 */

/** Why it was thrown away. "Unsold cooked food at closing" and "Cancelled prepared food" are for prepared food (W2). */
export const STOCK_WASTE_REASONS = ['EXPIRED', 'SPOILED', 'DAMAGED', 'SPILLED', 'BURNT', 'PREP_MISTAKE', 'CLOSING_DISCARD', 'CANCELLED_DISCARD', 'OTHER'] as const;
export type StockWasteReason = (typeof STOCK_WASTE_REASONS)[number];
/** The reasons offered for raw ingredients and packaging (W1) */
export const RAW_WASTE_REASONS: readonly StockWasteReason[] = ['EXPIRED', 'SPOILED', 'DAMAGED', 'SPILLED', 'BURNT', 'PREP_MISTAKE', 'OTHER'];

/** Where in the day it happened. Holding, cancelled order and served leftover come with prepared food (W2). */
export const WASTE_STAGES = ['STORAGE', 'PREPARATION', 'COOKING', 'HOLDING', 'CANCELLED_ORDER', 'SERVED_LEFTOVER'] as const;
export type WasteStage = (typeof WASTE_STAGES)[number];
export const RAW_WASTE_STAGES: readonly WasteStage[] = ['STORAGE', 'PREPARATION', 'COOKING'];

export const MAX_WASTE_LINES = 20;
/** Ways to type one line's quantity: 1 carton + 2 bottles */
export const MAX_WASTE_PARTS = 3;
export const MAX_WASTE_NOTE = 140;
/** An incident may be recorded up to 7 days late, never in the future (a typing guard) */
export const MAX_WASTE_AGE_DAYS = 7;

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

export interface WasteLine {
  ingredientId: Uuid;
  parts: WastePart[];
  /** Stock-unit thousandths that left the stock (positive) */
  stockMilli: number;
  reason: StockWasteReason;
  note: string;
  /** The loss at the last purchase price; null = no price, Unknown */
  cost: Paisa | null;
  /** The price it was valued at (paisa per one main purchase unit) and that unit's size, kept so a later price changes nothing */
  pricePaisa: Paisa | null;
  priceUnitMilli: number | null;
  /** Stock before and after this line */
  beforeMilli: number;
  afterMilli: number;
  movementId: Uuid;
}

export interface WasteEvent extends BranchScoped {
  id: Uuid;
  /** When it happened (may be earlier than createdAt) and the business day that counts */
  at: IsoDateTime;
  businessDate: string;
  stage: WasteStage;
  lines: WasteLine[];
  note: string;
  status: 'POSTED';
  createdBy: Uuid;
  createdAt: IsoDateTime;
  /** W1: the Owner or Manager who records also posts; staff requests and approval come with W4 */
  approvedBy: Uuid;
}

export interface WasteLineInput {
  ingredientId: Uuid;
  parts: { unitKey: string; quantityMilli: number | null }[];
  reason: StockWasteReason | null;
  note: string;
}

type WasteItem = Pick<Ingredient, 'id' | 'kind' | 'isActive' | 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice' | 'packings' | 'loosePrice'>;

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
  | 'MORE_THAN_ON_HAND';

/**
 * The first problem with a waste incident, or null: a stage of W1, a time not in the future and at most 7 days back, 1–20
 * lines, each a bought ingredient in use (raw or packaging) listed once, 1–3 parts in different units with a real quantity,
 * a reason (a note for Other), never more than is on hand.
 */
export function checkWaste(
  input: { at: IsoDateTime; stage: string; lines: readonly WasteLineInput[]; note: string },
  items: readonly WasteItem[],
  onHand: (ingredientId: Uuid) => number,
  now: number,
): { line: number | null; problem: WasteProblem } | null {
  if (!(RAW_WASTE_STAGES as readonly string[]).includes(input.stage)) return { line: null, problem: 'STAGE_INVALID' };
  const at = Date.parse(input.at);
  if (Number.isNaN(at) || at > now + 60_000 || at < now - MAX_WASTE_AGE_DAYS * 86_400_000) return { line: null, problem: 'TIME_INVALID' };
  if (input.note.trim().length > MAX_WASTE_NOTE) return { line: null, problem: 'NOTE_TOO_LONG' };
  if (input.lines.length === 0) return { line: null, problem: 'NO_LINES' };
  if (input.lines.length > MAX_WASTE_LINES) return { line: null, problem: 'TOO_MANY_LINES' };
  const seen = new Set<Uuid>();
  for (const [index, line] of input.lines.entries()) {
    const item = items.find((i) => i.id === line.ingredientId);
    if (!item || !item.isActive || item.kind !== 'BOUGHT') return { line: index, problem: 'ITEM_REQUIRED' };
    if (seen.has(item.id)) return { line: index, problem: 'DUPLICATE_ITEM' };
    seen.add(item.id);
    if (line.parts.length === 0) return { line: index, problem: 'QUANTITY_INVALID' };
    if (line.parts.length > MAX_WASTE_PARTS) return { line: index, problem: 'TOO_MANY_PARTS' };
    if (new Set(line.parts.map((p) => p.unitKey)).size !== line.parts.length) return { line: index, problem: 'DUPLICATE_UNIT' };
    if (line.parts.some((p) => p.quantityMilli !== null && p.quantityMilli > MAX_QUANTITY * MILLI)) return { line: index, problem: 'QUANTITY_INVALID' };
    const stockMilli = wasteStockMilli(line.parts, item);
    if (stockMilli === null || stockMilli <= 0) return { line: index, problem: 'QUANTITY_INVALID' };
    if (!line.reason || !(RAW_WASTE_REASONS as readonly string[]).includes(line.reason)) return { line: index, problem: 'REASON_REQUIRED' };
    if (line.note.trim().length > MAX_WASTE_NOTE) return { line: index, problem: 'NOTE_TOO_LONG' };
    if (line.reason === 'OTHER' && !line.note.trim()) return { line: index, problem: 'NOTE_REQUIRED' };
    if (stockMilli > onHand(item.id)) return { line: index, problem: 'MORE_THAN_ON_HAND' };
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

/** Today's and the last 7 business days' posted waste (today included), by the business day of the incident. */
export function summarizeWaste(events: readonly Pick<WasteEvent, 'businessDate' | 'lines' | 'status'>[], today: string): WasteSummary {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 6);
  const weekStart = from.toISOString().slice(0, 10);
  const sum: WasteSummary = { todayCost: 0, todayLines: 0, todayUnknown: 0, weekCost: 0, weekLines: 0, weekUnknown: 0 };
  for (const event of events) {
    if (event.status !== 'POSTED' || event.businessDate < weekStart || event.businessDate > today) continue;
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

// ── What the screens get ─────────────────────────────────────────────────────────────────────

export interface WasteLogRow {
  event: WasteEvent;
  line: WasteLine;
  ingredientName: string;
  purchaseUnit: PurchaseUnit;
  stockUnit: Ingredient['stockUnit'];
  byName: string | null;
}

export interface WasteView {
  /** The business day (YYYY-MM-DD) */
  today: string;
  summary: WasteSummary;
  /** One row per line, newest first, at most `limit` */
  rows: WasteLogRow[];
  total: number;
  limit: number;
}

import { businessDate, DEFAULT_TIME_ZONE } from './business-day';
import { MILLI, mulDivRound } from './inventory';
import { grossQuantity, scaleBatch, scaleLines, type RecipeLine, type RecipeVersion } from './recipes';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Cooking batches and the cooking plan (owner's I3 brief, 2026-11-09).
 * - A batch uses the dish's VERIFIED recipe for an amount of its main raw ingredient (5 kg daal mash = the 1 kg recipe × 5),
 *   or for a number of batches when the recipe has no main ingredient (naan dough). In one step the raw ingredients go out of
 *   stock once (COOK_USE) and the ACTUAL cooked amount comes in (COOKED): raw weight is never taken as cooked weight.
 * - The cooking plan says what is cooked each day (a daily plan, changed for any date). Before cooking (8 pm for tomorrow,
 *   7 am for today) its needs are checked against the usable raw stock and the Owner / Manager are told what is short.
 * Roman Urdu: Degh pakao to kacha maal ek dafa kate aur asal pakka khana stock mein aaye. Kal ka plan pehle se check: kya kam hai.
 */

/** Cooked food is counted in grams (or ml); plates are shown with the dish's plate size (default 250 g, owner 2026-11-09). */
export const MAX_COOK_MILLI = 1_000_000 * MILLI;

export type CookMode = 'MAIN' | 'BATCHES';

export interface CookingBatch extends BranchScoped {
  id: Uuid;
  /** The cooked dish (a prepared item) */
  preparedId: Uuid;
  recipeId: Uuid;
  recipeVersion: number;
  /** MAIN: amountMilli is the main raw ingredient used (stock-unit thousandths); BATCHES: thousandths of a recipe batch */
  mode: CookMode;
  amountMilli: number;
  /** What left the raw stock, once (stock-unit thousandths each) */
  uses: { ingredientId: Uuid; quantityMilli: number }[];
  /** What the recipe expects this amount to make, and what was actually made (prepared item's stock unit) */
  expectedMilli: number;
  actualMilli: number;
  /** Raw cost at the day's purchase prices; null when an ingredient has no price */
  cost: Paisa | null;
  /** Grams in one plate of this dish when it was cooked */
  plateMilli: number;
  /** The plan day it was cooked for (YYYY-MM-DD) */
  planDate: string;
  note: string;
  status: 'DONE' | 'REVERSED';
  createdBy: Uuid;
  createdAt: IsoDateTime;
  corrections?: { fromMilli: number; toMilli: number; reason: string; by: Uuid; at: IsoDateTime }[];
  reversedBy?: Uuid | null;
  reversedAt?: IsoDateTime | null;
  reverseReason?: string;
}

export interface BatchPlan {
  /** The recipe scaled to this amount (net, as written) */
  lines: RecipeLine[];
  /** What leaves the raw stock: the main ingredient exactly as typed, the others with their loss; one row per ingredient */
  uses: { ingredientId: Uuid; quantityMilli: number }[];
  expectedMilli: number;
}

/**
 * The recipe for this batch: MAIN = the amount of the main raw ingredient, BATCHES = thousandths of one recipe batch (1,000 = one).
 * Null without a yield, a main ingredient (MAIN) or a sensible amount.
 */
export function batchPlan(version: Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'>, mode: CookMode, amountMilli: number): BatchPlan | null {
  if (!Number.isInteger(amountMilli) || amountMilli <= 0 || amountMilli > MAX_COOK_MILLI || !version.yieldMilli) return null;
  let lines: RecipeLine[];
  let expectedMilli: number;
  if (mode === 'MAIN') {
    const scale = scaleBatch(version, amountMilli);
    if (!scale) return null;
    lines = scale.lines;
    expectedMilli = scale.yieldMilli;
  } else {
    lines = scaleLines(version.lines, amountMilli, MILLI);
    expectedMilli = mulDivRound(version.yieldMilli, amountMilli, MILLI);
  }
  const used = new Map<Uuid, number>();
  for (const line of lines) {
    const take = mode === 'MAIN' && line.ingredientId === version.mainIngredientId ? line.quantityMilli : grossQuantity(line.quantityMilli, line.lossBps);
    used.set(line.ingredientId, (used.get(line.ingredientId) ?? 0) + take);
  }
  return { lines, uses: [...used.entries()].map(([ingredientId, quantityMilli]) => ({ ingredientId, quantityMilli })), expectedMilli };
}

export interface StockNeed {
  ingredientId: Uuid;
  needMilli: number;
  /** Usable stock: on hand, never below zero, nothing when the stock on hand has expired */
  haveMilli: number;
  /** 0 = enough */
  shortMilli: number;
}

/** Each need against the usable stock. */
export function stockNeeds(uses: readonly { ingredientId: Uuid; quantityMilli: number }[], usable: (ingredientId: Uuid) => number): StockNeed[] {
  return uses.map((u) => {
    const haveMilli = Math.max(0, usable(u.ingredientId));
    return { ingredientId: u.ingredientId, needMilli: u.quantityMilli, haveMilli, shortMilli: Math.max(0, u.quantityMilli - haveMilli) };
  });
}

/** Stock that may be cooked with: none when it has expired, never below zero. */
export function usableMilli(onHandMilli: number, expired: boolean): number {
  return expired ? 0 : Math.max(0, onHandMilli);
}

/** Cost of one unit of the cooked dish (1 kg, one plate …): the batch cost shared over what was actually made. */
export function costPer(cost: Paisa | null, actualMilli: number, unitMilli: number): Paisa | null {
  return cost === null || actualMilli <= 0 ? null : mulDivRound(cost, unitMilli, actualMilli);
}

/** Whole plates in an amount of cooked food (12,500 g with 250 g plates → 50). */
export function platesOf(milli: number, plateMilli: number): number {
  return plateMilli > 0 ? Math.floor(milli / plateMilli) : 0;
}

export type BatchProblem = 'AMOUNT_INVALID' | 'ACTUAL_INVALID' | 'PLATE_INVALID' | 'NOT_VERIFIED' | 'SHORT' | 'REASON_REQUIRED';

/** A batch needs an amount, an actual output above zero, a plate size, and a verified recipe whose ingredients are all in stock. */
export function checkBatch(input: { verified: boolean; plan: BatchPlan | null; actualMilli: number; plateMilli: number; needs: readonly StockNeed[] }): BatchProblem | null {
  if (!input.verified) return 'NOT_VERIFIED';
  if (!input.plan) return 'AMOUNT_INVALID';
  if (!Number.isInteger(input.actualMilli) || input.actualMilli <= 0 || input.actualMilli > MAX_COOK_MILLI) return 'ACTUAL_INVALID';
  if (!Number.isInteger(input.plateMilli) || input.plateMilli <= 0 || input.plateMilli > 50_000 * MILLI) return 'PLATE_INVALID';
  if (input.needs.some((n) => n.shortMilli > 0)) return 'SHORT';
  return null;
}

// ── The cooking plan and the stock check before cooking ────────────────────────────────────────

/** One dish of a day's plan: an amount of its main raw ingredient (MAIN) or of recipe batches (BATCHES). */
export interface PlanRow {
  preparedId: Uuid;
  mode: CookMode;
  amountMilli: number;
}

export interface CookingPlan {
  /** Cooked every day ("roz 5 kg daal mash") */
  daily: PlanRow[];
  /** A day's own plan replaces the daily one for that date (YYYY-MM-DD) */
  days: { date: string; rows: PlanRow[] }[];
}

export const EMPTY_PLAN: CookingPlan = { daily: [], days: [] };

/** The plan of a date: its own rows, else the daily plan. */
export function planOf(plan: CookingPlan | undefined, date: string): PlanRow[] {
  const p = plan ?? EMPTY_PLAN;
  return p.days.find((d) => d.date === date)?.rows ?? p.daily;
}

/** All raw ingredients the rows still to cook need, added up (oil for daal and biryani together). */
export function planUses(rows: readonly PlanRow[], versionOf: (preparedId: Uuid) => Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'> | null): { ingredientId: Uuid; quantityMilli: number }[] {
  const total = new Map<Uuid, number>();
  for (const row of rows) {
    const version = versionOf(row.preparedId);
    const plan = version ? batchPlan(version, row.mode, row.amountMilli) : null;
    for (const use of plan?.uses ?? []) total.set(use.ingredientId, (total.get(use.ingredientId) ?? 0) + use.quantityMilli);
  }
  return [...total.entries()].map(([ingredientId, quantityMilli]) => ({ ingredientId, quantityMilli }));
}

/** When the stock is checked before cooking: TOMORROW = the evening before, TODAY = the morning of the cooking day. */
export interface CookingCheckTime {
  time: string;
  forDay: 'TODAY' | 'TOMORROW';
}

/** Owner, 2026-11-09: 8 pm for tomorrow's plan, 7 am for today's; changed in Settings → Notifications & Alerts. */
export const DEFAULT_COOKING_CHECKS: readonly CookingCheckTime[] = [
  { time: '20:00', forDay: 'TOMORROW' },
  { time: '07:00', forDay: 'TODAY' },
];
export const MAX_COOKING_CHECKS = 4;

export function isClockTime(text: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
}

/** "HH:MM" and the calendar date (YYYY-MM-DD) of a moment in the branch's time zone. */
export function localClock(at: Date, timeZone: string = DEFAULT_TIME_ZONE): { date: string; time: string } {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at);
  return { date: businessDate(at, timeZone, '00:00'), time };
}

export function nextDate(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

/** The checks whose time has come today, each with the plan date it looks at. */
export function dueChecks(checks: readonly CookingCheckTime[], at: Date, timeZone: string = DEFAULT_TIME_ZONE): (CookingCheckTime & { date: string; planDate: string })[] {
  const now = localClock(at, timeZone);
  return checks
    .filter((c) => isClockTime(c.time) && c.time <= now.time)
    .map((c) => ({ ...c, date: now.date, planDate: c.forDay === 'TOMORROW' ? nextDate(now.date) : now.date }));
}

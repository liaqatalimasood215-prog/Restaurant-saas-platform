import { isClockTime, localClock } from './cooking';
import { DEFAULT_TIME_ZONE } from './business-day';
import { grossQuantity, lineRecipeTargets, type RecipeTarget, type RecipeVersion } from './recipes';
import type { BranchScoped, IsoDateTime, Paisa, SizePick, Uuid } from './types';
import type { MenuUnit } from './units';

/**
 * Stock used by sales (owner's I4 / "Step 14" plan and his reuse rule, approved 2026-11-09).
 * - Stock is taken ONCE per order line, when the kitchen marks it READY (an auto-ready station: when it is sent), by the
 *   recipe version the line kept (I2). Each recipe line is taken from its own ingredient: a raw ingredient from the raw
 *   stock, a cooked dish (prepared item) from the cooked stock. A cooked dish's own recipe is never opened again at a sale:
 *   its raw ingredients already left the stock when the batch was cooked (I3), so nothing is taken twice.
 * - A part without a verified recipe takes nothing and is "Not tracked". Optional recipe lines are not taken.
 * - Kitchen Undo gives the stock back; Ready again takes it again: once in total. A dine-in bill paid before the kitchen
 *   pressed Ready takes the stock then. Refunds and payment corrections never change stock.
 * - Food made and then cancelled or voided is never wastage by itself (owner, 2026-11-09): not served and still safe, it becomes
 *   Available Prepared Food that the kitchen can give to the next order of the same dish without taking raw stock again; a
 *   dish sold from a pot (or a bottled drink) can go back to its stock; served or unsafe food is wastage with a reason. At
 *   closing the food that is left is reviewed.
 * Roman Urdu: Kitchen READY dabaye to stock ek dafa kat'ta hai. Cancel hui karahi theek ho to agle order ko di ja sakti hai —
 * kacha maal dobara nahi kat'ta. Jo bilkul na rakha ja sake, wohi wastage, wajah ke saath.
 */

export interface StockUse {
  ingredientId: Uuid;
  /** Stock-unit thousandths that leave the stock (positive) */
  quantityMilli: number;
}

type SaleLine = {
  menuItemId: Uuid | null;
  quantity: number;
  variantId?: Uuid | null;
  sizeMix?: readonly SizePick[];
  modifierIds?: readonly Uuid[];
  recipeVersions?: Record<string, number>;
};

/** Each recipe part of a line and how many times it is used for `portions` of the line (a mixed pot counts each size). */
export function saleParts(line: SaleLine, portions: number): { key: string; target: RecipeTarget; count: number }[] {
  return lineRecipeTargets(line).map(({ key, target }) => {
    const pick = target.kind === 'ITEM' && line.sizeMix?.length ? line.sizeMix.find((s) => s.variantId === target.variantId) : undefined;
    return { key, target, count: (pick?.quantity ?? 1) * portions };
  });
}

/**
 * What `portions` of an order line take from stock, by the recipe versions the line kept: the gross quantity of every
 * non-optional recipe line (loss included), one row per ingredient. Parts without a kept version are returned as notTracked.
 */
export function saleUses(
  line: SaleLine,
  portions: number,
  versionOf: (target: RecipeTarget, version: number) => Pick<RecipeVersion, 'lines'> | null,
): { uses: StockUse[]; notTracked: string[] } {
  const used = new Map<Uuid, number>();
  const notTracked: string[] = [];
  for (const part of saleParts(line, portions)) {
    const kept = line.recipeVersions?.[part.key];
    const version = kept === undefined ? null : versionOf(part.target, kept);
    if (!version) {
      notTracked.push(part.key);
      continue;
    }
    if (part.count <= 0) continue;
    for (const recipeLine of version.lines) {
      if (recipeLine.optional) continue;
      const take = grossQuantity(recipeLine.quantityMilli, recipeLine.lossBps) * part.count;
      used.set(recipeLine.ingredientId, (used.get(recipeLine.ingredientId) ?? 0) + take);
    }
  }
  return { uses: [...used.entries()].filter(([, q]) => q !== 0).map(([ingredientId, quantityMilli]) => ({ ingredientId, quantityMilli })), notTracked };
}

/** The net stock a line still holds from its movements (− taken, + returned), per ingredient: what an Undo gives back. */
export function netTaken(movements: readonly { ingredientId: Uuid; quantityMilli: number }[]): StockUse[] {
  const net = new Map<Uuid, number>();
  for (const m of movements) net.set(m.ingredientId, (net.get(m.ingredientId) ?? 0) - m.quantityMilli);
  return [...net.entries()].filter(([, q]) => q !== 0).map(([ingredientId, quantityMilli]) => ({ ingredientId, quantityMilli }));
}

// ── Each order line's stock (kept on the line) ────────────────────────────────────────────────

export type StockHow = 'READY' | 'CLOSE' | 'KEEP' | 'WASTE';

export interface FromAvailable {
  availableId: Uuid;
  /** Portions of the line given from that food */
  quantity: number;
  /** The order the food was first made for (#12) */
  fromDailyNumber: number;
  at: IsoDateTime;
  by: Uuid;
}

export type FoodOutcomeKind = 'AVAILABLE' | 'BACK_TO_STOCK' | 'WASTE';

export interface ItemStock {
  /** When the line's stock was taken; null = not yet (it is taken at READY) */
  takenAt: IsoDateTime | null;
  /** READY (kitchen), CLOSE (bill paid before Ready), KEEP (a cancelled pot the kitchen finished and kept), WASTE (a stopped pot that was spoilt) */
  how?: StockHow;
  /** Parts without a verified recipe: nothing was taken for them ("item:<size>" / "addon:<id>") */
  notTracked?: string[];
  /** Portions given from Available Prepared Food: no raw stock was taken for them */
  fromAvailable?: FromAvailable[];
  /** Cost of what the line took (raw and cooked at today's prices, plus the given food's own cost); null = a price is missing */
  cost?: Paisa | null;
  /** What happened to food that was made and then cancelled or voided */
  outcome?: { kind: FoodOutcomeKind | 'STOPPED'; reason: string | null; availableId: Uuid | null; by: Uuid; at: IsoDateTime };
}

/** A new line's stock: nothing taken yet. Lines from before I4 have no `stock` and never take any (no back-fill, owner 2026-11-09). */
export function newItemStock(): ItemStock {
  return { takenAt: null };
}

/** Portions of a line given from Available Prepared Food. */
export function givenPortions(stock: ItemStock | undefined): number {
  return (stock?.fromAvailable ?? []).reduce((sum, f) => sum + f.quantity, 0);
}

// ── Reuse after a cancel (owner, 2026-11-09) ─────────────────────────────────────────────────

export interface ReuseSetting {
  /** Food of this dish that was made and not served may be given to another order of the same dish */
  enabled: boolean;
  /** How long it stays safe after it was made */
  safeHours: number;
  /** May be kept for the next day at the closing review */
  overnight: boolean;
}

export const DEFAULT_SAFE_HOURS = 3;
export const MAX_SAFE_HOURS = 24;

/** Default ON for dishes cooked to order in Karahi, Handi, BBQ and Fish (3 hours, never overnight); a dish sold from a pot never. */
export function defaultReuse(categoryName: string): ReuseSetting {
  return { enabled: /karahi|handi|bbq|fish/i.test(categoryName), safeHours: DEFAULT_SAFE_HOURS, overnight: false };
}

export function reuseOf(item: { reuse?: ReuseSetting | null; preparedItemId?: Uuid | null }, categoryName: string): ReuseSetting {
  if (item.preparedItemId) return { enabled: false, safeHours: DEFAULT_SAFE_HOURS, overnight: false };
  return item.reuse ?? defaultReuse(categoryName);
}

export function checkReuse(setting: ReuseSetting): boolean {
  return Number.isInteger(setting.safeHours) && setting.safeHours >= 1 && setting.safeHours <= MAX_SAFE_HOURS;
}

/** Food made for one order and kept for another of the same dish. Its raw stock was taken once, by the first order. */
export interface AvailableFood extends BranchScoped {
  id: Uuid;
  menuItemId: Uuid;
  /** Copies of the line: "Chicken Karahi", "1 kg", add-ons */
  name: string;
  variantId: Uuid | null;
  variantName: string | null;
  sizeMix?: SizePick[];
  modifierIds: Uuid[];
  modifierNames: string[];
  unit: MenuUnit;
  /** Portions put in, and still there */
  quantity: number;
  remaining: number;
  fromOrderId: Uuid;
  fromDailyNumber: number;
  fromItemId: Uuid;
  /** When the food was made (the kitchen's Ready) and until when it may be given */
  madeAt: IsoDateTime;
  safeUntil: IsoDateTime;
  /** Cost of all the portions put in */
  cost: Paisa | null;
  givenTo: { orderId: Uuid; dailyNumber: number; itemId: Uuid; quantity: number; by: Uuid; at: IsoDateTime }[];
  /** Closing review: portions wasted, eaten by staff or kept for tomorrow */
  closed: { kind: 'WASTE' | 'STAFF_MEAL'; quantity: number; reason: string; by: Uuid; at: IsoDateTime }[];
  keptAt?: IsoDateTime | null;
  createdBy: Uuid;
  createdAt: IsoDateTime;
}

export type AvailableState = 'AVAILABLE' | 'TIME_OVER' | 'DONE';

export function availableState(food: Pick<AvailableFood, 'remaining' | 'safeUntil'>, now: number): AvailableState {
  if (food.remaining <= 0) return 'DONE';
  return now < Date.parse(food.safeUntil) ? 'AVAILABLE' : 'TIME_OVER';
}

/** Safe until: made at + the dish's safe hours. */
export function safeUntilOf(madeAt: IsoDateTime, safeHours: number): IsoDateTime {
  return new Date(Date.parse(madeAt) + safeHours * 3_600_000).toISOString();
}

const sortedIds = (ids: readonly string[] | undefined) => [...(ids ?? [])].sort().join(',');
const sortedMix = (mix: readonly SizePick[] | undefined) =>
  [...(mix ?? [])]
    .map((s) => `${s.variantId}×${s.quantity}`)
    .sort()
    .join(',');

/** The same dish: same product, same size (or the same mix of sizes) and the same add-ons. 1 kg goes only to 1 kg. */
export function sameOrderDish(
  a: { menuItemId: Uuid | null; variantId?: Uuid | null; sizeMix?: readonly SizePick[]; modifierIds?: readonly Uuid[] },
  b: { menuItemId: Uuid | null; variantId?: Uuid | null; sizeMix?: readonly SizePick[]; modifierIds?: readonly Uuid[] },
): boolean {
  return (
    a.menuItemId !== null &&
    a.menuItemId === b.menuItemId &&
    (a.variantId ?? null) === (b.variantId ?? null) &&
    sortedMix(a.sizeMix) === sortedMix(b.sizeMix) &&
    sortedIds(a.modifierIds) === sortedIds(b.modifierIds)
  );
}

export type GiveProblem = 'NOT_SAME_DISH' | 'NOTHING_LEFT' | 'TIME_OVER' | 'ALREADY_MADE' | 'VOID' | 'NOT_TRACKED_LINE' | 'ALREADY_GIVEN';

/**
 * Giving available food to an order line: the line is not made yet (its ticket is New or Preparing), not voided, still needs
 * portions; the food is the same dish, has portions left and is still safe.
 */
export function checkGive(input: {
  food: Pick<AvailableFood, 'menuItemId' | 'variantId' | 'sizeMix' | 'modifierIds' | 'remaining' | 'safeUntil'>;
  line: SaleLine & { isVoid: boolean; stock?: ItemStock };
  ticketStatus: string;
  now: number;
}): GiveProblem | null {
  const { food, line } = input;
  if (line.isVoid) return 'VOID';
  if (!line.stock) return 'NOT_TRACKED_LINE';
  if (line.stock.takenAt || (input.ticketStatus !== 'NEW' && input.ticketStatus !== 'PREPARING')) return 'ALREADY_MADE';
  if (givenPortions(line.stock) >= line.quantity) return 'ALREADY_GIVEN';
  if (!sameOrderDish(food, line)) return 'NOT_SAME_DISH';
  if (food.remaining <= 0) return 'NOTHING_LEFT';
  if (input.now >= Date.parse(food.safeUntil)) return 'TIME_OVER';
  return null;
}

// ── After a cancel or void (owner, 2026-11-09) ───────────────────────────────────────────────

export interface FoodOutcome {
  kind: FoodOutcomeKind;
  /** AVAILABLE: the person confirms the food was not served and is safe */
  safe?: boolean;
  /** WASTE: why (required) */
  reason?: string;
}

/**
 * The choices for food that was made: served food can only be wastage; food not served can go to Available Prepared Food when
 * its dish may be reused, back to its stock when it was sold from a pot or as it is (a bottled drink, nothing given from
 * available food), and always to wastage. Never wastage by itself.
 */
export function outcomeChoices(input: { served: boolean; reusable: boolean; returnable: boolean }): FoodOutcomeKind[] {
  if (input.served) return ['WASTE'];
  return [...(input.reusable ? (['AVAILABLE'] as const) : []), ...(input.returnable ? (['BACK_TO_STOCK'] as const) : []), 'WASTE'];
}

export type OutcomeProblem = 'CHOOSE' | 'NOT_ALLOWED' | 'NOT_SAFE' | 'REASON_REQUIRED';

export function checkOutcome(outcome: FoodOutcome | undefined, choices: readonly FoodOutcomeKind[]): OutcomeProblem | null {
  if (!outcome) return 'CHOOSE';
  if (!choices.includes(outcome.kind)) return 'NOT_ALLOWED';
  if (outcome.kind === 'AVAILABLE' && outcome.safe !== true) return 'NOT_SAFE';
  if (outcome.kind === 'WASTE' && !outcome.reason?.trim()) return 'REASON_REQUIRED';
  return null;
}

/** Reasons offered for wastage of cooked food; the person may also write their own. */
export const WASTE_REASONS = ['Served, returned by the customer', 'Time over', 'Dropped / spilt', 'Not safe to keep', 'Quality not right'] as const;
export const MAX_WASTE_REASON = 120;

/** Cooked food that left the restaurant's stock without a sale: wastage, or a staff meal (counted apart). */
export interface FoodWaste extends BranchScoped {
  id: Uuid;
  kind: 'WASTE' | 'STAFF_MEAL';
  menuItemId: Uuid | null;
  name: string;
  variantName: string | null;
  quantity: number;
  unit: MenuUnit;
  cost: Paisa | null;
  reason: string;
  orderId: Uuid | null;
  dailyNumber: number | null;
  availableId: Uuid | null;
  createdBy: Uuid;
  createdAt: IsoDateTime;
}

// ── Closing review (owner, 2026-11-09) ───────────────────────────────────────────────────────

export const DEFAULT_CLOSING_TIME = '23:00';

/**
 * The closing review is due from the closing time of the day, and at any time for food still left from an earlier day. Returns
 * the local date it belongs to, or null.
 */
export function closingReviewDue(closingTime: string, oldestMadeAt: IsoDateTime | null, at: Date, timeZone: string = DEFAULT_TIME_ZONE): string | null {
  if (oldestMadeAt === null) return null;
  const now = localClock(at, timeZone);
  if (localClock(new Date(oldestMadeAt), timeZone).date < now.date) return now.date;
  return isClockTime(closingTime) && now.time >= closingTime ? now.date : null;
}

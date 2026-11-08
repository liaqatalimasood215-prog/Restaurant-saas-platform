import { MILLI, purchaseConversion, mulDivRound, type Ingredient, type StockUnit } from './inventory';
import type { CookingBatch } from './cooking';
import type { TaxSettings } from './pricing';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Recipes and food cost (owner's Smart Inventory brief 2026-11-04, Step B; docs/AI_MANAGER_PLAN.md §3–§4).
 * - A recipe belongs to one menu item and size (Small / Medium / Large each have their own), to one add-on
 *   (Extra cheese), or to a prepared item made in the kitchen (pizza dough: one batch makes 1.6 kg).
 * - A line is one ingredient: what ends up in one portion, plus the loss on the way (trimming, cooking).
 *   The kitchen uses net ÷ (1 − loss): 150 g chicken with 10 % loss = 166.667 g.
 * - Every save adds a version; old versions are never changed (only marked verified), so later stock use and
 *   reports can say which recipe they used. Kitchen use of stock comes in Step G, with VERIFIED recipes only.
 * Roman Urdu: Har dish ki recipe — kaun si cheez kitni lagti hai. Is se lagat (food cost) aur munafa ka
 * andaza banta hai. Recipe badalne se purana hisaab nahi badalta.
 */

export type RecipeTarget =
  | { kind: 'ITEM'; menuItemId: Uuid; variantId: Uuid | null }
  | { kind: 'ADDON'; modifierId: Uuid }
  | { kind: 'PREPARED'; ingredientId: Uuid };

export interface RecipeLine {
  ingredientId: Uuid;
  /** Stock-unit thousandths that end up in one portion (or one batch) */
  quantityMilli: number;
  /** Trimming, cooking or preparation loss in basis points (10 % = 1,000) */
  lossBps: number;
  /** The guest may leave it out. It is still costed, so the cost is the full plate. */
  optional: boolean;
  /** May be used instead when the main ingredient runs out (used from Step G) */
  substituteId: Uuid | null;
  /** The unit the owner typed the quantity in (Recipe Builder R1); missing = the ingredient's own unit. Display only: quantityMilli stays in the stock unit. */
  unit?: RecipeUnit;
  /** Packages (pack, bottle, bag, box, tray): stock-unit thousandths in one of them, set by the owner (1 bag = 25 kg) */
  unitSizeMilli?: number | null;
}

// ── Units on recipe lines (Recipe Builder R1, owner 2026-11-05) ───────────────────────────────

/** What a quantity on a recipe line can be typed in. */
export const RECIPE_UNITS = ['kg', 'g', 'mg', 'l', 'ml', 'piece', 'dozen', 'bottle', 'portion', 'pack', 'bag', 'box', 'tray'] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];
/** Units whose size the owner sets (1 bag = 25 kg, 1 tray = 30 eggs) */
export const PACKAGE_UNITS: readonly RecipeUnit[] = ['pack', 'bag', 'box', 'tray', 'bottle'];

/** Fixed sizes in stock-unit thousandths: 1 kg = 1,000,000 milli-grams, 1 mg = 1, 1 dozen = 12 pieces. */
const FIXED: Partial<Record<StockUnit, Partial<Record<RecipeUnit, number>>>> = {
  g: { kg: 1_000_000, g: 1000, mg: 1 },
  ml: { l: 1_000_000, ml: 1000 },
  piece: { piece: 1000, dozen: 12_000 },
  bottle: { bottle: 1000, dozen: 12_000 },
  portion: { portion: 1000 },
};

/** The units that fit an ingredient: weight with grams, liquids with ml, counted things with pieces; packages fit all. */
export function recipeUnitsFor(stockUnit: StockUnit): RecipeUnit[] {
  const fixed = Object.keys(FIXED[stockUnit] ?? {}) as RecipeUnit[];
  return [...fixed, ...PACKAGE_UNITS.filter((u) => !fixed.includes(u))];
}

export function isPackageUnit(unit: RecipeUnit, stockUnit: StockUnit): boolean {
  return FIXED[stockUnit]?.[unit] === undefined && PACKAGE_UNITS.includes(unit);
}

/**
 * Stock-unit thousandths in one recipe unit, or null when it does not fit (kg of a liquid) or a package has no size yet.
 * A package uses the size on the line, else the ingredient's own pack size when it is bought in that package.
 */
export function recipeUnitFactor(
  unit: RecipeUnit,
  ingredient: Pick<Ingredient, 'stockUnit' | 'purchaseUnit' | 'packSizeMilli'>,
  unitSizeMilli: number | null = null,
): number | null {
  const fixed = FIXED[ingredient.stockUnit]?.[unit];
  if (fixed !== undefined) return fixed;
  if (!PACKAGE_UNITS.includes(unit)) return null;
  const size = unitSizeMilli ?? ((ingredient.purchaseUnit as string) === unit ? ingredient.packSizeMilli : null);
  return size !== null && Number.isInteger(size) && size > 0 ? size : null;
}

/** The unit a line shows when none was chosen: the ingredient's own (g, ml, pieces …). */
export function defaultRecipeUnit(stockUnit: StockUnit): RecipeUnit {
  return stockUnit;
}

/** Typed thousandths of a recipe unit → stock-unit thousandths (500 g → 500,000; 0.5 kg → 500,000; 1 dozen → 12,000). */
export function toStockMilli(typedMilli: number, factorMilli: number): number {
  return mulDivRound(typedMilli, factorMilli, MILLI);
}

/** Stock-unit thousandths → thousandths of the chosen unit (500,000 milli-grams in kg → 500 = 0.5 kg). */
export function fromStockMilli(stockMilli: number, factorMilli: number): number {
  return mulDivRound(stockMilli, MILLI, factorMilli);
}

export const RECIPE_STATUSES = ['DRAFT', 'VERIFIED'] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export interface RecipeVersion {
  version: number;
  lines: RecipeLine[];
  /** Prepared items only: what one batch makes (stock-unit thousandths) */
  yieldMilli: number | null;
  /**
   * Prepared items only: the main raw ingredient, one of the lines (Daal mash in cooked Daal Mash). Its line quantity is what
   * the recipe is for (1 kg, 2 kg, 5 kg …): any other amount is this recipe scaled (owner, 2026-11-07). Missing = none.
   */
  mainIngredientId?: Uuid | null;
  status: RecipeStatus;
  note: string;
  savedBy: Uuid;
  savedAt: IsoDateTime;
  verifiedBy: Uuid | null;
  verifiedAt: IsoDateTime | null;
  /** Cost of one portion (or batch) at the prices of the day it was saved; null when a price was missing */
  costAtSave: Paisa | null;
}

export interface Recipe extends BranchScoped {
  id: Uuid;
  target: RecipeTarget;
  /** Oldest first; the last one is the current recipe */
  versions: RecipeVersion[];
}

export const MAX_RECIPE_LINES = 30;
export const MAX_LOSS_BPS = 9000;
export const MAX_RECIPE_NOTE = 200;
/** Usual restaurant guide (an assumption, shown as such): up to 35 % is good, above 45 % is high. */
export const FOOD_COST_GOOD_BPS = 3500;
export const FOOD_COST_HIGH_BPS = 4500;

export function sameTarget(a: RecipeTarget, b: RecipeTarget): boolean {
  if (a.kind === 'ITEM' && b.kind === 'ITEM') return a.menuItemId === b.menuItemId && a.variantId === b.variantId;
  if (a.kind === 'ADDON' && b.kind === 'ADDON') return a.modifierId === b.modifierId;
  if (a.kind === 'PREPARED' && b.kind === 'PREPARED') return a.ingredientId === b.ingredientId;
  return false;
}

export function currentVersion(recipe: Pick<Recipe, 'versions'>): RecipeVersion | null {
  return recipe.versions.at(-1) ?? null;
}

/** The newest verified version: the one the kitchen's stock use follows (Step G). */
export function verifiedVersion(recipe: Pick<Recipe, 'versions'>): RecipeVersion | null {
  return [...recipe.versions].reverse().find((v) => v.status === 'VERIFIED') ?? null;
}

/** What the kitchen uses for a line: net ÷ (1 − loss). */
export function grossQuantity(netMilli: number, lossBps: number): number {
  return mulDivRound(netMilli, 10_000, 10_000 - lossBps);
}

// ── Costing ───────────────────────────────────────────────────────────────────────────────────

export type CostIngredient = Pick<Ingredient, 'id' | 'kind' | 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice'>;

/** Everything needed to cost a recipe: ingredient prices and the current batch recipe of each prepared item. */
export interface CostBook {
  ingredients: ReadonlyMap<Uuid, CostIngredient>;
  prepared: ReadonlyMap<Uuid, Pick<RecipeVersion, 'lines' | 'yieldMilli'>>;
}

export function makeCostBook(ingredients: readonly CostIngredient[], recipes: readonly Pick<Recipe, 'target' | 'versions'>[]): CostBook {
  const prepared = new Map<Uuid, Pick<RecipeVersion, 'lines' | 'yieldMilli'>>();
  for (const recipe of recipes) {
    const version = currentVersion(recipe);
    if (recipe.target.kind === 'PREPARED' && version) prepared.set(recipe.target.ingredientId, version);
  }
  return { ingredients: new Map(ingredients.map((i) => [i.id, i])), prepared };
}

/**
 * Cost of a quantity of one ingredient (stock-unit thousandths) in paisa, or null when it cannot be known
 * (missing ingredient, a prepared item without its batch recipe, or a prepared item that uses itself).
 * Bought: at the purchase price (Rs. 650 / kg → 150 g = Rs. 97.50). Prepared: its batch cost ÷ what the batch makes.
 */
export function ingredientCost(book: CostBook, ingredientId: Uuid, quantityMilli: number, seen: ReadonlySet<Uuid> = new Set()): Paisa | null {
  const ingredient = book.ingredients.get(ingredientId);
  if (!ingredient) return null;
  if (ingredient.kind === 'PREPARED') {
    const batch = book.prepared.get(ingredientId);
    if (!batch?.yieldMilli || seen.has(ingredientId)) return null;
    const batchCost = linesCost(book, batch.lines, new Set([...seen, ingredientId])).total;
    return batchCost === null ? null : mulDivRound(quantityMilli, batchCost, batch.yieldMilli);
  }
  const conversion = purchaseConversion(ingredient.purchaseUnit, ingredient.stockUnit, ingredient.packSizeMilli);
  return conversion.ok ? mulDivRound(quantityMilli, ingredient.purchasePrice, conversion.factorMilli) : null;
}

export interface LineCost {
  ingredientId: Uuid;
  grossMilli: number;
  cost: Paisa | null;
}

/** Cost of recipe lines; `total` is null when any line cannot be costed. */
export function linesCost(book: CostBook, lines: readonly RecipeLine[], seen: ReadonlySet<Uuid> = new Set()): { total: Paisa | null; lines: LineCost[] } {
  const costed = lines.map((line) => {
    const grossMilli = grossQuantity(line.quantityMilli, line.lossBps);
    return { ingredientId: line.ingredientId, grossMilli, cost: ingredientCost(book, line.ingredientId, grossMilli, seen) };
  });
  const total = costed.some((l) => l.cost === null) ? null : costed.reduce((sum, l) => sum + (l.cost ?? 0), 0);
  return { total, lines: costed };
}

/** The menu price without the tax inside it, when menu prices include tax (Settings). */
export function priceWithoutTax(price: Paisa, tax: Pick<TaxSettings, 'rateBps' | 'pricesIncludeTax'>): Paisa {
  return tax.pricesIncludeTax && tax.rateBps > 0 ? mulDivRound(price, 10_000, 10_000 + tax.rateBps) : price;
}

export type FoodCostLevel = 'GOOD' | 'WATCH' | 'HIGH';

export interface FoodCost {
  cost: Paisa | null;
  /** Selling price as on the menu */
  price: Paisa;
  /** Selling price without the tax inside it */
  netPrice: Paisa;
  /** Food cost % in basis points (32.5 % = 3,250) */
  foodCostBps: number | null;
  /** Gross profit estimate = net price − recipe cost (not the accounting profit) */
  profit: Paisa | null;
  /** Gross margin % in basis points */
  marginBps: number | null;
  level: FoodCostLevel | null;
}

/** Food cost % = recipe cost ÷ selling price × 100; gross profit = price − cost. */
export function foodCostOf(cost: Paisa | null, price: Paisa, tax: Pick<TaxSettings, 'rateBps' | 'pricesIncludeTax'>): FoodCost {
  const netPrice = priceWithoutTax(price, tax);
  if (cost === null || netPrice <= 0) return { cost, price, netPrice, foodCostBps: null, profit: cost === null ? null : netPrice - cost, marginBps: null, level: null };
  const foodCostBps = mulDivRound(cost, 10_000, netPrice);
  const profit = netPrice - cost;
  return { cost, price, netPrice, foodCostBps, profit, marginBps: mulDivRound(profit, 10_000, netPrice), level: foodCostLevel(foodCostBps) };
}

export function foodCostLevel(bps: number): FoodCostLevel {
  if (bps <= FOOD_COST_GOOD_BPS) return 'GOOD';
  return bps <= FOOD_COST_HIGH_BPS ? 'WATCH' : 'HIGH';
}

/** 3,250 → "32.5 %" */
export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString('en-PK', { maximumFractionDigits: 1 })} %`;
}

// ── Checks ────────────────────────────────────────────────────────────────────────────────────

export type RecipeProblem =
  | 'NO_LINES'
  | 'TOO_MANY_LINES'
  | 'INGREDIENT_REQUIRED'
  | 'INGREDIENT_NOT_IN_USE'
  | 'DUPLICATE_INGREDIENT'
  | 'QUANTITY_INVALID'
  | 'LOSS_INVALID'
  | 'SUBSTITUTE_INVALID'
  | 'USES_ITSELF'
  | 'YIELD_INVALID'
  | 'MAIN_INVALID'
  | 'NOTE_TOO_LONG'
  | 'UNIT_INVALID'
  | 'UNIT_SIZE_REQUIRED';

/** Does this prepared item end up using `ingredientId`, directly or through other prepared items? */
function reaches(book: CostBook, lines: readonly RecipeLine[], ingredientId: Uuid, seen: Set<Uuid>): boolean {
  for (const line of lines) {
    if (line.ingredientId === ingredientId) return true;
    if (seen.has(line.ingredientId)) continue;
    seen.add(line.ingredientId);
    const batch = book.prepared.get(line.ingredientId);
    if (batch && reaches(book, batch.lines, ingredientId, seen)) return true;
  }
  return false;
}

/**
 * The first problem with a recipe, or null. A prepared item needs what one batch makes, and it may never use
 * itself (dough made with dough). `ingredients` holds every ingredient with its In use flag.
 */
export function checkRecipe(
  input: { target: RecipeTarget; lines: readonly RecipeLine[]; yieldMilli: number | null; note: string; mainIngredientId?: Uuid | null },
  ingredients: readonly Pick<Ingredient, 'id' | 'isActive' | 'stockUnit' | 'purchaseUnit' | 'packSizeMilli'>[],
  book: CostBook,
): { line: number | null; problem: RecipeProblem } | null {
  if (input.lines.length === 0) return { line: null, problem: 'NO_LINES' };
  if (input.lines.length > MAX_RECIPE_LINES) return { line: null, problem: 'TOO_MANY_LINES' };
  const used = new Set<Uuid>();
  for (const [index, line] of input.lines.entries()) {
    const ingredient = ingredients.find((i) => i.id === line.ingredientId);
    if (!line.ingredientId || !ingredient) return { line: index, problem: 'INGREDIENT_REQUIRED' };
    if (!ingredient.isActive) return { line: index, problem: 'INGREDIENT_NOT_IN_USE' };
    if (used.has(line.ingredientId)) return { line: index, problem: 'DUPLICATE_INGREDIENT' };
    used.add(line.ingredientId);
    // The unit first: a package without its size leaves the quantity unknown.
    if (line.unit !== undefined) {
      if (!recipeUnitsFor(ingredient.stockUnit).includes(line.unit)) return { line: index, problem: 'UNIT_INVALID' };
      if (recipeUnitFactor(line.unit, ingredient, line.unitSizeMilli ?? null) === null) return { line: index, problem: 'UNIT_SIZE_REQUIRED' };
    }
    if (!Number.isInteger(line.quantityMilli) || line.quantityMilli <= 0 || line.quantityMilli > 1_000_000 * MILLI) return { line: index, problem: 'QUANTITY_INVALID' };
    if (!Number.isInteger(line.lossBps) || line.lossBps < 0 || line.lossBps > MAX_LOSS_BPS) return { line: index, problem: 'LOSS_INVALID' };
    if (line.substituteId !== null) {
      const substitute = ingredients.find((i) => i.id === line.substituteId);
      if (!substitute || line.substituteId === line.ingredientId || substitute.stockUnit !== ingredient.stockUnit) return { line: index, problem: 'SUBSTITUTE_INVALID' };
    }
  }
  if (input.target.kind === 'PREPARED') {
    const self = input.target.ingredientId;
    const index = input.lines.findIndex((l) => l.ingredientId === self || reaches(book, [l], self, new Set()));
    if (index >= 0) return { line: index, problem: 'USES_ITSELF' };
    if (input.yieldMilli === null || !Number.isInteger(input.yieldMilli) || input.yieldMilli <= 0) return { line: null, problem: 'YIELD_INVALID' };
    if (input.mainIngredientId && !input.lines.some((l) => l.ingredientId === input.mainIngredientId)) return { line: null, problem: 'MAIN_INVALID' };
  }
  if (input.note.trim().length > MAX_RECIPE_NOTE) return { line: null, problem: 'NOTE_TOO_LONG' };
  return null;
}

/** Same lines and yield: saving again only adds a version when something really changed. */
export function sameRecipe(
  a: Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'>,
  b: Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'>,
): boolean {
  return a.yieldMilli === b.yieldMilli && (a.mainIngredientId ?? null) === (b.mainIngredientId ?? null) && JSON.stringify(a.lines) === JSON.stringify(b.lines);
}

// ── Cooked food: one recipe for any amount of its main raw ingredient (owner, 2026-11-07) ──────

/**
 * A cooked dish (Daal Mash, Qeema, Biryani) is a prepared item whose recipe is written ONCE for some amount of its main raw
 * ingredient (1 kg daal mash + oil, onions, spices … makes 3 kg). Any other amount is the same recipe scaled: 5 kg daal
 * = every line × 5, makes 15 kg. These are estimates for planning; nothing here is cooked or taken from stock.
 * Roman Urdu: Recipe sirf ek dafa — 1 kg ki likhein, 5 kg ya 7 kg ka hisaab khud ban jata hai (sirf andaza).
 */
export interface BatchScale {
  /** The main line's quantity: what the saved recipe is for (stock-unit thousandths) */
  baseMilli: number;
  rawMilli: number;
  lines: RecipeLine[];
  /** What this amount makes (stock-unit thousandths of the prepared item) */
  yieldMilli: number;
}

/** The recipe for `rawMilli` of its main ingredient, or null without a main ingredient, a yield or an amount. */
export function scaleBatch(version: Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'>, rawMilli: number): BatchScale | null {
  const main = version.lines.find((l) => l.ingredientId === version.mainIngredientId);
  if (!main || !version.yieldMilli || !Number.isInteger(rawMilli) || rawMilli <= 0) return null;
  return {
    baseMilli: main.quantityMilli,
    rawMilli,
    // The main line is exactly the amount asked for; the others follow it
    lines: scaleLines(version.lines, rawMilli, main.quantityMilli).map((l) => (l.ingredientId === main.ingredientId ? { ...l, quantityMilli: rawMilli } : l)),
    yieldMilli: mulDivRound(version.yieldMilli, rawMilli, main.quantityMilli),
  };
}

/**
 * The saved recipe for the raw stock on hand (owner, 2026-11-07): a supplier bill raises the stock of the main ingredient and
 * the recipe follows it — 5 kg daal bought, the recipe is for 5 kg; 2 kg more, for 7 kg. Out of stock: the saved recipe as it
 * is (1 kg). Each line says what it needs and how much of it is in stock. Nothing is cooked or taken from stock.
 * Roman Urdu: Jitna kachcha maal stock mein, utni recipe — khud. Stock khatam to "Out of stock", recipe wahi rehti hai.
 */
export interface StockPlan {
  mainIngredientId: Uuid;
  /** Raw stock of the main ingredient now (stock-unit thousandths) */
  onHandMilli: number;
  outOfStock: boolean;
  /** The recipe for the stock on hand; the saved recipe itself when out of stock */
  scale: BatchScale;
  /** Per line: what this amount needs, what is in stock, and what is missing (0 = enough) */
  needs: { ingredientId: Uuid; needMilli: number; onHandMilli: number; shortMilli: number }[];
}

export function stockPlan(
  version: Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'>,
  onHand: (ingredientId: Uuid) => number,
): StockPlan | null {
  const main = version.lines.find((l) => l.ingredientId === version.mainIngredientId);
  if (!main || !version.mainIngredientId) return null;
  const onHandMilli = onHand(main.ingredientId);
  const outOfStock = onHandMilli <= 0;
  // The yield is not part of this plan (later step); a missing one must not hide the recipe
  const scale = scaleBatch({ ...version, yieldMilli: version.yieldMilli ?? MILLI }, outOfStock ? main.quantityMilli : onHandMilli);
  if (!scale) return null;
  return {
    mainIngredientId: main.ingredientId,
    onHandMilli,
    outOfStock,
    scale,
    needs: scale.lines.map((l) => {
      const have = Math.max(0, onHand(l.ingredientId));
      return { ingredientId: l.ingredientId, needMilli: l.quantityMilli, onHandMilli: have, shortMilli: outOfStock ? 0 : Math.max(0, l.quantityMilli - have) };
    }),
  };
}

// ── P3: every supplier purchase gets its own recipe (owner, 2026-11-08) ─────────────────────────

/**
 * The recipe is saved once (1 kg Daal Mash = Rs. 800). Each supplier purchase of its main raw ingredient gets its own
 * calculation: 5 kg bought → the recipe for 5 kg (Rs. 4,000); a separate 8 kg → the recipe for 8 kg (Rs. 6,400). It is kept
 * apart from the total raw stock and fixed on the bill's day: the main ingredient at what that purchase paid, the others at
 * that day's prices, with the recipe version of that day. Nothing is cooked, saved to stock or taken from it.
 * Roman Urdu: Har khareed ka apna recipe hisaab — 5 kg ka alag, 8 kg ka alag. Kul stock alag rehta hai.
 */
export interface PurchaseRecipe extends BranchScoped {
  id: Uuid;
  /** The bill (its khata PURCHASE entry) */
  purchaseId: Uuid;
  /** The cooked dish (prepared item) and the recipe version used */
  preparedId: Uuid;
  recipeVersion: number;
  mainIngredientId: Uuid;
  /** What this purchase brought of the main ingredient (stock-unit thousandths) */
  rawMilli: number;
  lines: RecipeLine[];
  cost: Paisa | null;
  createdAt: IsoDateTime;
}

/** A purchase's recipe as the screens show it. */
export interface PurchaseRecipeRow {
  /** The saved record's id, or "purchaseId:preparedId" for a bill from before P3 */
  id: string;
  purchaseId: Uuid;
  preparedId: Uuid;
  dishName: string;
  mainIngredientId: Uuid;
  supplierName: string;
  billNo: string;
  at: IsoDateTime;
  rawMilli: number;
  lines: RecipeLine[];
  cost: Paisa | null;
  recipeVersion: number | null;
  /** A bill from before P3, worked out now: the other ingredients at today's prices and today's recipe */
  todayPrices: boolean;
  /** Another cooked dish is made from the same main ingredient: this purchase is for one of them */
  shared: boolean;
  /** The main ingredient's total raw stock now, apart from this purchase */
  mainOnHandMilli: number;
  /** Lines this purchase's recipe needs more of than is in stock now (stock-unit thousandths) */
  short: { ingredientId: Uuid; shortMilli: number }[];
}

/** The saved recipe for an amount of its main raw ingredient (no yield needed); null without a main ingredient. */
export function recipeForAmount(version: Pick<RecipeVersion, 'lines' | 'yieldMilli' | 'mainIngredientId'>, rawMilli: number): RecipeLine[] | null {
  return scaleBatch({ ...version, yieldMilli: version.yieldMilli ?? MILLI }, rawMilli)?.lines ?? null;
}

/**
 * A purchase's recipe cost: the main ingredient at what this purchase paid for it (its loss % included), the other lines from
 * the cost book (that day's prices). Null when another line has no price.
 */
export function purchaseRecipeCost(book: CostBook, lines: readonly RecipeLine[], mainIngredientId: Uuid, rawMilli: number, paid: Paisa): Paisa | null {
  const main = lines.find((l) => l.ingredientId === mainIngredientId);
  if (!main || rawMilli <= 0) return null;
  const rest = linesCost(
    book,
    lines.filter((l) => l !== main),
  ).total;
  return rest === null ? null : rest + mulDivRound(paid, grossQuantity(main.quantityMilli, main.lossBps), rawMilli);
}

/** What the lines need more of than is in stock (0 or less in stock counts as none). */
export function shortages(lines: readonly RecipeLine[], onHand: (ingredientId: Uuid) => number): { ingredientId: Uuid; shortMilli: number }[] {
  return lines.flatMap((l) => {
    const shortMilli = l.quantityMilli - Math.max(0, onHand(l.ingredientId));
    return shortMilli > 0 ? [{ ingredientId: l.ingredientId, shortMilli }] : [];
  });
}

/** A full plate of cooked food, 250 g: an assumption the owner can change later (POS step), shown as an estimate. */
export const DEFAULT_PLATE_MILLI = 250 * MILLI;

/** Whole plates in a cooked amount (grams): 3 kg → 12 plates of 250 g. */
export function platesIn(yieldMilli: number, plateMilli: number = DEFAULT_PLATE_MILLI): number {
  return plateMilli > 0 ? Math.floor(yieldMilli / plateMilli) : 0;
}

// ── Menu products sold from a cooked dish (owner's integration brief, 2026-11-08) ─────────────

/**
 * A cooked dish (Cooked Chicken Biryani) is the kitchen's stock; the menu product (Chicken Biryani: Full plate, Half plate)
 * is what the POS sells. Each size's recipe is ONE line: its portion of the cooked dish, so the dish's own recipe says what
 * the raw ingredients are and nothing is counted twice.
 * Roman Urdu: Degh ek, plate us mein se — har size ki recipe sirf itne gram pakki dish.
 */
/** The owner's P4 estimates: half plate 125 g, full packing 500 g, half packing 250 g; anything else a full plate (250 g). */
const PORTION_GUESSES: [RegExp, number][] = [
  [/\bhalf\s*pack/i, 250],
  [/\bpack/i, 500],
  [/\bhalf\b/i, 125],
];
export const MAX_PORTION_MILLI = 50_000 * MILLI;

/** A starting portion for a size (stock-unit thousandths): its weight when the name says one (½ kg = 500 g), else a guess. */
export function guessPortionMilli(sizeName: string | null): number {
  // Thousandths of a gram: the stock unit of cooked food
  const weight = sizeName ? guessSizeQuantity(sizeName, 'g') : null;
  if (weight) return weight;
  const guess = sizeName ? PORTION_GUESSES.find(([pattern]) => pattern.test(sizeName))?.[1] : undefined;
  return guess !== undefined ? guess * MILLI : DEFAULT_PLATE_MILLI;
}

/**
 * The recipes an order line uses (I2, owner's integration plan): its size, every size of a mixed line, or the item itself,
 * then each add-on — with the key the line keeps the recipe version under (`OrderItem.recipeVersions`).
 */
export function lineRecipeTargets(line: { menuItemId: Uuid | null; variantId?: Uuid | null; sizeMix?: readonly { variantId: Uuid }[]; modifierIds?: readonly Uuid[] }): { key: string; target: RecipeTarget }[] {
  if (!line.menuItemId) return [];
  const menuItemId = line.menuItemId;
  const sizes = line.sizeMix?.length ? line.sizeMix.map((s) => s.variantId) : [line.variantId ?? null];
  return [
    ...sizes.map((variantId) => ({ key: `item:${variantId ?? 'base'}`, target: { kind: 'ITEM' as const, menuItemId, variantId } })),
    ...(line.modifierIds ?? []).map((modifierId) => ({ key: `addon:${modifierId}`, target: { kind: 'ADDON' as const, modifierId } })),
  ];
}

export function checkPortion(portionMilli: number): boolean {
  return Number.isInteger(portionMilli) && portionMilli > 0 && portionMilli <= MAX_PORTION_MILLI;
}

/** The recipe of a size sold from a cooked dish: one line, its portion. */
export function portionLines(preparedId: Uuid, portionMilli: number): RecipeLine[] {
  return [{ ingredientId: preparedId, quantityMilli: portionMilli, lossBps: 0, optional: false, substituteId: null }];
}

// ── Auto Scale (Recipe Builder R2, owner 2026-11-05) ──────────────────────────────────────────

/**
 * One base recipe for a menu item with sizes (1 kg Chicken Karahi); every ticked size follows it by its share:
 * ½ kg uses half of every line, Pao a quarter. The base recipe is the item's own recipe (target variantId null);
 * each size still gets its own saved recipe (target with its variantId), so stock use later takes exactly what was
 * sold. A size the owner changes by hand is "custom" and keeps its own lines until "Back to Auto".
 * Roman Urdu: Ek dafa 1 kg ki recipe likhein — ½ kg, Pao aur Half Pao khud ban jate hain.
 */
export const SCALE_UNITS = ['kg', 'g', 'l', 'ml', 'piece', 'plate', 'portion'] as const;
export type ScaleUnit = (typeof SCALE_UNITS)[number];

/** Weight and volume convert (1 kg = 1,000 g); counted units (piece, plate, portion) never do. */
const SCALE_FAMILY: Record<ScaleUnit, { family: string; perUnit: number }> = {
  kg: { family: 'weight', perUnit: 1000 },
  g: { family: 'weight', perUnit: 1 },
  l: { family: 'volume', perUnit: 1000 },
  ml: { family: 'volume', perUnit: 1 },
  piece: { family: 'piece', perUnit: 1 },
  plate: { family: 'plate', perUnit: 1 },
  portion: { family: 'portion', perUnit: 1 },
};

/** Thousandths of one unit in another of the same family (0.5 kg → 500 g), or null when they do not convert. */
export function convertScaleQuantity(milli: number, from: ScaleUnit, to: ScaleUnit): number | null {
  if (SCALE_FAMILY[from].family !== SCALE_FAMILY[to].family) return null;
  return mulDivRound(milli, SCALE_FAMILY[from].perUnit, SCALE_FAMILY[to].perUnit);
}

export interface RecipeScaleSize {
  variantId: Uuid;
  /** How much this size is, in thousandths of the base unit: ½ kg with a kg base = 500 */
  quantityMilli: number;
  /** Ticked: Auto Scale makes this size's recipe. Unticked: no recipe from Auto Scale (Not tracked). */
  active: boolean;
  /** The owner typed this size's own quantities: they stay until "Back to Auto". */
  custom: boolean;
}

export interface RecipeScale extends BranchScoped {
  id: Uuid;
  menuItemId: Uuid;
  /** Off: every size keeps the recipe it has and is edited on its own (as before Auto Scale) */
  enabled: boolean;
  /** What the base recipe makes, in thousandths of `baseUnit` (1 kg = 1,000) */
  baseQuantityMilli: number;
  baseUnit: ScaleUnit;
  sizes: RecipeScaleSize[];
  updatedBy: Uuid;
  updatedAt: IsoDateTime;
}

/** Share of the base in basis points: ½ kg of a 1 kg base = 5,000 (50 %). */
export function scaleShareBps(sizeMilli: number, baseMilli: number): number {
  return baseMilli > 0 ? mulDivRound(sizeMilli, 10_000, baseMilli) : 0;
}

/**
 * The base lines for one size: every quantity × size ÷ base (750 g at ½ of 1 kg = 375 g). Loss %, optional,
 * substitute and unit stay as they are, so the loss is never counted twice. A quantity never becomes zero.
 */
export function scaleLines(lines: readonly RecipeLine[], sizeMilli: number, baseMilli: number): RecipeLine[] {
  return lines.map((line) => ({ ...line, quantityMilli: Math.max(1, mulDivRound(line.quantityMilli, sizeMilli, baseMilli)) }));
}

/** Scaled cost = base recipe cost × size ÷ base (Rs. 1,505 for 1 kg → Rs. 188.13 for ⅛ kg). */
export function scaleCost(baseCost: Paisa | null, sizeMilli: number, baseMilli: number): Paisa | null {
  return baseCost === null || baseMilli <= 0 ? null : mulDivRound(baseCost, sizeMilli, baseMilli);
}

/** Size names the kitchen uses, in grams or ml. "Pao" is a quarter kilo, "Half Pao" an eighth. */
const NAMED_SIZES: [RegExp, number][] = [
  [/\b(half|adha|aadha)\s*pa+o\b/i, 125],
  [/\bpa+o\b/i, 250],
];
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '⅛': 0.125, '¾': 0.75, '1½': 1.5 };

/**
 * A size's quantity read from its name, in thousandths of the base unit: "½ kg" → 500 with a kg base,
 * "Pao" → 250, "250 g" → 250 with a kg base; null when the name says nothing (Small, Medium) or the units differ.
 */
export function guessSizeQuantity(name: string, baseUnit: ScaleUnit): number | null {
  const text = name.trim();
  const match = /(1½|½|¼|⅛|¾|\d+(?:\.\d+)?)\s*(kg|g|gm|grams?|l|ltr|litres?|liters?|ml)\b/i.exec(text);
  if (match) {
    const amount = FRACTIONS[match[1]!] ?? Number(match[1]);
    const word = match[2]!.toLowerCase();
    const unit: ScaleUnit = word === 'kg' ? 'kg' : word.startsWith('g') ? 'g' : word === 'ml' ? 'ml' : 'l';
    return convertScaleQuantity(Math.round(amount * 1000), unit, baseUnit);
  }
  for (const [pattern, grams] of NAMED_SIZES) {
    if (pattern.test(text)) return convertScaleQuantity(grams * 1000, 'g', baseUnit);
  }
  return null;
}

export type ScaleProblem = 'BASE_QUANTITY_INVALID' | 'NO_SIZES' | 'SIZE_QUANTITY_INVALID' | 'SIZE_DUPLICATE';

/** The first problem with an Auto Scale setup, or null. A size may be at most 100 × the base. */
export function checkRecipeScale(scale: Pick<RecipeScale, 'baseQuantityMilli' | 'baseUnit' | 'sizes'>): { size: number | null; problem: ScaleProblem } | null {
  if (!SCALE_UNITS.includes(scale.baseUnit) || !Number.isInteger(scale.baseQuantityMilli) || scale.baseQuantityMilli <= 0 || scale.baseQuantityMilli > 1_000_000 * MILLI) {
    return { size: null, problem: 'BASE_QUANTITY_INVALID' };
  }
  if (!scale.sizes.some((s) => s.active)) return { size: null, problem: 'NO_SIZES' };
  const seen = new Set<Uuid>();
  for (const [index, size] of scale.sizes.entries()) {
    if (seen.has(size.variantId)) return { size: index, problem: 'SIZE_DUPLICATE' };
    seen.add(size.variantId);
    if (!Number.isInteger(size.quantityMilli) || size.quantityMilli <= 0 || size.quantityMilli > scale.baseQuantityMilli * 100) return { size: index, problem: 'SIZE_QUANTITY_INVALID' };
  }
  return null;
}

// ── What the Recipes screens get ──────────────────────────────────────────────────────────────

export interface MenuRecipeRow {
  menuItemId: Uuid;
  itemName: string;
  categoryName: string;
  /** Selling unit of the menu item: the recipe is for 1 piece, 1 kg, 1 plate … */
  unit: string;
  variantId: Uuid | null;
  variantName: string | null;
  recipe: Recipe | null;
  costing: FoodCost;
}

export interface AddonRecipeRow {
  modifierId: Uuid;
  name: string;
  groupName: string;
  recipe: Recipe | null;
  costing: FoodCost;
}

export interface PreparedRow {
  ingredient: Ingredient;
  recipe: Recipe | null;
  batchCost: Paisa | null;
  /** Cost of 1 kg, 1 litre or 1 piece of it */
  unitCost: Paisa | null;
  /** The menu products sold from it (MenuItem.preparedItemId); empty = not on the POS */
  soldAs?: { menuItemId: Uuid; name: string }[];
}

export interface RecipesView {
  menu: MenuRecipeRow[];
  addons: AddonRecipeRow[];
  prepared: PreparedRow[];
  /** Every ingredient (also Not in use, so old lines still show their name) and the batch recipes, for live costing */
  ingredients: Ingredient[];
  batches: { ingredientId: Uuid; lines: RecipeLine[]; yieldMilli: number | null }[];
  /** Auto Scale setups and the base recipes (target variantId null) of items with sizes */
  scales: RecipeScale[];
  baseRecipes: Recipe[];
  tax: Pick<TaxSettings, 'rateBps' | 'pricesIncludeTax'>;
  /** Names of the people in the version history */
  staffNames: Record<Uuid, string>;
  /** Stock on hand of every ingredient (stock-unit thousandths): cooked food follows the raw stock */
  onHand?: Record<Uuid, number>;
  /** The latest supplier purchase of each bought ingredient (its PURCHASE stock movement) */
  lastPurchases?: Record<Uuid, { quantityMilli: number; at: IsoDateTime }>;
  /** P3: every supplier purchase's own recipe for cooked food, newest first */
  purchaseRecipes?: PurchaseRecipeRow[];
  /** I3: cooking batches, newest first */
  cookingBatches?: CookingBatch[];
}

export interface FoodCostSummary {
  /** Menu items (not sizes) with a recipe for at least one size */
  itemsWithRecipe: number;
  items: number;
  /** Menu recipes (one per size) whose current version is verified */
  verified: number;
  recipes: number;
  /** Simple average of the food cost % of every menu recipe (not weighted by sales) */
  averageBps: number | null;
  high: number;
}

export function summarizeFoodCost(rows: readonly Pick<MenuRecipeRow, 'menuItemId' | 'recipe' | 'costing'>[]): FoodCostSummary {
  const withRecipe = rows.filter((r) => r.recipe);
  const costs = withRecipe.map((r) => r.costing.foodCostBps).filter((b): b is number => b !== null);
  return {
    itemsWithRecipe: new Set(withRecipe.map((r) => r.menuItemId)).size,
    items: new Set(rows.map((r) => r.menuItemId)).size,
    verified: withRecipe.filter((r) => r.recipe && currentVersion(r.recipe)?.status === 'VERIFIED').length,
    recipes: withRecipe.length,
    averageBps: costs.length ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null,
    high: withRecipe.filter((r) => r.costing.level === 'HIGH').length,
  };
}

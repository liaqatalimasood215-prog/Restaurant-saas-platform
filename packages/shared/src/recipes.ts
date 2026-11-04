import { MILLI, purchaseConversion, mulDivRound, type Ingredient, type StockUnit } from './inventory';
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
  input: { target: RecipeTarget; lines: readonly RecipeLine[]; yieldMilli: number | null; note: string },
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
  }
  if (input.note.trim().length > MAX_RECIPE_NOTE) return { line: null, problem: 'NOTE_TOO_LONG' };
  return null;
}

/** Same lines and yield: saving again only adds a version when something really changed. */
export function sameRecipe(a: Pick<RecipeVersion, 'lines' | 'yieldMilli'>, b: Pick<RecipeVersion, 'lines' | 'yieldMilli'>): boolean {
  return a.yieldMilli === b.yieldMilli && JSON.stringify(a.lines) === JSON.stringify(b.lines);
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
}

export interface RecipesView {
  menu: MenuRecipeRow[];
  addons: AddonRecipeRow[];
  prepared: PreparedRow[];
  /** Every ingredient (also Not in use, so old lines still show their name) and the batch recipes, for live costing */
  ingredients: Ingredient[];
  batches: { ingredientId: Uuid; lines: RecipeLine[]; yieldMilli: number | null }[];
  tax: Pick<TaxSettings, 'rateBps' | 'pricesIncludeTax'>;
  /** Names of the people in the version history */
  staffNames: Record<Uuid, string>;
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

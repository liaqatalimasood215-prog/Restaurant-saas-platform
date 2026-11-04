import {
  MILLI,
  bpsToInput,
  currentVersion,
  fromStockMilli,
  isPackageUnit,
  milliToInput,
  parsePercent,
  parseQuantity,
  recipeUnitFactor,
  toStockMilli,
  type CostBook,
  type Ingredient,
  type Recipe,
  type RecipeLine,
  type RecipeStatus,
  type RecipeUnit,
  type RecipesView,
  type StockUnit,
} from '@restaurant-saas/shared';

/**
 * A recipe line as typed on the screen: Quantity and Unit apart (Recipe Builder R1), the size of a package
 * ("1 bag = 25 kg"), loss, optional and substitute. It becomes a RecipeLine (stock-unit thousandths) when saved or costed.
 */
export interface LineDraft {
  key: string;
  ingredientId: string;
  quantity: string;
  unit: RecipeUnit;
  /** Packages: how much one holds, typed in kg, litres or pieces */
  size: string;
  loss: string;
  optional: boolean;
  substituteId: string;
}

type Units = Pick<Ingredient, 'stockUnit' | 'purchaseUnit' | 'packSizeMilli'>;
type Lookup = ReadonlyMap<string, Ingredient> | readonly Ingredient[];
const find = (ingredients: Lookup, id: string) => (Array.isArray(ingredients) ? ingredients.find((i) => i.id === id) : (ingredients as ReadonlyMap<string, Ingredient>).get(id));

/** The unit a package size is typed in: kg for weight, litres for liquids, else the counted unit. */
export function sizeUnitOf(stockUnit: StockUnit): RecipeUnit {
  return stockUnit === 'g' ? 'kg' : stockUnit === 'ml' ? 'l' : stockUnit;
}
const sizeFactor = (stockUnit: StockUnit) => (stockUnit === 'g' || stockUnit === 'ml' ? 1000 * MILLI : MILLI);

/** The package size on a line, in stock-unit thousandths, or null. */
export function lineSizeMilli(draft: Pick<LineDraft, 'unit' | 'size'>, ingredient: Units): number | null {
  if (!isPackageUnit(draft.unit, ingredient.stockUnit) || !draft.size.trim()) return null;
  const typed = parseQuantity(draft.size, { allowZero: false });
  return typed === null ? null : toStockMilli(typed, sizeFactor(ingredient.stockUnit));
}

/** Stock-unit thousandths in one unit of the line (null = a package without its size, or a unit that does not fit). */
export function lineFactor(draft: Pick<LineDraft, 'unit' | 'size'>, ingredient: Units): number | null {
  return recipeUnitFactor(draft.unit, ingredient, lineSizeMilli(draft, ingredient));
}

export function toDrafts(lines: readonly RecipeLine[], ingredients: Lookup): LineDraft[] {
  return lines.map((l) => {
    const ingredient = find(ingredients, l.ingredientId);
    const unit = l.unit ?? ingredient?.stockUnit ?? 'g';
    const factor = ingredient ? (recipeUnitFactor(unit, ingredient, l.unitSizeMilli ?? null) ?? MILLI) : MILLI;
    return {
      key: crypto.randomUUID(),
      ingredientId: l.ingredientId,
      quantity: milliToInput(fromStockMilli(l.quantityMilli, factor)),
      unit,
      size: l.unitSizeMilli && ingredient ? milliToInput(fromStockMilli(l.unitSizeMilli, sizeFactor(ingredient.stockUnit))) : '',
      loss: l.lossBps ? bpsToInput(l.lossBps) : '',
      optional: l.optional,
      substituteId: l.substituteId ?? '',
    };
  });
}

export function emptyLine(ingredient?: Ingredient): LineDraft {
  return { key: crypto.randomUUID(), ingredientId: ingredient?.id ?? '', quantity: '', unit: ingredient?.stockUnit ?? 'g', size: '', loss: '', optional: false, substituteId: '' };
}

/**
 * Typed lines as recipe lines. A quantity or loss that is not a number becomes −1, so the check names the line.
 * The unit is kept only when it is not the ingredient's own (old recipes stay exactly as they were saved).
 */
export function fromDrafts(drafts: readonly LineDraft[], ingredients: Lookup): RecipeLine[] {
  return drafts.map((d) => {
    const ingredient = find(ingredients, d.ingredientId);
    const typed = parseQuantity(d.quantity, { allowZero: false });
    const factor = ingredient ? lineFactor(d, ingredient) : null;
    const line: RecipeLine = {
      ingredientId: d.ingredientId,
      quantityMilli: typed !== null && factor !== null ? toStockMilli(typed, factor) : -1,
      lossBps: d.loss.trim() ? (parsePercent(d.loss) ?? -1) : 0,
      optional: d.optional,
      substituteId: d.substituteId || null,
    };
    if (ingredient && d.unit !== ingredient.stockUnit) {
      line.unit = d.unit;
      if (isPackageUnit(d.unit, ingredient.stockUnit)) line.unitSizeMilli = lineSizeMilli(d, ingredient);
    }
    // A package without its size or a unit that does not fit: keep the quantity unknown so the check explains it.
    if (ingredient && factor === null) line.unit = d.unit;
    return line;
  });
}

/** Lines that can be costed right now (a half-typed line is left out). */
export function costableLines(drafts: readonly LineDraft[], ingredients: Lookup): RecipeLine[] {
  return fromDrafts(drafts, ingredients).filter((l) => l.ingredientId && l.quantityMilli > 0 && l.lossBps >= 0 && l.lossBps < 10_000);
}

/** The prices and batch recipes of the view; `override` replaces one prepared item's batch with what is being typed. */
export function bookOf(view: RecipesView, override?: { ingredientId: string; lines: RecipeLine[]; yieldMilli: number | null }): CostBook {
  const prepared = new Map(view.batches.map((b) => [b.ingredientId, { lines: b.lines, yieldMilli: b.yieldMilli }]));
  if (override) prepared.set(override.ingredientId, { lines: override.lines, yieldMilli: override.yieldMilli });
  return { ingredients: new Map(view.ingredients.map((i) => [i.id, i])), prepared };
}

export type RecipeState = RecipeStatus | 'NONE';

export function stateOf(recipe: Recipe | null): RecipeState {
  return recipe ? (currentVersion(recipe)?.status ?? 'NONE') : 'NONE';
}

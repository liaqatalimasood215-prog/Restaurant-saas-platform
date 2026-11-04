import {
  bpsToInput,
  currentVersion,
  milliToInput,
  parsePercent,
  parseQuantity,
  type CostBook,
  type Recipe,
  type RecipeLine,
  type RecipeStatus,
  type RecipesView,
} from '@restaurant-saas/shared';

/** A recipe line as typed on the screen (text fields), turned into a RecipeLine when saving or costing. */
export interface LineDraft {
  key: string;
  ingredientId: string;
  quantity: string;
  loss: string;
  optional: boolean;
  substituteId: string;
}

export function toDrafts(lines: readonly RecipeLine[]): LineDraft[] {
  return lines.map((l) => ({
    key: crypto.randomUUID(),
    ingredientId: l.ingredientId,
    quantity: milliToInput(l.quantityMilli),
    loss: l.lossBps ? bpsToInput(l.lossBps) : '',
    optional: l.optional,
    substituteId: l.substituteId ?? '',
  }));
}

export function emptyLine(): LineDraft {
  return { key: crypto.randomUUID(), ingredientId: '', quantity: '', loss: '', optional: false, substituteId: '' };
}

/** Typed lines as recipe lines; a quantity or loss that is not a number becomes −1 so the check names the line. */
export function fromDrafts(drafts: readonly LineDraft[]): RecipeLine[] {
  return drafts.map((d) => ({
    ingredientId: d.ingredientId,
    quantityMilli: parseQuantity(d.quantity, { allowZero: false }) ?? -1,
    lossBps: d.loss.trim() ? (parsePercent(d.loss) ?? -1) : 0,
    optional: d.optional,
    substituteId: d.substituteId || null,
  }));
}

/** Lines that can be costed right now (a half-typed line is left out). */
export function costableLines(drafts: readonly LineDraft[]): RecipeLine[] {
  return fromDrafts(drafts).filter((l) => l.ingredientId && l.quantityMilli > 0 && l.lossBps >= 0 && l.lossBps < 10_000);
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

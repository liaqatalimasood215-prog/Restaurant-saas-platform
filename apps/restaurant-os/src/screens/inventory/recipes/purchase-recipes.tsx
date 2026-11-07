'use client';

import { useState } from 'react';
import { ChevronDown, Receipt, ShoppingCart } from 'lucide-react';
import {
  currentVersion,
  formatPaisa,
  purchaseRecipeCost,
  recipeForAmount,
  type CostBook,
  type Ingredient,
  type PurchaseRecipeRow,
  type RecipeLine,
  type RecipesView,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { amountText, whenText } from '../inventory-format';
import { ingredientArt } from './recipe-lines';

/**
 * P3 (owner, 2026-11-08): every supplier purchase of a cooked dish's main raw ingredient has its own recipe — 5 kg bought → the
 * recipe for 5 kg (Rs. 4,000), a separate 8 kg → 8 kg (Rs. 6,400) — kept apart from the total raw stock. Read only: nothing is
 * cooked, saved to stock or taken from it.
 */

const unitOf = (byId: ReadonlyMap<string, Ingredient>, id: string) => byId.get(id)?.stockUnit ?? 'g';

/** The ingredients of one purchase's recipe, with what is not enough in stock now. */
export function PurchaseRecipeLines({ lines, short, byId }: { lines: RecipeLine[]; short?: PurchaseRecipeRow['short']; byId: ReadonlyMap<string, Ingredient> }) {
  return (
    <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40" data-purchase-lines>
      {lines.map((line) => {
        const ingredient = byId.get(line.ingredientId);
        const missing = short?.find((s) => s.ingredientId === line.ingredientId);
        return (
          <li key={line.ingredientId} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-[13px]', missing && 'bg-amber-50/80')}>
            <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
              <span aria-hidden>{ingredient ? ingredientArt(ingredient) : '•'}</span>
              <span className="truncate">{ingredient?.name ?? '—'}</span>
            </span>
            <span className="text-right tabular-nums">
              <span className="font-bold text-slate-900">{amountText(line.quantityMilli, unitOf(byId, line.ingredientId))}</span>
              {missing && <span className="block text-[11px] font-bold text-amber-700">{t('inventory.recipes.cooked.missing', { qty: amountText(missing.shortMilli, unitOf(byId, line.ingredientId)) })}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** "8 Nov, 12:50 am · Madina Kiryana" and "8 kg → Rs. 6,400" — tap to see its ingredients. */
function PurchaseRow({ row, byId }: { row: PurchaseRecipeRow; byId: ReadonlyMap<string, Ingredient> }) {
  const [open, setOpen] = useState(false);
  const unit = unitOf(byId, row.mainIngredientId);
  return (
    <li data-purchase-recipe={row.id}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] hover:bg-brand-soft/50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-slate-500">
            {whenText(row.at)} · {row.supplierName}
            {row.billNo ? ` · ${row.billNo}` : ''}
          </span>
          <span className="font-bold text-slate-900" data-purchase-amount>
            {t('inventory.recipes.purchases.amount', { qty: amountText(row.rawMilli, unit), cost: row.cost === null ? '—' : formatPaisa(row.cost) })}
          </span>
          {row.todayPrices && <span className="ml-1.5 text-[11px] font-semibold text-slate-500">({t('inventory.recipes.purchases.todayPrices')})</span>}
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="px-1 pb-1.5">
          <PurchaseRecipeLines lines={row.lines} short={row.short} byId={byId} />
        </div>
      )}
    </li>
  );
}

const FIRST = 5;

/** On a cooked dish's card: each purchase of its main ingredient with its own recipe; the last 5, then "Show all". */
export function DishPurchases({ rows, byId }: { rows: PurchaseRecipeRow[]; byId: ReadonlyMap<string, Ingredient> }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return <p className="px-2 py-1 text-[13px] text-slate-500">{t('inventory.recipes.purchases.none')}</p>;
  return (
    <div data-dish-purchases>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
        {(all ? rows : rows.slice(0, FIRST)).map((row) => (
          <PurchaseRow key={row.id} row={row} byId={byId} />
        ))}
      </ul>
      {rows.length > FIRST && (
        <button type="button" onClick={() => setAll((a) => !a)} className="press mt-1 min-h-9 px-2 text-[13px] font-bold text-brand hover:underline">
          {all ? t('inventory.recipes.purchases.showLess') : t('inventory.recipes.purchases.showAll', { n: rows.length })}
        </button>
      )}
    </div>
  );
}

/** Prepared Items: the last 5 purchases of main raw ingredients, each with the recipe it made (replaces "Latest purchase"). */
export function RecentPurchases({ rows, byId }: { rows: PurchaseRecipeRow[]; byId: ReadonlyMap<string, Ingredient> }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-brand/15 bg-white px-3 py-2 shadow-sm" data-recent-purchases>
      <p className="mb-1 flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <ShoppingCart className="size-4 text-brand" aria-hidden />
        {t('inventory.recipes.purchases.recentTitle')}
      </p>
      <ul className="grid gap-x-4 gap-y-0.5 text-[13px] md:grid-cols-2">
        {rows.slice(0, FIRST).map((row) => {
          const main = byId.get(row.mainIngredientId);
          return (
            <li key={row.id} className="truncate text-slate-600" data-recent-purchase={row.dishName}>
              <span className="text-slate-500">{whenText(row.at)} · </span>
              {t('inventory.recipes.purchases.recentRow', {
                name: main?.name ?? '',
                qty: amountText(row.rawMilli, unitOf(byId, row.mainIngredientId)),
                dish: row.dishName,
                cost: row.cost === null ? '—' : formatPaisa(row.cost),
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export interface PurchasePreviewRow {
  preparedId: string;
  dishName: string;
  mainIngredientId: string;
  rawMilli: number;
  lines: RecipeLine[];
  cost: number | null;
  shared: boolean;
}

/**
 * The bill, before saving: what each line of a main raw ingredient makes — the recipe for that amount and its cost, the main
 * ingredient at the price typed on this bill, the others at today's prices.
 */
export function purchasePreview(view: RecipesView, book: CostBook, bought: { ingredientId: string; milli: number; paid: number }[]): PurchasePreviewRow[] {
  const dishes = view.prepared.flatMap((row) => {
    const version = row.recipe ? currentVersion(row.recipe) : null;
    return version?.mainIngredientId ? [{ row, version, mainId: version.mainIngredientId }] : [];
  });
  return bought.flatMap(({ ingredientId, milli, paid }) =>
    dishes
      .filter((d) => d.mainId === ingredientId)
      .flatMap(({ row, version, mainId }) => {
        const lines = recipeForAmount(version, milli);
        if (!lines) return [];
        return [
          {
            preparedId: row.ingredient.id,
            dishName: row.ingredient.name,
            mainIngredientId: mainId,
            rawMilli: milli,
            lines,
            cost: purchaseRecipeCost(book, lines, mainId, milli, paid),
            shared: dishes.filter((d) => d.mainId === mainId).length > 1,
          },
        ];
      }),
  );
}

/** Under the bill: "Recipes for this purchase (estimate)", one line per cooked dish, live while typing. */
export function PurchasePreview({ rows, byId }: { rows: PurchasePreviewRow[]; byId: ReadonlyMap<string, Ingredient> }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-brand/20 bg-brand-soft/50 px-3 py-2 text-xs" data-purchase-preview>
      <p className="flex items-center gap-1.5 font-bold text-brand">
        <Receipt className="size-3.5" aria-hidden />
        {t('inventory.recipes.purchases.previewTitle')}
      </p>
      <ul className="mt-1 space-y-0.5 text-slate-800">
        {rows.map((row) => (
          <li key={`${row.preparedId}:${row.mainIngredientId}`} data-preview-dish={row.dishName}>
            {t('inventory.recipes.purchases.previewRow', {
              dish: row.dishName,
              qty: amountText(row.rawMilli, unitOf(byId, row.mainIngredientId)),
              cost: row.cost === null ? '—' : formatPaisa(row.cost),
            })}
            {row.shared && <span className="text-slate-500"> *</span>}
          </li>
        ))}
      </ul>
      {rows.some((r) => r.shared) && <p className="mt-1 text-slate-500">{t('inventory.recipes.purchases.sharedNote')}</p>}
    </div>
  );
}

/** After saving the bill: this purchase's recipes, each with its ingredients, and the total stock apart from it. */
export function PurchaseSummary({ rows, byId, onDone }: { rows: PurchaseRecipeRow[]; byId: ReadonlyMap<string, Ingredient>; onDone: () => void }) {
  return (
    <Dialog
      open
      onClose={onDone}
      title={t('inventory.recipes.purchases.title')}
      footer={
        <Button size="lg" className="w-full" onClick={onDone}>
          {t('inventory.recipes.purchases.done')}
        </Button>
      }
    >
      <div className="space-y-4" data-purchase-summary>
        {rows.map((row) => {
          const main = byId.get(row.mainIngredientId);
          const unit = unitOf(byId, row.mainIngredientId);
          return (
            <section key={row.id} className="space-y-2" data-summary-dish={row.dishName}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{row.dishName}</h3>
                {row.shared && <Badge tone="blue">{t('inventory.recipes.purchases.shared')}</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-bold text-slate-500">{t('inventory.recipes.purchases.thisPurchase', { name: main?.name ?? '' })}</p>
                  <p className="text-lg font-black tabular-nums text-slate-900">{amountText(row.rawMilli, unit)}</p>
                </div>
                <div className="rounded-xl bg-brand-soft px-3 py-2">
                  <p className="text-xs font-bold text-brand">{t('inventory.recipes.purchases.recipeCost')}</p>
                  <p className="text-lg font-black tabular-nums text-slate-900" data-summary-cost>
                    {row.cost === null ? '—' : formatPaisa(row.cost)}
                  </p>
                </div>
              </div>
              <PurchaseRecipeLines lines={row.lines} short={row.short} byId={byId} />
              <p className="text-xs font-semibold text-slate-600" data-summary-total>
                {t('inventory.recipes.purchases.totalStock', { name: main?.name ?? '', qty: amountText(row.mainOnHandMilli, unit) })}
              </p>
            </section>
          );
        })}
        <p className="text-xs text-slate-500">{t('inventory.recipes.purchases.note')}</p>
      </div>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { ChefHat, ChevronDown, Pencil, ShoppingCart } from 'lucide-react';
import { currentVersion, formatPaisa, linesCost, stockPlan, type CostBook, type Ingredient, type PreparedRow, type RecipesView, type StockPlan } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { amountText, stockText, whenText } from '../inventory-format';
import { stateOf } from './recipe-draft';
import { ingredientArt } from './recipe-lines';

const STATE_TONE = { NONE: 'grey', DRAFT: 'amber', VERIFIED: 'green' } as const;

/** A cooked dish: its saved recipe, its main raw ingredient, and the recipe worked out for the raw stock on hand. */
export interface CookedDish {
  row: PreparedRow;
  main: Ingredient;
  plan: StockPlan;
  cost: number | null;
}

/** Cooked food in the Prepared items list: prepared items whose recipe names its main raw ingredient. */
export function cookedDishes(view: RecipesView, book: CostBook, onHand: (ingredientId: string) => number = (id) => view.onHand?.[id] ?? 0): CookedDish[] {
  const byId = new Map(view.ingredients.map((i) => [i.id, i]));
  return view.prepared.flatMap((row) => {
    const version = row.recipe ? currentVersion(row.recipe) : null;
    const plan = version ? stockPlan(version, onHand) : null;
    const main = plan ? byId.get(plan.mainIngredientId) : undefined;
    return plan && main ? [{ row, main, plan, cost: linesCost(book, plan.scale.lines).total }] : [];
  });
}

/**
 * The latest supplier purchase of a main raw ingredient and what it did to the recipes that use it (owner, 2026-11-07):
 * "Daal mash +2 kg → Cooked Daal Mash: recipe now for 7 kg (was 5 kg)". Read only: the bill already changed the stock.
 */
export function LatestPurchase({ view, book, dishes }: { view: RecipesView; book: CostBook; dishes: CookedDish[] }) {
  const latest = dishes
    .map((d) => ({ dish: d, bought: view.lastPurchases?.[d.main.id] }))
    .filter((x): x is { dish: CookedDish; bought: { quantityMilli: number; at: string } } => Boolean(x.bought))
    .sort((a, b) => b.bought.at.localeCompare(a.bought.at))[0];
  if (!latest) return null;
  const { main } = latest.dish;
  const { bought } = latest;
  // Before the purchase: the same stock without it
  const before = cookedDishes(view, book, (id) => (view.onHand?.[id] ?? 0) - (id === main.id ? bought.quantityMilli : 0));
  const changed = dishes.filter((d) => d.main.id === main.id);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft/60 px-4 py-3" data-latest-purchase>
      <ShoppingCart className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      <div className="min-w-0 space-y-0.5 text-sm">
        <p className="font-extrabold text-slate-900">
          {t('inventory.recipes.cooked.latest', { name: main.name, qty: amountText(bought.quantityMilli, main.stockUnit), when: whenText(bought.at) })}
        </p>
        {changed.map((dish) => {
          const was = before.find((b) => b.row.ingredient.id === dish.row.ingredient.id);
          const wasText = !was || was.plan.outOfStock ? t('inventory.recipes.cooked.wasOut') : amountText(was.plan.onHandMilli, main.stockUnit);
          return (
            <p key={dish.row.ingredient.id} className="text-slate-700" data-latest-dish={dish.row.ingredient.name}>
              {t('inventory.recipes.cooked.latestDish', {
                dish: dish.row.ingredient.name,
                after: amountText(dish.plan.onHandMilli, main.stockUnit),
                was: wasText,
                cost: dish.cost === null ? '—' : formatPaisa(dish.cost),
              })}
            </p>
          );
        })}
      </div>
    </div>
  );
}

/**
 * One cooked dish (owner, 2026-11-07): the recipe saved once, the raw stock of its main ingredient (from supplier bills), and the
 * recipe and estimated cost for that stock. Out of stock: the saved recipe stays. Ingredients only when opened.
 */
export function CookedCard({
  dish,
  sharedWith,
  byId,
  canManage,
  onEdit,
}: {
  dish: CookedDish;
  /** Other cooked dishes made from the same main raw ingredient */
  sharedWith: string[];
  byId: ReadonlyMap<string, Ingredient>;
  canManage: boolean;
  onEdit: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { row, main, plan, cost } = dish;
  const state = stateOf(row.recipe);
  const short = plan.needs.filter((n) => n.shortMilli > 0);
  const amount = amountText(plan.scale.rawMilli, main.stockUnit);
  return (
    <Card className="flex h-full flex-col gap-2 p-4" data-cooked-card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <ChefHat className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900">{row.ingredient.name}</p>
            <p className="text-xs text-slate-500" data-main-line>
              {t('inventory.recipes.mainLine', { qty: stockText(main, plan.scale.baseMilli), name: main.name })}
            </p>
          </div>
        </div>
        <Badge tone={STATE_TONE[state]}>{t(`inventory.recipes.status.${state}`)}</Badge>
      </div>

      {plan.outOfStock ? (
        <div className="rounded-xl bg-red-50 px-3 py-2" data-raw-stock="out">
          <Badge tone="red">{t('inventory.recipes.cooked.outOfStock')}</Badge>
          <p className="mt-1 text-sm text-red-900">{t('inventory.recipes.cooked.outHint', { name: main.name })}</p>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <dt className="text-xs font-semibold text-slate-500">{t('inventory.recipes.cooked.rawStock', { name: main.name })}</dt>
            <dd className="text-lg font-black tabular-nums text-slate-900" data-raw-stock>
              {amount}
            </dd>
          </div>
          <div className="rounded-xl bg-brand-soft px-3 py-2">
            <dt className="text-xs font-semibold text-brand">{t('inventory.recipes.cooked.costFor', { qty: amount })}</dt>
            <dd className="text-lg font-black tabular-nums text-slate-900" data-cooked-cost>
              {cost === null ? '—' : formatPaisa(cost)}
            </dd>
          </div>
        </dl>
      )}
      {plan.outOfStock && (
        <p className="text-sm text-slate-700">
          {t('inventory.recipes.cooked.costSaved', { qty: amount })} <strong className="tabular-nums text-slate-900">{cost === null ? '—' : formatPaisa(cost)}</strong>
        </p>
      )}
      {short.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900" data-short>
          {t('inventory.recipes.cooked.short', {
            list: short.map((n) => `${byId.get(n.ingredientId)?.name ?? '—'} ${amountText(n.shortMilli, byId.get(n.ingredientId)?.stockUnit ?? 'g')}`).join(', '),
          })}
        </p>
      )}
      {sharedWith.length > 0 && (
        <p className="text-xs leading-snug text-slate-500" data-shared>
          {t('inventory.recipes.cooked.shared', { name: main.name, dishes: sharedWith.join(', ') })}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="press flex min-h-10 items-center justify-between rounded-xl px-1 text-sm font-bold text-brand hover:underline"
      >
        {open ? t('inventory.recipes.cooked.hide') : t('inventory.recipes.cooked.show', { qty: amount })}
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ol className="divide-y divide-slate-100 rounded-xl border border-slate-100" data-cooked-lines>
          {plan.needs.map((need) => {
            const ingredient = byId.get(need.ingredientId);
            const unit = ingredient?.stockUnit ?? 'g';
            return (
              <li key={need.ingredientId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                  <span aria-hidden>{ingredient ? ingredientArt(ingredient) : '•'}</span>
                  <span className="truncate">{ingredient?.name ?? '—'}</span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="font-bold text-slate-900">{amountText(need.needMilli, unit)}</span>
                  {!plan.outOfStock && (
                    <span className={cn('block text-xs', need.shortMilli > 0 ? 'font-bold text-amber-700' : 'text-slate-500')}>
                      {need.shortMilli > 0
                        ? t('inventory.recipes.cooked.missing', { qty: amountText(need.shortMilli, unit) })
                        : t('inventory.recipes.cooked.inStock', { qty: amountText(need.onHandMilli, unit) })}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {canManage && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${t('inventory.recipes.edit')}: ${row.ingredient.name}`}
          className="press mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm hover:border-brand/40"
        >
          <Pencil className="size-4" aria-hidden />
          {t('inventory.recipes.edit')}
        </button>
      )}
    </Card>
  );
}

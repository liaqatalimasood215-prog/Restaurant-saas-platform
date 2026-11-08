'use client';

import { useState, type ReactNode } from 'react';
import { BadgeCheck, ChevronDown, ChevronRight, Coins, Eye, Link2, Package, Pencil, Receipt, Store, TriangleAlert, CircleCheck, CircleX } from 'lucide-react';
import {
  MILLI,
  currentVersion,
  displayUnitOf,
  formatPaisa,
  linesCost,
  stockPlan,
  type CostBook,
  type Ingredient,
  type PreparedRow,
  type PurchaseRecipeRow,
  type RecipesView,
  type StockPlan,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { amountText, quantityText, stockText, toDisplayMilli, unitLabel } from '../inventory-format';
import { stateOf } from './recipe-draft';
import { ingredientArt } from './recipe-lines';
import { DishPurchases } from './purchase-recipes';

/** A food picture for a prepared item on a round plate (real photos come in Phase 7). */
const PREPARED_ART: [RegExp, string][] = [
  [/biryani|pulao/i, '🍛'],
  [/rice|chawal/i, '🍚'],
  [/daal|dal\b|lentil/i, '🥣'],
  [/qeema|keema|mince/i, '🥘'],
  [/qorma|korma|karahi|salan|curry/i, '🍲'],
  [/dough|naan|roti/i, '🫓'],
  [/sauce|chutney|mayo/i, '🫙'],
];
const preparedArt = (name: string) => PREPARED_ART.find(([match]) => match.test(name))?.[1] ?? '🍳';

/** A cooked dish: its saved recipe, its main raw ingredient, and the recipe worked out for the raw stock on hand. */
export interface CookedDish {
  row: PreparedRow;
  main: Ingredient;
  plan: StockPlan;
  cost: number | null;
}

/** In stock (enough of everything), Not enough (some other ingredient is short) or Out of Stock (no main ingredient). */
export type DishState = 'OK' | 'SHORT' | 'OUT';
export const dishState = (dish: CookedDish): DishState => (dish.plan.outOfStock ? 'OUT' : dish.plan.needs.some((n) => n.shortMilli > 0) ? 'SHORT' : 'OK');

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

const PILL: Record<DishState, { className: string; icon: typeof CircleCheck }> = {
  OK: { className: 'bg-green-600 text-white', icon: CircleCheck },
  SHORT: { className: 'bg-amber-400 text-amber-950', icon: TriangleAlert },
  OUT: { className: 'bg-red-600 text-white', icon: CircleX },
};

function StatePill({ state }: { state: DishState }) {
  const { className, icon: Icon } = PILL[state];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap', className)} data-dish-state={state}>
      <Icon className="size-3" aria-hidden />
      {t(`inventory.recipes.cooked.state.${state}`)}
    </span>
  );
}

/** The dish on a round plate */
function Plate({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-linear-to-br from-white via-rose-50 to-brand-soft shadow-[inset_0_0_0_4px_white,0_6px_14px_-6px_rgb(15_23_42/0.35)]',
        size === 'md' ? 'size-[4.5rem] text-4xl' : 'size-12 text-2xl',
      )}
      aria-hidden
    >
      <span className="drop-shadow-sm">{preparedArt(name)}</span>
    </span>
  );
}

/** Verified recipes get a small green tick next to the name; a draft says Draft. */
function RecipeStatus({ row }: { row: PreparedRow }) {
  const state = stateOf(row.recipe);
  if (state === 'VERIFIED')
    return (
      <span title={t('inventory.recipes.status.VERIFIED')} className="inline-flex shrink-0 text-green-600" data-recipe-status={state}>
        <BadgeCheck className="size-4" aria-label={t('inventory.recipes.status.VERIFIED')} />
      </span>
    );
  return (
    <Badge tone={state === 'DRAFT' ? 'amber' : 'grey'} className="shrink-0 px-1.5 py-0 text-[10px]">
      <span data-recipe-status={state}>{t(`inventory.recipes.status.${state}`)}</span>
    </Badge>
  );
}

function InfoLine({ icon: Icon, label, children, title }: { icon: typeof Package; label: string; children: ReactNode; title?: string }) {
  return (
    <p className="flex min-w-0 items-center gap-1.5 text-[13px] leading-snug text-slate-600" title={title}>
      <Icon className="size-3.5 shrink-0 text-brand" aria-hidden />
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 truncate font-bold text-slate-900">{children}</span>
    </p>
  );
}

/**
 * Where the dish is sold (owner's integration brief, 2026-11-08): the menu products made from it, or "Not on POS". Tapping it
 * opens Sell on POS (link the same menu product, or make it once; change the portions).
 */
function PosLine({ row, onSell }: { row: PreparedRow; onSell?: () => void }) {
  const names = (row.soldAs ?? []).map((s) => s.name);
  const value = names.length ? (
    <span className="text-green-700" data-on-pos>
      {names.join(', ')}
    </span>
  ) : (
    <span className="text-slate-500" data-on-pos="none">
      {t('inventory.recipes.sell.notOnPos')}
    </span>
  );
  if (!onSell) return <InfoLine icon={Store} label={t('inventory.recipes.sell.line')}>{value}</InfoLine>;
  return (
    <button
      type="button"
      onClick={onSell}
      aria-label={t('inventory.recipes.sell.buttonFor', { name: row.ingredient.name })}
      className="press -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-md px-1 text-left text-[13px] leading-snug text-slate-600 hover:bg-brand-soft/50"
      data-sell-line
    >
      <Store className="size-3.5 shrink-0 text-brand" aria-hidden />
      <span className="shrink-0">{t('inventory.recipes.sell.line')}</span>
      <span className="min-w-0 truncate font-bold">{value}</span>
      {names.length === 0 && <span className="ml-auto shrink-0 font-bold text-brand">{t('inventory.recipes.sell.button')}</span>}
    </button>
  );
}

const BUTTON = 'press flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13px] font-bold';

function EditButton({ name, onEdit }: { name: string; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} aria-label={`${t('inventory.recipes.edit')}: ${name}`} className={cn(BUTTON, 'border border-brand/60 bg-white text-brand hover:bg-brand-soft')}>
      <Pencil className="size-3.5" aria-hidden />
      {t('inventory.recipes.cooked.edit')}
    </button>
  );
}

export type CardLayout = 'grid' | 'list';

/**
 * One cooked dish as a compact card (owner's picture, 2026-11-08): the dish on a plate, its name, recipe status and stock pill,
 * Raw Stock (from supplier bills) and Recipe Cost for that stock, the shared main ingredient, and small Ingredients and Edit
 * buttons. The ingredients open only when asked. Out of stock: the saved recipe stays.
 */
export function CookedCard({
  dish,
  sharedWith,
  byId,
  canManage,
  onEdit,
  onSell,
  layout = 'grid',
  purchases = [],
}: {
  dish: CookedDish;
  /** Other cooked dishes made from the same main raw ingredient */
  sharedWith: string[];
  byId: ReadonlyMap<string, Ingredient>;
  canManage: boolean;
  onEdit: () => void;
  /** Sell on POS (Owner / Manager with the Menu too) */
  onSell?: () => void;
  layout?: CardLayout;
  /** P3: each supplier purchase of its main ingredient with its own recipe, newest first */
  purchases?: PurchaseRecipeRow[];
}) {
  const [open, setOpen] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);
  const { row, main, plan, cost } = dish;
  const lastPurchase = purchases[0];
  const state = dishState(dish);
  const shared = sharedWith.length > 0;
  const amount = amountText(plan.scale.rawMilli, main.stockUnit);
  const list = layout === 'list';
  const toggle = () => setOpen((o) => !o);

  const details = (
    <div className="min-w-0 space-y-1">
      <InfoLine icon={Package} label={t('inventory.recipes.cooked.rawStockLine')}>
        {plan.outOfStock ? (
          <span className="text-red-700" data-raw-stock="out">
            {t('inventory.recipes.cooked.outHintShort', { name: main.name })}
          </span>
        ) : (
          <span data-raw-stock>{`${amount}${shared ? '*' : ''}`}</span>
        )}
      </InfoLine>
      {shared && (
        <InfoLine icon={Link2} label={t('inventory.recipes.cooked.uses')} title={t('inventory.recipes.cooked.shared', { name: main.name, dishes: sharedWith.join(', ') })}>
          <span className="font-semibold text-slate-700" data-shared>
            {t('inventory.recipes.cooked.usesShared', { name: main.name })}
          </span>
        </InfoLine>
      )}
      <InfoLine icon={Coins} label={t('inventory.recipes.cooked.recipeCost')}>
        <span className="tabular-nums" data-cooked-cost>
          {cost === null ? '—' : formatPaisa(cost)}
        </span>
        {plan.outOfStock && <span className="ml-1 font-normal text-slate-500">{t('inventory.recipes.cooked.savedFor', { qty: amount })}</span>}
      </InfoLine>
      {/* P3: each purchase has its own recipe, apart from the total stock above */}
      <button
        type="button"
        onClick={() => setShowPurchases((s) => !s)}
        aria-expanded={showPurchases}
        aria-label={t('inventory.recipes.purchases.open', { name: main.name })}
        className="press -mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1.5 rounded-md px-1 text-left text-[13px] leading-snug text-slate-600 hover:bg-brand-soft/50"
        data-purchases-line
      >
        <Receipt className="size-3.5 shrink-0 text-brand" aria-hidden />
        <span className="shrink-0">{t('inventory.recipes.purchases.line')}</span>
        <span className="min-w-0 truncate font-bold text-slate-900">
          {lastPurchase
            ? t('inventory.recipes.purchases.lineValue', {
                n: purchases.length,
                qty: amountText(lastPurchase.rawMilli, main.stockUnit),
                cost: lastPurchase.cost === null ? '—' : formatPaisa(lastPurchase.cost),
              })
            : '—'}
        </span>
        <ChevronDown className={cn('ml-auto size-3.5 shrink-0 text-slate-400 transition-transform', showPurchases && 'rotate-180')} aria-hidden />
      </button>
      <PosLine row={row} onSell={onSell} />
    </div>
  );

  const buttons = (
    <div className={cn('grid gap-2', canManage ? 'grid-cols-[minmax(0,1fr)_auto]' : 'grid-cols-1', list && 'sm:w-64')}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={open ? t('inventory.recipes.cooked.hide') : t('inventory.recipes.cooked.show', { qty: amount })}
        className={cn(BUTTON, open ? 'bg-brand-soft text-brand' : 'bg-slate-100 text-slate-700 hover:bg-brand-soft hover:text-brand')}
      >
        <Eye className="size-3.5" aria-hidden />
        {t('inventory.recipes.cooked.ingredients')}
      </button>
      {canManage && <EditButton name={row.ingredient.name} onEdit={onEdit} />}
    </div>
  );

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-3 shadow-[0_4px_16px_-10px_rgb(15_23_42/0.25)] transition-shadow hover:shadow-[0_10px_24px_-14px_rgb(227_30_36/0.4)]',
        state === 'OUT' ? 'border-red-200' : 'border-slate-200/80',
      )}
      data-cooked-card
    >
      <div className={cn('flex gap-3', list ? 'flex-col sm:flex-row sm:items-center' : 'items-start')}>
        <div className={cn('flex min-w-0 flex-1 gap-3', list ? 'items-center' : 'items-start')}>
          <Plate name={row.ingredient.name} size={list ? 'sm' : 'md'} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start gap-1.5">
              <p className="min-w-0 flex-1 text-[15px] leading-tight font-extrabold text-slate-900">
                {row.ingredient.name} <RecipeStatus row={row} />
              </p>
              <StatePill state={state} />
              {!list && (
                <button type="button" onClick={toggle} aria-label={t('inventory.recipes.cooked.open', { name: row.ingredient.name })} className="press -mr-1 grid size-6 shrink-0 place-items-center rounded-md text-slate-500 hover:text-brand">
                  <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} aria-hidden />
                </button>
              )}
            </div>
            {details}
          </div>
        </div>
        {list ? buttons : null}
      </div>
      {showPurchases && (
        <div className="mt-2.5">
          <DishPurchases rows={purchases} byId={byId} />
        </div>
      )}
      {!list && <div className="mt-2.5">{buttons}</div>}

      {open && (
        <div className="mt-2.5 space-y-1.5">
          <p className="text-xs font-semibold text-slate-500" data-main-line>
            {t('inventory.recipes.cooked.forStock', { base: stockText(main, plan.scale.baseMilli), name: main.name, qty: amount })}
          </p>
          <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40" data-cooked-lines>
            {plan.needs.map((need) => {
              const ingredient = byId.get(need.ingredientId);
              const unit = ingredient?.stockUnit ?? 'g';
              return (
                <li key={need.ingredientId} className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 text-[13px]', need.shortMilli > 0 && 'bg-amber-50/80')}>
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                    <span aria-hidden>{ingredient ? ingredientArt(ingredient) : '•'}</span>
                    <span className="truncate">{ingredient?.name ?? '—'}</span>
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-bold text-slate-900">{amountText(need.needMilli, unit)}</span>
                    {!plan.outOfStock && (
                      <span className={cn('block text-[11px]', need.shortMilli > 0 ? 'font-bold text-amber-700' : 'text-slate-500')}>
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
        </div>
      )}
    </div>
  );
}

/** Any other prepared item (naan dough, sauces) in the same compact card: what one batch makes and what it costs. */
export function PreparedCard({ row, canManage, onEdit, onSell, layout = 'grid' }: { row: PreparedRow; canManage: boolean; onEdit: () => void; onSell?: () => void; layout?: CardLayout }) {
  const yieldMilli = row.recipe ? currentVersion(row.recipe)?.yieldMilli : null;
  const unit = displayUnitOf(row.ingredient);
  const list = layout === 'list';
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_4px_16px_-10px_rgb(15_23_42/0.25)]">
      <div className={cn('flex gap-3', list ? 'flex-col sm:flex-row sm:items-center' : 'items-start')}>
        <div className={cn('flex min-w-0 flex-1 gap-3', list ? 'items-center' : 'items-start')}>
          <Plate name={row.ingredient.name} size={list ? 'sm' : 'md'} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[15px] leading-tight font-extrabold text-slate-900">
              {row.ingredient.name} <RecipeStatus row={row} />
            </p>
            <div className="space-y-1">
              <InfoLine icon={Package} label={t('inventory.recipes.cooked.batch')}>
                {yieldMilli ? t('inventory.recipes.makes', { qty: quantityText(toDisplayMilli(row.ingredient, yieldMilli), unit) }) : '—'}
                {row.batchCost !== null && <span className="ml-1 font-normal text-slate-500">· {formatPaisa(row.batchCost)}</span>}
              </InfoLine>
              <InfoLine icon={Coins} label={t('inventory.recipes.cooked.recipeCost')}>
                <span data-unit-cost>{row.unitCost === null ? '—' : t('inventory.recipes.unitCost', { price: formatPaisa(row.unitCost), unit: unitLabel(unit, MILLI) })}</span>
              </InfoLine>
              <PosLine row={row} onSell={onSell} />
            </div>
          </div>
        </div>
        {canManage && list && (
          <div className="flex justify-end">
            <EditButton name={row.ingredient.name} onEdit={onEdit} />
          </div>
        )}
      </div>
      {canManage && !list && (
        <div className="mt-2.5 flex justify-end">
          <EditButton name={row.ingredient.name} onEdit={onEdit} />
        </div>
      )}
    </div>
  );
}

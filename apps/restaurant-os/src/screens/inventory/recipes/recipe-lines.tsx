'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  formatPaisa,
  formatBps,
  grossQuantity,
  ingredientCost,
  parsePercent,
  parseQuantity,
  type CostBook,
  type FoodCost,
  type Ingredient,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { quantityText, unitLabel } from '../inventory-format';
import { emptyLine, type LineDraft } from './recipe-draft';

/**
 * The ingredient lines of one recipe: ingredient, quantity in its recipe unit (g, ml, pieces), loss % and the live cost.
 * "More" holds the rarely used choices: the guest may leave it out, and a substitute when it runs out.
 */
export function RecipeLines({
  lines,
  onChange,
  ingredients,
  book,
  excludeId,
  errorLine,
}: {
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  ingredients: readonly Ingredient[];
  book: CostBook;
  /** A prepared item never uses itself */
  excludeId?: string;
  errorLine: number | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const set = (key: string, change: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const input = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[minmax(0,1fr)_7rem_5rem_5.5rem_5rem] gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500 md:grid">
        <span>{t('inventory.recipes.editor.ingredient')}</span>
        <span>{t('inventory.recipes.editor.quantity')}</span>
        <span title={t('inventory.recipes.editor.lossHint')}>{t('inventory.recipes.editor.loss')}</span>
        <span className="text-right">{t('inventory.recipes.editor.lineCost')}</span>
        <span />
      </div>
      <ol className="space-y-2">
        {lines.map((line, index) => {
          const ingredient = ingredients.find((i) => i.id === line.ingredientId);
          const qty = parseQuantity(line.quantity, { allowZero: false });
          const loss = line.loss.trim() ? parsePercent(line.loss) : 0;
          const gross = qty !== null && loss !== null && loss < 10_000 ? grossQuantity(qty, loss) : null;
          const cost = ingredient && gross !== null ? ingredientCost(book, ingredient.id, gross) : null;
          const unit = ingredient ? unitLabel(ingredient.stockUnit, 2 * MILLI) : '';
          const choices = ingredients.filter((i) => i.id !== excludeId && (i.isActive || i.id === line.ingredientId));
          const substitutes = ingredient ? ingredients.filter((i) => i.id !== ingredient.id && i.id !== excludeId && i.isActive && i.stockUnit === ingredient.stockUnit) : [];
          const more = open === line.key || line.optional || Boolean(line.substituteId);
          return (
            <li
              key={line.key}
              data-recipe-line={index + 1}
              className={cn('rounded-2xl border bg-white p-2.5 md:p-2', errorLine === index ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200')}
            >
              <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_7rem_5rem_5.5rem_5rem] md:items-center">
                <select
                  value={line.ingredientId}
                  onChange={(e) => set(line.key, { ingredientId: e.target.value, substituteId: '' })}
                  aria-label={`${t('inventory.recipes.editor.ingredient')} ${index + 1}`}
                  className={cn(input, 'col-span-2 md:col-span-1')}
                >
                  <option value="">{t('inventory.recipes.editor.choose')}</option>
                  {INGREDIENT_CATEGORIES.map((category) => {
                    const group = choices.filter((i) => i.kind === 'BOUGHT' && i.category === category);
                    return group.length ? (
                      <optgroup key={category} label={t(`inventory.categories.${category}`)}>
                        {group.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null;
                  })}
                  {choices.some((i) => i.kind === 'PREPARED') && (
                    <optgroup label={t('inventory.recipes.editor.preparedGroup')}>
                      {choices
                        .filter((i) => i.kind === 'PREPARED')
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <span className="flex">
                  <input
                    value={line.quantity}
                    onChange={(e) => set(line.key, { quantity: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`${t('inventory.recipes.editor.quantity')} ${index + 1}`}
                    className={cn(input, 'rounded-r-none')}
                  />
                  <span className="flex min-w-11 shrink-0 items-center justify-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-600" aria-hidden>
                    {unit || '—'}
                  </span>
                </span>
                <span className="flex">
                  <input
                    value={line.loss}
                    onChange={(e) => set(line.key, { loss: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`${t('inventory.recipes.editor.loss')} ${index + 1}`}
                    title={t('inventory.recipes.editor.lossHint')}
                    className={cn(input, 'rounded-r-none')}
                  />
                  <span className="flex shrink-0 items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-2 text-xs font-semibold text-slate-600" aria-hidden>
                    %
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2 md:justify-end">
                  <span className="text-xs text-slate-500 md:hidden">{t('inventory.recipes.editor.lineCost')}</span>
                  <span className="font-extrabold tabular-nums text-slate-900" data-line-cost>
                    {cost === null ? '—' : formatPaisa(cost)}
                  </span>
                </span>
                <span className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setOpen(open === line.key ? null : line.key)}
                    aria-expanded={more}
                    aria-label={t('inventory.recipes.editor.more', { n: index + 1 })}
                    className="press grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
                  >
                    <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                    aria-label={t('inventory.recipes.editor.removeLine', { n: index + 1 })}
                    className="press grid size-10 place-items-center rounded-xl text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              </div>
              {ingredient && gross !== null && loss !== null && loss > 0 && (
                <p className="mt-1 px-1 text-xs font-semibold text-slate-500">{t('inventory.recipes.editor.uses', { qty: quantityText(gross, ingredient.stockUnit) })}</p>
              )}
              {more && (
                <div className="mt-2 grid gap-2 border-t border-slate-100 pt-2 sm:grid-cols-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={line.optional} onChange={(e) => set(line.key, { optional: e.target.checked })} className="size-5 accent-brand" />
                    {t('inventory.recipes.editor.optional')}
                  </label>
                  <label className="block">
                    <span className="sr-only">{t('inventory.recipes.editor.substitute')}</span>
                    <select
                      value={line.substituteId}
                      onChange={(e) => set(line.key, { substituteId: e.target.value })}
                      aria-label={`${t('inventory.recipes.editor.substitute')} ${index + 1}`}
                      className={cn(input, 'text-sm')}
                      disabled={!ingredient}
                    >
                      <option value="">
                        {t('inventory.recipes.editor.substitute')}: {t('inventory.recipes.editor.noSubstitute')}
                      </option>
                      {substitutes.map((i) => (
                        <option key={i.id} value={i.id}>
                          {t('inventory.recipes.editor.substitute')}: {i.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => onChange([...lines, emptyLine()])}
        className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-700 hover:border-brand/50 hover:bg-brand-soft/40 hover:text-brand"
      >
        <Plus className="size-4" aria-hidden />
        {t('inventory.recipes.editor.addLine')}
      </button>
    </div>
  );
}

export const LEVEL_TONE = { GOOD: 'green', WATCH: 'amber', HIGH: 'red' } as const;

/** Recipe cost, selling price, food cost %, gross profit and margin — the same numbers everywhere. */
export function CostingRows({ costing, showNetPrice }: { costing: FoodCost; showNetPrice: boolean }) {
  const row = 'flex items-baseline justify-between gap-3 py-1.5';
  return (
    <dl className="divide-y divide-slate-100 text-sm" data-costing>
      <div className={row}>
        <dt className="text-slate-600">{t('inventory.recipes.editor.recipeCost')}</dt>
        <dd className="font-extrabold tabular-nums text-slate-900" data-recipe-cost>
          {costing.cost === null ? '—' : formatPaisa(costing.cost)}
        </dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">{t('inventory.recipes.editor.sellingPrice')}</dt>
        <dd className="tabular-nums text-slate-900">{formatPaisa(costing.price)}</dd>
      </div>
      {showNetPrice && (
        <div className={row}>
          <dt className="text-slate-600">{t('inventory.recipes.editor.sellingPriceNoTax')}</dt>
          <dd className="tabular-nums text-slate-900">{formatPaisa(costing.netPrice)}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="font-bold text-slate-900">{t('inventory.recipes.editor.foodCostPct')}</dt>
        <dd className="flex items-center gap-2" data-food-cost>
          <span className="text-xl font-black tabular-nums text-slate-900">{costing.foodCostBps === null ? '—' : formatBps(costing.foodCostBps)}</span>
          {costing.level && <Badge tone={LEVEL_TONE[costing.level]}>{t(`inventory.recipes.level.${costing.level}`)}</Badge>}
        </dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">{t('inventory.recipes.editor.profit')}</dt>
        <dd className={cn('font-bold tabular-nums', costing.profit !== null && costing.profit < 0 ? 'text-red-700' : 'text-green-700')}>{costing.profit === null ? '—' : costing.profit < 0 ? `−${formatPaisa(-costing.profit)}` : formatPaisa(costing.profit)}</dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">{t('inventory.recipes.editor.margin')}</dt>
        <dd className="tabular-nums text-slate-900">{costing.marginBps === null ? '—' : formatBps(costing.marginBps)}</dd>
      </div>
    </dl>
  );
}

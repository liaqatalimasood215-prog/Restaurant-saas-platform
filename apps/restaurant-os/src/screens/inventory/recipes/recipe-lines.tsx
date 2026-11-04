'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Trash2 } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  formatBps,
  formatPaisa,
  fromStockMilli,
  grossQuantity,
  ingredientCost,
  isPackageUnit,
  milliToInput,
  parsePercent,
  parseQuantity,
  recipeUnitsFor,
  toStockMilli,
  type CostBook,
  type FoodCost,
  type Ingredient,
  type IngredientCategory,
  type RecipeUnit,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { quantityText } from '../inventory-format';
import { emptyLine, lineFactor, sizeUnitOf, type LineDraft } from './recipe-draft';

/** A small picture per ingredient category (food photos come with picture upload, Phase 7). */
export const CATEGORY_ART: Record<IngredientCategory, string> = {
  MEAT: '🍗',
  VEGETABLES: '🥬',
  DAIRY: '🧀',
  BAKERY: '🍞',
  GRAINS: '🍚',
  SAUCES_SPICES: '🌶️',
  OIL: '🫗',
  BEVERAGES: '🥤',
  FROZEN: '🧊',
  PACKAGING: '📦',
  CLEANING: '🧴',
  OTHER: '🥄',
};

/**
 * The ingredients table of the Recipe Builder: #, ingredient, Quantity, Unit, cost. The unit list fits the ingredient
 * (kg / g / mg, L / ml, pcs / dozen, packages); changing the unit converts the quantity (500 g → 0.5 kg). A package asks
 * how much one holds. Loss, "guest may leave it out" and a substitute sit under the ▾ of each line.
 */
export function RecipeLines({
  title,
  lines,
  onChange,
  ingredients,
  book,
  excludeId,
  errorLine,
}: {
  /** Shown on the left of the search, on one line (saves height) */
  title?: string;
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
  ingredients: readonly Ingredient[];
  book: CostBook;
  /** A prepared item never uses itself */
  excludeId?: string;
  errorLine: number | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const set = (key: string, change: Partial<LineDraft>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const input = 'min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm';
  const usable = ingredients.filter((i) => i.isActive && i.id !== excludeId);
  const q = query.trim().toLowerCase();
  const matches = q ? usable.filter((i) => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q)).slice(0, 8) : [];

  /** Search → pick: fills the first empty line, else adds one, and puts the cursor in its Quantity. */
  const add = (ingredient: Ingredient) => {
    const empty = lines.find((l) => !l.ingredientId);
    const next = empty ? lines.map((l) => (l === empty ? { ...emptyLine(ingredient), key: l.key } : l)) : [...lines, emptyLine(ingredient)];
    onChange(next);
    setQuery('');
    const index = empty ? lines.indexOf(empty) : lines.length;
    window.setTimeout(() => listRef.current?.querySelector<HTMLInputElement>(`[data-recipe-line="${index + 1}"] input[data-quantity]`)?.focus(), 50);
  };

  /** Another unit: the same amount in the new unit (500 g → 0.5 kg) when both are known; a package size starts again. */
  const changeUnit = (line: LineDraft, unit: RecipeUnit) => {
    const ingredient = byId.get(line.ingredientId);
    if (!ingredient) return set(line.key, { unit });
    const typed = parseQuantity(line.quantity, { allowZero: false });
    const from = lineFactor(line, ingredient);
    // A package size belongs to the package it was typed for: another unit starts without it.
    const to = lineFactor({ unit, size: '' }, ingredient);
    const quantity = typed !== null && from !== null && to !== null ? milliToInput(fromStockMilli(toStockMilli(typed, from), to)) : line.quantity;
    set(line.key, { unit, quantity, size: '' });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        {title && <h3 className="text-base font-extrabold text-slate-900">{title}</h3>}
        <label className="flex min-h-10 min-w-48 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/15">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches[0]) {
                e.preventDefault();
                add(matches[0]);
              }
            }}
            placeholder={t('inventory.recipes.builder.search')}
            aria-label={t('inventory.recipes.builder.search')}
            className="w-full bg-transparent text-sm"
          />
        </label>
        {q && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl" role="listbox" aria-label={t('inventory.recipes.builder.search')}>
            {matches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{t('inventory.recipes.builder.noMatch')}</li>
            ) : (
              matches.map((i) => (
                <li key={i.id}>
                  <button type="button" role="option" aria-selected={false} onClick={() => add(i)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-brand-soft">
                    <span aria-hidden>{i.kind === 'PREPARED' ? '🥣' : CATEGORY_ART[i.category]}</span>
                    <span className="flex-1 font-semibold text-slate-900">{i.name}</span>
                    <span className="text-xs text-slate-500">{i.code}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="hidden grid-cols-[1.25rem_minmax(0,1fr)_4rem_4.25rem_4.5rem_3.75rem] gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 md:grid">
        <span>{t('inventory.recipes.builder.number')}</span>
        <span>{t('inventory.recipes.editor.ingredient')}</span>
        <span>{t('inventory.recipes.editor.quantity')}</span>
        <span>{t('inventory.recipes.builder.unit')}</span>
        <span className="text-right">{t('inventory.recipes.editor.lineCost')}</span>
        <span />
      </div>
      <ol ref={listRef} className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {lines.map((line, index) => {
          const ingredient = byId.get(line.ingredientId);
          const typed = parseQuantity(line.quantity, { allowZero: false });
          const factor = ingredient ? lineFactor(line, ingredient) : null;
          const net = typed !== null && factor !== null ? toStockMilli(typed, factor) : null;
          const loss = line.loss.trim() ? parsePercent(line.loss) : 0;
          const gross = net !== null && loss !== null && loss < 10_000 ? grossQuantity(net, loss) : null;
          const cost = ingredient && gross !== null ? ingredientCost(book, ingredient.id, gross) : null;
          const choices = ingredients.filter((i) => i.id !== excludeId && (i.isActive || i.id === line.ingredientId));
          const substitutes = ingredient ? ingredients.filter((i) => i.id !== ingredient.id && i.id !== excludeId && i.isActive && i.stockUnit === ingredient.stockUnit) : [];
          const units = ingredient ? recipeUnitsFor(ingredient.stockUnit) : (['g'] as RecipeUnit[]);
          const isPackage = ingredient ? isPackageUnit(line.unit, ingredient.stockUnit) : false;
          const more = open === line.key || line.optional || Boolean(line.substituteId);
          return (
            <li key={line.key} data-recipe-line={index + 1} className={cn('py-1', errorLine === index && 'rounded-xl bg-red-50/60 ring-2 ring-red-200')}>
              <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 px-1 md:grid-cols-[1.25rem_minmax(0,1fr)_4rem_4.25rem_4.5rem_3.75rem] md:px-3">
                <span className="text-sm font-bold text-slate-500">{index + 1}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-lg lg:hidden xl:inline" aria-hidden>
                    {ingredient ? (ingredient.kind === 'PREPARED' ? '🥣' : CATEGORY_ART[ingredient.category]) : '➕'}
                  </span>
                  <select
                    value={line.ingredientId}
                    onChange={(e) => {
                      const next = byId.get(e.target.value);
                      set(line.key, { ingredientId: e.target.value, unit: next?.stockUnit ?? 'g', size: '', substituteId: '' });
                    }}
                    aria-label={`${t('inventory.recipes.editor.ingredient')} ${index + 1}`}
                    className={cn(input, 'min-w-0 border-transparent bg-transparent px-1 font-semibold hover:border-slate-200 focus:border-slate-300')}
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
                </span>
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 pl-10 md:contents">
                  <input
                    value={line.quantity}
                    onChange={(e) => set(line.key, { quantity: e.target.value })}
                    inputMode="decimal"
                    placeholder="0"
                    data-quantity
                    aria-label={`${t('inventory.recipes.editor.quantity')} ${index + 1}`}
                    className={cn(input, 'px-2 tabular-nums')}
                  />
                  <select
                    value={line.unit}
                    onChange={(e) => changeUnit(line, e.target.value as RecipeUnit)}
                    disabled={!ingredient}
                    aria-label={t('inventory.recipes.builder.unitOf', { n: index + 1 })}
                    className={cn(input, 'px-2 disabled:bg-slate-50')}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {t(`inventory.unitShort.${u}`)}
                      </option>
                    ))}
                  </select>
                  <span className="whitespace-nowrap text-right text-sm font-extrabold tabular-nums text-slate-900 md:block" data-line-cost>
                    {cost === null ? '—' : formatPaisa(cost)}
                  </span>
                </div>
                <span className="col-span-2 flex justify-end gap-1 md:col-span-1">
                  <button
                    type="button"
                    onClick={() => setOpen(open === line.key ? null : line.key)}
                    aria-expanded={more}
                    aria-label={t('inventory.recipes.editor.more', { n: index + 1 })}
                    className="press grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    <ChevronDown className={cn('size-4 transition-transform', more && 'rotate-180')} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                    aria-label={t('inventory.recipes.editor.removeLine', { n: index + 1 })}
                    className="press grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </span>
              </div>

              {ingredient && isPackage && (
                <label className="mt-2 ml-10 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm md:ml-12">
                  <span className="font-bold text-amber-900">{t('inventory.recipes.builder.packSize', { unit: t(`inventory.unitShort.${line.unit}`) })}</span>
                  <span className="flex">
                    <input
                      value={line.size}
                      onChange={(e) => set(line.key, { size: e.target.value })}
                      inputMode="decimal"
                      placeholder={factor !== null && !line.size ? milliToInput(fromStockMilli(factor, sizeUnitOf(ingredient.stockUnit) === ingredient.stockUnit ? MILLI : 1000 * MILLI)) : '0'}
                      aria-label={t('inventory.recipes.builder.packSizeOf', { unit: t(`inventory.unitShort.${line.unit}`), n: index + 1 })}
                      className="min-h-10 w-24 rounded-l-lg border border-amber-300 bg-white px-2 text-base"
                    />
                    <span className="flex items-center rounded-r-lg border border-l-0 border-amber-300 bg-white px-2 text-xs font-semibold text-slate-600">{t(`inventory.unitShort.${sizeUnitOf(ingredient.stockUnit)}`)}</span>
                  </span>
                  <span className="text-xs text-amber-900">{t('inventory.recipes.builder.packSizeHint', { unit: t(`inventory.unitShort.${line.unit}`) })}</span>
                </label>
              )}
              {ingredient && gross !== null && loss !== null && loss > 0 && (
                <p className="mt-1 ml-10 text-xs font-semibold text-slate-500 md:ml-12">
                  {t('inventory.recipes.editor.uses', { qty: quantityText(gross, ingredient.stockUnit) })} · {t('inventory.recipes.editor.loss')} {line.loss} %
                </p>
              )}
              {more && (
                <div className="mt-2 ml-10 grid gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-3 md:ml-12">
                  <label className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-700">{t('inventory.recipes.editor.loss')}</span>
                    <span className="flex">
                      <input
                        value={line.loss}
                        onChange={(e) => set(line.key, { loss: e.target.value })}
                        inputMode="decimal"
                        placeholder="0"
                        aria-label={`${t('inventory.recipes.editor.loss')} ${index + 1}`}
                        title={t('inventory.recipes.editor.lossHint')}
                        className="min-h-10 w-16 rounded-l-lg border border-slate-300 bg-white px-2 text-base"
                      />
                      <span className="flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600">%</span>
                    </span>
                  </label>
                  <label className="flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={line.optional} onChange={(e) => set(line.key, { optional: e.target.checked })} className="size-5 accent-brand" />
                    {t('inventory.recipes.editor.optional')}
                  </label>
                  <select
                    value={line.substituteId}
                    onChange={(e) => set(line.key, { substituteId: e.target.value })}
                    aria-label={`${t('inventory.recipes.editor.substitute')} ${index + 1}`}
                    className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
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
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => onChange([...lines, emptyLine()])}
        className="press flex min-h-9 w-full shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-700 hover:border-brand/50 hover:bg-brand-soft/40 hover:text-brand"
      >
        <Plus className="size-4" aria-hidden />
        {t('inventory.recipes.editor.addLine')}
      </button>
    </div>
  );
}

export const LEVEL_TONE = { GOOD: 'green', WATCH: 'amber', HIGH: 'red' } as const;

/** Recipe cost, selling price, food cost %, gross profit and margin — the same numbers everywhere. */
export function CostingRows({ costing, showNetPrice, priceNote }: { costing: FoodCost; showNetPrice: boolean; priceNote?: string }) {
  const row = 'flex items-baseline justify-between gap-3 py-1.5';
  return (
    <dl className="divide-y divide-slate-100 text-sm" data-costing>
      <div className={row}>
        <dt className="text-slate-600 leading-tight">{t('inventory.recipes.builder.totalCost')}</dt>
        <dd className="whitespace-nowrap font-extrabold tabular-nums text-slate-900" data-recipe-cost>
          {costing.cost === null ? '—' : formatPaisa(costing.cost)}
        </dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">
          {t('inventory.recipes.editor.sellingPrice')}
          {priceNote && <span className="block text-[11px] text-slate-400">{priceNote}</span>}
        </dt>
        <dd className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 tabular-nums text-slate-900">{formatPaisa(costing.price)}</dd>
      </div>
      {showNetPrice && (
        <div className={row}>
          <dt className="text-slate-600">{t('inventory.recipes.editor.sellingPriceNoTax')}</dt>
          <dd className="tabular-nums text-slate-900">{formatPaisa(costing.netPrice)}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="font-bold text-slate-900">{t('inventory.recipes.foodCost')}</dt>
        <dd className="flex items-center gap-2" data-food-cost>
          {costing.level ? (
            <Badge tone={LEVEL_TONE[costing.level]} className="px-2.5 py-0.5 text-sm">
              {costing.foodCostBps === null ? '—' : formatBps(costing.foodCostBps)}
            </Badge>
          ) : (
            <span className="font-black">—</span>
          )}
        </dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">{t('inventory.recipes.editor.profit')}</dt>
        <dd className={cn('whitespace-nowrap text-base font-black tabular-nums', costing.profit !== null && costing.profit < 0 ? 'text-red-700' : 'text-green-700')}>
          {costing.profit === null ? '—' : costing.profit < 0 ? `−${formatPaisa(-costing.profit)}` : formatPaisa(costing.profit)}
        </dd>
      </div>
      <div className={row}>
        <dt className="text-slate-600">{t('inventory.recipes.editor.margin')}</dt>
        <dd className="tabular-nums text-slate-900">{costing.marginBps === null ? '—' : formatBps(costing.marginBps)}</dd>
      </div>
    </dl>
  );
}


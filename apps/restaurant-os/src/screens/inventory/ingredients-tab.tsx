'use client';

import { useState } from 'react';
import { History, MapPin, Pencil, Search, SlidersHorizontal } from 'lucide-react';
import { INGREDIENT_CATEGORIES, formatPaisa, type IngredientCategory, type IngredientRow, type InventoryView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { STATUS_TONE, expiryLabel, stockText, unitLabel } from './inventory-format';

/** COOKED = cooked food (prepared items) with its stock, apart from the raw ingredients (I3, owner 2026-11-09) */
export const INGREDIENT_FILTERS = ['ALL', 'LOW', 'OUT', 'EXPIRING', 'NOT_IN_USE', 'COOKED'] as const;
export type IngredientFilter = (typeof INGREDIENT_FILTERS)[number];

function matches(row: IngredientRow, filter: IngredientFilter): boolean {
  if (filter === 'COOKED') return true;
  if (filter === 'NOT_IN_USE') return row.status === 'NOT_IN_USE';
  if (row.status === 'NOT_IN_USE') return false;
  if (filter === 'LOW') return row.status === 'LOW';
  if (filter === 'OUT') return row.status === 'OUT';
  if (filter === 'EXPIRING') return row.expiry === 'SOON' || row.expiry === 'EXPIRED';
  return true;
}

/** Ingredients: search, category, a stock filter; a table on wide screens and cards on phones. Tap a row to edit it. */
export function IngredientsTab({
  view,
  filter,
  onFilter,
  canManage,
  onEdit,
  onAdjust,
  onHistory,
}: {
  view: InventoryView;
  filter: IngredientFilter;
  onFilter: (filter: IngredientFilter) => void;
  canManage: boolean;
  onEdit: (row: IngredientRow) => void;
  onAdjust: (row: IngredientRow) => void;
  /** Opens Stock Movements for this ingredient */
  onHistory: (row: IngredientRow) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<IngredientCategory | 'ALL'>('ALL');
  const q = query.trim().toLowerCase();
  const inCategoryOf = (f: IngredientFilter) =>
    (f === 'COOKED' ? (view.cooked ?? []) : view.ingredients).filter(
      (r) => (category === 'ALL' || r.ingredient.category === category) && (!q || r.ingredient.name.toLowerCase().includes(q) || r.ingredient.code.toLowerCase().includes(q)),
    );
  const rows = inCategoryOf(filter).filter((r) => matches(r, filter));
  const price = (r: IngredientRow) => t('inventory.perUnit', { price: formatPaisa(r.ingredient.purchasePrice), unit: unitLabel(r.ingredient.purchaseUnit, 1000) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-12 min-w-56 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 shadow-sm transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 sm:max-w-sm">
          <Search className="size-5 shrink-0 text-slate-400" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('inventory.search')} aria-label={t('inventory.search')} className="w-full bg-transparent text-sm" />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as IngredientCategory | 'ALL')}
          aria-label={t('inventory.category')}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm"
        >
          <option value="ALL">{t('inventory.allCategories')}</option>
          {INGREDIENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`inventory.categories.${c}`)}
            </option>
          ))}
        </select>
        <span className="ml-auto text-sm font-semibold text-slate-500">{t('inventory.count', { n: rows.length })}</span>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t('inventory.filters.label')}>
        {INGREDIENT_FILTERS.map((f) => {
          const n = inCategoryOf(f).filter((r) => matches(r, f)).length;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => onFilter(f)}
              className={cn(
                'press flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold',
                filter === f ? 'border-brand bg-brand bg-brand-gradient text-white shadow-brand' : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand/40 hover:bg-brand-soft/50',
              )}
            >
              {t(`inventory.filters.${f}`)}
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', filter === f ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{n}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{t('inventory.noResults')}</p>
      ) : (
        <>
          {/* Wide screens: one table */}
          <Card className="hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('inventory.columns.name')}</th>
                  <th className="px-3 py-3 text-right">{t('inventory.columns.stock')}</th>
                  <th className="px-3 py-3 text-right">{t('inventory.columns.min')}</th>
                  <th className="px-3 py-3">{t('inventory.columns.price')}</th>
                  <th className="px-3 py-3">{t('inventory.columns.place')}</th>
                  <th className="px-3 py-3">{t('inventory.columns.expiry')}</th>
                  <th className="px-3 py-3">{t('inventory.columns.status')}</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const expiry = expiryLabel(r.expiry, r.ingredient.expiryDate);
                  return (
                    <tr key={r.ingredient.id} data-ingredient-row={r.ingredient.name} className={cn('transition-colors hover:bg-brand-soft/30', r.status === 'NOT_IN_USE' && 'text-slate-400')}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{r.ingredient.name}</span>
                        <span className="block text-xs text-slate-500">
                          {r.ingredient.code} · {t(`inventory.categories.${r.ingredient.category}`)}
                        </span>
                      </td>
                      <td className={cn('px-3 py-3 text-right font-extrabold tabular-nums', r.status === 'OUT' ? 'text-red-700' : r.status === 'LOW' ? 'text-amber-700' : 'text-slate-900')}>
                        {stockText(r.ingredient, r.onHandMilli)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600">{stockText(r.ingredient, r.ingredient.minStockMilli)}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">{price(r)}</td>
                      <td className="px-3 py-3 text-slate-600">{r.locationName ?? '—'}</td>
                      <td className="px-3 py-3">{expiry.tone ? <Badge tone={expiry.tone}>{expiry.text}</Badge> : <span className="text-slate-500">{expiry.text}</span>}</td>
                      <td className="px-3 py-3">
                        <Badge tone={STATUS_TONE[r.status]}>{t(`inventory.status.${r.status}`)}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <span className="flex justify-end gap-1">
                          <button type="button" onClick={() => onHistory(r)} className="press grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-brand-soft hover:text-brand" aria-label={t('inventory.ledger.history', { name: r.ingredient.name })} title={t('inventory.stockTabs.movements')}>
                            <History className="size-4" aria-hidden />
                          </button>
                          {canManage && (
                            <>
                            {r.status !== 'NOT_IN_USE' && (
                              <button type="button" onClick={() => onAdjust(r)} className="press grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-brand-soft hover:text-brand" aria-label={t('inventory.adjustFor', { name: r.ingredient.name })} title={t('inventory.actions.adjust')}>
                                <SlidersHorizontal className="size-4" aria-hidden />
                              </button>
                            )}
                            <button type="button" onClick={() => onEdit(r)} className="press grid size-10 place-items-center rounded-xl text-slate-600 hover:bg-brand-soft hover:text-brand" aria-label={t('inventory.edit', { name: r.ingredient.name })} title={t('inventory.actions.edit')}>
                              <Pencil className="size-4" aria-hidden />
                            </button>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Phones and tablets: one card per ingredient */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((r) => {
              const expiry = expiryLabel(r.expiry, r.ingredient.expiryDate);
              return (
                <li key={r.ingredient.id} data-ingredient-card={r.ingredient.name}>
                  <Card className="flex h-full flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-900">{r.ingredient.name}</p>
                        <p className="text-xs text-slate-500">
                          {r.ingredient.code} · {t(`inventory.categories.${r.ingredient.category}`)}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONE[r.status]}>{t(`inventory.status.${r.status}`)}</Badge>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className={cn('text-2xl font-black tabular-nums', r.status === 'OUT' ? 'text-red-700' : r.status === 'LOW' ? 'text-amber-700' : 'text-slate-900')}>
                        {stockText(r.ingredient, r.onHandMilli)}
                      </p>
                      <p className="text-right text-xs text-slate-500">
                        {t('inventory.columns.min')} {stockText(r.ingredient, r.ingredient.minStockMilli)}
                        <span className="block font-semibold text-slate-700">{price(r)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {r.locationName && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden />
                          {r.locationName}
                        </span>
                      )}
                      {expiry.tone && <Badge tone={expiry.tone}>{expiry.text}</Badge>}
                      <button type="button" onClick={() => onHistory(r)} className="ml-auto flex min-h-9 items-center gap-1 rounded-lg px-2 font-bold text-brand hover:bg-brand-soft" aria-label={t('inventory.ledger.history', { name: r.ingredient.name })}>
                        <History className="size-3.5" aria-hidden />
                        {t('inventory.stockTabs.movements')}
                      </button>
                    </div>
                    {canManage && (
                      <div className="mt-auto grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onAdjust(r)}
                          disabled={r.status === 'NOT_IN_USE'}
                          className="press flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm hover:border-brand/40 disabled:opacity-40"
                        >
                          <SlidersHorizontal className="size-4" aria-hidden />
                          {t('inventory.actions.adjust')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(r)}
                          aria-label={t('inventory.edit', { name: r.ingredient.name })}
                          className="press flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm hover:border-brand/40"
                        >
                          <Pencil className="size-4" aria-hidden />
                          {t('inventory.actions.edit')}
                        </button>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

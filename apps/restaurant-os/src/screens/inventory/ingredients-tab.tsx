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

/** Ingredients: search, category, a stock filter; a compact table on wide screens and small cards on phones and tablets. */
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
  const stockTone = (r: IngredientRow) => (r.status === 'OUT' ? 'text-red-700' : r.status === 'LOW' ? 'text-amber-700' : 'text-slate-900');
  const iconButton = 'press grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-brand-soft hover:text-brand pointer-coarse:size-10';

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-10 min-w-48 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 sm:max-w-xs">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('inventory.search')} aria-label={t('inventory.search')} className="w-full bg-transparent text-sm" />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as IngredientCategory | 'ALL')}
          aria-label={t('inventory.category')}
          className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          <option value="ALL">{t('inventory.allCategories')}</option>
          {INGREDIENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`inventory.categories.${c}`)}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs font-semibold text-slate-500">{t('inventory.count', { n: rows.length })}</span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label={t('inventory.filters.label')}>
        {INGREDIENT_FILTERS.map((f) => {
          const n = inCategoryOf(f).filter((r) => matches(r, f)).length;
          // A count that needs a look (low, out, expiring) is coloured; a zero stays grey
          const warn = n > 0 && (f === 'LOW' || f === 'OUT' || f === 'EXPIRING');
          return (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => onFilter(f)}
              className={cn(
                'press flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-bold pointer-coarse:min-h-10',
                filter === f ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-brand/40',
              )}
            >
              {t(`inventory.filters.${f}`)}
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', warn ? (f === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800') : filter === f ? 'bg-white text-brand' : 'bg-slate-100 text-slate-500')}>{n}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">{t('inventory.noResults')}</p>
      ) : (
        <>
          {/* Wide screens: one table */}
          <Card className="hidden overflow-hidden rounded-xl lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">{t('inventory.columns.name')}</th>
                  <th className="px-3 py-2 text-right">{t('inventory.columns.stock')}</th>
                  <th className="px-3 py-2 text-right">{t('inventory.columns.min')}</th>
                  <th className="px-3 py-2">{t('inventory.columns.price')}</th>
                  <th className="px-3 py-2">{t('inventory.columns.place')}</th>
                  <th className="px-3 py-2">{t('inventory.columns.expiry')}</th>
                  <th className="px-3 py-2">{t('inventory.columns.status')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const expiry = expiryLabel(r.expiry, r.ingredient.expiryDate);
                  return (
                    <tr key={r.ingredient.id} data-ingredient-row={r.ingredient.name} className={cn('transition-colors hover:bg-brand-soft/30', r.status === 'NOT_IN_USE' && 'text-slate-400')}>
                      <td className="px-3 py-1.5">
                        <span className="font-bold leading-tight text-slate-900">{r.ingredient.name}</span>
                        <span className="block text-[11px] leading-tight text-slate-500">
                          {r.ingredient.code} · {t(`inventory.categories.${r.ingredient.category}`)}
                        </span>
                      </td>
                      <td className={cn('px-3 py-1.5 text-right font-extrabold tabular-nums', stockTone(r))}>{stockText(r.ingredient, r.onHandMilli)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{stockText(r.ingredient, r.ingredient.minStockMilli)}</td>
                      <td className="px-3 py-1.5 tabular-nums text-slate-700">{price(r)}</td>
                      <td className="px-3 py-1.5 text-slate-600">{r.locationName ?? '—'}</td>
                      <td className="px-3 py-1.5">{expiry.tone ? <Badge tone={expiry.tone}>{expiry.text}</Badge> : <span className="text-slate-500">{expiry.text}</span>}</td>
                      <td className="px-3 py-1.5">
                        <Badge tone={STATUS_TONE[r.status]}>{t(`inventory.status.${r.status}`)}</Badge>
                      </td>
                      <td className="px-2 py-1">
                        <span className="flex justify-end">
                          <button type="button" onClick={() => onHistory(r)} className={iconButton} aria-label={t('inventory.ledger.history', { name: r.ingredient.name })} title={t('inventory.stockTabs.movements')}>
                            <History className="size-4" aria-hidden />
                          </button>
                          {canManage && (
                            <>
                              {r.status !== 'NOT_IN_USE' && (
                                <button type="button" onClick={() => onAdjust(r)} className={iconButton} aria-label={t('inventory.adjustFor', { name: r.ingredient.name })} title={t('inventory.actions.adjust')}>
                                  <SlidersHorizontal className="size-4" aria-hidden />
                                </button>
                              )}
                              <button type="button" onClick={() => onEdit(r)} className={iconButton} aria-label={t('inventory.edit', { name: r.ingredient.name })} title={t('inventory.actions.edit')}>
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

          {/* Phones and tablets: one small card per ingredient: name and stock first, then status, price and the actions */}
          <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
            {rows.map((r) => {
              const expiry = expiryLabel(r.expiry, r.ingredient.expiryDate);
              return (
                <li key={r.ingredient.id} data-ingredient-card={r.ingredient.name}>
                  <Card className={cn('flex h-full flex-col gap-1.5 rounded-xl p-3', r.status === 'NOT_IN_USE' && 'opacity-70')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold leading-tight text-slate-900">{r.ingredient.name}</p>
                        <p className="flex flex-wrap items-center gap-x-1 text-[11px] text-slate-500">
                          {r.ingredient.code} · {t(`inventory.categories.${r.ingredient.category}`)}
                          {r.locationName && (
                            <span className="flex items-center gap-0.5">
                              · <MapPin className="size-3" aria-hidden />
                              {r.locationName}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('text-lg font-black leading-tight tabular-nums', stockTone(r))}>{stockText(r.ingredient, r.onHandMilli)}</p>
                        <p className="text-[11px] text-slate-500">
                          {t('inventory.columns.min')} {stockText(r.ingredient, r.ingredient.minStockMilli)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      <Badge tone={STATUS_TONE[r.status]}>{t(`inventory.status.${r.status}`)}</Badge>
                      {expiry.tone && <Badge tone={expiry.tone}>{expiry.text}</Badge>}
                      <span className="text-xs font-semibold text-slate-600">{price(r)}</span>
                      <span className="ml-auto flex items-center">
                        <button type="button" onClick={() => onHistory(r)} className={iconButton} aria-label={t('inventory.ledger.history', { name: r.ingredient.name })} title={t('inventory.stockTabs.movements')}>
                          <History className="size-4" aria-hidden />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => onAdjust(r)}
                              disabled={r.status === 'NOT_IN_USE'}
                              className="press flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-700 hover:bg-brand-soft hover:text-brand disabled:opacity-40 pointer-coarse:min-h-10"
                            >
                              <SlidersHorizontal className="size-4" aria-hidden />
                              {t('inventory.actions.adjust')}
                            </button>
                            <button type="button" onClick={() => onEdit(r)} aria-label={t('inventory.edit', { name: r.ingredient.name })} title={t('inventory.actions.edit')} className={iconButton}>
                              <Pencil className="size-4" aria-hidden />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
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

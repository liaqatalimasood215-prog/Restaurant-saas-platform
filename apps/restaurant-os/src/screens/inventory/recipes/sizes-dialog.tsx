'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { MAX_SIZES, formatBps, parseQuantity, scaleShareBps, type Recipe, type ScaleUnit } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** One size in the Recipe Builder: a Menu size (variantId) or a new one that reaches the Menu after the owner confirms. */
export interface SizeRow {
  key: string;
  /** null = new, not in the Menu yet */
  variantId: string | null;
  name: string;
  /** How much the size is, typed in the base unit ("0.5" with a kg base) */
  quantity: string;
  active: boolean;
  /** Own quantities instead of the base × share */
  custom: boolean;
  /** Selling price as typed, in rupees */
  price: string;
  /** The Menu price (paisa); null for a new size */
  menuPrice: number | null;
  recipe: Recipe | null;
}

/**
 * Customize Sizes (owner's brief, R2): tick the sizes that get a recipe, set each size's quantity (its share of the base)
 * and selling price, add a size (½ kg, Pao, Half Pao, Small …) or remove one added just now, and send a custom size
 * back to Auto. Menu sizes are removed in the Menu, never here.
 */
export function SizesDialog({
  rows,
  baseUnit,
  baseMilli,
  canEditMenu,
  presets,
  onChange,
  newRow,
  onBackToAuto,
  onClose,
}: {
  rows: SizeRow[];
  baseUnit: ScaleUnit;
  baseMilli: number | null;
  canEditMenu: boolean;
  presets: string[];
  onChange: (rows: SizeRow[]) => void;
  newRow: (label: string) => SizeRow;
  onBackToAuto: (row: SizeRow) => void;
  onClose: () => void;
}) {
  const set = (key: string, patch: Partial<SizeRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const full = rows.length >= MAX_SIZES;
  const unit = t(`inventory.recipes.scale.units.${baseUnit}`);
  const input = 'min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm';
  const taken = (label: string) => rows.some((r) => r.name.trim().toLowerCase() === label.toLowerCase());

  return (
    <Dialog
      open
      size="xl"
      onClose={onClose}
      title={t('inventory.recipes.scale.customizeSizes')}
      footer={
        <button type="button" onClick={onClose} className="press bg-brand-gradient min-h-11 rounded-xl px-6 text-sm font-bold text-white shadow-brand">
          {t('inventory.recipes.scale.done')}
        </button>
      }
    >
      <p className="text-sm text-slate-600">{t('inventory.recipes.scale.dialogHint', { unit })}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm" data-sizes-dialog>
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-bold text-slate-600">
              <th className="w-12 rounded-l-lg px-2 py-2">{t('inventory.recipes.scale.active')}</th>
              <th className="px-2 py-2">{t('inventory.recipes.builder.sizeCol')}</th>
              <th className="px-2 py-2">{t('inventory.recipes.scale.quantityIn', { unit })}</th>
              <th className="px-2 py-2 text-right">{t('inventory.recipes.scale.scaling')}</th>
              <th className="px-2 py-2">{t('inventory.recipes.builder.priceCol')}</th>
              <th className="rounded-r-lg px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const q = parseQuantity(row.quantity, { allowZero: false });
              return (
                <tr key={row.key} data-size-setup={row.name}>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => set(row.key, { active: e.target.checked })}
                      aria-label={t('inventory.recipes.scale.activeOf', {
                        size: row.name,
                      })}
                      className="size-5 accent-brand"
                    />
                  </td>
                  <td className="px-2 py-2">
                    {row.variantId === null ? (
                      <input value={row.name} onChange={(e) => set(row.key, { name: e.target.value })} maxLength={40} aria-label={t('inventory.recipes.scale.sizeName')} className={input} />
                    ) : (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900">{row.name}</span>
                        <span className="text-xs text-slate-500">{t('inventory.recipes.scale.inMenu')}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-1.5">
                      <input
                        value={row.quantity}
                        onChange={(e) => set(row.key, { quantity: e.target.value })}
                        inputMode="decimal"
                        aria-label={t('inventory.recipes.scale.quantityOf', {
                          size: row.name,
                        })}
                        className={cn(input, 'w-24 tabular-nums', q === null && 'border-red-400')}
                      />
                      <span className="text-xs font-semibold text-slate-600">{unit}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-semibold tabular-nums text-slate-800">{q !== null && baseMilli ? formatBps(scaleShareBps(q, baseMilli)) : '—'}</td>
                  <td className="px-2 py-2">
                    {canEditMenu ? (
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-500">Rs.</span>
                        <input
                          value={row.price}
                          onChange={(e) => set(row.key, { price: e.target.value })}
                          inputMode="decimal"
                          aria-label={t('inventory.recipes.scale.priceOf', {
                            size: row.name,
                          })}
                          className={cn(input, 'w-28 tabular-nums')}
                        />
                      </span>
                    ) : (
                      <span className="text-slate-700">{row.price}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right">
                    {row.custom ? (
                      <button type="button" onClick={() => onBackToAuto(row)} className="press inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-amber-50 px-3 text-xs font-bold text-amber-900">
                        <RotateCcw className="size-4" aria-hidden />
                        {t('inventory.recipes.scale.backToAuto')}
                      </button>
                    ) : row.variantId === null ? (
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                        aria-label={t('inventory.recipes.scale.removeSize', {
                          size: row.name,
                        })}
                        className="press inline-grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : (
                      <Badge tone="grey">{t('inventory.recipes.scale.auto')}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canEditMenu && (
        <div className="mt-3 flex flex-wrap items-center gap-2" data-size-presets>
          <span className="text-sm font-bold text-slate-700">{t('inventory.recipes.scale.addSize')}</span>
          {[...presets, 'Small', 'Medium', 'Large']
            .filter((label, index, all) => all.indexOf(label) === index && !taken(label))
            .map((label) => (
              <button
                key={label}
                type="button"
                disabled={full}
                onClick={() => onChange([...rows, newRow(label)])}
                className="press flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 hover:border-brand/60 hover:text-brand disabled:opacity-50"
              >
                <Plus className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          <button
            type="button"
            disabled={full}
            onClick={() => onChange([...rows, newRow('')])}
            className="press flex min-h-10 items-center gap-1 rounded-lg border border-dashed border-slate-400 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden />
            {t('inventory.recipes.scale.otherSize')}
          </button>
        </div>
      )}
      <p className="mt-3 text-xs leading-snug text-slate-500">{full ? t('inventory.recipes.scale.maxSizes', { n: MAX_SIZES }) : t('inventory.recipes.scale.menuNote')}</p>
    </Dialog>
  );
}

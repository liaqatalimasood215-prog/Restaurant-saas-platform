'use client';

import { Plus, X } from 'lucide-react';
import { MILLI, PACKING_KINDS, checkPackings, paisaToInput, parseQuantity, parseRupees, type Packing, type PackingKind, type StockUnit } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { unitLabel } from './inventory-format';
import { newId } from '@/lib/new-id';

/**
 * "Also bought as" (owner's multiple-units brief, 2026-11-07): the product's own packings besides its main unit — a
 * carton of 12 bottles, a bag of 25 kg, a tray of 30 eggs — each with its size and usual price, and the loose price per
 * kg / litre / one. Used by Add / Edit Product (Suppliers) and the Stock ingredient form, so both keep one list.
 */
export interface PackingDraft {
  id: string;
  kind: PackingKind;
  size: string;
  price: string;
}

/** kg and litres for weight and volume (stock in grams / ml), the counted unit for the rest. */
function sizeUnit(stockUnit: StockUnit): { unit: 'kg' | 'l' | StockUnit; factor: number } {
  if (stockUnit === 'g') return { unit: 'kg', factor: 1000 };
  if (stockUnit === 'ml') return { unit: 'l', factor: 1000 };
  return { unit: stockUnit, factor: 1 };
}

export function packingDrafts(packings: readonly Packing[] | undefined, stockUnit: StockUnit): PackingDraft[] {
  const { factor } = sizeUnit(stockUnit);
  return (packings ?? []).map((p) => ({ id: p.id, kind: p.kind, size: String(parseFloat((p.sizeMilli / factor / MILLI).toFixed(3))), price: paisaToInput(p.pricePaisa) }));
}

/** The packings to save, or the first problem in words. */
export function packingsFromDrafts(drafts: readonly PackingDraft[], stockUnit: StockUnit): { packings: Packing[]; error: null } | { packings: null; error: string } {
  const { factor } = sizeUnit(stockUnit);
  const packings = drafts.map((d) => {
    const size = parseQuantity(d.size, { allowZero: false });
    return { id: d.id, kind: d.kind, sizeMilli: size === null ? null : size * factor, pricePaisa: parseRupees(d.price || '0') };
  });
  const problem = checkPackings(packings);
  if (problem) return { packings: null, error: t(`inventory.packings.errors.${problem.problem}`, { packing: problem.index === null ? '' : t(`inventory.unitOne.${drafts[problem.index]!.kind}`) }) };
  return { packings: packings as Packing[], error: null };
}

export function PackingsEditor({
  stockUnit,
  drafts,
  onChange,
  loosePrice,
  onLoosePrice,
  loosePlaceholder,
}: {
  stockUnit: StockUnit;
  drafts: PackingDraft[];
  onChange: (drafts: PackingDraft[]) => void;
  loosePrice: string;
  onLoosePrice: (value: string) => void;
  /** The loose price worked out from the main price, shown when none is typed */
  loosePlaceholder: string;
}) {
  const { unit } = sizeUnit(stockUnit);
  const kinds = PACKING_KINDS.filter((k) => k !== stockUnit);
  const set = (id: string, patch: Partial<PackingDraft>) => onChange(drafts.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const input = 'min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base tabular-nums';
  return (
    <div className="space-y-2" data-packings>
      <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="min-w-40">{t('inventory.packings.loose', { unit: unitLabel(unit, MILLI) })}</span>
        <span className="text-slate-500">Rs.</span>
        <input value={loosePrice} onChange={(e) => onLoosePrice(e.target.value)} inputMode="decimal" placeholder={loosePlaceholder} aria-label={t('inventory.packings.loose', { unit: unitLabel(unit, MILLI) })} className={`${input} max-w-36`} />
      </label>
      {drafts.length > 0 && (
        <ul className="space-y-2">
          {drafts.map((d) => (
            <li key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-slate-50 p-2 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)_auto]" data-packing={d.kind}>
              <select value={d.kind} onChange={(e) => set(d.id, { kind: e.target.value as PackingKind })} aria-label={t('inventory.packings.kind')} className="min-h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold">
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {unitLabel(k, MILLI)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onChange(drafts.filter((x) => x.id !== d.id))} aria-label={t('inventory.packings.remove', { packing: unitLabel(d.kind, MILLI) })} className="press grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 sm:order-last">
                <X className="size-4" aria-hidden />
              </button>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                {t('inventory.packings.holds')}
                <input value={d.size} onChange={(e) => set(d.id, { size: e.target.value })} inputMode="decimal" placeholder="12" aria-label={t('inventory.packings.sizeOf', { packing: unitLabel(d.kind, MILLI) })} className={input} />
                <span className="shrink-0 font-semibold">{unitLabel(unit, 2 * MILLI)}</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm text-slate-600">
                Rs.
                <input value={d.price} onChange={(e) => set(d.id, { price: e.target.value })} inputMode="decimal" placeholder="0" aria-label={t('inventory.packings.priceOf', { packing: unitLabel(d.kind, MILLI) })} className={input} />
                <span className="shrink-0">/ {unitLabel(d.kind, MILLI)}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {drafts.length < 6 && (
        <button type="button" onClick={() => onChange([...drafts, { id: `pk-${newId().slice(0, 8)}`, kind: kinds.includes('carton') ? 'carton' : kinds[0]!, size: '', price: '' }])} className="press flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-brand/50 px-3 text-sm font-bold text-brand hover:bg-brand-soft">
          <Plus className="size-4" aria-hidden />
          {t('inventory.packings.add')}
        </button>
      )}
    </div>
  );
}

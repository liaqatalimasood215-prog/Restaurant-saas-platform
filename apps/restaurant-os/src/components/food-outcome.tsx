'use client';

import { WASTE_REASONS, formatQuantity, type FoodOutcome, type FoodOutcomeKind } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import type { MadeFoodLine } from '@/lib/api';
import { cn } from '@/lib/cn';

const OTHER = 'OTHER';

/** "1 × Chicken Karahi (1 kg)" */
export function madeLineLabel(line: Pick<MadeFoodLine, 'quantity' | 'unit' | 'name' | 'variantName'>): string {
  return `${formatQuantity(line.quantity, line.unit)} ${line.name}${line.variantName ? ` (${line.variantName})` : ''}`;
}

/**
 * What happens to food that was already made when its order is cancelled or the line is voided (owner, 2026-11-09): never
 * wastage by itself. Not served and safe → kept for another order of the same dish (raw stock is not taken again); a pot dish or
 * a bottle → back to stock; served or unsafe → wastage with a reason.
 */
export function FoodOutcomeFields({ line, value, onChange }: { line: MadeFoodLine; value: FoodOutcome | undefined; onChange: (outcome: FoodOutcome) => void }) {
  const label = madeLineLabel(line);
  const reason = value?.reason ?? '';
  const preset = (WASTE_REASONS as readonly string[]).includes(reason) ? reason : reason ? OTHER : '';
  const choiceText = (kind: FoodOutcomeKind) => (kind === 'AVAILABLE' ? t('food.AVAILABLE', { h: line.safeHours ?? 0 }) : t(`food.${kind}`));
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3" data-food-line={label}>
      <legend className="px-1 text-sm font-extrabold text-slate-900">{label}</legend>
      {line.served && <p className="mb-2 text-xs font-semibold text-red-700">{t('food.servedNote')}</p>}
      <div className="space-y-1.5">
        {line.choices.map((kind) => (
          <label
            key={kind}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold',
              value?.kind === kind ? (kind === 'WASTE' ? 'border-red-400 bg-red-50 text-red-900' : 'border-green-500 bg-green-50 text-green-900') : 'border-slate-200 text-slate-800',
            )}
          >
            <input type="radio" name={`food-${line.itemId}`} checked={value?.kind === kind} onChange={() => onChange({ kind })} className="size-4 accent-brand" />
            {choiceText(kind)}
          </label>
        ))}
      </div>
      {value?.kind === 'AVAILABLE' && (
        <label className="mt-2 flex min-h-11 items-center gap-2 rounded-lg bg-amber-50 px-3 text-sm font-bold text-amber-900">
          <input type="checkbox" checked={value.safe === true} onChange={(e) => onChange({ kind: 'AVAILABLE', safe: e.target.checked })} className="size-4 accent-brand" />
          {t('food.safe')}
        </label>
      )}
      {value?.kind === 'WASTE' && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-bold text-slate-900">{t('food.reason')}</span>
            <select
              value={preset}
              onChange={(e) => onChange({ kind: 'WASTE', reason: e.target.value === OTHER ? ' ' : e.target.value })}
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2"
            >
              <option value="">{t('food.chooseReason')}</option>
              {WASTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
              <option value={OTHER}>{t('food.otherReason')}</option>
            </select>
          </label>
          {preset === OTHER && (
            <label className="block text-sm">
              <span className="mb-1 block font-bold text-slate-900">{t('food.otherReason')}</span>
              <input value={reason.trimStart()} maxLength={120} onChange={(e) => onChange({ kind: 'WASTE', reason: e.target.value || ' ' })} className="min-h-11 w-full rounded-xl border border-slate-300 px-3" />
            </label>
          )}
        </div>
      )}
    </fieldset>
  );
}

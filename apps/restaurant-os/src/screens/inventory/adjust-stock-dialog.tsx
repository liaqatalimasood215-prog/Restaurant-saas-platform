'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ADJUST_REASONS, MILLI, checkAdjustment, displayUnitOf, parseQuantity, type AdjustReason, type IngredientRow, type InventoryView } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { fromDisplayMilli, stockText, unitLabel } from './inventory-format';

/**
 * Correct the stock of one ingredient: Add or Remove, a quantity, a reason (and a note for "Other").
 * It becomes one ADJUSTMENT movement; the stock never goes below zero. Purchases, kitchen use and waste get
 * their own screens in later steps.
 */
export function AdjustStockDialog({ row, view, onClose }: { row: IngredientRow | null; view: InventoryView; onClose: () => void }) {
  const toast = useToast();
  const choices = view.ingredients.filter((r) => r.status !== 'NOT_IN_USE');
  const [ingredientId, setIngredientId] = useState(row?.ingredient.id ?? '');
  const [direction, setDirection] = useState<'ADD' | 'REMOVE'>('REMOVE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState<AdjustReason | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per dialog: a double tap on Save records the change once.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const current = view.ingredients.find((r) => r.ingredient.id === ingredientId) ?? null;
  const typed = parseQuantity(quantity, { allowZero: false });
  const quantityMilli = current && typed !== null ? fromDisplayMilli(current.ingredient, typed) : null;
  const after = current && quantityMilli !== null ? current.onHandMilli + (direction === 'ADD' ? quantityMilli : -quantityMilli) : null;
  const unit = current ? unitLabel(displayUnitOf(current.ingredient), 2 * MILLI) : '';

  const save = async () => {
    if (!current) return setError(t('inventory.adjust.errors.CHOOSE'));
    const problem = checkAdjustment({ direction, quantityMilli, reason, note, onHandMilli: current.onHandMilli });
    if (problem) return setError(t(`inventory.adjust.errors.${problem}`, { qty: stockText(current.ingredient, current.onHandMilli) }));
    setBusy(true);
    setError(null);
    try {
      await getApi().adjustStock({ ingredientId: current.ingredient.id, direction, quantityMilli: quantityMilli!, reason: reason!, note, idempotencyKey });
      toast.show({ tone: 'success', title: t('inventory.adjust.saved', { name: current.ingredient.name }) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const label = 'mb-1 block font-bold text-slate-900';
  return (
    <Dialog
      open
      onClose={onClose}
      title={current ? t('inventory.adjustFor', { name: current.ingredient.name }) : t('inventory.adjust.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t('inventory.adjust.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!row && (
          <label className="block">
            <span className={label}>{t('inventory.adjust.ingredient')}</span>
            <select
              value={ingredientId}
              onChange={(e) => (setIngredientId(e.target.value), setError(null))}
              aria-label={t('inventory.adjust.ingredient')}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
            >
              <option value="">{t('inventory.adjust.choose')}</option>
              {choices.map((r) => (
                <option key={r.ingredient.id} value={r.ingredient.id}>
                  {r.ingredient.name} ({stockText(r.ingredient, r.onHandMilli)})
                </option>
              ))}
            </select>
          </label>
        )}

        {current && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{t('inventory.adjust.onHand', { qty: stockText(current.ingredient, current.onHandMilli) })}</p>}

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('inventory.adjust.title')}>
          {(['ADD', 'REMOVE'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={direction === d}
              onClick={() => (setDirection(d), setError(null))}
              className={cn(
                'press flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold',
                direction === d
                  ? d === 'ADD'
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-brand bg-brand bg-brand-gradient text-white shadow-brand'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              {d === 'ADD' ? <Plus className="size-4" aria-hidden /> : <Minus className="size-4" aria-hidden />}
              {t(d === 'ADD' ? 'inventory.adjust.add' : 'inventory.adjust.remove')}
            </button>
          ))}
        </div>

        <label className="block">
          <span className={label}>{t('inventory.adjust.quantity')}</span>
          <span className="flex">
            <input
              value={quantity}
              onChange={(e) => (setQuantity(e.target.value), setError(null))}
              inputMode="decimal"
              placeholder="0"
              aria-label={t('inventory.adjust.quantity')}
              className="min-h-12 w-full rounded-l-xl border border-slate-300 bg-white px-3 text-base"
            />
            <span className="flex shrink-0 items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600" aria-hidden>
              {unit || '—'}
            </span>
          </span>
          {current && after !== null && (
            <span className={cn('mt-1 block text-sm font-bold', after < 0 ? 'text-red-700' : 'text-slate-700')} data-adjust-after>
              {t('inventory.adjust.after', { qty: after < 0 ? `−${stockText(current.ingredient, -after)}` : stockText(current.ingredient, after) })}
            </span>
          )}
        </label>

        <div>
          <span className={label}>{t('inventory.adjust.reason')}</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('inventory.adjust.reason')}>
            {ADJUST_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => (setReason(r), setError(null))}
                className={cn(
                  'press min-h-11 rounded-xl border px-2 text-sm font-semibold',
                  reason === r ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                {t(`inventory.reasons.${r}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className={label}>{t('inventory.adjust.note')}</span>
          <textarea
            value={note}
            onChange={(e) => (setNote(e.target.value), setError(null))}
            rows={2}
            maxLength={140}
            placeholder={t('inventory.adjust.notePlaceholder')}
            aria-label={t('inventory.adjust.note')}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base"
          />
        </label>

        <p className="text-xs text-slate-500">{t('inventory.adjust.hint')}</p>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { checkOutcome, type FoodOutcome } from '@restaurant-saas/shared';
import { FoodOutcomeFields, madeLineLabel } from '@/components/food-outcome';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';

/**
 * Cancel with a reason. Lines whose food was already made each get their outcome (I4, owner 2026-11-09): kept for another order
 * of the same dish, back to stock, or wastage with a reason, never wastage by itself. Lines still cooking: the kitchen decides.
 */
export function CancelOrderDialog({ orderId, onClose, onConfirm }: { orderId: string; onClose: () => void; onConfirm: (reason: string, food: Record<string, FoodOutcome>) => void }) {
  const lines = useApiQuery(() => getApi().getMadeFood(orderId), [orderId]);
  const [reason, setReason] = useState('');
  const [food, setFood] = useState<Record<string, FoodOutcome>>({});
  const [error, setError] = useState<string | null>(null);
  const made = (lines.data ?? []).filter((l) => l.made);
  const cooking = (lines.data ?? []).filter((l) => l.cooking);
  const confirm = () => {
    if (!reason.trim()) return setError(t('waiter.voidReasonRequired'));
    if (made.some((l) => checkOutcome(food[l.itemId], l.choices))) return setError(t('food.chooseError'));
    onConfirm(reason.trim(), food);
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('online.cancelTitle')}
      size={made.length ? 'lg' : 'md'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={!lines.data} onClick={confirm}>
            {t('online.cancel')}
          </Button>
        </>
      }
    >
      <p className="mb-3">{t('online.cancelBody')}</p>
      <label className="block">
        <span className="mb-1 block font-bold text-slate-900">{t('waiter.voidReason')}</span>
        <input
          value={reason}
          maxLength={140}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        />
      </label>
      {!lines.data ? (
        <LoadingState />
      ) : (
        <>
          {made.length > 0 && (
            <div className="mt-4 space-y-2" data-made-food>
              <p className="text-sm font-bold text-slate-900">{t('food.title')}</p>
              <p className="text-xs text-slate-600">{t('food.body')}</p>
              {made.map((line) => (
                <FoodOutcomeFields
                  key={line.itemId}
                  line={line}
                  value={food[line.itemId]}
                  onChange={(next) => {
                    setFood((all) => ({ ...all, [line.itemId]: next }));
                    setError(null);
                  }}
                />
              ))}
            </div>
          )}
          {cooking.length > 0 && (
            <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              {cooking.map((line) => (
                <li key={line.itemId}>{t('food.cooking', { name: madeLineLabel(line) })}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

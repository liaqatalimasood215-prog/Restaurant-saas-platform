'use client';

import { useState } from 'react';
import { BPS_PER_PERCENT, formatPaisa, rupeesToPaisa, type DiscountChoice, type DiscountInput } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/**
 * Discount (Owner/Manager only, MASTER_PROMPT.md §8): % or fixed amount, always with a reason.
 * Works for a running order and for a new bill before it is sent (the caller saves it).
 */
export function DiscountDialog({
  subtotal,
  current,
  onApply,
  onClose,
}: {
  subtotal: number;
  current: DiscountChoice | null;
  /** null removes the discount; throws with a message when it cannot be saved */
  onApply: (discount: DiscountInput | null, reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<'PERCENT' | 'FIXED'>(current?.input.kind ?? 'PERCENT');
  const [value, setValue] = useState(
    !current ? '' : current.input.kind === 'PERCENT' ? String(current.input.bps / BPS_PER_PERCENT) : String(current.input.amount / 100),
  );
  const [reason, setReason] = useState(current?.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async (discount: DiscountInput | null) => {
    setBusy(true);
    setError(null);
    try {
      await onApply(discount, reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const submit = () => {
    const n = Number(value);
    if (!value.trim() || !Number.isFinite(n) || n <= 0) return setError(t('pos.discountValue'));
    if (!reason.trim()) return setError(t('waiter.voidReasonRequired'));
    if (kind === 'PERCENT') {
      if (n > 100) return setError(t('pos.discountValue'));
      void apply({ kind: 'PERCENT', bps: Math.round(n * BPS_PER_PERCENT) });
    } else {
      void apply({ kind: 'FIXED', amount: rupeesToPaisa(n) });
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base';
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('pos.discountTitle')}
      footer={
        <>
          {current && (
            <Button variant="ghost" className="mr-auto text-red-700" disabled={busy} onClick={() => apply(null)}>
              {t('pos.removeDiscount')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {t('pos.applyDiscount')}
          </Button>
        </>
      }
    >
      <p className="mb-3">{t('pos.discountOn', { subtotal: formatPaisa(subtotal) })}</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(['PERCENT', 'FIXED'] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={cn('min-h-12 rounded-xl border-2 font-bold', kind === k ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200')}
          >
            {k === 'PERCENT' ? t('pos.percent') : t('pos.fixed')}
          </button>
        ))}
      </div>
      <label className="mb-3 block">
        <span className="mb-1 block font-bold text-slate-900">{kind === 'PERCENT' ? t('pos.percentValue') : t('pos.amount')}</span>
        <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold text-slate-900">{t('waiter.voidReason')}</span>
        <input value={reason} maxLength={140} onChange={(e) => setReason(e.target.value)} className={field} />
      </label>
      {error && (
        <p role="alert" className="mt-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

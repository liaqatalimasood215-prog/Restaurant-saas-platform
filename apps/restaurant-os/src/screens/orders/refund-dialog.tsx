'use client';

import { useState } from 'react';
import { activePayments, formatPaisa, refundableAmount, type Order, type PaymentEntry, type PaymentMethod } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { MethodPicker, toPaisa } from '../pos/payment-dialog';
import { newId } from '@/lib/new-id';

/**
 * Owner or Manager gives money back, full or part, with a reason (MASTER_PROMPT.md §8). A new entry only: the payment and the
 * order status stay. It asks once more, because money goes back. The app records it; it moves no money.
 */
export function RefundDialog({ order, onClose, onDone }: { order: Order; onClose: () => void; onDone: (order: Order, refund: PaymentEntry) => void }) {
  const refundable = refundableAmount(order.paidTotal, order.refundedTotal);
  const [amountText, setAmountText] = useState(String(refundable / 100));
  const [method, setMethod] = useState<PaymentMethod>(activePayments(order.payments)[0]?.method ?? 'CASH');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per dialog: double taps on the last button give the money back once.
  const [key] = useState(() => newId());
  const amount = toPaisa(amountText);

  const next = () => {
    if (amount === null || amount <= 0) return setError(t('orders.errorAmount'));
    if (amount > refundable) return setError(t('orders.errorMore'));
    if (!reason.trim()) return setError(t('orders.errorReason'));
    setError(null);
    setConfirming(true);
  };

  const submit = async () => {
    if (amount === null) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await getApi().refundPayment({ orderId: order.id, amount, method, reference: method === 'CASH' ? null : reference, reason, idempotencyKey: key });
      const refund = updated.payments.filter((p) => p.kind === 'REFUND').at(-1);
      if (refund) onDone(updated, refund);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setConfirming(false);
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 font-semibold';

  if (confirming && amount !== null) {
    return (
      <Dialog
        open
        onClose={onClose}
        title={t('orders.refundConfirmTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              {t('orders.back')}
            </Button>
            <Button size="lg" onClick={() => void submit()} disabled={busy}>
              {t('orders.refundYes')}
            </Button>
          </>
        }
      >
        <p className="text-lg font-bold text-slate-900" data-refund-confirm>
          {t('orders.refundConfirm', { amount: formatPaisa(amount), method: t(`pos.method${method}`), n: order.dailyNumber })}
        </p>
        <p className="mt-2 text-sm text-slate-700">{reason}</p>
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">{t('orders.recordOnlyNote')}</p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('orders.refundTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button size="lg" onClick={next}>
            {t('orders.refundNext')}
          </Button>
        </>
      }
    >
      <p className="mb-4 flex items-baseline justify-between rounded-xl bg-slate-50 p-3">
        <span className="font-bold text-slate-700">{t('orders.refundable')}</span>
        <span className="text-2xl font-black text-slate-900" data-refundable>{formatPaisa(refundable)}</span>
      </p>
      <label className="mb-4 block">
        <span className="mb-1 block font-bold text-slate-900">{t('orders.refundAmount')}</span>
        <span className="flex gap-2">
          <input inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} data-refund-amount className={`${field} text-lg tabular-nums`} />
          <Button variant="outline" onClick={() => setAmountText(String(refundable / 100))}>
            {t('orders.refundFull')}
          </Button>
        </span>
      </label>
      <p className="mb-1 font-bold text-slate-900">{t('orders.refundMethod')}</p>
      <MethodPicker value={method} onChange={setMethod} label={t('orders.refundMethod')} />
      {method !== 'CASH' && (
        <label className="mb-4 block">
          <span className="mb-1 block font-bold text-slate-900">{t('orders.reference')}</span>
          <input value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} className={field} />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block font-bold text-slate-900">{t('orders.reasonLabel')}</span>
        <input value={reason} maxLength={200} placeholder={t('orders.reasonPlaceholder')} onChange={(e) => setReason(e.target.value)} data-refund-reason className={field} />
      </label>
      <p className="mt-3 text-xs text-slate-500">{t('orders.tipNote')}</p>
      {error && (
        <p role="alert" className="mt-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

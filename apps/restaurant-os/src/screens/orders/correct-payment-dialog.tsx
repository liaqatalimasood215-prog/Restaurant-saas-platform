'use client';

import { useState } from 'react';
import { formatPaisa, type Order, type PaymentEntry, type PaymentMethod } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { MethodPicker } from '../pos/payment-dialog';
import { newId } from '@/lib/new-id';

/** A payment recorded with the wrong method: the same amount moves to the right one (owner, 2026-11-02). */
export function CorrectPaymentDialog({ order, payment, onClose, onDone }: { order: Order; payment: PaymentEntry; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per dialog: a double tap corrects once.
  const [key] = useState(() => newId());

  const submit = async () => {
    if (!method) return setError(t('orders.errorMethod'));
    if (!reason.trim()) return setError(t('orders.errorReason'));
    setBusy(true);
    setError(null);
    try {
      await getApi().correctPayment({ orderId: order.id, paymentId: payment.id, method, reference: method === 'CASH' ? null : reference, reason, idempotencyKey: key });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 font-semibold';

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('orders.correctTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button size="lg" onClick={() => void submit()} disabled={busy}>
            {t('orders.correctYes')}
          </Button>
        </>
      }
    >
      <p className="mb-4 rounded-xl bg-slate-50 p-3 font-bold text-slate-900" data-correct-wrong>
        {t('orders.correctWrong', { method: t(`pos.method${payment.method}`), amount: formatPaisa(payment.amount) })}
      </p>
      <p className="mb-1 font-bold text-slate-900">{t('orders.correctMethod')}</p>
      <MethodPicker value={method} onChange={setMethod} label={t('orders.correctMethod')} hide={payment.method} />
      {method && method !== 'CASH' && (
        <label className="mb-4 block">
          <span className="mb-1 block font-bold text-slate-900">{t('orders.reference')}</span>
          <input value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} className={field} />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block font-bold text-slate-900">{t('orders.reasonLabel')}</span>
        <input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} data-correct-reason className={field} />
      </label>
      <p className="mt-3 text-xs text-slate-500">{t('orders.correctNote')}</p>
      {error && (
        <p role="alert" className="mt-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

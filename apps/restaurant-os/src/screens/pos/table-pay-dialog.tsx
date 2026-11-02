'use client';

import { useState } from 'react';
import { formatPaisa, subOrderLabel, type Order, type PaymentMethod } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { subOrderItems } from '../waiter/sub-order';
import { MethodPicker, toPaisa } from './payment-dialog';

/** One bill for everyone at the table: each sub-order is paid in full and keeps its own invoice. */
export function TablePayDialog({
  tableId,
  tableName,
  orders,
  onClose,
  onDone,
}: {
  tableId: string;
  tableName: string;
  orders: Order[];
  onClose: () => void;
  onDone: () => void;
}) {
  const owing = orders.filter((o) => o.totals.total > o.paidTotal);
  const total = owing.reduce((sum, o) => sum + o.totals.total - o.paidTotal, 0);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashText, setCashText] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per dialog: double taps record one payment.
  const [key] = useState(() => crypto.randomUUID());

  const cash = cashText.trim() === '' ? total : toPaisa(cashText);
  const change = method === 'CASH' && cash !== null ? cash - total : null;
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 text-lg font-semibold tabular-nums';

  const submit = async () => {
    if (method === 'CASH' && (cash === null || cash < total)) return setError(t('pos.errorCash'));
    setError(null);
    setBusy(true);
    try {
      await getApi().recordTablePayment({
        tableId,
        method,
        cashReceived: method === 'CASH' ? cash : null,
        reference: method === 'CASH' ? null : reference,
        idempotencyKey: key,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('pos.wholeTableTitle', { table: tableName })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button size="lg" onClick={submit} disabled={busy}>
            {t('pos.recordPaymentConfirm')}
          </Button>
        </>
      }
    >
      <ul className="mb-3 divide-y divide-slate-100 text-sm">
        {owing.map((order) => (
          <li key={order.id} className="flex items-baseline justify-between gap-2 py-1.5">
            <span className="min-w-0">
              <span className="font-black">{subOrderLabel(tableName, order.subOrderNo ?? 1)}</span> {subOrderItems(order)}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatPaisa(order.totals.total - order.paidTotal)}</span>
          </li>
        ))}
      </ul>
      <p className="mb-4 flex items-baseline justify-between rounded-xl bg-slate-50 p-3">
        <span className="font-bold text-slate-700">{t('pos.due')}</span>
        <span className="text-2xl font-black text-slate-900">{formatPaisa(total)}</span>
      </p>
      <MethodPicker value={method} onChange={setMethod} label={t('pos.method')} />
      {method === 'CASH' ? (
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('pos.cashReceived')}</span>
          <input inputMode="decimal" value={cashText} placeholder={String(total / 100)} onChange={(e) => setCashText(e.target.value)} className={field} />
        </label>
      ) : (
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('pos.reference')}</span>
          <input value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} className={field} />
        </label>
      )}
      {method === 'CASH' && change !== null && change >= 0 && (
        <p className="mt-3 flex items-baseline justify-between rounded-xl bg-green-50 p-3 text-green-900">
          <span className="font-bold">{t('pos.change')}</span>
          <span className="text-xl font-black">{formatPaisa(change)}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

'use client';

import { useState } from 'react';
import { Banknote, CreditCard, Smartphone } from 'lucide-react';
import { formatPaisa, rupeesToPaisa, type Order, type PaymentMethod } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';

const METHODS: { method: PaymentMethod; icon: typeof Banknote }[] = [
  { method: 'CASH', icon: Banknote },
  { method: 'CARD', icon: CreditCard },
  { method: 'WALLET', icon: Smartphone },
];

/** Rupees typed by the cashier → paisa, or null when the text is not a valid amount. */
export function toPaisa(text: string): number | null {
  if (text.trim() === '') return 0;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? rupeesToPaisa(value) : null;
}

/** Cash, Card or Wallet. */
export function MethodPicker({ value, onChange, label, hide }: { value: PaymentMethod | null; onChange: (method: PaymentMethod) => void; label: string; hide?: PaymentMethod }) {
  const shown = METHODS.filter(({ method }) => method !== hide);
  return (
    <div className={cn('mb-4 grid gap-2', shown.length === 2 ? 'grid-cols-2' : 'grid-cols-3')} role="radiogroup" aria-label={label}>
      {shown.map(({ method: m, icon: Icon }) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center rounded-xl border-2 text-sm font-bold',
            value === m ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-700',
          )}
        >
          <Icon className="size-5" aria-hidden />
          {t(`pos.method${m}`)}
        </button>
      ))}
    </div>
  );
}

/**
 * Record one payment (MASTER_PROMPT.md §8): cash with change, card on an external machine, or a
 * wallet transfer — recorded, not processed online. Several payments split the bill.
 */
export function PaymentDialog({
  order,
  onClose,
  onDone,
  onPending,
}: {
  order: Order;
  onClose: () => void;
  onDone: (order: Order) => void;
  /** "Pay later": nothing is recorded, the bill stays open with the amount due */
  onPending?: () => void;
}) {
  const due = Math.max(0, order.totals.total - order.paidTotal);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [amountText, setAmountText] = useState(String(due / 100));
  const [tipText, setTipText] = useState('');
  const [cashText, setCashText] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per dialog: double taps on "Record payment" record one payment.
  const [key] = useState(() => crypto.randomUUID());

  const amount = toPaisa(amountText);
  const tip = toPaisa(tipText);
  const cash = cashText.trim() === '' ? (amount ?? 0) + (tip ?? 0) : toPaisa(cashText);
  const change = method === 'CASH' && amount !== null && tip !== null && cash !== null ? cash - amount - tip : null;

  const submit = async () => {
    if (amount === null || amount <= 0) return setError(t('pos.errorAmount'));
    if (amount > due) return setError(t('pos.errorMoreThanDue'));
    if (tip === null) return setError(t('pos.errorTip'));
    if (method === 'CASH' && (cash === null || change === null || change < 0)) return setError(t('pos.errorCash'));
    setError(null);
    setBusy(true);
    try {
      const updated = await getApi().recordPayment({
        orderId: order.id,
        method,
        amount,
        tipAmount: tip,
        cashReceived: method === 'CASH' ? cash : null,
        reference: method === 'CASH' ? null : reference,
        idempotencyKey: key,
      });
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full rounded-xl border border-slate-300 px-3 text-lg font-semibold tabular-nums';

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('pos.recordPayment')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          {onPending && (
            <Button variant="outline" onClick={onPending} disabled={busy}>
              {t('pos.payLater')}
            </Button>
          )}
          <Button size="lg" onClick={submit} disabled={busy}>
            {t('pos.recordPaymentConfirm')}
          </Button>
        </>
      }
    >
      <p className="mb-4 flex items-baseline justify-between rounded-xl bg-slate-50 p-3">
        <span className="font-bold text-slate-700">{t('pos.due')}</span>
        <span className="text-2xl font-black text-slate-900">{formatPaisa(due)}</span>
      </p>

      <MethodPicker value={method} onChange={setMethod} label={t('pos.method')} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('pos.amount')}</span>
          <input inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('pos.tip')}</span>
          <input inputMode="decimal" value={tipText} placeholder="0" onChange={(e) => setTipText(e.target.value)} className={field} />
        </label>
        {method === 'CASH' ? (
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-900">{t('pos.cashReceived')}</span>
            <input
              inputMode="decimal"
              value={cashText}
              placeholder={String(((amount ?? 0) + (tip ?? 0)) / 100)}
              onChange={(e) => setCashText(e.target.value)}
              className={field}
            />
          </label>
        ) : (
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-bold text-slate-900">{t('pos.reference')}</span>
            <input value={reference} maxLength={40} onChange={(e) => setReference(e.target.value)} className={field} />
          </label>
        )}
      </div>

      {method === 'CASH' && change !== null && change >= 0 && (
        <p className="mt-3 flex items-baseline justify-between rounded-xl bg-green-50 p-3 text-green-900">
          <span className="font-bold">{t('pos.change')}</span>
          <span className="text-xl font-black">{formatPaisa(change)}</span>
        </p>
      )}
      <p className="mt-3 text-xs text-slate-500">{t('pos.recordedNote')}</p>
      {error && (
        <p role="alert" className="mt-3 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

import { formatPaisa, formatQuantity, type Order } from '@restaurant-saas/shared';
import type { Session as ApiSession } from '@/lib/api';
import { t } from '@/i18n';

export type PrintKind = 'PRE_BILL' | 'RECEIPT' | 'DUPLICATE';

function dateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

/**
 * 80 mm bill (MASTER_PROMPT.md §8 Receipts). Pre-bills say "NOT A RECEIPT"; reprints say DUPLICATE.
 * Printed through the browser's print dialog; every print is marked DEMO in Phase 1.
 */
export function PrintableBill({
  order,
  kind,
  session,
  tableName,
  waiterName,
  cashierName,
}: {
  order: Order;
  kind: PrintKind;
  session: ApiSession;
  tableName: string;
  waiterName: string | null;
  cashierName: string;
}) {
  const { branch } = session;
  const totals = order.totals;
  const line = (label: string, amount: number, bold = false) => (
    <div className={bold ? 'flex justify-between text-base font-black' : 'flex justify-between'}>
      <span>{label}</span>
      <span className="whitespace-nowrap tabular-nums">{formatPaisa(Math.abs(amount))}{amount < 0 ? ' −' : ''}</span>
    </div>
  );

  return (
    <div className="mx-auto w-[72mm] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <p className="text-center text-sm font-black">{branch.receiptHeader}</p>
      <p className="text-center">{branch.address}</p>
      <p className="text-center">{branch.phone}</p>
      <p className="my-2 border-y border-dashed border-black py-1 text-center text-sm font-black">
        {kind === 'PRE_BILL' ? t('print.preBill') : kind === 'DUPLICATE' ? t('print.duplicate') : t('print.receipt')}
      </p>
      {kind !== 'PRE_BILL' && order.invoiceNumber !== null && <p>{t('print.invoice', { n: order.invoiceNumber })}</p>}
      <p>{t('print.order', { n: order.dailyNumber })}</p>
      <p>{dateTime(kind === 'PRE_BILL' ? new Date().toISOString() : order.history.at(-1)?.changedAt ?? order.createdAt)}</p>
      <p>
        {t('print.table', { table: tableName })}
        {order.guests ? ` · ${t('tables.guests', { n: order.guests })}` : ''}
      </p>
      {waiterName && <p>{t('print.waiter', { name: waiterName })}</p>}
      <p>{t('print.cashier', { name: cashierName })}</p>

      <div className="my-2 border-t border-dashed border-black pt-1">
        {order.items
          .filter((i) => !i.isVoid)
          .map((i) => (
            <div key={i.id} className="mb-1">
              <div className="flex justify-between gap-2">
                <span>
                  {formatQuantity(i.quantity, i.unit)} {i.name}
                  {i.variantName ? ` (${i.variantName})` : ''}
                </span>
                <span className="whitespace-nowrap tabular-nums">{formatPaisa(i.lineTotal)}</span>
              </div>
              {i.modifiers.length > 0 && <div className="pl-3">{i.modifiers.map((m) => `+ ${m.name}`).join(', ')}</div>}
            </div>
          ))}
      </div>

      <div className="border-t border-dashed border-black pt-1">
        {line(t('pos.subtotal'), totals.itemsSubtotal)}
        {totals.discount > 0 && line(t('pos.discount'), -totals.discount)}
        {totals.serviceCharge > 0 && line(t('pos.serviceCharge'), totals.serviceCharge)}
        {totals.tax > 0 && line(t('pos.tax'), totals.tax)}
        {totals.rounding !== 0 && line(t('pos.rounding'), totals.rounding)}
        {line(t('pos.total'), totals.total, true)}
      </div>

      {kind !== 'PRE_BILL' && order.payments.length > 0 && (
        <div className="mt-2 border-t border-dashed border-black pt-1">
          {order.payments
            .filter((p) => p.kind === 'PAYMENT')
            .map((p) => (
              <div key={p.id}>
                {line(t(`pos.method${p.method}`), p.amount)}
                {p.cashReceived !== null && line(t('print.cashReceived'), p.cashReceived)}
                {p.changeGiven !== null && line(t('pos.change'), p.changeGiven)}
                {p.tipAmount > 0 && line(t('pos.tip'), p.tipAmount)}
              </div>
            ))}
        </div>
      )}

      <p className="mt-3 text-center">{branch.receiptFooter}</p>
      <p className="mt-1 text-center font-black">{t('print.demo')}</p>
    </div>
  );
}

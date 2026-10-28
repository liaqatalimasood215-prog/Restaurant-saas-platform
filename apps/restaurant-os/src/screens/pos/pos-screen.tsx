'use client';

import { useState } from 'react';
import { BellRing, CheckCircle2, Printer, Receipt, Search, Wallet } from 'lucide-react';
import { formatPaisa, formatQuantity, type Order, type TableBoardEntry } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { useNotifications } from '@/components/shell/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { clockTime, minutesSince } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useNow } from '@/lib/hooks/use-now';
import { TABLE_TONES } from '@/lib/tones';
import { PaymentDialog } from './payment-dialog';
import { PrintDialog } from './print-dialog';
import type { PrintKind } from './printable-bill';

interface Selection {
  orderId: string;
  tableName: string;
  waiterName: string | null;
}

/** "1", "t1", "T1" → "T1" */
function normalizeTable(input: string): string {
  const value = input.trim().toUpperCase();
  return /^\d+$/.test(value) ? `T${value}` : value;
}

/**
 * POS / New Bill — dine-in table bills (owner workflow 2026-10-28): bill requests from waiters,
 * find a running bill by table number, pre-bill, payments, paid receipt. One order record: the
 * same order the waiter and the kitchen work on. Takeaway and delivery bills come next.
 */
export function PosScreen({ tableId }: { tableId?: string }) {
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const notifications = useNotifications();
  const toast = useToast();
  const now = useNow(30_000);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [search, setSearch] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [initialTable, setInitialTable] = useState(tableId);

  const header = <ScreenHeader title={t('nav.pos')} status="DEMO_PROTOTYPE" description={t('pos.description')} />;
  if (floor.loading && !floor.data) return (<>{header}<LoadingState /></>);
  if (!floor.data) return (<>{header}<ErrorState message={floor.error?.message} onRetry={floor.reload} /></>);

  const openTables = floor.data.tables.filter((e): e is TableBoardEntry & { order: Order } => e.order !== null);
  const select = (entry: TableBoardEntry & { order: Order }) =>
    setSelection({ orderId: entry.order.id, tableName: entry.table.name, waiterName: entry.waiterName });

  // Opened from a notification link (/pos?table=…): select that table once.
  if (initialTable) {
    const entry = openTables.find((e) => e.table.id === initialTable);
    setInitialTable(undefined);
    if (entry) select(entry);
  }

  const findTable = () => {
    const name = normalizeTable(search);
    const entry = floor.data?.tables.find((e) => e.table.name.toUpperCase() === name);
    if (!entry) return setSearchError(t('pos.tableNotFound', { table: name || '—' }));
    if (!entry.order) return setSearchError(t('pos.tableFree', { table: entry.table.name }));
    setSearchError(null);
    setSearch('');
    select(entry as TableBoardEntry & { order: Order });
  };

  const requests = notifications.filter((n) => n.kind === 'BILL_REQUESTED');
  const accept = async (orderId: string) => {
    try {
      await getApi().acceptBillRequest(orderId);
      toast.show({ tone: 'success', title: t('pos.accepted') });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  return (
    <>
      {header}
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-4">
          {requests.length > 0 && (
            <Card className="border-2 border-amber-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="size-5 text-amber-600" aria-hidden />
                  {t('pos.billRequests')}
                </CardTitle>
                <Badge tone="amber">{requests.length}</Badge>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2">
                  {requests.map((n) => (
                    <li key={n.id} className="rounded-xl bg-amber-50 p-3">
                      <p className="font-bold text-slate-900">{t('alerts.billRequested', { table: n.tableName })}</p>
                      <p className="text-xs text-slate-600">
                        {n.kind === 'BILL_REQUESTED' && formatPaisa(n.total)} · {n.kind === 'BILL_REQUESTED' && n.requestedByName} ·{' '}
                        {t('alerts.ago', { n: minutesSince(n.at, now) })}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            const entry = openTables.find((e) => e.table.id === n.tableId);
                            if (entry) select(entry);
                          }}
                        >
                          {t('pos.open')}
                        </Button>
                        <Button onClick={() => accept(n.orderId)}>{t('pos.accept')}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardBody>
              <label className="mb-1 block text-sm font-bold text-slate-900" htmlFor="pos-table">
                {t('pos.findTable')}
              </label>
              <div className="flex gap-2">
                <input
                  id="pos-table"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && findTable()}
                  placeholder={t('pos.findTablePlaceholder')}
                  inputMode="numeric"
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-lg font-bold"
                />
                <Button onClick={findTable} aria-label={t('pos.findTable')}>
                  <Search className="size-5" aria-hidden />
                </Button>
              </div>
              {searchError && (
                <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                  {searchError}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('pos.openBills')}</CardTitle>
              <Badge>{openTables.length}</Badge>
            </CardHeader>
            <CardBody>
              {openTables.length === 0 ? (
                <p className="text-sm text-slate-500">{t('pos.noOpenBills')}</p>
              ) : (
                <ul className="space-y-2">
                  {openTables.map((entry) => (
                    <li key={entry.table.id}>
                      <button
                        type="button"
                        onClick={() => select(entry)}
                        className={cn(
                          'flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left',
                          selection?.orderId === entry.order.id ? 'border-brand bg-brand-soft' : 'border-slate-200 hover:bg-slate-50',
                        )}
                      >
                        <span className="text-xl font-black">{entry.table.name}</span>
                        <Badge tone={TABLE_TONES[entry.status]}>{t(`tableStatus.${entry.status}`)}</Badge>
                        <span className="ml-auto font-extrabold tabular-nums">{formatPaisa(entry.order.totals.total)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <p className="text-xs text-slate-500">{t('pos.counterOrdersLater')}</p>
        </div>

        {selection ? (
          <BillPanel key={selection.orderId} selection={selection} onClose={() => setSelection(null)} />
        ) : (
          <EmptyState icon={<Receipt className="size-10 text-slate-400" aria-hidden />} title={t('pos.chooseTable')} />
        )}
      </div>
    </>
  );
}

function BillPanel({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const { data: order, error, loading, reload } = useApiQuery(() => getApi().getOrder(selection.orderId), [selection.orderId]);
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [print, setPrint] = useState<PrintKind | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading && !order) return <LoadingState />;
  if (!order) return <ErrorState message={error?.message} onRetry={reload} />;

  const due = Math.max(0, order.totals.total - order.paidTotal);
  const paid = order.status === 'PAID';
  const fail = (err: unknown) =>
    toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });

  const printPreBill = async () => {
    setBusy(true);
    try {
      await getApi().printPreBill(order.id);
      setPrint('PRE_BILL');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };
  const printReceipt = async () => {
    setBusy(true);
    try {
      const updated = await getApi().printReceipt(order.id);
      setPrint(updated.receiptPrints > 1 ? 'DUPLICATE' : 'RECEIPT');
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };
  const totalsRow = (label: string, amount: number, strong = false) => (
    <div className={cn('flex justify-between', strong && 'text-2xl font-black text-slate-900')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatPaisa(Math.abs(amount))}{amount < 0 ? ' −' : ''}</dd>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-2xl font-black">
            {selection.tableName} · {t('waiter.orderNumber', { n: order.dailyNumber })}
          </CardTitle>
          <p className="text-xs text-slate-500">
            {order.guests ? t('tables.guests', { n: order.guests }) : ''}
            {selection.waiterName ? ` · ${selection.waiterName}` : ''}
          </p>
        </div>
        <Badge tone={paid ? 'grey' : order.status === 'BILL_REQUESTED' ? 'amber' : 'red'}>
          {paid ? t('pos.paid') : order.status === 'BILL_REQUESTED' ? t('tableStatus.BILL_REQUESTED') : t('tableStatus.OCCUPIED')}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {order.billRequest && !paid && (
          <p
            className={cn(
              'rounded-xl p-3 text-sm font-semibold',
              order.billRequest.acceptedAt ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800',
            )}
          >
            {order.billRequest.acceptedAt
              ? t('pos.requestAccepted', { time: clockTime(order.billRequest.acceptedAt) })
              : t('pos.requestWaiting', { time: clockTime(order.billRequest.requestedAt) })}
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <li key={item.id} className={cn('flex justify-between gap-3 py-2', item.isVoid && 'text-slate-400 line-through')}>
              <span>
                <span className="font-semibold">
                  {formatQuantity(item.quantity, item.unit)} {item.name}
                </span>
                {item.variantName && ` (${item.variantName})`}
                {item.modifiers.length > 0 && (
                  <span className="block text-xs text-slate-500">{item.modifiers.map((m) => `+ ${m.name}`).join(', ')}</span>
                )}
                {item.isVoid && <span className="ml-2 text-xs font-bold text-red-700 no-underline">{t('waiter.voided')}</span>}
              </span>
              <span className="font-semibold tabular-nums">{formatPaisa(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-700">
          {totalsRow(t('pos.subtotal'), order.totals.itemsSubtotal)}
          {order.totals.discount > 0 && totalsRow(t('pos.discount'), -order.totals.discount)}
          {order.totals.serviceCharge > 0 && totalsRow(t('pos.serviceCharge'), order.totals.serviceCharge)}
          {order.totals.tax > 0 && totalsRow(t('pos.tax'), order.totals.tax)}
          {order.totals.rounding !== 0 && totalsRow(t('pos.rounding'), order.totals.rounding)}
          {totalsRow(t('pos.total'), order.totals.total, true)}
          {order.paidTotal > 0 && totalsRow(t('pos.paidSoFar'), order.paidTotal)}
          {order.tipTotal > 0 && totalsRow(t('pos.tip'), order.tipTotal)}
          {!paid && totalsRow(t('pos.due'), due)}
        </dl>

        {paid && (
          <p className="flex items-center gap-2 rounded-xl bg-green-50 p-3 font-bold text-green-800">
            <CheckCircle2 className="size-5" aria-hidden />
            {t('pos.paidInvoice', { n: order.invoiceNumber ?? 0 })}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {!paid && (
            <>
              <Button size="lg" variant="outline" disabled={busy} onClick={printPreBill}>
                <Printer className="size-5" aria-hidden />
                {t('pos.printBill')}
              </Button>
              <Button size="lg" disabled={busy || due === 0} onClick={() => setPaying(true)}>
                <Wallet className="size-5" aria-hidden />
                {t('pos.recordPayment')}
              </Button>
            </>
          )}
          {paid && (
            <>
              <Button size="lg" disabled={busy} onClick={printReceipt}>
                <Printer className="size-5" aria-hidden />
                {order.receiptPrints > 0 ? t('pos.reprintReceipt') : t('pos.printReceipt')}
              </Button>
              <Button size="lg" variant="secondary" onClick={onClose}>
                {t('pos.closeBill')}
              </Button>
            </>
          )}
        </div>
      </CardBody>

      {paying && (
        <PaymentDialog
          order={order}
          onClose={() => setPaying(false)}
          onDone={(updated) => {
            setPaying(false);
            toast.show(
              updated.status === 'PAID'
                ? { tone: 'success', title: t('pos.paidInvoice', { n: updated.invoiceNumber ?? 0 }) }
                : { tone: 'success', title: t('pos.paymentRecorded'), body: t('pos.stillDue', { due: formatPaisa(updated.totals.total - updated.paidTotal) }) },
            );
          }}
        />
      )}
      {print && (
        <PrintDialog
          order={order}
          kind={print}
          placeLabel={selection.tableName}
          waiterName={selection.waiterName}
          onClose={() => setPrint(null)}
        />
      )}
    </Card>
  );
}

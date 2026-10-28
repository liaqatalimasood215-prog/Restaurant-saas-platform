'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChefHat, Pause, Pencil, Percent, Printer, Send, Trash2, Wallet } from 'lucide-react';
import {
  ORDER_TYPES,
  calculateBill,
  can,
  formatPaisa,
  formatQuantity,
  type DraftItemInput,
  type MenuSnapshot,
  type Order,
  type TableBoardEntry,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type Session } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { ORDER_TONES, TICKET_TONES } from '@/lib/tones';
import { describeLine, type CartLine } from '../waiter/cart';
import { CustomerFields } from './customer-fields';
import { DiscountDialog } from './discount-dialog';
import type { Draft } from './draft';
import { PaymentDialog } from './payment-dialog';
import { PrintDialog } from './print-dialog';
import type { PrintKind } from './printable-bill';

const toDraftItem = (l: CartLine): DraftItemInput => ({
  menuItemId: l.menuItemId,
  variantId: l.variantId,
  modifierIds: l.modifierIds,
  note: l.note,
  quantity: l.quantity,
});

/**
 * The bill on the right of the POS: order type, table or customer, new items, the running order
 * (same record as Waiter, Kitchen, Tables and Orders), totals and every cashier action.
 */
export function CurrentBill({
  draft,
  setDraft,
  menu,
  tables,
  session,
  onEditLine,
  onNewBill,
}: {
  draft: Draft;
  setDraft: (update: (d: Draft) => Draft) => void;
  menu: MenuSnapshot;
  tables: TableBoardEntry[];
  session: Session;
  onEditLine: (line: CartLine) => void;
  onNewBill: () => void;
}) {
  const toast = useToast();
  const { data: order } = useApiQuery(
    () => (draft.orderId ? getApi().getOrder(draft.orderId) : Promise.resolve(null)),
    [draft.orderId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [discounting, setDiscounting] = useState(false);
  const [print, setPrint] = useState<PrintKind | null>(null);
  const role = session.user.role;
  const { branch } = session;

  const views = draft.cart.map((l) => describeLine(l, menu)).filter((v) => v !== null);
  const locked = draft.orderId !== null;
  const table = tables.find((e) => e.table.id === draft.tableId);
  const canAddItems = !order || order.type === 'DINE_IN' ? !order || ['OPEN', 'BILL_REQUESTED'].includes(order.status) : false;
  const estimate = calculateBill({
    orderType: draft.type,
    lines: views.map((v) => ({ unitPrice: v.unitPrice, quantity: v.line.quantity })),
    deliveryFee: branch.deliveryFee,
    settings: { tax: branch.tax, serviceChargeBps: branch.serviceChargeBps, roundToRupee: branch.roundToRupee },
  });
  const due = order ? Math.max(0, order.totals.total - order.paidTotal) : 0;
  const paymentState = !order ? null : due === 0 && order.paidTotal > 0 ? 'PAID' : order.paidTotal > 0 ? 'PARTLY' : 'PENDING';
  const payable = order && !['REJECTED', 'CANCELLED'].includes(order.status) && (order.type !== 'DINE_IN' || ['OPEN', 'BILL_REQUESTED'].includes(order.status));
  const placeLabel = order?.type === 'DINE_IN' ? (table?.table.name ?? '') : t(`orderType.${draft.type}`);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      const items = draft.cart.map(toDraftItem);
      let sent: Order;
      if (draft.type === 'DINE_IN') {
        if (!draft.tableId) throw new Error(t('pos.chooseTableFirst'));
        sent = await getApi().sendRound({
          tableId: draft.tableId,
          guests: order?.guests ?? draft.guests,
          items,
          idempotencyKey: draft.sendKey,
          customerName: draft.customer.name,
          customerPhone: draft.customer.phone,
        });
      } else {
        sent = await getApi().createCounterOrder({
          type: draft.type,
          channel: draft.type === 'DELIVERY' ? 'PHONE' : 'POS',
          customerName: draft.customer.name,
          customerPhone: draft.customer.phone,
          customerAddress: draft.customer.address,
          note: draft.note,
          items,
          idempotencyKey: draft.sendKey,
        });
      }
      if (draft.heldId) await getApi().deleteHeldBill(draft.heldId);
      setDraft((d) => ({ ...d, cart: [], orderId: sent.id, heldId: null, sendKey: crypto.randomUUID() }));
      toast.show({ tone: 'success', title: t('pos.sentToKitchen', { n: sent.dailyNumber }) });
    });

  const hold = () =>
    run(async () => {
      await getApi().holdBill({
        id: draft.heldId,
        type: draft.type,
        tableId: draft.tableId,
        guests: draft.guests,
        customerName: draft.customer.name,
        customerPhone: draft.customer.phone,
        customerAddress: draft.customer.address,
        note: draft.note,
        items: draft.cart.map(toDraftItem),
      });
      toast.show({ tone: 'success', title: t('pos.held') });
      onNewBill();
    });

  return (
    <Card className="self-start lg:sticky lg:top-20">
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black text-slate-900">
            {order ? `${placeLabel} · ${t('waiter.orderNumber', { n: order.dailyNumber })}` : draft.heldId ? t('pos.heldBill') : t('pos.newBill')}
          </h2>
          {order && <Badge tone={ORDER_TONES[order.status]}>{t(`orderStatus.${order.status}`)}</Badge>}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label={t('pos.orderType')}>
          {ORDER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={draft.type === type}
              disabled={locked}
              onClick={() => setDraft((d) => ({ ...d, type, tableId: type === 'DINE_IN' ? d.tableId : null }))}
              className={cn('min-h-11 rounded-lg text-sm font-bold disabled:cursor-not-allowed', draft.type === type ? 'bg-brand text-white shadow' : 'text-slate-600')}
            >
              {t(`orderType.${type}`)}
            </button>
          ))}
        </div>

        {draft.type === 'DINE_IN' && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-40 flex-1">
              <span className="mb-1 block text-sm font-bold text-slate-900">{t('pos.table')}</span>
              <select
                value={draft.tableId ?? ''}
                disabled={locked}
                onChange={(e) => {
                  const entry = tables.find((x) => x.table.id === e.target.value);
                  setDraft((d) => ({ ...d, tableId: e.target.value || null, orderId: entry?.order?.id ?? null }));
                }}
                className="min-h-12 w-full rounded-xl border border-slate-300 px-3 font-bold"
              >
                <option value="">{t('pos.chooseTableOption')}</option>
                {tables.map((e) => (
                  <option key={e.table.id} value={e.table.id}>
                    {e.table.name} — {e.order ? `${t(`tableStatus.${e.status}`)} · ${formatPaisa(e.order.totals.total)}` : t('tableStatus.FREE')}
                  </option>
                ))}
              </select>
            </label>
            {!order && (
              <div>
                <span className="mb-1 block text-sm font-bold text-slate-900">{t('waiter.guests')}</span>
                <QuantityStepper size="sm" value={draft.guests} onChange={(n) => setDraft((d) => ({ ...d, guests: n }))} label={t('waiter.guests')} />
              </div>
            )}
          </div>
        )}

        {!order ? (
          <CustomerFields
            value={draft.customer}
            onChange={(customer) => setDraft((d) => ({ ...d, customer }))}
            withAddress={draft.type === 'DELIVERY'}
            optional={draft.type === 'DINE_IN'}
          />
        ) : (
          order.customerName && (
            <p className="text-sm text-slate-700">
              <span className="font-bold">{order.customerName}</span>
              {order.customerPhone && ` · ${order.customerPhone}`}
              {order.customerAddress && ` · ${order.customerAddress}`}
            </p>
          )
        )}

        {order && (
          <section>
            <h3 className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ChefHat className="size-4" aria-hidden />
              {t('pos.sentItems')}
            </h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {order.items.map((item) => {
                const ticket = order.tickets.find((tk) => tk.id === item.ticketId);
                return (
                  <li key={item.id} className={cn('flex items-center justify-between gap-2 py-1.5', item.isVoid && 'text-slate-400 line-through')}>
                    <span className="min-w-0">
                      <span className="font-semibold">
                        {formatQuantity(item.quantity, item.unit)} {item.name}
                      </span>
                      {item.variantName && ` (${item.variantName})`}
                      {item.modifiers.map((m) => ` + ${m.name}`).join('')}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {ticket && !item.isVoid && <Badge tone={TICKET_TONES[ticket.status]}>{t(`ticketStatus.${ticket.status}`)}</Badge>}
                      <span className="tabular-nums">{formatPaisa(item.lineTotal)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {canAddItems && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{order ? t('pos.addItems') : t('pos.items')}</h3>
            {views.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">{t('pos.tapProducts')}</p>
            ) : (
              <ul className="space-y-2">
                {views.map((v) => (
                  <li key={v.line.key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm">
                    <button type="button" onClick={() => onEditLine(v.line)} className="min-w-0 flex-1 text-left" aria-label={t('pos.editItem', { name: v.name })}>
                      <span className="flex items-center gap-1 font-bold">
                        {v.name}
                        <Pencil className="size-3.5 text-slate-400" aria-hidden />
                      </span>
                      {v.details && <span className="block text-xs text-slate-600">{v.details}</span>}
                      {v.line.note && <span className="block text-xs text-amber-700">“{v.line.note}”</span>}
                      <span className="block text-xs font-semibold">
                        {formatQuantity(v.line.quantity, v.unit)} · {formatPaisa(v.unitPrice * v.line.quantity)}
                      </span>
                    </button>
                    <QuantityStepper
                      size="sm"
                      value={v.line.quantity}
                      onChange={(n) => setDraft((d) => ({ ...d, cart: d.cart.map((l) => (l.key === v.line.key ? { ...l, quantity: n } : l)) }))}
                      label={t('waiter.quantity')}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, cart: d.cart.filter((l) => l.key !== v.line.key) }))}
                      aria-label={t('waiter.remove', { name: v.name })}
                      className="flex size-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!order && draft.type !== 'DINE_IN' && (
              <input
                value={draft.note}
                maxLength={200}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder={t('online.orderNote')}
                aria-label={t('online.orderNote')}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            )}
          </section>
        )}
        {order && !canAddItems && order.type !== 'DINE_IN' && !['PICKED_UP', 'DELIVERED'].includes(order.status) && (
          <p className="text-xs text-slate-500">{t('pos.counterNoAdd')}</p>
        )}

        <dl className="space-y-1 border-t border-slate-200 pt-3 text-sm text-slate-700">
          {order ? (
            <>
              <Row label={t('pos.subtotal')} amount={order.totals.itemsSubtotal} />
              {order.totals.discount > 0 && <Row label={`${t('pos.discount')} (${order.discount?.reason ?? ''})`} amount={-order.totals.discount} />}
              {order.totals.serviceCharge > 0 && <Row label={t('pos.serviceCharge')} amount={order.totals.serviceCharge} />}
              {order.totals.tax > 0 && <Row label={t('pos.tax')} amount={order.totals.tax} />}
              {order.totals.deliveryFee > 0 && <Row label={t('pos.deliveryCharge')} amount={order.totals.deliveryFee} />}
              {order.totals.rounding !== 0 && <Row label={t('pos.rounding')} amount={order.totals.rounding} />}
              <Row label={t('pos.grandTotal')} amount={order.totals.total} strong />
              {order.paidTotal > 0 && <Row label={t('pos.paidSoFar')} amount={order.paidTotal} />}
              {due > 0 && <Row label={t('pos.due')} amount={due} />}
              {views.length > 0 && <Row label={t('pos.newItemsTotal')} amount={estimate.itemsSubtotal} />}
            </>
          ) : (
            <>
              <Row label={t('pos.subtotal')} amount={estimate.itemsSubtotal} />
              {estimate.serviceCharge > 0 && <Row label={t('pos.serviceCharge')} amount={estimate.serviceCharge} />}
              {estimate.tax > 0 && <Row label={t('pos.tax')} amount={estimate.tax} />}
              {views.length > 0 && estimate.deliveryFee > 0 && <Row label={t('pos.deliveryCharge')} amount={estimate.deliveryFee} />}
              <Row label={t('pos.grandTotal')} amount={views.length > 0 ? estimate.total : 0} strong />
              <p className="text-xs text-slate-500">{t('pos.discountAfterSend')}</p>
            </>
          )}
        </dl>
        {paymentState && (
          <Badge tone={paymentState === 'PAID' ? 'green' : paymentState === 'PARTLY' ? 'amber' : 'grey'} className="text-sm">
            {t(`pos.payment${paymentState}`)}
          </Badge>
        )}

        {error && (
          <p role="alert" className="font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {views.length > 0 && (
            <>
              <Button size="lg" disabled={busy} onClick={send} className="sm:col-span-2">
                <Send className="size-5" aria-hidden />
                {t('waiter.send')}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={hold}>
                <Pause className="size-5" aria-hidden />
                {t('pos.hold')}
              </Button>
            </>
          )}
          {order && payable && (
            <Button variant="outline" disabled={busy} onClick={() => run(async () => { await getApi().printPreBill(order.id); setPrint('PRE_BILL'); })}>
              <Printer className="size-5" aria-hidden />
              {t('pos.printBill')}
            </Button>
          )}
          {order && payable && due > 0 && can(role, 'order.discount') && (
            <Button variant="secondary" disabled={busy} onClick={() => setDiscounting(true)}>
              <Percent className="size-5" aria-hidden />
              {t('pos.discount')}
            </Button>
          )}
          {order && payable && due > 0 && can(role, 'payment.record') && (
            <Button size="lg" disabled={busy} onClick={() => setPaying(true)} className="sm:col-span-2">
              <Wallet className="size-5" aria-hidden />
              {t('pos.takePayment', { due: formatPaisa(due) })}
            </Button>
          )}
          {order && order.invoiceNumber !== null && (
            <Button variant="outline" disabled={busy} onClick={() => run(async () => { const o = await getApi().printReceipt(order.id); setPrint(o.receiptPrints > 1 ? 'DUPLICATE' : 'RECEIPT'); })}>
              <Printer className="size-5" aria-hidden />
              {order.receiptPrints > 0 ? t('pos.reprintReceipt') : t('pos.printReceipt')}
            </Button>
          )}
          {order?.type === 'TAKEAWAY' && order.status === 'READY' && (
            <Button size="lg" disabled={busy} onClick={() => run(() => getApi().markPickedUp(order.id))}>
              <CheckCircle2 className="size-5" aria-hidden />
              {t('pos.completeHandOver')}
            </Button>
          )}
          {order?.type === 'TAKEAWAY' && ['ACCEPTED', 'PREPARING'].includes(order.status) && (
            <p className="text-sm text-slate-600 sm:col-span-2">{t('pos.kitchenStillCooking')}</p>
          )}
          {order?.type === 'DELIVERY' && order.status === 'READY' && (
            <Link href="/online-orders" className="text-sm font-bold text-brand underline sm:col-span-2">
              {t('pos.assignRiderLink')}
            </Link>
          )}
          {order && (order.status === 'PAID' || order.status === 'PICKED_UP' || order.status === 'DELIVERED') && (
            <Button size="lg" variant="secondary" onClick={onNewBill} className="sm:col-span-2">
              <CheckCircle2 className="size-5" aria-hidden />
              {t('pos.completeNewBill')}
            </Button>
          )}
        </div>
      </CardBody>

      {paying && order && (
        <PaymentDialog
          order={order}
          onClose={() => setPaying(false)}
          onPending={() => {
            setPaying(false);
            toast.show({ tone: 'info', title: t('pos.pendingTitle'), body: t('pos.stillDue', { due: formatPaisa(due) }) });
          }}
          onDone={(updated) => {
            setPaying(false);
            toast.show(
              updated.invoiceNumber !== null
                ? { tone: 'success', title: t('pos.paidInvoiceShort', { n: updated.invoiceNumber }) }
                : { tone: 'success', title: t('pos.paymentRecorded'), body: t('pos.stillDue', { due: formatPaisa(updated.totals.total - updated.paidTotal) }) },
            );
          }}
        />
      )}
      {discounting && order && (
        <DiscountDialog
          order={order}
          onClose={() => setDiscounting(false)}
          onDone={() => {
            setDiscounting(false);
            toast.show({ tone: 'success', title: t('pos.discountApplied') });
          }}
        />
      )}
      {print && order && (
        <PrintDialog order={order} kind={print} placeLabel={placeLabel} waiterName={table?.waiterName ?? null} onClose={() => setPrint(null)} />
      )}
    </Card>
  );
}

function Row({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-2', strong && 'text-2xl font-black text-slate-900')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">
        {formatPaisa(Math.abs(amount))}
        {amount < 0 ? ' −' : ''}
      </dd>
    </div>
  );
}

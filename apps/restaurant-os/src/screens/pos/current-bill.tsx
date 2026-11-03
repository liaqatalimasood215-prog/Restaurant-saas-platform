'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import Link from 'next/link';
import {
  Armchair,
  BellRing,
  CheckCircle2,
  ChefHat,
  Info,
  Pause,
  Pencil,
  Percent,
  Printer,
  ReceiptText,
  ShoppingBag,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  calculateBill,
  formatPaisa,
  formatQuantity,
  orderPlaceName,
  subOrderLabel,
  type Area,
  type BillTotals,
  type DiscountInput,
  type DraftItemInput,
  type MenuSnapshot,
  type Order,
  type OrderType,
  type TableBoardEntry,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { useToast } from '@/components/ui/toast';
import { t, type MessageKey } from '@/i18n';
import { getApi, type Session } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { ORDER_TONES, TICKET_TONES } from '@/lib/tones';
import { describeLine, type CartLine } from '../waiter/cart';
import { SubOrderBar, subOrderItems } from '../waiter/sub-order';
import { CustomerFields } from './customer-fields';
import { DiscountDialog } from './discount-dialog';
import { newDraft, type Draft } from './draft';
import { PaymentDialog } from './payment-dialog';
import { PrintDialog } from './print-dialog';
import { TablePayDialog } from './table-pay-dialog';
import { ProductArt } from './product-art';
import type { PrintKind } from './printable-bill';

type Icon = typeof ChefHat;

/** The order type buttons; "Call Waiter" sits next to them (owner's reference design). */
const ORDER_OPTIONS: { type: OrderType; label: MessageKey; icon: Icon }[] = [
  { type: 'DINE_IN', label: 'pos.typeTable', icon: Armchair },
  { type: 'TAKEAWAY', label: 'orderType.TAKEAWAY', icon: ShoppingBag },
  { type: 'DELIVERY', label: 'orderType.DELIVERY', icon: Truck },
];
const FINISHED = ['PAID', 'PICKED_UP', 'DELIVERED'];

const toDraftItem = (l: CartLine): DraftItemInput => ({
  menuItemId: l.menuItemId,
  variantId: l.variantId,
  modifierIds: l.modifierIds,
  note: l.note,
  quantity: l.quantity,
});

/**
 * The order panel on the right of the POS (owner's reference design 2026-10-29): order type and Call
 * Waiter, table and customer, the items, totals, and two big actions — Send to Kitchen and Bill Now. A
 * sent bill is the SAME order record as Waiter, Kitchen, Tables and Orders. The Owner/Manager can give
 * a discount on a new bill too; it is saved together with the new order.
 * On tablet and desktop it fills the screen height: the upper part scrolls, totals and actions never
 * do. A product that was just added (or got one more) scrolls into view and flashes.
 */
export function CurrentBill({
  draft,
  setDraft,
  menu,
  tables,
  areas,
  session,
  onEditLine,
  onNewBill,
}: {
  draft: Draft;
  setDraft: (update: (d: Draft) => Draft) => void;
  menu: MenuSnapshot;
  tables: TableBoardEntry[];
  /** Active areas in display order: the table box shows each area's tables together */
  areas: Area[];
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
  /** The order the payment dialog is open for (fresh from Send, or the loaded order) */
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [discounting, setDiscounting] = useState(false);
  const [print, setPrint] = useState<PrintKind | null>(null);
  const [clearing, setClearing] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const [pickingTable, setPickingTable] = useState(false);
  /** The shared table whose sub-orders are listed to choose from */
  const [choosingOn, setChoosingOn] = useState<string | null>(null);
  const [payingTable, setPayingTable] = useState<string | null>(null);
  const previousCart = useRef(draft.cart);

  useEffect(() => {
    const before = new Map(previousCart.current.map((l) => [l.key, l.quantity]));
    previousCart.current = draft.cart;
    const changed = draft.cart.find((l) => l.quantity > (before.get(l.key) ?? 0));
    const row = changed && scrollArea.current?.querySelector<HTMLElement>(`[data-line="${changed.key}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    row.animate([{ backgroundColor: 'var(--color-brand-soft)' }, { backgroundColor: '#ffffff' }], { duration: 900, easing: 'ease-out' });
  }, [draft.cart]);

  const { branch } = session;
  const views = draft.cart.map((l) => describeLine(l, menu)).filter((v) => v !== null);
  const categoryOf = (menuItemId: string) => {
    const item = menu.items.find((i) => i.id === menuItemId);
    return menu.categories.find((c) => c.id === item?.categoryId)?.name ?? '';
  };
  const locked = draft.orderId !== null;
  const table = tables.find((e) => e.table.id === draft.tableId);
  const canAddItems = !order || (order.type === 'DINE_IN' && ['OPEN', 'BILL_REQUESTED'].includes(order.status));
  const estimateWith = (discount: DiscountInput | null): BillTotals =>
    calculateBill({
      orderType: draft.type,
      lines: views.map((v) => ({ unitPrice: v.unitPrice, quantity: v.line.quantity })),
      discount,
      // A running bill keeps the settings it was made with; a new bill uses today's Settings.
      deliveryFee: order?.pricing.deliveryFee ?? branch.deliveryFee,
      settings: order?.pricing ?? { tax: branch.tax, serviceChargeBps: branch.serviceChargeBps, roundToRupee: branch.roundToRupee },
    });
  // A fixed discount can become bigger than the items after a removal: show it, never crash.
  let discountTooBig = false;
  let estimate: BillTotals;
  try {
    estimate = estimateWith(order ? null : (draft.discount?.input ?? null));
  } catch {
    discountTooBig = true;
    estimate = estimateWith(null);
  }
  const due = order ? Math.max(0, order.totals.total - order.paidTotal) : 0;
  const paymentState = !order ? null : due === 0 && order.paidTotal > 0 ? 'PAID' : order.paidTotal > 0 ? 'PARTLY' : 'PENDING';
  const payable = order && !['REJECTED', 'CANCELLED'].includes(order.status) && (order.type !== 'DINE_IN' || ['OPEN', 'BILL_REQUESTED'].includes(order.status));
  const placeLabel = order?.type === 'DINE_IN' ? orderPlaceName(table?.table.name ?? '', order) : t(`orderType.${draft.type}`);
  const choosing = tables.find((e) => e.table.id === choosingOn);
  const paying = tables.find((e) => e.table.id === payingTable);
  const selected = order ? order.type : draft.type;
  const canPay = session.permissions.includes('payment.record');
  const canDiscount = session.permissions.includes('order.discount');
  const callTableId = order?.tableId ?? (draft.type === 'DINE_IN' ? draft.tableId : null);
  /** Pieces count one each; a kg item counts as one line */
  const countItems = (lines: { quantity: number; unit: string }[]) => lines.reduce((n, l) => n + (l.unit === 'piece' ? l.quantity : 1), 0);
  const itemCount = order
    ? countItems(order.items.filter((i) => !i.isVoid)) + countItems(views.map((v) => ({ quantity: v.line.quantity, unit: v.unit })))
    : countItems(views.map((v) => ({ quantity: v.line.quantity, unit: v.unit })));
  // After "Bill Now" on a new bill the panel restarts with the new order; open the payment once it loads.
  const paymentOrder = payOrder ?? (draft.payNow && order && payable && due > 0 ? order : null);
  const closePayment = () => {
    setPayOrder(null);
    if (draft.payNow) setDraft((d) => ({ ...d, payNow: false }));
  };

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

  /** Send the new items to the kitchen (a new order, or the next round of the running table bill). */
  const send = async (payNow: boolean): Promise<Order | null> => {
    // No table chosen = a counter sale (takeaway), never an error: a customer does not have to sit.
    const type = draft.type === 'DINE_IN' && !draft.tableId ? 'TAKEAWAY' : draft.type;
    let sent: Order | null = null;
    await run(async () => {
      if (discountTooBig) throw new Error(t('pos.discountValue'));
      const items = draft.cart.map(toDraftItem);
      let result: Order;
      if (type === 'DINE_IN') {
        result = await getApi().sendRound({
          tableId: draft.tableId as string,
          guests: order?.guests ?? draft.guests,
          orderId: order?.id ?? null,
          newSubOrder: draft.newSubOrder,
          items,
          idempotencyKey: draft.sendKey,
          customerName: draft.customer.name,
          customerPhone: draft.customer.phone,
          discount: order ? null : draft.discount,
        });
      } else {
        result = await getApi().createCounterOrder({
          type,
          channel: type === 'DELIVERY' ? 'PHONE' : 'POS',
          customerName: draft.customer.name,
          customerPhone: draft.customer.phone,
          customerAddress: draft.customer.address,
          note: draft.note,
          items,
          idempotencyKey: draft.sendKey,
          discount: draft.discount,
        });
      }
      if (draft.heldId) await getApi().deleteHeldBill(draft.heldId);
      sent = result;
      setDraft((d) => ({
        ...d,
        cart: [],
        orderId: result.id,
        heldId: null,
        newSubOrder: false,
        sendKey: crypto.randomUUID(),
        // The panel restarts when the order is new or a held bill is used up: open the payment after it.
        payNow: payNow && (result.id !== d.orderId || d.heldId !== null),
        discount: null,
      }));
      toast.show({ tone: 'success', title: t('pos.sentToKitchen', { n: result.dailyNumber }) });
    });
    return sent;
  };

  /** Bill Now: send what is new, then take the payment of the whole bill. */
  const billNow = async () => {
    if (views.length === 0) return setPayOrder(order ?? null);
    const before = draft.orderId;
    const sent = await send(true);
    if (sent && sent.id === before) setPayOrder(sent);
  };

  const holdCurrent = () =>
    getApi().holdBill({
      id: draft.heldId,
      type: draft.type,
      tableId: draft.tableId,
      guests: draft.guests,
      customerName: draft.customer.name,
      customerPhone: draft.customer.phone,
      customerAddress: draft.customer.address,
      note: draft.note,
      items: draft.cart.map(toDraftItem),
      discount: draft.discount,
    });

  const hold = () =>
    run(async () => {
      await holdCurrent();
      toast.show({ tone: 'success', title: t('pos.held') });
      onNewBill();
    });

  /**
   * Choose a table from the table box. Many tables can run at once: leaving a bill that is already
   * sent keeps it running (reopen it from the box or "Running bills"); new items that are not sent
   * yet are put on hold for that table first, so nothing is lost.
   */
  const pickTable = (entry: TableBoardEntry) => {
    // Several customers at this table: first ask whose order it is.
    if (entry.orders.length > 1) {
      setPickingTable(false);
      return setChoosingOn(entry.table.id);
    }
    if (draft.type === 'DINE_IN' && entry.table.id === draft.tableId) return setPickingTable(false);
    openSubOrder(entry, entry.order?.id ?? null, false);
  };

  const openSubOrder = (entry: TableBoardEntry, orderId: string | null, isNew: boolean) => {
    setError(null);
    setChoosingOn(null);
    if (!locked || entry.table.id === draft.tableId) {
      // A new bill just takes the table; a table with a running bill gets these items as its next round.
      setDraft((d) => ({ ...d, type: 'DINE_IN', tableId: entry.table.id, orderId, newSubOrder: isNew, discount: orderId ? null : d.discount }));
      return setPickingTable(false);
    }
    void run(async () => {
      if (views.length > 0) {
        await holdCurrent();
        toast.show({ tone: 'info', title: t('pos.held'), body: t('pos.heldForTable', { table: table?.table.name ?? '' }) });
      }
      setDraft(() => ({ ...newDraft('DINE_IN'), tableId: entry.table.id, orderId, newSubOrder: isNew }));
      setPickingTable(false);
    });
  };

  const callWaiter = (tableId: string | null) =>
    run(async () => {
      const called = await getApi().callWaiter(tableId);
      toast.show({
        tone: 'success',
        title: called.tableName ? t('pos.waiterCalled', { table: called.tableName }) : t('pos.waiterCalledCounter'),
        body: called.waiterNames.join(', '),
      });
    });

  /** Discount on the running order (server) or on the new bill (saved with it when sent). */
  const saveDiscount = async (discount: DiscountInput | null, reason: string) => {
    if (order) {
      await getApi().applyDiscount(order.id, discount, reason);
    } else {
      if (discount) estimateWith(discount); // throws when the discount is more than the items
      setDraft((d) => ({ ...d, discount: discount ? { input: discount, reason } : null }));
    }
    setDiscounting(false);
    toast.show({ tone: 'success', title: discount ? t('pos.discountApplied') : t('pos.discountRemoved') });
  };

  const finished = order && FINISHED.includes(order.status);
  const handOver = order?.type === 'TAKEAWAY' && order.status === 'READY';
  const sectionTitle = 'text-sm font-bold text-slate-900';
  const typeButton =
    'press flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-bold disabled:cursor-not-allowed short:min-h-11 short:flex-row short:gap-1.5';

  return (
    <div data-pos-bill className="flex flex-col gap-3 lg:min-h-0 short:gap-2">
      {/* Order type and Call Waiter */}
      <Card className="shrink-0 p-3 short:p-2.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 short:mb-1">
          <h2 className="text-base font-bold text-slate-900 short:text-sm">{t('pos.orderType')}</h2>
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-extrabold text-slate-900">
              {order
                ? `${placeLabel} · ${t('waiter.orderNumber', { n: order.dailyNumber })}`
                : draft.newSubOrder && table
                  ? `${subOrderLabel(table.table.name, table.nextSubOrderNo)} · ${t('pos.newSubOrderTitle')}`
                  : `${draft.type === 'DINE_IN' && table ? `${table.table.name} · ` : ''}${draft.heldId ? t('pos.heldBill') : t('pos.newBill')}`}
            </span>
            {order && <Badge tone={ORDER_TONES[order.status]}>{t(`orderStatus.${order.status}`)}</Badge>}
            {paymentState && (
              <Badge tone={paymentState === 'PAID' ? 'green' : paymentState === 'PARTLY' ? 'amber' : 'grey'}>{t(`pos.payment${paymentState}`)}</Badge>
            )}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="contents" role="radiogroup" aria-label={t('pos.orderType')}>
            {ORDER_OPTIONS.map((option) => {
              const active = selected === option.type;
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={locked && option.type !== 'DINE_IN'}
                  onClick={() => {
                    // "Table" always opens the box with every table (also on a sent bill: many tables run at once)
                    if (option.type === 'DINE_IN') {
                      // The bill becomes a Table bill only when a table is chosen (see pickTable).
                      return setPickingTable(true);
                    }
                    setDraft((d) => ({ ...d, type: option.type, tableId: null }));
                  }}
                  className={cn(
                    typeButton,
                    active ? 'border-brand bg-brand bg-brand-gradient text-white shadow-brand' : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand/40 hover:bg-brand-soft/50',
                    locked && !active && option.type !== 'DINE_IN' && 'opacity-50',
                  )}
                >
                  <OptionIcon className="size-6 shrink-0 short:size-4" aria-hidden />
                  {t(option.label)}
                  {option.type === 'DINE_IN' && table && <span className="text-sm font-black">{table.table.name}</span>}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={busy || !session.permissions.includes('bill.accept')}
            onClick={() => void callWaiter(callTableId)}
            className={cn(
              typeButton,
              'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 disabled:border-slate-200 disabled:bg-white disabled:text-slate-400',
            )}
          >
            <BellRing className="size-6 shrink-0 short:size-4" aria-hidden />
            {t('pos.callWaiter')}
          </button>
        </div>
      </Card>

      {/* Table, customer, items, totals, actions */}
      <Card className="flex flex-col lg:min-h-0 lg:flex-1">
        <div ref={scrollArea} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 short:space-y-2 short:p-2.5">
          {draft.type === 'DINE_IN' && table && table.orders.length > 0 && (
            <SubOrderBar
              tableName={table.table.name}
              orders={table.orders}
              selected={draft.newSubOrder ? 'NEW' : draft.orderId}
              onSelect={(choice) => openSubOrder(table, choice === 'NEW' ? null : choice, choice === 'NEW')}
            />
          )}
          {/* A new Table bill needs no customer: the table is chosen with the Table button. */}
          {!order && draft.type !== 'DINE_IN' && (
            <section className="space-y-2">
              {draft.type === 'DELIVERY' && <h3 className={sectionTitle}>{t('pos.customerAndDelivery')}</h3>}
              <CustomerFields
                value={draft.customer}
                onChange={(customer) => setDraft((d) => ({ ...d, customer }))}
                withAddress={draft.type === 'DELIVERY'}
                optional={draft.type === 'TAKEAWAY'}
              />
            </section>
          )}
          {order?.customerName && (
            <p className="text-sm text-slate-700">
              <span className="font-bold">{order.customerName}</span>
              {order.customerPhone && ` · ${order.customerPhone}`}
              {order.customerAddress && ` · ${order.customerAddress}`}
            </p>
          )}

          {order && (
            <section>
              <h3 className={cn(sectionTitle, 'mb-1 flex items-center gap-1')}>
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
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <h3 className={sectionTitle}>
                  {order ? t('pos.addItems') : t('pos.items')}
                  {views.length > 0 && <span className="text-slate-500"> ({views.length})</span>}
                </h3>
                {views.length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={hold}
                      className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <Pause className="size-4" aria-hidden />
                      {t('pos.hold')}
                    </button>
                    {!order && canDiscount && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setDiscounting(true)}
                        className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                      >
                        <Percent className="size-4" aria-hidden />
                        {t('pos.discount')}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setClearing(true)}
                      className="flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t('pos.clearAll')}
                    </button>
                  </span>
                )}
              </div>
              {views.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">{t('pos.tapProducts')}</p>
              ) : (
                <ul className="space-y-2 short:space-y-1.5">
                  {views.map((v) => (
                    <li key={v.line.key} data-line={v.line.key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 text-sm short:p-1">
                      <ProductArt name={v.name} categoryName={categoryOf(v.line.menuItemId)} className="size-12 shrink-0 rounded-lg short:size-10" emojiClassName="text-2xl short:text-xl" />
                      <div className="min-w-0 flex-1">
                        <span className="line-clamp-2 font-bold leading-tight text-slate-900">{v.name}</span>
                        {v.details && <span className="block truncate text-xs text-slate-600">{v.details}</span>}
                        {v.line.note && <span className="block truncate text-xs text-amber-700">“{v.line.note}”</span>}
                        <span className="block text-sm font-semibold leading-tight text-slate-600">{formatPaisa(v.unitPrice * v.line.quantity)}</span>
                      </div>
                      <QuantityStepper
                        size="sm"
                        value={v.line.quantity}
                        onChange={(n) => setDraft((d) => ({ ...d, cart: d.cart.map((l) => (l.key === v.line.key ? { ...l, quantity: n } : l)) }))}
                        label={t('waiter.quantity')}
                      />
                      <button
                        type="button"
                        onClick={() => onEditLine(v.line)}
                        aria-label={t('pos.editItem', { name: v.name })}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="size-5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, cart: d.cart.filter((l) => l.key !== v.line.key) }))}
                        aria-label={t('waiter.remove', { name: v.name })}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
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
                  className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              )}
            </section>
          )}
          {order && !canAddItems && order.type !== 'DINE_IN' && !['PICKED_UP', 'DELIVERED'].includes(order.status) && (
            <p className="text-xs text-slate-500">{t('pos.counterNoAdd')}</p>
          )}
        </div>

        <div className="shrink-0 space-y-2 border-t border-slate-200 p-3 short:space-y-1.5 short:p-2.5">
          <div className="rounded-xl bg-brand-soft/70 px-3 py-2 short:py-1.5">
            <dl className="space-y-0.5 text-sm text-slate-700">
              {order ? (
                <>
                  <Row label={itemCount === 1 ? t('pos.subtotalOneItem') : t('pos.subtotalItems', { n: itemCount })} amount={order.totals.itemsSubtotal} />
                  {order.totals.discount > 0 && <Row label={`${t('pos.discount')} (${order.discount?.reason ?? ''})`} amount={-order.totals.discount} />}
                  <Row label={t('pos.taxAndService')} amount={order.totals.tax + order.totals.serviceCharge} />
                  {order.totals.deliveryFee > 0 && <Row label={t('pos.deliveryCharge')} amount={order.totals.deliveryFee} />}
                  {order.totals.rounding !== 0 && <Row label={t('pos.rounding')} amount={order.totals.rounding} />}
                  {views.length > 0 && <Row label={t('pos.newItemsTotal')} amount={estimate.itemsSubtotal} />}
                  <Row label={t('pos.total')} amount={order.totals.total} strong />
                  {order.paidTotal > 0 && <Row label={t('pos.paidSoFar')} amount={order.paidTotal} />}
                  {order.paidTotal > 0 && due > 0 && <Row label={t('pos.due')} amount={due} />}
                </>
              ) : (
                <>
                  <Row label={itemCount === 1 ? t('pos.subtotalOneItem') : t('pos.subtotalItems', { n: itemCount })} amount={estimate.itemsSubtotal} />
                  {draft.discount && estimate.discount > 0 && <Row label={`${t('pos.discount')} (${draft.discount.reason})`} amount={-estimate.discount} />}
                  <Row label={t('pos.taxAndService')} amount={estimate.tax + estimate.serviceCharge} />
                  {views.length > 0 && estimate.deliveryFee > 0 && <Row label={t('pos.deliveryCharge')} amount={estimate.deliveryFee} />}
                  {views.length > 0 && estimate.rounding !== 0 && <Row label={t('pos.rounding')} amount={estimate.rounding} />}
                  <Row label={t('pos.total')} amount={views.length > 0 ? estimate.total : 0} strong />
                </>
              )}
            </dl>
          </div>
          {!order && !canDiscount && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-medium leading-snug text-amber-900">
              <Info className="mt-px size-3.5 shrink-0" aria-hidden />
              {t('pos.discountOwnerOnly')}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          {!order && discountTooBig && <p className="text-xs font-semibold text-red-700">{t('pos.discountValue')}</p>}
          {order && (
            <div className="flex flex-wrap gap-2">
              {payable && (
                <SmallAction icon={Printer} disabled={busy} onClick={() => run(async () => { await getApi().printPreBill(order.id); setPrint('PRE_BILL'); })}>
                  {t('pos.printBill')}
                </SmallAction>
              )}
              {payable && due > 0 && canDiscount && (
                <SmallAction icon={Percent} disabled={busy} onClick={() => setDiscounting(true)}>
                  {t('pos.discount')}
                </SmallAction>
              )}
              {order.invoiceNumber !== null && (
                <SmallAction
                  icon={Printer}
                  disabled={busy}
                  onClick={() => run(async () => { const o = await getApi().printReceipt(order.id); setPrint(o.receiptPrints > 1 ? 'DUPLICATE' : 'RECEIPT'); })}
                >
                  {order.receiptPrints > 0 ? t('pos.reprintReceipt') : t('pos.printReceipt')}
                </SmallAction>
              )}
              {handOver && due > 0 && (
                <SmallAction icon={CheckCircle2} disabled={busy} onClick={() => run(() => getApi().markPickedUp(order.id))}>
                  {t('pos.completeHandOver')}
                </SmallAction>
              )}
              {order.type === 'TAKEAWAY' && ['ACCEPTED', 'PREPARING'].includes(order.status) && (
                <p className="self-center text-xs text-slate-600">{t('pos.kitchenStillCooking')}</p>
              )}
              {order.type === 'DELIVERY' && order.status === 'READY' && (
                <Link href="/online-orders" className="self-center text-sm font-bold text-brand underline">
                  {t('pos.assignRiderLink')}
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy || views.length === 0}
              onClick={() => void send(false)}
              className="press flex min-h-13 items-center justify-center gap-2 rounded-xl border-2 border-brand bg-white px-2 text-base font-bold text-brand hover:bg-brand-soft disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white short:min-h-11"
            >
              <ChefHat className="size-5 shrink-0" aria-hidden />
              {t('pos.sendToKitchen')}
            </button>
            {finished ? (
              <BigAction icon={CheckCircle2} onClick={onNewBill}>
                {t('pos.completeNewBill')}
              </BigAction>
            ) : handOver && due === 0 ? (
              <BigAction icon={CheckCircle2} disabled={busy} onClick={() => run(() => getApi().markPickedUp(order.id))}>
                {t('pos.completeHandOver')}
              </BigAction>
            ) : (
              <BigAction
                icon={ReceiptText}
                disabled={busy || !canPay || (views.length === 0 && !(payable && due > 0))}
                onClick={() => void billNow()}
              >
                {t('pos.billNow')}
              </BigAction>
            )}
          </div>
        </div>
      </Card>

      {pickingTable && (
        <Dialog
          open
          onClose={() => setPickingTable(false)}
          title={t('pos.chooseTableTitle')}
          footer={
            <Button variant="secondary" onClick={() => setPickingTable(false)}>
              {t('nav.close')}
            </Button>
          }
        >
          <p className="mb-3 text-xs text-slate-600">{t('pos.chooseTableHint')}</p>
          <div className="space-y-3">
            {areas.map((area) => {
              const inArea = tables.filter((e) => e.table.areaId === area.id);
              if (inArea.length === 0) return null;
              return (
                <section key={area.id}>
                  {areas.length > 1 && <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{area.name}</h3>}
                  <div className="grid grid-cols-4 gap-2">
                    {inArea.map((entry) => {
                      const status = t(`tableStatus.${entry.status}`);
                      return (
                        <button
                          key={entry.table.id}
                          type="button"
                          aria-label={`${entry.table.name} — ${status}`}
                          // Out of service: no new bill can be opened on this table.
                          disabled={entry.status === 'OUT_OF_SERVICE'}
                          onClick={() => pickTable(entry)}
                          className={cn(
                            'flex min-h-16 flex-col items-center justify-center rounded-xl border-2 px-1 text-center',
                            entry.status === 'FREE' && 'border-green-300 bg-green-50 hover:bg-green-100',
                            entry.status === 'OCCUPIED' && 'border-red-200 bg-red-50 hover:bg-red-100',
                            entry.status === 'BILL_REQUESTED' && 'border-amber-300 bg-amber-50 hover:bg-amber-100',
                            entry.status === 'CLEANING' && 'border-blue-200 bg-blue-50 hover:bg-blue-100',
                            entry.status === 'OUT_OF_SERVICE' && 'cursor-not-allowed border-dashed border-slate-300 bg-slate-50 opacity-60',
                            entry.table.id === draft.tableId && 'ring-2 ring-brand ring-offset-1',
                          )}
                        >
                          <span className="text-lg font-black text-slate-900">{entry.table.name}</span>
                          <span className="text-[11px] font-semibold text-slate-600">{entry.order ? formatPaisa(entry.orders.reduce((sum, o) => sum + o.totals.total, 0)) : status}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </Dialog>
      )}

      {choosing && (
        <Dialog
          open
          onClose={() => setChoosingOn(null)}
          title={t('pos.subOrdersTitle', { table: choosing.table.name })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setChoosingOn(null)}>
                {t('nav.close')}
              </Button>
              <Button variant="outline" disabled={busy || !session.permissions.includes('bill.accept')} onClick={() => void callWaiter(choosing.table.id)}>
                <BellRing className="size-5" aria-hidden />
                {t('pos.callWaiter')}
              </Button>
            </>
          }
        >
          <p className="mb-3 text-sm text-slate-600">{t('pos.subOrdersHint')}</p>
          <ul className="space-y-2" data-sub-order-list>
            {choosing.orders.map((o) => {
              const label = orderPlaceName(choosing.table.name, o);
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    data-sub-order-row={label}
                    onClick={() => openSubOrder(choosing, o.id, false)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-left hover:border-brand"
                  >
                    <span className="shrink-0 text-lg font-black text-slate-900">{label}</span>
                    <span className="min-w-0 flex-1 font-semibold text-slate-700">{subOrderItems(o)}</span>
                    <span className="shrink-0 font-bold tabular-nums">{formatPaisa(o.totals.total - o.paidTotal)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={() => openSubOrder(choosing, null, true)}>
              {t('pos.newSubOrder')}
            </Button>
            {canPay && (
              <Button
                variant="outline"
                onClick={() => {
                  setPayingTable(choosing.table.id);
                  setChoosingOn(null);
                }}
              >
                {t('pos.wholeTable', { amount: formatPaisa(choosing.orders.reduce((sum, o) => sum + o.totals.total - o.paidTotal, 0)) })}
              </Button>
            )}
          </div>
        </Dialog>
      )}

      {paying && (
        <TablePayDialog
          tableId={paying.table.id}
          tableName={paying.table.name}
          orders={paying.orders}
          onClose={() => setPayingTable(null)}
          onDone={() => {
            setPayingTable(null);
            toast.show({ tone: 'success', title: t('pos.wholeTablePaid', { table: paying.table.name }) });
            onNewBill();
          }}
        />
      )}

      {clearing && (
        <Dialog
          open
          onClose={() => setClearing(false)}
          title={t('pos.clearBillTitle')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setClearing(false)}>
                {t('nav.close')}
              </Button>
              <Button
                onClick={() => {
                  // Only unsent items go; anything already sent stays on the shared order.
                  setDraft((d) => (d.orderId ? { ...d, cart: [] } : newDraft(d.type)));
                  setClearing(false);
                }}
              >
                {t('pos.clearBillConfirm')}
              </Button>
            </>
          }
        >
          {order ? t('pos.clearBillSentStays') : t('pos.clearBillBody')}
        </Dialog>
      )}

      {paymentOrder && (
        <PaymentDialog
          order={paymentOrder}
          onClose={closePayment}
          onPending={() => {
            closePayment();
            toast.show({ tone: 'info', title: t('pos.pendingTitle'), body: t('pos.stillDue', { due: formatPaisa(paymentOrder.totals.total - paymentOrder.paidTotal) }) });
          }}
          onDone={(updated) => {
            closePayment();
            toast.show(
              updated.invoiceNumber !== null
                ? { tone: 'success', title: t('pos.paidInvoiceShort', { n: updated.invoiceNumber }) }
                : { tone: 'success', title: t('pos.paymentRecorded'), body: t('pos.stillDue', { due: formatPaisa(updated.totals.total - updated.paidTotal) }) },
            );
          }}
        />
      )}
      {discounting && (
        <DiscountDialog
          subtotal={order ? order.totals.itemsSubtotal : estimate.itemsSubtotal}
          current={order ? order.discount : draft.discount}
          onApply={saveDiscount}
          onClose={() => setDiscounting(false)}
        />
      )}
      {print && order && (
        <PrintDialog order={order} kind={print} placeLabel={placeLabel} waiterName={table?.waiterName ?? null} onClose={() => setPrint(null)} />
      )}
    </div>
  );
}

function Row({ label, amount, strong = false }: { label: string; amount: number; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-2', strong && 'pt-0.5 text-2xl font-black text-brand short:text-xl')}>
      <dt className={cn(strong && 'text-slate-900')}>{label}</dt>
      <dd className="tabular-nums">
        {formatPaisa(Math.abs(amount))}
        {amount < 0 ? ' −' : ''}
      </dd>
    </div>
  );
}

function BigAction({ icon: ActionIcon, children, ...rest }: { icon: Icon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="press bg-brand-gradient flex min-h-13 items-center justify-center gap-2 rounded-xl bg-brand px-2 text-base font-bold text-white shadow-brand hover:brightness-105 disabled:cursor-not-allowed disabled:bg-brand/40 disabled:bg-none disabled:shadow-none short:min-h-11"
      {...rest}
    >
      <ActionIcon className="size-5 shrink-0" aria-hidden />
      <span className="leading-tight">{children}</span>
    </button>
  );
}

function SmallAction({ icon: ActionIcon, children, ...rest }: { icon: Icon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="press flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm hover:border-brand/40 hover:bg-brand-soft/50 disabled:opacity-50"
      {...rest}
    >
      <ActionIcon className="size-4 shrink-0" aria-hidden />
      {children}
    </button>
  );
}

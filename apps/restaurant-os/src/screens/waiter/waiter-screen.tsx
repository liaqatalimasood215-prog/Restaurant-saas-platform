'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Send, Trash2 } from 'lucide-react';
import {
  cardPrice,
  formatPaisa,
  formatQuantity,
  orderPlaceName,
  subOrderLabel,
  type DraftItemInput,
  type MenuItem,
  type MenuSnapshot,
  type OrderItem,
  type TableBoardEntry,
} from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { TABLE_TONES } from '@/lib/tones';
import { BillRequestControl } from './bill-request';
import { addToCart, describeLine, type CartLine } from './cart';
import { ItemDialog } from './item-dialog';
import { SentRounds } from './sent-rounds';
import { ServiceWaiterScreen } from './service-waiter-screen';
import { SubOrderBar } from './sub-order';

/**
 * Waiter screen, phone first (MASTER_PROMPT.md §5.1, §7.1 Waiter). The Super Waiter (and counter
 * staff) take orders here; the Service Waiter gets a serving-only screen (owner 2026-10-28).
 */
export function WaiterScreen({ tableId }: { tableId?: string }) {
  const { data: session } = useSession();
  if (session?.user.role === 'SERVICE_WAITER') return <ServiceWaiterScreen tableId={tableId} />;
  return tableId ? <TableOrder key={tableId} tableId={tableId} /> : <TablePicker />;
}

function TablePicker() {
  const { data, error, loading, reload } = useApiQuery(() => getApi().getFloorPlan(), []);
  return (
    <>
      <ScreenHeader title={t('nav.waiter')} status="DEMO_PROTOTYPE" description={t('waiter.description')} />
      <h2 className="mb-3 text-lg font-bold text-slate-900">{t('waiter.chooseTable')}</h2>
      {loading && !data ? (
        <LoadingState />
      ) : !data ? (
        <ErrorState message={error?.message} onRetry={reload} />
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {data.tables.map((entry) => {
            const content = (
              <>
                <span className="text-lg font-black">{entry.table.name}</span>
                <Badge tone={TABLE_TONES[entry.status]}>{t(`tableStatus.${entry.status}`)}</Badge>
              </>
            );
            const box = 'flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 bg-white';
            return (
              <li key={entry.table.id}>
                {/* Out of service: shown, but no bill can be opened there */}
                {entry.status === 'OUT_OF_SERVICE' ? (
                  <div className={cn(box, 'border-dashed border-slate-300 opacity-60')}>{content}</div>
                ) : (
                  <Link href={`/waiter?table=${entry.table.id}`} className={cn(box, 'border-slate-200')}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function TableOrder({ tableId }: { tableId: string }) {
  const floor = useApiQuery(() => getApi().getFloorPlan(), []);
  const menu = useApiQuery(() => getApi().getMenu(), []);

  const header = (
    <ScreenHeader
      title={t('nav.waiter')}
      status="DEMO_PROTOTYPE"
      description={t('waiter.description')}
      actions={
        <Link
          href="/tables"
          className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t('waiter.backToTables')}
        </Link>
      }
    />
  );

  if ((floor.loading && !floor.data) || (menu.loading && !menu.data)) return (<>{header}<LoadingState /></>);
  const failed = floor.error ?? menu.error;
  if (!floor.data || !menu.data) {
    return (
      <>
        {header}
        <ErrorState message={failed?.message} onRetry={() => (floor.reload(), menu.reload())} />
      </>
    );
  }
  const entry = floor.data.tables.find((e) => e.table.id === tableId);
  if (!entry) return (<>{header}<EmptyState title={t('notFound.title')} /></>);

  return (
    <>
      {header}
      {failed && <ErrorState message={failed.message} onRetry={() => (floor.reload(), menu.reload())} />}
      <OrderWorkspace
        entry={entry}
        areaName={floor.data.areas.find((a) => a.id === entry.table.areaId)?.name ?? ''}
        menu={menu.data}
      />
    </>
  );
}

function OrderWorkspace({
  entry,
  areaName,
  menu,
}: {
  entry: TableBoardEntry;
  areaName: string;
  menu: MenuSnapshot;
}) {
  const { allowed } = useSession();
  const toast = useToast();
  const [selected, setSelected] = useState<string | 'NEW' | null>(null);
  const isNew = selected === 'NEW';
  // If the chosen customer has paid and left, the first one still seated is shown.
  const order = isNew ? null : (entry.orders.find((o) => o.id === selected) ?? entry.order);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [guests, setGuests] = useState<number | null>(null);
  const [guestError, setGuestError] = useState(false);
  const [category, setCategory] = useState('ALL');
  const [query, setQuery] = useState('');
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null);
  const [view, setView] = useState<'menu' | 'order'>('menu');
  const [busy, setBusy] = useState(false);
  // One key per round: a double tap or a retry after a lost answer never sends the round twice.
  const [roundKey, setRoundKey] = useState(() => crypto.randomUUID());
  const [voidTarget, setVoidTarget] = useState<OrderItem | null>(null);

  const guestsValue = guests ?? order?.guests ?? (isNew ? 1 : 0);
  const cartViews = cart.map((l) => describeLine(l, menu)).filter((v) => v !== null);
  const cartTotal = cartViews.reduce((sum, v) => sum + v.unitPrice * v.line.quantity, 0);
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  const q = query.trim().toLowerCase();
  const items = menu.items.filter(
    (i) => (category === 'ALL' || i.categoryId === category) && (!q || i.name.toLowerCase().includes(q)),
  );

  const fail = (err: unknown) =>
    toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });

  const send = async () => {
    if (guestsValue < 1) {
      setGuestError(true);
      setView('order');
      return;
    }
    setBusy(true);
    try {
      const updated = await getApi().sendRound({
        tableId: entry.table.id,
        guests: guestsValue,
        orderId: order?.id ?? null,
        newSubOrder: isNew,
        items: cart.map((line) => ({
          menuItemId: line.menuItemId,
          variantId: line.variantId,
          modifierIds: line.modifierIds,
          note: line.note,
          quantity: line.quantity,
        })),
        idempotencyKey: roundKey,
      });
      const roundNo = Math.max(...updated.tickets.map((tk) => tk.roundNo));
      setCart([]);
      setGuests(null);
      setSelected(updated.id);
      setRoundKey(crypto.randomUUID());
      toast.show({ tone: 'success', title: t('waiter.sent', { n: roundNo }) });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const run = async (action: () => Promise<unknown>, success?: { title: string; body?: string }) => {
    setBusy(true);
    try {
      await action();
      if (success) toast.show({ tone: 'info', ...success });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const addDraft = (draft: DraftItemInput) => {
    setCart((c) => addToCart(c, draft));
    setDialogItem(null);
  };

  return (
    <>
      {entry.orders.length > 0 && (
        <SubOrderBar
          tableName={entry.table.name}
          orders={entry.orders}
          selected={isNew ? 'NEW' : (order?.id ?? null)}
          onSelect={(choice) => {
            setSelected(choice);
            setGuests(null);
          }}
        />
      )}
      <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden" role="tablist">
        {(['menu', 'order'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cn(
              'min-h-12 rounded-xl text-sm font-bold',
              view === v ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700',
            )}
          >
            {v === 'menu' ? t('waiter.menu') : `${t('waiter.order')} (${cartCount})`}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        {/* Menu */}
        <section className={cn('min-w-0', view !== 'menu' && 'hidden lg:block')} aria-label={t('waiter.menu')}>
          <label className="mb-3 flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search className="size-5 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('waiter.search')}
              aria-label={t('waiter.search')}
              className="w-full bg-transparent text-base"
            />
          </label>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {[{ id: 'ALL', name: t('waiter.allCategories') }, ...menu.categories].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={cn(
                  'min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold',
                  category === c.id ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-700',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          {items.length === 0 ? (
            <EmptyState title={t('waiter.noResults', { q: query })} />
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const shown = cardPrice(item);
                const from = shown.price;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={!item.isAvailable}
                      onClick={() => setDialogItem(item)}
                      className="flex h-full min-h-24 w-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:border-brand disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="font-bold text-slate-900">{item.name}</span>
                      <span className="flex items-center justify-between gap-1 text-sm font-semibold text-slate-700">
                        {item.isAvailable ? (
                          shown.sizeName
                            ? t('waiter.sizePrice', { price: formatPaisa(from), size: shown.sizeName.replaceAll(' ', '\u00a0') })
                            : item.unit === 'piece'
                              ? formatPaisa(from)
                              : t('waiter.perUnit', { price: formatPaisa(from), unit: item.unit })
                        ) : (
                          <Badge tone="red">{t('waiter.outOfStock')}</Badge>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {cartCount > 0 && (
            <Button className="sticky bottom-24 mt-4 w-full shadow-lg lg:hidden" size="lg" onClick={() => setView('order')}>
              {t('waiter.order')} ({cartCount}) · {formatPaisa(cartTotal)}
            </Button>
          )}
        </section>

        {/* Order */}
        <section className={cn(view !== 'order' && 'hidden lg:block')} aria-label={t('waiter.order')}>
          <Card>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-2xl font-black text-slate-900">
                    {isNew ? subOrderLabel(entry.table.name, entry.nextSubOrderNo) : order ? orderPlaceName(entry.table.name, order) : entry.table.name}{' '}
                    <span className="text-base font-semibold text-slate-500">· {areaName}</span>
                  </p>
                  {order && <p className="text-xs text-slate-500">{t('waiter.orderNumber', { n: order.dailyNumber })}</p>}
                </div>
                <Badge tone={TABLE_TONES[entry.status]}>{t(`tableStatus.${entry.status}`)}</Badge>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2 pl-3">
                <span className="text-sm font-bold text-slate-800">{t('waiter.guests')}</span>
                <QuantityStepper
                  value={guestsValue}
                  min={0}
                  onChange={(n) => {
                    setGuests(n);
                    setGuestError(false);
                  }}
                  label={t('waiter.guests')}
                  size="sm"
                />
              </div>
              {guestError && (
                <p role="alert" className="text-sm font-semibold text-red-700">
                  {t('waiter.guestsRequired')}
                </p>
              )}

              {order ? (
                <SentRounds
                  order={order}
                  stations={menu.stations}
                  canServe={allowed('ticket.serve')}
                  canVoid={allowed('item.void')}
                  busy={busy}
                  onServe={(ticketId) => run(() => getApi().updateTicket(ticketId, 'SERVED'))}
                  onVoid={setVoidTarget}
                />
              ) : (
                <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">
                  {isNew ? t('waiter.newSubOrderHint', { label: subOrderLabel(entry.table.name, entry.nextSubOrderNo) }) : t('waiter.freeTable')}
                </p>
              )}

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{t('waiter.newRound')}</h3>
                {cartViews.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                    {t('waiter.emptyCart')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cartViews.map((v) => (
                      <li key={v.line.key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2">
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="font-bold text-slate-900">{v.name}</p>
                          {v.details && <p className="text-xs text-slate-600">{v.details}</p>}
                          {v.line.note && <p className="text-xs text-amber-700">“{v.line.note}”</p>}
                          <p className="text-xs font-semibold text-slate-700">
                            {formatQuantity(v.line.quantity, v.unit)} · {formatPaisa(v.unitPrice * v.line.quantity)}
                          </p>
                        </div>
                        <QuantityStepper
                          size="sm"
                          value={v.line.quantity}
                          onChange={(n) => setCart((c) => c.map((l) => (l.key === v.line.key ? { ...l, quantity: n } : l)))}
                          label={t('waiter.quantity')}
                        />
                        <button
                          type="button"
                          onClick={() => setCart((c) => c.filter((l) => l.key !== v.line.key))}
                          aria-label={t('waiter.remove', { name: v.name })}
                          className="flex size-10 items-center justify-center rounded-xl text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="size-5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">{t('waiter.notSent')}</dt>
                  <dd className="font-semibold tabular-nums">{formatPaisa(cartTotal)}</dd>
                </div>
                <div className="flex justify-between text-lg">
                  <dt className="font-bold text-slate-900">{t('waiter.runningBill')}</dt>
                  <dd className="font-black tabular-nums text-slate-900">{formatPaisa(order?.totals.total ?? 0)}</dd>
                </div>
              </dl>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Button size="lg" disabled={cart.length === 0 || busy} onClick={send}>
                  <Send className="size-5" aria-hidden />
                  {busy ? t('waiter.sending') : t('waiter.send')}
                </Button>
                <BillRequestControl
                  order={order}
                  busy={busy}
                  disabled={cart.length > 0}
                  onRequest={(orderId) =>
                    run(() => getApi().requestBill(orderId), {
                      title: t('waiter.billRequested'),
                      body: t('waiter.billRequestedBody'),
                    })
                  }
                />
                {order?.status === 'BILL_REQUESTED' && cart.length > 0 && (
                  <p className="text-xs text-amber-800 sm:col-span-2 lg:col-span-1 xl:col-span-2">{t('waiter.reopensBill')}</p>
                )}
              </div>
            </CardBody>
          </Card>
        </section>
      </div>


      {dialogItem && <ItemDialog item={dialogItem} menu={menu} onClose={() => setDialogItem(null)} onAdd={addDraft} />}
      {voidTarget && (
        <VoidDialog
          item={voidTarget}
          onClose={() => setVoidTarget(null)}
          onConfirm={(reason) => {
            const target = voidTarget;
            setVoidTarget(null);
            void run(() => getApi().voidItem(target.id, reason));
          }}
        />
      )}
    </>
  );
}

function VoidDialog({
  item,
  onClose,
  onConfirm,
}: {
  item: OrderItem;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('waiter.voidTitle', { name: `${formatQuantity(item.quantity, item.unit)} ${item.name}` })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button
            onClick={() => (reason.trim() ? onConfirm(reason.trim()) : setError(true))}
            className="bg-red-600 hover:bg-red-700"
          >
            {t('waiter.voidConfirm')}
          </Button>
        </>
      }
    >
      <p className="mb-3">{t('waiter.voidBody')}</p>
      <label className="block">
        <span className="mb-1 block font-bold text-slate-900">{t('waiter.voidReason')}</span>
        <input
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(false);
          }}
          maxLength={140}
          className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-red-700">
          {t('waiter.voidReasonRequired')}
        </p>
      )}
    </Dialog>
  );
}

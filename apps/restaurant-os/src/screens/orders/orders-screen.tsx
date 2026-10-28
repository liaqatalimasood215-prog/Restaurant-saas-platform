'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  STATUSES_BY_TYPE,
  formatPaisa,
  formatQuantity,
  type OrderStatus,
  type OrderType,
  type OrderView,
} from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { clockTime } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { ORDER_TONES, TICKET_TONES } from '@/lib/tones';

function placeOf(view: OrderView): string {
  return view.tableName ?? view.order.customerName ?? t(`orderType.${view.order.type}`);
}

function dateTime(iso: string): string {
  return `${new Date(iso).toLocaleDateString('en-GB')} ${clockTime(iso)}`;
}

/** Orders (MASTER_PROMPT.md §7.1): today's and past orders, search and filters, detail with full timeline. */
export function OrdersScreen({ query = '' }: { query?: string }) {
  const [scope, setScope] = useState<'TODAY' | 'ALL'>('TODAY');
  const [type, setType] = useState<OrderType | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [text, setText] = useState(query);
  const [selected, setSelected] = useState<string | null>(null);
  const list = useApiQuery(() => getApi().listOrders({ scope, type, status, query: text }), [scope, type, status, text]);
  const statuses = type ? STATUSES_BY_TYPE[type] : ORDER_STATUSES;

  const chip = (active: boolean) =>
    cn('min-h-11 rounded-xl px-4 text-sm font-bold', active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700');

  return (
    <>
      <ScreenHeader title={t('nav.orders')} status="DEMO_PROTOTYPE" description={t('orders.description')} />

      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['TODAY', 'ALL'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={scope === s} className={chip(scope === s)} onClick={() => setScope(s)}>
                {t(s === 'TODAY' ? 'orders.today' : 'orders.all')}
              </button>
            ))}
            <label className="flex h-11 min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Search className="size-5 text-slate-400" aria-hidden />
              <input
                type="search"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('orders.search')}
                aria-label={t('orders.search')}
                className="w-full bg-transparent"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={chip(type === null)} onClick={() => (setType(null), setStatus(null))}>
              {t('orders.allTypes')}
            </button>
            {ORDER_TYPES.map((ty) => (
              <button key={ty} type="button" className={chip(type === ty)} onClick={() => (setType(ty), setStatus(null))}>
                {t(`orderType.${ty}`)}
              </button>
            ))}
            <select
              value={status ?? ''}
              onChange={(e) => setStatus((e.target.value || null) as OrderStatus | null)}
              aria-label={t('orders.status')}
              className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold"
            >
              <option value="">{t('orders.allStatuses')}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {t(`orderStatus.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          {list.loading && !list.data ? (
            <LoadingState />
          ) : !list.data ? (
            <ErrorState message={list.error?.message} onRetry={list.reload} />
          ) : list.data.length === 0 ? (
            <EmptyState title={t('orders.none')} />
          ) : (
            <ul className="space-y-2">
              {list.data.map((view) => {
                const { order } = view;
                const due = Math.max(0, order.totals.total - order.paidTotal);
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(order.id)}
                      className={cn(
                        'flex min-h-16 w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border bg-white px-4 py-2 text-left shadow-sm',
                        selected === order.id ? 'border-brand' : 'border-slate-200 hover:border-slate-300',
                      )}
                    >
                      <span className="w-12 text-xl font-black">#{order.dailyNumber}</span>
                      <span className="min-w-28 flex-1">
                        <span className="block font-bold text-slate-900">{placeOf(view)}</span>
                        <span className="block text-xs text-slate-500">
                          {t(`orderType.${order.type}`)} · {scope === 'ALL' ? dateTime(order.createdAt) : clockTime(order.createdAt)}
                        </span>
                      </span>
                      <Badge tone={ORDER_TONES[order.status]}>{t(`orderStatus.${order.status}`)}</Badge>
                      <span className="w-28 text-right">
                        <span className="block font-extrabold tabular-nums">{formatPaisa(order.totals.total)}</span>
                        <span className={cn('block text-xs', due > 0 ? 'text-amber-700' : 'text-green-700')}>
                          {due > 0 ? t('orders.due', { due: formatPaisa(due) }) : t('orders.paid')}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {selected ? <OrderDetail key={selected} orderId={selected} /> : <EmptyState title={t('orders.choose')} />}
      </div>
    </>
  );
}

function OrderDetail({ orderId }: { orderId: string }) {
  const { data: view, error, loading, reload } = useApiQuery(() => getApi().getOrderView(orderId), [orderId]);
  const menu = useApiQuery(() => getApi().getMenu(), []);
  if (loading && !view) return <LoadingState />;
  if (!view) return <ErrorState message={error?.message} onRetry={reload} />;
  const { order, names } = view;
  const name = (id: string | null) => (id ? (names[id] ?? '—') : t('orders.system'));

  return (
    <Card className="self-start">
      <CardHeader>
        <div>
          <CardTitle className="text-2xl font-black">
            #{order.dailyNumber} · {placeOf(view)}
          </CardTitle>
          <p className="text-xs text-slate-500">
            {t(`orderType.${order.type}`)} · {dateTime(order.createdAt)}
            {order.invoiceNumber !== null && ` · ${t('print.invoice', { n: order.invoiceNumber })}`}
          </p>
        </div>
        <Badge tone={ORDER_TONES[order.status]}>{t(`orderStatus.${order.status}`)}</Badge>
      </CardHeader>
      <CardBody className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-700">
          {order.waiterId && (<><dt>{t('orders.waiter')}</dt><dd className="font-semibold">{name(order.waiterId)}</dd></>)}
          {order.guests && (<><dt>{t('waiter.guests')}</dt><dd className="font-semibold">{order.guests}</dd></>)}
          {order.customerPhone && (<><dt>{t('staff.phone')}</dt><dd className="font-semibold">{order.customerPhone}</dd></>)}
          {order.customerAddress && (<><dt>{t('online.address')}</dt><dd className="font-semibold">{order.customerAddress}</dd></>)}
          {order.riderId && (<><dt>{t('online.rider')}</dt><dd className="font-semibold">{name(order.riderId)}</dd></>)}
          {order.prepMinutes && (<><dt>{t('online.prepTime')}</dt><dd className="font-semibold">{order.prepMinutes}</dd></>)}
        </dl>

        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{t('orders.items')}</h3>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 py-1.5">
                <span className={cn(item.isVoid && 'text-slate-400 line-through')}>
                  <span className="font-semibold">
                    {formatQuantity(item.quantity, item.unit)} {item.name}
                  </span>
                  {item.variantName && ` (${item.variantName})`}
                  {item.modifiers.map((m) => ` + ${m.name}`).join('')}
                  <span className="ml-1 text-xs text-slate-500">· {t('waiter.round', { n: item.roundNo })}</span>
                </span>
                <span className="tabular-nums">{formatPaisa(item.lineTotal)}</span>
                {item.isVoid && (
                  <span className="basis-full text-xs font-semibold text-red-700">
                    {t('orders.voidedBy', { name: name(item.voidedBy), reason: item.voidReason ?? '' })}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-black">
            <span>{t('pos.total')}</span>
            <span>{formatPaisa(order.totals.total)}</span>
          </p>
        </section>

        {order.payments.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{t('orders.payments')}</h3>
            <ul className="space-y-1">
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span>
                    {t(`pos.method${p.method}`)} · {clockTime(p.createdAt)} · {name(p.receivedBy)}
                    {p.reference && ` · ${p.reference}`}
                    {p.tipAmount > 0 && ` · ${t('pos.tip')} ${formatPaisa(p.tipAmount)}`}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPaisa(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.tickets.length > 0 && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{t('orders.tickets')}</h3>
            <ul className="space-y-1">
              {order.tickets.map((tk) => (
                <li key={tk.id} className="flex items-center justify-between gap-2">
                  <span>
                    {menu.data?.stations.find((s) => s.id === tk.stationId)?.name} · {t('waiter.round', { n: tk.roundNo })} ·{' '}
                    {t('orders.sent')} {clockTime(tk.createdAt)}
                    {tk.readyAt && ` · ${t('ticketStatus.READY')} ${clockTime(tk.readyAt)}`}
                  </span>
                  <Badge tone={TICKET_TONES[tk.status]}>{t(`ticketStatus.${tk.status}`)}</Badge>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{t('orders.timeline')}</h3>
          <ol className="relative space-y-2 border-l-2 border-slate-200 pl-4">
            {order.history.map((h, i) => (
              <li key={i}>
                <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-brand" aria-hidden />
                <p className="font-semibold text-slate-900">
                  {clockTime(h.changedAt)} · {t(`orderStatus.${h.toStatus}`)}
                </p>
                <p className="text-xs text-slate-600">
                  {h.changedBy === null && h.fromStatus === null && order.channel === 'CUSTOMER_APP' ? t('orders.customer') : name(h.changedBy)}
                  {h.reason && ` · ${h.reason}`}
                </p>
              </li>
            ))}
            {order.billRequest && (
              <li>
                <span className="absolute -left-[7px] mt-1.5 size-3 rounded-full bg-amber-500" aria-hidden />
                <p className="font-semibold text-slate-900">
                  {clockTime(order.billRequest.requestedAt)} · {t('waiter.billRequested')}
                </p>
                <p className="text-xs text-slate-600">
                  {name(order.billRequest.requestedBy)}
                  {order.billRequest.acceptedAt && ` · ${t('orders.acceptedBy', { name: name(order.billRequest.acceptedBy), time: clockTime(order.billRequest.acceptedAt) })}`}
                </p>
              </li>
            )}
          </ol>
        </section>
      </CardBody>
    </Card>
  );
}

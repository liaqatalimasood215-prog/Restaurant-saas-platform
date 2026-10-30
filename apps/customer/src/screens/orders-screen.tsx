'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, RotateCcw } from 'lucide-react';
import { ListSkeleton } from '@/components/skeletons';
import { Button, EmptyState, Problem, primaryLinkClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, type CustomerOrder } from '@/lib/api';
import { cn } from '@/lib/cn';
import { rs } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { PageHeader } from './store-chrome';
import { useStore } from './store-context';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Orders placed on this device for this branch, each with its tracking page and Reorder. */
export function OrdersScreen() {
  const { store, base } = useStore();
  const orders = useApiQuery(() => getApi().listMyOrders(store.restaurant.slug, store.branch.slug), [store.restaurant.slug, store.branch.slug]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('orders.title')} back={base} />
      {orders.loading && !orders.data ? (
        <ListSkeleton />
      ) : !orders.data ? (
        <Problem title={t('app.errorTitle')} body={orders.error?.message} onRetry={orders.reload} />
      ) : orders.data.length === 0 ? (
        <EmptyState icon={<ClipboardList className="size-7" aria-hidden />} title={t('orders.empty')} body={t('orders.emptyBody')}>
          <Link href={`${base}/menu`} className={primaryLinkClass}>
            {t('cart.browse')}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {orders.data.map((order) => (
            <OrderCard key={order.token} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: CustomerOrder }) {
  const { base, cart, notify } = useStore();
  const router = useRouter();
  const failed = order.status === 'REJECTED' || order.status === 'CANCELLED';
  const finished = failed || order.status === 'DELIVERED' || order.status === 'PICKED_UP';
  const reorder = () => {
    for (const line of order.lines) cart.addLine(line);
    notify(t('orders.reordered'));
    router.push(`${base}/cart`);
  };
  return (
    <li className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm" data-my-order={order.dailyNumber}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-extrabold">{t('track.order', { n: order.dailyNumber })}</h2>
          <p className="text-xs text-stone-500">{t('orders.line', { time: when(order.history[0]?.at ?? ''), total: rs(order.totals.total) })}</p>
          <p className="text-xs text-stone-500">{order.tableNumber ? t('orders.tableLine', { mode: t(`mode.${order.mode}`), table: order.tableNumber }) : t(`mode.${order.mode}`)}</p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold', failed ? 'bg-red-50 text-red-700' : finished ? 'bg-stone-100 text-stone-600' : 'bg-brand-soft text-brand')}>{t(`status.${order.status}`)}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-stone-700">{order.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</p>
      <div className="mt-3 flex gap-2">
        <Link href={`${base}/track/${order.token}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-brand-soft px-3 text-sm font-bold text-brand hover:bg-brand-line">
          {t('orders.track')}
        </Link>
        <Button variant="secondary" className="min-h-11 flex-1 px-3" onClick={reorder}>
          <RotateCcw className="size-4" aria-hidden />
          {t('orders.reorder')}
        </Button>
      </div>
    </li>
  );
}

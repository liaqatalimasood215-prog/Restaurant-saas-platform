'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bike, MapPin, MoonStar, PackageCheck } from 'lucide-react';
import { canRiderGoOffline, formatPaisa, type RiderDelivery } from '@restaurant-saas/shared';
import { Button, Card, EmptyState } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useRider } from './rider-context';

export const STATUS_LOOK: Record<RiderDelivery['status'], string> = {
  RIDER_ASSIGNED: 'bg-amber-100 text-amber-900',
  OUT_FOR_DELIVERY: 'bg-blue-100 text-blue-900',
  DELIVERED: 'bg-green-100 text-green-900',
};

/** Home of the Rider App: the Online switch and this rider's running deliveries (MASTER_PROMPT.md §7.3). */
export function DeliveriesScreen() {
  const { base, me, deliveries, notify } = useRider();
  const [busy, setBusy] = useState(false);
  // On the way first: that customer is waiting now.
  const running = deliveries
    .filter((d) => d.status !== 'DELIVERED')
    .sort((a, b) => Number(b.status === 'OUT_FOR_DELIVERY') - Number(a.status === 'OUT_FOR_DELIVERY') || a.dailyNumber - b.dailyNumber);
  const online = me.riderOnline;

  const run = async (work: () => Promise<void>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) notify(done);
    } catch (err) {
      notify(err instanceof Error ? err.message : t('app.errorBody'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = () => {
    if (online && !canRiderGoOffline(running.length)) return notify(t('availability.busy'), 'error');
    void run(() => getApi().setOnline(!online), t(online ? 'availability.wentOffline' : 'availability.wentOnline'));
  };

  return (
    <div className="space-y-3">
      <Card className={cn('flex items-center gap-3', online ? 'bg-green-50' : 'bg-stone-200')} data-availability={online ? 'ONLINE' : 'OFFLINE'}>
        <span className={cn('size-3.5 shrink-0 rounded-full', online ? 'bg-green-600' : 'bg-stone-500')} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{t(online ? 'availability.online' : 'availability.offline')}</p>
          <p className="text-sm text-stone-600">{t(online ? 'availability.onlineBody' : 'availability.offlineBody')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          aria-label={t('availability.switchLabel')}
          disabled={busy}
          onClick={toggle}
          className="grid min-h-12 min-w-16 place-items-center disabled:opacity-50"
        >
          <span className={cn('flex h-8 w-14 items-center rounded-full p-1 transition-colors', online ? 'justify-end bg-green-600' : 'justify-start bg-stone-400')}>
            <span className="size-6 rounded-full bg-white shadow" />
          </span>
        </button>
      </Card>

      <h1 className="pt-1 text-2xl font-black tracking-tight">{t('deliveries.title')}</h1>

      {running.length === 0 &&
        (online ? (
          <EmptyState icon={<Bike className="size-10 text-stone-400" aria-hidden />} title={t('deliveries.emptyOnline')}>
            {t('deliveries.emptyOnlineBody')}
          </EmptyState>
        ) : (
          <EmptyState icon={<MoonStar className="size-10 text-stone-400" aria-hidden />} title={t('deliveries.emptyOffline')}>
            {t('deliveries.emptyOfflineBody')}
          </EmptyState>
        ))}

      <ul className="space-y-3">
        {running.map((delivery) => (
          <li key={delivery.id}>
            <DeliveryCard delivery={delivery} href={`${base}/delivery/${delivery.id}`} />
          </li>
        ))}
      </ul>

      {getDemoControls().source() === 'SAMPLE' && (
        <div className="space-y-1 pt-1">
          <Button variant="demo" className="w-full" disabled={busy} onClick={() => void run(() => getDemoControls().giveNewOrder())}>
            {t('demo.newOrder')}
          </Button>
          <p className="text-center text-xs text-stone-500">{t('demo.newOrderHint')}</p>
        </div>
      )}
    </div>
  );
}

function DeliveryCard({ delivery, href }: { delivery: RiderDelivery; href: string }) {
  return (
    <Link href={href} aria-label={t('deliveries.open', { n: delivery.dailyNumber })} data-delivery={delivery.dailyNumber} className="block space-y-2 rounded-3xl bg-white p-4 shadow-sm hover:bg-stone-50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-3xl font-black leading-none tabular-nums">#{delivery.dailyNumber}</span>
        <span className={cn('rounded-full px-3 py-1 text-xs font-bold', STATUS_LOOK[delivery.status])} data-delivery-status={delivery.status}>
          {t(`status.${delivery.status}`)}
        </span>
      </div>
      <p className="font-extrabold">{delivery.customerName}</p>
      <p className="flex items-start gap-1 text-sm text-stone-600">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
        {delivery.customerAddress}
      </p>
      <p className="flex items-center justify-between gap-2 border-t border-stone-100 pt-2">
        {delivery.amountToCollect > 0 ? (
          <>
            <span className="text-sm font-bold text-stone-600">{t('deliveries.collect')}</span>
            <span className="text-xl font-black tabular-nums text-green-800">{formatPaisa(delivery.amountToCollect)}</span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-sm font-bold text-green-800">
            <PackageCheck className="size-4" aria-hidden />
            {t('deliveries.paid')}
          </span>
        )}
      </p>
    </Link>
  );
}

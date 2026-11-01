'use client';

import Link from 'next/link';
import { ChevronRight, Clock, History, Layers, MapPin, PackageOpen } from 'lucide-react';
import { MAX_ACTIVE_RIDER_DELIVERIES, deliveryAreaLabel, riderStage, type RiderDelivery } from '@restaurant-saas/shared';
import { ScreenTop } from '@/components/rider-header';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, LinkRow } from '@/components/ui';
import { t } from '@/i18n';
import { newOrdersOf, OrderCard, withRiderOf } from './deliveries-screen';
import { useRider } from './rider-context';

/** My Active Deliveries (owner's picture, screen 5). Stops are in a plain order: no route is calculated here. */
export function OrdersScreen() {
  const { base, deliveries, explainDemo } = useRider();
  const active = withRiderOf(deliveries);
  const waiting = newOrdersOf(deliveries);
  const title = (
    <>
      {t('orders.title')} <span className="whitespace-nowrap text-brand" data-capacity={`${active.length}/${MAX_ACTIVE_RIDER_DELIVERIES}`}>({active.length}/{MAX_ACTIVE_RIDER_DELIVERIES})</span>
    </>
  );
  return (
    <div className="space-y-3">
      <ScreenTop title={title} backHref={base} onExplain={explainDemo} />
      {active.length === 0 ? (
        <EmptyState icon={<PackageOpen className="size-10 text-muted" aria-hidden />} title={t('deliveries.emptyMine')}>
          {t('deliveries.emptyMineBody')}
        </EmptyState>
      ) : (
        <ol className="space-y-3">
          {active.map((delivery, i) => (
            <li key={delivery.id}>
              <DropCard delivery={delivery} drop={i + 1} href={`${base}/delivery/${delivery.id}`} />
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-center gap-3 rounded-2xl bg-brand-soft p-3" data-capacity-info>
        <Layers className="size-7 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 text-sm">
          <p className="font-bold text-ink">{t('home.capacityInfo', { max: MAX_ACTIVE_RIDER_DELIVERIES })}</p>
          <p className="text-xs text-muted">{t('orders.capacityPending')}</p>
        </div>
      </div>
      {waiting.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-extrabold">{t('orders.waiting', { n: waiting.length })}</h2>
          <ul className="space-y-3">
            {waiting.map((delivery) => (
              <li key={delivery.id}>
                <OrderCard delivery={delivery} href={`${base}/delivery/${delivery.id}`} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <LinkRow href={`${base}/history`} icon={<History className="size-6 shrink-0 text-ink" aria-hidden />}>
        {t('history.title')}
      </LinkRow>
    </div>
  );
}

function DropCard({ delivery, drop, href }: { delivery: RiderDelivery; drop: number; href: string }) {
  const hasAway = delivery.distanceKm !== undefined && delivery.etaMinutes !== undefined;
  return (
    <Link href={href} aria-label={t('deliveries.open', { n: delivery.dailyNumber })} data-active-delivery={delivery.dailyNumber} className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3 shadow-sm hover:bg-page">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span aria-label={t('orders.drop', { n: drop })} data-drop={drop} className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-black text-white">{drop}</span>
          <span className="min-w-0 flex-1 truncate text-lg font-black tabular-nums">#{delivery.dailyNumber}</span>
          <StatusBadge stage={riderStage(delivery)} status={delivery.status} />
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
          <p className="min-w-0 text-sm">
            <span className="block font-extrabold">{delivery.customerName}</span>
            <span className="text-muted">{delivery.area ?? deliveryAreaLabel(delivery.customerAddress)}</span>
          </p>
        </div>
        {hasAway && (
          <p className="flex items-center gap-2 whitespace-pre text-sm text-muted" data-away>
            <Clock className="size-4 shrink-0" aria-hidden />
            {t('deliveries.away', { km: delivery.distanceKm ?? 0, min: delivery.etaMinutes ?? 0 })}
          </p>
        )}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

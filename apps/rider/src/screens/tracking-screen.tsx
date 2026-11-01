'use client';

import { Clock, MapPin, Navigation, PackageCheck } from 'lucide-react';
import { googleMapsLink, riderStage } from '@restaurant-saas/shared';
import { DemoMap } from '@/components/demo-map';
import { ScreenTop } from '@/components/rider-header';
import { Card, EmptyState, PrimaryLink } from '@/components/ui';
import { t } from '@/i18n';
import { useRider } from './rider-context';

/** Live Tracking (owner's picture, screen 4). DEMO: the map is a drawing; navigation opens the free Google Maps link. */
export function TrackingScreen({ id }: { id: string }) {
  const { base, deliveries, notify, explainDemo } = useRider();
  const delivery = deliveries.find((d) => d.id === id);
  const top = <ScreenTop title={t('tracking.title')} backHref={delivery ? `${base}/delivery/${id}` : base} onExplain={explainDemo} />;

  if (!delivery) {
    return (
      <div className="space-y-3">
        {top}
        <EmptyState icon={<PackageCheck className="size-10 text-muted" aria-hidden />} title={t('delivery.goneTitle')}>
          {t('delivery.gone')}
        </EmptyState>
      </div>
    );
  }
  if (riderStage(delivery) === 'DELIVERED') {
    return (
      <div className="space-y-3">
        {top}
        <EmptyState icon={<PackageCheck className="size-10 text-success" aria-hidden />} title={t('tracking.doneTitle')}>
          {t('tracking.doneBody')}
        </EmptyState>
      </div>
    );
  }
  const hasAway = delivery.distanceKm !== undefined && delivery.etaMinutes !== undefined;
  return (
    <div className="space-y-3">
      {top}
      <div className="-mx-4">
        <DemoMap onLocate={() => notify(t('tracking.locateDemo'))} />
      </div>
      <Card className="space-y-2">
        <div className="flex items-center gap-3">
          <MapPin className="size-6 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm text-muted">{t('tracking.deliverTo')}</p>
            <p className="font-extrabold" data-tracking-name>{delivery.customerName}</p>
          </div>
        </div>
        {hasAway ? (
          <div className="border-t border-line pt-2">
            <p className="flex items-center gap-2 font-bold" data-away>
              <Clock className="size-5 shrink-0 text-muted" aria-hidden />
              {t('tracking.km', { km: delivery.distanceKm ?? 0 })}
              <span aria-hidden className="text-line">|</span>
              {t('tracking.eta', { min: delivery.etaMinutes ?? 0 })}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-800">{t('tracking.sampleNumbers')}</p>
          </div>
        ) : (
          <p className="border-t border-line pt-2 text-sm font-semibold text-amber-800" data-away-missing>{t('tracking.notConnected')}</p>
        )}
      </Card>
      <PrimaryLink href={googleMapsLink(delivery.customerAddress)} target="_blank" rel="noopener noreferrer" data-navigate icon={<Navigation className="size-6" />}>
        {t('tracking.navigate')}
      </PrimaryLink>
    </div>
  );
}

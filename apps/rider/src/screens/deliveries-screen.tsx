'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Bike, CheckCircle2, ChevronRight, Clock, Layers, MapPin, MoonStar, PackageOpen, ShoppingBag } from 'lucide-react';
import { MAX_ACTIVE_RIDER_DELIVERIES, canRiderGoOffline, deliveryAreaLabel, formatPaisa, isActiveRiderStage, riderStage, type RiderDelivery } from '@restaurant-saas/shared';
import { RiderHeader } from '@/components/rider-header';
import { PaymentBadge, StatusBadge } from '@/components/status-badge';
import { Button, EmptyState } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { daysAgoKey, riderDay } from '@/lib/dates';
import { useRider } from './rider-context';

type Tab = 'NEW' | 'MINE';

const byNumber = (a: RiderDelivery, b: RiderDelivery) => a.dailyNumber - b.dailyNumber;

export const newOrdersOf = (deliveries: readonly RiderDelivery[]) => deliveries.filter((d) => riderStage(d) === 'NEW').sort(byNumber);

/** On the way first: that customer is waiting now. */
export const withRiderOf = (deliveries: readonly RiderDelivery[]) =>
  deliveries
    .filter((d) => isActiveRiderStage(riderStage(d)))
    .sort((a, b) => Number(b.status === 'OUT_FOR_DELIVERY') - Number(a.status === 'OUT_FOR_DELIVERY') || byNumber(a, b));

/**
 * Home of the Rider App (owner's picture, screen 2). New = assigned, not picked up yet; My Orders = with the rider. There is
 * no Accept step: the cashier assigns (owner, 2026-11-01). Upcoming counts the same orders as New Orders.
 */
export function DeliveriesScreen() {
  const { base, branch, me, deliveries, notify, explainDemo } = useRider();
  const [busy, setBusy] = useState(false);
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const newOrders = newOrdersOf(deliveries);
  const mine = withRiderOf(deliveries);
  const today = daysAgoKey(0);
  const completed = deliveries.filter((d) => d.status === 'DELIVERED' && (!d.deliveredAt || riderDay(new Date(d.deliveredAt)) === today)).length;
  const tab: Tab = chosenTab ?? (newOrders.length === 0 && mine.length > 0 ? 'MINE' : 'NEW');
  const shown = tab === 'NEW' ? newOrders : mine;
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
    if (online && !canRiderGoOffline(newOrders.length + mine.length)) return notify(t('availability.busy'), 'error');
    void run(() => getApi().setOnline(!online), t(online ? 'availability.wentOffline' : 'availability.wentOnline'));
  };

  return (
    <div className="space-y-3">
      <RiderHeader
        name={me.name}
        restaurantName={branch.restaurantName}
        branchName={branch.branchName}
        newCount={newOrders.length}
        onBell={() => setChosenTab('NEW')}
        onExplain={explainDemo}
        availability={
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-label={t('availability.switchLabel')}
            disabled={busy}
            onClick={toggle}
            data-availability={online ? 'ONLINE' : 'OFFLINE'}
            className="flex min-h-11 items-center disabled:opacity-50"
          >
            <span className={cn('flex h-8 items-center gap-2 rounded-full p-1 text-xs font-bold text-white', online ? 'bg-success pl-3' : 'flex-row-reverse bg-muted pr-3')}>
              {t(online ? 'availability.online' : 'availability.offline')}
              <span className="size-6 rounded-full bg-card shadow" />
            </span>
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        <Stat stat="active" tone="bg-brand-soft text-brand" icon={<ShoppingBag className="size-6" aria-hidden />} value={mine.length} label={t('home.active')} />
        <Stat stat="upcoming" tone="bg-info-soft text-info" icon={<Clock className="size-6" aria-hidden />} value={newOrders.length} label={t('home.upcoming')} />
        <Stat stat="completed" tone="bg-success-soft text-success" icon={<CheckCircle2 className="size-6" aria-hidden />} value={completed} label={t('home.completed')} note={t('home.today')} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TabButton active={tab === 'NEW'} onClick={() => setChosenTab('NEW')}>{t('home.newTab', { n: newOrders.length })}</TabButton>
        <TabButton active={tab === 'MINE'} onClick={() => setChosenTab('MINE')}>{t('home.mineTab')}</TabButton>
      </div>

      {tab === 'MINE' && (
        <p className="text-sm font-bold text-muted" data-capacity={`${mine.length}/${MAX_ACTIVE_RIDER_DELIVERIES}`}>
          {t('home.capacity', { n: mine.length, max: MAX_ACTIVE_RIDER_DELIVERIES })}
        </p>
      )}

      {shown.length === 0 && (
        !online ? (
          <EmptyState icon={<MoonStar className="size-10 text-muted" aria-hidden />} title={t('deliveries.emptyOffline')}>
            {t('deliveries.emptyOfflineBody')}
          </EmptyState>
        ) : tab === 'NEW' ? (
          <EmptyState icon={<Bike className="size-10 text-muted" aria-hidden />} title={t('deliveries.emptyNew')}>
            {t('deliveries.emptyNewBody')}
          </EmptyState>
        ) : (
          <EmptyState icon={<PackageOpen className="size-10 text-muted" aria-hidden />} title={t('deliveries.emptyMine')}>
            {t('deliveries.emptyMineBody')}
          </EmptyState>
        )
      )}

      <ul className="space-y-3">
        {shown.map((delivery) => (
          <li key={delivery.id}>
            <OrderCard delivery={delivery} href={`${base}/delivery/${delivery.id}`} />
          </li>
        ))}
      </ul>

      {tab === 'MINE' && (
        <p className="flex items-center gap-3 rounded-2xl bg-brand-soft p-3 text-sm font-semibold text-ink">
          <Layers className="size-6 shrink-0 text-brand" aria-hidden />
          {t('home.capacityInfo', { max: MAX_ACTIVE_RIDER_DELIVERIES })}
        </p>
      )}

      {getDemoControls().source() === 'SAMPLE' && (
        <div className="space-y-1 pt-1">
          <Button variant="demo" className="w-full" disabled={busy} onClick={() => void run(() => getDemoControls().giveNewOrder())}>
            {t('demo.newOrder')}
          </Button>
          <p className="text-center text-xs text-muted">{t('demo.newOrderHint')}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ stat, tone, icon, value, label, note }: { stat: string; tone: string; icon: ReactNode; value: number; label: string; note?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col items-center rounded-2xl p-2 text-center', tone)} data-stat={stat}>
      {icon}
      <span className="text-xl font-black tabular-nums leading-tight text-ink" data-stat-value>{value}</span>
      <span className="text-xs font-bold leading-tight">{label}</span>
      {note && <span className="text-[0.6875rem] leading-tight text-muted">{note}</span>}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn('min-h-11 rounded-xl border px-2 text-sm font-extrabold', active ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink')}
    >
      {children}
    </button>
  );
}

export function OrderCard({ delivery, href }: { delivery: RiderDelivery; href: string }) {
  const cod = delivery.amountToCollect > 0;
  const hasAway = delivery.distanceKm !== undefined && delivery.etaMinutes !== undefined;
  return (
    <Link href={href} aria-label={t('deliveries.open', { n: delivery.dailyNumber })} data-delivery={delivery.dailyNumber} className="flex items-center gap-2 rounded-2xl border border-line bg-card p-3 shadow-sm hover:bg-page">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-lg font-black tabular-nums">#{delivery.dailyNumber}</span>
          <StatusBadge stage={riderStage(delivery)} status={delivery.status} />
        </div>
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0">{delivery.area ?? deliveryAreaLabel(delivery.customerAddress)}</span>
        </p>
        {hasAway && (
          <p className="flex items-center gap-2 whitespace-pre text-sm text-muted" data-away>
            <Clock className="size-4 shrink-0" aria-hidden />
            {t('deliveries.away', { km: delivery.distanceKm ?? 0, min: delivery.etaMinutes ?? 0 })}
          </p>
        )}
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-black tabular-nums">{formatPaisa(cod ? delivery.amountToCollect : delivery.total)}</span>
          <PaymentBadge cod={cod} />
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

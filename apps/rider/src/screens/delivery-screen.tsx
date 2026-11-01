'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCircle2, MapPin, Navigation, PackageCheck, Phone } from 'lucide-react';
import { formatPaisa, googleMapsLink, type RiderDelivery } from '@restaurant-saas/shared';
import { Button, Card, EmptyState, Sheet } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { STATUS_LOOK } from './deliveries-screen';
import { useRider } from './rider-context';

/** One delivery: call, map, amount to collect, then Picked up – On the way → Delivered + cash confirmed. */
export function DeliveryScreen({ id }: { id: string }) {
  const { base, deliveries, notify } = useRider();
  const delivery = deliveries.find((d) => d.id === id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const back = (
    <Link href={base} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-bold text-stone-600 hover:bg-stone-100">
      <ArrowLeft className="size-5" aria-hidden />
      {t('delivery.back')}
    </Link>
  );
  if (!delivery) {
    return (
      <div className="space-y-3">
        {back}
        <EmptyState icon={<PackageCheck className="size-10 text-stone-400" aria-hidden />} title={t('delivery.goneTitle')}>
          {t('delivery.gone')}
        </EmptyState>
      </div>
    );
  }

  const step = async (work: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await work();
      notify(done);
    } catch (err) {
      notify(err instanceof Error ? err.message : t('app.errorBody'), 'error');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };
  const n = delivery.dailyNumber;
  const collect = delivery.amountToCollect;

  return (
    <div className="space-y-3">
      {back}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-black tabular-nums tracking-tight">{t('delivery.title', { n })}</h1>
        <span className={cn('rounded-full px-3 py-1 text-xs font-bold', STATUS_LOOK[delivery.status])} data-delivery-status={delivery.status}>
          {t(`status.${delivery.status}`)}
        </span>
      </div>
      <Steps status={delivery.status} />
      <MoneyCard delivery={delivery} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-stone-500">{t('delivery.customer')}</p>
            <p className="truncate font-extrabold">{delivery.customerName}</p>
            <p className="text-sm text-stone-600">{delivery.customerPhone}</p>
          </div>
          <a href={`tel:${delivery.customerPhone}`} aria-label={t('delivery.callLabel', { name: delivery.customerName })} data-call className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-green-700 px-5 text-sm font-bold text-white hover:bg-green-800">
            <Phone className="size-5" aria-hidden />
            {t('delivery.call')}
          </a>
        </div>
        <div className="border-t border-stone-100 pt-3">
          <p className="text-xs font-bold text-stone-500">{t('delivery.address')}</p>
          <p className="flex items-start gap-1 font-semibold">
            <MapPin className="mt-0.5 size-4 shrink-0 text-stone-500" aria-hidden />
            {delivery.customerAddress}
          </p>
          <a href={googleMapsLink(delivery.customerAddress)} target="_blank" rel="noopener noreferrer" data-map className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 hover:bg-stone-50">
            <Navigation className="size-5" aria-hidden />
            {t('delivery.map')}
          </a>
        </div>
      </Card>

      <Card>
        <p className="mb-1 text-xs font-bold text-stone-500">{t('delivery.items')}</p>
        <ul className="space-y-1">
          {delivery.items.map((item) => (
            <li key={item.id} className="font-semibold">
              {item.label}
              {item.note && <span className="font-normal text-amber-800"> “{item.note}”</span>}
            </li>
          ))}
        </ul>
        {delivery.note && (
          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span className="font-bold">{t('delivery.note')}:</span> {delivery.note}
          </p>
        )}
      </Card>

      {delivery.status !== 'DELIVERED' && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg">
            {delivery.status === 'RIDER_ASSIGNED' ? (
              <Button className="min-h-14 w-full text-base" disabled={busy} onClick={() => void step(() => getApi().pickedUp(delivery.id), t('delivery.wayToast', { n }))}>
                <Navigation className="size-5" aria-hidden />
                {t('delivery.pickedUp')}
              </Button>
            ) : (
              <Button variant="success" className="min-h-14 w-full text-base" disabled={busy} onClick={() => setConfirming(true)}>
                <Check className="size-5" aria-hidden />
                {t('delivery.delivered')}
              </Button>
            )}
          </div>
        </div>
      )}

      {confirming && (
        <Sheet
          title={t('delivery.confirmTitle')}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button variant="success" className="min-h-14 w-full text-base" disabled={busy} onClick={() => void step(() => getApi().delivered(delivery.id), t('delivery.doneToast', { n }))}>
                {collect > 0 ? t('delivery.confirmYesCash') : t('delivery.confirmYes')}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setConfirming(false)}>
                {t('delivery.confirmNo')}
              </Button>
            </>
          }
        >
          <p className="text-base font-semibold" data-confirm-text>
            {collect > 0 ? t('delivery.confirmCash', { amount: formatPaisa(collect) }) : t('delivery.confirmPaid')}
          </p>
        </Sheet>
      )}
    </div>
  );
}

function Steps({ status }: { status: RiderDelivery['status'] }) {
  const reached = status === 'RIDER_ASSIGNED' ? 0 : status === 'OUT_FOR_DELIVERY' ? 1 : 2;
  const labels = [t('delivery.stepRestaurant'), t('delivery.stepWay'), t('delivery.stepDone')];
  return (
    <ol className="grid grid-cols-3 gap-1" aria-label={t(`status.${status}`)}>
      {labels.map((label, i) => (
        <li key={label} className="text-center">
          <span className={cn('block h-2 rounded-full', i <= reached ? 'bg-brand' : 'bg-stone-200')} />
          <span className={cn('mt-1 block text-xs font-bold', i <= reached ? 'text-stone-900' : 'text-stone-400')}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function MoneyCard({ delivery }: { delivery: RiderDelivery }) {
  if (delivery.status === 'DELIVERED') {
    return (
      <Card className="flex items-center gap-3 bg-green-50" data-money="DONE">
        <CheckCircle2 className="size-8 shrink-0 text-green-700" aria-hidden />
        <div>
          <p className="font-extrabold">{t('delivery.doneTitle')}</p>
          {delivery.cashCollected > 0 && (
            <p className="text-sm text-stone-700">
              {t('delivery.collected')}: <span className="font-bold">{formatPaisa(delivery.cashCollected)}</span>. {delivery.cashSettled ? t('delivery.settled') : t('delivery.handOver')}
            </p>
          )}
        </div>
      </Card>
    );
  }
  if (delivery.amountToCollect === 0) {
    return (
      <Card className="bg-green-50" data-money="PAID">
        <p className="text-xl font-black text-green-800">{t('delivery.paidTitle')}</p>
        <p className="text-sm text-stone-700">{t('delivery.paidBody')}</p>
      </Card>
    );
  }
  return (
    <Card className="bg-green-50" data-money="COLLECT">
      <p className="text-sm font-bold text-green-900">{t('delivery.collectTitle')}</p>
      <p className="text-4xl font-black tabular-nums text-green-800" data-amount-to-collect>{formatPaisa(delivery.amountToCollect)}</p>
    </Card>
  );
}

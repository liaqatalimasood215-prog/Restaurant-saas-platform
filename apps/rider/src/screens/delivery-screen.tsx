'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Banknote, Bike, Check, CheckCircle2, ChevronsRight, LocateFixed, MapPin, Navigation, PackageCheck, Phone, Store, Utensils } from 'lucide-react';
import { MAX_ACTIVE_RIDER_DELIVERIES, canPickUpAnother, formatPaisa, googleMapsLink, isActiveRiderStage, riderStage, type RiderDelivery, type RiderStage } from '@restaurant-saas/shared';
import { ScreenTop } from '@/components/rider-header';
import { Button, Card, EmptyState, PrimaryAction, Sheet } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useRider } from './rider-context';

/** After a step the next button waits this long, so a quick double tap never also runs the next step. */
const NEXT_STEP_WAIT_MS = 700;

/** One order (owner's picture, screen 3): call, items, money and one button for the next step. */
export function DeliveryScreen({ id }: { id: string }) {
  const { base, branch, deliveries, notify, explainDemo } = useRider();
  const delivery = deliveries.find((d) => d.id === id);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const top = (title: string) => <ScreenTop title={title} backHref={base} backLabel={t('delivery.back')} onExplain={explainDemo} />;
  if (!delivery) {
    return (
      <div className="space-y-3">
        {top(t('delivery.goneTitle'))}
        <EmptyState icon={<PackageCheck className="size-10 text-muted" aria-hidden />} title={t('delivery.goneTitle')}>
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
      setConfirming(false);
      setTimeout(() => setBusy(false), NEXT_STEP_WAIT_MS);
    }
  };
  const n = delivery.dailyNumber;
  const stage = riderStage(delivery);
  const withRider = deliveries.filter((d) => isActiveRiderStage(riderStage(d))).length;
  const full = stage === 'NEW' && !canPickUpAnother(withRider);

  return (
    <div className="space-y-3">
      {top(t('delivery.title', { n }))}
      <Stepper stage={stage} status={delivery.status} />

      <Card className="divide-y divide-line py-1">
        <Contact
          heading={t('delivery.pickupFrom')}
          icon={<Store className="size-6 text-brand" aria-hidden />}
          name={branch.restaurantName}
          detail={branch.branchName}
          phone={branch.phone}
          callData="restaurant"
        />
        <Contact
          heading={t('delivery.deliverTo')}
          icon={<MapPin className="size-6 text-brand" aria-hidden />}
          name={delivery.customerName}
          detail={delivery.customerAddress}
          phone={delivery.customerPhone}
          callData="customer"
        >
          <a href={googleMapsLink(delivery.customerAddress)} target="_blank" rel="noopener noreferrer" data-map className="-ml-1 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-bold text-brand">
            <Navigation className="size-4" aria-hidden />
            {t('delivery.map')}
          </a>
          {isActiveRiderStage(stage) && (
            <Link href={`${base}/delivery/${delivery.id}/tracking`} data-tracking className="ml-3 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-bold text-brand">
              <LocateFixed className="size-4" aria-hidden />
              {t('tracking.open')}
            </Link>
          )}
        </Contact>
      </Card>

      <Items delivery={delivery} />
      <Money delivery={delivery} />

      {stage === 'NEW' && (
        <PrimaryAction
          icon={<ChevronsRight className="size-6" />}
          disabled={busy || full}
          hint={full ? t('home.capacityFull', { max: MAX_ACTIVE_RIDER_DELIVERIES }) : undefined}
          onClick={() => void step(() => getApi().confirmPickup(delivery.id), t('delivery.pickUpToast', { n }))}
        >
          {t('delivery.pickUp')}
        </PrimaryAction>
      )}
      {stage === 'PICKED_UP' && (
        <PrimaryAction icon={<Bike className="size-6" />} disabled={busy} onClick={() => void step(() => getApi().pickedUp(delivery.id), t('delivery.wayToast', { n }))}>
          {t('delivery.start')}
        </PrimaryAction>
      )}
      {stage === 'ON_THE_WAY' && (
        <PrimaryAction icon={<Check className="size-6" />} disabled={busy} onClick={() => setConfirming(true)}>
          {t('delivery.deliver')}
        </PrimaryAction>
      )}

      {confirming && (
        <Sheet
          title={t('delivery.confirmTitle')}
          onClose={() => setConfirming(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t('delivery.confirmNo')}
              </Button>
              <Button disabled={busy} onClick={() => void step(() => getApi().delivered(delivery.id), t('delivery.doneToast', { n }))}>
                {t('delivery.confirmYes')}
              </Button>
            </div>
          }
        >
          <div className="space-y-3" data-confirm-text>
            {delivery.amountToCollect > 0 ? (
              <dl className="divide-y divide-line">
                <div className="flex justify-between gap-3 py-2">
                  <dt>{t('delivery.customerPay')}</dt>
                  <dd className="font-black tabular-nums">{formatPaisa(delivery.amountToCollect)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt>{t('delivery.cashCollected')}</dt>
                  <dd className="font-black tabular-nums">{formatPaisa(delivery.amountToCollect)}</dd>
                </div>
              </dl>
            ) : (
              <p className="font-semibold">{t('delivery.confirmPaid')}</p>
            )}
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('delivery.confirmDemo')}</p>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Done steps are ticked; the ring marks what the rider does next. */
function Stepper({ stage, status }: { stage: RiderStage; status: RiderDelivery['status'] }) {
  const doneCount: Record<RiderStage, number> = { NEW: 1, PICKED_UP: 2, ON_THE_WAY: 3, DELIVERED: 4 };
  const done = doneCount[stage];
  const steps = [
    { label: t('delivery.stepAssign'), icon: Check },
    { label: t('delivery.stepPickUp'), icon: Store },
    { label: t('delivery.stepWay'), icon: Bike },
    { label: t('delivery.stepDone'), icon: Check },
  ];
  return (
    <ol className="grid grid-cols-4" aria-label={t(`stage.${stage}`)} data-stage={stage} data-delivery-status={status}>
      {steps.map((step, i) => {
        const isDone = i < done;
        const isNext = i === done;
        return (
          <li key={step.label} aria-current={isNext ? 'step' : undefined} className="relative flex flex-col items-center gap-1 text-center">
            {i > 0 && <span aria-hidden className={cn('absolute right-1/2 top-4 h-0.5 w-full', i <= done ? 'bg-brand' : 'bg-line')} />}
            <span className={cn('relative grid size-8 place-items-center rounded-full', isDone ? 'bg-brand text-white' : isNext ? 'border-2 border-brand bg-card text-brand' : 'border border-line bg-page text-muted')}>
              {isDone ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <step.icon className="size-4" aria-hidden />}
            </span>
            <span className={cn('text-xs font-bold leading-tight', isDone || isNext ? 'text-ink' : 'text-muted')}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Contact({ heading, icon, name, detail, phone, callData, children }: { heading: string; icon: ReactNode; name: string; detail: string; phone: string; callData: string; children?: ReactNode }) {
  return (
    <section className="py-2">
      <h2 className="mb-1 text-sm font-extrabold">{heading}</h2>
      <div className="flex items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{name}</p>
          <p className="text-sm text-muted">{detail}</p>
        </div>
        <a href={`tel:${phone}`} aria-label={t('delivery.call', { name })} {...(callData === 'customer' ? { 'data-call': true } : { 'data-call-restaurant': true })} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-success-soft text-success shadow-sm">
          <Phone className="size-5" aria-hidden />
        </a>
      </div>
      {children}
    </section>
  );
}

/** The prices saved on the order. Anything else in the total (delivery fee, tax, discount) is shown as one line; nothing is calculated as a price here. */
function Items({ delivery }: { delivery: RiderDelivery }) {
  const rest = delivery.total - delivery.items.reduce((sum, item) => sum + item.lineTotal, 0);
  return (
    <Card>
      <h2 className="mb-2 text-sm font-extrabold">{t('delivery.items', { n: delivery.items.length })}</h2>
      <ul className="space-y-2">
        {delivery.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <Utensils className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1 text-sm font-semibold">
              {item.label}
              {item.note && <span className="font-normal text-amber-800"> “{item.note}”</span>}
            </span>
            <span className="shrink-0 text-sm tabular-nums">{formatPaisa(item.lineTotal)}</span>
          </li>
        ))}
        {rest !== 0 && (
          <li className="flex justify-between gap-2 text-sm text-muted" data-charges>
            <span>{t(rest > 0 ? 'delivery.charges' : 'delivery.discount')}</span>
            <span className="tabular-nums">{rest > 0 ? formatPaisa(rest) : `- ${formatPaisa(-rest)}`}</span>
          </li>
        )}
      </ul>
      <p className="mt-2 flex justify-between gap-2 border-t border-line pt-2 font-extrabold">
        <span>{t('delivery.total')}</span>
        <span className="text-lg font-black tabular-nums" data-order-total>{formatPaisa(delivery.total)}</span>
      </p>
      {delivery.note && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-bold">{t('delivery.note')}:</span> {delivery.note}
        </p>
      )}
    </Card>
  );
}

function Money({ delivery }: { delivery: RiderDelivery }) {
  if (delivery.status === 'DELIVERED') {
    return (
      <Card className="flex items-center gap-3" data-money="DONE">
        <CheckCircle2 className="size-8 shrink-0 text-success" aria-hidden />
        <div>
          <p className="font-extrabold">{t('delivery.doneTitle')}</p>
          {delivery.cashCollected > 0 && (
            <p className="text-sm text-muted">
              {t('delivery.collected')}: <span className="font-bold text-ink">{formatPaisa(delivery.cashCollected)}</span>. {delivery.cashSettled ? t('delivery.settled') : t('delivery.handOver')}
            </p>
          )}
        </div>
      </Card>
    );
  }
  if (delivery.amountToCollect === 0) {
    return (
      <div className="rounded-2xl bg-success-soft p-3" data-money="PAID">
        <p className="font-black text-success">{t('delivery.paidTitle')}</p>
        <p className="text-sm text-ink">{t('delivery.paidBody')}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand bg-brand-soft p-3" data-money="COLLECT">
      <Banknote className="size-7 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-extrabold text-brand">{t('delivery.cod')}</p>
      <p className="shrink-0 text-xl font-black tabular-nums text-brand" data-amount-to-collect>{formatPaisa(delivery.amountToCollect)}</p>
    </div>
  );
}

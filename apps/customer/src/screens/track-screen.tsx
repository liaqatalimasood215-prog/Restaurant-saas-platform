'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bike, Check, CircleX, Copy, MessageCircle, PartyPopper, Phone, RefreshCw, RotateCcw } from 'lucide-react';
import { STATUS_INFO, formatQuantity, nextTrackingStep, trackingSteps, type OrderStatus } from '@restaurant-saas/shared';
import { ListSkeleton } from '@/components/skeletons';
import { Button, NotConnected, Problem } from '@/components/ui';
import { t } from '@/i18n';
import { ApiError, getApi, getDemoControls, type CustomerOrder, type SampleRider } from '@/lib/api';
import { cn } from '@/lib/cn';
import { rs } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { TotalsList } from './cart-view';
import { PageHeader } from './store-chrome';
import { useStore } from './store-context';

type StepName = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'RIDER_ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'PICKED_UP';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** The steps' wording; Dine-in borrows the pickup steps, so its last step reads "Served". */
function stepName(order: CustomerOrder, step: OrderStatus): string {
  return order.mode === 'DINE_IN' && step === 'PICKED_UP' ? t('track.stepServed') : t(`track.stepNames.${step as StepName}`);
}

function statusLine(order: CustomerOrder): string {
  return order.mode === 'DINE_IN' && order.status === 'PICKED_UP' ? t('track.served') : STATUS_INFO[order.status].customerLabel;
}

/**
 * The private tracking page (MASTER_PROMPT.md §5.2, owner's design, screen 6): reached only through its long random
 * link. The steps move with the labelled DEMO buttons until the backend joins this website to Restaurant OS, so nothing
 * here is called "live" (Phase 5). The map and the rider's contact are screens only: there is no GPS or rider system yet.
 */
export function TrackScreen({ token, isNew }: { token: string; isNew: boolean }) {
  const { base, cart } = useStore();
  const router = useRouter();
  const query = useApiQuery(() => getApi().getTrackedOrder(token), [token]);
  const [copied, setCopied] = useState(false);
  const header = (
    <PageHeader
      title={t('track.title')}
      back={`${base}/orders`}
      action={
        <button type="button" onClick={query.reload} aria-label={t('track.refresh')} className="grid size-11 place-items-center rounded-full text-stone-800 hover:bg-stone-100">
          <RefreshCw className="size-5" aria-hidden />
        </button>
      }
    />
  );
  if (query.loading && !query.data) return (<>{header}<ListSkeleton /></>);
  if (!query.data) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') return (<>{header}<Problem title={t('track.notFound')} /></>);
    return (<>{header}<Problem title={t('app.errorTitle')} body={query.error?.message} onRetry={query.reload} /></>);
  }
  const order = query.data;
  const rejected = order.status === 'REJECTED' || order.status === 'CANCELLED';
  const steps = trackingSteps(order.kind);
  const at = (status: OrderStatus) => order.history.find((h) => h.status === status)?.at;
  const currentIndex = steps.indexOf(order.status);
  const finished = currentIndex === steps.length - 1;
  const accepted = at('ACCEPTED');
  const estimate = accepted && !finished && !rejected ? new Date(Date.parse(accepted) + order.prepMinutes * 60_000).toISOString() : null;
  const delivery = order.mode === 'DELIVERY';
  // While a rider has the order, the customer calls the rider (owner, 2026-10-31); otherwise the restaurant.
  const riderWorking = order.status === 'RIDER_ASSIGNED' || order.status === 'OUT_FOR_DELIVERY';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href.split('?')[0] ?? '');
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const orderAgain = () => {
    for (const line of order.lines) cart.addLine(line);
    router.push(`${base}/cart`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {header}
      <div className="space-y-4">
        {isNew && !rejected && (
          <div role="status" className="flex items-center gap-3 rounded-3xl bg-green-50 p-4 text-green-900">
            <PartyPopper className="size-7 shrink-0" aria-hidden />
            <div>
              <p className="font-extrabold">{t('track.placed')}</p>
              <p className="text-sm">{t('track.placedBody')}</p>
            </div>
          </div>
        )}

        <section className={cn('flex items-center gap-3 rounded-3xl p-4 text-white', rejected ? 'bg-stone-700' : 'bg-brand')} data-track-banner>
          <span className={cn('grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-black', rejected ? 'text-stone-700' : 'text-brand')}>{order.dailyNumber}</span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold leading-tight">{t('track.order', { n: order.dailyNumber })}</h2>
            <p className="text-sm font-semibold text-white" data-track-status>
              {statusLine(order)}
            </p>
            <p className="text-xs text-white">
              {t(`mode.${order.mode}`)}
              {order.tableNumber && ` · ${t('track.tableLine', { table: order.tableNumber })}`} · {t('track.placedAt', { time: clock(order.history[0]?.at ?? '') })}
            </p>
            {estimate && <p className="text-xs text-white">{t('track.estimate', { time: clock(estimate) })}</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
          {rejected ? (
            <p className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">
              <CircleX className="mt-0.5 size-5 shrink-0" aria-hidden />
              {t('track.rejected')}
            </p>
          ) : (
            <ol aria-label={t('track.steps')}>
              {steps.map((step, index) => {
                const done = index <= currentIndex;
                const current = index === currentIndex;
                const time = at(step);
                const onTheRoad = current && !finished && step === 'OUT_FOR_DELIVERY';
                return (
                  <li key={step} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? 'step' : undefined} data-step={step} data-done={done}>
                    {index < steps.length - 1 && <span aria-hidden className={cn('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', index < currentIndex ? 'bg-green-600' : 'bg-stone-200')} />}
                    <span className={cn('z-10 grid size-8 shrink-0 place-items-center rounded-full', done ? 'bg-green-600 text-white' : 'border-2 border-stone-200 bg-white text-stone-400', current && !finished && 'ring-4 ring-green-100')}>
                      {onTheRoad ? <Bike className="size-4" aria-hidden /> : done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <span className="text-xs font-bold">{index + 1}</span>}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className={cn('block text-sm', done ? 'font-extrabold' : 'font-semibold text-stone-500')}>{stepName(order, step)}</span>
                      {done && <span className="block text-xs text-stone-500">{t(`track.stepHints.${step as StepName}`)}</span>}
                    </span>
                    {time && <span className="pt-0.5 text-xs font-semibold tabular-nums text-stone-500">{clock(time)}</span>}
                  </li>
                );
              })}
            </ol>
          )}

        </section>

        {delivery && !rejected && <MapArea onTheWay={order.status === 'OUT_FOR_DELIVERY'} />}
        {riderWorking && order.rider && <RiderCard rider={order.rider} />}

        {/* DEMO: stands in for Restaurant OS */}
        {!rejected && !finished && (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3">
            <p className="mb-2 text-xs font-semibold text-amber-800">{t('track.demoHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => getDemoControls().nextOrderStep(order.token)} disabled={!nextTrackingStep(order.kind, order.status)}>
                {t('track.demoNext')}
              </Button>
              {order.status === 'PLACED' && (
                <Button variant="ghost" onClick={() => getDemoControls().rejectOrder(order.token)}>
                  {t('track.demoReject')}
                </Button>
              )}
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight">{t('track.items')}</h2>
          <ul className="mb-3 space-y-2 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold">
                    {formatQuantity(item.quantity, item.unit)} {item.name}
                  </span>
                  {(item.variantName || item.modifiers.length > 0 || item.note) && (
                    <span className="block text-xs text-stone-500">{[item.variantName, ...item.modifiers, item.note && `“${item.note}”`].filter(Boolean).join(' · ')}</span>
                  )}
                </span>
                <span className="font-semibold tabular-nums">{rs(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-stone-100 pt-3">
            <TotalsList totals={order.totals} />
          </div>
          {!rejected && (
            <p className={cn('mt-3 rounded-2xl p-3 text-sm font-bold', order.payment === 'CASH' ? 'bg-stone-50' : 'bg-amber-50 text-amber-900')} data-track-payment>
              {order.payment === 'CASH' ? t('track.payCash', { total: rs(order.totals.total) }) : t('track.payNotConnected', { method: t(`checkout.pay.${order.payment}`) })}
            </p>
          )}
          <p className="mt-3 text-sm text-stone-600">
            <span className="font-bold text-stone-800">{delivery ? t('track.deliverTo') : order.mode === 'DINE_IN' ? t('track.tableLine', { table: order.tableNumber }) : t('track.pickupFrom')}</span>
            {delivery && `: ${order.customerAddress}`}
          </p>
        </section>

        <div className="flex flex-wrap gap-2">
          {!riderWorking && (
            <a href={`tel:${order.restaurantPhone}`} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand-soft px-4 text-sm font-bold text-brand hover:bg-brand-line">
              <Phone className="size-4" aria-hidden />
              {t('track.call')}
            </a>
          )}
          <Button variant="secondary" onClick={() => void copy()}>
            <Copy className="size-4" aria-hidden />
            {copied ? t('track.copied') : t('track.copy')}
          </Button>
          <Button variant="secondary" onClick={orderAgain}>
            <RotateCcw className="size-4" aria-hidden />
            {t('track.orderAgain')}
          </Button>
          <Link href={base} className="inline-flex min-h-12 items-center rounded-2xl px-4 text-sm font-bold text-stone-600 hover:bg-stone-100">
            {t('track.backToMenu')}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** A drawing that holds the place of a map: no GPS and no map service (P11, paid, needs approval). */
function MapArea({ onTheWay }: { onTheWay: boolean }) {
  return (
    <figure className="overflow-hidden rounded-3xl border border-stone-200 bg-stone-100" data-map>
      <figcaption className="flex flex-wrap items-center gap-2 bg-white px-3 py-2 text-xs font-semibold text-stone-700">
        <NotConnected />
        {t('track.map')}
      </figcaption>
      <svg viewBox="0 0 360 170" className="block h-44 w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round">
          <path d="M-10 40H370M-10 120H370M70 -10V180M190 -10V180M300 -10V180" />
        </g>
        <path d="M70 120H190V40H300" fill="none" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 9" />
        <circle cx="70" cy="120" r="15" className="fill-brand" />
        <text x="70" y="126" textAnchor="middle" fontSize="16">🏠</text>
        <circle cx="300" cy="40" r="15" fill="#1c1917" />
        <text x="300" y="46" textAnchor="middle" fontSize="16">🍽️</text>
        {onTheWay && (
          <g>
            <text x="190" y="92" textAnchor="middle" fontSize="26">
              🛵
            </text>
            <rect x="205" y="74" width="122" height="26" rx="13" fill="#fff" stroke="#e7e5e4" />
            <text x="266" y="91" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1c1917">
              {t('track.onTheWay')}
            </text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/**
 * The customer reaches the rider from here. The rider's details are made up until the Rider App exists (Phase 3) and the
 * backend joins it, so the buttons explain themselves instead of dialling a number that belongs to nobody we know.
 * Then they become a plain phone call and a free WhatsApp link: no paid service.
 */
function RiderCard({ rider }: { rider: SampleRider }) {
  const { notify } = useStore();
  const initials = rider.name.split(' ').map((part) => part[0]).join('').slice(0, 2);
  const explain = () => notify(t('track.riderDemo', { name: rider.name }));
  return (
    <section className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm" data-rider-card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-extrabold">{t('track.riderTitle')}</h2>
        <NotConnected />
      </div>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-accent font-black text-stone-900">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{rider.name}</p>
          <p className="text-xs text-stone-500">{t('track.riderSample', { plate: rider.plate })}</p>
        </div>
        <button type="button" onClick={explain} aria-label={t('track.riderWhatsapp')} className="grid size-11 shrink-0 place-items-center rounded-full bg-green-600 text-white hover:bg-green-700">
          <MessageCircle className="size-5" aria-hidden />
        </button>
        <button type="button" onClick={explain} aria-label={t('track.riderCall')} className="grid size-11 shrink-0 place-items-center rounded-full border border-stone-300 bg-white text-stone-800 hover:bg-stone-50">
          <Phone className="size-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}

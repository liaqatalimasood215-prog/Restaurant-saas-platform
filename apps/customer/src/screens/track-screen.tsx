'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, CircleX, Copy, PartyPopper, Phone, RotateCcw } from 'lucide-react';
import { STATUS_INFO, formatPaisa, formatQuantity, nextTrackingStep, trackingSteps, type OrderStatus } from '@restaurant-saas/shared';
import { Button, Loading, Problem } from '@/components/ui';
import { t } from '@/i18n';
import { ApiError, getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { TotalsList } from './cart-view';
import { useStore } from './store-shell';

type StepName = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'RIDER_ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'PICKED_UP';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * The private tracking page (MASTER_PROMPT.md §5.2): reached only through its long random link. The steps move
 * with the labelled DEMO buttons until the backend joins this website to Restaurant OS (live updates: Phase 5).
 */
export function TrackScreen({ token, isNew }: { token: string; isNew: boolean }) {
  const { base, cart } = useStore();
  const router = useRouter();
  const query = useApiQuery(() => getApi().getTrackedOrder(token), [token]);
  const [copied, setCopied] = useState(false);
  if (query.loading && !query.data) return <Loading />;
  if (!query.data) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') return <Problem title={t('track.notFound')} />;
    return <Problem title={t('app.errorTitle')} body={query.error?.message} onRetry={query.reload} />;
  }
  const order = query.data;
  const rejected = order.status === 'REJECTED' || order.status === 'CANCELLED';
  const steps = trackingSteps(order.kind);
  const at = (status: OrderStatus) => order.history.find((h) => h.status === status)?.at;
  const currentIndex = steps.indexOf(order.status);
  const finished = currentIndex === steps.length - 1;
  const accepted = at('ACCEPTED');
  const estimate = accepted && !finished && !rejected ? new Date(Date.parse(accepted) + order.prepMinutes * 60_000).toISOString() : null;

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
    <div className="mx-auto max-w-3xl space-y-4">
      {isNew && !rejected && (
        <div role="status" className="flex items-center gap-3 rounded-3xl bg-green-50 p-4 text-green-900">
          <PartyPopper className="size-7 shrink-0" aria-hidden />
          <div>
            <p className="font-extrabold">{t('track.placed')}</p>
            <p className="text-sm">{t('track.placedBody')}</p>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-stone-500">
              {order.kind === 'DELIVERY' ? t('track.delivery') : t('track.pickup')} · {t('track.placedAt', { time: clock(order.history[0]?.at ?? '') })}
            </p>
            <h1 className="text-3xl font-black tracking-tight">{t('track.title', { n: order.dailyNumber })}</h1>
            <p className={cn('mt-1 font-bold', rejected ? 'text-red-700' : 'text-brand')} data-track-status>
              {STATUS_INFO[order.status].customerLabel}
            </p>
            {estimate && <p className="text-sm text-stone-600">{t('track.estimate', { time: clock(estimate) })}</p>}
          </div>
          <a href={`tel:${order.restaurantPhone}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand-soft px-4 text-sm font-bold text-brand hover:bg-brand-line">
            <Phone className="size-4" aria-hidden />
            {t('track.call')}
          </a>
        </div>

        {rejected ? (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-800">
            <CircleX className="mt-0.5 size-5 shrink-0" aria-hidden />
            {t('track.rejected')}
          </p>
        ) : (
          <ol className="mt-5" aria-label={t('track.steps')}>
            {steps.map((step, index) => {
              const done = index <= currentIndex;
              const current = index === currentIndex;
              const time = at(step);
              return (
                <li key={step} className="relative flex gap-3 pb-5 last:pb-0" aria-current={current ? 'step' : undefined} data-step={step} data-done={done}>
                  {index < steps.length - 1 && <span aria-hidden className={cn('absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5', index < currentIndex ? 'bg-brand' : 'bg-stone-200')} />}
                  <span className={cn('z-10 grid size-8 shrink-0 place-items-center rounded-full', done ? 'bg-brand text-white' : 'border-2 border-stone-200 bg-white text-stone-400', current && 'ring-4 ring-brand-line')}>
                    {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <span className="text-xs font-bold">{index + 1}</span>}
                  </span>
                  <span className="pt-1">
                    <span className={cn('block text-sm', done ? 'font-extrabold' : 'font-semibold text-stone-500')}>{t(`track.stepNames.${step as StepName}`)}</span>
                    {time && <span className="block text-xs text-stone-500">{clock(time)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {/* DEMO: stands in for Restaurant OS */}
        {!rejected && !finished && (
          <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3">
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
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
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
              <span className="font-semibold tabular-nums">{formatPaisa(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t border-stone-100 pt-3">
          <TotalsList totals={order.totals} />
        </div>
        {!rejected && <p className="mt-3 rounded-2xl bg-stone-50 p-3 text-sm font-bold">{t('track.payCash', { total: formatPaisa(order.totals.total) })}</p>}
        <p className="mt-3 text-sm text-stone-600">
          <span className="font-bold text-stone-800">{order.kind === 'DELIVERY' ? t('track.deliverTo') : t('track.pickupFrom')}</span>
          {order.kind === 'DELIVERY' && `: ${order.customerAddress}`}
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
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
  );
}

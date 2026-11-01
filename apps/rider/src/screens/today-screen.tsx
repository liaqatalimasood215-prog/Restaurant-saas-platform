'use client';

import { useState, type ReactNode } from 'react';
import { Banknote, Bike, CalendarDays, ChevronDown, Coins, Gift, HandCoins, History, Landmark, Truck, Wallet } from 'lucide-react';
import { formatPaisa } from '@restaurant-saas/shared';
import { ScreenTop } from '@/components/rider-header';
import { BlockSkeleton, Button, Card, LinkRow, Problem } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { dateLabel, daysAgoKey } from '@/lib/dates';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useRider } from './rider-context';

const DAYS_TO_CHOOSE = 7;

/**
 * Today Summary (owner's picture, screen 6). The rider's earnings and the restaurant's COD cash are two separate cards: the
 * picture lists the cash above Total Earnings, but that cash is never earnings (owner, 2026-11-01).
 */
export function TodayScreen() {
  const { base, notify, explainDemo } = useRider();
  const todayKey = daysAgoKey(0);
  const [date, setDate] = useState(todayKey);
  const [busy, setBusy] = useState(false);
  const summary = useApiQuery(() => getApi().getDaySummary(date), [date]);
  const source = getDemoControls().source();
  const days = Array.from({ length: DAYS_TO_CHOOSE }, (_, i) => daysAgoKey(i));

  const handOver = async () => {
    setBusy(true);
    try {
      await getDemoControls().handOverCash();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('app.errorBody'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const shown = summary.data?.date === date ? summary.data : undefined;
  return (
    <div className="space-y-3">
      <ScreenTop title={t('today.title')} backHref={base} onExplain={explainDemo} />
      <label className="relative flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-card px-4 shadow-sm">
        <CalendarDays className="size-5 shrink-0" aria-hidden />
        <span className="sr-only">{t('today.dayLabel')}</span>
        <select value={date} onChange={(e) => setDate(e.target.value)} data-day className="min-h-12 min-w-0 flex-1 appearance-none bg-transparent pr-6 font-bold outline-none">
          {days.map((day) => <option key={day} value={day}>{dateLabel(day)}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 size-5" aria-hidden />
      </label>

      {!shown && summary.error ? (
        <Problem title={t('app.errorTitle')} body={summary.error.message} onRetry={summary.reload} />
      ) : !shown ? (
        <BlockSkeleton />
      ) : (
        <>
          {shown.earnings ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-brand p-4 text-white" data-earnings-card>
                <Wallet className="size-9 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{date === todayKey ? t('today.earningsToday') : t('today.earningsDay')}</p>
                  <p className="text-3xl font-black tabular-nums" data-earnings-total>{formatPaisa(shown.earnings.total)}</p>
                </div>
                <Coins className="size-10 shrink-0 text-gold" aria-hidden />
              </div>
              <Card className="divide-y divide-line py-1">
                <Row today="delivered" icon={<Truck className="size-5" aria-hidden />} label={t('today.delivered')} value={String(shown.totals.delivered)} />
                <Row today="fees" icon={<Bike className="size-5" aria-hidden />} label={t('today.fees')} value={formatPaisa(shown.earnings.deliveryFees)} />
                <Row today="tips" icon={<HandCoins className="size-5" aria-hidden />} label={t('today.tips')} value={formatPaisa(shown.earnings.tips)} />
                <Row today="bonus" icon={<Gift className="size-5 text-brand" aria-hidden />} label={t('today.bonus')} value={formatPaisa(shown.earnings.bonus)} />
                <Row today="total" strong label={t('today.total')} value={formatPaisa(shown.earnings.total)} />
              </Card>
              <p className="px-1 text-xs font-semibold text-amber-800" data-earnings-status="DEMO">{t('today.earningsDemo')}</p>
            </>
          ) : (
            <Card className="divide-y divide-line py-1">
              <Row today="delivered" icon={<Truck className="size-5" aria-hidden />} label={t('today.delivered')} value={String(shown.totals.delivered)} />
              <p className="py-3 text-sm font-semibold text-amber-800" data-earnings-status={source === 'SAMPLE' ? 'NONE' : 'NOT_CONNECTED'}>
                {source === 'SAMPLE' ? t('today.earningsNone') : t('today.earningsNotConnected')}
              </p>
            </Card>
          )}

          <Card className="py-3" data-cash-card>
            <h2 className="font-extrabold">{t('today.cashTitle')}</h2>
            <p className="text-xs text-muted">{t('today.cashNote')}</p>
            <div className="mt-1 divide-y divide-line">
              <Row today="collected" icon={<Banknote className="size-5 text-success" aria-hidden />} label={t('today.collected')} value={formatPaisa(shown.totals.cashCollected)} />
              <Row today="settled" icon={<Landmark className="size-5" aria-hidden />} label={t('today.settled')} value={formatPaisa(shown.totals.cashSettled)} />
              <Row today="withMe" strong label={t('today.withMe')} value={formatPaisa(shown.totals.cashWithRider)} />
            </div>
            {source === 'SAMPLE' && date === todayKey && shown.totals.cashWithRider > 0 && (
              <Button variant="demo" className="mt-2 w-full" disabled={busy} onClick={() => void handOver()}>
                {t('demo.handOver')}
              </Button>
            )}
          </Card>
        </>
      )}

      <LinkRow href={`${base}/history`} icon={<History className="size-6 shrink-0 text-ink" aria-hidden />}>
        {t('history.title')}
      </LinkRow>
    </div>
  );
}

function Row({ today, icon, label, value, strong }: { today: string; icon?: ReactNode; label: string; value: string; strong?: boolean }) {
  return (
    <div data-today={today} className={cn('flex min-h-11 items-center gap-3 py-2', strong && 'font-extrabold')}>
      {icon}
      <span className="min-w-0 flex-1 text-sm">{label}</span>
      <span className={cn('shrink-0 tabular-nums', strong ? 'text-lg font-black text-brand' : 'text-sm font-bold')} data-value>{value}</span>
    </div>
  );
}

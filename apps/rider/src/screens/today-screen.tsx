'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatPaisa, riderDayTotals } from '@restaurant-saas/shared';
import { Button, Card } from '@/components/ui';
import { t } from '@/i18n';
import { getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useRider } from './rider-context';

/** Today: deliveries done, cash collected, cash given to the restaurant (MASTER_PROMPT.md §7.3). */
export function TodayScreen() {
  const { base, deliveries, notify } = useRider();
  const [busy, setBusy] = useState(false);
  const totals = riderDayTotals(deliveries);
  const done = deliveries.filter((d) => d.status === 'DELIVERED').sort((a, b) => b.dailyNumber - a.dailyNumber);

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
  const tile = (label: string, value: string | number, key: string, strong = false) => (
    <Card className={cn(strong && 'bg-amber-50')} data-today={key}>
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="text-2xl font-black tabular-nums">{value}</p>
    </Card>
  );

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-black tracking-tight">{t('today.title')}</h1>
      <div className="grid grid-cols-2 gap-3">
        {tile(t('today.delivered'), totals.delivered, 'delivered')}
        {tile(t('today.collected'), formatPaisa(totals.cashCollected), 'collected')}
        {tile(t('today.settled'), formatPaisa(totals.cashSettled), 'settled')}
        {tile(t('today.withMe'), formatPaisa(totals.cashWithRider), 'withMe', totals.cashWithRider > 0)}
      </div>
      {getDemoControls().source() === 'SAMPLE' && totals.cashWithRider > 0 && (
        <Button variant="demo" className="w-full" disabled={busy} onClick={() => void handOver()}>
          {t('demo.handOver')}
        </Button>
      )}
      <h2 className="pt-1 text-lg font-extrabold">{t('today.list')}</h2>
      {done.length === 0 ? (
        <p className="rounded-3xl bg-white p-4 text-sm text-stone-600">{t('today.none')}</p>
      ) : (
        <ul className="space-y-2">
          {done.map((d) => (
            <li key={d.id}>
              <Link href={`${base}/delivery/${d.id}`} data-done-delivery={d.dailyNumber} className="flex min-h-16 items-center gap-3 rounded-3xl bg-white p-4 shadow-sm hover:bg-stone-50">
                <span className="text-xl font-black tabular-nums">#{d.dailyNumber}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{d.customerName}</span>
                <span className="text-right">
                  <span className="block font-bold tabular-nums">{formatPaisa(d.cashCollected)}</span>
                  <span className={cn('block text-xs font-bold', d.cashCollected === 0 || d.cashSettled ? 'text-green-800' : 'text-amber-800')}>
                    {d.cashCollected === 0 ? t('today.paid') : d.cashSettled ? t('today.given') : t('today.withYou')}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

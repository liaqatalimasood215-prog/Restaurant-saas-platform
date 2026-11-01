'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, History } from 'lucide-react';
import { formatPaisa } from '@restaurant-saas/shared';
import { ScreenTop } from '@/components/rider-header';
import { PaymentBadge } from '@/components/status-badge';
import { BlockSkeleton, EmptyState, Problem } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls, type RiderPastDelivery } from '@/lib/api';
import { cn } from '@/lib/cn';
import { dateLabel, daysAgoKey } from '@/lib/dates';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useRider } from './rider-context';

type DayFilter = 'TODAY' | 'YESTERDAY' | 'DATE';
type PaymentFilter = 'ALL' | 'COD' | 'PAID';

/** Finished deliveries: a day and a payment filter. An area only, never a customer's name or phone. */
export function HistoryScreen() {
  const { base, explainDemo } = useRider();
  const [day, setDay] = useState<DayFilter>('TODAY');
  const [date, setDate] = useState(daysAgoKey(2));
  const [payment, setPayment] = useState<PaymentFilter>('ALL');
  const history = useApiQuery(() => getApi().listHistory(), []);

  const wanted = day === 'TODAY' ? daysAgoKey(0) : day === 'YESTERDAY' ? daysAgoKey(1) : date;
  const shown = (history.data ?? []).filter((d) => d.date === wanted && (payment === 'ALL' || (payment === 'COD') === d.cashCollected > 0));

  return (
    <div className="space-y-3">
      <ScreenTop title={t('history.title')} backHref={`${base}/today`} onExplain={explainDemo} />
      <div role="group" aria-label={t('history.dayLabel')} className="grid grid-cols-3 gap-2">
        <Chip active={day === 'TODAY'} onClick={() => setDay('TODAY')}>{t('history.today')}</Chip>
        <Chip active={day === 'YESTERDAY'} onClick={() => setDay('YESTERDAY')}>{t('history.yesterday')}</Chip>
        <Chip active={day === 'DATE'} onClick={() => setDay('DATE')}>{t('history.date')}</Chip>
      </div>
      {day === 'DATE' && (
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-card px-3 text-sm font-bold">
          {t('history.pickDate')}
          <input type="date" value={date} max={daysAgoKey(0)} onChange={(e) => e.target.value && setDate(e.target.value)} data-history-date className="min-h-11 min-w-0 flex-1 bg-transparent text-right outline-none" />
        </label>
      )}
      <div role="group" aria-label={t('history.paymentLabel')} className="grid grid-cols-3 gap-2">
        <Chip active={payment === 'ALL'} onClick={() => setPayment('ALL')}>{t('history.all')}</Chip>
        <Chip active={payment === 'COD'} onClick={() => setPayment('COD')}>{t('payment.cod')}</Chip>
        <Chip active={payment === 'PAID'} onClick={() => setPayment('PAID')}>{t('payment.paid')}</Chip>
      </div>
      <p className="px-1 text-xs font-semibold text-amber-800">{t(getDemoControls().source() === 'SAMPLE' ? 'history.sampleNote' : 'history.linkedNote')}</p>

      {!history.data && history.error ? (
        <Problem title={t('app.errorTitle')} body={history.error.message} onRetry={history.reload} />
      ) : !history.data ? (
        <BlockSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState icon={<History className="size-10 text-muted" aria-hidden />} title={t('history.empty')}>
          {t('history.emptyBody')}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {shown.map((delivery) => (
            <li key={delivery.id}>
              <Row delivery={delivery} href={`${base}/delivery/${delivery.id}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn('min-h-11 rounded-xl border px-2 text-sm font-extrabold', active ? 'border-brand bg-brand text-white' : 'border-line bg-card text-ink')}>
      {children}
    </button>
  );
}

function Row({ delivery, href }: { delivery: RiderPastDelivery; href: string }) {
  const cod = delivery.cashCollected > 0;
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="text-lg font-black tabular-nums">#{delivery.dailyNumber}</span>
          <PaymentBadge cod={cod} />
        </p>
        <p className="text-sm">{delivery.area}</p>
        <p className="text-xs text-muted">{dateLabel(delivery.date)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-black tabular-nums">{formatPaisa(delivery.total)}</p>
        {cod && <p className={cn('text-xs font-bold', delivery.cashSettled ? 'text-success' : 'text-amber-800')}>{t(delivery.cashSettled ? 'today.given' : 'today.withYou')}</p>}
      </div>
    </>
  );
  const look = 'flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-sm';
  if (!delivery.canOpen) return <div data-history-row={delivery.dailyNumber} className={look}>{body}</div>;
  return (
    <Link href={href} aria-label={t('history.open', { n: delivery.dailyNumber })} data-history-row={delivery.dailyNumber} className={cn(look, 'hover:bg-page')}>
      {body}
      <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

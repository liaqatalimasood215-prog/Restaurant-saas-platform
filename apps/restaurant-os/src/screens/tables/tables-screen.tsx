'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Users } from 'lucide-react';
import { formatPaisa, type TableBoardEntry } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { minutesSince } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useNow } from '@/lib/hooks/use-now';
import { TABLE_TONES } from '@/lib/tones';

const ALL = 'ALL';

/** Live table board (MASTER_PROMPT.md §5.1 step 1, §7.1 Tables). Tap a table to open its order. */
export function TablesScreen() {
  const { data, error, loading, reload } = useApiQuery(() => getApi().getFloorPlan(), []);
  const [area, setArea] = useState(ALL);
  const now = useNow(30_000);

  const header = (
    <ScreenHeader title={t('nav.tables')} status="DEMO_PROTOTYPE" description={t('tables.description')} />
  );
  if (loading && !data) return (<>{header}<LoadingState /></>);
  if (!data) return (<>{header}<ErrorState message={error?.message} onRetry={reload} /></>);
  if (data.tables.length === 0) return (<>{header}<EmptyState title={t('tables.empty')} /></>);

  const visible = data.tables.filter((e) => area === ALL || e.table.areaId === area);
  const free = visible.filter((e) => e.status === 'FREE').length;

  return (
    <>
      {header}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[{ id: ALL, name: t('tables.allAreas') }, ...data.areas].map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setArea(a.id)}
            aria-pressed={area === a.id}
            className={cn(
              'min-h-12 rounded-xl px-5 text-sm font-bold',
              area === a.id ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {a.name}
          </button>
        ))}
        <span className="ml-auto text-sm font-semibold text-slate-600">{t('tables.freeCount', { n: free })}</span>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {visible.map((entry) => (
          <li key={entry.table.id}>
            <TableCard entry={entry} now={now} />
          </li>
        ))}
      </ul>
    </>
  );
}

function TableCard({ entry, now }: { entry: TableBoardEntry; now: number }) {
  const { table, status, order } = entry;
  const preparing = order?.tickets.filter((tk) => tk.status === 'NEW' || tk.status === 'PREPARING').length ?? 0;
  const ready = order?.tickets.filter((tk) => tk.status === 'READY').length ?? 0;

  return (
    <Link
      href={`/waiter?table=${table.id}`}
      className={cn(
        'flex h-full min-h-36 flex-col gap-1 rounded-2xl border-2 bg-white p-3 shadow-sm transition-colors hover:shadow-md',
        status === 'FREE' && 'border-green-200',
        status === 'OCCUPIED' && 'border-red-200 bg-red-50/40',
        status === 'BILL_REQUESTED' && 'border-amber-300 bg-amber-50/50',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl font-black text-slate-900">{table.name}</span>
        <Badge tone={TABLE_TONES[status]}>{t(`tableStatus.${status}`)}</Badge>
      </div>
      {order ? (
        <>
          <span className="text-lg font-extrabold text-slate-900">{formatPaisa(order.totals.total)}</span>
          <span className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {t('tables.guests', { n: order.guests ?? 0 })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {t('tables.minutes', { n: minutesSince(order.createdAt, now) })}
            </span>
          </span>
          {entry.waiterName && <span className="truncate text-xs text-slate-500">{entry.waiterName}</span>}
          {(preparing > 0 || ready > 0) && (
            <span className={cn('mt-auto text-xs font-bold', ready > 0 ? 'text-green-700' : 'text-orange-700')}>
              {t('tables.kitchenProgress', { preparing, ready })}
            </span>
          )}
        </>
      ) : (
        <span className="mt-auto text-xs text-slate-500">{t('tables.seats', { n: table.seats })}</span>
      )}
    </Link>
  );
}

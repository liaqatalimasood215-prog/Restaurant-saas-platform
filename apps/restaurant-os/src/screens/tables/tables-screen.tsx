'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, Clock, LayoutGrid, Pencil, Plus, Search, Sparkles, Users } from 'lucide-react';
import { TABLE_STATUSES, formatPaisa, type TableBoardEntry, type TableStatus } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { minutesSince } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useNow } from '@/lib/hooks/use-now';
import { useSession } from '@/lib/session';
import { TABLE_TONES } from '@/lib/tones';
import { AddTableDialog, EditTableDialog, ManageAreasDialog } from './table-setup';

const ALL = 'ALL';

type Dialogs = { kind: 'areas' } | { kind: 'add' } | { kind: 'edit'; tableId: string } | null;

/**
 * Live table board (MASTER_PROMPT.md §5.1 step 1, §7.1 Tables) with search, area and status filters.
 * Owner and Manager also set up areas and tables here (owner, 2026-10-29). Tables, POS and Waiter
 * Orders read the same floor plan from the ApiClient.
 */
export function TablesScreen() {
  const { allowed } = useSession();
  const canManage = allowed('tables.manage');
  const canClean = allowed('table.clean');
  const { data, error, loading, reload } = useApiQuery(() => getApi().getFloorPlan(), []);
  const setup = useApiQuery(() => (canManage ? getApi().getTableSetup() : Promise.resolve(null)), [canManage]);
  const toast = useToast();
  const [area, setArea] = useState(ALL);
  const [status, setStatus] = useState<TableStatus | typeof ALL>(ALL);
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialogs>(null);
  const now = useNow(30_000);

  const header = (
    <ScreenHeader
      title={t('nav.tables')}
      status="DEMO_PROTOTYPE"
      description={t('tables.description')}
      actions={
        canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!setup.data} onClick={() => setDialog({ kind: 'areas' })}>
              <LayoutGrid className="size-5" aria-hidden />
              {t('tables.manageAreas')}
            </Button>
            <Button disabled={!setup.data} onClick={() => setDialog({ kind: 'add' })}>
              <Plus className="size-5" aria-hidden />
              {t('tables.addTable')}
            </Button>
          </div>
        )
      }
    />
  );
  const dialogs = setup.data && dialog && (
    <>
      {dialog.kind === 'areas' && <ManageAreasDialog setup={setup.data} onClose={() => setDialog(null)} />}
      {dialog.kind === 'add' && <AddTableDialog setup={setup.data} defaultAreaId={area === ALL ? null : area} onClose={() => setDialog(null)} />}
      {dialog.kind === 'edit' && <EditTableDialog setup={setup.data} tableId={dialog.tableId} onClose={() => setDialog(null)} />}
    </>
  );
  if (loading && !data) return (<>{header}<LoadingState /></>);
  if (!data) return (<>{header}<ErrorState message={error?.message} onRetry={reload} /></>);
  if (data.tables.length === 0) return (<>{header}<EmptyState title={t('tables.empty')} />{dialogs}</>);

  const search = query.trim().toLowerCase();
  const areaName = (id: string) => data.areas.find((a) => a.id === id)?.name ?? '';
  const matches = data.tables.filter(
    (e) =>
      (area === ALL || e.table.areaId === area) &&
      (!search || [e.table.name, areaName(e.table.areaId), e.waiterName ?? ''].some((text) => text.toLowerCase().includes(search))),
  );
  const visible = matches.filter((e) => status === ALL || e.status === status);
  const free = matches.filter((e) => e.status === 'FREE').length;

  const markCleaning = async (entry: TableBoardEntry, cleaning: boolean) => {
    try {
      await getApi().setTableCleaning(entry.table.id, cleaning);
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  return (
    <>
      {header}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('tables.search')}
            aria-label={t('tables.search')}
            className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
          />
        </label>
        <div role="group" aria-label={t('tables.areaFilter')} className="flex flex-wrap gap-2">
          {[{ id: ALL, name: t('tables.allAreas') }, ...data.areas].map((a) => (
            <FilterChip key={a.id} active={area === a.id} onClick={() => setArea(a.id)}>
              {a.name}
            </FilterChip>
          ))}
        </div>
        <span className="ml-auto text-sm font-semibold text-slate-600">{t('tables.freeCount', { n: free })}</span>
      </div>
      <div role="group" aria-label={t('tables.statusFilter')} className="mb-4 flex flex-wrap gap-2">
        <FilterChip active={status === ALL} onClick={() => setStatus(ALL)} small>
          {t('tables.allStatuses')} · {matches.length}
        </FilterChip>
        {TABLE_STATUSES.map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => setStatus(s)} small>
            {t(`tableStatus.${s}`)} · {matches.filter((e) => e.status === s).length}
          </FilterChip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title={t('tables.noMatch')} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((entry) => (
            <li key={entry.table.id}>
              <TableCard
                entry={entry}
                now={now}
                onCleaning={canClean ? (cleaning) => void markCleaning(entry, cleaning) : null}
                onEdit={canManage && setup.data ? () => setDialog({ kind: 'edit', tableId: entry.table.id }) : null}
              />
            </li>
          ))}
        </ul>
      )}
      {dialogs}
    </>
  );
}

function FilterChip({ active, onClick, small, children }: { active: boolean; onClick: () => void; small?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-xl font-bold',
        small ? 'min-h-10 px-3 text-xs' : 'min-h-12 px-5 text-sm',
        active ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Compact card: name, status and capacity; an occupied table also shows its bill, waiter, time seated
 * and kitchen progress. Out-of-service tables are not a link, so no bill can be opened there.
 */
function TableCard({
  entry,
  now,
  onCleaning,
  onEdit,
}: {
  entry: TableBoardEntry;
  now: number;
  onCleaning: ((cleaning: boolean) => void) | null;
  onEdit: (() => void) | null;
}) {
  const { table, status, order } = entry;
  const preparing = order?.tickets.filter((tk) => tk.status === 'NEW' || tk.status === 'PREPARING').length ?? 0;
  const ready = order?.tickets.filter((tk) => tk.status === 'READY').length ?? 0;
  const outOfService = status === 'OUT_OF_SERVICE';

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-2xl font-black text-slate-900">{table.name}</span>
        <Badge tone={TABLE_TONES[status]}>{t(`tableStatus.${status}`)}</Badge>
      </div>
      {order && (
        <>
          <span className="text-lg font-extrabold text-slate-900">{formatPaisa(order.totals.total)}</span>
          <span className="flex items-center gap-2 truncate text-xs text-slate-600">
            <span className="flex shrink-0 items-center gap-1 font-semibold">
              <Clock className="size-3.5" aria-hidden />
              {t('tables.minutes', { n: minutesSince(order.createdAt, now) })}
            </span>
            {entry.waiterName && <span className="truncate">{entry.waiterName}</span>}
          </span>
          {(preparing > 0 || ready > 0) && (
            <span className={cn('text-xs font-bold', ready > 0 ? 'text-green-700' : 'text-orange-700')}>
              {t('tables.kitchenProgress', { preparing, ready })}
            </span>
          )}
        </>
      )}
      {outOfService && <span className="text-xs text-slate-500">{t('tables.outOfServiceHint')}</span>}
    </>
  );

  return (
    <div
      className={cn(
        'flex h-full min-h-32 flex-col rounded-2xl border-2 bg-white shadow-sm transition-colors',
        status === 'FREE' && 'border-green-200',
        status === 'OCCUPIED' && 'border-red-200 bg-red-50/40',
        status === 'BILL_REQUESTED' && 'border-amber-300 bg-amber-50/50',
        status === 'CLEANING' && 'border-blue-200 bg-blue-50/40',
        outOfService && 'border-dashed border-slate-300 bg-slate-50',
      )}
    >
      {outOfService ? (
        <div className="flex flex-1 flex-col gap-1 p-3 pb-1 opacity-70">{body}</div>
      ) : (
        <Link href={`/waiter?table=${table.id}`} className="flex flex-1 flex-col gap-1 rounded-t-2xl p-3 pb-1 hover:bg-white/60">
          {body}
        </Link>
      )}
      {onCleaning && status === 'CLEANING' && (
        <button
          type="button"
          onClick={() => onCleaning(false)}
          className="mx-3 inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-700"
          aria-label={t('tables.markCleanName', { name: table.name })}
        >
          <Check className="size-4" aria-hidden />
          {t('tables.markClean')}
        </button>
      )}
      <div className="flex items-center gap-1 px-3 pb-2">
        <span className="flex min-h-10 min-w-0 flex-1 items-center gap-1 whitespace-nowrap text-xs font-semibold text-slate-600">
          <Users className="size-3.5 shrink-0" aria-hidden />
          {order
            ? t('tables.guestsOfSeats', { guests: order.guests ?? 0, seats: table.seats })
            : t('tables.seats', { n: table.seats })}
        </span>
        {onCleaning && status === 'FREE' && (
          <button
            type="button"
            onClick={() => onCleaning(true)}
            className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label={t('tables.markCleaningName', { name: table.name })}
            title={t('tables.markCleaningName', { name: table.name })}
          >
            <Sparkles className="size-4" aria-hidden />
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label={t('tables.editTable', { name: table.name })}
            title={t('tables.editTable', { name: table.name })}
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

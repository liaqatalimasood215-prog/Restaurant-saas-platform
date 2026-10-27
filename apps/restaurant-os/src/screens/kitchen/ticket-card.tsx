'use client';

import {
  TICKET_UNDO_WINDOW_MS,
  formatQuantity,
  ticketTimerLevel,
  type KitchenStation,
  type KitchenTicketView,
  type TicketStatus,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { timerText } from '@/lib/format';

/** One kitchen ticket, readable from 2 metres (MASTER_PROMPT.md §7.1 Kitchen Display, §11). */
export function TicketCard({
  view,
  station,
  showStation,
  now,
  busy,
  onMove,
}: {
  view: KitchenTicketView;
  station: KitchenStation | undefined;
  showStation: boolean;
  now: number;
  busy: boolean;
  onMove: (to: TicketStatus) => void;
}) {
  const { ticket } = view;
  const allVoid = view.items.length > 0 && view.items.every((i) => i.isVoid);
  const level =
    ticket.status === 'READY'
      ? 'ON_TIME'
      : ticketTimerLevel(Date.parse(ticket.createdAt), now, station?.warnMinutes, station?.lateMinutes);
  const undoLeft = ticket.readyAt
    ? Math.ceil((TICKET_UNDO_WINDOW_MS - (now - Date.parse(ticket.readyAt))) / 1000)
    : 0;
  const title = view.tableName ?? `${t(`orderType.${view.orderType}`)} ${t('kitchen.order', { n: view.dailyNumber })}`;

  return (
    <article
      className={cn(
        'rounded-2xl border-2 bg-white p-4 shadow-sm',
        level === 'WARN' && 'border-orange-400',
        level === 'LATE' && 'border-red-500',
        level === 'ON_TIME' && 'border-slate-200',
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-3xl font-black leading-none text-slate-900">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {t('kitchen.round', { n: ticket.roundNo })}
            {view.tableName && ` · ${t('kitchen.order', { n: view.dailyNumber })}`}
            {showStation && station && ` · ${station.name}`}
          </p>
          {view.waiterName && <p className="text-xs text-slate-500">{t('kitchen.waiter', { name: view.waiterName })}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={view.orderType === 'DINE_IN' ? 'grey' : 'blue'}>{t(`orderType.${view.orderType}`)}</Badge>
          <span
            className={cn(
              'rounded-lg px-2 py-1 text-xl font-black tabular-nums',
              level === 'ON_TIME' && 'bg-slate-100 text-slate-800',
              level === 'WARN' && 'bg-orange-100 text-orange-800',
              level === 'LATE' && 'bg-red-100 text-red-800',
            )}
          >
            {/* Ready tickets show how long they took; the others keep counting. */}
            {timerText(ticket.createdAt, ticket.status === 'READY' && ticket.readyAt ? Date.parse(ticket.readyAt) : now)}
          </span>
        </div>
      </header>

      <ul className="space-y-2">
        {view.items.map((item) => (
          <li key={item.id} className={cn('text-xl leading-snug', item.isVoid && 'text-red-700')}>
            <span className={cn('font-extrabold', item.isVoid && 'line-through')}>
              {formatQuantity(item.quantity, item.unit)} {item.name}
            </span>
            {item.variantName && <span className={cn('font-semibold', item.isVoid && 'line-through')}> ({item.variantName})</span>}
            {item.isVoid && (
              <Badge tone="red" className="ml-2 align-middle text-sm">
                {t('waiter.voided')}
              </Badge>
            )}
            {item.modifiers.length > 0 && (
              <span className="block text-base font-semibold text-slate-700">
                {item.modifiers.map((m) => `+ ${m.name}`).join('  ')}
              </span>
            )}
            {item.note && (
              <span className="mt-1 block rounded-lg bg-amber-100 px-2 py-1 text-base font-bold text-amber-900">
                “{item.note}”
              </span>
            )}
            {item.isVoid && item.voidReason && (
              <span className="block text-sm font-semibold">{item.voidReason}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {allVoid && (
          <p className="rounded-xl bg-red-100 px-3 py-3 text-center text-lg font-black text-red-800">{t('kitchen.voidTicket')}</p>
        )}
        {!allVoid && ticket.status === 'NEW' && (
          <Button size="lg" className="w-full bg-blue-600 text-lg hover:bg-blue-700" disabled={busy} onClick={() => onMove('PREPARING')}>
            {t('kitchen.start')}
          </Button>
        )}
        {!allVoid && ticket.status === 'PREPARING' && (
          <Button size="lg" className="w-full bg-green-600 text-lg hover:bg-green-700" disabled={busy} onClick={() => onMove('READY')}>
            {t('kitchen.ready')}
          </Button>
        )}
        {!allVoid && ticket.status === 'READY' && undoLeft > 0 && (
          <Button size="lg" variant="secondary" className="w-full" disabled={busy} onClick={() => onMove('PREPARING')}>
            {t('kitchen.undo', { s: undoLeft })}
          </Button>
        )}
      </div>
    </article>
  );
}

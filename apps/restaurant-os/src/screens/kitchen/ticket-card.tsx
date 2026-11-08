'use client';

import { useState } from 'react';
import { AlarmClock, Armchair, Bike, Check, ChevronDown, HandPlatter, Play, ShoppingBag, Timer, Undo2, UtensilsCrossed } from 'lucide-react';
import {
  DEFAULT_LATE_MINUTES,
  PICKUP_VISIBLE_MS,
  TICKET_UNDO_WINDOW_MS,
  dishTotals,
  formatKg,
  formatQuantity,
  ticketTimerLevel,
  waitingTooLong,
  type DishTotal,
  type KitchenStation,
  type KitchenTicketView,
  type OrderItem,
  type OrderType,
  type TicketStatus,
} from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { timerText } from '@/lib/format';

/** Lines shown before "+ n more" (owner, 2026-11-08: long orders open for full details). */
const SHORT_LINES = 3;

const TYPE_ICON: Record<OrderType, typeof Bike> = { DINE_IN: UtensilsCrossed, DELIVERY: Bike, TAKEAWAY: ShoppingBag };

/** The coloured stripe of each column (owner's picture): New red, Preparing amber, Ready green. */
const STRIPE: Record<TicketStatus, string> = {
  NEW: 'before:bg-brand',
  PREPARING: 'before:bg-amber-500',
  READY: 'before:bg-green-600',
  SERVED: 'before:bg-slate-400',
};

/** "1.5 kg", "3 × Full plate + 1 × Half plate", "5" */
function totalText(total: DishTotal): string {
  if (total.kind === 'WEIGHT') return formatKg(total.grams);
  if (total.kind === 'SIZES') return total.sizes.map((s) => `${s.count} × ${s.name}`).join(' + ');
  return formatQuantity(total.quantity, total.unit).replace(/ ×$/, '');
}

/** "×2" for pieces and sized items; "2 kg", "1 plate" for items sold by weight or plate without a size. */
function quantityText(item: OrderItem): string {
  return item.unit === 'piece' || item.variantName ? `×${item.quantity}` : formatQuantity(item.quantity, item.unit);
}

/** 4:12 */
const clockText = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * One kitchen ticket, compact for a budget landscape tablet (owner's picture 2026-11-08, smaller again 2026-11-09): order number,
 * type, table, station and timer in one row; each item with its size chip and quantity, add-ons and notes; Start / Ready beside
 * it. Long tickets show 3 lines and open for the rest. Ready food waits for the waiter's (or rider's, counter's) pickup: after it
 * the card says who took it, counts down 5 minutes (Undo for a waiter's pickup) and then hides; food nobody takes for 10 minutes
 * gets a warning. MASTER_PROMPT.md §7.1 Kitchen Display, §11.
 */
export function TicketCard({
  view,
  station,
  showStation,
  now,
  busy,
  onMove,
  onUndoPickup,
}: {
  view: KitchenTicketView;
  station: KitchenStation | undefined;
  showStation: boolean;
  now: number;
  busy: boolean;
  onMove: (to: TicketStatus) => void;
  /** The signed-in person may undo a waiter's pickup (kitchen of this station, Owner, Manager, waiters) */
  onUndoPickup?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { ticket, pickup } = view;
  const allVoid = view.items.length > 0 && view.items.every((i) => i.isVoid);
  const sentAt = Date.parse(ticket.createdAt);
  const done = ticket.status === 'READY' || ticket.status === 'SERVED';
  const level = done ? 'ON_TIME' : ticketTimerLevel(sentAt, now, station?.warnMinutes, station?.lateMinutes);
  const undoLeft = ticket.readyAt ? Math.ceil((TICKET_UNDO_WINDOW_MS - (now - Date.parse(ticket.readyAt))) / 1000) : 0;
  // The tablet's clock can be a moment behind the phone that pressed Picked up: never more than 5:00
  const hidesIn = pickup ? Math.min(PICKUP_VISIBLE_MS, PICKUP_VISIBLE_MS - (now - Date.parse(pickup.at))) : 0;
  const waiting = waitingTooLong(ticket, Boolean(pickup), now);
  const totals = dishTotals(view.items);
  const hidden = Math.max(0, view.items.length - SHORT_LINES);
  const lines = open ? view.items : view.items.slice(0, SHORT_LINES);
  // Preparing: how much of the station's "late" time has gone (the picture's bar)
  const lateMs = (station?.lateMinutes ?? DEFAULT_LATE_MINUTES) * 60_000;
  const progress = Math.min(1, Math.max(0, (now - sentAt) / lateMs));
  const TypeIcon = TYPE_ICON[view.orderType];
  const pickupText = !pickup
    ? ''
    : pickup.source === 'SERVED'
      ? t('kitchen.servedNow')
      : pickup.source === 'ORDER'
        ? view.orderType === 'DELIVERY'
          ? t('kitchen.pickedRider')
          : t('kitchen.pickedCounter')
        : pickup.byName
          ? t('kitchen.pickedBy', { name: pickup.byName })
          : t('kitchen.pickedUp');

  const big = 'press flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-[15px] font-extrabold disabled:opacity-60';
  const action = allVoid ? (
    <p className="rounded-lg bg-red-100 px-2 py-1.5 text-center text-xs font-black text-red-800">{t('kitchen.voidTicket')}</p>
  ) : pickup ? (
    pickup.source === 'TICKET' && ticket.status === 'READY' && onUndoPickup ? (
      <button type="button" onClick={onUndoPickup} className={cn(big, 'border-2 border-slate-300 bg-white text-[13px] text-slate-700')} aria-label={t('pickup.undoLabel')}>
        <Undo2 className="size-4" aria-hidden />
        {t('kitchen.undoPickup')}
      </button>
    ) : null
  ) : ticket.status === 'NEW' ? (
    <button type="button" disabled={busy} onClick={() => onMove('PREPARING')} className={cn(big, 'bg-brand-gradient text-white shadow-brand')}>
      <Play className="size-4 fill-current" aria-hidden />
      {t('kitchen.start')}
    </button>
  ) : ticket.status === 'PREPARING' ? (
    <button type="button" disabled={busy} onClick={() => onMove('READY')} className={cn(big, 'bg-amber-500 text-white shadow-sm hover:bg-amber-600')}>
      <Check className="size-5" aria-hidden />
      {t('kitchen.ready')}
    </button>
  ) : ticket.status === 'READY' && undoLeft > 0 ? (
    <button type="button" disabled={busy} onClick={() => onMove('PREPARING')} className={cn(big, 'border-2 border-green-600 bg-white px-1 text-[13px] whitespace-nowrap text-green-700')}>
      {t('kitchen.undo', { s: undoLeft })}
    </button>
  ) : null;

  return (
    <article
      className={cn(
        '@container relative overflow-hidden rounded-xl border bg-white py-1.5 pr-2 pl-3 shadow-[0_2px_8px_-6px_rgb(15_23_42/0.35)] before:absolute before:inset-y-0 before:left-0 before:w-1.5',
        STRIPE[ticket.status],
        pickup ? 'border-slate-200 bg-slate-50 opacity-75' : waiting ? 'border-2 border-red-400 bg-red-50/40' : level === 'LATE' ? 'border-red-400' : level === 'WARN' ? 'border-orange-300' : 'border-slate-200',
      )}
      data-kds-ticket={ticket.status}
      data-kds-order={view.dailyNumber}
      data-kds-pickup={pickup ? pickup.source : waiting ? 'WAITING' : undefined}
      title={view.waiterName ? t('kitchen.waiter', { name: view.waiterName }) : undefined}
    >
      <header className="flex items-center gap-x-1.5">
        <p className="text-lg leading-none font-black text-slate-900 tabular-nums">{t('kitchen.order', { n: view.dailyNumber })}</p>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand">
          <TypeIcon className="size-3" aria-hidden />
          {t(`orderType.${view.orderType}`)}
        </span>
        {view.tableName && (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[15px] font-extrabold text-slate-800">
            <Armchair className="size-3.5 text-slate-500" aria-hidden />
            {view.tableName}
          </span>
        )}
        {ticket.roundNo > 1 && <span className="shrink-0 rounded bg-slate-100 px-1 text-[11px] font-bold text-slate-600">{t('kitchen.round', { n: ticket.roundNo })}</span>}
        {showStation && station && <span className="min-w-0 truncate text-[11px] font-semibold text-slate-500">{station.name}</span>}
        <span
          className={cn(
            'ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[13px] font-black tabular-nums',
            pickup
              ? 'border-slate-200 bg-white text-slate-500'
              : waiting
                ? 'border-red-300 bg-red-50 text-red-700'
                : done
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : level === 'LATE'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : level === 'WARN'
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700',
          )}
        >
          {done ? <Check className="size-3" aria-hidden /> : <Timer className="size-3" aria-hidden />}
          {/* Ready tickets show how long they took; the others keep counting. */}
          {timerText(ticket.createdAt, done && ticket.readyAt ? Date.parse(ticket.readyAt) : now)}
        </span>
      </header>

      {/* Picked up: who took it and when the card goes; still at the pass after 10 minutes: a warning */}
      {pickup && (
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-green-800" data-pickup-line>
          <HandPlatter className="size-3.5" aria-hidden />
          <span className="min-w-0 truncate">
            {pickupText} · <span className="tabular-nums">{t('kitchen.hidesIn', { time: clockText(hidesIn) })}</span>
          </span>
        </p>
      )}
      {waiting && ticket.readyAt && (
        <p className="mt-1 flex items-center gap-1 text-xs font-black text-red-700" data-waiting-line>
          <AlarmClock className="size-3.5 animate-pulse" aria-hidden />
          {t('kitchen.waitingFor', { min: Math.floor((now - Date.parse(ticket.readyAt)) / 60_000) })}
        </p>
      )}

      <div className="mt-1 grid gap-1.5 @[16rem]:grid-cols-[minmax(0,1fr)_5.5rem] @[16rem]:items-center">
        <div className="min-w-0">
          <ul className="space-y-0.5">
            {lines.map((item) => (
              <li key={item.id} className={cn('min-w-0', item.isVoid && 'text-red-700')} data-kds-line={item.name}>
                <span className="flex flex-wrap items-center gap-x-1.5 text-base leading-snug">
                  <span className={cn('font-extrabold text-slate-900', item.isVoid && 'text-red-700 line-through')}>{item.name}</span>
                  {item.variantName && <span className={cn('rounded bg-brand-soft px-1 text-[13px] font-bold text-brand', item.isVoid && 'line-through')}>{item.variantName}</span>}
                  <span className={cn('text-[15px] font-black text-slate-900', item.isVoid && 'line-through')}>{quantityText(item)}</span>
                  {item.isVoid && <span className="rounded bg-red-100 px-1 text-[11px] font-black text-red-800">{t('waiter.voided')}</span>}
                </span>
                {item.modifiers.length > 0 && <span className="block text-[13px] leading-tight font-semibold text-slate-600">{item.modifiers.map((m) => `+ ${m.name}`).join('  ')}</span>}
                {item.note && <span className="inline-block rounded bg-amber-100 px-1 text-[13px] font-bold text-amber-900">“{item.note}”</span>}
                {item.isVoid && item.voidReason && <span className="block text-[11px] font-semibold">{item.voidReason}</span>}
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="press inline-flex min-h-8 items-center gap-1 rounded-lg px-1 text-[13px] font-bold text-brand hover:bg-brand-soft">
              <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
              {open ? t('kitchen.showLess') : t('kitchen.showMore', { n: hidden })}
            </button>
          )}
          {open && view.waiterName && <p className="text-[11px] font-semibold text-slate-500">{t('kitchen.waiter', { name: view.waiterName })}</p>}
          {/* One dish in several lines (each with its own note): the whole pot too, owner 2026-11-08 */}
          {totals.length > 0 && (
            <ul className="mt-0.5 rounded bg-blue-50 px-1.5 py-0.5" aria-label={t('kitchen.totals')}>
              {totals.map((total) => (
                <li key={total.menuItemId} className="text-[13px] font-black text-blue-900" data-dish-total={total.name}>
                  {t('kitchen.totalOf', { name: total.name, total: totalText(total) })}
                </li>
              ))}
            </ul>
          )}
        </div>
        {action}
      </div>

      {ticket.status === 'PREPARING' && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100" role="presentation">
          <div className={cn('h-full rounded-full', level === 'LATE' ? 'bg-red-500' : 'bg-amber-400')} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </article>
  );
}

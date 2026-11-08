'use client';

import type { KitchenStation, Order, OrderItem } from '@restaurant-saas/shared';
import { formatPaisa, formatQuantity } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { clockTime } from '@/lib/format';
import { PickupControls } from './pickup-controls';
import { TICKET_TONES } from '@/lib/tones';

/** Rounds already sent: one block per kitchen ticket, with its live status, Served and Void. */
export function SentRounds({
  order,
  stations,
  canServe,
  canVoid,
  busy,
  onServe,
  onPickUp,
  onUndoPickup,
  onVoid,
}: {
  order: Order;
  stations: KitchenStation[];
  canServe: boolean;
  canVoid: boolean;
  busy: boolean;
  onServe: (ticketId: string) => void;
  /** Picked up at the pass and its Undo (owner, 2026-11-09) */
  onPickUp: (ticketId: string) => void;
  onUndoPickup: (ticketId: string) => void;
  onVoid: (item: OrderItem) => void;
}) {
  const rounds = [...new Set(order.tickets.map((tk) => tk.roundNo))].sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      {rounds.map((roundNo) => {
        const tickets = order.tickets.filter((tk) => tk.roundNo === roundNo);
        return (
          <section key={roundNo}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('waiter.round', { n: roundNo })} · {t('waiter.sentAt', { time: clockTime(tickets[0]?.createdAt ?? order.createdAt) })}
            </h3>
            <ul className="space-y-2">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {stations.find((s) => s.id === ticket.stationId)?.name}
                    </span>
                    <Badge tone={TICKET_TONES[ticket.status]}>{t(`ticketStatus.${ticket.status}`)}</Badge>
                  </div>
                  <ul className="space-y-1.5">
                    {order.items
                      .filter((i) => i.ticketId === ticket.id)
                      .map((item) => (
                        <li key={item.id} className="flex items-start gap-2 text-sm">
                          <span className={cn('flex-1', item.isVoid && 'text-slate-400 line-through')}>
                            <span className="font-semibold">
                              {formatQuantity(item.quantity, item.unit)} {item.name}
                            </span>
                            {item.variantName && ` (${item.variantName})`}
                            {item.modifiers.map((m) => ` + ${m.name}`).join('')}
                            {item.note && <span className="block text-xs text-amber-700">“{item.note}”</span>}
                          </span>
                          {item.isVoid ? (
                            <Badge tone="red">{t('waiter.voided')}</Badge>
                          ) : (
                            <span className="font-semibold tabular-nums">{formatPaisa(item.lineTotal)}</span>
                          )}
                          {canVoid && !item.isVoid && (
                            <button
                              type="button"
                              onClick={() => onVoid(item)}
                              className="min-h-8 rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              {t('waiter.void')}
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                  {canServe && ticket.status === 'READY' && order.type === 'DINE_IN' && (
                    <div className="mt-3">
                      <PickupControls ticket={ticket} busy={busy} size="md" onPickUp={onPickUp} onUndo={onUndoPickup} onServe={onServe} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

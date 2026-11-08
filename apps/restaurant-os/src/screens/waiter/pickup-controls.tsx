'use client';

import { CheckCircle2, HandPlatter, Undo2 } from 'lucide-react';
import { PICKUP_VISIBLE_MS, type KitchenTicket } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';
import { useNow } from '@/lib/hooks/use-now';

/**
 * Ready food on a waiter's screen (owner, 2026-11-09): three separate steps. Picked up at the pass (the kitchen's card hides 5
 * minutes later), then Served at the table; Served may also come first. A pickup can be undone for 5 minutes.
 */
export function PickupControls({
  ticket,
  busy,
  size = 'lg',
  onPickUp,
  onUndo,
  onServe,
}: {
  ticket: Pick<KitchenTicket, 'id' | 'pickedUpAt'>;
  busy: boolean;
  size?: 'lg' | 'md';
  onPickUp: (ticketId: string) => void;
  onUndo: (ticketId: string) => void;
  onServe: (ticketId: string) => void;
}) {
  const now = useNow(1000);
  const pickedAt = ticket.pickedUpAt ? Date.parse(ticket.pickedUpAt) : null;
  const undoLeft = pickedAt === null ? 0 : Math.ceil((PICKUP_VISIBLE_MS - (now - pickedAt)) / 1000);
  const text = size === 'lg' ? 'text-lg' : 'text-base';

  if (pickedAt === null) {
    return (
      <div className="grid grid-cols-2 gap-2" data-pickup="ready">
        <Button size={size} className={`w-full ${text}`} disabled={busy} onClick={() => onPickUp(ticket.id)}>
          <HandPlatter className="size-5" aria-hidden />
          {t('pickup.pickedUp')}
        </Button>
        <Button size={size} variant="outline" className={`w-full ${text}`} disabled={busy} onClick={() => onServe(ticket.id)}>
          <CheckCircle2 className="size-5" aria-hidden />
          {t('waiter.served')}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2" data-pickup="picked">
      <p className="text-sm font-bold text-green-800">{t('pickup.pickedHint')}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Button size={size} className={`w-full bg-green-600 ${text} hover:bg-green-700`} disabled={busy} onClick={() => onServe(ticket.id)}>
          <CheckCircle2 className="size-5" aria-hidden />
          {t('waiter.served')}
        </Button>
        {undoLeft > 0 && (
          <Button size={size} variant="secondary" disabled={busy} onClick={() => onUndo(ticket.id)} aria-label={t('pickup.undoLabel')}>
            <Undo2 className="size-4" aria-hidden />
            {t('pickup.undo', { time: `${Math.floor(undoLeft / 60)}:${String(undoLeft % 60).padStart(2, '0')}` })}
          </Button>
        )}
      </div>
    </div>
  );
}

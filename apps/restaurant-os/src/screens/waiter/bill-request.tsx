'use client';

import { BellRing, CheckCircle2, Hourglass } from 'lucide-react';
import type { Order } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

/**
 * "Request Bill / Call Cashier" for a table, with what happened next: waiting for the cashier, or
 * the cashier's acknowledgement. Repeated taps send one request (the server ignores repeats).
 */
export function BillRequestControl({
  order,
  busy,
  disabled = false,
  onRequest,
}: {
  order: Order | null;
  busy: boolean;
  disabled?: boolean;
  onRequest: (orderId: string) => void;
}) {
  if (order?.status === 'BILL_REQUESTED') {
    const accepted = order.billRequest?.acceptedAt;
    return (
      <div
        role="status"
        className={
          accepted
            ? 'flex min-h-14 items-center justify-center gap-2 rounded-xl bg-green-50 px-3 text-center text-sm font-bold text-green-800'
            : 'flex min-h-14 items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 text-center text-sm font-bold text-amber-800'
        }
      >
        {accepted ? <CheckCircle2 className="size-5 shrink-0" aria-hidden /> : <Hourglass className="size-5 shrink-0" aria-hidden />}
        {accepted ? t('waiter.billAccepted') : t('waiter.billWaiting')}
      </div>
    );
  }
  return (
    <Button size="lg" variant="outline" disabled={!order || busy || disabled} onClick={() => order && onRequest(order.id)}>
      <BellRing className="size-5" aria-hidden />
      {t('waiter.requestBill')}
    </Button>
  );
}

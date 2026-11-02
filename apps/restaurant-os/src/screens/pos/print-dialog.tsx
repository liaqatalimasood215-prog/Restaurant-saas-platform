'use client';

import { Printer } from 'lucide-react';
import type { Order, PaymentEntry } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { t } from '@/i18n';
import { useSession } from '@/lib/session';
import { PrintableBill, PrintableRefundSlip, type PrintKind } from './printable-bill';

/** Preview of a refund slip with a Print button. */
export function RefundSlipDialog({ order, refund, placeLabel, refundedBy, onClose }: { order: Order; refund: PaymentEntry; placeLabel: string; refundedBy: string; onClose: () => void }) {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('print.refundSlipTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-5" aria-hidden />
            {t('print.print')}
          </Button>
        </>
      }
    >
      <div className="print-area rounded-xl bg-slate-100 p-3">
        <PrintableRefundSlip order={order} refund={refund} session={session} tableName={placeLabel} refundedBy={refundedBy} />
      </div>
    </Dialog>
  );
}

/** Preview of a pre-bill or receipt with a Print button (browser print dialog, 80 mm layout). */
export function PrintDialog({
  order,
  kind,
  placeLabel,
  waiterName,
  onClose,
}: {
  order: Order;
  kind: PrintKind;
  /** "T5", "Takeaway", "Delivery" */
  placeLabel: string;
  waiterName: string | null;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <Dialog
      open
      onClose={onClose}
      title={kind === 'PRE_BILL' ? t('print.preBillTitle') : t('print.receiptTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-5" aria-hidden />
            {t('print.print')}
          </Button>
        </>
      }
    >
      <div className="print-area rounded-xl bg-slate-100 p-3">
        <PrintableBill
          order={order}
          kind={kind}
          session={session}
          tableName={placeLabel}
          waiterName={waiterName}
          cashierName={session.user.name}
        />
      </div>
    </Dialog>
  );
}

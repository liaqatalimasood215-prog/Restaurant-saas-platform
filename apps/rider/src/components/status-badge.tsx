import type { RiderDelivery, RiderStage } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

const BADGE = 'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold';

const STAGE_LOOK: Record<RiderStage, string> = {
  NEW: 'bg-brand text-white',
  PICKED_UP: 'bg-warning-soft text-warning',
  ON_THE_WAY: 'bg-info-soft text-info',
  DELIVERED: 'bg-success-soft text-success',
};

/** The one badge for where a delivery stands. The word is always written: colour alone never says it. */
export function StatusBadge({ stage, status }: { stage: RiderStage; status: RiderDelivery['status'] }) {
  return (
    <span className={cn(BADGE, STAGE_LOOK[stage])} data-stage={stage} data-delivery-status={status}>
      {t(`stage.${stage}`)}
    </span>
  );
}

/** COD = cash to take from the customer; Paid = nothing to take. */
export function PaymentBadge({ cod }: { cod: boolean }) {
  return (
    <span className={cn(BADGE, cod ? 'border border-brand bg-brand-soft text-brand' : 'bg-success-soft text-success')} data-payment={cod ? 'COD' : 'PAID'}>
      {t(cod ? 'payment.cod' : 'payment.paid')}
    </span>
  );
}

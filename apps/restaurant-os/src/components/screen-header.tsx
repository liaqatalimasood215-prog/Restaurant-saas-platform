import type { ReactNode } from 'react';
import type { FeatureStatus } from '@restaurant-saas/shared';
import { FeatureStatusBadge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';

/**
 * Title row of every screen. PLACEHOLDER screens show their badge; working DEMO screens rely on the
 * one "Demo mode" indicator in the header (owner decision 2026-10-28).
 */
export function ScreenHeader({
  title,
  status,
  description,
  actions,
  compact = false,
}: {
  title: string;
  status: FeatureStatus;
  description?: string;
  actions?: ReactNode;
  /** Smaller title row for busy work screens such as the POS */
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-wrap justify-between gap-3', compact ? 'mb-3 items-center short:mb-2' : 'mb-5 items-start')}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={cn('font-extrabold tracking-tight text-slate-900', compact ? 'text-xl' : 'text-2xl')}>{title}</h1>
          {status !== 'DEMO_PROTOTYPE' && <FeatureStatusBadge status={status} />}
        </div>
        {description && <p className={cn('max-w-3xl text-slate-600', compact ? 'hidden text-xs xl:block' : 'mt-1 text-sm')}>{description}</p>}
      </div>
      {actions}
    </div>
  );
}

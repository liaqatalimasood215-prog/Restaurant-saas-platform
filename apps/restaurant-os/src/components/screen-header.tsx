import type { ReactNode } from 'react';
import type { FeatureStatus } from '@restaurant-saas/shared';
import { FeatureStatusBadge } from '@/components/ui/badge';

/**
 * Title row of every screen. PLACEHOLDER screens show their badge; working DEMO screens rely on the
 * one "Demo mode" indicator in the header (owner decision 2026-10-28).
 */
export function ScreenHeader({
  title,
  status,
  description,
  actions,
}: {
  title: string;
  status: FeatureStatus;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          {status !== 'DEMO_PROTOTYPE' && <FeatureStatusBadge status={status} />}
        </div>
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

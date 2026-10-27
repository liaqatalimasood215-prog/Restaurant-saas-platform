import type { ReactNode } from 'react';
import type { FeatureStatus } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/**
 * Status colours are the same everywhere and always come with text (MASTER_PROMPT.md §11):
 * New = blue, Preparing = orange, Ready = green, Served/Delivered/Paid = grey,
 * Late/Rejected/Cancelled/Void = red.
 */
export type Tone = 'blue' | 'orange' | 'green' | 'grey' | 'red' | 'amber' | 'brand' | 'dark';

const TONES: Record<Tone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  grey: 'bg-slate-100 text-slate-600 ring-slate-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  brand: 'bg-brand-soft text-brand ring-brand/30',
  dark: 'bg-slate-800 text-white ring-slate-800',
};

export function Badge({ tone = 'grey', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const FEATURE_STATUS_TONES: Record<FeatureStatus, Tone> = {
  REAL_VERIFIED: 'green',
  DEMO_PROTOTYPE: 'brand',
  NOT_CONNECTED: 'amber',
  PLACEHOLDER: 'dark',
  BLOCKED: 'red',
};

/** The project status label (PROJECT_RULES.md §17). DEMO and PLACEHOLDER badges are always visible. */
export function FeatureStatusBadge({ status, className }: { status: FeatureStatus; className?: string }) {
  return (
    <Badge tone={FEATURE_STATUS_TONES[status]} className={className}>
      {t(`status.${status}`)}
    </Badge>
  );
}

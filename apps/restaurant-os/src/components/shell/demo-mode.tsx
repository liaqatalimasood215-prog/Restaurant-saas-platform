'use client';

import { useCallback, useRef, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { useDismiss } from '@/components/ui/use-dismiss';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useDemoFailure } from './use-demo-failure';

/**
 * The one small DEMO indicator (owner decision 2026-10-28). Tapping it explains what is simulated.
 * It never claims a live connection: sync between tabs is DEMO sync, not real-time.
 */
export function DemoModeIndicator() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const failing = useDemoFailure();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={cn(
          'flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold ring-1 ring-inset',
          failing ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-amber-50 text-amber-800 ring-amber-200',
        )}
      >
        <FlaskConical className="size-4" aria-hidden />
        <span className="sm:hidden">{failing ? t('demoMode.offlineShort') : t('demoMode.short')}</span>
        <span className="hidden sm:inline">{failing ? t('demoMode.offline') : t('demoMode.label')}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(90vw,22rem)] rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-xl">
          <p className="mb-2 font-bold text-slate-900">{t('demoMode.title')}</p>
          <p className="mb-2">{t('demoMode.body')}</p>
          <p>{t('demoMode.sync')}</p>
        </div>
      )}
    </div>
  );
}

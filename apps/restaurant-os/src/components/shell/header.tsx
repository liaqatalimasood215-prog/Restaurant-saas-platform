'use client';

import { useCallback, useRef, useState } from 'react';
import { Bell, Search, Store } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { useDismiss } from '@/components/ui/use-dismiss';
import { Logo } from './logo';
import { RoleSwitcher } from './role-switcher';
import { useDemoFailure } from './use-demo-failure';

/** Header: search, branch, connection dot, alerts bell and the DEMO role switcher (MASTER_PROMPT.md §7.1). */
export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 md:px-6">
      <div className="md:hidden">
        <Logo />
      </div>

      <div className="hidden max-w-xl flex-1 md:block">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400">
          <Search className="size-5 shrink-0" aria-hidden />
          <input
            type="search"
            disabled
            placeholder={t('header.search')}
            aria-label={t('header.search')}
            className="w-full bg-transparent text-sm placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
        </label>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {session && (
          <div className="hidden items-center gap-2 rounded-xl px-2 lg:flex" title={t('header.branchLabel')}>
            <Store className="size-5 text-slate-500" aria-hidden />
            <span className="leading-tight">
              <span className="block text-sm font-bold text-slate-900">{session.restaurant.name}</span>
              <span className="block text-xs text-slate-500">{session.branch.name}</span>
            </span>
          </div>
        )}
        <ConnectionDot />
        <AlertsBell />
        <RoleSwitcher />
      </div>
    </header>
  );
}

/** Green/red connection dot. In Phases 1–3 it only reflects the DEMO tool, never a real connection. */
function ConnectionDot() {
  const failing = useDemoFailure();
  const label = failing ? t('header.connectionFailing') : t('header.connectionDemo');
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2 py-1" title={t('demo.sync')}>
      <span className={cn('size-2.5 rounded-full', failing ? 'bg-red-500' : 'bg-green-500')} aria-hidden />
      <span className={cn('sr-only text-xs font-semibold sm:not-sr-only', failing ? 'text-red-700' : 'text-slate-600')}>
        {label}
      </span>
    </span>
  );
}

function AlertsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={t('header.alerts')}
        className="flex size-12 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
      >
        <Bell className="size-6" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-xl">
          <p className="mb-1 font-bold text-slate-900">{t('header.alerts')}</p>
          {t('header.noAlerts')}
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Search, Store } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { minutesSince } from '@/lib/format';
import { useNow } from '@/lib/hooks/use-now';
import { useSession } from '@/lib/session';
import { useDismiss } from '@/components/ui/use-dismiss';
import { Logo } from './logo';
import { useReadyAlerts } from './ready-alerts';
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

/** Alerts bell: food-ready alerts for floor staff (online-order alarms join in Preview 4). */
function AlertsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const alerts = useReadyAlerts();
  const now = useNow(30_000);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${t('header.alerts')} (${alerts.length})`}
        className="relative flex size-12 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
      >
        <Bell className="size-6" aria-hidden />
        {alerts.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-xl">
          <p className="mb-2 px-1 font-bold text-slate-900">{t('alerts.title')}</p>
          {alerts.length === 0 ? (
            <p className="px-1 pb-1">{t('header.noAlerts')}</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((alert) => (
                <li key={alert.ticketId}>
                  <Link
                    href={`/waiter?table=${alert.tableId}`}
                    onClick={close}
                    className="flex min-h-12 items-center justify-between gap-2 rounded-xl px-3 hover:bg-green-50"
                  >
                    <span className="font-semibold text-slate-900">
                      {t('alerts.foodReady', { table: alert.tableName, station: alert.stationName })}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {t('alerts.ago', { n: minutesSince(alert.readyAt, now) })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, Store } from 'lucide-react';
import { t } from '@/i18n';
import { minutesSince } from '@/lib/format';
import { useNow } from '@/lib/hooks/use-now';
import { useSession } from '@/lib/session';
import { useDismiss } from '@/components/ui/use-dismiss';
import { DemoModeIndicator } from './demo-mode';
import { Logo } from './logo';
import { notificationBody, notificationLink, notificationTitle, useNotifications } from './notifications';
import { ProfileMenu } from './profile-menu';

/** Header: search, branch, Demo mode, notifications and the profile (MASTER_PROMPT.md §7.1). */
export function Header() {
  const { data: session, allowed } = useSession();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 md:px-6">
      <div className="md:hidden">
        <Logo />
      </div>

      <div className="hidden max-w-xl flex-1 md:block">{session && allowed('orders.view') && <OrderSearch />}</div>

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
        <DemoModeIndicator />
        <NotificationsBell />
        <ProfileMenu />
      </div>
    </header>
  );
}

/** Header search: opens Orders with the search filled in (order number, table, customer). */
function OrderSearch() {
  const router = useRouter();
  const [value, setValue] = useState('');
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) router.push(`/orders?q=${encodeURIComponent(value.trim())}`);
      }}
    >
      <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 focus-within:border-brand">
        <Search className="size-5 shrink-0" aria-hidden />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('header.search')}
          aria-label={t('header.search')}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
        />
      </label>
    </form>
  );
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);
  const list = useNotifications();
  const now = useNow(30_000);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={`${t('header.alerts')} (${list.length})`}
        className="relative flex size-12 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
      >
        <Bell className="size-6" aria-hidden />
        {list.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
            {list.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,22rem)] rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600 shadow-xl">
          <p className="mb-2 px-1 font-bold text-slate-900">{t('header.alerts')}</p>
          {list.length === 0 ? (
            <p className="px-1 pb-1">{t('header.noAlerts')}</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {list.map((n) => (
                <li key={n.id}>
                  <Link
                    href={notificationLink(n)}
                    onClick={close}
                    className="flex min-h-12 flex-col justify-center rounded-xl px-3 py-2 hover:bg-slate-50"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{notificationTitle(n)}</span>
                      <span className="shrink-0 text-xs text-slate-500">{t('alerts.ago', { n: minutesSince(n.at, now) })}</span>
                    </span>
                    <span className="text-xs text-slate-600">{notificationBody(n)}</span>
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

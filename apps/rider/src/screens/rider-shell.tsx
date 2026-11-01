'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ClipboardList, FlaskConical, UserRound, WalletCards, WifiOff, X } from 'lucide-react';
import { Problem, Sheet, Skeleton } from '@/components/ui';
import { t } from '@/i18n';
import { ApiError, getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { registerServiceWorker, useOnline } from '@/lib/pwa';
import { alertNewDelivery, unlockSound } from '@/lib/sound';
import { LoginScreen } from './login-screen';
import { RiderContext } from './rider-context';

/** One codebase for all restaurants: the name and colour come from this branch's data. Logged out: the DEMO login. */
export function RiderShell({ restaurant, branch, children }: { restaurant: string; branch: string; children: ReactNode }) {
  const branchQuery = useApiQuery(() => getApi().getBranch(restaurant, branch), [restaurant, branch]);
  const meQuery = useApiQuery(() => getApi().getMe(restaurant, branch), [restaurant, branch]);
  const riderId = meQuery.data?.id;
  const deliveriesQuery = useApiQuery(async () => ({ riderId, list: riderId ? await getApi().listDeliveries() : [] }), [riderId]);
  const pathname = usePathname();
  const online = useOnline();
  const base = `/${restaurant}/${branch}`;
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [explaining, setExplaining] = useState(false);
  const [alerted, setAlerted] = useState<{ id: string; dailyNumber: number; name: string } | null>(null);
  const known = useRef<Set<string> | null>(null);

  const notify = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => registerServiceWorker(), []);
  useEffect(() => {
    if (window.self !== window.top) document.documentElement.classList.add('in-frame');
    // Browsers allow sound only after a tap on the page.
    window.addEventListener('pointerdown', unlockSound, { once: true });
    return () => window.removeEventListener('pointerdown', unlockSound);
  }, []);

  // A delivery that was not here before is a new assignment: message, sound and vibration.
  // Right after a login the last answer is still the old rider's: never show it as "no deliveries".
  const deliveries = deliveriesQuery.data?.riderId === riderId ? deliveriesQuery.data?.list : undefined;
  useEffect(() => {
    if (!riderId || !deliveries) return;
    if (known.current) {
      const fresh = deliveries.find((d) => !known.current?.has(d.id) && d.status === 'RIDER_ASSIGNED');
      if (fresh) {
        setAlerted({ id: fresh.id, dailyNumber: fresh.dailyNumber, name: fresh.customerName });
        alertNewDelivery();
      }
    }
    known.current = new Set(deliveries.map((d) => d.id));
  }, [riderId, deliveries]);
  useEffect(() => {
    known.current = null;
  }, [riderId]);

  if (branchQuery.loading && !branchQuery.data) return <Skeleton />;
  if (!branchQuery.data) {
    if (branchQuery.error instanceof ApiError && branchQuery.error.code === 'NOT_FOUND') return <Problem title={t('app.notFoundTitle')} body={t('app.notFoundBody')} />;
    return <Problem title={t('app.errorTitle')} body={branchQuery.error?.message} onRetry={branchQuery.reload} />;
  }
  const info = branchQuery.data;
  const style = { '--rider-primary': info.primaryColor } as CSSProperties;
  const source = getDemoControls().source();

  const banners = (
    <>
      {!online && (
        <p role="status" className="flex items-center gap-2 bg-stone-800 px-4 py-2 text-sm font-semibold text-white">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          {t('app.offline')}
        </p>
      )}
      {source === 'RESTAURANT_OS_LOST' && (
        <p role="status" data-link-lost className="bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
          {t('demo.lostBanner')}
        </p>
      )}
    </>
  );
  const header = (
    <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
      <div className="mx-auto flex min-h-14 max-w-lg items-center gap-2 px-4">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-xs font-black text-white">
          {info.logoText}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold" data-restaurant-name>{info.restaurantName}</p>
          <p className="truncate text-xs text-stone-500">{t('app.name')} · {info.branchName}</p>
        </div>
        <button
          type="button"
          onClick={() => setExplaining(true)}
          aria-label={t('demo.open')}
          data-demo-source={source}
          className="inline-flex min-h-11 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800"
        >
          <FlaskConical className="size-3.5" aria-hidden />
          {t('demo.label')}
        </button>
      </div>
    </header>
  );
  const explanation = explaining && (
    <Sheet title={t('demo.title')} onClose={() => setExplaining(false)}>
      <p className="text-sm text-stone-700">{source === 'SAMPLE' ? t('demo.sample') : t('demo.linked')}</p>
    </Sheet>
  );

  if (meQuery.loading && meQuery.data === undefined) return <div style={style}>{header}<Skeleton /></div>;
  if (!meQuery.data) {
    return (
      <div style={style} className="min-h-dvh">
        {header}
        {banners}
        <LoginScreen restaurant={restaurant} branch={branch} />
        {explanation}
      </div>
    );
  }
  if (!deliveries) {
    if (deliveriesQuery.error) return <div style={style}>{header}<Problem title={t('app.errorTitle')} body={deliveriesQuery.error.message} onRetry={deliveriesQuery.reload} /></div>;
    return <div style={style}>{header}<Skeleton /></div>;
  }

  const running = deliveries.filter((d) => d.status !== 'DELIVERED').length;
  // The message leaves once that delivery has moved on, or was given to another rider.
  const alertNow = alerted && deliveries.some((d) => d.id === alerted.id && d.status === 'RIDER_ASSIGNED') ? alerted : null;
  const onDetail = pathname.startsWith(`${base}/delivery/`);
  const tabs = [
    { href: base, label: t('nav.deliveries'), icon: ClipboardList, active: pathname === base || onDetail, count: running },
    { href: `${base}/today`, label: t('nav.today'), icon: WalletCards, active: pathname === `${base}/today`, count: 0 },
    { href: `${base}/account`, label: t('nav.account'), icon: UserRound, active: pathname === `${base}/account`, count: 0 },
  ];

  return (
    <RiderContext.Provider value={{ base, branch: info, me: meQuery.data, deliveries, notify }}>
      <div style={style} className="min-h-dvh">
        {header}
        {banners}
        {alertNow && (
          <div role="alert" data-new-delivery={alertNow.dailyNumber} className="sticky top-14 z-20 mx-auto flex max-w-lg items-center gap-2 bg-brand px-4 py-2 text-white">
            <Bell className="size-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">{t('deliveries.alert', { n: alertNow.dailyNumber })}</p>
              <p className="truncate text-sm">{t('deliveries.alertBody', { name: alertNow.name })}</p>
            </div>
            <Link href={`${base}/delivery/${alertNow.id}`} onClick={() => setAlerted(null)} className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-extrabold text-brand">
              {t('deliveries.alertOpen')}
            </Link>
            <button type="button" onClick={() => setAlerted(null)} aria-label={t('deliveries.alertClose')} className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        )}
        <main className={cn('mx-auto max-w-lg px-4 pt-4', onDetail ? 'pb-32' : 'pb-24')}>{children}</main>
        {!onDetail && (
          <nav aria-label={t('nav.label')} data-bottom-nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto grid max-w-lg grid-cols-3">
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={tab.active ? 'page' : undefined}
                  className={cn('relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold', tab.active ? 'text-brand' : 'text-stone-500')}
                >
                  <tab.icon className="size-6" aria-hidden />
                  {tab.label}
                  {tab.count > 0 && (
                    <span data-running-count={tab.count} className="absolute right-[calc(50%-1.75rem)] top-1.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.6875rem] font-black leading-5 text-white">
                      {tab.count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        )}
        {toast && (
          <p role="status" data-toast={toast.tone} className={cn('fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-lg', toast.tone === 'ok' ? 'bg-stone-900' : 'bg-red-700', onDetail && 'bottom-28')}>
            {toast.text}
          </p>
        )}
        {explanation}
      </div>
    </RiderContext.Provider>
  );
}

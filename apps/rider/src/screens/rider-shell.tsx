'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, WifiOff, X } from 'lucide-react';
import { BottomNavigation } from '@/components/bottom-navigation';
import { DemoBadge } from '@/components/rider-header';
import { Problem, Sheet, Skeleton } from '@/components/ui';
import { t } from '@/i18n';
import { ApiError, getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { registerServiceWorker, useOnline } from '@/lib/pwa';
import { alertNewDelivery, speakNewDelivery, unlockSound } from '@/lib/sound';
import { LoginScreen } from './login-screen';
import { RiderContext } from './rider-context';

/** One codebase for all restaurants: the name and colour come from this branch's data. Logged out: the login page. */
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
  const [alerted, setAlerted] = useState<{ id: string; dailyNumber: number } | null>(null);
  const known = useRef<Set<string> | null>(null);

  const notify = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    setToast({ text, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);
  const explainDemo = useCallback(() => setExplaining(true), []);

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
        setAlerted({ id: fresh.id, dailyNumber: fresh.dailyNumber });
        alertNewDelivery();
        speakNewDelivery(fresh.dailyNumber);
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
        <p role="status" className="flex items-center gap-2 bg-ink px-4 py-2 text-sm font-semibold text-white">
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
    <header className="sticky top-0 z-20 border-b border-line bg-card">
      <div className="mx-auto flex min-h-14 max-w-lg items-center gap-2 px-4">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-xs font-black text-white">
          {info.logoText}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold" data-restaurant-name>{info.restaurantName}</p>
          <p className="truncate text-xs text-muted">{t('app.name')} · {info.branchName}</p>
        </div>
        <DemoBadge onExplain={explainDemo} />
      </div>
    </header>
  );
  const explanation = explaining && (
    <Sheet title={t('demo.title')} onClose={() => setExplaining(false)}>
      <p className="text-sm text-ink">{source === 'SAMPLE' ? t('demo.sample') : t('demo.linked')}</p>
    </Sheet>
  );

  if (meQuery.loading && meQuery.data === undefined) return <div style={style}>{header}<Skeleton /></div>;
  if (!meQuery.data) {
    return (
      <div style={style} className="min-h-dvh">
        {banners}
        <LoginScreen restaurant={restaurant} branch={branch} info={info} onExplain={explainDemo} />
        {explanation}
      </div>
    );
  }
  if (!deliveries) {
    if (deliveriesQuery.error) return <div style={style}>{header}<Problem title={t('app.errorTitle')} body={deliveriesQuery.error.message} onRetry={deliveriesQuery.reload} /></div>;
    return <div style={style}>{header}<Skeleton /></div>;
  }

  // The message leaves once that delivery has moved on, or was given to another rider.
  const alertNow = alerted && deliveries.some((d) => d.id === alerted.id && d.status === 'RIDER_ASSIGNED') ? alerted : null;
  const onDetail = pathname.startsWith(`${base}/delivery/`);

  return (
    <RiderContext.Provider value={{ base, branch: info, me: meQuery.data, deliveries, notify, explainDemo }}>
      <div style={style} className="min-h-dvh">
        {banners}
        {alertNow && (
          <div role="alert" data-new-delivery={alertNow.dailyNumber} className="sticky top-0 z-20 mx-auto flex max-w-lg items-center gap-2 bg-brand px-4 py-2 text-white">
            <Bell className="size-5 shrink-0" aria-hidden />
            <p className="min-w-0 flex-1 truncate font-extrabold">{t('deliveries.alert', { n: alertNow.dailyNumber })}</p>
            <Link href={`${base}/delivery/${alertNow.id}`} onClick={() => setAlerted(null)} className="inline-flex min-h-11 items-center rounded-xl bg-card px-4 text-sm font-extrabold text-brand">
              {t('deliveries.alertOpen')}
            </Link>
            <button type="button" onClick={() => setAlerted(null)} aria-label={t('deliveries.alertClose')} className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full">
              <X className="size-5" aria-hidden />
            </button>
          </div>
        )}
        <main className={cn('mx-auto max-w-lg px-4 pt-3', onDetail ? 'pb-36' : 'pb-24')}>{children}</main>
        {!onDetail && <BottomNavigation base={base} pathname={pathname} />}
        {toast && (
          <p role="status" data-toast={toast.tone} className={cn('fixed inset-x-4 bottom-20 z-30 mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-bold text-white shadow-lg', toast.tone === 'ok' ? 'bg-ink' : 'bg-red-700', onDetail && 'bottom-28')}>
            {toast.text}
          </p>
        )}
        {explanation}
      </div>
    </RiderContext.Provider>
  );
}

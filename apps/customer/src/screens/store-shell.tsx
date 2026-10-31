'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { StoreSkeleton } from '@/components/skeletons';
import { Problem } from '@/components/ui';
import { t } from '@/i18n';
import { ApiError, getApi } from '@/lib/api';
import { describeCart, useCart } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { useFavourites } from '@/lib/favourites';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { registerServiceWorker } from '@/lib/pwa';
import { OfflineBanner } from './pwa-banner';
import { BottomNav, SiteFooter, SiteHeader } from './store-chrome';
import { StoreContext } from './store-context';

/** One codebase for all restaurants: everything below takes its name, colours and menu from this store's data. */
export function StoreShell({ restaurant, branch, children }: { restaurant: string; branch: string; children: ReactNode }) {
  const query = useApiQuery(() => getApi().getStore(restaurant, branch), [restaurant, branch]);
  const base = `/${restaurant}/${branch}`;
  // The Restaurant OS menu has other dishes than the sample menu, so a preview keeps its own cart.
  const cart = useCart(query.data?.fromRestaurantOs ? `${restaurant}/${branch}/preview` : `${restaurant}/${branch}`);
  const favourites = useFavourites(restaurant);
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pagesSeen = useRef(0);

  useEffect(() => {
    pagesSeen.current += 1;
  }, [pathname]);
  useEffect(() => registerServiceWorker(), []);
  useEffect(() => {
    if (window.self !== window.top) document.documentElement.classList.add('in-frame');
  }, []);

  if (query.loading && !query.data) return <StoreSkeleton />;
  if (!query.data) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') return <Problem title={t('app.notFoundTitle')} body={t('app.notFoundBody')} />;
    return <Problem title={t('app.errorTitle')} body={query.error?.message} onRetry={query.reload} />;
  }
  const store = query.data;
  const cartCount = describeCart(store, cart.lines).views.reduce((sum, v) => sum + v.line.quantity, 0);
  const page = pathname.startsWith(base) ? pathname.slice(base.length) : '';
  const isHome = page === '';
  // These pages end with their own big button instead of the bottom bar, like the owner's design.
  const noBottomNav = page.startsWith('/item/') || page === '/login' || (page === '/cart' && cartCount > 0);

  const value = {
    store,
    base,
    // A way of ordering the restaurant switched off falls back to one it offers.
    cart: { ...cart, mode: store.modes.includes(cart.mode) ? cart.mode : (store.modes[0] ?? cart.mode) },
    cartCount,
    canOrder: store.isOpen && store.onlineOrdersEnabled,
    favourites,
    notify: (text: string) => {
      setToast(text);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2600);
    },
    goBack: (fallback: string) => {
      if (pagesSeen.current > 1) router.back();
      else router.push(fallback);
    },
  };

  return (
    <StoreContext.Provider value={value}>
      <div style={{ '--store-primary': store.brand.primaryColor, '--store-accent': store.brand.accentColor } as CSSProperties} className="flex min-h-dvh flex-col">
        <OfflineBanner />
        <SiteHeader phoneToo={isHome} page={page} />
        <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 pt-4 lg:pb-12', noBottomNav ? 'pb-6' : 'pb-24')}>{children}</main>
        <SiteFooter phoneToo={isHome} />
        {!noBottomNav && <BottomNav page={page} />}
        {toast && (
          <p role="status" data-toast className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-2xl bg-stone-900 px-4 py-3 text-center text-sm font-bold text-white shadow-xl lg:bottom-6">
            {toast}
          </p>
        )}
      </div>
    </StoreContext.Provider>
  );
}

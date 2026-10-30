'use client';

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, FlaskConical, MapPin, Phone, ShoppingBag, UserRound } from 'lucide-react';
import { formatPaisa, type PublicStore } from '@restaurant-saas/shared';
import { Button, Loading, Problem, Sheet } from '@/components/ui';
import { t } from '@/i18n';
import { ApiError, getApi, getDemoControls } from '@/lib/api';
import { cartTotals, describeCart, useCart, type Cart } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';

interface StoreContext {
  store: PublicStore;
  /** "/restaurant/branch" */
  base: string;
  cart: Cart;
  /** Open and taking online orders */
  canOrder: boolean;
}

const Context = createContext<StoreContext | null>(null);

export function useStore(): StoreContext {
  const value = useContext(Context);
  if (!value) throw new Error('useStore must be used inside <StoreShell>');
  return value;
}

/** One website for all restaurants: everything below takes its name, colour and menu from this store's data. */
export function StoreShell({ restaurant, branch, children }: { restaurant: string; branch: string; children: ReactNode }) {
  const query = useApiQuery(() => getApi().getStore(restaurant, branch), [restaurant, branch]);
  const base = `/${restaurant}/${branch}`;
  const cart = useCart(`${restaurant}/${branch}`);
  if (query.loading && !query.data) return <Loading />;
  if (!query.data) {
    if (query.error instanceof ApiError && query.error.code === 'NOT_FOUND') return <Problem title={t('app.notFoundTitle')} body={t('app.notFoundBody')} />;
    return <Problem title={t('app.errorTitle')} body={query.error?.message} onRetry={query.reload} />;
  }
  const store = query.data;
  const value: StoreContext = { store, base, cart, canOrder: store.isOpen && store.onlineOrdersEnabled };
  return (
    <Context.Provider value={value}>
      <div style={{ '--store-primary': store.brand.primaryColor } as CSSProperties} className="flex min-h-dvh flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 lg:pb-12">{children}</main>
        <Footer />
      </div>
    </Context.Provider>
  );
}

function Header() {
  const { store, base, cart } = useStore();
  const pathname = usePathname();
  const [demoOpen, setDemoOpen] = useState(false);
  const { views } = describeCart(store, cart.lines);
  const count = views.reduce((sum, v) => sum + v.line.quantity, 0);
  const total = cartTotals(store, cart.kind, views).itemsSubtotal;
  const link = (href: string, label: string) => (
    <Link href={href} aria-current={pathname === href ? 'page' : undefined} className={cn('hidden rounded-xl px-3 py-2 text-sm font-bold sm:block', pathname === href ? 'text-brand' : 'text-stone-600 hover:text-stone-900')}>
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <Link href={base} className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-sm font-black text-white">{store.brand.logoText}</span>
          <span className="line-clamp-2 text-sm font-extrabold leading-tight tracking-tight sm:text-base">{store.restaurant.name}</span>
        </Link>
        <nav className="ml-4 hidden flex-1 items-center gap-1 sm:flex" aria-label="Main">
          {link(base, t('nav.menu'))}
          {link(`${base}/account`, t('nav.account'))}
        </nav>
        <button type="button" onClick={() => setDemoOpen(true)} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-800">
          <FlaskConical className="hidden size-3.5 sm:block" aria-hidden />
          {t('demo.label')}
        </button>
        <Link href={`${base}/account`} aria-label={t('nav.account')} className="grid size-11 place-items-center rounded-full text-stone-600 hover:bg-stone-100 sm:hidden">
          <UserRound className="size-5" aria-hidden />
        </Link>
        <Link
          href={`${base}/cart`}
          aria-label={count > 0 ? t('nav.cartWith', { n: count, total: formatPaisa(total) }) : t('nav.cart')}
          className="relative grid size-11 place-items-center rounded-full bg-brand-soft text-brand hover:bg-brand-line"
        >
          <ShoppingBag className="size-5" aria-hidden />
          {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-extrabold text-white">{count}</span>}
        </Link>
      </div>
      {demoOpen && <DemoPanel onClose={() => setDemoOpen(false)} />}
    </header>
  );
}

function DemoPanel({ onClose }: { onClose: () => void }) {
  const { store } = useStore();
  const demo = getDemoControls();
  const slugs = [store.restaurant.slug, store.branch.slug] as const;
  const toggle = (label: string, on: boolean, change: (next: boolean) => void) => (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-stone-200 px-4 font-bold">
      {label}
      <input type="checkbox" role="switch" checked={on} onChange={(e) => change(e.target.checked)} className="size-5 accent-[var(--store-primary)]" />
    </label>
  );
  return (
    <Sheet title={t('demo.title')} onClose={onClose} footer={<Button variant="secondary" className="w-full" onClick={onClose}>{t('demo.close')}</Button>}>
      <p className="mb-3 text-sm text-stone-600">{t('demo.body')}</p>
      <div className="space-y-2">
        {toggle(t('demo.onlineOrders'), store.onlineOrdersEnabled, (on) => demo.setOnlineOrders(...slugs, on))}
        {toggle(t('demo.openNow'), store.isOpen, (on) => demo.setOpen(...slugs, on))}
        <Button variant="ghost" className="w-full" onClick={() => demo.resetData()}>
          {t('demo.reset')}
        </Button>
      </div>
    </Sheet>
  );
}

function Footer() {
  const { store } = useStore();
  const row = 'flex items-start gap-2 text-sm text-stone-600';
  return (
    <footer className="border-t border-stone-200 bg-white pb-20 lg:pb-0">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-extrabold">{store.restaurant.name}</p>
          <p className={row}>
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            {store.branch.address}
          </p>
          <p className={row}>
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {store.branch.openingHours}
          </p>
          <p className={row}>
            <Phone className="mt-0.5 size-4 shrink-0" aria-hidden />
            <a href={`tel:${store.branch.phone}`} className="underline-offset-2 hover:underline">
              {store.branch.phone}
            </a>
          </p>
        </div>
        <p className="self-end text-xs text-stone-400">{t('app.poweredBy')}</p>
      </div>
    </footer>
  );
}

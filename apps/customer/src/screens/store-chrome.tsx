'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, ClipboardList, Clock, House, MapPin, Phone, ShoppingCart, TriangleAlert, UserRound, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Button, Sheet } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { isFinished } from '@/lib/order-rules';
import { useStore } from './store-context';

const NAV: { key: 'home' | 'menu' | 'cart' | 'orders' | 'account'; path: string; icon: LucideIcon; isOn: (page: string) => boolean }[] = [
  { key: 'home', path: '', icon: House, isOn: (page) => page === '' },
  { key: 'menu', path: '/menu', icon: UtensilsCrossed, isOn: (page) => page === '/menu' || page.startsWith('/item/') },
  { key: 'cart', path: '/cart', icon: ShoppingCart, isOn: (page) => page === '/cart' },
  { key: 'orders', path: '/orders', icon: ClipboardList, isOn: (page) => page === '/orders' || page.startsWith('/track/') },
  { key: 'account', path: '/account', icon: UserRound, isOn: (page) => page === '/account' || page === '/login' },
];

function CartBadge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span data-cart-count={count} className={cn('absolute grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.6875rem] font-extrabold text-white', className)}>
      {count}
    </span>
  );
}

/** Phones and tablets: Home, Menu, Cart (badge), Orders, Account. */
export function BottomNav({ page }: { page: string }) {
  const { base, cartCount } = useStore();
  return (
    <nav aria-label={t('nav.main')} data-bottom-nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV.map(({ key, path, icon: Icon, isOn }) => {
        const on = isOn(page);
        return (
          <Link
            key={key}
            href={`${base}${path}`}
            aria-current={on ? 'page' : undefined}
            aria-label={key === 'cart' && cartCount > 0 ? t('nav.cartWith', { n: cartCount }) : undefined}
            className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-bold', on ? 'text-brand' : 'text-stone-500')}
          >
            <span className="relative">
              <Icon className={cn('size-5', on && 'fill-brand-line')} aria-hidden />
              {key === 'cart' && <CartBadge count={cartCount} className="-right-3 -top-2" />}
            </span>
            {t(`nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}

/** The restaurant's logo: its short name when it has one, otherwise logo letters and the full name. */
export function StoreLogo() {
  const { store, base } = useStore();
  return (
    <Link href={base} className="flex min-h-11 min-w-0 items-center gap-2.5" aria-label={store.restaurant.name}>
      {store.brand.wordmark ? (
        <span className="text-2xl font-black tracking-tight">
          {store.brand.wordmark}
          <span className="text-brand">.</span>
        </span>
      ) : (
        <>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand text-sm font-black text-white">{store.brand.logoText}</span>
          <span className="line-clamp-2 text-sm font-extrabold leading-tight tracking-tight sm:text-base">{store.restaurant.name}</span>
        </>
      )}
    </Link>
  );
}

/** Large screens: logo and links. On phones only Home shows it; other pages have their own title bar. */
export function SiteHeader({ phoneToo, page }: { phoneToo: boolean; page: string }) {
  const { base, cartCount } = useStore();
  return (
    <header className={cn('sticky top-0 z-30 border-b border-stone-100 bg-white/95 backdrop-blur', !phoneToo && 'hidden lg:block')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4">
        <StoreLogo />
        <nav className="ml-4 hidden flex-1 items-center gap-1 lg:flex" aria-label={t('nav.main')}>
          {NAV.filter((n) => n.key !== 'cart').map(({ key, path, isOn }) => (
            <Link key={key} href={`${base}${path}`} aria-current={isOn(page) ? 'page' : undefined} className={cn('flex min-h-11 items-center rounded-xl px-3 text-sm font-bold', isOn(page) ? 'text-brand' : 'text-stone-600 hover:text-stone-900')}>
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <HeaderActions />
          <DemoChip />
          <Link
            href={`${base}/cart`}
            aria-label={cartCount > 0 ? t('nav.cartWith', { n: cartCount }) : t('nav.cart')}
            aria-current={page === '/cart' ? 'page' : undefined}
            className="relative hidden size-11 place-items-center rounded-full bg-brand-soft text-brand hover:bg-brand-line lg:grid"
          >
            <ShoppingCart className="size-5" aria-hidden />
            <CartBadge count={cartCount} className="-right-1 -top-1" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Login while nobody is logged in, and the bell: it opens the orders and shows a dot while one is running. */
function HeaderActions() {
  const { store, base } = useStore();
  const profile = useApiQuery(() => getApi().getProfile(store.restaurant.slug), [store.restaurant.slug]);
  const orders = useApiQuery(() => getApi().listMyOrders(store.restaurant.slug, store.branch.slug), [store.restaurant.slug, store.branch.slug]);
  const running = orders.data?.some((o) => !isFinished(o.status)) ?? false;
  return (
    <>
      {profile.data && !profile.data.signedIn && (
        <Link href={`${base}/login`} data-header-login className="flex min-h-11 items-center rounded-xl px-2 text-sm font-extrabold text-brand hover:bg-brand-soft">
          {t('nav.login')}
        </Link>
      )}
      <Link href={`${base}/orders`} aria-label={running ? t('nav.bellRunning') : t('nav.bell')} data-bell={running} className="relative grid size-11 place-items-center rounded-full text-stone-700 hover:bg-stone-100">
        <Bell className="size-5" aria-hidden />
        {running && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-white bg-brand" />}
      </Link>
    </>
  );
}

/** Title bar of an inner page on phones (back, title, action); a plain page title on large screens. */
export function PageHeader({ title, back, action }: { title: string; back: string; action?: ReactNode }) {
  const { goBack } = useStore();
  return (
    <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-3 grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-stone-100 bg-white/95 px-2 backdrop-blur lg:static lg:m-0 lg:mb-4 lg:flex lg:justify-between lg:border-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
      <button type="button" onClick={() => goBack(back)} aria-label={t('app.back')} className="grid size-11 place-items-center rounded-full text-stone-800 hover:bg-stone-100 lg:hidden">
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <h1 className="truncate text-center text-lg font-extrabold tracking-tight lg:text-left lg:text-3xl lg:font-black">{title}</h1>
      <div className="flex items-center justify-end gap-0.5">
        {action}
        <DemoChip className="lg:hidden" />
      </div>
    </div>
  );
}

/** The one DEMO indicator on every screen (PROJECT_RULES.md §16); tapping it explains and offers the demo switches. */
export function DemoChip({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" data-demo-chip className={cn('grid min-h-11 min-w-11 place-items-center', className)}>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[0.6875rem] font-bold leading-none text-amber-800">{t('demo.label')}</span>
      </button>
      {open && <DemoPanel onClose={() => setOpen(false)} />}
    </>
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
      {store.fromRestaurantOs && (
        <p className="mb-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900" data-from-restaurant-os>
          {t('demo.fromOs')}
        </p>
      )}
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

/** Shown wherever a customer could try to order while the restaurant is closed or not taking orders. */
export function ClosedBanner() {
  const { store } = useStore();
  return (
    <p role="status" data-closed-banner className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        <strong className="block font-extrabold">{store.isOpen ? t('store.notTaking') : t('store.closedTitle')}</strong>
        {store.isOpen ? t('store.notTakingBody') : t('store.closedBody', { hours: store.branch.openingHours })}
      </span>
    </p>
  );
}

export function SiteFooter({ phoneToo }: { phoneToo: boolean }) {
  const { store } = useStore();
  const row = 'flex items-start gap-2 text-sm text-stone-600';
  const { whatsapp, email, facebook, instagram } = store.links;
  const social = 'inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-brand hover:underline';
  return (
    <footer className={cn('border-t border-stone-200 bg-stone-50 pb-20 lg:pb-0', !phoneToo && 'hidden lg:block')} data-footer>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <p className="font-extrabold">{store.restaurant.name}</p>
          {store.about && <p className="max-w-xl text-sm text-stone-600">{store.about}</p>}
          <p className={row}>
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            {store.branch.address}
          </p>
          <p className={row}>
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
            {store.branch.openingHours}
          </p>
          <a href={`tel:${store.branch.phone}`} className={cn(row, 'min-h-11 items-center underline-offset-2 hover:underline')}>
            <Phone className="size-4 shrink-0" aria-hidden />
            {store.branch.phone}
          </a>
          {(whatsapp || email || facebook || instagram) && (
            <div className="-ml-2 flex flex-wrap" data-footer-links>
              {whatsapp && (
                <a href={`https://wa.me/92${whatsapp.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noreferrer" className={social}>
                  {t('store.whatsapp')}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className={social}>
                  {t('store.email')}
                </a>
              )}
              {facebook && (
                <a href={facebook} target="_blank" rel="noreferrer" className={social}>
                  {t('store.facebook')}
                </a>
              )}
              {instagram && (
                <a href={instagram} target="_blank" rel="noreferrer" className={social}>
                  {t('store.instagram')}
                </a>
              )}
            </div>
          )}
        </div>
        <p className="self-end text-xs text-stone-500">{t('app.poweredBy')}</p>
      </div>
    </footer>
  );
}

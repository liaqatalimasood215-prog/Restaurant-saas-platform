'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Clock, MapPin, Plus, Search, Store } from 'lucide-react';
import type { MenuItem } from '@restaurant-saas/shared';
import { Button, ProductArt, Sheet, fieldClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, type CustomerProfile } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { ModeTabs } from './mode-tabs';
import { ProductCard, priceText } from './product-card';
import { InstallBanner } from './pwa-banner';
import { ClosedBanner } from './store-chrome';
import { useStore } from './store-context';

const FINISHED = ['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'];

/** Home: where it comes from, search, categories, deals and what is popular (owner's design, screen 2). */
export function HomeScreen() {
  const { store, base, canOrder } = useStore();
  const router = useRouter();
  const orders = useApiQuery(() => getApi().listMyOrders(store.restaurant.slug, store.branch.slug), [store.restaurant.slug, store.branch.slug]);
  const active = orders.data?.find((o) => !FINISHED.includes(o.status));
  const [query, setQuery] = useState('');
  const popular = store.popularItemIds.map((id) => store.items.find((i) => i.id === id)).filter((i): i is MenuItem => Boolean(i));

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{store.restaurant.name}</h1>
      <OrderingBar />
      {!canOrder && <ClosedBanner />}
      {active && (
        <Link href={`${base}/track/${active.token}`} className="flex min-h-14 items-center justify-between gap-3 rounded-3xl border border-brand-line bg-brand-soft p-4" data-active-order>
          <span className="min-w-0 font-bold">{t('store.activeOrder', { n: active.dailyNumber, status: t(`status.${active.status}`) })}</span>
          <span className="shrink-0 text-sm font-extrabold text-brand">{t('store.track')} →</span>
        </Link>
      )}

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          router.push(q ? `${base}/menu?q=${encodeURIComponent(q)}` : `${base}/menu`);
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('home.search')}
          aria-label={t('menu.search')}
          className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-12 pr-4 text-base outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-line"
        />
        <button type="submit" className="sr-only">
          {t('home.searchButton')}
        </button>
      </form>

      <CategoryRow />
      <DealSlider />

      {popular.length > 0 && (
        <section aria-labelledby="popular-now">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="popular-now" className="text-xl font-extrabold tracking-tight">
              {t('home.popular')}
            </h2>
            <Link href={`${base}/menu`} className="flex min-h-11 items-center text-sm font-bold text-brand hover:underline">
              {t('home.seeAll')} →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" data-popular>
            {popular.map((item) => (
              <li key={item.id}>
                <ProductCard item={item} addStyle="accent" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <InstallBanner />
    </div>
  );
}

/** Delivery address or branch, time, and the branch selector when the restaurant has more than one. */
function OrderingBar() {
  const { store, cart } = useStore();
  const slug = store.restaurant.slug;
  const profile = useApiQuery(() => getApi().getProfile(slug), [slug]);
  const [open, setOpen] = useState<'how' | 'branch' | null>(null);
  const delivery = cart.mode === 'DELIVERY';
  const label = delivery ? t('home.deliverTo') : cart.mode === 'TAKEAWAY' ? t('home.pickupFrom') : t('home.dineInAt');
  const place = delivery ? (profile.data?.addresses[0] ?? t('home.addAddress')) : store.branch.name;
  const state = store.isOpen ? t('store.open') : t('store.closed');

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen('how')} aria-haspopup="dialog" aria-label={`${t('home.changeHow')}: ${label} ${place}`} data-ordering-bar className="flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left">
          <MapPin className="size-6 shrink-0 fill-brand-soft text-brand" aria-hidden />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-stone-500">{label}</span>
            <span className="flex items-center gap-1 text-sm font-extrabold">
              <span className="truncate">{place}</span>
              <ChevronDown className="size-4 shrink-0" aria-hidden />
            </span>
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 px-3 py-2 text-xs font-bold" data-eta>
          <Clock className="size-4" aria-hidden />
          {t('store.prep', { n: store.defaultPrepMinutes })}
        </span>
      </div>
      {store.branches.length > 1 && (
        <button type="button" onClick={() => setOpen('branch')} aria-haspopup="dialog" aria-label={t('home.branchNow', { name: store.branch.name, state })} data-branch-button className="flex min-h-11 items-center gap-2 text-sm font-bold text-stone-700">
          <Store className="size-4 shrink-0 text-stone-500" aria-hidden />
          {store.branch.name}
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-extrabold', store.isOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{state}</span>
          <ChevronDown className="size-4 shrink-0" aria-hidden />
        </button>
      )}
      {open === 'how' && profile.data && <HowSheet profile={profile.data} onClose={() => setOpen(null)} />}
      {open === 'branch' && <BranchSheet onClose={() => setOpen(null)} />}
    </div>
  );
}

function HowSheet({ profile, onClose }: { profile: CustomerProfile; onClose: () => void }) {
  const { store, cart } = useStore();
  const slug = store.restaurant.slug;
  const [address, setAddress] = useState('');
  const save = (addresses: string[]) => void getApi().saveProfile(slug, { ...profile, addresses });
  return (
    <Sheet title={t('mode.how')} onClose={onClose} footer={<Button className="w-full" onClick={onClose}>{t('home.done')}</Button>}>
      <ModeTabs />
      {cart.mode === 'DELIVERY' ? (
        <div className="mt-4">
          <h3 className="mb-2 font-extrabold">{t('home.savedAddresses')}</h3>
          {profile.addresses.length === 0 && <p className="mb-2 text-sm text-stone-500">{t('home.noAddress')}</p>}
          <ul className="space-y-2">
            {profile.addresses.map((a, i) => (
              <li key={a}>
                {/* The first address is the one used for delivery. */}
                <button type="button" aria-pressed={i === 0} onClick={() => save([a, ...profile.addresses.filter((other) => other !== a)])} className={cn('flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 px-3 text-left text-sm font-semibold', i === 0 ? 'border-brand bg-brand-soft' : 'border-stone-200')}>
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border-2 text-white', i === 0 ? 'border-brand bg-brand' : 'border-stone-300')}>{i === 0 && <Check className="size-4" strokeWidth={3} aria-hidden />}</span>
                  <span className="min-w-0 flex-1">{a}</span>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = address.trim();
              if (trimmed.length < 5 || profile.addresses.includes(trimmed)) return;
              save([trimmed, ...profile.addresses]);
              setAddress('');
            }}
          >
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('checkout.addressPlaceholder')} aria-label={t('home.newAddress')} autoComplete="street-address" className={fieldClass} />
            <Button type="submit" variant="secondary" className="shrink-0">
              <Plus className="size-4" aria-hidden />
              {t('home.addAddressButton')}
            </Button>
          </form>
        </div>
      ) : (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('home.addressAt', { address: store.branch.address })}
        </p>
      )}
    </Sheet>
  );
}

function BranchSheet({ onClose }: { onClose: () => void }) {
  const { store } = useStore();
  return (
    <Sheet title={t('home.branch')} onClose={onClose}>
      <ul className="space-y-2" data-branch-list>
        {store.branches.map((b) => {
          const here = b.slug === store.branch.slug;
          return (
            <li key={b.slug}>
              <Link href={`/${store.restaurant.slug}/${b.slug}`} onClick={onClose} aria-current={here ? 'page' : undefined} className={cn('flex min-h-14 items-center gap-3 rounded-2xl border-2 p-3', here ? 'border-brand bg-brand-soft' : 'border-stone-200 hover:border-stone-300')}>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{b.name}</span>
                  <span className="block text-xs text-stone-500">{b.address}</span>
                </span>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-extrabold', b.isOpen ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>{b.isOpen ? t('store.open') : t('store.closed')}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function CategoryRow() {
  const { store, base } = useStore();
  const categories = store.categories.filter((c) => store.items.some((i) => i.categoryId === c.id));
  return (
    <nav aria-label={t('menu.categories')} className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-0.5 lg:mx-0 lg:flex-wrap lg:px-0.5" data-category-row>
      {categories.map((c) => (
        <Link key={c.id} href={`${base}/menu?c=${c.id}`} data-category={c.name} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center">
          <ProductArt name={c.name} className="size-16 rounded-full ring-1 ring-stone-200" emojiClassName="text-3xl" />
          <span className="line-clamp-2 text-xs font-bold leading-tight">{c.name}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Swipe on phones, side by side on large screens. A deal is an ordinary menu item with its own price. */
function DealSlider() {
  const { store, base } = useStore();
  const rail = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const deals = store.deals.flatMap((deal) => {
    const item = store.items.find((i) => i.id === deal.itemId);
    return item ? [{ deal, item }] : [];
  });
  if (deals.length === 0) return null;

  const step = () => {
    const el = rail.current;
    const first = el?.firstElementChild as HTMLElement | null | undefined;
    const second = first?.nextElementSibling as HTMLElement | null | undefined;
    return first && second ? second.offsetLeft - first.offsetLeft : (el?.clientWidth ?? 1);
  };

  return (
    <section aria-label={t('home.deals')}>
      <div
        ref={rail}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / step()))}
        data-deals
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
      >
        {deals.map(({ deal, item }) => (
          <Link key={deal.id} href={`${base}/item/${item.id}`} data-deal={item.name} className="relative flex min-h-44 w-full shrink-0 snap-start flex-col items-start overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-5 text-white lg:w-auto">
            <span className="rounded-lg bg-accent px-2 py-0.5 text-[0.6875rem] font-extrabold uppercase tracking-wide text-stone-900">{deal.tag}</span>
            <span className="mt-2 max-w-[70%] text-2xl font-black leading-tight tracking-tight">{item.name}</span>
            <span className="mt-1 max-w-[65%] text-sm text-white">{item.description}</span>
            <span className="mt-auto pt-3">
              <span className="inline-block rounded-xl bg-accent px-3 py-1 text-lg font-black tabular-nums text-stone-900">{priceText(item)}</span>
            </span>
            <span aria-hidden className="absolute -right-1 bottom-2 flex flex-col items-end text-5xl drop-shadow-lg">
              <span>{deal.emoji[0]}</span>
              <span className="-mt-1 mr-8 text-4xl">{deal.emoji.slice(1).join('')}</span>
            </span>
          </Link>
        ))}
      </div>
      {deals.length > 1 && (
        <div className="-mb-2 mt-0.5 flex justify-center lg:hidden" data-deal-dots>
          {deals.map(({ deal }, i) => (
            <button
              key={deal.id}
              type="button"
              aria-label={t('home.showDeal', { n: i + 1, of: deals.length })}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => rail.current?.scrollTo({ left: step() * i, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
              className="grid size-11 place-items-center"
            >
              <span className={cn('block size-2 rounded-full transition-colors', i === index ? 'bg-brand' : 'bg-stone-300')} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

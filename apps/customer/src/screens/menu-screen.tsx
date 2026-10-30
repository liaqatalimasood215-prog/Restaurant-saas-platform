'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bike, Clock, Plus, Search, ShoppingBag, Store, Wallet } from 'lucide-react';
import { formatPaisa, type MenuItem, type OnlineOrderKind } from '@restaurant-saas/shared';
import { ProductArt } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cartTotals, describeCart } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { CartView } from './cart-view';
import { ItemSheet } from './item-sheet';
import { useStore } from './store-shell';

const FINISHED = ['DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'];

/** Home: who the restaurant is, how to order, then the menu by category (MASTER_PROMPT.md §7.2). */
export function MenuScreen() {
  const { store, base, cart, canOrder } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<MenuItem | null>(null);
  const orders = useApiQuery(() => getApi().listMyOrders(store.restaurant.slug, store.branch.slug), [store.restaurant.slug, store.branch.slug]);
  const active = orders.data?.find((o) => !FINISHED.includes(o.status));
  const q = query.trim().toLowerCase();
  const matches = (i: MenuItem) => !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
  const sections = store.categories.map((category) => ({ category, items: store.items.filter((i) => i.categoryId === category.id && matches(i)) })).filter((s) => s.items.length > 0);
  const { views } = describeCart(store, cart.lines);
  const count = views.reduce((sum, v) => sum + v.line.quantity, 0);
  const totals = cartTotals(store, cart.kind, views);

  return (
    <>
      <Hero />

      {active && (
        <Link href={`${base}/track/${active.token}`} className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-brand-line bg-brand-soft p-4" data-active-order>
          <span className="min-w-0 font-bold">{t('store.activeOrder', { n: active.dailyNumber, status: t(`status.${active.status}`) })}</span>
          <span className="shrink-0 text-sm font-extrabold text-brand">{t('store.track')} →</span>
        </Link>
      )}

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          <div className="sticky top-16 z-20 -mx-4 space-y-2 bg-page/95 px-4 py-2 backdrop-blur">
            {/* Stays in view while scrolling, so items without a + button explain themselves. */}
            {!canOrder && (
              <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                <strong className="font-extrabold text-amber-900">{t('store.notTaking')}.</strong> {t('store.notTakingBody')}
              </p>
            )}
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('menu.search')}
                aria-label={t('menu.search')}
                className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white pl-12 pr-4 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand-line"
              />
            </label>
            <nav aria-label={t('menu.categories')} className="flex gap-2 overflow-x-auto pb-1">
              {sections.map(({ category }) => (
                <a key={category.id} href={`#c-${category.id}`} className="shrink-0 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-stone-700 hover:border-brand hover:text-brand">
                  {category.name}
                </a>
              ))}
            </nav>
          </div>

          {sections.length === 0 && <p className="py-12 text-center text-stone-500">{t('menu.noMatch', { q: query.trim() })}</p>}
          {sections.map(({ category, items }) => (
            <section key={category.id} id={`c-${category.id}`} className="menu-section mt-5">
              <h2 className="mb-3 text-xl font-extrabold tracking-tight">{category.name}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <ItemCard item={item} canOrder={canOrder} onOpen={() => setOpen(item)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl bg-white p-5 shadow-sm lg:block" aria-label={t('cart.title')}>
          <CartView />
        </aside>
      </div>

      {count > 0 && (
        <Link
          href={`${base}/cart`}
          data-cart-bar
          className="fixed inset-x-4 bottom-4 z-30 flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-brand px-5 font-bold text-white shadow-xl lg:hidden"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="size-5" aria-hidden />
            {count === 1 ? t('cart.item') : t('cart.items', { n: count })}
          </span>
          <span>
            {t('cart.view')} · {formatPaisa(totals.itemsSubtotal)}
          </span>
        </Link>
      )}

      {open && <ItemSheet item={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Hero() {
  const { store, cart, canOrder } = useStore();
  const options: { kind: OnlineOrderKind; label: string; icon: typeof Bike; hint: string }[] = [
    { kind: 'DELIVERY', label: t('store.delivery'), icon: Bike, hint: t('store.deliveryFee', { fee: formatPaisa(store.deliveryFee) }) },
    { kind: 'TAKEAWAY', label: t('store.pickup'), icon: Store, hint: t('store.pickupFree') },
  ];
  return (
    <section className="overflow-hidden rounded-[2rem] bg-brand text-white">
      <div className="relative p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-2 top-2 grid grid-cols-2 gap-1 text-5xl opacity-90 sm:right-6 sm:top-6 sm:gap-3 sm:text-7xl">
          {store.brand.heroEmoji.map((emoji) => (
            <span key={emoji} className="drop-shadow-lg">
              {emoji}
            </span>
          ))}
        </div>
        <span className={cn('relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold', canOrder ? 'bg-white text-green-700' : 'bg-white text-amber-700')} data-open-state>
          <span className={cn('size-2 rounded-full', canOrder ? 'bg-green-600' : 'bg-amber-500')} aria-hidden />
          {store.isOpen ? t('store.open') : t('store.closed')}
        </span>
        <h1 className="relative mt-3 max-w-[70%] text-3xl font-black tracking-tight sm:max-w-lg sm:text-5xl">{store.restaurant.name}</h1>
        <p className="relative mt-2 max-w-[62%] text-sm text-white/90 sm:max-w-md sm:text-base">{store.brand.tagline}</p>
        <ul className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-white/95 sm:text-sm">
          <li className="flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            {t('store.prep', { n: store.defaultPrepMinutes })}
          </li>
          <li className="flex items-center gap-1.5">
            <Wallet className="size-4" aria-hidden />
            {t('store.minOrder', { amount: formatPaisa(store.minOrder) })}
          </li>
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-1.5 bg-black/10 p-2" role="group" aria-label={t('checkout.how')}>
        {options.map(({ kind, label, icon: Icon, hint }) => (
          <button
            key={kind}
            type="button"
            aria-pressed={cart.kind === kind}
            onClick={() => cart.setKind(kind)}
            className={cn('flex min-h-14 items-center justify-center gap-2 rounded-3xl px-3 text-left transition-colors', cart.kind === kind ? 'bg-white text-stone-900' : 'text-white hover:bg-white/10')}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span>
              <span className="block text-sm font-extrabold leading-tight">{label}</span>
              <span className={cn('block text-xs leading-tight', cart.kind === kind ? 'text-stone-500' : 'text-white/80')}>{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ItemCard({ item, canOrder, onOpen }: { item: MenuItem; canOrder: boolean; onOpen: () => void }) {
  const unavailable = !item.isAvailable;
  const price =
    item.variants.length > 0
      ? t('menu.from', { price: formatPaisa(Math.min(...item.variants.map((v) => v.price))) })
      : item.unit === 'piece'
        ? formatPaisa(item.basePrice)
        : t('menu.perUnit', { price: formatPaisa(item.basePrice), unit: item.unit });
  const disabled = unavailable || !canOrder;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-label={unavailable ? `${item.name} — ${t('menu.soldOut')}` : t('menu.add', { name: item.name })}
      data-menu-item={item.name}
      className={cn('group flex h-full w-full items-stretch gap-3 rounded-3xl bg-white p-3 text-left shadow-sm transition-shadow', disabled ? 'cursor-not-allowed' : 'hover:shadow-md', unavailable && 'opacity-60')}
    >
      <ProductArt name={item.name} className="size-24 shrink-0 rounded-2xl sm:size-28" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-extrabold leading-tight">{item.name}</span>
        <span className="mt-0.5 line-clamp-2 text-xs text-stone-500">{item.description}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-sm font-extrabold">{unavailable ? t('menu.soldOut') : price}</span>
          {!disabled && (
            <span className="grid size-9 place-items-center rounded-full bg-brand text-white transition-transform group-hover:scale-105" aria-hidden>
              <Plus className="size-5" />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

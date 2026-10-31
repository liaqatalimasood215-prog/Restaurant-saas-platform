'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Plus } from 'lucide-react';
import type { MenuItem } from '@restaurant-saas/shared';
import { ProductArt } from '@/components/ui';
import { t } from '@/i18n';
import { needsChoice } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { rs } from '@/lib/format';
import { useStore } from './store-context';

/** What a dish costs at least: its smallest size, or its one price. */
export function lowestPrice(item: MenuItem): number {
  return item.variants.length > 0 ? Math.min(...item.variants.map((v) => v.price)) : item.basePrice;
}

/** The price line of a dish: lowest size, per kg, or one price. */
export function priceText(item: MenuItem): string {
  if (item.variants.length > 0) return t('menu.from', { price: rs(lowestPrice(item)) });
  return item.unit === 'piece' ? rs(item.basePrice) : t('menu.perUnit', { price: rs(item.basePrice), unit: item.unit });
}

/** "+" on a dish: straight into the cart, or to the product page when it needs a size or a required choice. */
export function useQuickAdd() {
  const { store, base, cart, notify } = useStore();
  const router = useRouter();
  return (item: MenuItem) => {
    if (needsChoice(store, item)) return router.push(`${base}/item/${item.id}`);
    cart.addLine({ menuItemId: item.id, variantId: null, modifierIds: [], note: '', quantity: 1 });
    notify(t('cart.added', { name: item.name }));
  };
}

export function FavouriteButton({ item, className }: { item: MenuItem; className?: string }) {
  const { favourites } = useStore();
  const on = favourites.has(item.id);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t(on ? 'menu.favRemove' : 'menu.favAdd', { name: item.name })}
      onClick={() => favourites.toggle(item.id)}
      data-favourite={item.name}
      className={cn('z-10 grid size-11 place-items-center', className)}
    >
      <span className="grid size-8 place-items-center rounded-full bg-white shadow">
        <Heart className={cn('size-4 text-brand', on && 'fill-brand')} aria-hidden />
      </span>
    </button>
  );
}

export function ProductCard({ item, addStyle = 'brand' }: { item: MenuItem; addStyle?: 'brand' | 'accent' }) {
  const { store, base, canOrder } = useStore();
  const quickAdd = useQuickAdd();
  const soldOut = !item.isAvailable;
  return (
    <article className={cn('relative flex h-full flex-col overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm transition-shadow', !soldOut && 'hover:shadow-md')} data-menu-item={item.name} data-sold-out={soldOut}>
      <div className="relative">
        <ProductArt name={item.name} className={cn('aspect-[4/3] w-full', soldOut && 'opacity-50')} emojiClassName="text-6xl" />
        {store.bestsellerItemIds.includes(item.id) && <span className="absolute left-2 top-2 rounded-lg bg-accent px-2 py-0.5 text-[0.6875rem] font-extrabold text-stone-900">{t('menu.bestseller')}</span>}
        <FavouriteButton item={item} className="absolute right-0 top-0" />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="font-extrabold leading-tight">
          {soldOut ? (
            item.name
          ) : (
            // The whole card opens the dish; "+" and the heart sit above this link.
            <Link href={`${base}/item/${item.id}`} className="after:absolute after:inset-0 after:rounded-3xl">
              {item.name}
            </Link>
          )}
        </h3>
        {store.display.showDescriptions && <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{item.description}</p>}
        <div className="mt-auto flex min-h-11 items-center justify-between gap-2 pt-2">
          <span className="text-base font-extrabold tabular-nums">
            {soldOut ? (
              t('menu.soldOut')
            ) : item.variants.length > 0 ? (
              <>
                <span className="text-xs font-semibold text-stone-500">{t('menu.fromWord')} </span>
                {rs(lowestPrice(item))}
              </>
            ) : (
              priceText(item)
            )}
          </span>
          {!soldOut && canOrder && (
            <button
              type="button"
              onClick={() => quickAdd(item)}
              aria-label={t('menu.add', { name: item.name })}
              data-add={item.name}
              className={cn('relative z-10 grid size-11 shrink-0 place-items-center rounded-2xl transition-transform hover:scale-105', addStyle === 'accent' ? 'bg-accent text-stone-900' : 'bg-brand text-white')}
            >
              <Plus className="size-5" strokeWidth={3} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

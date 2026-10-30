'use client';

import Link from 'next/link';
import { t } from '@/i18n';
import { describeCart } from '@/lib/cart';
import { CartView } from './cart-view';
import { useStore } from './store-shell';

/** The cart page (phones and direct links); large screens also show the cart beside the menu. */
export function CartScreen() {
  const { store, base, cart } = useStore();
  const empty = describeCart(store, cart.lines).views.length === 0;
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-3 text-3xl font-black tracking-tight">{t('cart.title')}</h1>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <CartView showTitle={false} />
        {empty ? (
          <Link href={base} className="flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark">
            {t('cart.browse')}
          </Link>
        ) : (
          <Link href={base} className="mt-2 block text-center text-sm font-bold text-stone-600 hover:text-stone-900">
            {t('track.backToMenu')}
          </Link>
        )}
      </div>
    </div>
  );
}

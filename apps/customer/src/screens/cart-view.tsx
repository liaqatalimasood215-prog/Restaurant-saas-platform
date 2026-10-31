'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { amountToMinimum, type BillTotals } from '@restaurant-saas/shared';
import { EmptyState, ProductArt, Stepper, primaryLinkClass } from '@/components/ui';
import { t } from '@/i18n';
import { cartTotals, describeCart, type CartView as Line } from '@/lib/cart';
import { rs } from '@/lib/format';
import { useStore } from './store-context';

/** The money lines of a cart or order. */
export function TotalsList({ totals }: { totals: BillTotals }) {
  const row = (label: string, value: number) => (
    <div className="flex justify-between gap-3 text-sm text-stone-600">
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums">{value < 0 ? `− ${rs(-value)}` : rs(value)}</dd>
    </div>
  );
  return (
    <dl className="space-y-1.5">
      {row(t('cart.subtotal'), totals.itemsSubtotal)}
      {totals.deliveryFee > 0 && row(t('cart.deliveryFee'), totals.deliveryFee)}
      {totals.serviceCharge > 0 && row(t('cart.service'), totals.serviceCharge)}
      {totals.tax > 0 && row(t('cart.tax'), totals.tax)}
      {totals.rounding !== 0 && row(t('cart.rounding'), totals.rounding)}
      <div className="flex justify-between gap-3 border-t border-stone-100 pt-2 text-lg font-extrabold">
        <dt>{t('cart.total')}</dt>
        <dd className="tabular-nums" data-cart-total>
          {rs(totals.total)}
        </dd>
      </div>
    </dl>
  );
}

/** One dish in the cart: tap it to change its choices; quantity on the right; the last minus removes it. */
export function CartLineRow({ view }: { view: Line }) {
  const { base, cart } = useStore();
  return (
    <li className="flex items-center gap-2 py-3" data-cart-line={view.item.name}>
      <Link href={`${base}/item/${view.item.id}?line=${view.line.lineId}`} aria-label={t('cart.edit', { name: view.item.name })} className="flex min-w-0 flex-1 items-center gap-3">
        <ProductArt name={view.item.name} className="size-16 shrink-0 rounded-2xl" emojiClassName="text-4xl" />
        <span className="min-w-0">
          <span className="block font-bold leading-tight">{view.item.name}</span>
          {view.detail && <span className="block text-xs text-stone-500">{view.detail}</span>}
          <span className="mt-0.5 block text-sm font-extrabold tabular-nums">{rs(view.lineTotal)}</span>
        </span>
      </Link>
      <Stepper value={view.line.quantity} min={1} name={view.item.name} onChange={(n) => cart.setQuantity(view.line.lineId, n)} onRemove={{ label: t('cart.remove', { name: view.item.name }), run: () => cart.setQuantity(view.line.lineId, 0) }} />
    </li>
  );
}

/** The cart beside the menu on large screens. */
export function CartView() {
  const { store, base, cart } = useStore();
  const { views, left } = describeCart(store, cart.lines);
  const totals = cartTotals(store, cart.mode, views);
  const short = amountToMinimum(totals.itemsSubtotal, store.minOrder);

  if (views.length === 0) return <EmptyState icon={<ShoppingBag className="size-7" aria-hidden />} title={t('cart.empty')} body={t('cart.emptyBody')} />;
  return (
    <div>
      <h2 className="mb-1 text-lg font-extrabold tracking-tight">{t('cart.title')}</h2>
      {left > 0 && <p className="mb-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('cart.gone')}</p>}
      <ul className="divide-y divide-stone-100">
        {views.map((view) => (
          <CartLineRow key={view.line.lineId} view={view} />
        ))}
      </ul>
      <div className="mt-2 border-t border-stone-100 pt-3">
        <TotalsList totals={totals} />
        {short > 0 && <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t('cart.toMinimum', { amount: rs(short), min: rs(store.minOrder) })}</p>}
        <Link href={`${base}/cart`} className={`${primaryLinkClass} mt-3 w-full`}>
          {t('cart.goToCart')}
        </Link>
      </div>
    </div>
  );
}

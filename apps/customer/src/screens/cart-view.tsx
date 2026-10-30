'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, ShoppingBag, Trash2 } from 'lucide-react';
import { amountToMinimum, formatPaisa, type BillTotals } from '@restaurant-saas/shared';
import { Button, ProductArt, Stepper } from '@/components/ui';
import { t } from '@/i18n';
import { cartTotals, describeCart, type CartView as Line } from '@/lib/cart';
import { ItemSheet } from './item-sheet';
import { useStore } from './store-shell';

/** The money lines of a cart or order. */
export function TotalsList({ totals }: { totals: BillTotals }) {
  const row = (label: string, value: number) => (
    <div className="flex justify-between gap-3 text-sm text-stone-600">
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums">{value < 0 ? `− ${formatPaisa(-value)}` : formatPaisa(value)}</dd>
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
          {formatPaisa(totals.total)}
        </dd>
      </div>
    </dl>
  );
}

/** Cart contents, totals and the way to checkout: the side panel on large screens, the Cart page on phones. */
export function CartView({ showTitle = true }: { showTitle?: boolean }) {
  const { store, base, cart, canOrder } = useStore();
  const [editing, setEditing] = useState<Line | null>(null);
  const { views, left } = describeCart(store, cart.lines);
  const totals = cartTotals(store, cart.kind, views);
  const short = amountToMinimum(totals.itemsSubtotal, store.minOrder);

  if (views.length === 0) {
    return (
      <div className="py-8 text-center">
        <span className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
          <ShoppingBag className="size-7" aria-hidden />
        </span>
        <p className="font-extrabold">{t('cart.empty')}</p>
        <p className="text-sm text-stone-500">{t('cart.emptyBody')}</p>
      </div>
    );
  }
  return (
    <div>
      {showTitle && <h2 className="mb-3 text-lg font-extrabold tracking-tight">{t('cart.title')}</h2>}
      {left > 0 && <p className="mb-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('cart.gone')}</p>}
      <ul className="divide-y divide-stone-100">
        {views.map((view) => (
          <li key={view.line.lineId} className="py-3" data-cart-line={view.item.name}>
            <div className="flex gap-3">
              <ProductArt name={view.item.name} className="size-12 shrink-0 rounded-xl" emojiClassName="text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{view.item.name}</p>
                {view.detail && <p className="text-xs text-stone-500">{view.detail}</p>}
              </div>
              <p className="text-sm font-extrabold tabular-nums">{formatPaisa(view.lineTotal)}</p>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <Stepper size="sm" value={view.line.quantity} min={1} onChange={(n) => cart.setQuantity(view.line.lineId, n)} />
              <span className="flex">
                <button type="button" onClick={() => setEditing(view)} aria-label={t('cart.edit', { name: view.item.name })} className="grid size-10 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button type="button" onClick={() => cart.setQuantity(view.line.lineId, 0)} aria-label={t('cart.remove', { name: view.item.name })} className="grid size-10 place-items-center rounded-full text-stone-500 hover:bg-stone-100">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-stone-100 pt-3">
        <TotalsList totals={totals} />
        {short > 0 && <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t('cart.toMinimum', { amount: formatPaisa(short), min: formatPaisa(store.minOrder) })}</p>}
        {canOrder && short === 0 && (
          <Link href={`${base}/checkout`} className="mt-3 flex min-h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark">
            {t('cart.checkout')}
          </Link>
        )}
        {!canOrder && (
          <Button className="mt-3 w-full" disabled>
            {t('store.notTaking')}
          </Button>
        )}
      </div>
      {editing && <ItemSheet item={editing.item} line={editing.line} onClose={() => setEditing(null)} />}
    </div>
  );
}

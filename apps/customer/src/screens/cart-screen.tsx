'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, CreditCard, MapPin, Plus, ShoppingBag, Smartphone, Store, Utensils, Wallet, type LucideIcon } from 'lucide-react';
import { amountToMinimum, normalizePhone, type MenuItem } from '@restaurant-saas/shared';
import { Button, EmptyState, NotConnected, ProductArt, Sheet, fieldClass, primaryLinkClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, type PaymentChoice } from '@/lib/api';
import { cartTotals, describeCart } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { rs } from '@/lib/format';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { newId } from '@/lib/new-id';
import { checkOrderDetails, type OrderField } from '@/lib/order-rules';
import { useOnline } from '@/lib/pwa';
import { CartLineRow, TotalsList } from './cart-view';
import { ModeTabs } from './mode-tabs';
import { priceText, useQuickAdd } from './product-card';
import { ClosedBanner, PageHeader } from './store-chrome';
import { useStore } from './store-context';

const PAYMENTS: { key: PaymentChoice; icon: LucideIcon }[] = [
  { key: 'CASH', icon: Banknote },
  { key: 'JAZZCASH', icon: Smartphone },
  { key: 'EASYPAISA', icon: Wallet },
  { key: 'CARD', icon: CreditCard },
];

/**
 * Cart and checkout on one page (owner's design, screen 5). Details are remembered on this device and no account is
 * needed. The bill comes from the shared pricing engine, and only for showing: the other side prices the order again.
 */
export function CartScreen() {
  const { store, base, cart, canOrder } = useStore();
  const router = useRouter();
  const online = useOnline();
  const slug = store.restaurant.slug;
  const profile = useApiQuery(() => getApi().getProfile(slug), [slug]);
  const [typed, setTyped] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [table, setTable] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentChoice>('CASH');
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<{ field: OrderField | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [clearing, setClearing] = useState(false);
  // One key per checkout: a double tap or a retry never creates a second order.
  const [key] = useState(() => newId());

  // Remembered details, until the person types something else.
  const saved = profile.data;
  const name = typed.name ?? saved?.name ?? '';
  const phone = typed.phone ?? saved?.phone ?? '';
  const address = typed.address ?? saved?.addresses[0] ?? '';
  const enoughSaved = saved && !checkOrderDetails({ mode: cart.mode, name: saved.name, phone: saved.phone, address: saved.addresses[0] ?? '', tableNumber: '-' });
  const editing = changing || !enoughSaved;
  const edit = (detail: 'name' | 'phone' | 'address', value: string) => {
    setTyped((d) => ({ ...d, [detail]: value }));
    setError(null);
  };

  const { views, left } = describeCart(store, cart.lines);
  const totals = cartTotals(store, cart.mode, views);
  const short = amountToMinimum(totals.itemsSubtotal, store.minOrder);

  // After placing, the cart is empty for a moment before the tracking page opens.
  if (placed) return null;
  if (views.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t('cart.title')} back={`${base}/menu`} />
        <EmptyState icon={<ShoppingBag className="size-7" aria-hidden />} title={t('cart.empty')} body={t('cart.emptyBody')}>
          <Link href={`${base}/menu`} className={primaryLinkClass}>
            {t('cart.browse')}
          </Link>
        </EmptyState>
      </div>
    );
  }

  const place = async () => {
    const problem = checkOrderDetails({ mode: cart.mode, name, phone, address, tableNumber: table });
    if (problem) {
      if (problem.field !== 'table') setChanging(true);
      setError({ field: problem.field, text: t(`checkout.errors.${problem.problem}`) });
      requestAnimationFrame(() => document.getElementById(`field-${problem.field}`)?.focus());
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { token } = await getApi().placeOrder({
        restaurantSlug: slug,
        branchSlug: store.branch.slug,
        mode: cart.mode,
        name,
        phone,
        address,
        tableNumber: table,
        payment,
        note,
        lines: views.map(({ line }) => ({ menuItemId: line.menuItemId, variantId: line.variantId, modifierIds: line.modifierIds, note: line.note, quantity: line.quantity })),
        idempotencyKey: key,
      });
      // Remember the details on this device for next time.
      const addresses = saved?.addresses ?? [];
      const trimmed = address.trim();
      await getApi().saveProfile(slug, {
        signedIn: saved?.signedIn ?? false,
        name: name.trim(),
        phone: normalizePhone(phone) ?? phone,
        addresses: cart.mode === 'DELIVERY' && trimmed && !addresses.includes(trimmed) ? [trimmed, ...addresses] : addresses,
      });
      setPlaced(true);
      cart.clear();
      router.replace(`${base}/track/${token}?new=1`);
    } catch (err) {
      setError({ field: null, text: err instanceof Error ? err.message : t('app.errorTitle') });
      setBusy(false);
    }
  };

  const field = (id: OrderField) => cn(fieldClass, error?.field === id && 'border-red-500 ring-2 ring-red-200');
  const delivery = cart.mode === 'DELIVERY';
  const dineIn = cart.mode === 'DINE_IN';
  const placeLabel = busy ? t('checkout.placing') : !canOrder ? t('store.notTaking') : !online ? t('pwa.offlineButton') : t('checkout.place', { total: rs(totals.total) });

  return (
    <div className="pb-28 lg:pb-0">
      <PageHeader
        title={t('cart.title')}
        back={`${base}/menu`}
        action={
          <button type="button" onClick={() => setClearing(true)} className="flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-brand hover:bg-brand-soft">
            {t('cart.clear')}
          </button>
        }
      />
      {!canOrder && (
        <div className="mb-3">
          <ClosedBanner />
        </div>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <ModeTabs onPick={() => setError(null)} />

          <section className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm" data-details>
            {profile.loading && !saved ? (
              <span aria-hidden className="block h-16 animate-pulse rounded-2xl bg-stone-200/70 motion-reduce:animate-none" />
            ) : (
              <>
                <PlaceSummary address={address} editing={editing} name={name} phone={phone} onChange={() => setChanging(true)} />
                {dineIn && (
                  <label className="mt-3 block">
                    <span className="mb-1 block text-sm font-bold">{t('checkout.table')}</span>
                    <input
                      id="field-table"
                      value={table}
                      onChange={(e) => {
                        setTable(e.target.value);
                        setError(null);
                      }}
                      inputMode="numeric"
                      maxLength={6}
                      className={field('table')}
                    />
                    <span className="mt-1 block text-xs text-stone-500">{t('checkout.tableNote')}</span>
                  </label>
                )}
                {editing && (
                  <div className="mt-3 space-y-3" data-details-form>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-bold">{t('checkout.name')}</span>
                        <input id="field-name" value={name} onChange={(e) => edit('name', e.target.value)} autoComplete="name" className={field('name')} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-bold">{t('checkout.phone')}</span>
                        <input id="field-phone" value={phone} onChange={(e) => edit('phone', e.target.value)} onBlur={() => edit('phone', normalizePhone(phone) ?? phone)} inputMode="tel" autoComplete="tel" placeholder="0300-1234567" className={field('phone')} />
                      </label>
                    </div>
                    <p className="text-xs text-stone-500">{t('checkout.phoneHint')}</p>
                    {delivery && (
                      <label className="block">
                        <span className="mb-1 block text-sm font-bold">{t('checkout.address')}</span>
                        <textarea id="field-address" value={address} onChange={(e) => edit('address', e.target.value)} rows={2} autoComplete="street-address" placeholder={t('checkout.addressPlaceholder')} className={cn(field('address'), 'py-3')} />
                        {(saved?.addresses.length ?? 0) > 1 && (
                          <span className="mt-2 flex flex-wrap gap-2">
                            {saved?.addresses.map((a) => (
                              <button key={a} type="button" onClick={() => edit('address', a)} className="min-h-11 max-w-full truncate rounded-full border border-stone-200 px-3 text-xs font-semibold text-stone-600 hover:border-brand">
                                {a}
                              </button>
                            ))}
                          </span>
                        )}
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          <section aria-labelledby="cart-items">
            <h2 id="cart-items" className="font-extrabold">
              {t('cart.items', { n: views.length })}
            </h2>
            {left > 0 && <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('cart.gone')}</p>}
            <ul className="divide-y divide-stone-100">
              {views.map((view) => (
                <CartLineRow key={view.line.lineId} view={view} />
              ))}
            </ul>
          </section>

          <MealRow />

          <section aria-labelledby="cart-payment">
            <h2 id="cart-payment" className="mb-2 font-extrabold">
              {t('checkout.payment')}
            </h2>
            <div className="grid grid-cols-2 gap-2" data-payments>
              {PAYMENTS.map(({ key: choice, icon: Icon }) => {
                const on = payment === choice;
                return (
                  <button key={choice} type="button" aria-pressed={on} data-payment={choice} onClick={() => setPayment(choice)} className={cn('flex min-h-16 flex-col justify-center gap-1 rounded-2xl border-2 px-3 py-2 text-left transition-colors', on ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300')}>
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Icon className={cn('size-4 shrink-0', on ? 'text-brand' : 'text-stone-500')} aria-hidden />
                      {choice === 'CASH' ? t(`checkout.cash.${cart.mode}`) : t(`checkout.pay.${choice}`)}
                    </span>
                    {choice !== 'CASH' && <NotConnected className="self-start" />}
                  </button>
                );
              })}
            </div>
            {payment !== 'CASH' && (
              <p role="status" className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900" data-payment-note>
                {t('checkout.payNotConnected')}
              </p>
            )}
          </section>

          <label className="block">
            <span className="mb-1 block text-sm font-bold">{t('checkout.note')}</span>
            <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
          </label>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:rounded-3xl lg:border lg:border-stone-100 lg:bg-white lg:p-5 lg:shadow-sm" aria-label={t('checkout.bill')}>
          <TotalsList totals={totals} />
          {short > 0 && <p className="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800" data-below-minimum>{t('cart.toMinimum', { amount: rs(short), min: rs(store.minOrder) })}</p>}
          <div className="fixed inset-x-0 bottom-0 z-30 space-y-2 border-t border-stone-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:p-0" data-place-bar>
            {error && (
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                {error.text}
              </p>
            )}
            <Button className="w-full" disabled={busy || !canOrder || !online || short > 0} onClick={() => void place()}>
              {placeLabel}
            </Button>
          </div>
        </aside>
      </div>

      {clearing && (
        <Sheet
          title={t('cart.clearTitle')}
          onClose={() => setClearing(false)}
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setClearing(false)}>
                {t('cart.clearNo')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  cart.clear();
                  setClearing(false);
                }}
              >
                {t('cart.clearYes')}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-stone-600">{t('cart.clearBody')}</p>
        </Sheet>
      )}
    </div>
  );
}

/** Where the food goes or where to collect it, and whose order it is. */
function PlaceSummary({ address, editing, name, phone, onChange }: { address: string; editing: boolean; name: string; phone: string; onChange: () => void }) {
  const { store, cart } = useStore();
  const delivery = cart.mode === 'DELIVERY';
  const Icon = delivery ? MapPin : cart.mode === 'TAKEAWAY' ? Store : Utensils;
  const label = delivery ? t('checkout.deliverTo') : cart.mode === 'TAKEAWAY' ? t('checkout.pickupFrom') : t('checkout.dineInAt');
  const place = delivery ? address.trim() : `${store.branch.name} · ${store.branch.address}`;
  return (
    <div className="flex items-start gap-3" data-place-summary>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-stone-900">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold">{label}</p>
        {place && (
          <p className="text-sm text-stone-600">
            {place} · {t('store.prep', { n: store.defaultPrepMinutes })}
          </p>
        )}
        {!editing && (
          <p className="text-xs text-stone-500">
            {name.trim()} · {phone}
          </p>
        )}
      </div>
      {!editing && (
        <button type="button" onClick={onChange} aria-label={t('checkout.changeDetails')} className="flex min-h-11 shrink-0 items-center rounded-xl px-2 text-sm font-bold text-brand hover:bg-brand-soft">
          {t('checkout.change')}
        </button>
      )}
    </div>
  );
}

/** "Complete your meal": dishes the restaurant suggests that are not in the cart yet. */
function MealRow() {
  const { store, base, cart, canOrder } = useStore();
  const quickAdd = useQuickAdd();
  const suggested = store.suggestedItemIds
    .map((id) => store.items.find((i) => i.id === id))
    .filter((i): i is MenuItem => Boolean(i?.isAvailable) && !cart.lines.some((l) => l.menuItemId === i?.id))
    .slice(0, 3);
  if (suggested.length === 0 || !canOrder) return null;
  return (
    <section aria-labelledby="cart-meal" data-meal-row>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="cart-meal" className="font-extrabold">
          {t('cart.meal')}
        </h2>
        <Link href={`${base}/menu`} className="flex min-h-11 items-center text-sm font-bold text-brand hover:underline">
          {t('cart.seeAll')} →
        </Link>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {suggested.map((item) => (
          <li key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm" data-meal-item={item.name}>
            <ProductArt name={item.name} className="h-16 w-full" emojiClassName="text-3xl" />
            <div className="flex flex-1 flex-col p-2">
              <p className="line-clamp-2 text-xs font-bold leading-tight">{item.name}</p>
              <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                <span className="text-xs font-extrabold tabular-nums">{priceText(item)}</span>
                <button type="button" onClick={() => quickAdd(item)} aria-label={t('menu.add', { name: item.name })} className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-stone-900">
                  <Plus className="size-4" strokeWidth={3} aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

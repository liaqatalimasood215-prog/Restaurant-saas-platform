'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Bike, MapPin, Store } from 'lucide-react';
import { checkCheckout, formatPaisa, normalizePhone, type CheckoutField, type OnlineOrderKind } from '@restaurant-saas/shared';
import { Button, Problem, fieldClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cartTotals, describeCart } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { TotalsList } from './cart-view';
import { useStore } from './store-shell';

/** Checkout (MASTER_PROMPT.md §7.2): delivery or pickup, details remembered on this device, cash only for now. */
export function CheckoutScreen() {
  const { store, base, cart, canOrder } = useStore();
  const router = useRouter();
  const slug = store.restaurant.slug;
  const profile = useApiQuery(() => getApi().getProfile(slug), [slug]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<{ field: CheckoutField | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(false);
  // One key per checkout: a double tap or a retry never creates a second order.
  const [key] = useState(() => crypto.randomUUID());
  const prefilled = useRef(false);

  const saved = profile.data;
  useEffect(() => {
    if (!saved || prefilled.current) return;
    prefilled.current = true;
    // Remembered details arrive after the first paint; a person who already typed keeps their text.
    setName((v) => v || saved.name);
    setPhone((v) => v || saved.phone);
    setAddress((v) => v || (saved.addresses[0] ?? ''));
  }, [saved]);

  const { views } = describeCart(store, cart.lines);
  const totals = cartTotals(store, cart.kind, views);

  // After placing, the cart is empty for a moment before the tracking page opens.
  if (placed) return null;
  if (views.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-xl font-extrabold">{t('cart.empty')}</p>
        <Link href={base} className="mt-3 inline-block font-bold text-brand">
          {t('cart.browse')}
        </Link>
      </div>
    );
  }
  if (!canOrder) return <Problem title={t('store.notTaking')} body={t('store.notTakingBody')} />;

  const place = async () => {
    const problem = checkCheckout({ kind: cart.kind, name, phone, address });
    if (problem) return setError({ field: problem.field, text: t(`checkout.errors.${problem.problem}`) });
    setBusy(true);
    setError(null);
    try {
      const { token } = await getApi().placeOrder({
        restaurantSlug: slug,
        branchSlug: store.branch.slug,
        kind: cart.kind,
        name,
        phone,
        address,
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
        addresses: cart.kind === 'DELIVERY' && trimmed && !addresses.includes(trimmed) ? [trimmed, ...addresses] : addresses,
      });
      setPlaced(true);
      cart.clear();
      router.replace(`${base}/track/${token}?new=1`);
    } catch (err) {
      setError({ field: null, text: err instanceof Error ? err.message : t('app.errorTitle') });
      setBusy(false);
    }
  };

  const field = (key: CheckoutField) => cn(fieldClass, error?.field === key && 'border-red-500 ring-2 ring-red-200');
  const kinds: { kind: OnlineOrderKind; label: string; hint: string; icon: typeof Bike }[] = [
    { kind: 'DELIVERY', label: t('store.delivery'), hint: t('store.deliveryFee', { fee: formatPaisa(store.deliveryFee) }), icon: Bike },
    { kind: 'TAKEAWAY', label: t('store.pickup'), hint: t('store.pickupFree'), icon: Store },
  ];
  const delivery = cart.kind === 'DELIVERY';

  return (
    <div>
      <h1 className="mb-4 text-3xl font-black tracking-tight">{t('checkout.title')}</h1>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void place();
          }}
        >
          <Box title={t('checkout.how')}>
            <div className="grid grid-cols-2 gap-2">
              {kinds.map(({ kind, label, hint, icon: Icon }) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={cart.kind === kind}
                  onClick={() => cart.setKind(kind)}
                  className={cn('flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 p-2 text-center', cart.kind === kind ? 'border-brand bg-brand-soft' : 'border-stone-200')}
                >
                  <Icon className={cn('mb-0.5 size-5', cart.kind === kind ? 'text-brand' : 'text-stone-500')} aria-hidden />
                  <span className="text-sm font-extrabold">{label}</span>
                  <span className="text-xs text-stone-500">{hint}</span>
                </button>
              ))}
            </div>
          </Box>

          <Box title={t('checkout.details')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-bold">{t('checkout.name')}</span>
                <input value={name} onChange={(e) => (setName(e.target.value), setError(null))} autoComplete="name" className={field('name')} />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold">{t('checkout.phone')}</span>
                <input
                  value={phone}
                  onChange={(e) => (setPhone(e.target.value), setError(null))}
                  onBlur={() => setPhone((p) => normalizePhone(p) ?? p)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0300-1234567"
                  className={field('phone')}
                />
              </label>
            </div>
            <p className="mt-1 text-xs text-stone-500">{t('checkout.phoneHint')}</p>
            {delivery ? (
              <label className="mt-3 block">
                <span className="mb-1 block text-sm font-bold">{t('checkout.address')}</span>
                <textarea
                  value={address}
                  onChange={(e) => (setAddress(e.target.value), setError(null))}
                  rows={2}
                  autoComplete="street-address"
                  placeholder={t('checkout.addressPlaceholder')}
                  className={cn(field('address'), 'py-3')}
                />
                {(saved?.addresses.length ?? 0) > 1 && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {saved?.addresses.map((a) => (
                      <button key={a} type="button" onClick={() => setAddress(a)} className="max-w-full truncate rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600 hover:border-brand">
                        {a}
                      </button>
                    ))}
                  </span>
                )}
              </label>
            ) : (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-stone-50 p-3 text-sm text-stone-700">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t('checkout.pickupFrom', { address: store.branch.address })}
              </p>
            )}
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-bold">{t('checkout.note')}</span>
              <input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
            </label>
          </Box>

          <Box title={t('checkout.payment')}>
            <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-3">
              <Banknote className="size-6 shrink-0 text-brand" aria-hidden />
              <span>
                <span className="block font-extrabold">{delivery ? t('checkout.cod') : t('checkout.atPickup')}</span>
                <span className="block text-xs text-stone-600">{delivery ? t('checkout.codBody') : t('checkout.atPickupBody')}</span>
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-500">{t('checkout.onlineLater')}</p>
          </Box>
          <button type="submit" hidden />
        </form>

        <aside className="space-y-3 rounded-3xl bg-white p-5 shadow-sm lg:sticky lg:top-20" aria-label={t('checkout.summary')}>
          <h2 className="text-lg font-extrabold tracking-tight">{t('checkout.summary')}</h2>
          <ul className="space-y-2 text-sm">
            {views.map((v) => (
              <li key={v.line.lineId} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-semibold">
                    {v.line.quantity} × {v.item.name}
                  </span>
                  {v.detail && <span className="block text-xs text-stone-500">{v.detail}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatPaisa(v.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-stone-100 pt-3">
            <TotalsList totals={totals} />
          </div>
          {error && (
            <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
              {error.text}
            </p>
          )}
          <Button className="w-full" disabled={busy} onClick={() => void place()}>
            {busy ? t('checkout.placing') : t('checkout.place', { total: formatPaisa(totals.total) })}
          </Button>
        </aside>
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-lg font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

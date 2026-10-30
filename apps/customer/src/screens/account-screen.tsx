'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { checkCheckout, formatPaisa, normalizePhone } from '@restaurant-saas/shared';
import { Button, Loading, fieldClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, type CustomerProfile } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useStore } from './store-shell';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Customer account screens (owner, 2026-10-30; moved forward from Phase 7 as DEMO screens): sign in, details,
 * saved addresses, orders on this device. No password or code is checked: real accounts need a phone code by
 * SMS (paid, owner approval) and the backend. Ordering never needs an account.
 */
export function AccountScreen() {
  const { store } = useStore();
  const slug = store.restaurant.slug;
  const profile = useApiQuery(() => getApi().getProfile(slug), [slug]);
  if (profile.loading && !profile.data) return <Loading />;
  if (!profile.data) return null;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-black tracking-tight">{t('account.title')}</h1>
      {/* A new key when the saved details change starts the form from them. */}
      <ProfileCard key={JSON.stringify(profile.data)} slug={slug} profile={profile.data} />
      <OrdersCard />
    </div>
  );
}

function ProfileCard({ slug, profile }: { slug: string; profile: CustomerProfile }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [newAddress, setNewAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (signedIn: boolean, addresses = profile.addresses) => {
    const problem = checkCheckout({ kind: 'TAKEAWAY', name, phone, address: '' });
    if (problem) {
      setError(problem.problem === 'NAME_REQUIRED' ? t('account.errors.NAME_REQUIRED') : t('account.errors.PHONE_INVALID'));
      return false;
    }
    setError(null);
    await getApi().saveProfile(slug, { signedIn, name: name.trim(), phone: normalizePhone(phone) ?? phone, addresses });
    return true;
  };

  const fields = (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-bold">{t('account.name')}</span>
        <input value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} autoComplete="name" className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">{t('account.phone')}</span>
        <input value={phone} onChange={(e) => (setPhone(e.target.value), setSaved(false))} onBlur={() => setPhone((p) => normalizePhone(p) ?? p)} inputMode="tel" autoComplete="tel" placeholder="0300-1234567" className={fieldClass} />
      </label>
    </div>
  );
  const problem = error && (
    <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
      {error}
    </p>
  );
  const demoNote = <p className="mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">{t('account.demoNote')}</p>;

  if (!profile.signedIn) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold tracking-tight">{t('account.signInTitle')}</h2>
        <p className="mb-3 text-sm text-stone-600">
          {t('account.signInBody')} {t('account.guest')}
        </p>
        {fields}
        {problem}
        <Button className="mt-3" onClick={() => void save(true)}>
          {t('account.continue')}
        </Button>
        {demoNote}
      </section>
    );
  }
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      {fields}
      {problem}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={async () => setSaved(await save(true))}>{saved ? t('account.saved') : t('account.save')}</Button>
        {/* Signing out forgets the details on this device (it may be a shared phone). */}
        <Button variant="ghost" onClick={() => void getApi().saveProfile(slug, { signedIn: false, name: '', phone: '', addresses: [] })}>
          {t('account.signOut')}
        </Button>
      </div>

      <h2 className="mb-2 mt-5 text-lg font-extrabold tracking-tight">{t('account.addresses')}</h2>
      {profile.addresses.length === 0 && <p className="text-sm text-stone-500">{t('account.noAddresses')}</p>}
      <ul className="space-y-2">
        {profile.addresses.map((address, i) => (
          <li key={address} className="flex items-center gap-2 rounded-2xl border border-stone-200 p-2 pl-4 text-sm">
            <span className="min-w-0 flex-1">{address}</span>
            <button
              type="button"
              aria-label={t('account.removeAddress', { n: i + 1 })}
              onClick={() => void getApi().saveProfile(slug, { ...profile, addresses: profile.addresses.filter((a) => a !== address) })}
              className="grid size-10 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const address = newAddress.trim();
          if (address.length < 5 || profile.addresses.includes(address)) return;
          void getApi().saveProfile(slug, { ...profile, addresses: [...profile.addresses, address] });
        }}
      >
        <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder={t('checkout.addressPlaceholder')} aria-label={t('account.newAddress')} className={fieldClass} />
        <Button type="submit" variant="secondary" className="shrink-0">
          <Plus className="size-4" aria-hidden />
          {t('account.addAddress')}
        </Button>
      </form>
      {demoNote}
    </section>
  );
}

function OrdersCard() {
  const { store, base } = useStore();
  const orders = useApiQuery(() => getApi().listMyOrders(store.restaurant.slug, store.branch.slug), [store.restaurant.slug, store.branch.slug]);
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-2 text-lg font-extrabold tracking-tight">{t('account.orders')}</h2>
      {orders.data?.length === 0 && <p className="text-sm text-stone-500">{t('account.noOrders')}</p>}
      <ul className="divide-y divide-stone-100">
        {orders.data?.map((order) => (
          <li key={order.token} className="flex items-center justify-between gap-3 py-3" data-my-order={order.dailyNumber}>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{t('account.orderLine', { n: order.dailyNumber, time: when(order.history[0]?.at ?? ''), total: formatPaisa(order.totals.total) })}</span>
              <span className="block text-xs text-stone-500">{t(`status.${order.status}`)}</span>
            </span>
            <Link href={`${base}/track/${order.token}`} className="shrink-0 rounded-xl bg-brand-soft px-3 py-2 text-sm font-bold text-brand hover:bg-brand-line">
              {t('account.view')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

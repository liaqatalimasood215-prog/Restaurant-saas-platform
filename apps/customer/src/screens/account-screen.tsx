'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardList, Heart, LogIn, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { checkCheckout, normalizePhone } from '@restaurant-saas/shared';
import { ListSkeleton } from '@/components/skeletons';
import { Button, Problem, fieldClass, primaryLinkClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, type CustomerProfile } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { PageHeader } from './store-chrome';
import { useStore } from './store-context';

/**
 * Customer account screens (owner, 2026-10-30; moved forward from Phase 7 as DEMO screens): login, details, saved
 * addresses. No password or code is checked: real accounts need a phone code (paid, owner approval) and the backend.
 * Ordering never needs an account.
 */
export function AccountScreen() {
  const { store, base } = useStore();
  const slug = store.restaurant.slug;
  const profile = useApiQuery(() => getApi().getProfile(slug), [slug]);
  const link = (href: string, label: string, Icon: LucideIcon) => (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 font-bold hover:bg-stone-50">
      <Icon className="size-5 text-stone-500" aria-hidden />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-stone-400" aria-hidden />
    </Link>
  );
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('account.title')} back={base} />
      {profile.loading && !profile.data ? (
        <ListSkeleton />
      ) : !profile.data ? (
        <Problem title={t('app.errorTitle')} body={profile.error?.message} onRetry={profile.reload} />
      ) : (
        <div className="space-y-4">
          {!profile.data.signedIn && (
            <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm" data-login-card>
              <h2 className="text-lg font-extrabold tracking-tight">{t('account.signInTitle')}</h2>
              <p className="mb-3 text-sm text-stone-600">
                {t('account.signInBody')} {t('account.guest')}
              </p>
              <Link href={`${base}/login`} className={primaryLinkClass}>
                <LogIn className="size-4" aria-hidden />
                {t('account.login')}
              </Link>
            </section>
          )}
          {/* A new key when the saved details change starts the form from them. */}
          <ProfileCard key={JSON.stringify(profile.data)} slug={slug} profile={profile.data} />
          <nav aria-label={t('account.title')} className="divide-y divide-stone-100 overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
            {link(`${base}/orders`, t('account.orders'), ClipboardList)}
            {link(`${base}/menu?c=favourites`, t('account.favourites'), Heart)}
          </nav>
        </div>
      )}
    </div>
  );
}

function ProfileCard({ slug, profile }: { slug: string; profile: CustomerProfile }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [newAddress, setNewAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const hasDetails = Boolean(profile.name || profile.phone || profile.addresses.length > 0);

  const save = async () => {
    const problem = checkCheckout({ kind: 'TAKEAWAY', name, phone, address: '' });
    if (problem) {
      setError(problem.problem === 'NAME_REQUIRED' ? t('account.errors.NAME_REQUIRED') : t('account.errors.PHONE_INVALID'));
      return;
    }
    setError(null);
    await getApi().saveProfile(slug, { ...profile, name: name.trim(), phone: normalizePhone(phone) ?? phone });
    setSaved(true);
  };

  return (
    <section className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm" data-profile-card>
      <h2 className="mb-3 text-lg font-extrabold tracking-tight">{t('account.details')}</h2>
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
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => void save()}>{saved ? t('account.saved') : t('account.save')}</Button>
        {/* Signing out forgets the details on this device (it may be a shared phone). */}
        {(profile.signedIn || hasDetails) && (
          <Button variant="ghost" onClick={() => void getApi().saveProfile(slug, { signedIn: false, name: '', phone: '', addresses: [] })}>
            {profile.signedIn ? t('account.signOut') : t('account.forget')}
          </Button>
        )}
      </div>

      <h2 className="mb-2 mt-5 text-lg font-extrabold tracking-tight">{t('account.addresses')}</h2>
      {profile.addresses.length === 0 && <p className="text-sm text-stone-500">{t('account.noAddresses')}</p>}
      <ul className="space-y-2">
        {profile.addresses.map((address, i) => (
          <li key={address} className="flex items-center gap-2 rounded-2xl border border-stone-200 p-1 pl-4 text-sm">
            <span className="min-w-0 flex-1">{address}</span>
            <button
              type="button"
              aria-label={t('account.removeAddress', { n: i + 1 })}
              onClick={() => void getApi().saveProfile(slug, { ...profile, addresses: profile.addresses.filter((a) => a !== address) })}
              className="grid size-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
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
      <p className="mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800">{t('account.demoNote')}</p>
    </section>
  );
}

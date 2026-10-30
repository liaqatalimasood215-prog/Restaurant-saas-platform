'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageCircle, MessageSquareText } from 'lucide-react';
import { normalizePhone } from '@restaurant-saas/shared';
import { Button, NotConnected, fieldClass } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { DemoChip, StoreLogo } from './store-chrome';
import { useStore } from './store-context';

type Channel = 'whatsapp' | 'sms';

/**
 * Login (owner's design, screen 1): +92 phone, code by WhatsApp or SMS, Google. All NOT CONNECTED: no code is sent and
 * nothing is checked, so this is never security. Real codes need the backend and a paid service, with the owner's approval.
 * "Skip" stays because ordering never needs an account (owner, 2026-10-30).
 */
export function LoginScreen() {
  const { store, base, notify } = useStore();
  const router = useRouter();
  const slug = store.restaurant.slug;
  const profile = useApiQuery(() => getApi().getProfile(slug), [slug]);
  const [digits, setDigits] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [googleNote, setGoogleNote] = useState(false);
  const [busy, setBusy] = useState(false);

  const remembered = profile.data?.phone.replace(/\D/g, '').replace(/^0/, '') ?? '';
  const phone = digits ?? remembered;
  const channelName = t(channel === 'whatsapp' ? 'login.whatsapp' : 'login.sms');

  const sendCode = () => {
    const normalized = normalizePhone(phone);
    if (!normalized) return setError(t('login.phoneInvalid'));
    setError(null);
    setGoogleNote(false);
    setCode('');
    setSentTo(normalized);
  };

  const verify = async () => {
    if (code.length !== 6 || !sentTo) return setError(t('login.codeInvalid'));
    setError(null);
    setBusy(true);
    await getApi().saveProfile(slug, { name: profile.data?.name ?? '', addresses: profile.data?.addresses ?? [], phone: sentTo, signedIn: true });
    notify(t('login.done'));
    router.replace(`${base}/account`);
  };

  const channelButton = (value: Channel, label: string, Icon: typeof MessageCircle) => (
    <button type="button" aria-pressed={channel === value} data-channel={value} onClick={() => setChannel(value)} className={cn('flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 px-3 text-sm font-bold transition-colors', channel === value ? 'border-green-600 bg-green-50 text-green-800' : 'border-stone-200 text-stone-700 hover:border-stone-300')}>
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
  const problem = error && (
    <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
      {error}
    </p>
  );
  const note = (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800" data-login-note>
      {t('login.note')}
    </div>
  );

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between gap-2">
        <StoreLogo />
        <div className="flex items-center gap-1">
          <span className="lg:hidden">
            <DemoChip />
          </span>
          <Link href={base} className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-stone-500 hover:text-stone-900">
            {t('login.skip')}
          </Link>
        </div>
      </div>

      {sentTo === null ? (
        <>
          <h1 className="text-3xl font-black leading-tight tracking-tight">{store.brand.headline ?? t('login.welcome', { name: store.restaurant.name })}</h1>
          <p className="text-sm text-stone-600">{store.brand.tagline}</p>
          <div aria-hidden className="grid h-40 place-items-center rounded-3xl bg-gradient-to-br from-brand-soft to-accent-soft">
            <span className="flex items-end gap-2">
              <span className="text-5xl">{store.brand.heroEmoji[0]}</span>
              <span className="text-8xl">🛵</span>
              <span className="text-5xl">{store.brand.heroEmoji[1]}</span>
            </span>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-bold">{t('login.phone')}</span>
            <span className="flex gap-2">
              <span aria-hidden className="flex min-h-12 shrink-0 items-center rounded-2xl border border-stone-300 bg-stone-50 px-3 text-base font-bold">
                +92
              </span>
              <input
                value={phone}
                onChange={(e) => {
                  setDigits(e.target.value);
                  setError(null);
                }}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t('login.placeholder')}
                aria-label={t('login.phone')}
                className={fieldClass}
              />
            </span>
          </label>

          <div role="group" aria-label={t('login.via')}>
            <p className="mb-1 text-sm font-bold">{t('login.via')}</p>
            <div className="grid grid-cols-2 gap-2">
              {channelButton('whatsapp', t('login.whatsapp'), MessageCircle)}
              {channelButton('sms', t('login.sms'), MessageSquareText)}
            </div>
          </div>
          {problem}
          <Button className="w-full" onClick={sendCode}>
            {t('login.continue', { channel: channelName })}
            <ArrowRight className="size-4" aria-hidden />
          </Button>

          <p className="flex items-center gap-3 text-xs font-bold text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            {t('login.or')}
            <span className="h-px flex-1 bg-stone-200" />
          </p>
          <Button variant="secondary" className="w-full" onClick={() => setGoogleNote(true)} data-google>
            {t('login.google')}
            <NotConnected />
          </Button>
          {googleNote && (
            <p role="status" className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {t('login.googleNote')}
            </p>
          )}
          {note}
        </>
      ) : (
        <>
          <button type="button" onClick={() => setSentTo(null)} className="-ml-2 flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-bold text-stone-600 hover:bg-stone-100">
            <ArrowLeft className="size-4" aria-hidden />
            {t('login.change')}
          </button>
          <h1 className="text-3xl font-black leading-tight tracking-tight">{t('login.codeTitle')}</h1>
          <p className="text-sm text-stone-600">{t('login.codeBody', { channel: channelName, phone: sentTo })}</p>
          <div className="group relative" data-otp>
            {/* One real input over six boxes: the phone's "paste the code" still works. */}
            <div aria-hidden className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className={cn('grid h-14 place-items-center rounded-2xl border-2 text-xl font-extrabold tabular-nums', i === code.length ? 'border-stone-300 group-focus-within:border-brand' : code[i] ? 'border-stone-400' : 'border-stone-200')}>
                  {code[i] ?? ''}
                </span>
              ))}
            </div>
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError(null);
              }}
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label={t('login.codeLabel')}
              className="absolute inset-0 size-full cursor-text opacity-0"
            />
          </div>
          {problem}
          <Button className="w-full" disabled={busy} onClick={() => void verify()}>
            {t('login.verify')}
          </Button>
          {note}
        </>
      )}
    </div>
  );
}

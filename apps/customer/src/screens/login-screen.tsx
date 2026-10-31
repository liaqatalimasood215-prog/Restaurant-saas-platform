'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageCircle, MessageSquareText } from 'lucide-react';
import { normalizePhone } from '@restaurant-saas/shared';
import { RiderArt } from '@/components/rider-art';
import { Button, NotConnected } from '@/components/ui';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { markWelcomed } from '@/lib/welcome';
import { DemoChip, StoreLogo } from './store-chrome';
import { useStore } from './store-context';

type Channel = 'whatsapp' | 'sms';

function PakistanFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-4 w-6 shrink-0 rounded-sm" aria-hidden>
      <rect width="30" height="20" fill="#01411c" />
      <rect width="8" height="20" fill="#fff" />
      <circle cx="19" cy="10" r="5" fill="#fff" />
      <circle cx="20.5" cy="8.8" r="4.4" fill="#01411c" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.8-2.1-6.8-5H1.2v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.2 6.6l4 3.1c1-2.9 3.6-4.9 6.8-4.9z" />
    </svg>
  );
}

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
  const phoneRef = useRef<HTMLInputElement>(null);

  // This screen opens by itself only once; Back or a reload then stays on Home.
  useEffect(() => markWelcomed(slug), [slug]);

  const remembered = profile.data?.phone.replace(/\D/g, '').replace(/^0/, '') ?? '';
  const phone = digits ?? remembered;
  const channelName = t(channel === 'whatsapp' ? 'login.whatsapp' : 'login.sms');
  const shortName = store.brand.wordmark ?? store.restaurant.name;

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
      <Icon className={cn('size-5', channel === value && value === 'whatsapp' && 'fill-green-600 text-green-600')} aria-hidden />
      {label}
    </button>
  );
  const problem = error && (
    <p role="alert" className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
      {error}
    </p>
  );
  const note = (
    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800" data-login-note>
      {t('login.note')}
    </p>
  );

  return (
    <div className="mx-auto max-w-md space-y-3">
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
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-tight">{store.brand.headline ?? t('login.welcome', { name: store.restaurant.name })}</h1>
            <p className="mt-1 text-sm text-stone-600">{store.brand.tagline}</p>
          </div>
          <RiderArt label={store.brand.wordmark ?? store.brand.logoText} className="mx-auto h-44 w-auto max-w-full" />

          <label className="block">
            <span className="mb-1 block text-sm font-bold">{t('login.phone')}</span>
            <span className="flex min-h-12 items-center gap-2 rounded-2xl border border-stone-300 bg-white pl-3 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-line">
              <PakistanFlag />
              <span aria-hidden className="border-r border-stone-200 pr-2 text-base font-bold">
                +92
              </span>
              <input
                ref={phoneRef}
                value={phone}
                onChange={(e) => {
                  setDigits(e.target.value);
                  setError(null);
                }}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t('login.placeholder')}
                aria-label={t('login.phone')}
                className="min-h-11 w-full min-w-0 rounded-r-2xl bg-transparent pr-3 text-base outline-none"
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
            {channel === 'whatsapp' ? <MessageCircle className="size-5" aria-hidden /> : <MessageSquareText className="size-5" aria-hidden />}
            {t('login.continue', { channel: channelName })}
            <ArrowRight className="size-4" aria-hidden />
          </Button>

          <p className="flex items-center gap-3 text-xs font-bold text-stone-400">
            <span className="h-px flex-1 bg-stone-200" />
            {t('login.or')}
            <span className="h-px flex-1 bg-stone-200" />
          </p>
          <Button variant="secondary" className="w-full" onClick={() => setGoogleNote(true)} data-google>
            <GoogleMark />
            {t('login.google')}
            <NotConnected />
          </Button>
          {googleNote && (
            <p role="status" className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              {t('login.googleNote')}
            </p>
          )}
          <p className="flex min-h-11 flex-wrap items-center justify-center gap-1 text-sm text-stone-600">
            {t('login.newHere', { name: shortName })}
            <button type="button" onClick={() => phoneRef.current?.focus()} className="min-h-11 px-1 font-extrabold text-brand" data-create-account>
              {t('login.create')}
            </button>
          </p>
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

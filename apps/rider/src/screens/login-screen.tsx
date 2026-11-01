'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ArrowRight, ChefHat, Eye, EyeOff, Lock, UserRound } from 'lucide-react';
import { PHONE_EXAMPLE, PIN_LENGTH, normalizePhone } from '@restaurant-saas/shared';
import { DemoBadge } from '@/components/rider-header';
import { Button, Sheet } from '@/components/ui';
import { t } from '@/i18n';
import { getApi, getDemoControls, type RiderBranch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';

const FIELD = 'flex min-h-13 items-center gap-3 rounded-xl border bg-card px-3 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand';
const INPUT = 'min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted';

/** Phone + PIN or password (owner's picture). DEMO: nothing is checked; real login comes with the server (Phase 4). No public sign-up. */
export function LoginScreen({ restaurant, branch, info, onExplain }: { restaurant: string; branch: string; info: RiderBranch; onExplain: () => void }) {
  const accounts = useApiQuery(() => getDemoControls().listAccounts(restaurant, branch), [restaurant, branch]);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const standard = normalizePhone(phone);
    const phoneProblem = !phone.trim() ? t('login.phoneEmpty') : !standard ? t('login.phoneWrong', { example: PHONE_EXAMPLE }) : null;
    const pinProblem = !pin ? t('login.pinEmpty') : pin.length < PIN_LENGTH ? t('login.pinShort', { n: PIN_LENGTH }) : null;
    setPhoneError(phoneProblem);
    setPinError(pinProblem);
    setError(null);
    if (phoneProblem || pinProblem || !standard) return;
    setBusy(true);
    try {
      await getApi().login(restaurant, branch, standard, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('app.errorBody'));
      setBusy(false);
    }
  };

  const fillIn = (accountPhone: string) => {
    setPhone(accountPhone);
    setPin(getDemoControls().demoPin());
    setPhoneError(null);
    setPinError(null);
    setError(null);
  };

  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-card" data-login>
      <div className="relative h-[56dvh] max-h-[34rem] min-h-64 overflow-hidden bg-hero">
        {info.heroImage ? (
          <>
            <Image src={info.heroImage} alt="" fill priority sizes="(max-width: 512px) 100vw, 512px" className="object-cover object-top" />
            <p className="sr-only" data-restaurant-name>{info.restaurantName}</p>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 pb-8 text-center text-white">
            <ChefHat className="size-14" aria-hidden />
            <p className="px-6 text-2xl font-black" data-restaurant-name>{info.restaurantName}</p>
            <p className="text-lg font-bold">{t('app.name')}</p>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <DemoBadge onExplain={onExplain} />
        </div>
      </div>

      <div className="relative -mt-6 space-y-3 rounded-t-3xl bg-card px-5 pb-8 pt-6">
        <h1 className="text-center text-2xl font-black tracking-tight">{t('login.title')}</h1>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <form onSubmit={(e) => void submit(e)} noValidate className="space-y-3">
          <div>
            <label className={cn(FIELD, phoneError ? 'border-brand' : 'border-line')}>
              <UserRound className="size-5 shrink-0 text-muted" aria-hidden />
              <span className="sr-only">{t('login.phone')}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="username"
                enterKeyHint="next"
                placeholder={t('login.phone')}
                value={phone}
                disabled={busy}
                aria-invalid={phoneError ? true : undefined}
                aria-describedby={phoneError ? 'login-phone-error' : undefined}
                data-login-phone
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setPhone((value) => normalizePhone(value) ?? value)}
                className={INPUT}
              />
            </label>
            {phoneError && <p id="login-phone-error" role="alert" className="mt-1 px-1 text-sm font-semibold text-brand">{phoneError}</p>}
          </div>
          <div>
            <div className={cn(FIELD, 'pr-1', pinError ? 'border-brand' : 'border-line')}>
              <Lock className="size-5 shrink-0 text-muted" aria-hidden />
              <label className="contents">
                <span className="sr-only">{t('login.pin')}</span>
                <input
                  type={showPin ? 'text' : 'password'}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  placeholder={t('login.pin')}
                  value={pin}
                  disabled={busy}
                  aria-invalid={pinError ? true : undefined}
                  aria-describedby={pinError ? 'login-pin-error' : undefined}
                  data-login-pin
                  onChange={(e) => setPin(e.target.value)}
                  className={INPUT}
                />
              </label>
              <button type="button" onClick={() => setShowPin((on) => !on)} aria-label={t(showPin ? 'login.hidePin' : 'login.showPin')} aria-pressed={showPin} className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-page">
                {showPin ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
              </button>
            </div>
            {pinError && <p id="login-pin-error" role="alert" className="mt-1 px-1 text-sm font-semibold text-brand">{pinError}</p>}
          </div>
          <Button type="submit" disabled={busy} className="min-h-14 w-full text-lg font-extrabold">
            {t(busy ? 'login.busy' : 'login.submit')}
            {!busy && <ArrowRight className="size-5" aria-hidden />}
          </Button>
        </form>
        <button type="button" onClick={() => setForgot(true)} className="mx-auto block min-h-11 px-3 text-sm font-semibold text-brand">
          {t('login.forgot')}
        </button>

        <div className="space-y-2 rounded-xl bg-amber-50 p-3" data-demo-accounts>
          <p className="text-xs font-semibold text-amber-800">{t('demo.login')}</p>
          <div className="flex flex-wrap gap-2">
            {accounts.data?.map((account) => (
              <button
                key={account.id}
                type="button"
                disabled={busy}
                onClick={() => fillIn(account.phone)}
                data-login-account={account.name}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-300 bg-card px-3 text-sm font-bold text-ink"
              >
                {account.name}
                {!account.isActive && <span className="text-xs font-bold text-red-700">{t('login.disabledBadge')}</span>}
                {account.isActive && !account.activatedAt && <span className="text-xs font-bold text-amber-800">{t('login.invitedBadge')}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {forgot && (
        <Sheet title={t('login.forgotTitle')} onClose={() => setForgot(false)}>
          <div className="space-y-2 text-sm" data-forgot>
            <p className="text-ink">{t('login.forgotBody')}</p>
            <p className="text-ink">{t('login.noSignUp')}</p>
            <p className="rounded-xl bg-amber-50 px-3 py-2 font-semibold text-amber-800">{t('login.forgotStatus')}</p>
          </div>
        </Sheet>
      )}
    </main>
  );
}

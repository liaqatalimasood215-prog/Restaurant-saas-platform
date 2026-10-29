'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { PIN_LENGTH, checkPin } from '@restaurant-saas/shared';
import { DemoModeIndicator } from '@/components/shell/demo-mode';
import { Logo } from '@/components/shell/logo';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';

/**
 * Activation / PIN-reset page (owner, 2026-10-29). Opened from the single-use link the Owner sends;
 * the person creates their own PIN. Nobody else ever sees it. DEMO: the PIN is checked, not stored.
 */
export function ActivationScreen({ token }: { token: string }) {
  const router = useRouter();
  const info = useApiQuery(() => getApi().getActivation(token), [token]);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    const problem = checkPin(pin, confirmPin);
    if (problem) return setError(t(`activate.errors.${problem}`, { n: PIN_LENGTH }));
    setBusy(true);
    setError(null);
    try {
      await getApi().activateAccount(token, pin, confirmPin);
      // Clear the PIN from memory as soon as it is used.
      setPin('');
      setConfirmPin('');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-14 w-full rounded-xl border border-slate-300 bg-white px-3 text-center text-2xl tracking-[0.5em]';
  let body;
  if (done) {
    body = (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto size-12 text-green-600" aria-hidden />
        <h1 className="text-xl font-extrabold text-slate-900">{t('activate.done')}</h1>
        <p className="text-sm text-slate-600">{t('activate.doneBody')}</p>
        <Button className="w-full" size="lg" onClick={() => router.replace('/')}>
          {t('activate.goToLogin')}
        </Button>
      </div>
    );
  } else if (info.loading && !info.data) {
    body = <LoadingState />;
  } else if (!info.data) {
    body = (
      <>
        <h1 className="mb-2 text-xl font-extrabold text-slate-900">{t('activate.invalid')}</h1>
        <ErrorState message={info.error?.message} />
      </>
    );
  } else {
    const { kind, name, role, restaurantName } = info.data;
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{kind === 'PIN_RESET' ? t('activate.pinResetTitle') : t('activate.title')}</h1>
          <p className="text-sm text-slate-600">{t('activate.intro', { name, role: t(`roles.${role}`), restaurant: restaurantName })}</p>
        </div>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('activate.pin', { n: PIN_LENGTH })}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-bold text-slate-900">{t('activate.confirmPin')}</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            maxLength={PIN_LENGTH}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            className={field}
          />
        </label>
        <p className="text-xs text-slate-500">{t('activate.pinHint')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {t('activate.submit')}
        </Button>
        <p className="text-xs text-slate-500">{t('activate.demoNote')}</p>
      </form>
    );
  }

  return (
    <div className="min-h-dvh bg-surface px-4 py-6">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between gap-2">
          <Logo />
          <DemoModeIndicator />
        </div>
        <Card>
          <CardBody className="p-5">{body}</CardBody>
        </Card>
      </div>
    </div>
  );
}

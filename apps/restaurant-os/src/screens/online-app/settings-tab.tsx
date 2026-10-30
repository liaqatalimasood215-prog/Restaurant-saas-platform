'use client';

import { useState } from 'react';
import { Truck } from 'lucide-react';
import { MAX_PREP_MINUTES, checkOnlineSettings, paisaToInput, parseRupees, type OnlineAppView } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Heading, type OnlineTabProps } from './online-parts';

export function SettingsTab({ view, canManage }: OnlineTabProps) {
  return (
    <div className="max-w-3xl">
      {/* A new key after a save or a change in Settings starts the form from the saved values. */}
      <TermsCard key={`${view.deliveryFee}-${view.minOrder}-${view.defaultPrepMinutes}`} view={view} canManage={canManage} />
    </div>
  );
}

function TermsCard({ view, canManage }: { view: OnlineAppView; canManage: boolean }) {
  const toast = useToast();
  const [fee, setFee] = useState(paisaToInput(view.deliveryFee));
  const [min, setMin] = useState(paisaToInput(view.minOrder));
  const [prep, setPrep] = useState(String(view.defaultPrepMinutes));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = fee !== paisaToInput(view.deliveryFee) || min !== paisaToInput(view.minOrder) || prep !== String(view.defaultPrepMinutes);

  const save = async () => {
    const deliveryFee = parseRupees(fee);
    const minOrder = parseRupees(min);
    const defaultPrepMinutes = /^\s*\d+\s*$/.test(prep) ? Number(prep) : Number.NaN;
    const problem = checkOnlineSettings({ deliveryFee, minOrder, defaultPrepMinutes });
    if (problem || deliveryFee === null || minOrder === null) {
      return setError(problem === 'MINUTES_INVALID' ? t('onlineApp.minutesInvalid', { max: MAX_PREP_MINUTES }) : t('onlineApp.moneyInvalid'));
    }
    setBusy(true);
    setError(null);
    try {
      await getApi().saveOnlineSettings({ deliveryFee, minOrder, defaultPrepMinutes });
      toast.show({ tone: 'success', title: t('onlineApp.saved') });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'min-h-12 w-full min-w-0 border border-slate-300 bg-white px-3 text-base disabled:bg-slate-100 disabled:text-slate-500';
  const box = 'flex items-center border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600';
  const money = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="block">
      <span className="mb-1 block font-bold text-slate-900">{label}</span>
      <span className="flex">
        <span className={cn(box, 'rounded-l-xl border-r-0')} aria-hidden>
          Rs.
        </span>
        <input value={value} onChange={(e) => (onChange(e.target.value), setError(null))} disabled={!canManage} inputMode="decimal" aria-label={label} className={cn(field, 'rounded-r-xl')} />
      </span>
    </label>
  );

  return (
    <Card>
      <CardBody className="space-y-3">
        <Heading icon={Truck} title={t('onlineApp.terms')} />
        <p className="text-xs text-slate-500">{t('onlineApp.settingsHint')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {money(t('onlineApp.deliveryFee'), fee, setFee)}
          {money(t('onlineApp.minOrder'), min, setMin)}
          <label className="block">
            <span className="mb-1 block font-bold text-slate-900">{t('onlineApp.prepMinutes')}</span>
            <span className="flex">
              <input value={prep} onChange={(e) => (setPrep(e.target.value), setError(null))} disabled={!canManage} inputMode="numeric" aria-label={t('onlineApp.prepMinutes')} className={cn(field, 'rounded-l-xl')} />
              <span className={cn(box, 'rounded-r-xl border-l-0')} aria-hidden>
                {t('onlineApp.min')}
              </span>
            </span>
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        {canManage && dirty && (
          <div className="flex justify-end">
            <Button onClick={() => void save()} disabled={busy}>
              {t('onlineApp.save')}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

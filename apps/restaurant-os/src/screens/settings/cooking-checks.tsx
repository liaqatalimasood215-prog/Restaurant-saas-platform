'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { MAX_COOKING_CHECKS, isClockTime, type CookingCheckTime } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { useApiQuery } from '@/lib/hooks/use-api-query';

/**
 * The times the cooking plan is checked against the raw stock (owner's I3 brief, 2026-11-09): each time looks at today's or
 * tomorrow's plan, and the Owner and Manager are told what is short. Default 20:00 for tomorrow and 07:00 for today. Owner only.
 */
export function CookingChecks() {
  const plan = useApiQuery(() => getApi().getCookingPlan(), []);
  if (!plan.data) return <LoadingState />;
  return <ChecksForm key={JSON.stringify(plan.data.checks)} checks={plan.data.checks} />;
}

function ChecksForm({ checks: saved }: { checks: CookingCheckTime[] }) {
  const toast = useToast();
  const [checks, setChecks] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (index: number, patch: Partial<CookingCheckTime>) => setChecks((all) => all.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  const save = async () => {
    if (checks.some((c) => !isClockTime(c.time))) return setError(t('settings.cookingChecksInvalid'));
    setBusy(true);
    setError(null);
    try {
      await getApi().saveCookingChecks(checks);
      toast.show({ tone: 'success', title: t('inventory.cooking.checksSaved') });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3" data-cooking-checks>
      <h3 className="text-lg font-extrabold text-slate-900">{t('inventory.cooking.checksTitle')}</h3>
      <p className="text-sm text-slate-600">{t('inventory.cooking.checksHint')}</p>
      <ul className="space-y-2">
        {checks.map((check, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2">
            <input type="time" value={check.time} onChange={(e) => set(index, { time: e.target.value })} aria-label={t('settings.cookingCheckTime', { n: index + 1 })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              {t('inventory.cooking.checkFor')}
              <select value={check.forDay} onChange={(e) => set(index, { forDay: e.target.value as CookingCheckTime['forDay'] })} aria-label={t('settings.cookingCheckDay', { n: index + 1 })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm">
                <option value="TOMORROW">{t('inventory.cooking.plan.tomorrow')}</option>
                <option value="TODAY">{t('inventory.cooking.plan.today')}</option>
              </select>
            </label>
            <button type="button" onClick={() => setChecks((all) => all.filter((_, i) => i !== index))} aria-label={t('inventory.cooking.removeCheck', { time: check.time })} className="press grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50">
              <Trash2 className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={checks.length >= MAX_COOKING_CHECKS} onClick={() => setChecks((all) => [...all, { time: '08:00', forDay: 'TODAY' }])}>
          <Plus className="size-4" aria-hidden />
          {t('inventory.cooking.addCheck')}
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          {t('inventory.cooking.saveChecks')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * When the closing review of the ready food that is left is due (owner's I4 rule, 2026-11-09): from this time the Owner and
 * Manager are asked to keep, give to staff or waste (with a reason) what was made and not sold. Default 23:00. Owner only.
 */
export function ClosingTime() {
  const view = useApiQuery(() => getApi().getAvailableFood(), []);
  if (!view.data) return <LoadingState />;
  return <ClosingForm key={view.data.closingTime} saved={view.data.closingTime} />;
}

function ClosingForm({ saved }: { saved: string }) {
  const toast = useToast();
  const [time, setTime] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!isClockTime(time)) return setError(t('settings.cookingChecksInvalid'));
    setError(null);
    try {
      await getApi().saveClosingTime(time);
      toast.show({ tone: 'success', title: t('food.closingSaved', { time }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    }
  };
  return (
    <div className="space-y-2" data-closing-time>
      <h3 className="text-lg font-extrabold text-slate-900">{t('food.closingTitle')}</h3>
      <p className="text-sm text-slate-600">{t('food.closingHint')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={t('food.closingTitle')} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        <Button onClick={() => void save()}>{t('food.closingSave')}</Button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}

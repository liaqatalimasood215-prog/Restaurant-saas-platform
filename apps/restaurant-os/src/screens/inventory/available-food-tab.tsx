'use client';

import { useState } from 'react';
import { AlarmClock, PackageCheck } from 'lucide-react';
import { WASTE_REASONS, formatPaisa, formatQuantity, type AvailableFood } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type AvailableFoodRow } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' });
/** "1" for dishes counted by the piece (a 1 kg karahi is one portion), "2 kg" for dishes sold by weight */
const portions = (n: number, unit: AvailableFood['unit']) => (unit === 'piece' ? String(n) : formatQuantity(n, unit));
const label = (food: Pick<AvailableFood, 'name' | 'variantName'>) => (food.variantName ? `${food.name} (${food.variantName})` : food.name);

/**
 * Stock → Available Food (owner, 2026-11-09): food that was made and then cancelled, not served and safe, waiting for another
 * order of the same dish (the kitchen gives it with "Give this"). Its raw stock was taken once, by the first order. At closing
 * the food that is left is reviewed: kept for tomorrow where the dish allows it, a staff meal, or wastage with a reason — only
 * what cannot be kept is wastage.
 */
export function AvailableFoodTab({ canManage }: { canManage: boolean }) {
  const view = useApiQuery(() => getApi().getAvailableFood(), []);
  const [closing, setClosing] = useState<{ row: AvailableFoodRow; kind: 'WASTE' | 'STAFF_MEAL' } | null>(null);
  const toast = useToast();
  if (view.loading && !view.data) return <LoadingState />;
  if (!view.data) return <ErrorState message={view.error?.message} onRetry={view.reload} />;
  const { rows, waste, reviewDue, closingTime } = view.data;
  const open = rows.filter((r) => r.state !== 'DONE');
  const keep = async (row: AvailableFoodRow) => {
    try {
      await getApi().closeAvailableFood(row.food.id, 'KEEP', '');
      toast.show({ tone: 'success', title: t('food.kept', { name: label(row.food) }) });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
  };

  return (
    <div className="space-y-4" data-available-food-tab>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <PackageCheck className="size-5 text-green-700" aria-hidden />
          {t('food.tabTitle')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('food.tabHint')}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{t('food.closingAt', { time: closingTime })}</p>
        {reviewDue && open.length > 0 && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800" role="status" data-closing-review>
            <AlarmClock className="size-4 shrink-0" aria-hidden />
            {t('food.reviewDue', { n: open.length })}
          </p>
        )}
      </section>

      {rows.length === 0 ? (
        <EmptyState title={t('food.none')}>{t('food.noneBody')}</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const { food, state } = row;
            return (
              <li
                key={food.id}
                className={cn('rounded-2xl border bg-white p-3 shadow-sm', state === 'TIME_OVER' ? 'border-red-300' : state === 'AVAILABLE' ? 'border-green-300' : 'border-slate-200 opacity-80')}
                data-available-food={label(food)}
                data-state={state}
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 font-extrabold text-slate-900">{label(food)}</p>
                  <Badge tone={state === 'AVAILABLE' ? 'green' : state === 'TIME_OVER' ? 'red' : 'grey'}>{t(`food.state.${state}`)}</Badge>
                </div>
                {food.modifierNames.length > 0 && <p className="text-xs font-semibold text-slate-600">{food.modifierNames.map((m) => `+ ${m}`).join('  ')}</p>}
                <p className="mt-1 text-sm font-bold text-slate-800" data-remaining={food.remaining}>
                  {t('food.left', { left: portions(food.remaining, food.unit), of: portions(food.quantity, food.unit) })}
                </p>
                <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-xs text-slate-600">
                  <dt className="font-semibold">{t('food.from')}</dt>
                  <dd>#{food.fromDailyNumber}</dd>
                  <dt className="font-semibold">{t('food.made')}</dt>
                  <dd>{time(food.madeAt)}</dd>
                  <dt className="font-semibold">{t('food.safeUntil')}</dt>
                  <dd className={cn(state === 'TIME_OVER' && 'font-bold text-red-700')}>{time(food.safeUntil)}</dd>
                  {food.cost !== null && (
                    <>
                      <dt className="font-semibold">{t('food.cost')}</dt>
                      <dd>{formatPaisa(food.cost)}</dd>
                    </>
                  )}
                </dl>
                {food.givenTo.length > 0 && (
                  <p className="mt-1 text-xs font-bold text-green-800" data-given-to>
                    {t('food.givenTo', { list: food.givenTo.map((g) => `#${g.dailyNumber}`).join(', ') })}
                  </p>
                )}
                {food.closed.map((c, i) => (
                  <p key={i} className="mt-1 text-xs font-bold text-red-800">
                    {t(c.kind === 'WASTE' ? 'food.wasted' : 'food.staffMealDone', { n: c.quantity, reason: c.reason })}
                  </p>
                ))}
                {canManage && food.remaining > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {row.overnight && (
                      <Button variant="outline" onClick={() => void keep(row)}>
                        {t('food.keepTomorrow')}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setClosing({ row, kind: 'STAFF_MEAL' })}>
                      {t('food.staffMeal')}
                    </Button>
                    <Button variant="secondary" className="text-red-700" onClick={() => setClosing({ row, kind: 'WASTE' })}>
                      {t('food.WASTE')}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-food-waste>
        <h3 className="font-extrabold text-slate-900">{t('food.wasteToday')}</h3>
        {waste.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">{t('food.noWaste')}</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {waste.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-x-2 py-1.5" data-waste-row={label(w)}>
                <Badge tone={w.kind === 'WASTE' ? 'red' : 'amber'}>{t(w.kind === 'WASTE' ? 'food.WASTE' : 'food.staffMeal')}</Badge>
                <span className="font-bold">{`${formatQuantity(w.quantity, w.unit)} ${label(w)}`}</span>
                {w.dailyNumber !== null && <span className="text-slate-500">#{w.dailyNumber}</span>}
                <span className="text-slate-600">{w.reason}</span>
                {w.cost !== null && <span className="ml-auto tabular-nums">{formatPaisa(w.cost)}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {closing && <CloseFoodDialog row={closing.row} kind={closing.kind} onClose={() => setClosing(null)} />}
    </div>
  );
}

/** Wastage (a reason is required) or a staff meal for what is left of one ready food. */
function CloseFoodDialog({ row, kind, onClose }: { row: AvailableFoodRow; kind: 'WASTE' | 'STAFF_MEAL'; onClose: () => void }) {
  const [reason, setReason] = useState<string>(kind === 'WASTE' ? (row.state === 'TIME_OVER' ? WASTE_REASONS[1] : '') : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (kind === 'WASTE' && !reason.trim()) return setError(t('food.reasonRequired'));
    setBusy(true);
    try {
      await getApi().closeAvailableFood(row.food.id, kind, reason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title={t(kind === 'WASTE' ? 'food.wasteTitle' : 'food.staffMealTitle', { name: label(row.food), n: row.food.remaining })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button disabled={busy} onClick={() => void save()} className={kind === 'WASTE' ? 'bg-red-600 bg-none hover:bg-red-700' : undefined}>
            {t(kind === 'WASTE' ? 'food.WASTE' : 'food.staffMeal')}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">{t(kind === 'WASTE' ? 'food.wasteBody' : 'food.staffMealBody')}</p>
      <label className="block text-sm">
        <span className="mb-1 block font-bold text-slate-900">{t(kind === 'WASTE' ? 'food.reason' : 'food.note')}</span>
        {kind === 'WASTE' ? (
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2">
            <option value="">{t('food.chooseReason')}</option>
            {WASTE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <input value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} className="min-h-11 w-full rounded-xl border border-slate-300 px-3" />
        )}
      </label>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

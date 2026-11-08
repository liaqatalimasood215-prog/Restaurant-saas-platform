'use client';

import { useState } from 'react';
import { CalendarDays, CookingPot, ShoppingCart, Trash2 } from 'lucide-react';
import { MILLI, nextDate, parseQuantity, type PlanRow } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type CookingPlanView } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { amountText, fromDisplayMilli, toDisplayMilli, unitLabel } from './inventory-format';
import { CookDialog, cookedText } from './recipes/cooking-dialog';

type Draft = { key: string; preparedId: string; mode: PlanRow['mode']; amount: string };
const inputText = (milli: number) => String(Number((milli / MILLI).toFixed(3)));

/**
 * Cooking Plan (owner's I3 brief, 2026-11-09): what is cooked on a day (the daily plan, or that day's own), what all of it needs
 * added up, against the usable raw stock, and what is short; drafts the purchase bills for it; Cook now for today's dishes.
 * The same check runs at the alert times (8 pm for tomorrow, 7 am for today) and tells the Owner and Manager.
 */
export function CookingPlanTab({ canManage, initialDate, onOpenBill }: { canManage: boolean; initialDate?: string; onOpenBill: (supplierId: string) => void }) {
  const [date, setDate] = useState<string | undefined>(initialDate);
  const plan = useApiQuery(() => getApi().getCookingPlan(date), [date]);
  const recipes = useApiQuery(() => getApi().getRecipes(), []);
  if (plan.loading && !plan.data) return <LoadingState />;
  if (!plan.data) return <ErrorState message={plan.error?.message} onRetry={plan.reload} />;
  return <PlanView key={`${plan.data.date}:${JSON.stringify(plan.data.rows.map((r) => [r.preparedId, r.amountMilli]))}`} view={plan.data} recipes={recipes.data} canManage={canManage} onDate={setDate} onOpenBill={onOpenBill} />;
}

function PlanView({
  view,
  recipes,
  canManage,
  onDate,
  onOpenBill,
}: {
  view: CookingPlanView;
  recipes: Awaited<ReturnType<ReturnType<typeof getApi>['getRecipes']>> | undefined;
  canManage: boolean;
  onDate: (date: string) => void;
  onOpenBill: (supplierId: string) => void;
}) {
  const toast = useToast();
  const dishOf = (id: string) => view.dishes.find((d) => d.preparedId === id);
  const mainOf = (id: string) => recipes?.ingredients.find((i) => i.id === dishOf(id)?.mainId);
  const toInput = (row: PlanRow) => {
    const main = row.mode === 'MAIN' ? mainOf(row.preparedId) : undefined;
    return inputText(main ? toDisplayMilli(main, row.amountMilli) : row.amountMilli);
  };
  const [rows, setRows] = useState<Draft[]>(() => view.rows.map((r) => ({ key: r.preparedId, preparedId: r.preparedId, mode: r.mode, amount: toInput(r) })));
  const [adding, setAdding] = useState('');
  const [bills, setBills] = useState<Awaited<ReturnType<ReturnType<typeof getApi>['draftShortageBills']>> | null>(null);
  const [cooking, setCooking] = useState<{ preparedId: string; amountMilli: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tomorrow = nextDate(view.today);
  const short = view.needs.filter((n) => n.shortMilli > 0);

  const toRows = (): PlanRow[] | null => {
    const out: PlanRow[] = [];
    for (const row of rows) {
      const typed = parseQuantity(row.amount, { allowZero: false });
      if (typed === null) return null;
      const main = row.mode === 'MAIN' ? mainOf(row.preparedId) : undefined;
      out.push({ preparedId: row.preparedId, mode: row.mode, amountMilli: main ? fromDisplayMilli(main, typed) : typed });
    }
    return out;
  };
  const save = async (daily: boolean) => {
    const planRows = toRows();
    if (!planRows) return setError(t('inventory.cooking.errors.amount'));
    setBusy(true);
    setError(null);
    try {
      await getApi().saveCookingPlan({ date: daily ? null : view.date, rows: planRows });
      toast.show({ tone: 'success', title: t('inventory.cooking.plan.saved') });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    }
    setBusy(false);
  };
  const makeBills = async () => {
    setBusy(true);
    setError(null);
    try {
      setBills(await getApi().draftShortageBills(view.date));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    }
    setBusy(false);
  };

  const chip = (value: string, label: string) => (
    <button
      type="button"
      aria-pressed={view.date === value}
      onClick={() => onDate(value)}
      className={cn('press min-h-10 rounded-xl px-3.5 text-sm font-bold', view.date === value ? 'bg-brand-gradient text-white shadow-brand' : 'border border-slate-200 bg-white text-slate-700 shadow-sm')}
    >
      {label}
    </button>
  );
  const field = 'min-h-10 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums';
  const checks = view.checks.map((c) => t(c.forDay === 'TOMORROW' ? 'inventory.cooking.plan.checkTomorrow' : 'inventory.cooking.plan.checkToday', { time: c.time })).join(', ');

  return (
    <div className="space-y-3" data-cooking-plan={view.date}>
      <div className="bg-brand-gradient flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-brand">
        <CalendarDays className="size-7 shrink-0" aria-hidden />
        <div className="mr-auto min-w-0">
          <h2 className="text-lg font-extrabold">{t('inventory.cooking.plan.title')}</h2>
          <p className="text-sm text-white/85">{t('inventory.cooking.plan.subtitle')}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {chip(view.today, t('inventory.cooking.plan.today'))}
        {chip(tomorrow, t('inventory.cooking.plan.tomorrow'))}
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {t('inventory.cooking.plan.date')}
          <input type="date" value={view.date} onChange={(e) => e.target.value && onDate(e.target.value)} aria-label={t('inventory.cooking.plan.date')} className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm" />
        </label>
        <span className="text-xs text-slate-500">{view.ownPlan ? t('inventory.cooking.plan.ownPlan') : t('inventory.cooking.plan.dailyPlan')}</span>
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('inventory.cooking.plan.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm" data-plan-rows>
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold text-slate-600">
                  <th className="px-3 py-2">{t('inventory.cooking.plan.dish')}</th>
                  <th className="px-3 py-2">{t('inventory.cooking.plan.amount')}</th>
                  <th className="px-3 py-2">{t('inventory.cooking.plan.expected')}</th>
                  <th className="px-3 py-2">{t('inventory.cooking.plan.status')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const dish = dishOf(row.preparedId);
                  const saved = view.rows.find((r) => r.preparedId === row.preparedId);
                  const main = row.mode === 'MAIN' ? mainOf(row.preparedId) : undefined;
                  const unit = main ? unitLabel(main.stockUnit === 'g' ? 'kg' : main.stockUnit === 'ml' ? 'l' : main.stockUnit, 2 * MILLI) : t('inventory.cooking.batchUnit');
                  const dishIngredient = recipes?.prepared.find((p) => p.ingredient.id === row.preparedId)?.ingredient;
                  return (
                    <tr key={row.key} data-plan-row={dish?.name}>
                      <td className="px-3 py-2 font-bold text-slate-900">{dish?.name ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          <input value={row.amount} onChange={(e) => setRows((all) => all.map((r) => (r.key === row.key ? { ...r, amount: e.target.value } : r)))} disabled={!canManage} inputMode="decimal" aria-label={t('inventory.cooking.plan.amountOf', { name: dish?.name ?? '' })} className={field} />
                          <span className="text-xs font-semibold text-slate-600">
                            {unit}
                            {dish?.mainName && row.mode === 'MAIN' ? ` ${dish.mainName}` : ''}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{saved?.expectedMilli && dishIngredient ? cookedText(saved.expectedMilli, dishIngredient) : saved?.expectedMilli ? amountText(saved.expectedMilli, saved.stockUnit) : '—'}</td>
                      <td className="px-3 py-2">
                        {saved?.cooked ? <Badge tone="green">{t('inventory.cooking.plan.cooked')}</Badge> : !dish?.verified ? <Badge tone="amber">{t('inventory.cooking.plan.notVerified')}</Badge> : <Badge tone="grey">{t('inventory.cooking.plan.planned')}</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {canManage && view.date === view.today && saved && !saved.cooked && dish?.verified && recipes && (
                          <button type="button" onClick={() => setCooking({ preparedId: row.preparedId, amountMilli: saved.amountMilli })} className="press bg-brand-gradient mr-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-extrabold text-white shadow-brand">
                            <CookingPot className="size-3.5" aria-hidden />
                            {t('inventory.cooking.plan.cookNow')}
                          </button>
                        )}
                        {canManage && (
                          <button type="button" onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))} aria-label={t('inventory.cooking.plan.remove', { name: dish?.name ?? '' })} className="press inline-grid size-9 place-items-center rounded-lg text-red-700 hover:bg-red-50">
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 p-3">
            <select
              value={adding}
              onChange={(e) => {
                const dish = dishOf(e.target.value);
                if (dish) setRows((all) => [...all, { key: `${dish.preparedId}-${Date.now()}`, preparedId: dish.preparedId, mode: dish.mode, amount: '1' }]);
                setAdding('');
              }}
              aria-label={t('inventory.cooking.plan.addDish')}
              className="min-h-10 rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold"
            >
              <option value="">{t('inventory.cooking.plan.addDish')}</option>
              {view.dishes
                .filter((d) => !rows.some((r) => r.preparedId === d.preparedId))
                .map((d) => (
                  <option key={d.preparedId} value={d.preparedId}>
                    {d.name}
                  </option>
                ))}
            </select>
            <span className="ml-auto flex flex-wrap gap-2">
              <Button variant="secondary" disabled={busy} onClick={() => void save(true)}>
                {t('inventory.cooking.plan.saveDaily')}
              </Button>
              <Button disabled={busy} onClick={() => void save(false)}>
                {t('inventory.cooking.plan.saveDay', { date: view.date })}
              </Button>
            </span>
            <p className="basis-full text-xs text-slate-500">{t('inventory.cooking.plan.dailyNote')}</p>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="mr-auto text-base font-extrabold text-slate-900">{t('inventory.cooking.plan.needsTitle')}</h3>
          {short.length > 0 && <Badge tone="red">{t('inventory.cooking.plan.shortCount', { n: short.length })}</Badge>}
        </div>
        <p className="px-4 pt-2 text-xs text-slate-500">{t('inventory.cooking.plan.needsHint')}</p>
        {view.needs.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">{t('inventory.cooking.plan.empty')}</p>
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[34rem] text-sm" data-plan-needs>
              <thead>
                <tr className="text-left text-xs font-bold text-slate-600">
                  <th className="px-2 py-1.5">{t('inventory.cooking.ingredient')}</th>
                  <th className="px-2 py-1.5 text-right">{t('inventory.cooking.have')}</th>
                  <th className="px-2 py-1.5 text-right">{t('inventory.cooking.need')}</th>
                  <th className="px-2 py-1.5 text-right">{t('inventory.cooking.short')}</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.needs.map((n) => (
                  <tr key={n.ingredient.id} className={cn(n.shortMilli > 0 && 'bg-red-50')} data-plan-need={n.ingredient.name}>
                    <td className="px-2 py-1.5 font-semibold text-slate-900">
                      {n.ingredient.name}
                      {n.supplierName && <span className="block text-xs font-normal text-slate-500">{n.supplierName}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{amountText(n.haveMilli, n.ingredient.stockUnit)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{amountText(n.needMilli, n.ingredient.stockUnit)}</td>
                    <td className={cn('px-2 py-1.5 text-right font-bold tabular-nums', n.shortMilli > 0 ? 'text-red-700' : 'text-green-700')} data-short={n.shortMilli > 0 ? 'yes' : 'no'}>
                      {n.shortMilli > 0 ? amountText(n.shortMilli, n.ingredient.stockUnit) : '✓'}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="flex flex-wrap justify-end gap-1">
                        {n.shortMilli > 0 && <Badge tone="red">{t('inventory.cooking.plan.shortBadge')}</Badge>}
                        {n.low && <Badge tone="amber">{t('inventory.cooking.plan.lowBadge')}</Badge>}
                        {n.expired && <Badge tone="grey">{t('inventory.cooking.plan.expiredBadge')}</Badge>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="space-y-2 border-t border-slate-100 p-3">
          {short.length === 0 ? (
            <p className="text-sm font-semibold text-green-700">{t('inventory.cooking.plan.allThere')}</p>
          ) : (
            canManage && (
              <Button disabled={busy} onClick={() => void makeBills()}>
                <ShoppingCart className="size-4" aria-hidden />
                {t('inventory.cooking.plan.makeBills')}
              </Button>
            )
          )}
          {bills && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3" data-draft-bills>
              <p className="text-sm font-semibold text-slate-800">{t('inventory.cooking.plan.billsMade')}</p>
              <div className="flex flex-wrap gap-2">
                {bills.drafts.map((d) => (
                  <Button key={d.supplierId} variant="outline" onClick={() => onOpenBill(d.supplierId)}>
                    {t('inventory.cooking.plan.openBill', { name: d.supplierName, n: d.lines })}
                  </Button>
                ))}
              </div>
              {bills.withoutSupplier.length > 0 && <p className="text-sm text-amber-800">{t('inventory.cooking.plan.noSupplier', { names: bills.withoutSupplier.join(', ') })}</p>}
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-slate-600">
        {t('inventory.cooking.plan.checks', { list: checks })} {t('inventory.cooking.plan.changeChecks')}
      </p>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('inventory.cooking.plan.demoNote')}</p>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
      {cooking && recipes && recipes.prepared.some((p) => p.ingredient.id === cooking.preparedId) && (
        <CookDialog
          dish={recipes.prepared.find((p) => p.ingredient.id === cooking.preparedId)!.ingredient}
          view={recipes}
          planDate={view.date}
          amountMilli={cooking.amountMilli}
          onClose={() => setCooking(null)}
        />
      )}
    </div>
  );
}

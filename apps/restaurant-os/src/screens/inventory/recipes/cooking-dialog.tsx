'use client';

import { useState } from 'react';
import { CookingPot, RotateCcw, SquarePen } from 'lucide-react';
import {
  DEFAULT_PLATE_MILLI,
  MILLI,
  batchPlan,
  costPer,
  currentVersion,
  formatPaisa,
  linesCost,
  parseQuantity,
  platesOf,
  stockNeeds,
  verifiedVersion,
  type CookingBatch,
  type Ingredient,
  type RecipesView,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { amountText, fromDisplayMilli, toDisplayMilli, unitLabel } from '../inventory-format';
import { bookOf } from './recipe-draft';

const inputText = (milli: number) => String(Number((milli / MILLI).toFixed(3)));
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** "12.5 kg ≈ 50 plates" for cooked food in grams (or ml); other units as they are. */
export function cookedText(milli: number, dish: Pick<Ingredient, 'stockUnit' | 'plateMilli'>): string {
  const amount = amountText(milli, dish.stockUnit);
  if (dish.stockUnit !== 'g' && dish.stockUnit !== 'ml') return amount;
  return t('inventory.cooking.aboutPlates', { amount, n: platesOf(Math.max(0, milli), dish.plateMilli ?? DEFAULT_PLATE_MILLI) });
}

/**
 * Cook a batch (owner's I3 brief, 2026-11-09): how much raw main ingredient was used (or how many batches), the verified recipe
 * scaled to it with what is in stock, the expected output, and the ACTUAL output in kg or plates. Saved in one step; refused
 * while something is short.
 */
export function CookDialog({
  dish,
  view,
  planDate = null,
  amountMilli: plannedMilli,
  onClose,
}: {
  dish: Ingredient;
  view: RecipesView;
  planDate?: string | null;
  /** The plan's amount (raw main ingredient or batches) */
  amountMilli?: number;
  onClose: () => void;
}) {
  const toast = useToast();
  const row = view.prepared.find((p) => p.ingredient.id === dish.id);
  const version = row?.recipe ? verifiedVersion(row.recipe) : null;
  const draft = row?.recipe ? currentVersion(row.recipe) : null;
  const byId = new Map(view.ingredients.map((i) => [i.id, i]));
  const mainId = (version ?? draft)?.mainIngredientId ?? null;
  const main = mainId ? byId.get(mainId) : undefined;
  const mode = mainId ? 'MAIN' : 'BATCHES';
  const baseMilli = (version ?? draft)?.lines.find((l) => l.ingredientId === mainId)?.quantityMilli ?? MILLI;
  // The amount is typed in kg / litres for the main ingredient, or in batches
  const [amount, setAmount] = useState(() =>
    mode === 'MAIN' && main ? inputText(toDisplayMilli(main, plannedMilli ?? baseMilli)) : inputText(plannedMilli ?? MILLI),
  );
  const [actual, setActual] = useState('');
  const weighed = dish.stockUnit === 'g' || dish.stockUnit === 'ml';
  const [actualIn, setActualIn] = useState<'AMOUNT' | 'PLATES'>(weighed ? 'PLATES' : 'AMOUNT');
  const [plate, setPlate] = useState(inputText(dish.plateMilli ?? DEFAULT_PLATE_MILLI));
  const [note, setNote] = useState('');
  const [key] = useState(newKey);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const typed = parseQuantity(amount, { allowZero: false });
  const amountMilli = typed === null ? 0 : mode === 'MAIN' && main ? fromDisplayMilli(main, typed) : typed;
  const plan = version && amountMilli > 0 ? batchPlan(version, mode, amountMilli) : null;
  const needs = plan ? stockNeeds(plan.uses, (id) => view.onHand?.[id] ?? 0) : [];
  const short = needs.filter((n) => n.shortMilli > 0);
  const plateMilli = parseQuantity(plate, { allowZero: false }) ?? 0;
  const actualTyped = parseQuantity(actual, { allowZero: false });
  const actualMilli = actualTyped === null ? 0 : actualIn === 'PLATES' ? Math.round((actualTyped * plateMilli) / MILLI) : fromDisplayMilli(dish, actualTyped);
  const cost = plan ? linesCost(bookOf(view), plan.lines).total : null;
  const ownUnit = unitLabel(weighed ? (dish.stockUnit === 'g' ? 'kg' : 'l') : dish.stockUnit, 2 * MILLI);

  const save = async () => {
    if (!version) return setError(t('inventory.cooking.errors.notVerified'));
    if (!plan) return setError(t('inventory.cooking.errors.amount'));
    if (short.length > 0) return setError(t('inventory.cooking.errors.short'));
    if (actualMilli <= 0) return setError(t('inventory.cooking.errors.actual'));
    if (plateMilli <= 0) return setError(t('inventory.cooking.errors.plate'));
    setBusy(true);
    setError(null);
    try {
      await getApi().recordCookingBatch({ idempotencyKey: key, preparedId: dish.id, mode, amountMilli, actualMilli, plateMilli, planDate, note });
      toast.show({ tone: 'success', title: t('inventory.cooking.saved', { name: dish.name, amount: cookedText(actualMilli, { ...dish, plateMilli }) }) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm tabular-nums';
  const label = 'mb-1 block text-sm font-bold text-slate-900';

  return (
    <Dialog
      open
      size="xl"
      onClose={onClose}
      title={t('inventory.cooking.title', { name: dish.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy || !version || short.length > 0}>
            <CookingPot className="size-4" aria-hidden />
            {t('inventory.cooking.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-cook-dialog>
        {!version && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{t('inventory.cooking.notVerified')}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{mode === 'MAIN' && main ? t('inventory.cooking.rawUsed', { name: main.name }) : t('inventory.cooking.batches')}</span>
            <span className="flex items-center gap-2">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label={mode === 'MAIN' && main ? t('inventory.cooking.rawUsed', { name: main.name }) : t('inventory.cooking.batches')} className={field} />
              <span className="text-sm font-semibold text-slate-600">{mode === 'MAIN' && main ? unitLabel(main.stockUnit === 'g' ? 'kg' : main.stockUnit === 'ml' ? 'l' : main.stockUnit, 2 * MILLI) : t('inventory.cooking.batchUnit')}</span>
            </span>
          </label>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm" data-cook-expected>
            <span className="block font-bold text-slate-900">{t('inventory.cooking.expected')}</span>
            {plan ? cookedText(plan.expectedMilli, { ...dish, plateMilli: plateMilli || null }) : '—'}
          </div>
        </div>

        {plan && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm" data-cook-needs>
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-bold text-slate-600">
                  <th className="rounded-l-lg px-2 py-1.5">{t('inventory.cooking.ingredient')}</th>
                  <th className="px-2 py-1.5 text-right">{t('inventory.cooking.need')}</th>
                  <th className="px-2 py-1.5 text-right">{t('inventory.cooking.have')}</th>
                  <th className="rounded-r-lg px-2 py-1.5 text-right">{t('inventory.cooking.short')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {needs.map((n) => {
                  const ingredient = byId.get(n.ingredientId);
                  const unit = ingredient?.stockUnit ?? 'g';
                  return (
                    <tr key={n.ingredientId} className={cn(n.shortMilli > 0 && 'bg-red-50')} data-cook-line={ingredient?.name}>
                      <td className="px-2 py-1.5 font-semibold text-slate-900">{ingredient?.name ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{amountText(n.needMilli, unit)}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{amountText(n.haveMilli, unit)}</td>
                      <td className={cn('px-2 py-1.5 text-right font-bold tabular-nums', n.shortMilli > 0 ? 'text-red-700' : 'text-green-700')}>{n.shortMilli > 0 ? amountText(n.shortMilli, unit) : '✓'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {short.length > 0 && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{t('inventory.cooking.shortHint')}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className={label}>{t('inventory.cooking.actual')} *</span>
            <span className="flex items-center gap-2">
              <input value={actual} onChange={(e) => setActual(e.target.value)} inputMode="decimal" placeholder={plan ? inputText(actualIn === 'PLATES' ? platesOf(plan.expectedMilli, plateMilli || DEFAULT_PLATE_MILLI) * MILLI : toDisplayMilli(dish, plan.expectedMilli)) : '0'} aria-label={t('inventory.cooking.actual')} className={field} />
              {weighed ? (
                <select value={actualIn} onChange={(e) => setActualIn(e.target.value as 'AMOUNT' | 'PLATES')} aria-label={t('inventory.cooking.actualUnit')} className="min-h-11 rounded-xl border border-slate-300 bg-white px-2 text-sm font-semibold">
                  <option value="PLATES">{t('inventory.cooking.plates')}</option>
                  <option value="AMOUNT">{ownUnit}</option>
                </select>
              ) : (
                <span className="text-sm font-semibold text-slate-600">{ownUnit}</span>
              )}
            </span>
            <span className="mt-1 block text-xs text-slate-500">{t('inventory.cooking.actualHint')}</span>
          </label>
          {weighed && (
            <label className="block">
              <span className={label}>{t('inventory.cooking.plateSize', { unit: unitLabel(dish.stockUnit, 2 * MILLI) })}</span>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} inputMode="decimal" aria-label={t('inventory.cooking.plateSize', { unit: unitLabel(dish.stockUnit, 2 * MILLI) })} className={field} />
            </label>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-brand-soft/60 px-3 py-2 text-sm" data-cook-cost>
          <div>
            <dt className="text-xs font-semibold text-slate-600">{t('inventory.cooking.cost')}</dt>
            <dd className="font-black tabular-nums text-slate-900">{cost === null ? '—' : formatPaisa(cost)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-600">{t('inventory.cooking.perUnit', { unit: weighed ? ownUnit.replace(/s$/, '') : ownUnit })}</dt>
            <dd className="font-black tabular-nums text-slate-900" data-cost-per-unit>{actualMilli > 0 ? (costPer(cost, actualMilli, weighed ? 1000 * MILLI : MILLI) === null ? '—' : formatPaisa(costPer(cost, actualMilli, weighed ? 1000 * MILLI : MILLI)!)) : '—'}</dd>
          </div>
          {weighed && (
            <div>
              <dt className="text-xs font-semibold text-slate-600">{t('inventory.cooking.perPlate')}</dt>
              <dd className="font-black tabular-nums text-slate-900" data-cost-per-plate>{actualMilli > 0 && plateMilli > 0 && costPer(cost, actualMilli, plateMilli) !== null ? formatPaisa(costPer(cost, actualMilli, plateMilli)!) : '—'}</dd>
            </div>
          )}
        </dl>

        <label className="block">
          <span className={label}>{t('inventory.cooking.note')}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} aria-label={t('inventory.cooking.note')} className={field} />
        </label>
        <p className="text-xs text-slate-500">{t('inventory.cooking.demoNote')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

/** A dish's batches, newest first: when, what was used, what was made, cost a plate; Correct and Reverse (Owner / Manager). */
export function BatchList({ dish, batches, canManage, staffNames }: { dish: Ingredient; batches: CookingBatch[]; canManage: boolean; staffNames: Record<string, string> }) {
  const [fixing, setFixing] = useState<{ batch: CookingBatch; mode: 'CORRECT' | 'REVERSE' } | null>(null);
  if (batches.length === 0) return <p className="text-xs text-slate-500">{t('inventory.cooking.noBatches')}</p>;
  return (
    <>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100 bg-white" data-batch-list>
        {batches.map((b) => (
          <li key={b.id} className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-1.5 text-[13px]', b.status === 'REVERSED' && 'bg-slate-50 text-slate-400 line-through')} data-batch={b.status}>
            <span className="font-semibold tabular-nums">{new Date(b.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
            <span className="text-slate-600">{t('inventory.cooking.batchLine', { made: cookedText(b.actualMilli, { ...dish, plateMilli: b.plateMilli }), by: staffNames[b.createdBy] ?? '' })}</span>
            {b.cost !== null && b.plateMilli > 0 && <Badge tone="grey">{t('inventory.cooking.platePrice', { price: formatPaisa(costPer(b.cost, b.actualMilli, b.plateMilli) ?? 0) })}</Badge>}
            {(b.corrections?.length ?? 0) > 0 && <Badge tone="amber">{t('inventory.cooking.corrected')}</Badge>}
            {b.status === 'REVERSED' && <Badge tone="red">{t('inventory.cooking.reversed')}</Badge>}
            {canManage && b.status === 'DONE' && (
              <span className="ml-auto flex gap-1">
                <button type="button" onClick={() => setFixing({ batch: b, mode: 'CORRECT' })} className="press inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                  <SquarePen className="size-3.5" aria-hidden />
                  {t('inventory.cooking.correct')}
                </button>
                <button type="button" onClick={() => setFixing({ batch: b, mode: 'REVERSE' })} className="press inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-red-700 hover:bg-red-50">
                  <RotateCcw className="size-3.5" aria-hidden />
                  {t('inventory.cooking.reverse')}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {fixing && <FixBatchDialog dish={dish} batch={fixing.batch} mode={fixing.mode} onClose={() => setFixing(null)} />}
    </>
  );
}

/** Correct a batch's actual output, or reverse the whole batch; always with a reason. */
function FixBatchDialog({ dish, batch, mode, onClose }: { dish: Ingredient; batch: CookingBatch; mode: 'CORRECT' | 'REVERSE'; onClose: () => void }) {
  const toast = useToast();
  const weighed = dish.stockUnit === 'g' || dish.stockUnit === 'ml';
  const [actual, setActual] = useState(inputText(toDisplayMilli(dish, batch.actualMilli)));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'CORRECT') {
        const typed = parseQuantity(actual, { allowZero: false });
        if (typed === null) throw new Error(t('inventory.cooking.errors.actual'));
        await getApi().correctCookingBatch(batch.id, fromDisplayMilli(dish, typed), reason);
      } else {
        await getApi().reverseCookingBatch(batch.id, reason);
      }
      toast.show({ tone: 'success', title: mode === 'CORRECT' ? t('inventory.cooking.correctedToast') : t('inventory.cooking.reversedToast') });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };
  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';
  return (
    <Dialog
      open
      onClose={onClose}
      title={mode === 'CORRECT' ? t('inventory.cooking.correctTitle', { name: dish.name }) : t('inventory.cooking.reverseTitle', { name: dish.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {mode === 'CORRECT' ? t('inventory.cooking.correct') : t('inventory.cooking.reverse')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">{mode === 'CORRECT' ? t('inventory.cooking.correctHint') : t('inventory.cooking.reverseHint')}</p>
        {mode === 'CORRECT' && (
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-900">{t('inventory.cooking.actualIn', { unit: unitLabel(weighed ? (dish.stockUnit === 'g' ? 'kg' : 'l') : dish.stockUnit, 2 * MILLI) })}</span>
            <input value={actual} onChange={(e) => setActual(e.target.value)} inputMode="decimal" aria-label={t('inventory.cooking.actual')} className={field} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-900">{t('inventory.cooking.reason')} *</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={100} aria-label={t('inventory.cooking.reason')} className={field} />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

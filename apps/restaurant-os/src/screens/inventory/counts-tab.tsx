'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, Plus, Search, X } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  buyOptions,
  countStockMilli,
  formatPaisa,
  parseQuantity,
  type CountListRow,
  type CountRow,
  type CountScope,
  type CountView,
  type Ingredient,
  type InventoryView,
  type StockCount,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { newId } from '@/lib/new-id';
import { useSession } from '@/lib/session';
import { stockText, whenText } from './inventory-format';
import { optionLabel } from './purchase-bill';

const STATUS_TONE = { COUNTING: 'amber', SUBMITTED: 'brand', APPROVED: 'green', CANCELLED: 'grey' } as const;

function scopeText(scope: CountScope, label: string): string {
  if (scope.kind === 'CATEGORY') return t(`inventory.categories.${scope.category}`);
  if (scope.kind === 'LOCATION') return label;
  return t('inventory.counts.scopes.ALL');
}

/** "Missing Rs. 440 · Extra Rs. 120" (only the parts there are) */
function moneyText(summary: CountView['summary']): string {
  return [
    summary.lossCost ? t('inventory.counts.missing', { loss: formatPaisa(summary.lossCost) }) : '',
    summary.gainCost ? t('inventory.counts.extra', { gain: formatPaisa(summary.gainCost) }) : '',
    summary.unknownCost ? t('inventory.counts.unknownCost', { n: summary.unknownCost }) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Stock → Stock Counts (owner's Stage A, 2026-11-12): a list of counts, then one count: type what is on the shelf in any unit (blank
 * = not counted), see the difference and its value, submit; the Owner or a Manager approves (a Manager never his own count) and the
 * differences are posted once into the stock and its lots. Every step stays in the count's history.
 */
export function CountsTab({ view, startCountId = null }: { view: InventoryView; startCountId?: string | null }) {
  const { allowed } = useSession();
  const [openId, setOpenId] = useState<string | null>(startCountId);
  const [starting, setStarting] = useState(false);
  const list = useApiQuery(() => getApi().getStockCounts(), []);
  const canCount = allowed('inventory.count');

  if (openId) return <CountDetail countId={openId} view={view} canCount={canCount} onBack={() => setOpenId(null)} />;
  if (list.loading && !list.data) return <LoadingState />;
  if (!list.data) return <ErrorState message={list.error?.message} onRetry={list.reload} />;

  return (
    <div className="space-y-2.5" data-stock-counts>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <ClipboardCheck className="size-5 shrink-0 text-brand" aria-hidden />
            {t('inventory.counts.title')}
          </h2>
          <p className="text-xs text-slate-500">{t('inventory.counts.subtitle')}</p>
        </div>
        {canCount && (
          <Button size="sm" className="shrink-0" onClick={() => setStarting(true)}>
            <Plus className="size-4" aria-hidden />
            {t('inventory.counts.newCount')}
          </Button>
        )}
      </div>
      <Card className="divide-y divide-slate-100 overflow-hidden rounded-xl">
        {list.data.length === 0 && <p className="px-3 py-3 text-sm text-slate-500">{t('inventory.counts.none')}</p>}
        {list.data.map((row) => (
          <CountListItem key={row.count.id} row={row} onOpen={() => setOpenId(row.count.id)} />
        ))}
      </Card>
      {starting && <StartCountDialog view={view} onClose={() => setStarting(false)} onStarted={(c) => (setStarting(false), setOpenId(c.id))} />}
    </div>
  );
}

function CountListItem({ row, onOpen }: { row: CountListRow; onOpen: () => void }) {
  const { count, summary } = row;
  const money = moneyText(summary);
  return (
    <button type="button" onClick={onOpen} className="press flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-soft/30" data-count-row={count.number} data-count-status={count.status}>
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-tight text-slate-900">
          {t('inventory.counts.countN', { n: count.number })} · {scopeText(count.scope, row.scopeLabel)}
        </span>
        <span className="block text-[11px] text-slate-500">
          {t('inventory.counts.progress', { counted: summary.counted, items: summary.items })}
          {summary.withDifference ? ` · ${t('inventory.counts.diffs', { n: summary.withDifference })}` : ''}
          {money ? ` · ${money}` : ''} · {t('inventory.counts.startedBy', { name: row.startedByName ?? '—', when: whenText(count.startedAt) })}
        </span>
      </span>
      <Badge tone={STATUS_TONE[count.status]}>{t(`inventory.counts.status.${count.status}`)}</Badge>
      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

function StartCountDialog({ view, onClose, onStarted }: { view: InventoryView; onClose: () => void; onStarted: (count: StockCount) => void }) {
  const [kind, setKind] = useState<CountScope['kind']>('ALL');
  const [category, setCategory] = useState('');
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => newId());
  const start = async () => {
    const scope: CountScope | null = kind === 'ALL' ? { kind } : kind === 'CATEGORY' ? (category ? { kind, category: category as never } : null) : place ? { kind, locationId: place } : null;
    if (!scope) return setError(kind === 'CATEGORY' ? t('inventory.counts.chooseCategory') : t('inventory.counts.choosePlace'));
    setBusy(true);
    setError(null);
    try {
      onStarted(await getApi().startStockCount(scope, note, key));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };
  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('inventory.counts.newCount')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void start()} disabled={busy}>
            {t('inventory.counts.start')}
          </Button>
        </>
      }
    >
      <div className="space-y-3" data-start-count>
        <div role="radiogroup" aria-label={t('inventory.counts.what')} className="grid gap-1.5 sm:grid-cols-3">
          {(['ALL', 'CATEGORY', 'LOCATION'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => (setKind(k), setError(null))}
              className={cn('press min-h-11 rounded-xl border px-3 text-sm font-semibold', kind === k ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700')}
            >
              {t(`inventory.counts.scopes.${k}`)}
            </button>
          ))}
        </div>
        {kind === 'CATEGORY' && (
          <select value={category} onChange={(e) => (setCategory(e.target.value), setError(null))} aria-label={t('inventory.counts.chooseCategory')} className={field}>
            <option value="">{t('inventory.counts.chooseCategory')}</option>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`inventory.categories.${c}`)}
              </option>
            ))}
          </select>
        )}
        {kind === 'LOCATION' && (
          <select value={place} onChange={(e) => (setPlace(e.target.value), setError(null))} aria-label={t('inventory.counts.choosePlace')} className={field}>
            <option value="">{t('inventory.counts.choosePlace')}</option>
            {view.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder={t('inventory.counts.note')} aria-label={t('inventory.counts.note')} className={field} />
        <p className="text-xs text-slate-500">{t('inventory.counts.during')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

type Filter = 'ALL' | 'TODO' | 'DIFF';

function CountDetail({ countId, view, canCount, onBack }: { countId: string; view: InventoryView; canCount: boolean; onBack: () => void }) {
  const toast = useToast();
  const detail = useApiQuery(() => getApi().getStockCount(countId), [countId]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [asking, setAsking] = useState<'RETURN' | 'CANCEL' | null>(null);
  const [busy, setBusy] = useState(false);
  if (detail.loading && !detail.data) return <LoadingState />;
  if (!detail.data) return <ErrorState message={detail.error?.message} onRetry={detail.reload} />;
  const { count, rows, summary, canApprove, historyNames } = detail.data;
  const editable = canCount && count.status === 'COUNTING';
  const items = new Map<string, Ingredient>([...view.ingredients, ...(view.cooked ?? [])].map((r) => [r.ingredient.id, r.ingredient]));
  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) => (!q || r.name.toLowerCase().includes(q)) && (filter === 'ALL' || (filter === 'TODO' ? r.line.countedMilli === null : Boolean(r.diffMilli))),
  );
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      toast.show({ tone: 'success', title: done });
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    }
    setBusy(false);
  };
  const money = moneyText(summary);

  return (
    <div className="space-y-2.5" data-count-detail={count.number} data-count-status={count.status}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={onBack} className="press flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-bold text-brand hover:bg-brand-soft">
          <ChevronLeft className="size-4" aria-hidden />
          {t('inventory.counts.back')}
        </button>
        <h2 className="mr-auto text-lg font-extrabold text-slate-900">
          {t('inventory.counts.countN', { n: count.number })} · {scopeText(count.scope, detail.data.scopeLabel)}
        </h2>
        <Badge tone={STATUS_TONE[count.status]}>{t(`inventory.counts.status.${count.status}`)}</Badge>
      </div>
      <p className="px-1 text-xs font-semibold text-slate-600" data-count-summary>
        {t('inventory.counts.progress', { counted: summary.counted, items: summary.items })}
        {summary.withDifference ? ` · ${t('inventory.counts.diffs', { n: summary.withDifference })}` : ''}
        {money ? ` · ${money}` : ''}
      </p>
      {editable && <p className="px-1 text-xs text-slate-500">{t('inventory.counts.blankHint')} {t('inventory.counts.during')}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-10 min-w-44 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand sm:max-w-xs">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('inventory.counts.search')} aria-label={t('inventory.counts.search')} className="w-full bg-transparent text-sm" />
        </label>
        <div className="flex gap-1.5" role="group" aria-label={t('inventory.counts.search')}>
          {(['ALL', 'TODO', 'DIFF'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn('press min-h-9 rounded-full border px-3 text-sm font-bold', filter === f ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700')}
            >
              {t(`inventory.counts.filters.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <Card className="divide-y divide-slate-100 overflow-hidden rounded-xl">
        {shown.map((row) => (
          <CountLineRow key={row.line.ingredientId} countId={count.id} row={row} item={items.get(row.line.ingredientId) ?? null} editable={editable} />
        ))}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {count.status === 'COUNTING' && canCount && (
          <Button size="sm" disabled={busy} onClick={() => void act(() => getApi().submitStockCount(count.id), t('inventory.counts.submitted'))}>
            {t('inventory.counts.submit')}
          </Button>
        )}
        {count.status === 'SUBMITTED' && canApprove && (
          <>
            <Button size="sm" disabled={busy} onClick={() => void act(() => getApi().approveStockCount(count.id), t('inventory.counts.approved'))}>
              {t('inventory.counts.approve')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAsking('RETURN')}>
              {t('inventory.counts.sendBack')}
            </Button>
          </>
        )}
        {(count.status === 'COUNTING' || count.status === 'SUBMITTED') && canCount && (
          <Button size="sm" variant="ghost" className="text-red-700" onClick={() => setAsking('CANCEL')}>
            {t('inventory.counts.cancel')}
          </Button>
        )}
      </div>
      {count.status === 'SUBMITTED' && (
        <p className="px-1 text-xs text-slate-500">{canApprove ? t('inventory.counts.approveHint') : t('inventory.counts.ownCount')}</p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white px-3 py-2" data-count-history>
        <h3 className="text-sm font-extrabold text-slate-900">{t('inventory.counts.history')}</h3>
        <ul className="text-xs text-slate-600">
          {count.history.map((h, i) => (
            <li key={i} className="py-0.5">
              <span className="font-semibold text-slate-800">{t(`inventory.counts.actions.${h.action}`)}</span> · {historyNames[h.by] ?? '—'} · {whenText(h.at)}
              {h.note && ` — ${h.note}`}
            </li>
          ))}
        </ul>
      </section>
      {asking && <ReasonDialog countId={count.id} action={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

type PartDraft = { key: string; unitKey: string; quantity: string };

/** One item: what the system expects, the count in one to three units (saved when a field is left), the difference and its value. */
function CountLineRow({ countId, row, item, editable }: { countId: string; row: CountRow; item: Ingredient | null; editable: boolean }) {
  const { line } = row;
  const [parts, setParts] = useState<PartDraft[]>(() => (line.parts ?? [{ unitKey: 'main', quantityMilli: null as number | null }]).map((p) => ({ key: newId(), unitKey: p.unitKey, quantity: p.quantityMilli === null ? '' : String(p.quantityMilli / 1000) })));
  const [note, setNote] = useState(line.note);
  const [error, setError] = useState<string | null>(null);
  const units = { purchaseUnit: row.purchaseUnit, stockUnit: row.stockUnit };
  const options = item ? buyOptions(item) : [];
  const used = parts.map((p) => p.unitKey);

  const save = async (next: PartDraft[], nextNote = note) => {
    const blank = next.every((p) => p.quantity.trim() === '');
    const input = blank ? null : next.filter((p) => p.quantity.trim() !== '').map((p) => ({ unitKey: p.unitKey, quantityMilli: parseQuantity(p.quantity, { allowZero: true }) }));
    if (input && item && countStockMilli(input, item) === null) return setError(t('inventory.counts.blankHint'));
    setError(null);
    try {
      await getApi().saveCountLine({ countId, ingredientId: line.ingredientId, parts: input, note: nextNote });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    }
  };
  const setPart = (key: string, change: Partial<PartDraft>) => setParts((all) => all.map((p) => (p.key === key ? { ...p, ...change } : p)));
  const diff = row.diffMilli;
  const field = 'min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm pointer-coarse:min-h-11';

  return (
    <div className="px-3 py-2 text-sm" data-count-line={row.name} data-counted={line.countedMilli !== null ? 'yes' : 'no'}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className="min-w-0 flex-1 basis-40">
          <span className="block font-bold leading-tight text-slate-900">
            {row.name}
            {row.cooked && <span className="ml-1.5 text-[11px] font-bold text-slate-500">{t('inventory.waste.cooked')}</span>}
          </span>
          <span className="block text-[11px] text-slate-500">
            {t('inventory.counts.system', { qty: stockText(units, Math.max(0, row.expectedMilli)) })}
            {row.blockedMilli > 0 && ` · ${t('inventory.counts.blocked', { qty: stockText(units, row.blockedMilli) })}`}
          </span>
        </span>
        <span className="shrink-0 text-right" data-count-diff>
          {line.countedMilli === null ? (
            <span className="text-xs font-semibold text-slate-400">{t('inventory.counts.notCounted')}</span>
          ) : (
            <>
              <span className={cn('block font-black tabular-nums', !diff ? 'text-green-700' : diff < 0 ? 'text-red-700' : 'text-amber-700')}>
                {!diff ? '✓' : `${diff > 0 ? '+' : '−'}${stockText(units, Math.abs(diff))}`}
              </span>
              {diff ? <span className="block text-[11px] font-semibold text-slate-500">{row.cost === null ? t('inventory.waste.unknown') : `${diff < 0 ? '−' : '+'}${formatPaisa(row.cost)}`}</span> : null}
            </>
          )}
        </span>
      </div>

      {editable ? (
        <div className="mt-1.5 space-y-1.5">
          {parts.map((p, index) => (
            <div key={p.key} className="flex items-center gap-1.5">
              <input
                value={p.quantity}
                onChange={(e) => setPart(p.key, { quantity: e.target.value })}
                onBlur={() => void save(parts)}
                inputMode="decimal"
                placeholder="—"
                aria-label={t('inventory.counts.countOf', { name: row.name, n: index + 1 })}
                className={cn(field, 'w-24 text-right tabular-nums')}
              />
              <select
                value={p.unitKey}
                onChange={(e) => {
                  const next = parts.map((x) => (x.key === p.key ? { ...x, unitKey: e.target.value } : x));
                  setParts(next);
                  void save(next);
                }}
                aria-label={t('inventory.counts.unitOf', { name: row.name, n: index + 1 })}
                className={cn(field, 'min-w-0 flex-1 sm:max-w-xs')}
              >
                {options
                  .filter((o) => o.key === p.unitKey || !used.includes(o.key))
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {item ? optionLabel(o, item) : o.key}
                    </option>
                  ))}
              </select>
              {parts.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = parts.filter((x) => x.key !== p.key);
                    setParts(next);
                    void save(next);
                  }}
                  aria-label={t('inventory.waste.removeUnit')}
                  className="press grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            {parts.length < 3 && options.some((o) => !used.includes(o.key)) && (
              <button type="button" onClick={() => setParts((all) => [...all, { key: newId(), unitKey: options.find((o) => !used.includes(o.key))!.key, quantity: '' }])} className="press inline-flex min-h-9 items-center gap-1 rounded-lg px-1.5 text-xs font-bold text-brand hover:bg-brand-soft">
                <Plus className="size-3.5" aria-hidden />
                {t('inventory.counts.anotherUnit')}
              </button>
            )}
            {line.countedMilli !== null && (
              <button
                type="button"
                onClick={() => {
                  const next = [{ key: newId(), unitKey: 'main', quantity: '' }];
                  setParts(next);
                  void save(next);
                }}
                aria-label={t('inventory.counts.clearOf', { name: row.name })}
                className="press inline-flex min-h-9 items-center rounded-lg px-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                {t('inventory.counts.clear')}
              </button>
            )}
            {Boolean(diff) && (
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={() => void save(parts, note)}
                maxLength={140}
                placeholder={t('inventory.counts.notePlaceholder')}
                aria-label={t('inventory.counts.noteOf', { name: row.name })}
                className={cn(field, 'min-w-40 flex-1 text-xs')}
              />
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>
      ) : (
        line.parts && (
          <p className="mt-0.5 text-xs text-slate-600">
            {line.parts.map((p) => `${p.quantityMilli / 1000} ${p.unit}`).join(' + ')} = {stockText(units, line.countedMilli ?? 0)}
            {line.note && ` — ${line.note}`}
            {line.movementId && ` · ${t('inventory.counts.posted', { qty: `${(line.diffMilli ?? 0) > 0 ? '+' : '−'}${stockText(units, Math.abs(line.diffMilli ?? 0))}` })}`}
          </p>
        )
      )}
    </div>
  );
}

function ReasonDialog({ countId, action, onClose }: { countId: string; action: 'RETURN' | 'CANCEL'; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (action === 'RETURN') await getApi().returnStockCount(countId, reason);
      else await getApi().cancelStockCount(countId, reason);
      toast.show({ tone: 'success', title: action === 'RETURN' ? t('inventory.counts.returned') : t('inventory.counts.cancelled') });
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
      title={action === 'RETURN' ? t('inventory.counts.sendBackTitle') : t('inventory.counts.cancelTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {action === 'RETURN' ? t('inventory.counts.sendBack') : t('inventory.counts.cancel')}
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-900">{t('inventory.counts.reason')}</span>
        <input value={reason} onChange={(e) => (setReason(e.target.value), setError(null))} maxLength={140} placeholder={t('inventory.counts.reasonPlaceholder')} aria-label={t('inventory.counts.reason')} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base" />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </Dialog>
  );
}

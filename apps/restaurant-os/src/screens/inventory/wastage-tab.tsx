'use client';

import { useState } from 'react';
import { CalendarClock, Clock3, PencilLine, Plus, RotateCcw, Trash2, TriangleAlert, X } from 'lucide-react';
import {
  STOCK_WASTE_STAGES,
  WASTE_KINDS,
  buyOptions,
  checkWaste,
  cookedWasteCost,
  formatMilli,
  formatPaisa,
  kindOf,
  parseQuantity,
  wasteCost,
  wasteReasonsFor,
  wasteStockMilli,
  type CookedPrice,
  type IngredientRow,
  type InventoryView,
  type StockWasteReason,
  type WasteEvent,
  type WasteKind,
  type WasteLogRow,
  type WasteStage,
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
import { expiryLabel, stockText, unitLabel, whenText } from './inventory-format';
import { optionLabel } from './purchase-bill';

type Section = 'log' | 'soon' | 'expired' | 'pending';

/**
 * Stock → Wastage & Expiry (owner's Prompt 1, step W1, 2026-11-11): Record Waste for raw ingredients and packaging, the Waste Log,
 * four small cards and the expiring / expired ingredients. Expiry is still one date per ingredient until every delivery gets its
 * own (W3); staff requests and approval follow in W4. Owner / Manager post. W2: cooked stock, Staff meal and Donation (counted
 * apart), order food from Available Food in the same log, and Reverse / Correct (Owner / Manager, a reason, nothing deleted).
 */
export function WastageTab({ view, canManage }: { view: InventoryView; canManage: boolean }) {
  const waste = useApiQuery(() => getApi().getWasteView(), []);
  const { data: session } = useSession();
  const role = session?.user.role;
  const ownerOrManager = canManage && (role === 'OWNER' || role === 'MANAGER');
  const [section, setSection] = useState<Section>('log');
  const [recording, setRecording] = useState<{ row: IngredientRow | null; reason: StockWasteReason | null; correct?: WasteEvent } | null>(null);
  const [reversing, setReversing] = useState<WasteEvent | null>(null);
  const soon = view.ingredients.filter((r) => r.status !== 'NOT_IN_USE' && r.expiry === 'SOON');
  const expired = view.ingredients.filter((r) => r.status !== 'NOT_IN_USE' && r.expiry === 'EXPIRED');

  if (waste.loading && !waste.data) return <LoadingState />;
  if (!waste.data) return <ErrorState message={waste.error?.message} onRetry={waste.reload} />;
  const { summary, meals, donations, cookedPrices, rows, total, limit } = waste.data;

  const unknownHint = (n: number) => (n > 0 ? ` · ${t('inventory.waste.unknownCount', { n })}` : '');
  const tab = (key: Section, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={section === key}
      onClick={() => setSection(key)}
      className={cn(
        'press flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-bold pointer-coarse:min-h-10',
        section === key ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-brand/40',
      )}
    >
      {label}
      {count !== undefined && <span className={cn('rounded-full px-1.5 text-xs tabular-nums', section === key ? 'bg-white text-brand' : 'bg-slate-100 text-slate-600')}>{count}</span>}
    </button>
  );

  return (
    <div className="space-y-2.5" data-wastage>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-slate-900">{t('inventory.waste.title')}</h2>
          <p className="text-xs text-slate-500">{t('inventory.waste.subtitle')}</p>
        </div>
        {canManage && (
          <Button size="sm" className="shrink-0" onClick={() => setRecording({ row: null, reason: null })}>
            <Trash2 className="size-4" aria-hidden />
            {t('inventory.waste.record')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-waste-cards>
        <SmallCard label={t('inventory.waste.cards.today')} value={formatPaisa(summary.todayCost)} hint={t('inventory.waste.lines', { n: summary.todayLines }) + unknownHint(summary.todayUnknown)} tone="brand" />
        <SmallCard label={t('inventory.waste.cards.week')} value={formatPaisa(summary.weekCost)} hint={t('inventory.waste.lines', { n: summary.weekLines }) + unknownHint(summary.weekUnknown)} />
        <SmallCard
          label={t('inventory.waste.cards.expiring')}
          value={String(soon.length)}
          hint={expired.length ? t('inventory.cardHints.expired', { n: expired.length }) : t('inventory.cardHints.expiring', { days: view.expiringSoonDays })}
          alert={expired.length > 0}
          onClick={() => setSection(expired.length ? 'expired' : 'soon')}
        />
        <SmallCard label={t('inventory.waste.cards.pending')} value="—" hint={t('inventory.waste.pendingLater')} />
      </div>
      <p className="px-1 text-xs font-semibold text-slate-500" data-waste-apart>
        {t('inventory.waste.otherTotals', { meals: formatPaisa(meals.todayCost), mealLines: meals.todayLines, donations: formatPaisa(donations.todayCost), donationLines: donations.todayLines })}
      </p>

      <div role="tablist" aria-label={t('inventory.waste.title')} className="flex gap-1.5 overflow-x-auto pb-0.5">
        {tab('log', t('inventory.waste.tabs.log'), total)}
        {tab('soon', t('inventory.waste.tabs.soon'), soon.length)}
        {tab('expired', t('inventory.waste.tabs.expired'), expired.length)}
        {tab('pending', t('inventory.waste.tabs.pending'))}
      </div>

      {section === 'log' && (
        <WasteLog
          rows={rows}
          total={total}
          limit={limit}
          canFix={ownerOrManager}
          onReverse={setReversing}
          onCorrect={(event) => setRecording({ row: null, reason: null, correct: event })}
        />
      )}
      {(section === 'soon' || section === 'expired') && (
        <ExpiryList
          rows={section === 'soon' ? soon : expired}
          empty={section === 'soon' ? t('inventory.waste.noneSoon', { days: view.expiringSoonDays }) : t('inventory.waste.noneExpired')}
          canManage={canManage}
          onRecord={(row) => setRecording({ row, reason: section === 'expired' ? 'EXPIRED' : null })}
        />
      )}
      {section === 'pending' && (
        <Card className="p-4 text-sm text-slate-600" data-waste-pending>
          <Badge tone="dark">{t('status.PLACEHOLDER')}</Badge>
          <p className="mt-2">{t('inventory.waste.pendingBody')}</p>
        </Card>
      )}

      <p className="px-1 text-xs font-semibold text-amber-800">{t('inventory.waste.demoNote')}</p>
      {recording && (
        <RecordWasteDialog
          view={view}
          first={recording.row}
          reason={recording.reason}
          correct={recording.correct ?? null}
          cookedPrices={cookedPrices}
          canChooseKind={ownerOrManager}
          onClose={() => setRecording(null)}
        />
      )}
      {reversing && <ReverseDialog event={reversing} onClose={() => setReversing(null)} />}
    </div>
  );
}

function SmallCard({ label, value, hint, tone, alert = false, onClick }: { label: string; value: string; hint: string; tone?: 'brand'; alert?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <span className="block text-xs font-bold text-slate-500">{label}</span>
      <span className={cn('block text-lg font-black leading-tight tabular-nums', tone === 'brand' ? 'text-brand' : 'text-slate-900')}>{value}</span>
      <span className={cn('block text-[11px]', alert ? 'font-bold text-red-700' : 'text-slate-500')}>{hint}</span>
    </>
  );
  const box = 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(box, 'press hover:border-brand/40')} data-waste-card={label}>
      {body}
    </button>
  ) : (
    <div className={box} data-waste-card={label}>
      {body}
    </div>
  );
}

/** "1 carton + 2 bottles" as typed */
function partsText(row: WasteLogRow): string {
  return row.line.parts.map((p) => `${formatMilli(p.quantityMilli)} ${unitLabel(p.unit, p.quantityMilli)}`).join(' + ');
}

function lossText(cost: number | null): string {
  return cost === null ? t('inventory.waste.unknown') : formatPaisa(cost);
}

/** Quantity of a line: "−2 litres", or "2 portion(s)" for order food */
function quantityText(row: WasteLogRow): string {
  const food = row.line.orderFood;
  if (food) return t('inventory.waste.portions', { n: food.quantity });
  return `−${stockText({ purchaseUnit: row.purchaseUnit, stockUnit: row.stockUnit }, row.line.stockMilli)}`;
}

/** Why: the reason (waste) or the kind (staff meal, donation), and where */
function whyText(row: WasteLogRow): string {
  const kind = kindOf(row.event);
  const why = kind === 'WASTE' && row.line.reason ? t(`inventory.waste.reasons.${row.line.reason}`) : t(`inventory.waste.kinds.${kind}`);
  return `${why} · ${t(`inventory.waste.stages.${row.event.stage}`)}`;
}

/** Badges: Staff meal / Donation, Cooked / Order food, Correction, Reversed */
function RowBadges({ row }: { row: WasteLogRow }) {
  const kind = kindOf(row.event);
  return (
    <span className="mt-0.5 flex flex-wrap gap-1">
      {kind !== 'WASTE' && <Badge tone="amber">{t(`inventory.waste.kinds.${kind}`)}</Badge>}
      {row.line.itemKind === 'COOKED' && <Badge tone="dark">{t('inventory.waste.cooked')}</Badge>}
      {row.line.orderFood && <Badge tone="dark">{t('inventory.waste.orderFood')}</Badge>}
      {row.event.correctsId && <Badge tone="dark">{t('inventory.waste.correctionOf')}</Badge>}
      {row.event.status === 'REVERSED' && <Badge tone="red">{t('inventory.waste.reversed')}</Badge>}
    </span>
  );
}

/** Under the item: the order, how the cost was found, who reversed it and why */
function RowDetails({ row }: { row: WasteLogRow }) {
  const food = row.line.orderFood;
  const basis = row.line.costBasis;
  return (
    <>
      {food?.dailyNumber != null && <span className="block text-xs text-slate-500">{t('inventory.waste.orderOf', { n: food.dailyNumber })}</span>}
      {food && <span className="block text-xs text-slate-500">{t('inventory.waste.noStockMove')}</span>}
      {basis && basis !== 'PURCHASE_PRICE' && row.line.cost !== null && <span className="block text-xs text-slate-500">{t(`inventory.waste.basis.${basis}`)}</span>}
      {row.event.reversal && <span className="block text-xs font-semibold text-red-700">{t('inventory.waste.reversedBy', { name: row.reversedByName ?? '—', reason: row.event.reversal.reason })}</span>}
    </>
  );
}

function FixButtons({ row, onReverse, onCorrect }: { row: WasteLogRow; onReverse: (e: WasteEvent) => void; onCorrect: (e: WasteEvent) => void }) {
  if (!row.first || row.event.status !== 'POSTED' || row.line.orderFood) return null;
  const name = row.ingredientName;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      <button type="button" onClick={() => onReverse(row.event)} aria-label={`${t('inventory.waste.reverse')} ${name}`} className="press inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <RotateCcw className="size-3.5" aria-hidden />
        {t('inventory.waste.reverse')}
      </button>
      <button type="button" onClick={() => onCorrect(row.event)} aria-label={`${t('inventory.waste.correct')} ${name}`} className="press inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
        <PencilLine className="size-3.5" aria-hidden />
        {t('inventory.waste.correct')}
      </button>
    </span>
  );
}

function WasteLog({
  rows,
  total,
  limit,
  canFix,
  onReverse,
  onCorrect,
}: {
  rows: WasteLogRow[];
  total: number;
  limit: number;
  canFix: boolean;
  onReverse: (e: WasteEvent) => void;
  onCorrect: (e: WasteEvent) => void;
}) {
  if (rows.length === 0) return <Card className="p-6 text-center text-sm text-slate-500">{t('inventory.waste.empty')}</Card>;
  const units = (row: WasteLogRow) => ({ purchaseUnit: row.purchaseUnit, stockUnit: row.stockUnit });
  const keyOf = (row: WasteLogRow) => row.line.movementId ?? `${row.event.id}-${row.ingredientName}`;
  const faded = (row: WasteLogRow) => (row.event.status === 'REVERSED' ? 'opacity-60' : undefined);
  return (
    <>
      <Card className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm" data-waste-log>
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">{t('inventory.waste.col.when')}</th>
              <th className="px-3 py-2">{t('inventory.waste.col.item')}</th>
              <th className="px-3 py-2 text-right">{t('inventory.waste.col.quantity')}</th>
              <th className="px-3 py-2">{t('inventory.waste.col.reason')}</th>
              <th className="px-3 py-2 text-right">{t('inventory.waste.col.loss')}</th>
              <th className="px-3 py-2">{t('inventory.waste.col.by')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={keyOf(row)} data-waste-row={row.ingredientName} data-waste-status={row.event.status} className={faded(row)}>
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">{whenText(row.event.at)}</td>
                <td className="px-3 py-2">
                  <span className="block font-bold text-slate-900">{row.ingredientName}</span>
                  <RowBadges row={row} />
                  <RowDetails row={row} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span className="block font-bold text-brand">{quantityText(row)}</span>
                  {!row.line.orderFood && (row.line.parts.length > 1 || row.line.parts[0]?.unitKey !== 'main') && <span className="block text-xs text-slate-500">{partsText(row)}</span>}
                  {!row.line.orderFood && <span className="block text-xs text-slate-500">{t('inventory.waste.beforeAfter', { before: stockText(units(row), row.line.beforeMilli), after: stockText(units(row), row.line.afterMilli) })}</span>}
                </td>
                <td className="px-3 py-2">
                  {whyText(row)}
                  {row.line.note && <span className="block text-xs text-slate-500">{row.line.note}</span>}
                </td>
                <td className={cn('px-3 py-2 text-right font-bold tabular-nums', row.line.cost === null ? 'text-amber-700' : 'text-slate-900')}>{lossText(row.line.cost)}</td>
                <td className="px-3 py-2 text-slate-600">
                  {row.byName ?? '—'}
                  {canFix && <FixButtons row={row} onReverse={onReverse} onCorrect={onCorrect} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <ul className="space-y-2 md:hidden" data-waste-log-cards>
        {rows.map((row) => (
          <li key={keyOf(row)}>
            <Card className={cn('p-3 text-sm', faded(row))} data-waste-row={row.ingredientName} data-waste-status={row.event.status}>
              <p className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-900">{row.ingredientName}</span>
                <span className={cn('font-black tabular-nums', row.line.cost === null ? 'text-amber-700' : 'text-slate-900')}>{lossText(row.line.cost)}</span>
              </p>
              <RowBadges row={row} />
              <p className="font-bold text-brand">{quantityText(row)}</p>
              <p className="text-xs text-slate-500">
                {whyText(row)} · {whenText(row.event.at)} · {row.byName ?? '—'}
              </p>
              <RowDetails row={row} />
              {canFix && <FixButtons row={row} onReverse={onReverse} onCorrect={onCorrect} />}
            </Card>
          </li>
        ))}
      </ul>
      {total > rows.length && <p className="text-center text-xs text-slate-500">{t('inventory.ledger.more', { shown: limit, total })}</p>}
    </>
  );
}

/** W2: Reverse with a reason (Owner / Manager). The stock comes back by a linked movement; the entry stays as Reversed. */
function ReverseDialog({ event, onClose }: { event: WasteEvent; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!reason.trim()) return setError(t('inventory.waste.reverseErrors.REASON_REQUIRED'));
    setBusy(true);
    setError(null);
    try {
      await getApi().reverseStockWaste(event.id, reason);
      toast.show({ tone: 'success', title: t('inventory.waste.reverseDone') });
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
      title={t('inventory.waste.reverseTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            <RotateCcw className="size-4" aria-hidden />
            {t('inventory.waste.reverse')}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">{t('inventory.waste.reverseBody')}</p>
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-slate-900">{t('inventory.waste.reverseReason')}</span>
        <input value={reason} onChange={(e) => (setReason(e.target.value), setError(null))} maxLength={140} placeholder={t('inventory.waste.reverseReasonPlaceholder')} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base" />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {error}
        </p>
      )}
    </Dialog>
  );
}

function ExpiryList({ rows, empty, canManage, onRecord }: { rows: IngredientRow[]; empty: string; canManage: boolean; onRecord: (row: IngredientRow) => void }) {
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden rounded-xl" data-expiry-list>
      {rows.length === 0 && <p className="px-3 py-2.5 text-sm text-slate-500">{empty}</p>}
      {rows.map((row) => {
        const label = expiryLabel(row.expiry, row.ingredient.expiryDate);
        return (
          <div key={row.ingredient.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-1 text-sm hover:bg-brand-soft/30" data-expiry-row={row.ingredient.name}>
            <CalendarClock className={cn('size-4 shrink-0', row.expiry === 'EXPIRED' ? 'text-red-600' : 'text-amber-600')} aria-hidden />
            <span className="min-w-0 flex-1 font-bold text-slate-900">{row.ingredient.name}</span>
            <span className="font-semibold tabular-nums text-slate-700">{stockText(row.ingredient, row.onHandMilli)}</span>
            {label.tone && <Badge tone={label.tone}>{label.text}</Badge>}
            {canManage && row.onHandMilli > 0 ? (
              <button type="button" onClick={() => onRecord(row)} className="press inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-bold text-brand hover:bg-brand-soft pointer-coarse:min-h-10">
                <Trash2 className="size-3.5" aria-hidden />
                {t('inventory.waste.recordThis')}
              </button>
            ) : (
              <span className="min-h-9" aria-hidden />
            )}
          </div>
        );
      })}
      <p className="bg-slate-50/60 px-3 py-2 text-xs text-slate-500">{t('inventory.waste.oneDate')}</p>
    </Card>
  );
}

// ── Record Waste ────────────────────────────────────────────────────────────────────────────

type PartDraft = { key: string; unitKey: string; quantity: string };
type LineDraft = { key: string; ingredientId: string; parts: PartDraft[]; reason: StockWasteReason | null; note: string };

const part = (unitKey = 'main'): PartDraft => ({ key: newId(), unitKey, quantity: '' });
const lineDraft = (ingredientId = '', reason: StockWasteReason | null = null): LineDraft => ({ key: newId(), ingredientId, parts: [part()], reason, note: '' });

/** The time when Post is tapped (the server checks it again) */
const clock = () => Date.now();

/** "2026-11-11T14:05" in this device's time, for the time field */
function localInput(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** The form lines of an event being corrected: same items, units, quantities, reasons and notes */
function linesOf(event: WasteEvent): LineDraft[] {
  return event.lines
    .filter((l) => l.ingredientId)
    .map((l) => ({
      key: newId(),
      ingredientId: l.ingredientId!,
      parts: l.parts.map((p) => ({ key: newId(), unitKey: p.unitKey, quantity: String(p.quantityMilli / 1000) })),
      reason: l.reason,
      note: l.note,
    }));
}

/**
 * One incident, several lines: what happened (Waste / Staff meal / Donation) → item → quantity and unit (+ another unit) →
 * reason → preview (in stock now → after, loss) → Post. Raw ingredients, packaging and cooked food; one key per form, so a
 * double tap posts once. Correct opens it filled with the old entry and posts the new one in place of it.
 */
function RecordWasteDialog({
  view,
  first,
  reason,
  correct,
  cookedPrices,
  canChooseKind,
  onClose,
}: {
  view: InventoryView;
  first: IngredientRow | null;
  reason: StockWasteReason | null;
  correct: WasteEvent | null;
  cookedPrices: Record<string, CookedPrice | null>;
  canChooseKind: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const items = view.ingredients.filter((r) => r.status !== 'NOT_IN_USE');
  const raw = items.filter((r) => r.ingredient.category !== 'PACKAGING');
  const packaging = items.filter((r) => r.ingredient.category === 'PACKAGING');
  const cooked = view.cooked ?? [];
  const all = [...items, ...cooked];
  // The latest time that may be typed: when the form opened (a later minute is checked again when posting)
  const [opened] = useState(() => localInput(new Date()));
  const [at, setAt] = useState(() => (correct ? localInput(new Date(correct.at)) : opened));
  const [kind, setKind] = useState<WasteKind>(correct ? kindOf(correct) : 'WASTE');
  const [stage, setStage] = useState<WasteStage>(correct?.stage ?? 'STORAGE');
  const [lines, setLines] = useState<LineDraft[]>(() => (correct ? linesOf(correct) : [lineDraft(first?.ingredient.id ?? '', reason)]));
  const [note, setNote] = useState(correct?.note ?? '');
  const [why, setWhy] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idempotencyKey] = useState(() => newId());

  const rowOf = (id: string) => all.find((r) => r.ingredient.id === id);
  // While correcting, the old entry's quantity counts as in stock again (the server puts it back first)
  const back = (id: string) => (correct ? correct.lines.reduce((sum, l) => (l.ingredientId === id ? sum + l.stockMilli : sum), 0) : 0);
  const stockOf = (id: string) => (rowOf(id)?.onHandMilli ?? 0) + back(id);
  const setLine = (key: string, change: (l: LineDraft) => LineDraft) => (setLines((all) => all.map((l) => (l.key === key ? change(l) : l))), setError(null));
  const inputLines = lines.map((l) => ({ ingredientId: l.ingredientId, parts: l.parts.map((p) => ({ unitKey: p.unitKey, quantityMilli: parseQuantity(p.quantity, { allowZero: false }) })), reason: kind === 'WASTE' ? l.reason : null, note: l.note }));
  const costOf = (row: IngredientRow, stockMilli: number) => (row.ingredient.kind === 'PREPARED' ? cookedWasteCost(cookedPrices[row.ingredient.id], stockMilli) : (wasteCost(row.ingredient, stockMilli)?.cost ?? null));
  const previews = lines.map((l, index) => {
    const row = rowOf(l.ingredientId);
    const stockMilli = row ? wasteStockMilli(inputLines[index]!.parts, row.ingredient) : null;
    return { row, stockMilli, cost: row && stockMilli ? costOf(row, stockMilli) : null };
  });
  const totalCost = previews.reduce((sum, p) => sum + (p.cost ?? 0), 0);
  const unknown = previews.filter((p) => p.row && p.stockMilli && p.cost === null).length;

  const save = async () => {
    const iso = new Date(at).toISOString();
    const problem = checkWaste(
      { at: iso, kind, stage, lines: inputLines, note },
      all.map((r) => r.ingredient),
      stockOf,
      clock(),
    );
    if (problem) {
      const name = problem.line === null ? '' : (rowOf(lines[problem.line]?.ingredientId ?? '')?.ingredient.name ?? t('inventory.waste.lineN', { n: problem.line + 1 }));
      return setError((name ? `${name}: ` : '') + t(`inventory.waste.errors.${problem.problem}`));
    }
    if (correct && !why.trim()) return setError(t('inventory.waste.reverseErrors.REASON_REQUIRED'));
    setBusy(true);
    setError(null);
    try {
      const input = { at: iso, kind, stage, lines: inputLines, note, idempotencyKey };
      const event = correct ? await getApi().correctStockWaste(correct.id, why, input) : await getApi().postStockWaste(input);
      const loss = event.lines.reduce((sum, l) => sum + (l.cost ?? 0), 0);
      toast.show({ tone: 'success', title: correct ? t('inventory.waste.corrected') : t('inventory.waste.posted', { n: event.lines.length, loss: formatPaisa(loss) }) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const label = 'mb-1 block text-sm font-bold text-slate-900';
  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={correct ? t('inventory.waste.correctTitle') : t('inventory.waste.record')}
      footer={
        <>
          <span className="mr-auto text-sm font-bold text-slate-700" data-waste-total>
            {t('inventory.waste.totalLoss', { loss: formatPaisa(totalCost) })}
            {unknown > 0 && <span className="block text-xs font-semibold text-amber-700">{t('inventory.waste.unknownCount', { n: unknown })}</span>}
          </span>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {correct ? <PencilLine className="size-4" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
            {correct ? t('inventory.waste.correct') : t('inventory.waste.post')}
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-record-waste>
        {canChooseKind && (
          <div>
            <span className="mb-1 block text-sm font-bold text-slate-900">{t('inventory.waste.kind')}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('inventory.waste.kind')}>
              {WASTE_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => (setKind(k), setError(null))}
                  className={cn('press min-h-11 rounded-xl border px-3 text-sm font-semibold', kind === k ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
                >
                  {t(`inventory.waste.kinds.${k}`)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{t(`inventory.waste.kindHint.${kind}`)}</p>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>{t('inventory.waste.when')}</span>
            <span className="flex items-center gap-2">
              <Clock3 className="size-4 shrink-0 text-slate-400" aria-hidden />
              <input type="datetime-local" value={at} max={opened} onChange={(e) => (setAt(e.target.value), setError(null))} aria-label={t('inventory.waste.when')} className={field} />
            </span>
          </label>
          <div>
            <span className={label}>{t('inventory.waste.stage')}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('inventory.waste.stage')}>
              {STOCK_WASTE_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={stage === s}
                  onClick={() => (setStage(s), setError(null))}
                  className={cn('press min-h-11 rounded-xl border px-3 text-sm font-semibold', stage === s ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}
                >
                  {t(`inventory.waste.stages.${s}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ol className="space-y-3">
          {lines.map((line, index) => {
            const { row, stockMilli, cost } = previews[index]!;
            const options = row ? buyOptions(row.ingredient) : [];
            const used = line.parts.map((p) => p.unitKey);
            const inStock = row ? stockOf(row.ingredient.id) : 0;
            const after = row && stockMilli ? inStock - stockMilli : null;
            return (
              <li key={line.key} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3" data-waste-line={row?.ingredient.name ?? index + 1}>
                <div className="flex items-center gap-2">
                  <select
                    value={line.ingredientId}
                    onChange={(e) => setLine(line.key, (l) => ({ ...l, ingredientId: e.target.value, parts: [part()] }))}
                    aria-label={t('inventory.waste.itemN', { n: index + 1 })}
                    className={field}
                  >
                    <option value="">{t('inventory.waste.chooseItem')}</option>
                    <optgroup label={t('inventory.waste.groups.raw')}>
                      {raw.map((r) => (
                        <option key={r.ingredient.id} value={r.ingredient.id} disabled={lines.some((l) => l.key !== line.key && l.ingredientId === r.ingredient.id)}>
                          {r.ingredient.name} ({stockText(r.ingredient, r.onHandMilli)})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t('inventory.waste.groups.packaging')}>
                      {packaging.map((r) => (
                        <option key={r.ingredient.id} value={r.ingredient.id} disabled={lines.some((l) => l.key !== line.key && l.ingredientId === r.ingredient.id)}>
                          {r.ingredient.name} ({stockText(r.ingredient, r.onHandMilli)})
                        </option>
                      ))}
                    </optgroup>
                    {cooked.length > 0 && (
                      <optgroup label={t('inventory.waste.groups.cooked')}>
                        {cooked.map((r) => (
                          <option key={r.ingredient.id} value={r.ingredient.id} disabled={lines.some((l) => l.key !== line.key && l.ingredientId === r.ingredient.id)}>
                            {r.ingredient.name} ({stockText(r.ingredient, r.onHandMilli)})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {lines.length > 1 && (
                    <button type="button" onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))} aria-label={t('inventory.waste.removeLine', { n: index + 1 })} className="press grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white hover:text-red-700">
                      <X className="size-4" aria-hidden />
                    </button>
                  )}
                </div>

                {row && (
                  <>
                    {line.parts.map((p, partIndex) => (
                      <div key={p.key} className="flex items-center gap-2">
                        <input
                          value={p.quantity}
                          onChange={(e) => setLine(line.key, (l) => ({ ...l, parts: l.parts.map((x) => (x.key === p.key ? { ...x, quantity: e.target.value } : x)) }))}
                          inputMode="decimal"
                          placeholder="0"
                          aria-label={t('inventory.waste.quantityOf', { name: row.ingredient.name, n: partIndex + 1 })}
                          className={cn(field, 'max-w-32 tabular-nums')}
                        />
                        <select
                          value={p.unitKey}
                          onChange={(e) => setLine(line.key, (l) => ({ ...l, parts: l.parts.map((x) => (x.key === p.key ? { ...x, unitKey: e.target.value } : x)) }))}
                          aria-label={t('inventory.waste.unitOf', { name: row.ingredient.name, n: partIndex + 1 })}
                          className={field}
                        >
                          {options
                            .filter((o) => o.key === p.unitKey || !used.includes(o.key))
                            .map((o) => (
                              <option key={o.key} value={o.key}>
                                {optionLabel(o, row.ingredient)}
                              </option>
                            ))}
                        </select>
                        {line.parts.length > 1 && (
                          <button type="button" onClick={() => setLine(line.key, (l) => ({ ...l, parts: l.parts.filter((x) => x.key !== p.key) }))} aria-label={t('inventory.waste.removeUnit')} className="press grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white hover:text-red-700">
                            <X className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    ))}
                    {line.parts.length < 3 && options.some((o) => !used.includes(o.key)) && (
                      <button
                        type="button"
                        onClick={() => setLine(line.key, (l) => ({ ...l, parts: [...l.parts, part(options.find((o) => !used.includes(o.key))!.key)] }))}
                        className="press inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-brand hover:bg-white"
                      >
                        <Plus className="size-4" aria-hidden />
                        {t('inventory.waste.anotherUnit')}
                      </button>
                    )}

                    {kind === 'WASTE' && (
                      <select
                        value={line.reason ?? ''}
                        onChange={(e) => setLine(line.key, (l) => ({ ...l, reason: (e.target.value || null) as StockWasteReason | null }))}
                        aria-label={t('inventory.waste.reasonOf', { name: row.ingredient.name })}
                        className={field}
                      >
                        <option value="">{t('inventory.waste.chooseReason')}</option>
                        {wasteReasonsFor(row.ingredient.kind).map((r) => (
                          <option key={r} value={r}>
                            {t(`inventory.waste.reasons.${r}`)}
                          </option>
                        ))}
                      </select>
                    )}
                    {kind === 'WASTE' && line.reason === 'OTHER' && (
                      <input
                        value={line.note}
                        onChange={(e) => setLine(line.key, (l) => ({ ...l, note: e.target.value }))}
                        maxLength={140}
                        placeholder={t('inventory.waste.otherPlaceholder')}
                        aria-label={t('inventory.waste.noteOf', { name: row.ingredient.name })}
                        className={field}
                      />
                    )}

                    <p className={cn('rounded-xl px-3 py-2 text-sm font-semibold', after !== null && after < 0 ? 'bg-red-50 text-red-800' : 'bg-white text-slate-700')} data-waste-preview>
                      {stockMilli ? (
                        <>
                          {t('inventory.waste.preview', {
                            before: stockText(row.ingredient, inStock),
                            after: after !== null && after < 0 ? `−${stockText(row.ingredient, -after)}` : stockText(row.ingredient, after ?? 0),
                            qty: stockText(row.ingredient, stockMilli),
                          })}
                          <span className="block text-xs font-normal text-slate-500">
                            {cost === null
                              ? t('inventory.waste.lossUnknown')
                              : row.ingredient.kind === 'PREPARED'
                                ? t('inventory.waste.cookedLossEstimate', { loss: formatPaisa(cost), basis: t(`inventory.waste.basis.${cookedPrices[row.ingredient.id]?.basis ?? 'RECIPE'}`) })
                                : t('inventory.waste.loss', { loss: formatPaisa(cost) })}
                          </span>
                          {after !== null && after < 0 && (
                            <span className="mt-1 flex items-center gap-1 text-xs font-bold">
                              <TriangleAlert className="size-3.5" aria-hidden />
                              {t('inventory.waste.errors.MORE_THAN_ON_HAND')}
                            </span>
                          )}
                        </>
                      ) : (
                        t('inventory.waste.inStock', { qty: stockText(row.ingredient, inStock) })
                      )}
                    </p>
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {lines.length < 20 && (
          <button type="button" onClick={() => setLines((all) => [...all, lineDraft()])} className="press inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <Plus className="size-4" aria-hidden />
            {t('inventory.waste.addLine')}
          </button>
        )}

        <label className="block">
          <span className={label}>{t('inventory.waste.note')}</span>
          <input value={note} onChange={(e) => (setNote(e.target.value), setError(null))} maxLength={140} placeholder={t('inventory.waste.notePlaceholder')} aria-label={t('inventory.waste.note')} className={field} />
        </label>
        {correct && (
          <label className="block">
            <span className={label}>{t('inventory.waste.correctReason')}</span>
            <input value={why} onChange={(e) => (setWhy(e.target.value), setError(null))} maxLength={140} placeholder={t('inventory.waste.reverseReasonPlaceholder')} aria-label={t('inventory.waste.correctReason')} className={field} />
            <span className="mt-1 block text-xs text-slate-500">{t('inventory.waste.correctHint')}</span>
          </label>
        )}
        <p className="text-xs text-slate-500">{t('inventory.waste.hint')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

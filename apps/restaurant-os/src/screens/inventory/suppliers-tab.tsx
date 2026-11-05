'use client';

import { useState } from 'react';
import { ArrowLeft, Banknote, Check, ChevronRight, PackagePlus, Pencil, Phone, Plus, Search, Truck } from 'lucide-react';
import {
  MILLI,
  SUPPLIER_CATEGORIES,
  SUPPLIER_PAYMENT_METHODS,
  checkReceipt,
  checkSupplierPayment,
  formatPaisa,
  lineAmount,
  paisaToInput,
  parseQuantity,
  parseRupees,
  type KhataEntryRow,
  type KhataStatus,
  type Supplier,
  type SupplierCategory,
  type SupplierPaymentMethod,
  type SupplierProductRow,
  type SupplierRow,
  type SupplierWorkspace,
} from '@restaurant-saas/shared';
import { Badge, type Tone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type KhataPeriod } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { stockText, unitLabel } from './inventory-format';
import { ingredientArt } from './recipes/recipe-lines';

const STATUS_TONE: Record<KhataStatus, Tone> = { PAID: 'green', PARTLY_PAID: 'amber', UNPAID: 'red' };
const newKey = () => crypto.randomUUID();

/**
 * Suppliers (owner's Smart Supplier brief, S1): one supplier = one screen. The list on the left (search, what we owe,
 * Paid / Partly paid / Unpaid), the chosen supplier beside it: totals, his products with Receive Stock (stock and khata
 * in one step), Settle Payment and today's khata. Phones show the list first, then the supplier with a Back button.
 */
export function SuppliersTab({ canManage }: { canManage: boolean }) {
  const view = useApiQuery(() => getApi().getSuppliers(), []);
  const [chosen, setChosen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  if (view.loading && !view.data) return <LoadingState />;
  if (!view.data) return <ErrorState message={view.error?.message} onRetry={view.reload} />;
  const rows = view.data.suppliers;
  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => !q || r.supplier.name.toLowerCase().includes(q) || r.supplier.phone.includes(q) || t(`inventory.suppliers.categories.${r.supplier.category}`).toLowerCase().includes(q));
  // Wide screens always show a supplier: the chosen one, else the first.
  const selectedId = chosen ?? rows[0]?.supplier.id ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]" data-suppliers>
      <section className={cn('min-w-0 space-y-3', chosen && 'hidden lg:block')} aria-label={t('inventory.suppliers.listTitle')}>
        <div className="grid grid-cols-2 gap-2">
          <Total label={t('inventory.suppliers.todayBoughtAll')} value={formatPaisa(view.data.todayPurchases)} />
          <Total label={t('inventory.suppliers.dueAll')} value={formatPaisa(view.data.totalDue)} danger={view.data.totalDue > 0} />
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <Search className="size-4 text-slate-400" aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('inventory.suppliers.search')} aria-label={t('inventory.suppliers.search')} className="w-full bg-transparent text-sm" />
        </label>
        <ul className="space-y-2">
          {shown.map((row) => (
            <li key={row.supplier.id}>
              <SupplierCard row={row} selected={row.supplier.id === selectedId} onOpen={() => setChosen(row.supplier.id)} />
            </li>
          ))}
          {shown.length === 0 && <li className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t('inventory.suppliers.noMatch')}</li>}
        </ul>
        {canManage && (
          <Button variant="outline" className="w-full" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden />
            {t('inventory.suppliers.add')}
          </Button>
        )}
      </section>

      <section className={cn('min-w-0', !chosen && 'hidden lg:block')}>
        {chosen && (
          <button type="button" onClick={() => setChosen(null)} className="press mb-3 flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-700 hover:bg-slate-100 lg:hidden">
            <ArrowLeft className="size-4" aria-hidden />
            {t('inventory.suppliers.allSuppliers')}
          </button>
        )}
        {selectedId ? <Workspace key={selectedId} supplierId={selectedId} canManage={canManage} onEdit={setEditing} /> : <Card className="p-6 text-center text-sm text-slate-600">{t('inventory.suppliers.none')}</Card>}
      </section>

      {editing && (
        <SupplierDialog
          supplier={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(s) => {
            setEditing(null);
            setChosen(s.id);
          }}
        />
      )}
    </div>
  );
}

function Total({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={cn('rounded-xl px-3 py-2', danger ? 'bg-red-50' : 'bg-slate-100')}>
      <p className={cn('text-xs font-semibold', danger ? 'text-red-800' : 'text-slate-600')}>{label}</p>
      <p className={cn('text-base font-black tabular-nums', danger ? 'text-red-700' : 'text-slate-900')}>{value}</p>
    </div>
  );
}

function SupplierCard({ row, selected, onOpen }: { row: SupplierRow; selected: boolean; onOpen: () => void }) {
  const { supplier, summary } = row;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? 'true' : undefined}
      data-supplier-card={supplier.name}
      className={cn('press flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition', selected ? 'border-brand bg-brand-soft/60 shadow-[inset_4px_0_0_var(--color-brand)]' : 'border-slate-200 hover:border-brand/40')}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-extrabold text-slate-900">{supplier.name}</span>
        <span className="block text-xs text-slate-500">
          {t(`inventory.suppliers.categories.${supplier.category}`)}
          {summary.todayPurchases > 0 && ` · ${t('inventory.suppliers.todayShort', { amount: formatPaisa(summary.todayPurchases) })}`}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={cn('text-sm font-black tabular-nums', summary.totalDue > 0 ? 'text-red-700' : 'text-green-700')}>{summary.totalDue > 0 ? t('inventory.suppliers.dueShort', { amount: formatPaisa(summary.totalDue) }) : formatPaisa(0)}</span>
          <Badge tone={STATUS_TONE[summary.status]}>{t(`inventory.suppliers.status.${summary.status}`)}</Badge>
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
    </button>
  );
}

// ── One supplier ──────────────────────────────────────────────────────────────────────────────

interface LineInput {
  quantity: string;
  rate: string;
}

function Workspace({ supplierId, canManage, onEdit }: { supplierId: string; canManage: boolean; onEdit: (s: Supplier) => void }) {
  const toast = useToast();
  const [period, setPeriod] = useState<KhataPeriod>('TODAY');
  const query = useApiQuery(() => getApi().getSupplierWorkspace(supplierId, period), [supplierId, period]);
  const [inputs, setInputs] = useState<Record<string, LineInput>>({});
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // One key per delivery: a double tap or a retry receives it once.
  const [receiveKey, setReceiveKey] = useState(newKey);
  const [paying, setPaying] = useState(false);
  const [adding, setAdding] = useState('');
  if (query.loading && !query.data) return <LoadingState />;
  if (!query.data) return <ErrorState message={query.error?.message} onRetry={query.reload} />;
  const ws = query.data;
  const { supplier, summary } = ws;

  const inputOf = (row: SupplierProductRow): LineInput => inputs[row.ingredient.id] ?? { quantity: '', rate: paisaToInput(row.lastRatePaisa) };
  const setInput = (id: string, patch: Partial<LineInput>, row: SupplierProductRow) => {
    setInputs((all) => ({ ...all, [id]: { ...inputOf(row), ...patch } }));
    setError(null);
  };
  const lineOf = (row: SupplierProductRow) => {
    const input = inputOf(row);
    return { ingredientId: row.ingredient.id, quantityMilli: parseQuantity(input.quantity, { allowZero: false }), ratePaisa: parseRupees(input.rate) };
  };
  const filled = ws.products.filter((row) => inputOf(row).quantity.trim() !== '');
  const amountOf = (row: SupplierProductRow) => {
    const line = lineOf(row);
    return line.quantityMilli !== null && line.ratePaisa ? lineAmount(line.quantityMilli, line.ratePaisa) : null;
  };
  const filledTotal = filled.reduce((sum, row) => sum + (amountOf(row) ?? 0), 0);

  const receive = async (rows: SupplierProductRow[]) => {
    const lines = rows.map(lineOf);
    const problem = checkReceipt({ lines, note }, ws.ingredients);
    if (problem) {
      const row = problem.line === null ? null : rows[problem.line];
      return setError(`${row ? `${row.ingredient.name}: ` : ''}${t(`inventory.suppliers.errors.${problem.problem}`)}`);
    }
    setBusy(true);
    try {
      const entry = await getApi().receiveStock({ supplierId, lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantityMilli: l.quantityMilli!, ratePaisa: l.ratePaisa! })), note, idempotencyKey: receiveKey });
      setInputs((all) => {
        const next = { ...all };
        for (const row of rows) delete next[row.ingredient.id];
        return next;
      });
      setNote('');
      setReceiveKey(newKey());
      const what = rows.map((row) => `${row.ingredient.name} ${inputOf(row).quantity} ${unitLabel(row.ingredient.purchaseUnit, lineOf(row).quantityMilli ?? 0)}`).join(', ');
      toast.show({ tone: 'success', title: t('inventory.suppliers.received', { what, amount: formatPaisa(entry.amount) }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  const addProduct = async (ingredientId: string) => {
    setAdding('');
    if (!ingredientId) return;
    try {
      await getApi().saveSupplier({ ...profileOf(supplier), productIds: [...supplier.productIds, ingredientId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
    }
  };
  const notHis = ws.ingredients.filter((i) => i.isActive && !supplier.productIds.includes(i.id));

  return (
    <div className="space-y-4" data-supplier-workspace={supplier.name}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-slate-900">{supplier.name}</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} className="flex items-center gap-1 font-semibold text-slate-700 hover:text-brand">
                <Phone className="size-4" aria-hidden />
                {supplier.phone}
              </a>
            )}
            <Badge tone="grey">{t(`inventory.suppliers.categories.${supplier.category}`)}</Badge>
            <Badge tone={STATUS_TONE[summary.status]}>{t(`inventory.suppliers.status.${summary.status}`)}</Badge>
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => onEdit(supplier)}>
              <Pencil className="size-4" aria-hidden />
              {t('inventory.suppliers.edit')}
            </Button>
            <Button onClick={() => setPaying(true)} disabled={summary.totalDue <= 0}>
              <Banknote className="size-4" aria-hidden />
              {t('inventory.suppliers.settle')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" data-khata-summary>
        <Metric label={t('inventory.suppliers.previousDue')} value={formatPaisa(summary.previousDue)} />
        <Metric label={t('inventory.suppliers.todayBought')} value={formatPaisa(summary.todayPurchases)} />
        <Metric label={t('inventory.suppliers.todayPaid')} value={formatPaisa(summary.todayPayments)} tone="green" />
        <Metric label={t('inventory.suppliers.totalDue')} value={formatPaisa(summary.totalDue)} tone={summary.totalDue > 0 ? 'red' : 'green'} big />
      </div>

      <Card className="p-4" aria-label={t('inventory.suppliers.productsTitle')}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <Truck className="size-5 text-brand" aria-hidden />
              {t('inventory.suppliers.productsTitle')}
            </h3>
            <p className="text-sm text-slate-500">{t('inventory.suppliers.productsHint')}</p>
          </div>
          {canManage && notHis.length > 0 && (
            <select value={adding} onChange={(e) => void addProduct(e.target.value)} aria-label={t('inventory.suppliers.addProduct')} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold">
              <option value="">+ {t('inventory.suppliers.addProduct')}</option>
              {notHis.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {ws.products.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{t('inventory.suppliers.noProducts')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {ws.products.map((row) => {
              const input = inputOf(row);
              const amount = amountOf(row);
              const unit = row.ingredient.purchaseUnit;
              return (
                <li key={row.ingredient.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[minmax(0,1fr)_7rem_7.5rem_6.5rem]" data-product-row={row.ingredient.name}>
                  <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-2xl" aria-hidden>
                      {ingredientArt(row.ingredient)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-extrabold text-slate-900">{row.ingredient.name}</span>
                      <span className="block text-xs text-slate-600">
                        {t('inventory.suppliers.stockNow')}: <strong className="text-slate-900" data-stock-now>{stockText(row.ingredient, row.onHandMilli)}</strong>
                        {' · '}
                        {t('inventory.suppliers.lastRate', { price: formatPaisa(row.lastRatePaisa), unit: unitLabel(unit, MILLI) })}
                      </span>
                    </span>
                  </div>
                  {canManage ? (
                    <>
                      <label className="flex items-center gap-1.5">
                        <input value={input.quantity} onChange={(e) => setInput(row.ingredient.id, { quantity: e.target.value }, row)} inputMode="decimal" placeholder="0" aria-label={t('inventory.suppliers.quantityOf', { name: row.ingredient.name })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base tabular-nums" />
                        <span className="text-xs font-semibold text-slate-600">{unitLabel(unit, 2 * MILLI)}</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-500">Rs.</span>
                        <input value={input.rate} onChange={(e) => setInput(row.ingredient.id, { rate: e.target.value }, row)} inputMode="decimal" aria-label={t('inventory.suppliers.rateOf', { name: row.ingredient.name })} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base tabular-nums" />
                      </label>
                      <Button className="col-span-2 md:col-span-1" disabled={busy || input.quantity.trim() === ''} onClick={() => void receive([row])}>
                        <PackagePlus className="size-4" aria-hidden />
                        {t('inventory.suppliers.receive')}
                      </Button>
                      {amount !== null && (
                        <p className="col-span-2 text-sm font-semibold text-slate-700 md:col-span-4" data-line-amount>
                          {t('inventory.suppliers.linePreview', { qty: input.quantity, unit: unitLabel(unit, lineOf(row).quantityMilli ?? 0), rate: formatPaisa(lineOf(row).ratePaisa ?? 0), amount: formatPaisa(amount) })}
                        </p>
                      )}
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {canManage && ws.products.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t('inventory.suppliers.notePlaceholder')} aria-label={t('inventory.suppliers.note')} className="min-h-11 min-w-48 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
            {filled.length > 1 && (
              <Button disabled={busy} onClick={() => void receive(filled)}>
                <Check className="size-4" aria-hidden />
                {t('inventory.suppliers.receiveAll', { n: filled.length, amount: formatPaisa(filledTotal) })}
              </Button>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </Card>

      <Card className="p-4" aria-label={t('inventory.suppliers.khataTitle')}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-slate-900">{period === 'TODAY' ? t('inventory.suppliers.khataToday') : t('inventory.suppliers.khataAll')}</h3>
          <div className="flex gap-1.5" role="group" aria-label={t('inventory.suppliers.khataTitle')}>
            {(['TODAY', 'ALL'] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)} aria-pressed={period === p} className={cn('press min-h-10 rounded-xl border px-3 text-sm font-bold', period === p ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-700')}>
                {t(`inventory.suppliers.periods.${p}`)}
              </button>
            ))}
          </div>
        </div>
        <KhataList rows={ws.entries} workspace={ws} showDate={period === 'ALL'} />
      </Card>

      {paying && <PaymentDialog workspace={ws} onClose={() => setPaying(false)} />}
    </div>
  );
}

function Metric({ label, value, tone, big = false }: { label: string; value: string; tone?: 'green' | 'red'; big?: boolean }) {
  return (
    <div className={cn('rounded-2xl p-3', tone === 'red' ? 'bg-red-50' : 'bg-white ring-1 ring-slate-200/80')} data-metric={label}>
      <p className={cn('text-xs font-bold', tone === 'red' ? 'text-red-800' : 'text-slate-600')}>{label}</p>
      <p className={cn('font-black tabular-nums', big ? 'text-2xl' : 'text-xl', tone === 'red' ? 'text-red-700' : tone === 'green' ? 'text-green-700' : 'text-slate-900')}>{value}</p>
    </div>
  );
}

function KhataList({ rows, workspace, showDate }: { rows: KhataEntryRow[]; workspace: SupplierWorkspace; showDate: boolean }) {
  if (rows.length === 0) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{showDate ? t('inventory.suppliers.khataEmptyAll') : t('inventory.suppliers.khataEmpty')}</p>;
  const nameOf = (id: string) => workspace.ingredients.find((i) => i.id === id);
  return (
    <ol className="divide-y divide-slate-100" data-khata>
      {rows.map(({ entry, balanceAfter, byName }) => {
        const when = new Date(entry.createdAt);
        const time = when.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true });
        const what =
          entry.kind === 'PURCHASE'
            ? entry.lines
                .map((l) => {
                  const i = nameOf(l.ingredientId);
                  return `${i?.name ?? '—'} ${parseFloat((l.quantityMilli / MILLI).toFixed(3))} ${i ? unitLabel(i.purchaseUnit, l.quantityMilli) : ''} × ${formatPaisa(l.ratePaisa)}`;
                })
                .join(', ')
            : entry.kind === 'PAYMENT'
              ? t('inventory.suppliers.paidBy', { method: t(`inventory.suppliers.methods.${entry.method ?? 'OTHER'}`) })
              : t('inventory.suppliers.openingBalance');
        return (
          <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 py-2.5 text-sm md:grid-cols-[6.5rem_minmax(0,1fr)_7.5rem_7.5rem]" data-khata-row={entry.kind}>
            <span className="text-slate-500">
              {showDate && `${entry.businessDate.slice(8)}/${entry.businessDate.slice(5, 7)} · `}
              {time}
            </span>
            <span className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:row-start-auto">
              <span className="font-semibold text-slate-900">{what}</span>
              <span className="block text-xs text-slate-500">
                {byName ?? '—'}
                {entry.note && ` · ${entry.note}`}
              </span>
            </span>
            <span className={cn('text-right font-extrabold tabular-nums', entry.amount < 0 ? 'text-green-700' : 'text-slate-900')}>{entry.amount < 0 ? `−${formatPaisa(-entry.amount)}` : `+${formatPaisa(entry.amount)}`}</span>
            <span className="hidden text-right tabular-nums text-slate-600 md:block" title={t('inventory.suppliers.balanceAfter')}>
              {formatPaisa(balanceAfter)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ── Settle Payment ────────────────────────────────────────────────────────────────────────────

function PaymentDialog({ workspace, onClose }: { workspace: SupplierWorkspace; onClose: () => void }) {
  const toast = useToast();
  const due = workspace.summary.totalDue;
  const [amount, setAmount] = useState(paisaToInput(due));
  const [method, setMethod] = useState<SupplierPaymentMethod>('CASH');
  const [date, setDate] = useState(workspace.today);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(newKey);
  const paisa = parseRupees(amount);
  const remaining = paisa === null ? null : due - paisa;

  const save = async () => {
    const problem = checkSupplierPayment({ amount: paisa, method, date, note }, due, workspace.today);
    if (problem) return setError(t(`inventory.suppliers.payErrors.${problem}`));
    setBusy(true);
    try {
      await getApi().paySupplier({ supplierId: workspace.supplier.id, amount: paisa!, method, date, note, idempotencyKey: key });
      toast.show({ tone: 'success', title: t('inventory.suppliers.paid', { amount: formatPaisa(paisa!), name: workspace.supplier.name }) });
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
      title={t('inventory.suppliers.payTitle', { name: workspace.supplier.name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            <Banknote className="size-4" aria-hidden />
            {t('inventory.suppliers.savePayment')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-red-50 px-3 py-2">
          <p className="text-xs font-bold text-red-800">{t('inventory.suppliers.totalDue')}</p>
          <p className="text-2xl font-black tabular-nums text-red-700">{formatPaisa(due)}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.amount')}</span>
          <span className="flex gap-2">
            <input value={amount} onChange={(e) => (setAmount(e.target.value), setError(null))} inputMode="decimal" aria-label={t('inventory.suppliers.amount')} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-lg font-bold tabular-nums" />
            <Button variant="secondary" onClick={() => setAmount(paisaToInput(due))}>
              {t('inventory.suppliers.full')}
            </Button>
          </span>
        </label>
        <fieldset>
          <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.suppliers.method')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {SUPPLIER_PAYMENT_METHODS.map((m) => (
              <label key={m} className={cn('press flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold', method === m ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-700')}>
                <input type="radio" name="supplier-payment-method" value={m} checked={method === m} onChange={() => setMethod(m)} className="sr-only" />
                {t(`inventory.suppliers.methods.${m}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.date')}</span>
            <input type="date" value={date} max={workspace.today} onChange={(e) => (setDate(e.target.value), setError(null))} aria-label={t('inventory.suppliers.date')} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
          </label>
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            <p className="text-xs font-bold text-slate-600">{t('inventory.suppliers.remaining')}</p>
            <p className={cn('text-lg font-black tabular-nums', remaining !== null && remaining > 0 ? 'text-red-700' : 'text-green-700')} data-remaining>
              {remaining === null ? '—' : formatPaisa(Math.max(remaining, 0))}
            </p>
          </div>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t('inventory.suppliers.notePlaceholder')} aria-label={t('inventory.suppliers.note')} className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
        <p className="text-xs text-slate-500">{t('inventory.suppliers.payNote')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

// ── Add / edit a supplier ─────────────────────────────────────────────────────────────────────

function profileOf(s: Supplier) {
  return { id: s.id, name: s.name, phone: s.phone, category: s.category, address: s.address, notes: s.notes, productIds: s.productIds, openingBalance: 0 };
}

function SupplierDialog({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: (s: Supplier) => void }) {
  const inventory = useApiQuery(() => getApi().getInventory(), []);
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [category, setCategory] = useState<SupplierCategory>(supplier?.category ?? 'OTHER');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [productIds, setProductIds] = useState<string[]>(supplier?.productIds ?? []);
  const [opening, setOpening] = useState('');
  const [find, setFind] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';
  const bought = (inventory.data?.ingredients ?? []).map((r) => r.ingredient).filter((i) => i.kind === 'BOUGHT' && i.isActive);
  const f = find.trim().toLowerCase();

  const save = async () => {
    const openingBalance = opening.trim() ? parseRupees(opening) : 0;
    if (!name.trim()) return setError(t('inventory.suppliers.nameRequired'));
    if (openingBalance === null) return setError(t('inventory.suppliers.openingInvalid'));
    setBusy(true);
    try {
      const saved = await getApi().saveSupplier({ id: supplier?.id ?? null, name, phone, category, address, notes, productIds, openingBalance });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={supplier ? t('inventory.suppliers.editTitle', { name: supplier.name }) : t('inventory.suppliers.add')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button disabled={busy} onClick={() => void save()}>
            {t('inventory.suppliers.saveSupplier')}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.name')}</span>
          <input value={name} onChange={(e) => (setName(e.target.value), setError(null))} maxLength={60} placeholder={t('inventory.suppliers.namePlaceholder')} className={field} aria-label={t('inventory.suppliers.name')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.phone')}</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="0300-0000000" className={field} aria-label={t('inventory.suppliers.phone')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.category')}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as SupplierCategory)} className={field} aria-label={t('inventory.suppliers.category')}>
            {SUPPLIER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`inventory.suppliers.categories.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.address')}</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} className={field} aria-label={t('inventory.suppliers.address')} />
        </label>
        {!supplier ? (
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.opening')}</span>
            <input value={opening} onChange={(e) => (setOpening(e.target.value), setError(null))} inputMode="decimal" placeholder="0" className={field} aria-label={t('inventory.suppliers.opening')} />
            <span className="mt-0.5 block text-xs text-slate-500">{t('inventory.suppliers.openingHint')}</span>
          </label>
        ) : (
          <span />
        )}
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.suppliers.notes')}</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} className={field} aria-label={t('inventory.suppliers.notes')} />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.suppliers.products', { n: productIds.length })}</legend>
          <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t('inventory.suppliers.findProduct')} aria-label={t('inventory.suppliers.findProduct')} className={cn(field, 'mb-2')} />
          <div className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2" data-product-picker>
            {bought
              .filter((i) => !f || i.name.toLowerCase().includes(f))
              .map((i) => (
                <label key={i.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={productIds.includes(i.id)} onChange={(e) => setProductIds((ids) => (e.target.checked ? [...ids, i.id] : ids.filter((x) => x !== i.id)))} className="size-5 accent-brand" />
                  <span aria-hidden>{ingredientArt(i)}</span>
                  {i.name}
                </label>
              ))}
          </div>
        </fieldset>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </Dialog>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, FileText, PackagePlus, Plus, Printer, Save, Search, ShoppingCart, Trash2 } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  SUPPLIER_PAYMENT_METHODS,
  billTotals,
  checkIngredient,
  checkPurchaseBill,
  discountFromPercent,
  displayUnitOf,
  formatPaisa,
  lineAmount,
  paisaToInput,
  parseQuantity,
  parseRupees,
  similarIngredients,
  suggestIngredientCode,
  type Ingredient,
  type IngredientCategory,
  type KhataEntry,
  type PurchaseUnit,
  type StockUnit,
  type SupplierPaymentMethod,
  type SupplierWorkspace,
} from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type PurchaseDraft } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { fromDisplayMilli, stockText, unitLabel } from './inventory-format';
import { ingredientArt } from './recipes/recipe-lines';

/**
 * New Purchase (Bill) — owner's brief and picture, 2026-11-06. Two screens, one at a time:
 * 1. the bill: tap a product to put it on the bill, quantity × price, discount, paid now, Save Draft / Save Purchase / Save & Print;
 * 2. Add New Product, only after "+ Add New Product": saved in the shared product list and on this supplier's list, put on
 *    the bill, and back to the same unfinished bill.
 * Nothing touches stock or the khata until Save Purchase (once, idempotency key). Old debt stays apart from the bill's.
 */

interface BillLine {
  ingredientId: string;
  quantity: string;
  rate: string;
}

const newKey = () => crypto.randomUUID();

export function PurchaseBill({ supplierId, firstProductId, onClose }: { supplierId: string; firstProductId?: string | null; onClose: () => void }) {
  const ws = useApiQuery(() => getApi().getSupplierWorkspace(supplierId, 'TODAY'), [supplierId]);
  const draft = useApiQuery(() => getApi().getPurchaseDraft(supplierId), [supplierId]);
  if ((ws.loading && !ws.data) || (draft.loading && !draft.data && !draft.error)) return <LoadingState />;
  if (!ws.data) return <ErrorState message={ws.error?.message} onRetry={ws.reload} />;
  return <BillScreens workspace={ws.data} draft={draft.data ?? null} firstProductId={firstProductId ?? null} onClose={onClose} />;
}

function BillScreens({ workspace: ws, draft, firstProductId, onClose }: { workspace: SupplierWorkspace; draft: PurchaseDraft | null; firstProductId: string | null; onClose: () => void }) {
  const toast = useToast();
  const { supplier, summary } = ws;
  const rateOf = (id: string) => ws.products.find((p) => p.ingredient.id === id)?.lastRatePaisa ?? ws.ingredients.find((i) => i.id === id)?.purchasePrice ?? 0;
  // The unfinished bill lives here, above both screens: switching to Add New Product never clears it.
  const [lines, setLines] = useState<BillLine[]>(() => draft?.lines ?? (firstProductId ? [{ ingredientId: firstProductId, quantity: '', rate: paisaToInput(rateOf(firstProductId)) }] : []));
  const [billNo, setBillNo] = useState(draft?.billNo ?? '');
  const [date, setDate] = useState(draft?.date ?? ws.today);
  const [discount, setDiscount] = useState(draft?.discount ?? '');
  const [discountMode, setDiscountMode] = useState<'RS' | 'PERCENT'>(draft?.discountMode ?? 'RS');
  const [paid, setPaid] = useState(draft?.paid ?? '');
  const [method, setMethod] = useState<SupplierPaymentMethod>(draft?.method ?? 'CASH');
  const [note, setNote] = useState(draft?.note ?? '');
  const [screen, setScreen] = useState<'bill' | 'new-product'>('bill');
  const [extra, setExtra] = useState<Ingredient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newKey);
  const [printed, setPrinted] = useState<{ purchase: KhataEntry; payment: KhataEntry | null } | null>(null);
  const [focusId, setFocusId] = useState<string | null>(firstProductId);
  const allIngredients = [...ws.ingredients, ...extra.filter((e) => !ws.ingredients.some((i) => i.id === e.id))];
  const byId = new Map(allIngredients.map((i) => [i.id, i]));

  const parsed = lines.map((l) => ({ ingredientId: l.ingredientId, quantityMilli: parseQuantity(l.quantity, { allowZero: false }), ratePaisa: parseRupees(l.rate) }));
  const { subtotal } = billTotals(parsed, 0);
  const discountPaisa = !discount.trim() ? 0 : discountMode === 'RS' ? parseRupees(discount) : percentPaisa(subtotal, discount);
  const total = subtotal - (discountPaisa ?? 0);
  const paidPaisa = !paid.trim() ? 0 : parseRupees(paid);
  const billDue = total - (paidPaisa ?? 0);
  const touch = () => (setError(null), setKey(newKey()));

  const addLine = (ingredient: Ingredient) => {
    setFocusId(ingredient.id);
    touch();
    setLines((all) => (all.some((l) => l.ingredientId === ingredient.id) ? all : [...all, { ingredientId: ingredient.id, quantity: '', rate: paisaToInput(rateOf(ingredient.id) || ingredient.purchasePrice) }]));
  };
  const setLine = (id: string, patch: Partial<BillLine>) => {
    touch();
    setLines((all) => all.map((l) => (l.ingredientId === id ? { ...l, ...patch } : l)));
  };
  const removeLine = (id: string) => {
    touch();
    setLines((all) => all.filter((l) => l.ingredientId !== id));
  };

  const draftOf = (): Omit<PurchaseDraft, 'savedAt'> => ({ supplierId: supplier.id, billNo, date, lines, discount, discountMode, paid, method, note });
  const saveDraft = async (quiet = false) => {
    try {
      await getApi().savePurchaseDraft(draftOf());
      if (!quiet) toast.show({ tone: 'success', title: t('inventory.bill.draftSaved') });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      return false;
    }
  };
  // Back keeps an unfinished bill as a draft, so nothing typed is lost.
  const back = async () => {
    if (lines.length > 0 && (await saveDraft(true))) toast.show({ tone: 'info', title: t('inventory.bill.keptAsDraft') });
    onClose();
  };
  const discardDraft = async () => {
    await getApi().deletePurchaseDraft(supplier.id);
    setLines([]);
    setBillNo('');
    setDiscount('');
    setPaid('');
    setNote('');
    touch();
  };

  const save = async (print: boolean) => {
    const problem = checkPurchaseBill({ lines: parsed, note, discount: discountPaisa, paid: paidPaisa, method: (paidPaisa ?? 0) > 0 ? method : null, date, billNo }, allIngredients, ws.today);
    if (problem) {
      const line = problem.line === null ? null : byId.get(lines[problem.line]!.ingredientId);
      return setError(`${line ? `${line.name}: ` : ''}${t(`inventory.bill.errors.${problem.problem}`)}`);
    }
    setBusy(true);
    try {
      const result = await getApi().savePurchaseBill({
        supplierId: supplier.id,
        billNo,
        date,
        lines: parsed.map((l) => ({ ingredientId: l.ingredientId, quantityMilli: l.quantityMilli!, ratePaisa: l.ratePaisa! })),
        discount: discountPaisa!,
        paid: paidPaisa!,
        method: paidPaisa! > 0 ? method : null,
        note,
        idempotencyKey: key,
      });
      toast.show({ tone: 'success', title: t('inventory.bill.saved', { amount: formatPaisa(result.purchase.amount), name: supplier.name }) });
      if (print) setPrinted(result);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  if (printed) return <BillPrintDialog workspace={ws} purchase={printed.purchase} payment={printed.payment} ingredients={allIngredients} onClose={onClose} />;

  if (screen === 'new-product') {
    return (
      <NewProductScreen
        workspace={ws}
        ingredients={allIngredients}
        onCancel={() => setScreen('bill')}
        onSaved={(ingredient) => {
          setExtra((all) => [...all, ingredient]);
          addLine(ingredient);
          setScreen('bill');
          toast.show({ tone: 'success', title: t('inventory.bill.productAdded', { name: ingredient.name }) });
        }}
      />
    );
  }

  return (
    <div className="space-y-3" data-purchase-bill={supplier.name}>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void back()} className="press flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
          <ArrowLeft className="size-4" aria-hidden />
          {supplier.name}
        </button>
        <h2 className="flex flex-1 items-center gap-2 text-xl font-black text-slate-900">
          <ShoppingCart className="size-6 text-brand" aria-hidden />
          {t('inventory.bill.title')}
        </h2>
        {draft && lines.length > 0 && (
          <button type="button" onClick={() => void discardDraft()} className="press min-h-10 rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-red-700">
            {t('inventory.bill.discardDraft')}
          </button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <ProductPicker workspace={ws} lines={lines} onPick={addLine} onNewProduct={() => setScreen('new-product')} />

        <Card className="flex flex-col gap-3 self-start p-3 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto" aria-label={t('inventory.bill.billItems')} data-bill id="purchase-bill">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-0.5 block text-xs font-bold text-slate-600">{t('inventory.bill.date')}</span>
              <input type="date" value={date} max={ws.today} onChange={(e) => (setDate(e.target.value), touch())} aria-label={t('inventory.bill.date')} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-xs font-bold text-slate-600">{t('inventory.bill.billNo')}</span>
              <input value={billNo} onChange={(e) => (setBillNo(e.target.value), touch())} maxLength={30} placeholder="SKS-1024" aria-label={t('inventory.bill.billNo')} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" />
            </label>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">{t('inventory.bill.billItems')}</h3>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand" data-bill-count>
              {t('inventory.bill.itemCount', { n: lines.length })}
            </span>
          </div>
          {lines.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{t('inventory.bill.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100" data-bill-lines>
              {lines.map((line, index) => {
                const ingredient = byId.get(line.ingredientId);
                if (!ingredient) return null;
                const p = parsed[index]!;
                const amount = p.quantityMilli !== null && p.ratePaisa !== null ? lineAmount(p.quantityMilli, p.ratePaisa) : null;
                return (
                  <BillRow
                    key={line.ingredientId}
                    ingredient={ingredient}
                    line={line}
                    amount={amount}
                    autoFocus={focusId === line.ingredientId}
                    onChange={(patch) => setLine(line.ingredientId, patch)}
                    onRemove={() => removeLine(line.ingredientId)}
                  />
                );
              })}
            </ul>
          )}

          <dl className="space-y-1.5 border-t border-slate-100 pt-2 text-sm">
            <Row label={t('inventory.bill.subtotal')} value={formatPaisa(subtotal)} />
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600">{t('inventory.bill.discount')}</dt>
              <dd className="flex items-center gap-1">
                <span className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label={t('inventory.bill.discountType')}>
                  {(['RS', 'PERCENT'] as const).map((m) => (
                    <button key={m} type="button" aria-pressed={discountMode === m} onClick={() => (setDiscountMode(m), touch())} className={cn('min-h-9 px-2 text-xs font-bold', discountMode === m ? 'bg-brand text-white' : 'bg-white text-slate-600')}>
                      {m === 'RS' ? 'Rs.' : '%'}
                    </button>
                  ))}
                </span>
                <input value={discount} onChange={(e) => (setDiscount(e.target.value), touch())} inputMode="decimal" placeholder="0" aria-label={t('inventory.bill.discount')} className="min-h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums" />
              </dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3 py-2">
              <dt className="font-extrabold text-slate-900">{t('inventory.bill.total')}</dt>
              <dd className="text-xl font-black tabular-nums text-brand" data-bill-total>
                {formatPaisa(Math.max(total, 0))}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-600">{t('inventory.bill.paid')}</dt>
              <dd className="flex items-center gap-1">
                <Button variant="secondary" className="min-h-9 px-2 text-xs" onClick={() => (setPaid(paisaToInput(Math.max(total, 0))), touch())}>
                  {t('inventory.bill.full')}
                </Button>
                <input value={paid} onChange={(e) => (setPaid(e.target.value), touch())} inputMode="decimal" placeholder="0" aria-label={t('inventory.bill.paid')} className="min-h-9 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums" />
              </dd>
            </div>
            {(paidPaisa ?? 0) > 0 && (
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={t('inventory.suppliers.method')}>
                {SUPPLIER_PAYMENT_METHODS.map((m) => (
                  <button key={m} type="button" aria-pressed={method === m} onClick={() => (setMethod(m), touch())} className={cn('press min-h-9 rounded-lg border text-xs font-bold', method === m ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-700')}>
                    {t(`inventory.suppliers.methods.${m}`)}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2">
              <dt className="font-bold text-red-800">{t('inventory.bill.billDue')}</dt>
              <dd className="text-lg font-black tabular-nums text-red-700" data-bill-due>
                {formatPaisa(Math.max(billDue, 0))}
              </dd>
            </div>
            <Row label={t('inventory.bill.previousDue')} value={formatPaisa(summary.totalDue)} />
            <Row label={t('inventory.bill.afterBill')} value={formatPaisa(summary.totalDue + Math.max(billDue, 0))} strong data="after" />
          </dl>

          <input value={note} onChange={(e) => (setNote(e.target.value), touch())} maxLength={200} placeholder={t('inventory.bill.notePlaceholder')} aria-label={t('inventory.bill.note')} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={busy || lines.length === 0} onClick={() => void saveDraft()}>
              <FileText className="size-4" aria-hidden />
              {t('inventory.bill.saveDraft')}
            </Button>
            <Button variant="outline" disabled={busy || lines.length === 0} onClick={() => void save(true)}>
              <Printer className="size-4" aria-hidden />
              {t('inventory.bill.savePrint')}
            </Button>
            <Button className="col-span-2 min-h-12 text-base" disabled={busy || lines.length === 0} onClick={() => void save(false)}>
              <Check className="size-5" aria-hidden />
              {t('inventory.bill.savePurchase')}
            </Button>
          </div>
          <p className="text-xs text-slate-500">{t('inventory.bill.stockNote')}</p>
        </Card>
      </div>

      {lines.length > 0 && (
        // Phones and tablets: the bill is below the products; this bar jumps to it.
        <a href="#purchase-bill" className="bg-brand-gradient sticky bottom-20 z-10 flex min-h-12 items-center justify-between rounded-2xl px-4 text-sm font-bold text-white shadow-lg lg:hidden" data-bill-bar>
          <span>{t('inventory.bill.itemCount', { n: lines.length })}</span>
          <span>
            {formatPaisa(Math.max(total, 0))} · {t('inventory.bill.viewBill')}
          </span>
        </a>
      )}
    </div>
  );
}

function percentPaisa(subtotal: number, text: string): number | null {
  const milli = parseQuantity(text);
  if (milli === null || milli > 100 * MILLI) return null;
  return discountFromPercent(subtotal, Math.round(milli / 10));
}

function Row({ label, value, strong = false, data }: { label: string; value: string; strong?: boolean; data?: string }) {
  return (
    <div className="flex items-center justify-between gap-2" data-bill-row={data}>
      <dt className={cn(strong ? 'font-bold text-slate-800' : 'text-slate-600')}>{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'font-black text-slate-900' : 'font-semibold text-slate-800')}>{value}</dd>
    </div>
  );
}

/** One compact bill line: name and amount on top, quantity × price below. */
function BillRow({ ingredient, line, amount, autoFocus, onChange, onRemove }: { ingredient: Ingredient; line: BillLine; amount: number | null; autoFocus: boolean; onChange: (patch: Partial<BillLine>) => void; onRemove: () => void }) {
  const qtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) qtyRef.current?.focus();
  }, [autoFocus]);
  const unit = ingredient.purchaseUnit;
  const qtyMilli = parseQuantity(line.quantity, { allowZero: false }) ?? 2 * MILLI;
  return (
    <li className="py-2" data-bill-line={ingredient.name}>
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-lg" aria-hidden>
          {ingredientArt(ingredient)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{ingredient.name}</span>
        <span className="text-sm font-black tabular-nums text-slate-900" data-line-amount>
          {amount === null ? '—' : formatPaisa(amount)}
        </span>
        <button type="button" onClick={onRemove} aria-label={t('inventory.bill.remove', { name: ingredient.name })} className="press grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-1 flex items-center gap-1.5 pl-10">
        <input ref={qtyRef} value={line.quantity} onChange={(e) => onChange({ quantity: e.target.value })} inputMode="decimal" placeholder="0" aria-label={t('inventory.suppliers.quantityOf', { name: ingredient.name })} className="min-h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums" />
        <span className="text-xs font-semibold text-slate-600">{unitLabel(unit, qtyMilli)}</span>
        <span className="text-xs text-slate-400">×</span>
        <span className="text-xs font-semibold text-slate-500">Rs.</span>
        <input value={line.rate} onChange={(e) => onChange({ rate: e.target.value })} inputMode="decimal" aria-label={t('inventory.suppliers.rateOf', { name: ingredient.name })} className="min-h-9 w-20 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums" />
        <span className="text-xs text-slate-500">/ {unitLabel(unit, MILLI)}</span>
      </div>
    </li>
  );
}

// ── Products to put on the bill ────────────────────────────────────────────────────────────────

function ProductPicker({ workspace: ws, lines, onPick, onNewProduct }: { workspace: SupplierWorkspace; lines: BillLine[]; onPick: (i: Ingredient) => void; onNewProduct: () => void }) {
  const [find, setFind] = useState('');
  const [category, setCategory] = useState<IngredientCategory | 'ALL'>('ALL');
  const his = ws.products.map((p) => p.ingredient);
  const categories = INGREDIENT_CATEGORIES.filter((c) => his.some((i) => i.category === c));
  const f = find.trim().toLowerCase();
  const matches = (i: Ingredient) => (!f || i.name.toLowerCase().includes(f) || i.code.toLowerCase().includes(f)) && (category === 'ALL' || i.category === category);
  const shown = ws.products.filter((p) => matches(p.ingredient));
  // A search also finds products he never brought (one shared list): putting one on the bill adds it to his list on save.
  const others = f ? ws.ingredients.filter((i) => i.isActive && !his.some((h) => h.id === i.id) && matches(i)).slice(0, 12) : [];
  const inBill = (id: string) => lines.find((l) => l.ingredientId === id);

  return (
    <section className="min-w-0 space-y-3" aria-label={t('inventory.bill.products')}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 min-w-56 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
          <input type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t('inventory.bill.search')} aria-label={t('inventory.bill.search')} className="w-full min-w-0 bg-transparent text-sm" />
        </label>
        <Button onClick={onNewProduct}>
          <Plus className="size-4" aria-hidden />
          {t('inventory.bill.addNewProduct')}
        </Button>
      </div>
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('inventory.bill.categories')}>
          {(['ALL', ...categories] as const).map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={cn('press min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold', category === c ? 'bg-brand-gradient border-brand text-white shadow-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-brand/40')}>
              {c === 'ALL' ? t('inventory.bill.all') : t(`inventory.categories.${c}`)}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" data-product-grid>
        {shown.map((p) => (
          <ProductTile key={p.ingredient.id} ingredient={p.ingredient} stock={stockText(p.ingredient, p.onHandMilli)} rate={p.lastRatePaisa} uses={p.deliveries30d} line={inBill(p.ingredient.id)} onPick={() => onPick(p.ingredient)} />
        ))}
        {shown.length === 0 && <li className="col-span-full rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{his.length === 0 ? t('inventory.suppliers.noProducts') : t('inventory.suppliers.noProductMatch')}</li>}
      </ul>
      {others.length > 0 && (
        <>
          <h3 className="px-1 text-sm font-extrabold text-slate-700">{t('inventory.bill.otherProducts')}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {others.map((i) => (
              <ProductTile key={i.id} ingredient={i} stock={null} rate={i.purchasePrice} uses={0} line={inBill(i.id)} onPick={() => onPick(i)} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ProductTile({ ingredient, stock, rate, uses, line, onPick }: { ingredient: Ingredient; stock: string | null; rate: number; uses: number; line: BillLine | undefined; onPick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-label={t('inventory.bill.addToBill', { name: ingredient.name })}
        data-product-tile={ingredient.name}
        className={cn('press relative flex h-full w-full flex-col rounded-2xl border bg-white p-2 text-left transition hover:border-brand/50 hover:shadow-md', line ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200')}
      >
        <span className="grid h-16 place-items-center rounded-xl bg-gradient-to-b from-brand-soft to-white text-4xl" aria-hidden>
          {ingredientArt(ingredient)}
        </span>
        {uses > 0 && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-brand ring-1 ring-brand/20">{t('inventory.suppliers.uses', { n: uses })}</span>}
        {line && (
          <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-brand text-white" data-in-bill aria-hidden>
            <Check className="size-4" />
          </span>
        )}
        <span className="mt-1.5 line-clamp-2 text-sm font-extrabold leading-snug text-slate-900">{ingredient.name}</span>
        {stock && <span className="text-[11px] text-slate-500">{t('inventory.bill.stock', { stock })}</span>}
        <span className="mt-auto flex items-center justify-between gap-1 pt-1">
          <span className="text-xs font-bold text-slate-700">
            {formatPaisa(rate)} / {unitLabel(ingredient.purchaseUnit, MILLI)}
          </span>
          <span className="flex items-center gap-0.5 rounded-lg border border-brand/40 px-1.5 py-0.5 text-[11px] font-bold text-brand">
            <Plus className="size-3" aria-hidden />
            {t('inventory.bill.add')}
          </span>
        </span>
      </button>
    </li>
  );
}

// ── Screen 2: Add New Product ──────────────────────────────────────────────────────────────────

const MEASURE_UNITS = ['kg', 'g', 'l', 'ml', 'piece'] as const;
type MeasureUnit = (typeof MEASURE_UNITS)[number];
const PACKINGS = ['bag', 'pack', 'box', 'carton'] as const;
type Packing = (typeof PACKINGS)[number];
const STOCK_UNIT: Record<MeasureUnit, StockUnit> = { kg: 'g', g: 'g', l: 'ml', ml: 'ml', piece: 'piece' };

/**
 * One new product for the shared list, on this supplier's list and the bill (owner's Option 2). Weight and volume are
 * counted in grams / ml, so recipes can use them; a packing (bag of 20 kg) needs its size. A name like one we already
 * have asks first ("use that one?"), and the exact same name is refused, so no product is made twice.
 */
function NewProductScreen({ workspace: ws, ingredients, onCancel, onSaved }: { workspace: SupplierWorkspace; ingredients: Ingredient[]; onCancel: () => void; onSaved: (i: Ingredient) => void }) {
  const { allowed } = useSession();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<IngredientCategory>('OTHER');
  const [measure, setMeasure] = useState<MeasureUnit>('kg');
  const [packing, setPacking] = useState<Packing | null>(null);
  const [packSize, setPackSize] = useState('');
  const [price, setPrice] = useState('');
  const [opening, setOpening] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const purchaseUnit: PurchaseUnit = packing ?? measure;
  const units = { purchaseUnit, stockUnit: STOCK_UNIT[measure] };
  const like = name.trim().length >= 3 ? similarIngredients(name, ingredients.filter((i) => i.isActive && i.kind === 'BOUGHT')).slice(0, 4) : [];
  const his = new Set(ws.supplier.productIds);

  const pickExisting = async (ingredient: Ingredient) => {
    if (!his.has(ingredient.id)) {
      try {
        await getApi().saveSupplier({ id: ws.supplier.id, name: ws.supplier.name, phone: ws.supplier.phone, category: ws.supplier.category, address: ws.supplier.address, notes: ws.supplier.notes, productIds: [...ws.supplier.productIds, ingredient.id], openingBalance: 0 });
      } catch (err) {
        return setError(err instanceof Error ? err.message : t('states.errorBody'));
      }
    }
    onSaved(ingredient);
  };

  const save = async () => {
    // Size of one packing in the measuring unit (a bag of 20 kg), kept in stock-unit thousandths.
    const sizeMilli = packing ? parseQuantity(packSize, { allowZero: false }) : null;
    if (packing && sizeMilli === null) return setError(t('inventory.bill.newProduct.sizeRequired', { packing: t(`inventory.unitOne.${packing}`) }));
    const factor = measure === 'kg' || measure === 'l' ? 1000 : 1;
    const packSizeMilli = sizeMilli === null ? null : sizeMilli * factor;
    const purchasePrice = parseRupees(price || '0');
    if (purchasePrice === null) return setError(t('inventory.bill.newProduct.priceInvalid'));
    const openingDisplay = parseQuantity(opening || '0');
    if (openingDisplay === null) return setError(t('inventory.bill.newProduct.openingInvalid'));
    const input = {
      id: null,
      name,
      code: suggestIngredientCode(name, ingredients.map((i) => i.code)),
      category,
      purchaseUnit,
      stockUnit: STOCK_UNIT[measure],
      packSizeMilli,
      minStockMilli: 0,
      reorderQtyMilli: 0,
      purchasePrice,
      preferredSupplierId: ws.supplier.id,
      locationId: null,
      batchNo: '',
      expiryDate: null,
      openingMilli: fromDisplayMilli(units, openingDisplay),
    };
    const problem = checkIngredient(input, ingredients);
    if (problem) return setError(t(`inventory.errors.${problem.problem}`));
    setBusy(true);
    try {
      onSaved(await getApi().addSupplierProduct(ws.supplier.id, input));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const chip = (on: boolean) => cn('press min-h-11 rounded-xl border px-4 text-sm font-bold', on ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700');
  return (
    <div className="mx-auto max-w-2xl space-y-3" data-new-product>
      <button type="button" onClick={onCancel} className="press flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
        <ArrowLeft className="size-4" aria-hidden />
        {t('inventory.bill.newProduct.back')}
      </button>
      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            <PackagePlus className="size-6 text-brand" aria-hidden />
            {t('inventory.bill.newProduct.title')}
          </h2>
          <p className="text-sm text-slate-500">{t('inventory.bill.newProduct.hint', { name: ws.supplier.name })}</p>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.name')}</span>
          <input value={name} onChange={(e) => (setName(e.target.value), setError(null))} maxLength={60} placeholder={t('inventory.bill.newProduct.namePlaceholder')} aria-label={t('inventory.bill.newProduct.name')} className={field} autoFocus />
        </label>
        {like.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3" data-similar>
            <p className="text-sm font-bold text-amber-900">{t('inventory.bill.newProduct.similar')}</p>
            <ul className="mt-2 space-y-1.5">
              {like.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <span aria-hidden>{ingredientArt(i)}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-900">{i.name}</span>
                  <Button variant="secondary" className="min-h-9 text-xs" onClick={() => void pickExisting(i)}>
                    {t('inventory.bill.newProduct.useThis')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.category')}</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory)} aria-label={t('inventory.bill.newProduct.category')} className={field}>
            {INGREDIENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`inventory.categories.${c}`)}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.measure')}</legend>
          <div className="flex flex-wrap gap-2">
            {MEASURE_UNITS.map((u) => (
              <button key={u} type="button" aria-pressed={measure === u} onClick={() => (setMeasure(u), setError(null))} className={chip(measure === u)}>
                {t(`inventory.bill.newProduct.measures.${u}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.packing')}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={packing === null} onClick={() => setPacking(null)} className={chip(packing === null)}>
              {t('inventory.bill.newProduct.loose')}
            </button>
            {PACKINGS.map((p) => (
              <button key={p} type="button" aria-pressed={packing === p} onClick={() => (setPacking(p), setError(null))} className={chip(packing === p)}>
                {t(`inventory.unitOne.${p}`)}
              </button>
            ))}
          </div>
          {packing && (
            <label className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
              {t('inventory.bill.newProduct.oneHolds', { packing: t(`inventory.unitOne.${packing}`) })}
              <input value={packSize} onChange={(e) => (setPackSize(e.target.value), setError(null))} inputMode="decimal" placeholder="20" aria-label={t('inventory.bill.newProduct.packSize')} className="min-h-11 w-24 rounded-xl border border-slate-300 bg-white px-3 text-base tabular-nums" />
              {t(`inventory.bill.newProduct.measures.${measure}`)}
            </label>
          )}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.price', { unit: unitLabel(purchaseUnit, MILLI) })}</span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Rs.</span>
              <input value={price} onChange={(e) => (setPrice(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('inventory.bill.newProduct.price', { unit: unitLabel(purchaseUnit, MILLI) })} className={field} />
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.opening', { unit: unitLabel(displayUnitOf(units), 2 * MILLI) })}</span>
            <input value={opening} onChange={(e) => (setOpening(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('inventory.bill.newProduct.openingLabel')} className={field} />
            <span className="mt-0.5 block text-xs text-slate-500">{t('inventory.bill.newProduct.openingHint')}</span>
          </label>
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t('inventory.bill.newProduct.saveInInventory')}
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {t('inventory.form.cancel')}
          </Button>
          <Button disabled={busy || !allowed('inventory.manage')} onClick={() => void save()}>
            <Save className="size-4" aria-hidden />
            {t('inventory.bill.newProduct.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ── Save & Print ───────────────────────────────────────────────────────────────────────────────

function BillPrintDialog({ workspace: ws, purchase, payment, ingredients, onClose }: { workspace: SupplierWorkspace; purchase: KhataEntry; payment: KhataEntry | null; ingredients: Ingredient[]; onClose: () => void }) {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const subtotal = purchase.lines.reduce((sum, l) => sum + l.amount, 0);
  const paidNow = payment ? -payment.amount : 0;
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('inventory.bill.printTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('nav.close')}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-5" aria-hidden />
            {t('print.print')}
          </Button>
        </>
      }
    >
      <div className="print-area rounded-xl bg-slate-100 p-3">
        <div className="mx-auto max-w-[80mm] bg-white p-3 font-mono text-xs text-slate-900" data-printable-bill>
          <p className="text-center text-sm font-bold">{t('inventory.bill.printHeading')}</p>
          <p className="text-center">{ws.supplier.name}</p>
          <p className="mt-1 flex justify-between">
            <span>{purchase.billNo ? t('inventory.bill.printBillNo', { no: purchase.billNo }) : ''}</span>
            <span>{purchase.businessDate}</span>
          </p>
          <hr className="my-1 border-dashed border-slate-400" />
          {purchase.lines.map((l) => {
            const i = byId.get(l.ingredientId);
            return (
              <div key={l.ingredientId} className="py-0.5">
                <p className="font-bold">{i?.name ?? '—'}</p>
                <p className="flex justify-between">
                  <span>
                    {parseFloat((l.quantityMilli / MILLI).toFixed(3))} {i ? unitLabel(i.purchaseUnit, l.quantityMilli) : ''} × {formatPaisa(l.ratePaisa)}
                  </span>
                  <span>{formatPaisa(l.amount)}</span>
                </p>
              </div>
            );
          })}
          <hr className="my-1 border-dashed border-slate-400" />
          <PrintRow label={t('inventory.bill.subtotal')} value={formatPaisa(subtotal)} />
          {(purchase.discount ?? 0) > 0 && <PrintRow label={t('inventory.bill.discount')} value={`−${formatPaisa(purchase.discount ?? 0)}`} />}
          <PrintRow label={t('inventory.bill.total')} value={formatPaisa(purchase.amount)} bold />
          <PrintRow label={t('inventory.bill.paid')} value={formatPaisa(paidNow)} />
          <PrintRow label={t('inventory.bill.billDue')} value={formatPaisa(purchase.amount - paidNow)} bold />
          {purchase.note && <p className="mt-1">{purchase.note}</p>}
        </div>
      </div>
    </Dialog>
  );
}

function PrintRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <p className={cn('flex justify-between', bold && 'font-bold')}>
      <span>{label}</span>
      <span>{value}</span>
    </p>
  );
}

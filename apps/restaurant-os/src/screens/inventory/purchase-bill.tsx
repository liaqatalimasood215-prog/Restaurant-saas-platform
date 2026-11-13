'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, FileText, PackagePlus, Pencil, Plus, Printer, Save, Search, ShoppingCart, Trash2 } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  PACKING_KINDS,
  buyAmount,
  buyOptions,
  buyStockMilli,
  findBuyOption,
  supplierRateKey,
  type BuyOption,
  SUPPLIER_PAYMENT_METHODS,
  billTotals,
  checkIngredient,
  checkPurchaseBill,
  discountFromPercent,
  displayUnitOf,
  formatPaisa,
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
  type RecipesView,
  type SupplierWorkspace,
} from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type PurchaseBillResult, type PurchaseDraft } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { amountText, fromDisplayMilli, stockText, unitLabel } from './inventory-format';
import { PackingsEditor, packingDrafts, packingsFromDrafts, type PackingDraft } from './packings-editor';
import { bookOf } from './recipes/recipe-draft';
import { ingredientArt } from './recipes/recipe-lines';
import { PurchasePreview, PurchaseSummary, purchasePreview } from './recipes/purchase-recipes';
import { newId } from '@/lib/new-id';

/**
 * New Purchase (Bill) — owner's brief and picture, 2026-11-06. Two screens, one at a time:
 * 1. the bill: tap a product to put it on the bill, quantity × price, discount, paid now, Save Draft / Save Purchase / Save & Print;
 * 2. Add New Product, only after "+ Add New Product": saved in the shared product list and on this supplier's list, put on
 *    the bill, and back to the same unfinished bill.
 * Nothing touches stock or the khata until Save Purchase (once, idempotency key). Old debt stays apart from the bill's.
 */

interface BillLine {
  /** One row of the bill (a product may have several rows, one per way to buy) */
  row: string;
  ingredientId: string;
  /** 'main', 'loose:kg' … or 'pack:<id>' */
  unitKey: string;
  quantity: string;
  rate: string;
  /** W3: the date on the label (YYYY-MM-DD), optional; empty = Unknown (Needs review) */
  expiry?: string;
  /** W3: the label says best-before (else use-by) */
  bestBefore?: boolean;
}

const newKey = () => newId();

export function PurchaseBill({ supplierId, firstProductId, onClose }: { supplierId: string; firstProductId?: string | null; onClose: () => void }) {
  const ws = useApiQuery(() => getApi().getSupplierWorkspace(supplierId, 'TODAY'), [supplierId]);
  const draft = useApiQuery(() => getApi().getPurchaseDraft(supplierId), [supplierId]);
  // P3: the cooked food recipes, for "Recipes for this purchase" (the bill works without them)
  const recipes = useApiQuery(() => getApi().getRecipes(), []);
  if ((ws.loading && !ws.data) || (draft.loading && !draft.data && !draft.error)) return <LoadingState />;
  if (!ws.data) return <ErrorState message={ws.error?.message} onRetry={ws.reload} />;
  return <BillScreens workspace={ws.data} draft={draft.data ?? null} recipes={recipes.data ?? null} firstProductId={firstProductId ?? null} onClose={onClose} />;
}

function BillScreens({
  workspace: ws,
  draft,
  recipes,
  firstProductId,
  onClose,
}: {
  workspace: SupplierWorkspace;
  draft: PurchaseDraft | null;
  recipes: RecipesView | null;
  firstProductId: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const { supplier, summary } = ws;
  const [extra, setExtra] = useState<Ingredient[]>([]);
  const allIngredients = [...ws.ingredients, ...extra.filter((e) => !ws.ingredients.some((i) => i.id === e.id))];
  const byId = new Map(allIngredients.map((i) => [i.id, i]));
  /** His last rate for this way to buy, else the product's usual price for it. */
  const rateFor = (ingredientId: string, unitKey: string, fresh?: Ingredient) => {
    // A product saved a moment ago is not in the lists yet: it comes along as "fresh".
    const ingredient = byId.get(ingredientId) ?? fresh;
    const option = ingredient ? findBuyOption(ingredient, unitKey) : null;
    return supplier.rates?.[supplierRateKey(ingredientId, unitKey)] ?? (unitKey === 'main' ? ws.products.find((p) => p.ingredient.id === ingredientId)?.lastRatePaisa : undefined) ?? option?.pricePaisa ?? 0;
  };
  const rateOf = (id: string) => rateFor(id, 'main');
  const newLine = (ingredientId: string, unitKey = 'main', fresh?: Ingredient): BillLine => ({ row: newKey(), ingredientId, unitKey, quantity: '', rate: paisaToInput(rateFor(ingredientId, unitKey, fresh)) });
  // The unfinished bill lives here, above both screens: switching to Add New Product never clears it.
  const [lines, setLines] = useState<BillLine[]>(() => draft?.lines.map((l) => ({ ...l, row: newKey(), unitKey: l.unitKey ?? 'main' })) ?? (firstProductId ? [newLine(firstProductId)] : []));
  const [billNo, setBillNo] = useState(draft?.billNo ?? '');
  const [date, setDate] = useState(draft?.date ?? ws.today);
  const [discount, setDiscount] = useState(draft?.discount ?? '');
  const [discountMode, setDiscountMode] = useState<'RS' | 'PERCENT'>(draft?.discountMode ?? 'RS');
  const [paid, setPaid] = useState(draft?.paid ?? '');
  const [method, setMethod] = useState<SupplierPaymentMethod>(draft?.method ?? 'CASH');
  const [note, setNote] = useState(draft?.note ?? '');
  const [screen, setScreen] = useState<'bill' | 'new-product'>('bill');
  /** Edit Product opened from a product card (the bill stays as it is) */
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(newKey);
  const [printed, setPrinted] = useState<{ purchase: KhataEntry; payment: KhataEntry | null } | null>(null);
  /** P3: after saving, this purchase's recipes stay on screen until Done (then the print or the supplier screen) */
  const [afterSave, setAfterSave] = useState<{ result: PurchaseBillResult; print: boolean } | null>(null);
  /** The row whose quantity gets the cursor */
  const [focusRow, setFocusRow] = useState<string | null>(lines[0]?.row ?? null);

  const optionOf = (line: BillLine): BuyOption | null => {
    const ingredient = byId.get(line.ingredientId);
    return ingredient ? findBuyOption(ingredient, line.unitKey) : null;
  };
  const parsed = lines.map((l) => ({ ingredientId: l.ingredientId, unitKey: l.unitKey, quantityMilli: parseQuantity(l.quantity, { allowZero: false }), ratePaisa: parseRupees(l.rate), rateDivisor: optionOf(l)?.rateDivisor ?? 1 }));
  // What the bill adds to stock, per product (2 cartons of 12 + 6 bottles = 30 bottles).
  const stockAdded = [...new Set(lines.map((l) => l.ingredientId))].flatMap((id) => {
    const ingredient = byId.get(id);
    if (!ingredient) return [];
    const milli = lines.reduce((sum, l, i) => {
      const option = optionOf(l);
      const q = parsed[i]!.quantityMilli;
      return l.ingredientId === id && option && q !== null ? sum + buyStockMilli(q, option.sizeMilli) : sum;
    }, 0);
    return milli > 0 ? [{ ingredient, milli }] : [];
  });
  const { subtotal } = billTotals(parsed, 0);
  // P3: what each main raw ingredient on this bill makes — its recipe for that amount, at the price typed here
  const recipeNames = new Map((recipes?.ingredients ?? allIngredients).map((i) => [i.id, i]));
  const preview = recipes
    ? purchasePreview(
        recipes,
        bookOf(recipes),
        stockAdded.map(({ ingredient, milli }) => ({
          ingredientId: ingredient.id,
          milli,
          paid: lines.reduce((sum, l, i) => {
            const option = optionOf(l);
            const p = parsed[i]!;
            return l.ingredientId === ingredient.id && option && p.quantityMilli !== null && p.ratePaisa !== null ? sum + buyAmount(p.quantityMilli, p.ratePaisa, option.rateDivisor) : sum;
          }, 0),
        })),
      )
    : [];
  const discountPaisa = !discount.trim() ? 0 : discountMode === 'RS' ? parseRupees(discount) : percentPaisa(subtotal, discount);
  const total = subtotal - (discountPaisa ?? 0);
  const paidPaisa = !paid.trim() ? 0 : parseRupees(paid);
  const billDue = total - (paidPaisa ?? 0);
  const touch = () => (setError(null), setKey(newKey()));

  /** Tapping a product: a new row in its usual unit, or the cursor to the row it already has. */
  const addLine = (ingredient: Ingredient) => {
    touch();
    const existing = lines.find((l) => l.ingredientId === ingredient.id);
    if (existing) return setFocusRow(existing.row);
    const line = newLine(ingredient.id, 'main', ingredient);
    setFocusRow(line.row);
    setLines((all) => [...all, line]);
  };
  /** "+ another unit": the same product again in a way not on the bill yet (6 loose bottles next to 2 cartons). */
  const addOtherUnit = (line: BillLine) => {
    const ingredient = byId.get(line.ingredientId);
    const used = lines.filter((l) => l.ingredientId === line.ingredientId).map((l) => l.unitKey);
    const next = ingredient ? buyOptions(ingredient).find((o) => !used.includes(o.key)) : undefined;
    if (!next) return;
    touch();
    const added = newLine(line.ingredientId, next.key);
    setFocusRow(added.row);
    setLines((all) => {
      const at = all.findIndex((l) => l.row === line.row);
      return [...all.slice(0, at + 1), added, ...all.slice(at + 1)];
    });
  };
  const setLine = (row: string, patch: Partial<BillLine>) => {
    touch();
    setLines((all) => all.map((l) => (l.row === row ? { ...l, ...patch } : l)));
  };
  /** A new unit brings its own last rate (Rs. 4,800 a carton, Rs. 420 a bottle). */
  const setUnit = (line: BillLine, unitKey: string) => setLine(line.row, { unitKey, rate: paisaToInput(rateFor(line.ingredientId, unitKey)) });
  const removeLine = (row: string) => {
    touch();
    setLines((all) => all.filter((l) => l.row !== row));
  };

  const draftOf = (): Omit<PurchaseDraft, 'savedAt'> => ({ supplierId: supplier.id, billNo, date, lines: lines.map(({ ingredientId, unitKey, quantity, rate, expiry, bestBefore }) => ({ ingredientId, unitKey, quantity, rate, ...(expiry ? { expiry, bestBefore: Boolean(bestBefore) } : {}) })), discount, discountMode, paid, method, note });
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
        lines: parsed.map((l, index) => {
          const { expiry, bestBefore } = lines[index]!;
          return { ingredientId: l.ingredientId, unitKey: l.unitKey, quantityMilli: l.quantityMilli!, ratePaisa: l.ratePaisa!, expiryDate: expiry || null, dateKind: expiry ? (bestBefore ? 'BEST_BEFORE' : 'USE_BY') : 'UNKNOWN' };
        }),
        discount: discountPaisa!,
        paid: paidPaisa!,
        method: paidPaisa! > 0 ? method : null,
        note,
        idempotencyKey: key,
      });
      // Cooked food made from what was bought: its recipe now follows the new stock (read only)
      const updates = (result.recipeUpdates ?? []).map((u) => {
        const unit = byId.get(u.mainIngredientId)?.stockUnit ?? 'g';
        return t('inventory.bill.recipeUpdate', {
          dish: u.dishName,
          after: amountText(u.afterMilli, unit),
          was: u.beforeMilli > 0 ? amountText(u.beforeMilli, unit) : t('inventory.recipes.cooked.wasOut'),
        });
      });
      toast.show({
        tone: 'success',
        title: t('inventory.bill.saved', { amount: formatPaisa(result.purchase.amount), name: supplier.name }),
        ...(updates.length > 0 && { body: t('inventory.bill.recipesUpdated', { list: updates.join('; ') }) }),
      });
      if ((result.purchaseRecipes ?? []).length > 0) setAfterSave({ result, print });
      else if (print) setPrinted(result);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  if (afterSave)
    return (
      <PurchaseSummary
        rows={afterSave.result.purchaseRecipes ?? []}
        byId={recipeNames}
        onDone={() => {
          if (afterSave.print) setPrinted(afterSave.result);
          else onClose();
          setAfterSave(null);
        }}
      />
    );
  if (printed) return <BillPrintDialog workspace={ws} purchase={printed.purchase} payment={printed.payment} ingredients={allIngredients} onClose={onClose} />;

  if (editing) {
    const oldRate = paisaToInput(rateOf(editing.id));
    return (
      <ProductScreen
        workspace={ws}
        ingredients={allIngredients}
        product={editing}
        rate={rateOf(editing.id)}
        backLabel={t('inventory.bill.newProduct.back')}
        onCancel={() => setEditing(null)}
        onSaved={(ingredient) => {
          // A line still at the old price takes the corrected one; a price typed on the bill stays.
          const newRate = paisaToInput(ingredient.purchasePrice);
          setLines((all) => all.map((l) => (l.ingredientId === ingredient.id && l.unitKey === 'main' && l.rate === oldRate ? { ...l, rate: newRate } : l)));
          setEditing(null);
          toast.show({ tone: 'success', title: t('inventory.bill.editProduct.saved', { name: ingredient.name }) });
        }}
        onRemoved={(id) => {
          setLines((all) => all.filter((l) => l.ingredientId !== id));
          setEditing(null);
          toast.show({ tone: 'success', title: t('inventory.bill.editProduct.removed', { name: editing.name, supplier: supplier.name }) });
        }}
      />
    );
  }

  if (screen === 'new-product') {
    return (
      <ProductScreen
        workspace={ws}
        ingredients={allIngredients}
        backLabel={t('inventory.bill.newProduct.back')}
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
        <ProductPicker workspace={ws} lines={lines} onPick={addLine} onEdit={setEditing} onNewProduct={() => setScreen('new-product')} />

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
                const option = optionOf(line);
                if (!ingredient || !option) return null;
                const p = parsed[index]!;
                const used = lines.filter((l) => l.ingredientId === line.ingredientId).map((l) => l.unitKey);
                return (
                  <BillRow
                    key={line.row}
                    ingredient={ingredient}
                    line={line}
                    option={option}
                    amount={p.quantityMilli !== null && p.ratePaisa !== null ? buyAmount(p.quantityMilli, p.ratePaisa, option.rateDivisor) : null}
                    canAddUnit={buyOptions(ingredient).some((o) => !used.includes(o.key))}
                    autoFocus={focusRow === line.row}
                    onChange={(patch) => setLine(line.row, patch)}
                    onUnit={(unitKey) => setUnit(line, unitKey)}
                    onOtherUnit={() => addOtherUnit(line)}
                    onRemove={() => removeLine(line.row)}
                  />
                );
              })}
            </ul>
          )}

          {stockAdded.length > 0 && (
            <div className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-900" data-stock-added>
              <p className="font-bold">{t('inventory.bill.stockAdded')}</p>
              <p>{stockAdded.map(({ ingredient, milli }) => `${ingredient.name} +${stockText(ingredient, milli)}`).join(' · ')}</p>
            </div>
          )}
          <PurchasePreview rows={preview} byId={recipeNames} />
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

/** "Bag (25 kg)", "Carton (12 bottles)", "kg", "gram" — how a way to buy is named on the bill and the receipt. */
export function optionLabel(option: Pick<BuyOption, 'unit' | 'sizeMilli' | 'packing' | 'key'>, ingredient: Pick<Ingredient, 'purchaseUnit' | 'stockUnit'>): string {
  const name = unitLabel(option.unit, MILLI);
  const counted = option.packing !== null || (option.key === 'main' && !['kg', 'g', 'l', 'ml', 'piece', 'bottle', 'portion'].includes(option.unit));
  return counted ? `${name} (${stockText(ingredient, option.sizeMilli)})` : name;
}

/** The unit a rate is per: grams and ml are priced per kg / litre. */
function rateUnit(option: BuyOption): string {
  if (option.rateDivisor === 1000) return unitLabel(option.unit === 'g' ? 'kg' : 'l', MILLI);
  return unitLabel(option.unit, MILLI);
}

/** One compact bill row: name and amount on top; quantity, unit and price below; what it adds to stock under them. */
function BillRow({
  ingredient,
  line,
  option,
  amount,
  canAddUnit,
  autoFocus,
  onChange,
  onUnit,
  onOtherUnit,
  onRemove,
}: {
  ingredient: Ingredient;
  line: BillLine;
  option: BuyOption;
  amount: number | null;
  canAddUnit: boolean;
  autoFocus: boolean;
  onChange: (patch: Partial<BillLine>) => void;
  onUnit: (unitKey: string) => void;
  onOtherUnit: () => void;
  onRemove: () => void;
}) {
  const qtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) qtyRef.current?.focus();
  }, [autoFocus]);
  const options = buyOptions(ingredient);
  const qtyMilli = parseQuantity(line.quantity, { allowZero: false });
  return (
    <li className="py-2" data-bill-line={ingredient.name} data-bill-unit={option.key}>
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
      {/* One compact row: quantity, unit, × price (grams and ml say "/ kg" or "/ litre": they are priced per kg / litre). */}
      <div className="mt-1 grid grid-cols-[3.5rem_minmax(0,1fr)_auto_4.75rem] items-center gap-1.5">
        <input ref={qtyRef} value={line.quantity} onChange={(e) => onChange({ quantity: e.target.value })} inputMode="decimal" placeholder="0" aria-label={t('inventory.suppliers.quantityOf', { name: ingredient.name })} className="min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums" />
        <select value={option.key} onChange={(e) => onUnit(e.target.value)} aria-label={t('inventory.bill.unitOf', { name: ingredient.name })} title={t('inventory.bill.ratePer', { unit: rateUnit(option) })} className="min-h-9 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-1.5 text-xs font-semibold text-slate-800">
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {optionLabel(o, ingredient)}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">× Rs.</span>
        <input value={line.rate} onChange={(e) => onChange({ rate: e.target.value })} inputMode="decimal" aria-label={t('inventory.suppliers.rateOf', { name: ingredient.name })} className="min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums" />
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-green-700" data-line-stock>
          {qtyMilli !== null ? `= ${stockText(ingredient, buyStockMilli(qtyMilli, option.sizeMilli))}` : ''}
          {option.rateDivisor === 1000 && <span className="ml-1 font-normal text-slate-500">({t('inventory.bill.ratePer', { unit: rateUnit(option) })})</span>}
        </span>
        {canAddUnit && (
          <button type="button" onClick={onOtherUnit} className="press rounded-md px-1.5 py-0.5 font-bold text-brand hover:bg-brand-soft">
            {t('inventory.bill.otherUnit')}
          </button>
        )}
      </div>
      {/* W3: the date on this delivery's label, optional: none = Unknown, shown as Needs review (never as safe) */}
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]" data-line-expiry>
        <label className="flex items-center gap-1 font-semibold text-slate-600">
          {line.bestBefore ? t('inventory.lots.kinds.BEST_BEFORE') : t('inventory.lots.kinds.USE_BY')}
          <input
            type="date"
            value={line.expiry ?? ''}
            onChange={(e) => onChange({ expiry: e.target.value })}
            aria-label={t('inventory.lots.dateOf', { name: ingredient.name })}
            className="min-h-8 rounded-md border border-slate-300 bg-white px-1.5 text-xs"
          />
        </label>
        {line.expiry ? (
          <label className="flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={Boolean(line.bestBefore)} onChange={(e) => onChange({ bestBefore: e.target.checked })} className="size-4 accent-brand" />
            {t('inventory.lots.bestBeforeTick')}
          </label>
        ) : (
          <span className="text-amber-700">{t('inventory.lots.noDateHint')}</span>
        )}
      </div>
    </li>
  );
}

// ── Products to put on the bill ────────────────────────────────────────────────────────────────

function ProductPicker({ workspace: ws, lines, onPick, onEdit, onNewProduct }: { workspace: SupplierWorkspace; lines: BillLine[]; onPick: (i: Ingredient) => void; onEdit: (i: Ingredient) => void; onNewProduct: () => void }) {
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
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" data-product-grid>
        {shown.map((p) => (
          <ProductTile key={p.ingredient.id} ingredient={p.ingredient} stock={stockText(p.ingredient, p.onHandMilli)} rate={p.lastRatePaisa} uses={p.deliveries30d} line={inBill(p.ingredient.id)} onPick={() => onPick(p.ingredient)} onEdit={() => onEdit(p.ingredient)} />
        ))}
        {shown.length === 0 && <li className="col-span-full rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{his.length === 0 ? t('inventory.suppliers.noProducts') : t('inventory.suppliers.noProductMatch')}</li>}
      </ul>
      {others.length > 0 && (
        <>
          <h3 className="px-1 text-sm font-extrabold text-slate-700">{t('inventory.bill.otherProducts')}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {others.map((i) => (
              <ProductTile key={i.id} ingredient={i} stock={null} rate={i.purchasePrice} uses={0} line={inBill(i.id)} onPick={() => onPick(i)} onEdit={() => onEdit(i)} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ProductTile({ ingredient, stock, rate, uses, line, onPick, onEdit }: { ingredient: Ingredient; stock: string | null; rate: number; uses: number; line: BillLine | undefined; onPick: () => void; onEdit: () => void }) {
  return (
    <li className="relative">
      <EditProductButton name={ingredient.name} onClick={onEdit} />
      <button
        type="button"
        onClick={onPick}
        aria-label={t('inventory.bill.addToBill', { name: ingredient.name })}
        data-product-tile={ingredient.name}
        className={cn('press relative flex h-full w-full flex-col rounded-2xl border bg-white p-2 text-left transition hover:border-brand/50 hover:shadow-md', line ? 'border-brand ring-2 ring-brand/20' : 'border-slate-200')}
      >
        <span className="grid h-14 place-items-center rounded-xl bg-gradient-to-b from-brand-soft to-white text-3xl" aria-hidden>
          {ingredientArt(ingredient)}
        </span>
        {uses > 0 && <span className="absolute left-3 top-3 rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-brand ring-1 ring-brand/20">{t('inventory.suppliers.uses', { n: uses })}</span>}
        {line && (
          <span className="absolute bottom-[calc(100%-4.5rem)] right-3 grid size-6 place-items-center rounded-full bg-brand text-white" data-in-bill aria-hidden>
            <Check className="size-4" />
          </span>
        )}
        <span className="mt-1.5 line-clamp-2 text-sm font-extrabold leading-snug text-slate-900">{ingredient.name}</span>
        {stock && <span className="text-[11px] text-slate-500">{t('inventory.bill.stock', { stock })}</span>}
        <span className="truncate text-[11px] font-semibold text-slate-600" data-ways>
          {buyOptions(ingredient)
            .map((o) => optionLabel(o, ingredient))
            .join(' · ')}
        </span>
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

/** The ✏️ on a product card (a sibling of the card's own button, top right). */
export function EditProductButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={t('inventory.bill.editProduct.open', { name })} className="press absolute right-3 top-3 z-[1] grid size-8 place-items-center rounded-full bg-white/95 text-slate-600 shadow ring-1 ring-slate-200 hover:text-brand">
      <Pencil className="size-4" aria-hidden />
    </button>
  );
}

// ── Screen 2: Add New Product / Edit Product ───────────────────────────────────────────────────

const MEASURE_UNITS = ['kg', 'g', 'l', 'ml', 'piece', 'bottle'] as const;
type MeasureUnit = (typeof MEASURE_UNITS)[number];
const PACKINGS = PACKING_KINDS;
type MainPacking = (typeof PACKINGS)[number];
const STOCK_UNIT: Record<MeasureUnit, StockUnit> = { kg: 'g', g: 'g', l: 'ml', ml: 'ml', piece: 'piece', bottle: 'bottle' };
const isMeasure = (u: string): u is MeasureUnit => (MEASURE_UNITS as readonly string[]).includes(u);
const isPacking = (u: string): u is MainPacking => (PACKINGS as readonly string[]).includes(u);

/** How the form shows a saved product: measured in, packing and its size; null = units this form cannot show (bottles). */
function unitsOf(product: Ingredient): { measure: MeasureUnit; packing: MainPacking | null; packSize: string } | null {
  if (product.stockUnit !== 'g' && product.stockUnit !== 'ml' && product.stockUnit !== 'piece' && product.stockUnit !== 'bottle') return null;
  const loose = isMeasure(product.purchaseUnit) ? product.purchaseUnit : null;
  const packing = isPacking(product.purchaseUnit) ? product.purchaseUnit : null;
  if (!loose && !packing) return null;
  const measure: MeasureUnit = loose ?? (product.stockUnit === 'g' ? 'kg' : product.stockUnit === 'ml' ? 'l' : product.stockUnit);
  const factor = measure === 'kg' || measure === 'l' ? 1000 : 1;
  const packSize = packing && product.packSizeMilli ? String(parseFloat((product.packSizeMilli / factor / MILLI).toFixed(3))) : '';
  return { measure, packing, packSize };
}

/**
 * Add New Product (owner's Option 2): one new product for the shared list, on this supplier's list and the bill.
 * Edit Product (owner, 2026-11-06): the same form, filled in; the change is for every supplier and recipe, the price is
 * also this supplier's own rate, and "Remove from his list" takes it off his list only (stock and history stay).
 * Weight stays weight and volume stays volume once saved (the stock unit never changes after stock was recorded).
 * A name like one we already have asks first ("use that one?"), and the exact same name is refused.
 */
export function ProductScreen({
  workspace: ws,
  ingredients,
  product = null,
  rate = null,
  onCancel,
  onSaved,
  onRemoved,
  backLabel,
}: {
  workspace: SupplierWorkspace;
  ingredients: Ingredient[];
  /** Edit this product; null = Add New Product */
  product?: Ingredient | null;
  /** His last rate for the product being edited (paisa) */
  rate?: number | null;
  onCancel: () => void;
  onSaved: (i: Ingredient) => void;
  onRemoved?: (id: string) => void;
  backLabel: string;
}) {
  const { allowed } = useSession();
  const start = product ? unitsOf(product) : null;
  const unitsLocked = product !== null && start === null;
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<IngredientCategory>(product?.category ?? 'OTHER');
  const [measure, setMeasure] = useState<MeasureUnit>(start?.measure ?? 'kg');
  const [packing, setPacking] = useState<MainPacking | null>(start?.packing ?? null);
  const [others, setOthers] = useState<PackingDraft[]>(() => packingDrafts(product?.packings, product?.stockUnit ?? 'g'));
  const [loose, setLoose] = useState(product?.loosePrice != null ? paisaToInput(product.loosePrice) : '');
  const [packSize, setPackSize] = useState(start?.packSize ?? '');
  const [price, setPrice] = useState(product ? paisaToInput(rate ?? product.purchasePrice) : '');
  const [opening, setOpening] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const field = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const purchaseUnit: PurchaseUnit = unitsLocked ? product!.purchaseUnit : (packing ?? measure);
  const stockUnit: StockUnit = unitsLocked ? product!.stockUnit : STOCK_UNIT[measure];
  const units = { purchaseUnit, stockUnit };
  // Editing: only units with the same stock unit (kg ↔ g, litre ↔ ml), so recorded stock keeps its meaning.
  const measures = product ? MEASURE_UNITS.filter((u) => STOCK_UNIT[u] === product.stockUnit) : MEASURE_UNITS;
  const rest = ingredients.filter((i) => i.id !== product?.id);
  const like = !product && name.trim().length >= 3 ? similarIngredients(name, rest.filter((i) => i.isActive && i.kind === 'BOUGHT')).slice(0, 4) : [];
  const his = new Set(ws.supplier.productIds);
  const key = product ? 'editProduct' : 'newProduct';

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
    const sizeMilli = !unitsLocked && packing ? parseQuantity(packSize, { allowZero: false }) : null;
    if (!unitsLocked && packing && sizeMilli === null) return setError(t('inventory.bill.newProduct.sizeRequired', { packing: t(`inventory.unitOne.${packing}`) }));
    const factor = measure === 'kg' || measure === 'l' ? 1000 : 1;
    const packSizeMilli = unitsLocked ? product!.packSizeMilli : sizeMilli === null ? null : sizeMilli * factor;
    const purchasePrice = parseRupees(price || '0');
    if (purchasePrice === null) return setError(t('inventory.bill.newProduct.priceInvalid'));
    const openingDisplay = product ? 0 : parseQuantity(opening || '0');
    if (openingDisplay === null) return setError(t('inventory.bill.newProduct.openingInvalid'));
    const more = packingsFromDrafts(others, stockUnit);
    if (more.error !== null) return setError(more.error);
    const loosePrice = loose.trim() ? parseRupees(loose) : null;
    if (loose.trim() && loosePrice === null) return setError(t('inventory.packings.errors.PRICE_INVALID', { packing: '' }));
    const input = {
      // Editing keeps everything this form does not show (code, levels, storage place, batch, expiry).
      id: product?.id ?? null,
      name,
      code: product?.code ?? suggestIngredientCode(name, ingredients.map((i) => i.code)),
      category,
      purchaseUnit,
      stockUnit,
      packSizeMilli,
      minStockMilli: product?.minStockMilli ?? 0,
      reorderQtyMilli: product?.reorderQtyMilli ?? 0,
      purchasePrice,
      preferredSupplierId: product ? product.preferredSupplierId : ws.supplier.id,
      locationId: product?.locationId ?? null,
      batchNo: product?.batchNo ?? '',
      expiryDate: product?.expiryDate ?? null,
      openingMilli: fromDisplayMilli(units, openingDisplay),
      packings: more.packings,
      loosePrice,
    };
    const problem = checkIngredient({ ...input, openingMilli: product ? null : input.openingMilli }, ingredients);
    if (problem) return setError(t(`inventory.errors.${problem.problem}`));
    setBusy(true);
    try {
      onSaved(product ? await getApi().updateSupplierProduct(ws.supplier.id, input) : await getApi().addSupplierProduct(ws.supplier.id, input));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!product) return;
    // A second tap removes: nothing goes by one slip of the finger.
    if (!removing) return setRemoving(true);
    setBusy(true);
    try {
      await getApi().removeSupplierProduct(ws.supplier.id, product.id);
      onRemoved?.(product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const chip = (on: boolean) => cn('press min-h-11 rounded-xl border px-4 text-sm font-bold', on ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700');
  return (
    <div className="mx-auto max-w-2xl space-y-3" data-new-product={product ? undefined : ''} data-edit-product={product ? product.name : undefined}>
      <button type="button" onClick={onCancel} className="press flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </button>
      <Card className="space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
            {product ? <Pencil className="size-6 text-brand" aria-hidden /> : <PackagePlus className="size-6 text-brand" aria-hidden />}
            {t(`inventory.bill.${key}.title`)}
          </h2>
          <p className="text-sm text-slate-500">{t(`inventory.bill.${key}.hint`, { name: ws.supplier.name })}</p>
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
        {unitsLocked ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{t('inventory.bill.editProduct.unitsInStock', { unit: unitLabel(purchaseUnit, MILLI) })}</p>
        ) : (
          <>
            <fieldset>
              <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.measure')}</legend>
              <div className="flex flex-wrap gap-2">
                {measures.map((u) => (
                  <button key={u} type="button" aria-pressed={measure === u} onClick={() => (setMeasure(u), setError(null))} className={chip(measure === u)}>
                    {t(`inventory.bill.newProduct.measures.${u}`)}
                  </button>
                ))}
              </div>
              {product && <p className="mt-1 text-xs text-slate-500">{t('inventory.bill.editProduct.measureHint')}</p>}
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.packing')}</legend>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={packing === null} onClick={() => setPacking(null)} className={chip(packing === null)}>
                  {t('inventory.bill.newProduct.loose')}
                </button>
                {PACKINGS.filter((p) => p !== measure).map((p) => (
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
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.price', { unit: unitLabel(purchaseUnit, MILLI) })}</span>
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">Rs.</span>
              <input value={price} onChange={(e) => (setPrice(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('inventory.bill.newProduct.price', { unit: unitLabel(purchaseUnit, MILLI) })} className={field} />
            </span>
          </label>
          {!product && (
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-800">{t('inventory.bill.newProduct.opening', { unit: unitLabel(displayUnitOf(units), 2 * MILLI) })}</span>
              <input value={opening} onChange={(e) => (setOpening(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('inventory.bill.newProduct.openingLabel')} className={field} />
              <span className="mt-0.5 block text-xs text-slate-500">{t('inventory.bill.newProduct.openingHint')}</span>
            </label>
          )}
        </div>
        <fieldset>
          <legend className="mb-1 text-sm font-bold text-slate-800">{t('inventory.packings.title')}</legend>
          <p className="mb-2 text-xs text-slate-500">{t('inventory.packings.hint')}</p>
          <PackingsEditor stockUnit={stockUnit} drafts={others} onChange={(next) => (setOthers(next), setError(null))} loosePrice={loose} onLoosePrice={(v) => (setLoose(v), setError(null))} loosePlaceholder={t('inventory.packings.fromMain')} />
        </fieldset>
        <p className="flex items-start gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-900">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          {product ? t('inventory.bill.editProduct.forEveryone') : t('inventory.bill.newProduct.saveInInventory')}
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {product && onRemoved && (
            <Button variant={removing ? 'outline' : 'ghost'} className="mr-auto" disabled={busy} onClick={() => void remove()}>
              <Trash2 className="size-4" aria-hidden />
              {removing ? t('inventory.bill.editProduct.removeConfirm') : t('inventory.bill.editProduct.remove', { name: ws.supplier.name })}
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel}>
            {t('inventory.form.cancel')}
          </Button>
          <Button disabled={busy || !allowed('inventory.manage')} onClick={() => void save()}>
            <Save className="size-4" aria-hidden />
            {t(`inventory.bill.${key}.save`)}
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
                    {parseFloat((l.quantityMilli / MILLI).toFixed(3))} {unitLabel(l.unit ?? i?.purchaseUnit ?? 'piece', l.quantityMilli)} × {formatPaisa(l.ratePaisa)}
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

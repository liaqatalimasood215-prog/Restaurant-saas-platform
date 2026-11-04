'use client';

import { useState, type ReactNode } from 'react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  PURCHASE_UNITS,
  STOCK_UNITS,
  checkIngredient,
  displayUnitOf,
  isMeasureUnit,
  milliToInput,
  paisaToInput,
  parseQuantity,
  parseRupees,
  purchaseConversion,
  suggestIngredientCode,
  type IngredientCategory,
  type IngredientField,
  type IngredientRow,
  type InventoryView,
  type PurchaseUnit,
  type StockUnit,
} from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { fromDisplayMilli, quantityText, stockText, toDisplayMilli, unitLabel } from './inventory-format';

/** The recipe unit that fits a purchase unit; packages keep what was chosen (pieces by default). */
function stockUnitFor(purchase: PurchaseUnit, current: StockUnit): StockUnit {
  if (purchase === 'kg' || purchase === 'g') return 'g';
  if (purchase === 'l' || purchase === 'ml') return 'ml';
  if (purchase === 'piece' || purchase === 'bottle' || purchase === 'portion') return purchase;
  return current;
}

/**
 * Add or edit an ingredient. People type stock in kg, litres or the counted unit; it is kept in the recipe unit
 * (grams, ml, pieces). A new ingredient's "Stock now" becomes its opening stock; later changes use Adjust Stock.
 */
export function IngredientDialog({ row, view, onClose }: { row: IngredientRow | null; view: InventoryView; onClose: () => void }) {
  const toast = useToast();
  const item = row?.ingredient;
  const others = view.ingredients.map((r) => r.ingredient);
  const [name, setName] = useState(item?.name ?? '');
  const [code, setCode] = useState(item?.code ?? '');
  const [codeTouched, setCodeTouched] = useState(Boolean(item));
  const [category, setCategory] = useState<IngredientCategory>(item?.category ?? 'MEAT');
  const [purchaseUnit, setPurchaseUnit] = useState<PurchaseUnit>(item?.purchaseUnit ?? 'kg');
  const [stockUnit, setStockUnit] = useState<StockUnit>(item?.stockUnit ?? 'g');
  const units = { purchaseUnit, stockUnit };
  const shown = (stockMilli: number) => milliToInput(toDisplayMilli(units, stockMilli));
  const [packSize, setPackSize] = useState(item?.packSizeMilli ? shown(item.packSizeMilli) : '');
  const [opening, setOpening] = useState('');
  const [minStock, setMinStock] = useState(item ? shown(item.minStockMilli) : '');
  const [reorder, setReorder] = useState(item ? milliToInput(item.reorderQtyMilli) : '');
  const [price, setPrice] = useState(item ? paisaToInput(item.purchasePrice) : '');
  const [supplierId, setSupplierId] = useState(item?.preferredSupplierId ?? '');
  const [locationId, setLocationId] = useState(item?.locationId ?? '');
  const [batchNo, setBatchNo] = useState(item?.batchNo ?? '');
  const [expiryDate, setExpiryDate] = useState(item?.expiryDate ?? '');
  const [inUse, setInUse] = useState(item?.isActive ?? true);
  const [error, setError] = useState<{ field: IngredientField | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const displayUnit = displayUnitOf(units);
  const needsPack = !purchaseConversion(purchaseUnit, stockUnit, null).ok && !isMeasureUnit(purchaseUnit);
  const packDisplayMilli = parseQuantity(packSize, { allowZero: false });
  const packSizeMilli = needsPack ? (packDisplayMilli === null ? null : fromDisplayMilli(units, packDisplayMilli)) : null;
  const conversion = purchaseConversion(purchaseUnit, stockUnit, packSizeMilli);
  const toStock = (text: string) => {
    const milli = parseQuantity(text);
    return milli === null ? null : fromDisplayMilli(units, milli);
  };

  const conversionText = conversion.ok
    ? isMeasureUnit(purchaseUnit) && purchaseUnit !== stockUnit
      ? t('inventory.form.conversion', { purchase: unitLabel(purchaseUnit, MILLI), n: '1,000', stock: unitLabel(stockUnit, 2 * MILLI) })
      : !conversion.fixed
        ? t('inventory.form.conversion', { purchase: unitLabel(purchaseUnit, MILLI), n: quantityText(toDisplayMilli(units, conversion.factorMilli), displayUnit), stock: '' }).trim()
        : null
    : null;

  const changeName = (value: string) => {
    setName(value);
    setError(null);
    if (!codeTouched) setCode(value.trim() ? suggestIngredientCode(value, others.map((o) => o.code)) : '');
  };
  const changePurchase = (value: PurchaseUnit) => {
    setPurchaseUnit(value);
    if (!item) setStockUnit(stockUnitFor(value, stockUnit));
    setError(null);
  };

  const save = async () => {
    const purchasePrice = parseRupees(price || '0');
    const input = {
      id: item?.id ?? null,
      name,
      code,
      category,
      purchaseUnit,
      stockUnit,
      packSizeMilli,
      minStockMilli: toStock(minStock || '0'),
      reorderQtyMilli: parseQuantity(reorder || '0'),
      purchasePrice,
      openingMilli: item ? null : toStock(opening || '0'),
      expiryDate: expiryDate || null,
      batchNo,
    };
    const problem = checkIngredient(input, others);
    if (problem) return setError({ field: problem.field, text: t(`inventory.errors.${problem.problem}`) });
    setBusy(true);
    setError(null);
    try {
      const saved = await getApi().saveIngredient({
        ...input,
        minStockMilli: input.minStockMilli ?? 0,
        reorderQtyMilli: input.reorderQtyMilli ?? 0,
        purchasePrice: purchasePrice ?? 0,
        openingMilli: input.openingMilli ?? 0,
        preferredSupplierId: supplierId || null,
        locationId: locationId || null,
      });
      if (item && item.isActive !== inUse) await getApi().setIngredientActive(saved.id, inUse);
      toast.show({ tone: 'success', title: item ? t('inventory.form.saved', { name: saved.name }) : t('inventory.form.added', { name: saved.name }) });
      onClose();
    } catch (err) {
      setError({ field: null, text: err instanceof Error ? err.message : t('states.errorBody') });
      setBusy(false);
    }
  };

  const field = (key: IngredientField) =>
    cn('min-h-12 w-full rounded-xl border bg-white px-3 text-base', error?.field === key ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-300');
  const plainField = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const unitBox = 'flex shrink-0 items-center rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600';
  const withUnit = (key: IngredientField, value: string, onChange: (v: string) => void, unit: string, label: string) => (
    <span className="flex">
      <input value={value} onChange={(e) => (onChange(e.target.value), setError(null))} inputMode="decimal" aria-label={label} placeholder="0" className={cn(field(key), 'rounded-r-none')} />
      <span className={unitBox} aria-hidden>
        {unit}
      </span>
    </span>
  );

  return (
    <Dialog
      open
      size="lg"
      onClose={onClose}
      title={item ? t('inventory.form.editTitle', { name: item.name }) : t('inventory.form.addTitle')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {t('inventory.form.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Group title={t('inventory.form.basics')}>
          <Field label={t('inventory.form.name')} wide>
            <input value={name} onChange={(e) => changeName(e.target.value)} aria-label={t('inventory.form.name')} placeholder={t('inventory.form.namePlaceholder')} className={field('name')} />
          </Field>
          <Field label={t('inventory.form.category')}>
            <select value={category} onChange={(e) => setCategory(e.target.value as IngredientCategory)} aria-label={t('inventory.form.category')} className={field('category')}>
              {INGREDIENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`inventory.categories.${c}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('inventory.form.code')} hint={item ? undefined : t('inventory.form.codeHint')}>
            <input
              value={code}
              onChange={(e) => (setCode(e.target.value.toUpperCase()), setCodeTouched(true), setError(null))}
              aria-label={t('inventory.form.code')}
              placeholder="CHK-001"
              className={cn(field('code'), 'font-mono uppercase')}
            />
          </Field>
        </Group>

        <Group title={t('inventory.form.units')}>
          <Field label={t('inventory.form.purchaseUnit')}>
            <select value={purchaseUnit} onChange={(e) => changePurchase(e.target.value as PurchaseUnit)} aria-label={t('inventory.form.purchaseUnit')} className={field('units')}>
              {PURCHASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(u, MILLI)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('inventory.form.stockUnit')} hint={item ? t('inventory.form.unitLocked') : undefined}>
            <select
              value={stockUnit}
              onChange={(e) => (setStockUnit(e.target.value as StockUnit), setError(null))}
              disabled={Boolean(item)}
              aria-label={t('inventory.form.stockUnit')}
              className={cn(field('units'), 'disabled:bg-slate-50 disabled:text-slate-500')}
            >
              {STOCK_UNITS.map((u) => (
                <option key={u} value={u}>
                  {unitLabel(u, MILLI)}
                </option>
              ))}
            </select>
          </Field>
          {needsPack && (
            <Field label={t('inventory.form.packSize', { unit: unitLabel(displayUnit, 2 * MILLI), pack: unitLabel(purchaseUnit, MILLI) })} wide>
              {withUnit('packSize', packSize, setPackSize, unitLabel(displayUnit, 2 * MILLI), t('inventory.form.packSize', { unit: unitLabel(displayUnit, 2 * MILLI), pack: unitLabel(purchaseUnit, MILLI) }))}
            </Field>
          )}
          {conversionText && (
            <p className="rounded-xl bg-brand-soft/60 px-3 py-2 text-sm font-bold text-brand sm:col-span-2" data-conversion>
              {conversionText}
            </p>
          )}
        </Group>

        <Group title={t('inventory.form.stock')}>
          {item ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
              {t('inventory.form.stockNow', { qty: stockText(item, row?.onHandMilli ?? 0) })}
            </p>
          ) : (
            <Field label={t('inventory.form.opening')} hint={t('inventory.form.openingHint')} wide>
              {withUnit('opening', opening, setOpening, unitLabel(displayUnit, 2 * MILLI), t('inventory.form.opening'))}
            </Field>
          )}
          <Field label={t('inventory.form.minStock')} hint={t('inventory.form.minStockHint')}>
            {withUnit('minStock', minStock, setMinStock, unitLabel(displayUnit, 2 * MILLI), t('inventory.form.minStock'))}
          </Field>
          <Field label={t('inventory.form.reorder')}>{withUnit('reorderQty', reorder, setReorder, unitLabel(purchaseUnit, 2 * MILLI), t('inventory.form.reorder'))}</Field>
        </Group>

        <Group title={t('inventory.form.price')}>
          <Field label={t('inventory.form.purchasePrice')} hint={t('inventory.form.priceHint', { unit: unitLabel(purchaseUnit, MILLI) })}>
            <span className="flex">
              <span className="flex items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-600" aria-hidden>
                Rs.
              </span>
              <input value={price} onChange={(e) => (setPrice(e.target.value), setError(null))} inputMode="decimal" aria-label={t('inventory.form.purchasePrice')} placeholder="0" className={cn(field('price'), 'rounded-l-none')} />
            </span>
          </Field>
          <Field label={t('inventory.form.supplier')} hint={t('inventory.form.supplierHint')}>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} aria-label={t('inventory.form.supplier')} className={plainField}>
              <option value="">{t('inventory.form.noSupplier')}</option>
              {view.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        </Group>

        <Group title={t('inventory.form.storage')}>
          <Field label={t('inventory.form.place')}>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label={t('inventory.form.place')} className={plainField}>
              <option value="">{t('inventory.form.noPlace')}</option>
              {view.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('inventory.form.batch')}>
            <input value={batchNo} onChange={(e) => (setBatchNo(e.target.value), setError(null))} aria-label={t('inventory.form.batch')} placeholder={t('inventory.form.optional')} className={field('batch')} />
          </Field>
          <Field label={t('inventory.form.expiry')} hint={t('inventory.form.expiryHint')} wide>
            <input type="date" value={expiryDate} onChange={(e) => (setExpiryDate(e.target.value), setError(null))} aria-label={t('inventory.form.expiry')} className={field('expiry')} />
          </Field>
        </Group>

        {item && <Switch checked={inUse} onChange={setInUse} label={t('inventory.form.inUse')} hint={t('inventory.form.inUseHint')} />}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error.text}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-xs font-black uppercase tracking-wider text-brand">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({ label, hint, wide = false, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={cn('block', wide && 'sm:col-span-2')}>
      <span className="mb-1 block font-bold text-slate-900">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Calculator, Check, ChevronRight, History, Save, Scale } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  STOCK_UNITS,
  checkRecipe,
  currentVersion,
  displayFactorMilli,
  displayUnitOf,
  foodCostOf,
  formatBps,
  formatPaisa,
  linesCost,
  milliToInput,
  mulDivRound,
  parseQuantity,
  suggestIngredientCode,
  type Ingredient,
  type IngredientCategory,
  type PreparedRow,
  type PurchaseUnit,
  type Recipe,
  type RecipeTarget,
  type RecipesView,
  type StockUnit,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { ProductArt } from '../../pos/product-art';
import { fromDisplayMilli, toDisplayMilli, unitLabel, whenText } from '../inventory-format';
import { bookOf, costableLines, emptyLine, fromDrafts, stateOf, toDrafts, type LineDraft } from './recipe-draft';
import { CostingRows, LEVEL_TONE, RecipeLines } from './recipe-lines';

export type EditorSubject =
  | {
      kind: 'ITEM';
      menuItemId: string;
      name: string;
      categoryName: string;
      /** Selling unit: the recipe is for 1 piece, 1 kg … */
      unit: string;
      sizes: { variantId: string | null; name: string | null; price: number; recipe: Recipe | null }[];
      startVariantId: string | null;
    }
  | { kind: 'ADDON'; modifierId: string; name: string; groupName: string; price: number; recipe: Recipe | null }
  | { kind: 'PREPARED'; row: PreparedRow | null };

const STATE_TONE = { NONE: 'grey', DRAFT: 'amber', VERIFIED: 'green' } as const;
/** What a prepared item is counted in, and the unit its batch is read in. */
const MADE_IN: Record<StockUnit, PurchaseUnit> = { g: 'kg', ml: 'l', piece: 'piece', bottle: 'bottle', portion: 'portion' };

/**
 * Recipe Builder (owner's picture, R1): red top bar with Save Draft / Verify Recipe, the product on the left, the
 * ingredients table (Quantity + Unit, search to add) in the middle, the cost summary on the right, and the sizes below.
 * Name, sizes and prices come from the Menu and are never changed here. Auto Scale (one base recipe) is R2.
 */
export function RecipeBuilder({ subject, view, onClose }: { subject: EditorSubject; view: RecipesView; onClose: () => void }) {
  const toast = useToast();
  const byId = new Map(view.ingredients.map((i) => [i.id, i]));
  const sizes = subject.kind === 'ITEM' ? subject.sizes.map((s) => ({ key: s.variantId ?? 'base', ...s })) : [];
  const keys = subject.kind === 'ITEM' ? sizes.map((s) => s.key) : ['one'];
  const recipeOf = (key: string): Recipe | null =>
    subject.kind === 'ITEM' ? (sizes.find((s) => s.key === key)?.recipe ?? null) : subject.kind === 'ADDON' ? subject.recipe : (subject.row?.recipe ?? null);
  const targetOf = (key: string, preparedId: string): RecipeTarget =>
    subject.kind === 'ITEM'
      ? { kind: 'ITEM', menuItemId: subject.menuItemId, variantId: key === 'base' ? null : key }
      : subject.kind === 'ADDON'
        ? { kind: 'ADDON', modifierId: subject.modifierId }
        : { kind: 'PREPARED', ingredientId: preparedId };
  const savedLines = (key: string) => (recipeOf(key) ? (currentVersion(recipeOf(key)!)?.lines ?? []) : []);

  const [drafts, setDrafts] = useState<Record<string, LineDraft[]>>(() =>
    Object.fromEntries(keys.map((k) => [k, savedLines(k).length ? toDrafts(savedLines(k), byId) : [emptyLine()]])),
  );
  const [active, setActive] = useState(subject.kind === 'ITEM' ? (subject.startVariantId ?? keys[0]!) : 'one');
  const [note, setNote] = useState('');
  const [error, setError] = useState<{ key: string; line: number | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Prepared items: name, unit and what one batch makes
  const prepared = subject.kind === 'PREPARED' ? (subject.row?.ingredient ?? null) : null;
  const savedYield = subject.kind === 'PREPARED' && subject.row?.recipe ? (currentVersion(subject.row.recipe)?.yieldMilli ?? null) : null;
  const [name, setName] = useState(prepared?.name ?? '');
  const [category, setCategory] = useState<IngredientCategory>(prepared?.category ?? 'BAKERY');
  const [stockUnit, setStockUnit] = useState<StockUnit>(prepared?.stockUnit ?? 'g');
  const units = { purchaseUnit: MADE_IN[stockUnit], stockUnit };
  const [yieldText, setYieldText] = useState(savedYield ? milliToInput(toDisplayMilli(units, savedYield)) : '');
  const typedYield = parseQuantity(yieldText, { allowZero: false });
  const yieldMilli = subject.kind === 'PREPARED' ? (typedYield === null ? null : fromDisplayMilli(units, typedYield)) : null;

  const lines = drafts[active] ?? [];
  const book = bookOf(view, prepared ? { ingredientId: prepared.id, lines: costableLines(lines, byId), yieldMilli } : undefined);
  const costOf = (key: string) => {
    const usable = costableLines(drafts[key] ?? [], byId);
    return usable.length ? linesCost(book, usable).total : null;
  };
  const cost = costOf(active);
  const price = subject.kind === 'ITEM' ? (sizes.find((s) => s.key === active)?.price ?? 0) : subject.kind === 'ADDON' ? subject.price : 0;
  const costing = foodCostOf(cost, price, view.tax);
  const displayUnit = displayUnitOf(units);
  const unitCost = cost !== null && yieldMilli ? mulDivRound(cost, displayFactorMilli(units), yieldMilli) : null;

  const isDirty = (key: string) =>
    JSON.stringify(fromDrafts(drafts[key] ?? [], byId)) !== JSON.stringify(savedLines(key)) ||
    (key === 'one' && subject.kind === 'PREPARED' && (yieldMilli !== savedYield || name.trim() !== (prepared?.name ?? '')));
  const anyDirty = keys.some(isDirty);
  const recipe = recipeOf(active);
  const productName = subject.kind === 'PREPARED' ? name || t('inventory.recipes.editor.addTitle') : subject.name;
  const isNew = keys.every((k) => !recipeOf(k)) && !prepared;
  const activeSize = sizes.find((s) => s.key === active);

  const save = async (verify: boolean) => {
    const toSave = keys.filter((k) => isDirty(k) || (verify && k === active && stateOf(recipeOf(k)) !== 'VERIFIED'));
    if (toSave.length === 0) return onClose();
    // Check every size first: nothing is saved while one of them is wrong.
    for (const key of toSave) {
      const problem = checkRecipe({ target: targetOf(key, prepared?.id ?? 'new'), lines: fromDrafts(drafts[key] ?? [], byId), yieldMilli, note }, view.ingredients, book);
      if (problem) {
        setActive(key);
        return setError({ key, line: problem.line, text: t(`inventory.recipes.editor.errors.${problem.problem}`, { line: (problem.line ?? 0) + 1 }) });
      }
    }
    if (subject.kind === 'PREPARED' && !name.trim()) return setError({ key: 'one', line: null, text: t('inventory.errors.NAME_REQUIRED') });
    setBusy(true);
    setError(null);
    try {
      let preparedId = prepared?.id ?? '';
      if (subject.kind === 'PREPARED' && (!prepared || name.trim() !== prepared.name)) {
        const saved = await getApi().saveIngredient(prepared ? { ...inputOf(prepared), name } : newPrepared(name, category, stockUnit, view.ingredients));
        preparedId = saved.id;
      }
      for (const key of toSave) {
        await getApi().saveRecipe({ target: targetOf(key, preparedId), lines: fromDrafts(drafts[key] ?? [], byId), yieldMilli, note, verify });
      }
      toast.show({ tone: 'success', title: verify ? t('inventory.recipes.editor.savedVerified') : t('inventory.recipes.editor.saved') });
      onClose();
    } catch (err) {
      setError({ key: active, line: null, text: err instanceof Error ? err.message : t('states.errorBody') });
      setBusy(false);
    }
  };
  const leave = () => {
    if (anyDirty && !leaving) return setLeaving(true);
    onClose();
  };

  const field = 'min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';
  const readOnly = 'flex min-h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800';
  const copyChoices = sizes.filter((s) => s.key !== active && costableLines(drafts[s.key] ?? [], byId).length > 0);
  const panel = 'flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_-10px_rgb(15_23_42/0.18)]';

  return (
    // Laptop and desktop: one screen high like the POS (owner 2026-11-05: "one screen, no scrolling"); a long list scrolls inside its own box.
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-6.5rem)] lg:short:h-[calc(100dvh-5.5rem)]" data-recipe-builder>
      {/* Top bar: breadcrumb, Save Draft, Verify Recipe */}
      <div className="bg-brand-gradient flex shrink-0 flex-wrap items-center gap-2 rounded-2xl px-4 py-2 text-white shadow-brand">
        <nav aria-label={t('inventory.recipes.builder.back')} className="flex min-w-0 basis-full items-center gap-2 text-base sm:basis-auto sm:flex-1">
          <button type="button" onClick={leave} className="press rounded-lg px-1 font-semibold text-white/85 hover:text-white">
            {t('inventory.recipes.builder.breadcrumb')}
          </button>
          <ChevronRight className="size-4 shrink-0 text-white/70" aria-hidden />
          <h2 className="truncate font-extrabold">
            {isNew ? t('inventory.recipes.builder.addTitle') : t('inventory.recipes.builder.editTitle')}
            <span className="font-semibold text-white/85"> · {productName}</span>
          </h2>
        </nav>
        <button
          type="button"
          disabled={busy || !anyDirty}
          onClick={() => void save(false)}
          className="press flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-brand shadow-sm disabled:opacity-60 sm:flex-none"
        >
          <Save className="size-4" aria-hidden />
          {t('inventory.recipes.builder.saveDraft')}
        </button>
        <button
          type="button"
          disabled={busy || (!anyDirty && stateOf(recipe) === 'VERIFIED')}
          onClick={() => void save(true)}
          className="press flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white px-4 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60 sm:flex-none"
        >
          <Check className="size-4" aria-hidden />
          {t('inventory.recipes.builder.verify')}
        </button>
      </div>
      {(leaving || error) && (
        <p role="alert" className={cn('shrink-0 rounded-xl px-3 py-1.5 text-sm font-semibold', error ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-900')}>
          {error ? `${sizes.length > 1 ? `${sizes.find((s) => s.key === error.key)?.name}: ` : ''}${error.text}` : t('inventory.recipes.builder.leaveAgain')}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[12rem_minmax(0,1fr)_14rem] lg:grid-rows-[minmax(0,1fr)] xl:grid-cols-[13.5rem_minmax(0,1fr)_16rem]">
        {/* Left: the product */}
        <section className={cn(panel, 'order-1 gap-2.5 p-3 lg:overflow-y-auto')} aria-label={t('inventory.recipes.builder.productDetails')}>
          <div className="flex items-center gap-2.5">
            {subject.kind === 'PREPARED' ? (
              <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-soft via-rose-50 to-white text-3xl" aria-hidden>
                🥣
              </span>
            ) : (
              <ProductArt name={subject.name} categoryName={subject.kind === 'ITEM' ? subject.categoryName : 'cheese'} className="size-14 shrink-0 rounded-xl" emojiClassName="text-3xl" soft />
            )}
            <h3 className="text-base font-extrabold leading-tight text-slate-900" title={t('inventory.recipes.builder.photoNote')}>
              {t('inventory.recipes.builder.productDetails')}
            </h3>
          </div>
          {subject.kind === 'PREPARED' ? (
            <>
              <Field label={t('inventory.recipes.editor.name')}>
                <input value={name} onChange={(e) => (setName(e.target.value), setError(null))} placeholder={t('inventory.recipes.editor.namePlaceholder')} aria-label={t('inventory.recipes.editor.name')} className={field} />
              </Field>
              <Field label={t('inventory.form.category')}>
                <select value={category} disabled={Boolean(prepared)} onChange={(e) => setCategory(e.target.value as IngredientCategory)} aria-label={t('inventory.form.category')} className={cn(field, 'disabled:bg-slate-50')}>
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`inventory.categories.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('inventory.recipes.editor.yield')}>
                  <input value={yieldText} onChange={(e) => (setYieldText(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('inventory.recipes.editor.yield')} title={t('inventory.recipes.editor.yieldHint')} className={field} />
                </Field>
                <Field label={t('inventory.recipes.editor.countedIn')}>
                  <select value={stockUnit} disabled={Boolean(prepared)} onChange={(e) => setStockUnit(e.target.value as StockUnit)} aria-label={t('inventory.recipes.editor.countedIn')} className={cn(field, 'px-2 disabled:bg-slate-50')}>
                    {STOCK_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {unitLabel(u === 'g' ? 'kg' : u === 'ml' ? 'l' : u, 2 * MILLI)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          ) : (
            <>
              <Field label={t('inventory.recipes.builder.productName')}>
                <span className={readOnly} data-product-name>
                  {subject.name}
                </span>
              </Field>
              <Field label={t('inventory.recipes.builder.category')}>
                <span className={readOnly}>{subject.kind === 'ITEM' ? subject.categoryName : subject.groupName}</span>
              </Field>
              {sizes.length > 1 ? (
                <Field label={t('inventory.recipes.editor.sizes')}>
                  <span className={cn(readOnly, 'truncate')}>{sizes.map((s) => s.name).join(', ')}</span>
                </Field>
              ) : (
                <Field label={t('inventory.recipes.builder.baseQuantity')}>
                  <span className={readOnly}>{t('inventory.recipes.builder.perSale', { unit: subject.kind === 'ITEM' ? subject.unit : 'piece' })}</span>
                </Field>
              )}
              <p className="text-[11px] leading-snug text-slate-500">
                {t('inventory.recipes.builder.editInMenu')}{' '}
                <Link href="/menu" className="font-bold text-brand hover:underline">
                  {t('inventory.recipes.builder.openMenu')}
                </Link>
              </p>
            </>
          )}
          <div className="rounded-xl bg-brand-soft/60 p-2.5" title={t('inventory.recipes.builder.autoScaleHint')}>
            <div className="flex items-center gap-2">
              <Scale className="size-4 shrink-0 text-brand" aria-hidden />
              <p className="min-w-0 flex-1 text-sm font-extrabold leading-tight text-brand">{t('inventory.recipes.builder.autoScale')}</p>
              <Switch checked={false} onChange={() => undefined} disabled compact label={t('inventory.recipes.builder.autoScale')} />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">
              <Badge tone="dark" className="mr-1 px-1.5 py-0 text-[10px]">
                {t('inventory.recipes.builder.r2')}
              </Badge>
              {t('inventory.recipes.builder.autoScaleHint')}
            </p>
          </div>
        </section>

        {/* Right: the cost summary (second on tablets) */}
        <div className="order-3 flex min-h-0 flex-col gap-3 md:order-2 lg:order-3">
          <section className={cn(panel, 'shrink-0 overflow-hidden')} aria-label={t('inventory.recipes.builder.summaryTitle')}>
            <div className="flex items-center gap-2 bg-brand-soft/70 px-3 py-2">
              <Calculator className="size-4 text-brand" aria-hidden />
              <h3 className="truncate text-sm font-extrabold text-brand">
                {sizes.length > 1 && activeSize?.name
                  ? t('inventory.recipes.builder.summaryFor', { size: activeSize.name })
                  : subject.kind === 'ITEM'
                    ? t('inventory.recipes.builder.summaryFor', { size: `1 ${subject.unit}` })
                    : t('inventory.recipes.builder.summaryTitle')}
              </h3>
            </div>
            <div className="px-3 py-1">
              {subject.kind === 'PREPARED' ? (
                <dl className="divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-2 py-1.5">
                    <dt className="text-slate-600">{t('inventory.recipes.editor.batch')}</dt>
                    <dd className="font-extrabold tabular-nums" data-recipe-cost>
                      {cost === null ? '—' : formatPaisa(cost)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5">
                    <dt className="text-slate-600">{t('inventory.recipes.editor.perUnitCost', { unit: unitLabel(displayUnit, MILLI) })}</dt>
                    <dd className="font-black tabular-nums text-slate-900" data-unit-cost>
                      {unitCost === null ? '—' : formatPaisa(unitCost)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <CostingRows costing={costing} showNetPrice={view.tax.pricesIncludeTax && view.tax.rateBps > 0} priceNote={t('inventory.recipes.builder.priceFromMenu')} />
              )}
              <p className="pb-1.5 text-[11px] leading-snug text-slate-500">{t('inventory.recipes.editor.estimateNote')}</p>
            </div>
          </section>
          <section className={cn(panel, 'p-3 lg:flex-1 lg:overflow-y-auto')} aria-label={t('inventory.recipes.editor.history')}>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <History className="size-4 text-brand" aria-hidden />
              {t('inventory.recipes.editor.history')}
            </h4>
            {recipe && recipe.versions.length ? (
              <ol className="space-y-1 text-[11px] text-slate-600" data-versions>
                {[...recipe.versions].reverse().map((v) => (
                  <li key={v.version} className="flex flex-wrap items-center gap-1">
                    <strong className="text-slate-900">{t('inventory.recipes.editor.version', { n: v.version })}</strong>
                    <Badge tone={STATE_TONE[v.status]} className="px-1.5 py-0 text-[10px]">
                      {t(`inventory.recipes.status.${v.status}`)}
                    </Badge>
                    <span>
                      {view.staffNames[v.savedBy] ?? '—'} · {whenText(v.savedAt)}
                      {v.costAtSave !== null && ` · ${formatPaisa(v.costAtSave)}`}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-500">{t('inventory.recipes.editor.noHistory')}</p>
            )}
            <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{t('inventory.recipes.editor.verifyHint')}</p>
          </section>
        </div>

        {/* Middle: ingredients and sizes */}
        <div className="order-2 flex min-h-0 flex-col gap-3 md:order-3 md:col-span-2 lg:order-2 lg:col-span-1">
          <section className={cn(panel, 'p-3 lg:flex-1')} aria-label={t('inventory.recipes.builder.ingredients')}>
            {sizes.length > 1 && (
              <div role="tablist" aria-label={t('inventory.recipes.editor.sizes')} className="mb-2 flex shrink-0 gap-1.5 overflow-x-auto pb-0.5" data-recipe-sizes title={t('inventory.recipes.builder.sizesHint')}>
                {sizes.map((s) => {
                  const sizeCosting = foodCostOf(costOf(s.key), s.price, view.tax);
                  const state = stateOf(s.recipe);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      role="tab"
                      aria-selected={active === s.key}
                      onClick={() => (setActive(s.key), setError(null))}
                      data-size-row={s.name}
                      className={cn(
                        'press flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-bold',
                        active === s.key ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      {s.name}
                      <span className="text-xs font-semibold text-slate-500">{formatPaisa(s.price)}</span>
                      {sizeCosting.level && sizeCosting.foodCostBps !== null && <Badge tone={LEVEL_TONE[sizeCosting.level]}>{formatBps(sizeCosting.foodCostBps)}</Badge>}
                      {isDirty(s.key) ? <Badge tone="blue">{t('inventory.recipes.editor.changed')}</Badge> : state !== 'VERIFIED' && <Badge tone={STATE_TONE[state]}>{t(`inventory.recipes.status.${state}`)}</Badge>}
                    </button>
                  );
                })}
              </div>
            )}
            <RecipeLines
              title={t('inventory.recipes.builder.ingredients')}
              lines={lines}
              onChange={(next) => (setDrafts((d) => ({ ...d, [active]: next })), setError(null), setLeaving(false))}
              ingredients={view.ingredients}
              book={book}
              excludeId={prepared?.id}
              errorLine={error?.key === active ? error.line : null}
            />
            <div className="mt-2 flex shrink-0 flex-wrap gap-2">
              {copyChoices.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const from = drafts[e.target.value];
                    if (from) setDrafts((d) => ({ ...d, [active]: from.map((l) => ({ ...l, key: crypto.randomUUID() })) }));
                  }}
                  aria-label={t('inventory.recipes.editor.copyFrom')}
                  className="min-h-10 rounded-xl border border-slate-300 bg-white px-2 text-sm"
                >
                  <option value="">{t('inventory.recipes.editor.copyFrom')}…</option>
                  {copyChoices.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={220} placeholder={`${t('inventory.recipes.editor.note')}: ${t('inventory.recipes.editor.notePlaceholder')}`} aria-label={t('inventory.recipes.editor.note')} className={cn(field, 'min-w-40 flex-1')} />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs font-bold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

/** A prepared item's own fields, unchanged, for saving a new name. */
function inputOf(i: Ingredient) {
  return {
    id: i.id,
    name: i.name,
    code: i.code,
    category: i.category,
    purchaseUnit: i.purchaseUnit,
    stockUnit: i.stockUnit,
    packSizeMilli: i.packSizeMilli,
    minStockMilli: i.minStockMilli,
    reorderQtyMilli: i.reorderQtyMilli,
    purchasePrice: i.purchasePrice,
    preferredSupplierId: i.preferredSupplierId,
    locationId: i.locationId,
    batchNo: i.batchNo,
    expiryDate: i.expiryDate,
    openingMilli: 0,
  };
}

function newPrepared(name: string, category: IngredientCategory, stockUnit: StockUnit, all: readonly Ingredient[]) {
  return {
    id: null,
    kind: 'PREPARED' as const,
    name,
    code: suggestIngredientCode(name, all.map((i) => i.code)),
    category,
    purchaseUnit: MADE_IN[stockUnit],
    stockUnit,
    packSizeMilli: null,
    minStockMilli: 0,
    reorderQtyMilli: 0,
    purchasePrice: 0,
    preferredSupplierId: null,
    locationId: null,
    batchNo: '',
    expiryDate: null,
    openingMilli: 0,
  };
}

'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  STOCK_UNITS,
  checkRecipe,
  currentVersion,
  displayFactorMilli,
  displayUnitOf,
  foodCostOf,
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
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { fromDisplayMilli, toDisplayMilli, unitLabel, whenText } from '../inventory-format';
import { bookOf, costableLines, emptyLine, fromDrafts, stateOf, toDrafts, type LineDraft } from './recipe-draft';
import { CostingRows, RecipeLines } from './recipe-lines';

export type EditorSubject =
  | {
      kind: 'ITEM';
      menuItemId: string;
      name: string;
      /** Selling unit: the recipe is for 1 piece, 1 kg … */
      unit: string;
      sizes: { variantId: string | null; name: string | null; price: number; recipe: Recipe | null }[];
      startVariantId: string | null;
    }
  | { kind: 'ADDON'; modifierId: string; name: string; price: number; recipe: Recipe | null }
  | { kind: 'PREPARED'; row: PreparedRow | null };

const STATE_TONE = { NONE: 'grey', DRAFT: 'amber', VERIFIED: 'green' } as const;
/** What a prepared item is counted in, and the unit its batch is read in. */
const MADE_IN: Record<StockUnit, PurchaseUnit> = { g: 'kg', ml: 'l', piece: 'piece', bottle: 'bottle', portion: 'portion' };

/**
 * Edit the recipe of a menu item (one tab per size), an add-on, or a prepared item (its batch). Shows the food cost
 * live; "Save draft" adds a version, "Save & verify" adds it as verified (or only verifies the current one).
 */
export function RecipeEditor({ subject, view, onClose }: { subject: EditorSubject; view: RecipesView; onClose: () => void }) {
  const toast = useToast();
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
    Object.fromEntries(keys.map((k) => [k, savedLines(k).length ? toDrafts(savedLines(k)) : [emptyLine()]])),
  );
  const [active, setActive] = useState(subject.kind === 'ITEM' ? (subject.startVariantId ?? keys[0]!) : 'one');
  const [note, setNote] = useState('');
  const [error, setError] = useState<{ key: string; line: number | null; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

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
  const book = bookOf(view, prepared ? { ingredientId: prepared.id, lines: costableLines(lines), yieldMilli } : undefined);
  const cost = costableLines(lines).length ? linesCost(book, costableLines(lines)).total : null;
  const price = subject.kind === 'ITEM' ? (sizes.find((s) => s.key === active)?.price ?? 0) : subject.kind === 'ADDON' ? subject.price : 0;
  const costing = foodCostOf(cost, price, view.tax);
  const displayUnit = displayUnitOf(units);
  const unitCost = cost !== null && yieldMilli ? mulDivRound(cost, displayFactorMilli(units), yieldMilli) : null;

  const isDirty = (key: string) => JSON.stringify(fromDrafts(drafts[key] ?? [])) !== JSON.stringify(savedLines(key)) || (key === 'one' && subject.kind === 'PREPARED' && (yieldMilli !== savedYield || name.trim() !== (prepared?.name ?? '')));
  const anyDirty = keys.some(isDirty);
  const recipe = recipeOf(active);
  const title =
    subject.kind === 'ITEM'
      ? t('inventory.recipes.editFor', { name: subject.name })
      : subject.kind === 'ADDON'
        ? t('inventory.recipes.editFor', { name: subject.name })
        : prepared
          ? t('inventory.recipes.editFor', { name: prepared.name })
          : t('inventory.recipes.editor.addTitle');

  const save = async (verify: boolean) => {
    const toSave = keys.filter((k) => isDirty(k) || (verify && k === active && stateOf(recipeOf(k)) !== 'VERIFIED'));
    if (toSave.length === 0) return onClose();
    // Check every size first: nothing is saved while one of them is wrong.
    for (const key of toSave) {
      const problem = checkRecipe({ target: targetOf(key, prepared?.id ?? 'new'), lines: fromDrafts(drafts[key] ?? []), yieldMilli, note }, view.ingredients, book);
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
        await getApi().saveRecipe({ target: targetOf(key, preparedId), lines: fromDrafts(drafts[key] ?? []), yieldMilli, note, verify });
      }
      toast.show({ tone: 'success', title: verify ? t('inventory.recipes.editor.savedVerified') : t('inventory.recipes.editor.saved') });
      onClose();
    } catch (err) {
      setError({ key: active, line: null, text: err instanceof Error ? err.message : t('states.errorBody') });
      setBusy(false);
    }
  };

  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base';
  const copyChoices = sizes.filter((s) => s.key !== active && costableLines(drafts[s.key] ?? []).length > 0);

  return (
    <Dialog
      open
      size="xl"
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('inventory.form.cancel')}
          </Button>
          <Button variant="outline" disabled={busy || !anyDirty} onClick={() => void save(false)}>
            {t('inventory.recipes.editor.saveDraft')}
          </Button>
          <Button disabled={busy || (!anyDirty && stateOf(recipe) === 'VERIFIED')} onClick={() => void save(true)}>
            {t('inventory.recipes.editor.saveVerify')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {subject.kind === 'PREPARED' && (
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="mb-1 block font-bold text-slate-900">{t('inventory.recipes.editor.name')}</span>
              <input value={name} onChange={(e) => (setName(e.target.value), setError(null))} placeholder={t('inventory.recipes.editor.namePlaceholder')} aria-label={t('inventory.recipes.editor.name')} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('inventory.form.category')}</span>
              <select value={category} disabled={Boolean(prepared)} onChange={(e) => setCategory(e.target.value as IngredientCategory)} aria-label={t('inventory.form.category')} className={cn(field, 'disabled:bg-slate-50')}>
                {INGREDIENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`inventory.categories.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-slate-900">{t('inventory.recipes.editor.countedIn')}</span>
              <select value={stockUnit} disabled={Boolean(prepared)} onChange={(e) => setStockUnit(e.target.value as StockUnit)} aria-label={t('inventory.recipes.editor.countedIn')} className={cn(field, 'disabled:bg-slate-50')}>
                {STOCK_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {unitLabel(u, 2 * MILLI)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {sizes.length > 1 && (
          <div role="tablist" aria-label={t('inventory.recipes.editor.sizes')} className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const state = stateOf(s.recipe);
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={active === s.key}
                  onClick={() => (setActive(s.key), setError(null))}
                  className={cn(
                    'press flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold',
                    active === s.key ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  {s.name}
                  <span className="text-xs font-semibold text-slate-500">{formatPaisa(s.price)}</span>
                  {isDirty(s.key) ? <Badge tone="blue">{t('inventory.recipes.editor.changed')}</Badge> : <Badge tone={STATE_TONE[state]}>{t(`inventory.recipes.status.${state}`)}</Badge>}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <RecipeLines
              lines={lines}
              onChange={(next) => (setDrafts((d) => ({ ...d, [active]: next })), setError(null))}
              ingredients={view.ingredients}
              book={book}
              excludeId={prepared?.id}
              errorLine={error?.key === active ? error.line : null}
            />
            {copyChoices.length > 0 && (
              <label className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-slate-700">{t('inventory.recipes.editor.copyFrom')}</span>
                <select
                  value=""
                  onChange={(e) => {
                    const from = drafts[e.target.value];
                    if (from) setDrafts((d) => ({ ...d, [active]: from.map((l) => ({ ...l, key: crypto.randomUUID() })) }));
                  }}
                  aria-label={t('inventory.recipes.editor.copyFrom')}
                  className="min-h-10 rounded-xl border border-slate-300 bg-white px-2 text-sm"
                >
                  <option value="">—</option>
                  {copyChoices.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">{t('inventory.recipes.editor.copyHint')}</span>
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-900">{t('inventory.recipes.editor.note')}</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={220} placeholder={t('inventory.recipes.editor.notePlaceholder')} aria-label={t('inventory.recipes.editor.note')} className={field} />
            </label>
          </div>

          <aside className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand">{t('inventory.recipes.editor.costing')}</h3>
            {subject.kind === 'PREPARED' ? (
              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1 block font-bold text-slate-900">{t('inventory.recipes.editor.yield')}</span>
                  <span className="flex">
                    <input value={yieldText} onChange={(e) => (setYieldText(e.target.value), setError(null))} inputMode="decimal" placeholder="0" aria-label={t('inventory.recipes.editor.yield')} className={cn(field, 'rounded-r-none')} />
                    <span className="flex shrink-0 items-center rounded-r-xl border border-l-0 border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600" aria-hidden>
                      {unitLabel(displayUnit, 2 * MILLI)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{t('inventory.recipes.editor.yieldHint')}</span>
                </label>
                <p className="flex justify-between gap-2">
                  <span className="text-slate-600">{t('inventory.recipes.editor.batch')}</span>
                  <strong className="tabular-nums" data-recipe-cost>
                    {cost === null ? '—' : formatPaisa(cost)}
                  </strong>
                </p>
                <p className="flex justify-between gap-2">
                  <span className="text-slate-600">{t('inventory.recipes.editor.perUnitCost', { unit: unitLabel(displayUnit, MILLI) })}</span>
                  <strong className="text-lg tabular-nums text-slate-900" data-unit-cost>
                    {unitCost === null ? '—' : formatPaisa(unitCost)}
                  </strong>
                </p>
              </div>
            ) : (
              <>
                {subject.kind === 'ITEM' && subject.unit !== 'piece' && <p className="text-xs font-semibold text-slate-500">{t('inventory.recipes.perUnit', { unit: subject.unit })}</p>}
                <CostingRows costing={costing} showNetPrice={view.tax.pricesIncludeTax && view.tax.rateBps > 0} />
                <p className="text-xs text-slate-500">{t('inventory.recipes.editor.estimateNote')}</p>
                <p className="text-xs text-slate-500">{t('inventory.recipes.guide')}</p>
              </>
            )}

            <div className="border-t border-slate-200 pt-3">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <History className="size-4 text-brand" aria-hidden />
                {t('inventory.recipes.editor.history')}
              </h4>
              {recipe && recipe.versions.length ? (
                <ol className="space-y-1.5 text-xs text-slate-600" data-versions>
                  {[...recipe.versions].reverse().map((v) => (
                    <li key={v.version} className="flex flex-wrap items-center gap-1.5">
                      <strong className="text-slate-900">{t('inventory.recipes.editor.version', { n: v.version })}</strong>
                      <Badge tone={STATE_TONE[v.status]}>{t(`inventory.recipes.status.${v.status}`)}</Badge>
                      <span>
                        {t('inventory.recipes.editor.by', { name: view.staffNames[v.savedBy] ?? '—' })} · {whenText(v.savedAt)}
                        {v.costAtSave !== null && ` · ${t('inventory.recipes.editor.costThen', { price: formatPaisa(v.costAtSave) })}`}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-slate-500">{t('inventory.recipes.editor.noHistory')}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">{t('inventory.recipes.editor.verifyHint')}</p>
            </div>
          </aside>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {sizes.length > 1 ? `${sizes.find((s) => s.key === error.key)?.name}: ` : ''}
            {error.text}
          </p>
        )}
      </div>
    </Dialog>
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


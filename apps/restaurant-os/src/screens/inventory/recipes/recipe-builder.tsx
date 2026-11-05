'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Calculator, Check, ChevronRight, History, Layers, Pencil, Plus, RotateCcw, Save, Scale, Settings2 } from 'lucide-react';
import {
  INGREDIENT_CATEGORIES,
  MILLI,
  SCALE_UNITS,
  STOCK_UNITS,
  checkRecipe,
  convertScaleQuantity,
  currentVersion,
  displayFactorMilli,
  displayUnitOf,
  foodCostOf,
  formatBps,
  formatPaisa,
  guessSizeQuantity,
  linesCost,
  milliToInput,
  mulDivRound,
  paisaToInput,
  parseQuantity,
  parseRupees,
  sameRecipe,
  scaleCost,
  scaleLines,
  scaleShareBps,
  suggestIngredientCode,
  type FoodCost,
  type Ingredient,
  type IngredientCategory,
  type PreparedRow,
  type PurchaseUnit,
  type Recipe,
  type RecipeLine,
  type RecipeProblem,
  type RecipeTarget,
  type RecipesView,
  type ScaleUnit,
  type StockUnit,
} from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useSession } from '@/lib/session';
import { ProductArt } from '../../pos/product-art';
import { fromDisplayMilli, quantityText, toDisplayMilli, unitLabel, whenText } from '../inventory-format';
import { bookOf, costableLines, emptyLine, fromDrafts, stateOf, toDrafts, type LineDraft } from './recipe-draft';
import { CostingRows, LEVEL_TONE, RecipeLines, ingredientArt } from './recipe-lines';
import { SizesDialog, type SizeRow } from './sizes-dialog';

export type EditorSubject =
  | {
      kind: 'ITEM';
      menuItemId: string;
      name: string;
      categoryName: string;
      /** Selling unit: the recipe is for 1 piece, 1 kg … */
      unit: string;
      sizes: {
        variantId: string | null;
        name: string | null;
        price: number;
        recipe: Recipe | null;
      }[];
      startVariantId: string | null;
    }
  | {
      kind: 'ADDON';
      modifierId: string;
      name: string;
      groupName: string;
      price: number;
      recipe: Recipe | null;
    }
  | { kind: 'PREPARED'; row: PreparedRow | null };

const STATE_TONE = { NONE: 'grey', DRAFT: 'amber', VERIFIED: 'green' } as const;
/** What a prepared item is counted in, and the unit its batch is read in. */
const MADE_IN: Record<StockUnit, PurchaseUnit> = {
  g: 'kg',
  ml: 'l',
  piece: 'piece',
  bottle: 'bottle',
  portion: 'portion',
};
/** The base recipe line set; a size is edited under its own key. */
const BASE = 'base';

/** The base unit an item starts with: its selling unit, or kg when its sizes are weights (1 kg, ½ kg, Pao). */
function startUnit(unit: string, sizeNames: readonly string[]): ScaleUnit {
  if (unit === 'kg') return 'kg';
  if (unit === 'litre') return 'l';
  if (sizeNames.some((n) => guessSizeQuantity(n, 'kg') !== null)) return 'kg';
  if (sizeNames.some((n) => guessSizeQuantity(n, 'l') !== null)) return 'l';
  return unit === 'plate' ? 'plate' : 'piece';
}

/** Sizes offered for a new Auto Scale setup, by base unit family. */
function presetSizes(unit: ScaleUnit): string[] {
  if (unit === 'kg' || unit === 'g') return ['1 kg', '½ kg', 'Pao', 'Half Pao'];
  if (unit === 'l' || unit === 'ml') return ['1.5 litre', '1 litre', '½ litre'];
  return ['Full', 'Half'];
}

/** A size's quantity from its name, else the share a word says (Half = 50 %), else the base itself. */
function sizeQuantity(name: string, unit: ScaleUnit, baseMilli: number): number {
  const guessed = guessSizeQuantity(name, unit);
  if (guessed !== null) return guessed;
  return /\b(half|adha|aadha)\b/i.test(name) ? Math.round(baseMilli / 2) : baseMilli;
}

/**
 * Recipe Builder (owner's pictures, R1 + R2): red top bar with Save Draft / Verify Recipe; the product with Base Recipe
 * Quantity and the Auto Scale switch on the left; the ingredients table (Quantity + Unit, search to add) in the middle;
 * the cost summary on the right; and below, the Recipe Sizes table. With Auto Scale one base recipe makes every ticked
 * size (½ kg = half of every line); a size can get its own quantities ("Custom") and go back to Auto. Prices typed here
 * reach the Menu only after the owner confirms (new bills only).
 */
export function RecipeBuilder({ subject, view, onClose }: { subject: EditorSubject; view: RecipesView; onClose: () => void }) {
  const toast = useToast();
  const { allowed } = useSession();
  const canEditMenu = allowed('menu.manage');
  const byId = new Map(view.ingredients.map((i) => [i.id, i]));
  const [book] = useState(() => bookOf(view));
  const isItem = subject.kind === 'ITEM';
  const menuSizes = isItem ? subject.sizes.filter((s) => s.variantId !== null) : [];
  const hasMenuSizes = menuSizes.length > 0;
  const scale = isItem ? (view.scales.find((s) => s.menuItemId === subject.menuItemId) ?? null) : null;
  /** The item's own recipe: the base under Auto Scale, the only recipe of an item without sizes */
  const baseRecipe = isItem
    ? hasMenuSizes
      ? (view.baseRecipes.find((r) => r.target.kind === 'ITEM' && r.target.menuItemId === subject.menuItemId) ?? null)
      : (subject.sizes[0]?.recipe ?? null)
    : subject.kind === 'ADDON'
      ? subject.recipe
      : (subject.row?.recipe ?? null);
  const savedLines = (recipe: Recipe | null) => (recipe ? (currentVersion(recipe)?.lines ?? []) : []);
  const draftsOf = (recipe: Recipe | null) => (savedLines(recipe).length ? toDrafts(savedLines(recipe), byId) : [emptyLine()]);

  // ── State ──────────────────────────────────────────────────────────────────────────────────
  const initialUnit =
    scale?.baseUnit ??
    startUnit(
      isItem ? subject.unit : 'piece',
      menuSizes.map((s) => s.name ?? ''),
    );
  const initialBase = scale?.baseQuantityMilli ?? MILLI;
  const [scaleOn, setScaleOn] = useState(Boolean(scale?.enabled && hasMenuSizes));
  const [baseQty, setBaseQty] = useState(milliToInput(initialBase));
  const [baseUnit, setBaseUnit] = useState<ScaleUnit>(initialUnit);
  const [rows, setRows] = useState<SizeRow[]>(() =>
    menuSizes.map((s) => {
      const saved = scale?.sizes.find((z) => z.variantId === s.variantId);
      return {
        key: s.variantId!,
        variantId: s.variantId,
        name: s.name ?? '',
        quantity: milliToInput(saved?.quantityMilli ?? sizeQuantity(s.name ?? '', initialUnit, initialBase)),
        active: saved?.active ?? true,
        custom: saved?.custom ?? false,
        price: paisaToInput(s.price),
        menuPrice: s.price,
        recipe: s.recipe,
      };
    }),
  );
  const [drafts, setDrafts] = useState<Record<string, LineDraft[]>>(() => ({
    [BASE]: draftsOf(baseRecipe),
    ...Object.fromEntries(menuSizes.map((s) => [s.variantId!, draftsOf(s.recipe)])),
  }));
  const [active, setActive] = useState<string>(() => (isItem && hasMenuSizes && !scale?.enabled ? (subject.startVariantId ?? menuSizes[0]!.variantId!) : BASE));
  const [note, setNote] = useState('');
  const [error, setError] = useState<{
    key: string;
    line: number | null;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  const [confirmMenu, setConfirmMenu] = useState<{ verify: boolean } | null>(null);

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

  // ── Numbers ────────────────────────────────────────────────────────────────────────────────
  const costBook = prepared
    ? bookOf(view, {
        ingredientId: prepared.id,
        lines: costableLines(drafts[BASE] ?? [], byId),
        yieldMilli,
      })
    : book;
  const ownCost = (key: string) => {
    const usable = costableLines(drafts[key] ?? [], byId);
    return usable.length ? linesCost(costBook, usable).total : null;
  };
  const baseMilli = parseQuantity(baseQty, { allowZero: false });
  const baseCost = ownCost(BASE);
  const rowMilli = (row: SizeRow) => parseQuantity(row.quantity, { allowZero: false });
  const rowPrice = (row: SizeRow) => parseRupees(row.price) ?? (scaleOn && canEditMenu ? 0 : (row.menuPrice ?? 0));
  /** A size's cost: automatic = base × share; custom or without Auto Scale = its own lines. */
  const rowCost = (row: SizeRow) => {
    if (!scaleOn || row.custom) return ownCost(row.key);
    const q = rowMilli(row);
    return q === null || baseMilli === null ? null : scaleCost(baseCost, q, baseMilli);
  };
  const rowCosting = (row: SizeRow): FoodCost => foodCostOf(rowCost(row), rowPrice(row), view.tax);
  const isBaseSize = (row: SizeRow) => scaleOn && baseMilli !== null && rowMilli(row) === baseMilli;
  const activeRow = rows.find((r) => r.key === active) ?? null;
  /** The size that equals the base gives the base recipe its selling price (the picture's "1 kg (Base)"). */
  const baseRow = rows.find(isBaseSize) ?? null;
  const summaryRow = active === BASE ? (scaleOn ? baseRow : null) : activeRow;
  const summaryCosting: FoodCost =
    summaryRow !== null ? rowCosting(summaryRow) : foodCostOf(baseCost, subject.kind === 'ADDON' ? subject.price : isItem && !hasMenuSizes ? (subject.sizes[0]?.price ?? 0) : 0, view.tax);
  const displayUnit = displayUnitOf(units);
  const unitCost = baseCost !== null && yieldMilli ? mulDivRound(baseCost, displayFactorMilli(units), yieldMilli) : null;

  // ── Changes ────────────────────────────────────────────────────────────────────────────────
  const linesOf = (key: string) => fromDrafts(drafts[key] ?? [], byId);
  const snapshot = () =>
    JSON.stringify({
      scaleOn,
      baseQty,
      baseUnit,
      rows: rows.map((r) => [r.key, r.name, r.quantity, r.active, r.custom, r.price]),
      lines: Object.fromEntries(Object.keys(drafts).map((k) => [k, linesOf(k)])),
      name,
      yieldText,
    });
  const [initial] = useState(snapshot);
  const anyDirty = snapshot() !== initial;
  const sizeDirty = (row: SizeRow) => JSON.stringify(linesOf(row.key)) !== JSON.stringify(savedLines(row.recipe));
  const verified = scaleOn
    ? stateOf(baseRecipe) === 'VERIFIED' && rows.filter((r) => r.active && r.variantId).every((r) => stateOf(r.recipe) === 'VERIFIED')
    : stateOf(active === BASE ? baseRecipe : (activeRow?.recipe ?? null)) === 'VERIFIED';
  const change = () => (setError(null), setLeaving(false));

  // ── Auto Scale on / off ────────────────────────────────────────────────────────────────────
  const turnOn = () => {
    change();
    const unit = baseUnit;
    const base = baseMilli ?? MILLI;
    let next = rows;
    if (rows.length === 0) {
      // No sizes yet: offer the usual ones; they reach the Menu only after the owner confirms when saving.
      const price = isItem ? (subject.sizes[0]?.price ?? 0) : 0;
      next = presetSizes(unit).map((label) => {
        const q = sizeQuantity(label, unit, base);
        return {
          key: crypto.randomUUID(),
          variantId: null,
          name: label,
          quantity: milliToInput(q),
          active: true,
          custom: false,
          price: paisaToInput(Math.round(mulDivRound(price, q, base) / 1000) * 1000),
          menuPrice: null,
          recipe: null,
        };
      });
      setSizesOpen(true);
    }
    // The base: the item's own recipe, else the lines of the size that equals the base, else the biggest size grown to the base.
    if (!savedLines(baseRecipe).length && rows.length > 0) {
      const withLines = rows.filter((r) => costableLines(drafts[r.key] ?? [], byId).length > 0 && rowMilli(r) !== null);
      const from = withLines.find((r) => rowMilli(r) === base) ?? [...withLines].sort((a, b) => rowMilli(b)! - rowMilli(a)!)[0];
      if (from)
        setDrafts((d) => ({
          ...d,
          [BASE]: toDrafts(scaleLines(fromDrafts(d[from.key] ?? [], byId), base, rowMilli(from)!), byId),
        }));
    }
    // A size whose own saved recipe is not the base × its share stays Custom: nothing he made changes without him.
    const baseLines = savedLines(baseRecipe).length ? savedLines(baseRecipe) : null;
    next = next.map((r) => {
      const own = savedLines(r.recipe);
      const q = rowMilli(r);
      const follows = baseLines && q !== null && sameRecipe({ lines: own, yieldMilli: null }, { lines: scaleLines(baseLines, q, base), yieldMilli: null });
      return { ...r, custom: own.length > 0 && !follows };
    });
    setRows(next);
    setScaleOn(true);
    setActive(BASE);
  };
  const turnOff = () => {
    change();
    setScaleOn(false);
    setRows((all) => all.filter((r) => r.variantId !== null).map((r) => ({ ...r, price: paisaToInput(r.menuPrice ?? 0) })));
    setActive(hasMenuSizes ? menuSizes[0]!.variantId! : BASE);
  };
  const changeBaseUnit = (unit: ScaleUnit) => {
    change();
    const convert = (text: string) => {
      const q = parseQuantity(text, { allowZero: false });
      const converted = q === null ? null : convertScaleQuantity(q, baseUnit, unit);
      return converted === null ? text : milliToInput(converted);
    };
    setBaseQty(convert(baseQty));
    setRows((all) => all.map((r) => ({ ...r, quantity: convert(r.quantity) })));
    setBaseUnit(unit);
  };
  const customize = (row: SizeRow) => {
    change();
    const q = rowMilli(row);
    if (q !== null && baseMilli !== null)
      setDrafts((d) => ({
        ...d,
        [row.key]: toDrafts(scaleLines(fromDrafts(d[BASE] ?? [], byId), q, baseMilli), byId),
      }));
    setRows((all) => all.map((r) => (r.key === row.key ? { ...r, custom: true } : r)));
    setActive(row.key);
  };
  const backToAuto = (row: SizeRow) => {
    change();
    setRows((all) => all.map((r) => (r.key === row.key ? { ...r, custom: false } : r)));
  };
  const setRow = (key: string, patch: Partial<SizeRow>) => (change(), setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r))));

  // ── Save ───────────────────────────────────────────────────────────────────────────────────
  const fail = (key: string, problem: { line: number | null; problem: RecipeProblem }) => {
    setActive(key);
    setError({
      key,
      line: problem.line,
      text: t(`inventory.recipes.editor.errors.${problem.problem}`, {
        line: (problem.line ?? 0) + 1,
      }),
    });
  };
  const targetOf = (variantId: string | null, preparedId: string): RecipeTarget =>
    subject.kind === 'ITEM'
      ? { kind: 'ITEM', menuItemId: subject.menuItemId, variantId }
      : subject.kind === 'ADDON'
        ? { kind: 'ADDON', modifierId: subject.modifierId }
        : { kind: 'PREPARED', ingredientId: preparedId };

  const menuChanges = rows.filter((r) => r.variantId === null || (parseRupees(r.price) ?? r.menuPrice) !== r.menuPrice);

  const saveScaled = async (verify: boolean, updateMenu: boolean) => {
    if (subject.kind !== 'ITEM') return;
    if (baseMilli === null)
      return setError({
        key: BASE,
        line: null,
        text: t('inventory.recipes.scale.errors.BASE_QUANTITY_INVALID'),
      });
    const bad = rows.find((r) => r.active && rowMilli(r) === null);
    if (bad)
      return setError({
        key: bad.key,
        line: null,
        text: t('inventory.recipes.scale.errors.SIZE_QUANTITY_INVALID'),
      });
    if (!rows.some((r) => r.active))
      return setError({
        key: BASE,
        line: null,
        text: t('inventory.recipes.scale.errors.NO_SIZES'),
      });
    const badPrice = updateMenu ? rows.find((r) => parseRupees(r.price) === null || parseRupees(r.price) === 0) : undefined;
    if (badPrice)
      return setError({
        key: badPrice.key,
        line: null,
        text: t('inventory.recipes.scale.errors.PRICE', {
          size: badPrice.name,
        }),
      });
    const baseProblem = checkRecipe(
      {
        target: targetOf(null, ''),
        lines: linesOf(BASE),
        yieldMilli: null,
        note,
      },
      view.ingredients,
      book,
    );
    if (baseProblem) return fail(BASE, baseProblem);
    for (const row of rows.filter((r) => r.active && r.custom)) {
      const problem = checkRecipe(
        {
          target: targetOf(row.variantId, ''),
          lines: linesOf(row.key),
          yieldMilli: null,
          note,
        },
        view.ingredients,
        book,
      );
      if (problem) return fail(row.key, problem);
    }
    setBusy(true);
    setError(null);
    try {
      await getApi().saveScaledRecipe({
        menuItemId: subject.menuItemId,
        baseQuantityMilli: baseMilli,
        baseUnit,
        baseLines: linesOf(BASE),
        sizes: rows.map((r) => ({
          variantId: r.variantId,
          name: r.name,
          quantityMilli: rowMilli(r)!,
          active: r.active,
          customLines: r.custom ? linesOf(r.key) : null,
          price: updateMenu ? parseRupees(r.price)! : (r.menuPrice ?? 0),
        })),
        updateMenu,
        note,
        verify,
      });
      toast.show({
        tone: 'success',
        title: updateMenu ? t('inventory.recipes.scale.savedWithMenu') : verify ? t('inventory.recipes.editor.savedVerified') : t('inventory.recipes.editor.saved'),
      });
      onClose();
    } catch (err) {
      setError({
        key: active,
        line: null,
        text: err instanceof Error ? err.message : t('states.errorBody'),
      });
      setBusy(false);
    }
  };

  const save = async (verify: boolean) => {
    if (subject.kind === 'ITEM' && scaleOn) {
      // Prices or new sizes for the Menu: the owner confirms first (a Manager without Menu rights keeps the Menu prices).
      if (menuChanges.length > 0 && canEditMenu) return setConfirmMenu({ verify });
      return saveScaled(verify, false);
    }
    // Without Auto Scale every recipe is saved on its own (R1): the item's own recipe, or each changed size.
    const keys = hasMenuSizes ? rows.map((r) => r.key) : [BASE];
    const variantOf = (key: string) => (key === BASE ? null : (rows.find((r) => r.key === key)?.variantId ?? null));
    const recipeOfKey = (key: string) => (key === BASE ? baseRecipe : (rows.find((r) => r.key === key)?.recipe ?? null));
    const dirty = (key: string) =>
      JSON.stringify(linesOf(key)) !== JSON.stringify(savedLines(recipeOfKey(key))) || (subject.kind === 'PREPARED' && (yieldMilli !== savedYield || name.trim() !== (prepared?.name ?? '')));
    const toSave = keys.filter((k) => dirty(k) || (verify && k === active && stateOf(recipeOfKey(k)) !== 'VERIFIED'));
    const turnsOff = Boolean(scale?.enabled);
    if (toSave.length === 0 && !turnsOff) return onClose();
    for (const key of toSave) {
      const problem = checkRecipe(
        {
          target: targetOf(variantOf(key), prepared?.id ?? 'new'),
          lines: linesOf(key),
          yieldMilli,
          note,
        },
        view.ingredients,
        costBook,
      );
      if (problem) return fail(key, problem);
    }
    if (subject.kind === 'PREPARED' && !name.trim())
      return setError({
        key: BASE,
        line: null,
        text: t('inventory.errors.NAME_REQUIRED'),
      });
    setBusy(true);
    setError(null);
    try {
      let preparedId = prepared?.id ?? '';
      if (subject.kind === 'PREPARED' && (!prepared || name.trim() !== prepared.name)) {
        const saved = await getApi().saveIngredient(prepared ? { ...inputOf(prepared), name } : newPrepared(name, category, stockUnit, view.ingredients));
        preparedId = saved.id;
      }
      if (turnsOff && subject.kind === 'ITEM') await getApi().turnOffRecipeScale(subject.menuItemId);
      for (const key of toSave) {
        await getApi().saveRecipe({
          target: targetOf(variantOf(key), preparedId),
          lines: linesOf(key),
          yieldMilli,
          note,
          verify,
        });
      }
      toast.show({
        tone: 'success',
        title: verify ? t('inventory.recipes.editor.savedVerified') : t('inventory.recipes.editor.saved'),
      });
      onClose();
    } catch (err) {
      setError({
        key: active,
        line: null,
        text: err instanceof Error ? err.message : t('states.errorBody'),
      });
      setBusy(false);
    }
  };
  const leave = () => {
    if (anyDirty && !leaving) return setLeaving(true);
    onClose();
  };

  const field = 'min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';
  const readOnly = 'flex min-h-10 w-full items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800';
  const panel = 'flex min-h-0 min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_-10px_rgb(15_23_42/0.18)]';
  const productName = subject.kind === 'PREPARED' ? name || t('inventory.recipes.editor.addTitle') : subject.name;
  const isNew = !baseRecipe && rows.every((r) => !r.recipe) && !prepared;
  const baseLabel = `${baseQty || '—'} ${t(`inventory.recipes.scale.units.${baseUnit}`)}`;
  const showSizes = isItem && (hasMenuSizes || scaleOn);
  const editingKey = active === BASE || !activeRow || !scaleOn || activeRow.custom ? active : null;
  const copyChoices = rows.filter((r) => r.key !== active && costableLines(drafts[r.key] ?? [], byId).length > 0);

  let summaryTitle = t('inventory.recipes.builder.summaryTitle');
  if (summaryRow && active !== BASE) summaryTitle = summaryRow.name;
  else if (scaleOn) summaryTitle = t('inventory.recipes.scale.baseTitle', { qty: baseLabel });
  else if (isItem && !hasMenuSizes)
    summaryTitle = t('inventory.recipes.builder.summaryFor', {
      size: `1 ${subject.unit}`,
    });
  else if (activeRow) summaryTitle = activeRow.name;

  const priceInput = (row: SizeRow, label: string) =>
    scaleOn && canEditMenu ? (
      <input
        value={row.price}
        onChange={(e) => setRow(row.key, { price: e.target.value })}
        inputMode="decimal"
        aria-label={label}
        className={cn(
          'min-h-10 w-28 rounded-lg border bg-white px-2 text-right text-sm font-semibold tabular-nums',
          row.menuPrice !== null && parseRupees(row.price) !== row.menuPrice ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-300',
        )}
      />
    ) : (
      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 tabular-nums text-slate-900">{formatPaisa(rowPrice(row))}</span>
    );

  return (
    <div className="flex flex-col gap-3" data-recipe-builder>
      {/* Top bar: breadcrumb, Save Draft, Verify Recipe */}
      <div className="bg-brand-gradient flex shrink-0 flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5 text-white shadow-brand">
        <nav aria-label={t('inventory.recipes.builder.back')} className="flex min-w-0 basis-full items-center gap-2 text-lg sm:basis-auto sm:flex-1">
          <button type="button" onClick={leave} className="press rounded-lg px-1 font-semibold text-white/85 hover:text-white">
            {t('inventory.recipes.builder.breadcrumb')}
          </button>
          <ChevronRight className="size-5 shrink-0 text-white/70" aria-hidden />
          <h2 className="truncate font-extrabold">
            {isNew ? t('inventory.recipes.builder.addTitle') : t('inventory.recipes.builder.editTitle')}
            <span className="font-semibold text-white/85"> · {productName}</span>
          </h2>
        </nav>
        <button
          type="button"
          disabled={busy || !anyDirty}
          onClick={() => void save(false)}
          className="press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-brand shadow-sm disabled:opacity-60 sm:flex-none"
        >
          <Save className="size-4" aria-hidden />
          {t('inventory.recipes.builder.saveDraft')}
        </button>
        <button
          type="button"
          disabled={busy || (!anyDirty && verified)}
          onClick={() => void save(true)}
          className="press flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white px-5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-60 sm:flex-none"
        >
          <Check className="size-4" aria-hidden />
          {t('inventory.recipes.builder.verify')}
        </button>
      </div>
      {(leaving || error) && (
        <p role="alert" className={cn('shrink-0 rounded-xl px-3 py-2 text-sm font-semibold', error ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-900')}>
          {error ? `${error.key !== BASE && rows.length > 0 ? `${rows.find((r) => r.key === error.key)?.name ?? ''}: ` : ''}${error.text}` : t('inventory.recipes.builder.leaveAgain')}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[13rem_minmax(0,1fr)_14.5rem] xl:grid-cols-[15rem_minmax(0,1fr)_17rem] 2xl:grid-cols-[16.5rem_minmax(0,1fr)_18rem]">
        {/* Left: the product */}
        <section className={cn(panel, 'order-1 gap-3 p-3.5 lg:row-span-2')} aria-label={t('inventory.recipes.builder.productDetails')}>
          <div className="relative hidden overflow-hidden rounded-xl sm:block">
            {subject.kind === 'PREPARED' ? (
              <span className="flex aspect-[16/10] items-center justify-center bg-linear-to-br from-brand-soft via-rose-50 to-white text-6xl" aria-hidden>
                🥣
              </span>
            ) : (
              <ProductArt name={subject.name} categoryName={subject.kind === 'ITEM' ? subject.categoryName : 'cheese'} className="aspect-[16/10] w-full" emojiClassName="text-7xl" soft />
            )}
            <button
              type="button"
              onClick={() =>
                toast.show({
                  tone: 'info',
                  title: t('inventory.recipes.builder.photoNote'),
                })
              }
              aria-label={t('inventory.recipes.builder.changePhoto')}
              title={t('inventory.recipes.builder.photoNote')}
              className="press absolute right-2 bottom-2 grid size-9 place-items-center rounded-lg bg-white/95 text-slate-700 shadow-md"
            >
              <Pencil className="size-4" aria-hidden />
            </button>
          </div>
          <h3 className="text-lg font-extrabold leading-tight text-slate-900">{t('inventory.recipes.builder.productDetails')}</h3>
          {subject.kind === 'PREPARED' ? (
            <>
              <Field label={t('inventory.recipes.editor.name')}>
                <input
                  value={name}
                  onChange={(e) => (setName(e.target.value), change())}
                  placeholder={t('inventory.recipes.editor.namePlaceholder')}
                  aria-label={t('inventory.recipes.editor.name')}
                  className={field}
                />
              </Field>
              <Field label={t('inventory.form.category')}>
                <select
                  value={category}
                  disabled={Boolean(prepared)}
                  onChange={(e) => setCategory(e.target.value as IngredientCategory)}
                  aria-label={t('inventory.form.category')}
                  className={cn(field, 'disabled:bg-slate-50')}
                >
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`inventory.categories.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('inventory.recipes.editor.yield')}>
                  <input
                    value={yieldText}
                    onChange={(e) => (setYieldText(e.target.value), change())}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={t('inventory.recipes.editor.yield')}
                    title={t('inventory.recipes.editor.yieldHint')}
                    className={field}
                  />
                </Field>
                <Field label={t('inventory.recipes.editor.countedIn')}>
                  <select
                    value={stockUnit}
                    disabled={Boolean(prepared)}
                    onChange={(e) => setStockUnit(e.target.value as StockUnit)}
                    aria-label={t('inventory.recipes.editor.countedIn')}
                    className={cn(field, 'px-2 disabled:bg-slate-50')}
                  >
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
              {isItem &&
                (scaleOn ? (
                  <Field label={t('inventory.recipes.builder.baseQuantity')} hint={t('inventory.recipes.scale.baseHint')}>
                    <span className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                      <input
                        value={baseQty}
                        onChange={(e) => (setBaseQty(e.target.value), change())}
                        inputMode="decimal"
                        aria-label={t('inventory.recipes.builder.baseQuantity')}
                        className={cn(field, 'tabular-nums')}
                      />
                      <select value={baseUnit} onChange={(e) => changeBaseUnit(e.target.value as ScaleUnit)} aria-label={t('inventory.recipes.scale.baseUnit')} className={cn(field, 'px-2')}>
                        {SCALE_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {t(`inventory.recipes.scale.units.${u}`)}
                          </option>
                        ))}
                      </select>
                    </span>
                  </Field>
                ) : (
                  <Field label={hasMenuSizes ? t('inventory.recipes.editor.sizes') : t('inventory.recipes.builder.baseQuantity')}>
                    <span className={cn(readOnly, 'truncate')}>
                      {hasMenuSizes
                        ? rows.map((r) => r.name).join(', ')
                        : t('inventory.recipes.builder.perSale', {
                            unit: subject.unit,
                          })}
                    </span>
                  </Field>
                ))}
              <p className="text-xs leading-snug text-slate-500">
                {t('inventory.recipes.builder.editInMenu')}{' '}
                <Link href="/menu" className="font-bold text-brand hover:underline">
                  {t('inventory.recipes.builder.openMenu')}
                </Link>
              </p>
            </>
          )}
          {isItem && (
            <div className={cn('rounded-xl p-3', scaleOn ? 'bg-brand-soft' : 'bg-brand-soft/60')} data-auto-scale>
              <div className="flex items-center gap-2">
                <Scale className="size-5 shrink-0 text-brand" aria-hidden />
                <p className="min-w-0 flex-1 text-[15px] font-extrabold leading-tight text-brand">{t('inventory.recipes.builder.autoScale')}</p>
                <Switch checked={scaleOn} onChange={(on) => (on ? turnOn() : turnOff())} compact label={t('inventory.recipes.builder.autoScale')} />
              </div>
              <p className="mt-1 text-xs leading-snug text-slate-600">
                {scaleOn
                  ? t('inventory.recipes.scale.onHint', {
                      sizes:
                        rows
                          .filter((r) => r.active)
                          .map((r) => r.name)
                          .join(', ') || '—',
                    })
                  : t('inventory.recipes.scale.offHint')}
              </p>
            </div>
          )}
        </section>

        {/* Right: the cost summary and versions (second on tablets) */}
        <div className="order-2 flex min-h-0 min-w-0 flex-col gap-3 lg:order-3">
          <section className={cn(panel, 'overflow-hidden')} aria-label={t('inventory.recipes.builder.summaryTitle')}>
            <div className="flex items-center gap-2 bg-brand-soft/70 px-3.5 py-2.5">
              <Calculator className="size-5 text-brand" aria-hidden />
              <h3 className="truncate text-base font-extrabold text-brand" data-summary-title>
                {summaryTitle}
              </h3>
            </div>
            <div className="px-3.5 py-1">
              {subject.kind === 'PREPARED' ? (
                <dl className="divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-2 py-1.5">
                    <dt className="text-slate-600">{t('inventory.recipes.editor.batch')}</dt>
                    <dd className="font-extrabold tabular-nums" data-recipe-cost>
                      {baseCost === null ? '—' : formatPaisa(baseCost)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5">
                    <dt className="text-slate-600">
                      {t('inventory.recipes.editor.perUnitCost', {
                        unit: unitLabel(displayUnit, MILLI),
                      })}
                    </dt>
                    <dd className="font-black tabular-nums text-slate-900" data-unit-cost>
                      {unitCost === null ? '—' : formatPaisa(unitCost)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <CostingRows
                  costing={summaryCosting}
                  showNetPrice={view.tax.pricesIncludeTax && view.tax.rateBps > 0}
                  priceNote={scaleOn && canEditMenu && summaryRow ? t('inventory.recipes.scale.priceNote') : t('inventory.recipes.builder.priceFromMenu')}
                  price={
                    summaryRow ? (
                      priceInput(
                        summaryRow,
                        t('inventory.recipes.scale.priceOf', {
                          size: summaryRow.name,
                        }),
                      )
                    ) : scaleOn && active === BASE ? (
                      <span className="text-slate-500">—</span>
                    ) : undefined
                  }
                />
              )}
              <p className="pb-2 text-xs leading-snug text-slate-500">
                {scaleOn && active === BASE && !baseRow ? `${t('inventory.recipes.scale.noBaseSize')} ` : ''}
                {t('inventory.recipes.editor.estimateNote')}
              </p>
            </div>
          </section>
          <Versions
            title={active === BASE ? t('inventory.recipes.editor.history') : `${t('inventory.recipes.editor.history')} · ${activeRow?.name ?? ''}`}
            recipe={active === BASE ? baseRecipe : (activeRow?.recipe ?? null)}
            view={view}
          />
        </div>

        {/* Middle: the ingredients */}
        <section className={cn(panel, 'order-3 gap-2 p-3.5 md:col-span-2 lg:order-2 lg:col-span-1')} aria-label={t('inventory.recipes.builder.ingredients')}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xl font-extrabold text-slate-900">{t('inventory.recipes.builder.ingredients')}</h3>
              <p className="text-sm text-slate-500" data-ingredients-for>
                {active === BASE
                  ? scaleOn
                    ? t('inventory.recipes.scale.forBase', { qty: baseLabel })
                    : t('inventory.recipes.builder.ingredientsHint')
                  : t('inventory.recipes.scale.forSize', {
                      size: activeRow?.name ?? '',
                    })}
              </p>
            </div>
            {editingKey !== null && (
              <button
                type="button"
                onClick={() => document.querySelector<HTMLInputElement>('[data-recipe-search]')?.focus()}
                className="press flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-brand/70 bg-white px-4 text-sm font-bold text-brand hover:bg-brand-soft"
              >
                <Plus className="size-4" aria-hidden />
                {t('inventory.recipes.builder.addIngredient')}
              </button>
            )}
          </div>
          {scaleOn && active !== BASE && activeRow && (
            <div className={cn('flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm', activeRow.custom ? 'bg-amber-50 text-amber-950' : 'bg-blue-50 text-blue-950')} data-size-banner>
              <span className="min-w-0 flex-1 font-semibold">
                {activeRow.custom
                  ? t('inventory.recipes.scale.customBanner', {
                      size: activeRow.name,
                    })
                  : t('inventory.recipes.scale.autoBanner', {
                      size: activeRow.name,
                      share: rowMilli(activeRow) !== null && baseMilli ? formatBps(scaleShareBps(rowMilli(activeRow)!, baseMilli)) : '—',
                      qty: baseLabel,
                    })}
              </span>
              {activeRow.custom ? (
                <button type="button" onClick={() => backToAuto(activeRow)} className="press flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-3 font-bold text-amber-900 shadow-sm">
                  <RotateCcw className="size-4" aria-hidden />
                  {t('inventory.recipes.scale.backToAuto')}
                </button>
              ) : (
                <button type="button" onClick={() => customize(activeRow)} className="press flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-3 font-bold text-blue-900 shadow-sm">
                  <Pencil className="size-4" aria-hidden />
                  {t('inventory.recipes.scale.customize')}
                </button>
              )}
              <button type="button" onClick={() => setActive(BASE)} className="press min-h-10 rounded-lg px-2 font-bold underline-offset-2 hover:underline">
                {t('inventory.recipes.scale.editBase')}
              </button>
            </div>
          )}
          {editingKey !== null ? (
            <RecipeLines
              lines={drafts[editingKey] ?? []}
              onChange={(next) => (setDrafts((d) => ({ ...d, [editingKey]: next })), change())}
              ingredients={view.ingredients}
              book={costBook}
              excludeId={prepared?.id}
              errorLine={error?.key === editingKey ? error.line : null}
            />
          ) : (
            activeRow && <ScaledLines lines={scaleLines(costableLines(drafts[BASE] ?? [], byId), rowMilli(activeRow) ?? 0, baseMilli ?? 1)} byId={byId} book={book} />
          )}
          <div className="flex flex-wrap gap-2">
            {editingKey !== null && editingKey !== BASE && copyChoices.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const from = drafts[e.target.value];
                  if (!from) return;
                  setDrafts((d) => ({
                    ...d,
                    [editingKey]: from.map((l) => ({
                      ...l,
                      key: crypto.randomUUID(),
                    })),
                  }));
                  change();
                }}
                aria-label={t('inventory.recipes.editor.copyFrom')}
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="">{t('inventory.recipes.editor.copyFrom')}…</option>
                {copyChoices.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={220}
              placeholder={`${t('inventory.recipes.editor.note')}: ${t('inventory.recipes.editor.notePlaceholder')}`}
              aria-label={t('inventory.recipes.editor.note')}
              className={cn(field, 'min-w-40 flex-1')}
            />
          </div>
        </section>

        {/* Below: every size with its cost, price, food cost and profit */}
        {showSizes && (
          <section className={cn(panel, 'order-4 gap-2 p-3.5 md:col-span-2 lg:col-start-2')} aria-label={t('inventory.recipes.scale.sizesTitle')} data-recipe-sizes>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <Layers className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
                <div className="min-w-0">
                  <h3 className="text-lg font-extrabold text-slate-900">{scaleOn ? t('inventory.recipes.scale.sizesTitle') : t('inventory.recipes.builder.sizesTitle')}</h3>
                  <p className="text-sm text-slate-500">
                    {scaleOn
                      ? t('inventory.recipes.scale.sizesHint', {
                          qty: baseLabel,
                        })
                      : t('inventory.recipes.scale.sizesOffHint')}
                  </p>
                </div>
              </div>
              {scaleOn && (
                <button
                  type="button"
                  onClick={() => setSizesOpen(true)}
                  className="press flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-brand/70 bg-white px-4 text-sm font-bold text-brand hover:bg-brand-soft"
                >
                  <Settings2 className="size-4" aria-hidden />
                  {t('inventory.recipes.scale.customizeSizes')}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-bold text-slate-600">
                    {scaleOn && <th className="w-10 rounded-l-lg px-2 py-2" aria-label={t('inventory.recipes.scale.active')} />}
                    <th className={cn('px-2 py-2', !scaleOn && 'rounded-l-lg')}>{t('inventory.recipes.builder.sizeCol')}</th>
                    <th className="px-2 py-2 text-right">{t('inventory.recipes.scale.scaling')}</th>
                    <th className="px-2 py-2 text-right">{t('inventory.recipes.scale.totalCost')}</th>
                    <th className="px-2 py-2 text-right">{t('inventory.recipes.builder.priceCol')}</th>
                    <th className="px-2 py-2 text-right">{t('inventory.recipes.builder.foodCostCol')}</th>
                    <th className="rounded-r-lg px-2 py-2 text-right">{t('inventory.recipes.builder.profitCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const costing = rowCosting(row);
                    const q = rowMilli(row);
                    const state = stateOf(row.recipe);
                    const selected = active === row.key;
                    return (
                      <tr
                        key={row.key}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('input,button,select')) return;
                          setActive(row.key);
                          setError(null);
                        }}
                        data-size-row={row.name}
                        aria-selected={selected}
                        className={cn(
                          'cursor-pointer transition-colors',
                          selected ? 'bg-brand-soft/70 shadow-[inset_4px_0_0_var(--color-brand)]' : isBaseSize(row) ? 'bg-rose-50/60 hover:bg-brand-soft/40' : 'hover:bg-slate-50',
                          !row.active && 'opacity-60',
                        )}
                      >
                        {scaleOn && (
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={row.active}
                              onChange={(e) => setRow(row.key, { active: e.target.checked })}
                              aria-label={t('inventory.recipes.scale.activeOf', { size: row.name })}
                              className="size-5 accent-brand"
                            />
                          </td>
                        )}
                        <td className="px-2 py-2">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-base font-extrabold text-slate-900">{row.name}</span>
                            {isBaseSize(row) && <span className="font-bold text-brand">{t('inventory.recipes.scale.base')}</span>}
                            {scaleOn && row.variantId === null && <Badge tone="blue">{t('inventory.recipes.scale.newSize')}</Badge>}
                            {scaleOn && row.custom && <Badge tone="amber">{t('inventory.recipes.scale.custom')}</Badge>}
                            {!scaleOn && sizeDirty(row) ? (
                              <Badge tone="blue">{t('inventory.recipes.editor.changed')}</Badge>
                            ) : (
                              row.variantId && state !== 'VERIFIED' && <Badge tone={STATE_TONE[state]}>{t(`inventory.recipes.status.${state}`)}</Badge>
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-slate-700">
                          {scaleOn ? (q !== null && baseMilli ? formatBps(scaleShareBps(q, baseMilli)) : '—') : t('inventory.recipes.scale.ownRecipe')}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold tabular-nums text-slate-900" data-size-cost>
                          {costing.cost === null ? '—' : formatPaisa(costing.cost)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {priceInput(
                            row,
                            t('inventory.recipes.scale.priceOf', {
                              size: row.name,
                            }),
                          )}
                        </td>
                        <td className="px-2 py-2 text-right" data-size-food-cost>
                          {costing.level && costing.foodCostBps !== null ? (
                            <Badge tone={LEVEL_TONE[costing.level]} className="px-2.5 py-0.5 text-sm">
                              {formatBps(costing.foodCostBps)}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td
                          className={cn('px-2 py-2 text-right text-base font-black tabular-nums', costing.profit !== null && costing.profit < 0 ? 'text-red-700' : 'text-green-700')}
                          data-size-profit
                        >
                          {costing.profit === null ? '—' : costing.profit < 0 ? `−${formatPaisa(-costing.profit)}` : formatPaisa(costing.profit)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {scaleOn && <p className="text-xs leading-snug text-slate-500">{t('inventory.recipes.scale.stockNote')}</p>}
          </section>
        )}
      </div>

      {sizesOpen && (
        <SizesDialog
          rows={rows}
          baseUnit={baseUnit}
          baseMilli={baseMilli}
          canEditMenu={canEditMenu}
          presets={presetSizes(baseUnit)}
          onChange={(next) => {
            setRows(next);
            if (active !== BASE && !next.some((r) => r.key === active)) setActive(BASE);
            change();
          }}
          newRow={(label) => {
            const q = sizeQuantity(label, baseUnit, baseMilli ?? MILLI);
            return {
              key: crypto.randomUUID(),
              variantId: null,
              name: label,
              quantity: milliToInput(q),
              active: true,
              custom: false,
              price: '',
              menuPrice: null,
              recipe: null,
            };
          }}
          onBackToAuto={backToAuto}
          onClose={() => setSizesOpen(false)}
        />
      )}
      {confirmMenu && (
        <Dialog
          open
          onClose={() => setConfirmMenu(null)}
          title={t('inventory.recipes.scale.confirmTitle')}
          footer={
            <>
              {menuChanges.every((r) => r.variantId !== null) && (
                <button
                  type="button"
                  onClick={() => (setConfirmMenu(null), void saveScaled(confirmMenu.verify, false))}
                  className="press min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800"
                >
                  {t('inventory.recipes.scale.recipeOnly')}
                </button>
              )}
              <button
                type="button"
                onClick={() => (setConfirmMenu(null), void saveScaled(confirmMenu.verify, true))}
                className="press bg-brand-gradient min-h-11 rounded-xl px-4 text-sm font-bold text-white shadow-brand"
              >
                {t('inventory.recipes.scale.changeMenu')}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-700">{t('inventory.recipes.scale.confirmBody', { item: productName })}</p>
          <ul className="mt-3 space-y-1.5 text-sm" data-menu-changes>
            {menuChanges.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-bold text-slate-900">{r.name}</span>
                <span className="tabular-nums text-slate-700">
                  {r.variantId === null ? (
                    <>
                      <Badge tone="blue">{t('inventory.recipes.scale.newSize')}</Badge> {formatPaisa(parseRupees(r.price) ?? 0)}
                    </>
                  ) : (
                    `${formatPaisa(r.menuPrice ?? 0)} → ${formatPaisa(parseRupees(r.price) ?? 0)}`
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">{t('inventory.recipes.scale.confirmNote')}</p>
        </Dialog>
      )}
    </div>
  );
}

/** An automatic size's lines: the base × its share, read only ("Customize this size" makes them editable). */
function ScaledLines({ lines, byId, book }: { lines: RecipeLine[]; byId: ReadonlyMap<string, Ingredient>; book: ReturnType<typeof bookOf> }) {
  const costed = linesCost(book, lines);
  return (
    <ol className="divide-y divide-slate-100 rounded-xl border border-slate-100" data-scaled-lines>
      {lines.map((line, index) => {
        const ingredient = byId.get(line.ingredientId);
        const cost = costed.lines[index]?.cost ?? null;
        return (
          <li key={line.ingredientId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_5.5rem] items-center gap-2 px-3 py-2 text-sm">
            <span className="font-bold text-slate-500">{index + 1}</span>
            <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900">
              <span aria-hidden>{ingredient ? ingredientArt(ingredient) : '•'}</span>
              <span className="truncate">{ingredient?.name ?? '—'}</span>
            </span>
            <span className="tabular-nums text-slate-700" data-scaled-quantity>
              {ingredient ? quantityText(line.quantityMilli, ingredient.stockUnit) : '—'}
            </span>
            <span className="text-right font-extrabold tabular-nums text-slate-900">{cost === null ? '—' : formatPaisa(cost)}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Versions({ title, recipe, view }: { title: string; recipe: Recipe | null; view: RecipesView }) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-[0_4px_18px_-10px_rgb(15_23_42/0.18)]" aria-label={t('inventory.recipes.editor.history')}>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-900">
        <History className="size-4 text-brand" aria-hidden />
        {title}
      </h4>
      {recipe && recipe.versions.length ? (
        <ol className="space-y-1 text-xs text-slate-600" data-versions>
          {[...recipe.versions]
            .reverse()
            .slice(0, 5)
            .map((v) => (
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
      <p className="mt-1.5 text-xs leading-snug text-slate-500">{t('inventory.recipes.editor.verifyHint')}</p>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
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
    code: suggestIngredientCode(
      name,
      all.map((i) => i.code),
    ),
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

'use client';

import { useState } from 'react';
import { Link2, Plus, Store, Trash2 } from 'lucide-react';
import {
  MAX_SIZES,
  MILLI,
  checkMenuItem,
  checkPortion,
  cleanName,
  currentVersion,
  formatMilli,
  paisaToInput,
  guessPortionMilli,
  menuNameFor,
  parseQuantity,
  parseRupees,
  sameDish,
  sameName,
  type Ingredient,
  type MenuItem,
  type MenuSetup,
  type RecipesView,
} from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi, type SellPreparedInput } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { menuProblemText } from '../../menu/menu-parts';
import { unitLabel } from '../inventory-format';

const NEW = 'NEW';
type Row = { key: string; variantId: string | null; name: string; price: string; portion: string };

let nextKey = 1;
const portionInput = (milli: number) => formatMilli(milli).replaceAll(',', '');
const newRow = (name: string): Row => ({ key: `row-${nextKey++}`, variantId: null, name, price: '', portion: portionInput(guessPortionMilli(name)) });

/** The portion a size of a linked product takes now: its current recipe's line of this dish, else a guess from its name. */
function currentPortion(view: RecipesView | undefined, preparedId: string, menuItemId: string, variantId: string | null, sizeName: string | null): number {
  const recipe = view?.menu.find((r) => r.menuItemId === menuItemId && r.variantId === variantId)?.recipe;
  const line = recipe ? currentVersion(recipe)?.lines.find((l) => l.ingredientId === preparedId) : undefined;
  return line?.quantityMilli ?? guessPortionMilli(sizeName);
}

/**
 * Sell a cooked dish on the POS (owner's integration brief, 2026-11-08): the menu product that is the same dish is offered to
 * link (never made twice); otherwise the product is made once here with its POS category, kitchen station, sizes, prices and
 * the portion each size takes of the dish. Saved in one step: the product reaches Menu, POS and Waiter Orders at once.
 */
export function SellDialog({ prepared, view, asked = false, onClose }: { prepared: Ingredient; view?: RecipesView; asked?: boolean; onClose: () => void }) {
  const setup = useApiQuery(() => getApi().getMenuSetup(), []);
  const title = asked ? t('inventory.recipes.sell.askAfterSave', { name: prepared.name }) : t('inventory.recipes.sell.title', { name: prepared.name });
  if (setup.loading && !setup.data)
    return (
      <Dialog open size="xl" onClose={onClose} title={title}>
        <LoadingState />
      </Dialog>
    );
  if (!setup.data)
    return (
      <Dialog open size="xl" onClose={onClose} title={title}>
        <ErrorState message={setup.error?.message} onRetry={setup.reload} />
      </Dialog>
    );
  return <SellForm setup={setup.data} prepared={prepared} view={view} title={title} asked={asked} onClose={onClose} />;
}

function SellForm({ setup, prepared, view, title, asked, onClose }: { setup: MenuSetup; prepared: Ingredient; view?: RecipesView; title: string; asked: boolean; onClose: () => void }) {
  const toast = useToast();
  // The same dish already on the menu: linked to it, or with the same name ("Daal Mash" for Cooked Daal Mash)
  const matches = setup.items.filter((i) => i.preparedItemId === prepared.id || sameDish(i.name, prepared.name));
  const activeCategories = setup.categories.filter((c) => c.category.isActive).map((c) => c.category);
  const [choice, setChoice] = useState<string>(matches[0]?.id ?? NEW);
  const [name, setName] = useState(menuNameFor(prepared.name));
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id ?? NEW);
  const [newCategory, setNewCategory] = useState('');
  const [stationId, setStationId] = useState((setup.stations.find((s) => /hot/i.test(s.name)) ?? setup.stations[0])?.id ?? '');
  const [isOnline, setIsOnline] = useState(true);
  // The sizes as typed, kept per choice: a new product starts with Full / Half plate, a linked one with its own Menu sizes
  // and prices and the portion each takes now; both can be renamed, repriced, added or removed (owner, 2026-11-08)
  const [edits, setEdits] = useState<Record<string, Row[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const linked = choice === NEW ? null : (matches.find((m) => m.id === choice) ?? null);
  const unit = unitLabel(prepared.stockUnit, 2 * MILLI);
  const startRows = (item: MenuItem | null): Row[] => {
    if (!item) return [newRow(t('inventory.recipes.sell.defaultFull')), newRow(t('inventory.recipes.sell.defaultHalf'))];
    if (item.variants.length === 0) {
      return [{ ...newRow(t('inventory.recipes.sell.defaultFull')), price: paisaToInput(item.basePrice), portion: portionInput(currentPortion(view, prepared.id, item.id, null, null)) }];
    }
    return [...item.variants]
      .sort((a, b) => a.sort - b.sort)
      .map((v) => ({ ...newRow(v.name), variantId: v.id, price: paisaToInput(v.price), portion: portionInput(currentPortion(view, prepared.id, item.id, v.id, v.name)) }));
  };
  // Untouched rows get the same keys on every render, so the first change finds its row
  const firstRows = (): Row[] => startRows(linked).map((r, index) => ({ ...r, key: `start-${index}` }));
  const rows = edits[choice] ?? firstRows();
  const setRows = (change: (all: Row[]) => Row[]) => setEdits((e) => ({ ...e, [choice]: change(e[choice] ?? firstRows()) }));
  const setRow = (key: string, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  // A typed weight ("300 g", "1.5 kg") fills its portion, unless the portion was changed by hand
  const renameRow = (row: Row, name: string) =>
    setRow(row.key, row.portion === portionInput(guessPortionMilli(row.name)) ? { name, portion: portionInput(guessPortionMilli(name)) } : { name });
  const SIZE_PRESETS = [t('inventory.recipes.sell.defaultFull'), t('inventory.recipes.sell.defaultHalf'), '1 kg', '½ kg', 'Pao'];
  const categoryName = (id: string) => setup.categories.find((c) => c.category.id === id)?.category.name ?? '';

  const save = async () => {
    const sizes: SellPreparedInput['sizes'] = rows.map((r) => ({ variantId: r.variantId, name: r.name, price: parseRupees(r.price), portionMilli: parseQuantity(r.portion, { allowZero: false }) ?? 0 }));
    const one = sizes.length === 1 ? sizes[0]! : null;
    const productName = linked ? linked.name : name;
    const check = checkMenuItem({ name: productName, description: '', price: one ? one.price : null, sizes: one ? [] : sizes }, []);
    const where = linked ? categoryName(linked.categoryId) : categoryId === NEW ? cleanName(newCategory) : categoryName(categoryId);
    if (check) return setError(menuProblemText(check, cleanName(productName), where));
    if (!linked && categoryId === NEW && !cleanName(newCategory)) return setError(t('inventory.recipes.sell.categoryRequired'));
    if (sizes.some((s) => !checkPortion(s.portionMilli))) return setError(t('inventory.recipes.sell.portionRequired'));
    setBusy(true);
    setError(null);
    try {
      const item = await getApi().sellPreparedItem({
        preparedId: prepared.id,
        menuItemId: linked?.id ?? null,
        name,
        categoryId: categoryId === NEW ? null : categoryId,
        newCategoryName: newCategory,
        stationId,
        isOnline,
        sizes,
      });
      toast.show({ tone: 'success', title: linked ? t('inventory.recipes.sell.linked', { dish: prepared.name, name: item.name }) : t('inventory.recipes.sell.saved', { name: item.name }) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('states.errorBody'));
      setBusy(false);
    }
  };

  const field = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm';
  const label = 'mb-1 block text-sm font-bold text-slate-900';
  const option = (selected: boolean) =>
    cn('flex min-h-12 w-full items-start gap-3 rounded-xl border-2 px-3 py-2.5 text-left', selected ? 'border-brand bg-brand-soft/60' : 'border-slate-200 bg-white hover:border-slate-300');

  // Sizes, prices and portions: the same table for a new product and a linked one (its Menu sizes, changed here at once)
  const sizesBlock = (
    <>
      <p className={label}>{t('inventory.recipes.sell.sizes')}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm" data-sell-sizes>
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-bold text-slate-600">
              <th className="rounded-l-lg px-2 py-2">{t('inventory.recipes.sell.size')}</th>
              <th className="px-2 py-2">{t('inventory.recipes.sell.price')}</th>
              <th className="px-2 py-2">{t('inventory.recipes.sell.portion', { unit })}</th>
              <th className="rounded-r-lg px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.key} data-sell-row={index + 1}>
                <td className="px-2 py-2">
                  <input value={row.name} onChange={(e) => renameRow(row, e.target.value)} maxLength={40} aria-label={t('inventory.recipes.sell.sizeNameOf', { n: index + 1 })} className={field} />
                </td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-500">Rs.</span>
                    <input value={row.price} onChange={(e) => setRow(row.key, { price: e.target.value })} inputMode="decimal" aria-label={t('inventory.recipes.sell.priceOf', { size: row.name || String(index + 1) })} className={cn(field, 'w-28 tabular-nums')} />
                  </span>
                </td>
                <td className="px-2 py-2">
                  <input value={row.portion} onChange={(e) => setRow(row.key, { portion: e.target.value })} inputMode="decimal" aria-label={t('inventory.recipes.sell.portionOf', { size: row.name || String(index + 1), unit })} className={cn(field, 'w-24 tabular-nums')} />
                </td>
                <td className="px-2 py-2 text-right">
                  {rows.length > 1 && (
                    <button type="button" onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))} aria-label={t('inventory.recipes.sell.removeSize', { size: row.name || String(index + 1) })} className="press inline-grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Quick sizes (owner, 2026-11-08): plates, kg, ½ kg, Pao and grams, each with its portion filled in */}
      <div className="mt-2 flex flex-wrap items-center gap-2" data-size-presets>
        <span className="text-sm font-bold text-slate-700">{t('inventory.recipes.sell.addSize')}:</span>
        {SIZE_PRESETS.filter((preset) => !rows.some((r) => sameName(r.name, preset))).map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={rows.length >= MAX_SIZES}
            onClick={() => setRows((all) => [...all, newRow(preset)])}
            className="press flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 hover:border-brand/60 hover:text-brand disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden />
            {preset === 'Pao' ? t('inventory.recipes.sell.pao') : preset}
          </button>
        ))}
        <button
          type="button"
          disabled={rows.length >= MAX_SIZES}
          onClick={() => setRows((all) => [...all, newRow('')])}
          className="press flex min-h-10 items-center gap-1 rounded-lg border border-dashed border-slate-400 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
        >
          <Plus className="size-3.5" aria-hidden />
          {t('inventory.recipes.sell.otherSize')}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">{t('inventory.recipes.sell.oneSizeHint')}</p>
    </>
  );

  return (
    <Dialog
      open
      size="xl"
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {asked ? t('inventory.recipes.sell.later') : t('inventory.form.cancel')}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            <Store className="size-4" aria-hidden />
            {linked ? t('inventory.recipes.sell.saveLink') : t('inventory.recipes.sell.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-sell-dialog>
        <p className="text-sm text-slate-600">{t('inventory.recipes.sell.intro')}</p>

        {matches.length > 0 && (
          <fieldset className="space-y-2">
            <legend className={label}>{t('inventory.recipes.sell.found')}</legend>
            {matches.map((item) => (
              <label key={item.id} className={option(choice === item.id)} data-sell-match={item.name}>
                <input type="radio" name="sell-choice" checked={choice === item.id} onChange={() => setChoice(item.id)} className="mt-1 size-4 accent-brand" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Link2 className="size-4 text-brand" aria-hidden />
                    {t('inventory.recipes.sell.linkTo', { name: item.name, category: categoryName(item.categoryId) })}
                  </span>
                  <span className="block text-xs text-slate-500">{t('inventory.recipes.sell.linkHint', { dish: prepared.name })}</span>
                </span>
              </label>
            ))}
            <label className={option(choice === NEW)}>
              <input type="radio" name="sell-choice" checked={choice === NEW} onChange={() => setChoice(NEW)} className="mt-1 size-4 accent-brand" />
              <span className="font-bold text-slate-900">{t('inventory.recipes.sell.makeNew')}</span>
            </label>
          </fieldset>
        )}

        {linked ? (
          <div data-sell-link>{sizesBlock}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className={label}>{t('inventory.recipes.sell.name')} *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} aria-label={t('inventory.recipes.sell.name')} className={field} />
            </label>
            <label className="block">
              <span className={label}>{t('inventory.recipes.sell.category')}</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label={t('inventory.recipes.sell.category')} className={field}>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW}>{t('inventory.recipes.sell.newCategory')}</option>
              </select>
            </label>
            <label className="block">
              <span className={label}>{t('inventory.recipes.sell.station')}</span>
              <select value={stationId} onChange={(e) => setStationId(e.target.value)} aria-label={t('inventory.recipes.sell.station')} className={field}>
                {setup.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {categoryId === NEW && (
              <label className="block md:col-span-2">
                <span className={label}>{t('inventory.recipes.sell.newCategoryName')} *</span>
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} aria-label={t('inventory.recipes.sell.newCategoryName')} className={field} />
              </label>
            )}
            <div className="md:col-span-2">{sizesBlock}</div>
            <div className="md:col-span-2">
              <Switch checked={isOnline} onChange={setIsOnline} label={t('inventory.recipes.sell.online')} />
            </div>
          </div>
        )}

        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('inventory.recipes.sell.portionHint')}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

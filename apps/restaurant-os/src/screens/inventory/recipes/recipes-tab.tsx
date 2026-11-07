'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CakeSlice, ChefHat, CircleCheck, Pencil, Percent, Plus, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import { MILLI, currentVersion, displayUnitOf, formatBps, formatPaisa, summarizeFoodCost, type FoodCost, type MenuRecipeRow, type RecipesView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { quantityText, toDisplayMilli, unitLabel } from '../inventory-format';
import { bookOf, stateOf, type RecipeState } from './recipe-draft';
import { CookedCard, LatestPurchase, cookedDishes } from './cooked-card';
import { RecipeBuilder, type EditorSubject } from './recipe-builder';
import { LEVEL_TONE } from './recipe-lines';

type Section = 'menu' | 'addons' | 'prepared';
const SECTIONS: { key: Section; icon: LucideIcon }[] = [
  { key: 'menu', icon: BookOpen },
  { key: 'addons', icon: Plus },
  { key: 'prepared', icon: CakeSlice },
];
const FILTERS = ['ALL', 'NONE', 'DRAFT', 'VERIFIED', 'HIGH'] as const;
type Filter = (typeof FILTERS)[number];
const STATE_TONE = { NONE: 'grey', DRAFT: 'amber', VERIFIED: 'green' } as const;

/** What is being edited, by id: the editor always gets the newest recipes from the view. */
type EditingRef = { kind: 'ITEM'; menuItemId: string; variantId: string | null } | { kind: 'ADDON'; modifierId: string } | { kind: 'PREPARED'; ingredientId: string | null };

function subjectOf(ref: EditingRef, view: RecipesView): EditorSubject | null {
  if (ref.kind === 'ITEM') {
    const rows = view.menu.filter((r) => r.menuItemId === ref.menuItemId);
    const first = rows[0];
    if (!first) return null;
    return {
      kind: 'ITEM',
      menuItemId: ref.menuItemId,
      name: first.itemName,
      categoryName: first.categoryName,
      unit: first.unit,
      sizes: rows.map((r) => ({ variantId: r.variantId, name: r.variantName, price: r.costing.price, recipe: r.recipe })),
      startVariantId: ref.variantId,
    };
  }
  if (ref.kind === 'ADDON') {
    const addon = view.addons.find((a) => a.modifierId === ref.modifierId);
    return addon ? { kind: 'ADDON', modifierId: addon.modifierId, name: addon.name, groupName: addon.groupName, price: addon.costing.price, recipe: addon.recipe } : null;
  }
  return { kind: 'PREPARED', row: ref.ingredientId ? (view.prepared.find((p) => p.ingredient.id === ref.ingredientId) ?? null) : null };
}

/** Changes when a saved recipe or Auto Scale setup of the subject changes, so the editor starts again from the newest version. */
function versionsKey(subject: EditorSubject, view: RecipesView): string {
  const recipes = subject.kind === 'ITEM' ? subject.sizes.map((s) => s.recipe) : subject.kind === 'ADDON' ? [subject.recipe] : [subject.row?.recipe ?? null];
  const base = subject.kind === 'ITEM' ? view.baseRecipes.find((r) => r.target.kind === 'ITEM' && r.target.menuItemId === subject.menuItemId) : undefined;
  const scale = subject.kind === 'ITEM' ? view.scales.find((s) => s.menuItemId === subject.menuItemId) : undefined;
  return [...recipes, base ?? null].map((r) => (r ? `${r.id}:${r.versions.length}` : '-')).join('|') + (scale ? `|${scale.updatedAt}` : '');
}

interface MenuItemGroup {
  menuItemId: string;
  name: string;
  categoryName: string;
  unit: string;
  rows: MenuRecipeRow[];
}

/** One status for a menu item: verified when every size is, no recipe when no size has one, else draft. */
function groupState(rows: readonly MenuRecipeRow[]): RecipeState {
  const states = rows.map((r) => stateOf(r.recipe));
  if (states.every((s) => s === 'VERIFIED')) return 'VERIFIED';
  if (states.every((s) => s === 'NONE')) return 'NONE';
  return 'DRAFT';
}

function matches(group: MenuItemGroup, filter: Filter): boolean {
  const states = group.rows.map((r) => stateOf(r.recipe));
  if (filter === 'NONE') return states.includes('NONE');
  if (filter === 'DRAFT') return states.includes('DRAFT');
  if (filter === 'VERIFIED') return states.every((s) => s === 'VERIFIED');
  if (filter === 'HIGH') return group.rows.some((r) => r.costing.level === 'HIGH');
  return true;
}

/**
 * Recipes & Food Cost (Inventory Step B, DEMO): every menu item and size, add-on and prepared item with its recipe,
 * cost, food cost % and status. Tap a card to open it in the Recipe Builder, which takes the whole screen.
 */
export function RecipesTab({ canManage, onBuilder }: { canManage: boolean; onBuilder?: (open: boolean) => void }) {
  const recipes = useApiQuery(() => getApi().getRecipes(), []);
  const [section, setSection] = useState<Section>('menu');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<EditingRef | null>(null);
  // The builder takes the whole screen: the Inventory title and sections step aside while it is open.
  useEffect(() => {
    onBuilder?.(editing !== null);
    if (editing) window.scrollTo({ top: 0 });
  }, [editing, onBuilder]);
  useEffect(() => () => onBuilder?.(false), [onBuilder]);

  if (recipes.loading && !recipes.data) return <LoadingState />;
  if (!recipes.data) return <ErrorState message={recipes.error?.message} onRetry={recipes.reload} />;
  const view = recipes.data;
  const subject = editing ? subjectOf(editing, view) : null;
  const summary = summarizeFoodCost(view.menu);
  const groups: MenuItemGroup[] = [];
  for (const row of view.menu) {
    const group = groups.find((g) => g.menuItemId === row.menuItemId);
    if (group) group.rows.push(row);
    else groups.push({ menuItemId: row.menuItemId, name: row.itemName, categoryName: row.categoryName, unit: row.unit, rows: [row] });
  }
  const q = query.trim().toLowerCase();
  const searched = groups.filter((g) => !q || g.name.toLowerCase().includes(q) || g.categoryName.toLowerCase().includes(q));
  const shown = searched.filter((g) => matches(g, filter));
  const openItem = (group: MenuItemGroup, variantId: string | null) =>
    setEditing({ kind: 'ITEM', menuItemId: group.menuItemId, variantId });
  if (subject) return <RecipeBuilder key={versionsKey(subject, view)} subject={subject} view={view} onClose={() => setEditing(null)} />;
  // Cooked food follows the raw stock that supplier bills bring in
  const book = bookOf(view);
  const byId = new Map(view.ingredients.map((i) => [i.id, i]));
  const dishes = cookedDishes(view, book);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Summary icon={BookOpen} tone="bg-brand-soft text-brand" label={t('inventory.recipes.summary.items')} value={t('inventory.recipes.summary.ofTotal', { n: summary.itemsWithRecipe, of: summary.items })} />
        <Summary icon={CircleCheck} tone="bg-green-50 text-green-700" label={t('inventory.recipes.summary.verified')} value={t('inventory.recipes.summary.ofTotal', { n: summary.verified, of: summary.recipes })} />
        <Summary icon={Percent} tone="bg-slate-100 text-slate-700" label={t('inventory.recipes.summary.average')} value={summary.averageBps === null ? '—' : formatBps(summary.averageBps)} hint={t('inventory.recipes.summary.averageHint')} />
        <Summary icon={TriangleAlert} tone="bg-red-50 text-red-700" label={t('inventory.recipes.summary.high')} value={String(summary.high)} hint={t('inventory.recipes.summary.highHint')} />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('inventory.recipes.sections.label')}>
        {SECTIONS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={cn(
              'press flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold',
              section === key ? 'border-brand bg-brand bg-brand-gradient text-white shadow-brand' : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-brand-soft/50',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(`inventory.recipes.sections.${key}`)}
          </button>
        ))}
      </div>

      {section === 'menu' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-12 min-w-56 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 shadow-sm transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15 sm:max-w-sm">
              <Search className="size-5 shrink-0 text-slate-400" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('inventory.recipes.search')} aria-label={t('inventory.recipes.search')} className="w-full bg-transparent text-sm" />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('inventory.recipes.filters.label')}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'press flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold',
                    filter === f ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
                  )}
                >
                  {t(`inventory.recipes.filters.${f}`)}
                  <span className="rounded-full bg-white/70 px-1.5 text-xs tabular-nums text-slate-500">{searched.filter((g) => matches(g, f)).length}</span>
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{t('inventory.recipes.noResults')}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {shown.map((group) => {
                const state = groupState(group.rows);
                return (
                  <li key={group.menuItemId} data-recipe-item={group.name}>
                    <Card className="flex h-full flex-col">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900">{group.name}</p>
                          <p className="text-xs text-slate-500">
                            {group.categoryName}
                            {group.unit !== 'piece' && ` · ${t('inventory.recipes.perUnit', { unit: group.unit })}`}
                          </p>
                        </div>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <Badge tone={STATE_TONE[state]}>{t(`inventory.recipes.status.${state}`)}</Badge>
                          {view.scales.some((sc) => sc.menuItemId === group.menuItemId && sc.enabled) && <Badge tone="blue">{t('inventory.recipes.scale.autoBadge')}</Badge>}
                        </span>
                      </div>
                      <ul className="flex-1 divide-y divide-slate-100 px-4">
                        {group.rows.map((row) => (
                          <SizeLine key={row.variantId ?? 'base'} name={row.variantName ?? t('inventory.recipes.regular')} costing={row.costing} state={stateOf(row.recipe)} onOpen={canManage ? () => openItem(group, row.variantId) : undefined} />
                        ))}
                      </ul>
                      {canManage && (
                        <div className="border-t border-slate-100 p-3">
                          <button
                            type="button"
                            onClick={() => openItem(group, group.rows[0]?.variantId ?? null)}
                            aria-label={`${state === 'NONE' ? t('inventory.recipes.add') : t('inventory.recipes.edit')}: ${group.name}`}
                            className="press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm hover:border-brand/40 hover:bg-brand-soft/40"
                          >
                            {state === 'NONE' ? <Plus className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
                            {state === 'NONE' ? t('inventory.recipes.add') : t('inventory.recipes.edit')}
                          </button>
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {section === 'addons' && (
        <Card>
          <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">{t('inventory.recipes.addonsHint')}</p>
          <ul className="divide-y divide-slate-100 px-4">
            {view.addons.map((addon) => (
              <SizeLine
                key={addon.modifierId}
                name={addon.name}
                sub={addon.groupName}
                costing={addon.costing}
                state={stateOf(addon.recipe)}
                onOpen={canManage ? () => setEditing({ kind: 'ADDON', modifierId: addon.modifierId }) : undefined}
              />
            ))}
          </ul>
        </Card>
      )}

      {section === 'prepared' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-2xl text-sm text-slate-600">{t('inventory.recipes.preparedHint')}</p>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditing({ kind: 'PREPARED', ingredientId: null })}
                className="press bg-brand-gradient flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-brand"
              >
                <Plus className="size-4" aria-hidden />
                {t('inventory.recipes.addPrepared')}
              </button>
            )}
          </div>
          <LatestPurchase view={view} book={book} dishes={dishes} />
          {dishes.length > 0 && <p className="text-xs text-slate-500">{t('inventory.recipes.cooked.note')}</p>}
          <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {view.prepared.map((row) => {
              // Cooked food (a main raw ingredient): the recipe follows the raw stock from supplier bills
              const dish = dishes.find((d) => d.row.ingredient.id === row.ingredient.id);
              if (dish)
                return (
                  <li key={row.ingredient.id} data-prepared-item={row.ingredient.name}>
                    <CookedCard
                      dish={dish}
                      sharedWith={dishes.filter((d) => d !== dish && d.main.id === dish.main.id).map((d) => d.row.ingredient.name)}
                      byId={byId}
                      canManage={canManage}
                      onEdit={() => setEditing({ kind: 'PREPARED', ingredientId: row.ingredient.id })}
                    />
                  </li>
                );
              const state = stateOf(row.recipe);
              const yieldMilli = row.recipe ? currentVersion(row.recipe)?.yieldMilli : null;
              const unit = displayUnitOf(row.ingredient);
              return (
                <li key={row.ingredient.id} data-prepared-item={row.ingredient.name}>
                  <Card className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                          <ChefHat className="size-5" aria-hidden />
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-900">{row.ingredient.name}</p>
                          <p className="text-xs text-slate-500">{row.ingredient.code}</p>
                        </div>
                      </div>
                      <Badge tone={STATE_TONE[state]}>{t(`inventory.recipes.status.${state}`)}</Badge>
                    </div>
                    {yieldMilli ? <p className="text-sm text-slate-700">{t('inventory.recipes.makes', { qty: quantityText(toDisplayMilli(row.ingredient, yieldMilli), unit) })}</p> : null}
                    <p className="text-sm text-slate-700">
                      {row.batchCost !== null && t('inventory.recipes.batchCost', { price: formatPaisa(row.batchCost) })}
                      {row.unitCost !== null && (
                        <strong className="ml-2 text-slate-900" data-unit-cost>
                          {t('inventory.recipes.unitCost', { price: formatPaisa(row.unitCost), unit: unitLabel(unit, MILLI) })}
                        </strong>
                      )}
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setEditing({ kind: 'PREPARED', ingredientId: row.ingredient.id })}
                        aria-label={`${t('inventory.recipes.edit')}: ${row.ingredient.name}`}
                        className="press mt-auto flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 shadow-sm hover:border-brand/40"
                      >
                        <Pencil className="size-4" aria-hidden />
                        {t('inventory.recipes.edit')}
                      </button>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t('inventory.recipes.demoNote')}</p>
      <p className="text-xs text-slate-500">{t('inventory.recipes.guide')}</p>

    </div>
  );
}

function Summary({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: string; label: string; value: string; hint?: string }) {
  return (
    <Card className="flex min-h-28 flex-col justify-between gap-2 p-4" data-recipe-summary={label}>
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold leading-snug text-slate-600">{label}</span>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tone)}>
          <Icon className="size-5" aria-hidden />
        </span>
      </span>
      <span>
        <span className="block text-2xl font-black tabular-nums text-slate-900">{value}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </Card>
  );
}

/** One size or add-on: cost, price and food cost %; tap it to edit. */
function SizeLine({ name, sub, costing, state, onOpen }: { name: string; sub?: string; costing: FoodCost; state: RecipeState; onOpen?: () => void }) {
  const content = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-bold text-slate-900">{name}</span>
        <span className="block text-xs text-slate-500">
          {sub ? `${sub} · ` : ''}
          {state === 'NONE'
            ? t('inventory.recipes.noRecipe')
            : `${t('inventory.recipes.cost')} ${costing.cost === null ? t('inventory.recipes.unknownCost') : formatPaisa(costing.cost)} · ${t('inventory.recipes.price')} ${formatPaisa(costing.price)}`}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {state !== 'NONE' && costing.foodCostBps !== null && (
          <span className="text-sm font-black tabular-nums text-slate-900" data-size-food-cost>
            {formatBps(costing.foodCostBps)}
          </span>
        )}
        {state === 'NONE' ? <Badge tone="grey">{t('inventory.recipes.status.NONE')}</Badge> : costing.level ? <Badge tone={LEVEL_TONE[costing.level]}>{t(`inventory.recipes.level.${costing.level}`)}</Badge> : null}
        {state === 'DRAFT' && <Badge tone="amber">{t('inventory.recipes.status.DRAFT')}</Badge>}
      </span>
    </>
  );
  return (
    <li data-size-line={name}>
      {onOpen ? (
        <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 py-2 transition-colors hover:bg-brand-soft/30">
          {content}
        </button>
      ) : (
        <div className="flex min-h-14 items-center gap-3 py-2">{content}</div>
      )}
    </li>
  );
}

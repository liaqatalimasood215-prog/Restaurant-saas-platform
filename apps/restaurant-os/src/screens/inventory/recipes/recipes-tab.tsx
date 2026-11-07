'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CakeSlice, ChefHat, ChevronLeft, CircleCheck, CircleX, Layers, LayoutGrid, List, Pencil, Percent, Plus, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import { formatBps, formatPaisa, summarizeFoodCost, type FoodCost, type MenuRecipeRow, type RecipesView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { bookOf, stateOf, type RecipeState } from './recipe-draft';
import { CookedCard, LatestPurchase, PreparedCard, cookedDishes, dishState, type CardLayout, type CookedDish, type DishState } from './cooked-card';
import { RecipeBuilder, type EditorSubject } from './recipe-builder';
import { LEVEL_TONE } from './recipe-lines';

type Section = 'menu' | 'addons' | 'prepared';
/** Prepared items: everything, cooked food by its stock state, or the other prepared items (dough, sauces) */
type PreparedFilter = 'ALL' | DishState | 'OTHER';
const PREPARED_FILTERS: PreparedFilter[] = ['ALL', 'OK', 'SHORT', 'OUT', 'OTHER'];
const FILTER_ICON: Record<PreparedFilter, LucideIcon> = { ALL: Layers, OK: CircleCheck, SHORT: TriangleAlert, OUT: CircleX, OTHER: CakeSlice };
const FILTER_TONE: Record<PreparedFilter, string> = { ALL: 'text-blue-600', OK: 'text-green-600', SHORT: 'text-amber-600', OUT: 'text-red-600', OTHER: 'text-brand' };
/** The four summary cards of the owner's picture */
const STAT_CARDS: { key: 'ALL' | DishState; icon: LucideIcon; tone: { card: string; icon: string } }[] = [
  { key: 'ALL', icon: Layers, tone: { card: 'border-blue-100 bg-blue-50/60', icon: 'bg-blue-100 text-blue-600' } },
  { key: 'OK', icon: CircleCheck, tone: { card: 'border-green-100 bg-green-50/60', icon: 'bg-green-100 text-green-600' } },
  { key: 'SHORT', icon: TriangleAlert, tone: { card: 'border-amber-100 bg-amber-50/70', icon: 'bg-amber-100 text-amber-600' } },
  { key: 'OUT', icon: CircleX, tone: { card: 'border-red-100 bg-red-50/60', icon: 'bg-red-100 text-red-600' } },
];
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
  // null = the Recipes overview; a chosen section takes the whole screen (owner, 2026-11-08: open it fully, no scrolling)
  const [section, setSection] = useState<Section | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<EditingRef | null>(null);
  const [preparedFilter, setPreparedFilter] = useState<PreparedFilter>('ALL');
  const [preparedQuery, setPreparedQuery] = useState('');
  const [preparedLayout, setPreparedLayout] = useState<CardLayout>('grid');
  // The builder and an open section take the whole screen: the Inventory title and sections step aside while one is open.
  useEffect(() => {
    onBuilder?.(editing !== null || section !== null);
    if (editing || section) window.scrollTo({ top: 0 });
  }, [editing, section, onBuilder]);
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
  const preparedCount = (f: PreparedFilter) =>
    f === 'ALL' ? view.prepared.length : f === 'OTHER' ? view.prepared.length - dishes.length : dishes.filter((d) => dishState(d) === f).length;
  const showPrepared = (dish: CookedDish | undefined) =>
    preparedFilter === 'ALL' || (preparedFilter === 'OTHER' ? !dish : dish !== undefined && dishState(dish) === preparedFilter);
  // Search by the dish or its main raw ingredient ("dal" finds Cooked Daal Mash only by "daal"; "rice" finds Biryani too)
  const pq = preparedQuery.trim().toLowerCase();
  const shownPrepared = view.prepared
    .map((row) => ({ row, dish: dishes.find((d) => d.row.ingredient.id === row.ingredient.id) }))
    .filter(({ row, dish }) => showPrepared(dish) && (!pq || row.ingredient.name.toLowerCase().includes(pq) || Boolean(dish?.main.name.toLowerCase().includes(pq))));

  return (
    <div className="space-y-4">
      {section === null && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Summary icon={BookOpen} tone="bg-brand-soft text-brand" label={t('inventory.recipes.summary.items')} value={t('inventory.recipes.summary.ofTotal', { n: summary.itemsWithRecipe, of: summary.items })} />
            <Summary icon={CircleCheck} tone="bg-green-50 text-green-700" label={t('inventory.recipes.summary.verified')} value={t('inventory.recipes.summary.ofTotal', { n: summary.verified, of: summary.recipes })} />
            <Summary icon={Percent} tone="bg-slate-100 text-slate-700" label={t('inventory.recipes.summary.average')} value={summary.averageBps === null ? '—' : formatBps(summary.averageBps)} hint={t('inventory.recipes.summary.averageHint')} />
            <Summary icon={TriangleAlert} tone="bg-red-50 text-red-700" label={t('inventory.recipes.summary.high')} value={String(summary.high)} hint={t('inventory.recipes.summary.highHint')} />
          </div>
          <p className="text-sm text-slate-600">{t('inventory.recipes.sections.openHint')}</p>
        </>
      )}

      <div
        className={cn('flex flex-wrap items-center gap-2', section !== null && 'rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_4px_18px_-10px_rgb(15_23_42/0.18)]')}
        data-recipes-bar={section ?? 'overview'}
      >
        {section !== null && (
          <button
            type="button"
            onClick={() => setSection(null)}
            className="press flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-brand hover:bg-brand-soft"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t('inventory.recipes.sections.back')}
          </button>
        )}
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
        <div className="space-y-3" data-prepared-section>
          {/* Owner's picture (2026-11-08): red title bar, four summary cards, chips + search + view, compact cards */}
          <div className="bg-brand-gradient flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-white shadow-brand sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <ChefHat className="size-7 shrink-0" aria-hidden />
              <div className="min-w-0">
                <h2 className="text-lg leading-tight font-extrabold sm:text-xl">{t('inventory.recipes.cooked.title')}</h2>
                <p className="text-sm text-white/85">{t('inventory.recipes.cooked.subtitle')}</p>
              </div>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditing({ kind: 'PREPARED', ingredientId: null })}
                className="press flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-brand shadow-sm"
              >
                <Plus className="size-4" aria-hidden />
                {t('inventory.recipes.cooked.addRecipe')}
              </button>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-prepared-stats>
            {STAT_CARDS.map(({ key, icon: Icon, tone }) => (
              <div key={key} className={cn('flex items-center gap-3 rounded-2xl border px-3 py-2.5', tone.card)}>
                <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', tone.icon)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <dt className="truncate text-sm font-semibold text-slate-700">{t(`inventory.recipes.cooked.stats.${key}`)}</dt>
                  <dd className="text-2xl leading-tight font-black tabular-nums text-slate-900" data-stat={key}>
                    {preparedCount(key)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('inventory.recipes.cooked.filterLabel')} data-prepared-filters>
              {PREPARED_FILTERS.map((f) => {
                const Icon = FILTER_ICON[f];
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPreparedFilter(f)}
                    aria-pressed={preparedFilter === f}
                    className={cn(
                      'press flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-bold',
                      preparedFilter === f ? 'bg-brand-gradient border-transparent text-white shadow-brand' : 'border-slate-200 bg-white text-slate-700 hover:border-brand/40',
                    )}
                  >
                    <Icon className={cn('size-4', preparedFilter !== f && FILTER_TONE[f])} aria-hidden />
                    {t(`inventory.recipes.cooked.filter.${f}`)} ({preparedCount(f)})
                  </button>
                );
              })}
            </div>
            <label className="relative ml-auto flex min-w-48 flex-1 items-center sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 size-4 text-slate-400" aria-hidden />
              <input
                type="search"
                value={preparedQuery}
                onChange={(e) => setPreparedQuery(e.target.value)}
                placeholder={t('inventory.recipes.cooked.search')}
                aria-label={t('inventory.recipes.cooked.searchLabel')}
                className="min-h-10 w-full rounded-full border border-slate-200 bg-white pr-3 pl-9 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setPreparedLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
              aria-label={preparedLayout === 'grid' ? t('inventory.recipes.cooked.viewList') : t('inventory.recipes.cooked.viewGrid')}
              title={preparedLayout === 'grid' ? t('inventory.recipes.cooked.viewList') : t('inventory.recipes.cooked.viewGrid')}
              className="press bg-brand-gradient grid size-10 place-items-center rounded-xl text-white shadow-brand"
              data-prepared-layout={preparedLayout}
            >
              {preparedLayout === 'grid' ? <LayoutGrid className="size-5" aria-hidden /> : <List className="size-5" aria-hidden />}
            </button>
          </div>

          <LatestPurchase view={view} book={book} dishes={dishes} />

          {shownPrepared.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
              {t('inventory.recipes.cooked.noMatch', { q: preparedQuery.trim() })}
            </p>
          ) : (
            <ul className={cn('grid grid-cols-1 items-start gap-3', preparedLayout === 'grid' && 'md:grid-cols-2 lg:grid-cols-3')}>
              {shownPrepared.map(({ row, dish }) => {
                const edit = () => setEditing({ kind: 'PREPARED', ingredientId: row.ingredient.id });
                return (
                  <li key={row.ingredient.id} data-prepared-item={row.ingredient.name}>
                    {dish ? (
                      <CookedCard
                        dish={dish}
                        sharedWith={dishes.filter((d) => d !== dish && d.main.id === dish.main.id).map((d) => d.row.ingredient.name)}
                        byId={byId}
                        canManage={canManage}
                        onEdit={edit}
                        layout={preparedLayout}
                      />
                    ) : (
                      <PreparedCard row={row} canManage={canManage} onEdit={edit} layout={preparedLayout} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {dishes.some((d) => dishes.some((o) => o !== d && o.main.id === d.main.id)) && (
            <p className="text-xs text-slate-500" data-shared-note>
              {t('inventory.recipes.cooked.sharedNote')}
            </p>
          )}
          {dishes.length > 0 && <p className="text-xs text-slate-500">{t('inventory.recipes.cooked.note')}</p>}
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

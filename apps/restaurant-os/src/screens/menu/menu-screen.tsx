'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, LayoutList, Pencil, Plus, Puzzle, Search, Tags, Trash2 } from 'lucide-react';
import type { MenuItem, MenuSetup } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { ProductArt } from '../pos/product-art';
import { MenuItemDialog } from './menu-item-dialog';
import { Switch } from '@/components/ui/switch';
import { AddonGroupsPanel, CategoriesPanel, priceText } from './menu-parts';

type Tab = 'items' | 'categories' | 'addons';
type StockFilter = 'ALL' | 'AVAILABLE' | 'OUT' | 'NOT_ONLINE';
const ALL = 'ALL';
const RECIPE_TONE = { NONE: 'grey', DRAFT: 'amber', VERIFIED: 'green' } as const;
const recipeLink = (menuItemId: string) => `/inventory?recipe=${encodeURIComponent(menuItemId)}`;

/**
 * Menu (Preview 5, MASTER_PROMPT.md §7.1): categories, items with one price or sizes, add-on groups,
 * kitchen station, unit, in stock and online. Changes reach POS, Waiter Orders and the kitchen at once;
 * old bills keep their own copies of names and prices. Owner and Manager (permission menu.manage).
 */
export function MenuScreen() {
  const { allowed } = useSession();
  const setup = useApiQuery(() => getApi().getMenuSetup(), []);
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('items');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [stock, setStock] = useState<StockFilter>('ALL');
  const [size, setSize] = useState(ALL);
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  const [removing, setRemoving] = useState<MenuItem | null>(null);
  /** A product just added: offer its recipe now (owner's integration brief, 2026-11-08) */
  const [added, setAdded] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const canManage = allowed('menu.manage');
  const canStock = allowed('item.outOfStock');
  const canRecipes = allowed('inventory.manage');

  const header = (
    <ScreenHeader
      title={t('nav.menu')}
      status="DEMO_PROTOTYPE"
      description={t('menuSetup.description')}
      actions={
        canManage && (
          <Button onClick={() => setEditing('new')} disabled={!setup.data || setup.data.categories.length === 0}>
            <Plus className="size-5" aria-hidden />
            {t('menuSetup.item.add')}
          </Button>
        )
      }
    />
  );
  if (setup.loading && !setup.data) return (<>{header}<LoadingState /></>);
  if (!setup.data) return (<>{header}<ErrorState message={setup.error?.message} onRetry={setup.reload} /></>);
  const data: MenuSetup = setup.data;

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await work();
    } catch (err) {
      toast.show({ tone: 'error', title: err instanceof Error ? err.message : t('states.errorBody') });
    } finally {
      setBusy(false);
    }
  };

  const categoryOf = (id: string) => data.categories.find((c) => c.category.id === id)?.category;
  const stationName = (id: string) => data.stations.find((s) => s.id === id)?.name ?? '';
  const q = query.trim().toLowerCase();
  // A category removed in another tab falls back to the whole menu.
  const selected = categoryOf(category) ?? null;
  const inCategory = selected ? data.items.filter((i) => i.categoryId === selected.id) : data.items;
  const sizes = [...new Set(inCategory.flatMap((i) => i.variants.map((v) => v.name)))];
  const visible = inCategory.filter(
    (i) =>
      (size === ALL || !sizes.includes(size) || i.variants.some((v) => v.name === size)) &&
      (stock === 'ALL' || (stock === 'AVAILABLE' && i.isAvailable) || (stock === 'OUT' && !i.isAvailable) || (stock === 'NOT_ONLINE' && !i.isOnline)) &&
      (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
  );
  // Tapping a card shows everything in it, whatever was searched before.
  const chooseCategory = (id: string) => {
    setCategory(id);
    setQuery('');
    setStock('ALL');
    setSize(ALL);
  };
  const itemCount = (n: number) => (n === 1 ? t('menuSetup.oneItem') : t('menuSetup.manyItems', { n }));
  // Items in category order, then their own order.
  const categoryRank = (id: string) => data.categories.findIndex((c) => c.category.id === id);
  visible.sort((a, b) => categoryRank(a.categoryId) - categoryRank(b.categoryId) || a.sort - b.sort);

  const tabButton = (value: Tab, label: string, Icon: typeof Tags) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={cn('flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold', tab === value ? 'bg-white text-brand shadow-sm' : 'text-slate-600 hover:text-slate-900')}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
  const select = 'min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700';
  const categoryCard = (id: string, name: string, count: number, hidden = false) => (
    <button
      key={id}
      type="button"
      aria-pressed={(selected?.id ?? ALL) === id}
      onClick={() => chooseCategory(id)}
      data-menu-category={name}
      className={cn(
        'flex min-h-20 w-40 shrink-0 items-center gap-2 rounded-2xl border-2 bg-white p-2.5 text-left shadow-sm transition-colors sm:w-auto',
        (selected?.id ?? ALL) === id ? 'border-brand bg-brand-soft' : 'border-transparent hover:border-slate-300',
        hidden && 'opacity-70',
      )}
    >
      <ProductArt name={name} categoryName={name} className="size-12 shrink-0 rounded-full" emojiClassName="text-2xl" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-extrabold leading-tight text-slate-900">{name}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">
          {itemCount(count)}
          {hidden && ` · ${t('menuSetup.hidden')}`}
        </span>
      </span>
    </button>
  );

  return (
    <>
      {header}
      <div role="tablist" aria-label={t('nav.menu')} className="mb-4 inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
        {tabButton('items', t('menuSetup.tabs.items', { n: data.items.length }), LayoutList)}
        {tabButton('categories', t('menuSetup.tabs.categories', { n: data.categories.length }), Tags)}
        {tabButton('addons', t('menuSetup.tabs.addons', { n: data.addonGroups.length }), Puzzle)}
      </div>

      {tab === 'categories' && <CategoriesPanel setup={data} canManage={canManage} />}
      {tab === 'addons' && <AddonGroupsPanel setup={data} canManage={canManage} />}
      {tab === 'items' && (
        <>
        {added && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft/60 px-4 py-3" data-recipe-prompt={added.name}>
            <BookOpen className="size-5 shrink-0 text-brand" aria-hidden />
            <p className="min-w-48 flex-1 text-sm text-slate-800">
              <span className="font-extrabold text-slate-900">{t('menuSetup.recipe.askTitle', { name: added.name })}</span> {t('menuSetup.recipe.askBody')}
            </p>
            <Button variant="ghost" onClick={() => setAdded(null)}>
              {t('menuSetup.recipe.later')}
            </Button>
            <Button onClick={() => router.push(recipeLink(added.id))}>{t('menuSetup.recipe.addNow')}</Button>
          </div>
        )}
        <div role="group" aria-label={t('menuSetup.categoryCards')} className="mb-4 flex gap-3 overflow-x-auto p-0.5 pb-1.5 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] sm:overflow-visible">
          {categoryCard(ALL, t('menuSetup.allMenu'), data.items.length)}
          {data.categories.map(({ category: c }) => categoryCard(c.id, c.name, data.items.filter((i) => i.categoryId === c.id).length, !c.isActive))}
        </div>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
            <div className="mr-2 flex min-w-40 items-center gap-3">
              <ProductArt name={selected?.name ?? t('menuSetup.allMenu')} categoryName={selected?.name ?? ''} className="size-11 shrink-0 rounded-full" emojiClassName="text-2xl" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-extrabold text-slate-900" data-menu-heading>{selected?.name ?? t('menuSetup.allMenu')}</h2>
                <p className="text-xs font-semibold text-slate-500">{itemCount(inCategory.length)}</p>
              </div>
            </div>
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={selected ? t('menuSetup.searchIn', { name: selected.name }) : t('menuSetup.search')}
                aria-label={selected ? t('menuSetup.searchIn', { name: selected.name }) : t('menuSetup.search')}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
              />
            </label>
            {sizes.length > 0 && (
              <select value={sizes.includes(size) ? size : ALL} onChange={(e) => setSize(e.target.value)} aria-label={t('menuSetup.sizeFilter')} className={select}>
                <option value={ALL}>{t('menuSetup.allSizes')}</option>
                {sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            <select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} aria-label={t('menuSetup.stockFilter')} className={select}>
              {(['ALL', 'AVAILABLE', 'OUT', 'NOT_ONLINE'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`menuSetup.stock.${s}`)}
                </option>
              ))}
            </select>
            <span className="ml-auto text-sm font-semibold text-slate-500" data-menu-count>{t('menuSetup.count', { n: visible.length, of: inCategory.length })}</span>
          </div>
          {visible.length === 0 ? (
            <div className="p-4">
              <EmptyState title={t('menuSetup.noMatch')} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((item) => {
                const cat = categoryOf(item.categoryId);
                const recipe = data.recipes?.[item.id];
                return (
                  <li key={item.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2.5 lg:grid lg:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1.15fr)_10.5rem_5.75rem]', !cat?.isActive && 'bg-slate-50/70')} data-menu-item={item.name}>
                    <ProductArt name={item.name} categoryName={cat?.name ?? ''} className="size-14 shrink-0 rounded-xl" emojiClassName="text-3xl" />
                    <div className="min-w-48 flex-1 lg:min-w-0">
                      <p className="font-bold text-slate-900">
                        {canManage ? (
                          <button type="button" onClick={() => setEditing(item)} className="text-left hover:text-brand hover:underline">
                            {item.name}
                          </button>
                        ) : (
                          item.name
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {!selected && `${cat?.name ?? ''}${cat && !cat.isActive ? ` (${t('menuSetup.hidden')})` : ''} · `}
                        {stationName(item.stationId)}
                        {item.unit !== 'piece' && ` · ${t('menuSetup.perUnit', { unit: t(`menuSetup.units.${item.unit}`) })}`}
                      </p>
                      {item.description && <p className="truncate text-xs text-slate-500">{item.description}</p>}
                      {recipe && (
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs" data-menu-recipe={recipe.state}>
                          <Badge tone={RECIPE_TONE[recipe.state]}>{t(`menuSetup.recipe.state.${recipe.state}`)}</Badge>
                          {recipe.preparedName && <span className="font-semibold text-slate-600">{t('menuSetup.recipe.from', { name: recipe.preparedName })}</span>}
                          {canRecipes && (
                            <Link
                              href={recipeLink(item.id)}
                              aria-label={t(recipe.state === 'NONE' ? 'menuSetup.recipe.addFor' : 'menuSetup.recipe.openFor', { name: item.name })}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 font-bold text-brand hover:bg-brand-soft"
                            >
                              <BookOpen className="size-3.5" aria-hidden />
                              {recipe.state === 'NONE' ? t('menuSetup.recipe.add') : t('menuSetup.recipe.open')}
                            </Link>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="min-w-40 text-sm font-extrabold text-slate-900 lg:min-w-0">
                      {priceText(item)}
                      {item.modifierGroupIds.length > 0 && (
                        <p className="text-xs font-semibold text-slate-500">
                          {t('menuSetup.withAddons', { list: data.addonGroups.filter((g) => item.modifierGroupIds.includes(g.group.id)).map((g) => g.group.name).join(', ') })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Switch compact checked={item.isAvailable} disabled={!canStock || busy} onChange={(on) => void run(() => getApi().setItemAvailable(item.id, on))} label={t('menuSetup.item.availableFor', { name: item.name })} />
                        <Badge tone={item.isAvailable ? 'green' : 'red'}>{item.isAvailable ? t('menuSetup.inStock') : t('menuSetup.outOfStock')}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch compact checked={item.isOnline} disabled={!canManage || busy} onChange={(on) => void run(() => getApi().setItemOnline(item.id, on))} label={t('menuSetup.item.onlineFor', { name: item.name })} />
                        <Badge tone={item.isOnline ? 'blue' : 'grey'}>{item.isOnline ? t('menuSetup.online') : t('menuSetup.notOnline')}</Badge>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => setEditing(item)} className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label={t('menuSetup.item.edit', { name: item.name })}>
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button type="button" onClick={() => setRemoving(item)} className="grid size-11 place-items-center rounded-xl text-red-700 hover:bg-red-50" aria-label={t('menuSetup.item.remove', { name: item.name })}>
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        </>
      )}
      <p className="mt-3 text-xs text-slate-500">{t('menuSetup.note')}</p>

      {editing && (
        <MenuItemDialog
          setup={data}
          item={editing === 'new' ? null : editing}
          defaultCategoryId={selected?.id ?? null}
          canStock={canStock}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            const isNew = editing === 'new';
            setEditing(null);
            toast.show({ tone: 'success', title: t('menuSetup.item.saved', { name: saved.name }) });
            if (isNew && canRecipes) setAdded(saved);
          }}
        />
      )}
      {removing && (
        <Dialog
          open
          onClose={() => setRemoving(null)}
          title={t('menuSetup.item.removeTitle', { name: removing.name })}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                {t('menuSetup.cancel')}
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await getApi().removeMenuItem(removing.id);
                    toast.show({ tone: 'success', title: t(result === 'ARCHIVED' ? 'menuSetup.item.archived' : 'menuSetup.item.deleted', { name: removing.name }) });
                    setRemoving(null);
                  })
                }
              >
                {t('menuSetup.delete')}
              </Button>
            </>
          }
        >
          {t('menuSetup.item.removeBody', { name: removing.name })}
        </Dialog>
      )}
    </>
  );
}

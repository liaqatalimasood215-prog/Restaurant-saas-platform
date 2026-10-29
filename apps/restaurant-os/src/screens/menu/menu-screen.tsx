'use client';

import { useState } from 'react';
import { LayoutList, Pencil, Plus, Puzzle, Search, Tags, Trash2 } from 'lucide-react';
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
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null);
  const [removing, setRemoving] = useState<MenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const canManage = allowed('menu.manage');
  const canStock = allowed('item.outOfStock');

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
  const visible = data.items.filter(
    (i) =>
      (category === ALL || i.categoryId === category) &&
      (stock === 'ALL' || (stock === 'AVAILABLE' && i.isAvailable) || (stock === 'OUT' && !i.isAvailable) || (stock === 'NOT_ONLINE' && !i.isOnline)) &&
      (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)),
  );
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
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('menuSetup.search')}
                aria-label={t('menuSetup.search')}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
              />
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('menuSetup.item.category')} className={select}>
              <option value={ALL}>{t('menuSetup.allCategories')}</option>
              {data.categories.map(({ category: c }) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} aria-label={t('menuSetup.stockFilter')} className={select}>
              {(['ALL', 'AVAILABLE', 'OUT', 'NOT_ONLINE'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`menuSetup.stock.${s}`)}
                </option>
              ))}
            </select>
            <span className="ml-auto text-sm font-semibold text-slate-500">{t('menuSetup.count', { n: visible.length, of: data.items.length })}</span>
          </div>
          {visible.length === 0 ? (
            <div className="p-4">
              <EmptyState title={t('menuSetup.noMatch')} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((item) => {
                const cat = categoryOf(item.categoryId);
                return (
                  <li key={item.id} className={cn('flex flex-wrap items-center gap-3 px-3 py-2.5', !cat?.isActive && 'bg-slate-50/70')} data-menu-item={item.name}>
                    <ProductArt name={item.name} categoryName={cat?.name ?? ''} className="size-14 shrink-0 rounded-xl" emojiClassName="text-3xl" />
                    <div className="min-w-48 flex-1">
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
                        {cat?.name}
                        {cat && !cat.isActive && ` (${t('menuSetup.hidden')})`} · {stationName(item.stationId)}
                        {item.unit !== 'piece' && ` · ${t('menuSetup.perUnit', { unit: t(`menuSetup.units.${item.unit}`) })}`}
                      </p>
                      {item.description && <p className="truncate text-xs text-slate-500">{item.description}</p>}
                    </div>
                    <div className="min-w-40 text-sm font-extrabold text-slate-900">
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
      )}
      <p className="mt-3 text-xs text-slate-500">{t('menuSetup.note')}</p>

      {editing && (
        <MenuItemDialog
          setup={data}
          item={editing === 'new' ? null : editing}
          defaultCategoryId={category === ALL ? null : category}
          canStock={canStock}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            toast.show({ tone: 'success', title: t('menuSetup.item.saved', { name: saved.name }) });
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

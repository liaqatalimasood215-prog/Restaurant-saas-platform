'use client';

import { useState, useSyncExternalStore } from 'react';
import { BookOpen, Boxes, CalendarDays, ChartColumn, ClipboardCheck, History, LayoutDashboard, ListChecks, PackageCheck, Pencil, Plus, ShoppingCart, SlidersHorizontal, Trash2, type LucideIcon } from 'lucide-react';
import type { IngredientRow } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { t, tList, type ListKey, type MessageKey } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { IngredientDialog } from './ingredient-dialog';
import { IngredientsTab, type IngredientFilter } from './ingredients-tab';
import { MovementsTab } from './movements-tab';
import { OverviewTab } from './overview-tab';
import { RecipesTab } from './recipes/recipes-tab';
import { SuppliersTab } from './suppliers-tab';
import { CookingPlanTab } from './cooking-plan-tab';
import { AvailableFoodTab } from './available-food-tab';

/** Five clear sections (owner's second Inventory brief, 2026-11-04); Stock has its own sub-sections. */
type Section = 'overview' | 'stock' | 'recipes' | 'purchasing' | 'reports';
type StockTab = 'ingredients' | 'movements' | 'cooking' | 'food' | 'wastage' | 'counts';

/** Owner's order (2026-11-06): Suppliers first, then Stock and Recipes; Inventory opens on the first one. */
const SECTIONS: { key: Section; icon: LucideIcon; phase?: number }[] = [
  { key: 'purchasing', icon: ShoppingCart },
  { key: 'stock', icon: Boxes },
  { key: 'recipes', icon: BookOpen },
  { key: 'overview', icon: LayoutDashboard },
  { key: 'reports', icon: ChartColumn, phase: 6 },
];
const STOCK_TABS: { key: StockTab; icon: LucideIcon; phase?: number }[] = [
  { key: 'ingredients', icon: ListChecks },
  { key: 'movements', icon: History },
  { key: 'cooking', icon: CalendarDays },
  { key: 'food', icon: PackageCheck },
  { key: 'wastage', icon: Trash2, phase: 4 },
  { key: 'counts', icon: ClipboardCheck, phase: 4 },
];

/**
 * Inventory & Suppliers (DEMO): Overview, Stock (Ingredients, Stock Movements), Recipes & Food Cost, and the
 * sections that later inventory phases build (Purchasing, Reports, Wastage, Counts), each with a clear placeholder.
 * Stock is the sum of stock movements; a change is a correction with a reason. Owner / Manager.
 */
export function InventoryScreen({
  recipeItemId,
  cookingDate,
  foodReview,
}: {
  recipeItemId?: string;
  /** I3: open the Cooking Plan of this date (from the alert) */
  cookingDate?: string;
  /** I4: open Available Food (the closing review alert) */
  foodReview?: boolean;
} = {}) {
  const { allowed } = useSession();
  const inventory = useApiQuery(() => getApi().getInventory(), []);
  const order = useSectionOrder();
  // Opened from the Menu with a product's recipe: Recipes first
  const [chosen, setSection] = useState<Section | null>(recipeItemId ? 'recipes' : cookingDate || foodReview ? 'stock' : null);
  /** I3: a supplier's draft bill opened from the Cooking Plan */
  const [billFor, setBillFor] = useState<string | null>(null);
  // Inventory opens on the first section of his order.
  const section = chosen ?? order[0]!;
  /** Edit order: the sections he has tapped so far, in that order */
  const [picking, setPicking] = useState<Section[] | null>(null);
  const finishPicking = (next: Section[] | null) => {
    if (next) saveSectionOrder([...next, ...order.filter((k) => !next.includes(k))]);
    setPicking(null);
  };
  const [stockTab, setStockTab] = useState<StockTab>(cookingDate ? 'cooking' : foodReview ? 'food' : 'ingredients');
  const [filter, setFilter] = useState<IngredientFilter>('ALL');
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [editing, setEditing] = useState<IngredientRow | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<IngredientRow | 'pick' | null>(null);
  /** The Recipe Builder takes the whole screen (owner's picture) */
  const [building, setBuilding] = useState(false);
  /** A purchase bill is open: it takes the whole screen like the Recipe Builder */
  const [billing, setBilling] = useState(false);
  const canManage = allowed('inventory.manage');
  const openStock = (tab: StockTab) => {
    setSection('stock');
    setStockTab(tab);
  };

  const actions = canManage ? (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setAdjusting('pick')}>
        <SlidersHorizontal className="size-4" aria-hidden />
        {t('inventory.actions.adjust')}
      </Button>
      <Button onClick={() => setEditing('new')}>
        <Plus className="size-4" aria-hidden />
        {t('inventory.actions.add')}
      </Button>
    </div>
  ) : undefined;
  const header = <ScreenHeader icon={Boxes} title={t('nav.inventory')} status="DEMO_PROTOTYPE" description={t('inventory.description')} actions={actions} />;

  if (inventory.loading && !inventory.data) return (<>{header}<LoadingState /></>);
  if (!inventory.data) return (<>{header}<ErrorState message={inventory.error?.message} onRetry={inventory.reload} /></>);
  const view = inventory.data;

  return (
    <>
      {!building && !billing && header}
      <div role="tablist" aria-label={t('inventory.sections.label')} hidden={building || billing} className="mb-4 flex overflow-x-auto rounded-2xl border border-slate-200 bg-white px-1 shadow-sm">
        {order.map((key) => SECTIONS.find((s) => s.key === key)!).map(({ key, icon: Icon, phase }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => (picking ? setPicking(picking.includes(key) ? picking.filter((k) => k !== key) : [...picking, key]) : setSection(key))}
            className={cn(
              'flex min-h-14 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors',
              section === key ? 'border-brand text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900',
            )}
          >
            <Icon className={cn('size-5', section === key && 'text-brand')} aria-hidden />
            {t(`inventory.sections.${key}`)}
            {phase && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{t('inventory.soonChip')}</span>}
            {picking?.includes(key) && (
              <span className="bg-brand-gradient grid size-6 place-items-center rounded-full text-xs font-black text-white" data-order-number>
                {picking.indexOf(key) + 1}
              </span>
            )}
          </button>
        ))}
        {!picking && (
          <button type="button" onClick={() => setPicking([])} className="press my-2 ml-auto flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-brand">
            <Pencil className="size-4" aria-hidden />
            {t('inventory.sections.edit')}
          </button>
        )}
      </div>
      {picking && !building && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-brand/30 bg-brand-soft/60 px-4 py-3" data-order-editor>
          <p className="min-w-48 flex-1 text-sm font-semibold text-slate-800">{t('inventory.sections.editHint')}</p>
          <Button variant="ghost" onClick={() => finishPicking(null)}>
            {t('inventory.form.cancel')}
          </Button>
          <Button variant="secondary" onClick={() => (saveSectionOrder(DEFAULT_ORDER), setPicking(null))}>
            {t('inventory.sections.reset')}
          </Button>
          <Button onClick={() => finishPicking(picking)} disabled={picking.length === 0}>
            {t('inventory.sections.done')}
          </Button>
        </div>
      )}

      {section === 'overview' && (
        <OverviewTab
          view={view}
          onOpen={(next) => {
            setFilter(next);
            openStock('ingredients');
          }}
          onOpenRecipes={() => setSection('recipes')}
          onOpenSuppliers={() => setSection('purchasing')}
          onOpenCooking={() => openStock('cooking')}
          onOpenFood={() => openStock('food')}
          onOpenMovements={() => {
            setHistoryOf(null);
            openStock('movements');
          }}
        />
      )}

      {section === 'stock' && (
        <div className="space-y-4">
          <div role="tablist" aria-label={t('inventory.stockTabs.label')} className="flex flex-wrap gap-2">
            {STOCK_TABS.map(({ key, icon: Icon, phase }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={stockTab === key}
                onClick={() => setStockTab(key)}
                className={cn(
                  'press flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold',
                  stockTab === key ? 'border-brand bg-brand bg-brand-gradient text-white shadow-brand' : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-brand-soft/50',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(`inventory.stockTabs.${key}`)}
                {phase && <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase', stockTab === key ? 'bg-white/20' : 'bg-slate-100 text-slate-500')}>{t('inventory.soonChip')}</span>}
              </button>
            ))}
          </div>
          {stockTab === 'ingredients' && (
            <IngredientsTab
              view={view}
              filter={filter}
              onFilter={setFilter}
              canManage={canManage}
              onEdit={setEditing}
              onAdjust={setAdjusting}
              onHistory={(row) => {
                setHistoryOf(row.ingredient.id);
                setStockTab('movements');
              }}
            />
          )}
          {stockTab === 'movements' && <MovementsTab key={historyOf ?? 'all'} view={view} ingredientId={historyOf} />}
          {stockTab === 'cooking' && (
            <CookingPlanTab
              canManage={canManage}
              initialDate={cookingDate}
              onOpenBill={(supplierId) => {
                setBillFor(supplierId);
                setSection('purchasing');
              }}
            />
          )}
          {stockTab === 'food' && <AvailableFoodTab canManage={canManage} />}
          {stockTab === 'wastage' && <PlannedPanel icon={Trash2} title="inventory.planned.wastage.title" items="inventory.planned.wastage.items" phase={4} />}
          {stockTab === 'counts' && <PlannedPanel icon={ClipboardCheck} title="inventory.planned.counts.title" items="inventory.planned.counts.items" phase={4} />}
        </div>
      )}

      {section === 'recipes' && <RecipesTab canManage={canManage} onBuilder={setBuilding} openItemId={recipeItemId} />}
      {section === 'purchasing' && <SuppliersTab key={billFor ?? 'list'} canManage={canManage} onFocus={setBilling} openBill={billFor ?? undefined} />}
      {section === 'reports' && <PlannedPanel icon={ChartColumn} title="inventory.planned.reports.title" items="inventory.planned.reports.items" phase={6} />}

      {!building && !billing && <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">{t('inventory.demoNote')}</p>}

      {editing && <IngredientDialog row={editing === 'new' ? null : editing} view={view} onClose={() => setEditing(null)} />}
      {adjusting && <AdjustStockDialog row={adjusting === 'pick' ? null : adjusting} view={view} onClose={() => setAdjusting(null)} />}
    </>
  );
}

// ── The order of the sections (owner, 2026-11-06), kept in this browser ──────────────────────

const ORDER_KEY = 'lala-os-inventory-order';
const ORDER_EVENT = 'lala-os-inventory-order';
const DEFAULT_ORDER: Section[] = SECTIONS.map((s) => s.key);

function readOrder(): string | null {
  try {
    return window.localStorage.getItem(ORDER_KEY);
  } catch {
    return null;
  }
}

function subscribeOrder(onChange: () => void): () => void {
  window.addEventListener(ORDER_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(ORDER_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** His saved order when it still names every section exactly once, else the usual one. */
function useSectionOrder(): Section[] {
  const raw = useSyncExternalStore(subscribeOrder, readOrder, () => null);
  try {
    const saved = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(saved) && saved.length === DEFAULT_ORDER.length && DEFAULT_ORDER.every((k) => saved.includes(k))) return saved as Section[];
  } catch {
    // A broken saved order: the usual one.
  }
  return DEFAULT_ORDER;
}

function saveSectionOrder(order: Section[]): void {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // Storage blocked: the order lasts until the page reloads.
  }
  window.dispatchEvent(new Event(ORDER_EVENT));
}

/** A section a later inventory phase builds: what it will hold, labelled PLACEHOLDER (PROJECT_RULES.md §17). */
function PlannedPanel({ icon: Icon, title, items, phase }: { icon: LucideIcon; title: MessageKey; items: ListKey; phase: number }) {
  return (
    <Card className="mx-auto max-w-3xl p-6 text-center" data-planned={t(title)}>
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xl font-extrabold text-slate-900">
        {t(title)}
        <Badge tone="dark">{t('status.PLACEHOLDER')}</Badge>
      </h2>
      <p className="mt-1 text-sm font-semibold text-brand">{t('inventory.planned.phase', { n: phase })}</p>
      <ul className="mx-auto mt-4 max-w-xl space-y-2 text-left text-sm text-slate-700">
        {tList(items).map((item) => (
          <li key={item} className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { BookOpen, Boxes, ChartColumn, ClipboardCheck, History, LayoutDashboard, ListChecks, Plus, ShoppingCart, SlidersHorizontal, Trash2, type LucideIcon } from 'lucide-react';
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

/** Five clear sections (owner's second Inventory brief, 2026-11-04); Stock has its own sub-sections. */
type Section = 'overview' | 'stock' | 'recipes' | 'purchasing' | 'reports';
type StockTab = 'ingredients' | 'movements' | 'wastage' | 'counts';

const SECTIONS: { key: Section; icon: LucideIcon; phase?: number }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'stock', icon: Boxes },
  { key: 'recipes', icon: BookOpen },
  { key: 'purchasing', icon: ShoppingCart },
  { key: 'reports', icon: ChartColumn, phase: 6 },
];
const STOCK_TABS: { key: StockTab; icon: LucideIcon; phase?: number }[] = [
  { key: 'ingredients', icon: ListChecks },
  { key: 'movements', icon: History },
  { key: 'wastage', icon: Trash2, phase: 4 },
  { key: 'counts', icon: ClipboardCheck, phase: 4 },
];

/**
 * Inventory & Suppliers (DEMO): Overview, Stock (Ingredients, Stock Movements), Recipes & Food Cost, and the
 * sections that later inventory phases build (Purchasing, Reports, Wastage, Counts), each with a clear placeholder.
 * Stock is the sum of stock movements; a change is a correction with a reason. Owner / Manager.
 */
export function InventoryScreen() {
  const { allowed } = useSession();
  const inventory = useApiQuery(() => getApi().getInventory(), []);
  const [section, setSection] = useState<Section>('overview');
  const [stockTab, setStockTab] = useState<StockTab>('ingredients');
  const [filter, setFilter] = useState<IngredientFilter>('ALL');
  const [historyOf, setHistoryOf] = useState<string | null>(null);
  const [editing, setEditing] = useState<IngredientRow | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<IngredientRow | 'pick' | null>(null);
  /** The Recipe Builder takes the whole screen (owner's picture) */
  const [building, setBuilding] = useState(false);
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
      {!building && header}
      <div role="tablist" aria-label={t('inventory.sections.label')} hidden={building} className="mb-4 flex overflow-x-auto rounded-2xl border border-slate-200 bg-white px-1 shadow-sm">
        {SECTIONS.map(({ key, icon: Icon, phase }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={section === key}
            onClick={() => setSection(key)}
            className={cn(
              'flex min-h-14 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors',
              section === key ? 'border-brand text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900',
            )}
          >
            <Icon className={cn('size-5', section === key && 'text-brand')} aria-hidden />
            {t(`inventory.sections.${key}`)}
            {phase && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">{t('inventory.soonChip')}</span>}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <OverviewTab
          view={view}
          onOpen={(next) => {
            setFilter(next);
            openStock('ingredients');
          }}
          onOpenRecipes={() => setSection('recipes')}
          onOpenSuppliers={() => setSection('purchasing')}
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
          {stockTab === 'wastage' && <PlannedPanel icon={Trash2} title="inventory.planned.wastage.title" items="inventory.planned.wastage.items" phase={4} />}
          {stockTab === 'counts' && <PlannedPanel icon={ClipboardCheck} title="inventory.planned.counts.title" items="inventory.planned.counts.items" phase={4} />}
        </div>
      )}

      {section === 'recipes' && <RecipesTab canManage={canManage} onBuilder={setBuilding} />}
      {section === 'purchasing' && <SuppliersTab canManage={canManage} />}
      {section === 'reports' && <PlannedPanel icon={ChartColumn} title="inventory.planned.reports.title" items="inventory.planned.reports.items" phase={6} />}

      {!building && <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">{t('inventory.demoNote')}</p>}

      {editing && <IngredientDialog row={editing === 'new' ? null : editing} view={view} onClose={() => setEditing(null)} />}
      {adjusting && <AdjustStockDialog row={adjusting === 'pick' ? null : adjusting} view={view} onClose={() => setAdjusting(null)} />}
    </>
  );
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

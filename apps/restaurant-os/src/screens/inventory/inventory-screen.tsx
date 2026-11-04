'use client';

import { useState } from 'react';
import { Boxes, LayoutDashboard, ListChecks, Plus, SlidersHorizontal } from 'lucide-react';
import type { IngredientRow } from '@restaurant-saas/shared';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useSession } from '@/lib/session';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { IngredientDialog } from './ingredient-dialog';
import { IngredientsTab, type IngredientFilter } from './ingredients-tab';
import { OverviewTab } from './overview-tab';

type Tab = 'overview' | 'ingredients';

const TABS: { key: Tab; icon: typeof Boxes }[] = [
  { key: 'overview', icon: LayoutDashboard },
  { key: 'ingredients', icon: ListChecks },
];

/** The other sections of the approved plan, built one step at a time after the owner's approval. */
const NEXT_TABS = [
  ['recipes', 'B'],
  ['suppliers', 'C'],
  ['purchases', 'C'],
  ['wastage', 'D'],
  ['counts', 'D'],
  ['movements', 'D'],
  ['expenses', 'E'],
  ['reports', 'F'],
] as const;

/**
 * Inventory & Suppliers (owner's Smart Inventory brief 2026-11-04, Step A, DEMO): Overview dashboard and
 * Ingredients. Stock is the sum of stock movements; a change is a correction with a reason. Owner / Manager.
 */
export function InventoryScreen() {
  const { allowed } = useSession();
  const inventory = useApiQuery(() => getApi().getInventory(), []);
  const [tab, setTab] = useState<Tab>('overview');
  const [filter, setFilter] = useState<IngredientFilter>('ALL');
  const [editing, setEditing] = useState<IngredientRow | 'new' | null>(null);
  const [adjusting, setAdjusting] = useState<IngredientRow | 'pick' | null>(null);
  const canManage = allowed('inventory.manage');

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
      {header}
      <div className="mb-4 flex items-stretch overflow-x-auto rounded-2xl border border-slate-200 bg-white px-1 shadow-sm">
        <div role="tablist" aria-label={t('inventory.tabs.label')} className="flex shrink-0">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'flex min-h-14 shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-bold transition-colors',
                tab === key ? 'border-brand text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900',
              )}
            >
              <Icon className={cn('size-5', tab === key && 'text-brand')} aria-hidden />
              {t(`inventory.tabs.${key}`)}
            </button>
          ))}
        </div>
        {/* Planned sections: shown so the plan is visible, not clickable until their step is built. */}
        <div className="ml-2 flex shrink-0 items-center gap-1.5 border-l border-slate-100 py-2 pl-3 pr-2" aria-label={t('inventory.soonTabs')}>
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('inventory.soonTabs')}</span>
          {NEXT_TABS.map(([key, step]) => (
            <span key={key} className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-400" title={t('inventory.step', { step })}>
              {t(`inventory.tabs.${key}`)}
              <span className="rounded bg-slate-200/70 px-1 text-[10px] font-bold text-slate-500">{step}</span>
            </span>
          ))}
        </div>
      </div>

      {tab === 'overview' ? (
        <OverviewTab
          view={view}
          onOpen={(next) => {
            setFilter(next);
            setTab('ingredients');
          }}
        />
      ) : (
        <IngredientsTab view={view} filter={filter} onFilter={setFilter} canManage={canManage} onEdit={setEditing} onAdjust={setAdjusting} />
      )}

      <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">{t('inventory.demoNote')}</p>

      {editing && <IngredientDialog row={editing === 'new' ? null : editing} view={view} onClose={() => setEditing(null)} />}
      {adjusting && <AdjustStockDialog row={adjusting === 'pick' ? null : adjusting} view={view} onClose={() => setAdjusting(null)} />}
    </>
  );
}

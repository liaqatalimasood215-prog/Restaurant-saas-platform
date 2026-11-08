'use client';

import type { ReactNode } from 'react';
import {
  Boxes,
  CalendarClock,
  ChefHat,
  ChevronRight,
  HandCoins,
  History,
  PackageX,
  Percent,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  Wallet,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import { formatBps, formatPaisa, type InventoryView } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { t } from '@/i18n';
import { getApi } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { IngredientFilter } from './ingredients-tab';
import { STATUS_TONE, expiryLabel, stockText, whenText } from './inventory-format';

const TONES = {
  brand: 'bg-brand-soft text-brand',
  slate: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  orange: 'bg-orange-50 text-orange-700',
} as const;

/** Inventory dashboard: live cards (tap = the filtered list or Recipes), cards that later steps fill, and three short lists. */
export function OverviewTab({
  view,
  onOpen,
  onOpenRecipes,
  onOpenMovements,
  onOpenSuppliers,
  onOpenCooking,
}: {
  view: InventoryView;
  onOpen: (filter: IngredientFilter) => void;
  onOpenRecipes: () => void;
  onOpenMovements: () => void;
  onOpenSuppliers: () => void;
  /** I3: the Cooking Plan (what today's and tomorrow's cooking is short of) */
  onOpenCooking?: () => void;
}) {
  const { summary } = view;
  // Suppliers S1 fills today's purchases and what we owe the suppliers.
  const suppliers = useApiQuery(() => getApi().getSuppliers(), []).data;
  const attention = view.ingredients.filter((r) => r.status === 'LOW' || r.status === 'OUT').sort((a, b) => a.onHandMilli - b.onHandMilli);
  const expiring = view.ingredients
    .filter((r) => r.status !== 'NOT_IN_USE' && (r.expiry === 'SOON' || r.expiry === 'EXPIRED'))
    .sort((a, b) => (a.ingredient.expiryDate ?? '').localeCompare(b.ingredient.expiryDate ?? ''));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={Wallet} tone="brand" label={t('inventory.cards.stockValue')} value={formatPaisa(summary.stockValue)} hint={t('inventory.cardHints.stockValue')} onClick={() => onOpen('ALL')} />
        <StatCard icon={Boxes} tone="slate" label={t('inventory.cards.ingredients')} value={String(summary.ingredients)} hint={t('inventory.cardHints.ingredients')} onClick={() => onOpen('ALL')} />
        <StatCard icon={TriangleAlert} tone="amber" label={t('inventory.cards.low')} value={String(summary.low)} hint={t('inventory.cardHints.low')} onClick={() => onOpen('LOW')} />
        <StatCard icon={PackageX} tone="red" label={t('inventory.cards.out')} value={String(summary.out)} hint={t('inventory.cardHints.out')} onClick={() => onOpen('OUT')} />
        <StatCard
          icon={CalendarClock}
          tone="orange"
          label={t('inventory.cards.expiring')}
          value={String(summary.expiringSoon)}
          hint={summary.expired > 0 ? t('inventory.cardHints.expired', { n: summary.expired }) : t('inventory.cardHints.expiring', { days: view.expiringSoonDays })}
          alert={summary.expired > 0}
          onClick={() => onOpen('EXPIRING')}
        />
        {suppliers ? (
          <StatCard icon={ShoppingCart} tone="slate" label={t('inventory.cards.purchases')} value={formatPaisa(suppliers.todayPurchases)} hint={t('inventory.cardHints.purchases')} onClick={onOpenSuppliers} />
        ) : (
          <SoonCard icon={ShoppingCart} label={t('inventory.cards.purchases')} step="3" />
        )}
        {view.cookingShort && onOpenCooking && (
          <StatCard
            icon={CalendarDays}
            tone={view.cookingShort.tomorrow + view.cookingShort.today > 0 ? 'red' : 'slate'}
            label={t('inventory.cooking.card.title')}
            value={String(view.cookingShort.tomorrow)}
            hint={
              view.cookingShort.tomorrow + view.cookingShort.today > 0
                ? `${t('inventory.cooking.card.tomorrowShort', { n: view.cookingShort.tomorrow })} · ${t('inventory.cooking.card.todayShort', { n: view.cookingShort.today })}`
                : t('inventory.cooking.card.none')
            }
            alert={view.cookingShort.tomorrow + view.cookingShort.today > 0}
            onClick={onOpenCooking}
          />
        )}
        <SoonCard icon={ChefHat} label={t('inventory.cards.consumption')} step="2" />
        <SoonCard icon={Trash2} label={t('inventory.cards.wastage')} step="4" />
        {suppliers ? (
          <StatCard icon={HandCoins} tone={suppliers.totalDue > 0 ? 'red' : 'slate'} label={t('inventory.cards.supplierDue')} value={formatPaisa(suppliers.totalDue)} hint={t('inventory.cardHints.supplierDue')} onClick={onOpenSuppliers} />
        ) : (
          <SoonCard icon={HandCoins} label={t('inventory.cards.supplierDue')} step="3" />
        )}
        <StatCard
          icon={Percent}
          tone="slate"
          label={t('inventory.cards.foodCost')}
          value={view.foodCost.averageBps === null ? '—' : formatBps(view.foodCost.averageBps)}
          hint={view.foodCost.recipes ? t('inventory.cardHints.foodCost', { n: view.foodCost.recipes }) : t('inventory.cardHints.noRecipes')}
          onClick={onOpenRecipes}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={TriangleAlert} title={t('inventory.lowTitle')} count={attention.length} onViewAll={() => onOpen(summary.out > 0 && summary.low === 0 ? 'OUT' : 'LOW')}>
          {attention.length === 0 ? (
            <Empty>{t('inventory.lowEmpty')}</Empty>
          ) : (
            attention.slice(0, 6).map((r) => (
              <Line
                key={r.ingredient.id}
                title={r.ingredient.name}
                detail={`${stockText(r.ingredient, r.onHandMilli)} · ${t('inventory.columns.min')} ${stockText(r.ingredient, r.ingredient.minStockMilli)}`}
                badge={<Badge tone={STATUS_TONE[r.status]}>{t(`inventory.status.${r.status}`)}</Badge>}
              />
            ))
          )}
        </Panel>

        <Panel icon={CalendarClock} title={t('inventory.expiringTitle')} count={expiring.length} onViewAll={() => onOpen('EXPIRING')}>
          {expiring.length === 0 ? (
            <Empty>{t('inventory.expiringEmpty', { days: view.expiringSoonDays })}</Empty>
          ) : (
            expiring.slice(0, 6).map((r) => {
              const label = expiryLabel(r.expiry, r.ingredient.expiryDate);
              return (
                <Line
                  key={r.ingredient.id}
                  title={r.ingredient.name}
                  detail={`${stockText(r.ingredient, r.onHandMilli)}${r.ingredient.batchNo ? ` · ${r.ingredient.batchNo}` : ''}`}
                  badge={<Badge tone={label.tone ?? 'grey'}>{label.text}</Badge>}
                />
              );
            })
          )}
        </Panel>

        <Panel icon={History} title={t('inventory.movementsTitle')} count={null} onViewAll={onOpenMovements}>
          {view.movements.length === 0 ? (
            <Empty>{t('inventory.movementsEmpty')}</Empty>
          ) : (
            view.movements.slice(0, 6).map(({ movement, ingredientName, purchaseUnit, stockUnit, byName }) => {
              const sign = movement.quantityMilli > 0 ? '+' : '−';
              const qty = stockText({ purchaseUnit, stockUnit }, Math.abs(movement.quantityMilli));
              const why = movement.reason ? t(`inventory.reasons.${movement.reason}`) : t(`inventory.movementTypes.${movement.type}`);
              return (
                <Line
                  key={movement.id}
                  title={ingredientName}
                  detail={`${why}${byName ? ` · ${t('inventory.by', { name: byName })}` : ''} · ${whenText(movement.createdAt)}`}
                  badge={<span className={cn('text-sm font-extrabold tabular-nums', movement.quantityMilli > 0 ? 'text-green-700' : 'text-brand')}>{`${sign}${qty}`}</span>}
                />
              );
            })
          )}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  alert = false,
  onClick,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONES;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-inventory-card={label}
      className="lift flex min-h-32 flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_4px_18px_-10px_rgb(15_23_42/0.18)] hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold leading-snug text-slate-600">{label}</span>
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', TONES[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
      </span>
      <span>
        <span className="block text-2xl font-black tabular-nums text-slate-900">{value}</span>
        <span className={cn('block text-xs', alert ? 'font-bold text-red-700' : 'text-slate-500')}>{hint}</span>
      </span>
    </button>
  );
}

function SoonCard({ icon: Icon, label, step }: { icon: LucideIcon; label: string; step: string }) {
  return (
    <div className="flex min-h-32 flex-col justify-between gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4" aria-label={`${label} — ${t('inventory.cardHints.soon', { step })}`}>
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-bold leading-snug text-slate-500">{label}</span>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-slate-400">
          <Icon className="size-5" aria-hidden />
        </span>
      </span>
      <span>
        <span className="block text-2xl font-black text-slate-300">—</span>
        <span className="block text-xs text-slate-400">{t('inventory.cardHints.soon', { step })}</span>
      </span>
    </div>
  );
}

function Panel({ icon: Icon, title, count, onViewAll, children }: { icon: LucideIcon; title: string; count: number | null; onViewAll?: () => void; children: ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
          <Icon className="size-5 text-brand" aria-hidden />
          {title}
          {count !== null && count > 0 && <span className="rounded-full bg-brand-soft px-2 text-xs font-black text-brand">{count}</span>}
        </h2>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="press flex min-h-9 items-center gap-0.5 rounded-lg px-2 text-sm font-bold text-brand hover:bg-brand-soft">
            {t('inventory.viewAll')}
            <ChevronRight className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <ul className="flex-1 divide-y divide-slate-100 px-4">{children}</ul>
    </Card>
  );
}

function Line({ title, detail, badge }: { title: string; detail: string; badge: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{detail}</span>
      </span>
      <span className="shrink-0">{badge}</span>
    </li>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="py-6 text-center text-sm text-slate-500">{children}</li>;
}

'use client';

import { Plus } from 'lucide-react';
import { formatQuantity, MAX_OPEN_SUB_ORDERS, subOrderLabel, type Order } from '@restaurant-saas/shared';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** What this customer ordered, so staff can tell the sub-orders apart: "1 × Chicken Tikka, 2 × Coffee". */
export function subOrderItems(order: Order): string {
  return order.items
    .filter((i) => !i.isVoid)
    .map((i) => `${formatQuantity(i.quantity, i.unit)} ${i.name}`)
    .join(', ');
}

/** The customers at a running table: choose whose order this is, or start one for a customer who just sat down. */
export function SubOrderBar({
  tableName,
  orders,
  selected,
  onSelect,
}: {
  tableName: string;
  orders: Order[];
  /** An order id, or NEW for a sub-order that is not sent yet */
  selected: string | 'NEW' | null;
  onSelect: (choice: string | 'NEW') => void;
}) {
  const chip = 'flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-xl border-2 px-3 text-left text-sm font-bold';
  return (
    <div role="group" aria-label={t('pos.subOrderWho')} data-sub-order-bar className="mb-3 flex flex-wrap items-center gap-1.5">
      {orders.map((order) => {
        const label = subOrderLabel(tableName, order.subOrderNo ?? 1);
        return (
          <button
            key={order.id}
            type="button"
            aria-pressed={selected === order.id}
            data-sub-order-choice={label}
            onClick={() => onSelect(order.id)}
            className={cn(chip, selected === order.id ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 bg-white text-slate-700')}
          >
            <span className="shrink-0 font-black">{label}</span>
            <span className="truncate font-medium">{subOrderItems(order)}</span>
          </button>
        );
      })}
      {orders.length < MAX_OPEN_SUB_ORDERS && (
        <button
          type="button"
          aria-pressed={selected === 'NEW'}
          onClick={() => onSelect('NEW')}
          className={cn(chip, selected === 'NEW' ? 'border-brand bg-brand-soft text-brand' : 'border-dashed border-slate-300 bg-white text-slate-700')}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          {t('pos.newSubOrder')}
        </button>
      )}
    </div>
  );
}

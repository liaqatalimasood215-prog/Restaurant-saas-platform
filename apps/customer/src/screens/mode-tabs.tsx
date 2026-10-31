'use client';

import { Bike, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react';
import { t } from '@/i18n';
import { ORDER_MODES, type OrderMode } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useStore } from './store-context';

const ICONS: Record<OrderMode, LucideIcon> = { DELIVERY: Bike, TAKEAWAY: ShoppingBag, DINE_IN: Utensils };

/** Delivery, Pickup or Dine-in; the choice is kept with the cart. */
export function ModeTabs({ onPick }: { onPick?: (mode: OrderMode) => void }) {
  const { store, cart } = useStore();
  return (
    <div role="group" aria-label={t('mode.how')} className={cn('grid gap-2', store.modes.length === 3 ? 'grid-cols-3' : store.modes.length === 2 ? 'grid-cols-2' : 'grid-cols-1')} data-mode-tabs>
      {ORDER_MODES.filter((mode) => store.modes.includes(mode)).map((mode) => {
        const Icon = ICONS[mode];
        const on = cart.mode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={on}
            data-mode={mode}
            onClick={() => {
              cart.setMode(mode);
              onPick?.(mode);
            }}
            className={cn('flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-1 text-sm font-bold transition-colors', on ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {t(`mode.${mode}`)}
          </button>
        );
      })}
    </div>
  );
}

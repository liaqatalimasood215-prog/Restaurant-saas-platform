'use client';

import { useState } from 'react';
import { Check, LayoutGrid, Plus } from 'lucide-react';
import { cardPrice, formatPaisa, type MenuItem, type MenuSnapshot } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { artFor, ProductArt } from './product-art';

const ALL = 'ALL';

/**
 * POS menu (owner's reference design 2026-10-29): category tabs on top, product cards with a large
 * picture, name, price, a short description and a + button. The product search box sits in the POS
 * title row. The number of columns follows the space the menu has (container query).
 * A product already in the bill shows a red tick with its quantity; the one just added pops a green tick
 * (owner 2026-11-03), so nobody adds it twice by mistake.
 */
export function MenuPanel({
  menu,
  query,
  onPick,
  inBill,
  added,
}: {
  menu: MenuSnapshot;
  query: string;
  onPick: (item: MenuItem) => void;
  /** Quantity of each product in the bill's unsent items */
  inBill: Record<string, number>;
  added: { itemId: string; at: number } | null;
}) {
  const [category, setCategory] = useState(ALL);
  const q = query.trim().toLowerCase();
  const categoryName = (id: string) => menu.categories.find((c) => c.id === id)?.name ?? '';
  const items = menu.items.filter((i) => (category === ALL || i.categoryId === category) && (!q || i.name.toLowerCase().includes(q)));

  return (
    <section aria-label={t('waiter.menu')} className="@container min-w-0 lg:flex lg:min-h-0 lg:flex-col">
      <div className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('pos.categories')}>
        {[{ id: ALL, name: t('waiter.allCategories') }, ...menu.categories].map((c) => {
          const active = category === c.id;
          const Icon = c.id === ALL ? LayoutGrid : artFor(c.name).icon;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(c.id)}
              className={cn(
                'press flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold short:min-h-10',
                active ? 'bg-brand bg-brand-gradient text-white shadow-brand' : 'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-brand/40 hover:bg-brand-soft/50',
              )}
            >
              <Icon className={cn('size-5', active ? 'text-white' : 'text-brand')} aria-hidden />
              {c.name}
            </button>
          );
        })}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{t('waiter.noResults', { q: query })}</p>
      ) : (
        <ul className="grid grid-cols-2 content-start gap-3 @md:grid-cols-3 @2xl:grid-cols-4 @5xl:grid-cols-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-0.5 short:gap-2.5">
          {items.map((item) => {
            // Owner 2026-11-05: the first size ("1 kg") on the card; ½ kg and Pao are chosen after a tap. "1 kg" stays on one line.
            const shown = cardPrice(item);
            const from = shown.price;
            const price = shown.sizeName
              ? t('waiter.sizePrice', { price: formatPaisa(from), size: shown.sizeName.replaceAll(' ', '\u00a0') })
              : item.unit === 'piece'
                ? formatPaisa(from)
                : t('waiter.perUnit', { price: formatPaisa(from), unit: item.unit });
            const count = inBill[item.id] ?? 0;
            const justAdded = added?.itemId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!item.isAvailable}
                  onClick={() => onPick(item)}
                  data-in-bill={count || undefined}
                  className={cn(
                    'lift group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-[0_4px_14px_-8px_rgb(15_23_42/0.2)] hover:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50',
                    count > 0 ? 'border-brand/50 ring-1 ring-brand/30' : 'border-slate-200/80',
                  )}
                >
                  {count > 0 && (
                    <span
                      key={justAdded ? `badge-${added.at}` : 'badge'}
                      aria-hidden
                      className={cn(
                        'bg-brand-gradient absolute right-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center gap-0.5 rounded-full bg-brand px-2 text-xs font-black text-white shadow-brand',
                        justAdded && 'animate-badge-bump',
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={3.5} aria-hidden />
                      {item.unit === 'piece' ? count : `${count} ${item.unit}`}
                    </span>
                  )}
                  {justAdded && (
                    <span key={`tick-${added.at}`} className="pointer-events-none absolute inset-x-0 top-0 z-10 grid h-24 place-items-center xl:h-28 short:h-20" aria-hidden>
                      <span className="animate-added-pop grid size-14 place-items-center rounded-full bg-green-500 text-white opacity-0 shadow-lg shadow-green-600/40 ring-4 ring-white">
                        <Check className="size-8" strokeWidth={3.5} />
                      </span>
                    </span>
                  )}
                  <ProductArt
                    name={item.name}
                    categoryName={categoryName(item.categoryId)}
                    className="h-24 w-full xl:h-28 short:h-20"
                    emojiClassName="text-5xl transition duration-300 group-hover:scale-110 xl:text-6xl short:text-5xl"
                    soft
                  />
                  <span className="flex flex-1 items-center gap-2 p-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-snug text-slate-900">{item.name}</span>
                      {item.isAvailable ? (
                        <span className="block text-sm font-extrabold text-brand">{price}</span>
                      ) : (
                        <Badge tone="red">{t('waiter.outOfStock')}</Badge>
                      )}
                      {item.description && <span className="block truncate text-xs text-slate-500">{item.description}</span>}
                    </span>
                    {item.isAvailable && (
                      <span className="bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-brand transition group-hover:scale-105 group-active:scale-95" aria-hidden>
                        <Plus className="size-5" strokeWidth={2.5} />
                      </span>
                    )}
                  </span>
                  {count > 0 && <span className="sr-only"> · {t('pos.inBill', { n: count })}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

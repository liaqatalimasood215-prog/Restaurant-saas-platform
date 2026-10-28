'use client';

import { useState } from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import { formatPaisa, type MenuItem, type MenuSnapshot } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { artFor, ProductArt } from './product-art';

const ALL = 'ALL';

/**
 * POS menu (owner's reference design 2026-10-29): category tabs on top, product cards with a large
 * picture, name, price, a short description and a + button. The product search box sits in the POS
 * title row. The number of columns follows the space the menu has (container query).
 */
export function MenuPanel({ menu, query, onPick }: { menu: MenuSnapshot; query: string; onPick: (item: MenuItem) => void }) {
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
                'flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm short:min-h-10',
                active ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
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
            const from = item.variants.length ? Math.min(...item.variants.map((v) => v.price)) : item.basePrice;
            const price = item.variants.length
              ? t('waiter.fromPrice', { price: formatPaisa(from) })
              : item.unit === 'piece'
                ? formatPaisa(from)
                : t('waiter.perUnit', { price: formatPaisa(from), unit: item.unit });
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!item.isAvailable}
                  onClick={() => onPick(item)}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-brand hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ProductArt
                    name={item.name}
                    categoryName={categoryName(item.categoryId)}
                    className="h-24 w-full xl:h-28 short:h-20"
                    emojiClassName="text-5xl transition group-hover:scale-110 xl:text-6xl short:text-5xl"
                  />
                  <span className="flex flex-1 items-center gap-2 p-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-snug text-slate-900">{item.name}</span>
                      {item.isAvailable ? (
                        <span className="block text-sm font-extrabold text-slate-900">{price}</span>
                      ) : (
                        <Badge tone="red">{t('waiter.outOfStock')}</Badge>
                      )}
                      {item.description && <span className="block truncate text-xs text-slate-500">{item.description}</span>}
                    </span>
                    {item.isAvailable && (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm group-hover:bg-brand-dark" aria-hidden>
                        <Plus className="size-5" strokeWidth={2.5} />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

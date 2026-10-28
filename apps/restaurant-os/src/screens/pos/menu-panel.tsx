'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { formatPaisa, type MenuItem, type MenuSnapshot } from '@restaurant-saas/shared';
import { Badge } from '@/components/ui/badge';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { artFor, ProductArt } from './product-art';

const ALL = 'ALL';

/** POS menu: product search and categories on top, product tiles with a picture, price and + button. */
export function MenuPanel({ menu, onPick }: { menu: MenuSnapshot; onPick: (item: MenuItem) => void }) {
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const categoryName = (id: string) => menu.categories.find((c) => c.id === id)?.name ?? '';
  const items = menu.items.filter((i) => (category === ALL || i.categoryId === category) && (!q || i.name.toLowerCase().includes(q)));

  return (
    <section aria-label={t('waiter.menu')} className="min-w-0 lg:flex lg:min-h-0 lg:flex-col">
      <label className="mb-2 flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
        <Search className="size-5 text-slate-400" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('pos.searchProducts')}
          aria-label={t('pos.searchProducts')}
          className="w-full bg-transparent text-base"
        />
      </label>
      <div className="mb-2 flex shrink-0 gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={t('pos.categories')}>
        {[{ id: ALL, name: t('waiter.allCategories') }, ...menu.categories].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={category === c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              'flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold',
              category === c.id ? 'bg-brand text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            {c.id !== ALL && <CategoryIcon name={c.name} active={category === c.id} />}
            {c.name}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{t('waiter.noResults', { q: query })}</p>
      ) : (
        <ul className="grid grid-cols-2 content-start gap-2.5 sm:grid-cols-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-0.5 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((item) => {
            const from = item.variants.length ? Math.min(...item.variants.map((v) => v.price)) : item.basePrice;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={!item.isAvailable}
                  onClick={() => onPick(item)}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-brand hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ProductArt name={item.name} categoryName={categoryName(item.categoryId)} className="h-20 w-full xl:h-24" iconClassName="size-11 transition group-hover:scale-110 xl:size-12" />
                  <span className="px-2.5 pt-2 text-sm font-bold leading-snug text-slate-900">{item.name}</span>
                  <span className="mt-auto flex items-center justify-between gap-1 px-2.5 pb-2.5 pt-1 text-sm font-semibold text-slate-700">
                    {item.isAvailable ? (
                      item.variants.length ? (
                        t('waiter.fromPrice', { price: formatPaisa(from) })
                      ) : item.unit === 'piece' ? (
                        formatPaisa(from)
                      ) : (
                        t('waiter.perUnit', { price: formatPaisa(from), unit: item.unit })
                      )
                    ) : (
                      <Badge tone="red">{t('waiter.outOfStock')}</Badge>
                    )}
                    {item.isAvailable && (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white group-hover:bg-brand-dark" aria-hidden>
                        <Plus className="size-5" />
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

function CategoryIcon({ name, active }: { name: string; active: boolean }) {
  const { icon: Icon } = artFor(name);
  return <Icon className={cn('size-4', active ? 'text-white' : 'text-brand')} aria-hidden />;
}

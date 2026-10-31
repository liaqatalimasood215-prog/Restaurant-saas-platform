'use client';

import { useState } from 'react';
import { Heart, Search, SearchX, SlidersHorizontal, UtensilsCrossed } from 'lucide-react';
import { Button, EmptyState, Sheet } from '@/components/ui';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { CartView } from './cart-view';
import { ProductCard, lowestPrice } from './product-card';
import { ClosedBanner, PageHeader } from './store-chrome';
import { useStore } from './store-context';

const FAVOURITES = 'favourites';
type Sort = 'MENU' | 'LOW' | 'HIGH';
const SORTS: readonly Sort[] = ['MENU', 'LOW', 'HIGH'];

/** Menu: category tabs and a grid of dishes (owner's design, screen 3). A search looks through the whole menu. */
export function MenuScreen({ initialCategory, initialQuery, openFilter }: { initialCategory?: string; initialQuery?: string; openFilter?: boolean }) {
  const { store, base, canOrder, favourites } = useStore();
  const [selected, setSelected] = useState(initialCategory ?? '');
  const [query, setQuery] = useState(initialQuery ?? '');
  const [searchOpen, setSearchOpen] = useState(Boolean(initialQuery));
  const [filterOpen, setFilterOpen] = useState(Boolean(openFilter));
  const [sort, setSort] = useState<Sort>('MENU');
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const categories = store.categories.filter((c) => store.items.some((i) => i.categoryId === c.id));
  const favouriteItems = store.items.filter((i) => favourites.has(i.id));
  const showFavourites = favouriteItems.length > 0 || selected === FAVOURITES;
  const active = selected === FAVOURITES || categories.some((c) => c.id === selected) ? selected : (categories[0]?.id ?? '');
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const found = searching
    ? store.items.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    : active === FAVOURITES
      ? favouriteItems
      : store.items.filter((i) => i.categoryId === active);
  const shown = found.filter((i) => !hideSoldOut || i.isAvailable);
  if (sort !== 'MENU') shown.sort((a, b) => (sort === 'LOW' ? lowestPrice(a) - lowestPrice(b) : lowestPrice(b) - lowestPrice(a)));
  const filtered = sort !== 'MENU' || hideSoldOut;
  const heading = searching ? t('menu.results', { q: query.trim() }) : active === FAVOURITES ? t('menu.favourites') : (categories.find((c) => c.id === active)?.name ?? t('menu.title'));

  const tab = (id: string, label: string, icon?: boolean) => {
    const on = !searching && active === id;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        data-category-tab={label}
        onClick={() => {
          setSelected(id);
          setQuery('');
          setSearchOpen(false);
        }}
        className={cn('flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors', on ? 'bg-brand text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200')}
      >
        {icon && <Heart className={cn('size-4', on ? 'fill-white' : 'fill-brand text-brand')} aria-hidden />}
        {label}
      </button>
    );
  };

  return (
    <>
      <PageHeader
        title={t('menu.title')}
        back={base}
        action={
          <>
            <button type="button" onClick={() => setFilterOpen(true)} aria-label={t('menu.filter')} aria-haspopup="dialog" data-menu-filter={filtered} className="relative grid size-11 place-items-center rounded-full text-stone-800 hover:bg-stone-100">
              <SlidersHorizontal className="size-5" aria-hidden />
              {filtered && <span className="absolute right-2 top-2 size-2.5 rounded-full border-2 border-white bg-brand" />}
            </button>
            <button type="button" onClick={() => setSearchOpen((v) => !v)} aria-label={t('menu.openSearch')} aria-expanded={searchOpen} className="grid size-11 place-items-center rounded-full text-stone-800 hover:bg-stone-100 lg:hidden">
              <Search className="size-5" aria-hidden />
            </button>
          </>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          {!canOrder && (
            <div className="mb-3">
              <ClosedBanner />
            </div>
          )}
          <label className={cn('relative mb-2 block', !searchOpen && 'hidden lg:block')}>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('home.search')}
              aria-label={t('menu.search')}
              className="min-h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-12 pr-4 text-base outline-none focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand-line"
            />
          </label>
          <nav aria-label={t('menu.categories')} className="no-scrollbar sticky top-14 z-10 -mx-4 mb-1 flex gap-2 overflow-x-auto bg-white/95 px-4 py-2 backdrop-blur lg:top-16" data-category-tabs>
            {showFavourites && tab(FAVOURITES, t('menu.favourites'), true)}
            {categories.map((c) => tab(c.id, c.name))}
          </nav>
          {/* The open tab already says what this is; a search needs saying. */}
          <h2 className={cn('mb-2 mt-2 text-lg font-extrabold tracking-tight', !searching && 'sr-only')} data-menu-heading>
            {heading}
          </h2>
          {shown.length === 0 ? (
            searching ? (
              <EmptyState icon={<SearchX className="size-7" aria-hidden />} title={t('menu.noMatch', { q: query.trim() })} />
            ) : active === FAVOURITES ? (
              <EmptyState icon={<Heart className="size-7" aria-hidden />} title={t('menu.favourites')} body={t('menu.noFavourites')} />
            ) : (
              <EmptyState icon={<UtensilsCrossed className="size-7" aria-hidden />} title={t('menu.noItems')} />
            )
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-menu-grid>
              {shown.map((item) => (
                <li key={item.id}>
                  <ProductCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-stone-100 bg-white p-5 shadow-sm lg:block" aria-label={t('cart.title')}>
          <CartView />
        </aside>
      </div>

      {filterOpen && (
        <Sheet title={t('menu.filter')} onClose={() => setFilterOpen(false)} footer={<Button className="w-full" onClick={() => setFilterOpen(false)}>{t('home.done')}</Button>}>
          <h3 className="mb-2 font-extrabold">{t('menu.sortBy')}</h3>
          <div className="space-y-2">
            {SORTS.map((value) => (
              <button key={value} type="button" aria-pressed={sort === value} data-sort={value} onClick={() => setSort(value)} className={cn('flex min-h-12 w-full items-center rounded-2xl border-2 px-4 text-left text-sm font-bold', sort === value ? 'border-stone-900 bg-stone-50' : 'border-stone-200')}>
                {t(`menu.sort.${value}`)}
              </button>
            ))}
          </div>
          <label className="mt-4 flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-stone-200 px-4 text-sm font-bold">
            {t('menu.hideSoldOut')}
            <input type="checkbox" role="switch" checked={hideSoldOut} onChange={(e) => setHideSoldOut(e.target.checked)} className="size-5 accent-[var(--store-primary)]" />
          </label>
        </Sheet>
      )}
    </>
  );
}

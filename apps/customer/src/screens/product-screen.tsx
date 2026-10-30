'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { canPickAddons, unitPriceFor, type MenuItem, type ModifierGroup } from '@restaurant-saas/shared';
import { Button, Problem, ProductArt, Stepper, fieldClass, primaryLinkClass } from '@/components/ui';
import { t } from '@/i18n';
import type { CartLine } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { rs } from '@/lib/format';
import { FavouriteButton } from './product-card';
import { ClosedBanner, DemoChip } from './store-chrome';
import { useStore } from './store-context';

/** Product details (owner's design, screen 4): size, required choices such as crust, extras, note and quantity. */
export function ProductScreen({ itemId, lineId }: { itemId: string; lineId: string | null }) {
  const { store, base, cart } = useStore();
  const item = store.items.find((i) => i.id === itemId);
  const line = lineId ? cart.lines.find((l) => l.lineId === lineId) : undefined;
  if (!item) {
    return (
      <Problem title={t('item.goneTitle')} body={t('item.goneBody')}>
        <Link href={`${base}/menu`} className={`${primaryLinkClass} mt-4`}>
          {t('item.toMenu')}
        </Link>
      </Problem>
    );
  }
  // A new key starts the choices again from this line, for example after opening another dish.
  return <ProductForm key={`${item.id}-${line?.lineId ?? 'new'}`} item={item} line={line} />;
}

function ProductForm({ item, line }: { item: MenuItem; line?: CartLine }) {
  const { store, base, cart, canOrder, goBack, notify } = useStore();
  const groups = store.addonGroups.filter((g) => item.modifierGroupIds.includes(g.id));
  const [variantId, setVariantId] = useState<string | null>(line?.variantId ?? item.variants[0]?.id ?? null);
  // A required single choice starts on its first option, like the size, so the button always shows a real price.
  const [modifierIds, setModifierIds] = useState<string[]>(
    () => line?.modifierIds ?? groups.filter((g) => g.minSelect > 0 && g.maxSelect === 1).flatMap((g) => g.modifiers.filter((m) => m.isAvailable).slice(0, 1).map((m) => m.id)),
  );
  const [note, setNote] = useState(line?.note ?? '');
  const [quantity, setQuantity] = useState(line?.quantity ?? 1);
  const [error, setError] = useState<string | null>(null);

  const variant = item.variants.find((v) => v.id === variantId);
  const modifiers = groups.flatMap((g) => g.modifiers).filter((m) => modifierIds.includes(m.id));
  const total = unitPriceFor({ basePrice: item.basePrice, variantPrice: variant?.price, modifierPrices: modifiers.map((m) => m.price) }) * quantity;
  const canAdd = canOrder && item.isAvailable;

  const pick = (group: ModifierGroup, modifierId: string) => {
    setError(null);
    const inGroup = group.modifiers.map((m) => m.id);
    setModifierIds((ids) => {
      const on = ids.includes(modifierId);
      if (group.maxSelect === 1) {
        // One choice: a new one replaces the old one; a required one cannot be taken away.
        if (on) return group.minSelect > 0 ? ids : ids.filter((id) => id !== modifierId);
        return [...ids.filter((id) => !inGroup.includes(id)), modifierId];
      }
      if (on) return ids.filter((id) => id !== modifierId);
      if (ids.filter((id) => inGroup.includes(id)).length >= group.maxSelect) return ids; // already at the most allowed
      return [...ids, modifierId];
    });
  };

  const save = () => {
    if (item.variants.length > 0 && !variant) return setError(t('item.pickSize'));
    for (const group of groups) {
      const picked = group.modifiers.filter((m) => modifierIds.includes(m.id)).length;
      if (!canPickAddons(group, picked)) return setError(t('item.pickAddons', { name: group.name, min: group.minSelect, max: group.maxSelect }));
    }
    const draft = { menuItemId: item.id, variantId, modifierIds, note: note.trim(), quantity };
    if (line) cart.replaceLine(line.lineId, draft);
    else {
      cart.addLine(draft);
      notify(t('cart.added', { name: item.name }));
    }
    goBack(`${base}/menu`);
  };

  const heading = (title: string, required: boolean, hint?: string) => (
    <legend className="mb-2 flex w-full items-baseline justify-between gap-3">
      <span className="font-extrabold">{title}</span>
      <span className={cn('text-xs font-bold', required ? 'text-brand' : 'text-stone-500')}>{hint ?? (required ? t('item.required') : t('item.optional'))}</span>
    </legend>
  );
  const chip = (on: boolean) => cn('relative flex min-h-12 flex-col items-center justify-center rounded-2xl border-2 px-2 py-1 text-center text-sm font-bold transition-colors', on ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300');
  const money = (price: number) => (price === 0 ? t('item.free') : `+ ${rs(price)}`);

  return (
    <div className="pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:pb-0">
      <div className="relative -mx-4 -mt-4 lg:sticky lg:top-20 lg:m-0">
        <ProductArt name={item.name} className="h-64 w-full sm:h-80 lg:h-96 lg:rounded-3xl" emojiClassName="text-8xl" />
        <button type="button" onClick={() => goBack(`${base}/menu`)} aria-label={t('app.back')} className="absolute left-1 top-1 grid size-11 place-items-center lg:hidden">
          <span className="grid size-9 place-items-center rounded-full bg-white shadow">
            <ArrowLeft className="size-5" aria-hidden />
          </span>
        </button>
        <div className="absolute right-1 top-1 flex items-center">
          <DemoChip className="lg:hidden" />
          <FavouriteButton item={item} />
        </div>
      </div>

      <div className="relative -mx-4 -mt-5 rounded-t-3xl bg-white px-4 pt-5 lg:m-0 lg:rounded-none lg:p-0">
        {store.bestsellerItemIds.includes(item.id) && <span className="mb-2 inline-block rounded-lg bg-accent px-2 py-0.5 text-[0.6875rem] font-extrabold text-stone-900">{t('menu.bestseller')}</span>}
        <h1 className="text-2xl font-black tracking-tight lg:text-3xl">{item.name}</h1>
        {item.description && <p className="mt-1 text-sm text-stone-600">{item.description}</p>}
        {!canOrder && (
          <div className="mt-3">
            <ClosedBanner />
          </div>
        )}

        {item.variants.length > 0 && (
          <fieldset className="mt-5" data-choice="size">
            {heading(t('item.size'), true)}
            <div className={cn('grid gap-2', item.variants.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
              {item.variants.map((v) => (
                <button key={v.id} type="button" aria-pressed={variantId === v.id} className={chip(variantId === v.id)} onClick={() => (setVariantId(v.id), setError(null))}>
                  <span>{v.name}</span>
                  <span className={cn('text-xs font-semibold tabular-nums', variantId === v.id ? 'text-white/80' : 'text-stone-500')}>{rs(v.price)}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {groups.map((group) => {
          const available = group.modifiers.filter((m) => m.isAvailable);
          return (
            <fieldset key={group.id} className="mt-5" data-choice={group.name}>
              {heading(group.name, group.minSelect > 0, group.minSelect === 0 && group.maxSelect > 1 ? t('item.upTo', { max: group.maxSelect }) : undefined)}
              {group.maxSelect === 1 ? (
                <div className="grid grid-cols-3 gap-2">
                  {available.map((m) => {
                    const on = modifierIds.includes(m.id);
                    return (
                      <button key={m.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => pick(group, m.id)}>
                        <span>{m.name}</span>
                        {m.price > 0 && <span className={cn('text-xs font-semibold tabular-nums', on ? 'text-white/80' : 'text-stone-500')}>{money(m.price)}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {available.map((m) => {
                    const on = modifierIds.includes(m.id);
                    return (
                      <button key={m.id} type="button" aria-pressed={on} className="flex min-h-12 w-full items-center gap-3 text-left text-sm font-semibold" onClick={() => pick(group, m.id)}>
                        <span className={cn('grid size-6 shrink-0 place-items-center rounded-lg border-2 text-white', on ? 'border-brand bg-brand' : 'border-stone-300 bg-white')}>{on && <Check className="size-4" strokeWidth={3} aria-hidden />}</span>
                        <span className="flex-1">{m.name}</span>
                        <span className="text-stone-600 tabular-nums">{money(m.price)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
          );
        })}

        <label className="mt-5 block">
          <span className="mb-2 block font-extrabold">{t('item.note')}</span>
          <input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder={t('item.notePlaceholder')} className={fieldClass} />
        </label>
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-stone-100 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:mt-5 lg:border-0 lg:p-0" data-product-bar>
          <Stepper value={quantity} min={1} onChange={setQuantity} />
          <Button className="min-w-0 flex-1" onClick={save} disabled={!canAdd}>
            {!item.isAvailable ? t('menu.soldOut') : !canOrder ? t('store.notTaking') : t(line ? 'item.save' : 'item.add', { total: rs(total) })}
          </Button>
        </div>
      </div>
    </div>
  );
}

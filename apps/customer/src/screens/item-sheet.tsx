'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { canPickAddons, formatPaisa, unitPriceFor, type MenuItem } from '@restaurant-saas/shared';
import { Button, ProductArt, Sheet, Stepper, fieldClass } from '@/components/ui';
import { t } from '@/i18n';
import type { CartLine } from '@/lib/cart';
import { cn } from '@/lib/cn';
import { useStore } from './store-shell';

/** Product details: size, add-ons, note and quantity. Opens for a new item, or with a cart line to edit it. */
export function ItemSheet({ item, line, onClose }: { item: MenuItem; line?: CartLine; onClose: () => void }) {
  const { store, cart } = useStore();
  const groups = store.addonGroups.filter((g) => item.modifierGroupIds.includes(g.id));
  const [variantId, setVariantId] = useState<string | null>(line?.variantId ?? item.variants[0]?.id ?? null);
  const [modifierIds, setModifierIds] = useState<string[]>(line?.modifierIds ?? []);
  const [note, setNote] = useState(line?.note ?? '');
  const [quantity, setQuantity] = useState(line?.quantity ?? 1);
  const [error, setError] = useState<string | null>(null);

  const variant = item.variants.find((v) => v.id === variantId);
  const modifiers = groups.flatMap((g) => g.modifiers).filter((m) => modifierIds.includes(m.id));
  const total = unitPriceFor({ basePrice: item.basePrice, variantPrice: variant?.price, modifierPrices: modifiers.map((m) => m.price) }) * quantity;

  const toggle = (groupId: string, modifierId: string) => {
    setError(null);
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const inGroup = group.modifiers.map((m) => m.id);
    setModifierIds((ids) => {
      if (ids.includes(modifierId)) return ids.filter((id) => id !== modifierId);
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
    else cart.addLine(draft);
    onClose();
  };

  const choice = (selected: boolean) =>
    cn('flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 px-3 text-left text-sm font-semibold transition-colors', selected ? 'border-brand bg-brand-soft' : 'border-stone-200 hover:border-stone-300');
  const mark = (selected: boolean, round: boolean) =>
    cn('grid size-6 shrink-0 place-items-center border-2 text-white', round ? 'rounded-full' : 'rounded-lg', selected ? 'border-brand bg-brand' : 'border-stone-300 bg-white');

  return (
    <Sheet
      title={item.name}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <Stepper value={quantity} min={1} onChange={setQuantity} />
          <Button className="flex-1" onClick={save}>
            {t(line ? 'item.save' : 'item.add', { total: formatPaisa(total) })}
          </Button>
        </div>
      }
    >
      <ProductArt name={item.name} className="mb-3 h-40 rounded-3xl" emojiClassName="text-7xl" />
      {item.description && <p className="mb-4 text-sm text-stone-600">{item.description}</p>}

      {item.variants.length > 0 && (
        <fieldset className="mb-4">
          <legend className="mb-2 font-extrabold">{t('item.size')}</legend>
          <div className="space-y-2">
            {item.variants.map((v) => (
              <button key={v.id} type="button" aria-pressed={variantId === v.id} className={choice(variantId === v.id)} onClick={() => setVariantId(v.id)}>
                <span className={mark(variantId === v.id, true)}>{variantId === v.id && <Check className="size-4" strokeWidth={3} aria-hidden />}</span>
                <span className="flex-1">{v.name}</span>
                <span className="font-bold">{formatPaisa(v.price)}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {groups.map((group) => (
        <fieldset key={group.id} className="mb-4">
          <legend className="font-extrabold">{group.name}</legend>
          <p className="mb-2 text-xs text-stone-500">
            {group.minSelect > 0 ? t('item.addonRuleMin', { min: group.minSelect, max: group.maxSelect }) : t('item.addonRule', { max: group.maxSelect })}
          </p>
          <div className="space-y-2">
            {group.modifiers
              .filter((m) => m.isAvailable)
              .map((m) => {
                const on = modifierIds.includes(m.id);
                return (
                  <button key={m.id} type="button" aria-pressed={on} className={choice(on)} onClick={() => toggle(group.id, m.id)}>
                    <span className={mark(on, false)}>{on && <Check className="size-4" strokeWidth={3} aria-hidden />}</span>
                    <span className="flex-1">{m.name}</span>
                    <span className="text-stone-600">{m.price === 0 ? t('item.free') : `+ ${formatPaisa(m.price)}`}</span>
                  </button>
                );
              })}
          </div>
        </fieldset>
      ))}

      <label className="block">
        <span className="mb-2 block font-extrabold">{t('item.note')}</span>
        <input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder={t('item.notePlaceholder')} className={fieldClass} />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </Sheet>
  );
}

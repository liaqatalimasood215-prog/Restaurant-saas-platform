'use client';

import { useState } from 'react';
import {
  canMixSizes,
  formatPaisa,
  sizeMixFor,
  unitPriceFor,
  type DraftItemInput,
  type MenuItem,
  type MenuSnapshot,
  type SizePick,
} from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** Quantity per chosen size; a mixed line opens with its sizes (times its own quantity) */
function initialPicks(initial: DraftItemInput | undefined): Record<string, number> {
  if (initial?.sizes?.length) return Object.fromEntries(initial.sizes.map((s) => [s.variantId, s.quantity * initial.quantity]));
  return initial?.variantId ? { [initial.variantId]: initial.quantity } : {};
}

/**
 * Item → size → add-ons → note → quantity (MASTER_PROMPT.md §5.1 step 2).
 * Weight sizes (1 kg, ½ kg, Pao) can be tapped together (owner, 2026-11-07: "dedh kg"): each has its own
 * quantity and two or more make ONE line "1.5 kg: 1 kg + ½ kg" (shared `sizeMixFor`). Add-ons and the note
 * belong to that one line. Other sizes (Small, Medium) stay one at a time.
 */
export function ItemDialog({
  item,
  menu,
  onClose,
  onAdd,
  initial,
}: {
  item: MenuItem;
  menu: MenuSnapshot;
  onClose: () => void;
  onAdd: (draft: DraftItemInput) => void;
  /** Editing a line that is already in the bill */
  initial?: DraftItemInput;
}) {
  const mixable = canMixSizes(item);
  const [variantId, setVariantId] = useState<string | null>(initial?.variantId ?? null);
  const [picks, setPicks] = useState<Record<string, number>>(() => initialPicks(initial));
  const [modifierIds, setModifierIds] = useState<string[]>(initial?.modifierIds ?? []);
  const [note, setNote] = useState(initial?.note ?? '');
  const [quantity, setQuantity] = useState(initial?.sizes?.length ? 1 : (initial?.quantity ?? 1));
  const [showErrors, setShowErrors] = useState(false);

  const groups = menu.modifierGroups.filter((g) => item.modifierGroupIds.includes(g.id));
  const modifierPrices = groups.flatMap((g) => g.modifiers).filter((m) => modifierIds.includes(m.id)).map((m) => m.price);

  // Chosen sizes in menu order (mixable items); one size is a plain line, two or more one mixed line
  const chosen = mixable ? item.variants.filter((v) => picks[v.id] !== undefined) : [];
  const sizes: SizePick[] = chosen.map((v) => ({ variantId: v.id, quantity: picks[v.id] ?? 1 }));
  const mix = chosen.length > 1 ? sizeMixFor(item, sizes) : null;
  const single = mixable ? (chosen.length === 1 ? chosen[0] : undefined) : item.variants.find((v) => v.id === variantId);
  const lineQuantity = mixable ? (mix ? 1 : (sizes[0]?.quantity ?? 1)) : quantity;
  const sizeMissing = item.variants.length > 0 && !single && !mix;
  const unitPrice = unitPriceFor({ basePrice: item.basePrice, variantPrice: mix?.price ?? single?.price, modifierPrices });

  const pickSize = (id: string) => {
    if (!mixable) return setVariantId(id);
    setPicks((p) => {
      if (p[id] === undefined) return { ...p, [id]: 1 };
      return Object.fromEntries(Object.entries(p).filter(([key]) => key !== id));
    });
  };

  const toggleModifier = (groupId: string, modifierId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    setModifierIds((ids) => {
      if (ids.includes(modifierId)) return ids.filter((id) => id !== modifierId);
      const inGroup = ids.filter((id) => group.modifiers.some((m) => m.id === id));
      return inGroup.length >= group.maxSelect ? ids : [...ids, modifierId];
    });
  };

  const add = () => {
    if (sizeMissing) {
      setShowErrors(true);
      return;
    }
    const line = { menuItemId: item.id, modifierIds, note: note.trim() };
    onAdd(mix ? { ...line, variantId: null, sizes, quantity: 1 } : { ...line, variantId: single?.id ?? null, quantity: lineQuantity });
  };

  const isPicked = (id: string) => (mixable ? picks[id] !== undefined : variantId === id);
  const unitSuffix = item.unit !== 'piece' ? ` (${item.unit})` : '';

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.name}
      footer={
        <Button size="lg" className="w-full" onClick={add}>
          {t(initial ? 'waiter.saveItem' : 'waiter.addItem', { price: formatPaisa(unitPrice * lineQuantity) })}
        </Button>
      }
    >
      <div className="space-y-5">
        {item.variants.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-900">{t('waiter.size')}</legend>
            {mixable && <p className="-mt-1 mb-2 text-xs text-slate-500">{t('waiter.sizeMix')}</p>}
            <div className="grid grid-cols-3 gap-2">
              {item.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => pickSize(v.id)}
                  aria-pressed={isPicked(v.id)}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-2 text-sm font-bold',
                    isPicked(v.id) ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-800',
                  )}
                >
                  {v.name}
                  <span className="text-xs font-semibold opacity-80">{formatPaisa(v.price)}</span>
                </button>
              ))}
            </div>
            {showErrors && sizeMissing && (
              <p role="alert" className="mt-2 text-sm font-semibold text-red-700">
                {t('waiter.chooseSize')}
              </p>
            )}
          </fieldset>
        )}

        {groups.map((group) => (
          <fieldset key={group.id}>
            <legend className="mb-2 text-sm font-bold text-slate-900">
              {t('waiter.addOns', { name: group.name, max: group.maxSelect })}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.modifiers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!m.isAvailable}
                  onClick={() => toggleModifier(group.id, m.id)}
                  aria-pressed={modifierIds.includes(m.id)}
                  className={cn(
                    'min-h-12 rounded-xl border-2 px-3 text-sm font-semibold disabled:opacity-40',
                    modifierIds.includes(m.id) ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-800',
                  )}
                >
                  {m.name} +{formatPaisa(m.price)}
                </button>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-slate-900">{t('waiter.note')}</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
            placeholder={t('waiter.notePlaceholder')}
            className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-base"
          />
        </label>

        {!mixable ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              {t('waiter.quantity')}
              {unitSuffix}
            </span>
            <QuantityStepper value={quantity} onChange={setQuantity} label={t('waiter.quantity')} />
          </div>
        ) : (
          <div className="space-y-3">
            {chosen.map((v) => {
              // One size reads "Quantity" as before; two or more name their size
              const label = mix ? t('waiter.sizeQuantity', { size: v.name }) : t('waiter.quantity');
              return (
                <div key={v.id} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    {label}
                    {unitSuffix}
                  </span>
                  <QuantityStepper value={picks[v.id] ?? 1} onChange={(n) => setPicks((p) => ({ ...p, [v.id]: n }))} label={label} />
                </div>
              );
            })}
            {mix && (
              <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-bold text-brand" role="status">
                {t('waiter.sizeMixTotal', { mix: mix.label })}
              </p>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}

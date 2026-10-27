'use client';

import { useState } from 'react';
import { formatPaisa, unitPriceFor, type DraftItemInput, type MenuItem, type MenuSnapshot } from '@restaurant-saas/shared';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

/** Item → size → add-ons → note → quantity (MASTER_PROMPT.md §5.1 step 2). */
export function ItemDialog({
  item,
  menu,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  menu: MenuSnapshot;
  onClose: () => void;
  onAdd: (draft: DraftItemInput) => void;
}) {
  const [variantId, setVariantId] = useState<string | null>(null);
  const [modifierIds, setModifierIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  const groups = menu.modifierGroups.filter((g) => item.modifierGroupIds.includes(g.id));
  const variant = item.variants.find((v) => v.id === variantId);
  const sizeMissing = item.variants.length > 0 && !variant;
  const unitPrice = unitPriceFor({
    basePrice: item.basePrice,
    variantPrice: variant?.price,
    modifierPrices: groups.flatMap((g) => g.modifiers).filter((m) => modifierIds.includes(m.id)).map((m) => m.price),
  });

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
    onAdd({ menuItemId: item.id, variantId: variant?.id ?? null, modifierIds, note: note.trim(), quantity });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.name}
      footer={
        <Button size="lg" className="w-full" onClick={add}>
          {t('waiter.addItem', { price: formatPaisa(unitPrice * quantity) })}
        </Button>
      }
    >
      <div className="space-y-5">
        {item.variants.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-slate-900">{t('waiter.size')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {item.variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={variantId === v.id}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center rounded-xl border-2 px-2 text-sm font-bold',
                    variantId === v.id ? 'border-brand bg-brand-soft text-brand' : 'border-slate-200 text-slate-800',
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

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">
            {t('waiter.quantity')}
            {item.unit !== 'piece' && ` (${item.unit})`}
          </span>
          <QuantityStepper value={quantity} onChange={setQuantity} label={t('waiter.quantity')} />
        </div>
      </div>
    </Dialog>
  );
}

import { sizeMixFor, unitPriceFor, type DraftItemInput, type MenuSnapshot, type MenuUnit } from '@restaurant-saas/shared';
import { newId } from '@/lib/new-id';

/** One line of the round being built on the waiter's phone (not sent yet). */
export interface CartLine extends DraftItemInput {
  key: string;
}

export interface CartLineView {
  line: CartLine;
  name: string;
  details: string;
  unit: MenuUnit;
  /** Display only — the server prices every item itself when the round is sent. */
  unitPrice: number;
}

export function describeLine(line: CartLine, menu: MenuSnapshot): CartLineView | null {
  const item = menu.items.find((i) => i.id === line.menuItemId);
  if (!item) return null;
  const variant = item.variants.find((v) => v.id === line.variantId);
  const mix = line.sizes?.length ? sizeMixFor(item, line.sizes) : null;
  const modifiers = menu.modifierGroups.flatMap((g) => g.modifiers).filter((m) => line.modifierIds.includes(m.id));
  return {
    line,
    name: item.name,
    unit: item.unit,
    details: [mix?.label ?? variant?.name, ...modifiers.map((m) => `+ ${m.name}`)].filter(Boolean).join(' · '),
    unitPrice: unitPriceFor({
      basePrice: item.basePrice,
      variantPrice: mix?.price ?? variant?.price,
      modifierPrices: modifiers.map((m) => m.price),
    }),
  };
}

/** "kg×1,half×1" — the same mixed sizes in any order */
const mixKey = (sizes: DraftItemInput['sizes']) =>
  [...(sizes ?? [])].sort((a, b) => a.variantId.localeCompare(b.variantId)).map((s) => `${s.variantId}×${s.quantity}`).join();

/** Same item, size (or mix of sizes), add-ons and note → one line with a bigger quantity. */
export function addToCart(cart: CartLine[], draft: DraftItemInput): CartLine[] {
  const same = (l: CartLine) =>
    l.menuItemId === draft.menuItemId &&
    l.variantId === draft.variantId &&
    mixKey(l.sizes) === mixKey(draft.sizes) &&
    l.note === draft.note &&
    [...l.modifierIds].sort().join() === [...draft.modifierIds].sort().join();
  const existing = cart.find(same);
  if (existing) return cart.map((l) => (l === existing ? { ...l, quantity: Math.min(50, l.quantity + draft.quantity) } : l));
  return [...cart, { ...draft, key: newId() }];
}

import { unitPriceFor, type DraftItemInput, type MenuSnapshot } from '@restaurant-saas/shared';

/** One line of the round being built on the waiter's phone (not sent yet). */
export interface CartLine extends DraftItemInput {
  key: string;
}

export interface CartLineView {
  line: CartLine;
  name: string;
  details: string;
  /** Display only — the server prices every item itself when the round is sent. */
  unitPrice: number;
}

export function describeLine(line: CartLine, menu: MenuSnapshot): CartLineView | null {
  const item = menu.items.find((i) => i.id === line.menuItemId);
  if (!item) return null;
  const variant = item.variants.find((v) => v.id === line.variantId);
  const modifiers = menu.modifierGroups.flatMap((g) => g.modifiers).filter((m) => line.modifierIds.includes(m.id));
  return {
    line,
    name: item.name,
    details: [variant?.name, ...modifiers.map((m) => `+ ${m.name}`)].filter(Boolean).join(' · '),
    unitPrice: unitPriceFor({
      basePrice: item.basePrice,
      variantPrice: variant?.price,
      modifierPrices: modifiers.map((m) => m.price),
    }),
  };
}

/** Same item, size, add-ons and note → one line with a bigger quantity. */
export function addToCart(cart: CartLine[], draft: DraftItemInput): CartLine[] {
  const same = (l: CartLine) =>
    l.menuItemId === draft.menuItemId &&
    l.variantId === draft.variantId &&
    l.note === draft.note &&
    [...l.modifierIds].sort().join() === [...draft.modifierIds].sort().join();
  const existing = cart.find(same);
  if (existing) return cart.map((l) => (l === existing ? { ...l, quantity: Math.min(50, l.quantity + draft.quantity) } : l));
  return [...cart, { ...draft, key: crypto.randomUUID() }];
}

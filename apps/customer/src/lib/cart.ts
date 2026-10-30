'use client';

import { useSyncExternalStore } from 'react';
import { calculateBill, unitPriceFor, type BillTotals, type DraftItemInput, type MenuItem, type PublicStore } from '@restaurant-saas/shared';
import type { OrderMode } from './api/client';
import { deviceStore } from './device-store';

/**
 * The cart lives on this device, one per restaurant branch. The totals here are for showing only:
 * the other side prices the order again from the menu (PROJECT_RULES.md §5).
 */
export interface CartLine extends DraftItemInput {
  lineId: string;
}

export interface CartState {
  lines: CartLine[];
  mode: OrderMode;
}

const EMPTY: CartState = { lines: [], mode: 'DELIVERY' };
const device = deviceStore<CartState>('lala-store-cart-v2', EMPTY);

export function useCart(key: string) {
  const state = useSyncExternalStore(device.subscribe, () => device.load(key), () => EMPTY);
  const update = (change: (s: CartState) => CartState) => device.save(key, change(device.load(key)));
  return {
    ...state,
    setMode: (mode: OrderMode) => update((s) => ({ ...s, mode })),
    /** A new line, or more of the same when item, size, add-ons and note all match. */
    addLine: (line: DraftItemInput) =>
      update((s) => {
        const same = s.lines.find(
          (l) =>
            l.menuItemId === line.menuItemId &&
            l.variantId === line.variantId &&
            l.note === line.note &&
            [...l.modifierIds].sort().join() === [...line.modifierIds].sort().join(),
        );
        if (same) return { ...s, lines: s.lines.map((l) => (l === same ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l)) };
        return { ...s, lines: [...s.lines, { ...line, lineId: crypto.randomUUID() }] };
      }),
    replaceLine: (lineId: string, line: DraftItemInput) => update((s) => ({ ...s, lines: s.lines.map((l) => (l.lineId === lineId ? { ...line, lineId } : l)) })),
    setQuantity: (lineId: string, quantity: number) =>
      update((s) => ({ ...s, lines: quantity < 1 ? s.lines.filter((l) => l.lineId !== lineId) : s.lines.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.min(50, quantity) } : l)) })),
    clear: () => update((s) => ({ ...s, lines: [] })),
  };
}

export type Cart = ReturnType<typeof useCart>;

export interface CartView {
  line: CartLine;
  item: MenuItem;
  detail: string;
  lineTotal: number;
}

/** Cart lines with names and prices from the menu; a line whose item left the menu or sold out is left out. */
export function describeCart(store: PublicStore, lines: readonly CartLine[]): { views: CartView[]; left: number } {
  const views: CartView[] = [];
  for (const line of lines) {
    const item = store.items.find((i) => i.id === line.menuItemId && i.isAvailable);
    if (!item) continue;
    const variant = item.variants.find((v) => v.id === line.variantId);
    const modifiers = store.addonGroups.flatMap((g) => g.modifiers).filter((m) => line.modifierIds.includes(m.id));
    const unit = unitPriceFor({ basePrice: item.basePrice, variantPrice: variant?.price, modifierPrices: modifiers.map((m) => m.price) });
    const detail = [variant?.name, ...modifiers.map((m) => m.name), line.note && `“${line.note}”`].filter(Boolean).join(' · ');
    views.push({ line, item, detail, lineTotal: unit * line.quantity });
  }
  return { views, left: lines.length - views.length };
}

export function cartTotals(store: PublicStore, mode: OrderMode, views: readonly CartView[]): BillTotals {
  return calculateBill({
    orderType: mode,
    lines: views.map((v) => ({ unitPrice: v.lineTotal / v.line.quantity, quantity: v.line.quantity })),
    deliveryFee: store.deliveryFee,
    settings: store.pricing,
  });
}

/** A size or a required choice needs the product page; anything else can go straight into the cart. */
export function needsChoice(store: PublicStore, item: MenuItem): boolean {
  return item.variants.length > 0 || store.addonGroups.some((g) => item.modifierGroupIds.includes(g.id) && g.minSelect > 0);
}

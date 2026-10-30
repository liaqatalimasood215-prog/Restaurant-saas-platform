'use client';

import { useSyncExternalStore } from 'react';
import { calculateBill, unitPriceFor, type BillTotals, type DraftItemInput, type MenuItem, type OnlineOrderKind, type PublicStore } from '@restaurant-saas/shared';

/**
 * The cart lives on this device, one per restaurant branch. The totals here are for showing only:
 * the other side prices the order again from the menu (PROJECT_RULES.md §5).
 */
export interface CartLine extends DraftItemInput {
  lineId: string;
}

export interface CartState {
  lines: CartLine[];
  kind: OnlineOrderKind;
}

const EMPTY: CartState = { lines: [], kind: 'DELIVERY' };
const snapshots = new Map<string, CartState>();
const listeners = new Set<() => void>();
const storageKey = (key: string) => `lala-store-cart:${key}`;
let listening = false;

function load(key: string): CartState {
  const cached = snapshots.get(key);
  if (cached) return cached;
  let state = EMPTY;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (raw) state = JSON.parse(raw) as CartState;
  } catch {
    // Storage blocked or broken: an empty cart.
  }
  snapshots.set(key, state);
  return state;
}

function save(key: string, state: CartState): void {
  snapshots.set(key, state);
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(state));
  } catch {
    // Storage blocked: the cart still works in this tab.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (!listening) {
    listening = true;
    // Another tab changed a cart.
    window.addEventListener('storage', (event) => {
      if (!event.key?.startsWith('lala-store-cart:')) return;
      snapshots.clear();
      for (const l of listeners) l();
    });
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(key: string) {
  const state = useSyncExternalStore(subscribe, () => load(key), () => EMPTY);
  const update = (change: (s: CartState) => CartState) => save(key, change(load(key)));
  return {
    ...state,
    setKind: (kind: OnlineOrderKind) => update((s) => ({ ...s, kind })),
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

export function cartTotals(store: PublicStore, kind: OnlineOrderKind, views: readonly CartView[]): BillTotals {
  return calculateBill({
    orderType: kind,
    lines: views.map((v) => ({ unitPrice: v.lineTotal / v.line.quantity, quantity: v.line.quantity })),
    deliveryFee: store.deliveryFee,
    settings: store.pricing,
  });
}

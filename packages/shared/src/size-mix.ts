import { MAX_QUANTITY_PER_LINE } from './money';
import { guessSizeQuantity } from './recipes';
import type { ItemVariant, SizePick } from './types';

/**
 * Mixed sizes on one line (owner, 2026-11-07): a customer asks for "dedh kg" Chicken Karahi, the cashier
 * or waiter taps 1 kg AND ½ kg, and the bill and the kitchen get ONE line "1.5 kg: 1 kg + ½ kg" whose price
 * is the sum of the size prices (Rs. 2,600 + Rs. 1,400 = Rs. 4,000). Only items whose every size is a
 * weight (1 kg, ½ kg, Pao) can mix; Small / Medium / Large stay one size per line.
 * Roman Urdu: 1 kg + ½ kg ek hi line ban kar "1.5 kg" — qeemat dono sizes ki jama.
 */

/** Grams in a size from its name ("½ kg" → 500, "Pao" → 250), or null (Small, Medium). */
export function sizeGrams(name: string): number | null {
  // guessSizeQuantity counts thousandths of the base unit: thousandths of a kg are grams
  return guessSizeQuantity(name, 'kg');
}

/** An item can mix sizes when it has two or more and every one of them is a weight. */
export function canMixSizes(item: { variants: readonly Pick<ItemVariant, 'name'>[] }): boolean {
  return item.variants.length > 1 && item.variants.every((v) => (sizeGrams(v.name) ?? 0) > 0);
}

/** 1500 → "1.5 kg", 750 → "0.75 kg" */
export function formatKg(grams: number): string {
  return `${Number((grams / 1000).toFixed(3))} kg`;
}

export interface SizeMix {
  /** "1.5 kg: 1 kg + ½ kg", "2.5 kg: 2 × 1 kg + ½ kg" */
  label: string;
  grams: number;
  /** Sum of the size prices, without add-ons */
  price: number;
}

/**
 * The one line that several sizes make, or null when the picks are not a valid mix: the item cannot mix,
 * fewer than two different sizes, an unknown or repeated size, or a quantity outside 1–50.
 */
export function sizeMixFor(item: { variants: readonly ItemVariant[] }, picks: readonly SizePick[]): SizeMix | null {
  if (!canMixSizes(item) || picks.length < 2) return null;
  if (new Set(picks.map((p) => p.variantId)).size !== picks.length) return null;
  const rows = [];
  for (const pick of picks) {
    const variant = item.variants.find((v) => v.id === pick.variantId);
    if (!variant || !Number.isInteger(pick.quantity) || pick.quantity < 1 || pick.quantity > MAX_QUANTITY_PER_LINE) return null;
    rows.push({ variant, quantity: pick.quantity, grams: sizeGrams(variant.name) ?? 0 });
  }
  // Menu order: 1 kg first, then ½ kg and Pao
  rows.sort((a, b) => a.variant.sort - b.variant.sort);
  const grams = rows.reduce((sum, r) => sum + r.grams * r.quantity, 0);
  const parts = rows.map((r) => (r.quantity > 1 ? `${r.quantity} × ${r.variant.name}` : r.variant.name));
  return {
    label: `${formatKg(grams)}: ${parts.join(' + ')}`,
    grams,
    price: rows.reduce((sum, r) => sum + r.variant.price * r.quantity, 0),
  };
}

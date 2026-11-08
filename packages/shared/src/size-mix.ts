import { MAX_QUANTITY_PER_LINE } from './money';
import { guessSizeQuantity } from './recipes';
import type { ItemVariant, SizePick } from './types';

/**
 * Mixed sizes on one line (owner, 2026-11-07): a customer asks for "dedh kg" Chicken Karahi, the cashier
 * or waiter taps 1 kg AND ½ kg, and the bill and the kitchen get ONE line "1.5 kg: 1 kg + ½ kg" whose price
 * is the sum of the size prices (Rs. 2,600 + Rs. 1,400 = Rs. 4,000). Weights (1 kg, ½ kg, Pao) and, since
 * 2026-11-08, plates and packings (Full plate + Half plate, and Biryani in kg and plates) can mix; Small /
 * Medium / Large stay one size per line.
 * Roman Urdu: 1 kg + ½ kg, ya Full plate + Half plate, ek hi line — qeemat sab sizes ki jama.
 */

/** Grams in a size from its name ("½ kg" → 500, "Pao" → 250), or null (Small, Medium, Full plate). */
export function sizeGrams(name: string): number | null {
  // guessSizeQuantity counts thousandths of the base unit: thousandths of a kg are grams
  return guessSizeQuantity(name, 'kg');
}

/** A plate or packing size: Full plate, Half plate, Full packing … (owner, 2026-11-08) */
export function isPlateSize(name: string): boolean {
  return /\b(plate|pack|packing)\b/i.test(name);
}

const mixableSize = (name: string) => (sizeGrams(name) ?? 0) > 0 || isPlateSize(name);

/** An item can mix sizes when it has two or more and every one of them is a weight, a plate or a packing. */
export function canMixSizes(item: { variants: readonly Pick<ItemVariant, 'name'>[] }): boolean {
  return item.variants.length > 1 && item.variants.every((v) => mixableSize(v.name));
}

/** 1500 → "1.5 kg", 750 → "0.75 kg" */
export function formatKg(grams: number): string {
  return `${Number((grams / 1000).toFixed(3))} kg`;
}

export interface SizeMix {
  /** "1.5 kg: 1 kg + ½ kg", "2.5 kg: 2 × 1 kg + ½ kg", "Full plate + Half plate" */
  label: string;
  /** The weight of the line when every size is a weight, else 0 */
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
  const parts = rows.map((r) => (r.quantity > 1 ? `${r.quantity} × ${r.variant.name}` : r.variant.name)).join(' + ');
  // The total weight only when every size is one ("1.5 kg"); plates are named as they are
  const weights = rows.every((r) => r.grams > 0);
  const grams = weights ? rows.reduce((sum, r) => sum + r.grams * r.quantity, 0) : 0;
  return {
    label: weights ? `${formatKg(grams)}: ${parts}` : parts,
    grams,
    price: rows.reduce((sum, r) => sum + r.variant.price * r.quantity, 0),
  };
}

/**
 * Selling units of menu items (owner request 2026-10-28): a kitchen ticket must say "1 kg Chicken
 * Karahi", never "1 × Chicken Karahi" when the item is sold by the kilogram.
 * Roman Urdu: Har item apni unit ke saath dikhega — 1 kg chicken kabhi "1 piece" nahi banega.
 */
export const MENU_UNITS = ['piece', 'kg', 'plate', 'litre'] as const;
export type MenuUnit = (typeof MENU_UNITS)[number];

/** "2 ×" for items sold per piece; "1 kg", "2 plate", "1.5 litre" style for the others. */
export function formatQuantity(quantity: number, unit: MenuUnit): string {
  return unit === 'piece' ? `${quantity} ×` : `${quantity} ${unit}`;
}

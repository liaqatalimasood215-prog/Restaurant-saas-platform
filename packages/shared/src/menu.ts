import { checkName, cleanName, sameName } from './tables';

/**
 * Menu setup rules (Preview 5, MASTER_PROMPT.md §7.1 Menu). The server checks these on every change;
 * the Menu screen uses them to show mistakes before saving. Old orders keep their own copies of names
 * and prices, so changing the menu never changes an old bill.
 * Roman Urdu: Menu ke qaide — naam, qeemat, size aur add-on; purane bill kabhi nahi badalte.
 */
export const MAX_SIZES = 6;
export const MAX_ADDONS_PER_GROUP = 20;
/** Rs. 1,000,000 — a typing mistake guard */
export const MAX_MENU_PRICE = 100_000_000;
export const MAX_DESCRIPTION_LENGTH = 120;

/** "850", "850.50", "1,200", "Rs 850" → paisa; null when it is not a price. */
export function parseRupees(text: string): number | null {
  const clean = text.trim().replace(/^rs\.?\s*/i, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const paisa = Math.round(Number(clean) * 100);
  return paisa <= MAX_MENU_PRICE ? paisa : null;
}

/** 85000 → "850", 85050 → "850.50" (for price fields; formatPaisa adds "Rs.") */
export function paisaToInput(paisa: number): string {
  return paisa % 100 === 0 ? String(paisa / 100) : (paisa / 100).toFixed(2);
}

export type MenuProblem =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'NAME_TAKEN'
  | 'PRICE_INVALID'
  | 'DESCRIPTION_TOO_LONG'
  | 'SIZE_NAME_REQUIRED'
  | 'SIZE_NAME_TAKEN'
  | 'TOO_MANY_SIZES'
  | 'ADDON_NAME_REQUIRED'
  | 'ADDON_NAME_TAKEN'
  | 'TOO_MANY_ADDONS'
  | 'GROUP_RULE_INVALID';

export type MenuCheck = { problem: MenuProblem; detail?: string } | null;

export interface MenuItemRule {
  name: string;
  description: string;
  /** Paisa; used when the item has no sizes */
  price: number | null;
  sizes: { name: string; price: number | null }[];
}

/**
 * An item needs a name that is new in its category and a price above zero — one price, or one per size
 * (Small / Medium / Large …, at most 6, names new inside the item).
 */
export function checkMenuItem(item: MenuItemRule, takenNamesInCategory: readonly string[]): MenuCheck {
  const nameProblem = checkName(item.name, takenNamesInCategory);
  if (nameProblem) return { problem: nameProblem as MenuProblem };
  if (item.description.trim().length > MAX_DESCRIPTION_LENGTH) return { problem: 'DESCRIPTION_TOO_LONG' };
  if (item.sizes.length === 0) {
    return item.price !== null && item.price > 0 && item.price <= MAX_MENU_PRICE ? null : { problem: 'PRICE_INVALID' };
  }
  if (item.sizes.length > MAX_SIZES) return { problem: 'TOO_MANY_SIZES' };
  const seen: string[] = [];
  for (const size of item.sizes) {
    const name = cleanName(size.name);
    if (!name) return { problem: 'SIZE_NAME_REQUIRED' };
    if (seen.some((n) => sameName(n, name))) return { problem: 'SIZE_NAME_TAKEN', detail: name };
    seen.push(name);
    if (size.price === null || size.price <= 0 || size.price > MAX_MENU_PRICE) return { problem: 'PRICE_INVALID', detail: name };
  }
  return null;
}

export interface AddonGroupRule {
  name: string;
  minSelect: number;
  maxSelect: number;
  addons: { name: string; price: number | null }[];
}

/**
 * An add-on group ("Pizza extras: choose 0–3") needs a name, at least one add-on, and a sensible rule:
 * 0 ≤ min ≤ max ≤ number of add-ons. Add-ons may be free (price 0).
 */
export function checkAddonGroup(group: AddonGroupRule, takenGroupNames: readonly string[]): MenuCheck {
  const nameProblem = checkName(group.name, takenGroupNames);
  if (nameProblem) return { problem: nameProblem as MenuProblem };
  if (group.addons.length > MAX_ADDONS_PER_GROUP) return { problem: 'TOO_MANY_ADDONS' };
  const seen: string[] = [];
  for (const addon of group.addons) {
    const name = cleanName(addon.name);
    if (!name) return { problem: 'ADDON_NAME_REQUIRED' };
    if (seen.some((n) => sameName(n, name))) return { problem: 'ADDON_NAME_TAKEN', detail: name };
    seen.push(name);
    if (addon.price === null || addon.price < 0 || addon.price > MAX_MENU_PRICE) return { problem: 'PRICE_INVALID', detail: name };
  }
  const { minSelect: min, maxSelect: max } = group;
  const valid = Number.isInteger(min) && Number.isInteger(max) && min >= 0 && max >= 1 && min <= max && max <= group.addons.length;
  return valid ? null : { problem: 'GROUP_RULE_INVALID' };
}

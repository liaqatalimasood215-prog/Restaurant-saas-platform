import type { FoodCostSummary } from './recipes';
import type { SupplierCategory } from './suppliers';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Inventory rules (owner's Smart Inventory brief 2026-11-04, Step A; docs/AI_MANAGER_PLAN.md §3).
 * - Every ingredient is counted in its stock unit (the unit recipes use: g, ml, piece, bottle, portion).
 * - Quantities are whole numbers of thousandths of that unit ("milli"): 1.5 kg of chicken kept in grams
 *   is 1,500,000. Sums never drift, and 1 kg = 1,000 g stays exact.
 * - Stock = the sum of the stock movements. Nobody types a new stock number: a change is a new movement
 *   with a reason, so the history always explains the stock.
 * Roman Urdu: Har cheez ka stock uski chhoti unit (gram, ml, piece) mein ginti hota hai. Stock kabhi
 * seedha badla nahi jata — har tabdeeli ek "movement" hai jis ki wajah likhi hoti hai.
 */

// ── Units ─────────────────────────────────────────────────────────────────────────────────────

/** The unit an ingredient is counted and used in (recipes come in Step B). */
export const STOCK_UNITS = ['g', 'ml', 'piece', 'bottle', 'portion'] as const;
export type StockUnit = (typeof STOCK_UNITS)[number];

/** The unit an ingredient is bought in. */
export const PURCHASE_UNITS = ['kg', 'g', 'l', 'ml', 'piece', 'bottle', 'portion', 'pack', 'bag', 'box', 'carton', 'tray', 'dozen'] as const;
export type PurchaseUnit = (typeof PURCHASE_UNITS)[number];

/** Weight and volume units convert by fixed numbers; the others are counted things or packages. */
const MEASURES: Partial<Record<PurchaseUnit, { stockUnit: StockUnit; factor: number }>> = {
  kg: { stockUnit: 'g', factor: 1000 },
  g: { stockUnit: 'g', factor: 1 },
  l: { stockUnit: 'ml', factor: 1000 },
  ml: { stockUnit: 'ml', factor: 1 },
};

export const MILLI = 1000;
/** Largest quantity typed in one field (a stock of 1,000,000 kg is a typing mistake). */
export const MAX_QUANTITY = 1_000_000;
/** The same limit in stock-unit thousandths (1,000,000 kg in grams) */
const MAX_STOCK_MILLI = MAX_QUANTITY * 1000 * MILLI;
/** Largest pack size: 1 carton = up to 100,000 bottles (or 100 kg in grams). */
export const MAX_PACK_SIZE = 100_000;

export function isMeasureUnit(unit: PurchaseUnit): boolean {
  return MEASURES[unit] !== undefined;
}

export type ConversionCheck =
  | { ok: true; /** stock-unit thousandths in one purchase unit */ factorMilli: number; fixed: boolean }
  | { ok: false; problem: 'INCOMPATIBLE' | 'PACK_SIZE_REQUIRED' };

/**
 * How many stock units one purchase unit holds. kg → g and l → ml are fixed (1,000); weight or volume
 * never turns into pieces (kg → ml or kg → piece is refused). A package (carton, box, pack) or a counted
 * unit other than the stock unit needs its size from the Owner: 1 carton = 24 bottles, 1 bag = 25,000 g.
 */
export function purchaseConversion(purchaseUnit: PurchaseUnit, stockUnit: StockUnit, packSizeMilli: number | null): ConversionCheck {
  const measure = MEASURES[purchaseUnit];
  if (measure) {
    return measure.stockUnit === stockUnit ? { ok: true, factorMilli: measure.factor * MILLI, fixed: true } : { ok: false, problem: 'INCOMPATIBLE' };
  }
  if ((purchaseUnit as string) === stockUnit) return { ok: true, factorMilli: MILLI, fixed: true };
  if (packSizeMilli === null || !Number.isInteger(packSizeMilli) || packSizeMilli <= 0 || packSizeMilli > MAX_PACK_SIZE * MILLI) {
    return { ok: false, problem: 'PACK_SIZE_REQUIRED' };
  }
  return { ok: true, factorMilli: packSizeMilli, fixed: false };
}

export type DisplayUnit = 'kg' | 'g' | 'l' | 'ml' | 'piece' | 'bottle' | 'portion';

/**
 * The unit people type and read stock in: kilograms and litres for weight and volume ("10 kg chicken",
 * also for a 25 kg bag of flour), grams or millilitres only when that is how it is bought (saffron), and
 * the counted unit for everything else ("60 bottles", not "2.5 cartons").
 */
export function displayUnitOf(item: { purchaseUnit: PurchaseUnit; stockUnit: StockUnit }): DisplayUnit {
  if (item.purchaseUnit === 'g' || item.purchaseUnit === 'ml') return item.purchaseUnit;
  if (item.stockUnit === 'g') return 'kg';
  if (item.stockUnit === 'ml') return 'l';
  return item.stockUnit;
}

/** Stock-unit thousandths in one display unit (1 kg = 1,000,000 milli-grams). */
export function displayFactorMilli(item: { purchaseUnit: PurchaseUnit; stockUnit: StockUnit }): number {
  const unit = displayUnitOf(item);
  return (unit === 'kg' || unit === 'l' ? 1000 : 1) * MILLI;
}

/** a × b ÷ c rounded half away from zero, exact for big numbers (BigInt). */
export function mulDivRound(a: number, b: number, c: number): number {
  if (c === 0) throw new Error('Division by zero');
  const negative = a < 0 !== b < 0 !== c < 0;
  const top = BigInt(Math.abs(a)) * BigInt(Math.abs(b));
  const bottom = BigInt(Math.abs(c));
  const rounded = (top * 2n + bottom) / (bottom * 2n);
  const value = Number(rounded);
  return negative && value !== 0 ? -value : value;
}

/** A quantity typed by a person ("8.5", "1,500", "0.25") as thousandths, or null. At most 3 decimals. */
export function parseQuantity(text: string, { allowZero = true } = {}): number | null {
  const clean = text.trim().replaceAll(',', '');
  const match = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(clean);
  if (!match) return null;
  const milli = Number(match[1]) * MILLI + Number((match[2] ?? '').padEnd(3, '0'));
  if (milli > MAX_QUANTITY * MILLI || (!allowZero && milli === 0)) return null;
  return milli;
}

/** Thousandths as a short number for screens: 8,500 · 8.5 · 0.25 (no trailing zeros). */
export function formatMilli(milli: number): string {
  const sign = milli < 0 ? '-' : '';
  const abs = Math.abs(milli);
  const whole = Math.floor(abs / MILLI).toLocaleString('en-PK');
  const fraction = String(abs % MILLI).padStart(3, '0').replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Thousandths as a value for an input field: 8.5 (no thousands commas). */
export function milliToInput(milli: number): string {
  return formatMilli(milli).replaceAll(',', '');
}

// ── Ingredients ───────────────────────────────────────────────────────────────────────────────

export const INGREDIENT_CATEGORIES = [
  'MEAT',
  'VEGETABLES',
  'DAIRY',
  'BAKERY',
  'GRAINS',
  'SAUCES_SPICES',
  'OIL',
  'BEVERAGES',
  'FROZEN',
  'PACKAGING',
  'CLEANING',
  'OTHER',
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export interface StockLocation extends BranchScoped {
  id: Uuid;
  name: string;
  sort: number;
}

/** A supplier: who brings what (Suppliers S1, owner 2026-11-05). His khata lives in suppliers.ts. */
export interface Supplier extends BranchScoped {
  id: Uuid;
  name: string;
  phone: string;
  isActive: boolean;
  category: SupplierCategory;
  address: string;
  notes: string;
  /** The products he usually brings (shared ingredients; one product may have several suppliers) */
  productIds: Uuid[];
  /** The owner's order of the supplier list (Edit order, 2026-11-06): 0 = first; missing = after them, by name */
  sortOrder?: number;
  /** His own last rate per product (paisa per purchase unit): one shared product, a price per supplier */
  rates?: Record<Uuid, Paisa>;
  /** His picture as a small JPEG data URL (DEMO: kept in this browser; real photo storage is Phase 7); missing = category picture */
  photo?: string | null;
}

/** BOUGHT from a supplier, or PREPARED in the kitchen from a batch recipe such as pizza dough (Step B). */
export const INGREDIENT_KINDS = ['BOUGHT', 'PREPARED'] as const;
export type IngredientKind = (typeof INGREDIENT_KINDS)[number];

export interface Ingredient extends BranchScoped {
  id: Uuid;
  kind: IngredientKind;
  name: string;
  /** Short unique code, e.g. CHK-001 */
  code: string;
  category: IngredientCategory;
  purchaseUnit: PurchaseUnit;
  stockUnit: StockUnit;
  /** Stock-unit thousandths in one purchase unit when it is not fixed (1 carton = 24 bottles → 24,000); null for kg / l / same unit */
  packSizeMilli: number | null;
  /** Low stock at or below this (stock-unit thousandths) */
  minStockMilli: number;
  /** What is usually ordered (purchase-unit thousandths) */
  reorderQtyMilli: number;
  /** Price of one purchase unit */
  purchasePrice: Paisa;
  preferredSupplierId: Uuid | null;
  locationId: Uuid | null;
  batchNo: string;
  /** Expiry of the stock on hand (YYYY-MM-DD), null = does not expire or not tracked */
  expiryDate: string | null;
  /** false = Not in use: hidden from lists, kept for its history */
  isActive: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Other ways to buy it besides the main purchase unit (owner, 2026-11-07): a carton of 12, a bag of 25 kg … */
  packings?: Packing[];
  /** Loose price per kg / litre / one (paisa); missing = worked out from the main price */
  loosePrice?: Paisa | null;
  /** Cooked food (prepared items): grams (or ml) in one plate, for "12.5 kg ≈ 50 plates" (owner, 2026-11-09); missing = 250 g */
  plateMilli?: number | null;
}

// ── Ways to buy one product (owner's multiple-units brief, 2026-11-07) ────────────────────────

/**
 * One product, several ways to buy it, one stock: the main purchase unit (purchaseUnit, packSizeMilli, purchasePrice —
 * what recipes cost from), loose kg / g, litre / ml or single pieces, and the product's own packings (a carton of 12
 * bottles, a bag of 25 kg, a tray of 30 eggs). Every way turns into the stock unit, so stock is counted once.
 */
export const PACKING_KINDS = ['bag', 'pack', 'box', 'carton', 'tray', 'dozen', 'bottle'] as const;
export type PackingKind = (typeof PACKING_KINDS)[number];
export const MAX_PACKINGS = 6;

export interface Packing {
  id: string;
  kind: PackingKind;
  /** Stock-unit thousandths in one (a bag of 25 kg = 25,000,000; a carton of 12 bottles = 12,000) */
  sizeMilli: number;
  /** Usual price of one (paisa) */
  pricePaisa: Paisa;
}

export interface BuyOption {
  /** 'main', 'loose:kg' … or 'pack:<packing id>' */
  key: string;
  /** The unit the quantity is typed in */
  unit: PurchaseUnit;
  /** Stock-unit thousandths in one of it */
  sizeMilli: number;
  /** Usual price (paisa) per one, or per kg / litre when rateDivisor is 1,000 (grams and ml are priced per kg / litre) */
  pricePaisa: Paisa;
  rateDivisor: 1 | 1000;
  packing: Packing | null;
}

type BuyFields = Pick<Ingredient, 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice' | 'packings' | 'loosePrice'>;

/** The loose units of a stock unit, the first one carrying the price: kg + g, litre + ml, or the counted unit. */
const LOOSE: Record<StockUnit, { unit: PurchaseUnit; size: number; divisor: 1 | 1000 }[]> = {
  g: [
    { unit: 'kg', size: 1000, divisor: 1 },
    { unit: 'g', size: 1, divisor: 1000 },
  ],
  ml: [
    { unit: 'l', size: 1000, divisor: 1 },
    { unit: 'ml', size: 1, divisor: 1000 },
  ],
  piece: [{ unit: 'piece', size: 1, divisor: 1 }],
  bottle: [{ unit: 'bottle', size: 1, divisor: 1 }],
  portion: [{ unit: 'portion', size: 1, divisor: 1 }],
};

/** Every way to buy a product: the main unit first, then loose, then its packings. Nothing when the main unit has no size. */
export function buyOptions(item: BuyFields): BuyOption[] {
  const conversion = purchaseConversion(item.purchaseUnit, item.stockUnit, item.packSizeMilli);
  if (!conversion.ok) return [];
  const main: BuyOption = { key: 'main', unit: item.purchaseUnit, sizeMilli: conversion.factorMilli, pricePaisa: item.purchasePrice, rateDivisor: 1, packing: null };
  const loose = LOOSE[item.stockUnit];
  // Loose price per kg / litre / one: set, or the main price worked out per that unit.
  const loosePrice = item.loosePrice ?? (Number.isInteger(item.purchasePrice) ? mulDivRound(item.purchasePrice, loose[0]!.size * MILLI, conversion.factorMilli) : 0);
  const looseOptions = loose
    .filter((l) => l.unit !== item.purchaseUnit)
    .map((l): BuyOption => ({ key: `loose:${l.unit}`, unit: l.unit, sizeMilli: l.size * MILLI, pricePaisa: loosePrice, rateDivisor: l.divisor, packing: null }));
  const packings = (item.packings ?? []).map((p): BuyOption => ({ key: `pack:${p.id}`, unit: p.kind, sizeMilli: p.sizeMilli, pricePaisa: p.pricePaisa, rateDivisor: 1, packing: p }));
  return [main, ...looseOptions, ...packings];
}

export function findBuyOption(item: BuyFields, key: string | undefined): BuyOption | null {
  return buyOptions(item).find((o) => o.key === (key ?? 'main')) ?? null;
}

/** quantity × rate (grams and ml at a price per kg / litre): 500 g × Rs. 650 / kg = Rs. 325. */
export function buyAmount(quantityMilli: number, ratePaisa: Paisa, rateDivisor: number = 1): Paisa {
  return mulDivRound(quantityMilli, ratePaisa, MILLI * rateDivisor);
}

/** Stock-unit thousandths a quantity adds: 2 cartons of 12 bottles = 24,000 (24 bottles). */
export function buyStockMilli(quantityMilli: number, sizeMilli: number): number {
  return mulDivRound(quantityMilli, sizeMilli, MILLI);
}

export type PackingProblem = 'KIND_INVALID' | 'SIZE_INVALID' | 'PRICE_INVALID' | 'TOO_MANY' | 'DUPLICATE';

/** Packings of one product: a known kind, a size above zero, a price (0 allowed), at most 6, no kind + size twice. */
export function checkPackings(packings: readonly { kind: string; sizeMilli: number | null; pricePaisa: number | null }[]): { index: number | null; problem: PackingProblem } | null {
  if (packings.length > MAX_PACKINGS) return { index: null, problem: 'TOO_MANY' };
  const seen = new Set<string>();
  for (const [index, p] of packings.entries()) {
    if (!(PACKING_KINDS as readonly string[]).includes(p.kind)) return { index, problem: 'KIND_INVALID' };
    if (p.sizeMilli === null || !Number.isInteger(p.sizeMilli) || p.sizeMilli <= 0 || p.sizeMilli > MAX_PACK_SIZE * 1000 * MILLI) return { index, problem: 'SIZE_INVALID' };
    if (p.pricePaisa === null || !Number.isInteger(p.pricePaisa) || p.pricePaisa < 0 || p.pricePaisa > 100_000_000) return { index, problem: 'PRICE_INVALID' };
    const key = `${p.kind}:${p.sizeMilli}`;
    if (seen.has(key)) return { index, problem: 'DUPLICATE' };
    seen.add(key);
  }
  return null;
}

export const MAX_INGREDIENT_NAME = 60;
export const MAX_BATCH_TEXT = 30;
/** Rs. 10,000,000 for one purchase unit is a typing mistake */
export const MAX_PURCHASE_PRICE: Paisa = 1_000_000_000;

export interface IngredientCheckInput {
  id: Uuid | null;
  name: string;
  code: string;
  category: string;
  purchaseUnit: string;
  stockUnit: string;
  packSizeMilli: number | null;
  minStockMilli: number | null;
  reorderQtyMilli: number | null;
  purchasePrice: Paisa | null;
  /** Only for a new ingredient: the stock it starts with (stock-unit thousandths) */
  openingMilli: number | null;
  expiryDate: string | null;
  batchNo: string;
}

export type IngredientField = 'name' | 'code' | 'category' | 'units' | 'packSize' | 'minStock' | 'reorderQty' | 'price' | 'opening' | 'expiry' | 'batch';
export type IngredientProblem =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'NAME_TAKEN'
  | 'CODE_INVALID'
  | 'CODE_TAKEN'
  | 'CATEGORY_INVALID'
  | 'UNITS_INCOMPATIBLE'
  | 'PACK_SIZE_REQUIRED'
  | 'QUANTITY_INVALID'
  | 'PRICE_INVALID'
  | 'EXPIRY_INVALID'
  | 'BATCH_TOO_LONG';

const CODE = /^[A-Z0-9]{2,6}-\d{3,4}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function cleanIngredientName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isValidDate(text: string): boolean {
  if (!DATE.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/** The first problem with an ingredient, or null. `others` = the restaurant's other ingredients. */
export function checkIngredient(
  input: IngredientCheckInput,
  others: readonly Pick<Ingredient, 'id' | 'name' | 'code'>[],
): { field: IngredientField; problem: IngredientProblem } | null {
  const name = cleanIngredientName(input.name);
  const rest = others.filter((o) => o.id !== input.id);
  if (!name) return { field: 'name', problem: 'NAME_REQUIRED' };
  if (name.length > MAX_INGREDIENT_NAME) return { field: 'name', problem: 'NAME_TOO_LONG' };
  if (rest.some((o) => o.name.toLowerCase() === name.toLowerCase())) return { field: 'name', problem: 'NAME_TAKEN' };
  const code = input.code.trim().toUpperCase();
  if (!CODE.test(code)) return { field: 'code', problem: 'CODE_INVALID' };
  if (rest.some((o) => o.code.toUpperCase() === code)) return { field: 'code', problem: 'CODE_TAKEN' };
  if (!(INGREDIENT_CATEGORIES as readonly string[]).includes(input.category)) return { field: 'category', problem: 'CATEGORY_INVALID' };
  if (!(PURCHASE_UNITS as readonly string[]).includes(input.purchaseUnit) || !(STOCK_UNITS as readonly string[]).includes(input.stockUnit)) {
    return { field: 'units', problem: 'UNITS_INCOMPATIBLE' };
  }
  const conversion = purchaseConversion(input.purchaseUnit as PurchaseUnit, input.stockUnit as StockUnit, input.packSizeMilli);
  if (!conversion.ok) {
    return conversion.problem === 'INCOMPATIBLE' ? { field: 'units', problem: 'UNITS_INCOMPATIBLE' } : { field: 'packSize', problem: 'PACK_SIZE_REQUIRED' };
  }
  const quantityOk = (milli: number | null) => milli !== null && Number.isInteger(milli) && milli >= 0 && milli <= MAX_STOCK_MILLI;
  if (!quantityOk(input.minStockMilli)) return { field: 'minStock', problem: 'QUANTITY_INVALID' };
  if (!quantityOk(input.reorderQtyMilli)) return { field: 'reorderQty', problem: 'QUANTITY_INVALID' };
  if (input.purchasePrice === null || !Number.isInteger(input.purchasePrice) || input.purchasePrice < 0 || input.purchasePrice > MAX_PURCHASE_PRICE) {
    return { field: 'price', problem: 'PRICE_INVALID' };
  }
  if (input.id === null && !quantityOk(input.openingMilli)) return { field: 'opening', problem: 'QUANTITY_INVALID' };
  if (input.expiryDate !== null && !isValidDate(input.expiryDate)) return { field: 'expiry', problem: 'EXPIRY_INVALID' };
  if (input.batchNo.trim().length > MAX_BATCH_TEXT) return { field: 'batch', problem: 'BATCH_TOO_LONG' };
  return null;
}

/**
 * A code for a new ingredient: the first letter of the name and its next different consonants
 * (Chicken → CHK, Mozzarella → MZR), then the next free number: CHK-001, CHK-002 …
 */
export function suggestIngredientCode(name: string, existingCodes: readonly string[]): string {
  const letters = cleanIngredientName(name).toUpperCase().replace(/[^A-Z]/g, '');
  const picked: string[] = [];
  for (const [i, letter] of [...letters].entries()) {
    if (picked.length === 3) break;
    if (picked.includes(letter)) continue;
    if (i === 0 || !'AEIOU'.includes(letter)) picked.push(letter);
  }
  for (const letter of letters) {
    if (picked.length === 3) break;
    if (!picked.includes(letter)) picked.push(letter);
  }
  const prefix = (picked.join('') || 'ING').padEnd(2, 'X');
  const used = new Set(existingCodes.map((c) => c.toUpperCase()));
  for (let n = 1; n < 10_000; n++) {
    const code = `${prefix}-${String(n).padStart(3, '0')}`;
    if (!used.has(code)) return code;
  }
  return `${prefix}-${String(Date.now() % 10_000).padStart(4, '0')}`;
}

// ── Stock ledger ──────────────────────────────────────────────────────────────────────────────

/** Step A: the opening stock and corrections. Purchases, kitchen use, waste and transfers follow in later steps. */
/** PURCHASE = received from a supplier (Suppliers S1); the khata entry and supplier are kept on the movement. */
/** COOK_USE = raw ingredients taken by a cooking batch, COOKED = the cooked dish it made (I3, owner 2026-11-09; batchId on both). */
export const MOVEMENT_TYPES = ['OPENING', 'ADJUSTMENT', 'PURCHASE', 'COOK_USE', 'COOKED', 'SALE_USE', 'SALE_RETURN'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const ADJUST_REASONS = ['RECOUNT', 'ENTRY_MISTAKE', 'FOUND', 'OTHER'] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

export interface StockMovement extends BranchScoped {
  id: Uuid;
  ingredientId: Uuid;
  type: MovementType;
  /** Signed stock-unit thousandths: + adds, − removes */
  quantityMilli: number;
  reason: AdjustReason | null;
  note: string;
  createdBy: Uuid;
  createdAt: IsoDateTime;
  /** PURCHASE only: who brought it and its khata entry */
  supplierId?: Uuid;
  khataEntryId?: Uuid;
  /** COOK_USE / COOKED (and their reversal or correction): the cooking batch */
  batchId?: Uuid;
  /** SALE_USE / SALE_RETURN (I4): the order line whose stock it is */
  orderId?: Uuid;
  orderItemId?: Uuid;
}

export const MAX_MOVEMENT_NOTE = 120;

/** Stock on hand = the sum of the ingredient's movements (stock-unit thousandths). */
export function onHandOf(ingredientId: Uuid, movements: readonly Pick<StockMovement, 'ingredientId' | 'quantityMilli'>[]): number {
  return movements.reduce((sum, m) => (m.ingredientId === ingredientId ? sum + m.quantityMilli : sum), 0);
}

export type AdjustProblem = 'QUANTITY_INVALID' | 'REASON_REQUIRED' | 'NOTE_REQUIRED' | 'NOTE_TOO_LONG' | 'MORE_THAN_ON_HAND';

/** A correction of the stock: a reason always, a note for "Other", never below zero. */
export function checkAdjustment(input: {
  direction: 'ADD' | 'REMOVE';
  quantityMilli: number | null;
  reason: string | null;
  note: string;
  onHandMilli: number;
}): AdjustProblem | null {
  if (input.quantityMilli === null || !Number.isInteger(input.quantityMilli) || input.quantityMilli <= 0 || input.quantityMilli > MAX_STOCK_MILLI) {
    return 'QUANTITY_INVALID';
  }
  if (!input.reason || !(ADJUST_REASONS as readonly string[]).includes(input.reason)) return 'REASON_REQUIRED';
  if (input.note.trim().length > MAX_MOVEMENT_NOTE) return 'NOTE_TOO_LONG';
  if (input.reason === 'OTHER' && !input.note.trim()) return 'NOTE_REQUIRED';
  if (input.direction === 'REMOVE' && input.quantityMilli > input.onHandMilli) return 'MORE_THAN_ON_HAND';
  return null;
}

// ── Status, expiry and value ──────────────────────────────────────────────────────────────────

export type StockStatus = 'AVAILABLE' | 'LOW' | 'OUT' | 'NOT_IN_USE';

export function stockStatus(input: { onHandMilli: number; minStockMilli: number; isActive: boolean }): StockStatus {
  if (!input.isActive) return 'NOT_IN_USE';
  if (input.onHandMilli <= 0) return 'OUT';
  if (input.onHandMilli <= input.minStockMilli) return 'LOW';
  return 'AVAILABLE';
}

export const DEFAULT_EXPIRING_SOON_DAYS = 3;
export type ExpiryState = 'NONE' | 'OK' | 'SOON' | 'EXPIRED';

/** Days from `today` to `date` (both YYYY-MM-DD). */
export function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** EXPIRED before today; SOON from today up to `soonDays` ahead. Stock that is used up never warns. */
export function expiryState(expiryDate: string | null, today: string, onHandMilli: number, soonDays = DEFAULT_EXPIRING_SOON_DAYS): ExpiryState {
  if (!expiryDate || onHandMilli <= 0) return 'NONE';
  const days = daysBetween(today, expiryDate);
  if (days < 0) return 'EXPIRED';
  return days <= soonDays ? 'SOON' : 'OK';
}

/** Value of the stock on hand at the purchase price: 8.5 kg chicken at Rs. 650 / kg = Rs. 5,525. Negative stock counts 0. */
export function stockValueOf(item: Pick<Ingredient, 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice'>, onHandMilli: number): Paisa {
  const conversion = purchaseConversion(item.purchaseUnit, item.stockUnit, item.packSizeMilli);
  if (!conversion.ok || onHandMilli <= 0) return 0;
  return mulDivRound(onHandMilli, item.purchasePrice, conversion.factorMilli);
}

// ── What the Inventory screens get ────────────────────────────────────────────────────────────

export interface IngredientRow {
  ingredient: Ingredient;
  onHandMilli: number;
  status: StockStatus;
  expiry: ExpiryState;
  value: Paisa;
  supplierName: string | null;
  locationName: string | null;
}

export interface StockMovementRow {
  movement: StockMovement;
  ingredientName: string;
  purchaseUnit: PurchaseUnit;
  stockUnit: StockUnit;
  byName: string | null;
}

export interface InventorySummary {
  /** Value of everything in stock at purchase prices */
  stockValue: Paisa;
  /** Ingredients in use */
  ingredients: number;
  low: number;
  out: number;
  expiringSoon: number;
  expired: number;
}

export interface InventoryView {
  /** Today's date in the branch (YYYY-MM-DD), for expiry */
  today: string;
  expiringSoonDays: number;
  summary: InventorySummary;
  /** Step B: food cost of the menu recipes */
  foodCost: FoodCostSummary;
  ingredients: IngredientRow[];
  /** Newest first */
  movements: StockMovementRow[];
  locations: StockLocation[];
  suppliers: Supplier[];
  /** I3: cooked food (prepared items) with its stock, apart from the raw ingredients */
  cooked?: IngredientRow[];
  /** I3: how many raw ingredients today's and tomorrow's cooking plans are short of (apart from low stock) */
  cookingShort?: { today: number; tomorrow: number };
  /** I4: ready food that may still be given to another order, and today's sold lines with a part not tracked (no verified recipe) */
  availableFood?: number;
  notTrackedToday?: { name: string; count: number }[];
}

/** The dashboard numbers. Ingredients marked Not in use are left out. */
export function summarizeInventory(rows: readonly Pick<IngredientRow, 'status' | 'expiry' | 'value'>[]): InventorySummary {
  const used = rows.filter((r) => r.status !== 'NOT_IN_USE');
  return {
    stockValue: used.reduce((sum, r) => sum + r.value, 0),
    ingredients: used.length,
    low: used.filter((r) => r.status === 'LOW').length,
    out: used.filter((r) => r.status === 'OUT').length,
    expiringSoon: used.filter((r) => r.expiry === 'SOON').length,
    expired: used.filter((r) => r.expiry === 'EXPIRED').length,
  };
}

// ── Stock history (inventory phase 1) ─────────────────────────────────────────────────────────

/** One stock change with the stock it left behind. */
export interface StockLedgerRow extends StockMovementRow {
  balanceAfterMilli: number;
}

export interface StockLedgerQuery {
  ingredientId: Uuid | null;
  type: MovementType | null;
  /** YYYY-MM-DD in the branch, both days included; null = no limit */
  from: string | null;
  to: string | null;
  staffId: Uuid | null;
}

export interface StockLedgerView {
  /** Newest first, at most `limit` */
  rows: StockLedgerRow[];
  /** All matching changes, also those beyond the limit */
  total: number;
  limit: number;
  /** Who made changes, for the filter */
  staff: { id: Uuid; name: string }[];
}

/**
 * The stock after each movement, per ingredient, in the order they happened (oldest first; the same time keeps the
 * saved order). Returns movement id → stock left (stock-unit thousandths).
 */
export function balancesAfter(movements: readonly Pick<StockMovement, 'id' | 'ingredientId' | 'quantityMilli' | 'createdAt'>[]): Map<Uuid, number> {
  const ordered = movements.map((m, index) => ({ m, index })).sort((a, b) => a.m.createdAt.localeCompare(b.m.createdAt) || a.index - b.index);
  const running = new Map<Uuid, number>();
  const after = new Map<Uuid, number>();
  for (const { m } of ordered) {
    const balance = (running.get(m.ingredientId) ?? 0) + m.quantityMilli;
    running.set(m.ingredientId, balance);
    after.set(m.id, balance);
  }
  return after;
}

/** Days for the quick period filters, counted back from today (YYYY-MM-DD). */
export function periodRange(period: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL', today: string): { from: string | null; to: string | null } {
  if (period === 'ALL') return { from: null, to: null };
  if (period === 'MONTH') return { from: `${today.slice(0, 8)}01`, to: today };
  const from = new Date(`${today}T00:00:00Z`);
  if (period === 'WEEK') from.setUTCDate(from.getUTCDate() - 6);
  return { from: from.toISOString().slice(0, 10), to: today };
}

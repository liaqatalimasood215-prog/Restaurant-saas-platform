import { MAX_QUANTITY, MILLI, mulDivRound, purchaseConversion, type Ingredient, type Supplier } from './inventory';
import type { BranchScoped, IsoDateTime, Paisa, Uuid } from './types';

/**
 * Suppliers and their khata (owner's Smart Supplier brief 2026-11-05, step S1). One supplier = one screen:
 * the products he brings, Receive Stock (stock and khata in one step), and Settle Payment.
 * - A delivery is one PURCHASE entry with one line per product. Receiving adds a PURCHASE stock movement per line
 *   (the shared stock, never a stock per supplier) and the amount to his khata, once.
 * - A payment lowers what we owe and never changes stock.
 * - What we owe = the sum of the entries, kept across days (never reset at midnight). Entries are never edited or
 *   deleted; returns and corrections come in S2 as new entries.
 * Roman Urdu: Har supplier ka apna khata. Maal aaya to stock bhi barha aur khata bhi; paisa diya to sirf khata kam hua.
 */

export const SUPPLIER_CATEGORIES = ['DAIRY', 'CHICKEN', 'MEAT', 'FISH', 'VEGETABLES', 'GROCERY', 'DRINKS', 'PACKAGING', 'FUEL', 'OTHER'] as const;
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

export const KHATA_KINDS = ['OPENING_BALANCE', 'PURCHASE', 'PAYMENT'] as const;
export type KhataKind = (typeof KHATA_KINDS)[number];

export const SUPPLIER_PAYMENT_METHODS = ['CASH', 'BANK', 'OTHER'] as const;
export type SupplierPaymentMethod = (typeof SUPPLIER_PAYMENT_METHODS)[number];

/** One product of a delivery: what came, at which rate, and what it added to stock. */
export interface ReceiptLine {
  ingredientId: Uuid;
  /** Thousandths of the purchase unit as typed (50 litres = 50,000) */
  quantityMilli: number;
  /** Rate per purchase unit (Rs. 220 per litre = 22,000) */
  ratePaisa: Paisa;
  /** quantity × rate */
  amount: Paisa;
  /** Stock-unit thousandths added (50 litres = 50,000,000 ml-thousandths) */
  stockMilli: number;
  movementId: Uuid;
}

export interface KhataEntry extends BranchScoped {
  id: Uuid;
  supplierId: Uuid;
  kind: KhataKind;
  /** Signed: + raises what we owe (purchase, opening balance), − lowers it (payment) */
  amount: Paisa;
  /** Purchases only */
  lines: ReceiptLine[];
  method: SupplierPaymentMethod | null;
  /** The business day it counts for (a payment may be dated earlier) */
  businessDate: string;
  note: string;
  createdBy: Uuid;
  createdAt: IsoDateTime;
}

export const MAX_SUPPLIER_NOTE = 200;
export const MAX_RECEIPT_LINES = 30;
/** Rs. 1,000,000 per unit or per payment — a typing-mistake guard */
export const MAX_SUPPLIER_AMOUNT = 100_000_000;

/** Quantity × rate per purchase unit, in paisa (50 L × Rs. 220 = Rs. 11,000). */
export function lineAmount(quantityMilli: number, ratePaisa: Paisa): Paisa {
  return mulDivRound(quantityMilli, ratePaisa, MILLI);
}

/** Stock-unit thousandths a received quantity adds (50 L → 50,000 ml; 2 bags of 20 kg → 40,000 g), or null without a pack size. */
export function receivedStockMilli(quantityMilli: number, ingredient: Pick<Ingredient, 'purchaseUnit' | 'stockUnit' | 'packSizeMilli'>): number | null {
  const conversion = purchaseConversion(ingredient.purchaseUnit, ingredient.stockUnit, ingredient.packSizeMilli);
  return conversion.ok ? mulDivRound(quantityMilli, conversion.factorMilli, MILLI) : null;
}

export type ReceiptProblem = 'NO_LINES' | 'TOO_MANY_LINES' | 'PRODUCT_REQUIRED' | 'DUPLICATE_PRODUCT' | 'QUANTITY_INVALID' | 'RATE_INVALID' | 'UNITS_INVALID' | 'NOTE_TOO_LONG';

/** The first problem with a delivery, or null. Every product once, a real quantity and a rate above zero. */
export function checkReceipt(
  input: { lines: readonly { ingredientId: Uuid; quantityMilli: number | null; ratePaisa: number | null }[]; note: string },
  ingredients: readonly Pick<Ingredient, 'id' | 'isActive' | 'kind' | 'purchaseUnit' | 'stockUnit' | 'packSizeMilli'>[],
): { line: number | null; problem: ReceiptProblem } | null {
  if (input.lines.length === 0) return { line: null, problem: 'NO_LINES' };
  if (input.lines.length > MAX_RECEIPT_LINES) return { line: null, problem: 'TOO_MANY_LINES' };
  const seen = new Set<Uuid>();
  for (const [index, line] of input.lines.entries()) {
    const ingredient = ingredients.find((i) => i.id === line.ingredientId);
    if (!ingredient || !ingredient.isActive || ingredient.kind !== 'BOUGHT') return { line: index, problem: 'PRODUCT_REQUIRED' };
    if (seen.has(line.ingredientId)) return { line: index, problem: 'DUPLICATE_PRODUCT' };
    seen.add(line.ingredientId);
    if (line.quantityMilli === null || !Number.isInteger(line.quantityMilli) || line.quantityMilli <= 0 || line.quantityMilli > MAX_QUANTITY * MILLI) return { line: index, problem: 'QUANTITY_INVALID' };
    if (line.ratePaisa === null || !Number.isInteger(line.ratePaisa) || line.ratePaisa <= 0 || line.ratePaisa > MAX_SUPPLIER_AMOUNT) return { line: index, problem: 'RATE_INVALID' };
    if (receivedStockMilli(line.quantityMilli, ingredient) === null) return { line: index, problem: 'UNITS_INVALID' };
  }
  if (input.note.trim().length > MAX_SUPPLIER_NOTE) return { line: null, problem: 'NOTE_TOO_LONG' };
  return null;
}

export type PaymentProblem = 'AMOUNT_INVALID' | 'MORE_THAN_DUE' | 'NOTHING_DUE' | 'METHOD_INVALID' | 'DATE_INVALID' | 'NOTE_TOO_LONG';

/**
 * A payment: more than zero, never more than what we owe (an advance comes later), a method, a date that is not in
 * the future. Full, partial and several payments a day are all allowed.
 */
export function checkSupplierPayment(input: { amount: number | null; method: string | null; date: string; note: string }, dueNow: Paisa, today: string): PaymentProblem | null {
  if (dueNow <= 0) return 'NOTHING_DUE';
  if (input.amount === null || !Number.isInteger(input.amount) || input.amount <= 0 || input.amount > MAX_SUPPLIER_AMOUNT) return 'AMOUNT_INVALID';
  if (input.amount > dueNow) return 'MORE_THAN_DUE';
  if (!input.method || !(SUPPLIER_PAYMENT_METHODS as readonly string[]).includes(input.method)) return 'METHOD_INVALID';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > today) return 'DATE_INVALID';
  if (input.note.trim().length > MAX_SUPPLIER_NOTE) return 'NOTE_TOO_LONG';
  return null;
}

export type KhataStatus = 'PAID' | 'PARTLY_PAID' | 'UNPAID';

export interface KhataSummary {
  /** Owed from before today, including an opening balance */
  previousDue: Paisa;
  todayPurchases: Paisa;
  /** Positive: what was paid today */
  todayPayments: Paisa;
  /** Everything we owe now */
  totalDue: Paisa;
  status: KhataStatus;
}

const chronological = <T extends Pick<KhataEntry, 'createdAt'>>(entries: readonly T[]): T[] =>
  entries.map((e, index) => ({ e, index })).sort((a, b) => a.e.createdAt.localeCompare(b.e.createdAt) || a.index - b.index).map(({ e }) => e);

/**
 * Today's purchases and payments, what was owed before today, and the status: Paid when nothing is owed, Partly paid
 * when something was paid since the khata was last clear, else Unpaid.
 */
export function khataSummary(entries: readonly Pick<KhataEntry, 'kind' | 'amount' | 'businessDate' | 'createdAt'>[], today: string): KhataSummary {
  let previousDue = 0;
  let todayPurchases = 0;
  let todayPayments = 0;
  let totalDue = 0;
  let paidSinceClear = false;
  for (const entry of chronological(entries)) {
    totalDue += entry.amount;
    const isToday = entry.kind !== 'OPENING_BALANCE' && entry.businessDate === today;
    if (!isToday) previousDue += entry.amount;
    else if (entry.kind === 'PURCHASE') todayPurchases += entry.amount;
    else if (entry.kind === 'PAYMENT') todayPayments -= entry.amount;
    if (entry.kind === 'PAYMENT') paidSinceClear = true;
    if (totalDue <= 0) paidSinceClear = false;
  }
  const status: KhataStatus = totalDue <= 0 ? 'PAID' : paidSinceClear ? 'PARTLY_PAID' : 'UNPAID';
  return { previousDue, todayPurchases, todayPayments, totalDue, status };
}

/** What we owed after each entry (in the order they happened). */
export function khataBalances(entries: readonly Pick<KhataEntry, 'id' | 'amount' | 'createdAt'>[]): Map<Uuid, Paisa> {
  const after = new Map<Uuid, Paisa>();
  let running = 0;
  for (const entry of chronological(entries)) {
    running += entry.amount;
    after.set(entry.id, running);
  }
  return after;
}

// ── The list's order and pictures (owner, 2026-11-06) ─────────────────────────────────────────

/** His order first (sortOrder 0, 1, 2 …), then the suppliers he never placed, by name. */
export function sortSuppliers<T extends Pick<Supplier, 'name' | 'sortOrder'>>(suppliers: readonly T[]): T[] {
  return [...suppliers].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || a.name.localeCompare(b.name));
}

/**
 * Edit order: the suppliers he tapped come first in that order, the others follow in their old order. Returns every id
 * once, so saving it gives each supplier a place. An empty tap list keeps the old order.
 */
export function supplierOrderAfterPicking(currentIds: readonly Uuid[], picked: readonly Uuid[]): Uuid[] {
  const chosen = [...new Set(picked)].filter((id) => currentIds.includes(id));
  return [...chosen, ...currentIds.filter((id) => !chosen.includes(id))];
}

/** "Daily use" window of a supplier's products (owner, 2026-11-06: what comes most often shows first). */
export const PRODUCT_USE_DAYS = 30;

/**
 * How many deliveries of this supplier brought each product in the last 30 business days (today included). Counted, not
 * set by hand (owner's choice): the products that come most often show first.
 */
export function deliveriesPerProduct(entries: readonly Pick<KhataEntry, 'kind' | 'lines' | 'businessDate'>[], today: string): Map<Uuid, number> {
  const from = new Date(`${today}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - (PRODUCT_USE_DAYS - 1));
  const since = from.toISOString().slice(0, 10);
  const counts = new Map<Uuid, number>();
  for (const entry of entries) {
    if (entry.kind !== 'PURCHASE' || entry.businessDate < since || entry.businessDate > today) continue;
    for (const id of new Set(entry.lines.map((l) => l.ingredientId))) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Most deliveries first; equal ones by name. */
export function sortByUse<T extends { name: string; id: Uuid }>(products: readonly T[], counts: ReadonlyMap<Uuid, number>): T[] {
  return [...products].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name));
}

/** About 110 KB of text: a 256 px JPEG is far smaller; a whole camera photo is refused. */
export const MAX_SUPPLIER_PHOTO_CHARS = 150_000;

/** A supplier picture: a small PNG / JPEG / WebP data URL. (DEMO; Phase 7 stores real photos in file storage.) */
export function isSupplierPhoto(value: unknown): value is string {
  return typeof value === 'string' && value.length <= MAX_SUPPLIER_PHOTO_CHARS && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/** The demo picture of a supplier without his own photo: what he brings. */
export const SUPPLIER_CATEGORY_ART: Record<SupplierCategory, string> = {
  DAIRY: '🥛',
  CHICKEN: '🐔',
  MEAT: '🥩',
  FISH: '🐟',
  VEGETABLES: '🥬',
  GROCERY: '🛒',
  DRINKS: '🥤',
  PACKAGING: '📦',
  FUEL: '🔥',
  OTHER: '🏪',
};

// ── What the Suppliers screens get ────────────────────────────────────────────────────────────

export interface SupplierRow {
  supplier: Supplier;
  summary: KhataSummary;
}

export interface SupplierProductRow {
  ingredient: Ingredient;
  onHandMilli: number;
  /** Rate of the last purchase (the ingredient's purchase price per purchase unit) */
  lastRatePaisa: Paisa;
  lastReceivedAt: IsoDateTime | null;
  /** His deliveries with this product in the last 30 days (the list shows the most first) */
  deliveries30d: number;
}

export interface KhataEntryRow {
  entry: KhataEntry;
  /** What we owed after this entry */
  balanceAfter: Paisa;
  byName: string | null;
}

export interface SuppliersView {
  today: string;
  suppliers: SupplierRow[];
  todayPurchases: Paisa;
  totalDue: Paisa;
}

export interface SupplierWorkspace {
  today: string;
  supplier: Supplier;
  summary: KhataSummary;
  products: SupplierProductRow[];
  /** Newest first, for the chosen period */
  entries: KhataEntryRow[];
  /** Every bought ingredient in use, to add to his products and to name old lines */
  ingredients: Ingredient[];
}

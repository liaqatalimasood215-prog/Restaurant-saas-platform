/**
 * Money is stored as whole numbers in PAISA (1 rupee = 100 paisa).
 * Roman Urdu: Paise hamesha poore number mein save hote hain, taa ke hisaab mein point wali ghalti na ho.
 */

export function rupeesToPaisa(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) throw new Error('Invalid rupee amount');
  return Math.round(rupees * 100);
}

export function assertPaisa(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Paisa amount must be a whole, non-negative number');
}

/** 85000 → "Rs. 850", 85050 → "Rs. 850.50" */
export function formatPaisa(amount: number): string {
  assertPaisa(amount);
  const rupees = Math.floor(amount / 100);
  const paisa = amount % 100;
  const whole = rupees.toLocaleString('en-PK');
  return paisa === 0 ? `Rs. ${whole}` : `Rs. ${whole}.${String(paisa).padStart(2, '0')}`;
}

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export const MAX_QUANTITY_PER_LINE = 50;

/** Server-side total calculation. Prices come from the database, never from the browser. */
export function calculateTotals(lines: readonly PricedLine[], deliveryFee: number) {
  assertPaisa(deliveryFee);
  let subtotal = 0;
  const lineTotals = lines.map((l) => {
    assertPaisa(l.unitPrice);
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_QUANTITY_PER_LINE) {
      throw new Error(`Quantity must be between 1 and ${MAX_QUANTITY_PER_LINE}`);
    }
    const lineTotal = l.unitPrice * l.quantity;
    subtotal += lineTotal;
    return lineTotal;
  });
  return { lineTotals, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

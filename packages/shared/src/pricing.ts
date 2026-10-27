import { assertPaisa, MAX_QUANTITY_PER_LINE } from './money';
import type { OrderType } from './order-status';

/**
 * Trusted pricing engine (MASTER_PROMPT.md §8). The server calculates every bill with these
 * functions; prototypes use the same functions, so demo totals match the real ones.
 * Percentages are whole numbers in basis points (1% = 100 bps) — no decimals anywhere.
 * Roman Urdu: Bill ka hisaab sirf yahan hota hai. Browser ke bheje hue number nahi maane jate.
 */
export const BPS_PER_PERCENT = 100;
const BPS_DENOMINATOR = 10_000;

function assertBps(bps: number): void {
  if (!Number.isInteger(bps) || bps < 0 || bps > BPS_DENOMINATOR) {
    throw new Error('Percentage must be a whole number of basis points between 0 and 10000');
  }
}

/** bps share of an amount, rounded half up to the nearest paisa. */
function shareOf(amount: number, bps: number): number {
  return Math.round((amount * bps) / BPS_DENOMINATOR);
}

/** Unit price of one menu line: size price (or base price) + add-on prices. */
export function unitPriceFor(input: {
  basePrice: number;
  variantPrice?: number | null;
  modifierPrices?: readonly number[];
}): number {
  const start = input.variantPrice ?? input.basePrice;
  assertPaisa(start);
  let unit = start;
  for (const price of input.modifierPrices ?? []) {
    assertPaisa(price);
    unit += price;
  }
  return unit;
}

export interface BillLine {
  /** Size/base price + add-ons, in paisa (copied at order time) */
  unitPrice: number;
  quantity: number;
  /** Voided items stay on the order but are excluded from the bill. */
  isVoid?: boolean;
}

export type DiscountInput = { kind: 'PERCENT'; bps: number } | { kind: 'FIXED'; amount: number };

/** Per-branch tax settings. The owner sets these values — the developer never guesses legal rates. */
export interface TaxSettings {
  rateBps: number;
  /** Menu prices already include tax: the tax inside them is shown, not added. */
  pricesIncludeTax: boolean;
  appliesToServiceCharge: boolean;
  appliesToDeliveryFee: boolean;
}

export interface BillSettings {
  tax: TaxSettings;
  /** Dine-in service charge; 0 = off */
  serviceChargeBps: number;
  /** Round the total to the nearest rupee, shown as its own line */
  roundToRupee: boolean;
}

export const NO_TAX: TaxSettings = {
  rateBps: 0,
  pricesIncludeTax: false,
  appliesToServiceCharge: false,
  appliesToDeliveryFee: false,
};

export interface BillInput {
  orderType: OrderType;
  lines: readonly BillLine[];
  discount?: DiscountInput | null;
  /** Branch delivery fee; used for DELIVERY orders only */
  deliveryFee?: number;
  settings: BillSettings;
}

export interface BillTotals {
  itemsSubtotal: number;
  discount: number;
  serviceCharge: number;
  /** Tax added on top of the prices */
  tax: number;
  /** Tax already inside tax-inclusive menu prices (shown for information, not added) */
  taxIncludedInPrices: number;
  deliveryFee: number;
  /** Rounding to the nearest rupee; can be negative */
  rounding: number;
  total: number;
}

/**
 * items_subtotal = Σ unit price × quantity (voided items excluded)
 * discount       = % or fixed amount on items_subtotal
 * service_charge = service charge % × (items_subtotal − discount)   (dine-in)
 * tax            = rate × taxable amount (per tax settings)
 * delivery_fee   = branch delivery fee                              (delivery)
 * rounding       = to the nearest rupee (setting)
 * total          = items_subtotal − discount + service_charge + tax + delivery_fee ± rounding
 */
export function calculateBill(input: BillInput): BillTotals {
  const { settings } = input;
  assertBps(settings.serviceChargeBps);
  assertBps(settings.tax.rateBps);

  let itemsSubtotal = 0;
  for (const line of input.lines) {
    assertPaisa(line.unitPrice);
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) {
      throw new Error(`Quantity must be between 1 and ${MAX_QUANTITY_PER_LINE}`);
    }
    if (!line.isVoid) itemsSubtotal += line.unitPrice * line.quantity;
  }

  let discount = 0;
  if (input.discount?.kind === 'PERCENT') {
    assertBps(input.discount.bps);
    discount = shareOf(itemsSubtotal, input.discount.bps);
  } else if (input.discount?.kind === 'FIXED') {
    assertPaisa(input.discount.amount);
    if (input.discount.amount > itemsSubtotal) throw new Error('Discount cannot be more than the items subtotal');
    discount = input.discount.amount;
  }
  const itemsNet = itemsSubtotal - discount;

  const serviceCharge = input.orderType === 'DINE_IN' ? shareOf(itemsNet, settings.serviceChargeBps) : 0;

  const deliveryFee = input.orderType === 'DELIVERY' ? (input.deliveryFee ?? 0) : 0;
  assertPaisa(deliveryFee);

  const { tax: taxSettings } = settings;
  const extraTaxable =
    (taxSettings.appliesToServiceCharge ? serviceCharge : 0) + (taxSettings.appliesToDeliveryFee ? deliveryFee : 0);
  let tax: number;
  let taxIncludedInPrices = 0;
  if (taxSettings.pricesIncludeTax) {
    taxIncludedInPrices = Math.round((itemsNet * taxSettings.rateBps) / (BPS_DENOMINATOR + taxSettings.rateBps));
    tax = shareOf(extraTaxable, taxSettings.rateBps);
  } else {
    tax = shareOf(itemsNet + extraTaxable, taxSettings.rateBps);
  }

  const beforeRounding = itemsNet + serviceCharge + tax + deliveryFee;
  const rounding = settings.roundToRupee ? Math.round(beforeRounding / 100) * 100 - beforeRounding : 0;

  return {
    itemsSubtotal,
    discount,
    serviceCharge,
    tax,
    taxIncludedInPrices,
    deliveryFee,
    rounding,
    total: beforeRounding + rounding,
  };
}

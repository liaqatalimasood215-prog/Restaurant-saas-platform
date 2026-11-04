import {
  MILLI,
  displayFactorMilli,
  displayUnitOf,
  formatMilli,
  mulDivRound,
  type DisplayUnit,
  type ExpiryState,
  type Ingredient,
  type PurchaseUnit,
  type RecipeUnit,
  type StockStatus,
  type StockUnit,
} from '@restaurant-saas/shared';
import type { Tone } from '@/components/ui/badge';
import { t } from '@/i18n';

/** Screen helpers for Inventory: units in words, stock in the unit people read (kg, litres, bottles). */

type AnyUnit = PurchaseUnit | StockUnit | DisplayUnit | RecipeUnit;
type Units = Pick<Ingredient, 'purchaseUnit' | 'stockUnit'>;

export function unitLabel(unit: AnyUnit, milli: number): string {
  return milli === MILLI ? t(`inventory.unitOne.${unit}`) : t(`inventory.unitMany.${unit}`);
}

/** "8.5 kg", "60 bottles", "1 piece" */
export function quantityText(milli: number, unit: AnyUnit): string {
  return `${formatMilli(milli)} ${unitLabel(unit, milli)}`;
}

/** Stock-unit thousandths → thousandths of the unit people read (grams → kg). */
export function toDisplayMilli(item: Units, stockMilli: number): number {
  return mulDivRound(stockMilli, MILLI, displayFactorMilli(item));
}

/** Thousandths of the unit people type → stock-unit thousandths (kg → grams). */
export function fromDisplayMilli(item: Units, displayMilli: number): number {
  return mulDivRound(displayMilli, displayFactorMilli(item), MILLI);
}

/** Stock as people read it: "8.5 kg", "60 bottles". */
export function stockText(item: Units, stockMilli: number): string {
  return quantityText(toDisplayMilli(item, stockMilli), displayUnitOf(item));
}

export const STATUS_TONE: Record<StockStatus, Tone> = { AVAILABLE: 'green', LOW: 'amber', OUT: 'red', NOT_IN_USE: 'grey' };

/** 6 Nov */
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

/** When a stock change happened, in this device's time: 6 Nov, 2:15 pm */
export function whenText(iso: string): string {
  const date = new Date(iso);
  return `${date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
}

export function expiryLabel(expiry: ExpiryState, date: string | null): { text: string; tone: Tone | null } {
  if (!date || expiry === 'NONE') return { text: '—', tone: null };
  if (expiry === 'EXPIRED') return { text: t('inventory.expired', { date: shortDate(date) }), tone: 'red' };
  if (expiry === 'SOON') return { text: t('inventory.expires', { date: shortDate(date) }), tone: 'orange' };
  return { text: shortDate(date), tone: null };
}

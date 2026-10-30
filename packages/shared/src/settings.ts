import { MAX_MENU_PRICE } from './menu';
import { normalizePhone } from './phone';
import { checkName } from './tables';

/**
 * Settings rules (Preview 5, MASTER_PROMPT.md §7.1 Settings). Only the Owner changes them; the server
 * checks the same. Tax, service charge and delivery fee apply to NEW bills only: every order keeps the
 * settings it was made with, so a running or old bill never changes.
 * Roman Urdu: Tax ya service charge badlein to sirf naye bill par lagega — purane bill wahi rahenge.
 */
export const MAX_TAX_PERCENT = 50;
export const MAX_SERVICE_PERCENT = 30;
export const MAX_RECEIPT_TEXT = 200;
export const MAX_PREP_MINUTES = 180;
export const MAX_STATION_MINUTES = 240;

/** "16", "7.5", "7.25 %" → basis points (1 % = 100); null when it is not a percentage. */
export function parsePercent(text: string): number | null {
  const clean = text.trim().replace(/\s*%$/, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const bps = Math.round(Number(clean) * 100);
  return bps <= 10_000 ? bps : null;
}

/** 1600 → "16", 750 → "7.5" */
export function bpsToInput(bps: number): string {
  return String(bps / 100);
}

export function isValidDayStart(text: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(text.trim());
}

export type SettingsField =
  | 'restaurantName'
  | 'branchName'
  | 'phone'
  | 'address'
  | 'tax'
  | 'serviceCharge'
  | 'deliveryFee'
  | 'minOrder'
  | 'prepMinutes'
  | 'dayStart'
  | 'receiptHeader'
  | 'receiptFooter';

export type SettingsProblem =
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'PHONE_INVALID'
  | 'ADDRESS_REQUIRED'
  | 'PERCENT_INVALID'
  | 'MONEY_INVALID'
  | 'MINUTES_INVALID'
  | 'DAY_START_INVALID'
  | 'TEXT_TOO_LONG';

export interface BranchSettingsRule {
  restaurantName: string;
  branchName: string;
  phone: string;
  address: string;
  /** Basis points; null = not a percentage */
  taxBps: number | null;
  serviceChargeBps: number | null;
  /** Paisa; null = not an amount */
  deliveryFee: number | null;
  minOrder: number | null;
  defaultPrepMinutes: number;
  businessDayStart: string;
  receiptHeader: string;
  receiptFooter: string;
}

export type SettingsCheck = { field: SettingsField; problem: SettingsProblem } | null;

/** The first mistake, top to bottom as on the Settings screen. */
export function checkBranchSettings(s: BranchSettingsRule): SettingsCheck {
  for (const [field, name] of [
    ['restaurantName', s.restaurantName],
    ['branchName', s.branchName],
  ] as const) {
    const problem = checkName(name, []);
    if (problem === 'NAME_REQUIRED' || problem === 'NAME_TOO_LONG') return { field, problem };
  }
  if (!normalizePhone(s.phone)) return { field: 'phone', problem: 'PHONE_INVALID' };
  if (s.address.trim().length < 5) return { field: 'address', problem: 'ADDRESS_REQUIRED' };
  if (s.taxBps === null || s.taxBps > MAX_TAX_PERCENT * 100) return { field: 'tax', problem: 'PERCENT_INVALID' };
  if (s.serviceChargeBps === null || s.serviceChargeBps > MAX_SERVICE_PERCENT * 100) return { field: 'serviceCharge', problem: 'PERCENT_INVALID' };
  if (s.deliveryFee === null || s.deliveryFee > MAX_MENU_PRICE) return { field: 'deliveryFee', problem: 'MONEY_INVALID' };
  if (s.minOrder === null || s.minOrder > MAX_MENU_PRICE) return { field: 'minOrder', problem: 'MONEY_INVALID' };
  if (!Number.isInteger(s.defaultPrepMinutes) || s.defaultPrepMinutes < 1 || s.defaultPrepMinutes > MAX_PREP_MINUTES) {
    return { field: 'prepMinutes', problem: 'MINUTES_INVALID' };
  }
  if (!isValidDayStart(s.businessDayStart)) return { field: 'dayStart', problem: 'DAY_START_INVALID' };
  if (s.receiptHeader.trim().length > MAX_RECEIPT_TEXT) return { field: 'receiptHeader', problem: 'TEXT_TOO_LONG' };
  if (s.receiptFooter.trim().length > MAX_RECEIPT_TEXT) return { field: 'receiptFooter', problem: 'TEXT_TOO_LONG' };
  return null;
}

/** Online App page: delivery fee and minimum order (null = not an amount), usual preparation time. */
export function checkOnlineSettings(s: { deliveryFee: number | null; minOrder: number | null; defaultPrepMinutes: number }): 'MONEY_INVALID' | 'MINUTES_INVALID' | null {
  if (s.deliveryFee === null || s.minOrder === null || s.deliveryFee > MAX_MENU_PRICE || s.minOrder > MAX_MENU_PRICE) return 'MONEY_INVALID';
  const prep = s.defaultPrepMinutes;
  return Number.isInteger(prep) && prep >= 1 && prep <= MAX_PREP_MINUTES ? null : 'MINUTES_INVALID';
}

/** Where a branch's Customer App lives: one deployment for all restaurants (PROJECT_RULES.md §6). */
export function customerAppPath(restaurantSlug: string, branchSlug: string): string {
  return `/${restaurantSlug}/${branchSlug}`;
}

export type StationProblem = 'NAME_REQUIRED' | 'NAME_TOO_LONG' | 'NAME_TAKEN' | 'TIMES_INVALID';

/** A kitchen station needs a new name, and "late" after "warn": 1 ≤ warn < late ≤ 240 minutes. */
export function checkStation(station: { name: string; warnMinutes: number; lateMinutes: number }, takenNames: readonly string[]): StationProblem | null {
  const problem = checkName(station.name, takenNames);
  if (problem) return problem as StationProblem;
  const { warnMinutes: warn, lateMinutes: late } = station;
  const ok = Number.isInteger(warn) && Number.isInteger(late) && warn >= 1 && warn < late && late <= MAX_STATION_MINUTES;
  return ok ? null : 'TIMES_INVALID';
}


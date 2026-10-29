/**
 * Pakistani mobile numbers (owner, 2026-10-29): people type them in many ways — 03001234567,
 * 0300 1234567, 0300-1234567, +92 300 1234567, 923001234567. All are accepted and saved in one
 * standard form, 0300-1234567, so the same number is always found again.
 * Roman Urdu: Number kisi bhi tarah likhein, system khud 0300-1234567 bana deta hai.
 */
export const PHONE_EXAMPLE = '0300-1234567';

/** The standard form "03XX-XXXXXXX", or null when it is not a Pakistani mobile number. */
export function normalizePhone(input: string): string | null {
  let digits = input.trim();
  if (!/^\+?[\d\s\-().]+$/.test(digits)) return null;
  digits = digits.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92') && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith('3')) digits = `0${digits}`;
  if (!/^03\d{9}$/.test(digits)) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

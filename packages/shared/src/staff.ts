import type { StaffRole } from './roles';

/**
 * Staff account rules (owner, 2026-10-29; MASTER_PROMPT.md §4, §10). Only the Owner manages staff.
 * Activation and PIN-reset links are single-use and expire; a PIN is never sent, shown or stored in
 * plain text (the server keeps only a hash — Phase 4).
 * Roman Urdu: Staff ka account sirf Owner banata/band karta hai; aakhri Owner kabhi band nahi hota.
 */

/** Activation and PIN-reset links stop working after this many hours. */
export const INVITE_VALID_HOURS = 48;
export const PIN_LENGTH = 6;

export type InviteKind = 'ACTIVATION' | 'PIN_RESET';
/** PENDING = can still be used · USED = account activated / PIN set · REVOKED = cancelled by the Owner */
export type InviteState = 'PENDING' | 'USED' | 'REVOKED';
/** What the Owner sees: a pending link past its time is EXPIRED. */
export type InviteStatus = InviteState | 'EXPIRED';

export function inviteExpiresAt(sentAtMs: number): number {
  return sentAtMs + INVITE_VALID_HOURS * 60 * 60 * 1000;
}

export function inviteStatus(state: InviteState, expiresAtMs: number, nowMs: number): InviteStatus {
  return state === 'PENDING' && nowMs >= expiresAtMs ? 'EXPIRED' : state;
}

export type PinProblem = 'PIN_FORMAT' | 'PIN_TOO_SIMPLE' | 'PIN_MISMATCH';

/** A PIN is 6 digits, not one digit repeated (111111) and not a straight run (123456, 654321). */
export function checkPin(pin: string, confirm: string): PinProblem | null {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) return 'PIN_FORMAT';
  const digits = [...pin].map(Number);
  const steps = new Set(digits.slice(1).map((d, i) => d - (digits[i] ?? 0)));
  if (steps.size === 1 && [0, 1, -1].includes([...steps][0] ?? 99)) return 'PIN_TOO_SIMPLE';
  if (pin !== confirm) return 'PIN_MISMATCH';
  return null;
}

/** Email is optional; when given it must look like name@domain.tld. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export interface StaffAccountState {
  id: string;
  role: StaffRole;
  isActive: boolean;
}

/**
 * The restaurant always keeps one active Owner: the last one cannot be disabled or given another role.
 * Returns true when the change would leave no active Owner.
 */
export function removesLastOwner(
  staff: readonly StaffAccountState[],
  targetId: string,
  next: { role: StaffRole; isActive: boolean },
): boolean {
  const target = staff.find((s) => s.id === targetId);
  if (!target || target.role !== 'OWNER' || !target.isActive) return false;
  if (next.role === 'OWNER' && next.isActive) return false;
  return !staff.some((s) => s.id !== targetId && s.role === 'OWNER' && s.isActive);
}

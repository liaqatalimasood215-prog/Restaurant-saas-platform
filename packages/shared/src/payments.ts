import { assertPaisa } from './money';

/**
 * Customer food payments (MASTER_PROMPT.md §8). Payments, refunds and reversals are never edited
 * or deleted — a correction is always a new entry. Tips are recorded with the payment but are not sales.
 * Subscription billing (restaurant → platform) is a separate system and never uses these types.
 * Roman Urdu: Har payment nayi entry hai; purani entry kabhi badli ya mitayi nahi jati.
 */
export const PAYMENT_METHODS = ['CASH', 'CARD', 'WALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** PAYMENT = money received · REFUND = money given back · REVERSAL = cancels a wrongly recorded payment */
export const PAYMENT_KINDS = ['PAYMENT', 'REFUND', 'REVERSAL'] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];

export interface MoneyEntry {
  kind: PaymentKind;
  method: PaymentMethod;
  /** Paisa, always positive; the kind gives the direction */
  amount: number;
  /** Paisa; tips are not sales */
  tipAmount: number;
}

export interface MoneySummary {
  /** Payments minus reversals — what counts towards the order total */
  paidTotal: number;
  refundedTotal: number;
  tipTotal: number;
}

export function summarizeMoney(entries: readonly MoneyEntry[]): MoneySummary {
  let paidTotal = 0;
  let refundedTotal = 0;
  let tipTotal = 0;
  for (const e of entries) {
    assertPaisa(e.amount);
    assertPaisa(e.tipAmount);
    if (e.kind === 'PAYMENT') {
      paidTotal += e.amount;
      tipTotal += e.tipAmount;
    } else if (e.kind === 'REVERSAL') {
      paidTotal -= e.amount;
      tipTotal -= e.tipAmount;
    } else {
      refundedTotal += e.amount;
    }
  }
  return { paidTotal, refundedTotal, tipTotal };
}

export function amountDue(total: number, paidTotal: number): number {
  return Math.max(0, total - paidTotal);
}

/** The order becomes PAID when payments cover the total. Refunds do not change the order status. */
export function isFullyPaid(total: number, paidTotal: number): boolean {
  return paidTotal >= total;
}

export type PaymentCheck = { ok: true } | { ok: false; reason: 'INVALID_AMOUNT' | 'MORE_THAN_DUE' };

/** A payment pays part or all of what is due; extra cash is a tip or change, never a bigger payment. */
export function checkPaymentAmount(amount: number, due: number): PaymentCheck {
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: 'INVALID_AMOUNT' };
  if (amount > due) return { ok: false, reason: 'MORE_THAN_DUE' };
  return { ok: true };
}

/** Change to give back for a cash payment. Throws if the cash does not cover payment + tip. */
export function cashChange(input: { amount: number; tipAmount: number; cashReceived: number }): number {
  assertPaisa(input.amount);
  assertPaisa(input.tipAmount);
  assertPaisa(input.cashReceived);
  const change = input.cashReceived - input.amount - input.tipAmount;
  if (change < 0) throw new Error('Cash received is less than the payment and tip');
  return change;
}

export type RefundCheck = { ok: true } | { ok: false; reason: 'INVALID_AMOUNT' | 'MORE_THAN_PAID' | 'REASON_REQUIRED' };

/** Full or partial refund; never more than what was paid and not yet refunded. */
export function checkRefund(input: {
  amount: number;
  paidTotal: number;
  refundedTotal: number;
  reason?: string | null;
}): RefundCheck {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return { ok: false, reason: 'INVALID_AMOUNT' };
  if (input.amount > input.paidTotal - input.refundedTotal) return { ok: false, reason: 'MORE_THAN_PAID' };
  if (!input.reason?.trim()) return { ok: false, reason: 'REASON_REQUIRED' };
  return { ok: true };
}

/** What can still be refunded. A tip is not part of it: tips are not sales. */
export function refundableAmount(paidTotal: number, refundedTotal: number): number {
  return Math.max(0, paidTotal - refundedTotal);
}

/** The entries a correction looks at. */
export interface RecordedEntry {
  id: string;
  kind: PaymentKind;
  method: PaymentMethod;
  receivedBy: string;
  relatedPaymentId: string | null;
}

/** Payments that still count: one that was corrected is replaced by the new entry. */
export function activePayments<T extends RecordedEntry>(entries: readonly T[]): T[] {
  const reversed = new Set(entries.filter((e) => e.kind === 'REVERSAL').map((e) => e.relatedPaymentId));
  return entries.filter((e) => e.kind === 'PAYMENT' && !reversed.has(e.id));
}

export type CorrectionBlock = 'NOT_A_PAYMENT' | 'ALREADY_CORRECTED' | 'RIDER_CASH';

/** Why this entry cannot be corrected at all; null = it can. */
export function correctionBlock(entry: RecordedEntry, entries: readonly RecordedEntry[], riderId: string | null): CorrectionBlock | null {
  if (entry.kind !== 'PAYMENT') return 'NOT_A_PAYMENT';
  if (!activePayments(entries).some((e) => e.id === entry.id)) return 'ALREADY_CORRECTED';
  if (riderId !== null && entry.receivedBy === riderId) return 'RIDER_CASH';
  return null;
}

export type CorrectionCheck = { ok: true } | { ok: false; reason: CorrectionBlock | 'SAME_METHOD' | 'REASON_REQUIRED' };

/**
 * A payment recorded with the wrong method: a REVERSAL cancels it and a new PAYMENT of the same amount replaces it (owner,
 * 2026-11-02). The order total and status do not change. A rider's cash on delivery cannot be corrected: the rider's cash
 * count and settlement rest on it.
 * Roman Urdu: Ghalat method theek hota hai; purani entry rehti hai, aur rider ke COD par yeh band hai.
 */
export function checkPaymentCorrection(input: {
  entry: RecordedEntry;
  entries: readonly RecordedEntry[];
  method: PaymentMethod;
  riderId: string | null;
  reason?: string | null;
}): CorrectionCheck {
  const block = correctionBlock(input.entry, input.entries, input.riderId);
  if (block) return { ok: false, reason: block };
  if (input.method === input.entry.method) return { ok: false, reason: 'SAME_METHOD' };
  if (!input.reason?.trim()) return { ok: false, reason: 'REASON_REQUIRED' };
  return { ok: true };
}

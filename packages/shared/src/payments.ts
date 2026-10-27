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

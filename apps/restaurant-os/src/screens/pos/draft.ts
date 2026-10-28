import type { OrderType } from '@restaurant-saas/shared';
import type { CartLine } from '../waiter/cart';
import type { CustomerValue } from './customer-fields';

/**
 * The bill on the POS screen. New items live only here until "Send to kitchen"; after that the
 * bill is the SAME order record the waiter, kitchen, Tables and Orders screens use (orderId).
 */
export interface Draft {
  type: OrderType;
  tableId: string | null;
  guests: number;
  customer: CustomerValue;
  note: string;
  cart: CartLine[];
  /** The running order this bill belongs to (null = not sent yet) */
  orderId: string | null;
  /** Set when this bill was reopened from "Held" */
  heldId: string | null;
  /** One key per send: a double tap never sends the same items twice */
  sendKey: string;
}

export function newDraft(type: OrderType = 'DINE_IN'): Draft {
  return {
    type,
    tableId: null,
    guests: 1,
    customer: { name: '', phone: '', address: '' },
    note: '',
    cart: [],
    orderId: null,
    heldId: null,
    sendKey: crypto.randomUUID(),
  };
}

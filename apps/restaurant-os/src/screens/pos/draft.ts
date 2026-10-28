import type { OrderType } from '@restaurant-saas/shared';
import type { CartLine } from '../waiter/cart';
import type { CustomerValue } from './customer-fields';

/**
 * The bill on the POS screen. New items live only here until "Send to kitchen"; after that the
 * bill is the SAME order record the waiter, kitchen, Tables and Orders screens use (orderId).
 */
export interface Draft {
  type: OrderType;
  /** "Phone Call": a takeaway the customer ordered by phone (order channel PHONE) */
  phoneOrder: boolean;
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
  /** "Bill Now" on a new bill: open the payment as soon as the new order is loaded */
  payNow: boolean;
}

export function newDraft(type: OrderType = 'DINE_IN', phoneOrder = false): Draft {
  return {
    type,
    phoneOrder: type === 'TAKEAWAY' && phoneOrder,
    tableId: null,
    guests: 1,
    customer: { name: '', phone: '', address: '' },
    note: '',
    cart: [],
    orderId: null,
    heldId: null,
    sendKey: crypto.randomUUID(),
    payNow: false,
  };
}

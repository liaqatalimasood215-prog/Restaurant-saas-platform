import type { OrderStatus, TableStatus, TicketStatus } from '@restaurant-saas/shared';
import type { Tone } from '@/components/ui/badge';

/** Same status colours everywhere (MASTER_PROMPT.md §11), always together with text. */
export const TICKET_TONES: Record<TicketStatus, Tone> = {
  NEW: 'blue',
  PREPARING: 'orange',
  READY: 'green',
  SERVED: 'grey',
};

/** Table colours follow the owner's design: free green, occupied red, bill requested amber. */
export const TABLE_TONES: Record<TableStatus, Tone> = {
  FREE: 'green',
  OCCUPIED: 'red',
  BILL_REQUESTED: 'amber',
};

/** Order status colours: new = blue, cooking = orange, ready = green, on the road = amber, done = grey. */
export const ORDER_TONES: Record<OrderStatus, Tone> = {
  OPEN: 'brand',
  BILL_REQUESTED: 'amber',
  PAID: 'grey',
  PLACED: 'blue',
  ACCEPTED: 'blue',
  PREPARING: 'orange',
  READY: 'green',
  RIDER_ASSIGNED: 'amber',
  OUT_FOR_DELIVERY: 'amber',
  DELIVERED: 'grey',
  PICKED_UP: 'grey',
  REJECTED: 'red',
  CANCELLED: 'red',
};

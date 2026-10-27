import type { TableStatus, TicketStatus } from '@restaurant-saas/shared';
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

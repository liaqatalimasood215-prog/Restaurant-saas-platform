/**
 * Real-time (Socket.IO, Phase 5) room and event names, shared by backend and all apps.
 * Until Phase 5 nothing uses them on the network; prototype screens use "DEMO sync — not real-time".
 * Roman Urdu: Har screen sirf apne "room" ki khabar sunti hai — doosre restaurant ki nahi.
 */

export const rooms = {
  /** Owner, Manager, Cashier and Waiters of one branch (login required) */
  branch: (branchId: string) => `branch:${branchId}`,
  /** Kitchen screens of one station */
  station: (stationId: string) => `station:${stationId}`,
  /** One waiter's "food ready" alerts */
  waiter: (waiterUserId: string) => `waiter:${waiterUserId}`,
  /** One rider's assigned orders (login required) */
  rider: (riderUserId: string) => `rider:${riderUserId}`,
  /** One customer's tracking page (private tracking token) */
  track: (trackingToken: string) => `track:${trackingToken}`,
  /** Public customer menu of one branch (product on/off, online orders on/off) */
  menu: (branchId: string) => `menu:${branchId}`,
} as const;

export const EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  TICKET_CREATED: 'ticket.created',
  TICKET_UPDATED: 'ticket.updated',
  PAYMENT_RECORDED: 'payment.recorded',
  MENU_UPDATED: 'menu.updated',
  BRANCH_UPDATED: 'branch.updated',
} as const;

export type RealtimeEvent = (typeof EVENTS)[keyof typeof EVENTS];

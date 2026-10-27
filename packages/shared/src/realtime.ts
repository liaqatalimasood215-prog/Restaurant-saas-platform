/**
 * Real-time (Socket.IO) room and event names, shared by backend and all apps.
 * Roman Urdu: Har screen sirf apne "room" ki khabar sunti hai — doosre restaurant ki nahi.
 */

export const rooms = {
  /** Restaurant OS staff of one branch (login required) */
  branch: (branchId: string) => `branch:${branchId}`,
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
  MENU_UPDATED: 'menu.updated',
  BRANCH_UPDATED: 'branch.updated',
} as const;

export type RealtimeEvent = (typeof EVENTS)[keyof typeof EVENTS];

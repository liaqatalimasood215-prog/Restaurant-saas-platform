import type { StaffRole } from './roles';

/**
 * Permission matrix (MASTER_PROMPT.md §4). The server checks these on every request;
 * screens use them only to hide buttons — hiding a button is never a security control.
 * Roman Urdu: Kaun kya kar sakta hai — asli check hamesha server karega.
 */
export const PERMISSIONS = {
  /** Open table, add items, send to kitchen (Super Waiter; never the Service Waiter) */
  'table.order': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'],
  /** Request the bill / call the cashier for a table */
  'bill.request': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER'],
  /** Accept a bill request, print the pre-bill */
  'bill.accept': ['OWNER', 'MANAGER', 'CASHIER'],
  /** Void an item after it was sent (with reason) */
  'item.void': ['OWNER', 'MANAGER'],
  /** Start / Ready / Undo kitchen tickets (Kitchen: own stations only) */
  'ticket.update': ['OWNER', 'MANAGER', 'KITCHEN'],
  /** Mark served */
  'ticket.serve': ['OWNER', 'MANAGER', 'WAITER', 'SERVICE_WAITER'],
  'item.outOfStock': ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN'],
  /** Give discount (with reason) */
  'order.discount': ['OWNER', 'MANAGER'],
  /** Record payment and tip, print/reprint receipt */
  'payment.record': ['OWNER', 'MANAGER', 'CASHIER'],
  /** Refund or reverse a payment (with reason) */
  'payment.refund': ['OWNER', 'MANAGER'],
  /** Accept/reject online orders, phone and takeaway orders, assign rider */
  'order.manage': ['OWNER', 'MANAGER', 'CASHIER'],
  /** Cancel order (with reason). Status limits per role live in order-status.ts. */
  'order.cancel': ['OWNER', 'MANAGER', 'CASHIER'],
  /** Picked up / Delivered / cash collected — own orders only */
  'delivery.update': ['RIDER'],
  'riderCash.settle': ['OWNER', 'MANAGER', 'CASHIER'],
  /** Menu, tables, stations; Online App and Riders pages */
  'setup.manage': ['OWNER', 'MANAGER'],
  /** Staff management (Managers: not Owner/Manager accounts) */
  'staff.manage': ['OWNER', 'MANAGER'],
  /** Money reports (Managers: only if the Owner allows) */
  'reports.money': ['OWNER', 'MANAGER'],
  /** Settings: tax, service charge, receipt, business day */
  'settings.manage': ['OWNER'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Restaurant-level switches that change what a role may do. */
export interface PermissionContext {
  /** Owner setting: Managers may see money reports. */
  managerCanSeeMoneyReports?: boolean;
}

export function can(role: StaffRole, permission: Permission, ctx: PermissionContext = {}): boolean {
  if (!(PERMISSIONS[permission] as readonly StaffRole[]).includes(role)) return false;
  if (permission === 'reports.money' && role === 'MANAGER') return ctx.managerCanSeeMoneyReports === true;
  return true;
}

/** Managers manage staff, but not Owner or Manager accounts. */
export function canManageStaffAccount(actor: StaffRole, target: StaffRole): boolean {
  if (!can(actor, 'staff.manage')) return false;
  if (actor === 'MANAGER') return target !== 'OWNER' && target !== 'MANAGER';
  return true;
}

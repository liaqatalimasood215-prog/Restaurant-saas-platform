import type { StaffRole } from './roles';

/**
 * Permission matrix (MASTER_PROMPT.md §4). The server checks these on every request;
 * screens use them only to hide buttons — hiding a button is never a security control.
 * Roman Urdu: Kaun kya kar sakta hai — asli check hamesha server karega.
 */
export const PERMISSIONS = {
  // ── Opening a screen ("View"). The sidebar shows a section only with its view permission. ──
  'pos.view': ['OWNER', 'MANAGER', 'CASHIER'],
  'tables.view': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER'],
  'orders.view': ['OWNER', 'MANAGER', 'CASHIER'],
  'onlineOrders.view': ['OWNER', 'MANAGER', 'CASHIER'],
  'waiter.view': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER'],
  'kitchen.view': ['OWNER', 'MANAGER', 'KITCHEN'],
  'menu.view': ['OWNER', 'MANAGER'],
  'onlineApp.view': ['OWNER', 'MANAGER'],
  'riders.view': ['OWNER', 'MANAGER'],
  /** Inventory & Suppliers (DEMO, owner 2026-11-04) */
  'inventory.view': ['OWNER', 'MANAGER'],
  // ── Actions ──
  /** Open table, add items, send to kitchen (Super Waiter; never the Service Waiter) */
  'table.order': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'],
  /** Request the bill / call the cashier for a table */
  'bill.request': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER'],
  /** Mark a table for cleaning and clean again (everyone who works on the floor) */
  'table.clean': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER'],
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
  /** Areas and tables: Manage Areas, Add Table, edit, out of service, remove */
  'tables.manage': ['OWNER', 'MANAGER'],
  /** Menu items, sizes, add-ons, stations; Online App switches (Preview 5) */
  'menu.manage': ['OWNER', 'MANAGER'],
  /** Add and edit ingredients, correct stock (with a reason) */
  'inventory.manage': ['OWNER', 'MANAGER'],
  /** Publish the website and the Android app, domain and Google Play setup — the Owner only (owner, 2026-10-30) */
  'onlineApp.publish': ['OWNER'],
  /** See the staff list (read-only for the Manager) */
  'staff.view': ['OWNER', 'MANAGER'],
  /** Add / edit staff, roles, invitations, PIN reset, Enable / Disable — the Owner only (owner, 2026-10-29) */
  'staff.manage': ['OWNER'],
  /** Money reports (Managers: only if the Owner allows) */
  'reports.money': ['OWNER', 'MANAGER'],
  /** Settings: tax, service charge, receipt, business day */
  'settings.manage': ['OWNER'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

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

/** Only the Owner manages staff accounts, of every role (owner, 2026-10-29). */
export function canManageStaffAccount(actor: StaffRole, _target: StaffRole): boolean {
  return can(actor, 'staff.manage');
}

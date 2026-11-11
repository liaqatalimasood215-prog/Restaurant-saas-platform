import { ALL_PERMISSIONS, PERMISSIONS, can, type Permission, type PermissionContext } from './permissions';
import type { StaffRole } from './roles';

/**
 * Per-role and per-person permissions (owner, 2026-10-29: Role Permissions screen and the permission
 * step of Add Staff). The PERMISSIONS matrix is the RECOMMENDED set of each role. The Owner may turn a
 * permission OFF for a role or one person, and ON only where the order rules allow that role ("ceiling"):
 * e.g. payments stay counter work, because the order engine only lets counter roles mark a bill PAID.
 * Staff management and Settings always stay with the Owner. The server checks the same rules (Phase 4).
 * Roman Urdu: Har role ki tajweez-shuda ijazatein; Owner band/chalu kar sakta hai, lekin had ke andar.
 */

/** Permissions that may be given to a role on top of its recommended set (the order rules allow it). */
const EXTRA_GRANTS: Partial<Record<Permission, readonly StaffRole[]>> = {
  'order.discount': ['CASHIER'],
  'item.void': ['CASHIER'],
  'tables.manage': ['CASHIER'],
  'menu.manage': ['CASHIER'],
  'item.outOfStock': ['WAITER'],
  'staff.view': ['CASHIER'],
  // W4 (owner, 2026-11-12): the Kitchen reports waste by default; other floor staff only when the Owner switches it on
  'inventory.waste.submit': ['CASHIER', 'WAITER', 'SERVICE_WAITER'],
};

/** Only the Owner, never anybody else (owner decision 2026-10-29). */
export const OWNER_ONLY_PERMISSIONS: readonly Permission[] = ['staff.manage', 'settings.manage', 'onlineApp.publish'];

/** Roles whose permissions the Owner can edit. The Owner role always has everything it is allowed. */
export const EDITABLE_ROLES = ['MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER', 'KITCHEN'] as const satisfies readonly StaffRole[];

/** What the role gets by default (the "Recommended" button). */
export function recommendedPermissions(role: StaffRole, ctx: PermissionContext = {}): Permission[] {
  return ALL_PERMISSIONS.filter((p) => can(role, p, ctx));
}

/** Can this role ever be given this permission? */
export function canGrant(role: StaffRole, permission: Permission): boolean {
  if (OWNER_ONLY_PERMISSIONS.includes(permission)) return role === 'OWNER';
  return (PERMISSIONS[permission] as readonly StaffRole[]).includes(role) || (EXTRA_GRANTS[permission] ?? []).includes(role);
}

/** Keeps only permissions the role may have, once each, in catalog order. The Owner always keeps all of its own. */
export function cleanPermissions(role: StaffRole, permissions: readonly Permission[]): Permission[] {
  if (role === 'OWNER') return recommendedPermissions('OWNER');
  const wanted = new Set(permissions);
  return ALL_PERMISSIONS.filter((p) => wanted.has(p) && canGrant(role, p));
}

export interface PermissionHolder {
  role: StaffRole;
  /** null = follows the role */
  permissions: readonly Permission[] | null;
}

/**
 * What one person may do: their own custom set, else their role's set (as changed by the Owner), else the
 * recommended set — always cut to what the role may have.
 */
export function effectivePermissions(
  person: PermissionHolder,
  rolePermissions: Partial<Record<StaffRole, readonly Permission[]>> = {},
  ctx: PermissionContext = {},
): Permission[] {
  const base = person.permissions ?? rolePermissions[person.role] ?? recommendedPermissions(person.role, ctx);
  return cleanPermissions(person.role, base);
}

/** Same members, any order. */
export function samePermissions(a: readonly Permission[], b: readonly Permission[]): boolean {
  return a.length === b.length && a.every((p) => b.includes(p));
}

// ── The permission matrix shown to the Owner ──────────────────────────────────────────────────

export const PERMISSION_ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface PermissionRow {
  key: string;
  label: string;
  /** Each cell is one real permission; a missing cell does not apply to this feature */
  cells: Partial<Record<PermissionAction, { permission: Permission; hint: string }>>;
}

const cell = (permission: Permission, hint: string) => ({ permission, hint });

/** Rows of the matrix, most-used first. Every permission except the Rider App one appears exactly once. */
export const PERMISSION_ROWS: readonly PermissionRow[] = [
  { key: 'pos', label: 'POS / New Bill', cells: { VIEW: cell('pos.view', 'Open POS / New Bill') } },
  {
    key: 'takeOrders',
    label: 'Take Orders & Send to Kitchen',
    cells: { VIEW: cell('waiter.view', 'Open Waiter Orders'), CREATE: cell('table.order', 'Take orders and send them to the kitchen') },
  },
  {
    key: 'tables',
    label: 'Manage Tables',
    cells: {
      VIEW: cell('tables.view', 'See the table board'),
      CREATE: cell('tables.manage', 'Add, edit and remove tables and areas'),
      EDIT: cell('table.clean', 'Mark tables for cleaning'),
    },
  },
  {
    key: 'bill',
    label: 'Request / Print Bill',
    cells: { CREATE: cell('bill.request', 'Request the bill, call the cashier'), APPROVE: cell('bill.accept', 'Accept bill requests, print the pre-bill') },
  },
  { key: 'serve', label: 'Serve Food', cells: { EDIT: cell('ticket.serve', 'Mark food as served') } },
  { key: 'payments', label: 'Process Payments', cells: { CREATE: cell('payment.record', 'Take payments, print receipts') } },
  { key: 'discounts', label: 'Apply Discounts', cells: { APPROVE: cell('order.discount', 'Give a discount (with a reason)') } },
  {
    key: 'refundVoid',
    label: 'Refund / Void',
    cells: { DELETE: cell('item.void', 'Void an item that was sent'), APPROVE: cell('payment.refund', 'Refund or reverse a payment') },
  },
  {
    key: 'kitchen',
    label: 'Kitchen / KDS',
    cells: { VIEW: cell('kitchen.view', 'Open the Kitchen Display'), EDIT: cell('ticket.update', 'Start / Ready / Undo kitchen tickets') },
  },
  { key: 'orders', label: 'Orders', cells: { VIEW: cell('orders.view', 'See all orders'), DELETE: cell('order.cancel', 'Cancel an order (with a reason)') } },
  {
    key: 'onlineOrders',
    label: 'Online Orders',
    cells: { VIEW: cell('onlineOrders.view', 'Open Online Orders'), APPROVE: cell('order.manage', 'Accept / reject, phone orders, assign rider') },
  },
  {
    key: 'riders',
    label: 'Rider Management',
    cells: { VIEW: cell('riders.view', 'Open Riders'), APPROVE: cell('riderCash.settle', "Take the rider's cash") },
  },
  {
    key: 'menu',
    label: 'Menu Management',
    cells: {
      VIEW: cell('menu.view', 'Open Menu'),
      CREATE: cell('menu.manage', 'Add and edit menu items'),
      EDIT: cell('item.outOfStock', 'Out of stock ON / OFF'),
    },
  },
  {
    key: 'inventory',
    label: 'Inventory & Suppliers',
    cells: { VIEW: cell('inventory.view', 'Open Inventory & Suppliers'), CREATE: cell('inventory.manage', 'Add and edit ingredients, correct stock') },
  },
  {
    key: 'wasteReports',
    label: 'Waste Reports',
    cells: { CREATE: cell('inventory.waste.submit', 'Report waste for approval (Kitchen / KDS)'), APPROVE: cell('inventory.waste.approve', 'Approve or reject waste reports') },
  },
  {
    key: 'onlineApp',
    label: 'Online App',
    cells: { VIEW: cell('onlineApp.view', 'Open the Online App page'), APPROVE: cell('onlineApp.publish', 'Publish the website and the Android app') },
  },
  {
    key: 'staff',
    label: 'Staff Management',
    cells: { VIEW: cell('staff.view', 'See the staff list'), EDIT: cell('staff.manage', 'Add, edit, disable staff and change permissions') },
  },
  { key: 'reports', label: 'Reports', cells: { VIEW: cell('reports.money', "Today's Summary and money reports") } },
  { key: 'settings', label: 'Settings', cells: { EDIT: cell('settings.manage', 'Tax, service charge, receipt, business day') } },
];

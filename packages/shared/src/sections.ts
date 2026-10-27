import type { FeatureStatus } from './feature-status';
import { can, type Permission, type PermissionContext } from './permissions';
import type { OsRole, StaffRole } from './roles';

/**
 * Restaurant OS sidebar (MASTER_PROMPT.md §7.1, owner navigation decision 2026-10-27).
 * Each sidebar feature opens its own screen. Each role sees only its own sections.
 * Roman Urdu: Sidebar ki list — har role ko sirf apne hisse nazar aate hain.
 */
export const OS_SECTION_KEYS = [
  'pos',
  'tables',
  'orders',
  'online-orders',
  'waiter',
  'kitchen',
  'menu',
  'online-app',
  'riders',
  'staff',
  'summary',
  'settings',
  'dashboard',
  'customers',
  'finance-reports',
  'inventory',
  'payroll',
  'ai-manager',
] as const;
export type OsSectionKey = (typeof OS_SECTION_KEYS)[number];

export type SectionGroup = 'FEATURES' | 'COMING_SOON';

export interface OsSection {
  key: OsSectionKey;
  /** Default English label (screens take their text from translation files) */
  label: string;
  path: string;
  group: SectionGroup;
  roles: readonly StaffRole[];
  /** Extra permission needed on top of the role list */
  permission?: Permission;
  /** Development phase that builds this section (PROJECT_RULES.md §15) */
  phase: number;
  /** Planned status at the end of Phase 1. Nothing is REAL / VERIFIED before Phase 4. */
  phase1Status: FeatureStatus;
}

const FLOOR: readonly StaffRole[] = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER'];
const COUNTER: readonly StaffRole[] = ['OWNER', 'MANAGER', 'CASHIER'];
const MANAGEMENT: readonly StaffRole[] = ['OWNER', 'MANAGER'];

function feature(key: OsSectionKey, label: string, roles: readonly StaffRole[], permission?: Permission): OsSection {
  return { key, label, path: `/${key}`, group: 'FEATURES', roles, permission, phase: 1, phase1Status: 'DEMO_PROTOTYPE' };
}

function comingSoon(
  key: OsSectionKey,
  label: string,
  roles: readonly StaffRole[],
  phase: number,
  permission?: Permission,
): OsSection {
  return { key, label, path: `/${key}`, group: 'COMING_SOON', roles, permission, phase, phase1Status: 'PLACEHOLDER' };
}

export const OS_SECTIONS: readonly OsSection[] = [
  // Owner decision 2026-10-27: the most-used sections first — POS, Tables, Orders, Online Orders.
  feature('pos', 'POS / New Bill', COUNTER),
  feature('tables', 'Tables', FLOOR),
  feature('orders', 'Orders', COUNTER),
  feature('online-orders', 'Online Orders', COUNTER),
  feature('waiter', 'Waiter Orders', FLOOR),
  feature('kitchen', 'Kitchen / KDS', ['OWNER', 'MANAGER', 'KITCHEN']),
  feature('menu', 'Menu', MANAGEMENT),
  feature('online-app', 'Online App', MANAGEMENT),
  feature('riders', 'Riders', MANAGEMENT),
  feature('staff', 'Staff', MANAGEMENT),
  feature('summary', "Today's Summary", MANAGEMENT, 'reports.money'),
  feature('settings', 'Settings', ['OWNER']),
  comingSoon('dashboard', 'Dashboard', MANAGEMENT, 7),
  comingSoon('customers', 'Customers', MANAGEMENT, 7),
  comingSoon('finance-reports', 'Finance & Reports', MANAGEMENT, 7, 'reports.money'),
  comingSoon('inventory', 'Inventory & Suppliers', MANAGEMENT, 8),
  comingSoon('payroll', 'Payroll', ['OWNER'], 8),
  comingSoon('ai-manager', 'AI Manager', MANAGEMENT, 10),
];

export function findSection(key: string): OsSection | undefined {
  return OS_SECTIONS.find((s) => s.key === key);
}

export function canSeeSection(section: OsSection, role: StaffRole, ctx: PermissionContext = {}): boolean {
  if (!section.roles.includes(role)) return false;
  return section.permission ? can(role, section.permission, ctx) : true;
}

export function sectionsForRole(role: StaffRole, ctx: PermissionContext = {}): OsSection[] {
  return OS_SECTIONS.filter((s) => canSeeSection(s, role, ctx));
}

/** Home screen by role (MASTER_PROMPT.md §4; owner 2026-10-28: Owner and Manager start at POS). Riders have no Restaurant OS home. */
export const HOME_SECTION: Record<OsRole, OsSectionKey> = {
  OWNER: 'pos',
  MANAGER: 'pos',
  CASHIER: 'pos',
  WAITER: 'tables',
  KITCHEN: 'kitchen',
};

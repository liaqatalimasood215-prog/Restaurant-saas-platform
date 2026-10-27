/**
 * Staff roles (Phase 1).
 * Roman Urdu: Har staff member ka ek role hota hai. Role se tay hota hai ke woh kya dekh aur kar sakta hai.
 */
export const STAFF_ROLES = ['OWNER', 'CASHIER', 'KITCHEN', 'RIDER'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Which real app each role may log in to. Riders cannot use Restaurant OS; staff cannot use the Rider App. */
export const APP_ACCESS = {
  'restaurant-os': ['OWNER', 'CASHIER', 'KITCHEN'],
  rider: ['RIDER'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type StaffApp = keyof typeof APP_ACCESS;

export function canUseApp(role: StaffRole, app: StaffApp): boolean {
  return (APP_ACCESS[app] as readonly StaffRole[]).includes(role);
}

/**
 * Feature status labels shown to the owner.
 * REAL          = connected to backend + database, works end to end
 * DEMO          = visible UI using mock/sample data
 * PLACEHOLDER   = "Coming Soon", no function yet
 * NOT_CONNECTED = UI exists but is not linked to the backend yet
 */
export const FEATURE_STATUSES = ['REAL', 'DEMO', 'PLACEHOLDER', 'NOT_CONNECTED'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export interface OsSection {
  key: string;
  label: string;
  path: string;
  roles: readonly StaffRole[];
  /** Planned status at the end of Phase 1. The UI must show a badge for anything not REAL. */
  phase1Status: FeatureStatus;
}

/** Restaurant OS sidebar. Each role only sees the sections listed for it. */
export const OS_SECTIONS: readonly OsSection[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', roles: ['OWNER', 'CASHIER'], phase1Status: 'PLACEHOLDER' },
  { key: 'pos', label: 'POS', path: '/pos', roles: ['OWNER', 'CASHIER'], phase1Status: 'REAL' },
  { key: 'kitchen', label: 'Kitchen (KDS)', path: '/kitchen', roles: ['OWNER', 'KITCHEN'], phase1Status: 'REAL' },
  { key: 'orders', label: 'Orders', path: '/orders', roles: ['OWNER', 'CASHIER'], phase1Status: 'REAL' },
  { key: 'riders', label: 'Riders', path: '/riders', roles: ['OWNER'], phase1Status: 'REAL' },
  { key: 'online-app', label: 'Online App', path: '/online-app', roles: ['OWNER'], phase1Status: 'REAL' },
  { key: 'customers', label: 'Customers', path: '/customers', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'menu', label: 'Menu', path: '/menu', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'inventory', label: 'Inventory', path: '/inventory', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'staff', label: 'Staff', path: '/staff', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'finance', label: 'Finance', path: '/finance', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'marketing', label: 'Marketing', path: '/marketing', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'reports', label: 'Reports', path: '/reports', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'ai-manager', label: 'AI Manager', path: '/ai-manager', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
  { key: 'settings', label: 'Settings', path: '/settings', roles: ['OWNER'], phase1Status: 'PLACEHOLDER' },
];

export function sectionsForRole(role: StaffRole): OsSection[] {
  return OS_SECTIONS.filter((s) => s.roles.includes(role));
}

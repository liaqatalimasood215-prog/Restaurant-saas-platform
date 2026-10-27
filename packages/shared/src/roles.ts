/**
 * Staff roles (MASTER_PROMPT.md §4).
 * Roman Urdu: Har staff member ka ek role hota hai. Role se tay hota hai ke woh kya dekh aur kar sakta hai.
 */
export const STAFF_ROLES = ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'RIDER'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Roles that may log in to Restaurant OS (everyone except riders). */
export type OsRole = Exclude<StaffRole, 'RIDER'>;

/** Which real app each role may log in to. Riders cannot use Restaurant OS; staff cannot use the Rider App. */
export const APP_ACCESS = {
  'restaurant-os': ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'],
  rider: ['RIDER'],
} as const satisfies Record<string, readonly StaffRole[]>;

export type StaffApp = keyof typeof APP_ACCESS;

export function canUseApp(role: StaffRole, app: StaffApp): boolean {
  return (APP_ACCESS[app] as readonly StaffRole[]).includes(role);
}

/** The Owner works across all branches of the restaurant; everyone else belongs to one branch. */
export function worksAcrossBranches(role: StaffRole): boolean {
  return role === 'OWNER';
}

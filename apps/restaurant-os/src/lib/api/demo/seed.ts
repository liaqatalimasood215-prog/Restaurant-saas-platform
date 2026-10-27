import { NO_TAX, rupeesToPaisa, type Branch, type Restaurant, type StaffUser } from '@restaurant-saas/shared';

/**
 * DEMO data for "Aziz Pizza — DEMO" (MASTER_PROMPT.md §12 test data, §16 assumptions).
 * Sample data only — never real customers, staff or prices.
 */
export const DEMO_DATA_VERSION = 1;

/** Fixed, valid UUIDs so links and tests stay stable. */
export function demoId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

export const RESTAURANT_ID = demoId(1);
export const BRANCH_ID = demoId(2);

export interface DemoData {
  version: number;
  restaurant: Restaurant;
  branch: Branch;
  staff: StaffUser[];
}

function staff(n: number, name: string, role: StaffUser['role'], stationIds: string[] = []): StaffUser {
  return {
    id: demoId(100 + n),
    restaurantId: RESTAURANT_ID,
    branchId: role === 'OWNER' ? null : BRANCH_ID,
    name,
    phone: `0300-00000${String(n).padStart(2, '0')}`,
    role,
    isActive: true,
    stationIds,
  };
}

export function createSeed(): DemoData {
  return {
    version: DEMO_DATA_VERSION,
    restaurant: { id: RESTAURANT_ID, name: 'Aziz Pizza — DEMO', slug: 'aziz-pizza' },
    branch: {
      id: BRANCH_ID,
      restaurantId: RESTAURANT_ID,
      name: 'Main Branch',
      slug: 'main',
      phone: '0300-0000000',
      address: 'Main Market, Lahore (DEMO address)',
      timezone: 'Asia/Karachi',
      businessDayStart: '06:00',
      tax: NO_TAX,
      serviceChargeBps: 0,
      roundToRupee: true,
      receiptHeader: 'Aziz Pizza — DEMO',
      receiptFooter: 'Thank you! (DEMO receipt — not a real invoice)',
      onlineOrdersEnabled: true,
      deliveryFee: rupeesToPaisa(150),
      minOrder: rupeesToPaisa(500),
      defaultPrepMinutes: 30,
      managerCanSeeMoneyReports: false,
    },
    staff: [
      staff(1, 'Aziz Ahmed', 'OWNER'),
      staff(2, 'Sana Khan', 'MANAGER'),
      staff(3, 'Bilal Hussain', 'CASHIER'),
      staff(4, 'Imran Ali', 'WAITER'),
      staff(5, 'Usman Tariq', 'WAITER'),
      staff(6, 'Rashid Mehmood', 'KITCHEN'),
      staff(7, 'Faisal Riaz', 'RIDER'),
      staff(8, 'Naveed Akhtar', 'RIDER'),
    ],
  };
}

import {
  NEW_ONLINE_PUBLISHING,
  NO_TAX,
  rupeesToPaisa,
  type Area,
  type Branch,
  type DiningTable,
  type HeldBill,
  type InviteKind,
  type Permission,
  type StaffRole,
  type InviteState,
  type ItemVariant,
  type KitchenStation,
  type MenuCategory,
  type MenuItem,
  type ModifierGroup,
  type OnlinePublishing,
  type Order,
  type Restaurant,
  type RiderCashSettlement,
  type StaffUser,
  type WaiterCall,
} from '@restaurant-saas/shared';

/**
 * DEMO data for "Aziz Pizza — DEMO" (MASTER_PROMPT.md §12 test data, §16 assumptions).
 * Sample data only — never real customers, staff or prices.
 */
export const DEMO_DATA_VERSION = 14;

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
  /** Online App / Website: demo states only, nothing is really published */
  onlinePublishing: OnlinePublishing;
  staff: StaffUser[];
  stations: KitchenStation[];
  areas: Area[];
  tables: DiningTable[];
  categories: MenuCategory[];
  items: MenuItem[];
  modifierGroups: ModifierGroup[];
  orders: Order[];
  /** Daily order number per business date (gap-free counter) */
  dailyCounters: Record<string, number>;
  /** Idempotency key → order id: a double tap or retry returns the first result */
  idempotency: Record<string, string>;
  /** Last invoice number of the branch (gap-free, given when an order is paid) */
  invoiceCounter: number;
  riderSettlements: RiderCashSettlement[];
  heldBills: HeldBill[];
  waiterCalls: WaiterCall[];
  /** Activation and PIN-reset links (DEMO: the token is kept here; the server keeps only its hash) */
  invites: DemoInvite[];
  /** DEMO stand-in for the server's per-user token_version: a higher number ends older sessions */
  sessionVersions: Record<string, number>;
  /** Role Permissions changed by the Owner; a missing role uses the recommended set */
  rolePermissions: Partial<Record<StaffRole, Permission[]>>;
  /** Last employee number given (EMP012 …); never reused */
  employeeCounter: number;
}

export interface DemoInvite {
  userId: string;
  kind: InviteKind;
  token: string;
  state: InviteState;
  sentAt: string;
  expiresAt: string;
}

/** The sample staff were "activated" when the demo data was made. */
const SEEDED_AT = '2026-10-27T06:00:00.000Z';

const scoped = { restaurantId: RESTAURANT_ID, branchId: BRANCH_ID };

function staff(
  n: number,
  name: string,
  role: StaffUser['role'],
  { stationIds = [], tableIds = [] }: { stationIds?: string[]; tableIds?: string[] } = {},
): StaffUser {
  return {
    id: demoId(100 + n),
    restaurantId: RESTAURANT_ID,
    branchId: role === 'OWNER' ? null : BRANCH_ID,
    name,
    phone: `0300-00000${String(n).padStart(2, '0')}`,
    role,
    isActive: true,
    stationIds,
    tableIds,
    email: null,
    activatedAt: SEEDED_AT,
    archivedAt: null,
    employeeCode: `EMP${String(n).padStart(3, '0')}`,
    permissions: null,
    lastLoginAt: null,
  };
}

export const STATION = {
  pizzaOven: demoId(200),
  grillFry: demoId(201),
  hotKitchen: demoId(202),
  drinks: demoId(203),
  chicken: demoId(204),
};

function station(id: string, name: string, sort: number, autoReady = false): KitchenStation {
  return { id, ...scoped, name, autoReady, warnMinutes: 10, lateMinutes: 20, sort };
}

const AREA = { hall: demoId(300), family: demoId(301) };

const tableId = (n: number) => demoId(400 + n);
const tableRange = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => tableId(from + i));

function tables(): DiningTable[] {
  const list: DiningTable[] = [];
  for (let n = 1; n <= 16; n++) {
    list.push({
      id: tableId(n),
      ...scoped,
      areaId: n <= 10 ? AREA.hall : AREA.family,
      name: `T${n}`,
      seats: n <= 10 ? 4 : 6,
      isActive: true,
      // Display order inside the area: Hall T1–T10 = 1–10, Family T11–T16 = 1–6
      sort: n <= 10 ? n : n - 10,
      cleaning: false,
      archivedAt: null,
    });
  }
  return list;
}

const CATEGORY = {
  pizza: demoId(500),
  burgers: demoId(501),
  fries: demoId(502),
  pasta: demoId(503),
  drinks: demoId(504),
  chicken: demoId(505),
};

function category(id: string, name: string, sort: number): MenuCategory {
  return { id, restaurantId: RESTAURANT_ID, branchId: null, name, sort, isActive: true };
}

const GROUP = { pizzaExtras: demoId(600), burgerExtras: demoId(601) };

function variant(n: number, name: string, rupees: number, sort: number): ItemVariant {
  return { id: demoId(800 + n), name, price: rupeesToPaisa(rupees), sort };
}

let itemSort = 0;
function item(
  n: number,
  name: string,
  categoryId: string,
  stationId: string,
  rupees: number,
  extra: Partial<Pick<MenuItem, 'variants' | 'modifierGroupIds' | 'description' | 'unit'>> = {},
): MenuItem {
  return {
    id: demoId(700 + n),
    restaurantId: RESTAURANT_ID,
    branchId: null,
    categoryId,
    stationId,
    name,
    description: extra.description ?? '',
    basePrice: rupeesToPaisa(rupees),
    unit: extra.unit ?? 'piece',
    isAvailable: true,
    isOnline: true,
    sort: itemSort++,
    variants: extra.variants ?? [],
    modifierGroupIds: extra.modifierGroupIds ?? [],
    archivedAt: null,
  };
}

export function createSeed(): DemoData {
  itemSort = 0;
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
    onlinePublishing: { ...NEW_ONLINE_PUBLISHING },
    staff: [
      staff(1, 'Aziz Ahmed', 'OWNER'),
      staff(2, 'Sana Khan', 'MANAGER'),
      staff(3, 'Bilal Hussain', 'CASHIER'),
      // Super Waiter: takes orders on every table.
      staff(4, 'Imran Ali', 'WAITER'),
      // Service Waiters: serve food on their own tables.
      staff(5, 'Usman Tariq', 'SERVICE_WAITER', { tableIds: tableRange(1, 8) }),
      staff(9, 'Kashif Raza', 'SERVICE_WAITER', { tableIds: tableRange(9, 16) }),
      // Head chef sees every station; the other chefs see only their own station.
      staff(6, 'Rashid Mehmood', 'KITCHEN'),
      staff(10, 'Nadeem (Pizza Chef)', 'KITCHEN', { stationIds: [STATION.pizzaOven] }),
      staff(11, 'Javed (Burger Chef)', 'KITCHEN', { stationIds: [STATION.grillFry] }),
      staff(12, 'Akram (Chicken Chef)', 'KITCHEN', { stationIds: [STATION.chicken] }),
      staff(7, 'Faisal Riaz', 'RIDER'),
      staff(8, 'Naveed Akhtar', 'RIDER'),
    ],
    stations: [
      station(STATION.pizzaOven, 'Pizza Oven', 1),
      station(STATION.grillFry, 'Grill & Fry', 2),
      station(STATION.chicken, 'Chicken Station', 3),
      station(STATION.hotKitchen, 'Hot Kitchen', 4),
      station(STATION.drinks, 'Drinks', 5, true),
    ],
    areas: [
      { id: AREA.hall, ...scoped, name: 'Hall', sort: 1, isActive: true },
      { id: AREA.family, ...scoped, name: 'Family', sort: 2, isActive: true },
    ],
    tables: tables(),
    categories: [
      category(CATEGORY.pizza, 'Pizza', 1),
      category(CATEGORY.burgers, 'Burgers', 2),
      category(CATEGORY.chicken, 'Chicken', 3),
      category(CATEGORY.fries, 'Fries & Sides', 4),
      category(CATEGORY.pasta, 'Pasta', 5),
      category(CATEGORY.drinks, 'Drinks', 6),
    ],
    modifierGroups: [
      {
        id: GROUP.pizzaExtras,
        restaurantId: RESTAURANT_ID,
        name: 'Pizza extras',
        minSelect: 0,
        maxSelect: 3,
        modifiers: [
          { id: demoId(650), name: 'Extra cheese', price: rupeesToPaisa(150), isAvailable: true },
          { id: demoId(651), name: 'Jalapeños', price: rupeesToPaisa(50), isAvailable: true },
          { id: demoId(652), name: 'Olives', price: rupeesToPaisa(50), isAvailable: true },
        ],
      },
      {
        id: GROUP.burgerExtras,
        restaurantId: RESTAURANT_ID,
        name: 'Burger extras',
        minSelect: 0,
        maxSelect: 2,
        modifiers: [
          { id: demoId(660), name: 'Cheese slice', price: rupeesToPaisa(50), isAvailable: true },
          { id: demoId(661), name: 'Extra patty', price: rupeesToPaisa(200), isAvailable: true },
        ],
      },
    ],
    items: [
      item(1, 'Classic Pizza', CATEGORY.pizza, STATION.pizzaOven, 850, {
        variants: [variant(1, 'Small', 600, 1), variant(2, 'Medium', 850, 2), variant(3, 'Large', 1200, 3)],
        modifierGroupIds: [GROUP.pizzaExtras],
        description: 'Cheese, tomato sauce',
      }),
      item(2, 'Fajita Pizza', CATEGORY.pizza, STATION.pizzaOven, 950, {
        variants: [variant(4, 'Small', 700, 1), variant(5, 'Medium', 950, 2), variant(6, 'Large', 1350, 3)],
        modifierGroupIds: [GROUP.pizzaExtras],
        description: 'Chicken, capsicum, onion',
      }),
      item(3, 'Zinger Burger', CATEGORY.burgers, STATION.grillFry, 450, { modifierGroupIds: [GROUP.burgerExtras], description: 'Crispy chicken, lettuce' }),
      item(4, 'Beef Burger', CATEGORY.burgers, STATION.grillFry, 550, { modifierGroupIds: [GROUP.burgerExtras], description: 'Beef patty, cheese' }),
      item(10, 'Chicken Karahi', CATEGORY.chicken, STATION.chicken, 2600, { unit: 'kg', description: 'Spicy & traditional, per kg' }),
      item(11, 'Chicken Tikka', CATEGORY.chicken, STATION.chicken, 450, { description: 'Grilled chicken pieces' }),
      item(5, 'Loaded Fries', CATEGORY.fries, STATION.grillFry, 350, { description: 'Fries, cheese, sauce' }),
      item(6, 'Wings', CATEGORY.fries, STATION.grillFry, 550, { description: 'Hot & crispy' }),
      item(7, 'Alfredo Pasta', CATEGORY.pasta, STATION.hotKitchen, 600, { description: 'Creamy white sauce' }),
      item(8, 'Cold Drink', CATEGORY.drinks, STATION.drinks, 125, { description: 'Bottled, served chilled' }),
      item(9, 'Mineral Water', CATEGORY.drinks, STATION.drinks, 80, { description: '500 ml bottle' }),
    ],
    orders: [],
    dailyCounters: {},
    idempotency: {},
    invoiceCounter: 0,
    riderSettlements: [],
    heldBills: [],
    waiterCalls: [],
    invites: [],
    sessionVersions: {},
    rolePermissions: {},
    employeeCounter: 12,
  };
}

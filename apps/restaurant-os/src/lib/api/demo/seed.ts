import {
  NEW_ONLINE_PUBLISHING,
  NO_TAX,
  WEEK_DAYS,
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
  type WebsiteConfig,
  type WaiterCall,
} from '@restaurant-saas/shared';
import { createInventorySeed, type DemoInventory } from './inventory-seed';
import { createRecipeSeed } from './recipe-seed';

/**
 * DEMO data for "Aziz Pizza — DEMO" (MASTER_PROMPT.md §12 test data, §16 assumptions).
 * Sample data only — never real customers, staff or prices.
 */
export const DEMO_DATA_VERSION = 17;

/** Permissions added after demo data of an older version was saved: the Managers get them as recommended. */
const NEW_MANAGER_PERMISSIONS_16: Permission[] = ['inventory.view', 'inventory.manage'];

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
  onlineWebsite: WebsiteConfig;
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
  /** Inventory & Suppliers (DEMO, Step A: ingredients, stock movements, locations, suppliers) */
  inventory: DemoInventory;
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
    onlineWebsite: {
      brand: { logoText: 'AP', wordmark: '', primaryColor: '#e31e24', accentColor: '#fbbf24', tagline: 'Hot pizza, crispy burgers, delivered to your door.', description: '', headline: '' },
      homepage: {
        showCategories: true,
        showDeals: true,
        showPopular: true,
        // Classic Pizza, Zinger Burger, Chicken Tikka, Loaded Fries
        popularItemIds: [demoId(701), demoId(703), demoId(711), demoId(705)],
        deals: [
          { itemId: demoId(710), tag: "Today's pick" },
          { itemId: demoId(703), tag: 'Customer favourite' },
        ],
      },
      menu: { showDescriptions: true, showSoldOut: true },
      modes: { delivery: true, pickup: true, dineIn: true },
      hours: Object.fromEntries(WEEK_DAYS.map((day) => [day, { closed: false, open: '12:00', close: '02:00' }])) as WebsiteConfig['hours'],
      contact: { whatsapp: '', email: '', facebook: '', instagram: '' },
      seo: { title: 'Aziz Pizza — Order online', description: 'Hot pizza, crispy burgers, delivered to your door. Order online for delivery or pickup.' },
    },
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
    inventory: createInventorySeed(scoped, demoId(101)),
  };
}

/**
 * Saved demo data of an older version, brought up to date step by step WITHOUT losing anything (owner, 2026-11-04:
 * never reset his demo data without asking).
 * - 15 → 16 adds the sample inventory and the new Inventory permissions.
 * - 16 → 17 marks every ingredient as bought and adds the sample recipes and the prepared pizza dough; the
 *   ingredients, stock and corrections he made stay as they are.
 * Anything older, or not demo data at all, returns null (the demo starts fresh, as before).
 */
export function upgradeDemoData(raw: unknown): DemoData | null {
  let data = raw as (Omit<DemoData, 'inventory'> & { inventory?: DemoInventory }) | null;
  if (!data || typeof data !== 'object' || typeof data.version !== 'number') return null;
  if (data.version === DEMO_DATA_VERSION) return data as DemoData;
  if (data.version < 15 || data.version > DEMO_DATA_VERSION) return null;
  if (data.version === 15) {
    const added = NEW_MANAGER_PERMISSIONS_16;
    const withNew = (list: Permission[]) => [...list, ...added.filter((p) => !list.includes(p))];
    data = {
      ...data,
      version: 16,
      inventory: data.inventory ?? createInventorySeed(scoped, demoId(101)),
      rolePermissions: data.rolePermissions.MANAGER ? { ...data.rolePermissions, MANAGER: withNew(data.rolePermissions.MANAGER) } : data.rolePermissions,
      staff: data.staff.map((s) => (s.role === 'MANAGER' && s.permissions ? { ...s, permissions: withNew(s.permissions) } : s)),
    };
    // A brand-new sample inventory already has version 17's recipes.
    if (!raw || (raw as { inventory?: unknown }).inventory === undefined) return { ...data, version: 17 } as DemoData;
  }
  if (data.version === 16 && data.inventory) {
    const inventory = data.inventory;
    const ingredients = inventory.ingredients.map((i) => ({ ...i, kind: i.kind ?? 'BOUGHT' }));
    const { dough, recipes } = createRecipeSeed(scoped, demoId(101), ingredients);
    data = {
      ...data,
      version: 17,
      inventory: {
        ...inventory,
        ingredients: ingredients.some((i) => i.id === dough.id) ? ingredients : [...ingredients, dough],
        recipes: inventory.recipes ?? recipes,
      },
    };
  }
  return data.version === DEMO_DATA_VERSION && data.inventory ? (data as DemoData) : null;
}

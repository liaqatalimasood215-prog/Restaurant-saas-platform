import {
  NO_TAX,
  rupeesToPaisa,
  type Area,
  type Branch,
  type DiningTable,
  type ItemVariant,
  type KitchenStation,
  type MenuCategory,
  type MenuItem,
  type ModifierGroup,
  type Order,
  type Restaurant,
  type StaffUser,
} from '@restaurant-saas/shared';

/**
 * DEMO data for "Aziz Pizza — DEMO" (MASTER_PROMPT.md §12 test data, §16 assumptions).
 * Sample data only — never real customers, staff or prices.
 */
export const DEMO_DATA_VERSION = 2;

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
}

const scoped = { restaurantId: RESTAURANT_ID, branchId: BRANCH_ID };

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

export const STATION = {
  pizzaOven: demoId(200),
  grillFry: demoId(201),
  hotKitchen: demoId(202),
  drinks: demoId(203),
};

function station(id: string, name: string, sort: number, autoReady = false): KitchenStation {
  return { id, ...scoped, name, autoReady, warnMinutes: 10, lateMinutes: 20, sort };
}

const AREA = { hall: demoId(300), family: demoId(301) };

function tables(): DiningTable[] {
  const list: DiningTable[] = [];
  for (let n = 1; n <= 16; n++) {
    list.push({
      id: demoId(400 + n),
      ...scoped,
      areaId: n <= 10 ? AREA.hall : AREA.family,
      name: `T${n}`,
      seats: n <= 10 ? 4 : 6,
      isActive: true,
      sort: n,
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
  extra: Partial<Pick<MenuItem, 'variants' | 'modifierGroupIds' | 'description'>> = {},
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
    isAvailable: true,
    isOnline: true,
    sort: itemSort++,
    variants: extra.variants ?? [],
    modifierGroupIds: extra.modifierGroupIds ?? [],
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
    stations: [
      station(STATION.pizzaOven, 'Pizza Oven', 1),
      station(STATION.grillFry, 'Grill & Fry', 2),
      station(STATION.hotKitchen, 'Hot Kitchen', 3),
      station(STATION.drinks, 'Drinks', 4, true),
    ],
    areas: [
      { id: AREA.hall, ...scoped, name: 'Hall', sort: 1 },
      { id: AREA.family, ...scoped, name: 'Family', sort: 2 },
    ],
    tables: tables(),
    categories: [
      category(CATEGORY.pizza, 'Pizza', 1),
      category(CATEGORY.burgers, 'Burgers', 2),
      category(CATEGORY.fries, 'Fries & Sides', 3),
      category(CATEGORY.pasta, 'Pasta', 4),
      category(CATEGORY.drinks, 'Drinks', 5),
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
      }),
      item(2, 'Fajita Pizza', CATEGORY.pizza, STATION.pizzaOven, 950, {
        variants: [variant(4, 'Small', 700, 1), variant(5, 'Medium', 950, 2), variant(6, 'Large', 1350, 3)],
        modifierGroupIds: [GROUP.pizzaExtras],
      }),
      item(3, 'Zinger Burger', CATEGORY.burgers, STATION.grillFry, 450, { modifierGroupIds: [GROUP.burgerExtras] }),
      item(4, 'Beef Burger', CATEGORY.burgers, STATION.grillFry, 550, { modifierGroupIds: [GROUP.burgerExtras] }),
      item(5, 'Loaded Fries', CATEGORY.fries, STATION.grillFry, 350),
      item(6, 'Wings', CATEGORY.fries, STATION.grillFry, 550),
      item(7, 'Alfredo Pasta', CATEGORY.pasta, STATION.hotKitchen, 600),
      item(8, 'Cold Drink', CATEGORY.drinks, STATION.drinks, 125, { description: 'Bottled, served chilled' }),
      item(9, 'Mineral Water', CATEGORY.drinks, STATION.drinks, 80),
    ],
    orders: [],
    dailyCounters: {},
    idempotency: {},
  };
}

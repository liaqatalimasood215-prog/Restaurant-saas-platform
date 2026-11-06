import {
  DEFAULT_EXPIRING_SOON_DAYS,
  MILLI,
  businessDate,
  currentVersion,
  displayFactorMilli,
  linesCost,
  makeCostBook,
  rupeesToPaisa,
  sameTarget,
  scaleLines,
  type Ingredient,
  type IngredientCategory,
  type ItemVariant,
  type KitchenStation,
  type MenuCategory,
  type MenuItem,
  type MenuUnit,
  type ModifierGroup,
  type PurchaseUnit,
  type Recipe,
  type RecipeLine,
  type RecipeStatus,
  type RecipeTarget,
  type StockLocation,
  type StockMovement,
  type StockUnit,
  type Supplier,
  type WebsiteConfig,
} from '@restaurant-saas/shared';
import { withSupplierProfiles, type DemoInventory } from './inventory-seed';
import type { DemoData } from './seed';

/**
 * DEMO data of "Lala Restaurant — DEMO" (owner, 2026-11-05): his desi menu instead of pizza and burgers — karahi in
 * 1 kg / ½ kg / Pao, sabzi and daal, BBQ, fish, roti and naan, raita and salad, chai and coffee, cold drinks — with
 * desi ingredients, suppliers and sample recipes. Prices and quantities are samples; the owner changes them in the
 * Menu and the Recipe Builder. The Aziz Pizza data stays only as the fixed data of the automatic tests (seed.ts).
 */
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const LALA_NAME = 'Lala Restaurant — DEMO';

const STATION = {
  tandoor: id(200),
  bbq: id(201),
  hotKitchen: id(202),
  drinks: id(203),
  karahi: id(204),
  chai: id(205),
};
const CATEGORY = {
  coldDrinks: id(504),
  karahi: id(505),
  sabziDaal: id(506),
  bbq: id(507),
  fish: id(508),
  roti: id(509),
  raita: id(510),
  chai: id(511),
};
const GROUP = { karahiExtras: id(602) };
const ADDON = { makhan: id(653) };
const ITEM = {
  chickenKarahi: id(710),
  chickenTikka: id(711),
  muttonKarahi: id(712),
  chickenWhite: id(713),
  muttonWhite: id(714),
  mixSabzi: id(715),
  daalMash: id(716),
  daalChana: id(717),
  seekhKabab: id(718),
  malaiBoti: id(719),
  fishFry: id(720),
  roti: id(721),
  naan: id(722),
  raita: id(723),
  salad: id(724),
  chai: id(725),
  coffee: id(726),
  coldDrink: id(708),
  water: id(709),
};
const SIZE = {
  ck1: id(820),
  ckHalf: id(821),
  ckPao: id(822),
  mk1: id(823),
  mkHalf: id(824),
  mkPao: id(825),
  fish1: id(832),
  fishHalf: id(833),
};

type Scope = { restaurantId: string; branchId: string };

// ── Menu ──────────────────────────────────────────────────────────────────────────────────────

/** [n, name, rupees] → a size with id 800 + n */
const sizes = (rows: [number, string, number][]): ItemVariant[] =>
  rows.map(([n, name, rupees], i) => ({
    id: id(800 + n),
    name,
    price: rupeesToPaisa(rupees),
    sort: i + 1,
  }));
const KARAHI_SIZES = (first: number, prices: [number, number, number]) =>
  sizes([
    [first, '1 kg', prices[0]],
    [first + 1, '½ kg', prices[1]],
    [first + 2, 'Pao', prices[2]],
  ]);

type ItemRow = [n: number, name: string, category: string, station: string, rupees: number, unit: MenuUnit, description: string, variants?: ItemVariant[], groups?: string[]];

const ITEMS: ItemRow[] = [
  [10, 'Chicken Karahi', CATEGORY.karahi, STATION.karahi, 2600, 'piece', 'Tomato, green chilli, ginger — 1 kg, ½ kg or Pao', KARAHI_SIZES(20, [2600, 1400, 750]), [GROUP.karahiExtras]],
  [12, 'Mutton Karahi', CATEGORY.karahi, STATION.karahi, 4800, 'piece', 'Fresh mutton in desi ghee — 1 kg, ½ kg or Pao', KARAHI_SIZES(23, [4800, 2500, 1300]), [GROUP.karahiExtras]],
  [13, 'Chicken White Karahi', CATEGORY.karahi, STATION.karahi, 2800, 'piece', 'Cream, yogurt and black pepper', KARAHI_SIZES(26, [2800, 1500, 800]), [GROUP.karahiExtras]],
  [14, 'Mutton White Karahi', CATEGORY.karahi, STATION.karahi, 5000, 'piece', 'Mutton in a creamy white gravy', KARAHI_SIZES(29, [5000, 2600, 1350]), [GROUP.karahiExtras]],
  [15, 'Mix Sabzi', CATEGORY.sabziDaal, STATION.hotKitchen, 450, 'plate', 'Seasonal vegetables'],
  [16, 'Daal Mash', CATEGORY.sabziDaal, STATION.hotKitchen, 450, 'plate', 'With desi ghee tarka'],
  [17, 'Daal Chana', CATEGORY.sabziDaal, STATION.hotKitchen, 400, 'plate', 'Slow cooked chana daal'],
  [11, 'Chicken Tikka', CATEGORY.bbq, STATION.bbq, 450, 'piece', 'Leg or chest piece on charcoal'],
  [18, 'Seekh Kabab (4 pcs)', CATEGORY.bbq, STATION.bbq, 600, 'plate', 'Chicken mince, four skewers'],
  [19, 'Malai Boti', CATEGORY.bbq, STATION.bbq, 700, 'plate', 'Creamy boneless chicken'],
  [
    20,
    'Fish Fry',
    CATEGORY.fish,
    STATION.hotKitchen,
    3200,
    'piece',
    'Rahu fish in besan batter — 1 kg or ½ kg',
    sizes([
      [32, '1 kg', 3200],
      [33, '½ kg', 1700],
    ]),
  ],
  [21, 'Roti', CATEGORY.roti, STATION.tandoor, 30, 'piece', 'Tandoori roti'],
  [22, 'Naan', CATEGORY.roti, STATION.tandoor, 50, 'piece', 'Fresh from the tandoor'],
  [23, 'Raita', CATEGORY.raita, STATION.hotKitchen, 100, 'piece', 'Yogurt with cucumber'],
  [24, 'Salad', CATEGORY.raita, STATION.hotKitchen, 100, 'piece', 'Cucumber, tomato, onion, lemon'],
  [25, 'Doodh Patti Chai', CATEGORY.chai, STATION.chai, 120, 'piece', 'Strong milk tea'],
  [26, 'Coffee', CATEGORY.chai, STATION.chai, 350, 'piece', 'Hot milk coffee'],
  [8, 'Cold Drink', CATEGORY.coldDrinks, STATION.drinks, 125, 'piece', 'Bottled, served chilled'],
  [9, 'Mineral Water', CATEGORY.coldDrinks, STATION.drinks, 80, 'piece', '500 ml bottle'],
];

export interface LalaMenu {
  stations: KitchenStation[];
  categories: MenuCategory[];
  modifierGroups: ModifierGroup[];
  items: MenuItem[];
  /** Chef name per staff id */
  chefs: Record<string, string>;
}

export function lalaMenu(restaurantId: string, branchId: string): LalaMenu {
  const station = (stationId: string, name: string, sort: number, autoReady = false): KitchenStation => ({
    id: stationId,
    restaurantId,
    branchId,
    name,
    autoReady,
    warnMinutes: 10,
    lateMinutes: 20,
    sort,
  });
  const category = (categoryId: string, name: string, sort: number): MenuCategory => ({
    id: categoryId,
    restaurantId,
    branchId: null,
    name,
    sort,
    isActive: true,
  });
  return {
    stations: [
      station(STATION.karahi, 'Karahi Station', 1),
      station(STATION.bbq, 'BBQ & Grill', 2),
      station(STATION.hotKitchen, 'Hot Kitchen', 3),
      station(STATION.tandoor, 'Tandoor', 4),
      station(STATION.chai, 'Chai Counter', 5),
      station(STATION.drinks, 'Drinks', 6, true),
    ],
    categories: [
      category(CATEGORY.karahi, 'Karahi', 1),
      category(CATEGORY.sabziDaal, 'Sabzi & Daal', 2),
      category(CATEGORY.bbq, 'BBQ', 3),
      category(CATEGORY.fish, 'Fish', 4),
      category(CATEGORY.roti, 'Roti & Naan', 5),
      category(CATEGORY.raita, 'Raita & Salad', 6),
      category(CATEGORY.chai, 'Chai & Coffee', 7),
      category(CATEGORY.coldDrinks, 'Cold Drinks', 8),
    ],
    modifierGroups: [
      {
        id: GROUP.karahiExtras,
        restaurantId,
        name: 'Karahi extras',
        minSelect: 0,
        maxSelect: 1,
        modifiers: [
          {
            id: ADDON.makhan,
            name: 'Extra makhan (butter)',
            price: rupeesToPaisa(100),
            isAvailable: true,
          },
        ],
      },
    ],
    items: ITEMS.map(([n, name, categoryId, stationId, rupees, unit, description, variants = [], groups = []], sort) => ({
      id: id(700 + n),
      restaurantId,
      branchId: null,
      categoryId,
      stationId,
      name,
      description,
      basePrice: rupeesToPaisa(rupees),
      unit,
      isAvailable: true,
      isOnline: true,
      sort,
      variants,
      modifierGroupIds: groups,
      archivedAt: null,
    })),
    chefs: {
      [id(110)]: 'Nadeem (Tandoor)',
      [id(111)]: 'Javed (BBQ Chef)',
      [id(112)]: 'Akram (Karahi Chef)',
    },
  };
}

export function lalaWebsite(base: WebsiteConfig): WebsiteConfig {
  const tagline = 'Desi karahi, BBQ and fresh tandoori naan — dine in or order home.';
  return {
    ...base,
    brand: { ...base.brand, logoText: 'LR', tagline },
    homepage: {
      ...base.homepage,
      popularItemIds: [ITEM.chickenKarahi, ITEM.muttonKarahi, ITEM.chickenTikka, ITEM.chai],
      deals: [
        { itemId: ITEM.muttonKarahi, tag: "Today's pick" },
        { itemId: ITEM.chickenKarahi, tag: 'Customer favourite' },
      ],
    },
    seo: {
      title: 'Lala Restaurant — Order online',
      description: 'Desi karahi, BBQ, daal and chai. Order online for delivery or pickup.',
    },
  };
}

// ── Stock ─────────────────────────────────────────────────────────────────────────────────────

const LOCATION = {
  mainStore: id(1200),
  kitchen: id(1201),
  tandoor: id(1202),
  freezer: id(1203),
  fridge: id(1204),
  dry: id(1205),
  drinks: id(1206),
};
const SUPPLIER = {
  chicken: id(1220),
  sabzi: id(1221),
  dairy: id(1222),
  packaging: id(1223),
  drinks: id(1224),
  mutton: id(1225),
  fish: id(1226),
  kiryana: id(1227),
  koyla: id(1228),
};

const LOCATIONS: [string, string][] = [
  ['Main Store', LOCATION.mainStore],
  ['Main Kitchen', LOCATION.kitchen],
  ['Tandoor', LOCATION.tandoor],
  ['Freezer', LOCATION.freezer],
  ['Refrigerator', LOCATION.fridge],
  ['Dry Store', LOCATION.dry],
  ['Drinks Counter', LOCATION.drinks],
];

const SUPPLIERS: [string, string, string][] = [
  ['Fresh Chicken Point — DEMO', '0300-1110001', SUPPLIER.chicken],
  ['Sabzi Mandi — DEMO', '0300-1110002', SUPPLIER.sabzi],
  ['Fresh Doodh Dairy — DEMO', '0300-1110003', SUPPLIER.dairy],
  ['City Packaging — DEMO', '0300-1110004', SUPPLIER.packaging],
  ['Pak Beverages — DEMO', '0300-1110005', SUPPLIER.drinks],
  ['Lahore Mutton Shop — DEMO', '0300-1110006', SUPPLIER.mutton],
  ['River Fish Market — DEMO', '0300-1110007', SUPPLIER.fish],
  ['Madina Kiryana Store — DEMO', '0300-1110008', SUPPLIER.kiryana],
  ['Koyla Depot — DEMO', '0300-1110009', SUPPLIER.koyla],
];

type Row = [
  n: number,
  name: string,
  code: string,
  category: IngredientCategory,
  purchaseUnit: PurchaseUnit,
  stockUnit: StockUnit,
  /** stock units in one purchase unit when it is a package */
  packSize: number | null,
  /** in the display unit (kg, l or the counted unit) */
  minStock: number,
  /** in purchase units */
  reorder: number,
  rupees: number,
  supplier: string | null,
  location: string,
  /** in the display unit */
  opening: number,
  /** days from today; null = no expiry */
  expiresIn: number | null,
];

/** Ingredient id = 1300 + n; its opening movement = 1400 + n (the same ids the Aziz Pizza data used for shared ingredients). */
const ROWS: Row[] = [
  [30, 'Chicken (with bone)', 'CHB-001', 'MEAT', 'kg', 'g', null, 8, 20, 620, SUPPLIER.chicken, LOCATION.freezer, 25, 3],
  [0, 'Chicken (boneless)', 'CHK-001', 'MEAT', 'kg', 'g', null, 3, 10, 650, SUPPLIER.chicken, LOCATION.freezer, 10, 5],
  [33, 'Chicken mince', 'CHM-001', 'MEAT', 'kg', 'g', null, 2, 5, 750, SUPPLIER.chicken, LOCATION.freezer, 4, 2],
  [31, 'Mutton', 'MTN-001', 'MEAT', 'kg', 'g', null, 5, 10, 2400, SUPPLIER.mutton, LOCATION.freezer, 12, 3],
  [32, 'Fish (Rahu)', 'FSH-001', 'MEAT', 'kg', 'g', null, 3, 8, 900, SUPPLIER.fish, LOCATION.freezer, 6, 2],
  [7, 'Tomatoes', 'TMT-001', 'VEGETABLES', 'kg', 'g', null, 5, 15, 180, SUPPLIER.sabzi, LOCATION.fridge, 15, 6],
  [8, 'Onions', 'ONN-001', 'VEGETABLES', 'kg', 'g', null, 5, 20, 140, SUPPLIER.sabzi, LOCATION.dry, 20, null],
  [38, 'Green chillies', 'GCH-001', 'VEGETABLES', 'kg', 'g', null, 1, 3, 240, SUPPLIER.sabzi, LOCATION.fridge, 2, 4],
  [39, 'Ginger', 'GNG-001', 'VEGETABLES', 'kg', 'g', null, 0.5, 2, 600, SUPPLIER.sabzi, LOCATION.dry, 1.5, 10],
  [40, 'Garlic', 'GRL-001', 'VEGETABLES', 'kg', 'g', null, 0.5, 2, 500, SUPPLIER.sabzi, LOCATION.dry, 2, 15],
  [41, 'Mix vegetables (seasonal)', 'MXV-001', 'VEGETABLES', 'kg', 'g', null, 4, 10, 160, SUPPLIER.sabzi, LOCATION.fridge, 10, 3],
  [42, 'Cucumber', 'CUC-001', 'VEGETABLES', 'kg', 'g', null, 1, 4, 150, SUPPLIER.sabzi, LOCATION.fridge, 3, 4],
  [43, 'Lemon', 'LMN-001', 'VEGETABLES', 'kg', 'g', null, 0.5, 2, 300, SUPPLIER.sabzi, LOCATION.fridge, 1, 7],
  [44, 'Coriander leaves', 'COR-001', 'VEGETABLES', 'kg', 'g', null, 0.3, 1, 400, SUPPLIER.sabzi, LOCATION.fridge, 0.2, 2],
  [34, 'Yogurt (dahi)', 'YGT-001', 'DAIRY', 'kg', 'g', null, 3, 10, 260, SUPPLIER.dairy, LOCATION.fridge, 8, 3],
  [35, 'Fresh milk', 'MLK-001', 'DAIRY', 'l', 'ml', null, 10, 40, 220, SUPPLIER.dairy, LOCATION.fridge, 20, 2],
  [4, 'Fresh cream', 'FRC-001', 'DAIRY', 'l', 'ml', null, 1, 4, 900, SUPPLIER.dairy, LOCATION.fridge, 2, -1],
  [36, 'Butter (makhan)', 'BTR-001', 'DAIRY', 'kg', 'g', null, 1, 3, 1900, SUPPLIER.dairy, LOCATION.fridge, 2, 20],
  [12, 'Cooking oil', 'CKO-001', 'OIL', 'l', 'ml', null, 5, 20, 580, SUPPLIER.kiryana, LOCATION.mainStore, 18, null],
  [37, 'Desi ghee', 'GHE-001', 'OIL', 'kg', 'g', null, 2, 5, 2800, SUPPLIER.kiryana, LOCATION.mainStore, 5, null],
  [45, 'Daal mash', 'DMS-001', 'GRAINS', 'kg', 'g', null, 3, 10, 520, SUPPLIER.kiryana, LOCATION.dry, 8, null],
  [46, 'Daal chana', 'DCH-001', 'GRAINS', 'kg', 'g', null, 3, 10, 300, SUPPLIER.kiryana, LOCATION.dry, 10, null],
  [49, 'Besan', 'BSN-001', 'GRAINS', 'kg', 'g', null, 2, 5, 280, SUPPLIER.kiryana, LOCATION.dry, 5, 120],
  [56, 'Sugar', 'SGR-001', 'GRAINS', 'kg', 'g', null, 5, 20, 160, SUPPLIER.kiryana, LOCATION.dry, 20, null],
  [47, 'Atta (20 kg bag)', 'ATA-001', 'BAKERY', 'pack', 'g', 20_000, 15, 3, 2600, SUPPLIER.kiryana, LOCATION.dry, 40, 60],
  [48, 'Maida', 'MDA-001', 'BAKERY', 'kg', 'g', null, 5, 10, 160, SUPPLIER.kiryana, LOCATION.dry, 15, 90],
  [51, 'Karahi masala (100 g pack)', 'KMS-001', 'SAUCES_SPICES', 'pack', 'g', 100, 0.5, 10, 150, SUPPLIER.kiryana, LOCATION.dry, 2.5, null],
  [16, 'Red chilli powder (500 g pack)', 'RCP-001', 'SAUCES_SPICES', 'pack', 'g', 500, 0.5, 2, 450, SUPPLIER.kiryana, LOCATION.dry, 1.2, null],
  [53, 'Black pepper (200 g pack)', 'BPP-001', 'SAUCES_SPICES', 'pack', 'g', 200, 0.2, 3, 600, SUPPLIER.kiryana, LOCATION.dry, 0.6, null],
  [54, 'BBQ masala (100 g pack)', 'BBQ-001', 'SAUCES_SPICES', 'pack', 'g', 100, 0.3, 6, 160, SUPPLIER.kiryana, LOCATION.dry, 1, null],
  [52, 'Salt', 'SLT-001', 'SAUCES_SPICES', 'kg', 'g', null, 2, 5, 60, SUPPLIER.kiryana, LOCATION.dry, 5, null],
  [55, 'Tea leaves (900 g pack)', 'TEA-001', 'BEVERAGES', 'pack', 'g', 900, 1, 4, 1650, SUPPLIER.kiryana, LOCATION.dry, 3.6, null],
  [57, 'Instant coffee (200 g jar)', 'COF-001', 'BEVERAGES', 'pack', 'g', 200, 0.2, 3, 1400, SUPPLIER.kiryana, LOCATION.dry, 0.6, 180],
  [18, 'Cold drink 345 ml', 'CLD-001', 'BEVERAGES', 'carton', 'bottle', 24, 24, 3, 2400, SUPPLIER.drinks, LOCATION.drinks, 60, 120],
  [19, 'Mineral water 500 ml', 'MNW-001', 'BEVERAGES', 'carton', 'bottle', 12, 12, 4, 600, SUPPLIER.drinks, LOCATION.drinks, 36, null],
  [58, 'Charcoal (koyla)', 'KYL-001', 'OTHER', 'kg', 'g', null, 10, 40, 120, SUPPLIER.koyla, LOCATION.mainStore, 30, null],
  [59, 'Takeaway boxes (karahi)', 'TKB-001', 'PACKAGING', 'pack', 'piece', 50, 50, 4, 1500, SUPPLIER.packaging, LOCATION.mainStore, 100, null],
  [23, 'Paper carry bags', 'PCB-001', 'PACKAGING', 'pack', 'piece', 100, 100, 3, 900, SUPPLIER.packaging, LOCATION.mainStore, 90, null],
  [24, 'Dish wash liquid', 'DWL-001', 'CLEANING', 'l', 'ml', null, 2, 5, 450, SUPPLIER.kiryana, LOCATION.mainStore, 4, null],
  // Owner, 2026-11-06: every demo supplier brings his whole range (karyana, sabzi, chicken, doodh). Added by the 19 → 20 upgrade.
  [61, 'Basmati rice', 'RIC-001', 'GRAINS', 'kg', 'g', null, 5, 10, 380, SUPPLIER.kiryana, LOCATION.dry, 10, null],
  [62, 'Haldi (200 g pack)', 'HLD-001', 'SAUCES_SPICES', 'pack', 'g', 200, 0.2, 3, 220, SUPPLIER.kiryana, LOCATION.dry, 0.6, null],
  [63, 'Zeera (200 g pack)', 'ZRA-001', 'SAUCES_SPICES', 'pack', 'g', 200, 0.2, 3, 450, SUPPLIER.kiryana, LOCATION.dry, 0.4, null],
  [64, 'Dhania powder (200 g pack)', 'DHP-001', 'SAUCES_SPICES', 'pack', 'g', 200, 0.2, 3, 200, SUPPLIER.kiryana, LOCATION.dry, 0.6, null],
  [65, 'Garam masala (100 g pack)', 'GRM-001', 'SAUCES_SPICES', 'pack', 'g', 100, 0.2, 5, 250, SUPPLIER.kiryana, LOCATION.dry, 0.5, null],
  [66, 'Elaichi (50 g pack)', 'ELC-001', 'SAUCES_SPICES', 'pack', 'g', 50, 0.05, 4, 600, SUPPLIER.kiryana, LOCATION.dry, 0.15, null],
  [67, 'Sirka (vinegar)', 'VNG-001', 'SAUCES_SPICES', 'l', 'ml', null, 0.5, 2, 180, SUPPLIER.kiryana, LOCATION.dry, 1.5, null],
  [68, 'Potatoes (aloo)', 'ALU-001', 'VEGETABLES', 'kg', 'g', null, 5, 20, 120, SUPPLIER.sabzi, LOCATION.dry, 20, null],
  [69, 'Capsicum (shimla mirch)', 'CAP-001', 'VEGETABLES', 'kg', 'g', null, 1, 3, 350, SUPPLIER.sabzi, LOCATION.fridge, 2, 5],
  [70, 'Cabbage (band gobhi)', 'CBG-001', 'VEGETABLES', 'kg', 'g', null, 1, 4, 120, SUPPLIER.sabzi, LOCATION.fridge, 3, 6],
  [71, 'Peas (matar)', 'PEA-001', 'VEGETABLES', 'kg', 'g', null, 1, 3, 300, SUPPLIER.sabzi, LOCATION.fridge, 2, 4],
  [72, 'Spinach (palak)', 'SPN-001', 'VEGETABLES', 'kg', 'g', null, 1, 4, 160, SUPPLIER.sabzi, LOCATION.fridge, 2, 2],
  [73, 'Mint (podina)', 'MNT-001', 'VEGETABLES', 'kg', 'g', null, 0.2, 1, 400, SUPPLIER.sabzi, LOCATION.fridge, 0.3, 2],
  [74, 'Carrots (gajar)', 'CRT-001', 'VEGETABLES', 'kg', 'g', null, 1, 4, 140, SUPPLIER.sabzi, LOCATION.fridge, 3, 7],
  [75, 'Chicken leg piece', 'CHL-001', 'MEAT', 'kg', 'g', null, 3, 10, 600, SUPPLIER.chicken, LOCATION.freezer, 6, 3],
  [76, 'Chicken wings', 'CHW-001', 'MEAT', 'kg', 'g', null, 2, 5, 480, SUPPLIER.chicken, LOCATION.freezer, 3, 3],
  [77, 'Chicken breast (tikka cut)', 'CHT-001', 'MEAT', 'kg', 'g', null, 3, 10, 700, SUPPLIER.chicken, LOCATION.freezer, 5, 3],
  [78, 'Paneer', 'PNR-001', 'DAIRY', 'kg', 'g', null, 0.5, 2, 1400, SUPPLIER.dairy, LOCATION.fridge, 1, 5],
  [79, 'Khoya', 'KHY-001', 'DAIRY', 'kg', 'g', null, 0.5, 2, 1200, SUPPLIER.dairy, LOCATION.fridge, 0.5, 4],
];

const ING = (n: number) => id(1300 + n);
const NAAN_DOUGH = id(1360);

function naanDough(scope: Scope, at: string): Ingredient {
  return {
    id: NAAN_DOUGH,
    ...scope,
    kind: 'PREPARED',
    name: 'Naan dough',
    code: 'NDO-001',
    category: 'BAKERY',
    purchaseUnit: 'kg',
    stockUnit: 'g',
    packSizeMilli: null,
    minStockMilli: 0,
    reorderQtyMilli: 0,
    purchasePrice: 0,
    preferredSupplierId: null,
    locationId: LOCATION.tandoor,
    batchNo: '',
    expiryDate: null,
    isActive: true,
    createdAt: at,
    updatedAt: at,
  };
}

// ── Recipes ───────────────────────────────────────────────────────────────────────────────────

/** [ingredient n (1300 + n), quantity in its recipe unit (g, ml, piece, bottle), loss %] */
type L = [number, number, number?];
const lines = (rows: L[]): RecipeLine[] =>
  rows.map(([n, quantity, lossPercent = 0]) => ({
    ingredientId: n === 60 ? NAAN_DOUGH : ING(n),
    quantityMilli: Math.round(quantity * MILLI),
    lossBps: lossPercent * 100,
    optional: false,
    substituteId: null,
  }));
const item = (menuItemId: string, variantId: string | null = null): RecipeTarget => ({ kind: 'ITEM', menuItemId, variantId });

/** Base recipes (variantId null) of items with sizes are the 1 kg pot that Auto Scale shares out. */
const RECIPES: [RecipeTarget, RecipeStatus, L[], number?][] = [
  [
    { kind: 'PREPARED', ingredientId: NAAN_DOUGH },
    'VERIFIED',
    [
      [48, 1000],
      [34, 100],
      [35, 150],
      [12, 30],
      [52, 15],
      [56, 15],
    ],
    1450,
  ],
  [
    item(ITEM.chickenKarahi),
    'VERIFIED',
    [
      [30, 1000],
      [7, 500, 5],
      [38, 40],
      [39, 30],
      [40, 20],
      [12, 150],
      [51, 30],
      [52, 15],
      [44, 10],
    ],
  ],
  [
    item(ITEM.muttonKarahi),
    'DRAFT',
    [
      [31, 1000, 5],
      [7, 500, 5],
      [38, 40],
      [39, 40],
      [40, 25],
      [37, 150],
      [51, 30],
      [52, 15],
    ],
  ],
  [
    item(ITEM.fishFry),
    'VERIFIED',
    [
      [32, 1000, 20],
      [49, 150],
      [12, 300],
      [43, 30],
      [16, 15],
      [52, 15],
    ],
  ],
  [
    item(ITEM.mixSabzi),
    'VERIFIED',
    [
      [41, 300, 10],
      [8, 50, 10],
      [7, 50, 5],
      [12, 40],
      [16, 5],
      [52, 5],
    ],
  ],
  [
    item(ITEM.daalMash),
    'VERIFIED',
    [
      [45, 120],
      [8, 30, 10],
      [7, 30, 5],
      [37, 25],
      [39, 5],
      [40, 5],
      [52, 4],
      [16, 3],
    ],
  ],
  [
    item(ITEM.daalChana),
    'DRAFT',
    [
      [46, 120],
      [8, 30, 10],
      [7, 30, 5],
      [12, 25],
      [16, 3],
      [52, 4],
    ],
  ],
  [
    item(ITEM.chickenTikka),
    'VERIFIED',
    [
      [30, 250, 10],
      [34, 30],
      [54, 10],
      [43, 10],
      [12, 10],
      [58, 150],
    ],
  ],
  [
    item(ITEM.seekhKabab),
    'VERIFIED',
    [
      [33, 220, 10],
      [8, 30, 10],
      [38, 10],
      [54, 8],
      [58, 150],
    ],
  ],
  [
    item(ITEM.malaiBoti),
    'DRAFT',
    [
      [0, 250, 10],
      [4, 40],
      [34, 30],
      [53, 3],
      [58, 150],
    ],
  ],
  [item(ITEM.roti), 'VERIFIED', [[47, 90]]],
  [
    item(ITEM.naan),
    'VERIFIED',
    [
      [60, 130],
      [36, 5],
    ],
  ],
  [
    item(ITEM.raita),
    'VERIFIED',
    [
      [34, 150],
      [42, 30],
      [52, 2],
    ],
  ],
  [
    item(ITEM.salad),
    'VERIFIED',
    [
      [42, 80],
      [7, 60],
      [8, 50],
      [43, 10],
    ],
  ],
  [
    item(ITEM.chai),
    'VERIFIED',
    [
      [35, 180],
      [55, 6],
      [56, 15],
    ],
  ],
  [
    item(ITEM.coffee),
    'VERIFIED',
    [
      [35, 200],
      [57, 4],
      [56, 15],
    ],
  ],
  [item(ITEM.coldDrink), 'VERIFIED', [[18, 1]]],
  [item(ITEM.water), 'VERIFIED', [[19, 1]]],
  [{ kind: 'ADDON', modifierId: ADDON.makhan }, 'VERIFIED', [[36, 25]]],
];

/** Auto Scale: 1 kg base, sizes by their share (½ kg = 500 thousandths of a kg). White karahis are left for the owner to try. */
const SCALES: [menuItemId: string, sizes: [string, number][]][] = [
  [
    ITEM.chickenKarahi,
    [
      [SIZE.ck1, 1000],
      [SIZE.ckHalf, 500],
      [SIZE.ckPao, 250],
    ],
  ],
  [
    ITEM.muttonKarahi,
    [
      [SIZE.mk1, 1000],
      [SIZE.mkHalf, 500],
      [SIZE.mkPao, 250],
    ],
  ],
  [
    ITEM.fishFry,
    [
      [SIZE.fish1, 1000],
      [SIZE.fishHalf, 500],
    ],
  ],
];

function newRecipe(scope: Scope, recipeId: string, target: RecipeTarget, status: RecipeStatus, recipeLines: RecipeLine[], yieldMilli: number | null, ownerId: string, at: string): Recipe {
  return {
    id: recipeId,
    ...scope,
    target,
    versions: [
      {
        version: 1,
        lines: recipeLines,
        yieldMilli,
        status,
        note: 'DEMO sample recipe',
        savedBy: ownerId,
        savedAt: at,
        verifiedBy: status === 'VERIFIED' ? ownerId : null,
        verifiedAt: status === 'VERIFIED' ? at : null,
        costAtSave: null,
      },
    ],
  };
}

/**
 * Adds what is missing: the sample recipes whose dish has none yet, the Auto Scale setups, and for each set-up size
 * without a recipe the base × its share (with the base's status). Recipes the owner already has are never changed.
 */
function addRecipes(scope: Scope, inventory: Pick<DemoInventory, 'ingredients' | 'recipes' | 'recipeScales'>, ownerId: string, at: string): void {
  const known = new Set(inventory.ingredients.map((i) => i.id));
  const added: Recipe[] = [];
  RECIPES.forEach(([target, status, rows, yieldGrams], n) => {
    if (inventory.recipes.some((r) => sameTarget(r.target, target))) return;
    const recipe = newRecipe(
      scope,
      id(1800 + n),
      target,
      status,
      lines(rows).filter((l) => known.has(l.ingredientId)),
      yieldGrams === undefined ? null : yieldGrams * MILLI,
      ownerId,
      at,
    );
    inventory.recipes.push(recipe);
    added.push(recipe);
  });
  SCALES.forEach(([menuItemId, scaleSizes], n) => {
    if (inventory.recipeScales.some((s) => s.menuItemId === menuItemId)) return;
    const base = inventory.recipes.find((r) => sameTarget(r.target, item(menuItemId)));
    const baseVersion = base ? currentVersion(base) : null;
    inventory.recipeScales.push({
      id: id(1900 + n),
      ...scope,
      menuItemId,
      enabled: true,
      baseQuantityMilli: 1000,
      baseUnit: 'kg',
      sizes: scaleSizes.map(([variantId, quantityMilli]) => ({
        variantId,
        quantityMilli,
        active: true,
        custom: false,
      })),
      updatedBy: ownerId,
      updatedAt: at,
    });
    if (!baseVersion) return;
    scaleSizes.forEach(([variantId, quantityMilli], k) => {
      if (inventory.recipes.some((r) => sameTarget(r.target, item(menuItemId, variantId)))) return;
      const recipe = newRecipe(scope, id(1850 + n * 10 + k), item(menuItemId, variantId), baseVersion.status, scaleLines(baseVersion.lines, quantityMilli, 1000), null, ownerId, at);
      inventory.recipes.push(recipe);
      added.push(recipe);
    });
  });
  // The cost of the day each new version was saved (the naan dough is in the book first, so the naan can use it).
  const book = makeCostBook(inventory.ingredients, inventory.recipes);
  for (const recipe of added) {
    const version = recipe.versions[0]!;
    version.costAtSave = linesCost(book, version.lines).total;
  }
}

function ingredientsAndMovements(scope: Scope, ownerId: string, now: Date, skip: ReadonlySet<string> = new Set()): { ingredients: Ingredient[]; movements: StockMovement[] } {
  const createdAt = now.toISOString();
  const today = businessDate(now, 'Asia/Karachi', '00:00');
  const addDays = (days: number) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const ingredients: Ingredient[] = [];
  const movements: StockMovement[] = [];
  for (const [n, name, code, category, purchaseUnit, stockUnit, packSize, minStock, reorder, rupees, supplier, location, opening, expiresIn] of ROWS) {
    const ingredientId = ING(n);
    if (skip.has(ingredientId)) continue;
    const display = (amount: number) => Math.round(amount * displayFactorMilli({ purchaseUnit, stockUnit }));
    ingredients.push({
      id: ingredientId,
      ...scope,
      kind: 'BOUGHT',
      name,
      code,
      category,
      purchaseUnit,
      stockUnit,
      packSizeMilli: packSize === null ? null : packSize * MILLI,
      minStockMilli: display(minStock),
      reorderQtyMilli: Math.round(reorder * MILLI),
      purchasePrice: rupeesToPaisa(rupees),
      preferredSupplierId: supplier,
      locationId: location,
      batchNo: expiresIn === null ? '' : `B-${String(1101 + n)}`,
      expiryDate: expiresIn === null ? null : addDays(expiresIn),
      isActive: true,
      createdAt,
      updatedAt: createdAt,
    });
    if (opening > 0) {
      movements.push({
        id: id(1400 + n),
        ...scope,
        ingredientId,
        type: 'OPENING',
        quantityMilli: display(opening),
        reason: null,
        note: '',
        createdBy: ownerId,
        createdAt,
      });
    }
  }
  if (!skip.has(NAAN_DOUGH)) ingredients.push(naanDough(scope, createdAt));
  return { ingredients, movements };
}

export function createLalaInventory(scope: Scope, ownerId: string, now = new Date()): DemoInventory {
  const { ingredients, movements } = ingredientsAndMovements(scope, ownerId, now);
  const inventory: DemoInventory = {
    locations: LOCATIONS.map(([name, locationId], sort): StockLocation => ({
      id: locationId,
      ...scope,
      name,
      sort,
    })),
    suppliers: withSupplierProfiles(
      SUPPLIERS.map(([name, phone, supplierId]) => ({ id: supplierId, ...scope, name, phone, isActive: true })),
      ingredients,
    ),
    ingredients,
    movements,
    recipes: [],
    recipeScales: [],
    khata: [],
    expiringSoonDays: DEFAULT_EXPIRING_SOON_DAYS,
  };
  addRecipes(scope, inventory, ownerId, now.toISOString());
  return inventory;
}

// ── Upgrade of saved Aziz Pizza demo data (version 17 → 18) ───────────────────────────────────

const OLD = {
  name: 'Aziz Pizza — DEMO',
  tagline: 'Hot pizza, crispy burgers, delivered to your door.',
  seoTitle: 'Aziz Pizza — Order online',
  seoDescription: 'Hot pizza, crispy burgers, delivered to your door. Order online for delivery or pickup.',
  items: [701, 702, 703, 704, 705, 706, 707].map(id),
  categories: [500, 501, 502, 503].map(id),
  groups: [600, 601].map(id),
  ingredients: [1301, 1302, 1303, 1305, 1306, 1309, 1310, 1311, 1313, 1314, 1315, 1317, 1320, 1321, 1322, 1350].map(id),
  names: {
    [id(200)]: 'Pizza Oven',
    [id(201)]: 'Grill & Fry',
    [id(204)]: 'Chicken Station',
    [id(504)]: 'Drinks',
    [id(505)]: 'Chicken',
    [id(110)]: 'Nadeem (Pizza Chef)',
    [id(111)]: 'Javed (Burger Chef)',
    [id(112)]: 'Akram (Chicken Chef)',
    [id(1202)]: 'Pizza Station',
    [id(1220)]: 'ABC Foods — DEMO',
    [id(1221)]: 'Fresh Sabzi Mandi — DEMO',
    [id(1222)]: 'Lahore Dairy — DEMO',
  } as Record<string, string>,
};

/** A record keeps the owner's own name; a sample name he never changed becomes the Lala Restaurant one. */
const renamed = <T extends { id: string; name: string }>(record: T, freshName: string | undefined): T => (freshName && OLD.names[record.id] === record.name ? { ...record, name: freshName } : record);
const LOCATION_NAMES = new Map(LOCATIONS.map(([name, locationId]) => [locationId, name]));
const SUPPLIER_NAMES = new Map(SUPPLIERS.map(([name, , supplierId]) => [supplierId, name]));

/**
 * The owner's saved demo data becomes Lala Restaurant WITHOUT losing what he made (owner, 2026-11-05: "Haan, rakho"):
 * pizza, burgers, fries, pasta and wings are archived (old bills keep them), their categories, add-ons and ingredients
 * are hidden, the desi menu, stations, ingredients, suppliers and recipes are added, and sample names he never changed
 * get the new names. His own items, ingredients, recipes, orders and settings stay as they are.
 */
export function upgradeToLala(data: DemoData, now = new Date()): DemoData {
  const at = now.toISOString();
  const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
  const menu = lalaMenu(scope.restaurantId, scope.branchId);
  const freshById = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
  const freshStations = freshById(menu.stations);
  const freshCategories = freshById(menu.categories);
  const freshItems = freshById(menu.items);

  const restaurant = data.restaurant.name === OLD.name ? { ...data.restaurant, name: LALA_NAME } : data.restaurant;
  const branch = data.branch.receiptHeader === OLD.name ? { ...data.branch, receiptHeader: LALA_NAME } : data.branch;
  const site = data.onlineWebsite;
  const lalaSite = lalaWebsite(site);
  const onlineWebsite: WebsiteConfig = {
    ...site,
    brand:
      site.brand.tagline === OLD.tagline
        ? {
            ...site.brand,
            logoText: site.brand.logoText === 'AP' ? 'LR' : site.brand.logoText,
            tagline: lalaSite.brand.tagline,
          }
        : site.brand,
    homepage: {
      ...site.homepage,
      popularItemIds: site.homepage.popularItemIds.some((i) => OLD.items.includes(i)) ? lalaSite.homepage.popularItemIds : site.homepage.popularItemIds,
      deals: site.homepage.deals.some((d) => OLD.items.includes(d.itemId)) ? lalaSite.homepage.deals : site.homepage.deals,
    },
    seo: {
      title: site.seo.title === OLD.seoTitle ? lalaSite.seo.title : site.seo.title,
      description: site.seo.description === OLD.seoDescription ? lalaSite.seo.description : site.seo.description,
    },
  };

  const stations = data.stations.map((s) => {
    const fresh = freshStations.get(s.id);
    const next = renamed(s, fresh?.name);
    return fresh && next !== s ? { ...next, sort: fresh.sort } : next;
  });
  for (const fresh of menu.stations) if (!stations.some((s) => s.id === fresh.id)) stations.push(fresh);

  const staff = data.staff.map((s) => renamed(s, menu.chefs[s.id]));

  // Archive the pizza items (never delete: old bills point at them); his own items stay.
  const items = data.items.map((i) => (OLD.items.includes(i.id) && !i.archivedAt ? { ...i, archivedAt: at } : i));
  const karahi = items.findIndex((i) => i.id === ITEM.chickenKarahi);
  if (karahi >= 0 && items[karahi]!.variants.length === 0) {
    // Chicken Karahi was sold per kg: it now has the sizes 1 kg / ½ kg / Pao and is counted per plate ("1 × … (½ kg)").
    const fresh = freshItems.get(ITEM.chickenKarahi)!;
    items[karahi] = {
      ...items[karahi]!,
      unit: fresh.unit,
      variants: fresh.variants,
      modifierGroupIds: fresh.modifierGroupIds,
      description: fresh.description,
      categoryId: fresh.categoryId,
    };
  }
  const tikka = items.findIndex((i) => i.id === ITEM.chickenTikka);
  if (tikka >= 0)
    items[tikka] = {
      ...items[tikka]!,
      categoryId: CATEGORY.bbq,
      stationId: STATION.bbq,
    };
  for (const fresh of menu.items) if (!items.some((i) => i.id === fresh.id)) items.push(fresh);
  const sorted = items.map((i) => (freshItems.has(i.id) ? { ...i, sort: freshItems.get(i.id)!.sort } : i));
  const inUse = (categoryId: string) => sorted.some((i) => !i.archivedAt && i.categoryId === categoryId);

  const categories = data.categories.map((c) => {
    if (OLD.categories.includes(c.id)) return inUse(c.id) ? c : { ...c, isActive: false };
    const fresh = freshCategories.get(c.id);
    const next = renamed(c, fresh?.name);
    return fresh && next !== c ? { ...next, sort: fresh.sort } : next;
  });
  for (const fresh of menu.categories) if (!categories.some((c) => c.id === fresh.id)) categories.push(fresh);

  const groupUsed = (groupId: string) => sorted.some((i) => !i.archivedAt && i.modifierGroupIds.includes(groupId));
  const modifierGroups = data.modifierGroups.filter((g) => !OLD.groups.includes(g.id) || groupUsed(g.id));
  for (const fresh of menu.modifierGroups) if (!modifierGroups.some((g) => g.id === fresh.id)) modifierGroups.push(fresh);

  // Stock: pizza-only ingredients are set Not in use (their history stays); the desi ones are added with their opening stock.
  const old = data.inventory;
  const have = new Set(old.ingredients.map((i) => i.id));
  const added = ingredientsAndMovements(scope, data.staff.find((s) => s.role === 'OWNER')?.id ?? id(101), now, have);
  const inventory: DemoInventory = {
    ...old,
    locations: old.locations.map((l) => renamed(l, LOCATION_NAMES.get(l.id))),
    suppliers: [
      ...old.suppliers.map((s) => renamed(s, SUPPLIER_NAMES.get(s.id))),
      ...SUPPLIERS.filter(([, , supplierId]) => !old.suppliers.some((s) => s.id === supplierId)).map(([name, phone, supplierId]): Supplier => ({
        category: 'OTHER',
        address: '',
        notes: '',
        productIds: [],
        id: supplierId,
        ...scope,
        name,
        phone,
        isActive: true,
      })),
    ],
    ingredients: [...old.ingredients.map((i) => (OLD.ingredients.includes(i.id) ? { ...i, isActive: false } : i)), ...added.ingredients],
    movements: [...old.movements, ...added.movements],
    recipes: [...old.recipes],
    recipeScales: [...(old.recipeScales ?? [])],
    khata: old.khata ?? [],
  };
  // His products come from the ingredients that name him (also the desi ones just added); set values stay.
  inventory.suppliers = withSupplierProfiles(
    inventory.suppliers.map((s) => (old.suppliers.some((o) => o.id === s.id) ? s : { id: s.id, restaurantId: s.restaurantId, branchId: s.branchId, name: s.name, phone: s.phone, isActive: s.isActive })),
    inventory.ingredients,
  );
  addRecipes(scope, inventory, data.staff.find((s) => s.role === 'OWNER')?.id ?? id(101), at);

  return {
    ...data,
    version: 18,
    restaurant,
    branch,
    onlineWebsite,
    stations,
    staff,
    items: sorted,
    categories,
    modifierGroups,
    inventory,
  };
}

// ── Upgrade 19 → 20: each demo supplier's whole range (owner, 2026-11-06) ─────────────────────

/**
 * Lala data only (the Aziz Pizza test data has none of these suppliers): adds the new karyana, sabzi, chicken and doodh
 * products with their opening stock, and puts each on its demo supplier's list. Everything he made or changed stays.
 */
export function addSupplierRanges(data: DemoData, now = new Date()): DemoData {
  const inventory = data.inventory;
  if (!inventory.suppliers.some((s) => s.id === SUPPLIER.kiryana)) return data;
  const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
  const ownerId = data.staff.find((s) => s.role === 'OWNER')?.id ?? id(101);
  const { ingredients, movements } = ingredientsAndMovements(scope, ownerId, now, new Set([...inventory.ingredients.map((i) => i.id), NAAN_DOUGH]));
  const suppliers = inventory.suppliers.map((s) => {
    const more = ingredients.filter((i) => i.preferredSupplierId === s.id && !s.productIds.includes(i.id)).map((i) => i.id);
    return more.length > 0 ? { ...s, productIds: [...s.productIds, ...more] } : s;
  });
  return { ...data, inventory: { ...inventory, suppliers, ingredients: [...inventory.ingredients, ...ingredients], movements: [...inventory.movements, ...movements] } };
}

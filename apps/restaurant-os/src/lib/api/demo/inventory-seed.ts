import {
  DEFAULT_EXPIRING_SOON_DAYS,
  MILLI,
  businessDate,
  displayFactorMilli,
  rupeesToPaisa,
  type Ingredient,
  type IngredientCategory,
  type PurchaseUnit,
  type StockLocation,
  type StockMovement,
  type StockUnit,
  type Supplier,
} from '@restaurant-saas/shared';

/**
 * DEMO stock of "Aziz Pizza — DEMO" (Inventory Step A, owner 2026-11-04): sample ingredients with PKR
 * prices, never real stock or suppliers. Each opening stock is an OPENING movement, so the stock is the
 * sum of movements from the first day. Expiry dates count from the day the demo data is made, so the
 * dashboard always has something expiring soon.
 */
export interface DemoInventory {
  locations: StockLocation[];
  suppliers: Supplier[];
  ingredients: Ingredient[];
  movements: StockMovement[];
  expiringSoonDays: number;
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const LOCATION = { mainStore: id(1200), kitchen: id(1201), pizza: id(1202), freezer: id(1203), fridge: id(1204), dry: id(1205), drinks: id(1206) };
const SUPPLIER = { abc: id(1220), sabzi: id(1221), dairy: id(1222), packaging: id(1223), drinks: id(1224) };

type Row = [
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

const ROWS: Row[] = [
  ['Chicken (boneless)', 'CHK-001', 'MEAT', 'kg', 'g', null, 3, 10, 650, SUPPLIER.abc, LOCATION.freezer, 10, 5],
  ['Beef mince', 'BFM-001', 'MEAT', 'kg', 'g', null, 2, 5, 1100, SUPPLIER.abc, LOCATION.freezer, 6, 4],
  ['Mozzarella cheese', 'MZR-001', 'DAIRY', 'kg', 'g', null, 2, 5, 1850, SUPPLIER.dairy, LOCATION.fridge, 4, 2],
  ['Cheese slices', 'CHS-001', 'DAIRY', 'pack', 'piece', 100, 40, 2, 2200, SUPPLIER.dairy, LOCATION.fridge, 160, 10],
  ['Fresh cream', 'FRC-001', 'DAIRY', 'l', 'ml', null, 1, 4, 900, SUPPLIER.dairy, LOCATION.fridge, 2, -1],
  ['Pizza flour (25 kg bag)', 'PZF-001', 'BAKERY', 'pack', 'g', 25_000, 10, 2, 3100, null, LOCATION.dry, 40, 60],
  ['Burger buns', 'BRB-001', 'BAKERY', 'pack', 'piece', 12, 24, 5, 360, null, LOCATION.dry, 48, 1],
  ['Tomatoes', 'TMT-001', 'VEGETABLES', 'kg', 'g', null, 2, 5, 180, SUPPLIER.sabzi, LOCATION.fridge, 5, 6],
  ['Onions', 'ONN-001', 'VEGETABLES', 'kg', 'g', null, 3, 10, 140, SUPPLIER.sabzi, LOCATION.dry, 8, null],
  ['Lettuce', 'LTC-001', 'VEGETABLES', 'kg', 'g', null, 1, 2, 400, SUPPLIER.sabzi, LOCATION.fridge, 0.8, 3],
  ['Capsicum', 'CPS-001', 'VEGETABLES', 'kg', 'g', null, 1, 3, 300, SUPPLIER.sabzi, LOCATION.fridge, 2.5, 5],
  ['Jalapeños', 'JLP-001', 'VEGETABLES', 'kg', 'g', null, 0.5, 1, 1200, SUPPLIER.sabzi, LOCATION.fridge, 0, null],
  ['Cooking oil', 'CKO-001', 'OIL', 'l', 'ml', null, 5, 20, 580, null, LOCATION.mainStore, 18, null],
  ['Ketchup (1 kg bottle)', 'KTC-001', 'SAUCES_SPICES', 'bottle', 'g', 1000, 2, 6, 450, null, LOCATION.mainStore, 5, 90],
  ['Mayonnaise (1 kg bottle)', 'MYN-001', 'SAUCES_SPICES', 'bottle', 'g', 1000, 2, 6, 650, null, LOCATION.mainStore, 1.5, 45],
  ['Pizza sauce', 'PZS-001', 'SAUCES_SPICES', 'kg', 'g', null, 2, 5, 700, null, LOCATION.pizza, 3, 7],
  ['Red chilli powder (500 g pack)', 'RCP-001', 'SAUCES_SPICES', 'pack', 'g', 500, 0.5, 2, 450, null, LOCATION.dry, 1.2, null],
  ['Basmati rice', 'BSM-001', 'GRAINS', 'kg', 'g', null, 5, 10, 380, null, LOCATION.dry, 15, null],
  ['Cold drink 345 ml', 'CLD-001', 'BEVERAGES', 'carton', 'bottle', 24, 24, 3, 2400, SUPPLIER.drinks, LOCATION.drinks, 60, 120],
  ['Mineral water 500 ml', 'MNW-001', 'BEVERAGES', 'carton', 'bottle', 12, 12, 4, 600, SUPPLIER.drinks, LOCATION.drinks, 36, null],
  ['French fries (2.5 kg pack)', 'FRF-001', 'FROZEN', 'pack', 'g', 2500, 5, 4, 1250, null, LOCATION.freezer, 10, 30],
  ['Pizza boxes (medium)', 'PZB-001', 'PACKAGING', 'pack', 'piece', 50, 50, 4, 1750, SUPPLIER.packaging, LOCATION.mainStore, 120, null],
  ['Burger boxes', 'BRX-001', 'PACKAGING', 'pack', 'piece', 100, 50, 2, 1500, SUPPLIER.packaging, LOCATION.mainStore, 80, null],
  ['Paper carry bags', 'PCB-001', 'PACKAGING', 'pack', 'piece', 100, 100, 3, 900, SUPPLIER.packaging, LOCATION.mainStore, 90, null],
  ['Dish wash liquid', 'DWL-001', 'CLEANING', 'l', 'ml', null, 2, 5, 450, null, LOCATION.mainStore, 4, null],
];

const LOCATIONS = [
  ['Main Store', LOCATION.mainStore],
  ['Main Kitchen', LOCATION.kitchen],
  ['Pizza Station', LOCATION.pizza],
  ['Freezer', LOCATION.freezer],
  ['Refrigerator', LOCATION.fridge],
  ['Dry Store', LOCATION.dry],
  ['Drinks Counter', LOCATION.drinks],
] as const;

const SUPPLIERS = [
  ['ABC Foods — DEMO', '0300-1110001', SUPPLIER.abc],
  ['Fresh Sabzi Mandi — DEMO', '0300-1110002', SUPPLIER.sabzi],
  ['Lahore Dairy — DEMO', '0300-1110003', SUPPLIER.dairy],
  ['City Packaging — DEMO', '0300-1110004', SUPPLIER.packaging],
  ['Pak Beverages — DEMO', '0300-1110005', SUPPLIER.drinks],
] as const;

export function createInventorySeed(scope: { restaurantId: string; branchId: string }, ownerId: string, now = new Date()): DemoInventory {
  const createdAt = now.toISOString();
  const today = businessDate(now, 'Asia/Karachi', '00:00');
  const addDays = (days: number) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const locations: StockLocation[] = LOCATIONS.map(([name, locationId], sort) => ({ id: locationId, ...scope, name, sort }));
  const suppliers: Supplier[] = SUPPLIERS.map(([name, phone, supplierId]) => ({ id: supplierId, ...scope, name, phone, isActive: true }));

  const ingredients: Ingredient[] = [];
  const movements: StockMovement[] = [];
  ROWS.forEach(([name, code, category, purchaseUnit, stockUnit, packSize, minStock, reorder, rupees, supplier, location, opening, expiresIn], n) => {
    const display = (amount: number) => Math.round(amount * displayFactorMilli({ purchaseUnit, stockUnit }));
    const ingredientId = id(1300 + n);
    ingredients.push({
      id: ingredientId,
      ...scope,
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
  });
  return { locations, suppliers, ingredients, movements, expiringSoonDays: DEFAULT_EXPIRING_SOON_DAYS };
}

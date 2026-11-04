import { MILLI, linesCost, makeCostBook, type Ingredient, type Recipe, type RecipeLine, type RecipeStatus, type RecipeTarget } from '@restaurant-saas/shared';

/**
 * DEMO recipes of "Aziz Pizza — DEMO" (Inventory Step B, owner 2026-11-04): sample quantities only, to show how
 * sizes, add-ons, losses and a prepared item (pizza dough) work. Wings and Alfredo Pasta have no recipe yet, and
 * some recipes are drafts, so every state is visible. The owner replaces them with his kitchen's real recipes.
 */
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ING = {
  chicken: id(1300),
  beef: id(1301),
  mozzarella: id(1302),
  cheeseSlices: id(1303),
  flour: id(1305),
  buns: id(1306),
  tomatoes: id(1307),
  onions: id(1308),
  lettuce: id(1309),
  capsicum: id(1310),
  jalapenos: id(1311),
  oil: id(1312),
  ketchup: id(1313),
  mayo: id(1314),
  pizzaSauce: id(1315),
  chilli: id(1316),
  coldDrink: id(1318),
  water: id(1319),
  fries: id(1320),
  dough: id(1350),
};
const ITEM = { classic: id(701), fajita: id(702), zinger: id(703), beefBurger: id(704), fries: id(705), coldDrink: id(708), water: id(709), karahi: id(710), tikka: id(711) };
const SIZE = { classicS: id(801), classicM: id(802), classicL: id(803), fajitaS: id(804), fajitaM: id(805), fajitaL: id(806) };
const ADDON = { extraCheese: id(650), jalapenos: id(651), cheeseSlice: id(660), extraPatty: id(661) };

/** [ingredient, quantity in its recipe unit (g, ml, piece, bottle), loss %] */
type L = [string, number, number?];
const lines = (rows: L[]): RecipeLine[] =>
  rows.map(([ingredientId, quantity, lossPercent = 0]) => ({ ingredientId, quantityMilli: Math.round(quantity * MILLI), lossBps: lossPercent * 100, optional: false, substituteId: null }));

const RECIPES: [RecipeTarget, RecipeStatus, L[], number?][] = [
  [{ kind: 'PREPARED', ingredientId: ING.dough }, 'VERIFIED', [[ING.flour, 1000], [ING.oil, 50]], 1600],
  [{ kind: 'ITEM', menuItemId: ITEM.classic, variantId: SIZE.classicS }, 'VERIFIED', [[ING.dough, 180], [ING.pizzaSauce, 60], [ING.mozzarella, 70]]],
  [{ kind: 'ITEM', menuItemId: ITEM.classic, variantId: SIZE.classicM }, 'VERIFIED', [[ING.dough, 250], [ING.pizzaSauce, 80], [ING.mozzarella, 110]]],
  [{ kind: 'ITEM', menuItemId: ITEM.classic, variantId: SIZE.classicL }, 'VERIFIED', [[ING.dough, 350], [ING.pizzaSauce, 110], [ING.mozzarella, 160]]],
  [{ kind: 'ITEM', menuItemId: ITEM.fajita, variantId: SIZE.fajitaS }, 'VERIFIED', [[ING.dough, 180], [ING.pizzaSauce, 50], [ING.mozzarella, 60], [ING.chicken, 70, 5], [ING.capsicum, 25, 10], [ING.onions, 20, 10]]],
  [{ kind: 'ITEM', menuItemId: ITEM.fajita, variantId: SIZE.fajitaM }, 'VERIFIED', [[ING.dough, 250], [ING.pizzaSauce, 70], [ING.mozzarella, 90], [ING.chicken, 100, 5], [ING.capsicum, 35, 10], [ING.onions, 30, 10]]],
  [{ kind: 'ITEM', menuItemId: ITEM.fajita, variantId: SIZE.fajitaL }, 'DRAFT', [[ING.dough, 350], [ING.pizzaSauce, 100], [ING.mozzarella, 130], [ING.chicken, 140, 5], [ING.capsicum, 50, 10], [ING.onions, 40, 10]]],
  [{ kind: 'ITEM', menuItemId: ITEM.zinger, variantId: null }, 'VERIFIED', [[ING.chicken, 150, 10], [ING.buns, 1], [ING.lettuce, 20, 10], [ING.mayo, 30], [ING.oil, 30]]],
  [{ kind: 'ITEM', menuItemId: ITEM.beefBurger, variantId: null }, 'DRAFT', [[ING.beef, 150, 15], [ING.buns, 1], [ING.cheeseSlices, 1], [ING.ketchup, 20], [ING.onions, 15, 10], [ING.lettuce, 15, 10]]],
  [{ kind: 'ITEM', menuItemId: ITEM.karahi, variantId: null }, 'VERIFIED', [[ING.chicken, 1000], [ING.tomatoes, 400, 5], [ING.onions, 150, 10], [ING.oil, 120], [ING.chilli, 20]]],
  [{ kind: 'ITEM', menuItemId: ITEM.tikka, variantId: null }, 'VERIFIED', [[ING.chicken, 200, 10], [ING.chilli, 5], [ING.oil, 10]]],
  [{ kind: 'ITEM', menuItemId: ITEM.fries, variantId: null }, 'DRAFT', [[ING.fries, 250], [ING.mozzarella, 40], [ING.mayo, 30], [ING.ketchup, 20], [ING.jalapenos, 10]]],
  [{ kind: 'ITEM', menuItemId: ITEM.coldDrink, variantId: null }, 'VERIFIED', [[ING.coldDrink, 1]]],
  [{ kind: 'ITEM', menuItemId: ITEM.water, variantId: null }, 'VERIFIED', [[ING.water, 1]]],
  [{ kind: 'ADDON', modifierId: ADDON.extraCheese }, 'VERIFIED', [[ING.mozzarella, 40]]],
  [{ kind: 'ADDON', modifierId: ADDON.jalapenos }, 'VERIFIED', [[ING.jalapenos, 20]]],
  [{ kind: 'ADDON', modifierId: ADDON.cheeseSlice }, 'VERIFIED', [[ING.cheeseSlices, 1]]],
  [{ kind: 'ADDON', modifierId: ADDON.extraPatty }, 'DRAFT', [[ING.beef, 120, 15]]],
];

/** The prepared pizza dough (a sub-recipe) and the sample recipes. Lines whose ingredient is missing are left out. */
export function createRecipeSeed(
  scope: { restaurantId: string; branchId: string },
  ownerId: string,
  ingredients: readonly Ingredient[],
  now = new Date(),
): { dough: Ingredient; recipes: Recipe[] } {
  const savedAt = now.toISOString();
  const dough: Ingredient = {
    id: ING.dough,
    ...scope,
    kind: 'PREPARED',
    name: 'Pizza dough',
    code: 'PZD-001',
    category: 'BAKERY',
    purchaseUnit: 'kg',
    stockUnit: 'g',
    packSizeMilli: null,
    minStockMilli: 0,
    reorderQtyMilli: 0,
    purchasePrice: 0,
    preferredSupplierId: null,
    locationId: id(1202),
    batchNo: '',
    expiryDate: null,
    isActive: true,
    createdAt: savedAt,
    updatedAt: savedAt,
  };
  const all = [...ingredients.filter((i) => i.id !== dough.id), dough];
  const known = new Set(all.map((i) => i.id));
  const recipes: Recipe[] = RECIPES.map(([target, status, rows, yieldGrams], n) => ({
    id: id(1500 + n),
    ...scope,
    target,
    versions: [
      {
        version: 1,
        lines: lines(rows).filter((l) => known.has(l.ingredientId)),
        yieldMilli: yieldGrams === undefined ? null : yieldGrams * MILLI,
        status,
        note: 'DEMO sample recipe',
        savedBy: ownerId,
        savedAt,
        verifiedBy: status === 'VERIFIED' ? ownerId : null,
        verifiedAt: status === 'VERIFIED' ? savedAt : null,
        costAtSave: null,
      },
    ],
  }));
  // The cost of the day each version was saved (the dough first, so the pizzas can use it).
  const book = makeCostBook(all, recipes);
  for (const recipe of recipes) {
    const version = recipe.versions[0]!;
    version.costAtSave = linesCost(book, version.lines).total;
  }
  return { dough, recipes };
}

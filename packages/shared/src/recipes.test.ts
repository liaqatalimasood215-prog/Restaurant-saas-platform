import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkRecipe,
  checkRecipeScale,
  convertScaleQuantity,
  currentVersion,
  guessSizeQuantity,
  scaleCost,
  scaleLines,
  scaleShareBps,
  foodCostLevel,
  foodCostOf,
  formatBps,
  fromStockMilli,
  isPackageUnit,
  recipeUnitFactor,
  recipeUnitsFor,
  toStockMilli,
  grossQuantity,
  ingredientCost,
  linesCost,
  makeCostBook,
  priceWithoutTax,
  sameRecipe,
  summarizeFoodCost,
  verifiedVersion,
  type CostIngredient,
  type RecipeLine,
  type RecipeVersion,
} from './index';

const g = (grams: number) => grams * 1000; // stock-unit thousandths
const bought = (id: string, purchaseUnit: CostIngredient['purchaseUnit'], stockUnit: CostIngredient['stockUnit'], rupees: number, packSize: number | null = null): CostIngredient => ({
  id,
  kind: 'BOUGHT',
  purchaseUnit,
  stockUnit,
  packSizeMilli: packSize === null ? null : packSize * 1000,
  purchasePrice: rupees * 100,
});
const line = (ingredientId: string, quantityMilli: number, lossBps = 0): RecipeLine => ({ ingredientId, quantityMilli, lossBps, optional: false, substituteId: null });

const INGREDIENTS: CostIngredient[] = [
  bought('chicken', 'kg', 'g', 650),
  bought('bun', 'pack', 'piece', 360, 12),
  bought('cheese', 'pack', 'piece', 2200, 100),
  bought('mayo', 'bottle', 'g', 650, 1000),
  bought('lettuce', 'kg', 'g', 400),
  bought('flour', 'pack', 'g', 3100, 25_000),
  bought('oil', 'l', 'ml', 580),
  { id: 'dough', kind: 'PREPARED', purchaseUnit: 'kg', stockUnit: 'g', packSizeMilli: null, purchasePrice: 0 },
];
const version = (lines: RecipeLine[], yieldMilli: number | null = null): RecipeVersion => ({
  version: 1,
  lines,
  yieldMilli,
  status: 'VERIFIED',
  note: '',
  savedBy: 'owner',
  savedAt: '2026-11-04T10:00:00.000Z',
  verifiedBy: 'owner',
  verifiedAt: '2026-11-04T10:00:00.000Z',
  costAtSave: null,
});
const DOUGH = { target: { kind: 'PREPARED' as const, ingredientId: 'dough' }, versions: [version([line('flour', g(1000)), line('oil', g(50))], g(1600))] };
const book = makeCostBook(INGREDIENTS, [DOUGH]);
const NO_TAX = { rateBps: 0, pricesIncludeTax: false };

test("the owner's Chicken Burger: 150 g chicken, 1 bun, 1 cheese slice, 30 g sauce, 20 g lettuce", () => {
  const burger = [line('chicken', g(150)), line('bun', g(1)), line('cheese', g(1)), line('mayo', g(30)), line('lettuce', g(20))];
  const cost = linesCost(book, burger);
  // Rs. 97.50 + Rs. 30 + Rs. 22 + Rs. 19.50 + Rs. 8 = Rs. 177
  assert.deepEqual(
    cost.lines.map((l) => l.cost),
    [9750, 3000, 2200, 1950, 800],
  );
  assert.equal(cost.total, 17_700);
  const food = foodCostOf(cost.total, 45_000, NO_TAX);
  assert.equal(food.foodCostBps, 3933, 'Rs. 177 ÷ Rs. 450 = 39.33 %');
  assert.equal(food.profit, 27_300, 'gross profit estimate Rs. 273');
  assert.equal(food.marginBps, 6067);
  assert.equal(food.level, 'WATCH');
  assert.equal(formatBps(3933), '39.3 %');
});

test('loss: 150 g chicken with 10 % trimming loss needs 166.667 g raw', () => {
  assert.equal(grossQuantity(g(150), 1000), 166_667);
  assert.equal(ingredientCost(book, 'chicken', grossQuantity(g(150), 1000)), 10_833, 'Rs. 108.33');
  assert.equal(grossQuantity(g(150), 0), g(150));
});

test('sizes use different amounts: a Large pizza costs more than a Small one', () => {
  const small = linesCost(book, [line('dough', g(180))]).total;
  const large = linesCost(book, [line('dough', g(350))]).total;
  assert.ok(small !== null && large !== null && large > small);
});

test('a prepared item is costed from its batch: 1,000 g flour + 50 ml oil make 1,600 g dough', () => {
  // flour Rs. 3,100 / 25 kg → 1 kg = Rs. 124; oil 50 ml = Rs. 29; batch Rs. 153 for 1.6 kg → Rs. 95.63 / kg
  assert.equal(linesCost(book, DOUGH.versions[0]!.lines).total, 15_300);
  assert.equal(ingredientCost(book, 'dough', g(1000)), 9563);
  assert.equal(ingredientCost(book, 'dough', g(250)), 2391, '250 g dough in a Medium pizza');
  // Without its batch recipe the cost is unknown, never guessed.
  assert.equal(ingredientCost(makeCostBook(INGREDIENTS, []), 'dough', g(250)), null);
  assert.equal(linesCost(makeCostBook(INGREDIENTS, []), [line('dough', g(250)), line('oil', g(10))]).total, null);
});

test('food cost % is taken on the price without the tax inside it', () => {
  assert.equal(priceWithoutTax(116_000, { rateBps: 1600, pricesIncludeTax: true }), 100_000);
  assert.equal(priceWithoutTax(116_000, { rateBps: 1600, pricesIncludeTax: false }), 116_000);
  assert.equal(foodCostOf(30_000, 116_000, { rateBps: 1600, pricesIncludeTax: true }).foodCostBps, 3000);
  assert.equal(foodCostOf(null, 45_000, NO_TAX).foodCostBps, null);
  assert.equal(foodCostOf(10_000, 0, NO_TAX).foodCostBps, null, 'a free item has no food cost %');
  assert.deepEqual([foodCostLevel(3500), foodCostLevel(3501), foodCostLevel(4500), foodCostLevel(4501)], ['GOOD', 'WATCH', 'WATCH', 'HIGH']);
});

test('a recipe needs ingredients in use, each once, real quantities, losses up to 90 %, and a matching substitute', () => {
  const ingredients = [...INGREDIENTS.map((i) => ({ id: i.id, isActive: true, stockUnit: i.stockUnit, purchaseUnit: i.purchaseUnit, packSizeMilli: i.packSizeMilli })), { id: 'old', isActive: false, stockUnit: 'g' as const, purchaseUnit: 'kg' as const, packSizeMilli: null }];
  const item = { kind: 'ITEM' as const, menuItemId: 'burger', variantId: null };
  const check = (lines: RecipeLine[]) => checkRecipe({ target: item, lines, yieldMilli: null, note: '' }, ingredients, book);
  assert.equal(check([line('chicken', g(150))]), null);
  assert.deepEqual(check([]), { line: null, problem: 'NO_LINES' });
  assert.deepEqual(check([line('', g(1))]), { line: 0, problem: 'INGREDIENT_REQUIRED' });
  assert.deepEqual(check([line('old', g(1))]), { line: 0, problem: 'INGREDIENT_NOT_IN_USE' });
  assert.deepEqual(check([line('chicken', g(150)), line('chicken', g(20))]), { line: 1, problem: 'DUPLICATE_INGREDIENT' });
  assert.deepEqual(check([line('chicken', 0)]), { line: 0, problem: 'QUANTITY_INVALID' });
  assert.deepEqual(check([line('chicken', g(150), 9500)]), { line: 0, problem: 'LOSS_INVALID' });
  assert.deepEqual(check([{ ...line('chicken', g(150)), substituteId: 'bun' }]), { line: 0, problem: 'SUBSTITUTE_INVALID' }, 'grams cannot be replaced by pieces');
  assert.equal(check([{ ...line('chicken', g(150)), substituteId: 'lettuce' }]), null);
});

test('a prepared item needs its batch size and may never use itself, also not through another prepared item', () => {
  const ingredients = INGREDIENTS.map((i) => ({ id: i.id, isActive: true, stockUnit: i.stockUnit, purchaseUnit: i.purchaseUnit, packSizeMilli: i.packSizeMilli }));
  const dough = { kind: 'PREPARED' as const, ingredientId: 'dough' };
  assert.deepEqual(checkRecipe({ target: dough, lines: [line('flour', g(1000))], yieldMilli: null, note: '' }, ingredients, book), { line: null, problem: 'YIELD_INVALID' });
  assert.deepEqual(checkRecipe({ target: dough, lines: [line('dough', g(100))], yieldMilli: g(1000), note: '' }, ingredients, book), { line: 0, problem: 'USES_ITSELF' });
  // base → dough → base
  const withBase = [...INGREDIENTS, { id: 'base', kind: 'PREPARED' as const, purchaseUnit: 'kg' as const, stockUnit: 'g' as const, packSizeMilli: null, purchasePrice: 0 }];
  const loop = makeCostBook(withBase, [DOUGH, { target: { kind: 'PREPARED', ingredientId: 'base' }, versions: [version([line('dough', g(500))], g(500))] }]);
  assert.deepEqual(
    checkRecipe({ target: dough, lines: [line('base', g(100))], yieldMilli: g(1000), note: '' }, [...ingredients, { id: 'base', isActive: true, stockUnit: 'g' as const, purchaseUnit: 'kg' as const, packSizeMilli: null }], loop),
    { line: 0, problem: 'USES_ITSELF' },
  );
});

test('versions: the current one is the last; the verified one is the newest verified', () => {
  const v1 = { ...version([line('chicken', g(150))]), version: 1 };
  const v2 = { ...version([line('chicken', g(160))]), version: 2, status: 'DRAFT' as const };
  assert.equal(currentVersion({ versions: [v1, v2] })?.version, 2);
  assert.equal(verifiedVersion({ versions: [v1, v2] })?.version, 1, 'the kitchen keeps the verified recipe until the new one is verified');
  assert.equal(verifiedVersion({ versions: [v2] }), null);
  assert.equal(sameRecipe(v1, { lines: [line('chicken', g(150))], yieldMilli: null }), true);
  assert.equal(sameRecipe(v1, v2), false);
});

test('food cost summary: items with a recipe, verified, simple average, high', () => {
  const recipe = (status: 'DRAFT' | 'VERIFIED') => ({ id: 'r', restaurantId: 'x', branchId: 'y', target: { kind: 'ITEM' as const, menuItemId: 'm', variantId: null }, versions: [{ ...version([]), status }] });
  const costing = (bps: number | null) => ({ ...foodCostOf(null, 0, NO_TAX), foodCostBps: bps, level: bps === null ? null : foodCostLevel(bps) });
  const summary = summarizeFoodCost([
    { menuItemId: 'pizza', recipe: recipe('VERIFIED'), costing: costing(2000) },
    { menuItemId: 'pizza', recipe: recipe('DRAFT'), costing: costing(3000) },
    { menuItemId: 'burger', recipe: recipe('VERIFIED'), costing: costing(5000) },
    { menuItemId: 'pasta', recipe: null, costing: costing(null) },
  ]);
  assert.deepEqual(summary, { itemsWithRecipe: 2, items: 3, verified: 2, recipes: 3, averageBps: 3333, high: 1 });
});

test('recipe line units: kg / g / mg, L / ml, pcs / dozen, and packages with their size', () => {
  const chicken = { stockUnit: 'g' as const, purchaseUnit: 'kg' as const, packSizeMilli: null };
  const oil = { stockUnit: 'ml' as const, purchaseUnit: 'l' as const, packSizeMilli: null };
  const buns = { stockUnit: 'piece' as const, purchaseUnit: 'pack' as const, packSizeMilli: 12_000 };
  const flour = { stockUnit: 'g' as const, purchaseUnit: 'pack' as const, packSizeMilli: 25_000_000 };
  assert.deepEqual(recipeUnitsFor('g'), ['kg', 'g', 'mg', 'pack', 'bag', 'box', 'tray', 'bottle']);
  assert.deepEqual(recipeUnitsFor('ml'), ['l', 'ml', 'pack', 'bag', 'box', 'tray', 'bottle']);
  assert.deepEqual(recipeUnitsFor('piece'), ['piece', 'dozen', 'pack', 'bag', 'box', 'tray', 'bottle']);
  // 1 kg = 1000 g, 500 g = 0.5 kg, 1 L = 1000 ml, 500 ml = 0.5 L, 1 dozen = 12 pcs
  assert.equal(toStockMilli(1000, recipeUnitFactor('kg', chicken)!), 1_000_000);
  assert.equal(fromStockMilli(500_000, recipeUnitFactor('kg', chicken)!), 500, '500 g = 0.5 kg');
  assert.equal(toStockMilli(500_000, recipeUnitFactor('mg', chicken)!), 500, '500 mg = 0.5 g');
  assert.equal(toStockMilli(1000, recipeUnitFactor('l', oil)!), 1_000_000);
  assert.equal(fromStockMilli(500_000, recipeUnitFactor('l', oil)!), 500, '500 ml = 0.5 L');
  assert.equal(toStockMilli(1000, recipeUnitFactor('dozen', buns)!), 12_000, '1 dozen = 12 pcs');
  // packages: the ingredient's own pack size, or one set on the line
  assert.equal(recipeUnitFactor('pack', buns), 12_000);
  assert.equal(recipeUnitFactor('pack', flour), 25_000_000);
  assert.equal(recipeUnitFactor('bag', flour), null, 'a bag needs its size');
  assert.equal(recipeUnitFactor('bag', flour, 50_000_000), 50_000_000);
  assert.equal(recipeUnitFactor('l', chicken), null, 'weight is never typed in litres');
  assert.equal(isPackageUnit('bottle', 'g'), true);
  assert.equal(isPackageUnit('bottle', 'bottle'), false);
});

test('a line with a unit must fit the ingredient and a package needs its size', () => {
  const ingredients = INGREDIENTS.map((i) => ({ id: i.id, isActive: true, stockUnit: i.stockUnit, purchaseUnit: i.purchaseUnit, packSizeMilli: i.packSizeMilli }));
  const item = { kind: 'ITEM' as const, menuItemId: 'karahi', variantId: null };
  const check = (l: RecipeLine) => checkRecipe({ target: item, lines: [l], yieldMilli: null, note: '' }, ingredients, book);
  assert.equal(check({ ...line('chicken', g(750)), unit: 'kg' }), null);
  assert.deepEqual(check({ ...line('chicken', g(750)), unit: 'ml' }), { line: 0, problem: 'UNIT_INVALID' });
  assert.deepEqual(check({ ...line('chicken', g(750)), unit: 'bag' }), { line: 0, problem: 'UNIT_SIZE_REQUIRED' });
  assert.equal(check({ ...line('chicken', g(750)), unit: 'bag', unitSizeMilli: g(5000) }), null);
  assert.equal(check(line('chicken', g(750))), null, 'old lines without a unit stay valid');
});

// ── Auto Scale (Recipe Builder R2): the numbers of the owner's picture ──────────────────────────

test('Auto Scale: ½ kg uses half of every base line, the loss stays the same', () => {
  const base = [line('chicken', g(750)), line('tomato', g(200), 500), line('onion', g(150)), line('oil', g(50))];
  const half = scaleLines(base, 500, 1000);
  assert.deepEqual(half.map((l) => l.quantityMilli), [g(375), g(100), g(75), g(25)]);
  assert.equal(half[1]!.lossBps, 500, 'loss % is not scaled (never counted twice)');
  assert.deepEqual(scaleLines(base, 125, 1000).map((l) => l.quantityMilli), [g(93.75), g(25), g(18.75), g(6.25)]);
  assert.deepEqual(scaleLines(base, 2000, 1000).map((l) => l.quantityMilli), [g(1500), g(400), g(300), g(100)], 'a bigger size grows');
  assert.equal(scaleLines([line('salt', 1)], 125, 1000)[0]!.quantityMilli, 1, 'a quantity never becomes zero');
});

test('Auto Scale: cost, food cost and profit of every size (picture: 1 kg Rs. 1,505)', () => {
  const tax = { rateBps: 0, pricesIncludeTax: false };
  const baseCost = 150_500;
  const sizes: [number, number, number, string, number][] = [
    // size (thousandths of a kg), price, scaled cost, food cost, profit (paisa)
    [1000, 280_000, 150_500, '53.8 %', 129_500],
    [500, 150_000, 75_250, '50.2 %', 74_750],
    [250, 80_000, 37_625, '47 %', 42_375],
    // 188.125 rounds to Rs. 188.13; cost + profit stay the full price (the picture rounds the profit on its own: 261.88)
    [125, 45_000, 18_813, '41.8 %', 26_187],
  ];
  for (const [size, price, cost, foodCost, profit] of sizes) {
    const scaled = scaleCost(baseCost, size, 1000);
    assert.equal(scaled, cost);
    const costing = foodCostOf(scaled, price, tax);
    assert.equal(formatBps(costing.foodCostBps!), foodCost);
    assert.equal(costing.profit, profit);
    assert.equal(costing.profit! + scaled!, price);
  }
  assert.equal(scaleShareBps(125, 1000), 1250, '⅛ kg = 12.5 %');
  assert.equal(scaleCost(null, 500, 1000), null);
  assert.equal(foodCostOf(75_250, 0, tax).foodCostBps, null, 'no selling price: no food cost %');
});

test('Auto Scale: a size name tells its quantity; units convert only inside their family', () => {
  assert.equal(guessSizeQuantity('1 kg', 'kg'), 1000);
  assert.equal(guessSizeQuantity('½ kg', 'kg'), 500);
  assert.equal(guessSizeQuantity('¼ kg (Pao)', 'kg'), 250);
  assert.equal(guessSizeQuantity('Pao', 'kg'), 250);
  assert.equal(guessSizeQuantity('Half Pao', 'kg'), 125);
  assert.equal(guessSizeQuantity('1½ kg', 'kg'), 1500);
  assert.equal(guessSizeQuantity('250 g', 'kg'), 250);
  assert.equal(guessSizeQuantity('½ kg', 'g'), 500_000);
  assert.equal(guessSizeQuantity('1.5 litre', 'ml'), 1_500_000);
  assert.equal(guessSizeQuantity('Medium', 'piece'), null);
  assert.equal(guessSizeQuantity('½ kg', 'piece'), null, 'a weight never becomes pieces');
  assert.equal(convertScaleQuantity(500, 'kg', 'g'), 500_000);
  assert.equal(convertScaleQuantity(1000, 'l', 'kg'), null);
});

test('Auto Scale: the base needs a quantity and at least one ticked size', () => {
  const size = (variantId: string, quantityMilli: number, active = true) => ({ variantId, quantityMilli, active, custom: false });
  const ok = { baseQuantityMilli: 1000, baseUnit: 'kg' as const, sizes: [size('1kg', 1000), size('half', 500), size('pao', 250)] };
  assert.equal(checkRecipeScale(ok), null);
  assert.deepEqual(checkRecipeScale({ ...ok, baseQuantityMilli: 0 }), { size: null, problem: 'BASE_QUANTITY_INVALID' });
  assert.deepEqual(checkRecipeScale({ ...ok, sizes: ok.sizes.map((s) => ({ ...s, active: false })) }), { size: null, problem: 'NO_SIZES' });
  assert.deepEqual(checkRecipeScale({ ...ok, sizes: [...ok.sizes, size('pao', 125)] }), { size: 3, problem: 'SIZE_DUPLICATE' });
  assert.deepEqual(checkRecipeScale({ ...ok, sizes: [size('big', 200_000)] }), { size: 0, problem: 'SIZE_QUANTITY_INVALID' });
});

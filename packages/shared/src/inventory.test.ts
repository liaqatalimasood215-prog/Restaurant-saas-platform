import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  balancesAfter,
  checkAdjustment,
  checkIngredient,
  displayFactorMilli,
  displayUnitOf,
  expiryState,
  formatMilli,
  milliToInput,
  mulDivRound,
  onHandOf,
  parseQuantity,
  periodRange,
  purchaseConversion,
  stockStatus,
  stockValueOf,
  suggestIngredientCode,
  summarizeInventory,
  type IngredientCheckInput,
} from './index';

const KG = 1_000_000; // stock-unit thousandths in one kilogram (grams × 1,000)

test('1 kg = 1,000 g and 1 l = 1,000 ml are fixed; weight never turns into pieces or millilitres', () => {
  assert.deepEqual(purchaseConversion('kg', 'g', null), { ok: true, factorMilli: KG, fixed: true });
  assert.deepEqual(purchaseConversion('l', 'ml', null), { ok: true, factorMilli: KG, fixed: true });
  assert.deepEqual(purchaseConversion('piece', 'piece', null), { ok: true, factorMilli: 1000, fixed: true });
  assert.deepEqual(purchaseConversion('kg', 'ml', null), { ok: false, problem: 'INCOMPATIBLE' });
  assert.deepEqual(purchaseConversion('kg', 'piece', 5000), { ok: false, problem: 'INCOMPATIBLE' });
  assert.deepEqual(purchaseConversion('l', 'g', null), { ok: false, problem: 'INCOMPATIBLE' });
});

test('packages need their size: 1 carton = 24 bottles, 1 bag of flour = 25,000 g', () => {
  assert.deepEqual(purchaseConversion('carton', 'bottle', null), { ok: false, problem: 'PACK_SIZE_REQUIRED' });
  assert.deepEqual(purchaseConversion('carton', 'bottle', 0), { ok: false, problem: 'PACK_SIZE_REQUIRED' });
  assert.deepEqual(purchaseConversion('carton', 'bottle', 24_000), { ok: true, factorMilli: 24_000, fixed: false });
  assert.deepEqual(purchaseConversion('pack', 'g', 25 * KG), { ok: true, factorMilli: 25 * KG, fixed: false });
  assert.deepEqual(purchaseConversion('bottle', 'ml', 1_500_000), { ok: true, factorMilli: 1_500_000, fixed: false });
});

test('people type and read kilograms for weight, bottles for packages', () => {
  assert.equal(displayUnitOf({ purchaseUnit: 'kg', stockUnit: 'g' }), 'kg');
  assert.equal(displayFactorMilli({ purchaseUnit: 'kg', stockUnit: 'g' }), KG);
  assert.equal(displayUnitOf({ purchaseUnit: 'pack', stockUnit: 'g' }), 'kg', 'a 25 kg bag of flour is read in kg');
  assert.equal(displayUnitOf({ purchaseUnit: 'bottle', stockUnit: 'ml' }), 'l');
  assert.equal(displayUnitOf({ purchaseUnit: 'g', stockUnit: 'g' }), 'g', 'saffron bought in grams');
  assert.equal(displayFactorMilli({ purchaseUnit: 'g', stockUnit: 'g' }), 1000);
  assert.equal(displayUnitOf({ purchaseUnit: 'box', stockUnit: 'piece' }), 'piece');
  assert.equal(displayUnitOf({ purchaseUnit: 'carton', stockUnit: 'bottle' }), 'bottle');
  assert.equal(displayFactorMilli({ purchaseUnit: 'carton', stockUnit: 'bottle' }), 1000);
});

test('typed quantities become exact thousandths; at most 3 decimals', () => {
  assert.equal(parseQuantity('8.5'), 8500);
  assert.equal(parseQuantity('1,500'), 1_500_000);
  assert.equal(parseQuantity('0.25'), 250);
  assert.equal(parseQuantity('0'), 0);
  assert.equal(parseQuantity('0', { allowZero: false }), null);
  for (const bad of ['', 'abc', '-1', '1.2345', '2000000', '1.2.3']) assert.equal(parseQuantity(bad), null, bad);
  assert.equal(formatMilli(8500), '8.5');
  assert.equal(formatMilli(1_500_000), '1,500');
  assert.equal(formatMilli(250), '0.25');
  assert.equal(formatMilli(-500), '-0.5');
  assert.equal(milliToInput(1_500_000), '1500');
});

test('stock = sum of movements: 10 kg chicken − 1.5 kg = 8.5 kg (owner test 1)', () => {
  const movements = [
    { ingredientId: 'chicken', quantityMilli: 10 * KG },
    { ingredientId: 'cheese', quantityMilli: 4 * KG },
    { ingredientId: 'chicken', quantityMilli: -(10 * 150 * 1000) }, // 10 burgers × 150 g
  ];
  const onHand = onHandOf('chicken', movements);
  assert.equal(onHand, 8.5 * KG);
  assert.equal(formatMilli(mulDivRound(onHand, 1000, KG)), '8.5', 'shown in kg');
});

test('stock value at the purchase price: 10 kg × Rs. 650 = Rs. 6,500; 8.5 kg = Rs. 5,525', () => {
  const chicken = { purchaseUnit: 'kg' as const, stockUnit: 'g' as const, packSizeMilli: null, purchasePrice: 65_000 };
  assert.equal(stockValueOf(chicken, 10 * KG), 650_000);
  assert.equal(stockValueOf(chicken, 8.5 * KG), 552_500);
  assert.equal(stockValueOf(chicken, 0), 0);
  assert.equal(stockValueOf(chicken, -KG), 0, 'negative stock is worth nothing');
  // 60 bottles of a carton of 24 at Rs. 2,400: 2.5 cartons = Rs. 6,000
  assert.equal(stockValueOf({ purchaseUnit: 'carton', stockUnit: 'bottle', packSizeMilli: 24_000, purchasePrice: 240_000 }, 60_000), 600_000);
  // 1 g of a Rs. 333 kilogram = 33.3 paisa → 33
  assert.equal(stockValueOf({ ...chicken, purchasePrice: 33_300 }, 1000), 33);
  // very large numbers stay exact
  assert.equal(mulDivRound(9_000_000_000_000, 1_000_000_000, 1_000_000), 9_000_000_000_000_000);
  assert.equal(mulDivRound(5, 1, 2), 3, 'half rounds up');
  assert.equal(mulDivRound(-5, 1, 2), -3);
});

test('status: low at or below the minimum, out at zero, not in use when switched off', () => {
  assert.equal(stockStatus({ onHandMilli: 10 * KG, minStockMilli: 3 * KG, isActive: true }), 'AVAILABLE');
  assert.equal(stockStatus({ onHandMilli: 3 * KG, minStockMilli: 3 * KG, isActive: true }), 'LOW');
  assert.equal(stockStatus({ onHandMilli: 0, minStockMilli: 3 * KG, isActive: true }), 'OUT');
  assert.equal(stockStatus({ onHandMilli: 0, minStockMilli: 3 * KG, isActive: false }), 'NOT_IN_USE');
});

test('expiry: expired before today, expiring soon up to 3 days ahead, used-up stock never warns', () => {
  const today = '2026-11-04';
  assert.equal(expiryState(null, today, KG), 'NONE');
  assert.equal(expiryState('2026-11-03', today, KG), 'EXPIRED');
  assert.equal(expiryState('2026-11-04', today, KG), 'SOON');
  assert.equal(expiryState('2026-11-07', today, KG), 'SOON');
  assert.equal(expiryState('2026-11-08', today, KG), 'OK');
  assert.equal(expiryState('2026-11-03', today, 0), 'NONE');
  assert.equal(expiryState('2026-11-10', today, KG, 7), 'SOON');
});

const chicken: IngredientCheckInput = {
  id: null,
  name: 'Chicken',
  code: 'CHK-001',
  category: 'MEAT',
  purchaseUnit: 'kg',
  stockUnit: 'g',
  packSizeMilli: null,
  minStockMilli: 3 * KG,
  reorderQtyMilli: 10_000,
  purchasePrice: 65_000,
  openingMilli: 10_000,
  expiryDate: '2026-11-10',
  batchNo: 'B-1102',
};

test('an ingredient needs a name, a unique code, matching units and sensible numbers', () => {
  assert.equal(checkIngredient(chicken, []), null);
  const others = [{ id: 'x', name: 'Chicken', code: 'CHK-001' }];
  assert.deepEqual(checkIngredient(chicken, others), { field: 'name', problem: 'NAME_TAKEN' });
  assert.deepEqual(checkIngredient({ ...chicken, name: 'Chicken breast' }, others), { field: 'code', problem: 'CODE_TAKEN' });
  assert.equal(checkIngredient({ ...chicken, id: 'x' }, others), null, 'editing itself is fine');
  assert.deepEqual(checkIngredient({ ...chicken, name: '  ' }, []), { field: 'name', problem: 'NAME_REQUIRED' });
  assert.deepEqual(checkIngredient({ ...chicken, code: 'chicken' }, []), { field: 'code', problem: 'CODE_INVALID' });
  assert.deepEqual(checkIngredient({ ...chicken, category: 'TOYS' }, []), { field: 'category', problem: 'CATEGORY_INVALID' });
  assert.deepEqual(checkIngredient({ ...chicken, stockUnit: 'ml' }, []), { field: 'units', problem: 'UNITS_INCOMPATIBLE' });
  assert.deepEqual(checkIngredient({ ...chicken, purchaseUnit: 'carton', stockUnit: 'bottle' }, []), { field: 'packSize', problem: 'PACK_SIZE_REQUIRED' });
  assert.equal(checkIngredient({ ...chicken, purchaseUnit: 'carton', stockUnit: 'bottle', packSizeMilli: 24_000 }, []), null);
  assert.deepEqual(checkIngredient({ ...chicken, minStockMilli: null }, []), { field: 'minStock', problem: 'QUANTITY_INVALID' });
  assert.deepEqual(checkIngredient({ ...chicken, purchasePrice: -1 }, []), { field: 'price', problem: 'PRICE_INVALID' });
  assert.deepEqual(checkIngredient({ ...chicken, openingMilli: null }, []), { field: 'opening', problem: 'QUANTITY_INVALID' });
  assert.equal(checkIngredient({ ...chicken, id: 'x', openingMilli: null }, []), null, 'opening stock only for a new one');
  assert.deepEqual(checkIngredient({ ...chicken, expiryDate: '2026-02-30' }, []), { field: 'expiry', problem: 'EXPIRY_INVALID' });
  assert.deepEqual(checkIngredient({ ...chicken, batchNo: 'x'.repeat(31) }, []), { field: 'batch', problem: 'BATCH_TOO_LONG' });
});

test('codes are suggested from the name: Chicken → CHK-001, the next one CHK-002', () => {
  assert.equal(suggestIngredientCode('Chicken', []), 'CHK-001');
  assert.equal(suggestIngredientCode('Chicken breast', ['CHK-001']), 'CHK-002');
  assert.equal(suggestIngredientCode('Mozzarella cheese', []), 'MZR-001');
  assert.equal(suggestIngredientCode('Oil', []), 'OLI-001');
  assert.equal(suggestIngredientCode('', []), 'ING-001');
});

test('a stock correction needs a reason, a note for "Other", and never goes below zero', () => {
  const base = { direction: 'REMOVE' as const, quantityMilli: KG, reason: 'RECOUNT', note: '', onHandMilli: 10 * KG };
  assert.equal(checkAdjustment(base), null);
  assert.equal(checkAdjustment({ ...base, quantityMilli: 0 }), 'QUANTITY_INVALID');
  assert.equal(checkAdjustment({ ...base, quantityMilli: null }), 'QUANTITY_INVALID');
  assert.equal(checkAdjustment({ ...base, reason: null }), 'REASON_REQUIRED');
  assert.equal(checkAdjustment({ ...base, reason: 'OTHER' }), 'NOTE_REQUIRED');
  assert.equal(checkAdjustment({ ...base, reason: 'OTHER', note: 'Given to the staff meal' }), null);
  assert.equal(checkAdjustment({ ...base, quantityMilli: 11 * KG }), 'MORE_THAN_ON_HAND');
  assert.equal(checkAdjustment({ ...base, direction: 'ADD', quantityMilli: 11 * KG }), null);
});

test('dashboard numbers leave out ingredients that are not in use', () => {
  const summary = summarizeInventory([
    { status: 'AVAILABLE', expiry: 'OK', value: 650_000 },
    { status: 'LOW', expiry: 'SOON', value: 10_000 },
    { status: 'OUT', expiry: 'NONE', value: 0 },
    { status: 'AVAILABLE', expiry: 'EXPIRED', value: 5_000 },
    { status: 'NOT_IN_USE', expiry: 'SOON', value: 99_000 },
  ]);
  assert.deepEqual(summary, { stockValue: 665_000, ingredients: 4, low: 1, out: 1, expiringSoon: 1, expired: 1 });
});

test('stock history: each change shows the stock it left, per ingredient, oldest first', () => {
  const after = balancesAfter([
    { id: 'c3', ingredientId: 'chicken', quantityMilli: -1_500_000, createdAt: '2026-11-04T12:00:00.000Z' },
    { id: 'c1', ingredientId: 'chicken', quantityMilli: 10_000_000, createdAt: '2026-11-04T06:00:00.000Z' },
    { id: 'o1', ingredientId: 'onions', quantityMilli: 8_000_000, createdAt: '2026-11-04T06:00:00.000Z' },
    { id: 'c2', ingredientId: 'chicken', quantityMilli: 500_000, createdAt: '2026-11-04T06:00:00.000Z' },
  ]);
  assert.equal(after.get('c1'), 10_000_000);
  assert.equal(after.get('c2'), 10_500_000, 'same time: the saved order');
  assert.equal(after.get('c3'), 9_000_000);
  assert.equal(after.get('o1'), 8_000_000);
});

test('period filters: today, last 7 days, this month, all', () => {
  assert.deepEqual(periodRange('TODAY', '2026-11-04'), { from: '2026-11-04', to: '2026-11-04' });
  assert.deepEqual(periodRange('WEEK', '2026-11-04'), { from: '2026-10-29', to: '2026-11-04' });
  assert.deepEqual(periodRange('MONTH', '2026-11-04'), { from: '2026-11-01', to: '2026-11-04' });
  assert.deepEqual(periodRange('ALL', '2026-11-04'), { from: null, to: null });
});

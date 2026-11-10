import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchPlan, checkBatch, costPer, dueChecks, localClock, nextDate, planLeft, planOf, planUses, platesOf, stockNeeds, takesRawTwice, usableMilli, DEFAULT_COOKING_CHECKS } from './index';

// The owner's example: one recipe written for 1 kg raw daal mash; it makes 2.5 kg cooked daal
const daal = {
  mainIngredientId: 'daal',
  yieldMilli: 2_500_000,
  lines: [
    { ingredientId: 'daal', quantityMilli: 1_000_000, lossBps: 0, optional: false, substituteId: null },
    { ingredientId: 'oil', quantityMilli: 100_000, lossBps: 0, optional: false, substituteId: null },
    { ingredientId: 'onion', quantityMilli: 200_000, lossBps: 1000, optional: false, substituteId: null },
  ],
};

test('a cooking batch of 5 kg daal mash: the recipe × 5, the main ingredient exactly, the others with their loss', () => {
  const plan = batchPlan(daal, 'MAIN', 5_000_000)!;
  assert.deepEqual(plan.uses, [
    { ingredientId: 'daal', quantityMilli: 5_000_000 },
    { ingredientId: 'oil', quantityMilli: 500_000 },
    // 1 kg net onion with 10 % loss: the kitchen takes 1.111 kg
    { ingredientId: 'onion', quantityMilli: 1_111_111 },
  ]);
  assert.equal(plan.expectedMilli, 12_500_000, 'expected 12.5 kg cooked daal');
  assert.equal(batchPlan(daal, 'MAIN', 0), null);
  assert.equal(batchPlan({ ...daal, mainIngredientId: null }, 'MAIN', 5_000_000), null, 'MAIN needs a main ingredient');
  // Naan dough has no main ingredient: half a batch
  const half = batchPlan({ ...daal, mainIngredientId: null }, 'BATCHES', 500)!;
  assert.equal(half.expectedMilli, 1_250_000);
  assert.equal(half.uses.find((u) => u.ingredientId === 'daal')?.quantityMilli, 500_000);
});

test('actual output, plates and cost: raw weight is not cooked weight', () => {
  // Rs. 4,000 of ingredients made 50 plates of 250 g = 12.5 kg
  assert.equal(platesOf(12_500_000, 250_000), 50);
  assert.equal(costPer(400_000, 12_500_000, 250_000), 8_000, 'Rs. 80 a plate');
  assert.equal(costPer(400_000, 12_500_000, 1_000_000), 32_000, 'Rs. 320 a kg');
  assert.equal(costPer(null, 12_500_000, 250_000), null);
});

test('stock check: usable stock (expired = none), what is short, and a batch only when nothing is', () => {
  const plan = batchPlan(daal, 'MAIN', 5_000_000)!;
  const stock: Record<string, number> = { daal: 5_000_000, oil: 300_000, onion: 2_000_000 };
  const needs = stockNeeds(plan.uses, (id) => stock[id] ?? 0);
  assert.deepEqual(needs.find((n) => n.ingredientId === 'oil'), { ingredientId: 'oil', needMilli: 500_000, haveMilli: 300_000, shortMilli: 200_000 });
  assert.equal(usableMilli(4_000, true), 0, 'expired stock is not cooked with');
  assert.equal(usableMilli(-2_000, false), 0);
  const ok = { verified: true, plan, actualMilli: 12_000_000, plateMilli: 250_000 };
  assert.equal(checkBatch({ ...ok, needs }), 'SHORT');
  assert.equal(checkBatch({ ...ok, needs: stockNeeds(plan.uses, () => 10_000_000) }), null);
  assert.equal(checkBatch({ ...ok, verified: false, needs: [] }), 'NOT_VERIFIED');
  assert.equal(checkBatch({ ...ok, actualMilli: 0, needs: [] }), 'ACTUAL_INVALID');
});

test('cooking plan: the daily plan or the day\'s own; the needs of all dishes added up', () => {
  const plan = { daily: [{ preparedId: 'daal-mash', mode: 'MAIN' as const, amountMilli: 5_000_000 }], days: [{ date: '2026-11-10', rows: [] }] };
  assert.equal(planOf(plan, '2026-11-11').length, 1, 'daily plan');
  assert.equal(planOf(plan, '2026-11-10').length, 0, 'that day: nothing to cook');
  const rows = [
    { preparedId: 'daal-mash', mode: 'MAIN' as const, amountMilli: 5_000_000 },
    { preparedId: 'daal-mash-2', mode: 'MAIN' as const, amountMilli: 2_000_000 },
  ];
  const uses = planUses(rows, () => daal);
  assert.equal(uses.find((u) => u.ingredientId === 'oil')?.quantityMilli, 700_000, 'oil for both added up');
});

test('the stock checks before cooking: 8 pm looks at tomorrow, 7 am at today, in Karachi time', () => {
  // 15:30 UTC = 20:30 in Karachi
  const evening = new Date('2026-11-09T15:30:00Z');
  assert.deepEqual(localClock(evening), { date: '2026-11-09', time: '20:30' });
  const due = dueChecks(DEFAULT_COOKING_CHECKS, evening);
  assert.deepEqual(due.map((c) => [c.time, c.planDate]), [['20:00', '2026-11-10'], ['07:00', '2026-11-09']]);
  // 01:00 UTC = 06:00 in Karachi: nothing yet today
  assert.deepEqual(dueChecks(DEFAULT_COOKING_CHECKS, new Date('2026-11-10T01:00:00Z')), []);
  assert.equal(nextDate('2026-12-31'), '2027-01-01');
});

test('IM1: a plan row is done by quantity, not by the first batch', () => {
  const row = { preparedId: 'daal-mash', mode: 'MAIN' as const, amountMilli: 5_000_000 };
  const batch = { preparedId: 'daal-mash', mode: 'MAIN' as const, amountMilli: 2_000_000, status: 'DONE' as const, planDate: '2026-11-10' };
  assert.deepEqual(planLeft(row, [], '2026-11-10'), { cookedMilli: 0, leftMilli: 5_000_000 });
  assert.deepEqual(planLeft(row, [batch], '2026-11-10'), { cookedMilli: 2_000_000, leftMilli: 3_000_000 }, '2 of 5 kg cooked: 3 kg left');
  assert.deepEqual(planLeft(row, [batch, { ...batch, amountMilli: 4_000_000 }], '2026-11-10'), { cookedMilli: 6_000_000, leftMilli: 0 }, 'an extra batch never makes it negative');
  assert.equal(planLeft(row, [{ ...batch, status: 'REVERSED' as const }], '2026-11-10').leftMilli, 5_000_000, 'a reversed batch does not count');
  assert.equal(planLeft(row, [batch], '2026-11-11').leftMilli, 5_000_000, 'another day');
  assert.equal(planLeft(row, [{ ...batch, preparedId: 'daal-chana' }], '2026-11-10').leftMilli, 5_000_000, 'another dish');
});

test('IM1: expired stock is not cooked with, but stock received after the expiry date is', () => {
  assert.equal(usableMilli(10_000_000, false), 10_000_000);
  assert.equal(usableMilli(-2_000_000, false), 0, 'never below zero');
  assert.equal(usableMilli(10_000_000, true), 0, 'all of it is the expired stock');
  assert.equal(usableMilli(15_000_000, true, 5_000_000), 5_000_000, '5 kg came after the date: those are fresh');
  assert.equal(usableMilli(3_000_000, true, 5_000_000), 3_000_000, 'never more than is on hand');
});

test('IM1: the same dish cooked in a pot and sold by its own raw recipe would take the raw stock twice', () => {
  const dish = { id: 'cooked-daal', name: 'Cooked Daal Mash' };
  const raw = [{ ingredientId: 'daal' }, { ingredientId: 'ghee' }];
  assert.equal(takesRawTwice(dish, daal.lines, { name: 'Daal Mash', preparedItemId: null }, raw), true, 'not linked, its recipe uses raw daal');
  assert.equal(takesRawTwice(dish, daal.lines, { name: 'Daal Mash', preparedItemId: 'cooked-daal' }, [{ ingredientId: 'cooked-daal' }]), false, 'linked: a sale takes the cooked dish');
  assert.equal(takesRawTwice(dish, daal.lines, { name: 'Daal Chana' }, raw), false, 'another dish');
  assert.equal(takesRawTwice(dish, daal.lines, { name: 'daal mash' }, []), false, 'no verified recipe: nothing is taken (Not tracked)');
  assert.equal(takesRawTwice(dish, daal.lines, { name: 'Daal Mash' }, [{ ingredientId: 'roti' }]), false, 'its recipe shares nothing with the pot');
});

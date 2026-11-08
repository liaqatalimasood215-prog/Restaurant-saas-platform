import { test } from 'node:test';
import assert from 'node:assert/strict';
import { batchPlan, checkBatch, costPer, dueChecks, localClock, nextDate, planOf, planUses, platesOf, stockNeeds, usableMilli, DEFAULT_COOKING_CHECKS } from './index';

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

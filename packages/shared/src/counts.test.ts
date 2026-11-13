import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkApprove, checkReturnOrCancel, checkSubmit, countDiff, countStockMilli, inScope, isUsableState, lotDateState, lotLedger, summarizeCount, type CountLine, type Ingredient, type StockLot } from './index';

// Cold drink: a carton of 24 bottles, counted in bottles
const drink = { purchaseUnit: 'carton', stockUnit: 'bottle', packSizeMilli: 24_000, packings: [], purchasePrice: 288_000, loosePrice: null } as unknown as Pick<Ingredient, 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'packings'>;
const line = (over: Partial<CountLine>): CountLine => ({ ingredientId: 'x', snapshotMilli: 0, parts: null, countedMilli: null, countedAt: null, countedBy: null, note: '', ...over });

test('Stage A: mixed units — 1 carton + 3 bottles = 27 bottles; zero is a real count; a unit twice or a missing quantity is refused', () => {
  assert.equal(countStockMilli([{ unitKey: 'main', quantityMilli: 1_000 }, { unitKey: 'loose:bottle', quantityMilli: 3_000 }], drink as never), 27_000);
  assert.equal(countStockMilli([{ unitKey: 'main', quantityMilli: 0 }], drink as never), 0, 'counted, and nothing is there');
  assert.equal(countStockMilli([{ unitKey: 'main', quantityMilli: null }], drink as never), null, 'blank is not a count');
  assert.equal(countStockMilli([{ unitKey: 'main', quantityMilli: 1_000 }, { unitKey: 'main', quantityMilli: 1_000 }], drink as never), null);
  assert.equal(countStockMilli([{ unitKey: 'main', quantityMilli: -1_000 }], drink as never), null);
});

test('Stage A: all stock, a category or a storage place; never an item that is not in use', () => {
  const milk = { isActive: true, category: 'DAIRY', locationId: 'fridge' } as const;
  assert.ok(inScope(milk, { kind: 'ALL' }));
  assert.ok(inScope(milk, { kind: 'CATEGORY', category: 'DAIRY' }));
  assert.ok(!inScope(milk, { kind: 'CATEGORY', category: 'MEAT' }));
  assert.ok(inScope(milk, { kind: 'LOCATION', locationId: 'fridge' }));
  assert.ok(!inScope({ ...milk, isActive: false }, { kind: 'ALL' }));
});

test('Stage A: counted at 10:00 when 60 were expected; 2 sold at 10:30: the difference is −33 from the count, never the sale again', () => {
  // Expected at the moment of counting = 60; counted 27; the later sale is already in the stock
  const diff = countDiff(27_000, 60_000);
  assert.equal(diff, -33_000);
  const stockAtApproval = 60_000 - 2_000;
  assert.equal(stockAtApproval + diff, 25_000, 'what is on the shelf now: 27 counted − 2 sold after');
});

test('Stage A: submit needs a counted item; a Manager never approves his own count; the Owner may', () => {
  const counted = { status: 'COUNTING' as const, lines: [line({}), line({ countedMilli: 5_000, countedBy: 'm1' })] };
  assert.equal(checkSubmit({ status: 'COUNTING', lines: [line({})] }), 'NOTHING_COUNTED', 'blank everywhere');
  assert.equal(checkSubmit(counted), null);
  const submitted = { ...counted, status: 'SUBMITTED' as const, startedBy: 'm1', history: [{ action: 'SUBMITTED' as const, by: 'm1', at: '', note: '' }] };
  assert.equal(checkApprove(submitted, { id: 'm1', role: 'MANAGER' }), 'OWN_COUNT');
  assert.equal(checkApprove(submitted, { id: 'm2', role: 'MANAGER' }), null, 'another Manager may');
  assert.equal(checkApprove({ ...submitted, startedBy: 'o1' }, { id: 'o1', role: 'OWNER' }), null, 'the Owner may approve his own');
  assert.equal(checkApprove({ ...submitted, status: 'APPROVED' }, { id: 'o1', role: 'OWNER' }), 'NOT_SUBMITTED', 'never posted twice');
  assert.equal(checkReturnOrCancel(submitted, ' ', 'RETURN'), 'REASON_REQUIRED');
  assert.equal(checkReturnOrCancel({ status: 'APPROVED' }, 'oops', 'CANCEL'), 'NOT_COUNTING', 'an approved count stays');
});

test('Stage A: the summary counts only counted items; missing and extra apart; a COUNT shortfall takes the expired lot first', () => {
  const sum = summarizeCount([
    { line: line({}), diffMilli: null, cost: null },
    { line: line({ countedMilli: 1 }), diffMilli: 0, cost: 0 },
    { line: line({ countedMilli: 1 }), diffMilli: -2_000, cost: 44_000 },
    { line: line({ countedMilli: 1 }), diffMilli: 1_000, cost: 22_000 },
    { line: line({ countedMilli: 1 }), diffMilli: -1_000, cost: null },
  ]);
  assert.deepEqual(sum, { items: 5, counted: 4, withDifference: 3, lossCost: 44_000, gainCost: 22_000, unknownCost: 1 });
  // Lots: 3 L expired + 5 L fresh; the count found 2 L missing → from the expired lot
  const now = { date: '2026-11-12', at: Date.parse('2026-11-12T10:00:00+05:00') };
  const base = { restaurantId: 'r', branchId: 'b', ingredientId: 'milk', sourceId: null, cost: null, dateFrom: 'TYPED', unverified: false, held: false, createdBy: 'u', createdAt: '2026-11-01T00:00:00.000Z', receivedAt: '2026-11-01T00:00:00.000Z' } as const;
  const lots: StockLot[] = [
    { ...base, id: 'old', source: 'PURCHASE', firstMilli: 3_000, date: '2026-11-10', dateKind: 'USE_BY' },
    { ...base, id: 'new', source: 'PURCHASE', firstMilli: 5_000, date: '2026-11-30', dateKind: 'USE_BY' },
  ];
  const ledger = lotLedger(
    lots,
    [
      { id: 'a', ingredientId: 'milk', type: 'PURCHASE', quantityMilli: 3_000, createdAt: '2026-11-01T00:00:00.000Z', lotId: 'old' },
      { id: 'b', ingredientId: 'milk', type: 'PURCHASE', quantityMilli: 5_000, createdAt: '2026-11-01T00:00:00.000Z', lotId: 'new' },
      { id: 'c', ingredientId: 'milk', type: 'COUNT', quantityMilli: -2_000, createdAt: '2026-11-12T05:00:00.000Z' },
    ],
    null,
    (l) => !isUsableState(lotDateState(l, now, 3)),
  );
  assert.deepEqual([ledger.remaining.get('old'), ledger.remaining.get('new')], [1_000, 5_000]);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLotDate, checkRelease, fefoOrder, isUsableState, lotDateState, lotLedger, lotState, needsReview, usableOfLots, type LotMovement, type StockLot } from './index';

const NOW = { date: '2026-11-12', at: Date.parse('2026-11-12T10:00:00+05:00') };
const lot = (over: Partial<StockLot>): StockLot => ({
  id: 'lot',
  restaurantId: 'r',
  branchId: 'b',
  ingredientId: 'milk',
  source: 'PURCHASE',
  sourceId: null,
  receivedAt: '2026-11-10T08:00:00.000Z',
  firstMilli: 0,
  cost: null,
  date: null,
  dateKind: 'UNKNOWN',
  dateFrom: 'TYPED',
  unverified: false,
  held: false,
  createdBy: 'u',
  createdAt: '2026-11-10T08:00:00.000Z',
  ...over,
});
const move = (over: Partial<LotMovement> & Pick<LotMovement, 'id' | 'quantityMilli' | 'createdAt'>): LotMovement => ({ ingredientId: 'milk', type: 'SALE_USE', ...over });

test('W3: a lot is expired after its use-by day, past best-before is still usable, an unknown or unconfirmed date needs review', () => {
  assert.equal(lotDateState(lot({ date: '2026-11-12', dateKind: 'USE_BY' }), NOW, 3), 'SOON', 'usable through the end of its day');
  assert.equal(lotDateState(lot({ date: '2026-11-11', dateKind: 'USE_BY' }), NOW, 3), 'EXPIRED');
  assert.equal(lotDateState(lot({ date: '2026-11-11', dateKind: 'BEST_BEFORE' }), NOW, 3), 'PAST_BEST');
  assert.equal(lotDateState(lot({ date: '2026-11-30', dateKind: 'USE_BY' }), NOW, 3), 'OK');
  assert.equal(lotDateState(lot({}), NOW, 3), 'NEEDS_REVIEW', 'no date is never safe');
  assert.equal(lotDateState(lot({ date: '2026-11-30', dateKind: 'USE_BY', unverified: true }), NOW, 3), 'NEEDS_REVIEW', 'a date nobody confirmed');
  assert.equal(lotDateState(lot({ date: '2026-11-11', dateKind: 'USE_BY', unverified: true }), NOW, 3), 'EXPIRED', 'an unconfirmed date that passed still blocks');
  const soonUnconfirmed = lot({ date: '2026-11-13', dateKind: 'USE_BY', unverified: true });
  assert.equal(lotDateState(soonUnconfirmed, NOW, 3), 'SOON', 'the warning is never hidden');
  assert.ok(needsReview(soonUnconfirmed, 'SOON'), '…and it still needs review');
  assert.ok(!needsReview(lot({ date: '2026-11-13', dateKind: 'USE_BY' }), 'SOON'));
  assert.equal(lotDateState(lot({ held: true, date: '2026-11-30', dateKind: 'USE_BY' }), NOW, 3), 'HELD');
  assert.equal(lotDateState(lot({ discardAt: '2026-11-12T04:00:00.000Z' }), NOW, 3), 'EXPIRED', 'cooked food past its discard time');
  assert.equal(lotState(lot({ date: '2026-11-11', dateKind: 'USE_BY' }), 0, NOW, 3), 'EMPTY');
  assert.deepEqual(['OK', 'SOON', 'PAST_BEST', 'NEEDS_REVIEW', 'EXPIRED', 'HELD'].map((s) => isUsableState(s as never)), [true, true, true, true, false, false]);
});

test('W3: two lots of milk with different dates: the expired one is blocked, use comes from the usable one, earliest date first', () => {
  const old = lot({ id: 'old', date: '2026-11-11', dateKind: 'USE_BY' });
  const fresh = lot({ id: 'fresh', date: '2026-11-20', dateKind: 'USE_BY', receivedAt: '2026-11-11T08:00:00.000Z' });
  const later = lot({ id: 'later', date: '2026-11-25', dateKind: 'USE_BY', receivedAt: '2026-11-11T09:00:00.000Z' });
  const lots = [later, old, fresh];
  assert.deepEqual([...lots].sort(fefoOrder).map((l) => l.id), ['old', 'fresh', 'later']);
  const blocked = (l: StockLot) => !isUsableState(lotDateState(l, NOW, 3));
  const movements = [
    move({ id: 'p1', type: 'PURCHASE', lotId: 'old', quantityMilli: 5_000, createdAt: '2026-11-10T08:00:00.000Z' }),
    move({ id: 'p2', type: 'PURCHASE', lotId: 'fresh', quantityMilli: 10_000, createdAt: '2026-11-11T08:00:00.000Z' }),
    move({ id: 'p3', type: 'PURCHASE', lotId: 'later', quantityMilli: 10_000, createdAt: '2026-11-11T09:00:00.000Z' }),
    move({ id: 's1', quantityMilli: -12_000, createdAt: '2026-11-12T05:00:00.000Z', orderItemId: 'line1' }),
  ];
  const ledger = lotLedger(lots, movements, null, blocked);
  assert.deepEqual([ledger.remaining.get('old'), ledger.remaining.get('fresh'), ledger.remaining.get('later')], [5_000, 0, 8_000], 'never from the expired lot');
  assert.equal(usableOfLots('milk', lots, ledger, (l) => !blocked(l)), 8_000, 'usable = on hand 13 L − expired 5 L');
  // The kitchen's Undo gives back to the same lots
  const undo = lotLedger(lots, [...movements, move({ id: 'r1', type: 'SALE_RETURN', quantityMilli: 12_000, createdAt: '2026-11-12T05:10:00.000Z', orderItemId: 'line1' })], null, blocked);
  assert.deepEqual([undo.remaining.get('fresh'), undo.remaining.get('later')], [10_000, 10_000]);
});

test('W3: before lots, everything is the old-stock lot; waste without a lot takes the expired stock first; overdrawn is flagged', () => {
  const old = lot({ id: 'old', source: 'OLD_STOCK', date: '2026-11-11', dateKind: 'USE_BY', unverified: true });
  const fresh = lot({ id: 'fresh', date: '2026-11-20', dateKind: 'USE_BY' });
  const blocked = (l: StockLot) => !isUsableState(lotDateState(l, NOW, 3));
  const movements = [
    move({ id: 'o', type: 'OPENING', quantityMilli: 4_000, createdAt: '2026-11-01T08:00:00.000Z' }),
    move({ id: 'p', type: 'PURCHASE', lotId: 'fresh', quantityMilli: 2_000, createdAt: '2026-11-11T08:00:00.000Z' }),
    move({ id: 'w', type: 'WASTE', quantityMilli: -3_000, createdAt: '2026-11-12T05:00:00.000Z' }),
  ];
  const ledger = lotLedger([old, fresh], movements, '2026-11-05T00:00:00.000Z', blocked);
  assert.deepEqual([ledger.remaining.get('old'), ledger.remaining.get('fresh')], [1_000, 2_000], 'the 3 L thrown away came from the expired old stock');
  const sold = lotLedger([old, fresh], [...movements, move({ id: 's', quantityMilli: -2_500, createdAt: '2026-11-12T06:00:00.000Z' })], '2026-11-05T00:00:00.000Z', blocked);
  assert.equal(sold.remaining.get('fresh'), 0);
  assert.equal(sold.none.get('milk'), -500, 'beyond the usable lots');
  assert.ok(sold.overdrawn.has('milk'), 'the expired lot still has stock: check it');
});

test('W3: dates on a bill line; released only when safe and never after its date', () => {
  assert.equal(checkLotDate({ date: '2026-11-20', dateKind: 'USE_BY' }), null);
  assert.equal(checkLotDate({ date: null, dateKind: 'UNKNOWN' }), null);
  assert.equal(checkLotDate({ date: null, dateKind: 'USE_BY' }), 'DATE_INVALID');
  assert.equal(checkLotDate({ date: '20-11-2026', dateKind: 'USE_BY' }), 'DATE_INVALID');
  const held = lot({ held: true, date: '2026-11-20', dateKind: 'USE_BY' });
  assert.equal(checkRelease(held, 1_000, true, NOW, 3), null);
  assert.equal(checkRelease(held, 1_000, false, NOW, 3), 'NOT_SAFE');
  assert.equal(checkRelease({ ...held, date: '2026-11-11' }, 1_000, true, NOW, 3), 'EXPIRED', 'expired food is never released');
  assert.equal(checkRelease({ ...held, held: false }, 1_000, true, NOW, 3), 'NOT_HELD');
});

test('W3: a past use is judged as the lots were then: cooked from the old stock before it expired, never from a later delivery', () => {
  const old = lot({ id: 'old', source: 'OLD_STOCK', date: '2026-11-11', dateKind: 'USE_BY', createdAt: '2026-11-10T00:00:00.000Z' });
  const bought = lot({ id: 'bought', createdAt: '2026-11-10T09:00:00.000Z', receivedAt: '2026-11-10T09:00:00.000Z' });
  // Expired from 12 Nov (Asia/Karachi); the cooking was on 10 Nov
  const blockedAt = (l: StockLot, at: string) => l.id === 'old' && at >= '2026-11-11T19:00:00.000Z';
  const movements = [
    move({ id: 'o', type: 'OPENING', quantityMilli: 8_000, createdAt: '2026-11-09T08:00:00.000Z' }),
    move({ id: 'early', type: 'COOK_USE', quantityMilli: -1_000, createdAt: '2026-11-10T08:30:00.000Z' }),
    move({ id: 'p', type: 'PURCHASE', lotId: 'bought', quantityMilli: 5_000, createdAt: '2026-11-10T09:00:00.000Z' }),
    move({ id: 'c', type: 'COOK_USE', quantityMilli: -5_000, createdAt: '2026-11-10T10:00:00.000Z', batchId: 'b1' }),
  ];
  const ledger = lotLedger([old, bought], movements, '2026-11-10T00:00:00.000Z', blockedAt);
  assert.deepEqual([ledger.remaining.get('old'), ledger.remaining.get('bought')], [2_000, 5_000], 'both cookings took the old stock, which was fine then; the 5 kg bought stays');
});

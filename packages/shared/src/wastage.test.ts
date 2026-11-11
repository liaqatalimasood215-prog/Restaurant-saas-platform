import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReverse, checkWaste, cookedWasteCost, summarizeWaste, wasteCost, wasteStockMilli, type Ingredient, type WasteLine, type WasteLineInput } from './index';

const NOW = Date.parse('2026-11-11T10:00:00Z');
type Item = Pick<Ingredient, 'id' | 'kind' | 'isActive' | 'purchaseUnit' | 'stockUnit' | 'packSizeMilli' | 'purchasePrice' | 'packings' | 'loosePrice'>;
// Fresh milk: bought by the litre, counted in ml, Rs. 220 a litre
const milk: Item = { id: 'milk', kind: 'BOUGHT', isActive: true, purchaseUnit: 'l', stockUnit: 'ml', packSizeMilli: null, purchasePrice: 22_000, packings: [], loosePrice: null };
// Cold drink: a carton of 12 bottles at Rs. 1,440 (Rs. 120 a bottle), counted in bottles
const drink: Item = { id: 'drink', kind: 'BOUGHT', isActive: true, purchaseUnit: 'carton', stockUnit: 'bottle', packSizeMilli: 12_000, purchasePrice: 144_000, packings: [], loosePrice: null };
const onion: Item = { id: 'onion', kind: 'BOUGHT', isActive: true, purchaseUnit: 'kg', stockUnit: 'g', packSizeMilli: null, purchasePrice: 0, packings: [], loosePrice: null };
const dough: Item = { ...milk, id: 'dough', kind: 'PREPARED' };
const items = [milk, drink, onion, dough];
const stock: Record<string, number> = { milk: 10_000_000, drink: 30_000, onion: 5_000_000, dough: 2_000_000 };
const onHand = (id: string) => stock[id] ?? 0;
const line = (over: Partial<WasteLineInput>): WasteLineInput => ({ ingredientId: 'milk', parts: [{ unitKey: 'main', quantityMilli: 2_000 }], reason: 'SPOILED', note: '', ...over });
const incident = (lines: WasteLineInput[], over: { at?: string; stage?: string; note?: string; kind?: string } = {}) => ({ at: new Date(NOW).toISOString(), stage: 'STORAGE', note: '', lines, ...over });

test('W1: 10 L milk, 2 L spoiled: 2,000 ml leave the stock, a loss of Rs. 440 at Rs. 220 a litre', () => {
  assert.equal(checkWaste(incident([line({})]), items, onHand, NOW), null);
  const stockMilli = wasteStockMilli([{ unitKey: 'main', quantityMilli: 2_000 }], milk)!;
  assert.equal(stockMilli, 2_000_000, '2 L = 2,000 ml');
  assert.equal(stock.milk! - stockMilli, 8_000_000, '8 L left');
  assert.deepEqual(wasteCost(milk, stockMilli), { cost: 44_000, pricePaisa: 22_000, priceUnitMilli: 1_000_000 });
  // 500 ml typed loose = 0.5 L
  assert.equal(wasteStockMilli([{ unitKey: 'loose:ml', quantityMilli: 500_000 }], milk), 500_000);
});

test('W1: 1 carton of 12 + 2 bottles = 14 bottles; one unit twice is refused', () => {
  const parts = [
    { unitKey: 'main', quantityMilli: 1_000 },
    { unitKey: 'loose:bottle', quantityMilli: 2_000 },
  ];
  assert.equal(wasteStockMilli(parts, drink), 14_000);
  assert.equal(wasteCost(drink, 14_000)?.cost, 168_000, '14 × Rs. 120 = Rs. 1,680');
  assert.equal(checkWaste(incident([line({ ingredientId: 'drink', parts })]), items, onHand, NOW), null);
  assert.equal(checkWaste(incident([line({ ingredientId: 'drink', parts: [parts[0]!, parts[0]!] })]), items, onHand, NOW)?.problem, 'DUPLICATE_UNIT');
});

test('W1: never more than in stock, a reason, a note for Other; only bought items in use, each once', () => {
  assert.equal(checkWaste(incident([line({ parts: [{ unitKey: 'main', quantityMilli: 11_000 }] })]), items, onHand, NOW)?.problem, 'MORE_THAN_ON_HAND');
  assert.equal(checkWaste(incident([line({ parts: [{ unitKey: 'main', quantityMilli: 0 }] })]), items, onHand, NOW)?.problem, 'QUANTITY_INVALID');
  assert.equal(checkWaste(incident([line({ reason: null })]), items, onHand, NOW)?.problem, 'REASON_REQUIRED');
  assert.equal(checkWaste(incident([line({ reason: 'CLOSING_DISCARD' })]), items, onHand, NOW)?.problem, 'REASON_REQUIRED', 'a prepared-food reason (W2)');
  assert.equal(checkWaste(incident([line({ reason: 'OTHER' })]), items, onHand, NOW)?.problem, 'NOTE_REQUIRED');
  assert.equal(checkWaste(incident([line({ reason: 'OTHER', note: 'Rat in the store' })]), items, onHand, NOW), null);
  assert.equal(checkWaste(incident([line({ ingredientId: 'flour' })]), items, onHand, NOW)?.problem, 'ITEM_REQUIRED', 'an unknown item');
  assert.equal(checkWaste(incident([line({ ingredientId: 'oldOil' })]), [...items, { ...onion, id: 'oldOil', isActive: false }], onHand, NOW)?.problem, 'ITEM_REQUIRED', 'an item not in use');
  assert.deepEqual(checkWaste(incident([line({}), line({})]), items, onHand, NOW), { line: 1, problem: 'DUPLICATE_ITEM' });
  assert.equal(checkWaste(incident([]), items, onHand, NOW)?.problem, 'NO_LINES');
});

test('W1: the time is not in the future and at most 7 days back; the stage is one of Record Waste', () => {
  assert.equal(checkWaste(incident([line({})], { at: new Date(NOW + 3_600_000).toISOString() }), items, onHand, NOW)?.problem, 'TIME_INVALID');
  assert.equal(checkWaste(incident([line({})], { at: new Date(NOW - 8 * 86_400_000).toISOString() }), items, onHand, NOW)?.problem, 'TIME_INVALID');
  assert.equal(checkWaste(incident([line({})], { at: new Date(NOW - 2 * 86_400_000).toISOString() }), items, onHand, NOW), null);
  assert.equal(checkWaste(incident([line({})], { stage: 'SERVED_LEFTOVER' }), items, onHand, NOW)?.problem, 'STAGE_INVALID');
  assert.equal(checkWaste(incident([line({})], { stage: 'CANCELLED_ORDER' }), items, onHand, NOW)?.problem, 'STAGE_INVALID', 'order food comes from Available Food');
  assert.equal(checkWaste(incident([line({})], { stage: 'HOLDING' }), items, onHand, NOW), null, 'W2: holding is a stage of Record Waste');
});

test('W1: no purchase price = Unknown (null), never Rs. 0; the summary counts it apart', () => {
  assert.equal(wasteCost(onion, 1_000_000), null);
  const lineOf = (cost: number | null) => ({ cost }) as never;
  const events = [
    { businessDate: '2026-11-11', status: 'POSTED' as const, lines: [lineOf(44_000), lineOf(null)] },
    { businessDate: '2026-11-08', status: 'POSTED' as const, lines: [lineOf(10_000)] },
    { businessDate: '2026-11-04', status: 'POSTED' as const, lines: [lineOf(99_000)] },
  ];
  assert.deepEqual(summarizeWaste(events, '2026-11-11'), { todayCost: 44_000, todayLines: 2, todayUnknown: 1, weekCost: 54_000, weekLines: 3, weekUnknown: 1 });
});

test('W2: cooked stock: a cooked-food reason, never more than the cooked stock; the cost is the batch share, else the recipe', () => {
  // 1 kg of cooked daal (dough stands for a prepared item: 2 L in stock)
  const cooked = line({ ingredientId: 'dough', parts: [{ unitKey: 'main', quantityMilli: 1_000 }], reason: 'CLOSING_DISCARD' });
  assert.equal(checkWaste(incident([cooked], { stage: 'HOLDING' }), items, onHand, NOW), null);
  assert.equal(checkWaste(incident([{ ...cooked, reason: 'DAMAGED' }]), items, onHand, NOW)?.problem, 'REASON_REQUIRED', 'damaged packaging is not a cooked-food reason');
  assert.equal(checkWaste(incident([{ ...cooked, parts: [{ unitKey: 'main', quantityMilli: 3_000 }] }]), items, onHand, NOW)?.problem, 'MORE_THAN_ON_HAND');
  // A batch cost Rs. 4,000 and made 5 kg: 1 kg wasted = Rs. 800
  assert.equal(cookedWasteCost({ basis: 'BATCH', paisa: 400_000, perMilli: 5_000_000 }, 1_000_000), 80_000);
  assert.equal(cookedWasteCost(null, 1_000_000), null, 'no batch and no recipe cost: Unknown');
});

test('W2: Staff meal and Donation need no reason and count apart from waste; reversed entries count nowhere', () => {
  assert.equal(checkWaste(incident([line({ reason: null })], { kind: 'STAFF_MEAL' }), items, onHand, NOW), null);
  assert.equal(checkWaste(incident([line({ reason: null })], { kind: 'DONATION' }), items, onHand, NOW), null);
  assert.equal(checkWaste(incident([line({})], { kind: 'GIFT' }), items, onHand, NOW)?.problem, 'KIND_INVALID');
  assert.equal(checkWaste(incident([line({ reason: null, parts: [{ unitKey: 'main', quantityMilli: 11_000 }] })], { kind: 'STAFF_MEAL' }), items, onHand, NOW)?.problem, 'MORE_THAN_ON_HAND', 'never below zero either');
  const lineOf = (cost: number | null) => ({ cost }) as never;
  const events = [
    { businessDate: '2026-11-11', status: 'POSTED' as const, lines: [lineOf(44_000)] },
    { businessDate: '2026-11-11', status: 'POSTED' as const, kind: 'STAFF_MEAL' as const, lines: [lineOf(30_000)] },
    { businessDate: '2026-11-11', status: 'POSTED' as const, kind: 'DONATION' as const, lines: [lineOf(20_000)] },
    { businessDate: '2026-11-11', status: 'REVERSED' as const, lines: [lineOf(99_000)] },
  ];
  assert.equal(summarizeWaste(events, '2026-11-11').todayCost, 44_000, 'waste only, the reversed entry not counted');
  assert.equal(summarizeWaste(events, '2026-11-11', 'STAFF_MEAL').todayCost, 30_000);
  assert.equal(summarizeWaste(events, '2026-11-11', 'DONATION').todayCost, 20_000);
});

test('W2: Reverse once, with a reason; order food that left the kitchen cannot be reversed', () => {
  const stockLine = { itemKind: 'STOCK' } as WasteLine;
  assert.equal(checkReverse({ status: 'POSTED', lines: [stockLine] }, 'entered twice'), null);
  assert.equal(checkReverse({ status: 'POSTED', lines: [stockLine] }, '  '), 'REASON_REQUIRED');
  assert.equal(checkReverse({ status: 'REVERSED', lines: [stockLine] }, 'again'), 'NOT_POSTED', 'a second reversal is refused');
  assert.equal(checkReverse({ status: 'POSTED', lines: [{ itemKind: 'ORDER_FOOD' } as WasteLine] }, 'oops'), 'ORDER_FOOD');
});

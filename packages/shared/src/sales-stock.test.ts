import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableState,
  checkGive,
  checkOutcome,
  closingReviewDue,
  defaultReuse,
  netTaken,
  outcomeChoices,
  reuseOf,
  saleUses,
  sameOrderDish,
  safeUntilOf,
  type RecipeLine,
  type RecipeTarget,
} from './index';

const expect = (actual: unknown) => ({
  toEqual: (expected: unknown) => assert.deepEqual(actual, expected),
  toBe: (expected: unknown) => assert.equal(actual, expected),
  toBeNull: () => assert.equal(actual, null),
});

const line = (ingredientId: string, quantityMilli: number, lossBps = 0, optional = false): RecipeLine => ({ ingredientId, quantityMilli, lossBps, optional, substituteId: null });
const KG = 1_000_000;

// Chicken Karahi 1 kg (cooked to order): raw chicken 1 kg, tomato 500 g with 10 % loss, oil 150 ml, an optional garnish
const KARAHI_1KG = [line('chicken', KG), line('tomato', 450_000, 1000), line('oil', 150_000), line('coriander', 20_000, 0, true)];
// Daal Mash Full plate: 250 g of the cooked daal (a prepared item), nothing raw
const DAAL_PLATE = [line('cooked-daal', 250_000)];
const BUTTER = [line('butter', 25_000)];
const versions: Record<string, RecipeLine[]> = { 'karahi-1kg': KARAHI_1KG, 'karahi-half': KARAHI_1KG.map((l) => ({ ...l, quantityMilli: l.quantityMilli / 2 })), 'daal-full': DAAL_PLATE, butter: BUTTER };
const versionOf = (target: RecipeTarget, version: number) => {
  if (version !== 1) return null;
  if (target.kind === 'ADDON') return { lines: versions.butter! };
  if (target.kind === 'ITEM') return { lines: versions[target.variantId ?? ''] ?? [] };
  return null;
};
const uses = (r: ReturnType<typeof saleUses>) => Object.fromEntries(r.uses.map((u) => [u.ingredientId, u.quantityMilli]));

describe('stock used by a sale (I4)', () => {
  it('takes a cooked-to-order dish from the raw stock by its kept recipe, loss included and optional lines left out', () => {
    const r = saleUses({ menuItemId: 'karahi', quantity: 2, variantId: 'karahi-1kg', recipeVersions: { 'item:karahi-1kg': 1 } }, 2, versionOf);
    expect(uses(r)).toEqual({ chicken: 2 * KG, tomato: 1_000_000, oil: 300_000 });
    expect(r.notTracked).toEqual([]);
  });

  it('takes a plate of a pot dish from the cooked stock only: its raw ingredients left at cooking, never twice', () => {
    const r = saleUses({ menuItemId: 'daal', quantity: 3, variantId: 'daal-full', recipeVersions: { 'item:daal-full': 1 } }, 3, versionOf);
    expect(uses(r)).toEqual({ 'cooked-daal': 750_000 });
  });

  it('counts each size of a mixed pot and the add-ons', () => {
    const r = saleUses(
      { menuItemId: 'karahi', quantity: 1, sizeMix: [{ variantId: 'karahi-1kg', quantity: 1 }, { variantId: 'karahi-half', quantity: 1 }], modifierIds: ['makhan'], recipeVersions: { 'item:karahi-1kg': 1, 'item:karahi-half': 1, 'addon:makhan': 1 } },
      1,
      versionOf,
    );
    expect(uses(r)).toEqual({ chicken: 1_500_000, tomato: 750_000, oil: 225_000, butter: 25_000 });
  });

  it('marks parts without a kept verified version as Not tracked and takes nothing for them', () => {
    const r = saleUses({ menuItemId: 'karahi', quantity: 1, variantId: 'karahi-1kg', modifierIds: ['makhan'], recipeVersions: { 'addon:makhan': 1 } }, 1, versionOf);
    expect(r.notTracked).toEqual(['item:karahi-1kg']);
    expect(uses(r)).toEqual({ butter: 25_000 });
  });

  it('takes nothing raw for portions given from available food', () => {
    const r = saleUses({ menuItemId: 'karahi', quantity: 2, variantId: 'karahi-1kg', recipeVersions: { 'item:karahi-1kg': 1 } }, 1, versionOf);
    expect(uses(r)).toEqual({ chicken: KG, tomato: 500_000, oil: 150_000 });
    expect(saleUses({ menuItemId: 'karahi', quantity: 1, variantId: 'karahi-1kg', recipeVersions: { 'item:karahi-1kg': 1 } }, 0, versionOf).uses).toEqual([]);
  });

  it('gives back exactly what a line still holds (Undo)', () => {
    const taken = [
      { ingredientId: 'chicken', quantityMilli: -KG },
      { ingredientId: 'oil', quantityMilli: -150_000 },
      { ingredientId: 'oil', quantityMilli: 150_000 },
      { ingredientId: 'oil', quantityMilli: -150_000 },
    ];
    expect(netTaken(taken)).toEqual([
      { ingredientId: 'chicken', quantityMilli: KG },
      { ingredientId: 'oil', quantityMilli: 150_000 },
    ]);
  });
});

describe('ready food given to another order (owner, 2026-11-09)', () => {
  const food = { menuItemId: 'karahi', variantId: 'karahi-1kg', modifierIds: [], remaining: 1, safeUntil: '2026-11-09T15:00:00.000Z' };
  const newLine = { menuItemId: 'karahi', quantity: 1, variantId: 'karahi-1kg', modifierIds: [], isVoid: false, stock: { takenAt: null } };
  const now = Date.parse('2026-11-09T13:00:00.000Z');

  it('goes only to the same dish, size and add-ons', () => {
    expect(sameOrderDish(food, newLine)).toBe(true);
    expect(sameOrderDish(food, { ...newLine, variantId: 'karahi-half' })).toBe(false);
    expect(sameOrderDish(food, { ...newLine, modifierIds: ['makhan'] })).toBe(false);
    expect(checkGive({ food, line: newLine, ticketStatus: 'NEW', now })).toBeNull();
    expect(checkGive({ food, line: { ...newLine, variantId: 'karahi-half' }, ticketStatus: 'NEW', now })).toBe('NOT_SAME_DISH');
  });

  it('is never given twice, after its safe time or to a line already made', () => {
    expect(checkGive({ food: { ...food, remaining: 0 }, line: newLine, ticketStatus: 'NEW', now })).toBe('NOTHING_LEFT');
    expect(checkGive({ food, line: newLine, ticketStatus: 'NEW', now: Date.parse('2026-11-09T15:00:00.000Z') })).toBe('TIME_OVER');
    expect(checkGive({ food, line: newLine, ticketStatus: 'READY', now })).toBe('ALREADY_MADE');
    expect(checkGive({ food, line: { ...newLine, stock: { takenAt: null, fromAvailable: [{ availableId: 'f', quantity: 1, fromDailyNumber: 12, at: '', by: '' }] } }, ticketStatus: 'NEW', now })).toBe('ALREADY_GIVEN');
    expect(availableState(food, now)).toBe('AVAILABLE');
    expect(availableState(food, Date.parse('2026-11-09T16:00:00.000Z'))).toBe('TIME_OVER');
    expect(safeUntilOf('2026-11-09T12:00:00.000Z', 3)).toBe('2026-11-09T15:00:00.000Z');
  });

  it('is on by default for Karahi, Handi, BBQ and Fish, never for a dish sold from a pot', () => {
    expect(defaultReuse('Karahi')).toEqual({ enabled: true, safeHours: 3, overnight: false });
    expect(defaultReuse('Roti & Naan').enabled).toBe(false);
    expect(reuseOf({ preparedItemId: 'cooked-daal' }, 'Karahi').enabled).toBe(false);
  });
});

describe('food made, then cancelled or voided', () => {
  it('is never wastage by itself: served food can only be wastage, the rest has its choices', () => {
    expect(outcomeChoices({ served: true, reusable: true, returnable: true })).toEqual(['WASTE']);
    expect(outcomeChoices({ served: false, reusable: true, returnable: false })).toEqual(['AVAILABLE', 'WASTE']);
    expect(outcomeChoices({ served: false, reusable: false, returnable: true })).toEqual(['BACK_TO_STOCK', 'WASTE']);
    expect(checkOutcome(undefined, ['WASTE'])).toBe('CHOOSE');
    expect(checkOutcome({ kind: 'AVAILABLE' }, ['AVAILABLE', 'WASTE'])).toBe('NOT_SAFE');
    expect(checkOutcome({ kind: 'AVAILABLE', safe: true }, ['WASTE'])).toBe('NOT_ALLOWED');
    expect(checkOutcome({ kind: 'WASTE', reason: ' ' }, ['WASTE'])).toBe('REASON_REQUIRED');
    expect(checkOutcome({ kind: 'WASTE', reason: 'Dropped' }, ['WASTE'])).toBeNull();
  });

  it('asks for the closing review from the closing time, and for food left from an earlier day', () => {
    const madeToday = '2026-11-09T13:00:00.000Z'; // 18:00 Karachi
    expect(closingReviewDue('23:00', madeToday, new Date('2026-11-09T17:30:00.000Z'), 'Asia/Karachi')).toBeNull(); // 22:30
    expect(closingReviewDue('23:00', madeToday, new Date('2026-11-09T18:05:00.000Z'), 'Asia/Karachi')).toBe('2026-11-09'); // 23:05
    expect(closingReviewDue('23:00', madeToday, new Date('2026-11-09T20:00:00.000Z'), 'Asia/Karachi')).toBe('2026-11-10'); // 01:00 next day
    expect(closingReviewDue('23:00', null, new Date('2026-11-09T18:05:00.000Z'), 'Asia/Karachi')).toBeNull();
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canMixSizes, formatKg, sizeGrams, sizeMixFor } from './index';

const karahi = {
  variants: [
    { id: 'kg', name: '1 kg', price: 260_000, sort: 1 },
    { id: 'half', name: '½ kg', price: 140_000, sort: 2 },
    { id: 'pao', name: 'Pao', price: 75_000, sort: 3 },
  ],
};
const pizza = {
  variants: [
    { id: 's', name: 'Small', price: 60_000, sort: 1 },
    { id: 'm', name: 'Medium', price: 85_000, sort: 2 },
  ],
};

test('size weights come from their names; only all-weight sizes can mix', () => {
  assert.equal(sizeGrams('1 kg'), 1000);
  assert.equal(sizeGrams('½ kg'), 500);
  assert.equal(sizeGrams('Pao'), 250);
  assert.equal(sizeGrams('Half Pao'), 125);
  assert.equal(sizeGrams('Small'), null);
  assert.equal(canMixSizes(karahi), true);
  assert.equal(canMixSizes(pizza), false);
  assert.equal(canMixSizes({ variants: [karahi.variants[0]!] }), false);
  assert.equal(formatKg(1500), '1.5 kg');
  assert.equal(formatKg(750), '0.75 kg');
});

test('dedh kg = 1 kg + ½ kg: one line, Rs. 2,600 + Rs. 1,400 = Rs. 4,000', () => {
  // Picks in any order; the label follows the menu order
  assert.deepEqual(sizeMixFor(karahi, [{ variantId: 'half', quantity: 1 }, { variantId: 'kg', quantity: 1 }]), {
    label: '1.5 kg: 1 kg + ½ kg',
    grams: 1500,
    price: 400_000,
  });
  assert.deepEqual(
    sizeMixFor(karahi, [{ variantId: 'kg', quantity: 2 }, { variantId: 'half', quantity: 1 }, { variantId: 'pao', quantity: 1 }]),
    { label: '2.75 kg: 2 × 1 kg + ½ kg + Pao', grams: 2750, price: 735_000 },
  );
});

test('not a mix: one size, a repeated or unknown size, a bad quantity, or sizes that are not weights', () => {
  assert.equal(sizeMixFor(karahi, [{ variantId: 'kg', quantity: 2 }]), null);
  assert.equal(sizeMixFor(karahi, [{ variantId: 'kg', quantity: 1 }, { variantId: 'kg', quantity: 1 }]), null);
  assert.equal(sizeMixFor(karahi, [{ variantId: 'kg', quantity: 1 }, { variantId: 'nope', quantity: 1 }]), null);
  assert.equal(sizeMixFor(karahi, [{ variantId: 'kg', quantity: 0 }, { variantId: 'half', quantity: 1 }]), null);
  assert.equal(sizeMixFor(karahi, [{ variantId: 'kg', quantity: 51 }, { variantId: 'half', quantity: 1 }]), null);
  assert.equal(sizeMixFor(pizza, [{ variantId: 's', quantity: 1 }, { variantId: 'm', quantity: 1 }]), null);
});

test('plates and packings mix too (owner, 2026-11-08): Full plate + Half plate is one line; kg and plates mix; Small / Medium do not', () => {
  const daal = {
    variants: [
      { id: 'full', name: 'Full plate', price: 20_000, sort: 1 },
      { id: 'half', name: 'Half plate', price: 15_000, sort: 2 },
    ],
  };
  assert.equal(canMixSizes(daal), true);
  assert.deepEqual(sizeMixFor(daal, [{ variantId: 'half', quantity: 1 }, { variantId: 'full', quantity: 2 }]), {
    label: '2 × Full plate + Half plate',
    grams: 0,
    price: 55_000,
  });
  const biryani = { variants: [...karahi.variants.slice(0, 2), ...daal.variants.map((v) => ({ ...v, sort: v.sort + 2 }))] };
  assert.equal(canMixSizes(biryani), true);
  assert.equal(sizeMixFor(biryani, [{ variantId: 'kg', quantity: 1 }, { variantId: 'full', quantity: 1 }])?.label, '1 kg + Full plate');
  assert.equal(canMixSizes({ variants: [...daal.variants, { id: 's', name: 'Small', price: 1, sort: 3 }] }), false);
});

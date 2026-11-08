import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardPrice, checkAddonGroup, checkMenuItem, dishKey, guessPortionMilli, menuNameFor, paisaToInput, parseRupees, portionLines, sameDish } from './index';

test('prices are typed in rupees and kept in paisa', () => {
  assert.equal(parseRupees('850'), 85_000);
  assert.equal(parseRupees(' Rs. 1,200 '), 120_000);
  assert.equal(parseRupees('850.5'), 85_050);
  for (const bad of ['', 'abc', '-5', '8.555', '2000000']) assert.equal(parseRupees(bad), null, bad);
  assert.equal(paisaToInput(85_000), '850');
  assert.equal(paisaToInput(85_050), '850.50');
});

test('menu item: a new name in its category and a price above zero, or one per size', () => {
  const base = { name: 'Tikka Pizza', description: '', price: 90_000, sizes: [] };
  assert.equal(checkMenuItem(base, ['Classic Pizza']), null);
  assert.deepEqual(checkMenuItem({ ...base, name: ' classic pizza' }, ['Classic Pizza']), { problem: 'NAME_TAKEN' });
  assert.deepEqual(checkMenuItem({ ...base, price: 0 }, []), { problem: 'PRICE_INVALID' });
  assert.deepEqual(checkMenuItem({ ...base, price: null }, []), { problem: 'PRICE_INVALID' });
  const sized = { ...base, price: null, sizes: [{ name: 'Small', price: 60_000 }, { name: 'Large', price: 120_000 }] };
  assert.equal(checkMenuItem(sized, []), null);
  assert.deepEqual(checkMenuItem({ ...sized, sizes: [...sized.sizes, { name: 'small', price: 1 }] }, []), { problem: 'SIZE_NAME_TAKEN', detail: 'small' });
  assert.deepEqual(checkMenuItem({ ...sized, sizes: [{ name: 'Small', price: null }] }, []), { problem: 'PRICE_INVALID', detail: 'Small' });
  assert.deepEqual(checkMenuItem({ ...sized, sizes: [{ name: ' ', price: 100 }] }, []), { problem: 'SIZE_NAME_REQUIRED' });
});

test('add-on group: a name, add-ons (free is fine) and 0 ≤ min ≤ max ≤ number of add-ons', () => {
  const group = { name: 'Pizza extras', minSelect: 0, maxSelect: 2, addons: [{ name: 'Extra cheese', price: 15_000 }, { name: 'Oregano', price: 0 }] };
  assert.equal(checkAddonGroup(group, []), null);
  assert.deepEqual(checkAddonGroup({ ...group, maxSelect: 3 }, []), { problem: 'GROUP_RULE_INVALID' });
  assert.deepEqual(checkAddonGroup({ ...group, minSelect: 2, maxSelect: 1 }, []), { problem: 'GROUP_RULE_INVALID' });
  assert.deepEqual(checkAddonGroup({ ...group, addons: [] }, []), { problem: 'GROUP_RULE_INVALID' });
  assert.deepEqual(checkAddonGroup(group, ['pizza EXTRAS']), { problem: 'NAME_TAKEN' });
  assert.deepEqual(checkAddonGroup({ ...group, addons: [{ name: 'Oregano', price: -1 }] , maxSelect: 1 }, []), { problem: 'PRICE_INVALID', detail: 'Oregano' });
});

test('a product card shows the first size (1 kg), not the cheapest (Pao); no sizes = the one price', () => {
  const karahi = { basePrice: 80_000, variants: [{ name: 'Pao', price: 80_000, sort: 3 }, { name: '1 kg', price: 280_000, sort: 1 }, { name: '½ kg', price: 150_000, sort: 2 }] };
  assert.deepEqual(cardPrice(karahi), { price: 280_000, sizeName: '1 kg' });
  assert.deepEqual(cardPrice({ basePrice: 45_000, variants: [] }), { price: 45_000, sizeName: null });
});

test('one dish, one product: "Cooked Chicken Biryani" is the menu\'s Chicken Biryani, never a second product', () => {
  assert.equal(dishKey('Cooked Chicken Biryani'), 'chicken biryani');
  assert.equal(dishKey(' Cooked Rice (zeera) '), 'rice zeera');
  assert.ok(sameDish('Cooked Daal Mash', 'daal  mash'));
  assert.ok(!sameDish('Cooked Daal Mash', 'Daal Chana'));
  assert.ok(!sameDish('Cooked', 'Prepared'), 'a name of only these words is no dish');
  assert.equal(menuNameFor('Cooked Chicken Biryani'), 'Chicken Biryani');
  assert.equal(menuNameFor('Naan dough'), 'Naan dough');
});

test('a size sold from a cooked dish takes its portion: weights by name, plates and packings by the owner\'s estimates', () => {
  assert.equal(guessPortionMilli('Full plate'), 250_000);
  assert.equal(guessPortionMilli('Half plate'), 125_000);
  assert.equal(guessPortionMilli('Full packing'), 500_000);
  assert.equal(guessPortionMilli('Half packing'), 250_000);
  assert.equal(guessPortionMilli('½ kg'), 500_000);
  assert.equal(guessPortionMilli('1 kg'), 1_000_000);
  assert.equal(guessPortionMilli('Pao'), 250_000);
  assert.equal(guessPortionMilli(null), 250_000, 'no sizes: one plate');
  assert.deepEqual(portionLines('biryani', 250_000), [{ ingredientId: 'biryani', quantityMilli: 250_000, lossBps: 0, optional: false, substituteId: null }]);
});

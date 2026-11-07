// Cooked food P1 (owner, 2026-11-07, with his changes): each cooked dish (Daal Mash, Chana, Masoor, Makhni, Qeema, Chicken Qorma,
// Biryani, Rice) is a prepared item whose recipe is written ONCE for its main raw ingredient. After that he only enters supplier
// bills: the raw stock goes up and the recipe follows it. His example: no daal mash → Out of Stock (the saved recipe stays);
// buy 5 kg → the recipe for 5 kg; buy 2 kg more → 7 kg, with every ingredient and the estimated cost. Buying is not cooking:
// nothing is cooked or taken from stock, and the khata only has the two bills. The 21 → 22 upgrade keeps what he made.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:cooked
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'cooked');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = id(101);
const ING = (n) => id(1300 + n);
const DAAL_MASH = ING(45);
const KIRYANA = 'Madina Kiryana Store — DEMO';
const COOKED = ['Cooked Daal Mash', 'Cooked Daal Chana', 'Cooked Daal Masoor', 'Cooked Daal Makhni', 'Cooked Qeema', 'Cooked Chicken Qorma', 'Cooked Chicken Biryani', 'Cooked Rice (zeera)'];
const DESKTOP = { width: 1440, height: 900 };
const LAPTOP = { width: 1278, height: 627 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function open(viewport) {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, OWNER]);
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const builder = (page) => page.locator('main [data-recipe-builder]');
const cook = (page) => builder(page).locator('[data-cook-any]');
const card = (page, name) => page.locator(`main [data-prepared-item="${name}"]`);
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const rupees = (text) => Number(text.replace(/^Rs\.\s*/, '').replace(/,/g, ''));
const bill = (page) => page.locator('main [data-purchase-bill]');
async function openPrepared(page) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await page.locator('main [data-recipe-summary]').first().waitFor();
  await page.getByRole('tab', { name: 'Prepared items' }).click();
  await card(page, 'Naan dough').waitFor();
}
/** A supplier bill for daal mash from the kiryana store, at his usual rate. */
async function buyDaalMash(page, kg) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.locator(`main [data-supplier-card="${KIRYANA}"]`).click();
  await page.locator('main [data-supplier-workspace]').getByRole('button', { name: 'New Purchase (Bill)' }).click();
  await bill(page).waitFor();
  await bill(page).getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill('daal mash');
  await bill(page).getByRole('button', { name: 'Add Daal mash to the bill' }).click();
  await bill(page).locator('[data-bill-line="Daal mash"][data-bill-unit="main"]').getByRole('textbox', { name: 'Quantity of Daal mash received' }).fill(String(kg));
  await bill(page).getByRole('button', { name: 'Save Purchase' }).click();
  await page.locator('main [data-supplier-workspace]').waitFor();
}
async function noSidewaysScroll(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `${label}: the page scrolls sideways by ${wide}px`);
}

try {
  console.log('\n1. No daal mash in stock: Out of Stock, the saved recipe stays');
  const owner = await open(DESKTOP);
  // His example starts from no daal mash: the 8 kg sample stock is counted out with Adjust Stock.
  await owner.getByRole('button', { name: 'Adjust Stock' }).click();
  const adjust = owner.getByRole('dialog');
  await adjust.getByLabel('Ingredient').selectOption({ label: 'Daal mash (8 kg)' });
  await adjust.getByRole('radio', { name: 'Remove' }).click();
  await adjust.getByLabel('Quantity').fill('8');
  await adjust.getByRole('radio', { name: 'Counted again' }).click();
  await adjust.getByRole('button', { name: 'Save change' }).click();
  await adjust.waitFor({ state: 'detached' });
  await openPrepared(owner);
  for (const name of COOKED) await card(owner, name).locator('[data-cooked-card]').waitFor();
  const daal = card(owner, 'Cooked Daal Mash');
  await daal.getByText('Recipe for 1 kg Daal mash').waitFor();
  await daal.locator('[data-raw-stock="out"]').getByText('Out of Stock').waitFor();
  await daal.getByText('Cost of the saved recipe (1 kg):').waitFor();
  const oneKg = rupees(await daal.locator('strong').innerText());
  await card(owner, 'Cooked Chicken Biryani').getByText('Recipe for 5 kg Basmati rice').waitFor();
  assert.equal(await card(owner, 'Cooked Chicken Biryani').locator('[data-raw-stock]').innerText(), '10 kg', 'rice in stock');
  await card(owner, 'Cooked Chicken Biryani').locator('[data-shared]').getByText('Same Basmati rice as Cooked Rice (zeera)').waitFor();
  assert.equal(await card(owner, 'Naan dough').locator('[data-cooked-card]').count(), 0, 'naan dough (no main ingredient) stays as it was');
  assert.equal(await owner.locator('main').getByText(/full plates/).count(), 0, 'no plates for now (owner: later)');
  await shot(owner, '01-desktop-out-of-stock');
  ok(`Daal Mash: Out of Stock, "Recipe for 1 kg Daal mash" stays (Rs. ${oneKg}); Biryani for 5 kg rice, 10 kg in stock, rice shared with Zeera Rice; no plates`);

  console.log('\n2. Supplier bill: 5 kg daal mash → the recipe for 5 kg');
  await buyDaalMash(owner, 5);
  await owner.getByText('Recipes updated: Cooked Daal Mash now for 5 kg (was out of stock)').waitFor();
  await openPrepared(owner);
  assert.equal(await daal.locator('[data-raw-stock]').innerText(), '5 kg');
  const five = rupees(await daal.locator('[data-cooked-cost]').innerText());
  assert.ok(Math.abs(five - 5 * oneKg) <= 1, `5 kg costs 5 × 1 kg (${five} vs ${5 * oneKg})`);
  await owner.locator('main [data-latest-purchase]').getByText('Latest purchase: Daal mash +5 kg').waitFor();
  await owner.locator('main [data-latest-dish="Cooked Daal Mash"]').getByText('recipe now for 5 kg (was out of stock)').waitFor();
  ok(`bill saved → "Recipes updated: Cooked Daal Mash now for 5 kg"; card 5 kg, Rs. ${five} = 5 × the 1 kg recipe`);

  console.log('\n3. 2 kg more → 7 kg, every ingredient and the cost follow');
  await buyDaalMash(owner, 2);
  await owner.getByText('Recipes updated: Cooked Daal Mash now for 7 kg (was 5 kg)').waitFor();
  await openPrepared(owner);
  assert.equal(await daal.locator('[data-raw-stock]').innerText(), '7 kg');
  const seven = rupees(await daal.locator('[data-cooked-cost]').innerText());
  assert.ok(Math.abs(seven - 7 * oneKg) <= 1, `7 kg costs 7 × 1 kg (${seven} vs ${7 * oneKg})`);
  await owner.locator('main [data-latest-dish="Cooked Daal Mash"]').getByText('recipe now for 7 kg (was 5 kg)').waitFor();
  assert.equal(await daal.locator('[data-cooked-lines]').count(), 0, 'ingredients only when opened');
  await daal.getByRole('button', { name: 'Show ingredients for 7 kg' }).click();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Cooking oil' }).getByText('1.05 litres').waitFor();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Onions' }).getByText('1.75 kg').waitFor();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Onions' }).getByText('20 kg in stock').waitFor();
  await daal.scrollIntoViewIfNeeded();
  await shot(owner, '02-desktop-daal-mash-7kg');
  const data = await saved(owner);
  const daalMoves = data.inventory.movements.filter((m) => m.ingredientId === DAAL_MASH);
  assert.deepEqual(
    daalMoves.map((m) => [m.type, m.quantityMilli]),
    [['OPENING', 8_000_000], ['ADJUSTMENT', -8_000_000], ['PURCHASE', 5_000_000], ['PURCHASE', 2_000_000]],
    'after the count, only the two bills changed the daal stock',
  );
  const cookedMoves = data.inventory.movements.filter((m) => COOKED.some((n) => data.inventory.ingredients.find((i) => i.id === m.ingredientId)?.name === n));
  assert.equal(cookedMoves.length, 0, 'buying is not cooking: no cooked stock');
  const kiryana = data.inventory.suppliers.find((s) => s.name === KIRYANA);
  const bills = data.inventory.khata.filter((e) => e.supplierId === kiryana.id && e.kind === 'PURCHASE');
  assert.equal(bills.length, 2, 'the khata has the two bills and nothing from the recipe');
  ok(`7 kg: oil 1.05 litres, onions 1.75 kg (20 kg in stock), Rs. ${seven} = 7 × 1 kg; after the count only the 2 bills moved the stock; no cooked stock; 2 khata bills`);

  console.log('\n4. Recipe Builder: the recipe for your stock, and Try another amount');
  await owner.getByRole('button', { name: 'Edit recipe: Cooked Daal Mash' }).click();
  await builder(owner).waitFor();
  assert.equal(await builder(owner).locator('[data-main-ingredient]').inputValue(), DAAL_MASH);
  assert.equal(await builder(owner).locator('[data-builder-stock]').innerText(), '7 kg');
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '7 kg');
  await cook(owner).locator('[data-scaled-lines] li', { hasText: 'Daal mash' }).getByText('7 kg').waitFor();
  await cook(owner).getByRole('button', { name: 'Try another amount' }).click();
  await cook(owner).getByRole('textbox', { name: 'Amount of Daal mash' }).fill('10');
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '10 kg');
  await cook(owner).getByRole('textbox', { name: 'Amount of Daal mash' }).fill('abc');
  await cook(owner).getByText('Type an amount, for example 7 or 2.5.').waitFor();
  await cook(owner).getByRole('button', { name: 'Back to my stock' }).click();
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '7 kg');
  assert.equal(await builder(owner).getByRole('button', { name: 'Save Draft' }).isDisabled(), true, 'looking at amounts changes nothing to save');
  await cook(owner).scrollIntoViewIfNeeded();
  await shot(owner, '03-desktop-builder-for-stock');
  ok('builder: daal mash in stock 7 kg, recipe for 7 kg; Try another amount 10 kg; Back to my stock; nothing to save');

  console.log('\n5. A new cooked dish, written once for 2 kg, follows the daal chana stock');
  await builder(owner).getByRole('button', { name: 'Recipes' }).first().click();
  await card(owner, 'Naan dough').waitFor();
  await owner.getByRole('button', { name: 'Add prepared item' }).click();
  await builder(owner).getByLabel('Name', { exact: true }).fill('Cooked Chana Pulao');
  await builder(owner).getByLabel('Category').selectOption('GRAINS');
  await builder(owner).getByLabel('Ingredient 1').selectOption({ label: 'Daal chana' });
  await builder(owner).getByLabel('Unit 1').selectOption('kg');
  await builder(owner).getByLabel('Quantity 1').fill('2');
  await builder(owner).getByRole('button', { name: 'Add ingredient', exact: true }).click();
  await builder(owner).getByLabel('Ingredient 2').selectOption({ label: 'Cooking oil' });
  await builder(owner).getByLabel('Unit 2').selectOption('ml');
  await builder(owner).getByLabel('Quantity 2').fill('300');
  await builder(owner).getByLabel('One batch makes').fill('5.6');
  await cook(owner).getByText('Choose the main raw ingredient to see the recipe for your stock.').waitFor();
  await builder(owner).locator('[data-main-ingredient]').selectOption({ label: 'Daal chana' });
  await builder(owner).locator('[data-main-hint]').getByText('Recipe for 2 kg Daal chana').waitFor();
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '10 kg', 'daal chana in stock');
  await cook(owner).locator('[data-scaled-lines] li', { hasText: 'Cooking oil' }).getByText('1.5 litres').waitFor();
  await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
  await builder(owner).waitFor({ state: 'detached' });
  await card(owner, 'Cooked Chana Pulao').getByText('Recipe for 2 kg Daal chana').waitFor();
  assert.equal(await card(owner, 'Cooked Chana Pulao').locator('[data-raw-stock]').innerText(), '10 kg');
  await card(owner, 'Cooked Chana Pulao').locator('[data-shared]').getByText('Same Daal chana as Cooked Daal Chana').waitFor();
  const after = await saved(owner);
  const pulao = after.inventory.ingredients.find((i) => i.name === 'Cooked Chana Pulao');
  const recipe = after.inventory.recipes.find((r) => r.target.kind === 'PREPARED' && r.target.ingredientId === pulao.id);
  assert.equal(recipe.versions.at(-1).mainIngredientId, ING(46));
  ok('"Cooked Chana Pulao" for 2 kg daal chana: 10 kg in stock → oil 1.5 litres; saved verified; shares daal chana with Daal Chana');

  console.log('\n6. Laptop and phone');
  await owner.setViewportSize(LAPTOP);
  await noSidewaysScroll(owner, 'laptop cards');
  await shot(owner, '04-laptop-prepared-items');
  await owner.setViewportSize(PHONE);
  await noSidewaysScroll(owner, 'phone cards');
  await daal.scrollIntoViewIfNeeded();
  await shot(owner, '05-phone-daal-card');
  await owner.getByRole('button', { name: 'Edit recipe: Cooked Chicken Biryani' }).click();
  await builder(owner).waitFor();
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '10 kg');
  await noSidewaysScroll(owner, 'phone builder');
  await cook(owner).scrollIntoViewIfNeeded();
  await shot(owner, '06-phone-biryani-for-stock');
  ok('laptop 1278 × 627 and phone 390 × 844: no sideways scroll; Biryani recipe for the 10 kg rice in stock');

  console.log('\n7. Saved data of version 21 gets the cooked food and keeps his own dish');
  await owner.evaluate(
    ([key, cookedIds, rawMoves]) => {
      const old = JSON.parse(window.localStorage.getItem(key));
      old.version = 21;
      old.inventory.ingredients = old.inventory.ingredients.filter((i) => !cookedIds.includes(i.id));
      old.inventory.recipes = old.inventory.recipes.filter((r) => !(r.target.kind === 'PREPARED' && cookedIds.includes(r.target.ingredientId)));
      old.inventory.movements = old.inventory.movements.filter((m) => !rawMoves.includes(m.id));
      window.localStorage.setItem(key, JSON.stringify(old));
    },
    [DATA_KEY, [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91].map(ING), [1481, 1482, 1483].map(id)],
  );
  await owner.setViewportSize(DESKTOP);
  await openPrepared(owner);
  for (const name of COOKED) await card(owner, name).waitFor();
  await card(owner, 'Cooked Chana Pulao').waitFor();
  const upgraded = await saved(owner);
  assert.equal(upgraded.version, 22);
  assert.ok(upgraded.inventory.ingredients.some((i) => i.name === 'Daal masoor' && i.kind === 'BOUGHT'));
  assert.ok(upgraded.inventory.suppliers.find((s) => s.name === KIRYANA).productIds.includes(ING(81)), 'daal masoor joins the kiryana range');
  ok('version 21 → 22: cooked dishes, daal masoor, kali daal and beef qeema added; "Cooked Chana Pulao" kept');

  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`);
  console.log('\nAll cooked-food P1 checks passed (DEMO).');
} finally {
  await browser.close();
}

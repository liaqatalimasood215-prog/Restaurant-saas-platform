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
/** Rs. 4,477.75 → 4477.75; equal within a few paisa (every line is rounded on its own) */
const near = (a, b) => Math.abs(a - b) <= 0.05;
const money = (rupeesValue) => rupeesValue.toLocaleString('en-PK', { minimumFractionDigits: rupeesValue % 1 ? 2 : 0, maximumFractionDigits: 2 });
/**
 * A supplier bill for daal mash from the kiryana store, at his usual rate. Before saving, the bill shows this purchase's recipe
 * (its cost is returned); after saving, the summary of this purchase's recipes stays open until Done.
 */
async function buyDaalMash(page, kg, shotName) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.locator(`main [data-supplier-card="${KIRYANA}"]`).click();
  await page.locator('main [data-supplier-workspace]').getByRole('button', { name: 'New Purchase (Bill)' }).click();
  await bill(page).waitFor();
  await bill(page).getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill('daal mash');
  await bill(page).getByRole('button', { name: 'Add Daal mash to the bill' }).click();
  await bill(page).locator('[data-bill-line="Daal mash"][data-bill-unit="main"]').getByRole('textbox', { name: 'Quantity of Daal mash received' }).fill(String(kg));
  const preview = bill(page).locator('[data-purchase-preview] [data-preview-dish="Cooked Daal Mash"]');
  await preview.getByText(`Cooked Daal Mash: recipe for ${kg} kg →`, { exact: false }).waitFor();
  if (shotName) {
    await bill(page).locator('[data-purchase-preview]').scrollIntoViewIfNeeded();
    await shot(page, shotName);
  }
  const previewCost = rupees((await preview.innerText()).split('→')[1].trim());
  await bill(page).getByRole('button', { name: 'Save Purchase' }).click();
  const summary = page.locator('[data-purchase-summary]');
  await summary.waitFor();
  return { preview: previewCost, summary };
}
async function doneAfterBill(page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
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
  // Owner, 2026-11-08: Prepared items opens on the whole screen; "← Recipes" goes back to the overview
  assert.equal(await owner.getByRole('heading', { name: 'Inventory & Suppliers' }).count(), 0, 'the Inventory title steps aside');
  assert.equal(await owner.locator('main [data-recipe-summary]').count(), 0, 'the four food-cost cards step aside');
  await owner.getByRole('button', { name: 'Recipes', exact: true }).click();
  await owner.locator('main [data-recipe-summary]').first().waitFor();
  await owner.getByRole('heading', { name: 'Inventory & Suppliers' }).waitFor();
  await owner.getByRole('tab', { name: 'Prepared items' }).click();
  await card(owner, 'Naan dough').waitFor();
  const daal = card(owner, 'Cooked Daal Mash');
  await daal.locator('[data-dish-state="OUT"]').getByText('Out of Stock').waitFor();
  await daal.locator('[data-raw-stock="out"]').getByText('Out of Stock').waitFor();
  await daal.getByText('(saved recipe, 1 kg)').waitFor();
  const oneKg = rupees(await daal.locator('[data-cooked-cost]').innerText());
  // What the recipe is for shows with its ingredients (the chevron opens them too)
  await daal.getByRole('button', { name: 'Open Cooked Daal Mash' }).click();
  await daal.locator('[data-main-line]').getByText('Recipe for 1 kg Daal mash, worked out for 1 kg:').waitFor();
  await daal.getByRole('button', { name: 'Open Cooked Daal Mash' }).click();
  const biryani = card(owner, 'Cooked Chicken Biryani');
  assert.equal(await biryani.locator('[data-raw-stock]').innerText(), '10 kg*', 'rice in stock, shared');
  await biryani.locator('[data-shared]').getByText('Basmati rice (Shared)').waitFor();
  assert.ok((await biryani.locator('p[title*="Cooked Rice (zeera)"]').count()) === 1, 'the shared line names the other dish');
  await owner.locator('main [data-shared-note]').getByText('counted once', { exact: false }).waitFor();
  await biryani.getByRole('button', { name: 'Show ingredients for 10 kg' }).click();
  await biryani.locator('[data-main-line]').getByText('Recipe for 5 kg Basmati rice', { exact: false }).waitFor();
  await biryani.getByRole('button', { name: 'Hide ingredients' }).click();
  assert.equal(await card(owner, 'Naan dough').locator('[data-cooked-card]').count(), 0, 'naan dough (no main ingredient) stays as it was');
  assert.equal(await owner.locator('main').getByText(/full plates/).count(), 0, 'no plates for now (owner: later)');
  // The four summary cards of his picture, from the real data
  const stat = (key) => owner.locator(`main [data-stat="${key}"]`).innerText();
  assert.deepEqual([await stat('ALL'), await stat('OK'), await stat('SHORT'), await stat('OUT')], ['9', '7', '0', '1']);
  await shot(owner, '01-desktop-out-of-stock');
  // Filter chips: cooked food by its stock state, and the other prepared items
  const filters = owner.locator('main [data-prepared-filters]');
  const shown = () => owner.locator('main [data-prepared-item]').evaluateAll((list) => list.map((li) => li.getAttribute('data-prepared-item')));
  assert.equal(await filters.getByRole('button', { name: /^All/ }).getAttribute('aria-pressed'), 'true');
  await filters.getByRole('button', { name: /^Out of Stock/ }).click();
  assert.deepEqual(await shown(), ['Cooked Daal Mash']);
  await shot(owner, '01b-desktop-filter-out-of-stock');
  await filters.getByRole('button', { name: /^Dough & sauces/ }).click();
  assert.deepEqual(await shown(), ['Naan dough']);
  await filters.getByRole('button', { name: /^All/ }).click();
  assert.equal((await shown()).length, 9);
  // Search by the dish or its main raw ingredient
  const searchBox = owner.getByRole('searchbox', { name: 'Search recipe' });
  await searchBox.fill('qeema');
  assert.deepEqual(await shown(), ['Cooked Qeema']);
  await searchBox.fill('basmati');
  assert.deepEqual((await shown()).sort(), ['Cooked Chicken Biryani', 'Cooked Rice (zeera)']);
  await searchBox.fill('pizza');
  await owner.getByText('No prepared item matches "pizza".').waitFor();
  await searchBox.fill('');
  // Cards or a list
  await owner.getByRole('button', { name: 'Show as a list' }).click();
  assert.equal(await owner.locator('main [data-prepared-layout]').getAttribute('data-prepared-layout'), 'list');
  assert.equal((await shown()).length, 9);
  await shot(owner, '01c-desktop-list-view');
  await owner.getByRole('button', { name: 'Show as cards' }).click();
  ok('summary 9 / 7 / 0 / 1; filters: Out of Stock → Daal Mash, Dough & sauces → Naan dough, All → 9; search qeema / basmati / pizza; list and cards');
  ok(`Daal Mash: Out of Stock, "Recipe for 1 kg Daal mash" stays (Rs. ${oneKg}); Biryani for 5 kg rice, 10 kg in stock, rice shared with Zeera Rice; no plates`);

  console.log('\n2. P3, his example: a 5 kg purchase gets its own recipe for 5 kg');
  const first = await buyDaalMash(owner, 5, '02a-desktop-bill-preview-5kg');
  assert.ok(near(first.preview, 5 * oneKg), `preview: 5 kg → ${first.preview} (5 × ${oneKg})`);
  await owner.getByText('Recipes updated: Cooked Daal Mash now for 5 kg (was out of stock)').waitFor();
  const summaryDish = first.summary.locator('[data-summary-dish="Cooked Daal Mash"]');
  assert.ok(near(rupees(await summaryDish.locator('[data-summary-cost]').innerText()), 5 * oneKg), 'the saved recipe of this purchase costs 5 × the 1 kg recipe');
  await summaryDish.locator('[data-purchase-lines] li', { hasText: 'Cooking oil' }).getByText('750 ml').waitFor();
  await summaryDish.locator('[data-summary-total]').getByText('Total Daal mash stock now: 5 kg', { exact: false }).waitFor();
  await shot(owner, '02b-desktop-purchase-summary-5kg');
  await doneAfterBill(owner);
  ok(`bill preview and saved summary: 5 kg daal mash → recipe for 5 kg, Rs. ${first.preview} (5 × Rs. ${oneKg}); oil 750 ml; total stock 5 kg shown apart`);

  console.log('\n3. A separate 8 kg purchase gets its own recipe for 8 kg; the total stock (13 kg) stays apart');
  const second = await buyDaalMash(owner, 8);
  assert.ok(near(second.preview, 8 * oneKg), `preview: 8 kg → ${second.preview} (8 × ${oneKg})`);
  const secondDish = second.summary.locator('[data-summary-dish="Cooked Daal Mash"]');
  assert.ok(near(rupees(await secondDish.locator('[data-summary-cost]').innerText()), 8 * oneKg));
  await secondDish.locator('[data-purchase-lines] li', { hasText: 'Cooking oil' }).getByText('1.2 litres').waitFor();
  await secondDish.locator('[data-summary-total]').getByText('Total Daal mash stock now: 13 kg', { exact: false }).waitFor();
  await doneAfterBill(owner);
  await openPrepared(owner);
  assert.equal(await daal.locator('[data-raw-stock]').innerText(), '13 kg', 'the total raw stock: 5 + 8');
  // 13 kg needs 260 g coriander leaves; 200 g are in stock: Not Enough, and the opened list says how much is short
  await daal.locator('[data-dish-state="SHORT"]').getByText('Not Enough').waitFor();
  const thirteen = rupees(await daal.locator('[data-cooked-cost]').innerText());
  assert.ok(near(thirteen, 13 * oneKg), `13 kg costs 13 × 1 kg (${thirteen})`);
  await daal.locator('[data-purchases-line]').getByText(`2 · last 8 kg → Rs. ${money(second.preview)}`).waitFor();
  await daal.locator('[data-purchases-line]').click();
  const rows = daal.locator('[data-dish-purchases] [data-purchase-amount]');
  assert.deepEqual(await rows.allInnerTexts(), [`8 kg → Rs. ${money(second.preview)}`, `5 kg → Rs. ${money(first.preview)}`], 'each purchase with its own recipe, newest first');
  await daal.locator('[data-dish-purchases] [data-purchase-recipe]').nth(1).getByRole('button').click();
  await daal.locator('[data-dish-purchases] [data-purchase-lines] li', { hasText: 'Cooking oil' }).getByText('750 ml').waitFor();
  assert.equal(await owner.locator('main [data-recent-purchases] [data-recent-purchase="Cooked Daal Mash"]').count(), 2, 'Recent purchases lists both');
  await daal.scrollIntoViewIfNeeded();
  await shot(owner, '02c-desktop-daal-purchases');
  assert.equal(await daal.locator('[data-cooked-lines]').count(), 0, 'ingredients only when opened');
  await daal.getByRole('button', { name: 'Show ingredients for 13 kg' }).click();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Cooking oil' }).getByText('1.95 litres').waitFor();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Onions' }).getByText('3.25 kg').waitFor();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Onions' }).getByText('20 kg in stock').waitFor();
  await daal.locator('[data-cooked-lines] li', { hasText: 'Coriander leaves' }).getByText('60 g short').waitFor();
  const data = await saved(owner);
  const daalMoves = data.inventory.movements.filter((m) => m.ingredientId === DAAL_MASH);
  assert.deepEqual(
    daalMoves.map((m) => [m.type, m.quantityMilli]),
    [['OPENING', 8_000_000], ['ADJUSTMENT', -8_000_000], ['PURCHASE', 5_000_000], ['PURCHASE', 8_000_000]],
    'after the count, only the two bills changed the daal stock',
  );
  const cookedMoves = data.inventory.movements.filter((m) => COOKED.some((n) => data.inventory.ingredients.find((i) => i.id === m.ingredientId)?.name === n));
  assert.equal(cookedMoves.length, 0, 'buying is not cooking: no cooked stock');
  const kiryana = data.inventory.suppliers.find((s) => s.name === KIRYANA);
  const bills = data.inventory.khata.filter((e) => e.supplierId === kiryana.id && e.kind === 'PURCHASE');
  assert.equal(bills.length, 2, 'the khata has the two bills and nothing from the recipes');
  assert.deepEqual(
    data.inventory.purchaseRecipes.map((r) => [r.rawMilli, r.mainIngredientId]),
    [[5_000_000, DAAL_MASH], [8_000_000, DAAL_MASH]],
    'one saved recipe per purchase',
  );
  ok(`card: total 13 kg, Rs. ${thirteen}; Purchases 8 kg → Rs. ${money(second.preview)} and 5 kg → Rs. ${money(first.preview)}, each with its own lines; 2 khata bills, no cooked stock`);

  console.log('\n4. Recipe Builder: the recipe for your stock, and Try another amount');
  await owner.getByRole('button', { name: 'Edit recipe: Cooked Daal Mash' }).click();
  await builder(owner).waitFor();
  assert.equal(await builder(owner).locator('[data-main-ingredient]').inputValue(), DAAL_MASH);
  assert.equal(await builder(owner).locator('[data-builder-stock]').innerText(), '13 kg');
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '13 kg');
  await cook(owner).locator('[data-scaled-lines] li', { hasText: 'Daal mash' }).getByText('13 kg').waitFor();
  await cook(owner).getByRole('button', { name: 'Try another amount' }).click();
  await cook(owner).getByRole('textbox', { name: 'Amount of Daal mash' }).fill('10');
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '10 kg');
  await cook(owner).getByRole('textbox', { name: 'Amount of Daal mash' }).fill('abc');
  await cook(owner).getByText('Type an amount, for example 7 or 2.5.').waitFor();
  await cook(owner).getByRole('button', { name: 'Back to my stock' }).click();
  assert.equal(await cook(owner).locator('[data-cook-amount]').innerText(), '13 kg');
  assert.equal(await builder(owner).getByRole('button', { name: 'Save Draft' }).isDisabled(), true, 'looking at amounts changes nothing to save');
  await cook(owner).scrollIntoViewIfNeeded();
  await shot(owner, '03-desktop-builder-for-stock');
  ok('builder: daal mash in stock 13 kg, recipe for 13 kg; Try another amount 10 kg; Back to my stock; nothing to save');

  console.log('\n4b. A recipe changed later: old purchases keep the recipe of their day; bills from before P3 use today\'s');
  await builder(owner).getByLabel('Quantity 2').fill('200');
  await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
  await builder(owner).waitFor({ state: 'detached' });
  await daal.locator('[data-purchases-line]').click();
  await daal.locator('[data-dish-purchases] [data-purchase-recipe]').nth(1).getByRole('button').click();
  await daal.locator('[data-dish-purchases] [data-purchase-lines] li', { hasText: 'Cooking oil' }).getByText('750 ml').waitFor();
  // Bills saved before P3 have no saved recipe: they are worked out now, marked "today's prices"
  await owner.evaluate((key) => {
    const old = JSON.parse(window.localStorage.getItem(key));
    delete old.inventory.purchaseRecipes;
    window.localStorage.setItem(key, JSON.stringify(old));
  }, DATA_KEY);
  await openPrepared(owner);
  await daal.locator('[data-purchases-line]').click();
  assert.equal(await daal.locator('[data-dish-purchases]').getByText("(today’s prices)").count(), 2);
  await daal.locator('[data-dish-purchases] [data-purchase-recipe]').nth(1).getByRole('button').click();
  await daal.locator('[data-dish-purchases] [data-purchase-lines] li', { hasText: 'Cooking oil' }).getByText('1 litre', { exact: true }).waitFor();
  ok('oil changed to 200 ml: the 5 kg purchase keeps 750 ml (its day\'s recipe); without saved records the bills are worked out now (1 litre), marked "today\'s prices"');

  console.log('\n5. A new cooked dish, written once for 2 kg, follows the daal chana stock');
  await card(owner, 'Naan dough').waitFor();
  await owner.getByRole('button', { name: 'Add Recipe' }).click();
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
  const pulaoCard = card(owner, 'Cooked Chana Pulao');
  assert.equal(await pulaoCard.locator('[data-raw-stock]').innerText(), '10 kg*', 'shared with Daal Chana');
  await pulaoCard.locator('[data-shared]').getByText('Daal chana (Shared)').waitFor();
  assert.equal(await pulaoCard.locator('p[title*="Cooked Daal Chana"]').count(), 1);
  await pulaoCard.getByRole('button', { name: 'Show ingredients for 10 kg' }).click();
  await pulaoCard.locator('[data-main-line]').getByText('Recipe for 2 kg Daal chana', { exact: false }).waitFor();
  const after = await saved(owner);
  const pulao = after.inventory.ingredients.find((i) => i.name === 'Cooked Chana Pulao');
  const recipe = after.inventory.recipes.find((r) => r.target.kind === 'PREPARED' && r.target.ingredientId === pulao.id);
  assert.equal(recipe.versions.at(-1).mainIngredientId, ING(46));
  ok('"Cooked Chana Pulao" for 2 kg daal chana: 10 kg in stock → oil 1.5 litres; saved verified; shares daal chana with Daal Chana');

  console.log('\n6. Laptop and phone');
  await owner.setViewportSize(LAPTOP);
  await owner.evaluate(() => window.scrollTo({ top: 0 }));
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
  console.log('\nAll cooked-food P1–P3 checks passed (DEMO).');
} finally {
  await browser.close();
}

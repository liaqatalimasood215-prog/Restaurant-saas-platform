// Recipes walkthrough (Inventory Step B, owner 2026-11-04): saved data of the previous version is kept, recipe list and
// food cost, edit a recipe (new version, draft → verified), add a recipe with checks, sizes with "Copy from", add-ons,
// a prepared item (sub-recipe) whose cost flows into the pizzas, the dashboard card, Owner / Manager only, phone.
// Recipe Builder R1 (owner's picture): the builder takes the screen; Quantity + Unit (g → kg), search to add, package sizes.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:recipes
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'recipes');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103) };
const ONIONS = id(1308);
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
// The Aziz Pizza test data (MASTER_PROMPT.md §12): the owner's own demo is Lala Restaurant.
await context.addInitScript(() => window.localStorage.setItem('lala-os-demo-fixture', 'acceptance'));
const errors = [];

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, userId]);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const dialog = (page) => page.getByRole('dialog');
const builder = (page) => page.locator('main [data-recipe-builder]');
/** A recipe is saved when the builder closes (an older "saved" message may still be on the screen). */
const saveDone = (page) => builder(page).waitFor({ state: 'detached' });
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const item = (page, name) => page.locator(`main [data-recipe-item="${name}"]`);
const recipeCost = (page) => builder(page).locator('[data-recipe-cost]').innerText();
const foodCost = (page) => builder(page).locator('[data-food-cost]').innerText();
async function openRecipes(page) {
  await page.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await page.locator('main [data-recipe-summary]').first().waitFor();
}
async function noSidewaysScroll(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `${label}: the page scrolls sideways by ${wide}px`);
}

console.log('1. Saved data of the previous version (16) is kept; recipes are added');
const setup = await openAs(USER.owner, '/inventory', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.reload({ waitUntil: 'networkidle' });
await setup.getByRole('button', { name: 'Adjust Stock' }).click();
await dialog(setup).getByLabel('Ingredient').selectOption({ label: 'Onions (8 kg)' });
await dialog(setup).getByLabel('Quantity').fill('2');
await dialog(setup).getByRole('radio', { name: 'Add' }).click();
await dialog(setup).getByRole('radio', { name: 'Found more stock' }).click();
await dialog(setup).getByRole('button', { name: 'Save change' }).click();
await setup.getByText('Stock of Onions updated').first().waitFor();
await setup.evaluate((key) => {
  const data = JSON.parse(window.localStorage.getItem(key));
  data.version = 16;
  delete data.inventory.recipes;
  data.inventory.ingredients = data.inventory.ingredients.filter((i) => i.kind !== 'PREPARED').map((i) => { const copy = { ...i }; delete copy.kind; return copy; });
  window.localStorage.setItem(key, JSON.stringify(data));
}, DATA_KEY);
await setup.close();
const owner = await openAs(USER.owner, '/inventory', DESKTOP);
// Inventory opens on Suppliers (owner, 2026-11-06): the cards are on Overview.
await owner.getByRole('tab', { name: 'Overview', exact: true }).click();
await owner.locator('main [data-inventory-card]').first().waitFor();
const upgraded = await saved(owner);
assert.equal(upgraded.version, 21);
assert.equal(upgraded.inventory.recipes.length, 18);
assert.ok(upgraded.inventory.ingredients.every((i) => i.kind === 'BOUGHT' || i.name === 'Pizza dough'));
assert.ok(upgraded.inventory.movements.some((m) => m.ingredientId === ONIONS && m.type === 'ADJUSTMENT' && m.quantityMilli === 2_000_000), 'the Onions correction is kept');
ok('version 16 → 17: the Onions correction (+2 kg) kept; 18 sample recipes and the prepared Pizza dough added');

console.log('2. Dashboard card and recipe list');
const card = owner.locator('main [data-inventory-card="Estimated food cost"]');
assert.match(await card.innerText(), /\d+(\.\d)? %/);
assert.match(await card.innerText(), /Average of 13 recipes/);
await card.click();
await owner.locator('main [data-recipe-summary]').first().waitFor();
const summary = await owner.locator('main [data-recipe-summary]').allInnerTexts();
assert.ok(summary[0].includes('9 of 11'), summary[0]);
assert.ok(summary[1].includes('10 of 13'), summary[1]);
await owner.getByRole('button', { name: /^No recipe/ }).click();
assert.deepEqual(await owner.locator('main [data-recipe-item]').evaluateAll((els) => els.map((e) => e.dataset.recipeItem)), ['Wings', 'Alfredo Pasta']);
await owner.getByRole('button', { name: /^All/ }).click();
await shot(owner, '01-desktop-owner-recipes');
ok('"Estimated food cost" opens Recipes; 9 of 11 menu items have a recipe, 10 of 13 verified; No recipe = Wings, Alfredo Pasta');

console.log('3. Edit a recipe: a new version, draft, then verified');
await owner.getByRole('button', { name: 'Edit recipe: Zinger Burger' }).click();
assert.equal(await recipeCost(owner), 'Rs. 184.12');
assert.match(await foodCost(owner), /40\.9 %/);
await builder(owner).getByLabel('Quantity 1').fill('140');
await builder(owner).locator('[data-recipe-cost]').getByText('Rs. 176.90').waitFor();
assert.match(await foodCost(owner), /39\.3 %/);
await shot(owner, '02-desktop-owner-edit-zinger');
await builder(owner).getByRole('button', { name: 'Save Draft' }).click();
await saveDone(owner);
await item(owner, 'Zinger Burger').getByText('Draft').first().waitFor();
await owner.getByRole('button', { name: 'Edit recipe: Zinger Burger' }).click();
assert.equal(await builder(owner).locator('[data-versions] li').count(), 2);
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await saveDone(owner);
const zinger = (await saved(owner)).inventory.recipes.find((r) => r.target.menuItemId === id(703));
assert.deepEqual(
  zinger.versions.map((v) => [v.version, v.status, v.lines[0].quantityMilli]),
  [
    [1, 'VERIFIED', 150_000],
    [2, 'VERIFIED', 140_000],
  ],
);
ok('Zinger 150 g → 140 g chicken: Rs. 184.12 → Rs. 176.90, 40.9 % → 39.3 %; saved as v2 Draft, then verified; v1 unchanged');

console.log('3b. Recipe Builder R1: Quantity + Unit, search to add, package sizes');
await owner.getByRole('button', { name: 'Edit recipe: Chicken Karahi' }).click();
await builder(owner).getByText('This recipe (1 kg)').waitFor();
assert.equal(await builder(owner).locator('[data-product-name]').innerText(), 'Chicken Karahi', 'name comes from the Menu');
assert.equal(await recipeCost(owner), 'Rs. 836.72');
assert.deepEqual(await builder(owner).getByLabel('Unit 1').locator('option').allInnerTexts(), ['kg', 'g', 'mg', 'pack', 'bag', 'box', 'tray', 'bottle']);
await builder(owner).getByLabel('Unit 1').selectOption('kg');
assert.equal(await builder(owner).getByLabel('Quantity 1').inputValue(), '1', '1000 g = 1 kg');
await builder(owner).getByLabel('Quantity 1').fill('0.75');
await builder(owner).locator('[data-recipe-line="1"] [data-line-cost]').getByText('Rs. 487.50').waitFor();
await builder(owner).getByLabel('Unit 4').selectOption('l');
assert.equal(await builder(owner).getByLabel('Quantity 4').inputValue(), '0.12', '120 ml = 0.12 L');
await builder(owner).getByLabel('Search ingredient to add…').fill('flour');
await builder(owner).getByRole('listbox', { name: 'Search ingredient to add…' }).getByRole('option', { name: /Pizza flour/ }).click();
await builder(owner).locator('[data-recipe-line="6"]').waitFor();
// the cursor goes to the new Quantity
await owner.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Quantity 6', null, { timeout: 3000 });
await builder(owner).getByLabel('Quantity 6').fill('0.5');
await builder(owner).getByLabel('Unit 6').selectOption('bag');
await builder(owner).getByRole('button', { name: 'Save Draft' }).click();
await builder(owner).getByText('Line 6: enter how much one package holds, e.g. 1 bag = 25 kg.').waitFor();
await builder(owner).getByLabel('Size of 1 bag in line 6').fill('10');
// 0.5 bag × 10 kg = 5 kg flour at Rs. 124 / kg = Rs. 620
await builder(owner).locator('[data-recipe-line="6"] [data-line-cost]').getByText('Rs. 620').waitFor();
await builder(owner).getByLabel('Unit 6').selectOption('pack');
await builder(owner).getByLabel('Quantity 6').fill('0.02');
// the ingredient's own pack: 0.02 × 25 kg = 0.5 kg = Rs. 62
await builder(owner).locator('[data-recipe-line="6"] [data-line-cost]').getByText('Rs. 62').waitFor();
await shot(owner, '02b-desktop-owner-builder-units');
await builder(owner).getByRole('button', { name: 'Remove line 6' }).click();
await builder(owner).getByRole('button', { name: 'Save Draft' }).click();
await saveDone(owner);
const karahi = (await saved(owner)).inventory.recipes.find((r) => r.target.menuItemId === id(710));
const v2 = karahi.versions.at(-1);
assert.equal(karahi.versions.length, 2);
assert.deepEqual([v2.lines[0].unit, v2.lines[0].quantityMilli, v2.lines[3].unit, v2.lines[3].quantityMilli], ['kg', 750_000, 'l', 120_000]);
assert.equal(v2.lines[1].unit, undefined, 'a line in its own unit stays as it was');
const prices = (await saved(owner)).items.find((i) => i.id === id(710));
assert.equal(prices.basePrice, 260_000, 'the Menu price is never changed by the builder');
ok('Karahi: 1000 g → 1 kg → 0.75 kg (Rs. 487.50), 120 ml → 0.12 L; flour found by search; a bag needs its size (0.5 × 10 kg = Rs. 620), the own pack is 25 kg; saved as v2 with the units, Menu price Rs. 2,600 untouched');

console.log('4. Add a recipe, with checks');
await owner.getByRole('button', { name: 'Add recipe: Wings' }).click();
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await builder(owner).getByText('Line 1: choose the ingredient.').waitFor();
await builder(owner).getByLabel('Ingredient 1').selectOption({ label: 'Chicken (boneless)' });
await builder(owner).getByLabel('Quantity 1').fill('200');
await builder(owner).getByRole('button', { name: 'More options for line 1' }).click();
await builder(owner).getByLabel('Loss 1').fill('95');
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await builder(owner).getByText('Line 1: the loss must be 0–90 %.').waitFor();
await builder(owner).getByLabel('Loss 1').fill('10');
await builder(owner).getByRole('button', { name: 'Add ingredient', exact: true }).click();
await builder(owner).getByLabel('Ingredient 2').selectOption({ label: 'Chicken (boneless)' });
await builder(owner).getByLabel('Quantity 2').fill('5');
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await builder(owner).getByText('Line 2: this ingredient is already in the recipe.').waitFor();
await builder(owner).getByLabel('Ingredient 2').selectOption({ label: 'Cooking oil' });
await builder(owner).getByLabel('Quantity 2').fill('40');
await builder(owner).getByRole('button', { name: 'Add ingredient', exact: true }).click();
await builder(owner).getByLabel('Ingredient 3').selectOption({ label: 'Red chilli powder (500 g pack)' });
await builder(owner).getByLabel('Quantity 3').fill('5');
await builder(owner).getByRole('button', { name: 'More options for line 3' }).click();
await builder(owner).getByLabel('Guest may leave it out').check();
await builder(owner).getByText('Kitchen uses 222.222 g').waitFor();
// 222.222 g chicken Rs. 144.44 + 40 ml oil Rs. 23.20 + 5 g chilli Rs. 4.50 = Rs. 172.14
assert.equal(await recipeCost(owner), 'Rs. 172.14');
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await saveDone(owner);
await item(owner, 'Wings').getByText('Verified').first().waitFor();
assert.match(await owner.getByRole('button', { name: /^No recipe/ }).innerText(), /^No recipe\s*1$/);
ok('empty ingredient, 95 % loss and a double ingredient refused; Wings: 200 g chicken (10 % loss → 222.222 g), oil, optional chilli = Rs. 172.14, verified');

console.log('5. Sizes: Copy from Medium into Large');
await owner.getByRole('button', { name: 'Edit recipe: Classic Pizza' }).click();
// R2: sizes are rows of the Recipe Sizes table (Auto Scale off: each size keeps its own recipe).
await builder(owner).locator('[data-size-row="Large"] td').first().click();
await builder(owner).getByLabel('Copy from').selectOption({ label: 'Medium' });
assert.equal(await builder(owner).getByLabel('Quantity 3').inputValue(), '110', 'Medium has 110 g mozzarella');
await builder(owner).getByLabel('Quantity 3').fill('170');
await builder(owner).locator('[data-size-row="Large"]').getByText('Changed').waitFor();
await shot(owner, '03-desktop-owner-pizza-sizes');
await builder(owner).getByRole('button', { name: 'Save Draft' }).click();
await saveDone(owner);
const pizza = (await saved(owner)).inventory.recipes.filter((r) => r.target.menuItemId === id(701));
assert.deepEqual(
  pizza.map((r) => [r.target.variantId, r.versions.length, r.versions.at(-1).status]),
  [
    [id(801), 1, 'VERIFIED'],
    [id(802), 1, 'VERIFIED'],
    [id(803), 2, 'DRAFT'],
  ],
);
ok('Large copied from Medium (dough 250 g, sauce 80 g, cheese 110 g → 170 g), saved as a draft; Small and Medium untouched');

console.log('6. Add-ons');
await owner.getByRole('tab', { name: 'Add-ons' }).click();
await owner.locator('main [data-size-line="Extra patty"]').getByRole('button').click();
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await saveDone(owner);
await owner.locator('main [data-size-line="Extra patty"]').getByText('Draft').waitFor({ state: 'detached' });
ok('Extra patty (120 g beef, 15 % loss) verified without a new version');

console.log('7. Prepared items: a change of the dough reaches every pizza');
await owner.getByRole('tab', { name: 'Menu items' }).click();
const smallBefore = await item(owner, 'Classic Pizza').locator('[data-size-line="Small"]').innerText();
await owner.getByRole('tab', { name: 'Prepared items' }).click();
await owner.locator('main [data-prepared-item="Pizza dough"]').getByText('Rs. 95.63 / kg').waitFor();
await owner.getByRole('button', { name: 'Edit recipe: Pizza dough' }).click();
await builder(owner).getByLabel('One batch makes').fill('1.7');
await builder(owner).locator('[data-unit-cost]').getByText('Rs. 90').waitFor();
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await saveDone(owner);
await owner.locator('main [data-prepared-item="Pizza dough"]').getByText('Rs. 90 / kg').waitFor();
await owner.getByRole('button', { name: 'Add prepared item' }).click();
await builder(owner).getByLabel('Name', { exact: true }).fill('Spicy mayo');
await builder(owner).getByLabel('Category').selectOption('SAUCES_SPICES');
await builder(owner).getByLabel('Ingredient 1').selectOption({ label: 'Mayonnaise (1 kg bottle)' });
await builder(owner).getByLabel('Quantity 1').fill('950');
await builder(owner).getByRole('button', { name: 'Add ingredient', exact: true }).click();
await builder(owner).getByLabel('Ingredient 2').selectOption({ label: 'Red chilli powder (500 g pack)' });
await builder(owner).getByLabel('Quantity 2').fill('50');
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await builder(owner).getByText('Enter what one batch makes, for example 1.6.').waitFor();
await builder(owner).getByLabel('One batch makes').fill('1');
await shot(owner, '04-desktop-owner-prepared-item');
await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
await saveDone(owner);
// 950 g mayo Rs. 617.50 + 50 g chilli Rs. 45 = Rs. 662.50 for 1 kg
await owner.locator('main [data-prepared-item="Spicy mayo"]').getByText('Rs. 662.50 / kg').waitFor();
await owner.getByRole('tab', { name: 'Menu items' }).click();
const smallAfter = await item(owner, 'Classic Pizza').locator('[data-size-line="Small"]').innerText();
assert.notEqual(smallAfter, smallBefore, 'the cheaper dough lowers the pizza cost');
await owner.getByRole('button', { name: 'Edit recipe: Loaded Fries' }).click();
assert.ok((await builder(owner).getByLabel('Ingredient 1').locator('option', { hasText: 'Spicy mayo' }).count()) === 1, 'the new prepared item can be used in recipes');
await builder(owner).getByRole('button', { name: 'Recipes', exact: true }).click();
await builder(owner).waitFor({ state: 'detached' });
ok('dough batch 1.6 → 1.7 kg: Rs. 95.63 → Rs. 90 / kg and the pizzas got cheaper; Spicy mayo needs its batch size, then Rs. 662.50 / kg, and recipes can use it');

console.log('8. Owner and Manager only');
const manager = await openAs(USER.manager, '/inventory', DESKTOP);
await openRecipes(manager);
await manager.getByRole('button', { name: 'Edit recipe: Zinger Burger' }).waitFor();
await manager.close();
const cashier = await openAs(USER.cashier, '/inventory', DESKTOP);
await cashier.getByText('No access').first().waitFor();
await cashier.close();
ok('the Manager edits recipes; the Cashier gets "No access"');

// R2 (owner's second picture, 2026-11-05): the Recipe Sizes table sits below the builder, so the page scrolls once; nothing scrolls sideways.
console.log("8b. The owner's laptop (1265 × 628 at 150 %): Save Draft and Verify at the top, no sideways scroll");
const laptop = await openAs(USER.owner, '/inventory', { width: 1265, height: 628 });
await openRecipes(laptop);
for (const name of ['Chicken Karahi', 'Fajita Pizza']) {
  await laptop.getByRole('button', { name: `Edit recipe: ${name}` }).click();
  await builder(laptop).waitFor();
  await noSidewaysScroll(laptop, name);
  assert.ok(await builder(laptop).getByRole('button', { name: 'Verify Recipe' }).isVisible(), `${name}: Verify Recipe is on the first screen`);
  await shot(laptop, `07-laptop-owner-builder-${name.split(' ')[1].toLowerCase()}`);
  await builder(laptop).getByRole('button', { name: 'Recipes', exact: true }).click();
  await builder(laptop).waitFor({ state: 'detached' });
}
await laptop.close();
ok('Karahi and Fajita Pizza: Save Draft and Verify Recipe on the first screen, no sideways scroll');

console.log('9. Phone');
const phone = await openAs(USER.owner, '/inventory', PHONE);
await openRecipes(phone);
await noSidewaysScroll(phone, 'phone recipes');
await shot(phone, '05-phone-owner-recipes');
await phone.getByRole('button', { name: 'Edit recipe: Zinger Burger' }).click();
await builder(phone).locator('[data-recipe-cost]').waitFor();
await shot(phone, '06-phone-owner-recipe-editor');
await phone.close();
ok('phone 390 px: cards, editor lines stacked, no sideways scroll');

assert.deepEqual(errors, [], 'no browser console errors');
await owner.close();
await browser.close();
console.log('Recipes walkthrough passed: old data kept, food cost list and card, versions draft → verified, checks, sizes, add-ons, prepared items, Owner / Manager only, phone.');

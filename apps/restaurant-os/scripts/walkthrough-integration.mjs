// One connected system, step I1 (owner's integration brief, 2026-11-08): a product and its recipe are made ONCE.
// Test A: Menu → Add Item → "Add recipe now" → Recipe Builder → Verify → Menu says Recipe verified, the POS sells it.
// Test B: Prepared Items → Cooked Chicken Biryani → Sell on POS → a new menu product (new category, Full / Half plate, prices,
// portions) → Menu, Recipes and POS show it; selling again offers the same product (never a second one). Cooked Daal Mash links
// to the menu's Daal Mash (its old recipe stays as version 1); a new prepared recipe asks at once and finds Chicken Pulao.
// Also: one name once in the whole Menu, Add Recipe with a menu-product list, Manager, phone width. Runs on his Lala demo data.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:integration
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'integration');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102) };
const ING = (n) => id(1300 + n);
const DAAL_MASH_ITEM = id(716);
const DESKTOP = { width: 1440, height: 900 };
const LAPTOP = { width: 1278, height: 627 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
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
const card = (page, name) => page.locator(`main [data-prepared-item="${name}"]`);
const menuRow = (page, name) => page.locator(`main [data-menu-item="${name}"]`);
const recipeItem = (page, name) => page.locator(`main [data-recipe-item="${name}"]`);
const bill = (page) => page.locator('main [data-pos-bill]');
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const recipeOf = (data, menuItemId, variantId) => data.inventory.recipes.find((r) => r.target.kind === 'ITEM' && r.target.menuItemId === menuItemId && r.target.variantId === variantId);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
async function openPrepared(page) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await page.locator('main [data-recipe-summary]').first().waitFor();
  await page.getByRole('tab', { name: 'Prepared items' }).click();
  await card(page, 'Naan dough').waitFor();
}

try {
  console.log('\nTest A. Menu → Add Item → its recipe → Verify → POS');
  const owner = await openAs(USER.owner, '/menu', DESKTOP);
  await owner.getByRole('button', { name: 'Add Item' }).click();
  await dialog(owner).getByLabel('Item name').fill('Chicken Pulao');
  await dialog(owner).getByLabel('Category', { exact: true }).selectOption({ label: 'Sabzi & Daal' });
  await dialog(owner).getByLabel('Kitchen station').selectOption({ label: 'Hot Kitchen' });
  await dialog(owner).getByLabel('Price', { exact: true }).fill('500');
  await dialog(owner).getByRole('button', { name: 'Save' }).click();
  const prompt = owner.locator('main [data-recipe-prompt="Chicken Pulao"]');
  await prompt.waitFor();
  await menuRow(owner, 'Chicken Pulao').locator('[data-menu-recipe="NONE"]').getByText('No recipe').waitFor();
  await shot(owner, '01-desktop-menu-add-recipe-now');
  await prompt.getByRole('button', { name: 'Add recipe now' }).click();
  await builder(owner).waitFor();
  await builder(owner).getByText('Chicken Pulao').first().waitFor();
  await builder(owner).getByLabel('Ingredient 1').selectOption({ label: 'Basmati rice' });
  await builder(owner).getByLabel('Quantity 1').fill('200');
  await builder(owner).getByRole('button', { name: 'Add ingredient', exact: true }).click();
  await builder(owner).getByLabel('Ingredient 2').selectOption({ label: 'Chicken (with bone)' });
  await builder(owner).getByLabel('Quantity 2').fill('150');
  await shot(owner, '02-desktop-builder-from-menu');
  await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
  await builder(owner).waitFor({ state: 'detached' });
  await recipeItem(owner, 'Chicken Pulao').getByText('Verified').first().waitFor();
  let data = await saved(owner);
  const pulao = data.items.find((i) => i.name === 'Chicken Pulao' && !i.archivedAt);
  assert.equal(data.items.filter((i) => i.name === 'Chicken Pulao').length, 1, 'one product');
  assert.equal(recipeOf(data, pulao.id, null).versions.at(-1).status, 'VERIFIED');
  await owner.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle' });
  await menuRow(owner, 'Chicken Pulao').locator('[data-menu-recipe="VERIFIED"]').getByText('Recipe verified').waitFor();
  const pos = await openAs(USER.owner, '/pos', LAPTOP);
  await pos.getByRole('button', { name: /^Chicken Pulao/ }).first().waitFor();
  ok('Chicken Pulao added in the Menu; "Add recipe now" opened the Recipe Builder on it; verified; Menu says Recipe verified; on the POS');

  console.log('\n   One name once in the whole Menu');
  await owner.getByRole('button', { name: 'Add Item' }).click();
  await dialog(owner).getByLabel('Item name').fill('chicken pulao');
  await dialog(owner).getByLabel('Category', { exact: true }).selectOption({ label: 'Karahi' });
  await dialog(owner).getByLabel('Price', { exact: true }).fill('600');
  await dialog(owner).getByRole('button', { name: 'Save' }).click();
  await dialog(owner).getByText('Sabzi & Daal already has an item called chicken pulao.').waitFor();
  await dialog(owner).getByRole('button', { name: 'Cancel' }).click();
  ok('"chicken pulao" in Karahi refused: "Sabzi & Daal already has an item called chicken pulao."');

  console.log('\nTest B. Prepared Items → Cooked Chicken Biryani → Sell on POS → Menu, Recipes, POS');
  await openPrepared(owner);
  const biryani = card(owner, 'Cooked Chicken Biryani');
  await biryani.locator('[data-on-pos="none"]').getByText('Not on POS').waitFor();
  await biryani.getByRole('button', { name: 'Sell Cooked Chicken Biryani on POS' }).click();
  const sell = owner.getByRole('dialog', { name: 'Sell Cooked Chicken Biryani on POS' });
  assert.equal(await sell.getByLabel('Name on the menu').inputValue(), 'Chicken Biryani', 'the name without "Cooked"');
  assert.equal(await sell.getByLabel('Portion of Full plate in g').inputValue(), '250');
  assert.equal(await sell.getByLabel('Portion of Half plate in g').inputValue(), '125');
  await sell.getByLabel('Name on the menu').fill('Daal Mash');
  await sell.getByLabel('Price of Full plate').fill('450');
  await sell.getByLabel('Price of Half plate').fill('250');
  await sell.getByRole('button', { name: 'Put on POS' }).click();
  await sell.getByText('Daal Mash is already on the menu. Link it instead of making it again.').waitFor();
  await sell.getByLabel('Name on the menu').fill('Chicken Biryani');
  await sell.getByLabel('POS category').selectOption({ label: '+ New category' });
  await sell.getByLabel('New category name').fill('Rice & Biryani');
  await shot(owner, '03-desktop-sell-biryani');
  await sell.getByRole('button', { name: 'Put on POS' }).click();
  await sell.waitFor({ state: 'detached' });
  await biryani.locator('[data-on-pos]').getByText('Chicken Biryani').waitFor();
  data = await saved(owner);
  const item = data.items.find((i) => i.name === 'Chicken Biryani');
  assert.equal(item.preparedItemId, ING(90));
  assert.equal(item.unit, 'plate');
  assert.deepEqual(item.variants.map((v) => [v.name, v.price]), [['Full plate', 45_000], ['Half plate', 25_000]]);
  assert.equal(data.categories.find((c) => c.id === item.categoryId).name, 'Rice & Biryani');
  const [full, half] = item.variants.map((v) => recipeOf(data, item.id, v.id).versions.at(-1));
  assert.deepEqual([full.status, full.lines[0].ingredientId, full.lines[0].quantityMilli, full.lines.length], ['VERIFIED', ING(90), 250_000, 1]);
  assert.deepEqual([half.status, half.lines[0].quantityMilli], ['VERIFIED', 125_000]);
  ok('Chicken Biryani made once: new category Rice & Biryani, Full plate Rs. 450 / Half plate Rs. 250, each size = 250 g / 125 g of Cooked Chicken Biryani (verified); "Daal Mash" as a new name refused');

  await biryani.getByRole('button', { name: 'Sell Cooked Chicken Biryani on POS' }).click();
  const again = owner.getByRole('dialog', { name: 'Sell Cooked Chicken Biryani on POS' });
  assert.equal(await again.getByRole('radio', { name: /Link to Chicken Biryani \(Rice & Biryani\)/ }).isChecked(), true, 'the same product is offered, not a second one');
  assert.equal(await again.getByLabel('Portion of Full plate in g').inputValue(), '250', 'the portion it has now');
  await again.getByRole('button', { name: 'Cancel' }).click();
  ok('Sell on POS again offers "Link to Chicken Biryani (Rice & Biryani)" with its portions: no second product');

  await owner.getByRole('tab', { name: 'Menu items' }).click();
  const biryaniRecipes = recipeItem(owner, 'Chicken Biryani');
  await biryaniRecipes.getByText('Verified').first().waitFor();
  const costs = await biryaniRecipes.locator('[data-size-line]').allInnerTexts();
  assert.equal(costs.length, 2);
  assert.ok(costs.every((text) => /Cost Rs\. [\d,.]+ · Price Rs\. (450|250)/.test(text)), `costed: ${costs.join(' | ')}`);
  await owner.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle' });
  await menuRow(owner, 'Chicken Biryani').getByText('From Cooked Chicken Biryani').waitFor();
  await menuRow(owner, 'Chicken Biryani').locator('[data-menu-recipe="VERIFIED"]').waitFor();
  await pos.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' });
  await pos.getByRole('tab', { name: /Rice & Biryani/ }).click();
  await pos.getByRole('button', { name: /^Chicken Biryani/ }).first().click();
  await dialog(pos).getByRole('button', { name: /^Half plate/ }).click();
  await dialog(pos).getByRole('button', { name: /^Add · Rs\. 250/ }).click();
  await bill(pos).getByText('Half plate').first().waitFor();
  await bill(pos).getByText('Rs. 250').first().waitFor();
  await shot(pos, '04-laptop-pos-biryani');
  ok('Recipes → Menu items: Chicken Biryani verified and costed; Menu: "From Cooked Chicken Biryani"; POS: Rice & Biryani tab, Half plate Rs. 250 in the bill');

  console.log('\n   Cooked Daal Mash links to the menu\'s Daal Mash (no second product)');
  await openPrepared(owner);
  await card(owner, 'Cooked Daal Mash').getByRole('button', { name: 'Sell Cooked Daal Mash on POS' }).click();
  const link = owner.getByRole('dialog', { name: 'Sell Cooked Daal Mash on POS' });
  assert.equal(await link.getByRole('radio', { name: /Link to Daal Mash \(Sabzi & Daal\)/ }).isChecked(), true);
  assert.equal(await link.getByLabel('Price of Full plate').inputValue(), '450', 'its Menu price, ready to change');
  await link.getByLabel('Portion of Full plate in g').fill('300');
  await shot(owner, '05-desktop-link-daal-mash');
  await link.getByRole('button', { name: 'Link and save' }).click();
  await link.waitFor({ state: 'detached' });
  await card(owner, 'Cooked Daal Mash').locator('[data-on-pos]').getByText('Daal Mash').waitFor();
  data = await saved(owner);
  const daal = data.items.find((i) => i.id === DAAL_MASH_ITEM);
  const daalRecipe = recipeOf(data, DAAL_MASH_ITEM, null);
  assert.equal(daal.preparedItemId, ING(84));
  assert.equal(daal.basePrice, 45_000, 'the Menu price stays');
  assert.equal(data.items.filter((i) => !i.archivedAt && /daal mash/i.test(i.name)).length, 1, 'still one Daal Mash');
  assert.equal(daalRecipe.versions.length, 2);
  assert.ok(daalRecipe.versions[0].lines.some((l) => l.ingredientId === ING(45)), 'the old raw-daal recipe stays as version 1');
  assert.deepEqual(daalRecipe.versions[1].lines.map((l) => [l.ingredientId, l.quantityMilli]), [[ING(84), 300_000]]);
  ok('Daal Mash linked: its recipe v2 = 300 g Cooked Daal Mash (v1 with raw daal kept), price Rs. 450 unchanged, one product');

  console.log('\n   His case: link Daal Chana and change its sizes and prices there (Full plate Rs. 150 / Half plate Rs. 100)');
  await card(owner, 'Cooked Daal Chana').getByRole('button', { name: 'Sell Cooked Daal Chana on POS' }).click();
  const chana = owner.getByRole('dialog', { name: 'Sell Cooked Daal Chana on POS' });
  assert.equal(await chana.getByRole('radio', { name: /Link to Daal Chana \(Sabzi & Daal\)/ }).isChecked(), true);
  assert.equal(await chana.getByLabel('Price of Full plate').inputValue(), '400');
  await chana.getByLabel('Price of Full plate').fill('150');
  await chana.getByRole('button', { name: 'Half plate', exact: true }).click();
  assert.equal(await chana.getByLabel('Name of size 2').inputValue(), 'Half plate');
  assert.equal(await chana.getByLabel('Portion of Half plate in g').inputValue(), '125');
  await chana.getByLabel('Price of Half plate').fill('100');
  await shot(owner, '05b-desktop-link-daal-chana-prices');
  await chana.getByRole('button', { name: 'Link and save' }).click();
  await chana.waitFor({ state: 'detached' });
  data = await saved(owner);
  const chanaItem = data.items.find((i) => i.name === 'Daal Chana' && !i.archivedAt);
  assert.deepEqual(chanaItem.variants.map((v) => [v.name, v.price]), [['Full plate', 15_000], ['Half plate', 10_000]]);
  assert.deepEqual(chanaItem.variants.map((v) => recipeOf(data, chanaItem.id, v.id).versions.at(-1).lines.map((l) => [l.ingredientId, l.quantityMilli])), [[[ING(85), 250_000]], [[ING(85), 125_000]]]);
  assert.equal(data.items.filter((i) => !i.archivedAt && /daal chana/i.test(i.name)).length, 1, 'still one Daal Chana');
  await pos.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' });
  await pos.getByRole('button', { name: /^Daal Chana/ }).first().click();
  await dialog(pos).getByRole('button', { name: /^Half plate/ }).click();
  await dialog(pos).getByRole('button', { name: /^Add · Rs\. 100/ }).waitFor();
  // Owner, 2026-11-08: Full plate + Half plate are tapped together like 1 kg + ½ kg: one line
  await dialog(pos).getByRole('button', { name: /^Full plate/ }).click();
  await dialog(pos).getByText('One line for the kitchen: Full plate + Half plate').waitFor();
  await dialog(pos).getByRole('button', { name: /^Add · Rs\. 250/ }).click();
  await bill(pos).getByText('Full plate + Half plate').first().waitFor();
  assert.equal(await bill(pos).getByText('Daal Chana').count(), 1, 'one line, not two');
  await shot(pos, '04b-laptop-pos-full-plus-half-plate');
  await bill(pos).getByRole('button', { name: 'Clear all' }).click();
  await pos.getByRole('dialog').getByRole('button', { name: 'Yes, clear bill' }).click();
  ok('Daal Chana linked with new sizes: Full plate Rs. 150 (250 g), Half plate Rs. 100 (125 g) saved to the Menu; POS: Full plate + Half plate tapped together = one line, Rs. 250');

  console.log('\n   Quick sizes in kg and grams: Daal Makhni 1 kg, ½ kg and 300 g; 1 kg + ½ kg together on the POS');
  await card(owner, 'Cooked Daal Makhni').getByRole('button', { name: 'Sell Cooked Daal Makhni on POS' }).click();
  const makhni = owner.getByRole('dialog', { name: 'Sell Cooked Daal Makhni on POS' });
  await makhni.getByLabel('POS category').selectOption({ label: 'Sabzi & Daal' });
  await makhni.getByRole('button', { name: '1 kg', exact: true }).click();
  await makhni.getByRole('button', { name: '½ kg', exact: true }).click();
  await makhni.getByRole('button', { name: 'Other size (e.g. 300 g)' }).click();
  await makhni.getByLabel('Name of size 5').fill('300 g');
  assert.equal(await makhni.getByLabel('Portion of 1 kg in g').inputValue(), '1000');
  assert.equal(await makhni.getByLabel('Portion of ½ kg in g').inputValue(), '500');
  assert.equal(await makhni.getByLabel('Portion of 300 g in g').inputValue(), '300', 'a typed weight fills its portion');
  await makhni.getByRole('button', { name: 'Remove Full plate' }).click();
  await makhni.getByRole('button', { name: 'Remove Half plate' }).click();
  await makhni.getByLabel('Price of 1 kg').fill('1200');
  await makhni.getByLabel('Price of ½ kg').fill('650');
  await makhni.getByLabel('Price of 300 g').fill('400');
  await shot(owner, '05c-desktop-quick-sizes-kg');
  await makhni.getByRole('button', { name: 'Put on POS' }).click();
  await makhni.waitFor({ state: 'detached' });
  data = await saved(owner);
  const makhniItem = data.items.find((i) => i.name === 'Daal Makhni');
  assert.deepEqual(makhniItem.variants.map((v) => [v.name, v.price]), [['1 kg', 120_000], ['½ kg', 65_000], ['300 g', 40_000]]);
  assert.deepEqual(makhniItem.variants.map((v) => recipeOf(data, makhniItem.id, v.id).versions.at(-1).lines[0].quantityMilli), [1_000_000, 500_000, 300_000]);
  await pos.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' });
  await pos.getByRole('button', { name: /^Daal Makhni/ }).first().click();
  await dialog(pos).getByRole('button', { name: /^1 kg/ }).click();
  await dialog(pos).getByRole('button', { name: /^½ kg/ }).click();
  await dialog(pos).getByText('One line for the kitchen: 1.5 kg: 1 kg + ½ kg').waitFor();
  await dialog(pos).getByRole('button', { name: /^Add · Rs\. 1,850/ }).waitFor();
  await dialog(pos).getByRole('button', { name: 'Close' }).first().click();
  ok('Daal Makhni: 1 kg (1000 g) Rs. 1,200, ½ kg (500 g) Rs. 650, 300 g Rs. 400 from the quick buttons; POS: 1 kg + ½ kg = one 1.5 kg line, Rs. 1,850');

  console.log('\n   A new prepared recipe asks at once and finds the menu\'s Chicken Pulao');
  await owner.getByRole('button', { name: 'Add Recipe' }).click();
  await builder(owner).getByLabel('Name', { exact: true }).fill('Cooked Chicken Pulao');
  await builder(owner).getByLabel('Category').selectOption('GRAINS');
  await builder(owner).getByLabel('Ingredient 1').selectOption({ label: 'Basmati rice' });
  await builder(owner).getByLabel('Unit 1').selectOption('kg');
  await builder(owner).getByLabel('Quantity 1').fill('1');
  await builder(owner).getByRole('button', { name: 'Add ingredient', exact: true }).click();
  await builder(owner).getByLabel('Ingredient 2').selectOption({ label: 'Chicken (with bone)' });
  await builder(owner).getByLabel('Unit 2').selectOption('kg');
  await builder(owner).getByLabel('Quantity 2').fill('1');
  await builder(owner).getByLabel('One batch makes').fill('2.5');
  await builder(owner).locator('[data-main-ingredient]').selectOption({ label: 'Basmati rice' });
  await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
  await builder(owner).waitFor({ state: 'detached' });
  const asked = owner.getByRole('dialog', { name: 'Cooked Chicken Pulao is saved. Do you sell it on the POS?' });
  assert.equal(await asked.getByRole('radio', { name: /Link to Chicken Pulao \(Sabzi & Daal\)/ }).isChecked(), true, 'the product from Test A');
  await shot(owner, '06-desktop-new-recipe-asks');
  await asked.getByRole('button', { name: 'Link and save' }).click();
  await asked.waitFor({ state: 'detached' });
  await card(owner, 'Cooked Chicken Pulao').locator('[data-on-pos]').getByText('Chicken Pulao').waitFor();
  data = await saved(owner);
  assert.equal(data.items.filter((i) => !i.archivedAt && /chicken pulao/i.test(i.name)).length, 1, 'still one Chicken Pulao');
  assert.equal(recipeOf(data, pulao.id, null).versions.length, 2, 'its Test A recipe stays as version 1');
  ok('"Cooked Chicken Pulao" saved → "Do you sell it on the POS?" → linked to Chicken Pulao from Test A (250 g a plate), still one product');

  console.log('\n   Recipes → Menu items → Add Recipe: choose the menu product from a list');
  await owner.getByRole('tab', { name: 'Menu items' }).click();
  await owner.getByRole('button', { name: 'Add Recipe', exact: true }).click();
  const pick = owner.getByRole('dialog', { name: 'Add a recipe to a menu product' });
  const first = await pick.getByLabel('Menu product').locator('option').first().innerText();
  assert.ok(first.endsWith('No recipe'), `products without a recipe first: ${first}`);
  await pick.getByLabel('Menu product').selectOption({ label: 'Chicken White Karahi · Karahi — No recipe' });
  await pick.getByRole('button', { name: 'Open Recipe Builder' }).click();
  await builder(owner).getByText('Chicken White Karahi').first().waitFor();
  await builder(owner).getByRole('button', { name: 'Recipes', exact: true }).click();
  await builder(owner).waitFor({ state: 'detached' });
  ok('Add Recipe lists the menu products (no recipe first) and opens the builder on Chicken White Karahi');

  console.log('\n   Manager, phone and laptop');
  const manager = await openAs(USER.manager, '/inventory', DESKTOP);
  await openPrepared(manager);
  await card(manager, 'Cooked Qeema').getByRole('button', { name: 'Sell Cooked Qeema on POS' }).waitFor();
  const phone = await openAs(USER.owner, '/inventory', PHONE);
  await openPrepared(phone);
  await card(phone, 'Cooked Qeema').getByRole('button', { name: 'Sell Cooked Qeema on POS' }).click();
  await phone.getByRole('dialog', { name: 'Sell Cooked Qeema on POS' }).waitFor();
  assert.ok(await noSideways(phone), 'phone: no sideways scroll');
  await shot(phone, '07-phone-sell-qeema');
  await phone.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await phone.goto(`${BASE_URL}/menu`, { waitUntil: 'networkidle' });
  await menuRow(phone, 'Chicken Biryani').getByText('From Cooked Chicken Biryani').waitFor();
  assert.ok(await noSideways(phone), 'phone Menu: no sideways scroll');
  await shot(phone, '08-phone-menu-recipe-badges');
  const laptop = await openAs(USER.owner, '/menu', LAPTOP);
  await menuRow(laptop, 'Chicken Biryani').scrollIntoViewIfNeeded();
  assert.ok(await noSideways(laptop), 'laptop Menu: no sideways scroll');
  await shot(laptop, '09-laptop-menu-recipe-badges');
  ok('Manager may Sell on POS; phone 390 × 844 and laptop 1278 × 627 without sideways scroll');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nAll integration (I1) checks passed.');
} catch (err) {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}

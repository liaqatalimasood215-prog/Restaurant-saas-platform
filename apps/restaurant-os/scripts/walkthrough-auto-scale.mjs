// Auto Scale walkthrough (Recipe Builder R2, owner's picture and brief 2026-11-05) on the owner's own demo, Lala Restaurant:
// the desi menu replaces pizza (and saved Aziz Pizza data keeps what the owner made); one 1 kg base recipe makes ½ kg and Pao
// (half and a quarter of every line); costs, food cost and profit follow at once; a size can be customized and sent back to
// Auto; a changed price or a new size reaches the Menu only after the confirm box; a supplier is added from the ingredient form.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:auto-scale
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'auto-scale');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const FIXTURE_KEY = 'lala-os-demo-fixture';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = id(101);
const ITEM = { chickenKarahi: id(710), chickenWhite: id(713), classicPizza: id(701) };
const SIZE = { ckHalf: id(821) };
const ING = { chickenWithBone: id(1330) };
const LAPTOP = { width: 1265, height: 628 };
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const errors = [];

async function open(context, url, viewport, userId = OWNER) {
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, userId]);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  return page;
}
const shot = async (page, name, fullPage = false) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const builder = (page) => page.locator('main [data-recipe-builder]');
const sizeRow = (page, name) => builder(page).locator(`[data-size-row="${name}"]`);
const sizeCost = async (page, name) => (await sizeRow(page, name).locator('[data-size-cost]').innerText()).trim();
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
async function openRecipe(page, itemName) {
  await page.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await page.locator('main [data-recipe-summary]').first().waitFor();
  await page.locator(`main [data-recipe-item="${itemName}"]`).getByRole('button', { name: new RegExp(`recipe: ${itemName}$`) }).click();
  await builder(page).waitFor();
}
/** Search → tap the match: it fills the empty line or adds one, and the search is empty again. */
async function addLine(page, query, name) {
  const search = builder(page).locator('[data-recipe-search]');
  await search.fill(query);
  await builder(page).locator('ul[role="listbox"] button[role="option"]').filter({ hasText: name }).first().click();
  await page.waitForFunction(() => document.querySelector('[data-recipe-search]')?.value === '');
}
async function noSidewaysScroll(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `${label}: the page scrolls sideways by ${wide}px`);
}

try {
  console.log('\nA. Saved Aziz Pizza data (version 17) becomes Lala Restaurant without losing what the owner made');
  {
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    // Make the old data: the test fixture (saved by one stock correction), turned back into version 17 with an item of his own.
    const page = await context.newPage();
    await page.addInitScript((key) => window.localStorage.setItem(key, 'acceptance'), FIXTURE_KEY);
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, OWNER]);
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Adjust Stock' }).click();
    await page.getByRole('dialog').getByLabel('Ingredient').selectOption({ label: 'Onions (8 kg)' });
    await page.getByRole('dialog').getByLabel('Quantity').fill('2');
    await page.getByRole('dialog').getByRole('radio', { name: 'Add' }).click();
    await page.getByRole('dialog').getByRole('radio', { name: 'Found more stock' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save change' }).click();
    await page.getByText('Stock of Onions updated').first().waitFor();
    await page.evaluate(
      ([dataKey, fixtureKey, ownItem]) => {
        const data = JSON.parse(window.localStorage.getItem(dataKey));
        data.version = 17;
        delete data.inventory.recipeScales;
        data.items.push({ ...data.items.find((i) => i.name === 'Chicken Tikka'), id: ownItem, name: 'muttan kari', unit: 'kg', basePrice: 180000, variants: [] });
        window.localStorage.setItem(dataKey, JSON.stringify(data));
        window.localStorage.removeItem(fixtureKey);
      },
      [DATA_KEY, FIXTURE_KEY, id(999)],
    );
    await page.close();
    const owner = await open(context, '/pos', LAPTOP);
    const data = await saved(owner);
    assert.equal(data.version, 20);
    assert.equal(data.restaurant.name, 'Lala Restaurant — DEMO');
    assert.ok(data.items.find((i) => i.id === ITEM.classicPizza).archivedAt, 'pizza is archived, not deleted');
    assert.ok(data.items.some((i) => i.name === 'muttan kari' && !i.archivedAt), "the owner's own item stays");
    assert.deepEqual(data.items.find((i) => i.id === ITEM.chickenKarahi).variants.map((v) => v.name), ['1 kg', '½ kg', 'Pao']);
    assert.ok(data.items.some((i) => i.name === 'Mutton Karahi'));
    assert.ok(data.inventory.suppliers.some((s) => s.name === 'Lahore Mutton Shop — DEMO'));
    assert.ok(data.inventory.recipeScales.some((s) => s.menuItemId === ITEM.chickenKarahi), 'Chicken Karahi gets Auto Scale');
    await owner.getByText('Lala Restaurant — DEMO').first().waitFor();
    assert.equal(await owner.locator('main').getByText('Classic Pizza').count(), 0, 'no pizza on the POS');
    await owner.locator('main').getByText('Mutton Karahi').first().waitFor();
    ok('version 17 → 18: name Lala Restaurant, pizza archived, desi menu, suppliers and Auto Scale added, "muttan kari" kept');
    await context.close();
  }

  console.log('\nB. The owner\'s demo: desi POS and the Chicken Karahi Auto Scale');
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const owner = await open(context, '/pos', LAPTOP);
  for (const name of ['Chicken Karahi', 'Mutton Karahi', 'Daal Mash', 'Seekh Kabab (4 pcs)', 'Fish Fry', 'Naan', 'Raita', 'Doodh Patti Chai', 'Cold Drink']) {
    await owner.locator('main').getByText(name, { exact: true }).first().waitFor();
  }
  assert.equal(await owner.locator('main').getByText(/Pizza|Burger/).count(), 0);
  await shot(owner, '01-pos-desi-menu');
  ok('POS shows the desi menu (karahi, daal, BBQ, fish, naan, raita, chai, cold drinks); no pizza or burger');

  await owner.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await owner.locator('main h1').first().waitFor();
  await owner.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await owner.locator('main [data-recipe-item="Chicken Karahi"]').getByText('Auto Scale').waitFor();
  ok('the Recipes list marks Chicken Karahi "Auto Scale"');
  await owner.locator('main [data-recipe-item="Chicken Karahi"]').getByRole('button', { name: /recipe: Chicken Karahi$/ }).click();
  await builder(owner).waitFor();
  assert.equal(await builder(owner).getByRole('switch', { name: 'Auto Scale Recipe' }).getAttribute('aria-checked'), 'true');
  assert.equal(await sizeCost(owner, '1 kg'), 'Rs. 889.24');
  assert.equal(await sizeCost(owner, '½ kg'), 'Rs. 444.62');
  assert.equal(await sizeCost(owner, 'Pao'), 'Rs. 222.31');
  await sizeRow(owner, '1 kg').getByText('(Base)').waitFor();
  assert.equal((await builder(owner).locator('[data-summary-title]').innerText()).trim(), 'Base Recipe (1 kg)');
  await shot(owner, '02-builder-laptop-top');
  await builder(owner).locator('[data-recipe-sizes]').scrollIntoViewIfNeeded();
  await shot(owner, '03-builder-laptop-sizes');
  await owner.setViewportSize(DESKTOP);
  await shot(owner, '04-builder-desktop', true);
  await owner.setViewportSize(LAPTOP);
  await noSidewaysScroll(owner, 'laptop');
  ok('1 kg base Rs. 889.24 → ½ kg Rs. 444.62 → Pao Rs. 222.31; "(Base)" on 1 kg; the summary says Base Recipe (1 kg)');

  // Change the base: every size follows at once.
  const chicken = builder(owner).locator('[data-recipe-line="1"]');
  await chicken.locator('input[data-quantity]').fill('800');
  assert.equal(await sizeCost(owner, '1 kg'), 'Rs. 765.24');
  assert.equal(await sizeCost(owner, '½ kg'), 'Rs. 382.62');
  assert.equal(await sizeCost(owner, 'Pao'), 'Rs. 191.31');
  ok('chicken 1000 g → 800 g: 1 kg Rs. 765.24, ½ kg Rs. 382.62, Pao Rs. 191.31 at once');

  // An automatic size shows the base × its share.
  await sizeRow(owner, '½ kg').locator('td').nth(1).click();
  await builder(owner).locator('[data-size-banner]').getByText('½ kg follows the base: 50 % of every ingredient of 1 kg.').waitFor();
  assert.equal((await builder(owner).locator('[data-scaled-lines] li').first().locator('[data-scaled-quantity]').innerText()).trim(), '400 g');
  await shot(owner, '05-half-kg-follows-base');
  ok('½ kg follows the base: chicken 400 g (half of 800 g)');

  // Customize this size, then back to Auto.
  await builder(owner).getByRole('button', { name: 'Customize this size' }).click();
  await sizeRow(owner, '½ kg').getByText('Custom').waitFor();
  await builder(owner).locator('[data-recipe-line="1"] input[data-quantity]').fill('450');
  assert.equal(await sizeCost(owner, '½ kg'), `Rs. ${(382.62 + 50 * 0.62).toFixed(2)}`);
  await builder(owner).getByRole('button', { name: 'Back to Auto' }).click();
  assert.equal(await sizeRow(owner, '½ kg').getByText('Custom').count(), 0);
  assert.equal(await sizeCost(owner, '½ kg'), 'Rs. 382.62');
  ok('Customize this size: 450 g on ½ kg costs Rs. 31 more; Back to Auto: half of the base again');

  // A new price: food cost and profit follow; the Menu changes only after the confirm box.
  await builder(owner).getByRole('textbox', { name: 'Selling price of ½ kg' }).first().fill('1500');
  assert.equal((await sizeRow(owner, '½ kg').locator('[data-size-food-cost]').innerText()).trim(), '25.5 %');
  assert.equal((await sizeRow(owner, '½ kg').locator('[data-size-profit]').innerText()).trim(), 'Rs. 1,117.38');
  await builder(owner).getByRole('button', { name: 'Save Draft' }).click();
  const confirm = owner.getByRole('dialog', { name: 'Change the Menu too?' });
  await confirm.locator('[data-menu-changes]').getByText('Rs. 1,400 → Rs. 1,500').waitFor();
  await shot(owner, '06-confirm-menu-price');
  await confirm.getByRole('button', { name: 'Yes, change the Menu' }).click();
  await builder(owner).waitFor({ state: 'detached' });
  let data = await saved(owner);
  const karahi = data.items.find((i) => i.id === ITEM.chickenKarahi);
  assert.equal(karahi.variants.find((v) => v.id === SIZE.ckHalf).price, 150_000);
  const halfRecipe = data.inventory.recipes.find((r) => r.target.kind === 'ITEM' && r.target.menuItemId === ITEM.chickenKarahi && r.target.variantId === SIZE.ckHalf);
  const halfLines = halfRecipe.versions.at(-1).lines;
  assert.equal(halfLines.find((l) => l.ingredientId === ING.chickenWithBone).quantityMilli, 400_000, '½ kg recipe saved with 400 g chicken');
  assert.equal(halfRecipe.versions.at(-1).status, 'DRAFT');
  ok('½ kg Rs. 1,500: food cost 25.5 %, profit Rs. 1,117.38; Save Draft → confirm → Menu price Rs. 1,500 and the ½ kg recipe saved (400 g chicken)');

  console.log('\nC. Chicken White Karahi: no recipe yet → Auto Scale, a new size Half Pao, Verify');
  await openRecipe(owner, 'Chicken White Karahi');
  const autoSwitch = builder(owner).getByRole('switch', { name: 'Auto Scale Recipe' });
  assert.equal(await autoSwitch.getAttribute('aria-checked'), 'false');
  await autoSwitch.click();
  await addLine(owner, 'Chicken (with', 'Chicken (with bone)');
  await builder(owner).locator('[data-recipe-line="1"] input[data-quantity]').fill('1000');
  await addLine(owner, 'Fresh cream', 'Fresh cream');
  await builder(owner).locator('[data-recipe-line="2"] input[data-quantity]').fill('200');
  // 1000 g × Rs. 620/kg + 200 ml × Rs. 900/L = Rs. 800
  assert.equal(await sizeCost(owner, '1 kg'), 'Rs. 800');
  assert.equal(await sizeCost(owner, 'Pao'), 'Rs. 200');
  await builder(owner).getByRole('button', { name: 'Customize Sizes' }).click();
  const sizes = owner.getByRole('dialog', { name: 'Customize Sizes' });
  await sizes.getByRole('button', { name: 'Half Pao' }).click();
  await sizes.getByRole('textbox', { name: 'Selling price of Half Pao' }).fill('450');
  await sizes.locator('[data-size-setup="Half Pao"]').getByText('12.5 %').waitFor();
  await shot(owner, '07-customize-sizes');
  await sizes.getByRole('button', { name: 'Done' }).click();
  assert.equal(await sizeCost(owner, 'Half Pao'), 'Rs. 100');
  assert.equal((await sizeRow(owner, 'Half Pao').locator('[data-size-food-cost]').innerText()).trim(), '22.2 %');
  await builder(owner).getByRole('button', { name: 'Verify Recipe' }).click();
  const confirmNew = owner.getByRole('dialog', { name: 'Change the Menu too?' });
  await confirmNew.locator('[data-menu-changes]').getByText('Half Pao').waitFor();
  assert.equal(await confirmNew.getByRole('button', { name: 'Save recipe only' }).count(), 0, 'a new size needs the Menu');
  await confirmNew.getByRole('button', { name: 'Yes, change the Menu' }).click();
  await builder(owner).waitFor({ state: 'detached' });
  data = await saved(owner);
  const white = data.items.find((i) => i.id === ITEM.chickenWhite);
  const halfPao = white.variants.find((v) => v.name === 'Half Pao');
  assert.equal(halfPao?.price, 45_000);
  const scale = data.inventory.recipeScales.find((s) => s.menuItemId === ITEM.chickenWhite);
  assert.deepEqual(scale.sizes.map((s) => s.quantityMilli), [1000, 500, 250, 125]);
  const halfPaoRecipe = data.inventory.recipes.find((r) => r.target.kind === 'ITEM' && r.target.variantId === halfPao.id);
  assert.equal(halfPaoRecipe.versions.at(-1).status, 'VERIFIED');
  assert.equal(halfPaoRecipe.versions.at(-1).lines.find((l) => l.ingredientId === ING.chickenWithBone).quantityMilli, 125_000);
  ok('Chicken White Karahi: base 1 kg Rs. 800 → Pao Rs. 200; Half Pao added (12.5 %, Rs. 100, Rs. 450, food cost 22.2 %); Verify → Menu has Half Pao at Rs. 450, its recipe uses 125 g chicken, VERIFIED');

  console.log('\nD. A supplier added from the ingredient form');
  await owner.getByRole('tab', { name: 'Stock', exact: true }).click();
  await owner.getByRole('button', { name: 'Add Ingredient' }).first().click();
  const form = owner.getByRole('dialog');
  await form.getByLabel('Preferred supplier').selectOption({ label: '+ New supplier' });
  await form.getByLabel('Supplier name').fill('Ali Masala Wala');
  await form.getByLabel('Supplier phone').fill('0300-1234567');
  await form.getByRole('button', { name: 'Add supplier' }).click();
  await owner.getByText('Ali Masala Wala added to the supplier list').waitFor();
  assert.equal(await form.getByLabel('Preferred supplier').locator('option:checked').innerText(), 'Ali Masala Wala');
  await shot(owner, '08-new-supplier');
  data = await saved(owner);
  assert.ok(data.inventory.suppliers.some((s) => s.name === 'Ali Masala Wala' && s.phone === '0300-1234567'));
  await form.getByRole('button', { name: 'Cancel' }).first().click();
  ok('"+ New supplier" in the ingredient form adds Ali Masala Wala (with phone) and chooses it');

  console.log('\nE. Tablet and phone');
  await owner.setViewportSize(TABLET);
  await openRecipe(owner, 'Mutton Karahi');
  await noSidewaysScroll(owner, 'tablet');
  await shot(owner, '09-builder-tablet', true);
  await owner.setViewportSize(PHONE);
  await owner.waitForTimeout(300);
  await noSidewaysScroll(owner, 'phone');
  await shot(owner, '10-builder-phone', true);
  ok('tablet 1024 × 768 and phone 390 × 844: no sideways scrolling');

  assert.deepEqual(errors, [], `browser errors: ${errors.join(' | ')}`);
  console.log('\nAll Auto Scale checks passed (DEMO data).');
} finally {
  await browser.close();
}

// Multiple purchase units (owner's brief, 2026-11-07) on his own demo, Lala Restaurant: one product, several ways to buy
// it, one stock. Cooking oil 2 cartons of 12 L at Rs. 4,800 + 6 bottles of 1 L at Rs. 420 = Rs. 12,120 and 30 litres;
// rice 1 bag of 25 kg + 5 kg loose = 30 kg; eggs by the tray; recipes cost from the bill's average; his last rate per
// unit; Add New Product with a tray and a carton; editing a packing never changes an old bill; the Stock form; a draft
// keeps its units; phone width.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:units
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'units');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = id(101);
const OIL = id(1312);
const RICE = id(1361);
const KIRYANA = 'Madina Kiryana Store — DEMO';
const LAPTOP = { width: 1265, height: 628 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function open(viewport) {
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, OWNER]);
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.locator('main [data-suppliers]').waitFor();
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const workspace = (page) => page.locator('main [data-supplier-workspace]');
const bill = (page) => page.locator('main [data-purchase-bill]');
const row = (page, name, unit) => bill(page).locator(`[data-bill-line="${name}"][data-bill-unit="${unit}"]`);
async function openKiryanaBill(page) {
  await page.locator(`main [data-supplier-card="${KIRYANA}"]`).click();
  await workspace(page).getByRole('button', { name: 'New Purchase (Bill)' }).click();
  await bill(page).waitFor();
}
const add = (page, name) => bill(page).getByRole('button', { name: `Add ${name} to the bill` }).click();
const search = (page, text) => bill(page).getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill(text);
async function fill(page, name, unit, qty, rate) {
  await row(page, name, unit).getByRole('textbox', { name: `Quantity of ${name} received` }).fill(qty);
  if (rate) await row(page, name, unit).getByRole('textbox', { name: `Rate of ${name}` }).fill(rate);
}

try {
  console.log('\n1. Oil: 2 cartons + 6 bottles in one bill; rice: 1 bag + 5 kg loose; eggs by the tray');
  const owner = await open(LAPTOP);
  await openKiryanaBill(owner);
  assert.equal(await owner.getByRole('heading', { name: 'Inventory & Suppliers' }).count(), 0, 'the bill takes the whole screen');
  await search(owner, 'oil');
  await add(owner, 'Cooking oil');
  const oilUnit = row(owner, 'Cooking oil', 'main').getByRole('combobox', { name: 'Unit of Cooking oil' });
  assert.deepEqual(await oilUnit.locator('option').allInnerTexts(), ['litre', 'ml', 'bottle (1 litre)', 'carton (12 litres)']);
  await oilUnit.selectOption({ label: 'carton (12 litres)' });
  await row(owner, 'Cooking oil', 'pack:p-12-1').waitFor();
  assert.equal(await row(owner, 'Cooking oil', 'pack:p-12-1').getByRole('textbox', { name: 'Rate of Cooking oil' }).inputValue(), '6900', 'the carton brings its own price');
  await fill(owner, 'Cooking oil', 'pack:p-12-1', '2', '4800');
  assert.equal(await row(owner, 'Cooking oil', 'pack:p-12-1').locator('[data-line-stock]').innerText(), '= 24 litres');
  await row(owner, 'Cooking oil', 'pack:p-12-1').getByRole('button', { name: '+ another unit' }).click();
  await row(owner, 'Cooking oil', 'main').getByRole('combobox', { name: 'Unit of Cooking oil' }).selectOption({ label: 'bottle (1 litre)' });
  await fill(owner, 'Cooking oil', 'pack:p-12-0', '6', '420');
  assert.equal(await row(owner, 'Cooking oil', 'pack:p-12-0').locator('[data-line-amount]').innerText(), 'Rs. 2,520');
  assert.equal(await row(owner, 'Cooking oil', 'pack:p-12-1').locator('[data-line-amount]').innerText(), 'Rs. 9,600');
  await bill(owner).locator('[data-stock-added]').getByText('Cooking oil +30 litres').waitFor();
  assert.equal(await bill(owner).locator('[data-bill-total]').innerText(), 'Rs. 12,120');
  await search(owner, 'rice');
  await add(owner, 'Basmati rice');
  await row(owner, 'Basmati rice', 'main').getByRole('combobox', { name: 'Unit of Basmati rice' }).selectOption({ label: 'bag (25 kg)' });
  await fill(owner, 'Basmati rice', 'pack:p-61-0', '1', '9000');
  await row(owner, 'Basmati rice', 'pack:p-61-0').getByRole('button', { name: '+ another unit' }).click();
  await fill(owner, 'Basmati rice', 'main', '5', '380');
  await search(owner, 'egg');
  await add(owner, 'Eggs (anday)');
  assert.equal(await row(owner, 'Eggs (anday)', 'main').getByRole('combobox', { name: 'Unit of Eggs (anday)' }).locator('option:checked').innerText(), 'tray (30 pieces)');
  await fill(owner, 'Eggs (anday)', 'main', '2');
  await search(owner, '');
  await bill(owner).locator('[data-stock-added]').getByText('Cooking oil +30 litres · Basmati rice +30 kg · Eggs (anday) +60 pieces').waitFor();
  assert.equal(await bill(owner).locator('[data-bill-total]').innerText(), 'Rs. 25,120', '12,120 + 9,000 + 1,900 + 2,100');
  await shot(owner, '01-laptop-mixed-units');
  await bill(owner).getByRole('button', { name: 'Save Purchase' }).click();
  // P3 (2026-11-08): 30 kg rice is the main ingredient of Biryani and Zeera Rice: their recipes for this purchase show until Done
  const recipesForPurchase = owner.getByRole('dialog', { name: 'Recipes for this purchase' });
  await recipesForPurchase.locator('[data-summary-dish="Cooked Rice (zeera)"]').getByText('30 kg').first().waitFor();
  await recipesForPurchase.getByRole('button', { name: 'Done' }).click();
  await workspace(owner).waitFor();
  let data = await saved(owner);
  const onHand = (ingredientId) => data.inventory.movements.filter((m) => m.ingredientId === ingredientId).reduce((sum, m) => sum + m.quantityMilli, 0);
  assert.equal(onHand(OIL), 48_000_000, 'oil 18 + 30 = 48 litres');
  assert.equal(onHand(RICE), 40_000_000, 'rice 10 + 30 = 40 kg');
  const purchase = data.inventory.khata.findLast((e) => e.kind === 'PURCHASE');
  assert.equal(purchase.amount, 2_512_000);
  assert.deepEqual(
    purchase.lines.filter((l) => l.ingredientId === OIL).map((l) => [l.unit, l.unitSizeMilli, l.stockMilli]),
    [
      ['carton', 12_000_000, 24_000_000],
      ['bottle', 1_000_000, 6_000_000],
    ],
    'each line keeps the unit it was bought in',
  );
  const oil = data.inventory.ingredients.find((i) => i.id === OIL);
  assert.equal(oil.purchasePrice, 40_400, 'recipes: Rs. 12,120 / 30 L = Rs. 404 a litre (the bill average)');
  assert.equal(data.inventory.ingredients.find((i) => i.id === RICE).purchasePrice, 36_333, 'Rs. 10,900 / 30 kg');
  assert.equal(data.inventory.suppliers.find((s) => s.name === KIRYANA).rates[`${OIL}|pack:p-12-1`], 480_000, 'his last carton rate');
  ok('oil: carton (12 L) brings Rs. 6,900, typed Rs. 4,800 × 2 = Rs. 9,600 (= 24 litres) + 6 bottles × Rs. 420 = Rs. 2,520 → +30 litres; rice: bag + 5 kg → +30 kg; eggs 2 trays → +60; total Rs. 25,120; stock once; lines keep their units; recipes cost Rs. 404 / L and Rs. 363.33 / kg');

  console.log('\n2. Next bill: his last rate per unit; a draft keeps its units');
  await workspace(owner).getByRole('button', { name: 'New Purchase (Bill)' }).click();
  await search(owner, 'oil');
  await add(owner, 'Cooking oil');
  await row(owner, 'Cooking oil', 'main').getByRole('combobox', { name: 'Unit of Cooking oil' }).selectOption({ label: 'carton (12 litres)' });
  assert.equal(await row(owner, 'Cooking oil', 'pack:p-12-1').getByRole('textbox', { name: 'Rate of Cooking oil' }).inputValue(), '4800', 'his last carton rate');
  await fill(owner, 'Cooking oil', 'pack:p-12-1', '1');
  await bill(owner).getByRole('button', { name: 'Save Draft' }).click();
  await owner.getByText('Draft saved. Nothing added to stock yet.').waitFor();
  await bill(owner).getByRole('button', { name: KIRYANA }).click();
  await workspace(owner).getByRole('button', { name: 'Continue draft bill' }).click();
  await row(owner, 'Cooking oil', 'pack:p-12-1').waitFor();
  assert.equal(await row(owner, 'Cooking oil', 'pack:p-12-1').getByRole('textbox', { name: 'Quantity of Cooking oil received' }).inputValue(), '1');
  await bill(owner).getByRole('button', { name: 'Discard draft' }).click();
  ok('the carton comes back at Rs. 4,800 (his last rate); the draft keeps carton × 1');

  console.log('\n3. Add New Product with a tray and a carton');
  await bill(owner).getByRole('button', { name: 'Add New Product' }).click();
  const np = owner.locator('main [data-new-product]');
  await np.getByRole('textbox', { name: 'Product name' }).fill('Desi anday');
  await np.getByRole('button', { name: 'piece', exact: true }).click();
  await np.getByRole('button', { name: 'tray', exact: true }).click();
  await np.getByRole('textbox', { name: 'Size of one packing' }).fill('30');
  await np.getByRole('textbox', { name: 'Purchase price per tray' }).fill('1100');
  await np.getByRole('button', { name: 'Add a packing (carton, bag, tray …)' }).click();
  await np.locator('[data-packing]').getByRole('textbox', { name: 'How much one carton holds' }).fill('360');
  await np.locator('[data-packing]').getByRole('textbox', { name: 'Price of one carton' }).fill('12500');
  await np.getByRole('textbox', { name: 'Loose price per piece' }).fill('40');
  await shot(owner, '02-laptop-new-product-packings');
  await np.getByRole('button', { name: 'Save Product & Add to Bill' }).click();
  await row(owner, 'Desi anday', 'main').waitFor();
  assert.deepEqual(await row(owner, 'Desi anday', 'main').getByRole('combobox', { name: 'Unit of Desi anday' }).locator('option').allInnerTexts(), ['tray (30 pieces)', 'piece', 'carton (360 pieces)']);
  await row(owner, 'Desi anday', 'main').getByRole('combobox', { name: 'Unit of Desi anday' }).selectOption({ label: 'piece' });
  assert.equal(await row(owner, 'Desi anday', 'loose:piece').getByRole('textbox', { name: 'Rate of Desi anday' }).inputValue(), '40');
  await bill(owner).getByRole('button', { name: 'Remove Desi anday from the bill' }).click();
  await bill(owner).getByRole('button', { name: KIRYANA }).click();
  ok('Desi anday: piece, a tray of 30 at Rs. 1,100, also a carton of 360 at Rs. 12,500, loose Rs. 40; on the bill with all three ways');

  console.log('\n4. Editing a packing never changes an old bill; the Stock form has the same list');
  await workspace(owner).getByRole('button', { name: 'Edit Basmati rice' }).click();
  const ep = owner.locator('main [data-edit-product="Basmati rice"]');
  await ep.locator('[data-packing="bag"]').getByRole('textbox', { name: 'How much one bag holds' }).fill('26');
  await ep.getByRole('button', { name: 'Save changes' }).click();
  await owner.getByText('Basmati rice saved').waitFor();
  data = await saved(owner);
  assert.equal(data.inventory.ingredients.find((i) => i.id === RICE).packings[0].sizeMilli, 26_000_000);
  assert.equal(data.inventory.khata.find((e) => e.id === purchase.id).lines.find((l) => l.unit === 'bag').unitSizeMilli, 25_000_000, 'the old bill still says 25 kg');
  assert.equal(onHand(RICE), 40_000_000);
  await owner.getByRole('button', { name: 'All suppliers' }).click();
  await owner.getByRole('tab', { name: 'Stock', exact: true }).click();
  await owner.locator('main').getByRole('searchbox').first().fill('Sugar');
  await owner.locator('main').getByRole('button', { name: 'Edit Sugar' }).first().click();
  const form = owner.getByRole('dialog');
  await form.locator('[data-packing="bag"]').waitFor();
  assert.equal(await form.locator('[data-packing="bag"]').getByRole('textbox', { name: 'How much one bag holds' }).inputValue(), '50');
  await shot(owner, '03-laptop-stock-form-packings');
  await form.getByRole('button', { name: 'Cancel' }).click();
  ok('rice bag 25 → 26 kg: the saved bill keeps 25 kg and the stock stays 40 kg; Stock → Sugar shows the 50 kg bag');

  console.log('\n5. Phone');
  const phone = await open(PHONE);
  await openKiryanaBill(phone);
  await search(phone, 'rice');
  await add(phone, 'Basmati rice');
  await row(phone, 'Basmati rice', 'main').getByRole('combobox', { name: 'Unit of Basmati rice' }).selectOption({ label: 'bag (26 kg)' });
  await fill(phone, 'Basmati rice', 'pack:p-61-0', '2');
  const wide = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `phone scrolls sideways by ${wide}px`);
  await row(phone, 'Basmati rice', 'pack:p-61-0').scrollIntoViewIfNeeded();
  await shot(phone, '04-phone-bill-units');
  ok('phone 390 px: unit choice on the bill, no sideways scroll');

  assert.deepEqual(errors, [], `browser errors: ${errors.join(' | ')}`);
  console.log('\nAll multiple-units checks passed (DEMO data).');
} finally {
  await browser.close();
}

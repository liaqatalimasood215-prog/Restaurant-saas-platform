// Supplier order, pictures and each supplier's whole range (owner, 2026-11-06), on his own demo, Lala Restaurant:
// Edit order (tap Karyana, Sabzi, Chicken → 1, 2, 3 → Done, kept after a reload, Reset A–Z), the demo picture of each
// supplier, Upload / Remove picture (DEMO: this browser only), the new karyana / sabzi / chicken / doodh products, and the
// 19 → 20 upgrade keeping what he changed (his "samad karina store"). Manager sees, no Edit order for the Cashier (no access).
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:supplier-order
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'supplier-order');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102) };
const NEW_INGREDIENTS = Array.from({ length: 19 }, (_, i) => id(1361 + i));
const PACKAGING = id(1223);
const KIRYANA = 'Madina Kiryana Store — DEMO';
const SABZI = 'Sabzi Mandi — DEMO';
const CHICKEN = 'Fresh Chicken Point — DEMO';
const DAIRY = 'Fresh Doodh Dairy — DEMO';
const LAPTOP = { width: 1265, height: 628 };
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function openAs(userId, viewport) {
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, userId]);
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
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const cards = (page) => page.locator('main [data-supplier-card]');
const cardNames = (page) => cards(page).evaluateAll((list) => list.map((c) => c.getAttribute('data-supplier-card')));
const card = (page, name) => page.locator(`main [data-supplier-card="${name}"]`);
const workspace = (page) => page.locator('main [data-supplier-workspace]');
const product = (page, name) => workspace(page).locator(`[data-product-row="${name}"]`);
async function openSuppliers(page) {
  await page.getByRole('tab', { name: 'Suppliers', exact: true }).click();
  await page.locator('main [data-suppliers]').waitFor();
}
/** One supplier fills the screen (owner, 2026-11-06): back to the list first when one is open. */
async function backToList(page) {
  const back = page.getByRole('button', { name: 'All suppliers' });
  if (await back.isVisible()) await back.click();
  await page.locator('main [data-supplier-card]').first().waitFor();
}
async function openSupplier(page, name) {
  await backToList(page);
  await card(page, name).click();
  await page.locator(`main [data-supplier-workspace="${name}"]`).waitFor();
}
async function noSidewaysScroll(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `${label}: the page scrolls sideways by ${wide}px`);
}

try {
  console.log('\n1. Each supplier brings his whole range, with a demo picture');
  const owner = await openAs(USER.owner, LAPTOP);
  await openSuppliers(owner);
  assert.equal(await cards(owner).count(), 9);
  assert.equal(await card(owner, KIRYANA).locator('[data-supplier-art]').innerText(), '🛒');
  assert.equal(await card(owner, SABZI).locator('[data-supplier-art]').innerText(), '🥬');
  assert.equal(await card(owner, CHICKEN).locator('[data-supplier-art]').innerText(), '🐔');
  assert.equal(await card(owner, DAIRY).locator('[data-supplier-art]').innerText(), '🥛');
  const ranges = {
    [KIRYANA]: ['Atta (20 kg bag)', 'Cooking oil', 'Desi ghee', 'Basmati rice', 'Sugar', 'Tea leaves (900 g pack)', 'Haldi (200 g pack)', 'Zeera (200 g pack)', 'Garam masala (100 g pack)', 'Elaichi (50 g pack)', 'Sirka (vinegar)'],
    [SABZI]: ['Tomatoes', 'Onions', 'Potatoes (aloo)', 'Capsicum (shimla mirch)', 'Cabbage (band gobhi)', 'Peas (matar)', 'Spinach (palak)', 'Mint (podina)', 'Carrots (gajar)'],
    [CHICKEN]: ['Chicken (with bone)', 'Chicken (boneless)', 'Chicken leg piece', 'Chicken wings', 'Chicken breast (tikka cut)'],
    [DAIRY]: ['Fresh milk', 'Yogurt (dahi)', 'Butter (makhan)', 'Paneer', 'Khoya'],
  };
  for (const [supplier, products] of Object.entries(ranges)) {
    await openSupplier(owner, supplier);
    for (const name of products) await product(owner, name).waitFor();
    assert.equal(await workspace(owner).locator('[data-supplier-art]').count(), 1, `${supplier}: big picture in the header`);
  }
  assert.equal(await product(owner, 'Khoya').locator('[data-stock-now]').innerText(), '0.5 kg');
  await openSupplier(owner, KIRYANA);
  assert.equal(await cards(owner).count(), 0, 'one supplier takes the whole screen: the list is closed');
  await shot(owner, '01-laptop-kiryana-range');
  ok('demo pictures 🛒 🥬 🐔 🥛; karyana 11+, sabzi 9, chicken 5, doodh 5 products each with stock');

  console.log('\n1b. Full screen: picture cards, search, most delivered first');
  const names = () => workspace(owner).locator('[data-product-row]').evaluateAll((list) => list.map((r) => r.getAttribute('data-product-row')));
  const first = await names();
  assert.deepEqual(first, [...first].sort((a, b) => a.localeCompare(b)), 'nothing delivered yet: A–Z');
  await workspace(owner).getByRole('searchbox', { name: 'Search his products' }).fill('masala');
  assert.deepEqual(await names(), ['BBQ masala (100 g pack)', 'Garam masala (100 g pack)', 'Karahi masala (100 g pack)']);
  await workspace(owner).getByRole('searchbox', { name: 'Search his products' }).fill('zzz');
  await workspace(owner).getByText('No product matches.').waitFor();
  await workspace(owner).getByRole('searchbox', { name: 'Search his products' }).fill('');
  const bill = owner.locator('main [data-purchase-bill]');
  const line = (name) => bill.locator(`[data-bill-line="${name}"]`);
  const buy = async (items) => {
    // Tap the first product on his screen: New Purchase (Bill) opens with it; tap the others on the bill screen.
    await product(owner, items[0][0]).click();
    for (const [name] of items.slice(1)) await bill.getByRole('button', { name: `Add ${name} to the bill` }).click();
    for (const [name, qty] of items) await line(name).getByRole('textbox', { name: `Quantity of ${name} received` }).fill(qty);
    await bill.getByRole('button', { name: 'Save Purchase' }).click();
    await workspace(owner).waitFor();
    await owner.waitForTimeout(200);
  };
  await buy([['Sugar', '2']]);
  await buy([['Sugar', '1']]);
  await buy([['Cooking oil', '5']]);
  await owner.waitForFunction(() => document.querySelectorAll('main [data-product-row]')[1]?.getAttribute('data-product-row') === 'Cooking oil');
  assert.deepEqual((await names()).slice(0, 2), ['Sugar', 'Cooking oil'], 'Sugar came twice, oil once: they lead');
  assert.equal(await product(owner, 'Sugar').locator('[data-uses]').innerText(), '2× in 30 days');
  await product(owner, 'Atta (20 kg bag)').click();
  await bill.getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill('rice');
  await bill.getByRole('button', { name: 'Add Basmati rice to the bill' }).click();
  await bill.getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill('');
  await line('Atta (20 kg bag)').getByRole('textbox', { name: 'Quantity of Atta (20 kg bag) received' }).fill('2');
  await line('Basmati rice').getByRole('textbox', { name: 'Quantity of Basmati rice received' }).fill('10');
  await bill.locator('[data-in-bill]').first().waitFor();
  await bill.getByRole('group', { name: 'Product categories' }).getByRole('button', { name: 'Sauces & Spices' }).click();
  assert.ok((await bill.locator('[data-product-tile]').count()) >= 5, 'spices only');
  await bill.getByRole('group', { name: 'Product categories' }).getByRole('button', { name: 'All' }).click();
  await shot(owner, '01b-laptop-kiryana-bill');
  await noSidewaysScroll(owner, 'laptop bill');
  await bill.getByRole('button', { name: 'Save Purchase' }).click();
  await owner.getByText(/Purchase saved: Rs\. 9,000 added to the khata/).waitFor();
  ok('picture cards; search "masala" finds 3; most delivered first (Sugar 2×, oil 1×); one bill with Atta 2 bags + Basmati 10 kg = Rs. 9,000, category chips');

  console.log('\n2. Edit order: Karyana first, Sabzi second, Chicken third');
  await backToList(owner);
  const before = await cardNames(owner);
  assert.equal(before[0], 'City Packaging — DEMO', 'A–Z before any order');
  await owner.getByRole('button', { name: 'Edit order of suppliers' }).click();
  await owner.locator('main [data-supplier-order-editor]').waitFor();
  assert.equal(await owner.getByRole('button', { name: 'Done' }).isDisabled(), true, 'Done waits for a first tap');
  for (const name of [KIRYANA, SABZI, CHICKEN]) await card(owner, name).click();
  assert.equal(await card(owner, KIRYANA).locator('[data-order-number]').innerText(), '1');
  assert.equal(await card(owner, SABZI).locator('[data-order-number]').innerText(), '2');
  assert.equal(await card(owner, CHICKEN).locator('[data-order-number]').innerText(), '3');
  await card(owner, SABZI).click();
  assert.equal(await card(owner, CHICKEN).locator('[data-order-number]').innerText(), '2', 'a second tap takes one out; the next moves up');
  await card(owner, SABZI).click();
  assert.equal(await card(owner, SABZI).locator('[data-order-number]').innerText(), '3');
  await shot(owner, '02-laptop-edit-order');
  await owner.getByRole('button', { name: 'Done' }).click();
  await owner.getByText('Supplier order saved').waitFor();
  await owner.waitForFunction(() => document.querySelector('main [data-supplier-card]')?.getAttribute('data-supplier-card') === 'Madina Kiryana Store — DEMO');
  const order = await cardNames(owner);
  assert.deepEqual(order.slice(0, 3), [KIRYANA, CHICKEN, SABZI]);
  assert.deepEqual(order.slice(3), before.filter((n) => ![KIRYANA, CHICKEN, SABZI].includes(n)), 'the others follow in their old order');
  await owner.reload({ waitUntil: 'networkidle' });
  await openSuppliers(owner);
  assert.deepEqual(await cardNames(owner), order, 'kept after a reload');
  assert.equal(await workspace(owner).count(), 0, 'Suppliers opens on the list');
  await shot(owner, '03-laptop-after-order');
  ok('tap 1, 2, 3 (a second tap takes one out) → Done → Karyana, Chicken, Sabzi first, the rest after; kept after a reload');

  console.log('\n3. Upload a picture, then remove it');
  const png = await owner.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const c = canvas.getContext('2d');
    c.fillStyle = '#b91c1c';
    c.fillRect(0, 0, 900, 600);
    c.fillStyle = '#facc15';
    c.beginPath();
    c.arc(450, 300, 200, 0, Math.PI * 2);
    c.fill();
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await openSupplier(owner, KIRYANA);
  await workspace(owner).getByRole('button', { name: 'Edit', exact: true }).click();
  const dialog = owner.getByRole('dialog');
  await dialog.locator('[data-photo-field] [data-supplier-art]').waitFor();
  await dialog.locator('input[type=file]').setInputFiles({ name: 'shop.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await dialog.locator('[data-photo-field] [data-supplier-photo]').waitFor();
  await dialog.getByRole('button', { name: 'Change picture' }).waitFor();
  await shot(owner, '04-laptop-upload-picture');
  await dialog.getByRole('button', { name: 'Save supplier' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await workspace(owner).locator('[data-supplier-photo]').waitFor();
  await backToList(owner);
  await card(owner, KIRYANA).locator('[data-supplier-photo]').waitFor();
  const photo = (await saved(owner)).inventory.suppliers.find((s) => s.name === KIRYANA).photo;
  assert.match(photo, /^data:image\/jpeg;base64,/);
  assert.ok(photo.length < 40_000, `a small picture (${photo.length} characters)`);
  const size = await card(owner, KIRYANA).locator('[data-supplier-photo]').evaluate((img) => [img.naturalWidth, img.naturalHeight]);
  assert.deepEqual(size, [256, 256], 'cut to a 256 px square');
  await owner.reload({ waitUntil: 'networkidle' });
  await openSuppliers(owner);
  await card(owner, KIRYANA).locator('[data-supplier-photo]').waitFor();
  await shot(owner, '05-laptop-picture-saved');
  await openSupplier(owner, KIRYANA);
  await workspace(owner).getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not a picture') });
  await dialog.getByText('This file cannot be opened as a picture').waitFor();
  await dialog.getByRole('button', { name: 'Remove picture' }).click();
  await dialog.locator('[data-photo-field] [data-supplier-art]').waitFor();
  await dialog.getByRole('button', { name: 'Save supplier' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await backToList(owner);
  await card(owner, KIRYANA).locator('[data-supplier-art]').waitFor();
  ok('Upload picture → 256 px square, small, on the card and the header, kept after a reload; a text file is refused; Remove → 🛒 again');

  console.log('\n4. Reset A–Z');
  await owner.getByRole('button', { name: 'Edit order of suppliers' }).click();
  await owner.getByRole('button', { name: 'Reset (A–Z)' }).click();
  await owner.getByText('Supplier order saved').last().waitFor();
  await owner.waitForFunction(() => document.querySelector('main [data-supplier-card]')?.getAttribute('data-supplier-card') === 'City Packaging — DEMO');
  assert.deepEqual(await cardNames(owner), before);
  ok('Reset (A–Z) brings the alphabetical order back');

  console.log('\n5. Upgrade 19 → 20 keeps what he changed');
  await owner.evaluate(
    ([key, newIds, packaging]) => {
      const data = JSON.parse(window.localStorage.getItem(key));
      data.version = 19;
      data.inventory.ingredients = data.inventory.ingredients.filter((i) => !newIds.includes(i.id));
      data.inventory.movements = data.inventory.movements.filter((m) => !newIds.includes(m.ingredientId));
      for (const s of data.inventory.suppliers) {
        s.productIds = s.productIds.filter((p) => !newIds.includes(p));
        delete s.sortOrder;
        delete s.photo;
      }
      const his = data.inventory.suppliers.find((s) => s.id === packaging);
      his.name = 'samad karina store';
      his.category = 'GROCERY';
      his.productIds = his.productIds.slice(0, 2);
      window.localStorage.setItem(key, JSON.stringify(data));
    },
    [DATA_KEY, NEW_INGREDIENTS, PACKAGING],
  );
  const old = await saved(owner);
  const hisProducts = old.inventory.suppliers.find((s) => s.id === PACKAGING).productIds;
  await owner.reload({ waitUntil: 'networkidle' });
  await openSuppliers(owner);
  const upgraded = await saved(owner);
  assert.equal(upgraded.version, 20);
  assert.equal(upgraded.inventory.ingredients.length, old.inventory.ingredients.length + 19);
  const his = upgraded.inventory.suppliers.find((s) => s.id === PACKAGING);
  assert.equal(his.name, 'samad karina store');
  assert.deepEqual(his.productIds, hisProducts, 'his own supplier keeps exactly his products');
  await card(owner, 'samad karina store').locator('[data-supplier-art]').waitFor();
  assert.equal(await card(owner, 'samad karina store').locator('[data-supplier-art]').innerText(), '🛒');
  await openSupplier(owner, SABZI);
  await product(owner, 'Potatoes (aloo)').waitFor();
  await openSupplier(owner, DAIRY);
  await product(owner, 'Paneer').waitFor();
  ok('saved version 19 data → 20: 19 new products and their suppliers; "samad karina store" keeps his name and products');

  console.log('\n6. Manager, desktop and phone');
  const manager = await openAs(USER.manager, DESKTOP);
  await openSuppliers(manager);
  await manager.getByRole('button', { name: 'Edit order of suppliers' }).waitFor();
  await shot(manager, '06-desktop-manager');
  await manager.close();
  const phone = await openAs(USER.owner, PHONE);
  await openSuppliers(phone);
  await noSidewaysScroll(phone, 'phone list');
  await shot(phone, '07-phone-list');
  await phone.getByRole('button', { name: 'Edit order of suppliers' }).click();
  await card(phone, DAIRY).click();
  assert.equal(await card(phone, DAIRY).locator('[data-order-number]').innerText(), '1');
  await shot(phone, '08-phone-edit-order');
  await phone.getByRole('button', { name: 'Cancel' }).click();
  await openSupplier(phone, DAIRY);
  await noSidewaysScroll(phone, 'phone supplier');
  await shot(phone, '09-phone-dairy');
  ok('Manager may order suppliers (inventory.manage); phone: list, Edit order, one supplier, no sideways scroll');

  assert.deepEqual(errors, [], `browser errors: ${errors.join(' | ')}`);
  console.log('\nAll supplier order and picture checks passed (DEMO data).');
} finally {
  await browser.close();
}

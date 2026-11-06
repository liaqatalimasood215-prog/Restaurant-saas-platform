// Suppliers walkthrough (owner's Smart Supplier brief, S1, 2026-11-05) on his own demo, Lala Restaurant: the milk supplier
// brings 50 L in the morning (stock 20 → 70 L, khata Rs. 11,000), 20 L in the afternoon (Rs. 15,400), the owner pays
// Rs. 10,000 in the evening (Rs. 5,400 due, Partly paid); a delivery of two products at once; a new rate becomes the
// product's price; a new supplier with an old balance; Overview cards; Manager and Cashier; tablet and phone.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:suppliers
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'suppliers');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103) };
const MILK = id(1335);
const DAIRY = 'Fresh Doodh Dairy — DEMO';
const LAPTOP = { width: 1265, height: 628 };
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
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
const shot = async (page, name, fullPage = false) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const workspace = (page) => page.locator('main [data-supplier-workspace]');
/** Waits until a total shows the value (the screen reloads after a save). */
const metricIs = (page, label, value) => workspace(page).locator(`[data-metric="${label}"]`).getByText(value, { exact: true }).waitFor();
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
  await page.locator(`main [data-supplier-card="${name}"]`).click();
  await page.locator(`main [data-supplier-workspace="${name}"]`).waitFor();
}
const bill = (page) => page.locator('main [data-purchase-bill]');
const billLine = (page, name) => bill(page).locator(`[data-bill-line="${name}"]`);
/** Tap a product of the supplier: New Purchase (Bill) opens with it on the bill. */
async function openBillWith(page, name) {
  await product(page, name).click();
  await billLine(page, name).waitFor();
}
async function fillLine(page, name, qty, rate) {
  await billLine(page, name).getByRole('textbox', { name: `Quantity of ${name} received` }).fill(qty);
  if (rate) await billLine(page, name).getByRole('textbox', { name: `Rate of ${name}` }).fill(rate);
}
async function savePurchase(page) {
  await bill(page).getByRole('button', { name: 'Save Purchase' }).click();
  await workspace(page).waitFor();
}
/** One product, one bill, nothing paid now. */
async function receive(page, name, qty, rate) {
  await openBillWith(page, name);
  await fillLine(page, name, qty, rate);
  await savePurchase(page);
}
async function noSidewaysScroll(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `${label}: the page scrolls sideways by ${wide}px`);
}

try {
  console.log('\n1. Suppliers list and the milk supplier');
  const owner = await openAs(USER.owner, LAPTOP);
  await openSuppliers(owner);
  assert.equal(await owner.locator('main [data-supplier-card]').count(), 9);
  await openSupplier(owner, DAIRY);
  for (const name of ['Fresh milk', 'Yogurt (dahi)', 'Fresh cream', 'Butter (makhan)']) await product(owner, name).waitFor();
  assert.equal(await product(owner, 'Fresh milk').locator('[data-stock-now]').innerText(), '20 litres');
  await metricIs(owner, 'Total due', 'Rs. 0');
  await shot(owner, '01-laptop-dairy-before');
  ok('9 desi suppliers; the dairy supplier shows his products (milk, yogurt, cream, butter); milk stock 20 litres; nothing due');

  console.log('\n2. Morning: 50 L milk at Rs. 220, as a bill');
  await openBillWith(owner, 'Fresh milk');
  assert.equal(await owner.locator('main [data-supplier-workspace]').count(), 0, 'the bill replaces the supplier screen');
  await fillLine(owner, 'Fresh milk', '50', '220');
  assert.equal(await billLine(owner, 'Fresh milk').locator('[data-line-amount]').innerText(), 'Rs. 11,000');
  assert.equal(await bill(owner).locator('[data-bill-total]').innerText(), 'Rs. 11,000');
  assert.equal(await bill(owner).locator('[data-bill-due]').innerText(), 'Rs. 11,000', 'nothing paid now');
  let data = await saved(owner);
  assert.equal(data?.inventory.khata.length ?? 0, 0, 'a bill being typed changes nothing');
  await shot(owner, '02a-laptop-bill-milk');
  await savePurchase(owner);
  await owner.getByText(`Purchase saved: Rs. 11,000 added to the khata of ${DAIRY}`).waitFor();
  await product(owner, 'Fresh milk').locator('[data-stock-now]').getByText('70 litres', { exact: true }).waitFor();
  await metricIs(owner, 'Bought today', 'Rs. 11,000');
  await metricIs(owner, 'Total due', 'Rs. 11,000');
  await workspace(owner).getByText('Unpaid').first().waitFor();
  data = await saved(owner);
  assert.equal(data.inventory.khata.length, 1);
  const purchase = data.inventory.movements.filter((m) => m.type === 'PURCHASE');
  assert.equal(purchase.length, 1);
  assert.equal(purchase[0].ingredientId, MILK);
  assert.equal(purchase[0].quantityMilli, 50_000_000, '50 L = 50,000 ml');
  ok('tap milk → bill; 50 L × Rs. 220 = Rs. 11,000; nothing written while typing; Save Purchase: stock 20 → 70 litres, one PURCHASE movement, khata Rs. 11,000, Unpaid');

  console.log('\n3. Afternoon: 20 L more; evening: pay Rs. 10,000');
  await receive(owner, 'Fresh milk', '20');
  await product(owner, 'Fresh milk').locator('[data-stock-now]').getByText('90 litres', { exact: true }).waitFor();
  await metricIs(owner, 'Bought today', 'Rs. 15,400');
  await workspace(owner).getByRole('button', { name: 'Settle Payment' }).click();
  const pay = owner.getByRole('dialog', { name: `Pay ${DAIRY}` });
  assert.equal(await pay.getByRole('textbox', { name: 'Amount paid (Rs.)' }).inputValue(), '15400', 'the full amount is offered first');
  await pay.getByRole('textbox', { name: 'Amount paid (Rs.)' }).fill('20000');
  await pay.getByRole('button', { name: 'Save payment' }).click();
  await pay.getByText('That is more than what we owe.').waitFor();
  await pay.getByRole('textbox', { name: 'Amount paid (Rs.)' }).fill('10000');
  assert.equal(await pay.locator('[data-remaining]').innerText(), 'Rs. 5,400');
  await shot(owner, '02-laptop-settle-payment');
  await pay.getByRole('button', { name: 'Save payment' }).click();
  await pay.waitFor({ state: 'detached' });
  await metricIs(owner, 'Paid today', 'Rs. 10,000');
  await metricIs(owner, 'Total due', 'Rs. 5,400');
  await workspace(owner).getByText('Partly paid').first().waitFor();
  assert.deepEqual(await workspace(owner).locator('[data-khata-row]').evaluateAll((els) => els.map((e) => e.dataset.khataRow)), ['PAYMENT', 'PURCHASE', 'PURCHASE']);
  data = await saved(owner);
  assert.equal(data.inventory.movements.filter((m) => m.type === 'PURCHASE').length, 2, 'a payment never changes stock');
  await shot(owner, '03-laptop-dairy-after', true);
  ok('20 L more → 90 litres, Rs. 15,400 today; paying Rs. 20,000 refused; Rs. 10,000 cash → Rs. 5,400 due, Partly paid; khata payment, purchase, purchase');

  console.log('\n4. One bill with two products, a new rate, a discount and part paid at once');
  await workspace(owner).getByRole('button', { name: 'New Purchase (Bill)' }).click();
  await bill(owner).waitFor();
  await bill(owner).getByRole('textbox', { name: 'Bill No. (optional)' }).fill('FDD-77');
  await bill(owner).getByRole('button', { name: 'Add Yogurt (dahi) to the bill' }).click();
  await bill(owner).getByRole('button', { name: 'Add Butter (makhan) to the bill' }).click();
  assert.equal(await bill(owner).locator('[data-bill-count]').innerText(), '2 items');
  await fillLine(owner, 'Yogurt (dahi)', '5');
  await fillLine(owner, 'Butter (makhan)', '1', '2000');
  assert.equal(await bill(owner).locator('[data-bill-total]').innerText(), 'Rs. 3,300');
  await bill(owner).getByRole('textbox', { name: 'Discount', exact: true }).fill('300');
  assert.equal(await bill(owner).locator('[data-bill-total]').innerText(), 'Rs. 3,000');
  await bill(owner).getByRole('textbox', { name: 'Paid now' }).fill('5000');
  await bill(owner).getByRole('button', { name: 'Save Purchase' }).click();
  await bill(owner).getByText('Paid now cannot be more than this bill. Pay older dues with Settle Payment.').waitFor();
  await bill(owner).getByRole('textbox', { name: 'Paid now' }).fill('1000');
  assert.equal(await bill(owner).locator('[data-bill-due]').innerText(), 'Rs. 2,000');
  assert.equal(await bill(owner).locator('[data-bill-row="after"] dd').innerText(), 'Rs. 7,400', 'old Rs. 5,400 + this bill Rs. 2,000');
  await shot(owner, '04a-laptop-bill-two-products');
  await savePurchase(owner);
  await metricIs(owner, 'Total due', 'Rs. 7,400');
  data = await saved(owner);
  const delivery = data.inventory.khata.findLast((e) => e.kind === 'PURCHASE');
  assert.equal(delivery.lines.length, 2);
  assert.equal(delivery.amount, 300_000, 'Rs. 3,300 − Rs. 300 discount');
  assert.equal(delivery.billNo, 'FDD-77');
  const paidWith = data.inventory.khata.at(-1);
  assert.equal(paidWith.kind, 'PAYMENT');
  assert.equal(paidWith.amount, -100_000);
  assert.equal(paidWith.billId, delivery.id, 'the payment belongs to this bill; the old due stays apart');
  assert.equal(data.inventory.ingredients.find((i) => i.name === 'Butter (makhan)').purchasePrice, 200_000, 'the rate paid becomes the price');
  await workspace(owner).locator('[data-khata-row="PURCHASE"]').first().getByText(/Bill FDD-77: .* discount Rs\. 300/).waitFor();
  await workspace(owner).getByText('Paid with bill FDD-77 · Cash').waitFor();
  ok('New Purchase (Bill), bill FDD-77: Yogurt 5 kg × Rs. 260 + Butter 1 kg × Rs. 2,000 = Rs. 3,300 − Rs. 300 = Rs. 3,000; paying Rs. 5,000 now refused; Rs. 1,000 cash → bill due Rs. 2,000, total owed Rs. 7,400; butter now Rs. 2,000 / kg');

  console.log('\n5. Stock Movements, Overview, a new supplier with an old balance');
  await owner.getByRole('tab', { name: 'Stock', exact: true }).click();
  await owner.getByRole('tab', { name: /^Stock Movements/ }).click();
  await owner.locator('main [data-ledger-row]').filter({ hasText: 'Received from supplier' }).first().waitFor();
  await owner.getByRole('tab', { name: 'Overview', exact: true }).click();
  await owner.locator('main').getByText('Rs. 18,400').first().waitFor();
  await owner.locator('main').getByText('Rs. 7,400').first().waitFor();
  await openSuppliers(owner);
  await owner.getByRole('button', { name: 'Add supplier' }).click();
  const form = owner.getByRole('dialog', { name: 'Add supplier' });
  await form.getByRole('textbox', { name: 'Supplier name' }).fill('Ali Milk Supplier');
  await form.getByRole('textbox', { name: 'Phone' }).fill('0301-2345678');
  await form.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Dairy' });
  await form.getByRole('textbox', { name: 'Old balance (Rs.)' }).fill('2000');
  await form.locator('[data-product-picker]').getByRole('checkbox', { name: 'Fresh milk', exact: true }).check();
  await shot(owner, '04-laptop-add-supplier');
  await form.getByRole('button', { name: 'Save supplier' }).click();
  await owner.locator('main [data-supplier-workspace="Ali Milk Supplier"]').waitFor();
  await metricIs(owner, 'Previous due', 'Rs. 2,000');
  await product(owner, 'Fresh milk').locator('[data-stock-now]').getByText('90 litres', { exact: true }).waitFor();
  ok('Stock Movements shows "Received from supplier"; Overview: bought today Rs. 18,400, owed Rs. 7,400; Ali Milk Supplier added with Rs. 2,000 old balance and the same milk stock (90 litres, shared)');

  console.log('\n5b. Draft, Add New Product and Save & Print');
  await openSupplier(owner, DAIRY);
  await openBillWith(owner, 'Paneer');
  await fillLine(owner, 'Paneer', '2');
  await bill(owner).getByRole('button', { name: 'Add New Product' }).click();
  const np = owner.locator('main [data-new-product]');
  await np.waitFor();
  assert.equal(await bill(owner).count(), 0, 'one screen at a time: the bill is hidden');
  await np.getByRole('textbox', { name: 'Product name' }).fill('khoya');
  await np.locator('[data-similar]').getByText('Khoya', { exact: true }).waitFor();
  await np.getByRole('button', { name: 'Save Product & Add to Bill' }).click();
  await np.getByText('An ingredient with this name already exists.').or(np.getByRole('alert')).first().waitFor();
  await np.getByRole('textbox', { name: 'Product name' }).fill('Desi Lassi');
  await np.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Dairy & Cheese' });
  await np.getByRole('button', { name: 'litre', exact: true }).click();
  await np.getByRole('button', { name: 'bag', exact: true }).click();
  await np.getByRole('button', { name: 'Save Product & Add to Bill' }).click();
  await np.getByText('Type how much one bag holds.').waitFor();
  await np.getByRole('button', { name: 'Loose' }).click();
  await np.getByRole('textbox', { name: 'Purchase price per litre' }).fill('150');
  await shot(owner, '05b-laptop-add-new-product');
  await np.getByRole('button', { name: 'Save Product & Add to Bill' }).click();
  await billLine(owner, 'Desi Lassi').waitFor();
  assert.equal(await billLine(owner, 'Paneer').getByRole('textbox', { name: 'Quantity of Paneer received' }).inputValue(), '2', 'the unfinished bill was kept');
  assert.equal(await billLine(owner, 'Desi Lassi').getByRole('textbox', { name: 'Rate of Desi Lassi' }).inputValue(), '150');
  data = await saved(owner);
  const lassi = data.inventory.ingredients.find((i) => i.name === 'Desi Lassi');
  assert.ok(lassi, 'saved in the shared product list');
  assert.equal(lassi.stockUnit, 'ml');
  assert.ok(data.inventory.suppliers.find((s) => s.name === DAIRY).productIds.includes(lassi.id), 'on his product list');
  assert.equal(data.inventory.movements.filter((m) => m.ingredientId === lassi.id).length, 0, 'no opening stock typed: no movement');
  const khataBefore = data.inventory.khata.length;
  await bill(owner).getByRole('button', { name: 'Save Draft' }).click();
  await owner.getByText('Draft saved. Nothing added to stock yet.').waitFor();
  await bill(owner).getByRole('button', { name: DAIRY }).click();
  await workspace(owner).getByRole('button', { name: 'Continue draft bill' }).waitFor();
  data = await saved(owner);
  assert.equal(data.inventory.khata.length, khataBefore, 'a draft never touches the khata');
  await backToList(owner);
  await owner.locator(`main [data-supplier-card="${DAIRY}"]`).getByText('Draft bill').waitFor();
  await openSupplier(owner, DAIRY);
  await workspace(owner).getByRole('button', { name: 'Continue draft bill' }).click();
  await billLine(owner, 'Desi Lassi').waitFor();
  assert.equal(await billLine(owner, 'Paneer').getByRole('textbox', { name: 'Quantity of Paneer received' }).inputValue(), '2');
  await fillLine(owner, 'Desi Lassi', '10');
  assert.equal(await bill(owner).locator('[data-bill-total]').innerText(), 'Rs. 4,300', 'Paneer 2 × Rs. 1,400 + Lassi 10 × Rs. 150');
  await bill(owner).getByRole('button', { name: 'Save & Print' }).click();
  const printed = owner.getByRole('dialog', { name: 'Print purchase bill' });
  await printed.locator('[data-printable-bill]').getByText('PURCHASE BILL').waitFor();
  await printed.locator('[data-printable-bill]').getByText('Desi Lassi').waitFor();
  await shot(owner, '05c-laptop-print-bill');
  await printed.getByRole('button', { name: 'Close' }).last().click();
  await workspace(owner).getByRole('button', { name: 'New Purchase (Bill)' }).waitFor();
  await metricIs(owner, 'Total due', 'Rs. 11,700');
  data = await saved(owner);
  assert.equal((data.inventory.purchaseDrafts ?? []).length, 0, 'saving the bill removes the draft');
  assert.equal(data.inventory.movements.filter((m) => m.ingredientId === lassi.id).length, 1, 'stock goes up once, on save');
  ok('bill keeps Paneer 2 while Add New Product is open; "khoya" shows the Khoya we have and is refused; bag needs its size; Desi Lassi (litre, Rs. 150) saved in the shared list, on his list and on the bill; Save Draft changes nothing, Draft bill badge, Continue draft; Save & Print → printable bill, Rs. 4,300, due Rs. 11,700, stock once');

  console.log('\n6. Manager, Cashier, desktop, tablet and phone');
  await owner.setViewportSize(DESKTOP);
  await openSupplier(owner, DAIRY);
  await shot(owner, '05-desktop-dairy');
  await owner.close();
  const manager = await openAs(USER.manager, LAPTOP);
  await openSuppliers(manager);
  await openSupplier(manager, DAIRY);
  await workspace(manager).getByRole('button', { name: 'Settle Payment' }).waitFor();
  await manager.close();
  const cashier = await openAs(USER.cashier, LAPTOP);
  await cashier.getByText('No access').first().waitFor();
  await cashier.close();
  const tablet = await openAs(USER.owner, TABLET);
  await openSuppliers(tablet);
  await openSupplier(tablet, DAIRY);
  await noSidewaysScroll(tablet, 'tablet');
  await shot(tablet, '06-tablet-dairy', true);
  await tablet.close();
  const phone = await openAs(USER.owner, PHONE);
  await openSuppliers(phone);
  await noSidewaysScroll(phone, 'phone list');
  await shot(phone, '07-phone-list');
  await openSupplier(phone, DAIRY);
  assert.equal(await phone.locator('main [data-supplier-card]').first().isVisible(), false, 'the phone shows one supplier at a time');
  await noSidewaysScroll(phone, 'phone supplier');
  await shot(phone, '08-phone-dairy', true);
  await phone.getByRole('button', { name: 'All suppliers' }).click();
  await phone.locator(`main [data-supplier-card="${DAIRY}"]`).waitFor();
  await phone.close();
  ok('Manager receives and pays; Cashier "No access"; desktop, tablet and phone (list → supplier → All suppliers), no sideways scroll');

  console.log('\n7. The order of the Inventory sections (owner, 2026-11-06)');
  const tabsOf = async (page) => (await page.getByRole('tab', { name: 'Suppliers', exact: true }).waitFor(), page.getByRole('tablist', { name: 'Inventory sections' }).getByRole('tab').evaluateAll((els) => els.map((e) => e.textContent.replace(/Soon|\d/g, '').trim())));
  const order = await openAs(USER.owner, LAPTOP);
  assert.deepEqual(await tabsOf(order), ['Suppliers', 'Stock', 'Recipes', 'Overview', 'Reports']);
  assert.equal(await order.getByRole('tab', { name: 'Suppliers', exact: true }).getAttribute('aria-selected'), 'true', 'Inventory opens on the first section');
  await order.getByRole('button', { name: 'Edit order', exact: true }).click();
  for (const name of ['Suppliers', 'Recipes', 'Stock']) await order.getByRole('tab', { name: new RegExp(`^${name}`) }).click();
  assert.deepEqual(await order.locator('[data-order-number]').allInnerTexts(), ['1', '3', '2']);
  await shot(order, '09-laptop-edit-order');
  await order.getByRole('button', { name: 'Done' }).click();
  assert.deepEqual(await tabsOf(order), ['Suppliers', 'Recipes', 'Stock', 'Overview', 'Reports']);
  await order.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await tabsOf(order), ['Suppliers', 'Recipes', 'Stock', 'Overview', 'Reports'], 'kept after a reload');
  await order.getByRole('button', { name: 'Edit order', exact: true }).click();
  await order.getByRole('button', { name: 'Reset' }).click();
  assert.deepEqual(await tabsOf(order), ['Suppliers', 'Stock', 'Recipes', 'Overview', 'Reports']);
  await order.close();
  ok('Sections: Suppliers, Stock, Recipes, Overview, Reports; opens on Suppliers; Edit order → tap Suppliers, Recipes, Stock → 1, 2, 3 → Done keeps it after a reload; Reset brings the usual order back');

  assert.deepEqual(errors, [], `browser errors: ${errors.join(' | ')}`);
  console.log('\nAll Suppliers checks passed (DEMO data).');
} finally {
  await browser.close();
}

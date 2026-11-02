// The owner's rush at one table (2026-11-02): one customer sits and orders chicken; later a stranger sits there and orders a drink.
// Each is an own sub-order. At the counter the cashier opens the table, finds the customer's order by what they had, and bills only
// that one; the others stay. The whole table can also pay one bill. A table with one customer stays as it was.
// Usage: start the apps (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:sub-orders
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'sub-orders');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), cashier: id(103), superWaiter: id(104) };
const TABLE = (n) => id(400 + n);
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 1024, height: 768 };
const DESKTOP = { width: 1440, height: 900 };

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
const bill = (page) => page.locator('main [data-pos-bill]');
const choice = (page, label) => page.locator(`[data-sub-order-choice="${label}"]`);
const row = (page, label) => page.locator(`[data-sub-order-row="${label}"]`);
// The other tab's table list needs a moment to hear about a new order (DEMO sync).
const sync = (page) => page.waitForTimeout(3000);

async function pick(page, product) {
  await page.getByRole('button', { name: new RegExp(`^${product}`) }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: /^(Add|Save) ·/ }).click();
}
async function waiterSends(page, product, { newSubOrder = false } = {}) {
  if (newSubOrder) await page.getByRole('button', { name: 'New sub-order' }).click();
  await page.getByRole('tab', { name: 'Menu' }).click();
  await pick(page, product);
  await page.getByRole('tab', { name: /^Order/ }).click();
  if ((await page.getByRole('group', { name: 'Guests' }).getByText('0', { exact: true }).count()) > 0) await page.getByRole('button', { name: 'Guests +' }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await page.getByText(/sent to the kitchen/).last().waitFor();
  await page.waitForTimeout(600);
}
async function chooseTable(page, name) {
  await sync(page);
  await bill(page).getByRole('radio', { name: /^Table/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${name} —`) }).click();
}
async function billNowCash(page, amount) {
  await bill(page).getByRole('button', { name: 'Bill Now' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText(amount, { exact: true }).first().waitFor();
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await dialog.waitFor({ state: 'detached' });
}
const newBill = (page) => page.getByRole('button', { name: 'New bill', exact: true }).click();
const tableIs = async (page, name, status) => {
  await sync(page);
  await bill(page).getByRole('radio', { name: /^Table/ }).click();
  const button = page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${name} —`) });
  const label = await button.getAttribute('aria-label');
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
  assert.ok(label?.includes(status), `${name} should be ${status}, but is: ${label}`);
};

const setup = await openAs(USER.owner, '/tables', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. The first customer sits at T1 and orders chicken');
const waiter = await openAs(USER.superWaiter, `/waiter?table=${TABLE(1)}`, PHONE);
await waiterSends(waiter, 'Chicken Tikka');
const card = waiter.locator('section[aria-label="Order"]');
await card.locator('p', { hasText: /^T1 ·/ }).first().waitFor();
ok('one customer: the table is still plain T1');

console.log('2. Later a stranger sits at the same table: new sub-order, a drink');
await shot(waiter, '01-phone-waiter-one-customer');
await waiterSends(waiter, 'Cold Drink', { newSubOrder: true });
await choice(waiter, 'T1-1').getByText('Chicken Tikka').waitFor();
await choice(waiter, 'T1-2').getByText('Cold Drink').waitFor();
assert.equal(await choice(waiter, 'T1-2').getAttribute('aria-pressed'), 'true', 'the waiter stays on the new customer');
await shot(waiter, '02-phone-waiter-two-sub-orders');
ok('the waiter sees T1-1 Chicken Tikka and T1-2 Cold Drink');

await choice(waiter, 'T1-1').click();
await card.getByText('Chicken Tikka').first().waitFor();
assert.equal(await card.getByText('Cold Drink').count(), 0, 'each sub-order shows only its own items');
ok('tapping a sub-order shows only that customer\'s items');

console.log('3. The kitchen and the table board');
const kitchen = await openAs(USER.owner, '/kitchen', TABLET);
await kitchen.locator('main').getByText('T1-1', { exact: true }).first().waitFor({ timeout: 6_000 });
await kitchen.locator('main').getByText('T1-2', { exact: true }).first().waitFor({ timeout: 6_000 });
await shot(kitchen, '03-tablet-kitchen-tickets');
await kitchen.close();
const board = await openAs(USER.owner, '/tables', DESKTOP);
await board.getByText('2 customers').first().waitFor({ timeout: 6_000 });
await board.getByText('Rs. 575').first().waitFor();
await board.close();
ok('kitchen tickets say T1-1 and T1-2; the board says 2 customers, Rs. 575');

console.log('4. A customer comes to the counter: "Table 1", the drink');
const cashier = await openAs(USER.cashier, '/pos', DESKTOP);
await chooseTable(cashier, 'T1');
const list = cashier.getByRole('dialog');
await row(cashier, 'T1-1').getByText('1 × Chicken Tikka').waitFor();
await row(cashier, 'T1-2').getByText('1 × Cold Drink').waitFor();
assert.equal(await list.getByRole('button', { name: 'Call Waiter' }).count(), 1, 'the cashier can ask the waiter whose order it is');
await shot(cashier, '04-desktop-cashier-chooses-customer');
ok('the cashier sees each customer by what they had, and can call the waiter');

await row(cashier, 'T1-2').click();
await bill(cashier).getByText('T1-2 · Order #2').waitFor();
assert.equal(await bill(cashier).locator('section').getByText('Chicken Tikka', { exact: true }).count(), 0, 'the other customer\'s item is not on this bill');
await shot(cashier, '05-desktop-bill-of-one-customer');
await billNowCash(cashier, 'Rs. 125');
await cashier.getByText('Paid · Invoice #1').first().waitFor();
await shot(cashier, '06-desktop-one-customer-paid');
ok('T1-2 pays Rs. 125, gets Invoice #1; nobody else is on that bill');
await bill(cashier).getByRole('button', { name: 'Print Receipt' }).click();
await cashier.getByRole('dialog').getByText('T1-2').first().waitFor();
await cashier.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
ok('the receipt says T1-2');

await newBill(cashier);
await tableIs(cashier, 'T1', 'Occupied');
ok('T1 stays busy: the chicken customer is still eating');

console.log('5. Another customer sits while the chicken customer is still there');
await sync(waiter);
await waiterSends(waiter, 'Loaded Fries', { newSubOrder: true });
await choice(waiter, 'T1-3').getByText('Loaded Fries').waitFor();
assert.equal(await choice(waiter, 'T1-2').count(), 0, 'a customer who paid has left the list');
ok('the new customer is T1-3, never a second T1-2; the one who paid has left the list');

console.log('6. The chicken customer pays, then the last one: the table is free');
await chooseTable(cashier, 'T1');
await row(cashier, 'T1-1').click();
await billNowCash(cashier, 'Rs. 450');
await cashier.getByText('Paid · Invoice #2').first().waitFor();
await newBill(cashier);
await chooseTable(cashier, 'T1');
await bill(cashier).getByText('T1-3 · Order #3').waitFor();
await billNowCash(cashier, 'Rs. 350');
await cashier.getByText('Paid · Invoice #3').first().waitFor();
await newBill(cashier);
await tableIs(cashier, 'T1', 'Free');
ok('each customer has an own invoice; T1 is free when the last one has paid');

console.log('7. The cashier can also start a sub-order, and take the whole table on one bill');
await chooseTable(cashier, 'T2');
await pick(cashier, 'Wings');
await bill(cashier).getByRole('button', { name: 'Send to Kitchen' }).click();
await bill(cashier).getByText('T2 · Order #4').waitFor();
await cashier.waitForTimeout(600);
await bill(cashier).getByRole('button', { name: 'New sub-order' }).click();
await bill(cashier).getByText('T2-2 · New sub-order').waitFor();
await shot(cashier, '07-desktop-cashier-new-sub-order');
await pick(cashier, 'Mineral Water');
await bill(cashier).getByRole('button', { name: 'Send to Kitchen' }).click();
await bill(cashier).getByText('T2-2 · Order #5').waitFor();
await newBill(cashier);
await chooseTable(cashier, 'T2');
await cashier.getByRole('dialog').getByRole('button', { name: /^Whole table on one bill · Rs\. 630/ }).click();
const whole = cashier.getByRole('dialog');
await whole.getByText('One bill for T2').waitFor();
await whole.getByLabel('Cash received (Rs.)').fill('700');
await whole.getByText('Rs. 70', { exact: true }).waitFor();
await shot(cashier, '08-desktop-whole-table');
await whole.getByRole('button', { name: 'Record payment' }).click();
await whole.waitFor({ state: 'detached' });
await tableIs(cashier, 'T2', 'Free');
ok('T2-1 + T2-2 = Rs. 630 on one bill, Rs. 700 cash, Rs. 70 change, and T2 is free');

console.log('8. A table with one customer stays as it was');
const single = await openAs(USER.superWaiter, `/waiter?table=${TABLE(3)}`, PHONE);
assert.equal(await single.locator('[data-sub-order-bar]').count(), 0, 'a free table has no sub-order bar');
await waiterSends(single, 'Beef Burger');
await chooseTable(cashier, 'T3');
await bill(cashier).getByText('T3 · Order #6').waitFor();
await billNowCash(cashier, 'Rs. 550');
await cashier.getByText('Paid · Invoice #6').first().waitFor();
ok('one customer: T3, the normal bill and payment');

console.log('9. Money and phones');
const summary = await openAs(USER.owner, '/summary', DESKTOP);
await summary.getByText('Rs. 2,105').first().waitFor({ timeout: 6_000 });
await summary.close();
ok('Today\'s Summary counts each sale once: 125 + 450 + 350 + 630 + 550 = Rs. 2,105');

const orders = await openAs(USER.owner, '/orders', DESKTOP);
await orders.getByText('T1-2').first().waitFor({ timeout: 6_000 });
await shot(orders, '09-desktop-orders-list');
await orders.close();

await waiter.setViewportSize(PHONE);
assert.equal(await waiter.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll');
await cashier.setViewportSize(PHONE);
assert.equal(await cashier.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, 'no sideways scroll');
assert.deepEqual(errors, []);
ok('Orders shows T1-2; no sideways scroll on a phone and no page errors');

await browser.close();
console.log('Sub-orders walkthrough passed: new sub-order on a running table, kitchen, the cashier bills one customer, invoices, a late customer, the whole table, one customer unchanged.');

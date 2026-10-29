// Clicks through the owner's waiter → kitchen → cashier workflow (2026-10-28) together with Test A
// (MASTER_PROMPT.md §12) in the DEMO prototype. Every person works in their own tab of one browser
// ("DEMO sync — not real-time"): Super Waiter on a phone, chefs on tablets, Service Waiter on a
// phone, Cashier on a desktop. Checks totals, station routing, units, notifications, permissions
// and double taps, and saves screenshots on the way.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'workflow');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = {
  owner: id(101),
  cashier: id(103),
  superWaiter: id(104),
  serviceWaiter: id(105),
  headChef: id(106),
  pizzaChef: id(110),
  burgerChef: id(111),
  chickenChef: id(112),
};
const TABLE = { t1: id(401), t5: id(405) };
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 1024, height: 768 };
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
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
// Screens reload after each change (simulated network delay), so checks wait for the new state.
const waitText = (page, text, timeout = 6_000) => page.getByText(text).first().waitFor({ timeout });
const expectBill = (page, total) =>
  page.locator('dt:has-text("Running bill") + dd', { hasText: total }).waitFor({ timeout: 6_000 });

async function addItem(page, name, { size, quantity = 1 } = {}) {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
  const dialog = page.getByRole('dialog');
  if (size) await dialog.getByRole('button', { name: new RegExp(`^${size}`) }).click();
  for (let i = 1; i < quantity; i++) await dialog.getByRole('button', { name: 'Quantity +' }).click();
  await dialog.getByRole('button', { name: /^Add ·/ }).click();
}

async function sendRound(page) {
  await page.getByRole('tab', { name: /^Order/ }).click();
  await page.getByRole('button', { name: 'Send to kitchen' }).click();
  await page.getByText(/sent to the kitchen/).first().waitFor();
}

// Press a button on each card, one card at a time, waiting until the pressed card has moved on.
async function pressEach(page, name, times) {
  for (let i = 0; i < times; i++) {
    const buttons = page.getByRole('button', { name, exact: true });
    const before = await buttons.count();
    await buttons.first().click();
    for (let tries = 0; tries < 60 && (await buttons.count()) >= before; tries++) await page.waitForTimeout(100);
  }
}

const ok = (message) => console.log(`  ✓ ${message}`);

// Fresh demo data
const setup = await openAs(USER.owner, '/tables', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. Super Waiter takes the Table 5 order (Test A round 1)');
const superWaiter = await openAs(USER.superWaiter, `/waiter?table=${TABLE.t5}`, PHONE);
await superWaiter.getByRole('tab', { name: /^Order/ }).click();
for (let i = 0; i < 4; i++) await superWaiter.getByRole('button', { name: 'Guests +' }).click();
await superWaiter.getByRole('tab', { name: 'Menu' }).click();
await addItem(superWaiter, 'Classic Pizza', { size: 'Medium', quantity: 2 });
await addItem(superWaiter, 'Zinger Burger', { quantity: 4 });
await addItem(superWaiter, 'Loaded Fries', { quantity: 2 });
await shot(superWaiter, '01-phone-super-waiter-menu');
await superWaiter.getByRole('tab', { name: /^Order/ }).click();
// Double tap on Send: one round only.
await superWaiter.getByRole('button', { name: 'Send to kitchen' }).dblclick();
await expectBill(superWaiter, 'Rs. 4,200');
ok('running bill Rs. 4,200');
await superWaiter.waitForTimeout(800);
assert.equal(await superWaiter.getByText('Round 2').count(), 0, 'double tap created one round');
ok('double tap on Send to kitchen created one round');
await shot(superWaiter, '02-phone-super-waiter-round-1-sent');

console.log('2. Each chef sees only their own station');
const pizzaChef = await openAs(USER.pizzaChef, '/kitchen', TABLET);
await waitText(pizzaChef, '2 × Classic Pizza');
const pizzaText = await pizzaChef.locator('main').innerText();
assert.ok(!pizzaText.includes('Zinger') && pizzaText.includes('T5') && pizzaText.includes('#1'));
const burgerChef = await openAs(USER.burgerChef, '/kitchen', TABLET);
await waitText(burgerChef, '4 × Zinger Burger');
const burgerText = await burgerChef.locator('main').innerText();
assert.ok(burgerText.includes('2 × Loaded Fries') && !burgerText.includes('Classic Pizza') && burgerText.includes('T5') && burgerText.includes('#1'));
ok('Pizza Chef: only pizzas; Burger Chef: only burgers + fries; both show T5, order #1');
await shot(pizzaChef, '03-tablet-pizza-chef');

console.log('3. Pizza is ready first: the Service Waiter is notified and serves it (partly ready order)');
await pressEach(pizzaChef, 'Start', 1);
await pressEach(pizzaChef, 'Ready', 1);
const serviceWaiter = await openAs(USER.serviceWaiter, '/waiter', PHONE);
await waitText(serviceWaiter, 'Ready from Pizza Oven:');
await serviceWaiter.getByRole('button', { name: 'Notifications (1)' }).waitFor();
assert.ok((await serviceWaiter.locator('main').innerText()).includes('2 × Classic Pizza'));
assert.ok((await serviceWaiter.locator('main').innerText()).toLowerCase().includes('still in the kitchen'));
ok('Service Waiter sees "T5 — Pizza Oven ready: 2 × Classic Pizza" while burgers are still cooking');
await shot(serviceWaiter, '04-phone-service-waiter-pizza-ready');
await serviceWaiter.getByRole('button', { name: 'Served' }).dblclick();
await serviceWaiter.getByRole('button', { name: 'Notifications (0)' }).waitFor({ timeout: 6_000 });
ok('Served (double tap safe), notification cleared');

console.log('4. Burgers ready → Service Waiter notified → Served');
await pressEach(burgerChef, 'Start', 1);
await pressEach(burgerChef, 'Ready', 1);
await serviceWaiter.bringToFront();
await waitText(serviceWaiter, 'Ready from Grill & Fry:');
await shot(serviceWaiter, '05-phone-service-waiter-burgers-ready');
await pressEach(serviceWaiter, 'Served', 1);
ok('burgers + fries served');

console.log('5. Round 2 (Test A): pasta to Hot Kitchen, drinks ready at once');
await superWaiter.bringToFront();
await superWaiter.getByRole('tab', { name: 'Menu' }).click();
await addItem(superWaiter, 'Alfredo Pasta', { quantity: 2 });
await addItem(superWaiter, 'Cold Drink', { quantity: 4 });
await sendRound(superWaiter);
await expectBill(superWaiter, 'Rs. 5,900');
ok('running bill Rs. 5,900');
const headChef = await openAs(USER.headChef, '/kitchen', TABLET);
await waitText(headChef, '2 × Alfredo Pasta');
await headChef.locator('article', { hasText: 'Alfredo Pasta' }).getByRole('button', { name: 'Start', exact: true }).click();
await headChef.locator('article', { hasText: 'Alfredo Pasta' }).getByRole('button', { name: 'Ready', exact: true }).click();
await serviceWaiter.bringToFront();
await waitText(serviceWaiter, 'Ready from Hot Kitchen:');
await waitText(serviceWaiter, 'Ready from Drinks:');
await pressEach(serviceWaiter, 'Served', 2);
ok('pasta and drinks served');

console.log('6. Units: 1 kg Chicken Karahi goes to the Chicken Chef as "1 kg", burger to the Burger Chef, same order');
await superWaiter.goto(`${BASE_URL}/waiter?table=${TABLE.t1}`, { waitUntil: 'networkidle' });
await superWaiter.locator('main h1').waitFor();
await superWaiter.getByRole('tab', { name: /^Order/ }).click();
await superWaiter.getByRole('button', { name: 'Guests +' }).click();
await superWaiter.getByRole('tab', { name: 'Menu' }).click();
await addItem(superWaiter, 'Chicken Karahi');
await addItem(superWaiter, 'Zinger Burger');
await sendRound(superWaiter);
await expectBill(superWaiter, 'Rs. 3,050');
const chickenChef = await openAs(USER.chickenChef, '/kitchen', TABLET);
await waitText(chickenChef, '1 kg Chicken Karahi');
const chickenText = await chickenChef.locator('main').innerText();
assert.ok(!chickenText.includes('Zinger') && chickenText.includes('T1') && chickenText.includes('#2'));
await burgerChef.bringToFront();
await waitText(burgerChef, '1 × Zinger Burger');
assert.ok((await burgerChef.locator('article', { hasText: '1 × Zinger Burger' }).innerText()).includes('#2'));
ok('Chicken Chef: "1 kg Chicken Karahi" (T1, #2); Burger Chef: "1 × Zinger Burger" (T1, #2); one bill Rs. 3,050');
await shot(chickenChef, '06-tablet-chicken-chef-1-kg');

console.log('7. Service Waiter cannot order, void, take payment or open POS');
await serviceWaiter.goto(`${BASE_URL}/waiter?table=${TABLE.t5}`, { waitUntil: 'networkidle' });
await serviceWaiter.locator('main h1').waitFor();
for (const name of ['Send to kitchen', 'Void', 'Record Payment', 'Bill Now']) {
  assert.equal(await serviceWaiter.getByRole('button', { name, exact: true }).count(), 0, name);
}
await serviceWaiter.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle' });
await waitText(serviceWaiter, 'No access');
ok('no Send / Void / payment buttons; POS shows "No access"');

console.log('8. Service Waiter requests the bill → Cashier is notified and accepts → waiter sees it');
await serviceWaiter.goto(`${BASE_URL}/waiter?table=${TABLE.t5}`, { waitUntil: 'networkidle' });
await serviceWaiter.locator('main h1').waitFor();
await serviceWaiter.getByRole('button', { name: 'Request Bill' }).dblclick();
await waitText(serviceWaiter, 'Bill requested — waiting for the cashier');
const cashier = await openAs(USER.cashier, '/pos', DESKTOP);
await waitText(cashier, 'T5 requested bill');
assert.equal(await cashier.getByText('T5 requested bill').count(), 1, 'one bill request after a double tap');
ok('POS shows "T5 requested bill" once (double tap safe)');
await shot(cashier, '07-desktop-cashier-bill-request');
await cashier.getByRole('button', { name: 'Accept', exact: true }).click();
await serviceWaiter.bringToFront();
await waitText(serviceWaiter, 'Cashier accepted the bill request');
ok('Service Waiter sees the acknowledgement');
await shot(serviceWaiter, '08-phone-service-waiter-bill-accepted');

console.log('9. Cashier finds Table 5, prints the pre-bill, records payment, prints the paid receipt (Test A steps 5–6)');
await cashier.bringToFront();
await cashier.getByRole('button', { name: /^Running bills/ }).click();
await cashier.getByRole('button', { name: /^T5 / }).click();
await waitText(cashier, 'T5 · Order #1');
const bill = await cashier.locator('main').innerText();
for (const line of ['2 × Classic Pizza', '4 × Zinger Burger', '2 × Loaded Fries', '2 × Alfredo Pasta', '4 × Cold Drink', 'Rs. 5,900']) {
  assert.ok(bill.includes(line), line);
}
ok('Table 5 bill: all items, total Rs. 5,900');
await cashier.getByRole('button', { name: 'Print Bill' }).click();
const preBill = cashier.getByRole('dialog');
await preBill.getByText('PRE-BILL — NOT A RECEIPT').waitFor();
assert.ok((await preBill.innerText()).includes('Rs. 5,900'));
await shot(cashier, '09-desktop-cashier-pre-bill');
await preBill.getByRole('button', { name: 'Close' }).last().click();
assert.equal(await cashier.getByText(/Paid · Invoice/).count(), 0, 'pre-bill does not mark the order paid');
ok('pre-bill printed "NOT A RECEIPT"; order not paid');

await cashier.getByRole('button', { name: 'Bill Now' }).click();
const pay = cashier.getByRole('dialog');
await pay.getByLabel('Tip').fill('100');
await pay.getByLabel('Cash received (Rs.)').fill('6000');
await pay.getByText('Change').waitFor();
assert.ok((await pay.innerText()).includes('Rs. 0'));
await shot(cashier, '10-desktop-cashier-payment-6000-tip-100');
await pay.getByRole('button', { name: 'Record payment' }).dblclick();
await waitText(cashier, 'Paid · Invoice #1');
ok('Rs. 6,000 cash, Rs. 100 tip → change Rs. 0 → Paid, invoice #1 (double tap: one payment)');
await cashier.getByRole('button', { name: 'Print Receipt' }).click();
const receipt = cashier.getByRole('dialog');
await receipt.getByText('Invoice #1').waitFor();
assert.ok((await receipt.innerText()).includes('RECEIPT'));
await shot(cashier, '11-desktop-cashier-paid-receipt');
await receipt.getByRole('button', { name: 'Close' }).last().click();
await cashier.getByRole('button', { name: 'Reprint (DUPLICATE)' }).click();
await cashier.getByRole('dialog').getByText('RECEIPT — DUPLICATE').waitFor();
await cashier.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
ok('paid receipt printed; reprint is marked DUPLICATE');

const owner = await openAs(USER.owner, '/tables', DESKTOP);
await waitText(owner, 'Rs. 3,050');
assert.ok((await owner.locator(`a[href*="${TABLE.t5}"]`).innerText()).includes('Free'));
ok('Tables board: T5 is Free again; T1 still open (Rs. 3,050)');
await shot(owner, '12-desktop-owner-tables-after-payment');

await browser.close();
console.log('The full waiter → kitchen → cashier workflow and Test A steps 1–6 passed in the DEMO prototype.');

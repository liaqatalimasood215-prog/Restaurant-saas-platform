// Clicks through Test A steps 1–5 (MASTER_PROMPT.md §12) in the DEMO prototype: a waiter on a phone
// and the kitchen on a tablet, as two tabs of one browser (DEMO sync — not real-time).
// Checks the totals the shared pricing engine must produce and saves screenshots on the way.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'test-a');
const SESSION_KEY = 'lala-os-demo-session';
const WAITER = '00000000-0000-4000-8000-000000000104';
const KITCHEN = '00000000-0000-4000-8000-000000000106';
const OWNER = '00000000-0000-4000-8000-000000000101';
const TABLE_5 = '00000000-0000-4000-8000-000000000405';

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, id]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: id })), [SESSION_KEY, userId]);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  return page;
}

// Press a button on each card, one card at a time, waiting until the pressed card has moved on.
async function pressEach(page, name, times) {
  for (let i = 0; i < times; i++) {
    const buttons = page.getByRole('button', { name, exact: true });
    const before = await buttons.count();
    await buttons.first().click();
    for (let tries = 0; tries < 50 && (await buttons.count()) >= before; tries++) await page.waitForTimeout(100);
  }
}

const shot = async (page, name) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`  screenshot ${name}.png`);
};

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

// Screens reload after each change (simulated network delay), so wait for the new total.
const expectBill = (page, total) =>
  page.locator('dt:has-text("Running bill") + dd', { hasText: total }).waitFor({ timeout: 5_000 });

// Fresh demo data
const setup = await openAs(OWNER, '/tables', { width: 1440, height: 900 });
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('Step 1–2: waiter opens Table 5 with 4 guests and sends round 1');
const waiter = await openAs(WAITER, `/waiter?table=${TABLE_5}`, { width: 390, height: 844 });
await addItem(waiter, 'Classic Pizza', { size: 'Medium', quantity: 2 });
await addItem(waiter, 'Zinger Burger', { quantity: 4 });
await addItem(waiter, 'Loaded Fries', { quantity: 2 });
await waiter.getByRole('tab', { name: /^Order/ }).click();
await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
await waiter.getByText('Enter the number of guests first.').waitFor();
await shot(waiter, '01-phone-waiter-guests-required');
for (let i = 0; i < 4; i++) await waiter.getByRole('button', { name: 'Guests +' }).click();
await shot(waiter, '02-phone-waiter-round-1-before-send');
await sendRound(waiter);
await expectBill(waiter, 'Rs. 4,200');
console.log('  running bill Rs. 4,200 ✓');
await shot(waiter, '03-phone-waiter-round-1-sent');

console.log('Step 2: each station shows only its own items');
const kitchen = await openAs(KITCHEN, '/kitchen', { width: 1024, height: 768 });
await kitchen.getByRole('tab', { name: /^Pizza Oven/ }).click();
const pizzaText = await kitchen.locator('main').innerText();
assert.ok(pizzaText.includes('2 × Classic Pizza') && !pizzaText.includes('Zinger'), 'Pizza Oven shows only pizzas');
await shot(kitchen, '04-tablet-kitchen-pizza-oven');
await kitchen.getByRole('tab', { name: /^Grill & Fry/ }).click();
const grillText = await kitchen.locator('main').innerText();
assert.ok(grillText.includes('4 × Zinger Burger') && grillText.includes('2 × Loaded Fries') && !grillText.includes('Classic Pizza'));
console.log('  Pizza Oven: pizzas only ✓  Grill & Fry: burgers + fries only ✓');

console.log('Step 3: kitchen Start → Ready on both tickets; waiter gets alerts and marks Served');
await kitchen.getByRole('tab', { name: /^All stations/ }).click();
await pressEach(kitchen, 'Start', 2);
await shot(kitchen, '05-tablet-kitchen-preparing');
await pressEach(kitchen, 'Ready', 2);
await shot(kitchen, '06-tablet-kitchen-ready-with-undo');
await waiter.bringToFront();
await waiter.getByRole('button', { name: 'Alerts (2)' }).waitFor({ timeout: 10_000 });
console.log('  waiter bell shows 2 food-ready alerts ✓');
await shot(waiter, '07-phone-waiter-food-ready');
await pressEach(waiter, 'Served', 2);
await waiter.getByRole('button', { name: 'Alerts (0)' }).waitFor();

console.log('Step 4: round 2 — pasta to Hot Kitchen, drinks ready at once');
await waiter.getByRole('tab', { name: 'Menu' }).click();
await addItem(waiter, 'Alfredo Pasta', { quantity: 2 });
await addItem(waiter, 'Cold Drink', { quantity: 4 });
await sendRound(waiter);
await expectBill(waiter, 'Rs. 5,900');
console.log('  running bill Rs. 5,900 ✓');
await kitchen.bringToFront();
await kitchen.getByRole('tab', { name: /^Hot Kitchen/ }).click();
await kitchen.getByText('2 × Alfredo Pasta').waitFor({ timeout: 5_000 });
await kitchen.getByRole('tab', { name: /^Drinks/ }).click();
await kitchen.locator('section[aria-label="Ready"]', { hasText: '4 × Cold Drink' }).waitFor({ timeout: 5_000 });
console.log('  Hot Kitchen: pasta ✓  Drinks: ready at once ✓');
await kitchen.getByRole('tab', { name: /^All stations/ }).click();
await shot(kitchen, '08-tablet-kitchen-round-2');
await shot(waiter, '09-phone-waiter-round-2-sent');

console.log('Step 5: print bill → table shows Bill requested');
await waiter.getByRole('button', { name: 'Print bill' }).click();
await waiter.getByText('Bill requested').first().waitFor();
const owner = await openAs(OWNER, '/tables', { width: 1440, height: 900 });
await owner.getByText('Rs. 5,900').waitFor();
assert.ok((await owner.locator('a[href*="' + TABLE_5 + '"]').innerText()).includes('Bill requested'));
console.log('  Tables board: T5 Rs. 5,900, Bill requested ✓');
await shot(owner, '10-desktop-owner-tables-board');
const desktopWaiter = await openAs(OWNER, `/waiter?table=${TABLE_5}`, { width: 1440, height: 900 });
await shot(desktopWaiter, '11-desktop-owner-table-5-order');

console.log('Test B (UI part): only Owner/Manager can void; VOID shows in the kitchen and leaves the bill');
await waiter.bringToFront();
assert.equal(await waiter.getByRole('button', { name: 'Void', exact: true }).count(), 0, 'waiter has no Void button');
console.log('  waiter: no Void button ✓');
await desktopWaiter.bringToFront();
await desktopWaiter.locator('li:has-text("2 × Alfredo Pasta")').getByRole('button', { name: 'Void', exact: true }).click();
await desktopWaiter.getByRole('dialog').getByRole('button', { name: 'Void item' }).click();
await desktopWaiter.getByText('Please write a reason.').waitFor();
await desktopWaiter.getByRole('dialog').getByRole('textbox').fill('Guest changed their mind');
await desktopWaiter.getByRole('dialog').getByRole('button', { name: 'Void item' }).click();
await expectBill(desktopWaiter, 'Rs. 4,700');
console.log('  owner voids 2 × Alfredo Pasta with a reason → bill Rs. 4,700 ✓');
await kitchen.bringToFront();
await kitchen.getByRole('tab', { name: /^Hot Kitchen/ }).click();
await kitchen.getByText('Guest changed their mind').waitFor({ timeout: 5_000 });
const voidText = await kitchen.locator('main').innerText();
assert.ok(voidText.includes('VOID — do not cook'), 'fully voided ticket says do not cook');
assert.equal(await kitchen.getByRole('button', { name: 'Start', exact: true }).count(), 0, 'no Start on a voided ticket');
console.log('  kitchen shows VOID with the reason and "do not cook", no Start button ✓');
await shot(kitchen, '12-tablet-kitchen-void');

await browser.close();
console.log('Test A steps 1–5 and the Test B void check passed in the DEMO prototype.');

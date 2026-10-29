// POS walkthrough (owner request 2026-10-28):
// Flow A — the cashier makes new bills (dine-in, takeaway), edits items, holds and reopens a bill,
// sends to the kitchen, adds items to the running bill, gets a discount from the Owner (on a running
// bill and on a new bill), takes split and pending payments, uses Bill Now, prints and completes.
// Flow B — a waiter's table order is opened from the Table box at the POS, the cashier calls the table's
// waiter, and the bill is paid there. Then many tables at once, and a quick sale (product + Bill Now).
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:pos
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'pos');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), cashier: id(103), superWaiter: id(104), serviceWaiter: id(105), pizzaChef: id(110), burgerChef: id(111) };
const T5 = id(405);
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
const waitText = (scope, text, timeout = 6_000) => scope.getByText(text).first().waitFor({ timeout });
const ok = (message) => console.log(`  ✓ ${message}`);
const bill = (page) => page.locator('main [data-pos-bill]');
// The customer box of a Takeaway bill is folded ("Customer (optional)"): open it before typing.
const openCustomer = async (page) => {
  const folded = bill(page).getByRole('button', { name: /^Customer \(optional\)/ });
  if (await folded.count()) await folded.click();
};
const grandTotal =(page, total) => bill(page).locator('dt:text-is("Total") + dd', { hasText: total }).waitFor({ timeout: 6_000 });

async function pick(page, product, { size, addOns = [], quantity = 1 } = {}) {
  await page.getByRole('button', { name: new RegExp(`^${product}`) }).first().click();
  const dialog = page.getByRole('dialog');
  if (size) await dialog.getByRole('button', { name: new RegExp(`^${size}`) }).click();
  for (const a of addOns) await dialog.getByRole('button', { name: new RegExp(`^${a}`) }).click();
  for (let i = 1; i < quantity; i++) await dialog.getByRole('button', { name: 'Quantity +' }).click();
  await dialog.getByRole('button', { name: /^(Add|Save) ·/ }).click();
}

const setup = await openAs(USER.owner, '/tables', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('Flow A — dine-in bill made by the cashier');
const cashier = await openAs(USER.cashier, '/pos', DESKTOP);
await bill(cashier).getByRole('radio', { name: 'Table' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'T3 — Free' }).click();
await pick(cashier, 'Classic Pizza', { size: 'Large', addOns: ['Extra cheese'] });
await pick(cashier, 'Cold Drink', { quantity: 2 });
await bill(cashier).getByRole('button', { name: 'Edit Cold Drink' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Quantity +' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: /^Save ·/ }).click();
await grandTotal(cashier, 'Rs. 1,725');
ok('T3: Classic Pizza (Large + Extra cheese) Rs. 1,350 + 3 × Cold Drink (edited from 2) = Rs. 1,725');
await shot(cashier, '01-desktop-cashier-new-dine-in-bill');
await bill(cashier).getByRole('button', { name: 'Send to kitchen' }).dblclick();
await waitText(cashier, 'T3 · Order #1');
ok('sent to the kitchen once (double tap safe) — the bill is now order #1 of T3');
const pizzaChef = await openAs(USER.pizzaChef, '/kitchen', TABLET);
await waitText(pizzaChef, '1 × Classic Pizza');
assert.ok((await pizzaChef.locator('main').innerText()).includes('T3'));
ok('Pizza Chef sees T3 · Classic Pizza (Large) + Extra cheese');

await cashier.bringToFront();
await pick(cashier, 'Loaded Fries');
await bill(cashier).getByRole('button', { name: 'Send to kitchen' }).click();
await grandTotal(cashier, 'Rs. 2,075');
ok('more items added to the running bill (round 2) → Rs. 2,075');
assert.equal(await bill(cashier).getByRole('button', { name: 'Discount' }).count(), 0, 'cashier cannot give a discount');
ok('the cashier has no Discount button');

const owner = await openAs(USER.owner, '/pos', DESKTOP);
await owner.getByRole('button', { name: /^Running bills/ }).click();
await owner.getByRole('button', { name: /^T3/ }).click();
await waitText(owner, 'T3 · Order #1');
await bill(owner).getByRole('button', { name: 'Discount' }).click();
let dialog = owner.getByRole('dialog');
await dialog.getByLabel('Percent', { exact: true }).fill('10');
await dialog.getByLabel('Reason').fill('Regular customer');
await dialog.getByRole('button', { name: 'Apply discount' }).click();
await grandTotal(owner, 'Rs. 1,868');
ok('Owner gives 10% (reason "Regular customer"): Rs. 2,075 − Rs. 207.50 = Rs. 1,867.50 → rounded Rs. 1,868');
await shot(owner, '02-desktop-owner-discount');

await cashier.bringToFront();
await grandTotal(cashier, 'Rs. 1,868');
await bill(cashier).getByRole('button', { name: 'Print Bill' }).click();
await waitText(cashier.getByRole('dialog'), 'PRE-BILL — NOT A RECEIPT');
await cashier.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
dialog = cashier.getByRole('dialog');
await dialog.getByRole('radio', { name: 'Card' }).click();
await dialog.getByLabel('Amount (Rs.)').fill('1000');
await dialog.getByRole('button', { name: 'Record payment' }).click();
await waitText(bill(cashier), 'Partly paid');
await bill(cashier).locator('dt:has-text("Due") + dd', { hasText: 'Rs. 868' }).waitFor();
ok('pre-bill printed; split payment: Rs. 1,000 by card → partly paid, Rs. 868 due');
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
dialog = cashier.getByRole('dialog');
await dialog.getByLabel('Cash received (Rs.)').fill('1000');
await waitText(dialog, 'Rs. 132');
await shot(cashier, '03-desktop-cashier-cash-change');
await dialog.getByRole('button', { name: 'Record payment' }).click();
await waitText(cashier, 'Paid · Invoice #1');
await bill(cashier).getByRole('button', { name: 'Print Receipt' }).click();
await waitText(cashier.getByRole('dialog'), 'Invoice #1');
await cashier.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
await bill(cashier).getByRole('button', { name: 'Complete — start a new bill' }).click();
await waitText(cashier, 'New bill');
ok('Rs. 868 cash with Rs. 1,000 received → change Rs. 132 → Paid, invoice #1 → receipt → complete');

console.log('Flow A — Clear bill asks first and removes only unsent items');
await pick(cashier, 'Loaded Fries');
await grandTotal(cashier, 'Rs. 350');
await bill(cashier).getByRole('button', { name: 'Clear all' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
await grandTotal(cashier, 'Rs. 350');
await bill(cashier).getByRole('button', { name: 'Clear all' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Yes, clear bill' }).click();
await grandTotal(cashier, 'Rs. 0');
assert.ok(await bill(cashier).getByRole('button', { name: 'Send to Kitchen' }).isDisabled(), 'nothing left to send');
ok('Close keeps the bill; "Yes, clear bill" empties it (nothing was sent to the kitchen)');

console.log('Flow A — takeaway: new customer, hold, reopen, send, pay later, then pay and hand over');
await bill(cashier).getByRole('radio', { name: 'Takeaway' }).click();
await openCustomer(cashier);
await bill(cashier).getByLabel('Customer name', { exact: true }).fill('Hina Sheikh');
await bill(cashier).getByLabel('Phone', { exact: true }).fill('0312-5556667');
await pick(cashier, 'Zinger Burger', { quantity: 2 });
await bill(cashier).getByRole('button', { name: 'Hold' }).click();
await cashier.getByRole('button', { name: /^Running bills/ }).click();
await cashier.getByRole('button', { name: /^Hina Sheikh · Takeaway/ }).click();
await grandTotal(cashier, 'Rs. 900');
ok('bill held and reopened with customer and 2 × Zinger Burger (Rs. 900)');
await shot(cashier, '04-desktop-cashier-held-bill');
await bill(cashier).getByRole('button', { name: 'Send to kitchen' }).click();
await waitText(cashier, 'Takeaway · Order #2');
await cashier.getByRole('button', { name: /^Running bills/ }).click();
assert.equal(await cashier.getByRole('button', { name: /^Hina Sheikh · Takeaway/ }).count(), 0, 'held bill removed after sending');
await cashier.keyboard.press('Escape');
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Pay later (pending)' }).click();
await waitText(bill(cashier), 'Payment pending');
ok('sent to the kitchen as order #2; held bill gone; payment left pending');
const burgerChef = await openAs(USER.burgerChef, '/kitchen', TABLET);
await waitText(burgerChef, 'Takeaway #2');
await burgerChef.getByRole('button', { name: 'Start', exact: true }).click();
await burgerChef.getByRole('button', { name: 'Ready', exact: true }).click();
await cashier.bringToFront();
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
await cashier.getByRole('dialog').getByRole('radio', { name: 'Online / Wallet' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
await waitText(cashier, 'Paid · Invoice #2');
await bill(cashier).getByRole('button', { name: 'Complete — handed to customer' }).click();
await waitText(bill(cashier), 'Picked up');
ok('Burger Chef ready → paid Online/Wallet (invoice #2) → completed (picked up)');

console.log('Flow A — the customer is found again by phone');
await bill(cashier).getByRole('button', { name: 'Complete — start a new bill' }).click();
await bill(cashier).getByRole('radio', { name: 'Takeaway' }).click();
await openCustomer(cashier);
await bill(cashier).getByRole('searchbox', { name: 'Find customer: name or phone' }).fill('Hina');
await bill(cashier).getByRole('searchbox', { name: 'Find customer: name or phone' }).press('Enter');
await bill(cashier).getByRole('button', { name: /^Hina Sheikh · 0312-5556667/ }).click();
assert.equal(await bill(cashier).getByLabel('Phone', { exact: true }).inputValue(), '0312-5556667');
ok('customer search "Hina" → Hina Sheikh filled in');

console.log('Flow A — the Owner gives a discount on a new bill, then Bill Now');
await pick(cashier, 'Wings');
assert.equal(await bill(cashier).getByRole('button', { name: 'Discount' }).count(), 0, 'cashier: no discount on a new bill');
await waitText(bill(cashier), 'Only the Owner or Manager can give a discount.');
await bill(cashier).getByRole('button', { name: 'Clear all' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Yes, clear bill' }).click();
await owner.bringToFront();
await owner.getByRole('button', { name: 'New bill', exact: true }).click();
await bill(owner).getByRole('radio', { name: 'Takeaway' }).click();
await openCustomer(owner);
await bill(owner).getByLabel('Customer name', { exact: true }).fill('Hina Sheikh');
await bill(owner).getByLabel('Phone', { exact: true }).fill('0312-5556667');
await pick(owner, 'Wings');
await bill(owner).getByRole('button', { name: 'Discount' }).click();
dialog = owner.getByRole('dialog');
await dialog.getByLabel('Percent', { exact: true }).fill('10');
await dialog.getByLabel('Reason').fill('Staff meal');
await dialog.getByRole('button', { name: 'Apply discount' }).click();
await grandTotal(owner, 'Rs. 495');
await shot(owner, '06-desktop-owner-discount-on-new-bill');
await bill(owner).getByRole('button', { name: 'Bill Now' }).click();
dialog = owner.getByRole('dialog');
await waitText(dialog, 'Rs. 495');
await dialog.getByRole('button', { name: 'Record payment' }).click();
await waitText(owner, 'Paid · Invoice #3');
await waitText(bill(owner), 'Takeaway · Order #3');
await grandTotal(owner, 'Rs. 495');
assert.ok((await bill(owner).innerText()).includes('Staff meal'), 'the discount is saved on the order');
ok('cashier sees "Only the Owner or Manager…"; the Owner gives 10% on a new Wings bill (Rs. 550 → Rs. 495) → Bill Now → order #3 keeps the discount, invoice #3');

console.log('Flow B — waiter order paid at the POS');
const waiter = await openAs(USER.superWaiter, `/waiter?table=${T5}`, PHONE);
await waiter.getByRole('tab', { name: /^Order/ }).click();
for (let i = 0; i < 4; i++) await waiter.getByRole('button', { name: 'Guests +' }).click();
await waiter.getByRole('tab', { name: 'Menu' }).click();
await pick(waiter, 'Classic Pizza', { size: 'Medium', quantity: 2 });
await pick(waiter, 'Zinger Burger', { quantity: 4 });
await pick(waiter, 'Loaded Fries', { quantity: 2 });
await waiter.getByRole('tab', { name: /^Order/ }).click();
await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
await waiter.getByText(/sent to the kitchen/).first().waitFor();
await cashier.bringToFront();
await bill(cashier).getByRole('radio', { name: /^Table/ }).click();
await cashier.getByRole('dialog').getByRole('button', { name: /^T5 —/ }).click();
await waitText(cashier, 'T5 · Order #4');
await grandTotal(cashier, 'Rs. 4,200');
const t5 = await bill(cashier).innerText();
assert.ok(t5.includes('2 × Classic Pizza') && t5.includes('4 × Zinger Burger') && t5.includes('2 × Loaded Fries'));
ok('table 5 found by number: the same order #4 the waiter took, Rs. 4,200');
await shot(cashier, '05-desktop-cashier-flow-b-table-5');
const serviceWaiter = await openAs(USER.serviceWaiter, '/waiter', PHONE);
await cashier.bringToFront();
await bill(cashier).getByRole('button', { name: 'Call Waiter' }).click();
await waitText(cashier, 'Waiter called to T5');
await waitText(serviceWaiter, 'Cashier calls you — T5');
ok('Call Waiter on T5 → Service Waiter Usman (T1–T8) gets "Cashier calls you — T5"');
await shot(serviceWaiter, '07-phone-service-waiter-called');
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
await waitText(cashier, 'Paid · Invoice #4');
const tables = await openAs(USER.owner, '/tables', DESKTOP);
await waitText(tables, 'T5');
assert.ok((await tables.locator(`a[href*="${T5}"]`).innerText()).includes('Free'));
ok('paid at the POS → invoice #4 → T5 is Free on the Tables board');

console.log('Many tables at once — T9 and T10 run together; switching tables loses nothing');
await cashier.bringToFront();
await cashier.getByRole('button', { name: 'New bill', exact: true }).click();
await bill(cashier).getByRole('radio', { name: /^Table/ }).click();
await cashier.getByRole('dialog').getByRole('button', { name: /^T9 —/ }).click();
await pick(cashier, 'Wings');
await bill(cashier).getByRole('button', { name: 'Send to Kitchen' }).click();
await waitText(bill(cashier), 'T9 · Order #5');
// The Table button still opens the table box on a bill that is already sent.
await bill(cashier).getByRole('radio', { name: /^Table/ }).click();
await cashier.getByRole('dialog').getByRole('button', { name: /^T10 —/ }).click();
await pick(cashier, 'Cold Drink');
await bill(cashier).getByRole('button', { name: 'Send to Kitchen' }).click();
await waitText(bill(cashier), 'T10 · Order #6');
await bill(cashier).getByRole('radio', { name: /^Table/ }).click();
await shot(cashier, '08-desktop-cashier-many-tables');
await cashier.getByRole('dialog').getByRole('button', { name: /^T9 —/ }).click();
await waitText(bill(cashier), 'T9 · Order #5');
ok('T9 (order #5) and T10 (order #6) both run; the Table button switched between them');
await pick(cashier, 'Zinger Burger');
await bill(cashier).getByRole('radio', { name: /^Table/ }).click();
await cashier.getByRole('dialog').getByRole('button', { name: /^T10 —/ }).click();
await waitText(bill(cashier), 'T10 · Order #6');
await waitText(cashier, 'New items of T9 are on hold');
ok('leaving T9 with a new Zinger Burger that was not sent put it on hold for T9');
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
await waitText(cashier, 'Paid · Invoice #5');
ok('T10 paid → invoice #5');
await cashier.getByRole('button', { name: /^Running bills/ }).click();
await cashier.getByRole('button', { name: /^T9 · Dine-in/ }).click();
await waitText(bill(cashier), 'T9 · Order #5');
assert.ok((await bill(cashier).innerText()).includes('Zinger Burger'), 'the held Zinger Burger is back on T9');
await grandTotal(cashier, 'Rs. 550');
assert.ok((await bill(cashier).innerText()).includes('Rs. 450'), 'the unsent Zinger Burger (Rs. 450) is listed as a new item');
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
await waitText(cashier.getByRole('dialog'), 'Rs. 1,000');
await cashier.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
await waitText(cashier, 'Paid · Invoice #6');
await tables.bringToFront();
for (const n of [409, 410]) await tables.locator(`a[href*="${id(n)}"]`).filter({ hasText: 'Free' }).waitFor({ timeout: 6_000 });
ok('the held item came back on T9 (Rs. 1,000, one Bill Now) → invoice #6; T9 and T10 are both Free on the Tables board');

console.log('Quick sale — a customer buys a burger: no table, no customer details, just product + Bill Now');
await cashier.bringToFront();
await cashier.getByRole('button', { name: 'New bill', exact: true }).click();
await bill(cashier).getByRole('radio', { name: 'Takeaway', checked: true }).waitFor();
assert.equal(await cashier.getByText('Find table no.').count(), 0, 'the table search box is gone');
// Tapping Table and closing the box without choosing a table must not turn this into a Table bill.
await bill(cashier).getByRole('radio', { name: /^Table/ }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
await bill(cashier).getByRole('radio', { name: 'Takeaway', checked: true }).waitFor();
// Call Waiter is always on: also for a counter customer with no table.
assert.ok(await bill(cashier).getByRole('button', { name: 'Call Waiter' }).isEnabled(), 'Call Waiter works without a table');
// Record what the waiter's phone is told to say aloud (the real voice cannot be heard in this test).
await serviceWaiter.evaluate(() => {
  window.__spoken = [];
  window.speechSynthesis.speak = (utterance) => window.__spoken.push(utterance.text);
});
await bill(cashier).getByRole('button', { name: 'Call Waiter' }).click();
await waitText(cashier, 'Waiters called to the counter');
await waitText(serviceWaiter, 'Cashier calls you — at the counter');
await serviceWaiter.waitForFunction(() => window.__spoken.some((text) => /Counter par aayein|کاؤنٹر پر آئیں|काउंटर पर आइए/.test(text)));
ok('the waiter\'s phone speaks the message aloud: "Counter par aayein"');
await shot(serviceWaiter, '08-phone-service-waiter-counter-call');
ok('Call Waiter with no table (Takeaway) → "Waiters called to the counter"; the Service Waiter gets "Cashier calls you — at the counter"');
await pick(cashier, 'Beef Burger');
await grandTotal(cashier, 'Rs. 550');
await bill(cashier).getByRole('button', { name: 'Bill Now' }).click();
dialog = cashier.getByRole('dialog');
await waitText(dialog, 'Rs. 550');
await shot(cashier, '09-desktop-cashier-quick-sale');
await dialog.getByRole('button', { name: 'Record payment' }).click();
await waitText(cashier, 'Paid · Invoice #7');
await waitText(bill(cashier), 'Takeaway · Order #7');
ok('a new bill starts as Takeaway and stays so after opening and closing the Table box; Beef Burger + Bill Now with no table and no customer → order #7 paid, invoice #7');

console.log("Today's Summary shows the discounts with who and why");
await owner.goto(`${BASE_URL}/summary`, { waitUntil: 'networkidle' });
await owner.locator('[data-kpi="sales"]').waitFor();
const summaryText = await owner.locator('main').innerText();
assert.ok(summaryText.includes('Staff meal') && summaryText.includes('Aziz Ahmed'), 'discount reason and who gave it');
assert.match(summaryText, /\d+ open/, 'open / pending bills are counted apart');
await shot(owner, '10-desktop-owner-summary-after-pos');
ok('Summary lists the "Staff meal" discount given by Aziz Ahmed; open / pending bills are counted apart');

await browser.close();
console.log('POS walkthrough passed: Flow A (dine-in, takeaway, hold, discounts, split / pending payment, Bill Now) and Flow B (Call Waiter, payment), many tables at once and a quick sale.');

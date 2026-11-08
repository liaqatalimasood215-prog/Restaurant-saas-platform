// Preview 4 walkthrough: Test D (online delivery, Cash on Delivery, rider cash) and the parts of
// Test E that Restaurant OS can show without the Customer and Rider Apps, plus takeaway, phone
// orders, reject and the Orders timeline. Customer App / Rider App steps use the DEMO buttons.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:online
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'preview-4');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), cashier: id(103), pizzaChef: id(110), burgerChef: id(111) };
const TABLET = { width: 1024, height: 768 };
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
// The Aziz Pizza test data (MASTER_PROMPT.md §12): the owner's own demo is Lala Restaurant.
await context.addInitScript(() => window.localStorage.setItem('lala-os-demo-fixture', 'acceptance'));

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
// Kitchen ticket of an order (owner's KDS picture, 2026-11-08): "#2" with its type (Takeaway, Delivery) beside it
const kdsTicket = (page, type, n) => page.locator(`main [data-kds-order="${n}"]`, { hasText: type }).first();
const card = (page, n) => page.locator(`[data-order-number="${n}"]`);
const waitStatus = (page, n, status) => card(page, n).getByText(status, { exact: true }).first().waitFor({ timeout: 6_000 });
const ok = (message) => console.log(`  ✓ ${message}`);

const setup = await openAs(USER.owner, '/tables', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('Test D — online delivery with Cash on Delivery');
const cashier = await openAs(USER.cashier, '/online-orders', DESKTOP);
await cashier.getByRole('button', { name: 'DEMO: customer delivery order' }).click();
await card(cashier, 1).waitFor();
const placed = await card(cashier, 1).innerText();
assert.ok(placed.includes('1 × Classic Pizza') && placed.includes('1 × Cold Drink') && placed.includes('Cash on Delivery'));
assert.ok(placed.includes('Rs. 1,125'), 'Rs. 850 + Rs. 125 + Rs. 150 delivery fee');
await cashier.getByRole('button', { name: 'Notifications (1)' }).waitFor();
ok('customer order #1 arrives as New with the alarm notification: Classic Pizza + Cold Drink, COD, Rs. 1,125');
await shot(cashier, '01-desktop-cashier-new-online-order');
await card(cashier, 1).getByRole('radio', { name: '30' }).click();
await card(cashier, 1).getByRole('button', { name: 'Accept' }).dblclick();
await waitStatus(cashier, 1, 'Accepted');
ok('accepted with 30 minutes (double tap safe)');

const pizzaChef = await openAs(USER.pizzaChef, '/kitchen', TABLET);
await kdsTicket(pizzaChef, 'Delivery', 1).waitFor({ timeout: 6_000 });
await shot(pizzaChef, '02-tablet-pizza-chef-delivery-ticket');
await pizzaChef.getByRole('button', { name: 'Start', exact: true }).click();
await cashier.bringToFront();
await waitStatus(cashier, 1, 'Preparing');
ok('Pizza Oven ticket "Delivery #1"; Start → the order becomes Preparing automatically');
await pizzaChef.bringToFront();
await pizzaChef.getByRole('button', { name: 'Ready', exact: true }).click();
await cashier.bringToFront();
await waitStatus(cashier, 1, 'Ready');
await waitText(cashier, 'Delivery #1 is ready');
ok('Ready → the order becomes Ready automatically; cashier is told to assign a rider');
await card(cashier, 1).getByRole('button', { name: 'Assign' }).click();
await waitStatus(cashier, 1, 'Rider assigned');
await card(cashier, 1).getByRole('button', { name: 'DEMO (Rider App): Picked up – On the way' }).click();
await waitStatus(cashier, 1, 'On the way');
await shot(cashier, '03-desktop-cashier-on-the-way');
await card(cashier, 1).getByRole('button', { name: 'DEMO (Rider App): Delivered + cash collected' }).click();
await waitText(cashier.locator('main aside'), 'Rs. 1,125');
ok('rider assigned → On the way → Delivered; rider has Rs. 1,125 cash to settle');
await shot(cashier, '04-desktop-cashier-rider-cash');
await cashier.getByRole('button', { name: 'Settle cash' }).first().dblclick();
await waitText(cashier, 'Rs. 1,125 received from Faisal Riaz');
await cashier.waitForTimeout(800);
assert.ok((await cashier.locator('main aside').innerText()).includes('Rs. 0'));
ok('cash settled once (double tap safe); cash to settle back to Rs. 0');

console.log('Takeaway at the counter: same kitchen flow, pay, picked up');
await cashier.getByRole('button', { name: 'New takeaway' }).click();
let dialog = cashier.getByRole('dialog').last();
await dialog.getByLabel('Phone').fill('0345-1112223');
await dialog.getByLabel('Customer name').fill('Walk-in Customer');
await dialog.getByRole('button', { name: 'Burgers' }).click();
await dialog.getByRole('button', { name: 'Zinger Burger' }).click();
await cashier.getByRole('dialog').last().getByRole('button', { name: /^Add ·/ }).click();
await cashier.getByRole('dialog').first().getByRole('button', { name: 'Send to kitchen' }).click();
await card(cashier, 2).waitFor();
const burgerChef = await openAs(USER.burgerChef, '/kitchen', TABLET);
await kdsTicket(burgerChef, 'Takeaway', 2).waitFor({ timeout: 6_000 });
await burgerChef.getByRole('button', { name: 'Start', exact: true }).click();
await kdsTicket(burgerChef, 'Takeaway', 2).getByRole('button', { name: 'Ready', exact: true }).click();
await cashier.bringToFront();
await waitStatus(cashier, 2, 'Ready');
await card(cashier, 2).getByRole('button', { name: 'Record Payment' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Record payment' }).click();
await waitText(card(cashier, 2), 'Paid · invoice #2');
await card(cashier, 2).getByRole('button', { name: 'Picked up' }).click();
await waitText(cashier.locator('main aside'), 'Walk-in Customer');
ok('takeaway #2: Burger Chef ticket → Ready → paid (invoice #2) → Picked up');

console.log('Phone delivery: a known phone number fills in name and address');
await cashier.getByRole('button', { name: 'New phone delivery' }).click();
dialog = cashier.getByRole('dialog').last();
await dialog.getByLabel('Phone').fill('0301-1234567');
await dialog.getByLabel('Customer name').click();
await cashier.waitForFunction(
  () => [...document.querySelectorAll('dialog[open] input')].some((i) => i.value.includes('Ayesha')),
  null,
  { timeout: 6_000 },
);
assert.ok((await dialog.getByLabel('Delivery address').inputValue()).includes('Main Market'));
ok('0301-1234567 → "Ayesha Khan (DEMO)" and her address filled in');
await shot(cashier, '05-desktop-phone-order-lookup');
await dialog.getByRole('button', { name: 'Close' }).last().click();

console.log('Reject needs a reason');
await cashier.getByRole('button', { name: 'DEMO: customer pickup order' }).click();
await card(cashier, 3).waitFor();
await card(cashier, 3).getByRole('button', { name: 'Reject' }).click();
await cashier.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
await waitText(cashier.getByRole('dialog'), 'Please write a reason.');
await cashier.getByRole('dialog').getByRole('textbox').fill('Kitchen closing');
await cashier.getByRole('dialog').getByRole('button', { name: 'Reject' }).click();
await waitText(cashier.locator('main aside'), 'Rejected');
ok('order #3 rejected only after a reason was written');

console.log('Orders screen: search and full timeline');
const owner = await openAs(USER.owner, '/orders?q=1', DESKTOP);
await owner.locator('main li button').first().click();
await waitText(owner, 'Cash on Delivery');
const timeline = await owner.locator('main').innerText();
for (const step of ['New', 'Accepted', 'Preparing', 'Ready', 'Rider assigned', 'On the way', 'Delivered']) {
  assert.ok(timeline.includes(step), step);
}
assert.ok(timeline.includes('Cash on Delivery'));
ok('search "1" → order #1 with the full timeline New → … → Delivered and the COD payment');
await shot(owner, '06-desktop-orders-timeline');
await owner.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' });
await owner.locator('main h1').waitFor();
await owner.getByRole('button', { name: 'Takeaway', exact: true }).click();
await owner.waitForTimeout(800);
const takeaways = await owner.locator('main ul').first().innerText();
assert.ok(takeaways.includes('#2') && takeaways.includes('#3') && !takeaways.includes('#1'));
ok('filter Takeaway shows #2 and #3 only');
await shot(owner, '07-desktop-orders-filter');

await browser.close();
console.log('Preview 4 walkthrough passed (Test D in DEMO, takeaway, phone lookup, reject, orders timeline).');

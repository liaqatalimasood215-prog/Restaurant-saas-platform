// The whole DEMO joined up in one browser: customer website → cashier accepts → kitchen → Ready → rider assigned → Rider App →
// delivered, the customer's tracking following each step, and a table order to kitchen and cashier. Voices are recorded.
// Usage: start the apps (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:connected
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const CUSTOMER = `${process.env.CUSTOMER_URL ?? 'http://localhost:3001'}/aziz-pizza/main`;
const RIDER = `${process.env.RIDER_URL ?? 'http://localhost:3002'}/aziz-pizza/main`;
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'connected');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { cashier: id(103), superWaiter: id(104), serviceWaiter: id(105), pizzaChef: id(110), burgerChef: id(111) };
const T5 = id(405);
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1, serviceWorkers: 'block' });
// The Aziz Pizza test data (MASTER_PROMPT.md §12): the owner's own demo is Lala Restaurant.
await context.addInitScript(() => window.localStorage.setItem('lala-os-demo-fixture', 'acceptance'));
const errors = [];
// Records what each page says aloud; the sound itself cannot be checked here.
await context.addInitScript(() => {
  window.spoken = [];
  Object.defineProperty(window, 'speechSynthesis', {
    value: { getVoices: () => [], cancel: () => {}, speak: (u) => window.spoken.push(u.text) },
  });
  window.localStorage.setItem('lala-store-welcomed:aziz-pizza', '1');
});

function watch(page) {
  page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
  page.setDefaultTimeout(30_000);
  return page;
}
async function openAs(userId, url, viewport = DESKTOP) {
  const page = watch(await context.newPage());
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
const orderCard = (page, n) => page.locator(`[data-order-number="${n}"]`);
const see = (scope, text) => scope.getByText(text).first().waitFor({ timeout: 10_000 });
const heard = (page, text) => page.waitForFunction((t) => window.spoken.some((s) => s.includes(t)), text, { timeout: 10_000 });
const trackedStatus = (page, wanted) =>
  page.waitForFunction((status) => JSON.parse(window.localStorage.getItem('lala-store-demo-v2')).orders[0]?.status === status, wanted, { timeout: 12_000 });

/** The chef starts and finishes every ticket of the station. */
async function cook(userId) {
  const chef = await openAs(userId, '/kitchen', TABLET);
  await chef.waitForTimeout(500);
  while ((await chef.getByRole('button', { name: 'Start', exact: true }).count()) > 0) {
    const before = await chef.getByRole('button', { name: 'Ready', exact: true }).count();
    await chef.getByRole('button', { name: 'Start', exact: true }).first().click();
    await chef.waitForFunction((n) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Ready').length > n, before);
    await chef.getByRole('button', { name: 'Ready', exact: true }).first().click();
    await chef.waitForFunction((n) => [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Ready').length <= n, before);
  }
  await chef.close();
}

const setup = await openAs(USER.cashier, '/online-orders');
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. The customer orders on the website; the cashier hears it');
const cashier = await openAs(USER.cashier, '/online-orders');
const customer = watch(await context.newPage());
await customer.setViewportSize(PHONE);
await customer.goto(`${CUSTOMER}/menu`);
await customer.locator('[data-category-tab="Burgers"]').click();
await customer.locator('[data-add="Zinger Burger"]').waitFor();
await customer.locator('[data-add="Zinger Burger"]').click();
await customer.locator('[data-add="Beef Burger"]').click();
await customer.waitForFunction(() => document.querySelector('[data-toast]'));
await customer.goto(`${CUSTOMER}/cart`);
await customer.locator('[data-cart-line="Zinger Burger"]').waitFor();
await customer.getByLabel('Full name').fill('Ahmed Raza');
await customer.getByLabel(/Mobile/).fill('03001234567');
await customer.getByLabel(/Delivery address/).fill('House 12, Street 4, DHA');
await customer.getByRole('button', { name: /^Place order/ }).dblclick();
await customer.waitForURL('**/track/**');
await customer.locator('[data-track-status]').waitFor();
assert.equal(await customer.getByRole('button', { name: /next step/i }).count(), 0, 'the DEMO step button is gone: Restaurant OS moves this order');
await shot(customer, '01-phone-customer-placed');
await cashier.bringToFront();
await see(orderCard(cashier, 1), 'Ahmed Raza');
assert.equal(await cashier.locator('[data-order-number="2"]').count(), 0, 'a double tap made one order');
const placed = await orderCard(cashier, 1).innerText();
assert.ok(placed.includes('Zinger Burger') && placed.includes('House 12, Street 4, DHA'));
await heard(cashier, 'Ahmed Raza ka order');
ok('the website order reaches Online Orders with customer, items and address; the cashier hears "Naya online order aaya hai. Ahmed Raza ka order."');
await shot(cashier, '02-desktop-cashier-order-arrives');

console.log('2. Cashier accepts → kitchen → Ready, the customer follows');
await orderCard(cashier, 1).getByRole('button', { name: 'Accept' }).click();
await see(orderCard(cashier, 1), 'Accepted');
await customer.bringToFront();
await trackedStatus(customer, 'ACCEPTED');
await heard(customer, 'accept ho gaya');
ok('Accept reaches the customer, who hears it');
await cook(USER.burgerChef);
await cashier.bringToFront();
await see(orderCard(cashier, 1), 'Ready');
await heard(cashier, 'Order number 1 tayyar hai');
await customer.bringToFront();
await trackedStatus(customer, 'READY');
ok('kitchen tickets are made automatically; Start and Ready move the order by themselves; the cashier hears "tayyar hai"; the customer sees Ready');

console.log('3. Cashier assigns the rider → Rider App → delivered');
const rider = watch(await context.newPage());
await rider.setViewportSize(PHONE);
await rider.goto(RIDER);
await rider.locator('[data-login-account="Faisal Riaz"]').click();
await rider.getByRole('button', { name: 'Login', exact: true }).click();
await rider.locator('[data-availability]').waitFor();
assert.equal(await rider.locator('[data-demo-source]').first().getAttribute('data-demo-source'), 'RESTAURANT_OS', 'a plain Rider App link reaches Restaurant OS');
await cashier.bringToFront();
await orderCard(cashier, 1).getByRole('button', { name: 'Assign' }).click();
await see(orderCard(cashier, 1), 'Rider assigned');
await rider.bringToFront();
await rider.locator('[data-new-delivery="1"]').waitFor({ timeout: 10_000 });
await heard(rider, 'Naya delivery order');
await rider.locator('[data-delivery="1"]').click();
await rider.locator('[data-amount-to-collect]').waitFor();
await shot(rider, '03-phone-rider-new-order');
await rider.getByRole('button', { name: 'Pick Up Order' }).click();
await rider.getByRole('button', { name: 'Start Delivery' }).click();
await rider.getByRole('button', { name: 'Mark Delivered' }).waitFor();
await customer.bringToFront();
await trackedStatus(customer, 'OUT_FOR_DELIVERY');
assert.ok((await customer.locator('main').innerText()).includes('Faisal Riaz'), "the customer sees the rider's name");
await heard(customer, 'raaste mein');
await shot(customer, '04-phone-customer-on-the-way');
await rider.bringToFront();
await rider.getByRole('button', { name: 'Mark Delivered' }).click();
await rider.getByRole('button', { name: 'Confirm Delivery' }).click();
await rider.locator('[data-money="DONE"]').waitFor();
await customer.bringToFront();
await trackedStatus(customer, 'DELIVERED');
await cashier.bringToFront();
await cashier.waitForFunction(() => { const order = JSON.parse(window.localStorage.getItem('lala-os-demo-data')).orders[0]; return order.status === 'DELIVERED' && order.payments.length === 1 && order.payments[0].method === 'CASH'; });
ok('the cashier assigns; the Rider App alerts and speaks; Pick Up, Start Delivery and Mark Delivered reach cashier and customer');
await shot(customer, '05-phone-customer-delivered');

console.log('4. A rejected order tells the customer');
await customer.bringToFront();
await customer.goto(`${CUSTOMER}/menu`);
await customer.locator('[data-category-tab="Burgers"]').click();
await customer.locator('[data-add="Zinger Burger"]').click();
await customer.locator('[data-add="Beef Burger"]').click();
await customer.waitForFunction(() => document.querySelector('[data-toast]'));
await customer.goto(`${CUSTOMER}/cart`);
await customer.locator('[data-cart-line="Zinger Burger"]').waitFor();
await customer.locator('[data-details]', { hasText: 'Ahmed Raza' }).waitFor();
await customer.getByRole('button', { name: /^Place order/ }).click();
await customer.waitForURL('**/track/**');
await cashier.bringToFront();
await orderCard(cashier, 2).getByRole('button', { name: 'Reject' }).click();
const reject = cashier.getByRole('dialog');
await reject.getByRole('textbox').first().fill('Too busy');
await reject.getByRole('button', { name: /Reject/ }).last().click();
await customer.bringToFront();
await trackedStatus(customer, 'REJECTED');
ok('Reject reaches the customer');

console.log('5. Table: Super Waiter orders; kitchen and cashier see it at once; ready, bill and Call Waiter speak');
const chef = await openAs(USER.pizzaChef, '/kitchen', TABLET);
await chef.getByRole('button', { name: /sound/i }).first().click();
const serviceWaiter = await openAs(USER.serviceWaiter, '/waiter', PHONE);
const pos = await openAs(USER.cashier, '/pos');
const superWaiter = await openAs(USER.superWaiter, `/waiter?table=${T5}`, PHONE);
await superWaiter.getByRole('tab', { name: /^Order/ }).click();
await superWaiter.getByRole('button', { name: 'Guests +' }).click();
await superWaiter.getByRole('tab', { name: 'Menu' }).click();
await superWaiter.getByRole('button', { name: /^Classic Pizza/ }).first().click();
await superWaiter.getByRole('dialog').getByRole('button', { name: /^Medium/ }).click();
await superWaiter.getByRole('dialog').getByRole('button', { name: /^Add ·/ }).click();
await superWaiter.getByRole('tab', { name: /^Order/ }).click();
await superWaiter.getByRole('button', { name: 'Send to kitchen' }).click();
await chef.bringToFront();
await see(chef, '1 × Classic Pizza');
await heard(chef, 'Kitchen mein naya order');
ok('Send to kitchen: the chef sees the ticket without a reload and hears "Kitchen mein naya order aaya hai"');
await shot(chef, '06-tablet-chef-table-ticket');
await pos.bringToFront();
await pos.getByRole('button', { name: /^Running bills/ }).click();
await see(pos.locator('body'), 'T5');
ok('the cashier sees T5 in Running bills without a reload');
await shot(pos, '07-desktop-cashier-running-t5');
await pos.keyboard.press('Escape');
await chef.bringToFront();
await chef.getByRole('button', { name: 'Start', exact: true }).first().click();
await chef.getByRole('button', { name: 'Ready', exact: true }).first().click();
await serviceWaiter.bringToFront();
await heard(serviceWaiter, 'khana tayyar hai');
ok('Ready: the Service Waiter hears "T5 ka khana tayyar hai"');
await superWaiter.bringToFront();
await superWaiter.getByRole('button', { name: /Request bill/i }).first().click();
await pos.bringToFront();
await heard(pos, 'ka bill chahiye');
ok('Request bill: the cashier hears "T5 ka bill chahiye"');
await pos.goto(`${BASE_URL}/pos?table=${T5}`, { waitUntil: 'networkidle' });
await pos.locator('main [data-pos-bill]').getByRole('button', { name: 'Call Waiter' }).click();
await serviceWaiter.bringToFront();
await heard(serviceWaiter, 'Counter par aayein');
ok('Call Waiter: the waiter hears "Counter par aayein"');

assert.deepEqual(errors, []);
await browser.close();
console.log('Connected walkthrough passed: website → cashier → kitchen → rider → customer, reject, table → kitchen and cashier, voices.');

// Phase 3 walkthrough: the Riders page and the real Rider App joined by the DEMO browser link. Test D with the app
// instead of the DEMO buttons, the Owner-only rules, Online / Offline, and what a disabled rider sees.
// Usage: start the apps (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:riders
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'riders');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103), pizzaChef: id(110), burgerChef: id(111) };
const FAISAL = id(107);
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function openAs(userId, url, viewport = DESKTOP) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, userId]);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const rider = (page, name) => page.locator(`[data-rider-card="${name}"]`);
const orderCard = (page, n) => page.locator(`[data-order-number="${n}"]`);
const riderState = (page, name) => rider(page, name).locator('[data-rider-state]').getAttribute('data-rider-state');
const see = (scope, text) => scope.getByText(text).first().waitFor({ timeout: 8_000 });

/** The chef starts and finishes every ticket of the station; the page stays open until the step is saved. */
async function cook(userId) {
  const chef = await openAs(userId, '/kitchen');
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

const setup = await openAs(USER.owner, '/tables');
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('Riders page: Owner');
const owner = await openAs(USER.owner, '/riders');
await rider(owner, 'Faisal Riaz').waitFor();
assert.equal(await riderState(owner, 'Faisal Riaz'), 'ONLINE');
assert.equal(await riderState(owner, 'Naveed Akhtar'), 'ONLINE');
assert.ok(await owner.getByRole('button', { name: 'Add Rider' }).isVisible());
const frame = owner.frameLocator('[data-rider-phone] iframe');
await frame.locator('[data-availability="ONLINE"]').waitFor({ timeout: 30_000 });
assert.equal(await frame.locator('[data-demo-source]').getAttribute('data-demo-source'), 'RESTAURANT_OS');
assert.equal(await frame.locator('[data-restaurant-name]').innerText(), 'Aziz Pizza — DEMO');
await see(frame.locator('main'), 'No new orders right now');
assert.equal(await frame.getByRole('button', { name: 'DEMO: give me a new order' }).count(), 0);
assert.match(await owner.locator('[data-rider-phone-link]').innerText(), /^http:\/\/(localhost|(10|172|192)\.[\d.]+):3002\/aziz-pizza\/main$/);
assert.ok(await owner.locator('svg[data-qr]').isVisible());
ok('two riders Online; the phone frame shows the real Rider App with this restaurant, no sample buttons; phone link and QR');
await shot(owner, '01-desktop-owner-riders');

console.log('Add Rider: Owner only, activation link, no assignment until activated');
await owner.getByRole('button', { name: 'Add Rider' }).click();
let dialog = owner.getByRole('dialog');
await dialog.getByLabel('Full name').fill('Salman Test');
await dialog.getByLabel('Mobile number').fill('12345');
await dialog.getByRole('button', { name: 'Save rider' }).click();
await see(dialog, 'mobile');
await dialog.getByLabel('Mobile number').fill('03011112222');
await shot(owner, '02-desktop-owner-add-rider');
await dialog.getByRole('button', { name: 'Save rider' }).click();
await owner.getByRole('dialog').getByText('activation', { exact: false }).first().waitFor();
const link = await owner.getByRole('dialog').locator('input[readonly]').inputValue();
assert.ok(link.includes('/activate?token='));
await owner.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).last().click();
await rider(owner, 'Salman Test').waitFor();
assert.equal(await riderState(owner, 'Salman Test'), 'NOT_ACTIVATED');
ok('a wrong phone is refused; a new rider gets an activation link and shows as Invited');

const activation = await context.newPage();
await activation.goto(link);
await activation.getByLabel(/PIN/).first().fill('482915');
await activation.getByLabel(/PIN/).nth(1).fill('482915');
await activation.getByRole('button', { name: /PIN|Activate|Create|Save/ }).first().click();
const openApp = activation.getByRole('link', { name: 'Open the Rider App' });
await openApp.waitFor();
assert.equal(await openApp.getAttribute('href'), 'http://localhost:3002');
await activation.close();
await owner.bringToFront();
await owner.waitForFunction(() => document.querySelector('[data-rider-card="Salman Test"] [data-rider-state]')?.getAttribute('data-rider-state') === 'ONLINE');
ok('the rider activates with their own PIN and is sent to the Rider App, not Restaurant OS');

await rider(owner, 'Salman Test').getByRole('button', { name: 'Edit' }).click();
dialog = owner.getByRole('dialog');
await dialog.getByLabel('Full name').fill('Salman Khan');
await dialog.getByRole('button', { name: 'Save rider' }).click();
await rider(owner, 'Salman Khan').waitFor();
await rider(owner, 'Salman Khan').getByRole('button', { name: 'Delete' }).click();
await owner.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await rider(owner, 'Salman Khan').waitFor({ state: 'detached' });
ok('Owner edits a rider, and a rider never used is deleted');

console.log('Who may do what');
const manager = await openAs(USER.manager, '/riders');
await rider(manager, 'Faisal Riaz').waitFor();
assert.equal(await manager.getByRole('button', { name: 'Add Rider' }).count(), 0);
assert.equal(await rider(manager, 'Faisal Riaz').getByRole('button', { name: 'Disable' }).count(), 0);
await see(manager, 'Only the Owner adds and changes riders');
await manager.close();
const barred = await openAs(USER.cashier, '/riders');
await see(barred, 'No access');
await barred.close();
ok('Manager sees riders and changes nothing; Cashier has no Riders page');

console.log('Test D with the real Rider App');
await owner.locator('[data-rider-phone] ~ a, a:has-text("Open Full App")').first().waitFor();
const [app] = await Promise.all([context.waitForEvent('page'), owner.getByRole('link', { name: 'Open Full App' }).click()]);
await app.setViewportSize(PHONE);
app.on('pageerror', (e) => errors.push(e.message));
await app.locator('[data-availability="ONLINE"]').waitFor({ timeout: 30_000 });
assert.ok(app.url().includes(`rider=${FAISAL}`));
assert.equal(await app.locator('[data-demo-source]').getAttribute('data-demo-source'), 'RESTAURANT_OS');
await shot(app, '03-phone-rider-linked-empty');

const cashier = await openAs(USER.cashier, '/online-orders');
await cashier.getByRole('button', { name: 'DEMO: customer delivery order' }).click();
await orderCard(cashier, 1).getByRole('button', { name: 'Accept' }).click();
await see(orderCard(cashier, 1), 'Accepted');
await cook(USER.pizzaChef);
await cashier.bringToFront();
await see(orderCard(cashier, 1), 'Ready');
await app.bringToFront();
await app.evaluate(() => {
  window.vibrations = [];
  navigator.vibrate = (pattern) => window.vibrations.push(pattern);
});
await cashier.bringToFront();
await orderCard(cashier, 1).getByRole('button', { name: 'Assign' }).click();
await see(orderCard(cashier, 1), 'Rider assigned');
await app.bringToFront();
await app.locator('[data-new-delivery="1"]').waitFor({ timeout: 8_000 });
assert.ok((await app.locator('[data-new-delivery="1"]').innerText()).includes('New order #1'));
assert.equal(await app.evaluate(() => window.vibrations.length), 1);
await shot(app, '04-phone-rider-new-delivery');
ok('the cashier assigns Faisal; the Rider App shows the new delivery at once, and vibrates');

await app.locator('[data-new-delivery="1"]').getByRole('link', { name: 'Open' }).click();
await app.locator('[data-amount-to-collect]').waitFor();
assert.equal(await app.locator('[data-amount-to-collect]').innerText(), 'Rs. 1,125');
const main = await app.locator('main').innerText();
assert.ok(main.includes('1 × Classic Pizza (Medium)') && main.includes('1 × Cold Drink'));
assert.ok((await app.locator('[data-map]').getAttribute('href')).startsWith('https://www.google.com/maps/search/?api=1&query='));
assert.ok((await app.locator('[data-call]').getAttribute('href')).startsWith('tel:'));
await shot(app, '05-phone-rider-delivery');
ok('the app shows the real order: Rs. 1,125 to collect (Rs. 850 + Rs. 125 + Rs. 150 delivery), items, call, map');

await owner.bringToFront();
await see(rider(owner, 'Faisal Riaz'), 'Rider assigned');
await rider(owner, 'Faisal Riaz').getByRole('button', { name: 'Disable' }).click();
await owner.getByRole('dialog').getByRole('button', { name: 'Disable' }).click();
await see(owner, 'This rider has a running delivery');
assert.equal(await riderState(owner, 'Faisal Riaz'), 'ONLINE');
ok('a rider with a running delivery cannot be disabled');
await shot(owner, '06-desktop-owner-rider-running');

await app.bringToFront();
await app.getByRole('button', { name: 'Pick Up Order' }).dblclick();
await app.getByRole('button', { name: 'Start Delivery' }).waitFor();
await cashier.bringToFront();
await see(orderCard(cashier, 1), 'Rider assigned');
ok('Pick Up is a DEMO step of the Rider App: the order status stays Rider assigned in Restaurant OS');
await app.bringToFront();
await app.getByRole('button', { name: 'Start Delivery' }).dblclick();
await app.getByRole('button', { name: 'Mark Delivered' }).waitFor();
await cashier.bringToFront();
await see(orderCard(cashier, 1), 'On the way');
const timeline = await cashier.evaluate(() => JSON.parse(window.localStorage.getItem('lala-os-demo-data')).orders[0].history.filter((h) => h.toStatus === 'OUT_FOR_DELIVERY').length);
assert.equal(timeline, 1);
ok('Start Delivery in the app (double tap = one step) shows "On the way" in Online Orders');

await app.bringToFront();
await app.goto(`http://localhost:3002/aziz-pizza/main`);
await app.locator('[data-availability]').waitFor();
await app.getByRole('switch', { name: 'Online' }).click();
await app.locator('[data-toast="error"]').waitFor();
assert.equal(await app.locator('[data-availability]').getAttribute('data-availability'), 'ONLINE');
ok('the rider cannot go Offline while a delivery runs; a reload keeps the link and the login');
await app.locator('[data-delivery="1"]').click();
await app.locator('[data-tracking]').click();
await app.locator('[data-away-missing]').waitFor();
assert.equal(await app.locator('[data-away]').count(), 0);
ok('Live Tracking on a Restaurant OS order shows no invented distance: it says NOT CONNECTED');
await app.locator('[data-back]').click();
await app.getByRole('button', { name: 'Mark Delivered' }).click();
assert.ok((await app.locator('[data-confirm-text]').innerText()).includes('Rs. 1,125'));
await app.getByRole('button', { name: 'Confirm Delivery' }).dblclick();
await app.locator('[data-money="DONE"]').waitFor();
await shot(app, '07-phone-rider-delivered');

await owner.bringToFront();
await owner.waitForFunction(() => document.querySelector('[data-rider-card="Faisal Riaz"] [data-rider-cash]')?.textContent === 'Rs. 1,125');
assert.equal(await rider(owner, 'Faisal Riaz').locator('[data-rider-delivered]').innerText(), '1');
const stored = await owner.evaluate(() => {
  const order = JSON.parse(window.localStorage.getItem('lala-os-demo-data')).orders[0];
  return { status: order.status, payments: order.payments.length, method: order.payments[0].method, invoice: order.invoiceNumber };
});
assert.deepEqual(stored, { status: 'DELIVERED', payments: 1, method: 'CASH', invoice: 1 });
ok('Delivered + cash (double tap = one payment) reaches Restaurant OS: invoice given, Rs. 1,125 with the rider');
await shot(owner, '08-desktop-owner-rider-cash');

await app.bringToFront();
await app.getByRole('link', { name: 'Back to deliveries' }).click();
await app.getByRole('link', { name: 'Earnings' }).click();
await app.locator('[data-today="withMe"]').waitFor();
await app.locator('[data-earnings-status="NOT_CONNECTED"]').waitFor();
assert.equal(await app.locator('[data-earnings-card]').count(), 0);
ok('with Restaurant OS orders the app shows no sample earnings: it says NOT CONNECTED');
assert.ok((await app.locator('[data-today="withMe"]').innerText()).includes('Rs. 1,125'));
assert.equal(await app.getByRole('button', { name: 'DEMO: I gave the cash to the restaurant' }).count(), 0);
await owner.bringToFront();
await rider(owner, 'Faisal Riaz').getByRole('button', { name: 'Take cash' }).dblclick();
await see(owner, 'Rs. 1,125 received from Faisal Riaz');
await app.bringToFront();
await app.waitForFunction(() => document.querySelector('[data-today="withMe"]')?.innerText.includes('Rs. 0'), null, { timeout: 8_000 });
assert.ok((await app.locator('[data-today="settled"]').innerText()).includes('Rs. 1,125'));
await shot(app, '09-phone-rider-today');
ok("Take cash on the Riders page (double tap = once): the rider's Today moves it to Cash given");

console.log('Online / Offline decides who can get an order');
await cashier.bringToFront();
await cashier.getByRole('button', { name: 'DEMO: customer delivery order' }).click();
await orderCard(cashier, 2).getByRole('button', { name: 'Accept' }).click();
await see(orderCard(cashier, 2), 'Accepted');
await cook(USER.pizzaChef);
await cook(USER.burgerChef);
await cashier.bringToFront();
await see(orderCard(cashier, 2), 'Ready');
await app.bringToFront();
await app.getByRole('link', { name: 'Home' }).click();
await app.getByRole('switch', { name: 'Online' }).click();
await app.locator('[data-availability="OFFLINE"]').waitFor();
await shot(app, '10-phone-rider-offline');
await owner.bringToFront();
await owner.waitForFunction(() => document.querySelector('[data-rider-card="Faisal Riaz"] [data-rider-state]')?.getAttribute('data-rider-state') === 'OFFLINE');
await cashier.bringToFront();
await cashier.waitForFunction(() => {
  const select = document.querySelector('[data-order-number="2"] select');
  return select && ![...select.options].some((o) => o.textContent === 'Faisal Riaz');
});
assert.ok((await cashier.locator('main aside').innerText()).includes('Offline'));
ok('Faisal goes Offline: Riders page says so, and Online Orders no longer offers him');

await owner.bringToFront();
await owner.getByLabel('Show the app as').selectOption({ label: 'Naveed Akhtar' });
const naveedFrame = owner.frameLocator('[data-rider-phone] iframe');
await naveedFrame.locator('[data-availability="ONLINE"]').waitFor({ timeout: 15_000 });
await naveedFrame.getByRole('switch', { name: 'Online' }).dispatchEvent('click');
await naveedFrame.locator('[data-availability="OFFLINE"]').waitFor();
await cashier.bringToFront();
await see(orderCard(cashier, 2), 'No rider is Online right now');
await shot(cashier, '11-desktop-cashier-no-rider-online');
ok('the phone frame follows the rider chosen; with nobody Online the cashier is told so, without an error');

await naveedFrame.getByRole('switch', { name: 'Online' }).dispatchEvent('click');
await naveedFrame.locator('[data-availability="ONLINE"]').waitFor();
await orderCard(cashier, 2).locator('select').waitFor();
assert.equal(await orderCard(cashier, 2).locator('select').inputValue(), id(108));
await orderCard(cashier, 2).getByRole('button', { name: 'Assign' }).click();
await see(orderCard(cashier, 2), 'Rider assigned');
await naveedFrame.locator('[data-delivery="2"]').waitFor({ timeout: 8_000 });
await app.bringToFront();
await app.waitForTimeout(1_500);
assert.equal(await app.locator('[data-delivery="2"]').count(), 0);
ok("Naveed gets order #2; Faisal's app never shows it");

console.log('Disable: the rider is out at once');
await owner.bringToFront();
await rider(owner, 'Faisal Riaz').getByRole('button', { name: 'Disable' }).click();
await owner.getByRole('dialog').getByRole('button', { name: 'Disable' }).click();
await owner.waitForFunction(() => document.querySelector('[data-rider-card="Faisal Riaz"] [data-rider-state]')?.getAttribute('data-rider-state') === 'DISABLED');
await app.bringToFront();
await app.locator('[data-login]').waitFor({ timeout: 8_000 });
await app.locator('[data-login-account="Faisal Riaz"]').click();
await app.getByRole('button', { name: 'Login' }).click();
await see(app.locator('[data-login] [role="alert"]'), 'disabled');
await shot(app, '12-phone-rider-disabled');
await owner.bringToFront();
await rider(owner, 'Faisal Riaz').getByRole('button', { name: 'Enable' }).click();
await owner.waitForFunction(() => document.querySelector('[data-rider-card="Faisal Riaz"] [data-rider-state]')?.getAttribute('data-rider-state') !== 'DISABLED');
ok('a disabled rider is logged out of the app and cannot log in; Enable brings the account back');

console.log('Restaurant OS closed');
const lone = await openAs(USER.owner, '/riders');
const [second] = await Promise.all([context.waitForEvent('page'), lone.getByRole('link', { name: 'Open Full App' }).click()]);
await second.locator('[data-demo-source="RESTAURANT_OS"]').waitFor({ timeout: 15_000 });
await second.locator('[data-availability], [data-login]').first().waitFor();
await lone.close();
await second.locator('[data-link-lost]').waitFor({ timeout: 10_000 });
await shot(second, '13-phone-rider-link-lost');
ok('with Restaurant OS closed the app says so, instead of pretending to work');
await second.close();

console.log('Phone and tablet sizes');
for (const [label, size] of [['phone', PHONE], ['tablet', { width: 1024, height: 768 }]]) {
  const page = await openAs(USER.owner, '/riders', size);
  await rider(page, 'Faisal Riaz').waitFor();
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(extra <= 0, `${label}: sideways scroll ${extra}`);
  await shot(page, `14-${label}-owner-riders`);
  await page.close();
}
ok('Riders page has no sideways scroll on a phone or tablet');

assert.deepEqual(errors, []);
await browser.close();
console.log('Riders walkthrough passed: Add Rider, permissions, assign → Rider App → On the way → Delivered → Take cash, Online / Offline, Disable, closed Restaurant OS.');

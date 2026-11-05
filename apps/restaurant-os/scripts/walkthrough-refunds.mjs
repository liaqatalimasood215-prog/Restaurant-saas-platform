// Refunds and payment corrections (Test B money part, MASTER_PROMPT.md §8): who may do them, new entries only, the slip, and
// Today's Summary. Steps 5 and 6 change the browser's demo data directly, to get an older order and a rider's cash quickly.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:refunds
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'refunds');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103), rider: id(107) };
const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 1024, height: 768 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
// The Aziz Pizza test data (MASTER_PROMPT.md §12): the owner's own demo is Lala Restaurant.
await context.addInitScript(() => window.localStorage.setItem('lala-os-demo-fixture', 'acceptance'));
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
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const see = (scope, text) => scope.getByText(text).first().waitFor({ timeout: 8_000 });
const bill = (page) => page.locator('main [data-pos-bill]');
const openOrder = async (page, n) => {
  await page.locator('main li button', { hasText: `#${n}` }).first().click();
  await page.locator('[data-payments]').waitFor();
};
const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const stored = (page, n) => page.evaluate(([key, number]) => JSON.parse(window.localStorage.getItem(key)).orders.find((o) => o.dailyNumber === number), [DATA_KEY, n]);
const kpi = async (page, name) => (await page.locator(`[data-kpi="${name}"]`).innerText()).trim();
const methodRow = (page, method) => page.locator(`[data-method-row="${method}"]`).innerText();

/** One product, cash, as at the counter. */
async function sale(page, product, invoice, first = false) {
  if (!first) await page.getByRole('button', { name: 'New bill', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`^${product}`) }).first().click();
  const add = page.getByRole('dialog').getByRole('button', { name: /^(Add|Save) ·/ });
  if (await add.count()) await add.click();
  await bill(page).getByRole('button', { name: 'Bill Now' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Record payment' }).click();
  await see(page, `Paid · Invoice #${invoice}`);
}

const setup = await openAs(USER.owner, '/tables');
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. The cashier sells; the cashier cannot refund or correct');
const cashier = await openAs(USER.cashier, '/pos');
await sale(cashier, 'Beef Burger', 1, true);
await sale(cashier, 'Zinger Burger', 2);
await sale(cashier, 'Alfredo Pasta', 3);
const beforeRefund = await stored(cashier, 1);
assert.equal(beforeRefund.paidTotal, 55_000);
await cashier.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' });
await openOrder(cashier, 1);
assert.equal(await button(cashier, 'Refund').count(), 0);
assert.equal(await button(cashier, 'Correct').count(), 0);
ok('three counter sales paid in cash; on the Orders page the cashier sees the payment but no Refund and no Correct');
await shot(cashier, '01-desktop-cashier-no-refund-button');
await cashier.close();

console.log('2. The manager refunds part: reason needed, never more than paid, asks once more, double tap = one');
const manager = await openAs(USER.manager, '/orders');
await openOrder(manager, 1);
await button(manager, 'Refund').click();
let dialog = manager.getByRole('dialog');
assert.equal(await dialog.locator('[data-refundable]').innerText(), 'Rs. 550');
await shot(manager, '02-desktop-manager-refund-form');
await dialog.locator('[data-refund-amount]').fill('');
await button(dialog, 'Continue').click();
await see(dialog, 'Enter a valid amount.');
await dialog.locator('[data-refund-amount]').fill('600');
await dialog.locator('[data-refund-reason]').fill('Cold burger');
await button(dialog, 'Continue').click();
await see(dialog, 'more than can be refunded');
await dialog.locator('[data-refund-amount]').fill('450');
await dialog.locator('[data-refund-reason]').fill('   ');
await button(dialog, 'Continue').click();
await see(dialog, 'Write the reason.');
await dialog.locator('[data-refund-reason]').fill('Cold burger');
await button(dialog, 'Continue').click();
dialog = manager.getByRole('dialog');
assert.ok((await dialog.locator('[data-refund-confirm]').innerText()).includes('Give back Rs. 450'));
assert.ok((await dialog.innerText()).includes('only records this'));
assert.equal((await stored(manager, 1)).payments.length, 1, 'nothing is saved before the last button');
await shot(manager, '03-desktop-manager-refund-confirm');
await button(dialog, 'Yes, record the refund').dblclick();
await manager.locator('[data-refund-slip]').waitFor();
ok('wrong amount, too much and no reason are refused; it asks "Give back Rs. 450?"; nothing is saved before that');

console.log('3. The slip and the order');
const slip = await manager.locator('[data-refund-slip]').innerText();
for (const part of ['REFUND SLIP', 'Invoice #1', 'Order #1', 'Rs. 450', 'Cold burger', 'Sana Khan', 'DEMO']) assert.ok(slip.includes(part), part);
await manager.evaluate(() => {
  window.printed = 0;
  window.print = () => (window.printed += 1);
});
await manager.getByRole('dialog').getByRole('button', { name: 'Print' }).click();
assert.equal(await manager.evaluate(() => window.printed), 1);
await shot(manager, '04-desktop-refund-slip');
await manager.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
const afterRefund = await stored(manager, 1);
assert.deepEqual(afterRefund.payments.map((p) => p.kind), ['PAYMENT', 'REFUND'], 'a double tap gave back once');
assert.deepEqual(afterRefund.payments[0], beforeRefund.payments[0], 'the payment is exactly as it was');
assert.equal(afterRefund.status, beforeRefund.status, 'the order status did not change');
assert.equal(afterRefund.refundedTotal, 45_000);
assert.equal(await manager.locator('[data-refund-badge]').innerText(), 'Part refunded');
const totals = await manager.locator('[data-money-totals]').innerText();
assert.ok(totals.includes('Rs. 550') && totals.includes('Rs. 450') && totals.includes('Rs. 100'));
ok('slip shows invoice, amount, reason, who and DEMO, and prints; one refund on a double tap; payment and status unchanged; Part refunded, Net Rs. 100');
await shot(manager, '05-desktop-order-part-refunded');
await button(manager, 'Print slip').click();
await manager.locator('[data-refund-slip]').waitFor();
await manager.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
ok('the slip can be printed again from the order');

console.log('4. Correct Payment: the method moves, the money and status stay');
await openOrder(manager, 2);
await button(manager, 'Correct').click();
dialog = manager.getByRole('dialog');
assert.ok((await dialog.locator('[data-correct-wrong]').innerText()).includes('Cash'));
assert.equal(await dialog.getByRole('radio', { name: 'Cash' }).count(), 0, 'the wrong method is not offered');
await button(dialog, 'Correct payment').click();
await see(dialog, 'Choose the method');
await dialog.getByRole('radio', { name: 'Card' }).click();
await button(dialog, 'Correct payment').click();
await see(dialog, 'Write the reason.');
await dialog.locator('[data-correct-reason]').fill('Pressed Cash by mistake');
await shot(manager, '06-desktop-correct-payment');
await button(dialog, 'Correct payment').dblclick();
await dialog.waitFor({ state: 'detached' }).catch(() => {});
await see(manager.locator('[data-payments]'), 'Corrected to');
const corrected = await stored(manager, 2);
assert.deepEqual(corrected.payments.map((p) => [p.kind, p.method]), [['PAYMENT', 'CASH'], ['REVERSAL', 'CASH'], ['PAYMENT', 'CARD']], 'a double tap corrected once');
assert.equal(corrected.paidTotal, 45_000);
assert.equal(corrected.payments[1].relatedPaymentId, corrected.payments[0].id);
assert.equal(corrected.payments[2].relatedPaymentId, corrected.payments[1].id);
await see(manager.locator('[data-payments]'), 'Reversal');
assert.equal(await manager.locator('[data-payments] li').first().getByRole('button', { name: 'Correct' }).count(), 0, 'the old entry cannot be corrected twice');
ok('Cash → Card with a reason: old entry kept and marked, a reversal and a new payment added; still Rs. 450 paid; double tap = once');
await shot(manager, '07-desktop-order-corrected');

console.log("5. Today's Summary, and a refund today on yesterday's order");
await manager.evaluate(([key]) => {
  const data = JSON.parse(window.localStorage.getItem(key));
  const order = data.orders.find((o) => o.dailyNumber === 3);
  const day = new Date(`${order.businessDate}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  order.businessDate = day.toISOString().slice(0, 10);
  window.localStorage.setItem(key, JSON.stringify(data));
}, [DATA_KEY]);
await manager.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' });
await manager.getByRole('button', { name: 'All orders', exact: true }).click();
await openOrder(manager, 3);
await button(manager, 'Refund').click();
dialog = manager.getByRole('dialog');
await dialog.locator('[data-refund-amount]').fill('100');
await dialog.locator('[data-refund-reason]').fill('Late food');
await button(dialog, 'Continue').click();
await button(manager.getByRole('dialog'), 'Yes, record the refund').click();
await manager.locator('[data-refund-slip]').waitFor();
await manager.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();

const owner = await openAs(USER.owner, '/summary');
await owner.locator('[data-kpi="refunds"]').waitFor();
assert.equal(await kpi(owner, 'refunds'), 'Rs. 550', "Rs. 450 + Rs. 100 on yesterday's order");
assert.equal(await kpi(owner, 'sales'), 'Rs. 1,000', 'a refund does not change sales; the older sale stays on its day');
// Cash: Rs. 550 + Rs. 450 sold, Rs. 450 moved to card, Rs. 450 + Rs. 100 given back in cash.
assert.equal(await kpi(owner, 'cash'), 'Rs. 0');
assert.ok((await methodRow(owner, 'CARD')).includes('Rs. 450'), 'the corrected payment is under Card');
const panels = await owner.locator('main').innerText();
assert.ok(panels.includes('Cold burger') && panels.includes('Late food') && panels.includes('Pressed Cash by mistake') && panels.includes('Sana Khan'));
ok('today: refunds Rs. 550 with who and why, the corrected payment under Card and listed, sales unchanged, cash right');
await shot(owner, '08-desktop-summary-refunds');
const dayPicker = owner.getByLabel('Choose the day').or(owner.locator('main select')).first();
await dayPicker.selectOption({ index: 1 });
await owner.locator('[data-kpi="refunds"]').filter({ hasText: 'Rs. 0' }).waitFor();
assert.equal(await kpi(owner, 'sales'), 'Rs. 600');
assert.equal(await kpi(owner, 'cash'), 'Rs. 600');
ok("yesterday's report stays as it was: sale Rs. 600, cash Rs. 600, no refund");
await owner.close();

console.log('6. Full refund, and a rider\'s cash');
await manager.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' });
await openOrder(manager, 1);
await button(manager, 'Refund').click();
dialog = manager.getByRole('dialog');
await dialog.locator('[data-refund-amount]').fill('1');
await button(dialog, 'Full').click();
assert.equal(await dialog.locator('[data-refund-amount]').inputValue(), '100');
await dialog.locator('[data-refund-reason]').fill('Customer complaint');
await button(dialog, 'Continue').click();
await button(manager.getByRole('dialog'), 'Yes, record the refund').click();
await manager.locator('[data-refund-slip]').waitFor();
await manager.getByRole('dialog').getByRole('button', { name: 'Close' }).last().click();
await manager.locator('[data-refund-badge]', { hasText: /^Refunded$/ }).waitFor();
assert.equal(await button(manager, 'Refund').count(), 0);
ok('Full fills what is left; after it the order says Refunded and no Refund button is left');

await manager.evaluate(([key, riderId]) => {
  const data = JSON.parse(window.localStorage.getItem(key));
  const order = data.orders.find((o) => o.dailyNumber === 2);
  order.payments = [{ ...order.payments[0], relatedPaymentId: null }];
  order.paidTotal = order.payments[0].amount;
  order.riderId = riderId;
  order.payments[0].receivedBy = riderId;
  window.localStorage.setItem(key, JSON.stringify(data));
}, [DATA_KEY, USER.rider]);
await manager.goto(`${BASE_URL}/orders`, { waitUntil: 'networkidle' });
await openOrder(manager, 2);
await manager.locator('[data-rider-cash-note]').waitFor();
assert.equal(await button(manager, 'Correct').count(), 0);
assert.equal(await button(manager, 'Refund').count(), 1);
ok("a rider's cash cannot be corrected and it says why; a refund is still possible");
await shot(manager, '09-desktop-rider-cash-note');

console.log('7. Tablet and phone');
for (const [label, size] of [['tablet', TABLET], ['phone', PHONE]]) {
  const page = await openAs(USER.manager, '/orders', size);
  await openOrder(page, 1);
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(extra <= 0, `${label}: sideways scroll ${extra}`);
  await shot(page, `10-${label}-order-refunded`);
  await page.close();
}
ok('no sideways scroll on a tablet or phone');

assert.deepEqual(errors, []);
await browser.close();
console.log('Refunds walkthrough passed: permissions, part and full refund, slip, Correct Payment, the day it counts on, rider cash.');

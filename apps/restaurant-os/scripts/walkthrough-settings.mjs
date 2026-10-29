// Settings walkthrough (Preview 5): restaurant and branch, tax and service charge (new bills only — a running
// bill keeps its settings), delivery, receipt, business day, kitchen stations, and Owner-only access.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:settings
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'settings');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), superWaiter: id(104) };
const T1 = id(401);
const T2 = id(402);
const PHONE = { width: 390, height: 844 };
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
const ok = (message) => console.log(`  ✓ ${message}`);
const dialog = (page) => page.getByRole('dialog');
const station = (page, name) => page.locator(`main li[data-station-row="${name}"]`);

/** The waiter sends one Cold Drink (Rs. 125) on a table. */
async function sendColdDrink(waiter, tableId, guests) {
  await waiter.goto(`${BASE_URL}/waiter?table=${tableId}`, { waitUntil: 'networkidle' });
  await waiter.getByRole('tab', { name: 'Menu' }).click();
  await waiter.getByRole('button', { name: /^Cold Drink/ }).first().click();
  await dialog(waiter).getByRole('button', { name: /^Add ·/ }).click();
  await waiter.getByRole('tab', { name: /^Order/ }).click();
  if (guests) await waiter.getByRole('button', { name: 'Guests +' }).click();
  await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await waiter.getByText(/sent to the kitchen/).first().waitFor();
}
async function tableText(tableId) {
  const page = await openAs(USER.owner, '/tables', DESKTOP);
  await page.waitForTimeout(300);
  const text = await page.locator(`a[href*="${tableId}"]`).innerText();
  await page.close();
  return text;
}

const setup = await openAs(USER.owner, '/settings', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. A running bill before the change');
const waiter = await openAs(USER.superWaiter, `/waiter?table=${T1}`, PHONE);
await sendColdDrink(waiter, T1, true);
assert.ok((await tableText(T1)).includes('Rs. 125'));
ok('T1: one Cold Drink = Rs. 125 (no tax, no service charge yet)');

console.log('2. Tax and service charge');
const owner = await openAs(USER.owner, '/settings', DESKTOP);
await shot(owner, '01-desktop-owner-settings');
await owner.getByLabel('Tax rate').fill('60');
await owner.getByRole('button', { name: 'Save settings' }).click();
await owner.getByText(/Tax must be 0–50 %/).waitFor();
await owner.getByLabel('Tax rate').fill('16');
await owner.getByLabel('Service charge (dine-in)').fill('5');
await owner.locator('[data-settings-example]').getByText('Rs. 1,210').waitFor();
await shot(owner, '02-desktop-owner-settings-unsaved');
await owner.getByRole('button', { name: 'Save settings' }).click();
await owner.getByText('Settings saved').first().waitFor();
ok('60 % refused; 16 % tax + 5 % service charge: the example shows Rs. 1,000 → Rs. 1,210; saved');

console.log('3. New bills only');
await sendColdDrink(waiter, T1, false);
assert.ok((await tableText(T1)).includes('Rs. 250'), 'the running bill keeps its old settings');
await sendColdDrink(waiter, T2, true);
assert.ok((await tableText(T2)).includes('Rs. 151'), 'a new bill: 125 + 5 % + 16 % = 151.25 → Rs. 151');
ok('T1 (running) adds a second drink at the old settings → Rs. 250; T2 (new) → Rs. 151 (Rs. 125 + 5 % service + 16 % tax, rounded)');

console.log('4. Branch, receipt and business day');
await owner.getByLabel('Branch name').fill('Gulberg Branch');
await owner.getByLabel('Receipt top text').fill('Aziz Pizza Gulberg');
await owner.getByLabel('Business day starts at').fill('05:00');
await owner.getByLabel('Receipt preview').getByText('Aziz Pizza Gulberg').waitFor();
await owner.getByRole('button', { name: 'Save settings' }).click();
await owner.getByText('Settings saved').first().waitFor();
await owner.getByText('Gulberg Branch').first().waitFor();
assert.equal(await owner.getByLabel('Business day starts at').inputValue(), '05:00');
ok('branch renamed (header shows "Gulberg Branch"), receipt text and preview, business day 05:00');

console.log('5. Kitchen stations');
await owner.getByRole('button', { name: 'Add station' }).click();
await dialog(owner).getByLabel('Station name').fill('Tandoor');
await dialog(owner).getByLabel('Warn after (minutes)').fill('20');
await dialog(owner).getByLabel('Late after (minutes)').fill('20');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText(/"Late" must be after "warn"/).waitFor();
await dialog(owner).getByLabel('Late after (minutes)').fill('30');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await station(owner, 'Tandoor').getByText('warn after 20 min, late after 30 min').waitFor();
await shot(owner, '03-desktop-owner-stations');
assert.equal(await station(owner, 'Pizza Oven').getByRole('button', { name: 'Remove Pizza Oven' }).isDisabled(), true);
await station(owner, 'Tandoor').getByRole('button', { name: 'Remove Tandoor' }).click();
await station(owner, 'Tandoor').waitFor({ state: 'detached' });
ok('Tandoor added (warn 20 = late 20 refused), Pizza Oven cannot be removed (in use), Tandoor removed');

console.log('6. Owner only');
const manager = await openAs(USER.manager, '/settings', DESKTOP);
await manager.getByText('No access').first().waitFor();
await manager.close();
ok('the Manager gets "No access" on Settings');

const phone = await openAs(USER.owner, '/settings', PHONE);
await phone.getByLabel('Tax rate').waitFor();
await shot(phone, '04-phone-owner-settings');

await browser.close();
console.log('Settings walkthrough passed: tax and service charge for new bills only, branch, receipt, business day, kitchen stations, Owner only.');

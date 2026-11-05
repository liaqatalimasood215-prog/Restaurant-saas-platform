// Tables walkthrough (owner request 2026-10-29): Manage Areas (add, rename, reorder, deactivate),
// Add Table (one and many), edit a table (seats, display order), the open-bill locks, Cleaning and
// Out of service, removing (deleted vs archived), search and filters, and the same tables in POS and
// Waiter Orders.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:tables
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'tables');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103), superWaiter: id(104) };
const T1 = id(401);
const PHONE = { width: 390, height: 844 };
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
const ok = (message) => console.log(`  ✓ ${message}`);
const card = (page, name) => page.locator('main ul > li').filter({ has: page.getByText(name, { exact: true }) });
const cardNames = async (page) => (await page.locator('main ul > li span.text-2xl').allInnerTexts()).map((s) => s.trim());
const dialog = (page) => page.getByRole('dialog');
const toast = async (page, text) => {
  try {
    await page.getByText(text).first().waitFor({ timeout: 6_000 });
  } catch (err) {
    await page.screenshot({ path: path.join(OUT_DIR, 'failure.png') });
    console.log(`    failure: ${(await page.getByRole('alert').allInnerTexts()).join(' | ')}`);
    throw err;
  }
};

const setup = await openAs(USER.owner, '/tables', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. Manage Areas — add, rename, reorder (Owner)');
const owner = await openAs(USER.owner, '/tables', DESKTOP);
await card(owner, 'T16').waitFor();
await shot(owner, '01-desktop-owner-tables-board');
await owner.getByRole('button', { name: 'Manage Areas' }).click();
await dialog(owner).getByLabel('New area name').fill('Roof');
await dialog(owner).getByRole('button', { name: 'Add area' }).click();
await dialog(owner).getByText('Roof', { exact: true }).waitFor();
await dialog(owner).getByLabel('New area name').fill('hall');
await dialog(owner).getByRole('button', { name: 'Add area' }).click();
await dialog(owner).getByText('An area called hall already exists.').waitFor();
ok('area Roof added; "hall" refused (names are unique, case ignored)');
await dialog(owner).getByRole('button', { name: 'Rename Family' }).click();
await dialog(owner).getByLabel('New name for Family').fill('Family Hall');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText('Family Hall', { exact: true }).waitFor();
await dialog(owner).getByRole('button', { name: 'Move Roof up' }).click();
await owner.waitForTimeout(600);
const areaOrder = await dialog(owner).locator('li p.font-bold').allInnerTexts();
assert.deepEqual(areaOrder.map((s) => s.trim()), ['Hall', 'Roof', 'Family Hall']);
ok('Family renamed to "Family Hall"; Roof moved up: Hall, Roof, Family Hall');
await shot(owner, '02-desktop-owner-manage-areas');
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
const areaChips = await owner.getByRole('group', { name: 'Area' }).getByRole('button').allInnerTexts();
assert.deepEqual(areaChips, ['All areas', 'Hall', 'Roof', 'Family Hall']);
ok('the area filter follows the new names and order');

console.log('2. Add Table — many at once, then one');
await owner.getByRole('button', { name: 'Add Table' }).click();
await dialog(owner).getByRole('button', { name: 'Many tables' }).click();
await dialog(owner).getByLabel('Area', { exact: true }).selectOption({ label: 'Roof' });
assert.equal(await dialog(owner).getByLabel('From number').inputValue(), '17');
await dialog(owner).getByLabel('To number').fill('22');
await dialog(owner).getByLabel('Seats (capacity)').fill('4');
await dialog(owner).getByText('Creates T17 … T22: 6 tables with 4 seats each.').waitFor();
await shot(owner, '03-desktop-owner-add-many-tables');
await dialog(owner).getByRole('button', { name: 'Add', exact: true }).click();
await toast(owner, '6 tables added');
await owner.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'Roof', exact: true }).click();
await card(owner, 'T22').waitFor({ timeout: 6_000 });
assert.deepEqual(await cardNames(owner), ['T17', 'T18', 'T19', 'T20', 'T21', 'T22']);
ok('Roof: T17–T22 created in one step (the next free number was suggested)');

await owner.getByRole('button', { name: 'Add Table' }).click();
assert.equal(await dialog(owner).getByLabel('Area', { exact: true }).inputValue(), await dialog(owner).getByLabel('Area', { exact: true }).locator('option', { hasText: 'Roof' }).getAttribute('value'));
await dialog(owner).getByLabel('Table name').fill('t17');
await dialog(owner).getByRole('button', { name: 'Add', exact: true }).click();
await dialog(owner).getByText('Roof already has a table called t17.').waitFor();
await dialog(owner).getByLabel('Table name').fill('VIP 1');
await dialog(owner).getByLabel('Seats (capacity)').fill('0');
await dialog(owner).getByRole('button', { name: 'Add', exact: true }).click();
await dialog(owner).getByText('Seats must be a whole number from 1 to 50.').waitFor();
await dialog(owner).getByLabel('Seats (capacity)').fill('2.5');
await dialog(owner).getByRole('button', { name: 'Add', exact: true }).click();
await dialog(owner).getByText('Seats must be a whole number from 1 to 50.').waitFor();
ok('refused: a second "t17" in Roof, 0 seats and 2.5 seats');
await dialog(owner).getByLabel('Seats (capacity)').fill('6');
await dialog(owner).getByRole('button', { name: 'Add', exact: true }).click();
await toast(owner, 'Table VIP 1 added');
ok('VIP 1 (6 seats) added to Roof');

console.log('3. Edit a table — seats and display order');
await card(owner, 'VIP 1').getByRole('button', { name: 'Edit VIP 1' }).click();
await dialog(owner).getByLabel('Seats (capacity)').fill('8');
await dialog(owner).getByLabel('Display order in the area').fill('1');
await shot(owner, '04-desktop-owner-edit-table');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await toast(owner, 'Table VIP 1 saved');
await owner.waitForTimeout(500);
assert.equal((await cardNames(owner))[0], 'VIP 1');
assert.ok((await card(owner, 'VIP 1').innerText()).includes('8 seats'));
ok('VIP 1 now has 8 seats and is first in Roof');

console.log('4. A table with a running bill is locked');
const waiter = await openAs(USER.superWaiter, `/waiter?table=${T1}`, PHONE);
await waiter.getByRole('tab', { name: /^Order/ }).click();
for (let i = 0; i < 2; i++) await waiter.getByRole('button', { name: 'Guests +' }).click();
await waiter.getByRole('tab', { name: 'Menu' }).click();
await waiter.getByRole('button', { name: /^Cold Drink/ }).first().click();
await dialog(waiter).getByRole('button', { name: /^Add ·/ }).click();
await waiter.getByRole('tab', { name: /^Order/ }).click();
await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
await waiter.getByText(/sent to the kitchen/).first().waitFor();
await owner.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'Hall', exact: true }).click();
await card(owner, 'T1').getByText('2 / 4 guests').waitFor({ timeout: 6_000 });
ok('T1 card: Occupied, "2 / 4 guests" (guests shown apart from the capacity)');
await card(owner, 'T1').getByRole('button', { name: 'Edit T1' }).click();
await dialog(owner).getByText(/has a running or held bill/).waitFor();
assert.equal(await dialog(owner).getByLabel('Area', { exact: true }).isDisabled(), true);
assert.equal(await dialog(owner).getByRole('button', { name: 'Take out of service' }).isDisabled(), true);
assert.equal(await dialog(owner).getByRole('button', { name: 'Remove table' }).isDisabled(), true);
await shot(owner, '05-desktop-owner-edit-locked-open-bill');
await dialog(owner).getByRole('button', { name: 'Cancel' }).click();
ok('T1 with a running bill: area, out of service and remove are blocked');
await owner.getByRole('button', { name: 'Manage Areas' }).click();
await dialog(owner).getByText('1 open bills — cannot be deactivated now').waitFor();
assert.equal(await dialog(owner).getByRole('button', { name: 'Deactivate Hall' }).isDisabled(), true);
ok('Hall has an open bill, so it cannot be deactivated');
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();

console.log('5. Cleaning and Out of service');
await card(owner, 'T2').getByRole('button', { name: 'Mark T2 for cleaning' }).click();
await card(owner, 'T2').getByText('Cleaning', { exact: true }).waitFor();
await card(owner, 'T3').getByRole('button', { name: 'Edit T3' }).click();
await dialog(owner).getByRole('button', { name: 'Take out of service' }).click();
await toast(owner, 'T3 is out of service');
await card(owner, 'T3').getByText('Out of service', { exact: true }).waitFor();
assert.equal(await card(owner, 'T3').locator('a').count(), 0, 'an out-of-service card is not a link');
await owner.getByRole('group', { name: 'Status' }).getByRole('button', { name: /^Cleaning/ }).click();
await owner.waitForTimeout(300);
assert.deepEqual(await cardNames(owner), ['T2']);
await owner.getByRole('group', { name: 'Status' }).getByRole('button', { name: /^All/ }).click();
await shot(owner, '06-desktop-owner-cleaning-out-of-service');
ok('T2 marked for cleaning (status filter finds it); T3 out of service (no link)');

console.log('6. The same tables in POS and Waiter Orders');
const cashier = await openAs(USER.cashier, '/pos', DESKTOP);
await cashier.locator('main [data-pos-bill]').getByRole('radio', { name: 'Table' }).click();
const box = dialog(cashier);
await box.getByRole('heading', { name: 'Roof' }).waitFor();
assert.equal(await box.getByRole('button', { name: 'T3 — Out of service' }).isDisabled(), true);
assert.equal(await box.getByRole('button', { name: 'T2 — Cleaning' }).isDisabled(), false);
await box.getByRole('button', { name: 'VIP 1 — Free' }).waitFor();
await shot(cashier, '07-desktop-cashier-pos-table-box');
await box.getByRole('button', { name: 'T2 — Cleaning' }).click();
await cashier.getByRole('button', { name: /^Cold Drink/ }).first().click();
await dialog(cashier).getByRole('button', { name: /^Add ·/ }).click();
await cashier.locator('main [data-pos-bill]').getByRole('button', { name: 'Send to kitchen' }).click();
await cashier.getByText(/T2 · Order #/).first().waitFor({ timeout: 6_000 });
await card(owner, 'T2').getByText('Occupied', { exact: true }).waitFor({ timeout: 6_000 });
ok('POS table box: areas Hall / Roof / Family Hall, VIP 1 there, T3 disabled; seating T2 ends Cleaning');
await waiter.goto(`${BASE_URL}/waiter`, { waitUntil: 'networkidle' });
await waiter.getByText('VIP 1', { exact: true }).waitFor();
assert.equal(await waiter.locator('a', { hasText: 'T3' }).count(), 0);
await shot(waiter, '08-phone-waiter-table-list');
ok('Waiter Orders lists VIP 1 and T17–T22; T3 cannot be opened');

console.log('7. Remove — never used = deleted; used = archived');
await owner.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'Roof', exact: true }).click();
await card(owner, 'T22').getByRole('button', { name: 'Edit T22' }).click();
await dialog(owner).getByRole('button', { name: 'Remove table' }).click();
await dialog(owner).getByText('T22 was never used, so it is deleted.').waitFor();
await dialog(owner).getByRole('button', { name: 'Remove', exact: true }).click();
await toast(owner, 'T22 deleted');
await owner.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'Hall', exact: true }).click();
await card(owner, 'T4').getByRole('button', { name: 'Edit T4' }).click();
await dialog(owner).getByRole('button', { name: 'Remove table' }).click();
await dialog(owner).getByText(/T4 has old bills, so it is archived/).waitFor();
await dialog(owner).getByRole('button', { name: 'Remove', exact: true }).click();
await toast(owner, 'T4 archived (old bills kept)');
await card(owner, 'T4').waitFor({ state: 'detached', timeout: 6_000 });
ok('T22 (never used) deleted; T4 (assigned to a waiter) archived and hidden');

console.log('8. Search, deactivate an area, Manager rights');
await owner.getByRole('group', { name: 'Area' }).getByRole('button', { name: 'All areas' }).click();
await owner.getByLabel('Search tables or waiter').fill('vip');
await owner.waitForTimeout(300);
assert.deepEqual(await cardNames(owner), ['VIP 1']);
await owner.getByLabel('Search tables or waiter').fill('');
await owner.getByRole('button', { name: 'Manage Areas' }).click();
await dialog(owner).getByRole('button', { name: 'Deactivate Roof' }).click();
await dialog(owner).getByText('Inactive').waitFor();
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
await card(owner, 'VIP 1').waitFor({ state: 'detached', timeout: 6_000 });
ok('search "vip" finds VIP 1; Roof deactivated → its tables leave the board');
const manager = await openAs(USER.manager, '/tables', DESKTOP);
await manager.getByRole('button', { name: 'Add Table' }).waitFor();
const cashierTables = await openAs(USER.cashier, '/tables', DESKTOP);
await card(cashierTables, 'T1').waitFor();
assert.equal(await cashierTables.getByRole('button', { name: 'Add Table' }).count(), 0);
assert.equal(await cashierTables.getByRole('button', { name: 'Manage Areas' }).count(), 0);
ok('Manager sees Manage Areas / Add Table; the Cashier does not');

const phone = await openAs(USER.owner, '/tables', PHONE);
await card(phone, 'T1').waitFor();
await shot(phone, '09-phone-owner-tables');

await browser.close();
console.log('Tables walkthrough passed: areas, add one / many, edit, locks, cleaning, out of service, remove, search, POS and Waiter Orders.');

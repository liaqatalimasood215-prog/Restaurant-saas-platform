// Inventory walkthrough (Step A, owner 2026-11-04): old demo data is kept when the inventory arrives, dashboard cards
// open the filtered list, add / edit ingredients (kg and packages), stock corrections with a reason (10 kg − 1.5 kg = 8.5 kg),
// a double tap saves once, Not in use, search, Stock Movements with filters (inventory phase 1: five sections),
// Owner / Manager only, phone and tablet without sideways scroll.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:inventory
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'inventory');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103) };
const CHICKEN = id(1300);
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 820, height: 1180 };
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
// The Aziz Pizza test data (MASTER_PROMPT.md §12): the owner's own demo is Lala Restaurant.
await context.addInitScript(() => window.localStorage.setItem('lala-os-demo-fixture', 'acceptance'));
const errors = [];

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
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
const dialog = (page) => page.getByRole('dialog');
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const row = (page, name) => page.locator(`main tr[data-ingredient-row="${name}"]`);
const card = (page, label) => page.locator(`main [data-inventory-card="${label}"]`);
/** Inventory opens on Suppliers (owner, 2026-11-06): the cards are on Overview. */
const openOverview = (page) => page.getByRole('tab', { name: 'Overview', exact: true }).click();
async function openIngredients(page) {
  await page.getByRole('tab', { name: 'Stock', exact: true }).click();
  await page.getByRole('tab', { name: 'Ingredients' }).click();
}
const ledgerRows = (page) => page.locator('main tr[data-ledger-row]');
async function noSidewaysScroll(page, label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(wide <= 1, `${label}: the page scrolls sideways by ${wide}px`);
}

// Fresh start, then pretend this browser still has demo data of the previous version (15) with a change of its own.
const setup = await openAs(USER.owner, '/inventory', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.reload({ waitUntil: 'networkidle' });
// Any change saves the demo data in this browser.
await setup.getByRole('button', { name: 'Adjust Stock' }).click();
await dialog(setup).getByLabel('Ingredient').selectOption({ label: 'Onions (8 kg)' });
await dialog(setup).getByLabel('Quantity').fill('1');
await dialog(setup).getByRole('radio', { name: 'Add' }).click();
await dialog(setup).getByRole('radio', { name: 'Found more stock' }).click();
await dialog(setup).getByRole('button', { name: 'Save change' }).click();
await setup.getByText('Stock of Onions updated').first().waitFor();

console.log('1. Old demo data is kept: only the inventory is added');
await setup.evaluate((key) => {
  const data = JSON.parse(window.localStorage.getItem(key));
  delete data.inventory;
  data.version = 15;
  data.employeeCounter = 77; // a change the demo had made
  data.rolePermissions = { MANAGER: ['pos.view', 'orders.view', 'menu.view'] }; // saved before Inventory existed
  window.localStorage.setItem(key, JSON.stringify(data));
}, DATA_KEY);
await setup.close();
const owner = await openAs(USER.owner, '/inventory', DESKTOP);
await openOverview(owner);
await card(owner, 'Ingredients').waitFor();
const upgraded = await saved(owner);
assert.equal(upgraded.version, 19, 'brought up to the newest version');
assert.equal(upgraded.employeeCounter, 77, 'the old data was kept');
assert.equal(upgraded.inventory.ingredients.filter((i) => i.kind === 'BOUGHT').length, 25);
assert.ok(upgraded.rolePermissions.MANAGER.includes('inventory.view') && upgraded.rolePermissions.MANAGER.includes('menu.view'));
ok('version 15 → 17: earlier changes kept (employee counter 77, Manager permissions), 25 sample ingredients added');

console.log('2. Dashboard');
const cardValue = async (label) => (await card(owner, label).innerText()).split('\n').map((s) => s.trim()).filter(Boolean);
assert.ok((await cardValue('Ingredients')).includes('25'));
assert.ok((await cardValue('Low stock')).includes('3'));
assert.ok((await cardValue('Out of stock')).includes('1'));
assert.ok((await cardValue('Expiring soon')).includes('3'));
assert.ok((await cardValue('Expiring soon')).includes('1 already expired'));
assert.ok((await cardValue('Total stock value')).includes('Rs. 78,665'));
await shot(owner, '01-desktop-owner-overview');
await card(owner, 'Low stock').click();
await owner.getByRole('button', { name: /^Low stock/, pressed: true }).waitFor();
assert.equal(await owner.locator('main tr[data-ingredient-row]').count(), 3);
ok('cards: 25 ingredients, 3 low, 1 out, 3 expiring + 1 expired, Rs. 78,665; "Low stock" opens the list with 3 rows');

console.log('3. Add ingredients');
await owner.getByRole('button', { name: /^All/ }).click();
await owner.getByRole('button', { name: 'Add Ingredient' }).click();
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText('Enter the ingredient name.').waitFor();
await dialog(owner).getByLabel('Ingredient name').fill('Chicken wings');
assert.equal(await dialog(owner).getByLabel('Code').inputValue(), 'CHK-002', 'CHK-001 is taken by Chicken (boneless)');
await dialog(owner).locator('[data-conversion]').getByText('1 kg = 1,000 g').waitFor();
await dialog(owner).getByLabel('Used in recipes as').selectOption('piece');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText(/These units do not fit together/).waitFor();
await dialog(owner).getByLabel('Used in recipes as').selectOption('g');
await dialog(owner).getByLabel('Stock now').fill('5');
await dialog(owner).getByLabel('Low stock at').fill('2');
await dialog(owner).getByLabel('Usual order').fill('10');
await dialog(owner).getByLabel('Purchase price').fill('700');
await dialog(owner).getByLabel('Storage place').selectOption({ label: 'Freezer' });
await dialog(owner).getByLabel('Preferred supplier').selectOption({ label: 'ABC Foods — DEMO' });
await shot(owner, '02-desktop-owner-add-ingredient');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await owner.getByText('Chicken wings added').first().waitFor();
await row(owner, 'Chicken wings').getByText('5 kg').waitFor();
await row(owner, 'Chicken wings').getByText('Rs. 700 / kg').waitFor();
ok('empty name refused; code suggested CHK-002; kg + pieces refused; Chicken wings 5 kg at Rs. 700 / kg in the Freezer');

await owner.getByRole('button', { name: 'Add Ingredient' }).click();
await dialog(owner).getByLabel('Ingredient name').fill('Coffee sachets');
await dialog(owner).getByLabel('Category').selectOption('BEVERAGES');
await dialog(owner).getByLabel('Bought in').selectOption('box');
await dialog(owner).getByLabel('Used in recipes as').selectOption('piece');
await dialog(owner).getByLabel('Stock now').fill('120');
await dialog(owner).getByLabel('Purchase price').fill('1000');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText(/Enter how many fit in one package/).waitFor();
await dialog(owner).getByLabel('How many pieces in 1 box?').fill('50');
await dialog(owner).locator('[data-conversion]').getByText('1 box = 50 pieces').waitFor();
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await owner.getByText('Coffee sachets added').first().waitFor();
await row(owner, 'Coffee sachets').getByText('120 pieces').waitFor();
const coffee = (await saved(owner)).inventory.ingredients.find((i) => i.name === 'Coffee sachets');
assert.equal(coffee.packSizeMilli, 50_000);
assert.equal(coffee.purchasePrice, 100_000);
ok('a package needs its size: 1 box = 50 pieces; 120 pieces at Rs. 1,000 / box');

console.log('4. Edit');
await row(owner, 'Chicken wings').getByRole('button', { name: 'Edit Chicken wings' }).click();
await dialog(owner).getByText('In stock now: 5 kg').waitFor();
assert.equal(await dialog(owner).getByLabel('Used in recipes as').isDisabled(), true);
await dialog(owner).getByLabel('Low stock at').fill('6');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await owner.getByText('Chicken wings saved').first().waitFor();
await row(owner, 'Chicken wings').getByText('Low stock').waitFor();
ok('Low stock at 6 kg → Chicken wings (5 kg) shows Low stock; the recipe unit is locked, the stock is changed only by Adjust');

console.log('5. Adjust stock (owner test 1: 10 kg − 1.5 kg = 8.5 kg)');
await row(owner, 'Chicken (boneless)').getByRole('button', { name: 'Adjust stock of Chicken (boneless)' }).click();
await dialog(owner).getByText('In stock now: 10 kg').waitFor();
await dialog(owner).getByLabel('Quantity').fill('11');
await dialog(owner).getByRole('radio', { name: 'Counted again' }).click();
await dialog(owner).getByRole('button', { name: 'Save change' }).click();
await dialog(owner).getByText('You cannot remove more than is in stock (10 kg).').waitFor();
await dialog(owner).getByLabel('Quantity').fill('1.5');
await dialog(owner).getByRole('radio', { name: 'Other reason' }).click();
await dialog(owner).getByRole('button', { name: 'Save change' }).click();
await dialog(owner).getByText('Write why the stock changes.').waitFor();
await dialog(owner).getByRole('radio', { name: 'Counted again' }).click();
await dialog(owner).locator('[data-adjust-after]').getByText('After this: 8.5 kg').waitFor();
await shot(owner, '03-desktop-owner-adjust-stock');
// A double tap: two clicks, one change.
await dialog(owner).getByRole('button', { name: 'Save change' }).dblclick();
await owner.getByText('Stock of Chicken (boneless) updated').first().waitFor();
await row(owner, 'Chicken (boneless)').getByText('8.5 kg').waitFor();
const chickenMoves = (await saved(owner)).inventory.movements.filter((m) => m.ingredientId === CHICKEN);
assert.deepEqual(
  chickenMoves.map((m) => [m.type, m.quantityMilli]),
  [
    ['OPENING', 10_000_000],
    ['ADJUSTMENT', -1_500_000],
  ],
);
ok('more than in stock and "Other" without a note refused; 10 kg − 1.5 kg = 8.5 kg; a double tap saved one movement');

console.log('6. Overview shows the change; Not in use; search');
await owner.getByRole('tab', { name: 'Overview' }).click();
await owner.getByText('−1.5 kg').first().waitFor();
await owner.getByText(/Counted again · by Aziz Ahmed/).first().waitFor();
await openIngredients(owner);
await row(owner, 'Coffee sachets').getByRole('button', { name: 'Edit Coffee sachets' }).click();
await dialog(owner).getByRole('switch', { name: 'In use' }).click();
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await row(owner, 'Coffee sachets').waitFor({ state: 'detached' });
await owner.getByRole('button', { name: /^Not in use/ }).click();
await row(owner, 'Coffee sachets').getByText('Not in use').waitFor();
await owner.getByRole('button', { name: /^All/ }).click();
await owner.getByLabel('Search name or code').fill('mozz');
assert.equal(await owner.locator('main tr[data-ingredient-row]').count(), 1);
await owner.getByLabel('Search name or code').fill('');
await owner.getByRole('tab', { name: 'Overview' }).click();
assert.ok((await cardValue('Ingredients')).includes('26'), 'Coffee sachets (Not in use) is not counted');
await openIngredients(owner);
await shot(owner, '04-desktop-owner-ingredients');
ok('Recent stock changes: −1.5 kg, Counted again by Aziz Ahmed; Coffee sachets Not in use (hidden, counted apart); "mozz" finds 1');

console.log('6b. Stock Movements: every change with why, who, when and the stock it left');
await row(owner, 'Chicken (boneless)').getByRole('button', { name: 'Stock history of Chicken (boneless)' }).click();
await ledgerRows(owner).first().waitFor();
assert.equal(await owner.getByLabel('Ingredient', { exact: true }).locator('option:checked').innerText(), 'Chicken (boneless)');
const chickenLedger = await ledgerRows(owner).allInnerTexts();
assert.equal(chickenLedger.length, 2);
assert.match(chickenLedger[0], /Chicken \(boneless\)\s+−1\.5 kg\s+Counted again\s+Aziz Ahmed\s+8\.5 kg/);
assert.match(chickenLedger[1], /\+10 kg\s+Opening stock\s+Aziz Ahmed\s+10 kg/);
await shot(owner, '04b-desktop-owner-stock-movements');
await owner.getByRole('button', { name: 'Clear filters' }).click();
await owner.getByLabel('Kind of change').selectOption('ADJUSTMENT');
await owner.getByText('1 change', { exact: true }).waitFor();
await owner.getByLabel('Kind of change').selectOption('');
await owner.getByRole('button', { name: 'Today' }).click();
// 24 opening stocks (Jalapeños start at 0) + Chicken wings + Coffee sachets + the Chicken correction
await owner.getByText('27 changes', { exact: true }).waitFor();
assert.equal(await ledgerRows(owner).count(), 27);
await owner.getByRole('tab', { name: 'Overview' }).click();
await owner.getByRole('button', { name: 'View all' }).last().click();
await ledgerRows(owner).first().waitFor();
// Suppliers S1 (2026-11-05): the Purchasing placeholder became the Suppliers screen (walkthrough:suppliers).
await owner.getByRole('tab', { name: 'Suppliers', exact: true }).click();
await owner.locator('main [data-suppliers]').waitFor();
for (const [section, title] of [['Reports', 'Reports']]) {
  await owner.getByRole('tab', { name: new RegExp(`^${section}`) }).click();
  await owner.locator(`main [data-planned="${title}"]`).getByText('PLACEHOLDER').waitFor();
}
await owner.getByRole('tab', { name: 'Stock', exact: true }).click();
await owner.getByRole('tab', { name: /^Wastage & Expiry/ }).click();
await owner.locator('main [data-planned="Wastage & Expiry"]').getByText('Comes in inventory phase 4, after your approval.').waitFor();
ok('History of Chicken: −1.5 kg Counted again by Aziz Ahmed → 8.5 kg, +10 kg opening → 10 kg; kind and period filters; Suppliers opens; Reports and Wastage are clear PLACEHOLDERs with their phase');

console.log('7. Owner and Manager only');
const manager = await openAs(USER.manager, '/inventory', DESKTOP);
await openOverview(manager);
await card(manager, 'Ingredients').waitFor();
await manager.getByRole('button', { name: 'Add Ingredient' }).waitFor();
await manager.close();
const cashier = await openAs(USER.cashier, '/inventory', DESKTOP);
await cashier.getByText('No access').first().waitFor();
assert.equal(await cashier.getByRole('link', { name: /Inventory/ }).count(), 0, 'not in the Cashier sidebar');
await cashier.close();
ok('the Manager may add and correct; the Cashier gets "No access" and no sidebar link');

console.log('8. Phone and tablet');
for (const [label, viewport] of [
  ['phone', PHONE],
  ['tablet', TABLET],
]) {
  const page = await openAs(USER.owner, '/inventory', viewport);
  await openOverview(page);
  await card(page, 'Ingredients').waitFor();
  await noSidewaysScroll(page, `${label} overview`);
  await shot(page, `05-${label}-owner-overview`);
  await openIngredients(page);
  await page.locator('main [data-ingredient-card="Chicken (boneless)"]').getByText('8.5 kg').waitFor();
  await noSidewaysScroll(page, `${label} ingredients`);
  await shot(page, `06-${label}-owner-ingredients`);
  if (label === 'phone') {
    await page.locator('main [data-ingredient-card="Chicken (boneless)"]').getByRole('button', { name: 'Adjust Stock' }).click();
    await dialog(page).getByText('In stock now: 8.5 kg').waitFor();
    await shot(page, '07-phone-owner-adjust-stock');
  }
  await page.close();
}
ok('phone 390 px and tablet 820 px: cards instead of the table, no sideways scroll, Adjust opens');

assert.deepEqual(errors, [], 'no browser console errors');
await owner.close();
await browser.close();
console.log('Inventory walkthrough passed: old demo data kept, dashboard, add / edit (kg and packages), stock corrections with reasons, double tap once, Not in use, search, Owner / Manager only, phone and tablet.');

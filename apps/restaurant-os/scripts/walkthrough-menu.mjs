// Menu walkthrough (Preview 5): categories (add, reorder, hide / show), add-on groups, add an item with
// sizes and add-ons, edit a price (old bills keep the old price), out of stock and online switches,
// delete (deleted / archived), and the same menu in POS and Waiter Orders.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:menu
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'menu');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103), superWaiter: id(104), kitchen: id(106) };
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
const dialog = (page) => page.getByRole('dialog');
const item = (page, name) => page.locator(`main li[data-menu-item="${name}"]`);
const category = (page, name) => page.locator(`main li[data-category-row="${name}"]`);
const toast = (page, text) => page.getByText(text).first().waitFor({ timeout: 6_000 });
const tab = (page, name) => page.getByRole('tab', { name: new RegExp(`^${name}`) }).click();

const setup = await openAs(USER.owner, '/menu', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. Menu list and categories');
const owner = await openAs(USER.owner, '/menu', DESKTOP);
await item(owner, 'Classic Pizza').getByText('Small Rs. 600 · Medium Rs. 850 · Large Rs. 1,200').waitFor();
await shot(owner, '01-desktop-owner-menu-items');
const card = (name) => owner.locator(`button[data-menu-category="${name}"]`);
const shownItems = () => owner.locator('main li[data-menu-item]').evaluateAll((rows) => rows.map((r) => r.dataset.menuItem));
assert.equal(await card('All Menu').getAttribute('aria-pressed'), 'true');
assert.equal((await shownItems()).length, 11);
await owner.getByLabel('Search items').fill('Zinger');
await card('Burgers').click();
assert.deepEqual(await shownItems(), ['Zinger Burger', 'Beef Burger']);
assert.equal(await card('Burgers').getAttribute('aria-pressed'), 'true');
assert.equal(await owner.locator('[data-menu-heading]').innerText(), 'Burgers');
assert.equal(await owner.getByLabel('Size').count(), 0, 'no size filter where no item has sizes');
await shot(owner, '01b-desktop-owner-menu-burgers');
await owner.getByLabel('Search in Burgers').fill('beef');
assert.deepEqual(await shownItems(), ['Beef Burger']);
await card('Pizza').click();
assert.deepEqual(await shownItems(), ['Classic Pizza', 'Fajita Pizza']);
await owner.getByLabel('Size').selectOption('Large');
assert.equal((await shownItems()).length, 2);
await card('All Menu').click();
assert.equal((await shownItems()).length, 11);
ok('Category cards: Burgers shows its 2 items, search stays inside the category, Pizza shows its 2, All Menu shows all 11');
await tab(owner, 'Categories');
await owner.getByLabel('New category name').fill('Desserts');
await owner.getByRole('button', { name: 'Add category' }).click();
await category(owner, 'Desserts').waitFor();
await owner.getByLabel('New category name').fill('pizza');
await owner.getByRole('button', { name: 'Add category' }).click();
await owner.getByText('A category called pizza already exists.').waitFor();
await owner.getByRole('button', { name: 'Move Desserts up' }).click();
await owner.waitForTimeout(500);
await owner.getByRole('button', { name: 'Hide Pasta' }).click();
await category(owner, 'Pasta').getByText('hidden').waitFor();
await shot(owner, '02-desktop-owner-menu-categories');
const cashier = await openAs(USER.cashier, '/pos', DESKTOP);
await cashier.getByRole('button', { name: /^Classic Pizza/ }).first().waitFor();
assert.equal(await cashier.getByRole('button', { name: /^Alfredo Pasta/ }).count(), 0, 'hidden category is not offered at the POS');
await owner.getByRole('button', { name: 'Show Pasta' }).click();
await cashier.getByRole('button', { name: /^Alfredo Pasta/ }).first().waitFor({ timeout: 6_000 });
ok('Desserts added and moved up; duplicate "pizza" refused; Pasta hidden → gone from POS, shown → back');

console.log('2. Add-on group');
await tab(owner, 'Add-ons');
await owner.getByRole('button', { name: 'Add group' }).click();
await dialog(owner).getByLabel('Group name').fill('Dessert toppings');
await dialog(owner).getByLabel('Choose at most').fill('3');
await dialog(owner).getByLabel('Add-on 1 name').fill('Chocolate sauce');
await dialog(owner).getByLabel('Add-on 1 price').fill('50');
await dialog(owner).getByRole('button', { name: 'Add add-on' }).click();
await dialog(owner).getByLabel('Add-on 2 name').fill('Sprinkles');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText(/Check "choose at least \/ at most"/).waitFor();
await dialog(owner).getByLabel('Choose at most').fill('2');
await shot(owner, '03-desktop-owner-addon-group');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await toast(owner, 'Add-on group Dessert toppings saved');
await owner.locator('[data-addon-group="Dessert toppings"]').getByText('Sprinkles · free').waitFor();
ok('"Dessert toppings" (choose 0–2): Chocolate sauce Rs. 50, Sprinkles free; "at most 3" with 2 add-ons refused');

console.log('3. Add an item with sizes and add-ons');
await tab(owner, 'Items');
await owner.getByRole('button', { name: 'Add Item' }).click();
await dialog(owner).getByLabel('Item name').fill('Classic Pizza');
await dialog(owner).getByLabel('Price', { exact: true }).fill('700');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText('Desserts already has an item called Classic Pizza.').or(dialog(owner).getByText('Pizza already has an item called Classic Pizza.')).first().waitFor();
await dialog(owner).getByLabel('Category', { exact: true }).selectOption({ label: 'Desserts' });
await dialog(owner).getByLabel('Item name').fill('Kulfi');
await dialog(owner).getByLabel('Kitchen station').selectOption({ label: 'Drinks' });
await dialog(owner).getByRole('button', { name: 'Sizes' }).click();
await dialog(owner).getByLabel('Size 1 price').fill('150');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await dialog(owner).getByText('Enter a price for Large.').waitFor();
await dialog(owner).getByLabel('Size 2 price').fill('250');
await dialog(owner).getByRole('checkbox', { name: /Dessert toppings/ }).check();
await dialog(owner).getByLabel('Short description').fill('Traditional milk kulfi');
await shot(owner, '04-desktop-owner-add-item');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await toast(owner, 'Kulfi saved');
await item(owner, 'Kulfi').getByText('Small Rs. 150 · Large Rs. 250').waitFor();
await cashier.getByRole('button', { name: /^Kulfi/ }).first().click();
await dialog(cashier).getByRole('button', { name: /^Large/ }).click();
await dialog(cashier).getByRole('button', { name: /^Chocolate sauce/ }).click();
await dialog(cashier).getByRole('button', { name: /^Add · Rs\. 300/ }).waitFor();
await dialog(cashier).getByRole('button', { name: 'Close' }).first().click();
ok('a second "Classic Pizza" refused; a size without price refused; Kulfi (Small Rs. 150 / Large Rs. 250 + toppings) is on the POS at once: Large + Chocolate sauce = Rs. 300');

console.log('4. A new price never changes an old bill');
const waiter = await openAs(USER.superWaiter, `/waiter?table=${id(401)}`, PHONE);
await waiter.getByRole('tab', { name: 'Menu' }).click();
await waiter.getByRole('button', { name: /^Classic Pizza/ }).first().click();
await dialog(waiter).getByRole('button', { name: /^Medium/ }).click();
await dialog(waiter).getByRole('button', { name: /^Add ·/ }).click();
await waiter.getByRole('tab', { name: /^Order/ }).click();
await waiter.getByRole('button', { name: 'Guests +' }).click();
await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
await waiter.getByText(/sent to the kitchen/).first().waitFor();
await owner.getByRole('button', { name: 'Edit Classic Pizza' }).click();
await dialog(owner).getByLabel('Size 2 price').fill('900');
await dialog(owner).getByRole('button', { name: 'Save' }).click();
await toast(owner, 'Classic Pizza saved');
await item(owner, 'Classic Pizza').getByText('Small Rs. 600 · Medium Rs. 900 · Large Rs. 1,200').waitFor();
const tables = await openAs(USER.owner, '/tables', DESKTOP);
assert.ok((await tables.locator(`a[href*="${id(401)}"]`).innerText()).includes('Rs. 850'), 'T1 keeps the old price');
await tables.close();
ok('T1 ordered Medium Classic Pizza at Rs. 850; Medium is now Rs. 900; T1 still shows Rs. 850');

console.log('5. Out of stock and online switches');
await owner.getByRole('switch', { name: 'In stock: Zinger Burger' }).click();
await item(owner, 'Zinger Burger').getByText('Out of stock').waitFor();
await cashier.getByRole('button', { name: /^Zinger Burger/ }).first().waitFor();
assert.equal(await cashier.getByRole('button', { name: /^Zinger Burger/ }).first().isDisabled(), true, 'out of stock cannot be ordered');
await owner.getByRole('switch', { name: 'In stock: Zinger Burger' }).click();
await item(owner, 'Zinger Burger').getByText('In stock').waitFor();
await owner.getByRole('switch', { name: 'Online: Cold Drink' }).click();
await owner.getByLabel('Show').selectOption('NOT_ONLINE');
await item(owner, 'Cold Drink').waitFor();
assert.equal(await owner.locator('main li[data-menu-item]').count(), 1);
await owner.getByLabel('Show').selectOption('ALL');
ok('Zinger Burger out of stock → disabled at the POS, then back; Cold Drink taken off the online app (filter finds it)');

console.log('6. Delete: never ordered = deleted; ordered = archived');
await owner.getByRole('button', { name: 'Delete Kulfi' }).click();
await dialog(owner).getByRole('button', { name: 'Delete' }).click();
await toast(owner, 'Kulfi deleted');
await owner.getByRole('button', { name: 'Delete Classic Pizza' }).click();
await dialog(owner).getByRole('button', { name: 'Delete' }).click();
await toast(owner, 'Classic Pizza removed — kept for old bills');
await item(owner, 'Classic Pizza').waitFor({ state: 'detached' });
await cashier.reload({ waitUntil: 'networkidle' });
await cashier.getByRole('button', { name: /^Fajita Pizza/ }).first().waitFor();
assert.equal(await cashier.getByRole('button', { name: /^Classic Pizza/ }).count(), 0);
const t1 = await openAs(USER.owner, '/tables', DESKTOP);
assert.ok((await t1.locator(`a[href*="${id(401)}"]`).innerText()).includes('Rs. 850'));
await t1.close();
ok('Kulfi deleted; Classic Pizza archived: gone from POS, T1 still Rs. 850');

console.log('7. Who may open the Menu');
const manager = await openAs(USER.manager, '/menu', DESKTOP);
await manager.getByRole('button', { name: 'Add Item' }).waitFor();
await manager.close();
const kitchen = await openAs(USER.kitchen, '/menu', DESKTOP);
await kitchen.getByText('No access').first().waitFor();
await kitchen.close();
ok('Manager edits the menu; Kitchen gets "No access" (out of stock stays on the Kitchen Display)');

const phone = await openAs(USER.owner, '/menu', PHONE);
await item(phone, 'Fajita Pizza').waitFor();
await shot(phone, '05-phone-owner-menu');

await browser.close();
console.log('Menu walkthrough passed: categories, add-ons, items with sizes, price change keeps old bills, stock / online switches, delete, permissions.');

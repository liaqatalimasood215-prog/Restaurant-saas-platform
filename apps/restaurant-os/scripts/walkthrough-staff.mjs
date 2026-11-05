// Staff walkthrough (owner requests 2026-10-29), DEMO frontend only: the employee list, the 3-step Add
// Staff wizard with Employee ID, activation link (resend / cancel), activation + PIN, Role Permissions and
// one person's own permissions, PIN reset, Deactivate ends sessions and Reactivate needs a fresh login,
// Delete (deleted / archived), the Owner's own row, and the Manager's read-only view.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:staff
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'staff');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103) };
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
/** A page with no login, like a new phone. */
async function openLoggedOut(url, viewport = PHONE) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const dialog = (page) => page.getByRole('dialog');
/** The desktop table row of one person */
const row = (page, name) => page.locator(`main tr[data-staff-row="${name}"]`);
/** Open the "⋯" menu of a person and choose an item */
async function menu(page, name, item) {
  await page.getByRole('button', { name: `Actions for ${name}` }).first().click();
  await page.getByRole('menuitem', { name: item }).click();
}
const loginNames = async () => {
  const page = await openLoggedOut('/');
  await page.getByRole('heading', { name: /Log in/ }).waitFor();
  const text = await page.locator('body').innerText();
  await page.close();
  return text;
};
async function readLink(page) {
  await dialog(page).getByText(/^(Activation|PIN reset) link for /).waitFor({ timeout: 6_000 });
  const url = await dialog(page).getByLabel('Link').inputValue();
  assert.match(url, /\/activate\?token=[0-9a-f]{64}$/);
  return url;
}
async function setPin(url, pin, confirm = pin) {
  const page = await openLoggedOut(url.replace(BASE_URL, ''));
  await page.getByLabel(/New PIN/).fill(pin);
  await page.getByLabel('Type the PIN again').fill(confirm);
  await page.getByRole('button', { name: 'Save my PIN' }).click();
  return page;
}
const next = (page) => dialog(page).getByRole('button', { name: /^Next/ }).click();

const setup = await openAs(USER.owner, '/staff', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. Employee list, then the 3-step wizard adds a Super Waiter');
const owner = await openAs(USER.owner, '/staff', DESKTOP);
await row(owner, 'Bilal Hussain').getByText('#EMP003').waitFor();
await shot(owner, '01-desktop-owner-staff-list');
await owner.getByRole('button', { name: 'Add Staff' }).click();
await dialog(owner).getByLabel('Full name').fill('Ali Raza');
await dialog(owner).getByLabel('Mobile number').fill('0300-11122');
await next(owner);
await dialog(owner).getByText('Enter a mobile number, for example 0300-1234567 or 03001234567.').waitFor();
await dialog(owner).getByLabel('Mobile number').fill('03001112233');
await dialog(owner).getByLabel('Full name').click();
assert.equal(await dialog(owner).getByLabel('Mobile number').inputValue(), '0300-1112233');
await dialog(owner).getByLabel('Email (optional)').fill('ali@example');
await next(owner);
await dialog(owner).getByText('Email must look like name@example.com.').waitFor();
await dialog(owner).getByLabel('Email (optional)').fill('ali@example.com');
await shot(owner, '02-desktop-wizard-step1-personal');
await next(owner);
await dialog(owner).getByRole('heading', { name: 'Role & Branch' }).waitFor();
await dialog(owner).getByRole('button', { name: /^Super Waiter/ }).click();
await dialog(owner).getByRole('button', { name: 'T1', exact: true }).click();
await dialog(owner).getByRole('button', { name: 'T2', exact: true }).click();
await shot(owner, '03-desktop-wizard-step2-role');
await next(owner);
await dialog(owner).getByText('Same as the Super Waiter role').waitFor();
await dialog(owner).getByRole('img', { name: /Process Payments · Create.*Not possible for this role/ }).waitFor();
await shot(owner, '04-desktop-wizard-step3-permissions');
await dialog(owner).getByRole('button', { name: 'Save and create link' }).click();
const firstLink = await readLink(owner);
await shot(owner, '05-desktop-owner-activation-link');
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
await row(owner, 'Ali Raza').getByText(/Link sent · valid until/).waitFor();
const aliRow = await row(owner, 'Ali Raza').innerText();
assert.ok(aliRow.includes('#EMP013') && aliRow.includes('0300-1112233') && aliRow.includes('ali@example.com') && aliRow.includes('Invited'), aliRow);
assert.ok(!(await loginNames()).includes('Ali Raza'), 'not activated = not on the login list');
ok('wizard: short number and bad email refused, 03001112233 → 0300-1112233; payments locked for a Super Waiter; Ali Raza #EMP013 "Invited"; not on the login list');

console.log('2. Resend makes the old link useless');
await menu(owner, 'Ali Raza', 'Resend link');
const link = await readLink(owner);
assert.notEqual(link, firstLink);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
const oldPage = await openLoggedOut(firstLink.replace(BASE_URL, ''));
await oldPage.getByText('This link was cancelled. Ask the Owner for a new link.').waitFor();
await oldPage.close();
ok('Resend: new link; the first link now says "cancelled"');

console.log('3. Ali activates the account and creates a PIN');
const ali = await setPin(link, '123456');
await ali.getByText('This PIN is too easy to guess').waitFor();
await ali.getByLabel(/New PIN/).fill('402917');
await ali.getByLabel('Type the PIN again').fill('402918');
await ali.getByRole('button', { name: 'Save my PIN' }).click();
await ali.getByText('The two PINs are not the same.').waitFor();
await ali.getByLabel('Type the PIN again').fill('402917');
await shot(ali, '06-phone-activation-create-pin');
await ali.getByRole('button', { name: 'Save my PIN' }).click();
await ali.getByText('Your account is active').waitFor();
const reused = await openLoggedOut(link.replace(BASE_URL, ''));
await reused.getByText('This link was already used. Each link works only once.').waitFor();
await reused.close();
await row(owner, 'Ali Raza').getByText('Active', { exact: true }).waitFor({ timeout: 6_000 });
ok('weak PIN and mismatch refused; PIN accepted; the link cannot be used again; Owner sees "Active"');

console.log('4. Ali logs in, sees only T1 and T2, and sends an order');
await ali.getByRole('button', { name: 'Go to login' }).click();
await ali.getByRole('button', { name: /Ali Raza/ }).click();
await ali.locator('main h1').first().waitFor();
await ali.goto(`${BASE_URL}/tables`, { waitUntil: 'networkidle' });
await ali.getByText('T2', { exact: true }).waitFor();
assert.deepEqual((await ali.locator('main ul > li span.text-2xl').allInnerTexts()).map((s) => s.trim()), ['T1', 'T2']);
await ali.goto(`${BASE_URL}/waiter?table=${id(401)}`, { waitUntil: 'networkidle' });
await ali.getByRole('tab', { name: 'Menu' }).click();
await ali.getByRole('button', { name: /^Cold Drink/ }).first().click();
await dialog(ali).getByRole('button', { name: /^Add ·/ }).click();
await ali.getByRole('tab', { name: /^Order/ }).click();
await ali.getByRole('button', { name: 'Guests +' }).click();
await ali.getByRole('button', { name: 'Send to kitchen' }).click();
await ali.getByText(/sent to the kitchen/).first().waitFor();
await row(owner, 'Ali Raza').getByText(/^Today \d\d:\d\d$/).waitFor({ timeout: 6_000 });
ok('Ali logs in (last login "Today …" on the list), sees only T1 and T2, sends an order on T1');

console.log('5. Role Permissions: switching a screen off for a role, then back to recommended');
await owner.getByRole('tab', { name: 'Role Permissions' }).click();
await owner.getByRole('tab', { name: 'Super Waiter' }).click();
await owner.getByRole('checkbox', { name: /^Manage Tables · View/ }).click();
await shot(owner, '07-desktop-role-permissions-unsaved');
await owner.getByRole('button', { name: 'Save', exact: true }).click();
await owner.getByText('Super Waiter permissions saved').first().waitFor();
await owner.getByText('Changed by the Owner').waitFor();
await ali.goto(`${BASE_URL}/tables`, { waitUntil: 'networkidle' });
await ali.getByText('No access').first().waitFor();
ok('Super Waiter: "Manage Tables · View" switched off → Ali gets "No access" on Tables');
await owner.getByRole('button', { name: 'Use recommended' }).click();
await owner.getByRole('button', { name: 'Save', exact: true }).click();
await owner.getByText('Recommended', { exact: true }).waitFor();
await ali.goto(`${BASE_URL}/tables`, { waitUntil: 'networkidle' });
await ali.getByText('T2', { exact: true }).waitFor();
ok('"Use recommended" + Save → Ali sees Tables again');

console.log("6. One person's own permissions");
await owner.getByRole('tab', { name: /^Employees/ }).click();
await menu(owner, 'Bilal Hussain', 'Edit permissions');
await dialog(owner).getByRole('checkbox', { name: /^Apply Discounts · Approve/ }).click();
await dialog(owner).getByText('Custom for Bilal Hussain').waitFor();
await dialog(owner).getByRole('button', { name: 'Save changes' }).click();
await row(owner, 'Bilal Hussain').getByText('Custom permissions').waitFor();
ok('Bilal (Cashier) gets "Apply Discounts" for himself only → "Custom permissions" badge');

console.log('7. PIN reset, Deactivate and Reactivate');
await menu(owner, 'Ali Raza', 'Reset PIN');
await dialog(owner).getByRole('button', { name: 'Reset PIN' }).click();
const resetLink = await readLink(owner);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
await ali.reload({ waitUntil: 'networkidle' });
await ali.getByRole('heading', { name: /Log in/ }).waitFor();
const resetPage = await setPin(resetLink, '583204');
await resetPage.getByText('Your account is active').waitFor();
await resetPage.close();
ok('Reset PIN: Ali is logged out at once; a new PIN with the single-use link');
await ali.reload({ waitUntil: 'networkidle' });
await ali.getByRole('button', { name: /Ali Raza/ }).click();
await ali.locator('main h1').first().waitFor();
await menu(owner, 'Ali Raza', 'Deactivate');
await dialog(owner).getByText(/logged out everywhere at once/).waitFor();
await dialog(owner).getByRole('button', { name: 'Deactivate', exact: true }).click();
await row(owner, 'Ali Raza').getByText('Inactive', { exact: true }).waitFor();
await ali.getByRole('heading', { name: /Log in/ }).waitFor({ timeout: 6_000 });
assert.ok(!(await loginNames()).includes('Ali Raza'));
await menu(owner, 'Ali Raza', 'Reactivate');
await row(owner, 'Ali Raza').getByText('Active', { exact: true }).waitFor();
await ali.reload({ waitUntil: 'networkidle' });
await ali.getByRole('heading', { name: /Log in/ }).waitFor();
await ali.getByRole('button', { name: /Ali Raza/ }).click();
await ali.locator('main h1').first().waitFor();
ok('Deactivate: logged out at once, off the login list; Reactivate: a fresh login is needed');

console.log("8. Cancel a link, Delete (deleted / archived), the Owner's own row");
await owner.getByRole('button', { name: 'Add Staff' }).click();
await dialog(owner).getByLabel('Full name').fill('Zubair Khan');
await dialog(owner).getByLabel('Mobile number').fill('+92 300 4445566');
await next(owner);
await dialog(owner).getByRole('button', { name: /^Kitchen/ }).click();
await dialog(owner).getByRole('button', { name: 'Pizza Oven' }).click();
await next(owner);
await dialog(owner).getByRole('button', { name: 'Save and create link' }).click();
const zubairLink = await readLink(owner);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
assert.ok((await row(owner, 'Zubair Khan').innerText()).includes('0300-4445566'));
await menu(owner, 'Zubair Khan', 'Cancel link');
await dialog(owner).getByRole('button', { name: 'Cancel link' }).click();
await row(owner, 'Zubair Khan').getByText('Link cancelled').waitFor();
const cancelled = await openLoggedOut(zubairLink.replace(BASE_URL, ''));
await cancelled.getByText('This link was cancelled.', { exact: false }).waitFor();
await cancelled.close();
await menu(owner, 'Zubair Khan', 'Delete');
await dialog(owner).getByText(/can never log in again/).waitFor();
await shot(owner, '08-desktop-owner-delete-confirm');
await dialog(owner).getByRole('button', { name: 'Delete', exact: true }).click();
await owner.getByText('Zubair Khan deleted').first().waitFor();
await row(owner, 'Zubair Khan').waitFor({ state: 'detached' });
await menu(owner, 'Ali Raza', 'Delete');
await dialog(owner).getByRole('button', { name: 'Delete', exact: true }).click();
await owner.getByText('Ali Raza removed — kept only for old bills and history').first().waitFor();
await row(owner, 'Ali Raza').waitFor({ state: 'detached' });
await ali.getByRole('heading', { name: /Log in/ }).waitFor({ timeout: 6_000 });
ok('Zubair (+92 300 4445566, link cancelled, never used) deleted; Ali (sent an order) archived and logged out');
await owner.getByRole('button', { name: 'Actions for Aziz Ahmed' }).first().click();
const ownItems = await owner.getByRole('menuitem').allInnerTexts();
assert.deepEqual(ownItems.map((s) => s.trim()), ['Edit details'], 'no permissions, deactivate, delete or reset PIN on your own row');
await owner.getByRole('menuitem', { name: 'Edit details' }).click();
await next(owner);
assert.equal(await dialog(owner).getByRole('button', { name: /^Manager/ }).isDisabled(), true);
await dialog(owner).getByRole('button', { name: 'Cancel' }).click();
ok("the Owner's own row: only Edit details, and the role cannot be changed");
await owner.goto(`${BASE_URL}/tables`, { waitUntil: 'networkidle' });
await owner.locator('main ul > li').filter({ hasText: 'T1' }).first().getByText('Ali Raza').waitFor();
ok('T1 still shows "Ali Raza" on its running bill');

console.log('9. The Manager may look only');
const manager = await openAs(USER.manager, '/staff', DESKTOP);
await manager.getByText('Only the Owner can add, change, deactivate or delete staff').waitFor();
assert.equal(await manager.getByRole('button', { name: 'Add Staff' }).count(), 0);
assert.equal(await manager.getByRole('button', { name: /^Actions for/ }).count(), 0);
await manager.getByRole('tab', { name: 'Role Permissions' }).click();
await manager.getByText('Only the Owner can change permissions. You can look.').waitFor();
assert.equal(await manager.getByRole('checkbox').first().isDisabled(), true);
await shot(manager, '09-desktop-manager-read-only');
ok('Manager: list and Role Permissions read-only — no Add, actions menu or ticks');

const phone = await openAs(USER.owner, '/staff', PHONE);
await phone.locator('main li[data-staff-row="Bilal Hussain"]').waitFor();
await shot(phone, '10-phone-owner-staff-list');

await browser.close();
console.log('Staff walkthrough passed (DEMO): list, 3-step wizard, links, activation + PIN, Role Permissions, own permissions, PIN reset, Deactivate / Reactivate, Delete, Manager read-only.');

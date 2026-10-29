// Staff walkthrough (owner request 2026-10-29), DEMO frontend only: the Owner adds staff with an
// activation link, resends / cancels links, the person activates and creates a PIN, PIN reset, Disable
// ends sessions at once, Enable needs a fresh login, assigned tables apply, the Manager is read-only.
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
const USER = { owner: id(101), manager: id(102) };
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
const row = (page, name) => page.locator('main ul > li').filter({ has: page.getByText(name, { exact: true }) });
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

const setup = await openAs(USER.owner, '/staff', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

console.log('1. Owner adds a Super Waiter with an activation link');
const owner = await openAs(USER.owner, '/staff', DESKTOP);
await shot(owner, '01-desktop-owner-staff');
await owner.getByRole('button', { name: 'Add staff' }).click();
await dialog(owner).getByLabel('Full name').fill('Ali Raza');
await dialog(owner).getByLabel('Mobile').fill('0300-11122');
await dialog(owner).getByLabel('Full name').click();
await dialog(owner).getByRole('button', { name: 'Save and create link' }).click();
await dialog(owner).getByText('Enter a mobile number, for example 0300-1234567 or 03001234567.').waitFor();
// Typed without the dash: accepted and shown as 0300-1112233 once the field is left.
await dialog(owner).getByLabel('Mobile').fill('03001112233');
await dialog(owner).getByLabel('Full name').click();
assert.equal(await dialog(owner).getByLabel('Mobile').inputValue(), '0300-1112233');
await dialog(owner).getByLabel('Email (optional)').fill('ali@example');
await dialog(owner).getByRole('button', { name: /^Super Waiter/ }).click();
await dialog(owner).getByRole('button', { name: 'T1', exact: true }).click();
await dialog(owner).getByRole('button', { name: 'T2', exact: true }).click();
await dialog(owner).getByRole('button', { name: 'Save and create link' }).click();
await dialog(owner).getByText('Email must look like name@example.com.').waitFor();
await dialog(owner).getByLabel('Email (optional)').fill('ali@example.com');
await shot(owner, '02-desktop-owner-add-staff');
await dialog(owner).getByRole('button', { name: 'Save and create link' }).click();
await dialog(owner).getByText('Activation link for Ali Raza').waitFor();
const firstLink = await readLink(owner);
await shot(owner, '03-desktop-owner-activation-link');
assert.ok(!(await dialog(owner).innerText()).match(/\b\d{6}\b(?!.*token)/), 'no PIN is shown');
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
await row(owner, 'Ali Raza').getByText(/Link sent · valid until/).waitFor();
assert.ok((await row(owner, 'Ali Raza').innerText()).includes('0300-1112233 · ali@example.com'));
assert.ok(!(await loginNames()).includes('Ali Raza'), 'not activated = not on the login list');
ok('short number refused; 03001112233 accepted as 0300-1112233; wrong email refused; Ali Raza added (Super Waiter, T1 + T2); single-use link shown once; not on the login list yet');

console.log('2. Resend makes the old link useless');
await row(owner, 'Ali Raza').getByRole('button', { name: 'Resend link to Ali Raza' }).click();
const link = await readLink(owner);
assert.notEqual(link, firstLink);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
const oldPage = await openLoggedOut(firstLink.replace(BASE_URL, ''));
await oldPage.getByText('This link was cancelled. Ask the Owner for a new link.').waitFor();
await oldPage.close();
ok('Resend: new link; the first link now says "cancelled"');

console.log('3. Ali activates the account and creates a PIN');
let ali = await setPin(link, '123456');
await ali.getByText('This PIN is too easy to guess').waitFor();
await ali.getByLabel(/New PIN/).fill('402917');
await ali.getByLabel('Type the PIN again').fill('402918');
await ali.getByRole('button', { name: 'Save my PIN' }).click();
await ali.getByText('The two PINs are not the same.').waitFor();
await ali.getByLabel('Type the PIN again').fill('402917');
await shot(ali, '04-phone-activation-create-pin');
await ali.getByRole('button', { name: 'Save my PIN' }).click();
await ali.getByText('Your account is active').waitFor();
await shot(ali, '05-phone-activation-done');
const reused = await openLoggedOut(link.replace(BASE_URL, ''));
await reused.getByText('This link was already used. Each link works only once.').waitFor();
await reused.close();
await row(owner, 'Ali Raza').getByText('Activated').waitFor({ timeout: 6_000 });
ok('weak PIN and mismatch refused; PIN accepted; the same link cannot be used again; Owner sees "Activated"');

console.log('4. Ali logs in and sees only the assigned tables');
await ali.getByRole('button', { name: 'Go to login' }).click();
await ali.getByRole('button', { name: /Ali Raza/ }).click();
await ali.locator('main h1').first().waitFor();
await ali.goto(`${BASE_URL}/tables`, { waitUntil: 'networkidle' });
await ali.getByText('T2', { exact: true }).waitFor();
const tableNames = (await ali.locator('main ul > li span.text-2xl').allInnerTexts()).map((s) => s.trim());
assert.deepEqual(tableNames, ['T1', 'T2']);
await shot(ali, '06-phone-ali-assigned-tables');
await ali.goto(`${BASE_URL}/waiter?table=${id(401)}`, { waitUntil: 'networkidle' });
await ali.getByRole('tab', { name: 'Menu' }).click();
await ali.getByRole('button', { name: /^Cold Drink/ }).first().click();
await dialog(ali).getByRole('button', { name: /^Add ·/ }).click();
await ali.getByRole('tab', { name: /^Order/ }).click();
await ali.getByRole('button', { name: 'Guests +' }).click();
await ali.getByRole('button', { name: 'Send to kitchen' }).click();
await ali.getByText(/sent to the kitchen/).first().waitFor();
ok('Ali (Super Waiter) logs in, sees only T1 and T2, and sends an order on T1');

console.log('5. PIN reset ends Ali\'s sessions; a new PIN with the reset link');
await row(owner, 'Ali Raza').getByRole('button', { name: 'Reset the PIN of Ali Raza' }).click();
await dialog(owner).getByRole('button', { name: 'Reset PIN' }).click();
await dialog(owner).getByText('PIN reset link for Ali Raza').waitFor();
const resetLink = await readLink(owner);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
await ali.reload({ waitUntil: 'networkidle' });
await ali.getByRole('heading', { name: /Log in/ }).waitFor();
assert.ok(!(await loginNames()).includes('Ali Raza'));
const resetPage = await setPin(resetLink, '583204');
await resetPage.getByText('Your account is active').waitFor();
await resetPage.close();
ok('Reset PIN: Ali is logged out at once and cannot log in until the new PIN is set with the single-use link');

console.log('6. Disable ends every session; Enable needs a fresh login');
await ali.reload({ waitUntil: 'networkidle' });
await ali.getByRole('button', { name: /Ali Raza/ }).click();
await ali.locator('main h1').first().waitFor();
await row(owner, 'Ali Raza').getByRole('button', { name: 'Disable Ali Raza' }).click();
await dialog(owner).getByText(/logged out everywhere at once/).waitFor();
await shot(owner, '07-desktop-owner-disable-confirm');
await dialog(owner).getByRole('button', { name: 'Disable', exact: true }).click();
await row(owner, 'Ali Raza').getByText('Disabled', { exact: true }).waitFor();
await ali.getByRole('heading', { name: /Log in/ }).waitFor({ timeout: 6_000 });
assert.ok(!(await loginNames()).includes('Ali Raza'));
ok('Disable: Ali\'s open tab is logged out at once (DEMO sync) and Ali is off the login list');
await row(owner, 'Ali Raza').getByRole('button', { name: 'Enable Ali Raza' }).click();
await row(owner, 'Ali Raza').getByText('Active', { exact: true }).waitFor();
await ali.reload({ waitUntil: 'networkidle' });
await ali.getByRole('heading', { name: /Log in/ }).waitFor();
await ali.getByRole('button', { name: /Ali Raza/ }).click();
await ali.locator('main h1').first().waitFor();
ok('Enable: the old session stays ended; Ali logs in again');

console.log('7. Cancel a pending link; the Manager is read-only');
await owner.getByRole('button', { name: 'Add staff' }).click();
await dialog(owner).getByLabel('Full name').fill('Zubair Khan');
await dialog(owner).getByLabel('Mobile').fill('+92 300 4445566');
await dialog(owner).getByRole('button', { name: /^Kitchen/ }).click();
await dialog(owner).getByRole('button', { name: 'Pizza Oven' }).click();
await dialog(owner).getByRole('button', { name: 'Save and create link' }).click();
const zubairLink = await readLink(owner);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
assert.ok((await row(owner, 'Zubair Khan').innerText()).includes('0300-4445566'), '+92 number saved as 0300-4445566');
await row(owner, 'Zubair Khan').getByRole('button', { name: 'Cancel the link of Zubair Khan' }).click();
await dialog(owner).getByRole('button', { name: 'Cancel link' }).click();
await row(owner, 'Zubair Khan').getByText('Link cancelled').waitFor();
const cancelled = await openLoggedOut(zubairLink.replace(BASE_URL, ''));
await cancelled.getByText('This link was cancelled.', { exact: false }).waitFor();
await cancelled.close();
await shot(owner, '08-desktop-owner-staff-statuses');
ok('Zubair Khan (+92 300 4445566 → 0300-4445566, Kitchen, Pizza Oven): link cancelled by the Owner, the link page refuses it');
const ownRow = owner.locator('main ul > li').filter({ hasText: 'Aziz Ahmed' });
await ownRow.getByRole('button', { name: 'Edit Aziz Ahmed' }).click();
assert.equal(await dialog(owner).getByRole('button', { name: /^Manager/ }).isDisabled(), true);
await dialog(owner).getByRole('button', { name: 'Close' }).last().click();
assert.equal(await ownRow.getByRole('button', { name: /^Disable/ }).count(), 0);
assert.equal(await ownRow.getByRole('button', { name: /^Reset the PIN/ }).count(), 0);
assert.equal(await ownRow.getByRole('button', { name: /^Delete/ }).count(), 0);
ok('the Owner cannot change his own role, disable, delete himself or reset his own PIN (the last Owner is also protected by the shared rules)');
console.log('8. Delete — never used = deleted; with an order = archived (name kept on old bills)');
await row(owner, 'Zubair Khan').getByRole('button', { name: 'Delete Zubair Khan' }).click();
await dialog(owner).getByText(/can never log in again/).waitFor();
await shot(owner, '10-desktop-owner-delete-confirm');
await dialog(owner).getByRole('button', { name: 'Delete', exact: true }).click();
await owner.getByText('Zubair Khan deleted').first().waitFor();
await row(owner, 'Zubair Khan').waitFor({ state: 'detached' });
await row(owner, 'Ali Raza').getByRole('button', { name: 'Delete Ali Raza' }).click();
await dialog(owner).getByRole('button', { name: 'Delete', exact: true }).click();
await owner.getByText('Ali Raza removed — kept only for old bills and history').first().waitFor();
await row(owner, 'Ali Raza').waitFor({ state: 'detached' });
await ali.getByRole('heading', { name: /Log in/ }).waitFor({ timeout: 6_000 });
assert.ok(!(await loginNames()).includes('Ali Raza'));
await owner.goto(`${BASE_URL}/tables`, { waitUntil: 'networkidle' });
await owner.locator('main ul > li').filter({ hasText: 'T1' }).first().getByText('Ali Raza').waitFor();
ok('Zubair (never used) deleted; Ali (sent an order) archived: logged out, off the list and the login, T1 still shows "Ali Raza"');
await owner.goto(`${BASE_URL}/staff`, { waitUntil: 'networkidle' });
const manager = await openAs(USER.manager, '/staff', DESKTOP);
await manager.getByText('Only the Owner can add, change, enable or disable staff.').waitFor();
assert.equal(await manager.getByRole('button', { name: 'Add staff' }).count(), 0);
assert.equal(await manager.getByRole('button', { name: /^Edit / }).count(), 0);
assert.equal(await manager.getByRole('button', { name: /^Disable / }).count(), 0);
assert.equal(await manager.getByRole('button', { name: /^Delete / }).count(), 0);
await shot(manager, '09-desktop-manager-staff-read-only');
ok('Manager: list only — no Add, Edit, Disable, Delete, links or PIN reset');

await browser.close();
console.log('Staff walkthrough passed (DEMO): invitation links, activation + PIN rules, resend / cancel, PIN reset, Disable / Enable sessions, assigned tables, Manager read-only.');

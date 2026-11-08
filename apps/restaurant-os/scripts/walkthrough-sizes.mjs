// Mixed sizes on one line (owner, 2026-11-07), on his own demo, Lala Restaurant: a customer asks for "dedh kg" Chicken Karahi.
// The cashier taps 1 kg AND ½ kg in the same box: one bill line "1.5 kg: 1 kg + ½ kg" for Rs. 2,600 + Rs. 1,400 = Rs. 4,000, and the
// kitchen gets that one line (one pot), not two. Tapping a size again takes it out; one size stays a plain line as before.
// The waiter does the same on the phone: 2 × 1 kg + ½ kg + Pao Mutton Karahi = one "2.75 kg" line, Rs. 13,400.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:sizes
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'sizes');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), cashier: id(103), superWaiter: id(104) };
const TABLE = (n) => id(400 + n);
const PHONE = { width: 390, height: 844 };
const TABLET = { width: 1024, height: 768 };
const LAPTOP = { width: 1278, height: 627 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
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
const bill = (page) => page.locator('main [data-pos-bill]');
const size = (dialog, name) => dialog.getByRole('button', { name: new RegExp(`^${name}`) });
const addButton = (dialog) => dialog.getByRole('button', { name: /^(Add|Save) ·/ });

try {
  console.log('\n1. Cashier: dedh kg Chicken Karahi = 1 kg + ½ kg, one line');
  const cashier = await openAs(USER.cashier, '/pos', LAPTOP);
  await cashier.getByRole('button', { name: /^Chicken Karahi/ }).first().click();
  const dialog = cashier.getByRole('dialog');
  await size(dialog, '1 kg').click();
  assert.equal(await addButton(dialog).innerText(), 'Add · Rs. 2,600');
  await size(dialog, '½ kg').click();
  assert.equal(await size(dialog, '1 kg').getAttribute('aria-pressed'), 'true', '1 kg stays chosen');
  assert.equal(await size(dialog, '½ kg').getAttribute('aria-pressed'), 'true');
  await dialog.getByText('One line for the kitchen: 1.5 kg: 1 kg + ½ kg').waitFor();
  assert.equal(await addButton(dialog).innerText(), 'Add · Rs. 4,000');
  await shot(cashier, '01-laptop-pos-1kg-plus-half');
  await size(dialog, '½ kg').click();
  assert.equal(await addButton(dialog).innerText(), 'Add · Rs. 2,600', 'tapping ½ kg again takes it out');
  await size(dialog, '½ kg').click();
  await addButton(dialog).click();
  const line = bill(cashier).getByText('1.5 kg: 1 kg + ½ kg');
  await line.first().waitFor();
  assert.equal(await line.count(), 1, 'one line, not two');
  await bill(cashier).getByText('Rs. 4,000').first().waitFor();
  await shot(cashier, '02-laptop-pos-one-line');
  ok('1 kg + ½ kg → one line "Chicken Karahi · 1.5 kg: 1 kg + ½ kg" Rs. 4,000; tapping a size again takes it out');

  await bill(cashier).getByRole('button', { name: 'Send to kitchen' }).click();
  await cashier.getByText(/Order #\d+/).first().waitFor();
  await bill(cashier).getByText('(1.5 kg: 1 kg + ½ kg)', { exact: false }).first().waitFor();
  const kitchen = await openAs(USER.owner, '/kitchen', TABLET);
  // Kitchen card (owner's KDS picture, 2026-11-08): name, the size chip "1.5 kg: 1 kg + ½ kg", then "×1"
  await kitchen.locator('main [data-kds-line="Chicken Karahi"]').getByText('1.5 kg: 1 kg + ½ kg', { exact: true }).first().waitFor({ timeout: 6_000 });
  assert.equal(await kitchen.locator('main [data-kds-line="Chicken Karahi"]').count(), 1, 'the kitchen gets one karahi line');
  await kitchen.locator('main [data-kds-line="Chicken Karahi"]', { hasText: '×1' }).waitFor();
  await shot(kitchen, '03-tablet-kitchen-one-pot');
  ok('sent: the kitchen ticket says "Chicken Karahi [1.5 kg: 1 kg + ½ kg] ×1", one pot');

  console.log('\n2. Waiter phone: 2 × 1 kg + ½ kg + Pao Mutton Karahi');
  const waiter = await openAs(USER.superWaiter, `/waiter?table=${TABLE(2)}`, PHONE);
  await waiter.getByRole('tab', { name: 'Menu' }).click();
  await waiter.getByRole('button', { name: /^Mutton Karahi/ }).first().click();
  const box = waiter.getByRole('dialog');
  for (const name of ['1 kg', '½ kg', 'Pao']) await size(box, name).click();
  await box.getByRole('button', { name: 'Quantity · 1 kg +' }).click();
  await box.getByText('One line for the kitchen: 2.75 kg: 2 × 1 kg + ½ kg + Pao').waitFor();
  assert.equal(await addButton(box).innerText(), 'Add · Rs. 13,400');
  await shot(waiter, '04-phone-waiter-three-sizes');
  await addButton(box).click();
  await waiter.getByRole('tab', { name: /^Order/ }).click();
  await waiter.getByText('2.75 kg: 2 × 1 kg + ½ kg + Pao').first().waitFor();
  if ((await waiter.getByRole('group', { name: 'Guests' }).getByText('0', { exact: true }).count()) > 0) await waiter.getByRole('button', { name: 'Guests +' }).click();
  await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await waiter.getByText(/sent to the kitchen/).last().waitFor();
  await shot(waiter, '05-phone-waiter-sent');
  await kitchen.locator('main [data-kds-line="Mutton Karahi"]').getByText('2.75 kg: 2 × 1 kg + ½ kg + Pao', { exact: true }).first().waitFor({ timeout: 6_000 });
  ok('waiter: 4800 × 2 + 2500 + 1300 = Rs. 13,400, one "2.75 kg" line, sent; the kitchen sees it');

  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`);
  console.log('\nAll mixed-size checks passed.');
} finally {
  await browser.close();
}

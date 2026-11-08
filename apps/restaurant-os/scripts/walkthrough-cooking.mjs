// I3 Cooking Batch, cooked stock and the stock check before cooking (owner's briefs, 2026-11-09), on his Lala demo data.
// 5 kg daal mash bought → raw stock +5 kg. Cook 5 kg by the verified recipe (1 kg → 3 kg cooked): the recipe × 5 leaves the raw
// stock once, 50 plates (12.5 kg) were actually made and come into cooked stock, with the cost a plate. A double tap saves one
// batch; a batch that is short is refused; a batch is corrected and another reversed. Tomorrow's plan (20 kg daal) is short:
// the 8 pm check tells the Owner (not the Cashier), the draft bills are made, the bill is saved and the plan is fine again.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:cooking
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'cooking');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), cashier: id(103) };
const ING = (n) => id(1300 + n);
const DAAL = ING(45);
const OIL = ING(12);
const COOKED_DAAL = ING(84);
const KIRYANA = 'Madina Kiryana Store — DEMO';
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function openAs(userId, url, viewport, clockAt) {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  if (clockAt) await page.clock.install({ time: clockAt });
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
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const onHand = (data, ingredientId) => data.inventory.movements.filter((m) => m.ingredientId === ingredientId).reduce((sum, m) => sum + m.quantityMilli, 0);
const kg = (milli) => milli / 1_000_000;
const card = (page, name) => page.locator(`main [data-prepared-item="${name}"]`);
const cookBox = (page) => page.getByRole('dialog', { name: 'Cook Cooked Daal Mash' });
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
async function openPrepared(page) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await page.locator('main [data-recipe-summary]').first().waitFor();
  await page.getByRole('tab', { name: 'Prepared items' }).click();
  await card(page, 'Naan dough').waitFor();
}
async function openPlan(page) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Stock', exact: true }).click();
  await page.getByRole('tab', { name: 'Cooking Plan' }).click();
  await page.locator('main [data-cooking-plan]').waitFor();
}
/** Karachi's calendar date of a moment */
const karachiDate = (at) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

try {
  console.log('\n1. Supplier purchase → raw stock: 5 kg daal mash');
  const owner = await openAs(USER.owner, '/inventory', DESKTOP);
  // A fresh browser: nothing saved yet, the sample stock of daal mash is 8 kg (lala-seed.ts)
  let data = await saved(owner);
  const daalBefore = data ? onHand(data, DAAL) : 8_000_000;
  await owner.locator(`main [data-supplier-card="${KIRYANA}"]`).click();
  await owner.locator('main [data-supplier-workspace]').getByRole('button', { name: 'New Purchase (Bill)' }).click();
  const bill = owner.locator('main [data-purchase-bill]');
  await bill.getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill('daal mash');
  await bill.getByRole('button', { name: 'Add Daal mash to the bill' }).click();
  await bill.locator('[data-bill-line="Daal mash"][data-bill-unit="main"]').getByRole('textbox', { name: 'Quantity of Daal mash received' }).fill('5');
  await bill.getByRole('button', { name: 'Save Purchase' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  data = await saved(owner);
  assert.equal(kg(onHand(data, DAAL) - daalBefore), 5);
  ok(`raw daal mash ${kg(daalBefore)} kg + 5 kg = ${kg(onHand(data, DAAL))} kg (only when the bill is saved)`);

  console.log('\n2. Cook 5 kg daal mash: the recipe × 5 out once, 50 plates in, cost a plate');
  await openPrepared(owner);
  const daalCard = card(owner, 'Cooked Daal Mash');
  assert.match(await daalCard.locator('[data-cooked-stock]').innerText(), /^0 g ≈ 0 plates$|^0 kg ≈ 0 plates$/);
  await daalCard.getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  const box = cookBox(owner);
  await box.getByLabel('Raw Daal mash used').fill('5');
  await box.locator('[data-cook-expected]').getByText('15 kg ≈ 60 plates').waitFor();
  await box.locator('[data-cook-line="Daal mash"]').getByText('5 kg').first().waitFor();
  await box.locator('[data-cook-line="Cooking oil"]').getByText('750 ml').waitFor();
  await box.getByLabel('Actually made').fill('50');
  const perPlate = await box.locator('[data-cost-per-plate]').innerText();
  await shot(owner, '01-desktop-cook-5-kg');
  const before = await saved(owner);
  await box.getByRole('button', { name: 'Record cooking' }).click();
  await box.waitFor({ state: 'detached' });
  await daalCard.locator('[data-cooked-stock]').getByText('12.5 kg ≈ 50 plates').waitFor();
  data = await saved(owner);
  const batch = data.inventory.cookingBatches.at(-1);
  assert.equal(kg(onHand(before, DAAL) - onHand(data, DAAL)), 5, 'raw daal −5 kg');
  assert.equal(onHand(before, OIL) - onHand(data, OIL), 750_000, 'oil −750 ml (150 ml × 5)');
  assert.equal(kg(onHand(data, COOKED_DAAL)), 12.5, 'cooked stock +12.5 kg (50 plates), not the 15 kg expected');
  assert.deepEqual([batch.expectedMilli, batch.actualMilli, batch.plateMilli, batch.recipeVersion, batch.status], [15_000_000, 12_500_000, 250_000, 1, 'DONE']);
  const movements = data.inventory.movements.filter((m) => m.batchId === batch.id);
  assert.equal(movements.filter((m) => m.type === 'COOKED').length, 1);
  assert.equal(movements.filter((m) => m.type === 'COOK_USE').length, batch.uses.length);
  const plateCost = Math.round((batch.cost * 250_000) / 12_500_000);
  assert.equal(perPlate, `Rs. ${(plateCost / 100).toLocaleString('en-PK', { minimumFractionDigits: plateCost % 100 ? 2 : 0, maximumFractionDigits: 2 })}`, `cost a plate = batch cost ÷ 50: ${perPlate}`);
  await shot(owner, '02-desktop-cooked-stock-on-card');
  ok(`raw daal −5 kg, oil −750 ml; cooked +12.5 kg ≈ 50 plates (expected 15 kg); batch cost Rs. ${batch.cost / 100}, ${perPlate} a plate`);

  console.log('\n3. A double tap records one batch; a batch that is short is refused');
  await daalCard.getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  await cookBox(owner).getByLabel('Raw Daal mash used').fill('1');
  await cookBox(owner).getByLabel('Actually made').fill('10');
  const batchesBefore = (await saved(owner)).inventory.cookingBatches.length;
  await cookBox(owner).getByRole('button', { name: 'Record cooking' }).dblclick();
  await cookBox(owner).waitFor({ state: 'detached' });
  data = await saved(owner);
  assert.equal(data.inventory.cookingBatches.length, batchesBefore + 1, 'one batch');
  await daalCard.getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  await cookBox(owner).getByLabel('Raw Daal mash used').fill('20');
  await cookBox(owner).getByText('Not enough in stock. Receive a purchase bill').waitFor();
  assert.equal(await cookBox(owner).getByRole('button', { name: 'Record cooking' }).isDisabled(), true);
  await cookBox(owner).locator('[data-cook-line="Daal mash"]').getByText(/kg/).last().waitFor();
  await shot(owner, '03-desktop-cook-short');
  await cookBox(owner).getByRole('button', { name: 'Cancel' }).click();
  ok('double tap = one batch; 20 kg needs more daal than in stock: refused, the short line in red');

  console.log('\n4. Correct one batch, reverse another (nothing deleted)');
  await daalCard.locator('[data-batches-toggle]').click();
  const rowsOf = () => daalCard.locator('[data-batch-list] [data-batch]');
  await rowsOf().first().getByRole('button', { name: 'Reverse' }).click();
  await owner.getByRole('dialog').getByLabel('Reason').fill('Recorded twice');
  await owner.getByRole('dialog').getByRole('button', { name: 'Reverse' }).click();
  await daalCard.locator('[data-batch-list] [data-batch="REVERSED"]').waitFor();
  await rowsOf().filter({ has: owner.locator('[data-batch="DONE"]') }).first();
  await daalCard.locator('[data-batch-list] [data-batch="DONE"]').getByRole('button', { name: 'Correct' }).click();
  await owner.getByRole('dialog').getByLabel('Actually made').fill('13');
  await owner.getByRole('dialog').getByLabel('Reason').fill('Weighed again');
  await owner.getByRole('dialog').getByRole('button', { name: 'Correct' }).click();
  await daalCard.locator('[data-cooked-stock]').getByText('13 kg ≈ 52 plates').waitFor();
  data = await saved(owner);
  assert.equal(kg(onHand(data, DAAL)), kg(onHand(before, DAAL)) - 5, 'the reversed 1 kg is back in raw stock');
  assert.equal(data.inventory.cookingBatches.length, batchesBefore + 1, 'nothing deleted');
  ok('the 1 kg batch reversed (raw daal back, cooked out); the 5 kg batch corrected 12.5 → 13 kg; both kept with their reason');

  console.log('\n5. Stock Movements and the Stock list show the cooking');
  await owner.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await owner.getByRole('tab', { name: 'Stock', exact: true }).click();
  await owner.getByRole('button', { name: /^Cooked food/ }).click();
  await owner.locator('main').getByText('Cooked Daal Mash').first().waitFor();
  await owner.getByRole('tab', { name: 'Stock Movements' }).click();
  // The list rows, not the options of the type filter
  await owner.locator('main').getByText(/Used for cooking — Cooked Cooked Daal Mash/).first().waitFor();
  await owner.locator('main').getByText(/Cooked \(batch\) — Cooked Cooked Daal Mash/).first().waitFor();
  await shot(owner, '04-desktop-stock-movements');
  ok('Stock → Cooked food lists Cooked Daal Mash; Stock Movements: "Used for cooking" and "Cooked (batch)"');

  console.log('\n6. Tomorrow\'s plan: 20 kg daal mash is short; the 8 pm check tells the Owner, not the Cashier');
  await openPlan(owner);
  await owner.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await owner.getByLabel('+ Add a dish').selectOption({ label: 'Cooked Daal Mash' });
  await owner.getByLabel('Amount of Cooked Daal Mash').fill('20');
  await owner.getByRole('button', { name: /^Save for / }).click();
  const daalNeed = owner.locator('main [data-plan-need="Daal mash"]');
  await daalNeed.locator('[data-short="yes"]').waitFor();
  const coriander = owner.locator('main [data-plan-need="Coriander leaves"]');
  await coriander.getByText('Low stock').waitFor();
  await coriander.getByText('Short for the plan').waitFor();
  await shot(owner, '05-desktop-plan-tomorrow-short');
  const today = karachiDate(new Date());
  const alertOwner = await openAs(USER.owner, '/inventory', DESKTOP, new Date(`${today}T19:59:40+05:00`));
  const alertCashier = await openAs(USER.cashier, '/pos', DESKTOP, new Date(`${today}T19:59:40+05:00`));
  await alertOwner.clock.fastForward('01:00');
  await alertCashier.clock.fastForward('01:00');
  // The message pops up during the fast-forwarded minute and closes again; the bell keeps it
  await alertOwner.getByRole('button', { name: 'Notifications (1)' }).click();
  await alertOwner.getByText(/Tomorrow's cooking: \d+ ingredients short \(20:00 check\)/).first().waitFor({ timeout: 10_000 });
  await alertOwner.waitForTimeout(500);
  await shot(alertOwner, '06-desktop-8pm-alert');
  await alertCashier.getByRole('button', { name: 'Notifications (0)' }).waitFor();
  assert.equal(await alertCashier.getByText(/Tomorrow's cooking/).count(), 0, 'the Cashier is not told');
  ok('daal mash short (and coriander: short AND low stock, two badges); at 20:00 the Owner gets "Tomorrow\'s cooking: n ingredients short"; the Cashier does not');

  console.log('\n7. Purchase bills for what is short: drafts first (no stock), saved → the plan is fine again');
  const daalStock = onHand(await saved(owner), DAAL);
  await owner.getByRole('button', { name: 'Make purchase bills for what is short' }).click();
  await owner.locator('main [data-draft-bills]').waitFor();
  assert.equal(onHand(await saved(owner), DAAL), daalStock, 'a draft bill does not change stock');
  await owner.getByRole('button', { name: new RegExp(`^Open bill: ${KIRYANA}`) }).click();
  const draftBill = owner.locator('main [data-purchase-bill]');
  await draftBill.locator('[data-bill-line="Daal mash"]').waitFor();
  await shot(owner, '07-desktop-draft-bill-from-plan');
  await draftBill.getByRole('button', { name: 'Save Purchase' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  assert.ok(onHand(await saved(owner), DAAL) > daalStock, 'stock up once the bill is saved');
  await openPlan(owner);
  await owner.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await owner.locator('main [data-plan-need="Daal mash"] [data-short="no"]').waitFor();
  ok('drafts for the short items (stock unchanged); the kiryana bill saved → daal mash no longer short for tomorrow');

  console.log('\n8. Settings: the check times; phone');
  await owner.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });
  await owner.getByRole('button', { name: /Notifications & Alerts/ }).first().click();
  const checks = owner.locator('main [data-cooking-checks]');
  await checks.getByLabel('Check time 1').fill('21:00');
  await checks.getByRole('button', { name: 'Save times' }).click();
  await owner.getByText('Stock check times saved').first().waitFor();
  await openPlan(owner);
  await owner.locator('main').getByText(/21:00 for tomorrow/).waitFor();
  const phone = await openAs(USER.owner, '/inventory', PHONE);
  await openPlan(phone);
  assert.ok(await noSideways(phone), 'phone: no sideways scroll');
  await shot(phone, '08-phone-cooking-plan');
  await openPrepared(phone);
  await card(phone, 'Cooked Daal Mash').getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  await cookBox(phone).waitFor();
  assert.ok(await noSideways(phone), 'phone Cook box: no sideways scroll');
  await shot(phone, '09-phone-cook');
  ok('check time 20:00 → 21:00 saved and shown on the plan; phone plan and Cook box without sideways scroll');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nCooking walkthrough passed.');
} catch (err) {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}

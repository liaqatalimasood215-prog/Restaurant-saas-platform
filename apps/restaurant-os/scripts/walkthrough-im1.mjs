// IM1 "Stabilise" (owner's Inventory audit, 2026-11-10), on his Lala demo data.
// The texts say what really happens; a purchase keeps what it cost on its stock movement; a cooked dish that is not linked to its
// menu product cannot be cooked (the raw stock would be taken twice) until it is linked; a plan row is done by quantity (2 of 5 kg
// leaves 3 kg); the same message never stacks; stock received after a passed expiry date can be cooked with; and after midnight
// "Today" on the Cooking Plan is still the business day.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:im1
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'im1');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = id(101);
const ING = (n) => id(1300 + n);
const DAAL = ING(45);
const COOKED_DAAL = ING(84);
const CHICKEN_KARAHI = id(710);
const DAAL_MASH_ITEM = id(716);
const KIRYANA = 'Madina Kiryana Store — DEMO';
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
const errors = [];

async function openAs(userId, url, viewport, clockAt, ready = 'main h1') {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  if (clockAt) await page.clock.install({ time: clockAt });
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, userId]);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.locator(ready).first().waitFor();
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
const planRow = (page) => page.locator('main [data-plan-row="Cooked Daal Mash"]');
const daalNeed = (page) => page.locator('main [data-plan-need="Daal mash"]');
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const karachiDate = (at) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
const dayAfter = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
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

try {
  console.log('\n1. The texts say what really happens (B4, B5)');
  const owner = await openAs(OWNER, '/inventory', DESKTOP);
  await owner.locator(`main [data-supplier-card="${KIRYANA}"]`).click();
  const workspace = owner.locator('main [data-supplier-workspace]');
  await workspace.getByText('Tap a product to put it on a new bill. Stock and his khata change only when the bill is saved.').waitFor();
  assert.equal(await workspace.getByText(/tap Receive/).count(), 0, 'no "tap Receive": there is no Receive button');
  await shot(owner, '01-desktop-supplier-products-text');
  // The Recipe Builder takes the whole screen: no page title
  const builder = await openAs(OWNER, `/inventory?recipe=${CHICKEN_KARAHI}`, DESKTOP, undefined, 'main button:has-text("Verify Recipe")');
  await builder.getByText("Only verified recipes take stock, at the kitchen's Ready.").first().waitFor();
  await builder.getByText('A sold ½ kg takes the ½ kg recipe from stock when the kitchen marks it Ready (verified recipes only).').waitFor();
  const builderText = await builder.locator('main').innerText();
  assert.doesNotMatch(builderText, /Step G|Nothing is taken from stock yet|Stock is not used yet/, 'the old "stock is not used yet" texts are gone');
  await shot(builder, '02-desktop-recipe-builder-text');
  await builder.close();
  ok('supplier: "Tap a product to put it on a new bill"; Recipe Builder: stock is taken at the kitchen\'s Ready, no "Step G"');

  console.log('\n2. A purchase keeps what it cost on its stock movement (B10), through the one posting');
  let data = await saved(owner);
  const daalBefore = data ? onHand(data, DAAL) : 8_000_000;
  await workspace.getByRole('button', { name: 'New Purchase (Bill)' }).click();
  const bill = owner.locator('main [data-purchase-bill]');
  await bill.getByRole('searchbox', { name: 'Search product (e.g. Atta, Sugar, Oil …)' }).fill('daal mash');
  await bill.getByRole('button', { name: 'Add Daal mash to the bill' }).click();
  await bill.locator('[data-bill-line="Daal mash"][data-bill-unit="main"]').getByRole('textbox', { name: 'Quantity of Daal mash received' }).fill('5');
  await bill.getByRole('button', { name: 'Save Purchase' }).click();
  await owner.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  data = await saved(owner);
  const entry = data.inventory.khata.at(-1);
  const bought = data.inventory.movements.filter((m) => m.khataEntryId === entry.id);
  assert.equal(kg(onHand(data, DAAL) - daalBefore), 5);
  assert.deepEqual([bought.length, bought[0].type, bought[0].cost, bought[0].supplierId], [1, 'PURCHASE', entry.amount, entry.supplierId], 'one movement, its cost = the bill');
  ok(`raw daal mash +5 kg; the PURCHASE movement keeps Rs. ${entry.amount / 100} (the bill), its supplier and its khata entry`);

  console.log('\n3. Cooked Daal Mash is not linked to "Daal Mash" on the POS: Cook is refused, then linked (B1)');
  await openPrepared(owner);
  const daalCard = card(owner, 'Cooked Daal Mash');
  await daalCard.getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  await cookBox(owner).locator('[data-raw-twice]').getByText('Daal Mash on the POS still takes its raw ingredients by its own recipe.', { exact: false }).waitFor();
  assert.equal(await cookBox(owner).getByRole('button', { name: 'Record cooking' }).isDisabled(), true, 'no batch while a sale would take the raw stock again');
  await shot(owner, '03-desktop-cook-refused-not-linked');
  await cookBox(owner).getByRole('button', { name: 'Cancel' }).click();
  assert.equal(((await saved(owner)).inventory.cookingBatches ?? []).length, 0);
  await daalCard.getByRole('button', { name: 'Sell Cooked Daal Mash on POS' }).click();
  const link = owner.getByRole('dialog', { name: 'Sell Cooked Daal Mash on POS' });
  assert.equal(await link.getByRole('radio', { name: /Link to Daal Mash \(Sabzi & Daal\)/ }).isChecked(), true);
  await link.getByRole('button', { name: 'Link and save' }).click();
  await link.waitFor({ state: 'detached' });
  await daalCard.locator('[data-on-pos]').getByText('Daal Mash').waitFor();
  data = await saved(owner);
  assert.equal(data.items.find((i) => i.id === DAAL_MASH_ITEM).preparedItemId, COOKED_DAAL);
  await daalCard.getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  await cookBox(owner).getByLabel('Raw Daal mash used').waitFor();
  assert.equal(await cookBox(owner).locator('[data-raw-twice]').count(), 0, 'linked: the warning is gone');
  await cookBox(owner).getByRole('button', { name: 'Cancel' }).click();
  ok('not linked: red message, Record cooking disabled, no batch; after "Link and save" a sale takes the cooked dish and Cook is open');

  console.log('\n4. A plan row is done by quantity: 5 kg planned, 2 kg cooked → 3 kg left (B6)');
  await openPlan(owner);
  await owner.getByRole('button', { name: 'Today', exact: true }).click();
  await owner.getByLabel('+ Add a dish').selectOption({ label: 'Cooked Daal Mash' });
  await owner.getByLabel('Amount of Cooked Daal Mash').fill('5');
  await owner.getByRole('button', { name: /^Save for / }).click();
  await daalNeed(owner).getByText('5 kg', { exact: true }).waitFor();
  const before = await saved(owner);
  await planRow(owner).getByRole('button', { name: 'Cook now' }).click();
  assert.equal(await cookBox(owner).getByLabel('Raw Daal mash used').inputValue(), '5', 'the plan\'s amount');
  await cookBox(owner).getByLabel('Raw Daal mash used').fill('2');
  await cookBox(owner).getByLabel('Actually made').fill('20');
  await cookBox(owner).getByRole('button', { name: 'Record cooking' }).click();
  await cookBox(owner).waitFor({ state: 'detached' });
  await planRow(owner).locator('[data-plan-partly]').getByText('Cooked 2 kg of 5 kg').waitFor();
  await daalNeed(owner).getByText('3 kg', { exact: true }).waitFor();
  await shot(owner, '04-desktop-plan-2-of-5-kg');
  await planRow(owner).getByRole('button', { name: 'Cook now' }).click();
  assert.equal(await cookBox(owner).getByLabel('Raw Daal mash used').inputValue(), '3', 'Cook now offers what is left');
  await cookBox(owner).getByLabel('Actually made').fill('30');
  await cookBox(owner).getByRole('button', { name: 'Record cooking' }).click();
  await cookBox(owner).waitFor({ state: 'detached' });
  await planRow(owner).getByText('Cooked', { exact: true }).waitFor();
  assert.equal(await planRow(owner).getByRole('button', { name: 'Cook now' }).count(), 0);
  assert.equal(await daalNeed(owner).count(), 0, 'nothing left to cook: nothing needed');
  data = await saved(owner);
  const batches = data.inventory.cookingBatches;
  assert.deepEqual(batches.map((b) => [b.amountMilli, b.status]), [[2_000_000, 'DONE'], [3_000_000, 'DONE']]);
  assert.equal(kg(onHand(before, DAAL) - onHand(data, DAAL)), 5, 'raw daal −5 kg in all, once');
  assert.equal(kg(onHand(data, COOKED_DAAL)), 12.5, 'cooked +12.5 kg (50 plates)');
  for (const batch of batches) {
    const moves = data.inventory.movements.filter((m) => m.batchId === batch.id);
    assert.ok(moves.filter((m) => m.type === 'COOK_USE').every((m) => typeof m.cost === 'number' && m.cost > 0), 'each raw ingredient keeps its cost');
    assert.equal(moves.find((m) => m.type === 'COOKED').cost, batch.cost, 'the cooked food carries the batch cost');
  }
  ok('2 kg cooked: "Cooked 2 kg of 5 kg", 3 kg daal still needed; Cook now offers 3 kg; then Cooked. Raw −5 kg once; costs kept on the movements');

  console.log('\n5. The same message does not stack (B9)');
  const save = owner.getByRole('button', { name: /^Save for / });
  await save.click();
  await save.click();
  await owner.waitForTimeout(300);
  assert.equal(await owner.getByRole('status').filter({ hasText: 'Cooking plan saved' }).count(), 1, 'one "Cooking plan saved"');
  ok('two saves in a row: one "Cooking plan saved" on screen');

  console.log('\n6. One expiry date for all the stock: what was bought after it can still be cooked with (B2, until lots in IM7)');
  // 8 kg daal mash are left: 3 kg of the old stock and the 5 kg bought today. The date on the ingredient passed yesterday.
  const todayDate = karachiDate(new Date());
  const yesterday = new Date(Date.parse(`${todayDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  await owner.evaluate(
    ([key, ingredientId, date]) => {
      const all = JSON.parse(window.localStorage.getItem(key));
      all.inventory.ingredients.find((i) => i.id === ingredientId).expiryDate = date;
      window.localStorage.setItem(key, JSON.stringify(all));
    },
    [DATA_KEY, DAAL, yesterday],
  );
  await openPlan(owner);
  await owner.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await owner.getByLabel('+ Add a dish').selectOption({ label: 'Cooked Daal Mash' });
  await owner.getByLabel('Amount of Cooked Daal Mash').fill('6');
  await owner.getByRole('button', { name: /^Save for / }).click();
  await daalNeed(owner).locator('[data-short="yes"]').getByText('1 kg', { exact: true }).waitFor();
  const needText = await daalNeed(owner).innerText();
  assert.match(needText, /5 kg/, 'usable: the 5 kg bought after the date, not 0 and not all 8 kg');
  assert.match(needText, /Expired/);
  await shot(owner, '05-desktop-plan-expired-date-fresh-stock');
  ok(`expiry ${yesterday} passed, 8 kg on hand: 5 kg (bought today) usable, 6 kg planned → 1 kg short, badge Expired`);

  console.log('\n7. After midnight "Today" is still the business day (B3)');
  // The business day starts at 06:00: at 01:30 of the next calendar day the plan's Today is the day that is still running
  const businessDay = karachiDate(new Date(Date.now() - 6 * 3_600_000));
  const night = await openAs(OWNER, '/inventory', DESKTOP, new Date(`${dayAfter(businessDay)}T01:30:00+05:00`));
  await night.getByRole('tab', { name: 'Stock', exact: true }).click();
  await night.getByRole('tab', { name: 'Cooking Plan' }).click();
  await night.locator(`main [data-cooking-plan="${dayAfter(businessDay)}"]`).waitFor();
  await night.getByRole('button', { name: 'Today', exact: true }).click();
  await night.locator(`main [data-cooking-plan="${businessDay}"]`).waitFor();
  await night.close();
  ok(`at 01:30 on ${dayAfter(businessDay)} the Cooking Plan's Today is ${businessDay}, like the orders and the suppliers' "Bought today"`);

  console.log('\n8. Phone');
  const phone = await openAs(OWNER, '/inventory', PHONE);
  await openPlan(phone);
  await phone.getByRole('button', { name: 'Today', exact: true }).click();
  await planRow(phone).waitFor();
  assert.ok(await noSideways(phone), 'phone: no sideways scroll');
  await shot(phone, '06-phone-cooking-plan');
  ok('phone 390 × 844: the plan without sideways scroll');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nIM1 walkthrough passed.');
} catch (err) {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}

// Stage A Stock Count (owner, 2026-11-12), on his Lala demo data.
// A Manager counts the cold drinks' category: cold drink "1 carton + 3 bottles" (mixed units), a second item 0 (counted, nothing
// there), the rest blank (not counted). While counting, the Owner throws away 2 bottles: the count is compared with the stock at the
// moment each item was counted, so the 2 bottles are not taken twice. The Manager submits and cannot approve his own count; the
// Owner is told and approves: one COUNT movement per difference, history kept, never posted twice. A storage-place count is cancelled
// with a reason; a sent-back count returns to counting. A phone has no sideways scroll.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:counts
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'counts');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102) };
const DRINK = id(1318);
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

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
const saved = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key)), DATA_KEY);
const onHand = (data, ingredientId) => data.inventory.movements.filter((m) => m.ingredientId === ingredientId).reduce((sum, m) => sum + m.quantityMilli, 0);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
async function openCounts(page) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Stock', exact: true }).click();
  await page.getByRole('tab', { name: /^Stock Counts/ }).click();
  await page.locator('main [data-stock-counts]').waitFor();
}
async function startCount(page, kind, value) {
  await page.locator('main [data-stock-counts]').getByRole('button', { name: 'New count' }).click();
  const box = page.getByRole('dialog', { name: 'New count' });
  await box.getByRole('radio', { name: kind }).click();
  if (kind === 'Category') await box.getByLabel('Choose a category').selectOption(value);
  if (kind === 'Storage place') await box.getByLabel('Choose a storage place').selectOption(value);
  await box.getByRole('button', { name: 'Start count' }).click();
  await box.waitFor({ state: 'detached' });
  await page.locator('main [data-count-detail]').waitFor();
}
const line = (page, name) => page.locator(`main [data-count-line="${name}"]`);

try {
  console.log('\n1. The Manager starts a count of the cold drinks\' category: a snapshot of what the system expects');
  const manager = await openAs(USER.manager, '/inventory', DESKTOP);
  await openCounts(manager);
  await manager.locator('main [data-stock-counts]').getByText('No counts yet', { exact: false }).waitFor();
  // A new browser saves the demo data at its first change: the count is that change
  await startCount(manager, 'Category', 'BEVERAGES');
  let data = await saved(manager);
  const drinkItem = data.inventory.ingredients.find((i) => i.id === DRINK);
  const sameCategory = data.inventory.ingredients.filter((i) => i.isActive && i.category === drinkItem.category);
  const second = sameCategory.find((i) => i.id !== DRINK && onHand(data, i.id) > 0);
  assert.ok(second, 'a second item in the category with stock');
  const count1 = data.inventory.stockCounts[0];
  assert.deepEqual([count1.number, count1.status, count1.lines.length], [1, 'COUNTING', sameCategory.length], 'every active item of the category');
  assert.equal(count1.lines.find((l) => l.ingredientId === DRINK).snapshotMilli, onHand(data, DRINK), 'snapshot = the stock now');
  ok(`Count #1 · ${drinkItem.category}: ${sameCategory.length} items, each with the stock expected now; nothing counted yet`);

  console.log('\n2. Mixed units: cold drink "1 carton + 3 bottles" = 27 bottles; the second item 0 (counted); the rest blank (not counted)');
  const expectedDrink = onHand(data, DRINK);
  await line(manager, drinkItem.name).getByLabel(`Count of ${drinkItem.name} (1)`).fill('1');
  await line(manager, drinkItem.name).getByRole('button', { name: 'another unit' }).click();
  await line(manager, drinkItem.name).getByLabel(`Unit of ${drinkItem.name} (2)`).selectOption('loose:bottle');
  await line(manager, drinkItem.name).getByLabel(`Count of ${drinkItem.name} (2)`).fill('3');
  await line(manager, drinkItem.name).getByLabel(`Count of ${drinkItem.name} (2)`).blur();
  await line(manager, second.name).getByLabel(`Count of ${second.name} (1)`).fill('0');
  await line(manager, second.name).getByLabel(`Count of ${second.name} (1)`).blur();
  await line(manager, drinkItem.name).locator('[data-count-diff]').getByText(`−${(expectedDrink - 27_000) / 1000} bottles`).waitFor();
  data = await saved(manager);
  const countedLine = data.inventory.stockCounts[0].lines.find((l) => l.ingredientId === DRINK);
  assert.deepEqual([countedLine.countedMilli, countedLine.parts.map((p) => [p.unit, p.quantityMilli])], [27_000, [['carton', 1_000], ['bottle', 3_000]]]);
  assert.equal(data.inventory.stockCounts[0].lines.find((l) => l.ingredientId === second.id).countedMilli, 0, 'zero is a count');
  assert.equal(data.inventory.stockCounts[0].lines.filter((l) => l.countedMilli === null).length, sameCategory.length - 2, 'blank = not counted');
  await shot(manager, '01-desktop-counting');
  ok(`cold drink 1 carton + 3 bottles = 27 (system ${expectedDrink / 1000}) → −${(expectedDrink - 27_000) / 1000} with its value; ${second.name} 0 counted; ${sameCategory.length - 2} blank`);

  console.log('\n3. While counting, the Owner throws away 2 bottles of cold drink (after it was counted)');
  const owner = await openAs(USER.owner, '/inventory', DESKTOP);
  await owner.getByRole('tab', { name: 'Stock', exact: true }).click();
  await owner.getByRole('tab', { name: /^Wastage & Expiry/ }).click();
  await owner.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste', exact: true }).click();
  const waste = owner.getByRole('dialog', { name: 'Record Waste' });
  await waste.getByLabel('Item 1').selectOption(DRINK);
  await waste.getByLabel(`Unit of ${drinkItem.name} (1)`).selectOption('loose:bottle');
  await waste.getByLabel(`Quantity of ${drinkItem.name} (1)`).fill('2');
  await waste.getByLabel(`Why ${drinkItem.name} was thrown away`).selectOption('DAMAGED');
  await waste.getByRole('button', { name: 'Post waste' }).click();
  await waste.waitFor({ state: 'detached' });
  data = await saved(owner);
  assert.equal(onHand(data, DRINK), expectedDrink - 2_000);
  ok(`2 bottles wasted at the same time: stock ${expectedDrink / 1000} → ${(expectedDrink - 2_000) / 1000} bottles`);

  console.log('\n4. The Manager submits; he may not approve his own count');
  await manager.bringToFront();
  await manager.locator('main [data-count-detail]').getByRole('button', { name: 'Submit for approval' }).click();
  await manager.locator('main [data-count-detail][data-count-status="SUBMITTED"]').waitFor();
  await manager.locator('main').getByText('You started or counted this', { exact: false }).waitFor();
  assert.equal(await manager.getByRole('button', { name: 'Approve and post' }).count(), 0, 'no Approve for his own count');
  ok('submitted → Waiting for approval; the Manager sees "the Owner or another Manager approves it", no Approve button');

  console.log('\n5. The Owner is told, approves: one COUNT movement per difference, the waste during counting not taken twice');
  await owner.bringToFront();
  await owner.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await owner.getByRole('button', { name: /^Notifications \(\d+\)/ }).click();
  await owner.getByText('Stock count #1 waits for approval').first().click();
  await owner.locator('main [data-count-detail="1"]').waitFor();
  await owner.locator('main [data-count-summary]').getByText('Missing Rs.', { exact: false }).waitFor();
  await shot(owner, '02-desktop-review');
  const movesBefore = (await saved(owner)).inventory.movements.length;
  await owner.getByRole('button', { name: 'Approve and post' }).dblclick();
  await owner.locator('main [data-count-detail][data-count-status="APPROVED"]').waitFor();
  data = await saved(owner);
  const approved = data.inventory.stockCounts[0];
  const posted = data.inventory.movements.slice(movesBefore);
  const drinkMove = posted.find((m) => m.ingredientId === DRINK);
  assert.equal(drinkMove.type, 'COUNT');
  assert.equal(drinkMove.quantityMilli, 27_000 - expectedDrink, 'counted − the stock when it was counted');
  assert.equal(onHand(data, DRINK), 25_000, 'on the shelf now: 27 counted − 2 thrown away after');
  assert.equal(onHand(data, second.id), 0, 'the item counted 0 is 0');
  assert.equal(posted.length, 2, 'one movement per counted item that differs; nothing for blank rows; approved once');
  assert.deepEqual(approved.history.map((h) => [h.action, h.by]), [['STARTED', USER.manager], ['SUBMITTED', USER.manager], ['APPROVED', USER.owner]]);
  assert.ok(approved.lines.find((l) => l.ingredientId === DRINK).cost > 0, 'the difference keeps its value');
  await owner.getByRole('tab', { name: 'Stock Movements' }).click();
  await owner.locator('main').getByText('Counted (stock count) — Count #1', { exact: false }).first().waitFor();
  ok(`approved: cold drink ${(27_000 - expectedDrink) / 1000} posted → 25 bottles (27 − 2, never twice); ${second.name} → 0; blank items untouched; history Started / Submitted / Approved; Stock Movements "Counted (stock count) — Count #1"`);

  console.log('\n6. A storage-place count covers only that place; cancelled with a reason, nothing changes');
  await openCounts(owner);
  const place = data.inventory.locations[0];
  await startCount(owner, 'Storage place', place.id);
  data = await saved(owner);
  const count2 = data.inventory.stockCounts.at(-1);
  const inPlace = data.inventory.ingredients.filter((i) => i.isActive && i.locationId === place.id).map((i) => i.id).sort();
  assert.deepEqual(count2.lines.map((l) => l.ingredientId).sort(), inPlace, `only the items of ${place.name}`);
  const movesBeforeCancel = data.inventory.movements.length;
  await owner.getByRole('button', { name: 'Cancel count' }).click();
  const cancel = owner.getByRole('dialog', { name: 'Cancel this count' });
  await cancel.getByRole('button', { name: 'Cancel count' }).click();
  await cancel.getByRole('alert').getByText('Write the reason.').waitFor();
  await cancel.getByLabel('Reason').fill('Counted the wrong shelf');
  await cancel.getByRole('button', { name: 'Cancel count' }).click();
  await cancel.waitFor({ state: 'detached' });
  data = await saved(owner);
  assert.equal(data.inventory.stockCounts.at(-1).status, 'CANCELLED');
  assert.equal(data.inventory.movements.length, movesBeforeCancel, 'a cancelled count changes no stock');
  ok(`Count #2 · ${place.name}: ${inPlace.length} items of that place only; Cancel needs a reason; nothing posted`);

  console.log('\n7. Sent back: the Owner returns a submitted count to counting, with a reason');
  await openCounts(owner);
  await startCount(owner, 'All stock');
  await line(owner, drinkItem.name).getByLabel(`Count of ${drinkItem.name} (1)`).fill('1');
  await line(owner, drinkItem.name).getByLabel(`Count of ${drinkItem.name} (1)`).blur();
  await owner.getByRole('button', { name: 'Submit for approval' }).click();
  await owner.getByRole('button', { name: 'Send back to count' }).click();
  const back = owner.getByRole('dialog', { name: 'Send the count back' });
  await back.getByLabel('Reason').fill('Count the back shelf too');
  await back.getByRole('button', { name: 'Send back to count' }).click();
  await back.waitFor({ state: 'detached' });
  data = await saved(owner);
  const count3 = data.inventory.stockCounts.at(-1);
  assert.deepEqual([count3.scope.kind, count3.status, count3.history.at(-1).action, count3.history.at(-1).note], ['ALL', 'COUNTING', 'RETURNED', 'Count the back shelf too']);
  ok('Count #3 (all stock) submitted → sent back with "Count the back shelf too" → counting again; history kept');

  console.log('\n8. Phone: the count list and a count fit a phone, with a number keyboard');
  const phone = await openAs(USER.owner, '/inventory', PHONE);
  await openCounts(phone);
  await phone.locator('main [data-count-row="3"]').click();
  await phone.locator('main [data-count-detail="3"]').waitFor();
  assert.equal(await line(phone, drinkItem.name).getByLabel(`Count of ${drinkItem.name} (1)`).getAttribute('inputmode'), 'decimal');
  assert.ok(await noSideways(phone), 'phone: no sideways scroll');
  await shot(phone, '03-phone-count');
  ok('phone 390 × 844: one row per item, number keyboard, no sideways scroll');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nStock Count walkthrough passed.');
} catch (err) {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}

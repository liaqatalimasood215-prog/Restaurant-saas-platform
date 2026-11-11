// W1 Stock Wastage (owner's Prompt 1 "Wastage & Expiry", 2026-11-11), on his Lala demo data.
// Fresh milk is counted down to 10 L, then 2 L spoiled are recorded with a damaged carton + 2 bottles of cold drink in the same
// entry: milk 10 → 8 L, cold drink −26 bottles, one event, one WASTE movement per item, a double tap posts once, the supplier
// khata does not change. More than in stock and "Other" without a note are refused. The Waste Log, the cards, Stock Movements
// and the Overview card show it; the Manager may record; a phone has no sideways scroll.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:wastage
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'wastage');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102) };
const ING = (n) => id(1300 + n);
const MILK = ING(35);
const DRINK = ING(18);
const DAAL = ING(45);
const COOKED_DAAL = ING(84);
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
const khataTotal = (data) => data.inventory.khata.reduce((sum, e) => sum + e.amount, 0);
const noSideways = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const recordBox = (page) => page.getByRole('dialog', { name: 'Record Waste' });
async function openWastage(page) {
  await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Stock', exact: true }).click();
  await page.getByRole('tab', { name: /^Wastage & Expiry/ }).click();
  await page.locator('main [data-wastage]').waitFor();
}

try {
  console.log('\n1. Wastage & Expiry opens: Record Waste, four cards, an empty Waste Log');
  const owner = await openAs(USER.owner, '/inventory', DESKTOP);
  await openWastage(owner);
  const cards = owner.locator('main [data-waste-cards]');
  await cards.getByText('Waste today').waitFor();
  await cards.getByText('Pending approval').waitFor();
  await owner.locator('main').getByText('No waste recorded yet.', { exact: false }).waitFor();
  await shot(owner, '01-desktop-wastage-empty');
  ok('Record Waste, cards Waste today · Last 7 days · Expiring soon · Pending approval (W4), empty log');

  console.log('\n2. Fresh milk counted down to 10 L (Adjust Stock), as in the owner\'s example');
  let data = await saved(owner);
  const milkStart = data ? onHand(data, MILK) : 20_000_000;
  await owner.getByRole('button', { name: 'Adjust Stock' }).click();
  const adjust = owner.getByRole('dialog');
  await adjust.getByLabel('Ingredient').selectOption(MILK);
  await adjust.getByRole('radio', { name: 'Remove' }).click();
  await adjust.getByLabel('Quantity').fill(String((milkStart - 10_000_000) / 1_000_000));
  await adjust.getByRole('radio', { name: 'Counted again' }).click();
  await adjust.getByRole('button', { name: 'Save change' }).click();
  await adjust.waitFor({ state: 'detached' });
  data = await saved(owner);
  assert.equal(onHand(data, MILK), 10_000_000, 'milk 10 L');
  const drinkBefore = onHand(data, DRINK);
  const khataBefore = { entries: data.inventory.khata.length, total: khataTotal(data) };
  const movementsBefore = data.inventory.movements.length;
  ok(`milk ${milkStart / 1_000_000} L → 10 L; cold drink ${drinkBefore / 1000} bottles`);

  console.log('\n3. One entry, two items: 2 L milk spoiled; 1 carton + 2 bottles of cold drink damaged');
  await owner.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).click();
  const box = recordBox(owner);
  await box.getByLabel('Item 1').selectOption(MILK);
  await box.getByLabel('Quantity of Fresh milk (1)').fill('2');
  await box.getByLabel('Why Fresh milk was thrown away').selectOption('SPOILED');
  await box.locator('[data-waste-line="Fresh milk"] [data-waste-preview]').getByText('In stock 10 litres → 8 litres (−2 litres)').waitFor();
  await box.locator('[data-waste-line="Fresh milk"] [data-waste-preview]').getByText('Loss Rs. 440 at the last purchase price (estimate)').waitFor();
  await box.getByRole('button', { name: 'Add another item' }).click();
  await box.getByLabel('Item 2').selectOption(DRINK);
  await box.getByLabel('Quantity of Cold drink 345 ml (1)').fill('1');
  await box.getByRole('button', { name: /another unit/ }).last().click();
  await box.getByLabel('Unit of Cold drink 345 ml (2)').selectOption('loose:bottle');
  await box.getByLabel('Quantity of Cold drink 345 ml (2)').fill('2');
  await box.getByLabel('Why Cold drink 345 ml was thrown away').selectOption('DAMAGED');
  await box.locator('[data-waste-line="Cold drink 345 ml"] [data-waste-preview]').getByText('(−26 bottles)', { exact: false }).waitFor();
  await box.locator('[data-waste-total]').getByText('Total loss Rs. 3,040').waitFor();
  await shot(owner, '02-desktop-record-waste-two-items');
  await box.getByRole('button', { name: 'Post waste' }).dblclick();
  await box.waitFor({ state: 'detached' });
  data = await saved(owner);
  assert.equal(data.inventory.wasteEvents.length, 1, 'a double tap posts one event');
  const event = data.inventory.wasteEvents[0];
  const wasteMoves = data.inventory.movements.filter((m) => m.wasteId === event.id);
  assert.deepEqual(wasteMoves.map((m) => [m.type, m.quantityMilli, m.wasteReason]), [['WASTE', -2_000_000, 'SPOILED'], ['WASTE', -26_000, 'DAMAGED']]);
  assert.equal(data.inventory.movements.length, movementsBefore + 2, 'one movement per item, nothing else');
  assert.equal(onHand(data, MILK), 8_000_000, 'milk 10 − 2 = 8 L');
  assert.equal(onHand(data, DRINK), drinkBefore - 26_000, 'cold drink −26 bottles');
  assert.deepEqual(event.lines.map((l) => l.cost), [44_000, 260_000], 'Rs. 440 + Rs. 2,600 at the purchase price, not the selling price');
  assert.deepEqual(event.lines[1].parts.map((p) => [p.unit, p.quantityMilli, p.unitSizeMilli]), [['carton', 1000, 24_000], ['bottle', 2000, 1000]], 'the units as typed, with their size');
  assert.deepEqual({ entries: data.inventory.khata.length, total: khataTotal(data) }, khataBefore, 'the supplier khata does not change');
  ok('one event, two WASTE movements; milk 10 → 8 L; cold drink 1 carton (24) + 2 = 26 bottles; loss Rs. 3,040; double tap once; khata unchanged');

  console.log('\n4. Waste Log and cards');
  const log = owner.locator('main [data-waste-log]');
  await log.locator('[data-waste-row="Fresh milk"]').getByText('Spoiled').waitFor();
  await log.locator('[data-waste-row="Fresh milk"]').getByText('10 litres → 8 litres').waitFor();
  await log.locator('[data-waste-row="Cold drink 345 ml"]').getByText('1 carton + 2 bottles').waitFor();
  await cards.locator('[data-waste-card="Waste today"]').getByText('Rs. 3,040').waitFor();
  await shot(owner, '03-desktop-waste-log');
  ok('Waste Log: Fresh milk −2 litres Spoiled (10 → 8 litres), Cold drink −26 bottles "1 carton + 2 bottles"; Waste today Rs. 3,040');

  console.log('\n5. Refused: more than in stock; Other without a note');
  await owner.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).click();
  await recordBox(owner).getByLabel('Item 1').selectOption(MILK);
  await recordBox(owner).getByLabel('Quantity of Fresh milk (1)').fill('9');
  await recordBox(owner).getByLabel('Why Fresh milk was thrown away').selectOption('EXPIRED');
  await recordBox(owner).locator('[data-waste-preview]').getByText('More than is in stock.', { exact: false }).waitFor();
  await recordBox(owner).getByRole('button', { name: 'Post waste' }).click();
  await recordBox(owner).getByRole('alert').getByText('Fresh milk: More than is in stock.', { exact: false }).waitFor();
  await shot(owner, '04-desktop-more-than-in-stock');
  await recordBox(owner).getByLabel('Quantity of Fresh milk (1)').fill('1');
  await recordBox(owner).getByLabel('Why Fresh milk was thrown away').selectOption('OTHER');
  await recordBox(owner).getByRole('button', { name: 'Post waste' }).click();
  await recordBox(owner).getByRole('alert').getByText('Write what happened (reason Other).', { exact: false }).waitFor();
  await recordBox(owner).getByRole('button', { name: 'Cancel' }).click();
  data = await saved(owner);
  assert.equal(data.inventory.wasteEvents.length, 1, 'nothing posted');
  assert.equal(onHand(data, MILK), 8_000_000);
  ok('9 L of 8 L: red preview and refused; Other without a note: refused; stock unchanged');

  console.log('\n6. Stock Movements and the Overview card show it');
  await owner.getByRole('tab', { name: 'Stock Movements' }).click();
  await owner.locator('main').getByText('Wasted: Spoiled').first().waitFor();
  await owner.locator('main').getByText('Wasted: Damaged packaging / breakage').first().waitFor();
  await owner.getByRole('tab', { name: 'Overview', exact: true }).click();
  await owner.locator('main [data-inventory-card="Today\'s wastage"]').getByText('Rs. 3,040').waitFor();
  await shot(owner, '05-desktop-overview-wastage-card');
  await owner.locator('main [data-inventory-card="Today\'s wastage"]').click();
  await owner.locator('main [data-wastage]').waitFor();
  ok('Stock Movements: "Wasted: Spoiled" and "Wasted: Damaged packaging / breakage"; Overview "Today\'s wastage" Rs. 3,040 opens Wastage');

  console.log('\n7. Expiring / Expired lists; the Manager records too');
  await owner.getByRole('tab', { name: /^Expiring soon/ }).click();
  await owner.locator('main [data-expiry-list]').getByText('One expiry date per ingredient for now', { exact: false }).waitFor();
  const manager = await openAs(USER.manager, '/inventory', DESKTOP);
  await openWastage(manager);
  await manager.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).waitFor();
  await manager.locator('main [data-waste-log] [data-waste-row="Fresh milk"]').waitFor();
  ok('Expiring soon lists the ingredients by their one date (lots in W3); the Manager sees the log and Record Waste');

  console.log('\n8. Phone');
  const phone = await openAs(USER.owner, '/inventory', PHONE);
  await openWastage(phone);
  await phone.locator('main [data-waste-log-cards] [data-waste-row="Fresh milk"]').waitFor();
  assert.ok(await noSideways(phone), 'phone: no sideways scroll');
  await shot(phone, '06-phone-wastage');
  await phone.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).click();
  await recordBox(phone).getByLabel('Item 1').selectOption(MILK);
  assert.equal(await recordBox(phone).getByLabel('Quantity of Fresh milk (1)').getAttribute('inputmode'), 'decimal', 'number keyboard');
  assert.ok(await noSideways(phone), 'phone form: no sideways scroll');
  await shot(phone, '07-phone-record-waste');
  ok('phone 390 × 844: log as cards, the form with a number keyboard, no sideways scroll');

  // ── W2 ──────────────────────────────────────────────────────────────────────────────────────
  console.log('\n9. W2: cook 1 kg daal mash, then 1 kg of the COOKED daal is wasted: one movement on the cooked dish, raw never again');
  await owner.bringToFront();
  await owner.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
  await owner.getByRole('button', { name: 'Adjust Stock' }).click();
  const addDaal = owner.getByRole('dialog');
  await addDaal.getByLabel('Ingredient').selectOption(DAAL);
  await addDaal.getByRole('radio', { name: 'Add' }).click();
  await addDaal.getByLabel('Quantity').fill('1');
  await addDaal.getByRole('radio', { name: 'Counted again' }).click();
  await addDaal.getByRole('button', { name: 'Save change' }).click();
  await addDaal.waitFor({ state: 'detached' });
  await owner.getByRole('tab', { name: 'Recipes', exact: true }).click();
  await owner.locator('main [data-recipe-summary]').first().waitFor();
  await owner.getByRole('tab', { name: 'Prepared items' }).click();
  const daalCard = owner.locator('main [data-prepared-item="Cooked Daal Mash"]');
  await daalCard.getByRole('button', { name: 'Sell Cooked Daal Mash on POS' }).click();
  const link = owner.getByRole('dialog', { name: 'Sell Cooked Daal Mash on POS' });
  await link.getByRole('button', { name: 'Link and save' }).click();
  await link.waitFor({ state: 'detached' });
  await daalCard.getByRole('button', { name: 'Cook Cooked Daal Mash' }).click();
  const cook = owner.getByRole('dialog', { name: 'Cook Cooked Daal Mash' });
  await cook.getByLabel('Raw Daal mash used').fill('1');
  await cook.getByLabel('Actually made').fill('12');
  await cook.getByRole('button', { name: 'Record cooking' }).click();
  await cook.waitFor({ state: 'detached' });
  data = await saved(owner);
  const batch = data.inventory.cookingBatches.at(-1);
  assert.equal(onHand(data, COOKED_DAAL), 3_000_000, '12 plates × 250 g = 3 kg cooked');
  const rawAfterCook = Object.fromEntries(batch.uses.map((u) => [u.ingredientId, onHand(data, u.ingredientId)]));
  const eventsBefore = data.inventory.wasteEvents.length;
  await openWastage(owner);
  await owner.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).click();
  const cookedBox = recordBox(owner);
  await cookedBox.getByLabel('Item 1').selectOption(COOKED_DAAL);
  await cookedBox.getByRole('radio', { name: 'Holding / closing' }).click();
  await cookedBox.getByLabel('Quantity of Cooked Daal Mash (1)').fill('1');
  await cookedBox.getByLabel('Why Cooked Daal Mash was thrown away').selectOption('CLOSING_DISCARD');
  await cookedBox.locator('[data-waste-preview]').getByText('batch cost (estimate)', { exact: false }).waitFor();
  await shot(owner, '08-desktop-w2-cooked-waste');
  await cookedBox.getByRole('button', { name: 'Post waste' }).dblclick();
  await cookedBox.waitFor({ state: 'detached' });
  data = await saved(owner);
  assert.equal(data.inventory.wasteEvents.length, eventsBefore + 1, 'a double tap posts once');
  const cookedEvent = data.inventory.wasteEvents.at(-1);
  const cookedMoves = data.inventory.movements.filter((m) => m.wasteId === cookedEvent.id);
  assert.deepEqual(cookedMoves.map((m) => [m.ingredientId, m.type, m.quantityMilli]), [[COOKED_DAAL, 'WASTE', -1_000_000]], 'one movement, on the cooked dish only');
  assert.equal(onHand(data, COOKED_DAAL), 2_000_000, 'cooked daal 3 → 2 kg');
  for (const [ingredientId, qty] of Object.entries(rawAfterCook)) assert.equal(onHand(data, ingredientId), qty, 'no raw ingredient is taken again');
  assert.deepEqual([cookedEvent.lines[0].itemKind, cookedEvent.lines[0].costBasis, cookedEvent.lines[0].cost], ['COOKED', 'BATCH', Math.round((1_000_000 * batch.cost) / batch.actualMilli)], 'the batch cost shared by what it made');
  await owner.locator('main [data-waste-log] [data-waste-row="Cooked Daal Mash"]').getByText('Cooked', { exact: true }).waitFor();
  ok(`cooked 1 kg raw → 3 kg; 1 kg cooked wasted: one WASTE movement on Cooked Daal Mash (3 → 2 kg), raw daal / oil / spices unchanged; loss ${cookedEvent.lines[0].cost / 100} Rs. at the batch cost`);

  console.log('\n10. W2: a staff meal (cooked daal) and a donation (milk): their own movements and totals, never waste');
  const wasteToday = await cards.locator('[data-waste-card="Waste today"]').innerText();
  await owner.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).click();
  await recordBox(owner).getByRole('radio', { name: 'Staff meal' }).click();
  await recordBox(owner).getByLabel('Item 1').selectOption(COOKED_DAAL);
  await recordBox(owner).getByLabel('Quantity of Cooked Daal Mash (1)').fill('0.5');
  assert.equal(await recordBox(owner).getByLabel('Why Cooked Daal Mash was thrown away').count(), 0, 'no waste reason for a staff meal');
  await recordBox(owner).getByRole('button', { name: 'Post waste' }).click();
  await recordBox(owner).waitFor({ state: 'detached' });
  await owner.locator('main [data-wastage]').getByRole('button', { name: 'Record Waste' }).click();
  await recordBox(owner).getByRole('radio', { name: 'Donation' }).click();
  await recordBox(owner).getByLabel('Item 1').selectOption(MILK);
  await recordBox(owner).getByLabel('Quantity of Fresh milk (1)').fill('1');
  await recordBox(owner).getByRole('button', { name: 'Post waste' }).click();
  await recordBox(owner).waitFor({ state: 'detached' });
  data = await saved(owner);
  const [meal, donation] = data.inventory.wasteEvents.slice(-2);
  assert.deepEqual([meal.kind, donation.kind], ['STAFF_MEAL', 'DONATION']);
  assert.deepEqual(data.inventory.movements.filter((m) => m.wasteId === meal.id || m.wasteId === donation.id).map((m) => [m.type, m.quantityMilli]), [['STAFF_MEAL', -500_000], ['DONATION', -1_000_000]]);
  assert.equal(onHand(data, COOKED_DAAL), 1_500_000);
  assert.equal(onHand(data, MILK), 7_000_000, 'milk 8 − 1 = 7 L');
  assert.equal(await cards.locator('[data-waste-card="Waste today"]').innerText(), wasteToday, 'Waste today does not change');
  await owner.locator('main [data-waste-apart]').getByText('Donations Rs. 220 (1)', { exact: false }).waitFor();
  await shot(owner, '09-desktop-w2-meal-donation');
  ok('staff meal ½ kg cooked daal and donation 1 L milk: STAFF_MEAL / DONATION movements, counted apart ("Donations Rs. 220 (1)"); Waste today unchanged');

  console.log('\n11. W2: Reverse the donation (a reason): milk comes back by a linked movement, the entry stays as Reversed, once');
  const movesBeforeReverse = data.inventory.movements.length;
  const donationRow = owner.locator('main [data-waste-log] [data-waste-row="Fresh milk"]', { hasText: 'Donation' });
  await donationRow.getByRole('button', { name: 'Reverse Fresh milk' }).click();
  const rev = owner.getByRole('dialog', { name: 'Reverse this entry' });
  await rev.getByRole('button', { name: 'Reverse' }).click();
  await rev.getByRole('alert').getByText('Write why it is reversed.').waitFor();
  await rev.getByRole('textbox').fill('Not given, recorded by mistake');
  await rev.getByRole('button', { name: 'Reverse' }).dblclick();
  await rev.waitFor({ state: 'detached' });
  data = await saved(owner);
  const reversed = data.inventory.wasteEvents.find((ev) => ev.id === donation.id);
  assert.equal(reversed.status, 'REVERSED');
  assert.equal(reversed.reversal.reason, 'Not given, recorded by mistake');
  assert.deepEqual(data.inventory.movements.slice(movesBeforeReverse).map((m) => [m.type, m.quantityMilli, m.wasteId]), [['WASTE_REVERSAL', 1_000_000, donation.id]], 'one reversal movement, once');
  assert.equal(onHand(data, MILK), 8_000_000, 'milk back to 8 L');
  await owner.locator('main [data-waste-log] [data-waste-row="Fresh milk"][data-waste-status="REVERSED"]').getByText('Not given, recorded by mistake', { exact: false }).waitFor();
  assert.equal(await owner.locator('main [data-waste-log] [data-waste-row="Fresh milk"][data-waste-status="REVERSED"]').getByRole('button', { name: 'Reverse Fresh milk' }).count(), 0, 'no second reversal');
  ok('donation reversed with a reason: +1 L WASTE_REVERSAL linked to it, milk 7 → 8 L; the entry stays in the log as Reversed; no Reverse button any more');

  console.log('\n12. W2: Correct the first entry (milk 2 L → 3 L): old reversed, new posted, linked, in one step');
  const movesBeforeCorrect = data.inventory.movements.length;
  const drinkBeforeCorrect = onHand(data, DRINK);
  await owner.locator('main [data-waste-log]').getByRole('button', { name: 'Correct Fresh milk' }).click();
  const fix = owner.getByRole('dialog', { name: 'Correct this entry' });
  await fix.getByLabel('Quantity of Fresh milk (1)').fill('3');
  await fix.locator('[data-waste-line="Fresh milk"] [data-waste-preview]').getByText('In stock 10 litres → 7 litres (−3 litres)').waitFor();
  await fix.getByLabel('Why is it corrected?').fill('It was 3 litres');
  await shot(owner, '10-desktop-w2-correct');
  await fix.getByRole('button', { name: 'Correct' }).dblclick();
  await fix.waitFor({ state: 'detached' });
  data = await saved(owner);
  const old = data.inventory.wasteEvents.find((ev) => ev.id === event.id);
  const fixed = data.inventory.wasteEvents.find((ev) => ev.correctsId === event.id);
  assert.equal(old.status, 'REVERSED');
  assert.equal(old.reversal.correctedById, fixed.id, 'linked both ways');
  assert.equal(data.inventory.wasteEvents.filter((ev) => ev.correctsId === event.id).length, 1, 'a double tap corrects once');
  assert.deepEqual(data.inventory.movements.slice(movesBeforeCorrect).map((m) => [m.type, m.quantityMilli]), [['WASTE_REVERSAL', 2_000_000], ['WASTE_REVERSAL', 26_000], ['WASTE', -3_000_000], ['WASTE', -26_000]]);
  assert.equal(onHand(data, MILK), 7_000_000, 'milk 8 + 2 − 3 = 7 L');
  assert.equal(onHand(data, DRINK), drinkBeforeCorrect, 'cold drink unchanged (put back and taken again)');
  assert.deepEqual({ entries: data.inventory.khata.length, total: khataTotal(data) }, khataBefore, 'the supplier khata still does not change');
  await owner.locator('main [data-waste-log] [data-waste-row="Fresh milk"]', { hasText: 'Correction' }).waitFor();
  ok('corrected: old entry Reversed ("It was 3 litres"), new entry "Correction" 3 L; milk 8 + 2 − 3 = 7 L; cold drink and khata unchanged; double tap once');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nWastage walkthrough passed.');
} catch (err) {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}

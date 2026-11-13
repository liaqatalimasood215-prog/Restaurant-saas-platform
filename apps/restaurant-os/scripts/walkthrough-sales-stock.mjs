// I4 "Step 14" (owner's plan and his reuse rule, 2026-11-09), on his Lala demo data: sales take stock at the kitchen's Ready, once.
// A Chicken Karahi 1 kg takes its raw ingredients at Ready (nothing at Send); Undo gives them back, Ready again takes them again.
// The customer cancels after Ready: not served and safe → Available Prepared Food (never wastage by itself). The next karahi 1 kg
// gets it with "Give this" on the KDS: no raw stock taken again; a second tablet cannot give the same food twice. Served food can
// only be wastage. Naan takes its dough from the prepared stock, never the dough's atta again (it goes below zero: an alert).
// At the 23:00 closing review the food that is left is wasted with a reason.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:sales-stock
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'sales-stock');
const SESSION_KEY = 'lala-os-demo-session';
const DATA_KEY = 'lala-os-demo-data';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), cashier: id(103), chef: id(106) };
const NAAN_DOUGH = id(1360);
const ATTA = id(1348);
const TABLET = { width: 1280, height: 800 };
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
const dialog = (page) => page.getByRole('dialog');
const bill = (page) => page.locator('main [data-pos-bill]');
const ticketOf = (page, n) => page.locator(`main [data-kds-order="${n}"]`).first();
/** The net stock a line holds, per ingredient (− taken) */
const netOf = (data, itemId) => {
  const net = {};
  for (const m of data.inventory.movements.filter((mv) => mv.orderItemId === itemId)) net[m.ingredientId] = (net[m.ingredientId] ?? 0) + m.quantityMilli;
  return Object.fromEntries(Object.entries(net).filter(([, q]) => q !== 0));
};
const lineOf = (data, n) => data.orders.find((o) => o.dailyNumber === n && o.businessDate === data.orders.at(-1).businessDate).items[0];
const karachiDate = (at) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);

/** One takeaway order from the POS: [name, size] per line, then Send to Kitchen; returns its order number. */
async function order(pos, lines) {
  for (const [name, size] of lines) {
    await pos.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
    if (size) await dialog(pos).getByRole('button', { name: new RegExp(`^${size}`) }).click();
    await dialog(pos).getByRole('button', { name: /^Add ·/ }).click();
    await dialog(pos).waitFor({ state: 'detached' });
  }
  await bill(pos).getByRole('button', { name: 'Send to Kitchen' }).click();
  const text = await pos.getByText(/Order #\d+/).first().innerText();
  await pos.getByRole('button', { name: 'New bill', exact: true }).click();
  return Number(/#(\d+)/.exec(text)[1]);
}
async function startReady(chef, n) {
  await ticketOf(chef, n).getByRole('button', { name: 'Start', exact: true }).click();
  await ticketOf(chef, n).getByRole('button', { name: 'Ready', exact: true }).click();
  await chef.locator(`main [data-kds-order="${n}"][data-kds-ticket="READY"]`).first().waitFor();
}

try {
  console.log('\n1. Chicken Karahi 1 kg: nothing taken at Send; the recipe once at Ready; Undo gives it back; Ready again takes it again');
  const pos = await openAs(USER.owner, '/pos', DESKTOP);
  const a = await order(pos, [['Chicken Karahi', '1 kg']]);
  let data = await saved(pos);
  let lineA = lineOf(data, a);
  assert.deepEqual(netOf(data, lineA.id), {}, 'nothing is taken when it is sent');
  assert.equal(lineA.stock.takenAt, null);
  const karahi = data.items.find((i) => i.name === 'Chicken Karahi');
  const oneKg = karahi.variants.find((v) => v.name === '1 kg');
  const recipe = data.inventory.recipes.find((r) => r.target.kind === 'ITEM' && r.target.menuItemId === karahi.id && r.target.variantId === oneKg.id);
  const version = recipe.versions.find((v) => v.version === lineA.recipeVersions[`item:${oneKg.id}`]);
  const expected = {};
  for (const l of version.lines.filter((x) => !x.optional)) expected[l.ingredientId] = (expected[l.ingredientId] ?? 0) - Math.round((l.quantityMilli * 10_000) / (10_000 - l.lossBps));
  const close = (got, want) => Object.keys(want).length === Object.keys(got).length && Object.entries(want).every(([k, q]) => Math.abs((got[k] ?? 0) - q) <= 1);

  const chef = await openAs(USER.chef, '/kitchen', TABLET);
  await chef.getByRole('tab', { name: /^All stations/ }).click();
  await startReady(chef, a);
  data = await saved(chef);
  assert.ok(close(netOf(data, lineA.id), expected), `the 1 kg recipe once: ${JSON.stringify(netOf(data, lineA.id))} vs ${JSON.stringify(expected)}`);
  await ticketOf(chef, a).getByRole('button', { name: /^Undo/ }).click();
  await chef.locator(`main [data-kds-order="${a}"][data-kds-ticket="PREPARING"]`).first().waitFor();
  data = await saved(chef);
  assert.deepEqual(netOf(data, lineA.id), {}, 'Undo gives the stock back');
  await ticketOf(chef, a).getByRole('button', { name: 'Ready', exact: true }).click();
  await chef.locator(`main [data-kds-order="${a}"][data-kds-ticket="READY"]`).first().waitFor();
  data = await saved(chef);
  assert.ok(close(netOf(data, lineA.id), expected), 'Ready again: taken once in total');
  const raw = Object.keys(expected).length;
  ok(`order #${a}: 0 at Send; Ready took the 1 kg recipe (${raw} ingredients, loss included); Undo gave it back; Ready again → once in total`);

  console.log('\n2. The customer cancels after Ready: not served and safe → Available Prepared Food (not wastage)');
  const counter = await openAs(USER.owner, '/online-orders', DESKTOP);
  await counter.locator(`main [data-order-number="${a}"]`).getByRole('button', { name: 'Cancel order', exact: true }).click();
  const box = dialog(counter);
  await box.locator('[data-made-food]').waitFor();
  await box.getByRole('textbox').first().fill('Customer left');
  await box.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await box.getByText('Choose what happens to the food that was made').waitFor();
  await box.getByRole('radio', { name: /^Not served and safe: keep it for another order \(3 h\)/ }).check();
  await box.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await box.getByText('Choose what happens to the food that was made').waitFor();
  await box.getByRole('checkbox', { name: 'I checked: not served, and safe to give' }).check();
  await shot(counter, '01-desktop-cancel-made-food');
  await box.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await box.waitFor({ state: 'detached' });
  data = await saved(counter);
  lineA = lineOf(data, a);
  const food = data.inventory.availableFood.find((f) => f.fromItemId === lineA.id);
  assert.equal(food.remaining, 1);
  assert.equal(lineA.stock.outcome.kind, 'AVAILABLE');
  assert.ok(close(netOf(data, lineA.id), expected), 'the raw stock stays taken once');
  assert.equal((data.inventory.foodWaste ?? []).length, 0, 'not wastage');
  ok(`#${a} cancelled: the box asks for the food (no choice → stopped; "keep" without the safety tick → stopped); kept → Available Food 1 × 1 kg; raw stock still taken once; no wastage`);

  console.log('\n3. Two new karahi 1 kg orders; "Give this" on one tablet; the other tablet cannot give the same food again');
  await pos.bringToFront();
  await pos.locator('main [data-ready-food="1"]').first().waitFor();
  await shot(pos, '02-desktop-pos-1-ready');
  const b = await order(pos, [['Chicken Karahi', '1 kg']]);
  const c = await order(pos, [['Chicken Karahi', '1 kg']]);
  const chef2 = await openAs(USER.chef, '/kitchen', TABLET);
  await chef2.getByRole('tab', { name: /^All stations/ }).click();
  await chef.bringToFront();
  await ticketOf(chef, b).locator(`[data-give-food="${a}"]`).waitFor();
  await shot(chef, '03-tablet-ready-food-strip');
  await ticketOf(chef2, c).locator(`[data-give-food="${a}"]`).click();
  await dialog(chef2).getByRole('checkbox').check();
  await ticketOf(chef, b).locator(`[data-give-food="${a}"]`).click();
  await dialog(chef).getByRole('button', { name: 'Give this' }).waitFor();
  assert.ok(await dialog(chef).getByRole('button', { name: 'Give this' }).isDisabled(), 'the safety tick comes first');
  await shot(chef, '03b-tablet-give-safety-check');
  await dialog(chef).getByRole('checkbox').check();
  await dialog(chef).getByRole('button', { name: 'Give this' }).click();
  await chef.locator(`main [data-kds-order="${b}"][data-kds-ticket="READY"]`).first().waitFor();
  await chef2.bringToFront();
  // DEMO: each tab keeps its own copy and hears the other tab's change a moment later (BroadcastChannel); the real backend
  // checks it in one database transaction. Wait for the sync, then the second tablet's open dialog tries the same food.
  await ticketOf(chef2, c).locator('[data-give-food]').waitFor({ state: 'detached' });
  await dialog(chef2).getByRole('button', { name: 'Give this' }).click();
  await chef2.getByText('This food was already given to another order.').first().waitFor();
  data = await saved(chef);
  const lineB = lineOf(data, b);
  assert.deepEqual(netOf(data, lineB.id), {}, 'no raw stock taken for the given karahi');
  assert.equal(lineB.stock.fromAvailable[0].fromDailyNumber, a);
  assert.equal(data.inventory.availableFood.find((f) => f.id === food.id).remaining, 0);
  assert.equal(lineOf(data, c).stock.fromAvailable?.length ?? 0, 0, 'the second tablet gave nothing');
  await chef.bringToFront();
  await startReady(chef, c);
  data = await saved(chef);
  assert.ok(close(netOf(data, lineOf(data, c).id), expected), `#${c} made from raw by its recipe`);
  await shot(chef, '04-tablet-given-and-made');
  ok(`#${b} got #${a}'s karahi: Ready at once, 0 raw taken; the other tablet's "Give this" for #${c} → "already given to another order"; #${c} made from raw once`);

  console.log('\n4. Served food can only be wastage (with a reason); its stock stays taken');
  const tableId = data.tables.find((tb) => tb.name === 'T3' && !tb.archivedAt).id;
  const waiter = await openAs(USER.owner, `/waiter?table=${tableId}`, PHONE);
  await waiter.getByRole('tab', { name: /^Order/ }).click();
  await waiter.getByRole('button', { name: 'Guests +' }).click();
  await waiter.getByRole('tab', { name: 'Menu' }).click();
  await waiter.getByRole('button', { name: /^Chicken Karahi/ }).first().click();
  await dialog(waiter).getByRole('button', { name: /^½ kg/ }).click();
  await dialog(waiter).getByRole('button', { name: /^Add ·/ }).click();
  await waiter.getByRole('tab', { name: /^Order/ }).click();
  await waiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await waiter.getByText(/sent to the kitchen/).first().waitFor();
  data = await saved(waiter);
  const d = data.orders.find((o) => o.tableId === tableId && o.status === 'OPEN').dailyNumber;
  await chef.bringToFront();
  await startReady(chef, d);
  await waiter.bringToFront();
  await waiter.getByRole('button', { name: 'Served', exact: true }).first().click();
  await waiter.waitForFunction(([key, n]) => JSON.parse(window.localStorage.getItem(key)).orders.some((o) => o.dailyNumber === n && o.tickets.every((tk) => tk.status === 'SERVED')), [DATA_KEY, d]);
  await waiter.getByRole('button', { name: 'Void', exact: true }).first().click();
  await dialog(waiter).locator('[data-made-food]').waitFor();
  await dialog(waiter).getByText('Served at the table: it can only be wastage.').waitFor();
  assert.equal(await dialog(waiter).getByRole('radio').count(), 1, 'only Wastage');
  await dialog(waiter).getByRole('textbox').first().fill('Customer did not like it');
  await dialog(waiter).getByRole('radio', { name: 'Wastage' }).check();
  await dialog(waiter).getByRole('combobox').selectOption('Served, returned by the customer');
  await shot(waiter, '05-phone-void-served-wastage');
  await dialog(waiter).getByRole('button', { name: 'Void item' }).click();
  await dialog(waiter).waitFor({ state: 'detached' });
  data = await saved(waiter);
  const lineD = lineOf(data, d);
  assert.equal(lineD.isVoid, true);
  assert.equal(lineD.stock.outcome.kind, 'WASTE');
  const waste = data.inventory.foodWaste.find((w) => w.dailyNumber === d);
  assert.equal(waste.reason, 'Served, returned by the customer');
  assert.ok(Object.keys(netOf(data, lineD.id)).length > 0, 'the stock stays taken');
  assert.equal(data.inventory.availableFood.filter((f) => f.fromItemId === lineD.id).length, 0, 'served food is never reused');
  // W2: the same entry in the Waste Log, with no stock movement of its own (the stock left once, at Ready)
  const orderWaste = (data.inventory.wasteEvents ?? []).filter((ev) => ev.lines.some((l) => l.orderFood?.dailyNumber === d));
  assert.equal(orderWaste.length, 1, 'one Waste Log entry');
  assert.deepEqual([orderWaste[0].kind, orderWaste[0].source, orderWaste[0].lines[0].itemKind, orderWaste[0].lines[0].movementId], ['WASTE', 'ORDER_CANCEL', 'ORDER_FOOD', null]);
  assert.equal(data.inventory.movements.filter((m) => m.wasteId === orderWaste[0].id).length, 0, 'W2: no second stock movement');
  ok(`T3 #${d} served, then voided: only "Wastage" offered; recorded with its reason and cost; never reused; its stock stays taken; one Waste Log entry without a stock movement`);

  console.log('\n5. Naan takes its dough from the prepared stock, never the atta again; below zero → an alert to record the batch');
  await pos.bringToFront();
  data = await saved(pos);
  const doughBefore = data.inventory.movements.filter((m) => m.ingredientId === NAAN_DOUGH).reduce((s, m) => s + m.quantityMilli, 0);
  const e = await order(pos, [['Naan', null]]);
  await chef.bringToFront();
  const naanTicket = chef.locator(`main [data-kds-order="${e}"]`).first();
  if ((await naanTicket.getAttribute('data-kds-ticket')) !== 'READY') await startReady(chef, e);
  data = await saved(chef);
  const naanNet = netOf(data, lineOf(data, e).id);
  assert.ok(naanNet[NAAN_DOUGH] < 0, 'the dough is taken from its prepared stock');
  assert.equal(naanNet[ATTA], undefined, 'the atta of the dough is not taken again');
  const doughAfter = data.inventory.movements.filter((m) => m.ingredientId === NAAN_DOUGH).reduce((s, m) => s + m.quantityMilli, 0);
  ok(`naan #${e}: naan dough ${doughBefore / 1000} g → ${doughAfter / 1000} g; atta not touched`);
  if (doughAfter < 0) {
    const owner = await openAs(USER.owner, '/inventory', DESKTOP);
    await owner.getByRole('button', { name: /^Notifications \(\d+\)/ }).click();
    await owner.getByText(/Cooked food sold beyond what was cooked/).first().waitFor({ timeout: 10_000 });
    ok('the dough went below zero: the Owner\'s bell says "Cooked food sold beyond what was cooked" (record the Cooking Batch)');
    await owner.close();
  }

  console.log('\n6. Closing review at 23:00: ready food left is reviewed; only what cannot be kept is wastage, with a reason');
  // A karahi that nobody takes: #c is made, then cancelled and kept
  await counter.bringToFront();
  await counter.locator(`main [data-order-number="${c}"]`).getByRole('button', { name: 'Cancel order', exact: true }).click();
  await dialog(counter).getByRole('textbox').first().fill('Phone order not collected');
  await dialog(counter).getByRole('radio', { name: /^Not served and safe/ }).check();
  await dialog(counter).getByRole('checkbox').check();
  await dialog(counter).getByRole('button', { name: 'Cancel order', exact: true }).click();
  await dialog(counter).waitFor({ state: 'detached' });
  const now = Date.now();
  // After the closing time AND after the karahi's 3 safe hours, whatever the time of day the walkthrough runs
  const closing = Math.max(now + 3 * 3_600_000 + 5 * 60_000, Date.parse(`${karachiDate(new Date(now))}T23:05:00+05:00`));
  const review = await openAs(USER.owner, '/inventory?food=review', DESKTOP, closing);
  await review.locator('main [data-closing-review]').waitFor();
  await review.getByRole('button', { name: /^Notifications \(\d+\)/ }).click();
  await review.getByText(/Closing review: 1 ready food left/).first().waitFor({ timeout: 10_000 });
  await review.keyboard.press('Escape');
  const left = review.locator('main [data-available-food="Chicken Karahi (1 kg)"][data-state="TIME_OVER"]');
  await left.waitFor();
  await shot(review, '06-desktop-closing-review');
  await left.getByRole('button', { name: 'Wastage', exact: true }).click();
  await dialog(review).getByRole('combobox').selectOption('Time over');
  await dialog(review).getByRole('button', { name: 'Wastage', exact: true }).click();
  await dialog(review).waitFor({ state: 'detached' });
  await review.locator('main [data-food-waste] [data-waste-row="Chicken Karahi (1 kg)"]', { hasText: 'Time over' }).waitFor();
  data = await saved(review);
  assert.equal(data.inventory.availableFood.filter((f) => f.remaining > 0).length, 0);
  assert.ok(close(netOf(data, lineOf(data, c).id), expected), `#${c}: still taken once`);
  const keptWaste = (data.inventory.wasteEvents ?? []).filter((ev) => ev.lines.some((l) => l.orderFood?.dailyNumber === c));
  assert.equal(keptWaste.length, 1, 'W2: the karahi is in the Waste Log once');
  assert.deepEqual([keptWaste[0].source, keptWaste[0].lines[0].reason, keptWaste[0].lines[0].note], ['AVAILABLE_FOOD', 'CLOSING_DISCARD', 'Time over']);
  assert.equal(data.inventory.movements.filter((m) => m.wasteId === keptWaste[0].id).length, 0, 'W2: no second stock movement');
  await shot(review, '07-desktop-wastage-recorded');
  ok(`after closing (23:00) and past its 3 safe hours: "Closing review: 1 ready food left" in the bell and on Stock → Available Food (time over, red); wasted with "Time over"; its raw stock was taken once`);

  console.log('\n7. Settings: closing time; Menu: the reuse switch; phone');
  const settings = await openAs(USER.owner, '/settings', DESKTOP);
  await settings.getByRole('button', { name: /Notifications & Alerts/ }).first().click();
  const closingBox = settings.locator('main [data-closing-time]');
  await closingBox.getByLabel('Closing review of ready food').fill('22:30');
  await closingBox.getByRole('button', { name: 'Save time' }).click();
  await settings.getByText('Closing review at 22:30').first().waitFor();
  assert.equal((await saved(settings)).inventory.closingTime, '22:30');
  const menu = await openAs(USER.owner, '/menu', DESKTOP);
  await menu.getByRole('button', { name: /Edit Chicken Karahi$/ }).first().click();
  const reuse = dialog(menu).locator('[data-reuse-setting]');
  await reuse.getByText('If cancelled after Ready: give to another order').waitFor();
  assert.equal(await reuse.getByRole('spinbutton').inputValue(), '3');
  await shot(menu, '08-desktop-menu-reuse');
  const phone = await openAs(USER.owner, '/inventory?food=review', PHONE);
  await phone.locator('main [data-available-food-tab]').waitFor();
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll');
  await shot(phone, '09-phone-available-food');
  ok('closing time 22:30 saved (Owner); Chicken Karahi: "give to another order" ON, 3 hours; Available Food on a phone without sideways scroll');

  console.log('\n8. Refund: only money goes back; the stock stays exactly as the kitchen took it');
  await pos.bringToFront();
  await pos.getByRole('button', { name: /^Chicken Karahi/ }).first().click();
  await dialog(pos).getByRole('button', { name: /^1 kg/ }).click();
  await dialog(pos).getByRole('button', { name: /^Add ·/ }).click();
  await dialog(pos).waitFor({ state: 'detached' });
  await bill(pos).getByRole('button', { name: 'Bill Now' }).click();
  await dialog(pos).getByRole('button', { name: 'Record payment' }).click();
  await pos.getByText(/Paid · Invoice #\d+/).first().waitFor();
  data = await saved(pos);
  const r = data.orders.at(-1).dailyNumber;
  await chef.bringToFront();
  await startReady(chef, r);
  data = await saved(chef);
  const lineR = lineOf(data, r);
  assert.ok(close(netOf(data, lineR.id), expected), `#${r}: the recipe taken once at Ready`);
  const movesBefore = data.inventory.movements.length;
  const onHandAll = (d) => Object.fromEntries(d.inventory.ingredients.map((i) => [i.id, d.inventory.movements.filter((m) => m.ingredientId === i.id).reduce((s, m) => s + m.quantityMilli, 0)]));
  const stockBefore = onHandAll(data);
  const refunds = await openAs(USER.owner, '/orders', DESKTOP);
  await refunds.locator('main li button', { hasText: `#${r}` }).first().click();
  await refunds.locator('[data-payments]').waitFor();
  await refunds.getByRole('button', { name: 'Refund', exact: true }).click();
  const refundBox = dialog(refunds);
  const refundable = (await refundBox.locator('[data-refundable]').innerText()).replace(/^Rs\.\s*/, '').replace(/,/g, '');
  await refundBox.locator('[data-refund-amount]').fill(refundable);
  await refundBox.locator('[data-refund-reason]').fill('Customer complaint (test)');
  await refundBox.getByRole('button', { name: 'Continue', exact: true }).click();
  await dialog(refunds).getByRole('button', { name: 'Yes, record the refund', exact: true }).click();
  await refunds.locator('[data-refund-slip]').waitFor();
  await shot(refunds, '10-desktop-refund-slip');
  await dialog(refunds).getByRole('button', { name: 'Close' }).last().click();
  data = await saved(refunds);
  const refunded = data.orders.find((o) => o.dailyNumber === r && o.businessDate === data.orders.at(-1).businessDate);
  assert.equal(refunded.refundedTotal, refunded.paidTotal, 'the whole bill was refunded');
  assert.equal(data.inventory.movements.length, movesBefore, 'a refund writes no stock movement');
  assert.deepEqual(onHandAll(data), stockBefore, 'every ingredient\'s stock is unchanged');
  assert.ok(close(netOf(data, refunded.items[0].id), expected), 'the line still holds what the kitchen took');
  assert.equal(refunded.items[0].stock.takenAt, lineR.stock.takenAt);
  ok(`#${r} paid, made (stock taken once), then fully refunded (Rs. ${refundable}): 0 new stock movements, every ingredient's stock the same, the line unchanged`);

  console.log('\n9. Cancelled while cooking: the kitchen chooses Finish & keep, or Stop (spoilt = wastage, not started = nothing)');
  /** A karahi 1 kg the kitchen has started; the owner cancels it on Online Orders (the box says the kitchen decides). */
  async function cancelWhileCooking(reason) {
    await pos.bringToFront();
    await pos.getByRole('button', { name: 'New bill', exact: true }).click();
    const n = await order(pos, [['Chicken Karahi', '1 kg']]);
    await chef.bringToFront();
    await ticketOf(chef, n).getByRole('button', { name: 'Start', exact: true }).click();
    await chef.locator(`main [data-kds-order="${n}"][data-kds-ticket="PREPARING"]`).first().waitFor();
    await counter.bringToFront();
    await counter.locator(`main [data-order-number="${n}"]`).getByRole('button', { name: 'Cancel order', exact: true }).click();
    await dialog(counter).getByText('still cooking — the kitchen chooses Finish & keep or Stop.', { exact: false }).waitFor();
    assert.equal(await dialog(counter).getByRole('radio').count(), 0, 'nothing to choose at the counter: not made yet');
    await dialog(counter).getByRole('textbox').first().fill(reason);
    await dialog(counter).getByRole('button', { name: 'Cancel order', exact: true }).click();
    await dialog(counter).waitFor({ state: 'detached' });
    const d1 = await saved(counter);
    const line = lineOf(d1, n);
    assert.equal(line.stock.takenAt, null, 'nothing taken at the cancel');
    assert.deepEqual(netOf(d1, line.id), {});
    await chef.bringToFront();
    const card = chef.locator(`main [data-kds-order="${n}"][data-kds-cancelled]`).first();
    await card.waitFor();
    assert.match(await card.locator('[data-cancelled-line]').innerText(), new RegExp(`CANCELLED while cooking: ${reason}`));
    return { n, card, itemId: line.id };
  }

  const keep = await cancelWhileCooking('Customer changed mind');
  await shot(chef, '11-tablet-cancelled-while-cooking');
  await keep.card.getByRole('button', { name: 'Finish & keep', exact: true }).click();
  await keep.card.waitFor({ state: 'detached' });
  data = await saved(chef);
  const lineK = lineOf(data, keep.n);
  assert.equal(lineK.stock.how, 'KEEP');
  assert.equal(lineK.stock.outcome.kind, 'AVAILABLE');
  assert.ok(close(netOf(data, lineK.id), expected), 'the raw stock taken once when it is finished');
  const kept = data.inventory.availableFood.find((f) => f.fromItemId === lineK.id);
  assert.equal(kept.remaining, 1);
  ok(`#${keep.n} cancelled while cooking → KDS card "CANCELLED while cooking" → Finish & keep: raw taken once, 1 × karahi 1 kg in Available Food; the card leaves the KDS`);

  const spoilt = await cancelWhileCooking('Wrong order');
  await spoilt.card.getByRole('button', { name: 'Stop', exact: true }).click();
  await dialog(chef).getByRole('checkbox', { name: 'Some was already cooked and is spoilt (wastage)' }).check();
  await dialog(chef).getByRole('combobox').selectOption('Not safe to keep');
  await shot(chef, '12-tablet-stop-spoilt');
  await dialog(chef).getByRole('button', { name: 'Stop', exact: true }).click();
  await spoilt.card.waitFor({ state: 'detached' });
  data = await saved(chef);
  const lineS = lineOf(data, spoilt.n);
  assert.equal(lineS.stock.outcome.kind, 'WASTE');
  assert.ok(close(netOf(data, lineS.id), expected), 'what was cooked and spoilt leaves the stock once');
  assert.equal(data.inventory.foodWaste.find((w) => w.dailyNumber === spoilt.n).reason, 'Not safe to keep');
  assert.equal(data.inventory.availableFood.filter((f) => f.fromItemId === lineS.id).length, 0, 'spoilt food is never reused');
  ok(`#${spoilt.n} Stop + "spoilt": wastage "Not safe to keep" with its cost; raw taken once; never reused`);

  const stopped = await cancelWhileCooking('Customer left early');
  const wasteCount = data.inventory.foodWaste.length;
  await stopped.card.getByRole('button', { name: 'Stop', exact: true }).click();
  await dialog(chef).getByRole('button', { name: 'Stop', exact: true }).click();
  await stopped.card.waitFor({ state: 'detached' });
  data = await saved(chef);
  const lineX = lineOf(data, stopped.n);
  assert.equal(lineX.stock.outcome.kind, 'STOPPED');
  assert.deepEqual(netOf(data, lineX.id), {}, 'not cooked: nothing taken');
  assert.equal(data.inventory.foodWaste.length, wasteCount, 'no wastage');
  assert.equal((data.inventory.wasteEvents ?? []).filter((ev) => ev.source === 'ORDER_CANCEL' || ev.source === 'AVAILABLE_FOOD').length, data.inventory.foodWaste.length, 'W2: every order-food wastage is in the Waste Log exactly once');
  ok(`#${stopped.n} Stop (nothing spoilt): no stock taken, no wastage`);

  assert.deepEqual(errors, [], `page errors: ${errors.join(' | ')}`);
  console.log('\nSales stock walkthrough passed.');
} finally {
  await browser.close();
}

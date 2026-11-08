// Kitchen / KDS for a budget landscape Android tablet (owner's picture and brief, 2026-11-08): compact tickets so 6–9 orders fit on
// one screen; three columns New, Preparing, Ready; order number, type, table, timer, item, size chip, quantity, notes; big Start /
// Ready buttons; a long order opens for its other lines. UI only: the same tickets, statuses and Undo as before.
// Ten orders are placed through the POS on his Lala demo data, then the chef starts and finishes some of them.
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:kds
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'kds');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), chef: id(106), superWaiter: id(104), serviceWaiter: id(105) };
const DATA_KEY = 'lala-os-demo-data';
const TABLET = { width: 1280, height: 800 };
const SMALL_TABLET = { width: 1024, height: 600 };
const PHONE = { width: 390, height: 844 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
// A kitchen tablet keeps the sidebar folded to its icons (Collapse, remembered in this browser)
await context.addInitScript(() => window.localStorage.setItem('lala-os-sidebar-collapsed', '1'));
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
const dialog = (page) => page.getByRole('dialog');
const bill = (page) => page.locator('main [data-pos-bill]');
const tickets = (page, status) => page.locator(`main [data-kds-ticket="${status}"]`);
/** Tickets whose whole card is inside the window (nothing to scroll for) */
const fullyVisible = (page) =>
  page.evaluate(() => [...document.querySelectorAll('main [data-kds-ticket]')].filter((el) => el.getBoundingClientRect().bottom <= window.innerHeight).length);

/** One takeaway order at the counter: [name, size, quantity, note] per line, then Send to Kitchen. */
async function order(pos, lines) {
  for (const [name, size, quantity = 1, note = ''] of lines) {
    await pos.getByRole('button', { name: new RegExp(`^${name}`) }).first().click();
    if (size) await dialog(pos).getByRole('button', { name: new RegExp(`^${size}`) }).click();
    for (let n = 1; n < quantity; n += 1) await dialog(pos).getByRole('button', { name: /more|increase|\+/i }).last().click();
    if (note) await dialog(pos).getByPlaceholder('e.g. no onion').fill(note);
    await dialog(pos).getByRole('button', { name: /^Add ·/ }).click();
    await dialog(pos).waitFor({ state: 'detached' });
  }
  await bill(pos).getByRole('button', { name: 'Send to Kitchen' }).click();
  await pos.getByText(/Order #\d+/).first().waitFor();
  await pos.getByRole('button', { name: 'New bill', exact: true }).click();
}

try {
  console.log('\n1. Ten orders from the POS (one long one), all for the Karahi, BBQ, Hot Kitchen and Tandoor stations');
  const pos = await openAs(USER.owner, '/pos', TABLET);
  await order(pos, [['Chicken Karahi', '1 kg'], ['Roti', null, 4]]);
  await order(pos, [['Chicken White Karahi', '½ kg', 1, 'less spicy'], ['Naan', null, 2]]);
  await order(pos, [['Mutton Karahi', '½ kg'], ['Roti', null, 3]]);
  await order(pos, [['Daal Mash'], ['Mix Sabzi']]);
  await order(pos, [['Chicken Karahi', '1 kg', 1, 'extra makhan on top']]);
  await order(pos, [['Fish Fry', '1 kg']]);
  await order(pos, [['Chicken Tikka', null, 2], ['Seekh Kabab', null, 2]]);
  await order(pos, [['Malai Boti']]);
  // A long order for the Karahi station: five lines on one ticket
  await order(pos, [['Mutton Karahi', '1 kg', 1, 'no green chilli'], ['Chicken Karahi', 'Pao'], ['Chicken White Karahi', '1 kg'], ['Mutton White Karahi', '½ kg'], ['Chicken Karahi', '½ kg']]);
  await order(pos, [['Daal Chana'], ['Roti', null, 2]]);
  ok('10 takeaway orders sent from the POS');

  console.log('\n2. The chef starts some and finishes some (same buttons and statuses as before)');
  const chef = await openAs(USER.chef, '/kitchen', TABLET);
  await chef.getByRole('tab', { name: /^All stations/ }).click();
  await tickets(chef, 'NEW').first().waitFor();
  const start = async (n) => {
    for (let i = 0; i < n; i += 1) {
      const before = await tickets(chef, 'PREPARING').count();
      await tickets(chef, 'NEW').first().getByRole('button', { name: 'Start', exact: true }).click();
      await chef.waitForFunction((count) => document.querySelectorAll('main [data-kds-ticket="PREPARING"]').length > count, before);
    }
  };
  const finish = async (n) => {
    for (let i = 0; i < n; i += 1) {
      const before = await tickets(chef, 'READY').count();
      await tickets(chef, 'PREPARING').first().getByRole('button', { name: 'Ready', exact: true }).click();
      await chef.waitForFunction((count) => document.querySelectorAll('main [data-kds-ticket="READY"]').length > count, before);
    }
  };
  await start(7);
  await finish(3);
  const counts = { NEW: await tickets(chef, 'NEW').count(), PREPARING: await tickets(chef, 'PREPARING').count(), READY: await tickets(chef, 'READY').count() };
  assert.ok(counts.NEW >= 3 && counts.PREPARING >= 3 && counts.READY >= 3, JSON.stringify(counts));
  await tickets(chef, 'READY').first().getByRole('button', { name: /^Undo/ }).waitFor();
  ok(`New ${counts.NEW}, Preparing ${counts.PREPARING}, Ready ${counts.READY}; Ready tickets keep Undo for 2 minutes`);

  console.log('\n3. One screen of a 1280 × 800 tablet');
  await chef.evaluate(() => window.scrollTo(0, 0));
  const visible = await fullyVisible(chef);
  assert.ok(visible >= 6, `at least 6 whole tickets on one screen, got ${visible}`);
  const button = await tickets(chef, 'NEW').first().getByRole('button', { name: 'Start', exact: true }).boundingBox();
  assert.ok(button.height >= 44 && button.width >= 88, `Start is touch-friendly: ${button.width} × ${button.height}`);
  assert.ok(await chef.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll');
  await shot(chef, '01-tablet-1280x800');
  ok(`${visible} whole tickets on one 1280 × 800 screen; Start ${Math.round(button.width)} × ${Math.round(button.height)} px`);

  console.log('\n4. A long order opens for its other lines');
  const long = chef.locator('main [data-kds-ticket]', { hasText: 'no green chilli' }).first();
  await long.scrollIntoViewIfNeeded();
  await long.getByRole('button', { name: '+ 2 more' }).click();
  assert.equal(await long.locator('[data-kds-line]').count(), 5);
  await long.getByText('“no green chilli”').waitFor();
  await shot(chef, '02-tablet-long-order-open');
  await long.getByRole('button', { name: 'Show less' }).click();
  assert.equal(await long.locator('[data-kds-line]').count(), 3);
  ok('5 lines on one ticket: 3 shown with "+ 2 more"; opened, all 5 with the note; "Show less" folds it again');

  console.log('\n5. Smaller 1024 × 600 tablet and a phone');
  const small = await openAs(USER.chef, '/kitchen', SMALL_TABLET);
  await tickets(small, 'NEW').first().waitFor();
  assert.ok(await small.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at 1024 × 600');
  const smallVisible = await fullyVisible(small);
  await shot(small, '03-tablet-1024x600');
  const phone = await openAs(USER.chef, '/kitchen', PHONE);
  await tickets(phone, 'NEW').first().waitFor();
  assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll on a phone');
  await shot(phone, '04-phone');
  ok(`1024 × 600: ${smallVisible} whole tickets on the first screen, no sideways scroll; phone: one column`);

  console.log('\n6. Full screen: in, the bars fold away; out again');
  await chef.bringToFront();
  const toggle = chef.locator('main [data-fullscreen-toggle]');
  await toggle.click();
  await chef.waitForFunction(() => document.fullscreenElement !== null && document.documentElement.hasAttribute('data-kds-fullscreen'));
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await toggle.getAttribute('aria-label'), 'Exit full screen');
  assert.equal(await chef.locator('.kds-chrome').first().evaluate((el) => getComputedStyle(el).display), 'none', 'sidebar and top bar folded away');
  await shot(chef, '05-tablet-full-screen');
  await toggle.click();
  await chef.waitForFunction(() => document.fullscreenElement === null && !document.documentElement.hasAttribute('data-kds-fullscreen'));
  assert.equal(await toggle.getAttribute('aria-label'), 'Full screen');
  ok('full screen on (only the KDS, button "Exit full screen"), then off (bars back)');

  console.log('\n7. Dine-in: Ready → the Service Waiter and the Super Waiter both hear it → Picked up → Served apart');
  const tableId = (await saved(chef)).tables.find((tb) => tb.name === 'T2' && !tb.archivedAt).id;
  const superWaiter = await openAs(USER.superWaiter, `/waiter?table=${tableId}`, PHONE);
  const serviceWaiter = await openAs(USER.serviceWaiter, '/waiter', PHONE);
  await superWaiter.bringToFront();
  await superWaiter.getByRole('tab', { name: /^Order/ }).click();
  await superWaiter.getByRole('button', { name: 'Guests +' }).click();
  await superWaiter.getByRole('tab', { name: 'Menu' }).click();
  await superWaiter.getByRole('button', { name: /^Mix Sabzi/ }).first().click();
  await dialog(superWaiter).getByRole('button', { name: /^Add ·/ }).click();
  await superWaiter.getByRole('tab', { name: /^Order/ }).click();
  await superWaiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await superWaiter.getByText(/sent to the kitchen/).first().waitFor();
  await chef.bringToFront();
  const t2 = () => chef.locator('main [data-kds-ticket]', { hasText: 'T2' }).first();
  await t2().getByRole('button', { name: 'Start', exact: true }).click();
  await t2().getByRole('button', { name: 'Ready', exact: true }).click();
  await t2().and(chef.locator('[data-kds-ticket="READY"]')).waitFor();
  await serviceWaiter.getByText('T2 — Hot Kitchen ready').first().waitFor({ timeout: 8_000 });
  await superWaiter.getByText('T2 — Hot Kitchen ready').first().waitFor({ timeout: 8_000 });
  ok('Ready on the KDS: "T2 — Hot Kitchen ready" on the Service Waiter\'s phone AND on the Super Waiter\'s phone');

  await serviceWaiter.bringToFront();
  await serviceWaiter.getByRole('button', { name: 'Picked up', exact: true }).first().click();
  await serviceWaiter.getByText('Picked up from the kitchen: serve it at the table.').first().waitFor();
  await chef.bringToFront();
  await t2().and(chef.locator('[data-kds-pickup="TICKET"]')).waitFor();
  assert.match(await t2().locator('[data-pickup-line]').innerText(), /Picked up · Usman Tariq · hides in [45]:\d\d/);
  await shot(chef, '06-tablet-picked-up-hides-in');
  await t2().getByRole('button', { name: /Undo the pickup/ }).click();
  await chef.locator('main [data-kds-ticket="READY"]:not([data-kds-pickup])', { hasText: 'T2' }).waitFor();
  await serviceWaiter.bringToFront();
  await serviceWaiter.getByRole('button', { name: 'Picked up', exact: true }).first().click();
  await chef.bringToFront();
  await t2().and(chef.locator('[data-kds-pickup="TICKET"]')).waitFor();
  let data = await saved(chef);
  let ticket = data.orders.flatMap((o) => o.tickets).find((tk) => tk.pickedUpAt);
  assert.equal(ticket.status, 'READY', 'Picked up is not Served');
  assert.equal(ticket.pickedUpBy, USER.serviceWaiter);
  ok('Service Waiter: Picked up → KDS "Picked up · Usman Tariq · hides in 4:5x"; Undo on the KDS puts it back; picked up again; still READY (not Served)');

  console.log('\n8. Five minutes later the card is gone (also after a reload); the order and its history stay');
  const later = await context.newPage();
  later.on('pageerror', (e) => errors.push(e.message));
  await later.clock.install({ time: Date.now() + 5 * 60_000 + 5_000 });
  await later.setViewportSize(TABLET);
  await later.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, USER.chef]);
  await later.goto(`${BASE_URL}/kitchen`, { waitUntil: 'networkidle' });
  await tickets(later, 'NEW').first().waitFor();
  assert.equal(await later.locator('main [data-kds-ticket]', { hasText: 'T2' }).count(), 0, 'hidden 5 minutes after the pickup, also after a fresh load');
  await serviceWaiter.bringToFront();
  await serviceWaiter.getByRole('button', { name: 'Served', exact: true }).first().click();
  await serviceWaiter.waitForFunction((key) => JSON.parse(window.localStorage.getItem(key)).orders.some((o) => o.tickets.some((tk) => tk.status === 'SERVED' && tk.pickedUpAt)), DATA_KEY);
  data = await saved(serviceWaiter);
  const servedOrder = data.orders.find((o) => o.tickets.some((tk) => tk.id === ticket.id));
  ticket = servedOrder.tickets.find((tk) => tk.id === ticket.id);
  assert.ok(ticket.readyAt && ticket.pickedUpAt && ticket.servedAt, 'Ready, Picked up and Served times kept');
  assert.equal(servedOrder.items.filter((i) => i.ticketId === ticket.id).length, 1, 'items kept');
  ok('5 minutes later the T2 card is gone on a fresh load; the waiter then serves it; Ready, Picked up and Served times all kept');

  console.log('\n9. Food nobody picks up stays, with a warning after 10 minutes and a reminder to the waiters');
  const reminder = await context.newPage();
  reminder.on('pageerror', (e) => errors.push(e.message));
  await reminder.clock.install({ time: Date.now() });
  await reminder.setViewportSize(PHONE);
  await reminder.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, USER.serviceWaiter]);
  await reminder.goto(`${BASE_URL}/waiter`, { waitUntil: 'networkidle' });
  await superWaiter.bringToFront();
  await superWaiter.getByRole('tab', { name: 'Menu' }).click();
  await superWaiter.getByRole('button', { name: /^Mix Sabzi/ }).first().click();
  await dialog(superWaiter).getByRole('button', { name: /^Add ·/ }).click();
  await superWaiter.getByRole('tab', { name: /^Order/ }).click();
  await superWaiter.getByRole('button', { name: 'Send to kitchen' }).click();
  await superWaiter.getByText(/sent to the kitchen/).last().waitFor();
  await chef.bringToFront();
  const waitingCard = () => chef.locator('main [data-kds-ticket]:not([data-kds-pickup])', { hasText: 'T2' }).first();
  await waitingCard().getByRole('button', { name: 'Start', exact: true }).click();
  await waitingCard().getByRole('button', { name: 'Ready', exact: true }).click();
  const late = await context.newPage();
  await late.clock.install({ time: Date.now() + 10 * 60_000 + 5_000 });
  await late.setViewportSize(TABLET);
  await late.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, USER.chef]);
  await late.goto(`${BASE_URL}/kitchen`, { waitUntil: 'networkidle' });
  const stillThere = late.locator('main [data-kds-pickup="WAITING"]', { hasText: 'T2' }).first();
  await stillThere.waitFor();
  assert.match(await stillThere.locator('[data-waiting-line]').innerText(), /Not picked up · 10 min/);
  assert.ok((await late.locator('main [data-kds-pickup="WAITING"]').count()) >= 2, 'the takeaway orders nobody collected stay too');
  await stillThere.scrollIntoViewIfNeeded();
  await shot(late, '07-tablet-not-picked-up-10-min');
  await reminder.bringToFront();
  await reminder.clock.fastForward('10:30');
  await reminder.getByText('T2 — Hot Kitchen still waiting at the pass (10 min)').first().waitFor({ timeout: 8_000 });
  ok('Ready and not picked up: after 10 minutes the card stays with "Not picked up · 10 min" (old takeaways too); the Service Waiter is reminded');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nKDS walkthrough passed.');
} catch (err) {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
} finally {
  await browser.close();
}

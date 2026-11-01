// Clicks through the Rider App on its sample data in the installed Microsoft Edge (`pnpm dev` must run): what a rider
// does on a phone. The link with Restaurant OS is checked in restaurant-os `walkthrough:riders`.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.RIDER_URL ?? 'http://localhost:3002';
const LALA = `${BASE}/lala-restaurant/main`;
const AZIZ = `${BASE}/aziz-pizza/main`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'screenshots', 'rider');
mkdirSync(OUT, { recursive: true });

let passed = 0;
function check(name, ok, detail = '') {
  if (!ok) throw new Error(`FAILED: ${name} ${detail}`);
  passed += 1;
  console.log(`  ok  ${name}`);
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const phoneAt = (width, height = 844) => ({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const phone = phoneAt(390);

async function newRider(options = phone) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const button = (page, name) => page.getByRole('button', { name, exact: true });
const login = async (page, name) => {
  await page.locator(`[data-login-account="${name}"]`).click();
  await button(page, 'Login').click();
  await page.locator('[data-availability]').waitFor();
};
const card = (page, n) => page.locator(`[data-delivery="${n}"]`);
const cards = (page) => page.locator('[data-delivery]').evaluateAll((els) => els.map((e) => e.dataset.delivery).join());
const stat = async (page, key) => (await page.locator(`[data-stat="${key}"] [data-stat-value]`).innerText()).trim();
const today = async (page, key) => (await page.locator(`[data-today="${key}"] [data-value]`).innerText()).trim();
const historyRows = (page) => page.locator('[data-history-row]').evaluateAll((els) => els.map((e) => e.dataset.historyRow).join());
const statusOf = (page) => page.locator('main [data-delivery-status]').first().getAttribute('data-delivery-status');
const stageOf = (page) => page.locator('main [data-stage]').first().getAttribute('data-stage');
const sideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** Everything tappable must be at least 44 px; a link stretched over a whole card counts as the card. */
const smallTargets = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('a, button, select, input')]
      .filter((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.height < 44 || box.width < 44);
      })
      .map((el) => el.getAttribute('aria-label') || el.textContent?.trim() || el.tagName),
  );
const nameless = (page) =>
  page.evaluate(() => [...document.querySelectorAll('a, button')].filter((el) => !(el.getAttribute('aria-label') || el.textContent?.trim())).length);
const goodScreen = async (page, label) => {
  check(`${label}: every tap target is at least 44 px`, (await smallTargets(page)).length === 0, (await smallTargets(page)).join(', '));
  check(`${label}: every control has a name`, (await nameless(page)) === 0);
  check(`${label}: no sideways scroll`, (await sideScroll(page)) <= 0);
};
const backHome = (page) => page.getByRole('link', { name: 'Back to deliveries' }).click();

console.log('Login: phone + PIN (DEMO)');
const page = await newRider();
await page.goto(BASE);
await page.waitForURL(LALA);
await page.locator('[data-login-account]').first().waitFor();
check('the start address opens the LALA link and asks to log in', true);
check('the LALA picture is loaded', await page.locator('[data-login] img').first().evaluate((img) => img.complete && img.naturalWidth > 0));
check('phone and PIN fields have names', (await page.getByLabel('Phone Number').count()) === 1 && (await page.getByLabel('PIN / Password').count()) === 1);
check('no sign-up button', (await page.getByRole('button', { name: /sign.?up/i }).count()) === 0 && (await page.getByRole('link', { name: /sign.?up/i }).count()) === 0);
check('it says DEMO, nothing is checked', (await page.locator('[data-demo-accounts]').innerText()).includes('no PIN or password is checked'));
await shot(page, '01-phone-login');
await goodScreen(page, 'Login');
await button(page, 'Login').click();
check('empty phone is refused', (await page.locator('#login-phone-error').innerText()).includes('Enter your phone number'));
check('empty PIN is refused', (await page.locator('#login-pin-error').innerText()).includes('Enter your PIN'));
check('a wrong field is marked for screen readers', (await page.locator('[data-login-phone]').getAttribute('aria-invalid')) === 'true');
await shot(page, '01b-phone-login-errors');
await page.locator('[data-login-phone]').fill('12345');
await page.locator('[data-login-pin]').fill('12');
await button(page, 'Login').click();
check('a wrong phone is refused', (await page.locator('#login-phone-error').innerText()).includes('0300-1234567'));
check('a short PIN is refused', (await page.locator('#login-pin-error').innerText()).includes('at least 6'));
await page.locator('[data-login-pin]').fill('482915');
check('the PIN is hidden', (await page.locator('[data-login-pin]').getAttribute('type')) === 'password');
await button(page, 'Show PIN').click();
check('Show PIN shows it', (await page.locator('[data-login-pin]').getAttribute('type')) === 'text');
await button(page, 'Hide PIN').click();
check('Hide PIN hides it', (await page.locator('[data-login-pin]').getAttribute('type')) === 'password');
await page.locator('[data-login-phone]').fill('+92 300 9999999');
await button(page, 'Login').click();
await page.locator('[data-login] > div [role="alert"]').first().waitFor();
check('an unknown rider is refused', (await page.locator('[data-login]').innerText()).includes('Phone number or PIN is not right'));
await button(page, 'Forgot PIN / Password?').click();
check('Forgot PIN sends the rider to the Owner and says NOT CONNECTED', (await page.locator('[data-forgot]').innerText()).includes('Ask the restaurant Owner') && (await page.locator('[data-forgot]').innerText()).includes('NOT CONNECTED'));
check('new riders are told the Owner creates accounts', (await page.locator('[data-forgot]').innerText()).includes('Owner creates your account'));
await shot(page, '01c-phone-forgot');
await button(page, 'Close').click();
await page.locator('[data-login-phone]').fill('03001234567');
await page.locator('[data-login-pin]').fill('482915');
await button(page, 'Login').click();
await page.locator('[data-availability]').waitFor();
check('any way of typing the number finds the rider', (await page.locator('[data-rider-name]').innerText()) === 'Usman Ali');

console.log('Home: the picture');
check('Rider and branch are in the header', (await page.locator('header').first().innerText()).includes('Rider • Main Branch'));
check('three counts', (await stat(page, 'active')) === '1' && (await stat(page, 'upcoming')) === '2' && (await stat(page, 'completed')) === '2');
check('New Orders is first, with its count', (await button(page, 'New Orders (2)').getAttribute('aria-pressed')) === 'true');
check('new orders in number order', (await cards(page)) === '1061,1062');
const first = await card(page, 1061).innerText();
check('a COD card: area, distance, time, amount, COD', first.includes('Gulshan Block 7') && first.includes('3.4 km') && first.includes('12 min') && first.includes('Rs. 1,350') && first.includes('COD') && first.includes('New'));
const second = await card(page, 1062).innerText();
check('a paid card says Paid and shows the total', second.includes('Rs. 950') && second.includes('Paid'));
check('Home shows no customer name or phone', !(await page.locator('main').innerText()).includes('Sara Malik') && !(await page.locator('main').innerText()).includes('0300-0000404'));
check('the bell counts new orders', (await page.locator('[data-new-count]').getAttribute('data-new-count')) === '2');
check('four tabs in the bottom bar', (await page.locator('[data-bottom-nav] a').allInnerTexts()).join() === 'Home,Orders,Earnings,Profile');
check('Home is lit', (await page.getByRole('link', { name: 'Home' }).getAttribute('aria-current')) === 'page');
check('sample data is marked', (await page.locator('[data-demo-source]').getAttribute('data-demo-source')) === 'SAMPLE');
await shot(page, '02-phone-home-new-orders');
await goodScreen(page, 'Home');
await button(page, 'My Orders').click();
check('My Orders holds what is with the rider', (await cards(page)) === '1058');
check('it shows the limit of 3', (await page.locator('[data-capacity]').getAttribute('data-capacity')) === '1/3');
check('it says up to 3', (await page.locator('main').innerText()).includes('up to 3 deliveries'));
await shot(page, '03-phone-home-my-orders');
await goodScreen(page, 'My Orders');
await page.getByRole('button', { name: /Notifications/ }).click();
check('the bell opens New Orders', (await cards(page)) === '1061,1062');
await page.getByRole('button', { name: 'What does DEMO mean here?' }).click();
check('DEMO explains itself', (await page.getByRole('dialog').innerText()).includes('sample numbers, not GPS'));
await button(page, 'Close').click();

console.log('My Active Deliveries (Orders tab)');
await page.getByRole('link', { name: 'Orders' }).click();
await page.locator('[data-capacity-info]').waitFor();
check('the title shows 1/3', (await page.getByRole('heading', { level: 1 }).innerText()).includes('My Active Deliveries') && (await page.locator('[data-capacity]').getAttribute('data-capacity')) === '1/3');
const drop = await page.locator('[data-active-delivery="1058"]').innerText();
check('drop number, order, customer, area, badge, distance', drop.includes('#1058') && drop.includes('Ali Khan') && drop.includes('Block 3, Gulshan') && drop.includes('On the Way') && drop.includes('2.1 km') && (await page.locator('[data-active-delivery="1058"] [data-drop="1"]').count()) === 1);
check('it says the limit is not server-checked yet', (await page.locator('[data-capacity-info]').innerText()).includes('comes with the backend'));
check('orders waiting for pick up are listed apart', (await cards(page)) === '1061,1062');
check('Orders is lit', (await page.getByRole('link', { name: 'Orders' }).getAttribute('aria-current')) === 'page');
await shot(page, '04-phone-active-deliveries');
await goodScreen(page, 'My Active Deliveries');

console.log('Live Tracking: DEMO map');
await page.locator('[data-active-delivery="1058"]').click();
await page.locator('[data-tracking]').click();
await page.locator('[data-demo-map]').waitFor();
check('the map says DEMO MAP and not your location', (await page.locator('[data-demo-map-label]').innerText()).includes('DEMO MAP') && (await page.locator('[data-demo-map-label]').innerText()).includes('not your location'));
check('the card: who, distance, ETA, marked sample', (await page.locator('[data-tracking-name]').innerText()).includes('Ali Khan') && (await page.locator('main [data-away]').innerText()).includes('2.1 km') && (await page.locator('main [data-away]').innerText()).includes('ETA 8 min') && (await page.locator('main').innerText()).includes('not GPS'));
check('Navigate is the free Google Maps link', (await page.locator('[data-navigate]').getAttribute('href')).startsWith('https://www.google.com/maps/search/?api=1&query=') && (await page.locator('[data-navigate]').getAttribute('target')) === '_blank');
check('no bottom bar on the map', (await page.locator('[data-bottom-nav]').count()) === 0);
await shot(page, '04b-phone-live-tracking');
await goodScreen(page, 'Live Tracking');
await page.getByRole('button', { name: 'Find my location' }).click();
await page.getByText('DEMO: GPS is not connected yet.').waitFor();
check('the location button never pretends', true);
await page.locator('[data-back]').click();
await page.locator('[data-tracking]').waitFor();
check('back returns to the order', page.url().includes('/delivery/') && !page.url().includes('/tracking'));
await backHome(page);

console.log('Today Summary (Earnings tab): earnings and COD cash stay apart');
await page.getByRole('link', { name: 'Earnings' }).click();
await page.locator('[data-earnings-card]').waitFor();
check('today, as in the picture', (await page.locator('[data-earnings-total]').innerText()) === 'Rs. 1,650' && (await page.locator('[data-earnings-card]').innerText()).includes("Today's Earnings"));
check('fees + tips + bonus = total', (await today(page, 'fees')) === 'Rs. 1,000' && (await today(page, 'tips')) === 'Rs. 200' && (await today(page, 'bonus')) === 'Rs. 450' && (await today(page, 'total')) === 'Rs. 1,650');
check('marked DEMO', (await page.locator('[data-earnings-status="DEMO"]').innerText()).includes('DEMO'));
check('deliveries completed', (await today(page, 'delivered')) === '2');
const cash = await page.locator('[data-cash-card]').innerText();
check('COD cash is its own card and says it is not earnings', cash.includes('not your earnings') && cash.includes('Cash to Deposit'));
check('cash numbers: collected, given, to deposit', (await today(page, 'collected')) === 'Rs. 3,000' && (await today(page, 'settled')) === 'Rs. 1,650' && (await today(page, 'withMe')) === 'Rs. 1,350');
check('COD cash is not inside the earnings rows', (await page.locator('[data-earnings-card] [data-today="collected"]').count()) === 0);
check('Earnings is lit', (await page.getByRole('link', { name: 'Earnings' }).getAttribute('aria-current')) === 'page');
await shot(page, '04c-phone-today-summary');
await goodScreen(page, 'Today Summary');
await page.locator('[data-day]').selectOption({ index: 1 });
await page.waitForFunction(() => document.querySelector('[data-earnings-total]')?.textContent === 'Rs. 1,250');
check('another day has its own numbers', (await today(page, 'delivered')) === '3' && (await today(page, 'collected')) === 'Rs. 3,050' && (await today(page, 'withMe')) === 'Rs. 0');
check('another day is not called today', !(await page.locator('[data-earnings-card]').innerText()).includes("Today's"));
await page.locator('[data-day]').selectOption({ index: 5 });
await page.locator('[data-earnings-status="NONE"]').waitFor();
check('a day without data says so', (await today(page, 'delivered')) === '0');

console.log('Delivery History');
await page.getByRole('link', { name: 'Delivery History' }).click();
await page.locator('[data-history-row]').first().waitFor();
check('today, newest first', (await historyRows(page)) === '1060,1059');
check('history shows the area', (await page.locator('main').innerText()).includes('Canal View') && (await page.locator('main').innerText()).includes('Model Town'));
check('no customer name or phone', !(await page.locator('main').innerText()).includes('Hina') && !(await page.locator('main').innerText()).includes('0300-'));
check('Earnings stays lit', (await page.getByRole('link', { name: 'Earnings' }).getAttribute('aria-current')) === 'page');
await shot(page, '04d-phone-history');
await goodScreen(page, 'Delivery History');
await button(page, 'Yesterday').click();
check('yesterday', (await historyRows(page)) === '1043,1042,1041');
check('an old sample cannot be opened', (await page.locator('a[data-history-row]').count()) === 0);
await button(page, 'COD').click();
check('COD only', (await historyRows(page)) === '1043,1041');
await button(page, 'Paid').click();
check('Paid only', (await historyRows(page)) === '1042');
await button(page, 'Date').click();
await button(page, 'All').click();
check('a date', (await historyRows(page)) === '1028,1027');
await page.locator('[data-history-date]').fill('2020-01-01');
await page.locator('[data-empty-state]').waitFor();
check('a day with nothing says so', (await page.locator('[data-empty-state]').innerText()).includes('No deliveries here'));
await goodScreen(page, 'Delivery History by date');
await button(page, 'Today').click();
await page.locator('a[data-history-row="1060"]').click();
await page.locator('[data-money="DONE"]').waitFor();
check("today's delivery opens", page.url().includes('/delivery/'));
await page.goto(`${LALA}/delivery/lala-restaurant-2/tracking`);
await page.getByText('This order is delivered').waitFor();
check('a delivered order has nothing to track', (await page.locator('[data-demo-map]').count()) === 0);
await page.goto(`${LALA}/delivery/nothing/tracking`);
await page.getByRole('heading', { name: 'Delivery not found', level: 2 }).or(page.getByText('This delivery is no longer yours')).first().waitFor();
check('a wrong tracking link says not found', (await page.locator('[data-demo-map]').count()) === 0);
await page.goto(LALA);
await page.locator('[data-availability]').waitFor();

console.log('Another restaurant on the same app: Aziz Pizza');
const az = await newRider();
await az.goto(AZIZ);
await az.locator('[data-login]').waitFor();
await az.locator('[data-login-account]').first().waitFor();
check('riders of this restaurant only', (await az.locator('[data-login-account]').count()) === 3);
check('no LALA picture here', (await az.locator('[data-login] img').count()) === 0);
await az.locator('[data-login-account="Zubair Khan"]').click();
await button(az, 'Login').click();
await az.getByText('This account is disabled').waitFor();
check('a disabled rider cannot log in', (await az.locator('[data-availability]').count()) === 0);
await login(az, 'Faisal Riaz');

console.log('Online / Offline: a running delivery keeps the rider Online');
await az.getByRole('switch', { name: 'Online' }).click();
await az.locator('[data-toast="error"]').waitFor();
check('refused while deliveries are running', (await az.locator('[data-toast="error"]').innerText()).includes('Finish your running deliveries'));
check('still Online', (await az.locator('[data-availability]').getAttribute('data-availability')) === 'ONLINE');

console.log('Order details: call, map, items, money');
await card(az, 11).click();
await az.locator('[data-amount-to-collect]').waitFor();
check('the title is the order number', (await az.getByRole('heading', { level: 1 }).innerText()) === 'Order #11');
check('the amount to collect is big and right', (await az.locator('[data-amount-to-collect]').innerText()) === 'Rs. 1,350');
check('COD is written out', (await az.locator('[data-money="COLLECT"]').innerText()).includes('COD (Cash on Delivery)'));
check('tap to call the customer', (await az.locator('[data-call]').getAttribute('href')) === 'tel:0300-0000201');
check('tap to call the restaurant', (await az.locator('[data-call-restaurant]').getAttribute('href')) === 'tel:0300-0000100');
const map = await az.locator('[data-map]').getAttribute('href');
check('address opens the free Google Maps link', map === `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('House 12, Street 3, Gulberg III, Lahore')}`);
const body = await az.locator('main').innerText();
check('items with their saved prices, and the note', body.includes('1 × Classic Pizza (Medium)') && body.includes('Rs. 1,000') && body.includes('Ring the bell twice'));
check('the rest of the total is one line, so the sum is honest', (await az.locator('[data-charges]').innerText()).includes('Rs. 225'));
check('total the customer pays', (await az.locator('[data-order-total]').innerText()) === 'Rs. 1,350');
check('stepper: Assign done, Pick Up next', (await az.locator('main ol [aria-current="step"]').innerText()) === 'Pick Up');
check('one big button: the next step', (await button(az, 'Pick Up Order').count()) === 1 && (await button(az, 'Start Delivery').count()) === 0 && (await button(az, 'Mark Delivered').count()) === 0);
check('no Accept button', (await az.getByRole('button', { name: /accept/i }).count()) === 0);
check('no tracking before the food is with the rider', (await az.locator('[data-tracking]').count()) === 0);
check('no bottom bar on an open order', (await az.locator('[data-bottom-nav]').count()) === 0);
await shot(az, '05-phone-order-pick-up');
await goodScreen(az, 'Order details');

console.log('Pick Up → Start Delivery → Mark Delivered + cash');
await button(az, 'Pick Up Order').dblclick();
await button(az, 'Start Delivery').waitFor();
check('Picked Up shows, and a double tap did not run the next step', (await stageOf(az)) === 'PICKED_UP');
check('the order status did not change', (await statusOf(az)) === 'RIDER_ASSIGNED');
await shot(az, '06-phone-order-picked-up');
await az.reload();
await button(az, 'Start Delivery').waitFor();
check('a reload keeps Picked Up', (await stageOf(az)) === 'PICKED_UP');
await backHome(az);
await card(az, 12).waitFor();
check('with no new orders Home opens on My Orders', (await az.locator('[data-capacity]').getAttribute('data-capacity')) === '2/3');
check('Picked Up badge on the card', (await card(az, 11).innerText()).includes('Picked Up'));
check('On the Way badge on the card', (await card(az, 12).innerText()).includes('On the Way'));
check('the one on the way comes first', (await cards(az)) === '12,11');
await shot(az, '07-phone-home-two-with-rider');
await card(az, 11).click();
await button(az, 'Start Delivery').dblclick();
await button(az, 'Mark Delivered').waitFor();
check('on the way, a double tap did not open the cash question', (await statusOf(az)) === 'OUT_FOR_DELIVERY' && (await az.getByRole('dialog').count()) === 0);
await shot(az, '08-phone-order-on-the-way');
await button(az, 'Mark Delivered').click();
const confirm = await az.locator('[data-confirm-text]').innerText();
check('asks Customer Pay and Cash Collected first', /Customer Pay\s*Rs\. 1,350/.test(confirm) && /Cash Collected\s*Rs\. 1,350/.test(confirm));
check('it says the cash is not earnings', confirm.includes('it is not your earnings') && confirm.includes('DEMO'));
await shot(az, '09-phone-delivered-confirm');
await button(az, 'Cancel').click();
check('Cancel changes nothing', (await statusOf(az)) === 'OUT_FOR_DELIVERY');
await button(az, 'Mark Delivered').click();
await button(az, 'Confirm Delivery').dblclick();
await az.locator('[data-money="DONE"]').waitFor();
check('delivered, cash noted, once on a double tap', (await az.locator('[data-money="DONE"]').innerText()).includes('Rs. 1,350'));
check('all four steps are done and no big button is left', (await az.locator('main ol [aria-current="step"]').count()) === 0 && (await button(az, 'Mark Delivered').count()) === 0);
await shot(az, '10-phone-delivered');
await az.reload();
await az.locator('[data-money="DONE"]').waitFor();
check('a reload keeps the login and the delivery', (await statusOf(az)) === 'DELIVERED');

console.log('Earnings tab: the day after these deliveries');
await backHome(az);
await az.getByRole('link', { name: 'Earnings' }).click();
await az.locator('[data-today="delivered"]').waitFor();
check('deliveries done', (await today(az, 'delivered')) === '3');
check('cash collected', (await today(az, 'collected')) === 'Rs. 4,500');
check('cash given', (await today(az, 'settled')) === 'Rs. 1,650');
check('cash still with the rider', (await today(az, 'withMe')) === 'Rs. 2,850');
await shot(az, '11-phone-today');
await goodScreen(az, 'Today');
await button(az, 'DEMO: I gave the cash to the restaurant').click();
await button(az, 'DEMO: I gave the cash to the restaurant').waitFor({ state: 'detached' });
check('after handing over no cash is left with the rider', (await today(az, 'withMe')) === 'Rs. 0');

console.log('New assignment: message, vibration');
await az.getByRole('link', { name: 'Home' }).click();
await az.evaluate(() => {
  window.vibrations = [];
  navigator.vibrate = (pattern) => window.vibrations.push(pattern);
});
await button(az, 'DEMO: give me a new order').click();
await az.locator('[data-new-delivery="16"]').waitFor();
check('a new order shows a message', (await az.locator('[data-new-delivery="16"]').innerText()).includes('New order #16'));
check('and vibrates', (await az.evaluate(() => window.vibrations.length)) === 1);
await shot(az, '12-phone-new-order');
await az.locator('[data-new-delivery="16"]').getByRole('link', { name: 'Open' }).click();
await az.locator('[data-amount-to-collect]').waitFor();
check('the message opens that order', az.url().includes('/delivery/'));
await button(az, 'Pick Up Order').click();
await button(az, 'Start Delivery').click();
await button(az, 'Mark Delivered').click();
await button(az, 'Confirm Delivery').click();
await az.locator('[data-money="DONE"]').waitFor();
await backHome(az);
await card(az, 12).click();
await button(az, 'Mark Delivered').click();
await button(az, 'Confirm Delivery').click();
await az.locator('[data-money="DONE"]').waitFor();
await backHome(az);

console.log('Offline: no new orders');
await az.locator('[data-empty-state]').waitFor();
check('nothing running: it says so', (await az.locator('[data-empty-state]').innerText()).includes('No new orders right now'));
check('the bell has no count', (await az.locator('[data-new-count]').count()) === 0);
await button(az, 'My Orders').click();
check('My Orders says so too', (await az.locator('[data-empty-state]').innerText()).includes('You have no active deliveries'));
await az.getByRole('switch', { name: 'Online' }).click();
await az.locator('[data-availability="OFFLINE"]').waitFor();
check('with nothing running the rider can go Offline', (await az.locator('[data-empty-state]').innerText()).includes('You are Offline'));
await shot(az, '13-phone-offline');
await button(az, 'DEMO: give me a new order').click();
await az.locator('[data-toast="error"]').waitFor();
check('an Offline rider gets no new order', (await az.locator('[data-delivery]').count()) === 0);
await az.reload();
await az.locator('[data-availability="OFFLINE"]').waitFor();
check('Offline stays after a reload', true);
await az.getByRole('switch', { name: 'Online' }).click();
await az.locator('[data-availability="ONLINE"]').waitFor();
check('back Online', true);

console.log('No internet message');
await az.context().setOffline(true);
await az.getByText('No internet.').waitFor();
check('without internet the app says so', true);
await az.context().setOffline(false);
await az.getByText('No internet.').waitFor({ state: 'detached' });
check('back online: the message leaves', true);

console.log('Profile');
await az.getByRole('link', { name: 'Profile' }).click();
await button(az, 'Log out').waitFor();
check('name, phone and restaurant', (await az.locator('main').innerText()).includes('0300-0000107') && (await az.locator('main').innerText()).includes('Aziz Pizza'));
check('availability and app version', (await az.locator('[data-profile="availability"]').innerText()).includes('Online') && (await az.locator('[data-profile="version"]').innerText()).includes('DEMO'));
check('no way to edit the profile here', (await az.getByRole('button', { name: /edit/i }).count()) === 0);
await shot(az, '14-phone-profile');
await goodScreen(az, 'Profile');
await button(az, 'Start the sample deliveries again').click();

console.log('The limit of 3 (shown in the app only)');
await az.getByRole('link', { name: 'Home' }).click();
await card(az, 11).waitFor();
check('the sample can start again, with no old Pick Up tap', (await card(az, 11).innerText()).includes('New'));
for (const n of [16, 17]) {
  await button(az, 'DEMO: give me a new order').click();
  await card(az, n).waitFor();
}
for (const n of [11, 16]) {
  await card(az, n).click();
  await button(az, 'Pick Up Order').click();
  await button(az, 'Start Delivery').waitFor();
  await backHome(az);
  await button(az, /New Orders/).click();
}
await card(az, 17).click();
await az.locator('[data-action-hint]').waitFor();
check('with 3 on the bike, the next Pick Up is off and says why', (await button(az, 'Pick Up Order').isDisabled()) && (await az.locator('[data-action-hint]').innerText()).includes('Finish one'));
await shot(az, '15-phone-limit-reached');
await backHome(az);
await button(az, 'My Orders').click();
check('My Orders shows 3/3', (await az.locator('[data-capacity]').getAttribute('data-capacity')) === '3/3');
await az.getByRole('link', { name: 'Profile' }).click();
await button(az, 'Start the sample deliveries again').click();
await button(az, 'Log out').click();
await az.locator('[data-login]').waitFor();
check('log out returns to login', true);

console.log('A rider sees only their own deliveries');
await login(az, 'Naveed Akhtar');
check('Naveed has his one delivery', (await cards(az)) === '15');
await az.goto(`${AZIZ}/delivery/aziz-pizza-1`);
await az.getByRole('heading', { name: 'Delivery not found', level: 1 }).waitFor();
check("another rider's delivery link says not found", (await az.locator('[data-call]').count()) === 0);
await az.goto(AZIZ);
await card(az, 15).click();
await az.locator('[data-money="PAID"]').waitFor();
check('an already paid order says take no money', (await az.locator('[data-money="PAID"]').innerText()).includes('Take no money'));
await button(az, 'Pick Up Order').click();
await button(az, 'Start Delivery').click();
await button(az, 'Mark Delivered').click();
check('and asks about no cash', (await az.locator('[data-confirm-text]').innerText()).includes('already paid'));
await button(az, 'Confirm Delivery').click();
await az.locator('[data-money="DONE"]').waitFor();
await backHome(az);
await az.getByRole('link', { name: 'Earnings' }).click();
await az.locator('[data-today="delivered"]').waitFor();
check('paid delivery adds no cash', (await today(az, 'delivered')) === '1' && (await today(az, 'collected')) === 'Rs. 0');

console.log('Same code, another restaurant; wrong links');
const karahi = await newRider();
await karahi.goto(`${BASE}/demo-karahi/main`);
await karahi.locator('[data-login]').waitFor();
await karahi.locator('[data-login-account]').first().waitFor();
check('its own name', (await karahi.locator('[data-restaurant-name]').innerText()) === 'Demo Karahi House');
check('its own riders', (await karahi.locator('[data-login-account]').count()) === 1);
check('its own colour', (await karahi.evaluate(() => document.querySelector('[data-login]').parentElement.style.getPropertyValue('--rider-primary'))) === '#0f766e');
await shot(karahi, '16-phone-other-restaurant');
await login(karahi, 'Hamid Ali');
await card(karahi, 11).click();
await karahi.locator('[data-amount-to-collect]').waitFor();
check('its own deliveries', (await karahi.locator('main').innerText()).includes('Bilal Ahmad') && (await karahi.locator('main').innerText()).includes('Demo Karahi House'));
await karahi.goto(AZIZ);
await karahi.locator('[data-login]').waitFor();
check("a login does not open another restaurant's app", true);
await karahi.goto(`${BASE}/no-such/place`);
await karahi.getByText('Link not found').waitFor();
check('a wrong link says so', true);
const manifest = await (await karahi.request.get(`${BASE}/demo-karahi/main/manifest.webmanifest`)).json();
check('install details carry the restaurant', manifest.name.includes('Demo Karahi') && manifest.start_url === '/demo-karahi/main');
if (await karahi.evaluate(() => window.isSecureContext)) {
  await karahi.goto(`${BASE}/demo-karahi/main`);
  await karahi.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)));
  check('the service worker is registered', true);
}

console.log('The day follows the restaurant, not midnight');
for (const [label, at, day] of [['after midnight', '2026-11-02T00:30:00+05:00', 'Sun, 1 Nov 2026'], ['just after the day starts', '2026-11-02T06:10:00+05:00', 'Mon, 2 Nov 2026']]) {
  const night = await newRider();
  await night.clock.setFixedTime(new Date(at));
  await night.goto(LALA);
  await night.locator('[data-login-account]').first().waitFor();
  await login(night, 'Usman Ali');
  const homeCount = await stat(night, 'completed');
  await night.getByRole('link', { name: 'Earnings' }).click();
  await night.locator('[data-earnings-card]').waitFor();
  check(`${label}: Home and Today count the same deliveries`, homeCount === '2' && (await today(night, 'delivered')) === '2', `${homeCount}`);
  check(`${label}: Today is ${day}`, (await night.locator('[data-day]').evaluate((s) => s.selectedOptions[0].textContent)) === day);
  await night.close();
}

console.log('Small phones');
const small = [];
for (const width of [320, 360, 390, 412]) {
  const tiny = await newRider(phoneAt(width, width === 320 ? 568 : 780));
  small.push(tiny);
  await tiny.goto(LALA);
  await tiny.locator('[data-login-account]').first().waitFor();
  await goodScreen(tiny, `${width}px Login`);
  await shot(tiny, `20-${width}-login`);
  await login(tiny, 'Usman Ali');
  await goodScreen(tiny, `${width}px Home`);
  await shot(tiny, `21-${width}-home`);
  await card(tiny, 1061).click();
  await tiny.locator('[data-amount-to-collect]').waitFor();
  await goodScreen(tiny, `${width}px Order`);
  await shot(tiny, `22-${width}-order`);
  await tiny.goto(`${LALA}/delivery/lala-restaurant-1/tracking`);
  await tiny.locator('[data-demo-map]').waitFor();
  await goodScreen(tiny, `${width}px Live Tracking`);
  await shot(tiny, `23-${width}-tracking`);
  await tiny.goto(LALA);
  await tiny.getByRole('link', { name: 'Orders' }).click();
  await tiny.locator('[data-capacity-info]').waitFor();
  await goodScreen(tiny, `${width}px Active Deliveries`);
  await shot(tiny, `24-${width}-active`);
  await tiny.getByRole('link', { name: 'Earnings' }).click();
  await tiny.locator('[data-earnings-card]').waitFor();
  await goodScreen(tiny, `${width}px Today Summary`);
  await shot(tiny, `25-${width}-today`);
  await tiny.getByRole('link', { name: 'Delivery History' }).click();
  await tiny.locator('[data-history-row]').first().waitFor();
  await goodScreen(tiny, `${width}px History`);
  await tiny.getByRole('link', { name: 'Profile' }).click();
  await button(tiny, 'Log out').waitFor();
  await goodScreen(tiny, `${width}px Profile`);
  await tiny.close();
}

console.log('Tablet and desktop');
for (const [label, size] of [['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1440, height: 900 }]]) {
  const wide = await newRider({ viewport: size, deviceScaleFactor: 1 });
  await wide.goto(LALA);
  await login(wide, 'Usman Ali');
  check(`${label}: no sideways scroll`, (await sideScroll(wide)) <= 0);
  await shot(wide, `30-${label}-home`);
  await wide.close();
}

const errors = [page, az, karahi, ...small].flatMap((p) => p.errors);
check('no script errors on the phones', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(`\nAll ${passed} checks passed.`);

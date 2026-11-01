// Clicks through the Rider App on its sample data in the installed Microsoft Edge (`pnpm dev` must run): what a rider
// does on a phone. The link with Restaurant OS is checked in restaurant-os `walkthrough:riders`.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.RIDER_URL ?? 'http://localhost:3002';
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
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };

async function newRider(options = phone) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const login = async (page, name) => {
  await page.locator(`[data-login-account="${name}"]`).click();
  await page.locator('[data-availability]').waitFor();
};
const card = (page, n) => page.locator(`[data-delivery="${n}"]`);
const today = async (page, key) => (await page.locator(`[data-today="${key}"] p`).nth(1).innerText()).trim();
const statusOf = (page) => page.locator('main [data-delivery-status]').first().getAttribute('data-delivery-status');
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

console.log('Login (DEMO)');
const page = await newRider();
await page.goto(BASE);
await page.waitForURL(AZIZ);
await page.locator('[data-login]').waitFor();
check('the start address opens the restaurant link and asks to log in', true);
check('riders of this restaurant only', (await page.locator('[data-login-account]').count()) === 3);
check('it says no public sign-up', (await page.locator('[data-login]').innerText()).includes('Owner creates your account'));
check('it says DEMO, no password is checked', (await page.locator('[data-login]').innerText()).includes('No password is checked'));
await shot(page, '01-phone-login');
await goodScreen(page, 'Login');
await page.locator('[data-login-account="Zubair Khan"]').click();
await page.locator('[data-login] [role="alert"]').waitFor();
check('a disabled rider cannot log in', (await page.locator('[data-login] [role="alert"]').innerText()).includes('disabled'));
check('the disabled rider stays on login', (await page.locator('[data-availability]').count()) === 0);

console.log('My deliveries');
await login(page, 'Faisal Riaz');
check('only running deliveries, the customer waiting first', (await page.locator('[data-delivery]').evaluateAll((els) => els.map((e) => e.dataset.delivery).join())) === '12,11');
check('the bottom bar counts running deliveries', (await page.locator('[data-running-count]').getAttribute('data-running-count')) === '2');
check('the amount to collect is on the card', (await card(page, 11).innerText()).includes('Rs. 1,350'));
check('sample data is marked', (await page.locator('[data-demo-source]').getAttribute('data-demo-source')) === 'SAMPLE');
await shot(page, '02-phone-deliveries');
await goodScreen(page, 'Deliveries');
await page.getByRole('button', { name: 'What does DEMO mean here?' }).click();
check('DEMO explains itself', (await page.getByRole('dialog').innerText()).includes('sample deliveries'));
await page.getByRole('button', { name: 'Close' }).click();

console.log('Online / Offline: a running delivery keeps the rider Online');
await page.getByRole('switch', { name: 'Online' }).click();
await page.locator('[data-toast="error"]').waitFor();
check('refused while deliveries are running', (await page.locator('[data-toast="error"]').innerText()).includes('Finish your running deliveries'));
check('still Online', (await page.locator('[data-availability]').getAttribute('data-availability')) === 'ONLINE');

console.log('Delivery: call, map, amount');
await card(page, 11).click();
await page.locator('[data-amount-to-collect]').waitFor();
check('the amount to collect is big and right', (await page.locator('[data-amount-to-collect]').innerText()) === 'Rs. 1,350');
check('tap to call the customer', (await page.locator('[data-call]').getAttribute('href')) === 'tel:0300-0000201');
const map = await page.locator('[data-map]').getAttribute('href');
check('address opens the free Google Maps link', map === `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('House 12, Street 3, Gulberg III, Lahore')}`);
check('items and note are shown', (await page.locator('main').innerText()).includes('1 × Classic Pizza (Medium)') && (await page.locator('main').innerText()).includes('Ring the bell twice'));
check('the next step is the only big button', (await page.getByRole('button', { name: 'Picked up – On the way' }).count()) === 1 && (await page.getByRole('button', { name: 'Delivered', exact: true }).count()) === 0);
await shot(page, '03-phone-delivery-assigned');
await goodScreen(page, 'Delivery');

console.log('Picked up – On the way → Delivered + cash');
await page.getByRole('button', { name: 'Picked up – On the way' }).dblclick();
await page.getByRole('button', { name: 'Delivered', exact: true }).waitFor();
check('picked up, once, on a double tap', (await statusOf(page)) === 'OUT_FOR_DELIVERY');
await shot(page, '04-phone-delivery-on-the-way');
await page.getByRole('button', { name: 'Delivered', exact: true }).click();
check('asks about the cash first', (await page.locator('[data-confirm-text]').innerText()).includes('Did you collect Rs. 1,350 cash'));
await shot(page, '05-phone-delivered-confirm');
await page.getByRole('button', { name: 'Not yet' }).click();
check('"Not yet" changes nothing', (await statusOf(page)) === 'OUT_FOR_DELIVERY');
await page.getByRole('button', { name: 'Delivered', exact: true }).click();
await page.getByRole('button', { name: /Yes, cash collected/ }).dblclick();
await page.locator('[data-money="DONE"]').waitFor();
check('delivered, cash noted, once on a double tap', (await page.locator('[data-money="DONE"]').innerText()).includes('Rs. 1,350'));
await shot(page, '06-phone-delivered');
await page.reload();
await page.locator('[data-money="DONE"]').waitFor();
check('a reload keeps the login and the delivery', (await statusOf(page)) === 'DELIVERED');

console.log('Today');
await page.getByRole('link', { name: 'Back to deliveries' }).click();
await page.getByRole('link', { name: 'Today' }).click();
await page.locator('[data-today="delivered"]').waitFor();
check('deliveries done', (await today(page, 'delivered')) === '3');
check('cash collected', (await today(page, 'collected')) === 'Rs. 4,500');
check('cash given', (await today(page, 'settled')) === 'Rs. 1,650');
check('cash still with the rider', (await today(page, 'withMe')) === 'Rs. 2,850');
await shot(page, '07-phone-today');
await goodScreen(page, 'Today');
await page.getByRole('button', { name: 'DEMO: I gave the cash to the restaurant' }).click();
await page.getByRole('button', { name: 'DEMO: I gave the cash to the restaurant' }).waitFor({ state: 'detached' });
check('after handing over no cash is left with the rider', (await today(page, 'withMe')) === 'Rs. 0');

console.log('New assignment: message, vibration');
await page.getByRole('link', { name: 'Deliveries' }).click();
await page.evaluate(() => {
  window.vibrations = [];
  navigator.vibrate = (pattern) => window.vibrations.push(pattern);
});
await page.getByRole('button', { name: 'DEMO: give me a new order' }).click();
await page.locator('[data-new-delivery="16"]').waitFor();
check('a new order shows a message', (await page.locator('[data-new-delivery="16"]').innerText()).includes('New delivery #16'));
check('and vibrates', (await page.evaluate(() => window.vibrations.length)) === 1);
await shot(page, '08-phone-new-delivery');
await page.locator('[data-new-delivery="16"]').getByRole('link', { name: 'Open' }).click();
await page.locator('[data-amount-to-collect]').waitFor();
check('the message opens that delivery', page.url().includes('/delivery/'));
await page.getByRole('button', { name: 'Picked up – On the way' }).click();
await page.getByRole('button', { name: 'Delivered', exact: true }).click();
await page.getByRole('button', { name: /Yes, cash collected/ }).click();
await page.locator('[data-money="DONE"]').waitFor();
await page.getByRole('link', { name: 'Back to deliveries' }).click();
await card(page, 12).click();
await page.getByRole('button', { name: 'Delivered', exact: true }).click();
await page.getByRole('button', { name: /Yes, cash collected/ }).click();
await page.locator('[data-money="DONE"]').waitFor();
await page.getByRole('link', { name: 'Back to deliveries' }).click();

console.log('Offline: no new orders');
await page.locator('[data-empty-state]').waitFor();
check('nothing running: it says so', (await page.locator('[data-empty-state]').innerText()).includes('No deliveries right now'));
check('no count on the bottom bar', (await page.locator('[data-running-count]').count()) === 0);
await page.getByRole('switch', { name: 'Online' }).click();
await page.locator('[data-availability="OFFLINE"]').waitFor();
check('with nothing running the rider can go Offline', (await page.locator('[data-empty-state]').innerText()).includes('You are Offline'));
await shot(page, '09-phone-offline');
await page.getByRole('button', { name: 'DEMO: give me a new order' }).click();
await page.locator('[data-toast="error"]').waitFor();
check('an Offline rider gets no new order', (await page.locator('[data-delivery]').count()) === 0);
await page.reload();
await page.locator('[data-availability="OFFLINE"]').waitFor();
check('Offline stays after a reload', true);
await page.getByRole('switch', { name: 'Online' }).click();
await page.locator('[data-availability="ONLINE"]').waitFor();
check('back Online', true);

console.log('No internet message');
await page.context().setOffline(true);
await page.getByText('No internet.').waitFor();
check('without internet the app says so', true);
await page.context().setOffline(false);
await page.getByText('No internet.').waitFor({ state: 'detached' });
check('back online: the message leaves', true);

console.log('Account');
await page.getByRole('link', { name: 'Account' }).click();
await page.getByRole('button', { name: 'Log out' }).waitFor();
check('name, phone and restaurant', (await page.locator('main').innerText()).includes('0300-0000107') && (await page.locator('main').innerText()).includes('Aziz Pizza'));
await shot(page, '10-phone-account');
await goodScreen(page, 'Account');
await page.getByRole('button', { name: 'Start the sample deliveries again' }).click();
await page.getByRole('link', { name: 'Deliveries' }).click();
await card(page, 11).waitFor();
check('the sample can start again', true);
await page.getByRole('link', { name: 'Account' }).click();
await page.getByRole('button', { name: 'Log out' }).click();
await page.locator('[data-login]').waitFor();
check('log out returns to login', true);

console.log('A rider sees only their own deliveries');
await login(page, 'Naveed Akhtar');
check('Naveed has his one delivery', (await page.locator('[data-delivery]').evaluateAll((els) => els.map((e) => e.dataset.delivery).join())) === '15');
const faisalDelivery = `${AZIZ}/delivery/aziz-pizza-1`;
await page.goto(faisalDelivery);
await page.getByText('Delivery not found').waitFor();
check("another rider's delivery link says not found", (await page.locator('[data-call]').count()) === 0);
await page.goto(AZIZ);
await card(page, 15).click();
await page.locator('[data-money="PAID"]').waitFor();
check('an already paid order says take no money', (await page.locator('[data-money="PAID"]').innerText()).includes('Take no money'));
await page.getByRole('button', { name: 'Picked up – On the way' }).click();
await page.getByRole('button', { name: 'Delivered', exact: true }).click();
check('and asks about no cash', (await page.locator('[data-confirm-text]').innerText()).includes('already paid'));
await page.getByRole('button', { name: 'Yes, Delivered' }).click();
await page.locator('[data-money="DONE"]').waitFor();
await page.getByRole('link', { name: 'Back to deliveries' }).click();
await page.getByRole('link', { name: 'Today' }).click();
await page.locator('[data-today="delivered"]').waitFor();
check('paid delivery adds no cash', (await today(page, 'delivered')) === '1' && (await today(page, 'collected')) === 'Rs. 0');
await page.getByRole('link', { name: 'Account' }).click();
await page.getByRole('button', { name: 'Log out' }).click();
await page.locator('[data-login]').waitFor();

console.log('Same code, another restaurant; wrong links');
const karahi = await newRider();
await karahi.goto(`${BASE}/demo-karahi/main`);
await karahi.locator('[data-login]').waitFor();
check('its own name', (await karahi.locator('[data-restaurant-name]').innerText()) === 'Demo Karahi House');
check('its own riders', (await karahi.locator('[data-login-account]').count()) === 1);
check('its own colour', (await karahi.evaluate(() => document.querySelector('[data-login]').parentElement.style.getPropertyValue('--rider-primary'))) === '#0f766e');
await login(karahi, 'Hamid Ali');
check('its own deliveries', (await karahi.locator('[data-delivery]').count()) === 1 && (await karahi.locator('main').innerText()).includes('Bilal Ahmad'));
await shot(karahi, '11-phone-other-restaurant');
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

console.log('Tablet and desktop');
for (const [label, size] of [['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1440, height: 900 }]]) {
  const wide = await newRider({ viewport: size, deviceScaleFactor: 1 });
  await wide.goto(AZIZ);
  await login(wide, 'Faisal Riaz');
  check(`${label}: no sideways scroll`, (await sideScroll(wide)) <= 0);
  await shot(wide, `12-${label}-deliveries`);
  await wide.close();
}

check('no script errors on the phone', page.errors.length === 0 && karahi.errors.length === 0, [...page.errors, ...karahi.errors].join(' | '));
await browser.close();
console.log(`\nAll ${passed} checks passed.`);

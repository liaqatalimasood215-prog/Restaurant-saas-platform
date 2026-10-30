// Clicks through the customer website in the installed Microsoft Edge (`pnpm dev` must run).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.CUSTOMER_URL ?? 'http://localhost:3001';
const STORE = `${BASE}/aziz-pizza/main`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'screenshots', 'customer');
mkdirSync(OUT, { recursive: true });

let passed = 0;
function check(name, ok, detail = '') {
  if (!ok) throw new Error(`FAILED: ${name} ${detail}`);
  passed += 1;
  console.log(`  ok  ${name}`);
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };

/** A new customer: their own browser storage. */
async function newCustomer(options = phone) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const item = (page, name) => page.locator(`[data-menu-item="${name}"]`);
const addSimple = async (page, name) => {
  await item(page, name).click();
  await page.getByRole('button', { name: /^Add to cart/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
};

try {
  console.log('Start page: both restaurants, one website');
  {
    const page = await newCustomer();
    await page.goto(BASE);
    await page.getByRole('link', { name: /Aziz Pizza/ }).waitFor();
    check('start page lists both demo restaurants', await page.getByRole('link', { name: /Demo Karahi House/ }).isVisible());
    await shot(page, 'phone-start');
    await page.context().close();
  }

  console.log('Delivery order on a phone');
  const page = await newCustomer();
  await page.goto(STORE);
  await item(page, 'Zinger Burger').waitFor();
  await shot(page, 'phone-home');
  check('hidden item (Staff Meal) never shows', (await page.getByText('Staff Meal').count()) === 0);
  check('sold out item cannot be opened', await page.locator('[data-menu-item*="Wings"]').first().isDisabled());
  check('cart bar hidden while the cart is empty', (await page.locator('[data-cart-bar]').count()) === 0);

  await page.getByRole('searchbox').fill('zinger');
  check('search finds the item', await item(page, 'Zinger Burger').isVisible());
  await page.getByRole('searchbox').fill('xyz');
  await page.getByText(/Nothing matches/).waitFor();
  await page.getByRole('searchbox').fill('');

  await addSimple(page, 'Zinger Burger');
  check('cart bar appears', await page.locator('[data-cart-bar]').isVisible());
  await shot(page, 'phone-menu-with-cart');

  // Below the minimum order: no way to checkout yet.
  await page.locator('[data-cart-bar]').click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Zinger Burger"]').waitFor();
  const below = (await page.locator('main').innerText()).includes('more to reach');
  check('minimum order message shows', below);
  check('no checkout link below the minimum', (await page.getByRole('link', { name: /Checkout/i }).count()) === 0);

  // Back to the menu for a pizza with a size, an add-on and a note.
  await page.goto(STORE);
  const pizza = page.locator('[data-menu-item*="Pizza"]').first();
  await pizza.click();
  const sheet = page.getByRole('dialog');
  await sheet.waitFor();
  await shot(page, 'phone-product');
  const sizes = sheet.locator('fieldset').first().getByRole('button');
  await sizes.nth(1).click();
  check('size can be chosen', (await sizes.nth(1).getAttribute('aria-pressed')) === 'true');
  await sheet.getByPlaceholder(/.+/).fill('Less spicy');
  await sheet.getByRole('button', { name: /^Add to cart/ }).click();
  await sheet.waitFor({ state: 'detached' });

  await page.locator('[data-cart-bar]').click();
  await page.waitForURL('**/cart');
  check('cart has two lines', (await page.locator('[data-cart-line]').count()) === 2);
  const cartText = await page.locator('main').innerText();
  check('the note is on the line', cartText.includes('Less spicy'));
  check('delivery fee on the bill', cartText.includes('Delivery fee'));
  await shot(page, 'phone-cart');

  await page.getByRole('link', { name: /Checkout/i }).click();
  await page.waitForURL('**/checkout');
  const place = page.getByRole('button', { name: /^Place order/ });
  await place.waitFor();
  await shot(page, 'phone-checkout');
  await place.click();
  await page.locator('main').getByRole('alert').waitFor();
  check('name is required', (await page.locator('main').getByRole('alert').innerText()).toLowerCase().includes('name'));
  await page.getByLabel('Full name').fill('Sara Khan');
  await page.getByLabel(/Mobile/).fill('03001234567');
  await place.click();
  check('address is required for delivery', (await page.locator('main').getByRole('alert').innerText()).toLowerCase().includes('address'));
  await page.getByLabel(/Delivery address/).fill('House 12, Street 4, Model Town');
  await place.dblclick(); // a double tap must place only one order
  await page.waitForURL('**/track/**');
  await page.locator('[data-track-status]').waitFor();
  check('the link is long and random', page.url().split('/track/')[1].split('?')[0].length >= 32);
  check('order placed message', await page.getByText(/placed/i).first().isVisible());
  await shot(page, 'phone-track');
  const steps = () => page.locator('[data-step][data-done="true"]').count();
  check('tracking starts on the first step', (await steps()) === 1);

  const total = await page.locator('[data-step]').count();
  for (let done = 2; done <= total; done += 1) {
    await page.getByRole('button', { name: /next step/i }).click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-step][data-done="true"]').length === n, done);
    if (done === 3) await shot(page, 'phone-track-preparing');
  }
  check('the delivery reaches Delivered', (await page.locator('[data-track-status]').innerText()).toLowerCase().includes('delivered'));
  check('DEMO buttons leave when finished', (await page.getByRole('button', { name: /next step/i }).count()) === 0);

  console.log('Account');
  await page.goto(`${STORE}/account`);
  await page.locator('[data-my-order]').first().waitFor();
  check('double tap made one order only', (await page.locator('[data-my-order]').count()) === 1);
  check('details are remembered', (await page.getByLabel('Full name').inputValue()) === 'Sara Khan');
  await shot(page, 'phone-account-signed-out');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('heading', { name: /Saved addresses/ }).waitFor();
  check('the saved address is listed', await page.getByText('House 12, Street 4, Model Town').isVisible());
  await page.getByLabel(/New address/i).fill('Office 5, Mall Road');
  await page.getByRole('button', { name: /Add address/ }).click();
  await page.getByText('Office 5, Mall Road', { exact: true }).waitFor();
  await shot(page, 'phone-account');
  await page.getByRole('button', { name: /Remove address 2/ }).click();
  await page.getByText('Office 5, Mall Road', { exact: true }).waitFor({ state: 'detached' });
  check('an address can be removed', true);
  await page.getByRole('button', { name: /Sign out/ }).click();
  await page.getByRole('button', { name: /Continue/ }).waitFor();
  check('signing out forgets the details', (await page.getByLabel('Full name').inputValue()) === '');

  console.log('Pickup order, order again');
  await page.goto(`${STORE}`);
  await page.getByRole('button', { name: /Pickup/ }).first().click();
  await addSimple(page, 'Zinger Burger');
  await addSimple(page, 'Zinger Burger');
  await page.locator('[data-cart-bar]').click();
  await page.waitForURL('**/cart');
  const pickupCart = await page.locator('main').innerText();
  check('pickup has no delivery fee', !pickupCart.includes('Delivery fee'));
  await page.getByRole('link', { name: /Checkout/i }).click();
  await page.getByRole('button', { name: /^Place order/ }).waitFor();
  await page.getByLabel('Full name').fill('Sara Khan');
  await page.getByLabel(/Mobile/).fill('0300 1234567');
  check('no address box for pickup', (await page.getByLabel(/Delivery address/).count()) === 0);
  await page.getByRole('button', { name: /^Place order/ }).click();
  await page.waitForURL('**/track/**');
  await page.locator('[data-track-status]').waitFor();
  check('pickup has its own steps', (await page.locator('[data-step="PICKED_UP"]').count()) === 1 && (await page.locator('[data-step="OUT_FOR_DELIVERY"]').count()) === 0);
  await page.goto(STORE);
  await page.locator('[data-active-order]').waitFor();
  check('home page shows the running order', true);
  await page.locator('[data-active-order]').click();
  await page.waitForURL('**/track/**');
  await page.getByRole('button', { name: /Order again/ }).click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Zinger Burger"]').waitFor();
  check('order again fills the cart', true);

  console.log('Restaurant rejects an order');
  await page.getByRole('link', { name: /Checkout/i }).click();
  await page.waitForFunction(() => document.querySelector('input[autocomplete="name"]')?.value === 'Sara Khan');
  check('details filled in from last time', true);
  await page.getByRole('button', { name: /^Place order/ }).click();
  await page.waitForURL('**/track/**');
  await page.getByRole('button', { name: /reject/i }).click();
  await page.getByText(/not been charged/i).waitFor();
  check('the rejected order explains itself', true);

  console.log('Restaurant not taking orders');
  await page.goto(STORE);
  // An item already in the cart when the restaurant stops taking orders.
  await addSimple(page, 'Zinger Burger');
  await addSimple(page, 'Zinger Burger');
  await page.getByRole('button', { name: 'DEMO' }).click();
  await page.getByRole('switch', { name: /online orders/i }).click();
  await page.getByRole('button', { name: 'Close' }).last().click();
  await page.getByText(/not taking orders/i).first().waitFor();
  check('menu cannot be ordered from', await page.locator('[data-menu-item="Zinger Burger"]').isDisabled());
  await shot(page, 'phone-not-taking');
  await page.goto(`${STORE}/checkout`);
  await page.getByText(/not taking orders/i).first().waitFor();
  check('checkout is blocked too', (await page.getByRole('button', { name: /^Place order/ }).count()) === 0);
  check('no page errors in the phone journey', page.errors.length === 0, page.errors.join('; '));
  await page.context().close();

  console.log('Second restaurant: another brand from the same website');
  {
    const karahi = await newCustomer();
    await karahi.goto(`${BASE}/demo-karahi/main`);
    await karahi.getByRole('heading', { name: 'Demo Karahi House', level: 1 }).waitFor();
    const colour = await karahi.locator('section').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    check('its own colour', colour.replace(/\s/g, '').includes('15,118,110') || colour.includes('oklab') || colour.includes('oklch'), colour);
    check('its own menu', (await karahi.getByText('Zinger Burger').count()) === 0);
    await shot(karahi, 'phone-second-brand');
    await karahi.goto(`${BASE}/no-such/place`);
    await karahi.getByText(/not found|could not find/i).first().waitFor();
    check('a wrong link shows a clear message', true);
    await karahi.context().close();
  }

  console.log('Tablet and desktop');
  for (const [name, viewport] of [
    ['tablet', { width: 820, height: 1100 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    const wide = await newCustomer({ viewport });
    await wide.goto(STORE);
    await wide.locator('[data-menu-item="Zinger Burger"]').waitFor();
    const overflow = await wide.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${name}: no sideways scroll`, overflow <= 0, String(overflow));
    await shot(wide, `${name}-home`);
    await addSimple(wide, 'Zinger Burger');
    await wide.locator('[data-menu-item*="Pizza"]').first().click();
    await shot(wide, `${name}-product`);
    await wide.getByRole('button', { name: /^Add to cart/ }).click();
    await wide.getByRole('dialog').waitFor({ state: 'detached' });
    if (name === 'desktop') {
      check('desktop: cart beside the menu', await wide.locator('aside[aria-label="Your cart"] [data-cart-line="Zinger Burger"]').isVisible());
      check('desktop: no cart bar', !(await wide.locator('[data-cart-bar]').isVisible()));
    }
    await shot(wide, `${name}-menu-with-cart`);
    await wide.goto(`${STORE}/checkout`);
    await wide.getByRole('button', { name: /^Place order/ }).waitFor();
    await shot(wide, `${name}-checkout`);
    await wide.getByLabel('Full name').fill('Bilal');
    await wide.getByLabel(/Mobile/).fill('0321 7654321');
    await wide.getByLabel(/Delivery address/).fill('Flat 3, Gulberg');
    await wide.getByRole('button', { name: /^Place order/ }).click();
    await wide.waitForURL('**/track/**');
    await wide.locator('[data-track-status]').waitFor();
    await shot(wide, `${name}-track`);
    check(`${name}: no page errors`, wide.errors.length === 0, wide.errors.join('; '));
    await wide.context().close();
  }
  console.log(`\nAll ${passed} checks passed.`);
} catch (error) {
  console.error(`\n${error.message}\n(${passed} checks passed before this.)`);
  process.exitCode = 1;
} finally {
  await browser.close();
}

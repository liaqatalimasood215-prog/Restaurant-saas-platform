// Clicks through the customer website in the installed Microsoft Edge (`pnpm dev` must run).
// Covers the owner's six screens (Login, Home, Menu, Product, Cart, Tracking), the bottom bar and the small upgrades.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.CUSTOMER_URL ?? 'http://localhost:3001';
const LALA = `${BASE}/lala-restaurant/main`;
const AZIZ = `${BASE}/aziz-pizza/main`;
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
const shot = (page, name, fullPage = false) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage });
const empty = (page) => page.locator('main [data-empty-state]:visible');
const dish = (page, name) => page.locator(`[data-menu-item="${name}"]`).first();
const tab = (page, name) => page.locator(`[data-category-tab="${name}"]`);
const cartCount = async (page) => (await page.locator('[data-bottom-nav] [data-cart-count]').count()) === 0 ? 0 : Number(await page.locator('[data-bottom-nav] [data-cart-count]').getAttribute('data-cart-count'));
const placeButton = (page) => page.getByRole('button', { name: /^(Place order|Not taking|You are offline)/ });
const choice = (page, group, name) => page.locator(`[data-choice="${group}"]`).getByRole('button', { name });
const pressed = async (locator) => (await locator.getAttribute('aria-pressed')) === 'true';
const sideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** Everything tappable must be at least 44 px; a link stretched over a whole card counts as the card. */
const smallTargets = (page) =>
  page.evaluate(() => {
    const small = [];
    for (const el of document.querySelectorAll('a[href], button, input, textarea, select')) {
      if (el.closest('.sr-only')) continue;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (getComputedStyle(el, '::after').position === 'absolute') continue;
      if (box.width < 43.5 || box.height < 43.5) small.push(`${el.tagName} "${el.getAttribute('aria-label') ?? el.textContent.trim().slice(0, 24)}" ${Math.round(box.width)}x${Math.round(box.height)}`);
    }
    return small;
  });
/** Everything tappable or typable must have a name a screen reader can say. */
const unnamed = (page) =>
  page.evaluate(() => {
    const missing = [];
    for (const el of document.querySelectorAll('a[href], button, input, textarea, select')) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (!el.getAttribute('aria-label')?.trim() && !el.textContent.trim() && !el.closest('label')) missing.push(el.outerHTML.slice(0, 90));
    }
    return missing;
  });
const checkTargets = async (page, name) => {
  const small = await smallTargets(page);
  check(`${name}: every tap target is at least 44 px`, small.length === 0, small.join('; '));
  const missing = await unnamed(page);
  check(`${name}: every control has an accessible name`, missing.length === 0, missing.join('; '));
};
/** A menu dish with no choices goes straight into the cart. */
const quickAdd = async (page, name, category) => {
  if (category) await tab(page, category).click();
  await page.locator(`[data-add="${name}"]`).click();
  await page.waitForFunction(() => document.querySelector('[data-toast]'));
};

try {
  console.log('Start page: the sample restaurants, once each');
  {
    const page = await newCustomer();
    await page.goto(BASE);
    await page.getByRole('link', { name: /LALA Restaurant/ }).waitFor();
    check('start page lists each demo restaurant once', (await page.getByRole('link', { name: /LALA Restaurant/ }).count()) === 1 && (await page.getByRole('link', { name: /Aziz Pizza/ }).isVisible()) && (await page.getByRole('link', { name: /Demo Karahi House/ }).isVisible()));
    await page.context().close();
  }

  console.log('Screen 2: Home');
  const page = await newCustomer();
  const raw = await (await page.request.get(LALA)).text();
  check('skeleton is the first thing a slow phone sees', raw.includes('data-skeleton'));
  await page.goto(LALA);
  await page.locator('[data-popular] [data-menu-item]').first().waitFor();
  await shot(page, 'phone-home');
  await shot(page, 'phone-home-full', true);
  check('address line asks for an address', await page.getByText('Add your address').isVisible());
  check('time is shown', (await page.locator('[data-eta]').innerText()).includes('30 min'));
  check('search box is shown', await page.getByRole('searchbox').isVisible());
  check('categories come from the menu', (await page.locator('[data-category-row] a').count()) === 7);
  check('deal slider has three deals', (await page.locator('[data-deal]').count()) === 3);
  check('a deal shows its menu price', (await page.locator('[data-deal="Family Feast"]').innerText()).includes('Rs 2,999'));
  check('Popular Now has four dishes', (await page.locator('[data-popular] [data-menu-item]').count()) === 4);
  check('price format is "Rs 1,300", no dot', !(await page.locator('main').innerText()).includes('Rs. '));
  check('bottom bar: Home, Menu, Cart, Orders, Account', (await page.locator('[data-bottom-nav] a').allInnerTexts()).join() === 'Home,Menu,Cart,Orders,Account');
  check('Home is the active tab', (await page.locator('[data-bottom-nav] a[aria-current="page"]').innerText()) === 'Home');
  check('no sideways scroll', (await sideScroll(page)) <= 0);
  await checkTargets(page, 'Home');
  await page.locator('[data-deal-dots] button').nth(1).click();
  await page.waitForFunction(() => document.querySelector('[data-deals]').scrollLeft > 100);
  await page.waitForFunction(() => document.querySelectorAll('[data-deal-dots] button')[1].getAttribute('aria-current') === 'true');
  check('the deal slider moves, and its dot follows', true);
  await page.locator('[data-deal="Pizza Party"]').click();
  await page.waitForURL('**/item/**');
  await page.locator('[data-product-bar]').getByRole('button', { name: /^Add to cart/ }).waitFor();
  check('a deal opens as a dish with its menu price', (await page.locator('[data-product-bar]').innerText()).includes('Rs 2,499'));
  await page.goto(LALA);
  await page.locator('[data-popular]').waitFor();
  await page.getByRole('searchbox').fill('zinger');
  await page.getByRole('searchbox').press('Enter');
  await page.waitForURL('**/menu?q=zinger');
  await dish(page, 'Zinger Burger').waitFor();
  // Student Deal has "Zinger Burger" in its description, so it is a correct second result.
  check('search goes to the menu and looks through the whole menu', (await page.locator('[data-menu-grid] [data-menu-item]').count()) === 2 && (await dish(page, 'Student Deal').isVisible()));
  await page.goto(LALA);
  await page.locator('[data-category="Burgers"]').click();
  await page.waitForURL('**/menu?c=*');
  await dish(page, 'Beef Burger').waitFor();
  check('a category on Home opens that tab', await pressed(tab(page, 'Burgers')));

  console.log('Screen 3: Menu');
  await page.goto(`${LALA}/menu`);
  await dish(page, 'Fajita Pizza').waitFor();
  await shot(page, 'phone-menu');
  check('first tab is open', await pressed(tab(page, 'Pizza')));
  check('the grid shows only that category', (await page.locator('[data-menu-grid] [data-menu-item]').count()) === 6 && (await dish(page, 'Zinger Burger').count()) === 0);
  await checkTargets(page, 'Menu');
  await tab(page, 'Wings').click();
  const soldOut = dish(page, 'BBQ Wings');
  await soldOut.waitFor();
  check('sold out: no link and no add button', (await soldOut.getByRole('link').count()) === 0 && (await soldOut.locator('[data-add]').count()) === 0 && (await soldOut.innerText()).includes('Sold out'));
  await page.getByRole('button', { name: 'Open search' }).click();
  await page.getByRole('searchbox').fill('xyz');
  await empty(page).waitFor();
  check('search with no result says so', (await empty(page).innerText()).includes('Nothing matches'));
  await page.getByRole('searchbox').fill('');
  await tab(page, 'Burgers').click();
  await page.locator('[data-favourite="Beef Burger"]').click();
  check('heart turns on', await pressed(page.locator('[data-favourite="Beef Burger"]')));
  await tab(page, 'Favourites').click();
  check('Favourites tab lists it', (await page.locator('[data-menu-grid] [data-menu-item]').count()) === 1 && (await dish(page, 'Beef Burger').isVisible()));
  await page.reload();
  await tab(page, 'Favourites').click();
  check('favourites are kept after a reload', await dish(page, 'Beef Burger').isVisible());
  await page.locator('[data-favourite="Beef Burger"]').click();
  await empty(page).waitFor();
  check('removing the last favourite shows a hint', (await empty(page).innerText()).includes('heart'));

  console.log('Cart below the minimum, saved cart');
  await quickAdd(page, 'Cold Drink', 'Drinks');
  check('+ adds a simple dish straight away', (await cartCount(page)) === 1);
  check('the message says it was added', (await page.locator('[data-toast]').innerText()).includes('Cold Drink'));
  await page.reload();
  await tab(page, 'Drinks').waitFor();
  check('the cart survives a reload', (await cartCount(page)) === 1);
  await page.locator('[data-bottom-nav] a', { hasText: 'Cart' }).click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Cold Drink"]').waitFor();
  check('minimum order message shows', await page.locator('[data-below-minimum]').isVisible());
  check('cannot place an order below the minimum', await placeButton(page).isDisabled());
  check('the cart page ends with its own button, not the bottom bar', (await page.locator('[data-bottom-nav]').count()) === 0);

  console.log('Screen 4: Product');
  await page.goto(`${LALA}/menu`);
  await dish(page, 'Chicken Tikka Pizza').getByRole('link').click();
  await page.waitForURL('**/item/**');
  const add = page.locator('[data-product-bar]').getByRole('button', { name: /^Add to cart/ });
  await add.waitFor();
  await shot(page, 'phone-product');
  await shot(page, 'phone-product-full', true);
  check('size and crust say Required', (await page.locator('[data-choice="size"] legend').innerText()).includes('Required') && (await page.locator('[data-choice="Crust"] legend').innerText()).includes('Required'));
  check('extras are optional', (await page.locator('[data-choice="Add extras"] legend').innerText()).includes('Up to 4'));
  check('the bottom bar gives way to the Add button', (await page.locator('[data-bottom-nav]').count()) === 0);
  check('it starts on a real price', (await add.innerText()).includes('Rs 650'));
  await checkTargets(page, 'Product');
  await choice(page, 'size', /Medium/).click();
  check('size changes the price on the button', (await add.innerText()).includes('Rs 1,150'));
  const pan = choice(page, 'Crust', /Pan/);
  check('a required crust starts chosen', await pressed(pan));
  await pan.click();
  check('a required crust cannot be taken away', await pressed(pan));
  await choice(page, 'Crust', /Stuffed/).click();
  check('choosing another crust replaces the first', (await pressed(choice(page, 'Crust', /Stuffed/))) && !(await pressed(pan)));
  check('crust adds to the price', (await add.innerText()).includes('Rs 1,350'));
  await pan.click();
  await choice(page, 'Add extras', /Extra cheese/).click();
  check('Medium + Pan + Extra cheese = Rs 1,300, as in the design', (await add.innerText()).includes('Rs 1,300'));
  await page.getByPlaceholder(/No onion/).fill('Less spicy');
  await page.locator('[data-product-bar]').getByRole('button', { name: 'One more' }).click();
  check('quantity multiplies the price', (await add.innerText()).includes('Rs 2,600'));
  await add.click();
  await page.waitForURL('**/menu');
  await page.locator('[data-bottom-nav]').waitFor();
  check('added: two pizzas and the drink in the cart', (await cartCount(page)) === 3);

  console.log('Screen 5: Cart');
  await page.locator('[data-bottom-nav] a', { hasText: 'Cart' }).click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Chicken Tikka Pizza"]').waitFor();
  await page.locator('[data-details-form]').waitFor();
  await page.waitForTimeout(3000); // the "added" message has gone
  await shot(page, 'phone-cart');
  await shot(page, 'phone-cart-full', true);
  const cartText = () => page.locator('main').innerText();
  check('the line shows its choices and note', (await cartText()).includes('Less spicy') && (await cartText()).includes('Extra cheese'));
  check('the three ways to order are there', (await page.locator('[data-mode]').count()) === 3);
  check('the bill has the delivery fee', (await cartText()).includes('Delivery fee'));
  check('bill: Rs 2,600 + 150 drink + 150 delivery = Rs 2,900', (await page.locator('[data-cart-total]').innerText()) === 'Rs 2,900');
  await checkTargets(page, 'Cart');
  check('Complete your meal leaves out what is in the cart', (await page.locator('[data-meal-item="Cold Drink"]').count()) === 0 && (await page.locator('[data-meal-item="Choco Brownie"]').isVisible()));
  await page.getByRole('button', { name: 'Add Choco Brownie' }).click();
  await page.locator('[data-cart-line="Choco Brownie"]').waitFor();
  check('adding from Complete your meal puts it in the cart', (await page.locator('[data-meal-item="Choco Brownie"]').count()) === 0);
  await page.getByRole('button', { name: 'Remove Choco Brownie' }).click();
  await page.locator('[data-cart-line="Choco Brownie"]').waitFor({ state: 'detached' });
  check('a line can be removed', true);
  await page.getByRole('button', { name: 'One more Cold Drink' }).click();
  check('quantity changes the bill', (await page.locator('[data-cart-total]').innerText()) === 'Rs 3,050');
  await page.getByRole('button', { name: 'One less Cold Drink' }).click();
  await page.getByRole('link', { name: 'Edit Chicken Tikka Pizza' }).click();
  await page.waitForURL('**/item/**?line=*');
  const update = page.locator('[data-product-bar]').getByRole('button', { name: /^Update/ });
  await update.waitFor();
  check('editing starts from the chosen size', await pressed(choice(page, 'size', /Medium/)));
  await choice(page, 'size', /Large/).click();
  await update.click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Chicken Tikka Pizza"]').waitFor();
  check('edit: one line, Large now', (await page.locator('[data-cart-line]').count()) === 2 && (await page.locator('[data-cart-line="Chicken Tikka Pizza"]').innerText()).includes('Large'));

  for (const [choiceKey, label] of [['JAZZCASH', 'JazzCash'], ['EASYPAISA', 'Easypaisa'], ['CARD', 'Card']]) {
    const button = page.locator(`[data-payment="${choiceKey}"]`);
    check(`${label} says NOT CONNECTED`, (await button.innerText()).includes('NOT CONNECTED'));
  }
  await page.locator('[data-payment="JAZZCASH"]').click();
  check('choosing it explains that no money is taken', (await page.locator('[data-payment-note]').innerText()).includes('No money is taken'));
  await page.locator('[data-payment="CASH"]').click();
  check('cash has no such note', (await page.locator('[data-payment-note]').count()) === 0);

  const alert = () => page.locator('[data-place-bar]').getByRole('alert').innerText();
  await placeButton(page).click();
  check('name is required', (await alert()).toLowerCase().includes('name'));
  await page.getByLabel('Full name').fill('Sara Khan');
  await placeButton(page).click();
  check('mobile number is required', (await alert()).toLowerCase().includes('mobile'));
  await page.getByLabel(/Mobile/).fill('03001234567');
  await placeButton(page).click();
  check('address is required for delivery', (await alert()).toLowerCase().includes('address'));
  await page.getByLabel(/Delivery address/).fill('House 12, Street 4, DHA');
  await placeButton(page).dblclick(); // a double tap must place only one order
  await page.waitForURL('**/track/**');
  await page.locator('[data-track-status]').waitFor();
  check('the link is long and random', page.url().split('/track/')[1].split('?')[0].length >= 32);
  check('order placed message', await page.getByText('Your order was placed!').isVisible());

  console.log('Screen 6: Tracking');
  await page.locator('[data-map]').waitFor();
  await shot(page, 'phone-track');
  const pageText = await page.locator('main').innerText();
  check('nothing is called live before Phase 5', !/\blive\b/i.test(pageText));
  check('no made-up "minutes away"', !/min(utes)? away/i.test(pageText));
  check('the map says NOT CONNECTED', (await page.locator('[data-map]').innerText()).includes('NOT CONNECTED'));
  check('no rider before the rider step', (await page.locator('[data-rider-card]').count()) === 0);
  check('cash is what is left to pay', (await page.locator('[data-track-payment]').innerText()).includes('To pay in cash'));
  await checkTargets(page, 'Tracking');
  const doneSteps = () => page.locator('[data-step][data-done="true"]').count();
  check('tracking starts on the first step', (await doneSteps()) === 1);
  const total = await page.locator('[data-step]').count();
  check('all seven delivery steps from the shared rules', total === 7);
  for (let done = 2; done <= total; done += 1) {
    await page.getByRole('button', { name: /next step/i }).click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-step][data-done="true"]').length === n, done);
    if (done === 6) {
      await page.locator('[data-rider-card]').waitFor();
      await shot(page, 'phone-track-rider');
      await shot(page, 'phone-track-rider-full', true);
      check('rider card shows from the rider step, marked NOT CONNECTED', (await page.locator('[data-rider-card]').innerText()).includes('NOT CONNECTED'));
      check("the rider's buttons do nothing yet", await page.getByRole('button', { name: /Call the rider/ }).isDisabled());
    }
  }
  check('the delivery reaches Delivered', (await page.locator('[data-track-status]').innerText()).toLowerCase().includes('delivered'));
  check('DEMO buttons leave when finished', (await page.getByRole('button', { name: /next step/i }).count()) === 0);
  check('Orders is the active tab', (await page.locator('[data-bottom-nav] a[aria-current="page"]').innerText()) === 'Orders');

  console.log('Orders and Reorder');
  await page.locator('[data-bottom-nav] a', { hasText: 'Orders' }).click();
  await page.waitForURL('**/orders');
  await page.locator('[data-my-order]').first().waitFor();
  await shot(page, 'phone-orders');
  check('double tap made one order only', (await page.locator('[data-my-order]').count()) === 1);
  await checkTargets(page, 'Orders');
  await page.getByRole('button', { name: 'Reorder' }).click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Chicken Tikka Pizza"]').waitFor();
  check('Reorder fills the cart', (await page.locator('[data-cart-line]').count()) === 2);
  check('details are remembered: no form to fill again', (await page.locator('[data-details-form]').count()) === 0 && (await page.locator('[data-place-summary]').innerText()).includes('Sara Khan'));

  console.log('Pickup and Dine-in');
  await page.locator('[data-mode="TAKEAWAY"]').click();
  check('pickup has no delivery fee', !(await page.locator('main').innerText()).includes('Delivery fee'));
  check('pickup names the branch', (await page.locator('[data-place-summary]').innerText()).includes('Main Branch'));
  check('cash wording follows the choice', (await page.locator('[data-payment="CASH"]').innerText()).includes('Pay at pickup'));
  await page.locator('[data-mode="DINE_IN"]').click();
  await page.getByLabel('Table number').waitFor();
  await placeButton(page).click();
  check('Dine-in needs a table number', (await alert()).toLowerCase().includes('table'));
  await page.getByLabel('Table number').fill('7');
  await page.locator('[data-payment="EASYPAISA"]').click();
  await placeButton(page).click();
  await page.waitForURL('**/track/**');
  await page.locator('[data-track-status]').waitFor();
  check('Dine-in has no map', (await page.locator('[data-map]').count()) === 0);
  check('Dine-in shows the table', (await page.locator('[data-track-banner]').innerText()).includes('Table 7'));
  check('a NOT CONNECTED payment says no money was taken', (await page.locator('[data-track-payment]').innerText()).includes('No money was taken'));
  for (let done = 2; done <= 5; done += 1) {
    await page.getByRole('button', { name: /next step/i }).click();
    await page.waitForFunction((n) => document.querySelectorAll('[data-step][data-done="true"]').length === n, done);
  }
  check('Dine-in ends with Served', (await page.locator('[data-step="PICKED_UP"]').innerText()).includes('Served') && (await page.locator('[data-track-status]').innerText()).includes('Served'));

  console.log('Restaurant rejects an order, order again');
  await page.goto(`${LALA}/menu`);
  await quickAdd(page, 'Loaded Fries', 'Fries');
  await page.goto(`${LALA}/cart`);
  await page.locator('[data-mode="TAKEAWAY"]').click();
  await page.locator('[data-place-summary]').waitFor();
  await placeButton(page).click();
  await page.waitForURL('**/track/**');
  await page.getByRole('button', { name: /reject/i }).click();
  await page.getByText(/not been charged/i).waitFor();
  check('the rejected order explains itself', (await page.locator('[data-step]').count()) === 0);
  await page.getByRole('button', { name: 'Order again' }).click();
  await page.waitForURL('**/cart');
  await page.locator('[data-cart-line="Loaded Fries"]').waitFor();
  check('order again fills the cart', true);
  await page.goto(LALA);
  await page.locator('[data-popular]').waitFor();
  check('finished orders are not shown as running on Home', (await page.locator('[data-active-order]').count()) === 0);

  console.log('Screen 1: Login');
  await page.goto(`${LALA}/account`);
  await page.locator('[data-profile-card]').waitFor();
  check('details are remembered', (await page.getByLabel('Full name').inputValue()) === 'Sara Khan');
  check('the saved address is listed', await page.getByText('House 12, Street 4, DHA').isVisible());
  await shot(page, 'phone-account');
  await checkTargets(page, 'Account');
  await page.locator('[data-login-card]').getByRole('link', { name: 'Login' }).click();
  await page.waitForURL('**/login');
  const continueButton = page.getByRole('button', { name: /^Continue with (WhatsApp|SMS)/ });
  await continueButton.waitFor();
  await shot(page, 'phone-login');
  await shot(page, 'phone-login-full', true);
  check('Skip is there: ordering never needs an account', await page.getByRole('link', { name: 'Skip' }).isVisible());
  check('OTP and Google say NOT CONNECTED', (await page.locator('[data-login-note]').innerText()).includes('NOT CONNECTED') && (await page.locator('[data-google]').innerText()).includes('NOT CONNECTED'));
  check('the bottom bar gives way on Login', (await page.locator('[data-bottom-nav]').count()) === 0);
  await checkTargets(page, 'Login');
  await page.locator('[data-google]').click();
  await page.getByText(/Google login is NOT CONNECTED/).waitFor();
  check('Google explains itself, and goes nowhere', page.url().endsWith('/login'));
  await page.getByLabel('Enter your phone number').fill('12345');
  await continueButton.click();
  check('a wrong number is refused', (await page.locator('main').getByRole('alert').innerText()).includes('mobile number'));
  await page.getByLabel('Enter your phone number').fill('321 7654321');
  await page.locator('[data-channel="sms"]').click();
  check('the button follows WhatsApp or SMS', (await continueButton.innerText()).includes('SMS'));
  await continueButton.click();
  await page.getByLabel('6-digit code').waitFor();
  check('the code step shows the number', await page.getByText('0321-7654321').isVisible());
  await shot(page, 'phone-login-code');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  check('a short code is refused', (await page.locator('main').getByRole('alert').innerText()).includes('6 digits'));
  await page.getByLabel('6-digit code').fill('12a3456');
  check('only digits, at most six', (await page.getByLabel('6-digit code').inputValue()) === '123456');
  await page.getByRole('button', { name: 'Verify and continue' }).click();
  await page.waitForURL('**/account');
  await page.getByRole('button', { name: 'Sign out' }).waitFor();
  check('logged in (DEMO) with the new number', (await page.getByLabel(/Mobile/).inputValue()) === '0321-7654321');
  await page.getByLabel(/New address/i).fill('Office 5, Mall Road');
  await page.getByRole('button', { name: /Add address/ }).click();
  await page.getByText('Office 5, Mall Road', { exact: true }).waitFor();
  await page.getByRole('button', { name: /Remove address 2/ }).click();
  await page.getByText('Office 5, Mall Road', { exact: true }).waitFor({ state: 'detached' });
  check('an address can be added and removed', true);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.locator('[data-login-card]').waitFor();
  check('signing out forgets the details', (await page.getByLabel('Full name').inputValue()) === '');

  console.log('Branch selector and closed banner');
  await page.goto(LALA);
  await page.locator('[data-branch-button]').click();
  await page.locator('[data-branch-list]').waitFor();
  await shot(page, 'phone-branches');
  check('both branches with their state', (await page.locator('[data-branch-list] li').count()) === 2 && (await page.locator('[data-branch-list]').innerText()).includes('Closed'));
  await page.locator('[data-branch-list] a', { hasText: 'Gulberg' }).click();
  await page.waitForURL('**/lala-restaurant/gulberg');
  await page.locator('[data-closed-banner]').waitFor();
  await shot(page, 'phone-closed');
  check('closed banner with the opening hours', (await page.locator('[data-closed-banner]').innerText()).includes('Restaurant closed') && (await page.locator('[data-closed-banner]').innerText()).includes('4:00 pm'));
  check('the same menu, but no add buttons', (await page.locator('[data-popular] [data-menu-item]').count()) === 4 && (await page.locator('[data-add]').count()) === 0);
  await page.locator('[data-popular] [data-menu-item]').first().getByRole('link').click();
  await page.waitForURL('**/item/**');
  check('a dish can be looked at, not added', await page.locator('[data-product-bar]').getByRole('button', { name: /Not taking/ }).isDisabled());
  check('each branch has its own cart', (await page.goto(`${BASE}/lala-restaurant/gulberg/orders`), await empty(page).waitFor(), await cartCount(page)) === 0);
  await page.goto(`${LALA}/orders`);
  await page.locator('[data-my-order]').first().waitFor();
  check('orders stay with their branch', (await page.locator('[data-my-order]').count()) >= 3);

  console.log('Offline message, install offer');
  await page.goto(`${LALA}/cart`);
  await page.locator('[data-cart-line="Loaded Fries"]').waitFor();
  await page.context().setOffline(true);
  await page.locator('[data-offline-banner]').waitFor();
  await shot(page, 'phone-offline');
  check('offline: the cart stays and ordering waits', await placeButton(page).isDisabled());
  await page.context().setOffline(false);
  await page.locator('[data-offline-banner]').waitFor({ state: 'detached' });
  check('back online: the message leaves', !(await placeButton(page).isDisabled()));
  await page.goto(LALA);
  await page.locator('[data-popular]').waitFor();
  check('the install details are linked', (await page.locator('link[rel="manifest"]').getAttribute('href')) === '/lala-restaurant/main/manifest.webmanifest');
  const manifest = await (await page.request.get(`${LALA}/manifest.webmanifest`)).json();
  check('install details carry the restaurant', manifest.name.includes('LALA') && manifest.start_url === '/lala-restaurant/main');
  await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => Boolean(r)));
  check('the service worker is registered', true);
  const offerInstall = () =>
    page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      window.promptCalls = 0;
      event.prompt = async () => {
        window.promptCalls += 1;
      };
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });
  check('no install offer until the browser allows it', (await page.locator('[data-install-banner]').count()) === 0);
  await offerInstall();
  await page.locator('[data-install-banner]').waitFor();
  await page.locator('[data-install-banner]').scrollIntoViewIfNeeded();
  await shot(page, 'phone-install');
  await page.getByRole('button', { name: 'Install', exact: true }).click();
  await page.locator('[data-install-banner]').waitFor({ state: 'detached' });
  check('Install asks the browser, once', (await page.evaluate(() => window.promptCalls)) === 1);
  await offerInstall();
  await page.locator('[data-install-banner]').waitFor();
  await page.getByRole('button', { name: 'Not now' }).click();
  await page.locator('[data-install-banner]').waitFor({ state: 'detached' });
  await page.reload();
  await page.locator('[data-popular]').waitFor();
  await offerInstall();
  await page.waitForTimeout(200);
  check('"Not now" is remembered', (await page.locator('[data-install-banner]').count()) === 0);
  check('no page errors in the phone journey', page.errors.length === 0, page.errors.join('; '));
  await page.context().close();

  console.log('Clear cart, empty screens, wrong links');
  {
    const fresh = await newCustomer();
    await fresh.goto(`${LALA}/cart`);
    await empty(fresh).waitFor();
    await shot(fresh, 'phone-cart-empty');
    check('empty cart says so and shows the bottom bar', (await empty(fresh).innerText()).includes('Your cart is empty') && (await fresh.locator('[data-bottom-nav]').isVisible()));
    await fresh.goto(`${LALA}/orders`);
    await empty(fresh).waitFor();
    check('no orders says so', (await empty(fresh).innerText()).includes('No orders yet'));
    await fresh.goto(`${LALA}/item/no-such-dish`);
    await fresh.getByText('This dish is not on the menu').waitFor();
    check('a wrong dish link explains itself', await fresh.getByRole('link', { name: 'Back to the menu' }).isVisible());
    await fresh.goto(`${LALA}/track/no-such-order`);
    await fresh.getByText('This tracking link was not found.').waitFor();
    check('a wrong tracking link explains itself', true);
    await fresh.goto(`${BASE}/no-such/place`);
    await fresh.getByText('Restaurant not found').waitFor();
    check('a wrong restaurant link explains itself', true);
    await fresh.goto(LALA);
    await fresh.locator('[data-ordering-bar]').click();
    await fresh.getByLabel('New address').fill('House 9, Block C, Johar Town');
    await fresh.getByRole('button', { name: 'Add address' }).click();
    await fresh.getByRole('dialog').getByRole('button', { name: /House 9, Block C/ }).waitFor();
    await shot(fresh, 'phone-how');
    await fresh.getByRole('button', { name: 'Done' }).click();
    await fresh.locator('[data-ordering-bar]', { hasText: 'House 9, Block C' }).waitFor();
    check('the address sheet changes the address line on Home', true);
    await fresh.locator('[data-ordering-bar]').click();
    await fresh.locator('[data-mode="TAKEAWAY"]').click();
    await fresh.getByRole('button', { name: 'Done' }).click();
    await fresh.locator('[data-ordering-bar]', { hasText: 'Pick up from' }).waitFor();
    check('the same sheet changes how to order, and Home follows', (await fresh.locator('[data-ordering-bar]').innerText()).includes('Main Branch'));
    await fresh.locator('[data-ordering-bar]').click();
    await fresh.locator('[data-mode="DELIVERY"]').click();
    await fresh.getByRole('button', { name: 'Done' }).click();
    await fresh.goto(`${LALA}/menu`);
    await quickAdd(fresh, 'Regular Fries', 'Fries');
    await fresh.goto(`${LALA}/cart`);
    await fresh.getByLabel(/Delivery address/).waitFor();
    check('the cart starts with that address', (await fresh.getByLabel(/Delivery address/).inputValue()) === 'House 9, Block C, Johar Town');
    await fresh.getByRole('button', { name: 'Clear' }).click();
    await fresh.getByRole('button', { name: 'Clear cart' }).click();
    await empty(fresh).waitFor();
    check('Clear asks first, then empties the cart', (await fresh.locator('[data-cart-line]').count()) === 0);
    await fresh.goto(`${LALA}/checkout`);
    await fresh.waitForURL('**/cart');
    check('the old checkout link arrives at the cart', true);
    check('no page errors on these screens', fresh.errors.length === 0, fresh.errors.join('; '));
    await fresh.context().close();
  }

  console.log('Restaurant not taking orders (Aziz Pizza: the same code, another brand)');
  {
    const aziz = await newCustomer();
    await aziz.goto(`${AZIZ}/menu`);
    await dish(aziz, 'Classic Pizza').waitFor();
    check('hidden item (Staff Meal) never shows', (await aziz.getByText('Staff Meal').count()) === 0);
    await aziz.getByRole('button', { name: 'Open search' }).click();
    await aziz.getByRole('searchbox').fill('staff');
    await empty(aziz).waitFor();
    check('hidden item is not found by search either', true);
    await aziz.getByRole('searchbox').fill('');
    await dish(aziz, 'Classic Pizza').getByRole('link').click();
    await aziz.waitForURL('**/item/**');
    await aziz.locator('[data-choice="size"]').waitFor();
    check('no crust on a restaurant whose menu has none', (await aziz.locator('[data-choice="Crust"]').count()) === 0);
    await aziz.goto(`${AZIZ}/menu`);
    await quickAdd(aziz, 'Zinger Burger', 'Burgers');
    await quickAdd(aziz, 'Beef Burger');
    await aziz.locator('[data-demo-chip]:visible').first().click();
    await aziz.getByRole('switch', { name: /online orders/i }).click();
    await aziz.getByRole('button', { name: 'Close' }).last().click();
    await aziz.locator('[data-closed-banner]').waitFor();
    await shot(aziz, 'phone-not-taking');
    check('the banner says not taking orders', (await aziz.locator('[data-closed-banner]').innerText()).includes('Not taking orders'));
    check('the menu cannot be ordered from', (await aziz.locator('[data-add]').count()) === 0);
    await aziz.goto(`${AZIZ}/cart`);
    await aziz.locator('[data-closed-banner]').waitFor();
    check('the cart is blocked too', await placeButton(aziz).isDisabled());
    check('no page errors for this brand', aziz.errors.length === 0, aziz.errors.join('; '));
    await aziz.context().close();
  }

  console.log('Third restaurant: its own colours and menu, no LALA in it');
  {
    const karahi = await newCustomer();
    await karahi.goto(`${BASE}/demo-karahi/main`);
    await karahi.getByRole('heading', { name: 'Demo Karahi House', level: 1 }).waitFor();
    await karahi.locator('[data-deal]').first().waitFor();
    const colour = await karahi.locator('[data-bottom-nav] a[aria-current="page"]').evaluate((el) => getComputedStyle(el).color);
    check('its own colour', colour.replace(/\s/g, '').includes('15,118,110') || colour.includes('oklab') || colour.includes('oklch') || colour.includes('srgb'), colour);
    check('its own menu', (await karahi.getByText('Zinger Burger').count()) === 0);
    // The platform credit in the footer ("Powered by Lala Restaurant OS") is fine; the LALA sample brand is not.
    check('no LALA brand on its page', !(await karahi.locator('body').innerText()).includes('LALA Restaurant') && (await karahi.locator('header').innerText()).includes('Demo Karahi House'));
    check('one branch: no branch selector', (await karahi.locator('[data-branch-button]').count()) === 0);
    await shot(karahi, 'phone-second-brand');
    await karahi.context().close();
  }

  console.log('Tablet and desktop');
  for (const [name, viewport] of [
    ['tablet', { width: 820, height: 1100 }],
    ['desktop', { width: 1440, height: 900 }],
  ]) {
    const wide = await newCustomer({ viewport });
    await wide.goto(LALA);
    await wide.locator('[data-popular] [data-menu-item]').first().waitFor();
    check(`${name}: no sideways scroll on Home`, (await sideScroll(wide)) <= 0, String(await sideScroll(wide)));
    await shot(wide, `${name}-home`);
    await wide.goto(`${LALA}/menu`);
    await dish(wide, 'Fajita Pizza').waitFor();
    await dish(wide, 'Fajita Pizza').getByRole('link').click();
    await wide.waitForURL('**/item/**');
    await wide.locator('[data-product-bar]').waitFor();
    check(`${name}: no sideways scroll on Product`, (await sideScroll(wide)) <= 0);
    await shot(wide, `${name}-product`);
    await wide.locator('[data-product-bar]').getByRole('button', { name: /^Add to cart/ }).click();
    await wide.waitForURL('**/menu');
    await dish(wide, 'Fajita Pizza').waitFor();
    if (name === 'desktop') {
      check('desktop: top links instead of the bottom bar', (await wide.locator('[data-bottom-nav]').isVisible()) === false && (await wide.locator('header').getByRole('link', { name: 'Orders' }).isVisible()));
      check('desktop: cart beside the menu', await wide.locator('aside[aria-label="Your Cart"] [data-cart-line="Fajita Pizza"]').isVisible());
    } else {
      check('tablet: the bottom bar stays', await wide.locator('[data-bottom-nav]').isVisible());
    }
    await shot(wide, `${name}-menu-with-cart`);
    await wide.goto(`${LALA}/cart`);
    await placeButton(wide).waitFor();
    await wide.getByLabel('Full name').waitFor();
    check(`${name}: no sideways scroll on Cart`, (await sideScroll(wide)) <= 0);
    await shot(wide, `${name}-cart`);
    await wide.getByLabel('Full name').fill('Bilal');
    await wide.getByLabel(/Mobile/).fill('0321 7654321');
    await wide.getByLabel(/Delivery address/).fill('Flat 3, Gulberg');
    await placeButton(wide).click();
    await wide.waitForURL('**/track/**');
    await wide.locator('[data-track-status]').waitFor();
    await wide.locator('[data-map]').waitFor();
    check(`${name}: no sideways scroll on Tracking`, (await sideScroll(wide)) <= 0);
    await shot(wide, `${name}-track`);
    await wide.goto(`${LALA}/login`);
    await wide.getByRole('button', { name: /^Continue with WhatsApp/ }).waitFor();
    await shot(wide, `${name}-login`);
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

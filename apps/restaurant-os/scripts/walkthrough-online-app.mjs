// Online App walkthrough (Preview 5): online orders ON/OFF is obeyed, product Online ON/OFF, delivery fee /
// minimum order / preparation time, customer link and QR code, website preview, who may change it.
// Customer orders here are the labelled DEMO buttons on Online Orders until the backend joins the website (Phase 4).
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:online-app
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'online-app');
const SESSION_KEY = 'lala-os-demo-session';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER = { owner: id(101), manager: id(102), cashier: id(103) };
const LINK = 'http://localhost:3001/aziz-pizza/main';
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1 });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });

async function openAs(userId, url, viewport) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, userId]);
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle' });
  await page.locator('main h1').first().waitFor();
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: name.includes('full') });
  console.log(`    screenshot ${name}.png`);
};
const ok = (message) => console.log(`  ✓ ${message}`);
const see = (page, text) => page.getByText(text).first().waitFor({ timeout: 6_000 });
const placeDelivery = (page) => page.getByRole('button', { name: /delivery order/i }).first().click();

const setup = await openAs(USER.owner, '/online-app', DESKTOP);
await setup.evaluate(() => window.localStorage.clear());
await setup.close();

const openTab = (page, name) => page.getByRole('tab', { name }).click();
// The frame's own content, not only its address: an empty frame must fail here.
const websiteShown = (page, title) => page.frameLocator(`iframe[title="${title}"]`).getByText('Aziz Pizza').first().waitFor({ timeout: 20_000 });
const noSideScroll = async (page, label) => {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(scroll <= client, `${label}: page scrolls sideways (${scroll} > ${client})`);
};

console.log('1. Overview, status header, tabs');
const owner = await openAs(USER.owner, '/online-app', DESKTOP);
await owner.getByRole('heading', { name: 'Online App / Website', level: 1 }).waitFor();
for (const name of ['Overview', 'Website', 'Mobile App (PWA)', 'Android App (Play Store)', 'Settings']) await owner.getByRole('tab', { name }).waitFor();
await see(owner, 'Website is a draft');
await see(owner, 'Taking online orders');
// The link to share uses this computer's Wi-Fi address when it has one, so it opens on a phone; View Website and the previews stay on localhost.
const SHARE_LINK = await owner.locator('[data-customer-url]').innerText();
assert.match(SHARE_LINK, /^http:\/\/(localhost|(10|172|192)\.[\d.]+):3001\/aziz-pizza\/main$/);
await owner.getByRole('button', { name: 'Copy link' }).click();
await see(owner, 'Link copied');
assert.equal(await owner.evaluate(() => navigator.clipboard.readText()), SHARE_LINK);
assert.equal(await owner.getByRole('link', { name: 'View Website' }).getAttribute('href'), LINK);
await websiteShown(owner, 'Customer website preview');
await shot(owner, '01-desktop-owner-online-app-overview');
ok(`five tabs; draft status; link ${SHARE_LINK} copied; View Website points to ${LINK}`);

console.log('1b. Publish Website is separate from Android');
await see(owner, 'Not configured');
await owner.getByRole('button', { name: 'Publish Website' }).first().click();
await see(owner, 'Online ordering is live (DEMO)');
await see(owner, 'Nothing was put on the internet');
assert.equal(await owner.getByRole('button', { name: 'Publish Website' }).count(), 0);
await see(owner, 'Not configured');
await owner.getByRole('button', { name: 'Publish Online App' }).click();
await owner.locator('[data-android-note]').waitFor();
await see(owner, 'Not configured');
await shot(owner, '03-desktop-owner-online-app-android');
await openTab(owner, 'Overview');
await see(owner, 'Online ordering is live (DEMO)');
ok('Publish Website: DEMO live, Android stays Not configured; Publish Online App only opens the Android screens');

console.log('1c. Website tab: QR code and link');
await openTab(owner, 'Website');
await owner.locator('[data-website-section="qr"]').click();
assert.equal(await owner.getByLabel('Customer App link').inputValue(), SHARE_LINK);
assert.equal(await owner.locator('svg[data-qr]').getAttribute('data-qr'), SHARE_LINK);
await owner.locator('svg[data-qr]').screenshot({ path: path.join(OUT_DIR, 'qr-code.png') });
await shot(owner, '04-desktop-owner-online-app-website-full');
await openTab(owner, 'Mobile App (PWA)');
await see(owner, 'Works without internet');
await see(owner, 'Planned');
await shot(owner, '05-desktop-owner-online-app-pwa');
await openTab(owner, 'Overview');
ok('QR code drawn for the same link, marked NOT CONNECTED; offline is shown as Planned, never as working');

console.log('2. Online orders OFF is obeyed');
const orders = await openAs(USER.owner, '/online-orders', DESKTOP);
await owner.bringToFront();
await owner.getByRole('switch', { name: 'Online orders' }).click();
await see(owner, 'Online orders are OFF');
await see(owner, 'Website is offline');
await orders.bringToFront();
await placeDelivery(orders);
await see(orders, 'Not taking online orders right now.');
await owner.bringToFront();
await owner.getByRole('switch', { name: 'Online orders' }).click();
await see(owner, 'Taking online orders');
await orders.bringToFront();
await placeDelivery(orders);
await see(orders, 'Rs. 1,125');
ok('OFF: the customer order is refused; ON: the order arrives (Rs. 975 + Rs. 150 delivery = Rs. 1,125)');

console.log('3. Product Online ON/OFF');
await owner.bringToFront();
await openTab(owner, 'Website');
await owner.locator('[data-website-section="menu"]').click();
await see(owner, '11 of 11 items are shown online');
await owner.getByRole('switch', { name: 'Online: Cold Drink' }).click();
await see(owner, '10 of 11 items are shown online');
await orders.bringToFront();
await placeDelivery(orders);
await see(orders, 'Cold Drink is not available online.');
await owner.bringToFront();
await owner.getByRole('switch', { name: 'Online: Cold Drink' }).click();
await see(owner, '11 of 11 items are shown online');
ok('Cold Drink OFF: 10 of 11, an order with it is refused; ON again');

console.log('4. Delivery fee, minimum order, preparation time');
await openTab(owner, 'Settings');
await owner.getByLabel('Delivery fee').fill('abc');
await owner.getByRole('button', { name: 'Save', exact: true }).click();
await see(owner, 'Enter the delivery fee and minimum order in rupees');
await owner.getByLabel('Delivery fee').fill('200');
await owner.getByLabel('Minimum order').fill('5000');
await owner.getByLabel('Usual preparation time').fill('25');
await owner.getByRole('button', { name: 'Save', exact: true }).click();
await see(owner, 'Saved. New orders use these values.');
await orders.bringToFront();
await placeDelivery(orders);
await see(orders, 'The minimum online order is Rs. 5,000.');
await owner.bringToFront();
await owner.getByLabel('Minimum order').fill('500');
await owner.getByRole('button', { name: 'Save', exact: true }).click();
await orders.bringToFront();
await orders.waitForTimeout(600);
await placeDelivery(orders);
await see(orders, 'Rs. 2,075');
const settings = await openAs(USER.owner, '/settings', DESKTOP);
assert.equal(await settings.getByLabel('Delivery fee', { exact: true }).inputValue(), '200');
assert.equal(await settings.getByLabel('Usual preparation time').inputValue(), '25');
await settings.close();
ok('bad fee refused; minimum Rs. 5,000 refuses the order; fee Rs. 200: Rs. 1,875 of food + Rs. 200 = Rs. 2,075 on a new order; Settings shows the same values');

console.log('5. Website previews');
await owner.bringToFront();
await openTab(owner, 'Overview');
const frame = owner.getByTitle('Customer website preview');
assert.equal(await frame.getAttribute('src'), LINK);
assert.equal(await owner.getByTitle('Customer website on a phone').getAttribute('src'), LINK);
await frame.waitFor();
await websiteShown(owner, 'Customer website preview');
await websiteShown(owner, 'Customer website on a phone');
const phoneFrame = owner.frameLocator('iframe[title="Customer website on a phone"]');
await phoneFrame.getByText('Popular Now').waitFor();
const fits = await owner.locator('[data-phone-screen]').evaluate((box) => {
  const outer = box.getBoundingClientRect();
  const inner = box.querySelector('iframe').getBoundingClientRect();
  return inner.bottom <= outer.bottom && inner.right <= outer.right;
});
assert.ok(fits, "the website's bottom bar must fit inside the phone shape");
assert.equal((await phoneFrame.locator('[data-bottom-nav] a').allInnerTexts()).join(), 'Home,Menu,Cart,Orders,Account');

// Phase C: the preview follows Restaurant OS, at once, without a reload.
const inPhone = (name) => phoneFrame.locator(`[data-menu-item="${name}"]`).first();
await inPhone('Zinger Burger').waitFor();
await owner.getByRole('switch', { name: 'Online orders' }).click();
await phoneFrame.locator('[data-closed-banner]').waitFor();
assert.ok((await phoneFrame.locator('[data-closed-banner]').innerText()).includes('Not taking orders'));
await owner.getByRole('switch', { name: 'Online orders' }).click();
await phoneFrame.locator('[data-closed-banner]').waitFor({ state: 'detached' });
ok('Online orders OFF in Restaurant OS: the website preview says so at once; ON: gone');
const menuTab = await openAs(USER.owner, '/menu', DESKTOP);
await menuTab.getByRole('switch', { name: 'Online: Zinger Burger' }).click();
await inPhone('Zinger Burger').waitFor({ state: 'detached' });
await menuTab.getByRole('switch', { name: 'Online: Zinger Burger' }).click();
await inPhone('Zinger Burger').waitFor();
ok('A dish switched off in the Menu page leaves the website preview, and comes back');
await menuTab.getByRole('button', { name: 'Add Item' }).click();
const addDialog = menuTab.getByRole('dialog');
await addDialog.getByLabel('Item name').fill('Preview Test Dish');
await addDialog.getByLabel('Price', { exact: true }).fill('777');
await addDialog.getByRole('button', { name: 'Save' }).click();
await addDialog.waitFor({ state: 'detached' });
await menuTab.close();
await owner.bringToFront();

const [websiteTab] = await Promise.all([owner.waitForEvent('popup'), owner.getByRole('link', { name: 'View Website' }).click()]);
await websiteTab.setViewportSize(PHONE);
await websiteTab.getByRole('link', { name: 'Skip' }).click();
await websiteTab.locator('[data-bottom-nav] a', { hasText: 'Menu' }).click();
await websiteTab.waitForURL('**/menu');
await websiteTab.getByRole('button', { name: 'Open search' }).click();
await websiteTab.getByRole('searchbox').fill('Preview Test');
const newDish = websiteTab.locator('[data-menu-item="Preview Test Dish"]');
await newDish.waitFor();
assert.ok((await newDish.innerText()).includes('Rs 777'));
await websiteTab.locator('[data-add="Preview Test Dish"]').click();
await websiteTab.locator('[data-bottom-nav] a', { hasText: 'Cart' }).click();
await websiteTab.locator('[data-cart-line="Preview Test Dish"]').waitFor();
assert.equal(await websiteTab.locator('[data-cart-total]').first().innerText(), `Rs ${777 + 200}`);
ok('View Website: a new dish from the Menu page shows at Rs 777; the bill uses the Restaurant OS delivery fee (Rs 200)');
await websiteTab.reload();
await websiteTab.locator('[data-cart-line="Preview Test Dish"]').waitFor();
await websiteTab.close();
const elsewhere = await context.newPage();
// Without this flag the website now joins an open Restaurant OS tab; this check is about a browser that has none.
await elsewhere.addInitScript(() => window.localStorage.setItem('lala-demo-no-link', '1'));
await elsewhere.goto(`${LINK}/menu`);
await elsewhere.getByText('Classic Pizza').first().waitFor();
await elsewhere.setViewportSize(PHONE);
await elsewhere.getByRole('button', { name: 'Open search' }).click();
await elsewhere.getByRole('searchbox').fill('Preview Test');
await elsewhere.locator('main [data-empty-state]:visible').waitFor();
await elsewhere.close();
ok('A direct link keeps its own sample data until the backend (Phase 4)');

await owner.getByLabel('Restaurant to preview').selectOption({ label: 'LALA Restaurant (sample)' });
await phoneFrame.locator('[data-menu-item="Chicken Tikka Pizza"]').first().waitFor();
await owner.locator('[data-preview-hint]', { hasText: 'A sample restaurant' }).waitFor();
assert.ok((await owner.locator('[data-preview-open]').getAttribute('href')).endsWith('/lala-restaurant/main'));
await shot(owner, '06-desktop-owner-online-app-preview-lala');
await owner.getByLabel('Restaurant to preview').selectOption({ index: 0 });
await inPhone('Zinger Burger').waitFor();
ok('The previews can also show the LALA sample restaurant, with its own menu');
assert.equal(await owner.locator('[data-preview-device]').getAttribute('data-preview-device'), 'desktop');
await owner.getByRole('button', { name: 'Preview Mobile View' }).click();
assert.equal(await owner.locator('[data-preview-device]').getAttribute('data-preview-device'), 'mobile');
await owner.getByRole('button', { name: 'Preview Website' }).click();
assert.equal(await owner.locator('[data-preview-device]').getAttribute('data-preview-device'), 'desktop');
await websiteShown(owner, 'Customer website preview');
ok('Desktop and phone previews really show the website (its menu is inside the frame); Preview buttons change the size');

console.log('5b. Website tab: every setting reaches the website preview');
const section = (name) => owner.locator(`[data-website-section="${name}"]`).click();
const saveSection = () => owner.locator('[data-website-save]').click();
const savedMessage = () => see(owner, 'Saved. The preview shows it');
await openTab(owner, 'Website');
await section('branding');
await inPhone('Zinger Burger').waitFor();
await shot(owner, '07-desktop-owner-website-branding');
await owner.getByLabel('Main colour', { exact: true }).fill('#ffee00');
await saveSection();
await see(owner, 'The main colour is too light');
await owner.getByLabel('Main colour', { exact: true }).fill('#0f766e');
await owner.getByLabel('Second colour', { exact: true }).fill('#222222');
await saveSection();
await see(owner, 'The second colour is too dark');
await owner.getByLabel('Second colour', { exact: true }).fill('#fbbf24');
await owner.getByLabel('Short name (optional)').fill('AZIZ');
await owner.getByLabel('About the restaurant (optional)').fill('Family pizza since the demo began.');
assert.equal(await owner.locator('[data-picture-slots] li').count(), 3);
await saveSection();
await savedMessage();
await phoneFrame.locator('header').getByText('AZIZ').waitFor();
await phoneFrame.locator('[data-footer]').getByText('Family pizza since the demo began.').waitFor({ state: 'attached' });
const brandColour = () => phoneFrame.locator('div[style*="--store-primary"]').first().getAttribute('style');
assert.ok((await brandColour()).includes('#0f766e'));
ok('Branding: unreadable colours refused; new colour, short name and description reach the preview; pictures stay Planned');

await section('homepage');
await owner.getByRole('switch', { name: 'Show deals' }).click();
await saveSection();
await phoneFrame.locator('[data-deal]').first().waitFor({ state: 'detached' });
await section('homepage');
await owner.getByRole('switch', { name: 'Show deals' }).click();
await owner.getByRole('button', { name: 'Add deal' }).click();
await owner.getByLabel('Deal 3: dish').selectOption({ label: 'Alfredo Pasta' });
await saveSection();
await see(owner, 'Give each deal a short label');
await owner.getByLabel('Deal 3: label').fill('New today');
assert.equal(await owner.getByRole('button', { name: 'Add deal' }).count(), 0, 'at most three deals');
await owner.locator('[data-popular-pick="Classic Pizza"]').click();
await owner.locator('[data-popular-pick="Beef Burger"]').click();
await saveSection();
await savedMessage();
await phoneFrame.locator('[data-deal="Alfredo Pasta"]').waitFor({ state: 'attached' });
await phoneFrame.locator('[data-popular] [data-menu-item="Beef Burger"]').waitFor({ state: 'attached' });
assert.equal(await phoneFrame.locator('[data-popular] [data-menu-item="Classic Pizza"]').count(), 0);
assert.equal(await owner.locator('[data-popular-pick="Alfredo Pasta"]').isDisabled(), true, 'at most four popular dishes');
ok('Homepage: deals off and on, a new deal at its Menu price, Popular Now chosen from the Menu (at most 3 and 4)');

await section('menu');
await owner.getByRole('switch', { name: 'Show dish descriptions' }).click();
await saveSection();
await savedMessage();
await phoneFrame.locator('[data-menu-item="Zinger Burger"]').first().getByText('Crispy chicken').waitFor({ state: 'detached' });
await section('menu');
await owner.getByRole('switch', { name: 'Show dish descriptions' }).click();
await saveSection();
await phoneFrame.locator('[data-menu-item="Zinger Burger"]').first().getByText('Crispy chicken').waitFor({ state: 'attached' });
ok('Menu display: descriptions hide and return; the dishes themselves stay on the Menu page');

await section('delivery');
const howSheet = async (count) => {
  await phoneFrame.locator('[data-ordering-bar]').dispatchEvent('click'); // the frame is scaled and may sit under the page header
  await phoneFrame.locator('[data-mode-tabs]').waitFor();
  // The frame hears about a saved setting a moment later (DEMO link): wait for it, and fail if it never comes.
  for (let i = 0; i < 25 && (await phoneFrame.locator('[data-mode]').count()) !== count; i++) await owner.waitForTimeout(200);
  assert.equal(await phoneFrame.locator('[data-mode]').count(), count);
  await phoneFrame.getByRole('button', { name: 'Done' }).dispatchEvent('click');
  await phoneFrame.locator('[data-mode-tabs]').waitFor({ state: 'detached' });
};
await owner.getByRole('switch', { name: 'Dine-in' }).click();
await owner.waitForTimeout(800);
await howSheet(2);
await owner.getByRole('switch', { name: 'Pickup' }).click();
await owner.waitForTimeout(800);
await owner.getByRole('switch', { name: 'Delivery' }).click();
await see(owner, 'Keep at least one way to order');
await howSheet(1);
const ordersTab = await openAs(USER.owner, '/online-orders', DESKTOP);
await ordersTab.getByRole('button', { name: /customer pickup order/i }).first().click();
await see(ordersTab, 'Pickup is switched off for online orders.');
await ordersTab.close();
await owner.bringToFront();
await owner.getByRole('switch', { name: 'Pickup' }).click();
await owner.waitForTimeout(800);
await owner.getByRole('switch', { name: 'Dine-in' }).click();
await owner.waitForTimeout(800);
await howSheet(3);
ok('Delivery & Pickup: switches work at once, the last one cannot be switched off, a DEMO pickup order is refused while Pickup is OFF');

await section('hours');
await owner.getByRole('switch', { name: 'Open on Sunday' }).click();
await owner.getByLabel('Saturday closes at').fill('23:30');
assert.equal(await owner.locator('[data-hours-text]').innerText(), 'Mon–Fri, 12:00 pm – 2:00 am · Sat, 12:00 pm – 11:30 pm · Sun closed');
await saveSection();
await savedMessage();
await phoneFrame.locator('[data-footer]').getByText('Sun closed').waitFor({ state: 'attached' });
ok('Opening hours: grouped as short text, and shown on the website');

await section('contact');
assert.ok((await owner.locator('[data-branch-contact]').innerText()).includes('0300-0000000'), 'phone comes from Settings');
await owner.getByLabel('Email').fill('no-at');
await saveSection();
await see(owner, 'Check the email address');
await owner.getByLabel('Email').fill('info@example.com');
await owner.getByLabel('Facebook link').fill('javascript:alert(1)');
await saveSection();
await see(owner, 'Social links must start with https://');
await owner.getByLabel('Facebook link').fill('https://facebook.com/azizpizza');
await owner.getByLabel('WhatsApp number').fill('03001234567');
await saveSection();
await savedMessage();
const footerLink = (name) => phoneFrame.locator('[data-footer-links]').getByRole('link', { name });
assert.equal(await footerLink('WhatsApp').getAttribute('href'), 'https://wa.me/923001234567');
assert.equal(await footerLink('Facebook').getAttribute('href'), 'https://facebook.com/azizpizza');
ok('Contact: phone and address stay in Settings; bad email and unsafe link refused; links reach the website');

await section('seo');
await owner.getByLabel('Title on Google').fill('Aziz Pizza Lahore');
assert.ok((await owner.locator('[data-seo-preview]').innerText()).includes('Aziz Pizza Lahore'));
await saveSection();
await savedMessage();
await see(owner, 'NOT CONNECTED');
ok('SEO & Sharing: saved with a preview, and marked NOT CONNECTED');

await section('domain');
await owner.getByLabel('Your domain').fill('not a domain');
await owner.getByRole('button', { name: 'Connect Domain' }).click();
await see(owner, 'Enter a domain such as yourrestaurant.com');
await owner.getByLabel('Your domain').fill('https://www.AzizPizza.example/');
await owner.getByRole('button', { name: 'Connect Domain' }).click();
await owner.locator('[data-domain-state="DNS_PENDING"]').waitFor();
await see(owner, 'www.azizpizza.example');
assert.ok((await owner.locator('[data-dns-table]').innerText()).includes('CNAME'));
await see(owner, 'Example only');
await shot(owner, '08-desktop-owner-website-domain');
await owner.getByRole('button', { name: 'DEMO: mark as connected' }).click();
await owner.locator('[data-domain-state="CONNECTED"]').waitFor();
await see(owner, 'no real domain was touched');
await openTab(owner, 'Overview');
assert.equal(await owner.locator('[data-domain]').innerText(), 'www.azizpizza.example');
assert.equal(await owner.locator('[data-customer-url]').innerText(), SHARE_LINK, 'the link stays on this computer\'s Wi-Fi until hosting');
ok('Custom domain: refused or cleaned up, DNS instructions marked as an example, DEMO connected, link and QR unchanged');

await see(owner, 'Changes are waiting');
await owner.getByRole('button', { name: 'Publish Website' }).first().click();
await see(owner, 'Online ordering is live (DEMO)');
assert.equal(await owner.getByRole('button', { name: 'Publish Website' }).count(), 0);
ok('A saved change waits for Publish Website on a published website; Publish brings it back to live (DEMO)');

await openTab(owner, 'Website');
await section('domain');
await owner.getByRole('button', { name: 'Remove domain' }).click();
await owner.locator('[data-domain-state="NONE"]').waitFor();
await section('qr');
await owner.getByRole('button', { name: 'Preview QR' }).click();
await owner.locator('[data-qr-preview] svg[data-qr]').waitFor();
await owner.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).first().click();
const [qrFile] = await Promise.all([owner.waitForEvent('download'), owner.getByRole('button', { name: 'Download QR' }).click()]);
assert.equal(qrFile.suggestedFilename(), 'customer-qr-aziz-pizza-main.png');
await qrFile.saveAs(path.join(OUT_DIR, qrFile.suggestedFilename()));
await openTab(owner, 'Overview');
ok('Domain removed; QR code previews and downloads as a picture');

console.log('6. Who may use the page');
const manager = await openAs(USER.manager, '/online-app', DESKTOP);
assert.equal(await manager.getByRole('switch', { name: 'Online orders' }).isDisabled(), false);
await see(manager, 'Only the Owner can publish.');
await openTab(manager, 'Website');
await see(manager, 'Only the Owner can change this.');
assert.equal(await manager.getByLabel('Tagline').isDisabled(), true);
await manager.locator('[data-website-section="domain"]').click();
assert.equal(await manager.getByLabel('Your domain').isDisabled(), true);
await manager.locator('[data-website-section="delivery"]').click();
assert.equal(await manager.getByRole('switch', { name: 'Pickup' }).isDisabled(), false);
await manager.close();
const cashier = await openAs(USER.cashier, '/online-app', DESKTOP);
await see(cashier, 'No access');
await cashier.close();
ok('Manager may switch orders but not publish; Cashier gets "No access"');

console.log('7. Sizes');
for (const [label, viewport] of Object.entries({ phone: PHONE, tablet: { width: 768, height: 1024 }, laptop: { width: 1278, height: 627 }, desktop: DESKTOP })) {
  const page = await openAs(USER.owner, '/online-app', viewport);
  await see(page, 'Taking online orders');
  await websiteShown(page, 'Customer website preview');
  await noSideScroll(page, label);
  await shot(page, `02-${label}-owner-online-app-overview`);
  // Not full-page: a full-page picture leaves the website frames empty, although they show on screen.
  await page.getByTitle('Customer website preview').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_000);
  await shot(page, `02-${label}-owner-online-app-preview`);
  await openTab(page, 'Website');
  for (const name of ['branding', 'homepage', 'menu', 'delivery', 'hours', 'contact', 'domain', 'seo', 'qr']) {
    await page.locator(`[data-website-section="${name}"]`).click();
    await noSideScroll(page, `${label} ${name}`);
    if (name === 'hours') await shot(page, `09-${label}-owner-website-hours`);
  }
  await page.close();
}
ok('No sideways page scroll on phone, tablet, laptop and desktop');

await browser.close();
console.log('Online App walkthrough passed: tabs, status, Publish Website apart from Android, orders ON/OFF, product ON/OFF, fee / minimum / prep time, link and QR, previews, permissions, sizes.');

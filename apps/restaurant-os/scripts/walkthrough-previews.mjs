// The Customer and Rider App on a phones inside Restaurant OS show the real apps; when an app is not running they say so and come back
// by themselves, never a blank frame. Usage: start the apps (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os walkthrough:previews
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'previews');
const OWNER = '00000000-0000-4000-8000-000000000101';
const DESKTOP = { width: 1440, height: 900 };

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({ deviceScaleFactor: 1, viewport: DESKTOP, serviceWorkers: 'block' });
// The Aziz Pizza test data (MASTER_PROMPT.md §12): the owner's own demo is Lala Restaurant.
await context.addInitScript(() => window.localStorage.setItem('lala-os-demo-fixture', 'acceptance'));
await context.addInitScript((uid) => window.sessionStorage.setItem('lala-os-demo-session', JSON.stringify({ userId: uid })), OWNER);
const page = await context.newPage();
const ok = (message) => console.log(`  ✓ ${message}`);
const shot = async (name) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) });
  console.log(`    screenshot ${name}.png`);
};
const open = async (url) => {
  await page.goto(`${BASE_URL}${url}`, { waitUntil: 'domcontentloaded' });
  await page.locator('main h1').first().waitFor();
};
/** The frame must be on the page, have a real size, and show the app's own page inside. */
async function frameShows(title, text) {
  const frame = page.frameLocator(`iframe[title="${title}"]`);
  const box = page.locator(`iframe[title="${title}"]`);
  await box.scrollIntoViewIfNeeded();
  const size = await box.boundingBox();
  assert.ok(size && size.width > 100 && size.height > 100, `${title} has no size: ${JSON.stringify(size)}`);
  await frame.getByText(text).first().waitFor({ timeout: 45_000 });
}

console.log('1. Website tab: the phone preview');
await open('/online-app');
await page.getByRole('tab', { name: 'Website' }).click();
await frameShows('Customer website on a phone', /Aziz Pizza/);
await shot('01-website-tab-phone');
ok('the phone preview shows the real customer website');

console.log('2. Overview tab: the live preview, desktop and mobile');
await page.getByRole('tab', { name: 'Overview' }).click();
await page.locator('[role=group]').getByRole('button', { name: 'Desktop', exact: true }).click();
await frameShows('Customer website preview', /Aziz Pizza/);
await shot('02-overview-desktop');
await page.locator('[role=group]').getByRole('button', { name: 'Mobile', exact: true }).click();
await frameShows('Customer website preview', /Aziz Pizza/);
await shot('03-overview-mobile');
ok('the live preview shows the website on both sizes');

console.log('3. Riders page: the Rider App on a phone');
await open('/riders');
await frameShows('Rider App on a phone', /Home|Orders/);
await shot('04-riders-preview');
ok('the phone frame shows the real Rider App');

console.log('4. An app that is not running says so, and comes back by itself');
await context.route('http://localhost:3002/**', (route) => route.abort('connectionrefused'));
await open('/riders');
await page.locator('[data-app-not-running]').getByText('The Rider App is not running on this computer').waitFor({ timeout: 15_000 });
await page.locator('[data-app-not-running]').scrollIntoViewIfNeeded();
await shot('05-rider-app-not-running');
await context.unroute('http://localhost:3002/**');
await frameShows('Rider App on a phone', /Home|Orders/);
ok('Rider App: a clear message instead of a blank frame; the preview returns when the app is back');

await context.route('http://localhost:3001/**', (route) => route.abort('connectionrefused'));
await open('/online-app');
await page.getByRole('tab', { name: 'Website' }).click();
await page.locator('[data-app-not-running]').getByText('The Customer App is not running on this computer').first().waitFor({ timeout: 15_000 });
await page.locator('[data-app-not-running]').first().scrollIntoViewIfNeeded();
await shot('06-customer-app-not-running');
await context.unroute('http://localhost:3001/**');
await frameShows('Customer website on a phone', /Aziz Pizza/);
ok('Customer App: the same');

await browser.close();
console.log('Previews walkthrough passed: Website tab, Overview, Rider App, and a clear message when an app is not running.');

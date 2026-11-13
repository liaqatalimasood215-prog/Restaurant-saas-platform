// Screenshots of the eight Inventory & Suppliers screens on the Lala demo data (fresh browser storage), for the owner's UI review:
// Suppliers, Stock (Ingredients), Recipes overview, Stock Movements, Cooking Plan, Available Food, Wastage, Expiry —
// each on a desktop, a tablet and a phone. Nothing is changed in the app; it only looks.
// Usage: start the app (pnpm dev), then: SHOTS=inventory-ui-after node scripts/screenshots-inventory.mjs
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'inventory-ui');
const SESSION_KEY = 'lala-os-demo-session';
const OWNER = '00000000-0000-4000-8000-000000000101';
const SIZES = { desktop: { width: 1440, height: 900 }, tablet: { width: 820, height: 1180 }, phone: { width: 390, height: 844 } };
const ONLY = process.env.SIZES ? process.env.SIZES.split(',') : Object.keys(SIZES);

const section = (page, name) => page.getByRole('tab', { name, exact: true }).click();
const stockTab = async (page, name) => {
  await section(page, 'Stock');
  await page.getByRole('tab', { name }).click();
};
const SCREENS = [
  ['1-suppliers', (page) => section(page, 'Suppliers')],
  ['2-stock', (page) => stockTab(page, /^Ingredients/)],
  ['3-recipes-overview', (page) => section(page, 'Recipes')],
  ['4-stock-movements', (page) => stockTab(page, /^Stock Movements/)],
  ['5-cooking-plan', (page) => stockTab(page, /^Cooking Plan/)],
  ['6-available-food', (page) => stockTab(page, /^Available Food/)],
  ['7-wastage', (page) => stockTab(page, /^Wastage & Expiry/)],
  [
    '8-expiry',
    async (page) => {
      await stockTab(page, /^Wastage & Expiry/);
      await page.getByRole('tab', { name: /^Expiring soon/ }).click();
    },
  ],
];

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
try {
  for (const size of ONLY) {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: SIZES[size] });
    const page = await context.newPage();
    await page.addInitScript(([key, uid]) => window.sessionStorage.setItem(key, JSON.stringify({ userId: uid })), [SESSION_KEY, OWNER]);
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle' });
    await page.locator('main h1').first().waitFor();
    for (const [name, open] of SCREENS) {
      await open(page);
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(OUT_DIR, `${name}-${size}.png`), fullPage: size === 'tablet' });
      console.log(`  screenshot ${name}-${size}.png`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

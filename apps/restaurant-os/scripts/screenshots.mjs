// Screenshots of the Restaurant OS prototype at phone, tablet and desktop sizes (PROJECT_RULES.md §16).
// Uses the Microsoft Edge already installed on Windows (no browser download).
// Usage: start the app (pnpm dev), then: pnpm --filter @restaurant-saas/restaurant-os screenshots
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../screenshots', process.env.SHOTS ?? 'latest');
const SESSION_KEY = 'lala-os-demo-session';

// Demo users from src/lib/api/demo/seed.ts
const USERS = {
  OWNER: '00000000-0000-4000-8000-000000000101',
  MANAGER: '00000000-0000-4000-8000-000000000102',
  CASHIER: '00000000-0000-4000-8000-000000000103',
  WAITER: '00000000-0000-4000-8000-000000000104',
  SERVICE_WAITER: '00000000-0000-4000-8000-000000000105',
  KITCHEN: '00000000-0000-4000-8000-000000000106',
  LOGGED_OUT: null,
};

const SIZES = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

const SHOTS = [
  { name: '01-desktop-owner-tables', size: 'desktop', role: 'OWNER', path: '/tables' },
  { name: '02-desktop-owner-online-app', size: 'desktop', role: 'OWNER', path: '/online-app' },
  { name: '03-desktop-owner-online-app-open-full-app', size: 'desktop', role: 'OWNER', path: '/online-app', click: 'button:has-text("Open Full App")' },
  { name: '04-desktop-owner-riders', size: 'desktop', role: 'OWNER', path: '/riders' },
  { name: '05-desktop-owner-dashboard-coming-soon', size: 'desktop', role: 'OWNER', path: '/dashboard' },
  { name: '06-desktop-owner-profile-menu', size: 'desktop', role: 'OWNER', path: '/tables', click: 'button[aria-label="Profile menu"]' },
  { name: '07-desktop-manager-summary-no-access', size: 'desktop', role: 'MANAGER', path: '/summary' },
  { name: '08-phone-login', size: 'phone', role: 'LOGGED_OUT', path: '/' },
  { name: '09-desktop-owner-simulated-offline', size: 'desktop', role: 'OWNER', path: '/tables', simulateError: true },
  { name: '10-tablet-landscape-cashier-pos', size: 'tabletLandscape', role: 'CASHIER', path: '/pos' },
  { name: '11-tablet-kitchen-kds', size: 'tablet', role: 'KITCHEN', path: '/kitchen' },
  { name: '12-phone-waiter-tables', size: 'phone', role: 'WAITER', path: '/tables' },
  { name: '13-phone-owner-more-menu', size: 'phone', role: 'OWNER', path: '/tables', click: 'button:has-text("More")' },
  { name: '14-desktop-demo-mode-explained', size: 'desktop', role: 'OWNER', path: '/pos', click: 'button:has-text("Demo mode")' },
  { name: '15-desktop-owner-staff', size: 'desktop', role: 'OWNER', path: '/staff' },
  { name: '16-desktop-owner-add-staff-wizard', size: 'desktop', role: 'OWNER', path: '/staff', click: 'button:has-text("Add Staff")' },
  { name: '17-phone-service-waiter-home', size: 'phone', role: 'SERVICE_WAITER', path: '/' },
  { name: '18-desktop-owner-manage-areas', size: 'desktop', role: 'OWNER', path: '/tables', click: 'button:has-text("Manage Areas")' },
  { name: '19-desktop-owner-add-many-tables', size: 'desktop', role: 'OWNER', path: '/tables', click: 'button:has-text("Add Table")', then: 'button:has-text("Many tables")' },
  { name: '20-phone-owner-tables', size: 'phone', role: 'OWNER', path: '/tables' },
  { name: '21-desktop-owner-role-permissions', size: 'desktop', role: 'OWNER', path: '/staff', click: 'button[role="tab"]:has-text("Role Permissions")' },
  { name: '22-desktop-owner-menu', size: 'desktop', role: 'OWNER', path: '/menu' },
  { name: '23-desktop-owner-menu-add-item', size: 'desktop', role: 'OWNER', path: '/menu', click: 'button:has-text("Add Item")' },
  { name: '24-desktop-owner-settings', size: 'desktop', role: 'OWNER', path: '/settings' },
];

const browser = await chromium.launch({ channel: 'msedge' });
await mkdir(OUT_DIR, { recursive: true });

for (const shot of SHOTS) {
  const context = await browser.newContext({ viewport: SIZES[shot.size], deviceScaleFactor: 1 });
  if (USERS[shot.role]) {
    await context.addInitScript(
      ([key, userId]) => window.sessionStorage.setItem(key, JSON.stringify({ userId })),
      [SESSION_KEY, USERS[shot.role]],
    );
  }
  const page = await context.newPage();
  await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor({ timeout: 15_000 });
  if (shot.simulateError) {
    await page.click('button[aria-label="Profile menu"]');
    await page.getByLabel('Simulate connection error').check();
    await page.keyboard.press('Escape');
    await page.getByText('Demo mode · offline (simulated)').waitFor({ timeout: 5_000 });
  }
  if (shot.click) {
    await page.click(shot.click);
    if (shot.then) await page.click(shot.then);
    await page.waitForTimeout(400);
  }
  const file = path.join(OUT_DIR, `${shot.name}.png`);
  await page.screenshot({ path: file });
  console.log(`saved ${path.relative(process.cwd(), file)}`);
  await context.close();
}

await browser.close();

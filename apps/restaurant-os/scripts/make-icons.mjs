// Renders the app icons (PNG) from the SVG logo with the installed Microsoft Edge.
// Usage: pnpm --filter @restaurant-saas/restaurant-os exec node scripts/make-icons.mjs
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = await readFile(path.join(root, 'src/app/icon.svg'), 'utf8');
const hat = svg.replace(/<rect width="64" height="64" rx="14" fill="#e31e24"\/>/, '');
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();

async function render(file, size, html) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`);
  await page.screenshot({ path: path.join(root, file), omitBackground: true });
  console.log(`saved ${file}`);
}

const full = (size) => svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
await render('public/icons/icon-192.png', 192, full(192));
await render('public/icons/icon-512.png', 512, full(512));
await render('src/app/apple-icon.png', 180, full(180));
// Maskable: full-bleed red, logo inside the 80% safe zone.
await render(
  'public/icons/maskable-512.png',
  512,
  `<div style="width:512px;height:512px;background:#e31e24;display:flex;align-items:center;justify-content:center">${hat.replace('<svg ', '<svg width="330" height="330" ')}</div>`,
);
await browser.close();

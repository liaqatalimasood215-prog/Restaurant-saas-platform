// The Rider App as a real phone opens it from the QR code: on this computer's Wi-Fi address, not localhost, and also with a browser
// that refuses to save anything. A rider must still get through a whole delivery. Usage: start the apps, then:
// pnpm --filter @restaurant-saas/rider walkthrough:phone
import assert from 'node:assert/strict';
import { networkInterfaces } from 'node:os';
import { chromium } from 'playwright-core';

const lan = Object.entries(networkInterfaces())
  .filter(([name]) => !/virtual|vmware|vethernet|wsl|bluetooth/i.test(name))
  .sort(([a], [b]) => Number(/wi-?fi|wlan/i.test(b)) - Number(/wi-?fi|wlan/i.test(a)))
  .flatMap(([, addresses]) => addresses ?? [])
  .find(({ family, address }) => family === 'IPv4' && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address))?.address;
assert.ok(lan, 'this computer has no Wi-Fi address');
const ADDRESS = `${process.env.RIDER_URL ?? `http://${lan}:3002`}/aziz-pizza/main`;
const browser = await chromium.launch({ channel: 'msedge' });

async function delivery(label, initScript) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(ADDRESS);
  await page.locator('[data-login-account]').first().click();
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.locator('[data-availability]').waitFor();
  // Tapping, never reloading: a browser that saves nothing keeps the login only until a reload.
  const count = await page.locator('a[data-delivery]').count();
  let number = null;
  for (let i = 0; i < count && !number; i++) {
    const link = page.locator('a[data-delivery]').nth(i);
    const shown = await link.getAttribute('data-delivery');
    await link.click();
    await page.waitForURL(/\/delivery\//);
    await page.waitForTimeout(800);
    if ((await page.getByRole('button', { name: 'Pick Up Order', exact: true }).count()) > 0) number = shown;
    else {
      await page.goBack();
      await page.locator('a[data-delivery]').first().waitFor();
    }
  }
  assert.ok(number, `${label}: no order waiting for pick up`);
  const said = async (step) => {
    await page.waitForTimeout(900);
    const text = await page.locator('body').innerText();
    assert.ok(!text.includes('The connection failed'), `${label}: "${step}" says the connection failed`);
  };
  await page.getByRole('button', { name: 'Pick Up Order', exact: true }).click();
  await said('Pick Up Order');
  await page.getByRole('button', { name: 'Start Delivery', exact: true }).click();
  await said('Start Delivery');
  await page.getByRole('button', { name: 'Mark Delivered', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm Delivery', exact: true }).click();
  await said('Confirm Delivery');
  assert.deepEqual(errors, [], `${label}: page errors`);
  await context.close();
  console.log(`  ✓ ${label}: order #${number} from Pick Up to Delivered`);
}

console.log(`Rider App on ${ADDRESS}`);
await delivery('normal phone');
await delivery('browser that refuses to save', () => {
  Storage.prototype.setItem = () => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  };
});
await delivery('browser with storage blocked', () => {
  Object.defineProperty(window, 'localStorage', {
    get() {
      throw new DOMException('Access is denied for this document.', 'SecurityError');
    },
  });
});
await browser.close();
console.log('Phone walkthrough passed.');

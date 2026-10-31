import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEW_ONLINE_PUBLISHING,
  NO_TAX,
  WEEK_DAYS,
  canGrant,
  canPublishWebsite,
  checkWebsiteConfig,
  contrastRatio,
  formatOpeningHours,
  isWebsitePreviewData,
  normalizeDomain,
  onlineStatus,
  platformSubdomain,
  publishedWebsite,
  recommendedPermissions,
  withWebsiteChanges,
  type DayHours,
  type OnlinePublishing,
  type WebsiteConfig,
  type WeekDay,
} from './index';

const everyDay = (hours: DayHours) => Object.fromEntries(WEEK_DAYS.map((day) => [day, hours])) as Record<WeekDay, DayHours>;
const config: WebsiteConfig = {
  brand: { logoText: 'AP', wordmark: '', primaryColor: '#e31e24', accentColor: '#fbbf24', tagline: 'Hot pizza', description: '', headline: '' },
  homepage: { showCategories: true, showDeals: true, showPopular: true, popularItemIds: ['a'], deals: [{ itemId: 'a', tag: 'Today' }] },
  menu: { showDescriptions: true, showSoldOut: true },
  modes: { delivery: true, pickup: true, dineIn: true },
  hours: everyDay({ closed: false, open: '12:00', close: '02:00' }),
  contact: { whatsapp: '', email: '', facebook: '', instagram: '' },
  seo: { title: '', description: '' },
};

test('website settings: colours stay readable, texts and links are checked, one way to order stays', () => {
  assert.equal(checkWebsiteConfig(config), null);
  const brand = (b: Partial<WebsiteConfig['brand']>) => checkWebsiteConfig({ ...config, brand: { ...config.brand, ...b } });
  assert.equal(brand({ logoText: ' ' }), 'LOGO_REQUIRED');
  assert.equal(brand({ primaryColor: 'red' }), 'COLOR_INVALID');
  assert.equal(brand({ primaryColor: '#ffee00' }), 'PRIMARY_TOO_LIGHT');
  assert.equal(brand({ accentColor: '#222222' }), 'ACCENT_TOO_DARK');
  assert.equal(brand({ description: 'x'.repeat(301) }), 'TEXT_TOO_LONG');
  assert.ok(contrastRatio('#000000', '#ffffff') > 20);
  assert.equal(checkWebsiteConfig({ ...config, modes: { delivery: false, pickup: false, dineIn: false } }), 'MODES_REQUIRED');
  assert.equal(checkWebsiteConfig({ ...config, homepage: { ...config.homepage, popularItemIds: ['a', 'b', 'c', 'd', 'e'] } }), 'TOO_MANY_POPULAR');
  assert.equal(checkWebsiteConfig({ ...config, homepage: { ...config.homepage, deals: [{ itemId: 'a', tag: ' ' }] } }), 'DEAL_TAG_REQUIRED');
  const contact = (c: Partial<WebsiteConfig['contact']>) => checkWebsiteConfig({ ...config, contact: { ...config.contact, ...c } });
  assert.equal(contact({ whatsapp: '123' }), 'WHATSAPP_INVALID');
  assert.equal(contact({ email: 'no-at' }), 'EMAIL_INVALID');
  assert.equal(contact({ facebook: 'javascript:alert(1)' }), 'LINK_INVALID');
  assert.equal(contact({ instagram: 'https://instagram.com/lala' }), null);
  assert.equal(checkWebsiteConfig({ ...config, hours: everyDay({ closed: false, open: '12:00', close: '12:00' }) }), 'HOURS_INVALID');
  assert.equal(checkWebsiteConfig({ ...config, hours: everyDay({ closed: true, open: '', close: '' }) }), null);
});

test('opening hours read as short text', () => {
  assert.equal(formatOpeningHours(config.hours), 'Every day, 12:00 pm – 2:00 am');
  assert.equal(formatOpeningHours(everyDay({ closed: true, open: '12:00', close: '02:00' })), 'Closed');
  const weekend = { ...config.hours, SAT: { closed: false, open: '10:00', close: '23:30' }, SUN: { closed: true, open: '10:00', close: '23:00' } };
  assert.equal(formatOpeningHours(weekend), 'Mon–Fri, 12:00 pm – 2:00 am · Sat, 10:00 am – 11:30 pm · Sun closed');
});

test('a domain is cleaned up or refused; the free address follows the restaurant', () => {
  assert.equal(normalizeDomain(' https://www.Lala-Restaurant.com/ '), 'www.lala-restaurant.com');
  assert.equal(normalizeDomain('lalarestaurant.pk'), 'lalarestaurant.pk');
  for (const bad of ['lala', 'lala restaurant.com', '-lala.com', 'lala.c', 'http://']) assert.equal(normalizeDomain(bad), null, bad);
  assert.equal(platformSubdomain('aziz-pizza'), 'azizpizza.lalaorders.com');
});

test('a saved change waits for Publish on a published website; a draft stays a draft', () => {
  const live = publishedWebsite(NEW_ONLINE_PUBLISHING, '2026-10-31T10:00:00.000Z');
  assert.equal(withWebsiteChanges(live).websiteState, 'CHANGES_PENDING');
  assert.equal(canPublishWebsite(withWebsiteChanges(live)), true);
  assert.equal(withWebsiteChanges(NEW_ONLINE_PUBLISHING).websiteState, 'DRAFT');
});

test('the website accepts only well-formed preview data from Restaurant OS', () => {
  const good = {
    restaurant: { name: 'A', slug: 'a' },
    branch: { name: 'Main', slug: 'main', phone: '', address: '' },
    onlineOrdersEnabled: true,
    deliveryFee: 15_000,
    minOrder: 50_000,
    defaultPrepMinutes: 30,
    pricing: { tax: NO_TAX, serviceChargeBps: 0, roundToRupee: true, deliveryFee: 15_000 },
    categories: [],
    items: [{ id: 'x', name: 'Zinger', basePrice: 45_000, variants: [] }],
    addonGroups: [],
    website: config,
  };
  assert.equal(isWebsitePreviewData(good), true);
  assert.equal(isWebsitePreviewData({ ...good, website: { brand: {} } }), false);
  assert.equal(isWebsitePreviewData({ ...good, website: { ...config, brand: { ...config.brand, primaryColor: 'url(x)' } } }), false);
  assert.equal(isWebsitePreviewData(null), false);
  assert.equal(isWebsitePreviewData('menu'), false);
  assert.equal(isWebsitePreviewData({ ...good, restaurant: undefined }), false);
  assert.equal(isWebsitePreviewData({ ...good, deliveryFee: -1 }), false);
  assert.equal(isWebsitePreviewData({ ...good, items: [{ id: 'x', name: 'Zinger', basePrice: 1.5, variants: [] }] }), false);
});

const AT = '2026-10-30T10:00:00.000Z';

test('publishing the website changes the website only and needs nothing of the Android app', () => {
  const before: OnlinePublishing = { ...NEW_ONLINE_PUBLISHING, androidState: 'NOT_CONFIGURED' };
  assert.equal(canPublishWebsite(before), true);
  const after = publishedWebsite(before, AT);
  assert.deepEqual(after, { ...before, websiteState: 'LIVE', websitePublishedAt: AT });
  assert.equal(after.androidState, 'NOT_CONFIGURED');
});

test('Publish Website is off when nothing is new or the subscription is suspended', () => {
  assert.equal(canPublishWebsite({ ...NEW_ONLINE_PUBLISHING, websiteState: 'LIVE' }), false);
  assert.equal(canPublishWebsite({ ...NEW_ONLINE_PUBLISHING, websiteState: 'CHANGES_PENDING' }), true);
  assert.equal(canPublishWebsite({ ...NEW_ONLINE_PUBLISHING, subscription: 'SUSPENDED' }), false);
});

test('the status header: suspended first, then orders OFF on a published website', () => {
  const live = publishedWebsite(NEW_ONLINE_PUBLISHING, AT);
  assert.equal(onlineStatus(NEW_ONLINE_PUBLISHING, true), 'DRAFT');
  assert.equal(onlineStatus(NEW_ONLINE_PUBLISHING, false), 'DRAFT');
  assert.equal(onlineStatus(live, true), 'LIVE');
  assert.equal(onlineStatus(live, false), 'OFFLINE');
  assert.equal(onlineStatus({ ...live, subscription: 'SUSPENDED' }, true), 'SUBSCRIPTION_SUSPENDED');
});

test('a suspended subscription never touches the restaurant domain', () => {
  const owned = { ...NEW_ONLINE_PUBLISHING, customDomain: 'example.com', subscription: 'SUSPENDED' as const };
  assert.equal(onlineStatus(owned, true), 'SUBSCRIPTION_SUSPENDED');
  assert.equal(owned.customDomain, 'example.com');
});

test('only the Owner publishes; nobody can be given it', () => {
  assert.ok(recommendedPermissions('OWNER').includes('onlineApp.publish'));
  assert.equal(recommendedPermissions('MANAGER').includes('onlineApp.publish'), false);
  assert.equal(canGrant('MANAGER', 'onlineApp.publish'), false);
});

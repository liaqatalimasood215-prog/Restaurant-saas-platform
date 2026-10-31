import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NEW_ONLINE_PUBLISHING, NO_TAX, canGrant, canPublishWebsite, isWebsitePreviewData, onlineStatus, publishedWebsite, recommendedPermissions, type OnlinePublishing } from './index';

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
  };
  assert.equal(isWebsitePreviewData(good), true);
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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountToMinimum, canPickAddons, checkCheckout, nextTrackingStep, trackingSteps } from './index';

const good = { kind: 'DELIVERY' as const, name: 'Hina', phone: '03001234567', address: 'House 1, Street 2, Lahore' };

test('checkout: name and mobile always, address only for delivery', () => {
  assert.equal(checkCheckout(good), null);
  assert.deepEqual(checkCheckout({ ...good, name: ' ' }), { field: 'name', problem: 'NAME_REQUIRED' });
  assert.deepEqual(checkCheckout({ ...good, phone: '12345' }), { field: 'phone', problem: 'PHONE_INVALID' });
  assert.deepEqual(checkCheckout({ ...good, address: '' }), { field: 'address', problem: 'ADDRESS_REQUIRED' });
  assert.equal(checkCheckout({ ...good, kind: 'TAKEAWAY', address: '' }), null);
});

test('minimum order and add-on rule', () => {
  assert.equal(amountToMinimum(30_000, 50_000), 20_000);
  assert.equal(amountToMinimum(60_000, 50_000), 0);
  assert.equal(canPickAddons({ minSelect: 0, maxSelect: 2 }, 2), true);
  assert.equal(canPickAddons({ minSelect: 1, maxSelect: 2 }, 0), false);
  assert.equal(canPickAddons({ minSelect: 0, maxSelect: 2 }, 3), false);
});

test('tracking follows the delivery or pickup path and stops at the end', () => {
  assert.equal(trackingSteps('TAKEAWAY').at(-1), 'PICKED_UP');
  assert.equal(trackingSteps('DELIVERY').at(-1), 'DELIVERED');
  assert.equal(nextTrackingStep('TAKEAWAY', 'PLACED'), 'ACCEPTED');
  assert.equal(nextTrackingStep('DELIVERY', 'READY'), 'RIDER_ASSIGNED');
  assert.equal(nextTrackingStep('DELIVERY', 'DELIVERED'), null);
  assert.equal(nextTrackingStep('DELIVERY', 'REJECTED'), null);
});

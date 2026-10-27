import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUSES,
  DELIVERY_STEPS,
  checkTransition,
  availableActions,
  findTransition,
  isFinalStatus,
  deliveryStepIndex,
  formatPaisa,
  rupeesToPaisa,
  calculateTotals,
  canUseApp,
  sectionsForRole,
  rooms,
  STATUS_INFO,
} from './index';

test('the full happy path is allowed, step by step, for the right roles', () => {
  assert.equal(checkTransition({ from: 'PLACED', to: 'ACCEPTED', role: 'CASHIER' }).ok, true);
  assert.equal(checkTransition({ from: 'ACCEPTED', to: 'PREPARING', role: 'KITCHEN' }).ok, true);
  assert.equal(checkTransition({ from: 'PREPARING', to: 'READY', role: 'KITCHEN' }).ok, true);
  assert.equal(checkTransition({ from: 'READY', to: 'RIDER_ASSIGNED', role: 'CASHIER', riderId: 'r1' }).ok, true);
  assert.equal(
    checkTransition({ from: 'RIDER_ASSIGNED', to: 'OUT_FOR_DELIVERY', role: 'RIDER', isAssignedRider: true }).ok,
    true,
  );
  assert.equal(
    checkTransition({ from: 'OUT_FOR_DELIVERY', to: 'DELIVERED', role: 'RIDER', isAssignedRider: true }).ok,
    true,
  );
});

test('skipping steps is never allowed', () => {
  assert.deepEqual(checkTransition({ from: 'PLACED', to: 'READY', role: 'OWNER' }), {
    ok: false,
    reason: 'NOT_ALLOWED_STEP',
  });
  assert.deepEqual(checkTransition({ from: 'PLACED', to: 'DELIVERED', role: 'OWNER' }), {
    ok: false,
    reason: 'NOT_ALLOWED_STEP',
  });
  assert.equal(findTransition('DELIVERED', 'PLACED'), undefined);
});

test('wrong roles are blocked', () => {
  assert.deepEqual(checkTransition({ from: 'PLACED', to: 'ACCEPTED', role: 'KITCHEN' }), {
    ok: false,
    reason: 'WRONG_ROLE',
  });
  assert.deepEqual(checkTransition({ from: 'ACCEPTED', to: 'PREPARING', role: 'RIDER' }), {
    ok: false,
    reason: 'WRONG_ROLE',
  });
  assert.deepEqual(checkTransition({ from: 'RIDER_ASSIGNED', to: 'OUT_FOR_DELIVERY', role: 'CASHIER' }), {
    ok: false,
    reason: 'WRONG_ROLE',
  });
});

test('only the assigned rider can move their own order', () => {
  assert.deepEqual(
    checkTransition({ from: 'RIDER_ASSIGNED', to: 'OUT_FOR_DELIVERY', role: 'RIDER', isAssignedRider: false }),
    { ok: false, reason: 'NOT_ASSIGNED_RIDER' },
  );
});

test('assigning a rider needs a rider id', () => {
  assert.deepEqual(checkTransition({ from: 'READY', to: 'RIDER_ASSIGNED', role: 'OWNER' }), {
    ok: false,
    reason: 'RIDER_REQUIRED',
  });
});

test('cancel is possible before the rider leaves, not after', () => {
  for (const from of ['ACCEPTED', 'PREPARING', 'READY', 'RIDER_ASSIGNED'] as const) {
    assert.equal(checkTransition({ from, to: 'CANCELLED', role: 'CASHIER' }).ok, true, from);
  }
  for (const from of ['PLACED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
    assert.equal(checkTransition({ from, to: 'CANCELLED', role: 'OWNER' }).ok, false, from);
  }
});

test('final statuses have no further actions for anyone', () => {
  for (const status of ['DELIVERED', 'REJECTED', 'CANCELLED'] as const) {
    assert.equal(isFinalStatus(status), true);
    for (const role of ['OWNER', 'CASHIER', 'KITCHEN', 'RIDER'] as const) {
      assert.deepEqual(availableActions(status, role, true), []);
    }
  }
});

test('buttons shown per role', () => {
  assert.deepEqual(
    availableActions('PLACED', 'CASHIER').map((a) => a.to),
    ['ACCEPTED', 'REJECTED'],
  );
  assert.deepEqual(
    availableActions('ACCEPTED', 'KITCHEN').map((a) => a.to),
    ['PREPARING'],
  );
  assert.deepEqual(availableActions('RIDER_ASSIGNED', 'RIDER', false), []);
  assert.deepEqual(
    availableActions('RIDER_ASSIGNED', 'RIDER', true).map((a) => a.buttonLabel),
    ['Picked up – On the way'],
  );
});

test('every status has labels; delivery path order is correct', () => {
  for (const s of ORDER_STATUSES) assert.ok(STATUS_INFO[s].customerLabel.length > 0, s);
  assert.equal(DELIVERY_STEPS[0], 'PLACED');
  assert.equal(DELIVERY_STEPS.at(-1), 'DELIVERED');
  assert.equal(deliveryStepIndex('READY'), 3);
  assert.equal(deliveryStepIndex('CANCELLED'), -1);
});

test('money is stored and shown in paisa correctly', () => {
  assert.equal(rupeesToPaisa(850), 85000);
  assert.equal(rupeesToPaisa(0.1 + 0.2), 30);
  assert.equal(formatPaisa(85000), 'Rs. 850');
  assert.equal(formatPaisa(845050), 'Rs. 8,450.50');
  assert.throws(() => formatPaisa(12.5));
  assert.throws(() => rupeesToPaisa(-1));
});

test('totals are calculated from unit prices and quantities', () => {
  const t = calculateTotals(
    [
      { unitPrice: 85000, quantity: 2 },
      { unitPrice: 45000, quantity: 1 },
    ],
    10000,
  );
  assert.deepEqual(t, { lineTotals: [170000, 45000], subtotal: 215000, deliveryFee: 10000, total: 225000 });
  assert.throws(() => calculateTotals([{ unitPrice: 100, quantity: 0 }], 0));
  assert.throws(() => calculateTotals([{ unitPrice: 100, quantity: 1.5 }], 0));
  assert.throws(() => calculateTotals([{ unitPrice: 100, quantity: 999 }], 0));
});

test('app access: riders only in Rider App, staff only in Restaurant OS', () => {
  assert.equal(canUseApp('RIDER', 'rider'), true);
  assert.equal(canUseApp('RIDER', 'restaurant-os'), false);
  assert.equal(canUseApp('KITCHEN', 'rider'), false);
  assert.equal(canUseApp('OWNER', 'restaurant-os'), true);
});

test('sidebar shows only allowed sections per role', () => {
  assert.deepEqual(
    sectionsForRole('KITCHEN').map((s) => s.key),
    ['kitchen'],
  );
  assert.ok(sectionsForRole('OWNER').some((s) => s.key === 'online-app'));
  assert.ok(!sectionsForRole('CASHIER').some((s) => s.key === 'riders'));
  assert.deepEqual(sectionsForRole('RIDER'), []);
});

test('room names', () => {
  assert.equal(rooms.branch('b1'), 'branch:b1');
  assert.equal(rooms.track('t'), 'track:t');
});

// The original 14 tests from Phase 0, updated on 2026-10-27 to the owner's approved rules
// (six roles, order types, kitchen-driven PREPARING/READY, cashier cancels only while ACCEPTED).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_STATUSES,
  DELIVERY_STEPS,
  STAFF_ROLES,
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

test('the full delivery path is allowed, step by step, for the right roles', () => {
  const type = 'DELIVERY';
  assert.equal(checkTransition({ type, from: 'PLACED', to: 'ACCEPTED', role: 'CASHIER' }).ok, true);
  assert.equal(findTransition(type, 'ACCEPTED', 'PREPARING')?.automatic, true);
  assert.equal(findTransition(type, 'PREPARING', 'READY')?.automatic, true);
  assert.equal(checkTransition({ type, from: 'READY', to: 'RIDER_ASSIGNED', role: 'CASHIER', riderId: 'r1' }).ok, true);
  assert.equal(
    checkTransition({ type, from: 'RIDER_ASSIGNED', to: 'OUT_FOR_DELIVERY', role: 'RIDER', isAssignedRider: true }).ok,
    true,
  );
  assert.equal(
    checkTransition({ type, from: 'OUT_FOR_DELIVERY', to: 'DELIVERED', role: 'RIDER', isAssignedRider: true }).ok,
    true,
  );
});

test('skipping steps is never allowed', () => {
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'PLACED', to: 'READY', role: 'OWNER' }), {
    ok: false,
    reason: 'NOT_ALLOWED_STEP',
  });
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'PLACED', to: 'DELIVERED', role: 'OWNER' }), {
    ok: false,
    reason: 'NOT_ALLOWED_STEP',
  });
  assert.equal(findTransition('DELIVERY', 'DELIVERED', 'PLACED'), undefined);
});

test('wrong roles are blocked; kitchen steps are automatic, not buttons', () => {
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'PLACED', to: 'ACCEPTED', role: 'KITCHEN' }), {
    ok: false,
    reason: 'WRONG_ROLE',
  });
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'ACCEPTED', to: 'PREPARING', role: 'KITCHEN' }), {
    ok: false,
    reason: 'AUTOMATIC_ONLY',
  });
  assert.deepEqual(
    checkTransition({ type: 'DELIVERY', from: 'RIDER_ASSIGNED', to: 'OUT_FOR_DELIVERY', role: 'CASHIER' }),
    { ok: false, reason: 'WRONG_ROLE' },
  );
});

test('only the assigned rider can move their own order', () => {
  assert.deepEqual(
    checkTransition({
      type: 'DELIVERY',
      from: 'RIDER_ASSIGNED',
      to: 'OUT_FOR_DELIVERY',
      role: 'RIDER',
      isAssignedRider: false,
    }),
    { ok: false, reason: 'NOT_ASSIGNED_RIDER' },
  );
});

test('assigning a rider needs a rider id', () => {
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'READY', to: 'RIDER_ASSIGNED', role: 'OWNER' }), {
    ok: false,
    reason: 'RIDER_REQUIRED',
  });
});

test('cancel: cashier only before the kitchen starts, manager until the rider leaves, always with a reason', () => {
  const reason = 'Customer called to cancel';
  assert.equal(checkTransition({ type: 'DELIVERY', from: 'ACCEPTED', to: 'CANCELLED', role: 'CASHIER', reason }).ok, true);
  for (const from of ['PREPARING', 'READY', 'RIDER_ASSIGNED'] as const) {
    assert.deepEqual(checkTransition({ type: 'DELIVERY', from, to: 'CANCELLED', role: 'CASHIER', reason }), {
      ok: false,
      reason: 'WRONG_ROLE',
    });
    assert.equal(checkTransition({ type: 'DELIVERY', from, to: 'CANCELLED', role: 'MANAGER', reason }).ok, true, from);
  }
  for (const from of ['PLACED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
    assert.equal(checkTransition({ type: 'DELIVERY', from, to: 'CANCELLED', role: 'OWNER', reason }).ok, false, from);
  }
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'ACCEPTED', to: 'CANCELLED', role: 'OWNER' }), {
    ok: false,
    reason: 'REASON_REQUIRED',
  });
});

test('final statuses have no further actions for anyone', () => {
  for (const type of ['DINE_IN', 'DELIVERY', 'TAKEAWAY'] as const) {
    for (const status of ['PAID', 'DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'] as const) {
      assert.equal(isFinalStatus(status), true);
      for (const role of STAFF_ROLES) {
        assert.deepEqual(availableActions(type, status, role, true), [], `${type} ${status} ${role}`);
      }
    }
  }
});

test('buttons shown per role', () => {
  assert.deepEqual(
    availableActions('DELIVERY', 'PLACED', 'CASHIER').map((a) => a.to),
    ['ACCEPTED', 'REJECTED'],
  );
  assert.deepEqual(availableActions('DELIVERY', 'ACCEPTED', 'KITCHEN'), []);
  assert.deepEqual(availableActions('DELIVERY', 'RIDER_ASSIGNED', 'RIDER', false), []);
  assert.deepEqual(
    availableActions('DELIVERY', 'RIDER_ASSIGNED', 'RIDER', true).map((a) => a.buttonLabel),
    ['Picked up – On the way'],
  );
});

test('every status has labels; delivery path order is correct', () => {
  for (const s of ORDER_STATUSES) {
    assert.ok(STATUS_INFO[s].staffLabel.length > 0, s);
    assert.ok(STATUS_INFO[s].customerLabel.length > 0, s);
  }
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
  for (const role of ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'] as const) {
    assert.equal(canUseApp(role, 'restaurant-os'), true, role);
  }
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
  assert.equal(rooms.station('s1'), 'station:s1');
  assert.equal(rooms.waiter('w1'), 'waiter:w1');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_TRANSITIONS,
  STATUSES_BY_TYPE,
  availableActions,
  checkTransition,
  initialStatus,
  tableStatusFor,
} from './index';

test('dine-in: floor staff and the Service Waiter request the bill; only order takers reopen it', () => {
  assert.equal(checkTransition({ type: 'DINE_IN', from: 'OPEN', to: 'BILL_REQUESTED', role: 'WAITER' }).ok, true);
  assert.equal(checkTransition({ type: 'DINE_IN', from: 'OPEN', to: 'BILL_REQUESTED', role: 'SERVICE_WAITER' }).ok, true);
  assert.equal(checkTransition({ type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'OPEN', role: 'SERVICE_WAITER' }).ok, false);
  assert.equal(checkTransition({ type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'OPEN', role: 'WAITER' }).ok, true);
  assert.equal(checkTransition({ type: 'DINE_IN', from: 'OPEN', to: 'BILL_REQUESTED', role: 'KITCHEN' }).ok, false);
});

test('dine-in: only counter staff mark PAID, and only when payments cover the total', () => {
  assert.deepEqual(
    checkTransition({ type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'PAID', role: 'WAITER', isFullyPaid: true }),
    { ok: false, reason: 'WRONG_ROLE' },
  );
  assert.deepEqual(
    checkTransition({ type: 'DINE_IN', from: 'BILL_REQUESTED', to: 'PAID', role: 'CASHIER', isFullyPaid: false }),
    { ok: false, reason: 'NOT_FULLY_PAID' },
  );
  assert.equal(
    checkTransition({ type: 'DINE_IN', from: 'OPEN', to: 'PAID', role: 'CASHIER', isFullyPaid: true }).ok,
    true,
  );
});

test('dine-in: cancel needs Owner/Manager, a reason and no payments', () => {
  const base = { type: 'DINE_IN', from: 'OPEN', to: 'CANCELLED' } as const;
  assert.deepEqual(checkTransition({ ...base, role: 'CASHIER', reason: 'x' }), { ok: false, reason: 'WRONG_ROLE' });
  assert.deepEqual(checkTransition({ ...base, role: 'MANAGER' }), { ok: false, reason: 'REASON_REQUIRED' });
  assert.deepEqual(checkTransition({ ...base, role: 'MANAGER', reason: 'Guests left', hasPayments: true }), {
    ok: false,
    reason: 'HAS_PAYMENTS',
  });
  assert.equal(checkTransition({ ...base, role: 'MANAGER', reason: 'Guests left' }).ok, true);
});

test('orders start in the right status by type and channel', () => {
  assert.equal(initialStatus('DINE_IN', 'WAITER'), 'OPEN');
  assert.equal(initialStatus('DELIVERY', 'CUSTOMER_APP'), 'PLACED');
  assert.equal(initialStatus('DELIVERY', 'PHONE'), 'ACCEPTED');
  assert.equal(initialStatus('TAKEAWAY', 'POS'), 'ACCEPTED');
  assert.equal(initialStatus('TAKEAWAY', 'CUSTOMER_APP'), 'PLACED');
});

test('takeaway: picked up at the counter; riders never take part', () => {
  assert.equal(checkTransition({ type: 'TAKEAWAY', from: 'READY', to: 'PICKED_UP', role: 'CASHIER' }).ok, true);
  assert.equal(checkTransition({ type: 'TAKEAWAY', from: 'READY', to: 'PICKED_UP', role: 'WAITER' }).ok, false);
  assert.deepEqual(
    checkTransition({ type: 'TAKEAWAY', from: 'READY', to: 'RIDER_ASSIGNED', role: 'CASHIER', riderId: 'r1' }),
    { ok: false, reason: 'NOT_ALLOWED_STEP' },
  );
  assert.deepEqual(availableActions('TAKEAWAY', 'READY', 'MANAGER').map((a) => a.to), ['PICKED_UP', 'CANCELLED']);
});

test('reject needs a reason', () => {
  assert.deepEqual(checkTransition({ type: 'DELIVERY', from: 'PLACED', to: 'REJECTED', role: 'CASHIER' }), {
    ok: false,
    reason: 'REASON_REQUIRED',
  });
  assert.equal(
    checkTransition({ type: 'DELIVERY', from: 'PLACED', to: 'REJECTED', role: 'CASHIER', reason: 'Area not covered' })
      .ok,
    true,
  );
});

test('every transition uses only statuses of its own order type', () => {
  for (const t of ORDER_TRANSITIONS) {
    assert.ok(STATUSES_BY_TYPE[t.type].includes(t.from), `${t.type} ${t.from}`);
    assert.ok(STATUSES_BY_TYPE[t.type].includes(t.to), `${t.type} ${t.to}`);
    assert.equal(t.automatic ? t.roles.length === 0 : t.roles.length > 0, true, `${t.type} ${t.from}→${t.to}`);
  }
});

test('table status is derived from the open order', () => {
  assert.equal(tableStatusFor(null), 'FREE');
  assert.equal(tableStatusFor('OPEN'), 'OCCUPIED');
  assert.equal(tableStatusFor('BILL_REQUESTED'), 'BILL_REQUESTED');
  assert.equal(tableStatusFor('PAID'), 'FREE');
  assert.equal(tableStatusFor('CANCELLED'), 'FREE');
});

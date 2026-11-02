import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkTablePayment, nextSubOrderNo, openStatusOfTable, orderPlaceName, subOrderLabel } from './sub-orders';

test('one customer is plain T1; a shared table says T1-2', () => {
  assert.equal(orderPlaceName('T1', {}), 'T1');
  assert.equal(orderPlaceName('T1', { subOrderNo: 1 }), 'T1');
  assert.equal(orderPlaceName('T1', { subOrderNo: 1, tableShared: true }), 'T1-1');
  assert.equal(orderPlaceName('T1', { subOrderNo: 2, tableShared: true }), 'T1-2');
  assert.equal(subOrderLabel('T12', 3), 'T12-3');
});

test('numbers keep going while anyone is seated, and restart on an empty table', () => {
  assert.equal(nextSubOrderNo([]), 1);
  assert.equal(nextSubOrderNo([{ subOrderNo: 1 }]), 2);
  assert.equal(nextSubOrderNo([{}]), 2, 'an old order without a number is customer 1');
  assert.equal(nextSubOrderNo([{ subOrderNo: 1 }, { subOrderNo: 2 }]), 3, 'T1-2 paid and left, T1-1 is seated: the next is T1-3, never a second T1-2');
});

test('the table shows the bill request of any sub-order', () => {
  assert.equal(openStatusOfTable([]), null);
  assert.equal(openStatusOfTable([{ status: 'OPEN' }]), 'OPEN');
  assert.equal(openStatusOfTable([{ status: 'OPEN' }, { status: 'BILL_REQUESTED' }]), 'BILL_REQUESTED');
});

test('whole table on one bill: each order takes what it owes, the last holds the change', () => {
  assert.deepEqual(checkTablePayment([45_000, 12_500], 60_000), { ok: true, payments: [{ cashReceived: 45_000 }, { cashReceived: 15_000 }] });
  assert.deepEqual(checkTablePayment([45_000, 12_500], 57_500), { ok: true, payments: [{ cashReceived: 45_000 }, { cashReceived: 12_500 }] });
  assert.deepEqual(checkTablePayment([45_000, 12_500], null), { ok: true, payments: [{ cashReceived: null }, { cashReceived: null }] });
  assert.deepEqual(checkTablePayment([45_000, 12_500], 50_000), { ok: false, reason: 'NOT_ENOUGH_CASH' });
  assert.deepEqual(checkTablePayment([], 50_000), { ok: false, reason: 'NOTHING_DUE' });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, checkBulkTables, checkName, checkSeats, cleanName, nextTableNumber, placeAt, tableStatusFor } from './index';

test('table status: an open bill wins; otherwise out of service, then cleaning, then free', () => {
  const inService = { isActive: true, cleaning: false };
  assert.equal(tableStatusFor(null, inService), 'FREE');
  assert.equal(tableStatusFor('PAID', { isActive: true, cleaning: true }), 'CLEANING');
  assert.equal(tableStatusFor(null, { isActive: false, cleaning: true }), 'OUT_OF_SERVICE');
  assert.equal(tableStatusFor('OPEN', { isActive: false, cleaning: true }), 'OCCUPIED');
  assert.equal(tableStatusFor('BILL_REQUESTED', { isActive: true, cleaning: true }), 'BILL_REQUESTED');
});

test('seating capacity is a positive whole number', () => {
  assert.equal(checkSeats(4), null);
  assert.equal(checkSeats(1), null);
  for (const bad of [0, -2, 2.5, Number.NaN, 51]) assert.equal(checkSeats(bad), 'SEATS_INVALID', String(bad));
});

test('table names: required, short, and unique inside the area (case and spaces ignored)', () => {
  assert.equal(cleanName('  Family   T 1 '), 'Family T 1');
  assert.equal(checkName('T17', ['T1', 'T2']), null);
  assert.equal(checkName(' t1 ', ['T1', 'T2']), 'NAME_TAKEN');
  assert.equal(checkName('   ', []), 'NAME_REQUIRED');
  assert.equal(checkName('x'.repeat(31), []), 'NAME_TOO_LONG');
});

test('add many tables: T1–T10 with 4 seats; clashes, bad ranges and too many are refused', () => {
  const ok = checkBulkTables({ prefix: 'T', from: 1, to: 10, seats: 4 }, []);
  assert.deepEqual(ok, { ok: true, names: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'] });
  assert.deepEqual(checkBulkTables({ prefix: 'T', from: 9, to: 12, seats: 4 }, ['T10']), { ok: false, problem: 'NAME_TAKEN', name: 'T10' });
  assert.deepEqual(checkBulkTables({ prefix: 'T', from: 5, to: 2, seats: 4 }, []), { ok: false, problem: 'RANGE_INVALID' });
  assert.deepEqual(checkBulkTables({ prefix: 'T', from: 1, to: 51, seats: 4 }, []), { ok: false, problem: 'TOO_MANY' });
  assert.deepEqual(checkBulkTables({ prefix: 'T', from: 1, to: 3, seats: 0 }, []), { ok: false, problem: 'SEATS_INVALID' });
});

test('add many tables suggests the next free number of the area', () => {
  assert.equal(nextTableNumber('T', ['T1', 'T2', 'T10', 'Family 3', 'VIP']), 11);
  assert.equal(nextTableNumber('F', ['T1']), 1);
});

test('display order: a record moves to its position and the list is numbered again', () => {
  const list = [
    { id: 'a', sort: 1 },
    { id: 'b', sort: 2 },
    { id: 'c', sort: 3 },
  ];
  assert.deepEqual(placeAt(list, 'c', 1).map((x) => `${x.id}${x.sort}`), ['c1', 'a2', 'b3']);
  assert.deepEqual(placeAt(list, 'a', 99).map((x) => `${x.id}${x.sort}`), ['b1', 'c2', 'a3']);
});

test('only the Owner and Manager set up tables; everyone on the floor marks cleaning', () => {
  assert.equal(can('OWNER', 'setup.manage'), true);
  assert.equal(can('MANAGER', 'setup.manage'), true);
  assert.equal(can('CASHIER', 'setup.manage'), false);
  assert.equal(can('WAITER', 'setup.manage'), false);
  for (const role of ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER'] as const) assert.equal(can(role, 'table.clean'), true, role);
  assert.equal(can('KITCHEN', 'table.clean'), false);
});

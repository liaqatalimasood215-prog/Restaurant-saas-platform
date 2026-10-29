import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_PERMISSIONS,
  PERMISSION_ROWS,
  canGrant,
  cleanPermissions,
  effectivePermissions,
  homeSectionFor,
  recommendedPermissions,
  sectionsFor,
  sectionsForRole,
} from './index';

test('recommended permissions are exactly today\'s role matrix', () => {
  assert.ok(recommendedPermissions('WAITER').includes('table.order'));
  assert.ok(!recommendedPermissions('SERVICE_WAITER').includes('table.order'));
  assert.ok(!recommendedPermissions('MANAGER').includes('staff.manage'));
  assert.ok(recommendedPermissions('MANAGER', { managerCanSeeMoneyReports: true }).includes('reports.money'));
  for (const role of ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'SERVICE_WAITER', 'KITCHEN'] as const) {
    const byPermission = sectionsFor(role, recommendedPermissions(role)).map((s) => s.key);
    assert.deepEqual(byPermission, sectionsForRole(role).map((s) => s.key), role);
  }
});

test('ceiling: switch ON only what the order rules allow; staff and settings stay with the Owner', () => {
  assert.equal(canGrant('CASHIER', 'order.discount'), true);
  assert.equal(canGrant('CASHIER', 'item.void'), true);
  assert.equal(canGrant('WAITER', 'payment.record'), false, 'only counter roles may mark a bill paid');
  assert.equal(canGrant('SERVICE_WAITER', 'table.order'), false);
  assert.equal(canGrant('MANAGER', 'staff.manage'), false);
  assert.equal(canGrant('MANAGER', 'settings.manage'), false);
  assert.equal(canGrant('OWNER', 'staff.manage'), true);
  assert.deepEqual(cleanPermissions('WAITER', ['payment.record', 'table.order', 'table.order']), ['table.order']);
});

test('a person follows the role unless they have their own set; the Owner always keeps everything', () => {
  const rolePermissions = { WAITER: ['tables.view', 'waiter.view', 'table.order'] as const };
  const waiter = { role: 'WAITER' as const, permissions: null };
  assert.deepEqual(effectivePermissions(waiter, rolePermissions), ['tables.view', 'waiter.view', 'table.order']);
  const custom = { role: 'WAITER' as const, permissions: ['waiter.view', 'table.order', 'bill.request'] as const };
  assert.deepEqual(effectivePermissions(custom, rolePermissions), ['waiter.view', 'table.order', 'bill.request']);
  const owner = { role: 'OWNER' as const, permissions: [] };
  assert.deepEqual(effectivePermissions(owner), recommendedPermissions('OWNER'));
});

test('home screen moves to the first allowed screen when the usual one is switched off', () => {
  assert.equal(homeSectionFor('CASHIER', recommendedPermissions('CASHIER')), 'pos');
  const noPos = recommendedPermissions('CASHIER').filter((p) => p !== 'pos.view');
  assert.equal(homeSectionFor('CASHIER', noPos), 'tables');
  assert.equal(homeSectionFor('KITCHEN', []), null);
});

test('the matrix shows every Restaurant OS permission exactly once', () => {
  const shown = PERMISSION_ROWS.flatMap((r) => Object.values(r.cells).map((c) => c.permission));
  assert.equal(new Set(shown).size, shown.length, 'no permission twice');
  assert.deepEqual(
    ALL_PERMISSIONS.filter((p) => !shown.includes(p)),
    ['delivery.update'],
    'only the Rider App permission is not in the Restaurant OS matrix',
  );
});

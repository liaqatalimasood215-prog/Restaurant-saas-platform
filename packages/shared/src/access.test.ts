import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEATURE_STATUS_LABELS,
  FEATURE_STATUSES,
  HOME_SECTION,
  OS_SECTIONS,
  STAFF_ROLES,
  can,
  canManageStaffAccount,
  canSeeSection,
  findSection,
  sectionsForRole,
} from './index';

test('six roles, in the approved order', () => {
  assert.deepEqual(STAFF_ROLES, ['OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'RIDER']);
});

test('permission matrix follows MASTER_PROMPT §4', () => {
  assert.equal(can('WAITER', 'item.void'), false);
  assert.equal(can('MANAGER', 'item.void'), true);
  assert.equal(can('CASHIER', 'payment.refund'), false);
  assert.equal(can('MANAGER', 'payment.refund'), true);
  assert.equal(can('CASHIER', 'payment.record'), true);
  assert.equal(can('WAITER', 'payment.record'), false);
  assert.equal(can('WAITER', 'table.order'), true);
  assert.equal(can('KITCHEN', 'table.order'), false);
  assert.equal(can('KITCHEN', 'ticket.update'), true);
  assert.equal(can('WAITER', 'ticket.update'), false);
  assert.equal(can('WAITER', 'ticket.serve'), true);
  assert.equal(can('KITCHEN', 'ticket.serve'), false);
  assert.equal(can('KITCHEN', 'item.outOfStock'), true);
  assert.equal(can('CASHIER', 'order.discount'), false);
  assert.equal(can('CASHIER', 'riderCash.settle'), true);
  assert.equal(can('CASHIER', 'setup.manage'), false);
  assert.equal(can('MANAGER', 'settings.manage'), false);
  assert.equal(can('OWNER', 'settings.manage'), true);
  assert.equal(can('RIDER', 'delivery.update'), true);
  assert.equal(can('OWNER', 'delivery.update'), false);
});

test('managers see money reports only when the owner allows it', () => {
  assert.equal(can('MANAGER', 'reports.money'), false);
  assert.equal(can('MANAGER', 'reports.money', { managerCanSeeMoneyReports: true }), true);
  assert.equal(can('OWNER', 'reports.money'), true);
  assert.equal(can('CASHIER', 'reports.money', { managerCanSeeMoneyReports: true }), false);
});

test('managers manage staff, but not Owner or Manager accounts', () => {
  assert.equal(canManageStaffAccount('MANAGER', 'WAITER'), true);
  assert.equal(canManageStaffAccount('MANAGER', 'RIDER'), true);
  assert.equal(canManageStaffAccount('MANAGER', 'MANAGER'), false);
  assert.equal(canManageStaffAccount('MANAGER', 'OWNER'), false);
  assert.equal(canManageStaffAccount('OWNER', 'MANAGER'), true);
  assert.equal(canManageStaffAccount('CASHIER', 'WAITER'), false);
});

test('sidebar order matches the owner navigation decision (2026-10-27)', () => {
  const features = OS_SECTIONS.filter((s) => s.group === 'FEATURES');
  assert.deepEqual(
    features.map((s) => s.label),
    [
      'Tables',
      'Waiter Orders',
      'Kitchen / KDS',
      'POS / New Bill',
      'Online Orders',
      'Orders',
      'Menu',
      'Online App',
      'Riders',
      'Staff',
      "Today's Summary",
      'Settings',
    ],
  );
  assert.deepEqual(
    OS_SECTIONS.filter((s) => s.group === 'COMING_SOON').map((s) => [s.key, s.phase]),
    [
      ['dashboard', 7],
      ['customers', 7],
      ['finance-reports', 7],
      ['inventory', 8],
      ['payroll', 8],
      ['ai-manager', 10],
    ],
  );
});

test('nothing in Phase 1 claims to be REAL / VERIFIED', () => {
  for (const s of OS_SECTIONS) {
    assert.notEqual(s.phase1Status, 'REAL_VERIFIED', s.key);
    assert.equal(s.phase1Status, s.group === 'FEATURES' ? 'DEMO_PROTOTYPE' : 'PLACEHOLDER', s.key);
  }
});

test('each role sees only its own sections', () => {
  const keys = (role: Parameters<typeof sectionsForRole>[0], ctx = {}) =>
    sectionsForRole(role, ctx)
      .filter((s) => s.group === 'FEATURES')
      .map((s) => s.key);
  assert.deepEqual(keys('WAITER'), ['tables', 'waiter']);
  assert.deepEqual(keys('KITCHEN'), ['kitchen']);
  assert.deepEqual(keys('CASHIER'), ['tables', 'waiter', 'pos', 'online-orders', 'orders']);
  assert.ok(!keys('MANAGER').includes('summary'));
  assert.ok(keys('MANAGER', { managerCanSeeMoneyReports: true }).includes('summary'));
  assert.ok(!keys('MANAGER').includes('settings'));
  assert.ok(keys('OWNER').includes('settings'));
  assert.ok(!sectionsForRole('MANAGER').some((s) => s.key === 'payroll'));
  assert.deepEqual(sectionsForRole('RIDER'), []);
});

test('every role lands on a home section it is allowed to see; Owner and Manager start at Tables', () => {
  assert.equal(HOME_SECTION.OWNER, 'tables');
  assert.equal(HOME_SECTION.MANAGER, 'tables');
  assert.equal(HOME_SECTION.CASHIER, 'pos');
  assert.equal(HOME_SECTION.KITCHEN, 'kitchen');
  for (const [role, key] of Object.entries(HOME_SECTION)) {
    const section = findSection(key);
    assert.ok(section && canSeeSection(section, role as keyof typeof HOME_SECTION), role);
  }
});

test('five feature statuses with their labels', () => {
  assert.equal(FEATURE_STATUSES.length, 5);
  assert.equal(FEATURE_STATUS_LABELS.DEMO_PROTOTYPE, 'DEMO / PROTOTYPE');
  assert.equal(FEATURE_STATUS_LABELS.REAL_VERIFIED, 'REAL / VERIFIED');
  assert.equal(FEATURE_STATUS_LABELS.BLOCKED, 'BLOCKED');
});

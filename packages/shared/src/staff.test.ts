import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INVITE_VALID_HOURS, checkPin, inviteExpiresAt, inviteStatus, isValidEmail, removesLastOwner } from './index';

test('the last active Owner cannot be disabled or given another role', () => {
  const staff = [
    { id: 'o1', role: 'OWNER' as const, isActive: true },
    { id: 'o2', role: 'OWNER' as const, isActive: false },
    { id: 'm1', role: 'MANAGER' as const, isActive: true },
  ];
  assert.equal(removesLastOwner(staff, 'o1', { role: 'OWNER', isActive: false }), true);
  assert.equal(removesLastOwner(staff, 'o1', { role: 'MANAGER', isActive: true }), true);
  assert.equal(removesLastOwner(staff, 'o1', { role: 'OWNER', isActive: true }), false);
  assert.equal(removesLastOwner(staff, 'm1', { role: 'MANAGER', isActive: false }), false);
  const twoOwners = staff.map((s) => (s.id === 'o2' ? { ...s, isActive: true } : s));
  assert.equal(removesLastOwner(twoOwners, 'o1', { role: 'OWNER', isActive: false }), false);
});

test('activation and PIN-reset links expire after 48 hours; used and revoked links stay closed', () => {
  const sent = Date.parse('2026-10-29T10:00:00Z');
  const expires = inviteExpiresAt(sent);
  assert.equal(INVITE_VALID_HOURS, 48);
  assert.equal(inviteStatus('PENDING', expires, sent + 47 * 3_600_000), 'PENDING');
  assert.equal(inviteStatus('PENDING', expires, expires), 'EXPIRED');
  assert.equal(inviteStatus('USED', expires, expires + 1), 'USED');
  assert.equal(inviteStatus('REVOKED', expires, sent), 'REVOKED');
});

test('PIN: 6 digits, not too simple, typed the same twice', () => {
  assert.equal(checkPin('402917', '402917'), null);
  assert.equal(checkPin('4029', '4029'), 'PIN_FORMAT');
  assert.equal(checkPin('40291a', '40291a'), 'PIN_FORMAT');
  for (const simple of ['111111', '123456', '654321']) assert.equal(checkPin(simple, simple), 'PIN_TOO_SIMPLE', simple);
  assert.equal(checkPin('402917', '402918'), 'PIN_MISMATCH');
});

test('email is checked only for its shape', () => {
  assert.equal(isValidEmail('sana@example.com'), true);
  assert.equal(isValidEmail('sana@example'), false);
  assert.equal(isValidEmail('sana example.com'), false);
});

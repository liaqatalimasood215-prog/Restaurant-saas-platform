import { test } from 'node:test';
import assert from 'node:assert/strict';
import { businessDate } from './index';

test('sales after midnight count for the previous business day (Asia/Karachi, 06:00)', () => {
  // 2026-10-28 01:00 in Karachi (UTC+5)
  assert.equal(businessDate(new Date('2026-10-27T20:00:00Z')), '2026-10-27');
  // 05:59 is still the previous business day; 06:30 is the new one
  assert.equal(businessDate(new Date('2026-10-28T00:59:00Z')), '2026-10-27');
  assert.equal(businessDate(new Date('2026-10-28T01:30:00Z')), '2026-10-28');
});

test('business day start is a branch setting', () => {
  assert.equal(businessDate(new Date('2026-10-27T20:00:00Z'), 'Asia/Karachi', '00:00'), '2026-10-28');
  assert.equal(businessDate(new Date('2026-01-01T00:30:00Z'), 'Asia/Karachi', '06:00'), '2025-12-31');
  assert.throws(() => businessDate(new Date(), 'Asia/Karachi', '6am'));
});

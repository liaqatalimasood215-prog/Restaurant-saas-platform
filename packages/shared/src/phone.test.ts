import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone } from './index';

test('mobile numbers typed in any common way are saved as 0300-1234567', () => {
  for (const typed of ['0300-1234567', '03001234567', '0300 1234567', ' 0300 123 4567 ', '+92 300 1234567', '+923001234567', '923001234567', '00923001234567', '3001234567', '(0300) 1234567']) {
    assert.equal(normalizePhone(typed), '0300-1234567', typed);
  }
});

test('anything that is not a Pakistani mobile number is refused', () => {
  for (const bad of ['', '0300-123456', '030012345678', '042-1234567', '04212345678', '0300-12345a7', 'abc', '+1 300 1234567']) {
    assert.equal(normalizePhone(bad), null, bad);
  }
});

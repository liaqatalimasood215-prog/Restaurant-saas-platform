import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatQuantity } from './index';

test('quantities keep their selling unit: 1 kg never becomes 1 piece', () => {
  assert.equal(formatQuantity(2, 'piece'), '2 ×');
  assert.equal(formatQuantity(1, 'kg'), '1 kg');
  assert.equal(formatQuantity(3, 'plate'), '3 plate');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bpsToInput, calculateBill, checkBranchSettings, checkOnlineSettings, checkStation, customerAppPath, isValidDayStart, parsePercent } from './index';

test('percentages are typed as "16" or "7.5" and kept in basis points', () => {
  assert.equal(parsePercent('16'), 1600);
  assert.equal(parsePercent('7.5 %'), 750);
  assert.equal(parsePercent('0'), 0);
  for (const bad of ['', '-1', 'abc', '1.234', '101']) assert.equal(parsePercent(bad), null, bad);
  assert.equal(bpsToInput(750), '7.5');
  assert.equal(isValidDayStart('06:00'), true);
  assert.equal(isValidDayStart('24:00'), false);
});

const good = {
  restaurantName: 'Aziz Pizza',
  branchName: 'Main Branch',
  phone: '03001234567',
  address: 'Main Market, Lahore',
  taxBps: 1600,
  serviceChargeBps: 500,
  deliveryFee: 15_000,
  minOrder: 50_000,
  defaultPrepMinutes: 30,
  businessDayStart: '06:00',
  receiptHeader: 'Aziz Pizza',
  receiptFooter: 'Thank you!',
};

test('settings: names, a mobile number, an address and sensible amounts', () => {
  assert.equal(checkBranchSettings(good), null);
  assert.deepEqual(checkBranchSettings({ ...good, branchName: ' ' }), { field: 'branchName', problem: 'NAME_REQUIRED' });
  assert.deepEqual(checkBranchSettings({ ...good, phone: '12345' }), { field: 'phone', problem: 'PHONE_INVALID' });
  assert.deepEqual(checkBranchSettings({ ...good, taxBps: 6000 }), { field: 'tax', problem: 'PERCENT_INVALID' });
  assert.deepEqual(checkBranchSettings({ ...good, serviceChargeBps: null }), { field: 'serviceCharge', problem: 'PERCENT_INVALID' });
  assert.deepEqual(checkBranchSettings({ ...good, deliveryFee: null }), { field: 'deliveryFee', problem: 'MONEY_INVALID' });
  assert.deepEqual(checkBranchSettings({ ...good, defaultPrepMinutes: 0 }), { field: 'prepMinutes', problem: 'MINUTES_INVALID' });
  assert.deepEqual(checkBranchSettings({ ...good, businessDayStart: '6' }), { field: 'dayStart', problem: 'DAY_START_INVALID' });
  assert.deepEqual(checkBranchSettings({ ...good, receiptFooter: 'x'.repeat(201) }), { field: 'receiptFooter', problem: 'TEXT_TOO_LONG' });
});

test('Online App page: fee and minimum order may be 0; preparation time 1–180 minutes; one link per branch', () => {
  assert.equal(checkOnlineSettings({ deliveryFee: 0, minOrder: 0, defaultPrepMinutes: 30 }), null);
  assert.equal(checkOnlineSettings({ deliveryFee: null, minOrder: 0, defaultPrepMinutes: 30 }), 'MONEY_INVALID');
  assert.equal(checkOnlineSettings({ deliveryFee: 0, minOrder: 0, defaultPrepMinutes: 0 }), 'MINUTES_INVALID');
  assert.equal(customerAppPath('aziz-pizza', 'main'), '/aziz-pizza/main');
});

test('kitchen station: a new name and warn before late', () => {
  assert.equal(checkStation({ name: 'Tandoor', warnMinutes: 10, lateMinutes: 20 }, ['Pizza Oven']), null);
  assert.equal(checkStation({ name: 'pizza oven', warnMinutes: 10, lateMinutes: 20 }, ['Pizza Oven']), 'NAME_TAKEN');
  assert.equal(checkStation({ name: 'Tandoor', warnMinutes: 20, lateMinutes: 20 }, []), 'TIMES_INVALID');
  assert.equal(checkStation({ name: 'Tandoor', warnMinutes: 0, lateMinutes: 5 }, []), 'TIMES_INVALID');
});

test('a 16 % tax and 5 % dine-in service charge are added on top, as the pricing engine does', () => {
  const bill = calculateBill({
    orderType: 'DINE_IN',
    lines: [{ unitPrice: 100_000, quantity: 1 }],
    settings: { tax: { rateBps: 1600, pricesIncludeTax: false, appliesToServiceCharge: false, appliesToDeliveryFee: false }, serviceChargeBps: 500, roundToRupee: false },
  });
  assert.equal(bill.total, 100_000 + 5_000 + 16_000);
});

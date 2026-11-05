import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReceipt, checkSupplierPayment, khataBalances, khataSummary, lineAmount, receivedStockMilli, type KhataEntry } from './index';

const milk = { id: 'milk', isActive: true, kind: 'BOUGHT' as const, purchaseUnit: 'l' as const, stockUnit: 'ml' as const, packSizeMilli: null };
const atta = { id: 'atta', isActive: true, kind: 'BOUGHT' as const, purchaseUnit: 'pack' as const, stockUnit: 'g' as const, packSizeMilli: 20_000_000 };
const entry = (id: string, kind: KhataEntry['kind'], amount: number, businessDate: string, at: string) => ({ id, kind, amount, businessDate, createdAt: `${businessDate}T${at}:00.000Z` });

test("the owner's milk: 50 L × Rs. 220 = Rs. 11,000 and 50 L into stock; a 20 kg bag adds 20 kg", () => {
  assert.equal(lineAmount(50_000, 22_000), 1_100_000);
  assert.equal(lineAmount(20_000, 22_000), 440_000);
  assert.equal(lineAmount(2_500, 26_000), 65_000, '2.5 kg yogurt × Rs. 260 = Rs. 650');
  assert.equal(receivedStockMilli(50_000, milk), 50_000_000, '50 L = 50,000 ml');
  assert.equal(receivedStockMilli(2_000, atta), 40_000_000, '2 bags = 40 kg');
  assert.equal(receivedStockMilli(1_000, { ...atta, packSizeMilli: null }), null);
});

test('a delivery needs products in use, each once, a real quantity and a rate', () => {
  const ingredients = [milk, atta, { ...milk, id: 'old', isActive: false }];
  const check = (lines: { ingredientId: string; quantityMilli: number | null; ratePaisa: number | null }[]) => checkReceipt({ lines, note: '' }, ingredients);
  assert.equal(check([{ ingredientId: 'milk', quantityMilli: 50_000, ratePaisa: 22_000 }, { ingredientId: 'atta', quantityMilli: 1_000, ratePaisa: 260_000 }]), null);
  assert.deepEqual(check([]), { line: null, problem: 'NO_LINES' });
  assert.deepEqual(check([{ ingredientId: 'old', quantityMilli: 1_000, ratePaisa: 100 }]), { line: 0, problem: 'PRODUCT_REQUIRED' });
  assert.deepEqual(check([{ ingredientId: 'milk', quantityMilli: 0, ratePaisa: 22_000 }]), { line: 0, problem: 'QUANTITY_INVALID' });
  assert.deepEqual(check([{ ingredientId: 'milk', quantityMilli: 1_000, ratePaisa: 0 }]), { line: 0, problem: 'RATE_INVALID' });
  assert.deepEqual(check([{ ingredientId: 'milk', quantityMilli: 1_000, ratePaisa: 100 }, { ingredientId: 'milk', quantityMilli: 1_000, ratePaisa: 100 }]), { line: 1, problem: 'DUPLICATE_PRODUCT' });
});

test("the owner's day: 11,000 + 4,400 bought, 10,000 paid → Rs. 5,400 due, Partly paid; it carries into tomorrow", () => {
  const today = '2026-11-05';
  const day = [
    entry('a', 'PURCHASE', 1_100_000, today, '03:10'),
    entry('b', 'PURCHASE', 440_000, today, '10:40'),
    entry('c', 'PAYMENT', -1_000_000, today, '16:30'),
  ];
  assert.deepEqual(khataSummary(day, today), { previousDue: 0, todayPurchases: 1_540_000, todayPayments: 1_000_000, totalDue: 540_000, status: 'PARTLY_PAID' });
  assert.deepEqual([...khataBalances(day).values()], [1_100_000, 1_540_000, 540_000]);
  // Next day: the Rs. 5,400 is previous due and nothing paid yet today; a new delivery adds to it.
  const tomorrow = [...day, entry('d', 'PURCHASE', 1_100_000, '2026-11-06', '03:00')];
  assert.deepEqual(khataSummary(tomorrow, '2026-11-06'), { previousDue: 540_000, todayPurchases: 1_100_000, todayPayments: 0, totalDue: 1_640_000, status: 'PARTLY_PAID' });
  // Paying everything makes it Paid; a new delivery after that is Unpaid again.
  const cleared = [...tomorrow, entry('e', 'PAYMENT', -1_640_000, '2026-11-06', '17:00')];
  assert.equal(khataSummary(cleared, '2026-11-06').status, 'PAID');
  assert.equal(khataSummary([...cleared, entry('f', 'PURCHASE', 100_000, '2026-11-06', '18:00')], '2026-11-06').status, 'UNPAID');
  // An opening balance always counts as previous due.
  assert.equal(khataSummary([entry('o', 'OPENING_BALANCE', 300_000, today, '01:00')], today).previousDue, 300_000);
});

test('a payment: above zero, not more than due, a method, not a future date', () => {
  const ok = { amount: 1_000_000, method: 'CASH', date: '2026-11-05', note: '' };
  assert.equal(checkSupplierPayment(ok, 1_540_000, '2026-11-05'), null);
  assert.equal(checkSupplierPayment({ ...ok, amount: 1_540_000 }, 1_540_000, '2026-11-05'), null, 'full payment');
  assert.equal(checkSupplierPayment({ ...ok, amount: 1_600_000 }, 1_540_000, '2026-11-05'), 'MORE_THAN_DUE');
  assert.equal(checkSupplierPayment({ ...ok, amount: 0 }, 1_540_000, '2026-11-05'), 'AMOUNT_INVALID');
  assert.equal(checkSupplierPayment({ ...ok, method: 'CHEQUE' }, 1_540_000, '2026-11-05'), 'METHOD_INVALID');
  assert.equal(checkSupplierPayment({ ...ok, date: '2026-11-06' }, 1_540_000, '2026-11-05'), 'DATE_INVALID');
  assert.equal(checkSupplierPayment(ok, 0, '2026-11-05'), 'NOTHING_DUE');
});

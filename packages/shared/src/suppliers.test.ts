import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billTotals, checkPurchaseBill, checkReceipt, checkSupplierPayment, deliveriesPerProduct, discountFromPercent, similarIngredients, isSupplierPhoto, sortByUse, khataBalances, khataSummary, lineAmount, receivedStockMilli, sortSuppliers, supplierOrderAfterPicking, type KhataEntry } from './index';

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

test("Edit order: his taps first (Karyana, Sabzi, Chicken), the rest keep their place; never placed = by name after them", () => {
  const list = [
    { name: 'Koyla Depot', sortOrder: undefined },
    { name: 'Chicken Point', sortOrder: 2 },
    { name: 'City Packaging', sortOrder: undefined },
    { name: 'Kiryana Store', sortOrder: 0 },
    { name: 'Sabzi Mandi', sortOrder: 1 },
  ];
  assert.deepEqual(sortSuppliers(list).map((s) => s.name), ['Kiryana Store', 'Sabzi Mandi', 'Chicken Point', 'City Packaging', 'Koyla Depot']);
  assert.deepEqual(supplierOrderAfterPicking(['a', 'b', 'c', 'd'], ['c', 'a']), ['c', 'a', 'b', 'd']);
  assert.deepEqual(supplierOrderAfterPicking(['a', 'b'], ['b', 'b', 'x']), ['b', 'a'], 'a double tap or an unknown id counts once / not at all');
});

test('a supplier picture is a small image data URL, never a link or a huge photo', () => {
  assert.equal(isSupplierPhoto('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.equal(isSupplierPhoto('https://example.com/a.jpg'), false);
  assert.equal(isSupplierPhoto('data:image/svg+xml;base64,PHN2Zz4='), false, 'no SVG (it can carry scripts)');
  assert.equal(isSupplierPhoto(`data:image/png;base64,${'A'.repeat(200_000)}`), false);
});

test('daily products first: counted from the last 30 days of his deliveries, a delivery counts once per product', () => {
  const line = (ingredientId: string) => ({ ingredientId, quantityMilli: 1_000, ratePaisa: 100, amount: 100, stockMilli: 1_000, movementId: 'm' });
  const delivery = (date: string, ...ids: string[]) => ({ kind: 'PURCHASE' as const, lines: ids.map(line), businessDate: date });
  const entries = [
    delivery('2026-11-06', 'oil', 'atta'),
    delivery('2026-11-05', 'oil', 'oil'),
    delivery('2026-11-01', 'oil', 'sugar'),
    delivery('2026-10-07', 'salt'),
    delivery('2026-10-08', 'sugar'),
    { kind: 'PAYMENT' as const, lines: [], businessDate: '2026-11-06' },
  ];
  const counts = deliveriesPerProduct(entries, '2026-11-06');
  assert.deepEqual(Object.fromEntries(counts), { oil: 3, atta: 1, sugar: 2 }, '7 Oct is day 31: not counted; 8 Oct is day 30');
  const products = ['atta', 'salt', 'oil', 'sugar', 'besan'].map((id) => ({ id, name: id }));
  assert.deepEqual(sortByUse(products, counts).map((p) => p.id), ['oil', 'sugar', 'atta', 'besan', 'salt']);
});

test("purchase bill: the owner's example, 16,300 bought, 10,000 paid → this bill owes 6,300; discount and paid limits", () => {
  const lines = [
    { ingredientId: 'atta', quantityMilli: 2_000, ratePaisa: 650_000 },
    { ingredientId: 'sugar', quantityMilli: 15_000, ratePaisa: 20_000 },
  ];
  assert.deepEqual(billTotals(lines, 0), { subtotal: 1_600_000, discount: 0, total: 1_600_000 });
  const withOil = [...lines, { ingredientId: 'oil', quantityMilli: 5_000, ratePaisa: 6_000 }];
  assert.deepEqual(billTotals(withOil, 0), { subtotal: 1_630_000, discount: 0, total: 1_630_000 }, 'Rs. 16,300');
  assert.equal(billTotals(withOil, 0).total - 1_000_000, 630_000, 'paid Rs. 10,000 → Rs. 6,300 due on this bill');
  assert.equal(discountFromPercent(1_540_000, 1_000), 154_000, '10 % of Rs. 15,400');
  const products = ['atta', 'sugar', 'oil'].map((id) => ({ id, isActive: true, kind: 'BOUGHT' as const, purchaseUnit: 'kg' as const, stockUnit: 'g' as const, packSizeMilli: null }));
  const bill = { lines: withOil, note: '', discount: 30_000, paid: 1_000_000, method: 'CASH', date: '2026-11-06', billNo: 'SKS-1024' };
  assert.equal(checkPurchaseBill(bill, products, '2026-11-06'), null);
  assert.deepEqual(checkPurchaseBill({ ...bill, discount: 2_000_000 }, products, '2026-11-06'), { line: null, problem: 'DISCOUNT_INVALID' });
  assert.deepEqual(checkPurchaseBill({ ...bill, paid: 1_600_001 }, products, '2026-11-06'), { line: null, problem: 'PAID_MORE_THAN_BILL' }, 'old debt is paid with Settle Payment');
  assert.deepEqual(checkPurchaseBill({ ...bill, method: null }, products, '2026-11-06'), { line: null, problem: 'METHOD_REQUIRED' });
  assert.equal(checkPurchaseBill({ ...bill, paid: 0, method: null }, products, '2026-11-06'), null, 'nothing paid now: no method needed');
  assert.deepEqual(checkPurchaseBill({ ...bill, date: '2026-11-07' }, products, '2026-11-06'), { line: null, problem: 'DATE_INVALID' });
  assert.deepEqual(checkPurchaseBill({ ...bill, lines: [] }, products, '2026-11-06'), { line: null, problem: 'NO_LINES' });
});

test('a new product with a name like one we have is flagged (Chini ↔ Chini (Sugar), Aloo ↔ Potatoes (aloo)), units ignored', () => {
  const list = [{ name: 'Chini (Sugar)' }, { name: 'Potatoes (aloo)' }, { name: 'Atta (20 kg bag)' }, { name: 'Red chilli powder (500 g pack)' }];
  assert.deepEqual(similarIngredients('chini', list).map((i) => i.name), ['Chini (Sugar)']);
  assert.deepEqual(similarIngredients('Aloo', list).map((i) => i.name), ['Potatoes (aloo)']);
  assert.deepEqual(similarIngredients('Maida 20 kg bag', list), [], 'bag and kg are not names');
  assert.deepEqual(similarIngredients('', list), []);
});

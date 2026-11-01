import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ACTIVE_RIDER_DELIVERIES, canDisableRider, canPickUpAnother, canRiderGoOffline, deliveryAreaLabel, googleMapsLink, isActiveRiderStage, isRiderLinkData, isRiderOnline, riderAssignBlock, riderDayTotals, riderDeliveryFromOrder, riderStage, type Order, type RiderDelivery } from './index';

const rider = { isActive: true, activatedAt: '2026-11-01T10:00:00.000Z' };

test('only an active, activated, Online rider can get a new order', () => {
  assert.equal(riderAssignBlock(rider), null);
  assert.equal(riderAssignBlock({ ...rider, riderOnline: true }), null);
  assert.equal(riderAssignBlock({ ...rider, riderOnline: false }), 'OFFLINE');
  assert.equal(riderAssignBlock({ ...rider, activatedAt: null }), 'NOT_ACTIVATED');
  assert.equal(riderAssignBlock({ ...rider, isActive: false, riderOnline: false }), 'DISABLED');
});

test('a rider is Online until the rider says otherwise', () => {
  assert.equal(isRiderOnline({}), true);
  assert.equal(isRiderOnline({ riderOnline: false }), false);
});

test('a running delivery keeps the rider Online and enabled', () => {
  assert.equal(canRiderGoOffline(0), true);
  assert.equal(canRiderGoOffline(1), false);
  assert.equal(canDisableRider(0), true);
  assert.equal(canDisableRider(2), false);
});

test('the map link is the free Google Maps link with the address made safe', () => {
  assert.equal(googleMapsLink('House 12, Street 3 & Gulberg'), 'https://www.google.com/maps/search/?api=1&query=House%2012%2C%20Street%203%20%26%20Gulberg');
});

const delivery = (over: Partial<RiderDelivery>): RiderDelivery => ({
  id: 'd',
  riderId: 'r',
  dailyNumber: 1,
  status: 'DELIVERED',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  note: '',
  items: [],
  total: 0,
  amountToCollect: 0,
  cashCollected: 0,
  cashSettled: false,
  assignedAt: null,
  pickedUpAt: null,
  deliveredAt: null,
  ...over,
});

test('the day counts delivered orders and splits the cash into settled and still with the rider', () => {
  const totals = riderDayTotals([
    delivery({ cashCollected: 125_000, cashSettled: true }),
    delivery({ cashCollected: 90_000 }),
    delivery({ cashCollected: 0 }),
    delivery({ status: 'OUT_FOR_DELIVERY', amountToCollect: 50_000 }),
  ]);
  assert.deepEqual(totals, { delivered: 3, cashCollected: 215_000, cashSettled: 125_000, cashWithRider: 90_000 });
});

test('Picked Up is only a display step: the three order statuses stay, and a tap never changes them', () => {
  assert.equal(riderStage({ status: 'RIDER_ASSIGNED' }), 'NEW');
  assert.equal(riderStage({ status: 'RIDER_ASSIGNED', pickupTappedAt: null }), 'NEW');
  assert.equal(riderStage({ status: 'RIDER_ASSIGNED', pickupTappedAt: '2026-11-01T10:00:00.000Z' }), 'PICKED_UP');
  assert.equal(riderStage({ status: 'OUT_FOR_DELIVERY', pickupTappedAt: '2026-11-01T10:00:00.000Z' }), 'ON_THE_WAY');
  assert.equal(riderStage({ status: 'DELIVERED' }), 'DELIVERED');
  assert.ok(!(riderStage({ status: 'RIDER_ASSIGNED', pickupTappedAt: 'x' }) as string).includes('RIDER_ASSIGNED'));
});

test('three deliveries with the rider is the limit shown in the app; a new order does not count', () => {
  assert.equal(MAX_ACTIVE_RIDER_DELIVERIES, 3);
  assert.equal(isActiveRiderStage('NEW'), false);
  assert.equal(isActiveRiderStage('PICKED_UP'), true);
  assert.equal(isActiveRiderStage('ON_THE_WAY'), true);
  assert.equal(isActiveRiderStage('DELIVERED'), false);
  assert.equal(canPickUpAnother(2), true);
  assert.equal(canPickUpAnother(3), false);
});

test('the area is the part of the address before the city', () => {
  assert.equal(deliveryAreaLabel('House 12, Street 3, Gulberg III, Lahore'), 'Gulberg III');
  assert.equal(deliveryAreaLabel('Model Town'), 'Model Town');
  assert.equal(deliveryAreaLabel(''), '');
});

const order = (over: Partial<Order>): Order =>
  ({
    id: 'o1',
    type: 'DELIVERY',
    status: 'OUT_FOR_DELIVERY',
    dailyNumber: 7,
    riderId: 'r1',
    customerName: 'Sara',
    customerPhone: '0300-1234567',
    customerAddress: 'Gulberg',
    note: 'Ring twice',
    items: [
      { id: 'i1', name: 'Classic Pizza', variantName: 'Medium', quantity: 1, unit: 'piece', modifiers: [{ name: 'Cheese' }], note: '', isVoid: false, lineTotal: 95_000 },
      { id: 'i2', name: 'Chicken Karahi', variantName: null, quantity: 2, unit: 'kg', modifiers: [], note: 'Spicy', isVoid: false },
      { id: 'i3', name: 'Cold Drink', variantName: null, quantity: 1, unit: 'piece', modifiers: [], note: '', isVoid: true },
    ],
    totals: { total: 200_000 },
    paidTotal: 50_000,
    payments: [],
    history: [
      { toStatus: 'RIDER_ASSIGNED', changedAt: '2026-11-01T10:00:00.000Z' },
      { toStatus: 'OUT_FOR_DELIVERY', changedAt: '2026-11-01T10:05:00.000Z' },
    ],
    cashSettlementId: null,
    ...over,
  }) as unknown as Order;

test('the rider sees the items with units, without voids, and only what is left to collect', () => {
  const view = riderDeliveryFromOrder(order({}));
  assert.deepEqual(view?.items.map((i) => i.label), ['1 × Classic Pizza (Medium) + Cheese', '2 kg Chicken Karahi']);
  assert.equal(view?.items[0]?.lineTotal, 95_000);
  assert.equal(view?.amountToCollect, 150_000);
  assert.equal(view?.assignedAt, '2026-11-01T10:00:00.000Z');
  assert.equal(view?.pickedUpAt, '2026-11-01T10:05:00.000Z');
  assert.equal(view?.deliveredAt, null);
});

test('cash on delivery counts only what this rider took', () => {
  const payments = [
    { kind: 'PAYMENT', method: 'CASH', amount: 150_000, tipAmount: 5_000, receivedBy: 'r1' },
    { kind: 'PAYMENT', method: 'CASH', amount: 50_000, tipAmount: 0, receivedBy: 'cashier' },
    { kind: 'PAYMENT', method: 'WALLET', amount: 1_000, tipAmount: 0, receivedBy: 'r1' },
  ];
  const view = riderDeliveryFromOrder(order({ status: 'DELIVERED', payments: payments as unknown as Order['payments'], cashSettlementId: 's1' }));
  assert.equal(view?.cashCollected, 155_000);
  assert.equal(view?.cashSettled, true);
});

test('only delivery orders that a rider has reach the rider', () => {
  assert.equal(riderDeliveryFromOrder(order({ type: 'TAKEAWAY' })), null);
  assert.equal(riderDeliveryFromOrder(order({ riderId: null })), null);
  assert.equal(riderDeliveryFromOrder(order({ status: 'READY' })), null);
  assert.equal(riderDeliveryFromOrder(order({ status: 'CANCELLED' })), null);
});

test('a broken link message is refused', () => {
  assert.equal(isRiderLinkData(null), false);
  assert.equal(isRiderLinkData({ riders: [] }), false);
  assert.equal(isRiderLinkData({ restaurantSlug: 'a', branchSlug: 'b', restaurantName: 'A', branchName: 'B', riders: [], deliveries: [] }), true);
});

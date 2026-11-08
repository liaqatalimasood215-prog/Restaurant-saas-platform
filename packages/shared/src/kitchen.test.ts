import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PICKUP_VISIBLE_MS,
  READY_REMINDER_MS,
  TICKET_UNDO_WINDOW_MS,
  checkPickup,
  checkUndoPickup,
  kdsState,
  ticketPickup,
  waitingTooLong,
  automaticOrderSteps,
  checkTicketTransition,
  findTransition,
  splitRoundIntoTickets,
  ticketTimerLevel,
} from './index';

const STATIONS = [
  { id: 'pizza-oven', autoReady: false },
  { id: 'grill-fry', autoReady: false },
  { id: 'hot-kitchen', autoReady: false },
  { id: 'drinks', autoReady: true },
];

test('Test A round 1: pizzas go to Pizza Oven, burgers and fries to Grill & Fry', () => {
  const tickets = splitRoundIntoTickets(
    [
      { name: 'Classic Pizza', stationId: 'pizza-oven' },
      { name: 'Zinger Burger', stationId: 'grill-fry' },
      { name: 'Loaded Fries', stationId: 'grill-fry' },
    ],
    STATIONS,
  );
  assert.deepEqual(
    tickets.map((t) => [t.stationId, t.initialStatus, t.items.map((i) => i.name)]),
    [
      ['pizza-oven', 'NEW', ['Classic Pizza']],
      ['grill-fry', 'NEW', ['Zinger Burger', 'Loaded Fries']],
    ],
  );
});

test('Test A round 2: pasta to Hot Kitchen, drinks are ready at once', () => {
  const tickets = splitRoundIntoTickets(
    [
      { name: 'Alfredo Pasta', stationId: 'hot-kitchen' },
      { name: 'Cold Drink', stationId: 'drinks' },
    ],
    STATIONS,
  );
  assert.deepEqual(
    tickets.map((t) => [t.stationId, t.initialStatus]),
    [
      ['hot-kitchen', 'NEW'],
      ['drinks', 'READY'],
    ],
  );
});

test('a round needs items and known stations', () => {
  assert.throws(() => splitRoundIntoTickets([], STATIONS));
  assert.throws(() => splitRoundIntoTickets([{ stationId: 'tandoor' }], STATIONS));
});

test('kitchen staff work only on their own stations', () => {
  const base = { from: 'NEW', to: 'PREPARING', orderType: 'DINE_IN', orderStatus: 'OPEN' } as const;
  assert.equal(checkTicketTransition({ ...base, role: 'KITCHEN', isOwnStation: true }).ok, true);
  assert.deepEqual(checkTicketTransition({ ...base, role: 'KITCHEN', isOwnStation: false }), {
    ok: false,
    reason: 'NOT_OWN_STATION',
  });
  assert.equal(checkTicketTransition({ ...base, role: 'MANAGER' }).ok, true);
  assert.deepEqual(checkTicketTransition({ ...base, role: 'WAITER' }), { ok: false, reason: 'WRONG_ROLE' });
});

test('served is for dine-in, by waiter/owner/manager', () => {
  const base = { from: 'READY', to: 'SERVED' } as const;
  assert.equal(checkTicketTransition({ ...base, role: 'WAITER', orderType: 'DINE_IN', orderStatus: 'OPEN' }).ok, true);
  assert.deepEqual(
    checkTicketTransition({ ...base, role: 'KITCHEN', isOwnStation: true, orderType: 'DINE_IN', orderStatus: 'OPEN' }),
    { ok: false, reason: 'WRONG_ROLE' },
  );
  assert.deepEqual(checkTicketTransition({ ...base, role: 'MANAGER', orderType: 'DELIVERY', orderStatus: 'READY' }), {
    ok: false,
    reason: 'DINE_IN_ONLY',
  });
});

test('undo is possible for 2 minutes, and not after a rider is assigned', () => {
  const readyAt = Date.UTC(2026, 9, 27, 12, 0, 0);
  const base = { from: 'READY', to: 'PREPARING', role: 'KITCHEN', isOwnStation: true, readyAt } as const;
  assert.equal(
    checkTicketTransition({ ...base, orderType: 'DINE_IN', orderStatus: 'OPEN', now: readyAt + 60_000 }).ok,
    true,
  );
  assert.deepEqual(
    checkTicketTransition({
      ...base,
      orderType: 'DINE_IN',
      orderStatus: 'OPEN',
      now: readyAt + TICKET_UNDO_WINDOW_MS + 1,
    }),
    { ok: false, reason: 'UNDO_EXPIRED' },
  );
  assert.deepEqual(
    checkTicketTransition({ ...base, orderType: 'DELIVERY', orderStatus: 'RIDER_ASSIGNED', now: readyAt + 1000 }),
    { ok: false, reason: 'ORDER_CLOSED' },
  );
});

test('delivery/takeaway order status follows the tickets automatically', () => {
  assert.deepEqual(automaticOrderSteps('DELIVERY', 'ACCEPTED', [{ status: 'NEW' }]), []);
  assert.deepEqual(automaticOrderSteps('DELIVERY', 'ACCEPTED', [{ status: 'PREPARING' }, { status: 'NEW' }]), [
    'PREPARING',
  ]);
  assert.deepEqual(automaticOrderSteps('DELIVERY', 'PREPARING', [{ status: 'READY' }, { status: 'READY' }]), ['READY']);
  assert.deepEqual(automaticOrderSteps('TAKEAWAY', 'ACCEPTED', [{ status: 'READY' }]), ['PREPARING', 'READY']);
  assert.deepEqual(automaticOrderSteps('TAKEAWAY', 'READY', [{ status: 'PREPARING' }, { status: 'READY' }]), [
    'PREPARING',
  ]);
  assert.deepEqual(automaticOrderSteps('DELIVERY', 'PLACED', [{ status: 'READY' }]), []);
  // Auto-ready drinks are not "started": the order waits until a cook starts the pizza.
  assert.deepEqual(automaticOrderSteps('DELIVERY', 'ACCEPTED', [{ status: 'READY', startedAt: null }, { status: 'NEW' }]), []);
  assert.deepEqual(
    automaticOrderSteps('DELIVERY', 'ACCEPTED', [{ status: 'READY', startedAt: null }, { status: 'PREPARING', startedAt: '2026-10-28T10:00:00Z' }]),
    ['PREPARING'],
  );
  assert.deepEqual(automaticOrderSteps('DINE_IN', 'OPEN', [{ status: 'READY' }]), []);
});

test('every automatic step is an allowed automatic transition', () => {
  const cases = [
    ['ACCEPTED', 'PREPARING'],
    ['PREPARING', 'READY'],
    ['READY', 'PREPARING'],
  ] as const;
  for (const type of ['DELIVERY', 'TAKEAWAY'] as const) {
    for (const [from, to] of cases) assert.equal(findTransition(type, from, to)?.automatic, true, `${type} ${from}`);
  }
});

test('ticket timer turns orange at 10 minutes and red at 20 minutes by default', () => {
  const sentAt = 0;
  assert.equal(ticketTimerLevel(sentAt, 9 * 60_000), 'ON_TIME');
  assert.equal(ticketTimerLevel(sentAt, 10 * 60_000), 'WARN');
  assert.equal(ticketTimerLevel(sentAt, 20 * 60_000), 'LATE');
  assert.equal(ticketTimerLevel(sentAt, 6 * 60_000, 5, 8), 'WARN');
});

test('pickup at the pass (owner, 2026-11-09): Ready, Picked up, Served apart; card stays 5 minutes; reminder after 10', () => {
  const at = '2026-11-09T10:00:00.000Z';
  const t0 = Date.parse(at);
  const ready = { status: 'READY' as const, servedAt: null, readyAt: at };
  const dineIn = { type: 'DINE_IN' as const, history: [] };
  assert.equal(ticketPickup(ready, dineIn), null, 'still at the pass');
  assert.deepEqual(ticketPickup({ ...ready, pickedUpAt: at, pickedUpBy: 'imran' }, dineIn), { at, byId: 'imran', source: 'TICKET' });
  assert.deepEqual(ticketPickup({ status: 'SERVED', servedAt: at }, dineIn), { at, byId: null, source: 'SERVED' });
  // Delivery: the rider's "On the way"; takeaway: the counter's "Picked up"
  const delivery = {
    type: 'DELIVERY' as const,
    history: [
      { toStatus: 'READY' as const, changedBy: null, changedAt: at },
      { toStatus: 'OUT_FOR_DELIVERY' as const, changedBy: 'faisal', changedAt: at },
    ],
  };
  assert.equal(ticketPickup(ready, delivery)?.source, 'ORDER');
  assert.equal(ticketPickup(ready, { type: 'TAKEAWAY', history: [{ toStatus: 'READY', changedBy: null, changedAt: at }] }), null);

  assert.equal(kdsState(null, t0 + 60 * 60_000), 'ACTIVE', 'uncollected food never hides');
  assert.equal(kdsState({ at }, t0 + PICKUP_VISIBLE_MS - 1), 'PICKED_UP');
  assert.equal(kdsState({ at }, t0 + PICKUP_VISIBLE_MS), 'HIDDEN');
  assert.equal(waitingTooLong(ready, false, t0 + READY_REMINDER_MS - 1), false);
  assert.equal(waitingTooLong(ready, false, t0 + READY_REMINDER_MS), true);
  assert.equal(waitingTooLong(ready, true, t0 + READY_REMINDER_MS), false, 'picked up: no reminder');

  assert.equal(checkPickup({ role: 'SERVICE_WAITER', orderType: 'DINE_IN', status: 'READY' }), null);
  assert.equal(checkPickup({ role: 'WAITER', orderType: 'DINE_IN', status: 'READY' }), null);
  assert.equal(checkPickup({ role: 'KITCHEN', orderType: 'DINE_IN', status: 'READY' }), 'WRONG_ROLE', 'the kitchen marks Ready, the waiter picks up');
  assert.equal(checkPickup({ role: 'WAITER', orderType: 'TAKEAWAY', status: 'READY' }), 'DINE_IN_ONLY');
  assert.equal(checkPickup({ role: 'WAITER', orderType: 'DINE_IN', status: 'PREPARING' }), 'NOT_READY');
  assert.equal(checkUndoPickup({ role: 'KITCHEN', status: 'READY', pickedUpAt: at, isOwnStation: true, now: t0 + 60_000 }), null);
  assert.equal(checkUndoPickup({ role: 'SERVICE_WAITER', status: 'READY', pickedUpAt: at, now: t0 + PICKUP_VISIBLE_MS }), 'UNDO_EXPIRED');
  assert.equal(checkUndoPickup({ role: 'SERVICE_WAITER', status: 'SERVED', pickedUpAt: at, now: t0 + 60_000 }), 'ALREADY_SERVED');
  assert.equal(checkUndoPickup({ role: 'CASHIER', status: 'READY', pickedUpAt: at, now: t0 + 60_000 }), 'WRONG_ROLE');
});

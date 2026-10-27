import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TICKET_UNDO_WINDOW_MS,
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

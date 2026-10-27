import {
  MAX_QUANTITY_PER_LINE,
  STAFF_ROLES,
  automaticOrderSteps,
  businessDate,
  calculateBill,
  can,
  checkTicketTransition,
  checkTransition,
  splitRoundIntoTickets,
  summarizeMoney,
  tableStatusFor,
  unitPriceFor,
  type Branch,
  type DraftItemInput,
  type FloorPlan,
  type KitchenTicket,
  type KitchenTicketView,
  type MenuSnapshot,
  type Modifier,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Permission,
  type ReadyAlert,
  type StaffRole,
  type StaffUser,
  type TicketStatus,
  type TicketTransitionFailure,
  type TransitionFailure,
} from '@restaurant-saas/shared';
import { ApiError, type ApiClient, type DemoControls, type SendRoundInput, type Session } from '../client';
import type { DemoData } from './seed';
import { DemoStore } from './store';

/** A short random delay so loading states are visible, like a real network. */
const MIN_DELAY_MS = 150;
const MAX_DELAY_MS = 350;

const OPEN_DINE_IN: readonly OrderStatus[] = ['OPEN', 'BILL_REQUESTED'];
/** Orders whose tickets are still on the kitchen screens (delivery tickets leave once the rider has it). */
const KITCHEN_ORDER_STATUSES: readonly OrderStatus[] = [
  'OPEN',
  'BILL_REQUESTED',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'RIDER_ASSIGNED',
];

function wait(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

const RULE_MESSAGES: Record<TransitionFailure | TicketTransitionFailure, string> = {
  NOT_ALLOWED_STEP: 'This step is not allowed from the current status.',
  AUTOMATIC_ONLY: 'This step happens automatically from the kitchen tickets.',
  WRONG_ROLE: 'Your role is not allowed to do this.',
  NOT_ASSIGNED_RIDER: 'Only the assigned rider can do this.',
  RIDER_REQUIRED: 'Choose a rider first.',
  REASON_REQUIRED: 'Please write a reason.',
  HAS_PAYMENTS: 'This order already has payments.',
  NOT_FULLY_PAID: 'Payments do not cover the total yet.',
  NOT_OWN_STATION: 'This ticket belongs to another kitchen station.',
  DINE_IN_ONLY: 'Served is used for dine-in only.',
  UNDO_EXPIRED: 'Undo is only possible within 2 minutes of Ready.',
  ORDER_CLOSED: 'The order has already left the kitchen.',
};

function ruleError(reason: TransitionFailure | TicketTransitionFailure): ApiError {
  const code = reason === 'WRONG_ROLE' || reason === 'NOT_OWN_STATION' ? 'FORBIDDEN' : 'CONFLICT';
  return new ApiError(code, RULE_MESSAGES[reason]);
}

function recalculate(order: Order, branch: Branch): void {
  order.totals = calculateBill({
    orderType: order.type,
    lines: order.items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity, isVoid: i.isVoid })),
    discount: order.discount?.input ?? null,
    deliveryFee: branch.deliveryFee,
    settings: { tax: branch.tax, serviceChargeBps: branch.serviceChargeBps, roundToRupee: branch.roundToRupee },
  });
  const money = summarizeMoney(order.payments);
  order.paidTotal = money.paidTotal;
  order.refundedTotal = money.refundedTotal;
  order.tipTotal = money.tipTotal;
}

function setStatus(order: Order, to: OrderStatus, changedBy: string | null, reason: string | null = null): void {
  order.history.push({ fromStatus: order.status, toStatus: to, changedBy, reason, changedAt: nowIso() });
  order.status = to;
}

/** How long a fully voided ticket stays on the kitchen screen so the cooks notice the VOID. */
const VOID_TICKET_VISIBLE_MS = 2 * 60 * 1000;

/** A ticket whose items were all voided: nothing to cook. Returns when the last item was voided. */
function voidedTicketAt(order: Order, ticket: KitchenTicket): number | null {
  const items = order.items.filter((i) => i.ticketId === ticket.id);
  if (items.length === 0 || items.some((i) => !i.isVoid)) return null;
  return Math.max(...items.map((i) => (i.voidedAt ? Date.parse(i.voidedAt) : 0)));
}

function findTicket(data: DemoData, ticketId: string): { order: Order; ticket: KitchenTicket } {
  for (const order of data.orders) {
    const ticket = order.tickets.find((t) => t.id === ticketId);
    if (ticket) return { order, ticket };
  }
  throw new ApiError('NOT_FOUND', 'Ticket not found.');
}

/**
 * Phase 1–3 implementation of the ApiClient: in-memory DEMO data, shared rules from
 * packages/shared. It behaves like the future server (same shapes, same rule checks, idempotency,
 * all-or-nothing changes), but it is NOT a security boundary — everything runs in the browser.
 */
export class DemoAdapter implements ApiClient, DemoControls {
  private readonly store = new DemoStore();

  private async request<T>(work: () => T): Promise<T> {
    await wait();
    if (this.store.isSimulatingFailure()) {
      throw new ApiError('NETWORK', 'Simulated connection error (DEMO)');
    }
    return structuredClone(work());
  }

  private demoUserFor(role: StaffRole): StaffUser {
    const user = this.store.read().staff.find((s) => s.role === role && s.isActive);
    if (!user) throw new ApiError('NOT_FOUND', `No active demo user with role ${role}`);
    return user;
  }

  private currentUser(data: DemoData = this.store.read()): StaffUser {
    const userId = this.store.getSessionUserId();
    return data.staff.find((s) => s.id === userId && s.isActive) ?? this.demoUserFor('OWNER');
  }

  private require(user: StaffUser, permission: Permission, data: DemoData): void {
    if (!can(user.role, permission, { managerCanSeeMoneyReports: data.branch.managerCanSeeMoneyReports })) {
      throw new ApiError('FORBIDDEN', 'Your role is not allowed to do this.');
    }
  }

  private staffName(data: DemoData, id: string | null): string | null {
    return id ? (data.staff.find((s) => s.id === id)?.name ?? null) : null;
  }

  // ── Session ────────────────────────────────────────────────────────────────────────────────

  getSession(): Promise<Session> {
    return this.request(() => {
      const data = this.store.read();
      return { user: this.currentUser(data), restaurant: data.restaurant, branch: data.branch };
    });
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  // ── Floor and menu ─────────────────────────────────────────────────────────────────────────

  getFloorPlan(): Promise<FloorPlan> {
    return this.request(() => {
      const data = this.store.read();
      const tables = data.tables
        .filter((t) => t.isActive)
        .sort((a, b) => a.sort - b.sort)
        .map((table) => {
          const order = data.orders.find((o) => o.tableId === table.id && OPEN_DINE_IN.includes(o.status)) ?? null;
          return {
            table,
            status: tableStatusFor(order?.status),
            order,
            waiterName: this.staffName(data, order?.waiterId ?? null),
          };
        });
      return { areas: [...data.areas].sort((a, b) => a.sort - b.sort), tables };
    });
  }

  getMenu(): Promise<MenuSnapshot> {
    return this.request(() => {
      const data = this.store.read();
      return {
        categories: data.categories.filter((c) => c.isActive).sort((a, b) => a.sort - b.sort),
        items: [...data.items].sort((a, b) => a.sort - b.sort),
        modifierGroups: data.modifierGroups,
        stations: [...data.stations].sort((a, b) => a.sort - b.sort),
      };
    });
  }

  // ── Dine-in orders ─────────────────────────────────────────────────────────────────────────

  getOpenOrderForTable(tableId: string): Promise<Order | null> {
    return this.request(
      () => this.store.read().orders.find((o) => o.tableId === tableId && OPEN_DINE_IN.includes(o.status)) ?? null,
    );
  }

  sendRound(input: SendRoundInput): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.currentUser(data);
        this.require(user, 'table.order', data);

        const repeated = data.idempotency[input.idempotencyKey];
        if (repeated) {
          const first = data.orders.find((o) => o.id === repeated);
          if (first) return first;
        }
        if (input.items.length === 0) throw new ApiError('VALIDATION', 'Add at least one item before sending.');
        if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 50) {
          throw new ApiError('VALIDATION', 'Number of guests must be between 1 and 50.');
        }
        const table = data.tables.find((t) => t.id === input.tableId && t.isActive);
        if (!table) throw new ApiError('NOT_FOUND', 'Table not found.');

        const now = nowIso();
        let order = data.orders.find((o) => o.tableId === table.id && OPEN_DINE_IN.includes(o.status));
        if (!order) {
          const date = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
          const dailyNumber = (data.dailyCounters[date] ?? 0) + 1;
          data.dailyCounters[date] = dailyNumber;
          order = {
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: data.branch.id,
            type: 'DINE_IN',
            channel: user.role === 'WAITER' ? 'WAITER' : 'POS',
            status: 'OPEN',
            businessDate: date,
            dailyNumber,
            invoiceNumber: null,
            tableId: table.id,
            waiterId: user.id,
            guests: input.guests,
            customerName: null,
            customerPhone: null,
            customerAddress: null,
            riderId: null,
            prepMinutes: null,
            note: '',
            items: [],
            tickets: [],
            payments: [],
            discount: null,
            totals: calculateBill({ orderType: 'DINE_IN', lines: [], settings: { tax: data.branch.tax, serviceChargeBps: 0, roundToRupee: false } }),
            paidTotal: 0,
            refundedTotal: 0,
            tipTotal: 0,
            history: [{ fromStatus: null, toStatus: 'OPEN', changedBy: user.id, reason: null, changedAt: now }],
            createdBy: user.id,
            createdAt: now,
          };
          data.orders.push(order);
        } else {
          order.guests = input.guests;
          if (order.status === 'BILL_REQUESTED') {
            const check = checkTransition({ type: order.type, from: order.status, to: 'OPEN', role: user.role });
            if (!check.ok) throw ruleError(check.reason);
            setStatus(order, 'OPEN', user.id, 'New round added');
          }
        }

        const target = order;
        const roundNo = Math.max(0, ...target.items.map((i) => i.roundNo)) + 1;
        const lines = input.items.map((draft) => this.priceDraft(data, draft, target, roundNo));
        const stations = [...data.stations].sort((a, b) => a.sort - b.sort);
        for (const draftTicket of splitRoundIntoTickets(lines, stations)) {
          const ticket: KitchenTicket = {
            id: newId(),
            restaurantId: target.restaurantId,
            branchId: target.branchId,
            orderId: target.id,
            stationId: draftTicket.stationId,
            roundNo,
            status: draftTicket.initialStatus,
            createdAt: now,
            startedAt: null,
            readyAt: draftTicket.initialStatus === 'READY' ? now : null,
            servedAt: null,
          };
          target.tickets.push(ticket);
          for (const line of draftTicket.items) target.items.push({ ...line, ticketId: ticket.id });
        }
        recalculate(target, data.branch);
        data.idempotency[input.idempotencyKey] = target.id;
        return target;
      }),
    );
  }

  /** Server-side pricing: every price comes from the menu, never from the screen. */
  private priceDraft(data: DemoData, draft: DraftItemInput, order: Order, roundNo: number): OrderItem {
    const menuItem = data.items.find((i) => i.id === draft.menuItemId);
    if (!menuItem) throw new ApiError('NOT_FOUND', 'Menu item not found.');
    if (!menuItem.isAvailable) throw new ApiError('VALIDATION', `${menuItem.name} is out of stock.`);
    if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > MAX_QUANTITY_PER_LINE) {
      throw new ApiError('VALIDATION', `Quantity must be between 1 and ${MAX_QUANTITY_PER_LINE}.`);
    }

    const variant = menuItem.variants.find((v) => v.id === draft.variantId) ?? null;
    if (menuItem.variants.length > 0 && !variant) throw new ApiError('VALIDATION', `Choose a size for ${menuItem.name}.`);
    if (menuItem.variants.length === 0 && draft.variantId) throw new ApiError('VALIDATION', 'Unknown size.');

    const chosen: Modifier[] = [];
    for (const group of data.modifierGroups.filter((g) => menuItem.modifierGroupIds.includes(g.id))) {
      const picked = group.modifiers.filter((m) => draft.modifierIds.includes(m.id));
      if (picked.length < group.minSelect || picked.length > group.maxSelect) {
        throw new ApiError('VALIDATION', `${group.name}: choose ${group.minSelect}–${group.maxSelect}.`);
      }
      if (picked.some((m) => !m.isAvailable)) throw new ApiError('VALIDATION', 'An add-on is not available.');
      chosen.push(...picked);
    }
    if (chosen.length !== new Set(draft.modifierIds).size) throw new ApiError('VALIDATION', 'Unknown add-on.');

    const unitPrice = unitPriceFor({
      basePrice: menuItem.basePrice,
      variantPrice: variant?.price,
      modifierPrices: chosen.map((m) => m.price),
    });
    return {
      id: newId(),
      restaurantId: order.restaurantId,
      branchId: order.branchId,
      orderId: order.id,
      menuItemId: menuItem.id,
      name: menuItem.name,
      variantName: variant?.name ?? null,
      modifiers: chosen.map((m) => ({ name: m.name, price: m.price })),
      unitPrice,
      quantity: draft.quantity,
      lineTotal: unitPrice * draft.quantity,
      note: draft.note.trim().slice(0, 140),
      roundNo,
      stationId: menuItem.stationId,
      ticketId: '',
      isVoid: false,
      voidReason: null,
      voidedBy: null,
      voidedAt: null,
    };
  }

  requestBill(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.currentUser(data);
        const order = data.orders.find((o) => o.id === orderId);
        if (!order) throw new ApiError('NOT_FOUND', 'Order not found.');
        if (order.status === 'BILL_REQUESTED') return order;
        const check = checkTransition({ type: order.type, from: order.status, to: 'BILL_REQUESTED', role: user.role });
        if (!check.ok) throw ruleError(check.reason);
        setStatus(order, 'BILL_REQUESTED', user.id);
        return order;
      }),
    );
  }

  voidItem(orderItemId: string, reason: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.currentUser(data);
        this.require(user, 'item.void', data);
        if (!reason.trim()) throw ruleError('REASON_REQUIRED');
        const order = data.orders.find((o) => o.items.some((i) => i.id === orderItemId));
        const item = order?.items.find((i) => i.id === orderItemId);
        if (!order || !item) throw new ApiError('NOT_FOUND', 'Item not found.');
        if (!OPEN_DINE_IN.includes(order.status)) throw new ApiError('CONFLICT', 'This order is closed.');
        if (item.isVoid) return order;
        item.isVoid = true;
        item.voidReason = reason.trim();
        item.voidedBy = user.id;
        item.voidedAt = nowIso();
        recalculate(order, data.branch);
        return order;
      }),
    );
  }

  // ── Kitchen ────────────────────────────────────────────────────────────────────────────────

  listKitchenTickets(): Promise<KitchenTicketView[]> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.currentUser(data);
      this.require(user, 'ticket.update', data);
      const ownStation = (stationId: string) =>
        user.role !== 'KITCHEN' || user.stationIds.length === 0 || user.stationIds.includes(stationId);
      const views: KitchenTicketView[] = [];
      for (const order of data.orders) {
        if (!KITCHEN_ORDER_STATUSES.includes(order.status)) continue;
        for (const ticket of order.tickets) {
          if (ticket.status === 'SERVED' || !ownStation(ticket.stationId)) continue;
          const voidedAt = voidedTicketAt(order, ticket);
          if (voidedAt !== null && Date.now() - voidedAt > VOID_TICKET_VISIBLE_MS) continue;
          views.push({
            ticket,
            orderType: order.type,
            orderStatus: order.status,
            dailyNumber: order.dailyNumber,
            tableName: data.tables.find((t) => t.id === order.tableId)?.name ?? null,
            waiterName: this.staffName(data, order.waiterId),
            items: order.items.filter((i) => i.ticketId === ticket.id),
          });
        }
      }
      return views.sort((a, b) => a.ticket.createdAt.localeCompare(b.ticket.createdAt));
    });
  }

  updateTicket(ticketId: string, to: TicketStatus): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.currentUser(data);
        const { order, ticket } = findTicket(data, ticketId);
        // A double tap or retry asks for the status the ticket already has: nothing to do.
        if (ticket.status === to) return;
        if (voidedTicketAt(order, ticket) !== null) throw new ApiError('CONFLICT', 'All items on this ticket were voided.');
        const check = checkTicketTransition({
          from: ticket.status,
          to,
          role: user.role,
          orderType: order.type,
          orderStatus: order.status,
          isOwnStation: user.stationIds.length === 0 || user.stationIds.includes(ticket.stationId),
          readyAt: ticket.readyAt ? Date.parse(ticket.readyAt) : null,
          now: Date.now(),
        });
        if (!check.ok) throw ruleError(check.reason);

        const now = nowIso();
        if (to === 'PREPARING' && ticket.status === 'NEW') ticket.startedAt = now;
        if (to === 'PREPARING' && ticket.status === 'READY') ticket.readyAt = null;
        if (to === 'READY') ticket.readyAt = now;
        if (to === 'SERVED') ticket.servedAt = now;
        ticket.status = to;

        const cookingTickets = order.tickets.filter((tk) => voidedTicketAt(order, tk) === null);
        for (const step of automaticOrderSteps(order.type, order.status, cookingTickets)) {
          setStatus(order, step, null, 'Automatic (kitchen tickets)');
        }
      }),
    );
  }

  setItemAvailable(menuItemId: string, available: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.currentUser(data);
        this.require(user, 'item.outOfStock', data);
        const item = data.items.find((i) => i.id === menuItemId);
        if (!item) throw new ApiError('NOT_FOUND', 'Menu item not found.');
        item.isAvailable = available;
      }),
    );
  }

  listReadyAlerts(): Promise<ReadyAlert[]> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.currentUser(data);
      if (!can(user.role, 'table.order')) return [];
      const alerts: ReadyAlert[] = [];
      for (const order of data.orders) {
        if (order.type !== 'DINE_IN' || !OPEN_DINE_IN.includes(order.status) || !order.tableId) continue;
        if (user.role === 'WAITER' && order.waiterId !== user.id) continue;
        for (const ticket of order.tickets) {
          if (ticket.status !== 'READY' || !ticket.readyAt) continue;
          alerts.push({
            ticketId: ticket.id,
            orderId: order.id,
            tableId: order.tableId,
            tableName: data.tables.find((t) => t.id === order.tableId)?.name ?? '',
            stationName: data.stations.find((s) => s.id === ticket.stationId)?.name ?? '',
            readyAt: ticket.readyAt,
          });
        }
      }
      return alerts.sort((a, b) => a.readyAt.localeCompare(b.readyAt));
    });
  }

  // ── DEMO controls ──────────────────────────────────────────────────────────────────────────

  listDemoUsers(): StaffUser[] {
    return STAFF_ROLES.map((role) => this.demoUserFor(role));
  }

  switchRole(role: StaffRole): void {
    this.store.setSessionUserId(this.demoUserFor(role).id);
  }

  isSimulatingFailure(): boolean {
    return this.store.isSimulatingFailure();
  }

  setSimulatedFailure(on: boolean): void {
    this.store.setSimulatedFailure(on);
  }

  resetData(): void {
    this.store.reset();
  }
}

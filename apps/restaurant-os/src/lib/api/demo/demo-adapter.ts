import {
  MAX_QUANTITY_PER_LINE,
  amountDue,
  automaticOrderSteps,
  businessDate,
  calculateBill,
  can,
  canManageStaffAccount,
  canUseApp,
  cashChange,
  checkPaymentAmount,
  checkTicketTransition,
  checkTransition,
  isFullyPaid,
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
  type PaymentEntry,
  type Permission,
  type StaffNotification,
  type StaffUser,
  type TicketStatus,
  type TicketTransitionFailure,
  type TransitionFailure,
} from '@restaurant-saas/shared';
import {
  ApiError,
  type ApiClient,
  type DemoControls,
  type RecordPaymentInput,
  type SendRoundInput,
  type Session,
  type StaffInput,
} from '../client';
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
/** How long a fully voided ticket stays on the kitchen screen so the cooks notice the VOID. */
const VOID_TICKET_VISIBLE_MS = 2 * 60 * 1000;
const PHONE_PATTERN = /^03\d{2}-\d{7}$/;

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

/** Waiters with assigned tables work only on those tables; empty list = all tables. */
function worksOnTable(user: StaffUser, tableId: string | null): boolean {
  if (user.role !== 'WAITER' && user.role !== 'SERVICE_WAITER') return true;
  return user.tableIds.length === 0 || (tableId !== null && user.tableIds.includes(tableId));
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

  private currentUser(data: DemoData = this.store.read()): StaffUser | null {
    const userId = this.store.getSessionUserId();
    const user = data.staff.find((s) => s.id === userId);
    // A disabled user is logged out at the next action (PROJECT_RULES.md §7).
    return user?.isActive && canUseApp(user.role, 'restaurant-os') ? user : null;
  }

  private requireUser(data: DemoData): StaffUser {
    const user = this.currentUser(data);
    if (!user) throw new ApiError('FORBIDDEN', 'Please log in again.');
    return user;
  }

  private require(data: DemoData, permission: Permission): StaffUser {
    const user = this.requireUser(data);
    if (!can(user.role, permission, { managerCanSeeMoneyReports: data.branch.managerCanSeeMoneyReports })) {
      throw new ApiError('FORBIDDEN', 'Your role is not allowed to do this.');
    }
    return user;
  }

  private staffName(data: DemoData, id: string | null): string | null {
    return id ? (data.staff.find((s) => s.id === id)?.name ?? null) : null;
  }

  private tableName(data: DemoData, tableId: string | null): string {
    return data.tables.find((t) => t.id === tableId)?.name ?? '';
  }

  private findOrder(data: DemoData, orderId: string): Order {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order) throw new ApiError('NOT_FOUND', 'Order not found.');
    return order;
  }

  // ── Session ────────────────────────────────────────────────────────────────────────────────

  getSession(): Promise<Session | null> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.currentUser(data);
      return user ? { user, restaurant: data.restaurant, branch: data.branch } : null;
    });
  }

  logout(): Promise<void> {
    return this.request(() => this.store.setSessionUserId(null));
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  // ── Floor and menu ─────────────────────────────────────────────────────────────────────────

  getFloorPlan(): Promise<FloorPlan> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.requireUser(data);
      const tables = data.tables
        .filter((t) => t.isActive && worksOnTable(user, t.id))
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
      this.requireUser(data);
      return {
        categories: data.categories.filter((c) => c.isActive).sort((a, b) => a.sort - b.sort),
        items: [...data.items].sort((a, b) => a.sort - b.sort),
        modifierGroups: data.modifierGroups,
        stations: [...data.stations].sort((a, b) => a.sort - b.sort),
      };
    });
  }

  getOrder(orderId: string): Promise<Order> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.requireUser(data);
      const order = this.findOrder(data, orderId);
      if (!worksOnTable(user, order.tableId)) throw new ApiError('NOT_FOUND', 'Order not found.');
      return order;
    });
  }

  // ── Dine-in orders ─────────────────────────────────────────────────────────────────────────

  sendRound(input: SendRoundInput): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'table.order');

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
        if (!table || !worksOnTable(user, table.id)) throw new ApiError('NOT_FOUND', 'Table not found.');

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
            totals: calculateBill({
              orderType: 'DINE_IN',
              lines: [],
              settings: { tax: data.branch.tax, serviceChargeBps: 0, roundToRupee: false },
            }),
            paidTotal: 0,
            refundedTotal: 0,
            tipTotal: 0,
            billRequest: null,
            receiptPrints: 0,
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
            order.billRequest = null;
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
      unit: menuItem.unit,
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

  voidItem(orderItemId: string, reason: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'item.void');
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

  // ── Bill, payment, receipt ─────────────────────────────────────────────────────────────────

  requestBill(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'bill.request');
        const order = this.findOrder(data, orderId);
        if (!worksOnTable(user, order.tableId)) throw new ApiError('NOT_FOUND', 'Order not found.');
        // Repeated taps: one request.
        if (order.status === 'BILL_REQUESTED' && order.billRequest) return order;
        if (order.status === 'OPEN') {
          const check = checkTransition({ type: order.type, from: 'OPEN', to: 'BILL_REQUESTED', role: user.role });
          if (!check.ok) throw ruleError(check.reason);
          setStatus(order, 'BILL_REQUESTED', user.id, 'Bill requested');
        } else if (order.status !== 'BILL_REQUESTED') {
          throw ruleError('NOT_ALLOWED_STEP');
        }
        order.billRequest = { requestedBy: user.id, requestedAt: nowIso(), acceptedBy: null, acceptedAt: null };
        return order;
      }),
    );
  }

  acceptBillRequest(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'bill.accept');
        const order = this.findOrder(data, orderId);
        if (order.billRequest && !order.billRequest.acceptedAt) {
          order.billRequest.acceptedBy = user.id;
          order.billRequest.acceptedAt = nowIso();
        }
        return order;
      }),
    );
  }

  printPreBill(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'bill.accept');
        const order = this.findOrder(data, orderId);
        if (order.status === 'OPEN') {
          const check = checkTransition({ type: order.type, from: 'OPEN', to: 'BILL_REQUESTED', role: user.role });
          if (!check.ok) throw ruleError(check.reason);
          setStatus(order, 'BILL_REQUESTED', user.id, 'Pre-bill printed');
        } else if (order.status !== 'BILL_REQUESTED') {
          throw new ApiError('CONFLICT', 'This bill is already closed.');
        }
        if (order.billRequest && !order.billRequest.acceptedAt) {
          order.billRequest.acceptedBy = user.id;
          order.billRequest.acceptedAt = nowIso();
        }
        return order;
      }),
    );
  }

  recordPayment(input: RecordPaymentInput): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'payment.record');
        const repeated = data.idempotency[input.idempotencyKey];
        if (repeated) return this.findOrder(data, repeated);

        const order = this.findOrder(data, input.orderId);
        if (!OPEN_DINE_IN.includes(order.status)) throw new ApiError('CONFLICT', 'This bill is already closed.');
        const due = amountDue(order.totals.total, order.paidTotal);
        const check = checkPaymentAmount(input.amount, due);
        if (!check.ok) {
          throw new ApiError(
            'VALIDATION',
            check.reason === 'MORE_THAN_DUE' ? 'The amount is more than what is due.' : 'Enter a valid amount.',
          );
        }
        if (!Number.isSafeInteger(input.tipAmount) || input.tipAmount < 0) throw new ApiError('VALIDATION', 'Enter a valid tip.');
        let changeGiven: number | null = null;
        if (input.method === 'CASH') {
          if (input.cashReceived === null) throw new ApiError('VALIDATION', 'Enter the cash received.');
          try {
            changeGiven = cashChange({ amount: input.amount, tipAmount: input.tipAmount, cashReceived: input.cashReceived });
          } catch {
            throw new ApiError('VALIDATION', 'Cash received is less than the payment and tip.');
          }
        }
        const payment: PaymentEntry = {
          id: newId(),
          restaurantId: order.restaurantId,
          branchId: order.branchId,
          orderId: order.id,
          kind: 'PAYMENT',
          method: input.method,
          amount: input.amount,
          tipAmount: input.tipAmount,
          cashReceived: input.method === 'CASH' ? input.cashReceived : null,
          changeGiven,
          reference: input.reference?.trim() || null,
          receivedBy: user.id,
          relatedPaymentId: null,
          reason: null,
          createdAt: nowIso(),
        };
        order.payments.push(payment);
        recalculate(order, data.branch);
        if (order.billRequest && !order.billRequest.acceptedAt) {
          order.billRequest.acceptedBy = user.id;
          order.billRequest.acceptedAt = nowIso();
        }
        if (isFullyPaid(order.totals.total, order.paidTotal)) {
          const paid = checkTransition({ type: order.type, from: order.status, to: 'PAID', role: user.role, isFullyPaid: true });
          if (!paid.ok) throw ruleError(paid.reason);
          setStatus(order, 'PAID', user.id);
          data.invoiceCounter += 1;
          order.invoiceNumber = data.invoiceCounter;
        }
        data.idempotency[input.idempotencyKey] = order.id;
        return order;
      }),
    );
  }

  printReceipt(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'payment.record');
        const order = this.findOrder(data, orderId);
        if (order.status !== 'PAID') throw new ApiError('CONFLICT', 'The receipt is printed after payment.');
        order.receiptPrints += 1;
        return order;
      }),
    );
  }

  // ── Kitchen ────────────────────────────────────────────────────────────────────────────────

  listKitchenTickets(): Promise<KitchenTicketView[]> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.require(data, 'ticket.update');
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
            tableName: order.tableId ? this.tableName(data, order.tableId) : null,
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
        const user = this.requireUser(data);
        const { order, ticket } = findTicket(data, ticketId);
        // A double tap or retry asks for the status the ticket already has: nothing to do.
        if (ticket.status === to) return;
        if (voidedTicketAt(order, ticket) !== null) throw new ApiError('CONFLICT', 'All items on this ticket were voided.');
        if (to === 'SERVED' && !worksOnTable(user, order.tableId)) {
          throw new ApiError('FORBIDDEN', 'This table is not assigned to you.');
        }
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
        this.require(data, 'item.outOfStock');
        const item = data.items.find((i) => i.id === menuItemId);
        if (!item) throw new ApiError('NOT_FOUND', 'Menu item not found.');
        item.isAvailable = available;
      }),
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────────────────────────

  listNotifications(): Promise<StaffNotification[]> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.currentUser(data);
      if (!user) return [];
      const serviceWaiterCovers = (tableId: string) =>
        data.staff.some(
          (s) => s.isActive && s.role === 'SERVICE_WAITER' && (s.tableIds.length === 0 || s.tableIds.includes(tableId)),
        );
      const getsFoodReady = (order: Order, tableId: string) => {
        if (user.role === 'OWNER' || user.role === 'MANAGER') return true;
        if (user.role === 'SERVICE_WAITER') return worksOnTable(user, tableId);
        // The Super Waiter is told only when no Service Waiter covers the table.
        if (user.role === 'WAITER') return order.waiterId === user.id && !serviceWaiterCovers(tableId);
        return false;
      };

      const list: StaffNotification[] = [];
      for (const order of data.orders) {
        const tableId = order.tableId;
        if (order.type !== 'DINE_IN' || !OPEN_DINE_IN.includes(order.status) || !tableId) continue;
        const tableName = this.tableName(data, tableId);

        if (getsFoodReady(order, tableId)) {
          for (const ticket of order.tickets) {
            if (ticket.status !== 'READY' || !ticket.readyAt || voidedTicketAt(order, ticket) !== null) continue;
            list.push({
              kind: 'FOOD_READY',
              id: `ready:${ticket.id}`,
              orderId: order.id,
              tableId,
              tableName,
              stationName: data.stations.find((s) => s.id === ticket.stationId)?.name ?? '',
              items: order.items
                .filter((i) => i.ticketId === ticket.id && !i.isVoid)
                .map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name, variantName: i.variantName })),
              at: ticket.readyAt,
            });
          }
        }

        const request = order.billRequest;
        if (request && !request.acceptedAt && can(user.role, 'bill.accept')) {
          list.push({
            kind: 'BILL_REQUESTED',
            id: `bill:${order.id}:${request.requestedAt}`,
            orderId: order.id,
            tableId,
            tableName,
            total: order.totals.total,
            requestedByName: this.staffName(data, request.requestedBy) ?? '',
            at: request.requestedAt,
          });
        }
        if (request?.acceptedAt && request.requestedBy === user.id) {
          list.push({
            kind: 'BILL_ACCEPTED',
            id: `ack:${order.id}:${request.acceptedAt}`,
            orderId: order.id,
            tableId,
            tableName,
            acceptedByName: this.staffName(data, request.acceptedBy) ?? '',
            at: request.acceptedAt,
          });
        }
      }
      return list.sort((a, b) => a.at.localeCompare(b.at));
    });
  }

  // ── Staff ──────────────────────────────────────────────────────────────────────────────────

  listStaff(): Promise<StaffUser[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'staff.manage');
      return [...data.staff].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  saveStaff(input: StaffInput): Promise<StaffUser> {
    return this.request(() =>
      this.store.update((data) => {
        const actor = this.require(data, 'staff.manage');
        const existing = input.id ? data.staff.find((s) => s.id === input.id) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Staff member not found.');
        if (existing && !canManageStaffAccount(actor.role, existing.role)) {
          throw new ApiError('FORBIDDEN', 'You cannot change this account.');
        }
        if (!canManageStaffAccount(actor.role, input.role)) {
          throw new ApiError('FORBIDDEN', 'You cannot give this role.');
        }
        // Nobody changes their own role or permissions.
        if (existing && existing.id === actor.id && existing.role !== input.role) {
          throw new ApiError('FORBIDDEN', 'You cannot change your own role.');
        }
        const name = input.name.trim();
        if (name.length < 2) throw new ApiError('VALIDATION', 'Enter the full name.');
        if (!PHONE_PATTERN.test(input.phone.trim())) throw new ApiError('VALIDATION', 'Phone must look like 0300-1234567.');
        if (data.staff.some((s) => s.phone === input.phone.trim() && s.id !== input.id)) {
          throw new ApiError('VALIDATION', 'Another staff member already uses this phone number.');
        }
        if (input.stationIds.some((id) => !data.stations.some((s) => s.id === id))) {
          throw new ApiError('VALIDATION', 'Unknown kitchen station.');
        }
        if (input.tableIds.some((id) => !data.tables.some((t) => t.id === id))) {
          throw new ApiError('VALIDATION', 'Unknown table.');
        }
        const isWaiter = input.role === 'WAITER' || input.role === 'SERVICE_WAITER';
        const fields = {
          name,
          phone: input.phone.trim(),
          role: input.role,
          stationIds: input.role === 'KITCHEN' ? input.stationIds : [],
          tableIds: isWaiter ? input.tableIds : [],
        };
        if (existing) {
          Object.assign(existing, fields);
          return existing;
        }
        const created: StaffUser = {
          id: newId(),
          restaurantId: data.restaurant.id,
          branchId: input.role === 'OWNER' ? null : data.branch.id,
          isActive: true,
          ...fields,
        };
        data.staff.push(created);
        return created;
      }),
    );
  }

  setStaffActive(userId: string, active: boolean): Promise<StaffUser> {
    return this.request(() =>
      this.store.update((data) => {
        const actor = this.require(data, 'staff.manage');
        const target = data.staff.find((s) => s.id === userId);
        if (!target) throw new ApiError('NOT_FOUND', 'Staff member not found.');
        if (target.id === actor.id) throw new ApiError('FORBIDDEN', 'You cannot disable your own account.');
        if (!canManageStaffAccount(actor.role, target.role)) throw new ApiError('FORBIDDEN', 'You cannot change this account.');
        target.isActive = active;
        return target;
      }),
    );
  }

  // ── DEMO controls ──────────────────────────────────────────────────────────────────────────

  listLoginAccounts(): StaffUser[] {
    // Riders use the separate Rider App (Phase 3), never Restaurant OS.
    return this.store.read().staff.filter((s) => s.isActive && canUseApp(s.role, 'restaurant-os'));
  }

  demoLogin(userId: string): void {
    this.store.setSessionUserId(userId);
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

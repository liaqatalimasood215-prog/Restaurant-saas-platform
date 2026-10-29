import {
  MAX_BULK_TABLES,
  MAX_NAME_LENGTH,
  MAX_QUANTITY_PER_LINE,
  MAX_TABLE_SEATS,
  PIN_LENGTH,
  amountDue,
  automaticOrderSteps,
  businessDate,
  calculateBill,
  can,
  canManageStaffAccount,
  checkPin,
  inviteExpiresAt,
  inviteStatus,
  isValidEmail,
  removesLastOwner,
  type ActivationInfo,
  type InviteKind,
  type PinProblem,
  type StaffMember,
  canUseApp,
  cashChange,
  checkBulkTables,
  checkName,
  checkPaymentAmount,
  checkSeats,
  checkTicketTransition,
  checkTransition,
  cleanName,
  initialStatus,
  isFullyPaid,
  placeAt,
  splitRoundIntoTickets,
  summarizeMoney,
  tableStatusFor,
  unitPriceFor,
  type Area,
  type Branch,
  type DiningTable,
  type TableSetup,
  type TableSetupProblem,
  type CustomerSummary,
  type DiscountChoice,
  type DiscountInput,
  type DraftItemInput,
  type HeldBill,
  type FloorPlan,
  type KitchenTicket,
  type KitchenTicketView,
  type MenuSnapshot,
  type Modifier,
  type Order,
  type OrderItem,
  type OrderStatus,
  type OrderView,
  type PaymentEntry,
  type Permission,
  type RiderCashSettlement,
  type RiderCashView,
  type StaffNotification,
  type StaffUser,
  type TicketStatus,
  type TicketTransitionFailure,
  type TransitionFailure,
} from '@restaurant-saas/shared';
import {
  ApiError,
  type ApiClient,
  type AreaInput,
  type BulkTablesInput,
  type CounterOrderInput,
  type DemoControls,
  type HeldBillInput,
  type OrderFilter,
  type RecordPaymentInput,
  type SendRoundInput,
  type Session,
  type StaffInput,
  type StaffLink,
  type TableInput,
} from '../client';
import type { DemoData, DemoInvite } from './seed';
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

const PIN_MESSAGES: Record<PinProblem, string> = {
  PIN_FORMAT: `The PIN must be exactly ${PIN_LENGTH} digits.`,
  PIN_TOO_SIMPLE: 'This PIN is too easy to guess (like 111111 or 123456). Choose another.',
  PIN_MISMATCH: 'The two PINs are not the same.',
};

/** Area and table setup mistakes, in the words the screens show. */
function setupMessage(problem: TableSetupProblem, name: string, areaName = ''): string {
  switch (problem) {
    case 'NAME_REQUIRED':
      return 'Enter a name.';
    case 'NAME_TOO_LONG':
      return `Names can have at most ${MAX_NAME_LENGTH} letters.`;
    case 'NAME_TAKEN':
      return areaName ? `${areaName} already has a table called ${name}.` : `An area called ${name} already exists.`;
    case 'SEATS_INVALID':
      return `Seats must be a whole number from 1 to ${MAX_TABLE_SEATS}.`;
    case 'RANGE_INVALID':
      return 'The "to" number must be the same as or higher than the "from" number.';
    case 'TOO_MANY':
      return `Add at most ${MAX_BULK_TABLES} tables at once.`;
  }
}

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

/** Splits one round into kitchen tickets by station and links each item to its ticket. */
function addKitchenTickets(data: DemoData, order: Order, items: OrderItem[], roundNo: number, now: string): void {
  const stations = [...data.stations].sort((a, b) => a.sort - b.sort);
  for (const draftTicket of splitRoundIntoTickets(items, stations)) {
    const ticket: KitchenTicket = {
      id: newId(),
      restaurantId: order.restaurantId,
      branchId: order.branchId,
      orderId: order.id,
      stationId: draftTicket.stationId,
      roundNo,
      status: draftTicket.initialStatus,
      createdAt: now,
      startedAt: null,
      readyAt: draftTicket.initialStatus === 'READY' ? now : null,
      servedAt: null,
    };
    order.tickets.push(ticket);
    for (const item of draftTicket.items) item.ticketId = ticket.id;
  }
}

/** Order steps that follow from the tickets (PREPARING / READY), ignoring fully voided tickets. */
function applyAutomaticSteps(order: Order): void {
  const cooking = order.tickets.filter((tk) => voidedTicketAt(order, tk) === null);
  for (const step of automaticOrderSteps(order.type, order.status, cooking)) {
    setStatus(order, step, null, 'Automatic (kitchen tickets)');
  }
}

/** The next gap-free daily order number of the business day. */
function nextDailyNumber(data: DemoData): { date: string; dailyNumber: number } {
  const date = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
  const dailyNumber = (data.dailyCounters[date] ?? 0) + 1;
  data.dailyCounters[date] = dailyNumber;
  return { date, dailyNumber };
}

/** Permanent, gap-free invoice number, given once when the order is fully paid. */
function giveInvoiceNumber(data: DemoData, order: Order): void {
  if (order.invoiceNumber !== null) return;
  data.invoiceCounter += 1;
  order.invoiceNumber = data.invoiceCounter;
}

/** A long random token for the private customer tracking link. */
function trackingToken(): string {
  return `${newId()}${newId()}`.replaceAll('-', '');
}

const ACTIVE_DELIVERY: readonly OrderStatus[] = ['RIDER_ASSIGNED', 'OUT_FOR_DELIVERY'];
const CLOSED: readonly OrderStatus[] = ['PAID', 'DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'];

/** DEMO customers standing in for real Customer App orders (Phase 2). */
const DEMO_CUSTOMERS = [
  { name: 'Ayesha Khan', phone: '0301-1234567', address: 'House 12, Block B, Main Market, Lahore' },
  { name: 'Hamza Saeed', phone: '0321-7654321', address: 'Flat 4, Gulberg III, Lahore' },
  { name: 'Mariam Ali', phone: '0333-5550101', address: 'Street 7, Model Town, Lahore' },
];

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
    const session = this.store.getSession();
    const user = data.staff.find((s) => s.id === session?.userId);
    if (!session || !user) return null;
    // A disabled user is logged out at the next action, and a session from before a Disable / Enable,
    // role change or PIN reset no longer counts (PROJECT_RULES.md §7). DEMO only: the real check is on the server.
    const fresh = (data.sessionVersions[user.id] ?? 0) === session.version;
    return user.isActive && user.activatedAt && fresh && canUseApp(user.role, 'restaurant-os') ? user : null;
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
    return this.request(() => this.store.setSession(null));
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  // ── Floor and menu ─────────────────────────────────────────────────────────────────────────

  getFloorPlan(): Promise<FloorPlan> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.requireUser(data);
      // Tables, POS and Waiter Orders all read this one list: active areas in their order, then each
      // area's tables in display order. Out-of-service tables stay visible; removed ones do not.
      const areas = data.areas.filter((a) => a.isActive).sort((a, b) => a.sort - b.sort);
      const tables = areas.flatMap((area) =>
        data.tables
          .filter((t) => t.areaId === area.id && t.archivedAt === null && worksOnTable(user, t.id))
          .sort((a, b) => a.sort - b.sort)
          .map((table) => {
            const order = this.openTableOrder(data, table.id);
            return {
              table,
              status: tableStatusFor(order?.status, table),
              order,
              waiterName: this.staffName(data, order?.waiterId ?? null),
            };
          }),
      );
      return { areas, tables };
    });
  }

  setTableCleaning(tableId: string, cleaning: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'table.clean');
        const table = data.tables.find((t) => t.id === tableId && t.archivedAt === null);
        if (!table || !worksOnTable(user, table.id)) throw new ApiError('NOT_FOUND', 'Table not found.');
        if (cleaning && this.openTableOrder(data, table.id)) {
          throw new ApiError('CONFLICT', `${table.name} has a running bill. Mark it for cleaning after the bill is paid.`);
        }
        table.cleaning = cleaning;
      }),
    );
  }

  private openTableOrder(data: DemoData, tableId: string): Order | null {
    return data.orders.find((o) => o.tableId === tableId && OPEN_DINE_IN.includes(o.status)) ?? null;
  }

  /** A running bill or a held (unsent) bill keeps a table in use. */
  private hasOpenBill(data: DemoData, tableId: string): boolean {
    return this.openTableOrder(data, tableId) !== null || data.heldBills.some((h) => h.tableId === tableId);
  }

  /** A table that can take a new bill: not removed, in service, in an active area. */
  private usableTable(data: DemoData, tableId: string): DiningTable {
    const table = data.tables.find((t) => t.id === tableId && t.archivedAt === null);
    const area = data.areas.find((a) => a.id === table?.areaId);
    if (!table || !area?.isActive) throw new ApiError('NOT_FOUND', 'Table not found.');
    if (!table.isActive) throw new ApiError('CONFLICT', `${table.name} is out of service.`);
    return table;
  }

  // ── Area and table setup (Owner, Manager) ──────────────────────────────────────────────────

  getTableSetup(): Promise<TableSetup> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'setup.manage');
      const tables = data.tables.filter((t) => t.archivedAt === null);
      return {
        areas: [...data.areas]
          .sort((a, b) => a.sort - b.sort)
          .map((area) => {
            const own = tables.filter((t) => t.areaId === area.id);
            return { area, tableCount: own.length, openBills: own.filter((t) => this.hasOpenBill(data, t.id)).length };
          }),
        tables: [...tables]
          .sort((a, b) => a.sort - b.sort)
          .map((table) => ({
            table,
            status: tableStatusFor(this.openTableOrder(data, table.id)?.status, table),
            hasOpenBill: this.hasOpenBill(data, table.id),
            used: this.tableIsUsed(data, table.id),
          })),
      };
    });
  }

  /** Old bills, held bills, waiter calls or a waiter assignment point at the table: keep its row. */
  private tableIsUsed(data: DemoData, tableId: string): boolean {
    return (
      data.orders.some((o) => o.tableId === tableId) ||
      data.heldBills.some((h) => h.tableId === tableId) ||
      data.waiterCalls.some((c) => c.tableId === tableId) ||
      data.staff.some((s) => s.tableIds.includes(tableId))
    );
  }

  saveArea(input: AreaInput): Promise<Area> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        const existing = input.id ? data.areas.find((a) => a.id === input.id) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Area not found.');
        const name = cleanName(input.name);
        const problem = checkName(name, data.areas.filter((a) => a.id !== input.id).map((a) => a.name));
        if (problem) throw new ApiError('VALIDATION', setupMessage(problem, name));
        if (existing) {
          existing.name = name;
          return existing;
        }
        const area: Area = {
          id: newId(),
          restaurantId: data.restaurant.id,
          branchId: data.branch.id,
          name,
          sort: Math.max(0, ...data.areas.map((a) => a.sort)) + 1,
          isActive: true,
        };
        data.areas.push(area);
        return area;
      }),
    );
  }

  setAreaActive(areaId: string, active: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        const area = data.areas.find((a) => a.id === areaId);
        if (!area) throw new ApiError('NOT_FOUND', 'Area not found.');
        if (!active) {
          const busy = data.tables.filter((t) => t.areaId === area.id && t.archivedAt === null && this.hasOpenBill(data, t.id));
          if (busy.length > 0) {
            throw new ApiError('CONFLICT', `${area.name} has running or held bills (${busy.map((t) => t.name).join(', ')}). Close them first.`);
          }
          if (data.areas.filter((a) => a.isActive && a.id !== area.id).length === 0) {
            throw new ApiError('VALIDATION', 'Keep at least one active area.');
          }
        }
        area.isActive = active;
      }),
    );
  }

  moveArea(areaId: string, position: number): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        if (!data.areas.some((a) => a.id === areaId)) throw new ApiError('NOT_FOUND', 'Area not found.');
        data.areas = placeAt(data.areas, areaId, position);
      }),
    );
  }

  saveTable(input: TableInput): Promise<DiningTable> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        const existing = input.id ? data.tables.find((t) => t.id === input.id && t.archivedAt === null) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Table not found.');
        const area = data.areas.find((a) => a.id === input.areaId);
        if (!area) throw new ApiError('VALIDATION', 'Choose an area.');
        const name = cleanName(input.name);
        const problem =
          checkName(name, this.tableNamesIn(data, area.id, input.id)) ?? checkSeats(input.seats);
        if (problem) throw new ApiError('VALIDATION', setupMessage(problem, name, area.name));

        let table = existing;
        if (table) {
          if (table.areaId !== area.id && this.hasOpenBill(data, table.id)) {
            throw new ApiError('CONFLICT', `${table.name} has a running or held bill. Move it to another area after the bill is closed.`);
          }
          const moved = table.areaId !== area.id;
          Object.assign(table, { name, areaId: area.id, seats: input.seats });
          // A table moved to another area goes to the end of that area unless a position is given.
          if (moved) table.sort = this.lastSortIn(data, area.id, table.id) + 1;
        } else {
          table = {
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: data.branch.id,
            areaId: area.id,
            name,
            seats: input.seats,
            isActive: true,
            sort: this.lastSortIn(data, area.id, null) + 1,
            cleaning: false,
            archivedAt: null,
          };
          data.tables.push(table);
        }
        if (input.position !== null) this.placeTable(data, table.id, input.position);
        return table;
      }),
    );
  }

  addTables(input: BulkTablesInput): Promise<DiningTable[]> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        const area = data.areas.find((a) => a.id === input.areaId);
        if (!area) throw new ApiError('VALIDATION', 'Choose an area.');
        const check = checkBulkTables(input, this.tableNamesIn(data, area.id, null));
        if (!check.ok) throw new ApiError('VALIDATION', setupMessage(check.problem, check.name ?? '', area.name));
        let sort = this.lastSortIn(data, area.id, null);
        const created = check.names.map(
          (name): DiningTable => ({
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: data.branch.id,
            areaId: area.id,
            name,
            seats: input.seats,
            isActive: true,
            sort: ++sort,
            cleaning: false,
            archivedAt: null,
          }),
        );
        data.tables.push(...created);
        return created;
      }),
    );
  }

  setTableInService(tableId: string, inService: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        const table = data.tables.find((t) => t.id === tableId && t.archivedAt === null);
        if (!table) throw new ApiError('NOT_FOUND', 'Table not found.');
        if (!inService && this.hasOpenBill(data, table.id)) {
          throw new ApiError('CONFLICT', `${table.name} has a running or held bill. Take it out of service after the bill is closed.`);
        }
        table.isActive = inService;
        table.cleaning = false;
      }),
    );
  }

  removeTable(tableId: string): Promise<'ARCHIVED' | 'DELETED'> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'setup.manage');
        const table = data.tables.find((t) => t.id === tableId && t.archivedAt === null);
        if (!table) throw new ApiError('NOT_FOUND', 'Table not found.');
        if (this.hasOpenBill(data, table.id)) {
          throw new ApiError('CONFLICT', `${table.name} has a running or held bill. Remove it after the bill is closed.`);
        }
        if (this.tableIsUsed(data, table.id)) {
          // Old bills keep showing the table's name, so the row stays (archived, hidden everywhere else).
          Object.assign(table, { archivedAt: nowIso(), isActive: false, cleaning: false });
          return 'ARCHIVED' as const;
        }
        data.tables = data.tables.filter((t) => t.id !== table.id);
        return 'DELETED' as const;
      }),
    );
  }

  /** Names already used in the area (removed tables free their name). */
  private tableNamesIn(data: DemoData, areaId: string, exceptId: string | null): string[] {
    return data.tables.filter((t) => t.areaId === areaId && t.archivedAt === null && t.id !== exceptId).map((t) => t.name);
  }

  private lastSortIn(data: DemoData, areaId: string, exceptId: string | null): number {
    return Math.max(0, ...data.tables.filter((t) => t.areaId === areaId && t.archivedAt === null && t.id !== exceptId).map((t) => t.sort));
  }

  /** Display order inside the table's area (removed tables are left out). */
  private placeTable(data: DemoData, tableId: string, position: number): void {
    const table = data.tables.find((t) => t.id === tableId);
    if (!table) return;
    const inArea = data.tables.filter((t) => t.areaId === table.areaId && t.archivedAt === null);
    const sorts = new Map(placeAt(inArea, tableId, position).map((t) => [t.id, t.sort]));
    for (const t of data.tables) t.sort = sorts.get(t.id) ?? t.sort;
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
        if (!worksOnTable(user, input.tableId)) throw new ApiError('NOT_FOUND', 'Table not found.');
        const table = this.usableTable(data, input.tableId);

        const now = nowIso();
        let order = data.orders.find((o) => o.tableId === table.id && OPEN_DINE_IN.includes(o.status));
        if (!order) {
          // New guests sit down: the table is no longer waiting for cleaning.
          table.cleaning = false;
          const { date, dailyNumber } = nextDailyNumber(data);
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
            trackingToken: null,
            cashSettlementId: null,
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

        if (input.customerName?.trim()) order.customerName = input.customerName.trim();
        if (input.customerPhone?.trim()) order.customerPhone = input.customerPhone.trim();
        const target = order;
        const roundNo = Math.max(0, ...target.items.map((i) => i.roundNo)) + 1;
        const lines = input.items.map((draft) => this.priceDraft(data, draft, target, roundNo));
        addKitchenTickets(data, target, lines, roundNo, now);
        target.items.push(...lines);
        recalculate(target, data.branch);
        if (input.discount) this.giveDiscount(data, this.require(data, 'order.discount'), target, input.discount);
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

  callWaiter(tableId: string | null): Promise<{ tableName: string | null; waiterNames: string[] }> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'bill.accept');
        const table = tableId ? data.tables.find((t) => t.id === tableId && t.isActive) : null;
        if (tableId && !table) throw new ApiError('NOT_FOUND', 'Table not found.');
        const waiters = this.waitersCalledFor(data, table?.id ?? null);
        if (waiters.length === 0) throw new ApiError('VALIDATION', table ? `No waiter works on ${table.name}.` : 'No waiter is on duty.');
        const now = nowIso();
        // A double tap within 10 seconds is one call.
        const recent = data.waiterCalls.find((c) => c.tableId === (table?.id ?? null) && Date.parse(now) - Date.parse(c.calledAt) < 10_000);
        if (!recent) {
          data.waiterCalls.push({ id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, tableId: table?.id ?? null, calledBy: user.id, calledAt: now });
        }
        return { tableName: table?.name ?? null, waiterNames: waiters.map((w) => w.name) };
      }),
    );
  }

  /**
   * Who a call goes to: without a table (counter customer) every waiter on duty; for a table its
   * Service Waiters, or without one the Super Waiter of its order (or of the table).
   */
  private waitersCalledFor(data: DemoData, tableId: string | null): StaffUser[] {
    const active = data.staff.filter((s) => s.isActive);
    if (tableId === null) return active.filter((s) => s.role === 'WAITER' || s.role === 'SERVICE_WAITER');
    const service = active.filter((s) => s.role === 'SERVICE_WAITER' && worksOnTable(s, tableId));
    if (service.length > 0) return service;
    const order = data.orders.find((o) => o.tableId === tableId && OPEN_DINE_IN.includes(o.status));
    const orderWaiter = active.find((s) => s.id === order?.waiterId && s.role === 'WAITER');
    return orderWaiter ? [orderWaiter] : active.filter((s) => s.role === 'WAITER' && worksOnTable(s, tableId));
  }

  printPreBill(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'bill.accept');
        const order = this.findOrder(data, orderId);
        if (order.type !== 'DINE_IN') {
          // Takeaway / delivery: a pre-bill does not change the order status.
          if (['REJECTED', 'CANCELLED'].includes(order.status)) throw new ApiError('CONFLICT', 'This order is closed.');
          return order;
        }
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
        const payable = order.type === 'DINE_IN' ? OPEN_DINE_IN.includes(order.status) : !['REJECTED', 'CANCELLED', 'PLACED'].includes(order.status);
        if (!payable) throw new ApiError('CONFLICT', 'This bill is already closed.');
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
          // Dine-in closes as PAID; delivery and takeaway keep their own status (paid before or after).
          if (order.type === 'DINE_IN') {
            const paid = checkTransition({ type: order.type, from: order.status, to: 'PAID', role: user.role, isFullyPaid: true });
            if (!paid.ok) throw ruleError(paid.reason);
            setStatus(order, 'PAID', user.id);
          }
          giveInvoiceNumber(data, order);
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
        if (order.invoiceNumber === null) throw new ApiError('CONFLICT', 'The receipt is printed after payment.');
        order.receiptPrints += 1;
        return order;
      }),
    );
  }

  applyDiscount(orderId: string, discount: DiscountInput | null, reason: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.discount');
        const order = this.findOrder(data, orderId);
        const open = order.type === 'DINE_IN' ? OPEN_DINE_IN.includes(order.status) : !['REJECTED', 'CANCELLED'].includes(order.status);
        if (!open || isFullyPaid(order.totals.total, order.paidTotal) && order.paidTotal > 0) {
          throw new ApiError('CONFLICT', 'This bill is already paid or closed.');
        }
        if (discount) this.giveDiscount(data, user, order, { input: discount, reason });
        else {
          order.discount = null;
          recalculate(order, data.branch);
          order.history.push({ fromStatus: order.status, toStatus: order.status, changedBy: user.id, reason: 'Discount removed', changedAt: nowIso() });
        }
        return order;
      }),
    );
  }

  /** Owner/Manager discount with a reason; recalculates the bill and writes a history row. */
  private giveDiscount(data: DemoData, user: StaffUser, order: Order, choice: DiscountChoice): void {
    const reason = choice.reason.trim();
    if (!reason) throw ruleError('REASON_REQUIRED');
    order.discount = { input: choice.input, reason, givenBy: user.id };
    try {
      recalculate(order, data.branch);
    } catch (err) {
      throw new ApiError('VALIDATION', err instanceof Error ? err.message : 'Invalid discount.');
    }
    if (order.totals.total < order.paidTotal) throw new ApiError('VALIDATION', 'The discount is more than what is still due.');
    order.history.push({ fromStatus: order.status, toStatus: order.status, changedBy: user.id, reason: `Discount: ${reason}`, changedAt: nowIso() });
  }

  listHeldBills(): Promise<HeldBill[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'table.order');
      return [...data.heldBills].sort((a, b) => a.heldAt.localeCompare(b.heldAt));
    });
  }

  holdBill(input: HeldBillInput): Promise<HeldBill> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'table.order');
        if (input.items.length === 0) throw new ApiError('VALIDATION', 'Add at least one item before holding the bill.');
        if (input.discount) this.require(data, 'order.discount');
        const existing = input.id ? data.heldBills.find((h) => h.id === input.id) : null;
        const fields = {
          type: input.type,
          tableId: input.type === 'DINE_IN' ? input.tableId : null,
          guests: input.guests,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone.trim(),
          customerAddress: input.customerAddress.trim(),
          note: input.note.trim(),
          items: input.items,
          discount: input.discount,
          heldBy: user.id,
          heldAt: nowIso(),
        };
        if (existing) {
          Object.assign(existing, fields);
          return existing;
        }
        const held: HeldBill = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, ...fields };
        data.heldBills.push(held);
        return held;
      }),
    );
  }

  deleteHeldBill(id: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'table.order');
        data.heldBills = data.heldBills.filter((h) => h.id !== id);
      }),
    );
  }

  searchCustomers(query: string): Promise<CustomerSummary[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'order.manage');
      const q = query.trim().toLowerCase();
      const digits = q.replace(/D/g, '');
      const byPhone = new Map<string, CustomerSummary>();
      for (const o of [...data.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        if (!o.customerPhone) continue;
        const known = byPhone.get(o.customerPhone);
        byPhone.set(o.customerPhone, {
          name: o.customerName ?? known?.name ?? '',
          phone: o.customerPhone,
          address: o.customerAddress ?? known?.address ?? '',
          orderCount: (known?.orderCount ?? 0) + 1,
          lastOrderAt: o.createdAt,
        });
      }
      return [...byPhone.values()]
        .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/D/g, '').includes(digits)))
        .sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt))
        .slice(0, 8);
    });
  }

  // ── Orders list, online, phone and takeaway orders ─────────────────────────────────────────

  private orderView(data: DemoData, order: Order): OrderView {
    const ids = new Set<string>();
    const add = (id: string | null | undefined) => id && ids.add(id);
    add(order.waiterId);
    add(order.riderId);
    add(order.createdBy);
    order.history.forEach((h) => add(h.changedBy));
    order.payments.forEach((p) => add(p.receivedBy));
    order.items.forEach((i) => add(i.voidedBy));
    add(order.billRequest?.requestedBy);
    add(order.billRequest?.acceptedBy);
    add(order.discount?.givenBy);
    const names: Record<string, string> = {};
    for (const id of ids) names[id] = this.staffName(data, id) ?? '';
    return { order, tableName: order.tableId ? this.tableName(data, order.tableId) : null, names };
  }

  listOrders(filter: OrderFilter): Promise<OrderView[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'order.manage');
      const today = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
      const query = filter.query.trim().toLowerCase().replace(/^#/, '');
      return data.orders
        .filter((o) => filter.scope === 'ALL' || o.businessDate === today)
        .filter((o) => !filter.type || o.type === filter.type)
        .filter((o) => !filter.status || o.status === filter.status)
        .filter((o) => {
          if (!query) return true;
          const table = o.tableId ? this.tableName(data, o.tableId).toLowerCase() : '';
          const digits = query.replace(/\D/g, '');
          return (
            String(o.dailyNumber) === query ||
            String(o.invoiceNumber ?? '') === query ||
            table === query ||
            table === `t${query}` ||
            (o.customerName ?? '').toLowerCase().includes(query) ||
            // A phone search needs at least 4 digits, so "1" finds order #1, not every phone with a 1.
            (digits.length >= 4 && (o.customerPhone ?? '').replace(/\D/g, '').includes(digits))
          );
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => this.orderView(data, o));
    });
  }

  getOrderView(orderId: string): Promise<OrderView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'order.manage');
      return this.orderView(data, this.findOrder(data, orderId));
    });
  }

  listCounterOrders(): Promise<OrderView[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'order.manage');
      const today = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
      return data.orders
        .filter((o) => o.type !== 'DINE_IN' && (!CLOSED.includes(o.status) || o.businessDate === today))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((o) => this.orderView(data, o));
    });
  }

  findCustomer(phone: string): Promise<{ name: string; address: string } | null> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'order.manage');
      const last = [...data.orders]
        .filter((o) => o.customerPhone === phone.trim())
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return last ? { name: last.customerName ?? '', address: last.customerAddress ?? '' } : null;
    });
  }

  /** A new delivery or takeaway order record (no tickets yet). */
  private newCounterOrder(
    data: DemoData,
    fields: Pick<Order, 'type' | 'channel' | 'status' | 'customerName' | 'customerPhone' | 'customerAddress' | 'note'>,
    createdBy: string | null,
  ): Order {
    const { date, dailyNumber } = nextDailyNumber(data);
    const now = nowIso();
    const order: Order = {
      id: newId(),
      restaurantId: data.restaurant.id,
      branchId: data.branch.id,
      ...fields,
      businessDate: date,
      dailyNumber,
      invoiceNumber: null,
      tableId: null,
      waiterId: null,
      guests: null,
      riderId: null,
      prepMinutes: fields.status === 'ACCEPTED' ? data.branch.defaultPrepMinutes : null,
      items: [],
      tickets: [],
      payments: [],
      discount: null,
      totals: calculateBill({ orderType: fields.type, lines: [], settings: { tax: data.branch.tax, serviceChargeBps: 0, roundToRupee: false } }),
      paidTotal: 0,
      refundedTotal: 0,
      tipTotal: 0,
      billRequest: null,
      trackingToken: trackingToken(),
      cashSettlementId: null,
      receiptPrints: 0,
      history: [
        {
          fromStatus: null,
          toStatus: fields.status,
          changedBy: createdBy,
          reason: fields.channel === 'CUSTOMER_APP' ? 'Placed by the customer (DEMO)' : null,
          changedAt: now,
        },
      ],
      createdBy,
      createdAt: now,
    };
    return order;
  }

  createCounterOrder(input: CounterOrderInput): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.manage');
        const repeated = data.idempotency[input.idempotencyKey];
        if (repeated) return this.findOrder(data, repeated);
        if (input.items.length === 0) throw new ApiError('VALIDATION', 'Add at least one item.');
        // A counter sale (takeaway) needs no customer; a delivery needs name, phone and address.
        const name = input.customerName.trim();
        const phone = input.customerPhone.trim();
        const walkIn = input.type === 'TAKEAWAY';
        if ((!walkIn || name) && name.length < 2) throw new ApiError('VALIDATION', 'Enter the customer name.');
        if ((!walkIn || phone) && !PHONE_PATTERN.test(phone)) throw new ApiError('VALIDATION', 'Phone must look like 0300-1234567.');
        if (input.type === 'DELIVERY' && input.customerAddress.trim().length < 5) {
          throw new ApiError('VALIDATION', 'Enter the delivery address.');
        }
        const order = this.newCounterOrder(
          data,
          {
            type: input.type,
            channel: input.channel,
            status: initialStatus(input.type, input.channel),
            customerName: name || null,
            customerPhone: phone || null,
            customerAddress: input.type === 'DELIVERY' ? input.customerAddress.trim() : null,
            note: input.note.trim().slice(0, 200),
          },
          user.id,
        );
        const lines = input.items.map((draft) => this.priceDraft(data, draft, order, 1));
        addKitchenTickets(data, order, lines, 1, order.createdAt);
        order.items.push(...lines);
        recalculate(order, data.branch);
        applyAutomaticSteps(order);
        data.orders.push(order);
        if (input.discount) this.giveDiscount(data, this.require(data, 'order.discount'), order, input.discount);
        data.idempotency[input.idempotencyKey] = order.id;
        return order;
      }),
    );
  }

  acceptOnlineOrder(orderId: string, prepMinutes: number): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.manage');
        const order = this.findOrder(data, orderId);
        if (order.status !== 'PLACED') return order; // already answered (double tap)
        if (!Number.isInteger(prepMinutes) || prepMinutes < 5 || prepMinutes > 180) {
          throw new ApiError('VALIDATION', 'Prep time must be between 5 and 180 minutes.');
        }
        const check = checkTransition({ type: order.type, from: 'PLACED', to: 'ACCEPTED', role: user.role });
        if (!check.ok) throw ruleError(check.reason);
        setStatus(order, 'ACCEPTED', user.id, `Prep time ${prepMinutes} min`);
        order.prepMinutes = prepMinutes;
        addKitchenTickets(data, order, order.items, 1, nowIso());
        applyAutomaticSteps(order);
        return order;
      }),
    );
  }

  rejectOnlineOrder(orderId: string, reason: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.manage');
        const order = this.findOrder(data, orderId);
        if (order.status === 'REJECTED') return order;
        const check = checkTransition({ type: order.type, from: order.status, to: 'REJECTED', role: user.role, reason });
        if (!check.ok) throw ruleError(check.reason);
        setStatus(order, 'REJECTED', user.id, reason.trim());
        return order;
      }),
    );
  }

  cancelOrder(orderId: string, reason: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.cancel');
        const order = this.findOrder(data, orderId);
        if (order.status === 'CANCELLED') return order;
        const check = checkTransition({
          type: order.type,
          from: order.status,
          to: 'CANCELLED',
          role: user.role,
          reason,
          hasPayments: order.payments.length > 0,
        });
        if (!check.ok) throw ruleError(check.reason);
        setStatus(order, 'CANCELLED', user.id, reason.trim());
        return order;
      }),
    );
  }

  assignRider(orderId: string, riderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.manage');
        const order = this.findOrder(data, orderId);
        const rider = data.staff.find((s) => s.id === riderId && s.role === 'RIDER' && s.isActive);
        if (!rider) throw new ApiError('VALIDATION', 'Choose an active rider.');
        if (order.status === 'RIDER_ASSIGNED') {
          // Change rider before pickup.
          if (order.riderId !== rider.id) {
            order.history.push({
              fromStatus: order.status,
              toStatus: order.status,
              changedBy: user.id,
              reason: `Rider changed to ${rider.name}`,
              changedAt: nowIso(),
            });
            order.riderId = rider.id;
          }
          return order;
        }
        const check = checkTransition({ type: order.type, from: order.status, to: 'RIDER_ASSIGNED', role: user.role, riderId });
        if (!check.ok) throw ruleError(check.reason);
        order.riderId = rider.id;
        setStatus(order, 'RIDER_ASSIGNED', user.id, rider.name);
        return order;
      }),
    );
  }

  markPickedUp(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'order.manage');
        const order = this.findOrder(data, orderId);
        if (order.status === 'PICKED_UP') return order;
        const check = checkTransition({ type: order.type, from: order.status, to: 'PICKED_UP', role: user.role });
        if (!check.ok) throw ruleError(check.reason);
        setStatus(order, 'PICKED_UP', user.id);
        return order;
      }),
    );
  }

  /** Cash on delivery a rider collected and has not handed over yet. */
  private riderCashOrders(data: DemoData, riderId: string): Order[] {
    return data.orders.filter(
      (o) =>
        o.riderId === riderId &&
        o.status === 'DELIVERED' &&
        o.cashSettlementId === null &&
        o.payments.some((p) => p.method === 'CASH' && p.receivedBy === riderId),
    );
  }

  private riderCashAmount(orders: Order[], riderId: string): number {
    return orders
      .flatMap((o) => o.payments)
      .filter((p) => p.kind === 'PAYMENT' && p.method === 'CASH' && p.receivedBy === riderId)
      .reduce((sum, p) => sum + p.amount + p.tipAmount, 0);
  }

  listRiderCash(): Promise<RiderCashView[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'riderCash.settle');
      return data.staff
        .filter((s) => s.role === 'RIDER' && s.isActive)
        .map((rider) => {
          const unsettled = this.riderCashOrders(data, rider.id);
          return {
            rider,
            activeDeliveries: data.orders.filter((o) => o.riderId === rider.id && ACTIVE_DELIVERY.includes(o.status)).length,
            cashToSettle: this.riderCashAmount(unsettled, rider.id),
            unsettledOrderIds: unsettled.map((o) => o.id),
          };
        });
    });
  }

  settleRiderCash(riderId: string, idempotencyKey: string): Promise<RiderCashSettlement> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'riderCash.settle');
        const repeated = data.riderSettlements.find((s) => s.id === data.idempotency[idempotencyKey]);
        if (repeated) return repeated;
        const orders = this.riderCashOrders(data, riderId);
        if (orders.length === 0) throw new ApiError('VALIDATION', 'This rider has no cash to settle.');
        const settlement: RiderCashSettlement = {
          id: newId(),
          restaurantId: data.restaurant.id,
          branchId: data.branch.id,
          riderId,
          amount: this.riderCashAmount(orders, riderId),
          orderIds: orders.map((o) => o.id),
          settledBy: user.id,
          settledAt: nowIso(),
        };
        orders.forEach((o) => (o.cashSettlementId = settlement.id));
        data.riderSettlements.push(settlement);
        data.idempotency[idempotencyKey] = settlement.id;
        return settlement;
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

        applyAutomaticSteps(order);
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
      if (can(user.role, 'order.manage')) {
        for (const order of data.orders) {
          if (order.type === 'DINE_IN') continue;
          const base = { orderId: order.id, dailyNumber: order.dailyNumber, orderType: order.type, customerName: order.customerName ?? '' };
          if (order.status === 'PLACED') {
            list.push({ kind: 'ONLINE_ORDER', id: `online:${order.id}`, total: order.totals.total, at: order.createdAt, ...base });
          }
          if (order.status === 'READY') {
            const readyAt = order.history.findLast((h) => h.toStatus === 'READY')?.changedAt ?? order.createdAt;
            list.push({ kind: 'COUNTER_READY', id: `counter-ready:${order.id}:${readyAt}`, at: readyAt, ...base });
          }
        }
      }
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
      // "Call Waiter" from the POS: shown to the called waiters for 15 minutes.
      const since = Date.now() - 15 * 60_000;
      for (const call of data.waiterCalls) {
        if (Date.parse(call.calledAt) < since) continue;
        if (!this.waitersCalledFor(data, call.tableId).some((w) => w.id === user.id)) continue;
        list.push({
          kind: 'WAITER_CALLED',
          id: `call:${call.id}`,
          tableId: call.tableId,
          tableName: call.tableId ? this.tableName(data, call.tableId) : null,
          calledByName: this.staffName(data, call.calledBy) ?? '',
          at: call.calledAt,
        });
      }
      return list.sort((a, b) => a.at.localeCompare(b.at));
    });
  }

  // ── Staff (Owner only; Manager may look) ───────────────────────────────────────────────────

  listStaff(): Promise<StaffMember[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'staff.view');
      const now = Date.now();
      return [...data.staff]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((user) => {
          const latest = data.invites.filter((i) => i.userId === user.id).at(-1);
          return {
            user,
            invite: latest
              ? {
                  kind: latest.kind,
                  status: inviteStatus(latest.state, Date.parse(latest.expiresAt), now),
                  sentAt: latest.sentAt,
                  expiresAt: latest.expiresAt,
                }
              : null,
          };
        });
    });
  }

  saveStaff(input: StaffInput): Promise<{ user: StaffUser; link: StaffLink | null }> {
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
        if (existing && removesLastOwner(data.staff, existing.id, { role: input.role, isActive: existing.isActive })) {
          throw new ApiError('CONFLICT', 'The restaurant needs at least one active Owner.');
        }
        const name = input.name.trim();
        if (name.length < 2) throw new ApiError('VALIDATION', 'Enter the full name.');
        if (!PHONE_PATTERN.test(input.phone.trim())) throw new ApiError('VALIDATION', 'Phone must look like 0300-1234567.');
        if (data.staff.some((s) => s.phone === input.phone.trim() && s.id !== input.id)) {
          throw new ApiError('VALIDATION', 'Another staff member already uses this phone number.');
        }
        const email = input.email.trim().toLowerCase() || null;
        if (email && !isValidEmail(email)) throw new ApiError('VALIDATION', 'Email must look like name@example.com.');
        if (email && data.staff.some((s) => s.email === email && s.id !== input.id)) {
          throw new ApiError('VALIDATION', 'Another staff member already uses this email.');
        }
        // The Owner works in all branches; everyone else belongs to one branch of this restaurant.
        const branchId = input.role === 'OWNER' ? null : input.branchId;
        if (input.role !== 'OWNER' && branchId !== data.branch.id) throw new ApiError('VALIDATION', 'Choose a branch.');
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
          email,
          branchId,
          role: input.role,
          stationIds: input.role === 'KITCHEN' ? input.stationIds : [],
          tableIds: isWaiter ? input.tableIds : [],
        };
        if (existing) {
          // A new role applies at once: the person's open sessions end and they log in again.
          if (existing.role !== input.role) this.endSessions(data, existing.id);
          Object.assign(existing, fields);
          return { user: existing, link: null };
        }
        const created: StaffUser = {
          id: newId(),
          restaurantId: data.restaurant.id,
          isActive: true,
          activatedAt: null,
          ...fields,
        };
        data.staff.push(created);
        return { user: created, link: this.newInvite(data, created.id, 'ACTIVATION') };
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
        if (removesLastOwner(data.staff, target.id, { role: target.role, isActive: active })) {
          throw new ApiError('CONFLICT', 'The restaurant needs at least one active Owner.');
        }
        target.isActive = active;
        // Disable: every open session ends now. Enable: old sessions stay ended, so a fresh login is needed.
        this.endSessions(data, target.id);
        return target;
      }),
    );
  }

  resendInvite(userId: string): Promise<StaffLink> {
    return this.request(() =>
      this.store.update((data) => {
        const target = this.manageableStaff(data, userId);
        const kind = data.invites.filter((i) => i.userId === target.id).at(-1)?.kind ?? 'ACTIVATION';
        if (target.activatedAt) throw new ApiError('CONFLICT', `${target.name} is already activated.`);
        return this.newInvite(data, target.id, kind);
      }),
    );
  }

  revokeInvite(userId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const target = this.manageableStaff(data, userId);
        for (const invite of data.invites) if (invite.userId === target.id && invite.state === 'PENDING') invite.state = 'REVOKED';
      }),
    );
  }

  resetStaffPin(userId: string): Promise<StaffLink> {
    return this.request(() =>
      this.store.update((data) => {
        const target = this.manageableStaff(data, userId);
        if (!target.activatedAt) {
          throw new ApiError('CONFLICT', `${target.name} has no PIN yet. Use Resend link instead.`);
        }
        // The old PIN stops working and every session ends until the person sets a new PIN.
        target.activatedAt = null;
        this.endSessions(data, target.id);
        return this.newInvite(data, target.id, 'PIN_RESET');
      }),
    );
  }

  getActivation(token: string): Promise<ActivationInfo> {
    return this.request(() => {
      const data = this.store.read();
      const { invite, user } = this.openInvite(data, token);
      return { kind: invite.kind, name: user.name, role: user.role, restaurantName: data.restaurant.name };
    });
  }

  activateAccount(token: string, pin: string, confirmPin: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const { invite, user } = this.openInvite(data, token);
        const problem = checkPin(pin, confirmPin);
        if (problem) throw new ApiError('VALIDATION', PIN_MESSAGES[problem]);
        // DEMO: the PIN is checked and then thrown away — it is never stored in the browser. The server
        // (Phase 4) keeps only a slow hash of it and unlocks only on an enrolled device.
        invite.state = 'USED';
        user.activatedAt = nowIso();
        this.endSessions(data, user.id);
      }),
    );
  }

  /** The Owner may act on this account (the server checks the same). */
  private manageableStaff(data: DemoData, userId: string): StaffUser {
    const actor = this.require(data, 'staff.manage');
    const target = data.staff.find((s) => s.id === userId);
    if (!target) throw new ApiError('NOT_FOUND', 'Staff member not found.');
    if (!canManageStaffAccount(actor.role, target.role)) throw new ApiError('FORBIDDEN', 'You cannot change this account.');
    if (!target.isActive) throw new ApiError('CONFLICT', `${target.name} is disabled. Enable the account first.`);
    return target;
  }

  /** A new single-use link; any older pending link of the person stops working. */
  private newInvite(data: DemoData, userId: string, kind: InviteKind): StaffLink {
    for (const invite of data.invites) if (invite.userId === userId && invite.state === 'PENDING') invite.state = 'REVOKED';
    const sent = Date.now();
    const invite: DemoInvite = {
      userId,
      kind,
      token: trackingToken(),
      state: 'PENDING',
      sentAt: new Date(sent).toISOString(),
      expiresAt: new Date(inviteExpiresAt(sent)).toISOString(),
    };
    data.invites.push(invite);
    return { token: invite.token, kind, expiresAt: invite.expiresAt };
  }

  private openInvite(data: DemoData, token: string): { invite: DemoInvite; user: StaffUser } {
    const invite = data.invites.find((i) => i.token === token);
    const user = data.staff.find((s) => s.id === invite?.userId);
    if (!invite || !user) throw new ApiError('NOT_FOUND', 'This link is not valid. Ask the Owner for a new link.');
    const status = inviteStatus(invite.state, Date.parse(invite.expiresAt), Date.now());
    if (status === 'USED') throw new ApiError('CONFLICT', 'This link was already used. Each link works only once.');
    if (status === 'REVOKED') throw new ApiError('CONFLICT', 'This link was cancelled. Ask the Owner for a new link.');
    if (status === 'EXPIRED') throw new ApiError('CONFLICT', 'This link has expired. Ask the Owner for a new link.');
    if (!user.isActive) throw new ApiError('FORBIDDEN', 'This account is disabled.');
    return { invite, user };
  }

  /** DEMO stand-in for the server's token_version: every open session of the person ends. */
  private endSessions(data: DemoData, userId: string): void {
    data.sessionVersions[userId] = (data.sessionVersions[userId] ?? 0) + 1;
  }

  // ── DEMO controls ──────────────────────────────────────────────────────────────────────────

  listLoginAccounts(): StaffUser[] {
    // Riders use the separate Rider App (Phase 3), never Restaurant OS.
    // Only activated accounts can log in; an invited person first opens their activation link.
    return this.store.read().staff.filter((s) => s.isActive && s.activatedAt && canUseApp(s.role, 'restaurant-os'));
  }

  demoLogin(userId: string): void {
    this.store.setSession(userId, this.store.read().sessionVersions[userId] ?? 0);
  }

  simulateCustomerOrder(type: 'DELIVERY' | 'TAKEAWAY'): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        // The server refuses checkout while online orders are OFF (MASTER_PROMPT.md §5.5).
        if (!data.branch.onlineOrdersEnabled) throw new ApiError('CONFLICT', 'Not taking online orders right now.');
        const count = data.orders.filter((o) => o.channel === 'CUSTOMER_APP').length;
        const customer = DEMO_CUSTOMERS[count % DEMO_CUSTOMERS.length] ?? DEMO_CUSTOMERS[0]!;
        const order = this.newCounterOrder(
          data,
          {
            type,
            channel: 'CUSTOMER_APP',
            status: 'PLACED',
            customerName: `${customer.name} (DEMO)`,
            customerPhone: customer.phone,
            customerAddress: type === 'DELIVERY' ? customer.address : null,
            note: '',
          },
          null,
        );
        const item = (name: string) => data.items.find((i) => i.name === name);
        const pizza = item('Classic Pizza');
        const medium = pizza?.variants.find((v) => v.name === 'Medium');
        const drafts: DraftItemInput[] = [
          // Test D: Classic Pizza + Cold Drink, Cash on Delivery.
          { menuItemId: pizza?.id ?? '', variantId: medium?.id ?? null, modifierIds: [], note: '', quantity: 1 },
          { menuItemId: item('Cold Drink')?.id ?? '', variantId: null, modifierIds: [], note: '', quantity: 1 },
        ];
        if (count % 2 === 1) drafts.push({ menuItemId: item('Zinger Burger')?.id ?? '', variantId: null, modifierIds: [], note: 'No mayo', quantity: 2 });
        order.items.push(...drafts.map((draft) => this.priceDraft(data, draft, order, 1)));
        recalculate(order, data.branch);
        data.orders.push(order);
        return order;
      }),
    );
  }

  simulateRiderStep(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const order = this.findOrder(data, orderId);
        const riderId = order.riderId;
        if (!riderId) throw new ApiError('CONFLICT', 'No rider is assigned.');
        const to: OrderStatus = order.status === 'RIDER_ASSIGNED' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
        const check = checkTransition({ type: order.type, from: order.status, to, role: 'RIDER', isAssignedRider: true });
        if (!check.ok) throw ruleError(check.reason);
        setStatus(order, to, riderId, 'Rider App (DEMO)');
        if (to === 'DELIVERED') {
          // Cash on Delivery: the rider confirms the cash collected; the cashier settles it later.
          const due = amountDue(order.totals.total, order.paidTotal);
          if (due > 0) {
            order.payments.push({
              id: newId(),
              restaurantId: order.restaurantId,
              branchId: order.branchId,
              orderId: order.id,
              kind: 'PAYMENT',
              method: 'CASH',
              amount: due,
              tipAmount: 0,
              cashReceived: due,
              changeGiven: 0,
              reference: 'Cash on Delivery',
              receivedBy: riderId,
              relatedPaymentId: null,
              reason: null,
              createdAt: nowIso(),
            });
            recalculate(order, data.branch);
            giveInvoiceNumber(data, order);
          }
        }
        return order;
      }),
    );
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

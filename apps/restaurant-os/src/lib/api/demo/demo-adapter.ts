import {
  MAX_BULK_TABLES,
  MAX_NAME_LENGTH,
  MAX_QUANTITY_PER_LINE,
  MAX_TABLE_SEATS,
  PIN_LENGTH,
  RIDER_ASSIGN_MESSAGES,
  RIDER_BUSY_MESSAGE,
  RIDER_DISABLE_MESSAGE,
  amountDue,
  automaticOrderSteps,
  businessDate,
  calculateBill,
  checkTablePayment,
  MAX_OPEN_SUB_ORDERS,
  nextSubOrderNo,
  openStatusOfTable,
  orderPlaceName,
  canDisableRider,
  canManageStaffAccount,
  canRiderGoOffline,
  checkPin,
  isRiderOnline,
  riderAssignBlock,
  riderDeliveryFromOrder,
  canPublishWebsite,
  checkOnlineSettings,
  publishedWebsite,
  checkWebsiteConfig,
  normalizeDomain,
  withWebsiteChanges,
  MAX_DEALS,
  MAX_POPULAR_ITEMS,
  MAX_SEO_DESCRIPTION,
  MAX_SEO_TITLE,
  type WebsiteConfig,
  type WebsiteProblem,
  customerAppPath,
  formatPaisa,
  summarizeDay,
  checkPaymentCorrection,
  checkRefund,
  checkBranchSettings,
  checkStation,
  MAX_TAX_PERCENT,
  MAX_SERVICE_PERCENT,
  MAX_PREP_MINUTES,
  MAX_RECEIPT_TEXT,
  MAX_STATION_MINUTES,
  checkAddonGroup,
  checkMenuItem,
  MENU_UNITS,
  MAX_SIZES,
  MAX_ADDONS_PER_GROUP,
  MAX_DESCRIPTION_LENGTH,
  cleanPermissions,
  effectivePermissions,
  recommendedPermissions,
  samePermissions,
  EDITABLE_ROLES,
  inviteExpiresAt,
  inviteStatus,
  isValidEmail,
  normalizePhone,
  removesLastOwner,
  type ActivationInfo,
  type InviteKind,
  type PinProblem,
  type OnlineAppView,
  type WebsitePreviewData,
  type CustomerLinkOrder,
  type CustomerLinkPlaced,
  type CustomerLinkStatus,
  type DaySummaryView,
  type OrderPricing,
  type SettingsView,
  type KitchenStation,
  type ItemVariant,
  type MenuCategory,
  type MenuCheck,
  type MenuItem,
  type MenuProblem,
  type MenuSetup,
  type ModifierGroup,
  type RolePermissionsEntry,
  type StaffRole,
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
  type RiderAccount,
  type RiderCashView,
  type RiderLinkCommand,
  type RiderLinkData,
  type RiderOverview,
  type StaffNotification,
  type StaffUser,
  type TicketStatus,
  type TicketTransitionFailure,
  type TransitionFailure,
  checkAdjustment,
  checkIngredient,
  cleanIngredientName,
  expiryState,
  onHandOf,
  stockStatus,
  stockValueOf,
  summarizeInventory,
  type Ingredient,
  type InventoryView,
} from '@restaurant-saas/shared';
import {
  ApiError,
  type ApiClient,
  type AddonGroupInput,
  type SettingsInput,
  type StationInput,
  type AreaInput,
  type MenuItemInput,
  type BulkTablesInput,
  type CorrectPaymentInput,
  type CounterOrderInput,
  type DemoControls,
  type HeldBillInput,
  type OrderFilter,
  type RecordPaymentInput,
  type RecordTablePaymentInput,
  type RefundInput,
  type SendRoundInput,
  type Session,
  type StaffInput,
  type StaffLink,
  type TableInput,
  type IngredientInput,
  type StockAdjustInput,
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

function wait(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();
const riderAccount = (rider: StaffUser): RiderAccount => ({
  id: rider.id,
  name: rider.name,
  phone: rider.phone,
  isActive: rider.isActive,
  activatedAt: rider.activatedAt,
  riderOnline: isRiderOnline(rider),
});

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

const PHONE_MESSAGE = 'Enter a mobile number, for example 0300-1234567 or 03001234567.';

const WEBSITE_MESSAGES: Record<WebsiteProblem, string> = {
  LOGO_REQUIRED: 'Enter the logo letters.',
  TEXT_TOO_LONG: 'A text is too long: logo letters up to 4, short name up to 12, tagline and big line up to 60, description up to 300.',
  COLOR_INVALID: 'Choose both colours.',
  PRIMARY_TOO_LIGHT: 'The main colour is too light: white text on it could not be read.',
  ACCENT_TOO_DARK: 'The second colour is too dark: dark text on it could not be read.',
  TOO_MANY_POPULAR: `Choose at most ${MAX_POPULAR_ITEMS} popular dishes.`,
  TOO_MANY_DEALS: `Keep at most ${MAX_DEALS} deals.`,
  DEAL_TAG_REQUIRED: 'Give each deal a short label, up to 24 letters.',
  MODES_REQUIRED: 'Keep at least one way to order. To stop all orders, switch online orders OFF.',
  HOURS_INVALID: 'Check the opening hours: opening and closing time must differ.',
  WHATSAPP_INVALID: 'Enter the WhatsApp number as a mobile number, for example 0300-1234567.',
  EMAIL_INVALID: 'Check the email address.',
  LINK_INVALID: 'Social links must start with https://',
  SEO_TOO_LONG: `Search title up to ${MAX_SEO_TITLE} letters, description up to ${MAX_SEO_DESCRIPTION}.`,
};

const SETTINGS_MESSAGES = {
  NAME_REQUIRED: 'Enter the restaurant and branch names.',
  NAME_TOO_LONG: `Names can have at most ${MAX_NAME_LENGTH} letters.`,
  PHONE_INVALID: 'Enter a mobile number, for example 0300-1234567 or 03001234567.',
  ADDRESS_REQUIRED: 'Enter the branch address.',
  PERCENT_INVALID: `Tax must be 0–${MAX_TAX_PERCENT} % and service charge 0–${MAX_SERVICE_PERCENT} %.`,
  MONEY_INVALID: 'Enter the delivery fee and minimum order in rupees (0 is fine).',
  MINUTES_INVALID: `Preparation time must be 1–${MAX_PREP_MINUTES} minutes.`,
  DAY_START_INVALID: 'The business day start must look like 06:00.',
  TEXT_TOO_LONG: `Receipt texts can have at most ${MAX_RECEIPT_TEXT} letters.`,
  STATION_TIMES: `"Late" must be after "warn": 1 ≤ warn < late ≤ ${MAX_STATION_MINUTES} minutes.`,
} as const;

/** Menu setup mistakes; `where` is the category name for items, or 'category' / 'group'. */
function menuMessage(check: NonNullable<MenuCheck>, name: string, where: string): string {
  const detail = check.detail ?? name;
  switch (check.problem) {
    case 'NAME_REQUIRED':
      return 'Enter a name.';
    case 'NAME_TOO_LONG':
      return `Names can have at most ${MAX_NAME_LENGTH} letters.`;
    case 'NAME_TAKEN':
      return where === 'category'
        ? `A category called ${name} already exists.`
        : where === 'group'
          ? `An add-on group called ${name} already exists.`
          : `${where} already has an item called ${name}.`;
    case 'PRICE_INVALID':
      return check.detail ? `Enter a price for ${detail}.` : 'Enter a price above Rs. 0.';
    case 'DESCRIPTION_TOO_LONG':
      return `The description can have at most ${MAX_DESCRIPTION_LENGTH} letters.`;
    case 'SIZE_NAME_REQUIRED':
      return 'Every size needs a name (for example Small).';
    case 'SIZE_NAME_TAKEN':
      return `The size ${detail} is there twice.`;
    case 'TOO_MANY_SIZES':
      return `At most ${MAX_SIZES} sizes.`;
    case 'ADDON_NAME_REQUIRED':
      return 'Every add-on needs a name.';
    case 'ADDON_NAME_TAKEN':
      return `The add-on ${detail} is there twice.`;
    case 'TOO_MANY_ADDONS':
      return `At most ${MAX_ADDONS_PER_GROUP} add-ons in one group.`;
    case 'GROUP_RULE_INVALID':
      return 'Check "choose at least / at most": at least 0, at most 1 or more, and not more than the number of add-ons.';
  }
}

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

/** The branch's bill settings now; a new order keeps them for life. */
function pricingOf(branch: Branch): OrderPricing {
  return { tax: branch.tax, serviceChargeBps: branch.serviceChargeBps, roundToRupee: branch.roundToRupee, deliveryFee: branch.deliveryFee };
}

/** Always with the order's own settings, so a Settings change never changes a running or old bill. */
function recalculate(order: Order): void {
  const { tax, serviceChargeBps, roundToRupee, deliveryFee } = order.pricing;
  order.totals = calculateBill({
    orderType: order.type,
    lines: order.items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity, isVoid: i.isVoid })),
    discount: order.discount?.input ?? null,
    deliveryFee,
    settings: { tax, serviceChargeBps, roundToRupee },
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
    if (!this.permissionsOf(data, user).includes(permission)) {
      throw new ApiError('FORBIDDEN', 'You do not have permission to do this.');
    }
    return user;
  }

  /** The person's own permissions, else their role's (as set by the Owner), else the recommended set. */
  private permissionsOf(data: DemoData, user: StaffUser): Permission[] {
    return effectivePermissions(user, data.rolePermissions, { managerCanSeeMoneyReports: data.branch.managerCanSeeMoneyReports });
  }

  private staffName(data: DemoData, id: string | null): string | null {
    return id ? (data.staff.find((s) => s.id === id)?.name ?? null) : null;
  }

  private tableName(data: DemoData, tableId: string | null): string {
    return data.tables.find((t) => t.id === tableId)?.name ?? '';
  }

  /** "T1", or "T1-2" on a table shared by several customers. */
  private orderPlace(data: DemoData, order: Order): string {
    return orderPlaceName(this.tableName(data, order.tableId), order);
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
      return user ? { user, restaurant: data.restaurant, branch: data.branch, permissions: this.permissionsOf(data, user) } : null;
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
            const orders = this.openTableOrders(data, table.id);
            const order = orders[0] ?? null;
            return {
              table,
              status: tableStatusFor(openStatusOfTable(orders), table),
              order,
              orders,
              nextSubOrderNo: this.nextSubOrderOn(data, table.id),
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
    return this.openTableOrders(data, tableId)[0] ?? null;
  }

  /** Everyone since the table was last empty counts, paid or not: no two customers of one sitting share a number. */
  private nextSubOrderOn(data: DemoData, tableId: string): number {
    const open = this.openTableOrders(data, tableId);
    const oldest = open.reduce((first, o) => (o.createdAt < first ? o.createdAt : first), open[0]?.createdAt ?? '');
    return nextSubOrderNo(open.length === 0 ? [] : data.orders.filter((o) => o.tableId === tableId && o.createdAt >= oldest));
  }

  private openTableOrders(data: DemoData, tableId: string): Order[] {
    return data.orders
      .filter((o) => o.tableId === tableId && OPEN_DINE_IN.includes(o.status))
      .sort((a, b) => (a.subOrderNo ?? 1) - (b.subOrderNo ?? 1));
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
      this.require(data, 'tables.manage');
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
            status: tableStatusFor(openStatusOfTable(this.openTableOrders(data, table.id)), table),
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
        this.require(data, 'tables.manage');
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
        this.require(data, 'tables.manage');
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
        this.require(data, 'tables.manage');
        if (!data.areas.some((a) => a.id === areaId)) throw new ApiError('NOT_FOUND', 'Area not found.');
        data.areas = placeAt(data.areas, areaId, position);
      }),
    );
  }

  saveTable(input: TableInput): Promise<DiningTable> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'tables.manage');
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
        this.require(data, 'tables.manage');
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
        this.require(data, 'tables.manage');
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
        this.require(data, 'tables.manage');
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
        // Removed items and items of hidden categories are not offered for ordering.
        items: data.items
          .filter((i) => !i.archivedAt && data.categories.some((c) => c.id === i.categoryId && c.isActive))
          .sort((a, b) => a.sort - b.sort),
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
        const open = this.openTableOrders(data, table.id);
        let order = input.newSubOrder ? undefined : input.orderId ? open.find((o) => o.id === input.orderId) : open[0];
        if (input.orderId && !order) throw new ApiError('CONFLICT', 'This sub-order is already closed. Choose another one or start a new one.');
        if (!order) {
          if (open.length >= MAX_OPEN_SUB_ORDERS) throw new ApiError('VALIDATION', `${table.name} already has ${MAX_OPEN_SUB_ORDERS} open sub-orders.`);
          const subOrderNo = this.nextSubOrderOn(data, table.id);
          for (const other of open) other.tableShared = true;
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
            subOrderNo,
            tableShared: open.length > 0,
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
            pricing: pricingOf(data.branch),
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
        if (input.customerPhone?.trim()) order.customerPhone = normalizePhone(input.customerPhone) ?? input.customerPhone.trim();
        const target = order;
        const roundNo = Math.max(0, ...target.items.map((i) => i.roundNo)) + 1;
        const lines = input.items.map((draft) => this.priceDraft(data, draft, target, roundNo));
        addKitchenTickets(data, target, lines, roundNo, now);
        target.items.push(...lines);
        recalculate(target);
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
    if (menuItem.archivedAt || !data.categories.some((c) => c.id === menuItem.categoryId && c.isActive)) {
      throw new ApiError('VALIDATION', `${menuItem.name} is no longer on the menu.`);
    }
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
        recalculate(order);
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
        this.takePayment(data, user, order, input);
        data.idempotency[input.idempotencyKey] = order.id;
        return order;
      }),
    );
  }

  recordTablePayment(input: RecordTablePaymentInput): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'payment.record');
        if (data.idempotency[input.idempotencyKey]) return;
        const owing = this.openTableOrders(data, input.tableId).filter((o) => amountDue(o.totals.total, o.paidTotal) > 0);
        const dues = owing.map((o) => amountDue(o.totals.total, o.paidTotal));
        const check = checkTablePayment(dues, input.method === 'CASH' ? input.cashReceived : null);
        if (!check.ok) throw new ApiError('VALIDATION', check.reason === 'NOTHING_DUE' ? 'Nothing is due on this table.' : 'Cash received is less than the payment and tip.');
        if (input.method === 'CASH' && input.cashReceived === null) throw new ApiError('VALIDATION', 'Enter the cash received.');
        owing.forEach((order, i) =>
          this.takePayment(data, user, order, {
            method: input.method,
            amount: dues[i] as number,
            tipAmount: 0,
            cashReceived: check.payments[i]?.cashReceived ?? null,
            reference: input.reference,
          }),
        );
        data.idempotency[input.idempotencyKey] = input.tableId;
      }),
    );
  }

  private takePayment(data: DemoData, user: StaffUser, order: Order, input: Pick<RecordPaymentInput, 'method' | 'amount' | 'tipAmount' | 'cashReceived' | 'reference'>): void {
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
        recalculate(order);
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

  /** A new entry only: the payment stays as it was and the order keeps its status (MASTER_PROMPT.md §8). */
  refundPayment(input: RefundInput): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'payment.refund');
        const repeated = data.idempotency[input.idempotencyKey];
        if (repeated) return this.findOrder(data, repeated);
        const order = this.findOrder(data, input.orderId);
        const check = checkRefund({ amount: input.amount, paidTotal: order.paidTotal, refundedTotal: order.refundedTotal, reason: input.reason });
        if (!check.ok) {
          throw new ApiError('VALIDATION', check.reason === 'REASON_REQUIRED' ? 'Write the reason for this refund.' : check.reason === 'MORE_THAN_PAID' ? 'This is more than can be refunded.' : 'Enter a valid amount.');
        }
        order.payments.push(this.moneyEntry(order, user.id, { kind: 'REFUND', method: input.method, amount: input.amount, reference: input.reference, reason: input.reason }));
        recalculate(order);
        data.idempotency[input.idempotencyKey] = order.id;
        return order;
      }),
    );
  }

  /** Reverses the wrong entry and adds the right one together: the money and the order status stay the same. */
  correctPayment(input: CorrectPaymentInput): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'payment.refund');
        const repeated = data.idempotency[input.idempotencyKey];
        if (repeated) return this.findOrder(data, repeated);
        const order = this.findOrder(data, input.orderId);
        const wrong = order.payments.find((p) => p.id === input.paymentId);
        if (!wrong) throw new ApiError('NOT_FOUND', 'This payment was not found.');
        const check = checkPaymentCorrection({ entry: wrong, entries: order.payments, method: input.method, riderId: order.riderId, reason: input.reason });
        if (!check.ok) {
          const messages = {
            NOT_A_PAYMENT: 'Only a payment can be corrected.',
            ALREADY_CORRECTED: 'This payment was already corrected.',
            RIDER_CASH: "A rider's cash on delivery cannot be corrected here. Use a refund if money must go back.",
            SAME_METHOD: 'Choose the method it should have been.',
            REASON_REQUIRED: 'Write the reason for this correction.',
          };
          throw new ApiError('VALIDATION', messages[check.reason]);
        }
        const same = { amount: wrong.amount, tipAmount: wrong.tipAmount, reason: input.reason };
        const reversal = this.moneyEntry(order, user.id, { ...same, kind: 'REVERSAL', method: wrong.method, relatedPaymentId: wrong.id });
        const right = this.moneyEntry(order, user.id, {
          ...same,
          kind: 'PAYMENT',
          method: input.method,
          reference: input.reference,
          relatedPaymentId: reversal.id,
          cashReceived: input.method === 'CASH' ? wrong.amount + wrong.tipAmount : null,
          changeGiven: input.method === 'CASH' ? 0 : null,
        });
        order.payments.push(reversal, right);
        recalculate(order);
        data.idempotency[input.idempotencyKey] = order.id;
        return order;
      }),
    );
  }

  private moneyEntry(order: Order, userId: string, entry: Pick<PaymentEntry, 'kind' | 'method' | 'amount'> & Partial<PaymentEntry>): PaymentEntry {
    return {
      id: newId(),
      restaurantId: order.restaurantId,
      branchId: order.branchId,
      orderId: order.id,
      tipAmount: 0,
      cashReceived: null,
      changeGiven: null,
      receivedBy: userId,
      relatedPaymentId: null,
      createdAt: nowIso(),
      ...entry,
      reference: entry.reference?.trim() || null,
      reason: entry.reason?.trim() || null,
    };
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
          recalculate(order);
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
      recalculate(order);
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
          customerPhone: normalizePhone(input.customerPhone) ?? input.customerPhone.trim(),
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
      const digits = q.replace(/\D/g, '');
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
        .filter((c) => !q || c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits)))
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
    return { order, tableName: order.tableId ? this.orderPlace(data, order) : null, names };
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
          const table = o.tableId ? this.orderPlace(data, o).toLowerCase() : '';
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
        .filter((o) => o.customerPhone === (normalizePhone(phone) ?? phone.trim()))
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
      pricing: pricingOf(data.branch),
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
        const typedPhone = input.customerPhone.trim();
        // 03001234567, +92 300 1234567 … are all saved as 0300-1234567.
        const phone = typedPhone ? (normalizePhone(typedPhone) ?? '') : '';
        const walkIn = input.type === 'TAKEAWAY';
        if ((!walkIn || name) && name.length < 2) throw new ApiError('VALIDATION', 'Enter the customer name.');
        if ((!walkIn || typedPhone) && !phone) throw new ApiError('VALIDATION', PHONE_MESSAGE);
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
        recalculate(order);
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
        const rider = data.staff.find((s) => s.id === riderId && s.role === 'RIDER' && !s.archivedAt);
        if (!rider) throw new ApiError('VALIDATION', 'Choose an active rider.');
        const block = riderAssignBlock(rider);
        if (block) throw new ApiError('VALIDATION', RIDER_ASSIGN_MESSAGES[block]);
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

  listRiders(): Promise<RiderOverview[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'riders.view');
      const today = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
      return data.staff
        .filter((s) => s.role === 'RIDER' && !s.archivedAt)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((rider) => {
          const own = data.orders.filter((o) => o.riderId === rider.id).map(riderDeliveryFromOrder).filter((d) => d !== null);
          const latest = data.invites.filter((i) => i.userId === rider.id).at(-1);
          return {
            account: riderAccount(rider),
            employeeCode: rider.employeeCode,
            email: rider.email,
            branchId: rider.branchId,
            invited: latest?.kind === 'ACTIVATION' && latest.state === 'PENDING' && !rider.activatedAt,
            running: own
              .filter((d) => d.status !== 'DELIVERED')
              .map((d) => ({ orderId: d.id, dailyNumber: d.dailyNumber, status: d.status, customerName: d.customerName })),
            deliveredToday: data.orders.filter((o) => o.riderId === rider.id && o.status === 'DELIVERED' && o.businessDate === today).length,
            cashToSettle: this.riderCashAmount(this.riderCashOrders(data, rider.id), rider.id),
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
            tableName: order.tableId ? this.orderPlace(data, order) : null,
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
        const item = data.items.find((i) => i.id === menuItemId && !i.archivedAt);
        if (!item) throw new ApiError('NOT_FOUND', 'Menu item not found.');
        item.isAvailable = available;
      }),
    );
  }

  // ── Menu setup (Preview 5: Owner, Manager) ─────────────────────────────────────────────────

  getMenuSetup(): Promise<MenuSetup> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'menu.view');
      const items = data.items.filter((i) => !i.archivedAt).sort((a, b) => a.sort - b.sort);
      return {
        categories: [...data.categories]
          .sort((a, b) => a.sort - b.sort)
          .map((category) => ({ category, itemCount: items.filter((i) => i.categoryId === category.id).length })),
        items,
        addonGroups: data.modifierGroups.map((group) => ({ group, itemCount: items.filter((i) => i.modifierGroupIds.includes(group.id)).length })),
        stations: [...data.stations].sort((a, b) => a.sort - b.sort),
      };
    });
  }

  saveMenuCategory(input: { id: string | null; name: string }): Promise<MenuCategory> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const existing = input.id ? data.categories.find((c) => c.id === input.id) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Category not found.');
        const name = cleanName(input.name);
        const problem = checkName(name, data.categories.filter((c) => c.id !== input.id).map((c) => c.name));
        if (problem) throw new ApiError('VALIDATION', menuMessage({ problem: problem as MenuProblem }, name, 'category'));
        if (existing) {
          existing.name = name;
          return existing;
        }
        const category: MenuCategory = {
          id: newId(),
          restaurantId: data.restaurant.id,
          branchId: null,
          name,
          sort: Math.max(0, ...data.categories.map((c) => c.sort)) + 1,
          isActive: true,
        };
        data.categories.push(category);
        return category;
      }),
    );
  }

  setMenuCategoryActive(categoryId: string, active: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const category = data.categories.find((c) => c.id === categoryId);
        if (!category) throw new ApiError('NOT_FOUND', 'Category not found.');
        category.isActive = active;
      }),
    );
  }

  moveMenuCategory(categoryId: string, position: number): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        if (!data.categories.some((c) => c.id === categoryId)) throw new ApiError('NOT_FOUND', 'Category not found.');
        data.categories = placeAt(data.categories, categoryId, position);
      }),
    );
  }

  removeMenuCategory(categoryId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const category = data.categories.find((c) => c.id === categoryId);
        if (!category) throw new ApiError('NOT_FOUND', 'Category not found.');
        const count = data.items.filter((i) => i.categoryId === categoryId && !i.archivedAt).length;
        if (count > 0) {
          throw new ApiError('CONFLICT', `${category.name} still has ${count} items. Move or remove them first, or hide the category.`);
        }
        data.categories = data.categories.filter((c) => c.id !== categoryId);
      }),
    );
  }

  saveMenuItem(input: MenuItemInput): Promise<MenuItem> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const existing = input.id ? data.items.find((i) => i.id === input.id && !i.archivedAt) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Menu item not found.');
        const category = data.categories.find((c) => c.id === input.categoryId);
        if (!category) throw new ApiError('VALIDATION', 'Choose a category.');
        if (!data.stations.some((s) => s.id === input.stationId)) throw new ApiError('VALIDATION', 'Choose a kitchen station.');
        if (!MENU_UNITS.includes(input.unit)) throw new ApiError('VALIDATION', 'Unknown unit.');
        if (input.modifierGroupIds.some((id) => !data.modifierGroups.some((g) => g.id === id))) {
          throw new ApiError('VALIDATION', 'Unknown add-on group.');
        }
        const name = cleanName(input.name);
        const taken = data.items.filter((i) => i.categoryId === category.id && !i.archivedAt && i.id !== input.id).map((i) => i.name);
        const check = checkMenuItem({ name, description: input.description, price: input.price, sizes: input.sizes }, taken);
        if (check) throw new ApiError('VALIDATION', menuMessage(check, name, category.name));

        // Sizes keep their id when only renamed or repriced, so a held bill still finds its size.
        const variants: ItemVariant[] = input.sizes.map((size, index) => ({
          id: size.id && existing?.variants.some((v) => v.id === size.id) ? size.id : newId(),
          name: cleanName(size.name),
          price: size.price ?? 0,
          sort: index + 1,
        }));
        const fields = {
          name,
          categoryId: category.id,
          stationId: input.stationId,
          description: input.description.trim(),
          unit: input.unit,
          // With sizes the smallest size price is shown as "from Rs. …"; the size price is what is charged.
          basePrice: variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : (input.price ?? 0),
          variants,
          modifierGroupIds: [...new Set(input.modifierGroupIds)],
          isAvailable: input.isAvailable,
          isOnline: input.isOnline,
        };
        let item: MenuItem;
        if (existing) {
          const moved = existing.categoryId !== category.id;
          Object.assign(existing, fields);
          if (moved && input.position === null) existing.sort = Math.max(0, ...data.items.map((i) => i.sort)) + 1;
          item = existing;
        } else {
          item = {
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: null,
            ...fields,
            sort: Math.max(0, ...data.items.map((i) => i.sort)) + 1,
            archivedAt: null,
          };
          data.items.push(item);
        }
        if (input.position !== null) this.placeMenuItem(data, item.id, input.position);
        return item;
      }),
    );
  }

  /** Display order inside the category: the category's own sort numbers are handed out again in the new order. */
  private placeMenuItem(data: DemoData, itemId: string, position: number): void {
    const item = data.items.find((i) => i.id === itemId);
    if (!item) return;
    const inCategory = data.items.filter((i) => i.categoryId === item.categoryId && !i.archivedAt).sort((a, b) => a.sort - b.sort);
    const slots = inCategory.map((i) => i.sort);
    const ordered = placeAt(inCategory, itemId, position);
    ordered.forEach((placed, index) => {
      const target = data.items.find((i) => i.id === placed.id);
      if (target) target.sort = slots[index] ?? target.sort;
    });
  }

  setItemOnline(menuItemId: string, online: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const item = data.items.find((i) => i.id === menuItemId && !i.archivedAt);
        if (!item) throw new ApiError('NOT_FOUND', 'Menu item not found.');
        item.isOnline = online;
      }),
    );
  }

  removeMenuItem(menuItemId: string): Promise<'ARCHIVED' | 'DELETED'> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const item = data.items.find((i) => i.id === menuItemId && !i.archivedAt);
        if (!item) throw new ApiError('NOT_FOUND', 'Menu item not found.');
        const used =
          data.orders.some((o) => o.items.some((line) => line.menuItemId === item.id)) ||
          data.heldBills.some((h) => h.items.some((line) => line.menuItemId === item.id));
        if (used) {
          // Old bills keep their own copy of the name and price; the row stays for the history.
          Object.assign(item, { archivedAt: nowIso(), isAvailable: false, isOnline: false });
          return 'ARCHIVED' as const;
        }
        data.items = data.items.filter((i) => i.id !== item.id);
        return 'DELETED' as const;
      }),
    );
  }

  saveAddonGroup(input: AddonGroupInput): Promise<ModifierGroup> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const existing = input.id ? data.modifierGroups.find((g) => g.id === input.id) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Add-on group not found.');
        const name = cleanName(input.name);
        const check = checkAddonGroup(
          { name, minSelect: input.minSelect, maxSelect: input.maxSelect, addons: input.addons },
          data.modifierGroups.filter((g) => g.id !== input.id).map((g) => g.name),
        );
        if (check) throw new ApiError('VALIDATION', menuMessage(check, name, 'group'));
        const modifiers: Modifier[] = input.addons.map((addon) => ({
          id: addon.id && existing?.modifiers.some((m) => m.id === addon.id) ? addon.id : newId(),
          name: cleanName(addon.name),
          price: addon.price ?? 0,
          isAvailable: addon.isAvailable,
        }));
        if (existing) {
          Object.assign(existing, { name, minSelect: input.minSelect, maxSelect: input.maxSelect, modifiers });
          return existing;
        }
        const group: ModifierGroup = { id: newId(), restaurantId: data.restaurant.id, name, minSelect: input.minSelect, maxSelect: input.maxSelect, modifiers };
        data.modifierGroups.push(group);
        return group;
      }),
    );
  }

  removeAddonGroup(groupId: string): Promise<number> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        if (!data.modifierGroups.some((g) => g.id === groupId)) throw new ApiError('NOT_FOUND', 'Add-on group not found.');
        let count = 0;
        for (const item of data.items) {
          if (!item.modifierGroupIds.includes(groupId)) continue;
          item.modifierGroupIds = item.modifierGroupIds.filter((id) => id !== groupId);
          if (!item.archivedAt) count++;
        }
        data.modifierGroups = data.modifierGroups.filter((g) => g.id !== groupId);
        return count;
      }),
    );
  }

  // ── Online App page (Preview 5) ─────────────────────────────────────────────────────────

  getOnlineApp(): Promise<OnlineAppView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'onlineApp.view');
      const { branch, restaurant } = data;
      const categories = data.categories.filter((c) => c.isActive).sort((a, b) => a.sort - b.sort);
      const rank = (categoryId: string) => categories.findIndex((c) => c.id === categoryId);
      return {
        onlineOrdersEnabled: branch.onlineOrdersEnabled,
        deliveryFee: branch.deliveryFee,
        minOrder: branch.minOrder,
        defaultPrepMinutes: branch.defaultPrepMinutes,
        customerPath: customerAppPath(restaurant.slug, branch.slug),
        publishing: data.onlinePublishing,
        website: data.onlineWebsite,
        branchPhone: branch.phone,
        branchAddress: branch.address,
        samplePreviews: [{ name: 'LALA Restaurant', path: customerAppPath('lala-restaurant', 'main') }],
        categories,
        items: data.items
          .filter((i) => !i.archivedAt && rank(i.categoryId) >= 0)
          .sort((a, b) => rank(a.categoryId) - rank(b.categoryId) || a.sort - b.sort),
      };
    });
  }

  setOnlineOrdersEnabled(enabled: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        data.branch.onlineOrdersEnabled = enabled;
      }),
    );
  }

  saveOnlineSettings(input: { deliveryFee: number; minOrder: number; defaultPrepMinutes: number }): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const problem = checkOnlineSettings(input);
        if (problem) throw new ApiError('VALIDATION', SETTINGS_MESSAGES[problem]);
        if (!Number.isSafeInteger(input.deliveryFee) || !Number.isSafeInteger(input.minOrder) || input.deliveryFee < 0 || input.minOrder < 0) {
          throw new ApiError('VALIDATION', SETTINGS_MESSAGES.MONEY_INVALID);
        }
        Object.assign(data.branch, input);
      }),
    );
  }

  getWebsitePreview(): Promise<WebsitePreviewData> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'onlineApp.view');
      return this.websitePreview(data);
    });
  }

  private websitePreview(data: DemoData): WebsitePreviewData {
    const { branch, restaurant } = data;
    const categories = data.categories.filter((c) => c.isActive).sort((a, b) => a.sort - b.sort);
    // Only what customers may see: item OFF or a hidden category never leaves Restaurant OS.
    const items = data.items.filter((i) => !i.archivedAt && i.isOnline && categories.some((c) => c.id === i.categoryId));
    return {
      restaurant: { name: restaurant.name, slug: restaurant.slug },
      branch: { name: branch.name, slug: branch.slug, phone: branch.phone, address: branch.address },
      onlineOrdersEnabled: branch.onlineOrdersEnabled,
      deliveryFee: branch.deliveryFee,
      minOrder: branch.minOrder,
      defaultPrepMinutes: branch.defaultPrepMinutes,
      pricing: pricingOf(branch),
      categories,
      items,
      addonGroups: data.modifierGroups.filter((g) => items.some((i) => i.modifierGroupIds.includes(g.id))),
      website: data.onlineWebsite,
    };
  }

  saveWebsiteConfig(config: WebsiteConfig): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'onlineApp.publish');
        const problem = checkWebsiteConfig(config);
        if (problem) throw new ApiError('VALIDATION', WEBSITE_MESSAGES[problem]);
        data.onlineWebsite = structuredClone(config);
        data.onlinePublishing = withWebsiteChanges(data.onlinePublishing);
      }),
    );
  }

  setOrderModes(modes: WebsiteConfig['modes']): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const problem = checkWebsiteConfig({ ...data.onlineWebsite, modes });
        if (problem) throw new ApiError('VALIDATION', WEBSITE_MESSAGES[problem]);
        data.onlineWebsite.modes = { ...modes };
      }),
    );
  }

  connectDomain(domain: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'onlineApp.publish');
        const clean = normalizeDomain(domain);
        if (!clean) throw new ApiError('VALIDATION', 'Enter a domain such as yourrestaurant.com.');
        data.onlinePublishing = { ...data.onlinePublishing, customDomain: clean, domainState: 'DNS_PENDING' };
      }),
    );
  }

  markDomainConnected(): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'onlineApp.publish');
        if (!data.onlinePublishing.customDomain) throw new ApiError('CONFLICT', 'Connect a domain first.');
        data.onlinePublishing = { ...data.onlinePublishing, domainState: 'CONNECTED' };
      }),
    );
  }

  removeDomain(): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'onlineApp.publish');
        data.onlinePublishing = { ...data.onlinePublishing, customDomain: null, domainState: 'NONE' };
      }),
    );
  }

  publishWebsite(): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'onlineApp.publish');
        if (!canPublishWebsite(data.onlinePublishing)) throw new ApiError('CONFLICT', 'There is nothing new to publish.');
        data.onlinePublishing = publishedWebsite(data.onlinePublishing, nowIso());
      }),
    );
  }

  // ── Today's Summary (Preview 5) ─────────────────────────────────────────────────────────

  getDaySummary(date: string | null): Promise<DaySummaryView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'reports.money');
      const today = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
      const businessDay = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
      const orders = data.orders.filter((o) => o.businessDate === businessDay);
      const dayOf = (iso: string) => businessDate(new Date(iso), data.branch.timezone, data.branch.businessDayStart);
      const summary = summarizeDay(orders, undefined, { date: businessDay, dayOf, allOrders: data.orders });
      const ids = new Set<string>([
        ...summary.tipsByWaiter.map((t) => t.waiterId ?? ''),
        ...summary.discounts.map((d) => d.by),
        ...summary.voids.map((v) => v.by ?? ''),
        ...summary.refunds.map((r) => r.by),
        ...summary.corrections.map((c) => c.by),
        ...summary.cancelled.map((c) => c.by ?? ''),
      ]);
      const names: Record<string, string> = {};
      for (const id of ids) {
        const name = this.staffName(data, id || null);
        if (name) names[id] = name;
      }
      const riders = [...new Set(orders.map((o) => o.riderId).filter((r): r is string => r !== null))];
      const withRiders = riders.reduce((sum, riderId) => sum + this.riderCashAmount(this.riderCashOrders(data, riderId).filter((o) => o.businessDate === businessDay), riderId), 0);
      const dates = [...new Set([today, ...data.orders.map((o) => o.businessDate)])].sort().reverse();
      return { businessDate: businessDay, today, dates, summary, names, withRiders };
    });
  }

  // ── Settings (Preview 5: Owner only) ───────────────────────────────────────────────────────

  getSettings(): Promise<SettingsView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'settings.manage');
      const openTickets = (stationId: string) =>
        data.orders.flatMap((o) => o.tickets).filter((tk) => tk.stationId === stationId && tk.status !== 'SERVED' && !this.isClosed(data, tk.orderId)).length;
      return {
        restaurant: data.restaurant,
        branch: data.branch,
        stations: [...data.stations]
          .sort((a, b) => a.sort - b.sort)
          .map((station) => ({
            station,
            itemCount: data.items.filter((i) => i.stationId === station.id && !i.archivedAt).length,
            openTickets: openTickets(station.id),
            chefCount: data.staff.filter((s) => s.isActive && !s.archivedAt && s.stationIds.includes(station.id)).length,
          })),
      };
    });
  }

  private isClosed(data: DemoData, orderId: string): boolean {
    const status = data.orders.find((o) => o.id === orderId)?.status;
    return status === undefined || ['PAID', 'DELIVERED', 'PICKED_UP', 'REJECTED', 'CANCELLED'].includes(status);
  }

  saveSettings(input: SettingsInput): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'settings.manage');
        const check = checkBranchSettings({
          restaurantName: input.restaurantName,
          branchName: input.branchName,
          phone: input.phone,
          address: input.address,
          taxBps: input.tax.rateBps,
          serviceChargeBps: input.serviceChargeBps,
          deliveryFee: input.deliveryFee,
          minOrder: input.minOrder,
          defaultPrepMinutes: input.defaultPrepMinutes,
          businessDayStart: input.businessDayStart,
          receiptHeader: input.receiptHeader,
          receiptFooter: input.receiptFooter,
        });
        if (check) throw new ApiError('VALIDATION', SETTINGS_MESSAGES[check.problem]);
        if (!Number.isInteger(input.tax.rateBps) || !Number.isInteger(input.serviceChargeBps)) throw new ApiError('VALIDATION', SETTINGS_MESSAGES.PERCENT_INVALID);
        data.restaurant.name = cleanName(input.restaurantName);
        Object.assign(data.branch, {
          name: cleanName(input.branchName),
          phone: normalizePhone(input.phone) ?? input.phone,
          address: input.address.trim(),
          tax: {
            rateBps: input.tax.rateBps,
            pricesIncludeTax: input.tax.pricesIncludeTax,
            appliesToServiceCharge: input.tax.appliesToServiceCharge,
            appliesToDeliveryFee: input.tax.appliesToDeliveryFee,
          },
          serviceChargeBps: input.serviceChargeBps,
          roundToRupee: input.roundToRupee,
          deliveryFee: input.deliveryFee,
          minOrder: input.minOrder,
          defaultPrepMinutes: input.defaultPrepMinutes,
          businessDayStart: input.businessDayStart.trim(),
          receiptHeader: input.receiptHeader.trim(),
          receiptFooter: input.receiptFooter.trim(),
        });
      }),
    );
  }

  saveStation(input: StationInput): Promise<KitchenStation> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'settings.manage');
        const existing = input.id ? data.stations.find((s) => s.id === input.id) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Kitchen station not found.');
        const name = cleanName(input.name);
        const problem = checkStation({ name, warnMinutes: input.warnMinutes, lateMinutes: input.lateMinutes }, data.stations.filter((s) => s.id !== input.id).map((s) => s.name));
        if (problem) throw new ApiError('VALIDATION', problem === 'TIMES_INVALID' ? SETTINGS_MESSAGES.STATION_TIMES : setupMessage(problem, name));
        const fields = { name, autoReady: input.autoReady, warnMinutes: input.warnMinutes, lateMinutes: input.lateMinutes };
        if (existing) {
          Object.assign(existing, fields);
          return existing;
        }
        const station: KitchenStation = {
          id: newId(),
          restaurantId: data.restaurant.id,
          branchId: data.branch.id,
          ...fields,
          sort: Math.max(0, ...data.stations.map((s) => s.sort)) + 1,
        };
        data.stations.push(station);
        return station;
      }),
    );
  }

  moveStation(stationId: string, position: number): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'settings.manage');
        if (!data.stations.some((s) => s.id === stationId)) throw new ApiError('NOT_FOUND', 'Kitchen station not found.');
        data.stations = placeAt(data.stations, stationId, position);
      }),
    );
  }

  removeStation(stationId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'settings.manage');
        const station = data.stations.find((s) => s.id === stationId);
        if (!station) throw new ApiError('NOT_FOUND', 'Kitchen station not found.');
        const items = data.items.filter((i) => i.stationId === stationId && !i.archivedAt).length;
        const chefs = data.staff.filter((s) => !s.archivedAt && s.stationIds.includes(stationId)).length;
        const tickets = data.orders.flatMap((o) => o.tickets).filter((tk) => tk.stationId === stationId && tk.status !== 'SERVED' && !this.isClosed(data, tk.orderId)).length;
        if (items > 0 || chefs > 0 || tickets > 0) {
          throw new ApiError('CONFLICT', `${station.name} is still used (${items} menu items, ${chefs} chefs, ${tickets} open tickets). Move them to another station first.`);
        }
        if (data.stations.length <= 1) throw new ApiError('VALIDATION', 'Keep at least one kitchen station.');
        data.stations = data.stations.filter((s) => s.id !== stationId);
      }),
    );
  }

  // ── Inventory & Suppliers (DEMO, Step A) ───────────────────────────────────────────────────

  getInventory(): Promise<InventoryView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const inv = data.inventory;
      const today = businessDate(new Date(), data.branch.timezone, '00:00');
      const rows = inv.ingredients
        .map((ingredient) => {
          const onHandMilli = onHandOf(ingredient.id, inv.movements);
          return {
            ingredient,
            onHandMilli,
            status: stockStatus({ onHandMilli, minStockMilli: ingredient.minStockMilli, isActive: ingredient.isActive }),
            expiry: expiryState(ingredient.expiryDate, today, onHandMilli, inv.expiringSoonDays),
            value: stockValueOf(ingredient, onHandMilli),
            supplierName: inv.suppliers.find((s) => s.id === ingredient.preferredSupplierId)?.name ?? null,
            locationName: inv.locations.find((l) => l.id === ingredient.locationId)?.name ?? null,
          };
        })
        .sort((a, b) => a.ingredient.name.localeCompare(b.ingredient.name));
      const movements = [...inv.movements]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50)
        .flatMap((movement) => {
          const ingredient = inv.ingredients.find((i) => i.id === movement.ingredientId);
          return ingredient
            ? [{ movement, ingredientName: ingredient.name, purchaseUnit: ingredient.purchaseUnit, stockUnit: ingredient.stockUnit, byName: this.staffName(data, movement.createdBy) }]
            : [];
        });
      return {
        today,
        expiringSoonDays: inv.expiringSoonDays,
        summary: summarizeInventory(rows),
        ingredients: rows,
        movements,
        locations: [...inv.locations].sort((a, b) => a.sort - b.sort),
        suppliers: inv.suppliers.filter((s) => s.isActive),
      };
    });
  }

  saveIngredient(input: IngredientInput): Promise<Ingredient> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const existing = input.id ? inv.ingredients.find((i) => i.id === input.id) : undefined;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'This ingredient was not found.');
        const problem = checkIngredient({ ...input, openingMilli: existing ? null : input.openingMilli }, inv.ingredients);
        if (problem) throw new ApiError('VALIDATION', 'Please check the ingredient details.');
        if (input.preferredSupplierId && !inv.suppliers.some((s) => s.id === input.preferredSupplierId)) throw new ApiError('VALIDATION', 'Choose a supplier from the list.');
        if (input.locationId && !inv.locations.some((l) => l.id === input.locationId)) throw new ApiError('VALIDATION', 'Choose a storage place from the list.');
        const now = nowIso();
        const fields = {
          name: cleanIngredientName(input.name),
          code: input.code.trim().toUpperCase(),
          category: input.category,
          purchaseUnit: input.purchaseUnit,
          stockUnit: input.stockUnit,
          packSizeMilli: input.packSizeMilli,
          minStockMilli: input.minStockMilli,
          reorderQtyMilli: input.reorderQtyMilli,
          purchasePrice: input.purchasePrice,
          preferredSupplierId: input.preferredSupplierId,
          locationId: input.locationId,
          batchNo: input.batchNo.trim(),
          expiryDate: input.expiryDate,
          updatedAt: now,
        };
        if (existing) {
          // The stock unit gives every movement its meaning: it never changes once stock was written.
          if (existing.stockUnit !== input.stockUnit && inv.movements.some((m) => m.ingredientId === existing.id)) {
            throw new ApiError('CONFLICT', 'The stock unit cannot change after stock was recorded.');
          }
          Object.assign(existing, fields);
          return existing;
        }
        const ingredient: Ingredient = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, ...fields, isActive: true, createdAt: now };
        inv.ingredients.push(ingredient);
        if (input.openingMilli > 0) {
          inv.movements.push({
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: data.branch.id,
            ingredientId: ingredient.id,
            type: 'OPENING',
            quantityMilli: input.openingMilli,
            reason: null,
            note: '',
            createdBy: user.id,
            createdAt: now,
          });
        }
        return ingredient;
      }),
    );
  }

  setIngredientActive(ingredientId: string, active: boolean): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const ingredient = data.inventory.ingredients.find((i) => i.id === ingredientId);
        if (!ingredient) throw new ApiError('NOT_FOUND', 'This ingredient was not found.');
        ingredient.isActive = active;
        ingredient.updatedAt = nowIso();
      }),
    );
  }

  adjustStock(input: StockAdjustInput): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const key = 'stock-adjust:' + input.idempotencyKey;
        if (data.idempotency[key]) return;
        const inv = data.inventory;
        const ingredient = inv.ingredients.find((i) => i.id === input.ingredientId);
        if (!ingredient) throw new ApiError('NOT_FOUND', 'This ingredient was not found.');
        const problem = checkAdjustment({ ...input, onHandMilli: onHandOf(ingredient.id, inv.movements) });
        if (problem) {
          throw new ApiError(
            'VALIDATION',
            problem === 'MORE_THAN_ON_HAND' ? 'You cannot remove more than is in stock.' : problem === 'NOTE_REQUIRED' ? 'Write why the stock changes.' : 'Please check the quantity and the reason.',
          );
        }
        const movementId = newId();
        inv.movements.push({
          id: movementId,
          restaurantId: data.restaurant.id,
          branchId: data.branch.id,
          ingredientId: ingredient.id,
          type: 'ADJUSTMENT',
          quantityMilli: input.direction === 'ADD' ? input.quantityMilli : -input.quantityMilli,
          reason: input.reason,
          note: input.note.trim(),
          createdBy: user.id,
          createdAt: nowIso(),
        });
        data.idempotency[key] = movementId;
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
      if (this.permissionsOf(data, user).includes('order.manage')) {
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
        const tableName = this.orderPlace(data, order);

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
        if (request && !request.acceptedAt && this.permissionsOf(data, user).includes('bill.accept')) {
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
      return data.staff
        .filter((s) => !s.archivedAt)
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
        const existing = input.id ? data.staff.find((s) => s.id === input.id && !s.archivedAt) : null;
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
        // 03001234567, 0300 1234567, +92 300 1234567 … are all saved as 0300-1234567.
        const phone = normalizePhone(input.phone);
        if (!phone) throw new ApiError('VALIDATION', PHONE_MESSAGE);
        if (data.staff.some((s) => s.phone === phone && s.id !== input.id && !s.archivedAt)) {
          throw new ApiError('VALIDATION', 'Another staff member already uses this phone number.');
        }
        const email = input.email.trim().toLowerCase() || null;
        if (email && !isValidEmail(email)) throw new ApiError('VALIDATION', 'Email must look like name@example.com.');
        if (email && data.staff.some((s) => s.email === email && s.id !== input.id && !s.archivedAt)) {
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
        // Own permissions are cut to what the role may have; the same as the role's set = follow the role.
        const roleSet = effectivePermissions({ role: input.role, permissions: null }, data.rolePermissions);
        const own = input.permissions && input.role !== 'OWNER' ? cleanPermissions(input.role, input.permissions) : null;
        const fields = {
          name,
          phone,
          email,
          branchId,
          role: input.role,
          stationIds: input.role === 'KITCHEN' ? input.stationIds : [],
          tableIds: isWaiter ? input.tableIds : [],
          permissions: own && !samePermissions(own, roleSet) ? own : null,
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
          archivedAt: null,
          employeeCode: `EMP${String(++data.employeeCounter).padStart(3, '0')}`,
          lastLoginAt: null,
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
        const target = data.staff.find((s) => s.id === userId && !s.archivedAt);
        if (!target) throw new ApiError('NOT_FOUND', 'Staff member not found.');
        if (target.id === actor.id) throw new ApiError('FORBIDDEN', 'You cannot disable your own account.');
        if (!canManageStaffAccount(actor.role, target.role)) throw new ApiError('FORBIDDEN', 'You cannot change this account.');
        if (removesLastOwner(data.staff, target.id, { role: target.role, isActive: active })) {
          throw new ApiError('CONFLICT', 'The restaurant needs at least one active Owner.');
        }
        if (!active && !canDisableRider(this.runningDeliveries(data, target.id))) throw new ApiError('CONFLICT', RIDER_DISABLE_MESSAGE);
        target.isActive = active;
        // Disable: every open session ends now. Enable: old sessions stay ended, so a fresh login is needed.
        this.endSessions(data, target.id);
        return target;
      }),
    );
  }

  getRolePermissions(): Promise<RolePermissionsEntry[]> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'staff.view');
      const ctx = { managerCanSeeMoneyReports: data.branch.managerCanSeeMoneyReports };
      return EDITABLE_ROLES.map((role) => {
        const recommended = recommendedPermissions(role, ctx);
        const permissions = effectivePermissions({ role, permissions: null }, data.rolePermissions, ctx);
        return { role, permissions, recommended, customized: !samePermissions(permissions, recommended) };
      });
    });
  }

  saveRolePermissions(role: StaffRole, permissions: Permission[] | null): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'staff.manage');
        if (!(EDITABLE_ROLES as readonly StaffRole[]).includes(role)) throw new ApiError('FORBIDDEN', 'This role cannot be changed.');
        if (permissions === null) delete data.rolePermissions[role];
        else data.rolePermissions[role] = cleanPermissions(role, permissions);
      }),
    );
  }

  removeStaff(userId: string): Promise<'ARCHIVED' | 'DELETED'> {
    return this.request(() =>
      this.store.update((data) => {
        const actor = this.require(data, 'staff.manage');
        const target = data.staff.find((s) => s.id === userId && !s.archivedAt);
        if (!target) throw new ApiError('NOT_FOUND', 'Staff member not found.');
        if (target.id === actor.id) throw new ApiError('FORBIDDEN', 'You cannot delete your own account.');
        if (!canManageStaffAccount(actor.role, target.role)) throw new ApiError('FORBIDDEN', 'You cannot change this account.');
        if (removesLastOwner(data.staff, target.id, { role: target.role, isActive: false })) {
          throw new ApiError('CONFLICT', 'The restaurant needs at least one active Owner.');
        }
        if (!canDisableRider(this.runningDeliveries(data, target.id))) throw new ApiError('CONFLICT', RIDER_DISABLE_MESSAGE);
        this.endSessions(data, target.id);
        for (const invite of data.invites) if (invite.userId === target.id && invite.state === 'PENDING') invite.state = 'REVOKED';
        if (this.staffIsUsed(data, target.id)) {
          // Old bills, tickets, payments and history keep showing this name, so the row stays (archived).
          Object.assign(target, { archivedAt: nowIso(), isActive: false, tableIds: [], stationIds: [] });
          return 'ARCHIVED' as const;
        }
        data.staff = data.staff.filter((s) => s.id !== target.id);
        data.invites = data.invites.filter((i) => i.userId !== target.id);
        delete data.sessionVersions[target.id];
        return 'DELETED' as const;
      }),
    );
  }

  /**
   * DEMO: the person is "used" when any business record (orders, tickets, payments, history, held bills,
   * waiter calls, rider settlements …) mentions their id. The server checks its foreign keys instead.
   */
  private staffIsUsed(data: DemoData, userId: string): boolean {
    const { staff, invites, sessionVersions, ...records } = data;
    void staff;
    void invites;
    void sessionVersions;
    return JSON.stringify(records).includes(userId);
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
        // Resetting your own PIN here would log you out with no way back in (the last Owner would lock the
        // restaurant out). Changing your own PIN while logged in comes with the server (Phase 4).
        if (target.id === this.currentUser(data)?.id) throw new ApiError('FORBIDDEN', 'You cannot reset your own PIN here.');
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
    const target = data.staff.find((s) => s.id === userId && !s.archivedAt);
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
    this.store.update((data) => {
      const user = data.staff.find((s) => s.id === userId);
      if (user) user.lastLoginAt = nowIso();
    });
    this.store.setSession(userId, this.store.read().sessionVersions[userId] ?? 0);
  }

  simulateCustomerOrder(type: 'DELIVERY' | 'TAKEAWAY'): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        // The server refuses checkout while online orders are OFF (MASTER_PROMPT.md §5.5).
        if (!data.branch.onlineOrdersEnabled) throw new ApiError('CONFLICT', 'Not taking online orders right now.');
        const { delivery, pickup } = data.onlineWebsite.modes;
        if (type === 'DELIVERY' ? !delivery : !pickup) throw new ApiError('CONFLICT', type === 'DELIVERY' ? 'Delivery is switched off for online orders.' : 'Pickup is switched off for online orders.');
        const count = data.orders.filter((o) => o.channel === 'CUSTOMER_APP').length;
        const customer = DEMO_CUSTOMERS[count % DEMO_CUSTOMERS.length] ?? DEMO_CUSTOMERS[0]!;
        const item = (name: string) => data.items.find((i) => i.name === name);
        const pizza = item('Classic Pizza');
        const medium = pizza?.variants.find((v) => v.name === 'Medium');
        const drafts: DraftItemInput[] = [
          // Test D: Classic Pizza + Cold Drink, Cash on Delivery.
          { menuItemId: pizza?.id ?? '', variantId: medium?.id ?? null, modifierIds: [], note: '', quantity: 1 },
          { menuItemId: item('Cold Drink')?.id ?? '', variantId: null, modifierIds: [], note: '', quantity: 1 },
        ];
        if (count % 2 === 1) drafts.push({ menuItemId: item('Zinger Burger')?.id ?? '', variantId: null, modifierIds: [], note: 'No mayo', quantity: 2 });
        return this.placeCustomerOrder(data, { type, name: `${customer.name} (DEMO)`, phone: customer.phone, address: type === 'DELIVERY' ? customer.address : null, note: '' }, drafts);
      }),
    );
  }

  /** Like the server at checkout: only items shown online, and at least the minimum order. Prices come from this menu. */
  private placeCustomerOrder(data: DemoData, customer: { type: 'DELIVERY' | 'TAKEAWAY'; name: string; phone: string; address: string | null; note: string }, drafts: DraftItemInput[]): Order {
    const order = this.newCounterOrder(
      data,
      {
        type: customer.type,
        channel: 'CUSTOMER_APP',
        status: 'PLACED',
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        note: customer.note,
      },
      null,
    );
    for (const draft of drafts) {
      const offered = data.items.find((i) => i.id === draft.menuItemId);
      if (offered && !offered.isOnline) throw new ApiError('CONFLICT', `${offered.name} is not available online.`);
    }
    order.items.push(...drafts.map((draft) => this.priceDraft(data, draft, order, 1)));
    recalculate(order);
    if (order.totals.itemsSubtotal < data.branch.minOrder) {
      throw new ApiError('CONFLICT', `The minimum online order is ${formatPaisa(data.branch.minOrder)}.`);
    }
    data.orders.push(order);
    return order;
  }

  /** An order from the customer website through the DEMO link (online-app.ts); from Phase 4 this is the real API. */
  receiveCustomerOrder(input: CustomerLinkOrder): Promise<CustomerLinkPlaced> {
    return this.request(() =>
      this.store.update((data) => {
        const placed = (order: Order): CustomerLinkPlaced => ({ token: order.trackingToken ?? '', dailyNumber: order.dailyNumber, totals: order.totals, prepMinutes: order.prepMinutes ?? data.branch.defaultPrepMinutes });
        const repeated = data.idempotency[input.idempotencyKey];
        if (repeated) return placed(this.findOrder(data, repeated));
        if (!data.branch.onlineOrdersEnabled) throw new ApiError('CONFLICT', 'Not taking online orders right now.');
        const { delivery, pickup } = data.onlineWebsite.modes;
        if (input.type === 'DELIVERY' ? !delivery : !pickup) throw new ApiError('CONFLICT', 'This way of ordering is switched off right now.');
        const phone = normalizePhone(input.phone);
        if (input.name.trim().length < 2 || !phone || (input.type === 'DELIVERY' && input.address.trim().length < 5) || input.lines.length === 0) throw new ApiError('VALIDATION', 'Please check your details.');
        const order = this.placeCustomerOrder(data, { type: input.type, name: input.name.trim(), phone, address: input.type === 'DELIVERY' ? input.address.trim() : null, note: input.note.trim().slice(0, 200) }, input.lines);
        data.idempotency[input.idempotencyKey] = order.id;
        return placed(order);
      }),
    );
  }

  /** What a tracking link may see of its own order: steps and the rider's name, nothing else. */
  customerLinkStatus(tokens: string[]): CustomerLinkStatus[] {
    const data = this.store.read();
    return data.orders.flatMap((order) => {
      if (!order.trackingToken || !tokens.includes(order.trackingToken)) return [];
      return [{
        token: order.trackingToken,
        status: order.status,
        dailyNumber: order.dailyNumber,
        prepMinutes: order.prepMinutes ?? data.branch.defaultPrepMinutes,
        riderName: order.riderId ? this.staffName(data, order.riderId) : null,
        history: order.history.map((h) => ({ status: h.toStatus, at: h.changedAt })),
      }];
    });
  }

  /** The website link's menu: only what customers may see, so it needs no login. */
  linkReady(): boolean {
    return this.store.isReady();
  }

  websiteLinkData(): Promise<WebsitePreviewData> {
    return this.request(() => {
      if (!this.store.isReady()) throw new ApiError('CONFLICT', 'Restaurant OS is not open.');
      return this.websitePreview(this.store.read());
    });
  }

  simulateRiderStep(orderId: string): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const order = this.findOrder(data, orderId);
        const riderId = order.riderId;
        if (!riderId) throw new ApiError('CONFLICT', 'No rider is assigned.');
        this.riderStep(data, order, riderId, order.status === 'RIDER_ASSIGNED' ? 'OUT_FOR_DELIVERY' : 'DELIVERED');
        return order;
      }),
    );
  }

  private riderStep(data: DemoData, order: Order, riderId: string, to: OrderStatus): void {
    const check = checkTransition({ type: order.type, from: order.status, to, role: 'RIDER', isAssignedRider: order.riderId === riderId });
    if (!check.ok) throw ruleError(check.reason);
    setStatus(order, to, riderId, 'Rider App (DEMO)');
    if (to !== 'DELIVERED') return;
    // Cash on Delivery: the rider confirms the cash collected; the cashier settles it later.
    const due = amountDue(order.totals.total, order.paidTotal);
    if (due === 0) return;
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
    recalculate(order);
    giveInvoiceNumber(data, order);
  }

  private runningDeliveries(data: DemoData, riderId: string): number {
    return data.orders.filter((o) => o.riderId === riderId && ACTIVE_DELIVERY.includes(o.status)).length;
  }

  riderLinkData(riderId: string | null): RiderLinkData {
    const data = this.store.read();
    const today = businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
    return {
      restaurantSlug: data.restaurant.slug,
      branchSlug: data.branch.slug,
      restaurantName: data.restaurant.name,
      branchName: data.branch.name,
      riders: data.staff.filter((s) => s.role === 'RIDER' && !s.archivedAt).map(riderAccount),
      deliveries: data.orders
        .filter((o) => o.riderId === riderId && riderId !== null && (o.businessDate === today || ACTIVE_DELIVERY.includes(o.status)))
        .map(riderDeliveryFromOrder)
        .filter((d) => d !== null),
    };
  }

  /** One rider's step from the Rider App. A repeated tap changes nothing. DEMO: the server checks the real login. */
  riderLinkCommand(command: RiderLinkCommand): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const rider = data.staff.find((s) => s.id === command.riderId && s.role === 'RIDER' && !s.archivedAt);
        if (!rider?.isActive) throw new ApiError('FORBIDDEN', 'This rider account is disabled.');
        if (command.kind === 'LOGIN') {
          if (!rider.activatedAt) throw new ApiError('FORBIDDEN', 'Open the activation link first.');
          rider.lastLoginAt = nowIso();
        } else if (command.kind === 'SET_ONLINE') {
          if (!command.online && !canRiderGoOffline(this.runningDeliveries(data, rider.id))) throw new ApiError('CONFLICT', RIDER_BUSY_MESSAGE);
          rider.riderOnline = command.online;
        } else {
          const order = this.findOrder(data, command.orderId);
          if (order.riderId !== rider.id) throw new ApiError('NOT_FOUND', 'This delivery is no longer yours.');
          const to = command.kind === 'PICKED_UP' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
          if (order.status !== to) this.riderStep(data, order, rider.id, to);
        }
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

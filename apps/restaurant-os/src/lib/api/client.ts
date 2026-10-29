import type {
  ActivationInfo,
  Area,
  Branch,
  DiningTable,
  TableSetup,
  CustomerSummary,
  DiscountChoice,
  DiscountInput,
  HeldBill,
  DraftItemInput,
  FloorPlan,
  KitchenTicketView,
  MenuSnapshot,
  Order,
  OrderStatus,
  OrderType,
  OrderView,
  PaymentMethod,
  RiderCashSettlement,
  RiderCashView,
  Restaurant,
  StaffNotification,
  StaffRole,
  StaffMember,
  StaffUser,
  InviteKind,
  TicketStatus,
  Uuid,
} from '@restaurant-saas/shared';

/**
 * The one data contract of Restaurant OS (MASTER_PROMPT.md §3.5).
 *
 *   screen → hooks → ApiClient ─┬─ DemoAdapter   Phases 1–3: in-memory DEMO data
 *                               └─ HttpAdapter   Phase 4+:   real API + Socket.IO
 *
 * Screens use only this interface, so switching adapters never means rebuilding screens.
 * The interface grows screen by screen during Phase 1.
 */
export interface Session {
  user: StaffUser;
  restaurant: Restaurant;
  branch: Branch;
}

export type ApiErrorCode = 'NETWORK' | 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface SendRoundInput {
  tableId: Uuid;
  guests: number;
  items: DraftItemInput[];
  /** One key per tap of "Send to kitchen": a double tap or retry never creates a second round. */
  idempotencyKey: string;
  /** Optional customer for a dine-in bill made at the POS */
  customerName?: string;
  customerPhone?: string;
  /** Discount chosen before sending (Owner/Manager only; checked by the server) */
  discount?: DiscountChoice | null;
}

export interface HeldBillInput {
  /** Empty for a new held bill */
  id: Uuid | null;
  type: OrderType;
  tableId: Uuid | null;
  guests: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note: string;
  items: DraftItemInput[];
  discount: DiscountChoice | null;
}

export interface RecordPaymentInput {
  orderId: Uuid;
  method: PaymentMethod;
  /** Paisa applied to the bill (never more than what is due) */
  amount: number;
  /** Paisa; tips are recorded with the payment but are not sales */
  tipAmount: number;
  /** Cash only: what the customer handed over (change is calculated) */
  cashReceived: number | null;
  /** Card slip or wallet transfer reference */
  reference: string | null;
  /** One key per tap of "Record payment": a double tap never records two payments. */
  idempotencyKey: string;
}

/** A takeaway or phone delivery order typed in at the counter; it starts as ACCEPTED. */
export interface CounterOrderInput {
  type: Exclude<OrderType, 'DINE_IN'>;
  channel: 'POS' | 'PHONE';
  customerName: string;
  customerPhone: string;
  /** Delivery only */
  customerAddress: string;
  note: string;
  items: DraftItemInput[];
  idempotencyKey: string;
  /** Discount chosen before sending (Owner/Manager only; checked by the server) */
  discount?: DiscountChoice | null;
}

export interface OrderFilter {
  /** TODAY = this business day */
  scope: 'TODAY' | 'ALL';
  type: OrderType | null;
  status: OrderStatus | null;
  /** Order number, table, customer name or phone */
  query: string;
}

export interface StaffInput {
  /** Empty for a new account */
  id: Uuid | null;
  name: string;
  phone: string;
  /** Optional */
  email: string;
  /** null = all branches (Owner only) */
  branchId: Uuid | null;
  role: StaffRole;
  stationIds: Uuid[];
  tableIds: Uuid[];
}

export interface AreaInput {
  /** Empty for a new area */
  id: Uuid | null;
  name: string;
}

export interface TableInput {
  /** Empty for a new table */
  id: Uuid | null;
  name: string;
  areaId: Uuid;
  seats: number;
  /** Display order inside the area, 1 = first; empty = last */
  position: number | null;
}

/** "Add many tables": prefix "T", 1 → 10, 4 seats = T1 … T10. */
export interface BulkTablesInput {
  areaId: Uuid;
  prefix: string;
  from: number;
  to: number;
  seats: number;
}

/** A single-use link to send to a staff member (activation or PIN reset). */
export interface StaffLink {
  token: string;
  kind: InviteKind;
  expiresAt: string;
}

export interface ApiClient {
  /** The logged-in staff member, or null. Phases 1–3: DEMO login; Phase 4: phone + password. */
  getSession(): Promise<Session | null>;
  logout(): Promise<void>;

  /** Active areas and the live table board (a waiter with assigned tables sees only those). */
  getFloorPlan(): Promise<FloorPlan>;
  /** Anyone on the floor: mark a free table for cleaning, or clean again. */
  setTableCleaning(tableId: Uuid, cleaning: boolean): Promise<void>;

  /**
   * Area and table setup (Owner, Manager). The server refuses to remove, take out of service or move a
   * table with a running or held bill, and to deactivate an area with one.
   */
  getTableSetup(): Promise<TableSetup>;
  saveArea(input: AreaInput): Promise<Area>;
  setAreaActive(areaId: Uuid, active: boolean): Promise<void>;
  /** Display order of the areas, 1 = first */
  moveArea(areaId: Uuid, position: number): Promise<void>;
  saveTable(input: TableInput): Promise<DiningTable>;
  addTables(input: BulkTablesInput): Promise<DiningTable[]>;
  /** false = Out of service */
  setTableInService(tableId: Uuid, inService: boolean): Promise<void>;
  /** A table with old bills is archived (kept for history); an unused one is deleted. */
  removeTable(tableId: Uuid): Promise<'ARCHIVED' | 'DELETED'>;
  getMenu(): Promise<MenuSnapshot>;
  getOrder(orderId: Uuid): Promise<Order>;
  /** Super Waiter / counter: creates the table's order if needed and adds one round. */
  sendRound(input: SendRoundInput): Promise<Order>;
  /** Owner/Manager only, with a reason. The item stays on the order, marked VOID, and leaves the bill. */
  voidItem(orderItemId: Uuid, reason: string): Promise<Order>;

  /** Waiter: "Request bill / Call cashier". Repeated taps send one request. */
  requestBill(orderId: Uuid): Promise<Order>;
  /** Cashier accepts the request; the waiter who asked sees the acknowledgement. */
  acceptBillRequest(orderId: Uuid): Promise<Order>;
  /** POS "Call Waiter", always available: the table's waiter gets an alert; without a table (null) every waiter does. */
  callWaiter(tableId: Uuid | null): Promise<{ tableName: string | null; waiterNames: string[] }>;
  /** Owner/Manager: % or fixed discount with a reason; null removes it. */
  applyDiscount(orderId: Uuid, discount: DiscountInput | null, reason: string): Promise<Order>;
  /** POS "Hold": an unsent bill is kept and can be reopened later. */
  listHeldBills(): Promise<HeldBill[]>;
  holdBill(input: HeldBillInput): Promise<HeldBill>;
  deleteHeldBill(id: Uuid): Promise<void>;
  /** Customers from earlier orders, by name or phone. */
  searchCustomers(query: string): Promise<CustomerSummary[]>;
  /** Cashier prints the pre-bill ("NOT A RECEIPT"); the order is not paid by this. */
  printPreBill(orderId: Uuid): Promise<Order>;
  /** Records one payment (split payments = several calls); the order becomes PAID when covered. */
  recordPayment(input: RecordPaymentInput): Promise<Order>;
  /** Counts receipt prints; every print after the first is marked DUPLICATE. */
  printReceipt(orderId: Uuid): Promise<Order>;

  /** Orders list (today or all), newest first, with the names the screens need. */
  listOrders(filter: OrderFilter): Promise<OrderView[]>;
  getOrderView(orderId: Uuid): Promise<OrderView>;
  /** Delivery and takeaway orders that are still running, plus today's finished ones. */
  listCounterOrders(): Promise<OrderView[]>;
  /** Previous name and address of a phone number, from earlier orders of this restaurant. */
  findCustomer(phone: string): Promise<{ name: string; address: string } | null>;
  createCounterOrder(input: CounterOrderInput): Promise<Order>;
  /** PLACED → ACCEPTED with a prep time; the kitchen tickets are created now. */
  acceptOnlineOrder(orderId: Uuid, prepMinutes: number): Promise<Order>;
  rejectOnlineOrder(orderId: Uuid, reason: string): Promise<Order>;
  cancelOrder(orderId: Uuid, reason: string): Promise<Order>;
  /** READY → RIDER_ASSIGNED, or change the rider before pickup. */
  assignRider(orderId: Uuid, riderId: Uuid): Promise<Order>;
  /** Takeaway: READY → PICKED_UP at the counter. */
  markPickedUp(orderId: Uuid): Promise<Order>;
  listRiderCash(): Promise<RiderCashView[]>;
  /** The cashier takes the rider's collected cash; one settlement per tap. */
  settleRiderCash(riderId: Uuid, idempotencyKey: string): Promise<RiderCashSettlement>;

  /** Open kitchen tickets (New / Preparing / Ready) of the stations the user works on. */
  listKitchenTickets(): Promise<KitchenTicketView[]>;
  /** Start / Ready / Undo / Served, checked with the shared ticket rules. */
  updateTicket(ticketId: Uuid, to: TicketStatus): Promise<void>;
  /** Out of stock ON/OFF for a menu item (Owner, Manager, Cashier, Kitchen). */
  setItemAvailable(menuItemId: Uuid, available: boolean): Promise<void>;

  /** Food ready, bill requested, bill accepted — only the ones meant for the logged-in user. */
  listNotifications(): Promise<StaffNotification[]>;

  /** Staff list with each person's latest activation / PIN-reset link (Owner; Manager read-only). */
  listStaff(): Promise<StaffMember[]>;
  /**
   * Owner only. A new account gets a single-use activation link (expires in 48 hours); its token is
   * returned only here, once — the server keeps only a hash of it.
   */
  saveStaff(input: StaffInput): Promise<{ user: StaffUser; link: StaffLink | null }>;
  /** Disabling ends every session of that person at once; enabling again needs a fresh login. */
  setStaffActive(userId: Uuid, active: boolean): Promise<StaffUser>;
  /** A new activation link; the old one stops working. */
  resendInvite(userId: Uuid): Promise<StaffLink>;
  /** Cancels the person's pending activation or PIN-reset link. */
  revokeInvite(userId: Uuid): Promise<void>;
  /** The old PIN and all sessions stop working; the person sets a new PIN with this single-use link. */
  resetStaffPin(userId: Uuid): Promise<StaffLink>;

  /** Activation page (no login): who the link is for, or an error when it is used, revoked or expired. */
  getActivation(token: string): Promise<ActivationInfo>;
  /** The person creates their own PIN; the link is used up. */
  activateAccount(token: string, pin: string, confirmPin: string): Promise<void>;

  /**
   * Called whenever data may have changed, so screens reload from the API.
   * Phases 1–3: DEMO sync between tabs of one browser. Phase 5: Socket.IO events.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * DEMO-only controls (demo login and demo tools). They exist only in Phases 1–3 and are never
 * part of the real API: the HttpAdapter will not implement them.
 */
export interface DemoControls {
  /** Active staff accounts to pick on the DEMO login screen */
  listLoginAccounts(): StaffUser[];
  demoLogin(userId: Uuid): void;
  /** Stands in for the Customer App (Phase 2): a customer places a delivery or pickup order. */
  simulateCustomerOrder(type: Exclude<OrderType, 'DINE_IN'>): Promise<Order>;
  /** Stands in for the Rider App (Phase 3): Picked up – On the way, then Delivered + cash collected. */
  simulateRiderStep(orderId: Uuid): Promise<Order>;
  isSimulatingFailure(): boolean;
  setSimulatedFailure(on: boolean): void;
  resetData(): void;
}

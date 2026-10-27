import type {
  Branch,
  DraftItemInput,
  FloorPlan,
  KitchenTicketView,
  MenuSnapshot,
  Order,
  PaymentMethod,
  Restaurant,
  StaffNotification,
  StaffRole,
  StaffUser,
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

export interface StaffInput {
  /** Empty for a new account */
  id: Uuid | null;
  name: string;
  phone: string;
  role: StaffRole;
  stationIds: Uuid[];
  tableIds: Uuid[];
}

export interface ApiClient {
  /** The logged-in staff member, or null. Phases 1–3: DEMO login; Phase 4: phone + password. */
  getSession(): Promise<Session | null>;
  logout(): Promise<void>;

  /** Areas and the live table board (a waiter with assigned tables sees only those). */
  getFloorPlan(): Promise<FloorPlan>;
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
  /** Cashier prints the pre-bill ("NOT A RECEIPT"); the order is not paid by this. */
  printPreBill(orderId: Uuid): Promise<Order>;
  /** Records one payment (split payments = several calls); the order becomes PAID when covered. */
  recordPayment(input: RecordPaymentInput): Promise<Order>;
  /** Counts receipt prints; every print after the first is marked DUPLICATE. */
  printReceipt(orderId: Uuid): Promise<Order>;

  /** Open kitchen tickets (New / Preparing / Ready) of the stations the user works on. */
  listKitchenTickets(): Promise<KitchenTicketView[]>;
  /** Start / Ready / Undo / Served, checked with the shared ticket rules. */
  updateTicket(ticketId: Uuid, to: TicketStatus): Promise<void>;
  /** Out of stock ON/OFF for a menu item (Owner, Manager, Cashier, Kitchen). */
  setItemAvailable(menuItemId: Uuid, available: boolean): Promise<void>;

  /** Food ready, bill requested, bill accepted — only the ones meant for the logged-in user. */
  listNotifications(): Promise<StaffNotification[]>;

  /** Staff management (Owner, Manager; Managers not for Owner/Manager accounts). */
  listStaff(): Promise<StaffUser[]>;
  saveStaff(input: StaffInput): Promise<StaffUser>;
  setStaffActive(userId: Uuid, active: boolean): Promise<StaffUser>;

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
  isSimulatingFailure(): boolean;
  setSimulatedFailure(on: boolean): void;
  resetData(): void;
}

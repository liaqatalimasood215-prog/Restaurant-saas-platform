import type {
  Branch,
  DraftItemInput,
  FloorPlan,
  KitchenTicketView,
  MenuSnapshot,
  Order,
  ReadyAlert,
  Restaurant,
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

export interface ApiClient {
  /** The logged-in staff member. Phases 1–3: the DEMO role switcher; Phase 4: the login token. */
  getSession(): Promise<Session>;

  /** Areas and the live table board (table status is derived from each table's open order). */
  getFloorPlan(): Promise<FloorPlan>;
  getMenu(): Promise<MenuSnapshot>;
  /** The open dine-in order of a table, or null when the table is free. */
  getOpenOrderForTable(tableId: Uuid): Promise<Order | null>;
  /** Creates the table's order if needed and adds one round, split into kitchen tickets by station. */
  sendRound(input: SendRoundInput): Promise<Order>;
  /** Print bill: the order becomes BILL_REQUESTED (adding a round reopens it). */
  requestBill(orderId: Uuid): Promise<Order>;
  /** Owner/Manager only, with a reason. The item stays on the order, marked VOID, and leaves the bill. */
  voidItem(orderItemId: Uuid, reason: string): Promise<Order>;

  /** Open kitchen tickets (New / Preparing / Ready) of the stations the user works on. */
  listKitchenTickets(): Promise<KitchenTicketView[]>;
  /** Start / Ready / Undo / Served, checked with the shared ticket rules. */
  updateTicket(ticketId: Uuid, to: TicketStatus): Promise<void>;
  /** Out of stock ON/OFF for a menu item (Owner, Manager, Cashier, Kitchen). */
  setItemAvailable(menuItemId: Uuid, available: boolean): Promise<void>;

  /** "Food ready" alerts: Waiters see their own tables, Owner/Manager/Cashier see all. */
  listReadyAlerts(): Promise<ReadyAlert[]>;

  /**
   * Called whenever data may have changed, so screens reload from the API.
   * Phases 1–3: DEMO sync between tabs of one browser. Phase 5: Socket.IO events.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * DEMO-only controls (role switcher and demo tools). They exist only in Phases 1–3 and are never
 * part of the real API: the HttpAdapter will not implement them.
 */
export interface DemoControls {
  /** One demo user per role, for the role switcher */
  listDemoUsers(): StaffUser[];
  switchRole(role: StaffRole): void;
  isSimulatingFailure(): boolean;
  setSimulatedFailure(on: boolean): void;
  resetData(): void;
}

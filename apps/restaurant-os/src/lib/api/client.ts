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
  DaySummaryView,
  OnlineAppView,
  WebsiteConfig,
  WebsitePreviewData,
  CustomerLinkOrder,
  CustomerLinkPlaced,
  CustomerLinkStatus,
  KitchenStation,
  KitchenTicketView,
  MenuCategory,
  SettingsView,
  TaxSettings,
  MenuItem,
  MenuSetup,
  MenuSnapshot,
  MenuUnit,
  ModifierGroup,
  Order,
  OrderStatus,
  OrderType,
  OrderView,
  Permission,
  RolePermissionsEntry,
  PaymentMethod,
  RiderCashSettlement,
  RiderCashView,
  RiderLinkCommand,
  RiderLinkData,
  RiderOverview,
  Restaurant,
  StaffNotification,
  StaffRole,
  StaffMember,
  StaffUser,
  InviteKind,
  TicketStatus,
  Uuid,
  AdjustReason,
  Ingredient,
  IngredientKind,
  Recipe,
  RecipeLine,
  RecipeTarget,
  RecipesView,
  StockLedgerQuery,
  StockLedgerView,
  IngredientCategory,
  InventoryView,
  PurchaseUnit,
  StockUnit,
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
  /** What this person may do (their own set, else their role's set). Screens use it only to show buttons. */
  permissions: Permission[];
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
  /** Add to this open sub-order; missing = the table's first open one */
  orderId?: Uuid | null;
  /** A new customer sat at the table: start a new sub-order (T1-2) */
  newSubOrder?: boolean;
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

export interface RecordTablePaymentInput {
  tableId: Uuid;
  method: PaymentMethod;
  cashReceived: number | null;
  reference: string | null;
  /** One key per tap: a double tap never pays twice. */
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

export interface RefundInput {
  orderId: Uuid;
  /** Paisa given back; full or part of what was paid */
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  reason: string;
  /** One key per refund dialog: a double tap never gives money back twice. */
  idempotencyKey: string;
}

export interface CorrectPaymentInput {
  orderId: Uuid;
  paymentId: Uuid;
  /** The method it should have been */
  method: PaymentMethod;
  reference: string | null;
  reason: string;
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
  /** Own permissions for this person; null = follow the role */
  permissions: Permission[] | null;
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

export interface MenuItemInput {
  /** Empty for a new item */
  id: Uuid | null;
  name: string;
  categoryId: Uuid;
  stationId: Uuid;
  description: string;
  unit: MenuUnit;
  /** Paisa; used when there are no sizes */
  price: number | null;
  /** Small / Medium / Large …; empty = one price. A size id is kept when the size is only renamed or repriced. */
  sizes: { id: Uuid | null; name: string; price: number | null }[];
  modifierGroupIds: Uuid[];
  isAvailable: boolean;
  isOnline: boolean;
  /** Display order inside the category, 1 = first; empty = last (new) or unchanged */
  position: number | null;
}

export interface AddonGroupInput {
  id: Uuid | null;
  name: string;
  minSelect: number;
  maxSelect: number;
  addons: { id: Uuid | null; name: string; price: number | null; isAvailable: boolean }[];
}

export interface SettingsInput {
  restaurantName: string;
  branchName: string;
  phone: string;
  address: string;
  tax: TaxSettings;
  serviceChargeBps: number;
  roundToRupee: boolean;
  deliveryFee: number;
  minOrder: number;
  defaultPrepMinutes: number;
  /** "HH:MM" */
  businessDayStart: string;
  receiptHeader: string;
  receiptFooter: string;
}

/** All quantities in stock-unit thousandths (the screen converts from what people type). */
export interface IngredientInput {
  id: Uuid | null;
  name: string;
  code: string;
  category: IngredientCategory;
  purchaseUnit: PurchaseUnit;
  stockUnit: StockUnit;
  packSizeMilli: number | null;
  minStockMilli: number;
  /** Purchase-unit thousandths */
  reorderQtyMilli: number;
  purchasePrice: number;
  preferredSupplierId: Uuid | null;
  locationId: Uuid | null;
  batchNo: string;
  expiryDate: string | null;
  /** New ingredient only: written as its OPENING stock movement */
  openingMilli: number;
  /** New ingredient only; missing = BOUGHT. PREPARED items are made in the kitchen from a batch recipe. */
  kind?: IngredientKind;
}

export interface RecipeInput {
  target: RecipeTarget;
  lines: RecipeLine[];
  /** Prepared items: what one batch makes (stock-unit thousandths) */
  yieldMilli: number | null;
  note: string;
  /** Save as VERIFIED (checked by the Owner / Manager); otherwise a DRAFT */
  verify: boolean;
}

export interface StockAdjustInput {
  ingredientId: Uuid;
  direction: 'ADD' | 'REMOVE';
  /** Stock-unit thousandths, always positive */
  quantityMilli: number;
  reason: AdjustReason;
  note: string;
  /** A double tap or retry with the same key changes nothing */
  idempotencyKey: string;
}

export interface StationInput {
  id: Uuid | null;
  name: string;
  /** Drinks and similar: ready as soon as they are sent */
  autoReady: boolean;
  warnMinutes: number;
  lateMinutes: number;
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
  /** One bill for everyone: every open sub-order of the table is paid in full, each with its own invoice. */
  recordTablePayment(input: RecordTablePaymentInput): Promise<void>;
  /** Counts receipt prints; every print after the first is marked DUPLICATE. */
  printReceipt(orderId: Uuid): Promise<Order>;
  /** Owner or Manager: money given back, as a new entry. The payment and the order status do not change. */
  refundPayment(input: RefundInput): Promise<Order>;
  /** Owner or Manager: a payment recorded with the wrong method is reversed and replaced by the right one. */
  correctPayment(input: CorrectPaymentInput): Promise<Order>;

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
  /** The Riders page: every rider with running deliveries and cash to settle. */
  listRiders(): Promise<RiderOverview[]>;
  /** The cashier takes the rider's collected cash; one settlement per tap. */
  settleRiderCash(riderId: Uuid, idempotencyKey: string): Promise<RiderCashSettlement>;

  /** Open kitchen tickets (New / Preparing / Ready) of the stations the user works on. */
  listKitchenTickets(): Promise<KitchenTicketView[]>;
  /** Start / Ready / Undo / Served, checked with the shared ticket rules. */
  updateTicket(ticketId: Uuid, to: TicketStatus): Promise<void>;
  /** Out of stock ON/OFF for a menu item (Owner, Manager, Cashier, Kitchen). */
  setItemAvailable(menuItemId: Uuid, available: boolean): Promise<void>;

  /** Menu screen (Preview 5). Changes reach POS, Waiter Orders and the kitchen at once; old orders keep their copies. */
  getMenuSetup(): Promise<MenuSetup>;
  saveMenuCategory(input: { id: Uuid | null; name: string }): Promise<MenuCategory>;
  /** A hidden category and its items are not offered in POS, Waiter Orders or online. */
  setMenuCategoryActive(categoryId: Uuid, active: boolean): Promise<void>;
  /** Display order, 1 = first */
  moveMenuCategory(categoryId: Uuid, position: number): Promise<void>;
  /** Only an empty category can be deleted (hide it otherwise). */
  removeMenuCategory(categoryId: Uuid): Promise<void>;
  saveMenuItem(input: MenuItemInput): Promise<MenuItem>;
  /** Shown in the Customer App or not (Phase 2) */
  setItemOnline(menuItemId: Uuid, online: boolean): Promise<void>;
  /** An item that was ever ordered or held is archived (old bills keep it); a never-used one is deleted. */
  removeMenuItem(menuItemId: Uuid): Promise<'ARCHIVED' | 'DELETED'>;
  saveAddonGroup(input: AddonGroupInput): Promise<ModifierGroup>;
  /** Removes the group from every item; returns how many items had it. */
  removeAddonGroup(groupId: Uuid): Promise<number>;

  /** Food ready, bill requested, bill accepted — only the ones meant for the logged-in user. */
  listNotifications(): Promise<StaffNotification[]>;

  /** Staff list with each person's latest activation / PIN-reset link (Owner; Manager read-only). */
  listStaff(): Promise<StaffMember[]>;
  /**
   * Owner only. A new account gets a single-use activation link (expires in 48 hours); its token is
   * returned only here, once — the server keeps only a hash of it.
   */
  saveStaff(input: StaffInput): Promise<{ user: StaffUser; link: StaffLink | null }>;
  /**
   * Owner only. Someone with old bills or history is archived (hidden, name kept on old records); someone
   * never used is deleted. Never yourself or the last active Owner.
   */
  removeStaff(userId: Uuid): Promise<'ARCHIVED' | 'DELETED'>;
  /** Disabling ends every session of that person at once; enabling again needs a fresh login. */
  setStaffActive(userId: Uuid, active: boolean): Promise<StaffUser>;
  /** A new activation link; the old one stops working. */
  resendInvite(userId: Uuid): Promise<StaffLink>;
  /** Cancels the person's pending activation or PIN-reset link. */
  revokeInvite(userId: Uuid): Promise<void>;
  /** The old PIN and all sessions stop working; the person sets a new PIN with this single-use link. */
  resetStaffPin(userId: Uuid): Promise<StaffLink>;

  /** Role Permissions (Owner changes, Manager may look): each editable role with its current and recommended set. */
  getRolePermissions(): Promise<RolePermissionsEntry[]>;
  /** Owner only. null = back to the recommended set. Everyone of that role without own permissions follows at once. */
  saveRolePermissions(role: StaffRole, permissions: Permission[] | null): Promise<void>;

  /** Online App page (Preview 5). The switches work now; the Customer App that obeys them comes in Phase 2. */
  getOnlineApp(): Promise<OnlineAppView>;
  /** OFF: the server refuses every new customer order. */
  setOnlineOrdersEnabled(enabled: boolean): Promise<void>;
  saveOnlineSettings(input: { deliveryFee: number; minOrder: number; defaultPrepMinutes: number }): Promise<void>;
  /** Owner only. The website alone; the Android app is a separate flow. Phase 1: a demo state, nothing goes online. */
  publishWebsite(): Promise<void>;
  /** What the website previews show: this restaurant's online menu, prices, switches and website settings. */
  getWebsitePreview(): Promise<WebsitePreviewData>;
  /** Owner only. Look and texts of the website; a published website then waits for Publish Website. */
  saveWebsiteConfig(config: WebsiteConfig): Promise<void>;
  /** Delivery, Pickup, Dine-in ON/OFF: same people and same effect as online orders ON/OFF, at once. */
  setOrderModes(modes: WebsiteConfig['modes']): Promise<void>;
  /** Owner only. Demo steps: nothing touches a real domain or its DNS. */
  connectDomain(domain: string): Promise<void>;
  markDomainConnected(): Promise<void>;
  removeDomain(): Promise<void>;

  /** Today's Summary (permission "reports.money"); null = today's business day. */
  getDaySummary(businessDate: string | null): Promise<DaySummaryView>;

  /** Settings (Owner only). Tax, service charge and delivery fee apply to new bills; old and running bills keep theirs. */
  getSettings(): Promise<SettingsView>;
  saveSettings(input: SettingsInput): Promise<void>;
  saveStation(input: StationInput): Promise<KitchenStation>;
  /** Display order, 1 = first */
  moveStation(stationId: Uuid, position: number): Promise<void>;
  /** Only a station with no menu items, chefs or open tickets can be removed. */
  removeStation(stationId: Uuid): Promise<void>;

  /**
   * Inventory & Suppliers (DEMO, Step A; Owner / Manager). Stock is the sum of stock movements: a new
   * ingredient's opening stock and every correction are movements; nobody types a new stock number.
   */
  getInventory(): Promise<InventoryView>;
  saveIngredient(input: IngredientInput): Promise<Ingredient>;
  /** Not in use = hidden from lists and the dashboard, kept with its history */
  setIngredientActive(ingredientId: Uuid, active: boolean): Promise<void>;
  /** A correction with a reason (Step A). Purchases, kitchen use and waste come in later steps. */
  adjustStock(input: StockAdjustInput): Promise<void>;
  /** Stock Movements: every stock change with its reason, who and when, and the stock it left (newest first). */
  getStockLedger(query: StockLedgerQuery): Promise<StockLedgerView>;
  /** Recipes & Food Cost (Step B): every menu size, add-on and prepared item with its current recipe and food cost. */
  getRecipes(): Promise<RecipesView>;
  /**
   * Adds a new version when the lines changed (old versions stay as they were). Saving the same lines again with
   * verify = true only marks the current version VERIFIED.
   */
  saveRecipe(input: RecipeInput): Promise<Recipe>;

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
  /** DEMO link with the customer website in this browser (Phase 4: the real API). */
  receiveCustomerOrder(input: CustomerLinkOrder): Promise<CustomerLinkPlaced>;
  customerLinkStatus(tokens: string[]): CustomerLinkStatus[];
  websiteLinkData(): Promise<WebsitePreviewData>;
  /** False only on the hidden link page while no Restaurant OS tab has answered. */
  linkReady(): boolean;
  /** Stands in for the Rider App (Phase 3): Picked up – On the way, then Delivered + cash collected. */
  simulateRiderStep(orderId: Uuid): Promise<Order>;
  /** DEMO link to the Rider App (screens/riders/rider-bridge.ts); from Phase 4 both apps use the API. */
  riderLinkData(riderId: Uuid | null): RiderLinkData;
  riderLinkCommand(command: RiderLinkCommand): Promise<void>;
  isSimulatingFailure(): boolean;
  setSimulatedFailure(on: boolean): void;
  resetData(): void;
}

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
  IsoDateTime,
  Uuid,
  AdjustReason,
  Ingredient,
  Packing,
  IngredientKind,
  Recipe,
  RecipeLine,
  PurchaseRecipeRow,
  RecipeScale,
  RecipeTarget,
  RecipesView,
  ScaleUnit,
  Supplier,
  SupplierCategory,
  SupplierPaymentMethod,
  SuppliersView,
  SupplierWorkspace,
  KhataEntry,
  StockLedgerQuery,
  StockLedgerView,
  DateKind,
  StockLot,
  WasteKind,
  WasteLineInput,
  WasteStage,
  WasteView,
  WasteEvent,
  IngredientCategory,
  InventoryView,
  PurchaseUnit,
  StockUnit,
  CookingBatch,
  CookingCheckTime,
  CookMode,
  PlanRow,
  AvailableFood,
  AvailableState,
  FoodOutcome,
  FoodOutcomeKind,
  FoodWaste,
  ReuseSetting,
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
  /** I4: may go to another order after a cancel; missing = unchanged (the default by category) */
  reuse?: ReuseSetting | null;
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
  /** Other ways to buy it (2026-11-07); missing = unchanged */
  packings?: Packing[];
  /** Loose price per kg / litre / one; null = from the main price; missing = unchanged */
  loosePrice?: number | null;
  /** New ingredient only; missing = BOUGHT. PREPARED items are made in the kitchen from a batch recipe. */
  kind?: IngredientKind;
}

export interface RecipeInput {
  target: RecipeTarget;
  lines: RecipeLine[];
  /** Prepared items: what one batch makes (stock-unit thousandths) */
  yieldMilli: number | null;
  /** Cooked food (prepared items): the main raw ingredient, one of the lines; its quantity is what the recipe is for */
  mainIngredientId?: Uuid | null;
  note: string;
  /** Save as VERIFIED (checked by the Owner / Manager); otherwise a DRAFT */
  verify: boolean;
}

/**
 * Sell a cooked dish on the POS (owner's integration brief, 2026-11-08): link it to the menu product that is the same dish, or
 * make that product once. Each size's recipe becomes its portion of the dish (old recipe versions stay).
 */
export interface SellPreparedInput {
  preparedId: Uuid;
  /** Link to this menu product; null = a new product with the fields below */
  menuItemId: Uuid | null;
  name: string;
  /** null = a new category called newCategoryName */
  categoryId: Uuid | null;
  newCategoryName: string;
  stationId: Uuid;
  isOnline: boolean;
  /**
   * One row per size: one row = one price, two or more = sizes (Full plate, Half plate). Linking: the product's sizes as he
   * changed them (variantId of a size kept, null = new); names and prices go to the Menu in the same step.
   */
  sizes: { variantId: Uuid | null; name: string; price: number | null; portionMilli: number }[];
}

/** A cooking batch as recorded (I3, owner 2026-11-09). */
export interface CookingBatchInput {
  /** One per Cook dialog: a double tap or retry saves once */
  idempotencyKey: string;
  preparedId: Uuid;
  mode: CookMode;
  /** MAIN: the main raw ingredient used (stock-unit thousandths); BATCHES: thousandths of a recipe batch */
  amountMilli: number;
  /** What was actually made (the dish's stock-unit thousandths) */
  actualMilli: number;
  /** Grams in one plate; remembered on the dish */
  plateMilli: number;
  /** The plan day it was cooked for; null = today */
  planDate: string | null;
  note: string;
}

/** A day's cooking plan and its stock check (I3). */
/** I4: one line of an order and what may happen to its food if it is cancelled or voided now. */
export interface MadeFoodLine {
  itemId: Uuid;
  name: string;
  variantName: string | null;
  quantity: number;
  unit: MenuUnit;
  /** The kitchen made it (its stock was taken) */
  made: boolean;
  served: boolean;
  /** Still cooking: the kitchen decides Keep or Stop */
  cooking: boolean;
  /** Empty when nothing was made yet (nothing to choose) */
  choices: FoodOutcomeKind[];
  safeHours: number | null;
}

export interface AvailableFoodRow {
  food: AvailableFood;
  state: AvailableState;
  /** The dish may be kept for tomorrow */
  overnight: boolean;
}

export interface AvailableFoodView {
  closingTime: string;
  /** The date the closing review is due for, or null */
  reviewDue: string | null;
  /** Food still waiting (available or time over) first, then today's done ones */
  rows: AvailableFoodRow[];
  /** Today's wastage and staff meals of cooked food */
  waste: FoodWaste[];
}

export interface CookingPlanView {
  date: string;
  today: string;
  /** The date has its own plan (else the daily plan) */
  ownPlan: boolean;
  daily: PlanRow[];
  /** cookedMilli = that day's batches of the dish, leftMilli = what is still to cook; cooked = nothing left (IM1: by quantity) */
  rows: (PlanRow & { name: string; stockUnit: Ingredient['stockUnit']; mainName: string | null; verified: boolean; expectedMilli: number | null; cooked: boolean; cookedMilli: number; leftMilli: number })[];
  /** Every raw ingredient the rows still to cook need, added up */
  needs: { ingredient: Ingredient; needMilli: number; haveMilli: number; shortMilli: number; low: boolean; expired: boolean; supplierName: string | null }[];
  /** Dishes that can be planned: cooked food and other prepared items */
  dishes: { preparedId: Uuid; name: string; mode: CookMode; mainId: Uuid | null; mainName: string | null; verified: boolean; stockUnit: Ingredient['stockUnit'] }[];
  checks: CookingCheckTime[];
}

/** One size in Auto Scale (Recipe Builder R2). */
export interface ScaledSizeInput {
  /** null = a new size: added to the Menu with this name and price (only with updateMenu) */
  variantId: Uuid | null;
  name: string;
  /** Thousandths of the base unit: ½ kg with a kg base = 500 */
  quantityMilli: number;
  /** Ticked: this size gets its recipe */
  active: boolean;
  /** A custom size keeps these lines; an automatic one (null) gets the base × its share */
  customLines: RecipeLine[] | null;
  /** Selling price (paisa) the owner typed; it reaches the Menu only with updateMenu */
  price: number;
}

/** Saves an Auto Scale recipe in one step: the base recipe, every ticked size's recipe and the setup. */
export interface ScaledRecipeInput {
  menuItemId: Uuid;
  baseQuantityMilli: number;
  baseUnit: ScaleUnit;
  baseLines: RecipeLine[];
  sizes: ScaledSizeInput[];
  /**
   * The owner confirmed the Menu change: changed prices and new sizes are written to the Menu (new bills only; old
   * bills keep their prices). Without it the Menu stays exactly as it is.
   */
  updateMenu: boolean;
  note: string;
  verify: boolean;
}

export interface SupplierInput {
  name: string;
  phone: string;
}

/** Add or edit a supplier (Suppliers S1). */
export interface SupplierProfileInput {
  /** Empty for a new supplier */
  id: Uuid | null;
  name: string;
  phone: string;
  category: SupplierCategory;
  address: string;
  notes: string;
  /** The products he usually brings (shared ingredients) */
  productIds: Uuid[];
  /** New supplier only: what we already owe him from before (paisa); 0 = nothing */
  openingBalance: number;
  /** His picture (small data URL), null = back to the category picture, missing = unchanged */
  photo?: string | null;
}

/** One delivery: stock goes up and his khata grows, in one step and only once (idempotency key). */
export interface ReceiveStockInput {
  supplierId: Uuid;
  /** Quantity in the purchase unit (thousandths) and the rate per purchase unit (paisa) */
  lines: { ingredientId: Uuid; quantityMilli: number; ratePaisa: number }[];
  note: string;
  idempotencyKey: string;
}

/**
 * New Purchase (Bill), 2026-11-06: one delivery as a bill. Saving raises stock and his khata once (one PURCHASE entry,
 * the lines minus the discount) and records what was paid at once as a PAYMENT linked to the bill.
 */
export interface PurchaseBillInput {
  supplierId: Uuid;
  /** The supplier's bill number, optional */
  billNo: string;
  /** Business date of the bill (YYYY-MM-DD), not in the future */
  date: string;
  /** Quantity in the way it is bought (unitKey: 'main', 'loose:kg', 'pack:<id>'; thousandths) and its rate (paisa) */
  lines: {
    ingredientId: Uuid;
    unitKey: string;
    quantityMilli: number;
    ratePaisa: number;
    /** W3: the date on the label (optional; none = Unknown, Needs review) and whether it is a use-by or best-before date */
    expiryDate?: string | null;
    dateKind?: DateKind;
  }[];
  /** Paisa off the subtotal */
  discount: number;
  /** Paid at once (paisa), up to this bill's total; 0 = nothing yet */
  paid: number;
  method: SupplierPaymentMethod | null;
  note: string;
  idempotencyKey: string;
}

export interface PurchaseBillResult {
  purchase: KhataEntry;
  payment: KhataEntry | null;
  /** Cooked food whose recipe now follows the raw stock this bill brought (owner, 2026-11-07); read only */
  recipeUpdates?: RecipeUpdate[];
  /** P3: this bill's own recipe for each cooked dish whose main raw ingredient it brought (read only) */
  purchaseRecipes?: PurchaseRecipeRow[];
}

/** "Cooked Daal Mash: recipe now for 7 kg (was 5 kg)" — stock-unit thousandths of the main raw ingredient */
export interface RecipeUpdate {
  dishName: string;
  mainIngredientId: Uuid;
  beforeMilli: number;
  afterMilli: number;
}

/** An unfinished bill as he typed it (DEMO: kept with the demo data in this browser). Never touches stock or the khata. */
export interface PurchaseDraft {
  supplierId: Uuid;
  billNo: string;
  date: string;
  /** unitKey missing = 'main' (drafts from before 2026-11-07) */
  lines: { ingredientId: Uuid; unitKey?: string; quantity: string; rate: string; expiry?: string; bestBefore?: boolean }[];
  discount: string;
  discountMode: 'RS' | 'PERCENT';
  paid: string;
  method: SupplierPaymentMethod;
  note: string;
  savedAt: IsoDateTime;
}

/** A payment to a supplier: lowers his khata, never changes stock. */
export interface SupplierPaymentInput {
  supplierId: Uuid;
  amount: number;
  method: SupplierPaymentMethod;
  /** Business date it counts for (YYYY-MM-DD), not in the future */
  date: string;
  note: string;
  idempotencyKey: string;
}

export type KhataPeriod = 'TODAY' | 'ALL';

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

/** W1: one waste incident of raw ingredients and packaging (Owner / Manager post it at once); W2: also cooked stock, staff meals and donations. */
export interface StockWasteInput {
  /** When it happened (ISO); not in the future, at most 7 days back */
  at: string;
  /** W2: missing = WASTE; Staff meal and Donation are Owner / Manager only */
  kind?: WasteKind;
  stage: WasteStage;
  lines: WasteLineInput[];
  note: string;
  /** One per form: a double tap, refresh or retry posts once */
  idempotencyKey: string;
}

/** W3: a lot's date from the label, or (cooked food) hours after it was made, optionally for every new batch of the dish */
export interface LotDateInput {
  lotId: Uuid;
  date: string | null;
  dateKind: DateKind;
  discardHours?: number | null;
  forDish?: boolean;
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
  /**
   * Void a sent item. When its food was already made (kitchen Ready), what happens to the food must be chosen (I4): Available
   * Prepared Food, back to stock, or wastage with a reason — never wastage by itself.
   */
  voidItem(orderItemId: Uuid, reason: string, food?: FoodOutcome): Promise<Order>;

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
  /** Cancel; each line whose food was made needs its choice (I4), by line id. Lines still cooking are decided by the kitchen. */
  cancelOrder(orderId: Uuid, reason: string, food?: Record<Uuid, FoodOutcome>): Promise<Order>;
  /** I4: the lines of an order (or one line) and what may happen to their food if it is cancelled or voided now */
  getMadeFood(orderId: Uuid, itemId?: Uuid | null): Promise<MadeFoodLine[]>;
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
  /** Picked up at the pass by the waiter (dine-in; owner, 2026-11-09): a time and a name, the ticket stays READY until Served. */
  pickUpTicket(ticketId: Uuid): Promise<void>;
  /** Undo a pickup within 5 minutes (waiter, Owner / Manager, or the kitchen of that station). */
  undoPickup(ticketId: Uuid): Promise<void>;
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
  /** W1: Stock → Wastage & Expiry: posted stock waste, today and the last 7 days */
  getWasteView(): Promise<WasteView>;
  /** W1: post one waste incident: one WASTE movement per line, all or none, once per key (Owner / Manager) */
  postStockWaste(input: StockWasteInput): Promise<WasteEvent>;
  /** W2: reverse a posted event with a reason: its stock comes back by linked movements, the event stays as REVERSED (Owner / Manager) */
  reverseStockWaste(eventId: Uuid, reason: string): Promise<WasteEvent>;
  /** W2: correct = reverse the old event and post the new one in one change, both linked (Owner / Manager) */
  correctStockWaste(eventId: Uuid, reason: string, input: StockWasteInput): Promise<WasteEvent>;
  /** W3: the date of one delivery (or a cooked batch's discard hours), confirmed by a person (Owner / Manager) */
  setLotDate(input: LotDateInput): Promise<StockLot>;
  /** W3: held (returned) food back to use, only when confirmed safe and never after its date (Owner / Manager) */
  releaseLot(lotId: Uuid, safe: boolean, note: string): Promise<StockLot>;
  /** Recipes & Food Cost (Step B): every menu size, add-on and prepared item with its current recipe and food cost. */
  getRecipes(): Promise<RecipesView>;
  /**
   * Adds a new version when the lines changed (old versions stay as they were). Saving the same lines again with
   * verify = true only marks the current version VERIFIED.
   */
  saveRecipe(input: RecipeInput): Promise<Recipe>;
  /** Recipe Builder R2: one base recipe shared out to every ticked size (and, when confirmed, the Menu sizes and prices). */
  saveScaledRecipe(input: ScaledRecipeInput): Promise<RecipeScale>;
  /** Auto Scale off: every size keeps the recipe it has and is edited on its own again. */
  turnOffRecipeScale(menuItemId: Uuid): Promise<void>;
  /** A cooked dish on the POS: the same menu product linked, or made once; each size's recipe = its portion (one step). */
  sellPreparedItem(input: SellPreparedInput): Promise<MenuItem>;
  /**
   * I3 (owner, 2026-11-09): cook a batch by the dish's verified recipe in one step: the raw ingredients out once (COOK_USE),
   * the actual cooked amount in (COOKED), the batch kept. Refused while an ingredient is short; a repeated key returns the first.
   */
  recordCookingBatch(input: CookingBatchInput): Promise<CookingBatch>;
  /** The actual output was wrong: the cooked stock follows (a COOKED correction with the reason). */
  correctCookingBatch(batchId: Uuid, actualMilli: number, reason: string): Promise<CookingBatch>;
  /** A batch recorded by mistake: everything goes back with opposite movements, while its cooked food is still in stock. */
  reverseCookingBatch(batchId: Uuid, reason: string): Promise<CookingBatch>;
  /** A day's cooking plan (default: tomorrow) with what it needs, the usable stock and what is short. */
  getCookingPlan(date?: string): Promise<CookingPlanView>;
  /** date null = the daily plan; a date = that day's own plan (an empty list = nothing cooked that day). */
  saveCookingPlan(input: { date: string | null; rows: PlanRow[] }): Promise<void>;
  /** What the plan of a date is short of goes onto each supplier's draft bill (drafts never change stock). */
  draftShortageBills(date: string): Promise<{ drafts: { supplierId: Uuid; supplierName: string; lines: number }[]; withoutSupplier: string[] }>;
  /** When the plan is checked against the stock (Owner): e.g. 20:00 for tomorrow, 07:00 for today. */
  saveCookingChecks(checks: CookingCheckTime[]): Promise<void>;

  /** I4 (owner, 2026-11-09): give ready food of the same dish to a line that is not made yet; its raw stock is not taken again. Kitchen. */
  giveAvailableFood(orderItemId: Uuid, availableId: Uuid): Promise<void>;
  /** I4: a ticket that was cooking when its order was cancelled: KEEP = finish it and keep it for another order, STOP = stop (spoilt = wastage with this reason) */
  decideCancelledTicket(ticketId: Uuid, decision: 'KEEP' | 'STOP', spoiltReason: string | null): Promise<void>;
  /** I4: Stock → Available Food and the closing review */
  getAvailableFood(): Promise<AvailableFoodView>;
  /** Closing review of one food: wastage or staff meal with a reason, or KEEP for tomorrow where the dish allows it (Owner / Manager) */
  closeAvailableFood(availableId: Uuid, kind: 'WASTE' | 'STAFF_MEAL' | 'KEEP', reason: string): Promise<void>;
  /** When the closing review is due (Owner, Settings) */
  saveClosingTime(time: string): Promise<void>;
  /** A supplier added from the ingredient form (name + phone). */
  addSupplier(input: SupplierInput): Promise<Supplier>;
  /** Suppliers S1: every supplier with today's purchases, what we owe and the status. */
  getSuppliers(): Promise<SuppliersView>;
  /** One supplier's screen: totals, his products with their stock, and his khata (today or everything). */
  getSupplierWorkspace(supplierId: Uuid, period: KhataPeriod): Promise<SupplierWorkspace>;
  saveSupplier(input: SupplierProfileInput): Promise<Supplier>;
  /** Edit order: the suppliers in his order (every active supplier once); an empty list = back to A–Z. */
  setSupplierOrder(supplierIds: Uuid[]): Promise<void>;
  /** Receive a delivery: PURCHASE stock movements + one khata entry; the rate becomes the product's purchase price. */
  receiveStock(input: ReceiveStockInput): Promise<KhataEntry>;
  paySupplier(input: SupplierPaymentInput): Promise<KhataEntry>;
  /** Save a purchase bill: stock and khata once, plus the payment made with it. Removes his draft. */
  savePurchaseBill(input: PurchaseBillInput): Promise<PurchaseBillResult>;
  getPurchaseDraft(supplierId: Uuid): Promise<PurchaseDraft | null>;
  /** Keeps one unfinished bill per supplier (a new save replaces it). */
  savePurchaseDraft(draft: Omit<PurchaseDraft, 'savedAt'>): Promise<void>;
  deletePurchaseDraft(supplierId: Uuid): Promise<void>;
  /** Add New Product from a bill: a new shared inventory product, put on this supplier's list in the same step. */
  addSupplierProduct(supplierId: Uuid, input: IngredientInput): Promise<Ingredient>;
  /** Edit Product from his list or a bill: the shared product changes for everyone; the price is also his own last rate. */
  updateSupplierProduct(supplierId: Uuid, input: IngredientInput): Promise<Ingredient>;
  /** Takes a product off this supplier's list only; the product, its stock and history stay. */
  removeSupplierProduct(supplierId: Uuid, ingredientId: Uuid): Promise<void>;

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

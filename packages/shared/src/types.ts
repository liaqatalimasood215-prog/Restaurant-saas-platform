import type { TicketStatus } from './kitchen';
import type { OrderChannel, OrderStatus, OrderType, TableStatus } from './order-status';
import type { PaymentKind, PaymentMethod } from './payments';
import type { BillTotals, DiscountInput, TaxSettings } from './pricing';
import type { StaffRole } from './roles';
import type { InviteKind, InviteStatus } from './staff';
import type { Permission } from './permissions';
import type { DaySummary } from './reports';
import type { MenuUnit } from './units';
import type { OnlinePublishing, WebsiteConfig } from './online-app';

/**
 * Data shapes shared by the API contract (MASTER_PROMPT.md §9). Phase 1 screens get these from the
 * DemoAdapter; from Phase 4 the backend returns exactly the same shapes, so screens are not rebuilt.
 * Every business record carries restaurantId (+ branchId for branch-level data).
 * The server takes these ids from the login token — never from the request.
 */
export type Uuid = string;
/** Whole paisa (Rs. 1 = 100 paisa) */
export type Paisa = number;
/** ISO 8601 date-time string */
export type IsoDateTime = string;

export interface RestaurantScoped {
  restaurantId: Uuid;
}

export interface BranchScoped extends RestaurantScoped {
  branchId: Uuid;
}

export interface Restaurant {
  id: Uuid;
  name: string;
  slug: string;
}

export interface Branch extends RestaurantScoped {
  id: Uuid;
  name: string;
  slug: string;
  phone: string;
  address: string;
  timezone: string;
  /** "HH:MM" */
  businessDayStart: string;
  tax: TaxSettings;
  serviceChargeBps: number;
  roundToRupee: boolean;
  receiptHeader: string;
  receiptFooter: string;
  onlineOrdersEnabled: boolean;
  deliveryFee: Paisa;
  minOrder: Paisa;
  defaultPrepMinutes: number;
  /** Owner setting: Managers may see money reports */
  managerCanSeeMoneyReports: boolean;
}

export interface StaffUser extends RestaurantScoped {
  id: Uuid;
  /** null = all branches (Owner only) */
  branchId: Uuid | null;
  name: string;
  phone: string;
  role: StaffRole;
  isActive: boolean;
  /** Kitchen users: their stations; empty = all stations */
  stationIds: Uuid[];
  /** Waiters: their assigned tables; empty = all tables */
  tableIds: Uuid[];
  /** Optional; used for activation links once an email service is approved (Phase 4) */
  email: string | null;
  /** When the person opened their activation link and created a PIN; null = not activated yet */
  activatedAt: IsoDateTime | null;
  /** Deleted by the Owner but kept because old bills or history name this person; hidden everywhere else */
  archivedAt: IsoDateTime | null;
  /** Short employee number, e.g. EMP007 — given once, never reused */
  employeeCode: string;
  /** This person's own permissions; null = follows the role (Role Permissions) */
  permissions: Permission[] | null;
  lastLoginAt: IsoDateTime | null;
  /** Riders: set by the rider in the Rider App; missing = Online (riders.ts) */
  riderOnline?: boolean;
}

/** One role on the Role Permissions screen. */
export interface RolePermissionsEntry {
  role: StaffRole;
  permissions: Permission[];
  recommended: Permission[];
  /** The Owner changed this role away from the recommended set */
  customized: boolean;
}

/** The latest activation or PIN-reset link of a staff member, as the Owner sees it (never the token). */
export interface StaffInviteView {
  kind: InviteKind;
  status: InviteStatus;
  sentAt: IsoDateTime;
  expiresAt: IsoDateTime;
}

/** One row on the Staff page. */
export interface StaffMember {
  user: StaffUser;
  invite: StaffInviteView | null;
}

/** What the activation page shows before the person creates a PIN (no login needed). */
export interface ActivationInfo {
  kind: InviteKind;
  name: string;
  role: StaffRole;
  restaurantName: string;
}

export interface KitchenStation extends BranchScoped {
  id: Uuid;
  name: string;
  autoReady: boolean;
  warnMinutes: number;
  lateMinutes: number;
  sort: number;
}

export interface Area extends BranchScoped {
  id: Uuid;
  name: string;
  sort: number;
  /** An inactive area and its tables are hidden from Tables, POS and Waiter Orders */
  isActive: boolean;
}

export interface DiningTable extends BranchScoped {
  id: Uuid;
  areaId: Uuid;
  /** Unique inside its area */
  name: string;
  /** Seating capacity, a positive whole number */
  seats: number;
  /** false = Out of service: shown on the Tables board, but no new bill can be opened */
  isActive: boolean;
  /** Display order inside the area */
  sort: number;
  /** Staff marked the table for cleaning; cleared when it is marked clean or the next guests are seated */
  cleaning: boolean;
  /** A removed table that was used keeps its row for the history of old bills */
  archivedAt: IsoDateTime | null;
}

export interface MenuCategory extends RestaurantScoped {
  id: Uuid;
  /** null = all branches */
  branchId: Uuid | null;
  name: string;
  sort: number;
  isActive: boolean;
}

export interface ItemVariant {
  id: Uuid;
  name: string;
  price: Paisa;
  sort: number;
}

export interface Modifier {
  id: Uuid;
  name: string;
  price: Paisa;
  isAvailable: boolean;
}

export interface ModifierGroup extends RestaurantScoped {
  id: Uuid;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

export interface MenuItem extends RestaurantScoped {
  id: Uuid;
  branchId: Uuid | null;
  categoryId: Uuid;
  stationId: Uuid;
  name: string;
  description: string;
  basePrice: Paisa;
  /** Selling unit: the kitchen sees "1 kg", not "1 ×" */
  unit: MenuUnit;
  /** In stock / can be sold (POS + online) */
  isAvailable: boolean;
  /** Shown in the Customer App */
  isOnline: boolean;
  sort: number;
  variants: ItemVariant[];
  modifierGroupIds: Uuid[];
  /** Removed from the menu but kept because old orders or held bills point at it; hidden everywhere */
  archivedAt: IsoDateTime | null;
}

/** Snapshot of the chosen add-on, copied at order time */
export interface OrderItemModifier {
  name: string;
  price: Paisa;
}

export interface OrderItem extends BranchScoped {
  id: Uuid;
  orderId: Uuid;
  menuItemId: Uuid | null;
  /** Copies at order time — menu changes never change old orders */
  name: string;
  variantName: string | null;
  modifiers: OrderItemModifier[];
  unitPrice: Paisa;
  quantity: number;
  unit: MenuUnit;
  lineTotal: Paisa;
  note: string;
  roundNo: number;
  stationId: Uuid;
  ticketId: Uuid;
  isVoid: boolean;
  voidReason: string | null;
  voidedBy: Uuid | null;
  voidedAt: IsoDateTime | null;
}

export interface KitchenTicket extends BranchScoped {
  id: Uuid;
  orderId: Uuid;
  stationId: Uuid;
  roundNo: number;
  status: TicketStatus;
  createdAt: IsoDateTime;
  startedAt: IsoDateTime | null;
  readyAt: IsoDateTime | null;
  servedAt: IsoDateTime | null;
}

export interface PaymentEntry extends BranchScoped {
  id: Uuid;
  orderId: Uuid;
  kind: PaymentKind;
  method: PaymentMethod;
  amount: Paisa;
  tipAmount: Paisa;
  cashReceived: Paisa | null;
  changeGiven: Paisa | null;
  reference: string | null;
  receivedBy: Uuid;
  relatedPaymentId: Uuid | null;
  reason: string | null;
  createdAt: IsoDateTime;
}

export interface OrderDiscount {
  input: DiscountInput;
  reason: string;
  givenBy: Uuid;
}

/** A discount the Owner/Manager chose on a bill before it was sent (saved with the new order). */
export interface DiscountChoice {
  input: DiscountInput;
  reason: string;
}

/** A waiter asked for the bill; the cashier accepts it (the waiter sees the acknowledgement). */
export interface BillRequest {
  requestedBy: Uuid;
  requestedAt: IsoDateTime;
  acceptedBy: Uuid | null;
  acceptedAt: IsoDateTime | null;
}

export interface StatusHistoryEntry {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: Uuid | null;
  reason: string | null;
  changedAt: IsoDateTime;
}

export interface Order extends BranchScoped {
  id: Uuid;
  type: OrderType;
  channel: OrderChannel;
  status: OrderStatus;
  businessDate: string;
  dailyNumber: number;
  /** Given when the order is paid; sequential per branch, never reused */
  invoiceNumber: number | null;
  tableId: Uuid | null;
  /** Which customer at the table this is (T1-2 = 2); missing = the first. See sub-orders.ts */
  subOrderNo?: number;
  /** Another customer sat at the table while this order was open: it is called T1-1, not T1 */
  tableShared?: boolean;
  waiterId: Uuid | null;
  guests: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  riderId: Uuid | null;
  prepMinutes: number | null;
  note: string;
  items: OrderItem[];
  tickets: KitchenTicket[];
  payments: PaymentEntry[];
  discount: OrderDiscount | null;
  /** Tax, service charge, rounding and delivery fee as they were when the order was made (Settings changes never touch it) */
  pricing: OrderPricing;
  /** Calculated with calculateBill() — never typed in by a person */
  totals: BillTotals;
  paidTotal: Paisa;
  refundedTotal: Paisa;
  tipTotal: Paisa;
  billRequest: BillRequest | null;
  /** Private customer tracking link token (delivery/takeaway); long and random */
  trackingToken: string | null;
  /** Rider cash settlement that included this order's cash on delivery */
  cashSettlementId: Uuid | null;
  /** How often the paid receipt was printed; every print after the first is marked DUPLICATE */
  receiptPrints: number;
  history: StatusHistoryEntry[];
  createdBy: Uuid | null;
  createdAt: IsoDateTime;
}

/** The bill settings an order keeps for its whole life. */
export interface OrderPricing {
  tax: TaxSettings;
  /** Dine-in service charge in basis points */
  serviceChargeBps: number;
  roundToRupee: boolean;
  /** Delivery orders only */
  deliveryFee: Paisa;
}

/** Settings screen (Owner): the restaurant, its branch and the kitchen stations with what blocks removing them. */
export interface SettingsView {
  restaurant: Restaurant;
  branch: Branch;
  stations: { station: KitchenStation; itemCount: number; openTickets: number; chefCount: number }[];
}

/** A restaurant's look on its own website (white-label; logo upload comes with file storage in Phase 7). */
export interface StoreBrand {
  /** Short text in the logo circle until a real logo, e.g. "AP" */
  logoText: string;
  /** Main colour (hex); white text must stay readable on it */
  primaryColor: string;
  tagline: string;
  /** Food pictures of the welcome area until real photos */
  heroEmoji: string[];
}

/** What the public website of one branch shows. Only items that are online; no staff or money data. */
export interface PublicStore {
  restaurant: { id: Uuid; name: string; slug: string };
  branch: { id: Uuid; name: string; slug: string; phone: string; address: string; openingHours: string };
  brand: StoreBrand;
  /** Open now (hours); closed or online orders OFF = "Not taking orders right now" */
  isOpen: boolean;
  onlineOrdersEnabled: boolean;
  deliveryFee: Paisa;
  minOrder: Paisa;
  defaultPrepMinutes: number;
  pricing: OrderPricing;
  categories: MenuCategory[];
  items: MenuItem[];
  addonGroups: ModifierGroup[];
}

/** The private tracking page of one online order (reached only through its long random token). */
export interface TrackedOrder {
  token: string;
  restaurantSlug: string;
  branchSlug: string;
  restaurantName: string;
  restaurantPhone: string;
  kind: 'DELIVERY' | 'TAKEAWAY';
  status: OrderStatus;
  dailyNumber: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note: string;
  /** Copies made at order time */
  items: { name: string; variantName: string | null; modifiers: string[]; quantity: number; unit: MenuUnit; lineTotal: Paisa; note: string }[];
  /** What was ordered, for "Order again" */
  lines: DraftItemInput[];
  totals: BillTotals;
  prepMinutes: number;
  /** Each step reached, with its time */
  history: { status: OrderStatus; at: IsoDateTime }[];
}

/** Online App page: the switches and the items with their online state. */
export interface OnlineAppView {
  onlineOrdersEnabled: boolean;
  deliveryFee: Paisa;
  minOrder: Paisa;
  defaultPrepMinutes: number;
  /** "/restaurant-slug/branch-slug" on the Customer App */
  customerPath: string;
  publishing: OnlinePublishing;
  website: WebsiteConfig;
  /** Same values as Settings; shown on the Website tab, changed in one place */
  branchPhone: string;
  branchAddress: string;
  /** Sample restaurants the website previews can also show; they keep their own menus */
  samplePreviews: { name: string; path: string }[];
  categories: MenuCategory[];
  items: MenuItem[];
}

/** Today's Summary screen: one business day, with the names of the people in it. */
export interface DaySummaryView {
  /** YYYY-MM-DD */
  businessDate: string;
  today: string;
  /** Business days that have orders (and today), newest first */
  dates: string[];
  summary: DaySummary;
  /** Staff names for the ids in the summary (waiters, who gave a discount, voided, refunded, cancelled) */
  names: Record<Uuid, string>;
  /** Cash for delivered orders still with the riders (not settled yet) */
  withRiders: Paisa;
}

/** One card on the live table board; the table status is derived from its open order. */
export interface TableBoardEntry {
  table: DiningTable;
  status: TableStatus;
  /** The first open sub-order; null = nobody is seated */
  order: Order | null;
  /** Every open sub-order of the table, by number */
  orders: Order[];
  /** The number the next customer at this table gets */
  nextSubOrderNo: number;
  waiterName: string | null;
}

/** Areas and the live table board of one branch. */
export interface FloorPlan {
  areas: Area[];
  tables: TableBoardEntry[];
}

/** One area in "Manage Areas". */
export interface AreaSetupEntry {
  area: Area;
  /** Tables of the area that are not removed */
  tableCount: number;
  /** Running or held bills on the area's tables; an area with any cannot be deactivated */
  openBills: number;
}

/** One table in the table setup, with what blocks changing it. */
export interface TableSetupEntry {
  table: DiningTable;
  status: TableStatus;
  /** A running or held bill: the table cannot be removed, taken out of service or moved to another area */
  hasOpenBill: boolean;
  /** Has old bills or is assigned to a waiter: removing it archives it instead of deleting it */
  used: boolean;
}

/** All areas (also inactive) and all tables that are not removed — Owner / Manager only. */
export interface TableSetup {
  areas: AreaSetupEntry[];
  tables: TableSetupEntry[];
}

/** Menu screen (Owner, Manager): every category (also hidden) and item (not removed), add-on groups, stations. */
export interface MenuSetup {
  categories: { category: MenuCategory; itemCount: number }[];
  items: MenuItem[];
  addonGroups: { group: ModifierGroup; itemCount: number }[];
  stations: KitchenStation[];
}

/** Everything a staff order screen needs to show the menu. */
export interface MenuSnapshot {
  categories: MenuCategory[];
  items: MenuItem[];
  modifierGroups: ModifierGroup[];
  stations: KitchenStation[];
}

/** One ticket on a Kitchen Display, with what the kitchen needs to read from 2 metres. */
export interface KitchenTicketView {
  ticket: KitchenTicket;
  orderType: OrderType;
  orderStatus: OrderStatus;
  dailyNumber: number;
  tableName: string | null;
  waiterName: string | null;
  items: OrderItem[];
}

/** An item line inside a notification, e.g. "2 × Classic Pizza (Medium)" or "1 kg Chicken Karahi". */
export interface NotificationItem {
  quantity: number;
  unit: MenuUnit;
  name: string;
  variantName: string | null;
}

/**
 * Staff notifications (owner workflow 2026-10-28). The server decides who receives each one:
 * - FOOD_READY: a READY ticket of a dine-in order, for the Service Waiter assigned to the table
 *   (or, without one, the Super Waiter who took the order) and for Owner/Manager.
 * - BILL_REQUESTED: a table asked for the bill, for Cashier/Owner/Manager until accepted.
 * - BILL_ACCEPTED: the cashier accepted, for the waiter who asked, until the bill is paid.
 * - WAITER_CALLED: the cashier pressed "Call Waiter", for 15 minutes. For a table: the Service Waiter of
 *   that table (or, without one, the Super Waiter of the order). Without a table (a counter customer):
 *   every waiter on duty.
 */
export type StaffNotification =
  | {
      kind: 'FOOD_READY';
      id: string;
      orderId: Uuid;
      tableId: Uuid;
      tableName: string;
      stationName: string;
      items: NotificationItem[];
      at: IsoDateTime;
    }
  | { kind: 'BILL_REQUESTED'; id: string; orderId: Uuid; tableId: Uuid; tableName: string; total: Paisa; requestedByName: string; at: IsoDateTime }
  | { kind: 'BILL_ACCEPTED'; id: string; orderId: Uuid; tableId: Uuid; tableName: string; acceptedByName: string; at: IsoDateTime }
  | { kind: 'WAITER_CALLED'; id: string; tableId: Uuid | null; tableName: string | null; calledByName: string; at: IsoDateTime }
  /** A customer order waiting for Accept / Reject (repeating alarm until answered) */
  | { kind: 'ONLINE_ORDER'; id: string; orderId: Uuid; dailyNumber: number; orderType: OrderType; total: Paisa; customerName: string; at: IsoDateTime }
  /** A delivery or takeaway order is READY: assign a rider or hand it over */
  | { kind: 'COUNTER_READY'; id: string; orderId: Uuid; dailyNumber: number; orderType: OrderType; customerName: string; at: IsoDateTime };

/** The cashier called a waiter from the POS ("Call Waiter"); tableId is null for the counter. */
export interface WaiterCall extends BranchScoped {
  id: Uuid;
  tableId: Uuid | null;
  calledBy: Uuid;
  calledAt: IsoDateTime;
}

/** A bill the cashier put on hold before sending it to the kitchen (not an order yet). */
export interface HeldBill extends BranchScoped {
  id: Uuid;
  type: OrderType;
  tableId: Uuid | null;
  guests: number | null;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  note: string;
  items: DraftItemInput[];
  /** Discount the Owner/Manager chose before the bill was held */
  discount: DiscountChoice | null;
  heldBy: Uuid;
  heldAt: IsoDateTime;
}

/** A customer found in earlier orders of this restaurant (a full customer list comes in P7). */
export interface CustomerSummary {
  name: string;
  phone: string;
  address: string;
  orderCount: number;
  lastOrderAt: IsoDateTime;
}

/** An order with the names a screen needs (waiter, rider, people in the timeline, payments). */
export interface OrderView {
  order: Order;
  tableName: string | null;
  /** Staff id → name for everyone the order mentions */
  names: Record<Uuid, string>;
}

/** Cash a rider collected on delivery and has not handed to the cashier yet. */
export interface RiderCashView {
  rider: StaffUser;
  /** Orders assigned and not delivered yet */
  activeDeliveries: number;
  cashToSettle: Paisa;
  unsettledOrderIds: Uuid[];
}

export interface RiderCashSettlement extends BranchScoped {
  id: Uuid;
  riderId: Uuid;
  amount: Paisa;
  orderIds: Uuid[];
  settledBy: Uuid;
  settledAt: IsoDateTime;
}

/** An item the waiter or cashier adds; the server looks up every price itself. */
export interface DraftItemInput {
  menuItemId: Uuid;
  variantId: Uuid | null;
  modifierIds: Uuid[];
  note: string;
  quantity: number;
}

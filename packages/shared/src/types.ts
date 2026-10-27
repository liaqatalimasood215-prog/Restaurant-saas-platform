import type { TicketStatus } from './kitchen';
import type { OrderChannel, OrderStatus, OrderType, TableStatus } from './order-status';
import type { PaymentKind, PaymentMethod } from './payments';
import type { BillTotals, DiscountInput, TaxSettings } from './pricing';
import type { StaffRole } from './roles';

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
}

export interface DiningTable extends BranchScoped {
  id: Uuid;
  areaId: Uuid;
  name: string;
  seats: number;
  isActive: boolean;
  sort: number;
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
  /** In stock / can be sold (POS + online) */
  isAvailable: boolean;
  /** Shown in the Customer App */
  isOnline: boolean;
  sort: number;
  variants: ItemVariant[];
  modifierGroupIds: Uuid[];
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
  /** Calculated with calculateBill() — never typed in by a person */
  totals: BillTotals;
  paidTotal: Paisa;
  refundedTotal: Paisa;
  tipTotal: Paisa;
  history: StatusHistoryEntry[];
  createdBy: Uuid | null;
  createdAt: IsoDateTime;
}

/** One card on the live table board; the table status is derived from its open order. */
export interface TableBoardEntry {
  table: DiningTable;
  status: TableStatus;
  order: Order | null;
  waiterName: string | null;
}

/** Areas and the live table board of one branch. */
export interface FloorPlan {
  areas: Area[];
  tables: TableBoardEntry[];
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

/** "Food ready" alert for floor staff: a READY ticket of a dine-in order that is not served yet. */
export interface ReadyAlert {
  ticketId: Uuid;
  orderId: Uuid;
  tableId: Uuid;
  tableName: string;
  stationName: string;
  readyAt: IsoDateTime;
}

/** An item the waiter or cashier adds; the server looks up every price itself. */
export interface DraftItemInput {
  menuItemId: Uuid;
  variantId: Uuid | null;
  modifierIds: Uuid[];
  note: string;
  quantity: number;
}

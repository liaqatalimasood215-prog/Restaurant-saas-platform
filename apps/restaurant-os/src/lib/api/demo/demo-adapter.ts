import {
  MAX_BULK_TABLES,
  MAX_NAME_LENGTH,
  MAX_QUANTITY_PER_LINE,
  sizeMixFor,
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
  onHandOf,
  purchaseRecipeCost,
  recipeForAmount,
  shortages,
  type PurchaseRecipeRow,
  type RecipeVersion,
  stockStatus,
  stockValueOf,
  summarizeInventory,
  type Ingredient,
  type InventoryView,
  SUPPLIER_CATEGORIES,
  checkReceipt,
  checkSupplierPayment,
  deliveriesPerProduct,
  averageMainPrice,
  mulDivRound,
  billTotals,
  buyAmount,
  buyStockMilli,
  checkPackings,
  checkPurchaseBill,
  findBuyOption,
  supplierRateKey,
  isSupplierPhoto,
  MAX_RECEIPT_LINES,
  type PurchaseBillProblem,
  khataBalances,
  khataSummary,
  sortByUse,
  sortSuppliers,
  lineCosts,
  type KhataEntry,
  type SuppliersView,
  type SupplierWorkspace,
  checkRecipe,
  checkRecipeScale,
  currentVersion,
  displayFactorMilli,
  scaleCost,
  scaleLines,
  type RecipeLine,
  type RecipeScale,
  type ScaleProblem,
  type PaymentProblem,
  MAX_SUPPLIER_AMOUNT,
  type Supplier,
  foodCostOf,
  ingredientCost,
  linesCost,
  makeCostBook,
  sameRecipe,
  sameTarget,
  summarizeFoodCost,
  type MenuRecipeRow,
  type Recipe,
  type RecipeTarget,
  type RecipesView,
  balancesAfter,
  type StockLedgerQuery,
  type StockLedgerView,
  MILLI,
  MAX_REVERSE_REASON,
  daysBetween,
  fefoOrder,
  checkDiscardHours,
  checkLotDate,
  checkRelease,
  discardAtOf,
  isUsableState,
  lotDateState,
  lotLedger,
  lotState,
  needsReview,
  usableOfLots,
  type ExpiryState,
  type LotClock,
  type LotDateProblem,
  type LotRow,
  type ReleaseProblem,
  type StockLot,
  checkDecision,
  checkReverse,
  checkWaste,
  cookedWasteCost,
  summarizeWaste,
  wasteBusinessDate,
  wasteCost,
  wasteStockMilli,
  type CookedPrice,
  type ReverseProblem,
  type DecisionProblem,
  type WasteEvent,
  type WasteLine,
  type WasteRequest,
  type WasteRequestRow,
  type WasteProblem,
  type WasteView,
  checkPortion,
  portionLines,
  sameDish,
  sameName,
  lineRecipeTargets,
  verifiedVersion,
  checkPickup,
  checkUndoPickup,
  kdsState,
  ticketPickup,
  waitingTooLong,
  type PickupFailure,
  DEFAULT_COOKING_CHECKS,
  MAX_MOVEMENT_NOTE,
  MAX_COOK_MILLI,
  MAX_COOKING_CHECKS,
  batchPlan,
  checkBatch,
  dueChecks,
  isClockTime,
  localClock,
  nextDate,
  paisaToInput,
  planLeft,
  planOf,
  planUses,
  stockNeeds,
  takesRawTwice,
  type BatchProblem,
  type CookingBatch,
  type CookingCheckTime,
  type CookMode,
  type PlanRow,
  DEFAULT_CLOSING_TIME,
  MAX_WASTE_REASON,
  availableState,
  checkGive,
  checkOutcome,
  checkReuse,
  closingReviewDue,
  givenPortions,
  netTaken,
  newItemStock,
  outcomeChoices,
  reuseOf,
  safeUntilOf,
  saleUses,
  type AvailableFood,
  type FoodOutcome,
  type FoodWaste,
  type GiveProblem,
  type OutcomeProblem,
  type ReuseSetting,
  type StockHow,
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
  type RecipeInput,
  type ScaledRecipeInput,
  type SellPreparedInput,
  type CookingBatchInput,
  type CookingPlanView,
  type AvailableFoodView,
  type MadeFoodLine,
  type SupplierInput,
  type KhataPeriod,
  type PurchaseBillInput,
  type PurchaseBillResult,
  type RecipeUpdate,
  type PurchaseDraft,
  type ReceiveStockInput,
  type SupplierPaymentInput,
  type SupplierProfileInput,
  StockWasteInput,
  LotDateInput,
  WasteDecisionInput,
  WasteReportView,
  WasteRequestInput,
} from '../client';
import type { DemoData, DemoInvite } from './seed';
import { DemoStore } from './store';
import { newId } from '@/lib/new-id';

/**
 * No made-up network delay (owner, 2026-11-06: POS and Tables felt slow; every call waited 150–350 ms, a screen
 * with two calls almost half a second). The answer still comes asynchronously, like a real server's.
 */
const MIN_DELAY_MS = 0;
const MAX_DELAY_MS = 0;

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

/** I4: what happens to food that was made, after a cancel or void (owner, 2026-11-09) */
const OUTCOME_MESSAGES: Record<OutcomeProblem, string> = {
  CHOOSE: 'This food was already made: choose what happens to it.',
  NOT_ALLOWED: 'This choice is not possible for this food.',
  NOT_SAFE: 'Confirm that the food was not served and is safe, or choose wastage.',
  REASON_REQUIRED: 'Write the reason for the wastage.',
};
const GIVE_MESSAGES: Record<GiveProblem, string> = {
  NOT_SAME_DISH: 'This ready food is a different dish, size or add-ons.',
  NOTHING_LEFT: 'This food was already given to another order.',
  TIME_OVER: 'This food is past its safe time and cannot be given.',
  ALREADY_MADE: 'This line is already made.',
  VOID: 'This line was voided.',
  NOT_TRACKED_LINE: 'This line is from before stock tracking.',
  ALREADY_GIVEN: 'This line already has its food.',
};

function wait(): Promise<void> {
  const ms = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const nowIso = () => new Date().toISOString();
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

/** Cooking batches (I3, owner 2026-11-09) */
const BATCH_MESSAGES: Record<BatchProblem, string> = {
  AMOUNT_INVALID: 'Type how much was cooked (more than 0).',
  ACTUAL_INVALID: 'Type how much was actually made (more than 0).',
  PLATE_INVALID: 'Type the grams in one plate (more than 0).',
  NOT_VERIFIED: 'Verify the recipe first: only a verified recipe takes stock.',
  SHORT: 'Not enough in stock.',
  REASON_REQUIRED: 'Please write a reason.',
};

const nameOfSupplier = (suppliers: readonly Supplier[], id: string | null) => (id ? (suppliers.find((s) => s.id === id)?.name ?? null) : null);

/** Picked up at the pass (owner, 2026-11-09) */
const PICKUP_MESSAGES: Record<PickupFailure, string> = {
  WRONG_ROLE: 'Your role is not allowed to do this.',
  DINE_IN_ONLY: 'Delivery and takeaway food is picked up by the rider or at the counter.',
  NOT_READY: 'This food is not ready yet.',
  NOT_PICKED_UP: 'This food was not picked up.',
  ALREADY_SERVED: 'This food is already served.',
  UNDO_EXPIRED: 'Undo is only possible within 5 minutes of the pickup.',
  NOT_OWN_STATION: 'This ticket belongs to another kitchen station.',
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
const PURCHASE_BILL_MESSAGES: Record<PurchaseBillProblem, string> = {
  NO_LINES: 'Add at least one product to the bill.',
  TOO_MANY_LINES: 'A bill can have up to 30 products.',
  PRODUCT_REQUIRED: 'Choose products from the list.',
  DUPLICATE_PRODUCT: 'A product is on the bill twice.',
  QUANTITY_INVALID: 'Type the quantity of every product.',
  RATE_INVALID: 'Type the price of every product.',
  UNITS_INVALID: 'A product has no package size. Set it in Stock first.',
  NOTE_TOO_LONG: 'Keep the note to 200 characters.',
  DISCOUNT_INVALID: 'The discount cannot be more than the subtotal.',
  PAID_INVALID: 'Type the paid amount in rupees, or 0.',
  PAID_MORE_THAN_BILL: 'Paid now cannot be more than this bill. Pay older dues with Settle Payment.',
  METHOD_REQUIRED: 'Choose how it was paid.',
  DATE_INVALID: 'The bill date cannot be in the future.',
  BILL_NO_TOO_LONG: 'Keep the bill number to 30 characters.',
};

const PAYMENT_MESSAGES: Record<PaymentProblem, string> = {
  AMOUNT_INVALID: 'Type the amount paid.',
  MORE_THAN_DUE: 'That is more than what we owe this supplier.',
  NOTHING_DUE: 'Nothing is owed to this supplier.',
  METHOD_INVALID: 'Choose how it was paid.',
  DATE_INVALID: 'The payment date cannot be in the future.',
  NOTE_TOO_LONG: 'Keep the note to 200 characters.',
};

const SCALE_MESSAGES: Record<ScaleProblem, string> = {
  BASE_QUANTITY_INVALID: 'Type how much the base recipe makes (for example 1 kg).',
  NO_SIZES: 'Tick at least one size.',
  SIZE_QUANTITY_INVALID: 'Every size needs a quantity (at most 100 × the base).',
  SIZE_DUPLICATE: 'A size is in the list twice.',
};

/** W1: why a waste incident cannot be posted */
const WASTE_MESSAGES: Record<WasteProblem, string> = {
  NO_LINES: 'Add at least one item.',
  TOO_MANY_LINES: 'At most 20 items in one entry.',
  STAGE_INVALID: 'Choose where it happened.',
  TIME_INVALID: 'The time cannot be in the future or more than 7 days back.',
  NOTE_TOO_LONG: 'The note is too long (140 letters at most).',
  ITEM_REQUIRED: 'Choose a raw ingredient, packaging or cooked food in use.',
  DUPLICATE_ITEM: 'This item is in the entry twice. Use “+ another unit” on one line.',
  TOO_MANY_PARTS: 'At most 3 units on one line.',
  DUPLICATE_UNIT: 'The same unit twice on one line.',
  QUANTITY_INVALID: 'Type a quantity above 0.',
  REASON_REQUIRED: 'Choose why it was thrown away.',
  NOTE_REQUIRED: 'Write what happened (reason Other).',
  MORE_THAN_ON_HAND: 'More than is in stock. Correct the stock first if the stock is wrong.',
  KIND_INVALID: 'Choose Waste, Staff meal or Donation.',
  LOT_INVALID: 'Choose a delivery of this item.',
  MORE_THAN_IN_LOT: 'More than is left in this delivery.',
  NOT_USABLE: 'Only stock that may be used: expired or held food is never eaten or given away.',
};

/** W4: why a waste report cannot be decided */
const DECISION_MESSAGES: Record<DecisionProblem, string> = {
  NOT_PENDING: 'This report was already decided.',
  REASON_REQUIRED: 'Write why the report is rejected.',
  NOTE_TOO_LONG: 'The reason is too long (140 letters at most).',
};

/** W3: why a date or a discard time cannot be saved, and why held food cannot be released */
const LOT_DATE_MESSAGES: Record<LotDateProblem, string> = {
  DATE_INVALID: 'Type the date from the label.',
  KIND_INVALID: 'Choose Use-by or Best-before.',
  HOURS_INVALID: 'Discard time: whole hours, 1 to 72.',
};
const RELEASE_MESSAGES: Record<ReleaseProblem, string> = {
  NOT_HELD: 'This stock is not on hold.',
  NOTHING_LEFT: 'Nothing is left of this stock.',
  EXPIRED: 'Its date has passed: expired food is never released. Record it as waste.',
  NOT_SAFE: 'Confirm that it is safe to use, else record it as waste.',
};

/** W2: why an entry cannot be reversed */
const REVERSE_MESSAGES: Record<ReverseProblem, string> = {
  NOT_POSTED: 'This entry was already reversed.',
  ORDER_FOOD: 'Order food that was wasted or eaten cannot be reversed: it has left the kitchen.',
  REASON_REQUIRED: 'Write why it is reversed.',
  NOTE_TOO_LONG: 'The reason is too long (140 letters at most).',
};

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

/** "Chicken Karahi (1 kg)" for ready food */
function foodLabel(food: Pick<AvailableFood, 'name' | 'variantName'>): string {
  return food.variantName ? `${food.name} (${food.variantName})` : food.name;
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
        // I4: ready food of a dish waiting for another order
        readyFood: (data.inventory.availableFood ?? [])
          .filter((f) => availableState(f, Date.now()) === 'AVAILABLE')
          .map((f) => ({ menuItemId: f.menuItemId, variantName: f.variantName, remaining: f.remaining })),
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
        this.syncStock(data, target, user.id);
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

    // Several weight sizes on one line (1 kg + ½ kg): one pot for the kitchen, the sum of the size prices
    const mix = draft.sizes?.length ? sizeMixFor(menuItem, draft.sizes) : null;
    if (draft.sizes?.length && (!mix || draft.variantId)) throw new ApiError('VALIDATION', `These sizes of ${menuItem.name} cannot go on one line.`);
    const variant = menuItem.variants.find((v) => v.id === draft.variantId) ?? null;
    if (menuItem.variants.length > 0 && !variant && !mix) throw new ApiError('VALIDATION', `Choose a size for ${menuItem.name}.`);
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
      variantPrice: mix?.price ?? variant?.price,
      modifierPrices: chosen.map((m) => m.price),
    });
    return {
      id: newId(),
      restaurantId: order.restaurantId,
      branchId: order.branchId,
      orderId: order.id,
      menuItemId: menuItem.id,
      name: menuItem.name,
      variantName: mix?.label ?? variant?.name ?? null,
      ...(mix && draft.sizes ? { sizeMix: draft.sizes.map((s) => ({ variantId: s.variantId, quantity: s.quantity })) } : {}),
      // I2: the ids and the verified recipe versions of that day, for stock use later (old lines have none)
      variantId: variant?.id ?? null,
      modifierIds: chosen.map((m) => m.id),
      recipeVersions: this.recipeVersionsOf(data, { menuItemId: menuItem.id, variantId: variant?.id ?? null, sizeMix: draft.sizes, modifierIds: chosen.map((m) => m.id) }),
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
      // I4: taken at the kitchen's Ready, once
      stock: newItemStock(),
    };
  }

  voidItem(orderItemId: string, reason: string, food?: FoodOutcome): Promise<Order> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'item.void');
        if (!reason.trim()) throw ruleError('REASON_REQUIRED');
        const order = data.orders.find((o) => o.items.some((i) => i.id === orderItemId));
        const item = order?.items.find((i) => i.id === orderItemId);
        if (!order || !item) throw new ApiError('NOT_FOUND', 'Item not found.');
        if (!OPEN_DINE_IN.includes(order.status)) throw new ApiError('CONFLICT', 'This order is closed.');
        if (item.isVoid) return order;
        // I4: food already made is never wastage by itself: its outcome is chosen (owner, 2026-11-09)
        const made = this.madeLine(data, order, item);
        if (made.made) {
          const problem = checkOutcome(food, made.choices);
          if (problem) throw new ApiError('VALIDATION', OUTCOME_MESSAGES[problem]);
        }
        const at = nowIso();
        item.isVoid = true;
        item.voidReason = reason.trim();
        item.voidedBy = user.id;
        item.voidedAt = at;
        if (made.made && food) this.applyOutcome(data, order, item, food, user.id, at);
        else this.giveBack(data, item);
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
            this.closeStock(data, order, user.id);
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
        this.syncStock(data, order, user.id);
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
        this.syncStock(data, order, user.id);
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

  cancelOrder(orderId: string, reason: string, food: Record<string, FoodOutcome> = {}): Promise<Order> {
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
        // I4: every line whose food was made needs its outcome before anything changes (owner, 2026-11-09)
        const lines = order.items.filter((i) => !i.isVoid).map((item) => ({ item, made: this.madeLine(data, order, item) }));
        for (const { item, made } of lines) {
          if (!made.made) continue;
          const problem = checkOutcome(food[item.id], made.choices);
          if (problem) throw new ApiError('VALIDATION', `${this.lineLabel(item)}: ${OUTCOME_MESSAGES[problem]}`);
        }
        setStatus(order, 'CANCELLED', user.id, reason.trim());
        const at = nowIso();
        for (const { item, made } of lines) {
          const outcome = food[item.id];
          if (made.made && outcome) this.applyOutcome(data, order, item, outcome, user.id, at);
          else if (!made.cooking) this.giveBack(data, item);
        }
        // Tickets still cooking: the kitchen finishes and keeps them, or stops (decision 9)
        for (const ticket of order.tickets) {
          if (ticket.status === 'PREPARING' && order.items.some((i) => i.ticketId === ticket.id && !i.isVoid && i.stock && !i.stock.takenAt)) ticket.cancelDecision = 'PENDING';
        }
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
      const now = Date.now();
      // I4: ready food that may still be given to another order of the same dish
      const foods = (data.inventory.availableFood ?? []).filter((f) => availableState(f, now) === 'AVAILABLE');
      for (const order of data.orders) {
        if (order.status === 'REJECTED') continue;
        // A cancelled order shows only a ticket that was cooking, until the kitchen keeps or stops it
        const cancelled = order.status === 'CANCELLED';
        const active = KITCHEN_ORDER_STATUSES.includes(order.status);
        for (const ticket of order.tickets) {
          if (!ownStation(ticket.stationId)) continue;
          if (cancelled && ticket.cancelDecision !== 'PENDING') continue;
          const items = order.items.filter((i) => i.ticketId === ticket.id);
          // Owner, 2026-11-09: food that left the pass stays 5 minutes, then hides (from the saved time: no coming back after a
          // refresh); food still at the pass stays while its order is open
          const pickup = cancelled ? null : ticketPickup(ticket, order);
          if (!cancelled) {
            const voidedAt = voidedTicketAt(order, ticket);
            if (voidedAt !== null && now - voidedAt > VOID_TICKET_VISIBLE_MS) continue;
            const state = kdsState(pickup, now);
            if (state === 'HIDDEN' || (state === 'ACTIVE' && (!active || ticket.status === 'SERVED'))) continue;
          }
          const offers = cancelled
            ? []
            : items.flatMap((item) => {
                const match = foods.filter((f) => checkGive({ food: f, line: item, ticketStatus: ticket.status, now }) === null);
                return match.length ? [[item.id, match.map((f) => ({ id: f.id, remaining: f.remaining, fromDailyNumber: f.fromDailyNumber, madeAt: f.madeAt, safeUntil: f.safeUntil }))] as const] : [];
              });
          views.push({
            ticket,
            orderType: order.type,
            orderStatus: order.status,
            dailyNumber: order.dailyNumber,
            tableName: order.tableId ? this.orderPlace(data, order) : null,
            waiterName: this.staffName(data, order.waiterId),
            items,
            pickup: pickup ? { at: pickup.at, byName: pickup.byId ? this.staffName(data, pickup.byId) : null, source: pickup.source } : null,
            ...(offers.length ? { available: Object.fromEntries(offers) } : {}),
            ...(cancelled
              ? { cancelled: { reason: order.history.findLast((h) => h.toStatus === 'CANCELLED')?.reason ?? '', canKeep: items.some((i) => !i.isVoid && this.reuseFor(data, i).enabled) } }
              : {}),
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
        const undone = to === 'PREPARING' && ticket.status === 'READY';
        ticket.status = to;
        // I4: the stock is taken at Ready, once; the kitchen's Undo gives it back and Ready again takes it again
        if (undone) this.returnTicketStock(data, order, ticket.id, user.id);
        else this.syncStock(data, order, user.id);

        applyAutomaticSteps(order);
      }),
    );
  }

  /** A waiter took a dine-in ticket's food from the pass (owner, 2026-11-09). A second tap changes nothing. Not Served. */
  pickUpTicket(ticketId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.requireUser(data);
        const { order, ticket } = findTicket(data, ticketId);
        if (ticket.pickedUpAt) return;
        if (!worksOnTable(user, order.tableId)) throw new ApiError('FORBIDDEN', 'This table is not assigned to you.');
        const problem = checkPickup({ role: user.role, orderType: order.type, status: ticket.status });
        if (problem) throw new ApiError(problem === 'WRONG_ROLE' ? 'FORBIDDEN' : 'CONFLICT', PICKUP_MESSAGES[problem]);
        Object.assign(ticket, { pickedUpAt: nowIso(), pickedUpBy: user.id });
      }),
    );
  }

  /** Undo a pickup while its card is still on the KDS (5 minutes): the food is back at the pass, still READY. */
  undoPickup(ticketId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.requireUser(data);
        const { ticket } = findTicket(data, ticketId);
        if (!ticket.pickedUpAt) return;
        const problem = checkUndoPickup({
          role: user.role,
          status: ticket.status,
          pickedUpAt: ticket.pickedUpAt,
          isOwnStation: user.stationIds.length === 0 || user.stationIds.includes(ticket.stationId),
          now: Date.now(),
        });
        if (problem) throw new ApiError(problem === 'WRONG_ROLE' || problem === 'NOT_OWN_STATION' ? 'FORBIDDEN' : 'CONFLICT', PICKUP_MESSAGES[problem]);
        Object.assign(ticket, { pickedUpAt: null, pickedUpBy: null });
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
      const user = this.require(data, 'menu.view');
      const items = data.items.filter((i) => !i.archivedAt).sort((a, b) => a.sort - b.sort);
      return {
        categories: [...data.categories]
          .sort((a, b) => a.sort - b.sort)
          .map((category) => ({ category, itemCount: items.filter((i) => i.categoryId === category.id).length })),
        items,
        addonGroups: data.modifierGroups.map((group) => ({ group, itemCount: items.filter((i) => i.modifierGroupIds.includes(group.id)).length })),
        stations: [...data.stations].sort((a, b) => a.sort - b.sort),
        ...(this.permissionsOf(data, user).includes('inventory.view') ? { recipes: this.menuRecipeStates(data, items) } : {}),
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
        // One product once in the whole menu (owner, 2026-11-08), not only once per category
        const clash = data.items.find((i) => !i.archivedAt && i.id !== input.id && sameName(i.name, name));
        const check = checkMenuItem({ name, description: input.description, price: input.price, sizes: input.sizes }, clash ? [clash.name] : []);
        if (check) throw new ApiError('VALIDATION', menuMessage(check, name, (clash && data.categories.find((c) => c.id === clash.categoryId)?.name) || category.name));

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
          ...(input.reuse !== undefined ? { reuse: input.reuse } : {}),
        };
        if (input.reuse && !checkReuse(input.reuse)) throw new ApiError('VALIDATION', 'Safe time must be 1 to 24 hours.');
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
      // An expiry date is a calendar date; everything else on this screen follows the business day
      const today = this.calendarToday(data);
      // W3: status and expiry from the lots: low / out count the usable stock; the expiry is the worst lot with stock left
      const book = this.lotBook(data);
      const lotsOf = new Map<string, StockLot[]>();
      for (const lot of book.lots) if (book.remaining(lot.id) > 0) lotsOf.set(lot.ingredientId, [...(lotsOf.get(lot.ingredientId) ?? []), lot]);
      const rowOf = (ingredient: Ingredient) => {
        const onHandMilli = onHandOf(ingredient.id, inv.movements);
        const lots = lotsOf.get(ingredient.id) ?? [];
        const states = lots.map((lot) => ({ lot, state: book.state(lot), milli: book.remaining(lot.id) }));
        const sum = (keep: (s: (typeof states)[number]) => boolean) => states.filter(keep).reduce((total, s) => total + s.milli, 0);
        const usableMilli = book.usable(ingredient.id);
        const dated = lots
          .map((l) => (l.discardAt ? localClock(new Date(l.discardAt), data.branch.timezone).date : l.dateKind !== 'UNKNOWN' ? l.date : null))
          .filter((d): d is string => Boolean(d))
          .sort();
        const expiry: ExpiryState = states.some((s) => s.state === 'EXPIRED') ? 'EXPIRED' : states.some((s) => s.state === 'SOON') ? 'SOON' : dated.length ? 'OK' : 'NONE';
        return {
          ingredient,
          onHandMilli,
          usableMilli,
          blockedMilli: sum((s) => s.state === 'EXPIRED' || s.state === 'HELD'),
          reviewMilli: sum((s) => needsReview(s.lot, s.state)) + Math.max(0, book.ledger.none.get(ingredient.id) ?? 0),
          expiryDate: dated[0] ?? null,
          status: stockStatus({ onHandMilli: Math.min(onHandMilli, usableMilli), minStockMilli: ingredient.minStockMilli, isActive: ingredient.isActive }),
          expiry,
          value: stockValueOf(ingredient, onHandMilli),
          supplierName: inv.suppliers.find((s) => s.id === ingredient.preferredSupplierId)?.name ?? null,
          locationName: inv.locations.find((l) => l.id === ingredient.locationId)?.name ?? null,
        };
      };
      const byName = (a: { ingredient: Ingredient }, b: { ingredient: Ingredient }) => a.ingredient.name.localeCompare(b.ingredient.name);
      const rows = inv.ingredients.filter((ingredient) => ingredient.kind !== 'PREPARED').map(rowOf).sort(byName);
      // I3: cooked food apart from the raw ingredients, and what today's and tomorrow's plans are short of
      const cooked = inv.ingredients.filter((ingredient) => ingredient.kind === 'PREPARED' && ingredient.isActive).map(rowOf).sort(byName);
      const cookingDay = this.branchToday(data);
      const shortOf = (date: string) => this.planCheck(data, date).needs.filter((n) => n.shortMilli > 0).length;
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
        foodCost: summarizeFoodCost(this.menuRecipeRows(data)),
        ingredients: rows,
        movements,
        locations: [...inv.locations].sort((a, b) => a.sort - b.sort),
        suppliers: inv.suppliers.filter((s) => s.isActive),
        cooked,
        cookingShort: { today: shortOf(cookingDay), tomorrow: shortOf(nextDate(cookingDay)) },
        availableFood: (inv.availableFood ?? []).filter((f) => availableState(f, Date.now()) === 'AVAILABLE').length,
        notTrackedToday: this.notTrackedOn(data, cookingDay),
        wasteToday: ((s) => ({ cost: s.todayCost, lines: s.todayLines, unknown: s.todayUnknown }))(summarizeWaste(inv.wasteEvents ?? [], this.branchToday(data))),
      };
    });
  }

  saveIngredient(input: IngredientInput): Promise<Ingredient> {
    return this.request(() => this.store.update((data) => this.writeIngredient(data, input)));
  }

  /** Add or edit one ingredient inside a change (also used by Add New Product on a purchase bill). */
  private writeIngredient(data: DemoData, input: IngredientInput): Ingredient {
    const user = this.require(data, 'inventory.manage');
    const inv = data.inventory;
    const existing = input.id ? inv.ingredients.find((i) => i.id === input.id) : undefined;
    if (input.id && !existing) throw new ApiError('NOT_FOUND', 'This ingredient was not found.');
    const problem = checkIngredient({ ...input, openingMilli: existing ? null : input.openingMilli }, inv.ingredients);
    if (problem) throw new ApiError('VALIDATION', 'Please check the ingredient details.');
    if (input.preferredSupplierId && !inv.suppliers.some((s) => s.id === input.preferredSupplierId)) throw new ApiError('VALIDATION', 'Choose a supplier from the list.');
    if (input.locationId && !inv.locations.some((l) => l.id === input.locationId)) throw new ApiError('VALIDATION', 'Choose a storage place from the list.');
    if (input.packings && checkPackings(input.packings)) throw new ApiError('VALIDATION', 'Please check the packings: a size above zero, a price, no packing twice.');
    if (input.loosePrice != null && (!Number.isInteger(input.loosePrice) || input.loosePrice < 0)) throw new ApiError('VALIDATION', 'Type the loose price in rupees.');
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
      ...(input.packings !== undefined && { packings: input.packings.map((p) => ({ id: p.id || newId(), kind: p.kind, sizeMilli: p.sizeMilli, pricePaisa: p.pricePaisa })) }),
      ...(input.loosePrice !== undefined && { loosePrice: input.loosePrice }),
    };
    if (existing) {
      // The stock unit gives every movement its meaning: it never changes once stock was written.
      if (existing.stockUnit !== input.stockUnit && inv.movements.some((m) => m.ingredientId === existing.id)) {
        throw new ApiError('CONFLICT', 'The stock unit cannot change after stock was recorded.');
      }
      // W3: a date changed here is the old-stock lot's date, typed by a person (it no longer needs review)
      const oldLot = (inv.lots ?? []).find((l) => l.ingredientId === existing.id && l.source === 'OLD_STOCK');
      if (oldLot && input.expiryDate !== existing.expiryDate) {
        Object.assign(oldLot, { date: input.expiryDate, dateKind: input.expiryDate ? 'USE_BY' : 'UNKNOWN', dateFrom: input.expiryDate ? 'TYPED' : 'NONE', unverified: false, dateSetBy: user.id, dateSetAt: now });
      }
      Object.assign(existing, fields);
      return existing;
    }
    const ingredient: Ingredient = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, kind: input.kind ?? 'BOUGHT', ...fields, isActive: true, createdAt: now };
    inv.ingredients.push(ingredient);
    if (input.openingMilli > 0) {
      // W3: the opening stock of a new item is its first lot, with the date typed in the form (none = Unknown)
      const date = input.expiryDate || null;
      const lot = this.newLot(data, { ingredientId: ingredient.id, source: 'OLD_STOCK', sourceId: null, firstMilli: input.openingMilli, cost: null, date, dateKind: date ? 'USE_BY' : 'UNKNOWN', dateFrom: date ? 'TYPED' : 'NONE' }, user.id, now);
      inv.movements.push({
        lotId: lot.id,
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
        cost: ingredientCost(this.costBook(data), ingredient.id, input.openingMilli),
      });
    }
    return ingredient;
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
          cost: ingredientCost(this.costBook(data), ingredient.id, input.quantityMilli),
        });
        data.idempotency[key] = movementId;
      }),
    );
  }

  getWasteView(): Promise<WasteView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const inv = data.inventory;
      const today = this.branchToday(data);
      const events = [...(inv.wasteEvents ?? [])].sort((a, b) => b.at.localeCompare(a.at) || b.createdAt.localeCompare(a.createdAt));
      const all = events.flatMap((event) =>
        event.lines.map((line, index) => {
          const ingredient = inv.ingredients.find((i) => i.id === line.ingredientId);
          const food = line.orderFood;
          return {
            event,
            line,
            ingredientName: food ? [food.name, food.variantName].filter(Boolean).join(' · ') : (ingredient?.name ?? '—'),
            first: index === 0,
            reversedByName: this.staffName(data, event.reversal?.by ?? null),
            purchaseUnit: ingredient?.purchaseUnit ?? 'kg',
            stockUnit: ingredient?.stockUnit ?? 'g',
            byName: this.staffName(data, event.createdBy),
          };
        }),
      );
      const limit = 200;
      const cookedPrices = Object.fromEntries(inv.ingredients.filter((i) => i.kind === 'PREPARED' && i.isActive).map((i) => [i.id, this.cookedPrice(data, i.id)]));
      return {
        today,
        summary: summarizeWaste(events, today),
        meals: summarizeWaste(events, today, 'STAFF_MEAL'),
        donations: summarizeWaste(events, today, 'DONATION'),
        cookedPrices,
        lots: this.lotRows(data),
        requests: this.requestRows(data, () => true, true),
        rows: all.slice(0, limit),
        total: all.length,
        limit,
      };
    });
  }

  /** W3: every lot with stock left, with its state, earliest date first (Stock → Wastage & Expiry lists) */
  private lotRows(data: DemoData): LotRow[] {
    const inv = data.inventory;
    const book = this.lotBook(data);
    return book.lots
      .filter((lot) => book.remaining(lot.id) > 0)
      .sort(fefoOrder)
      .flatMap((lot): LotRow[] => {
        const ingredient = inv.ingredients.find((i) => i.id === lot.ingredientId);
        if (!ingredient) return [];
        const entry = lot.source === 'PURCHASE' ? inv.khata.find((k) => k.id === lot.sourceId) : undefined;
        const day = lot.discardAt ? localClock(new Date(lot.discardAt), data.branch.timezone).date : lot.date;
        return [
          {
            lot,
            ingredientName: ingredient.name,
            cooked: ingredient.kind === 'PREPARED',
            purchaseUnit: ingredient.purchaseUnit,
            stockUnit: ingredient.stockUnit,
            remainingMilli: book.remaining(lot.id),
            state: book.state(lot),
            supplierName: nameOfSupplier(inv.suppliers, lot.supplierId ?? null),
            billNo: entry?.billNo || null,
            days: day ? daysBetween(book.now.date, day) : null,
            setByName: this.staffName(data, lot.dateSetBy ?? null),
            releasedByName: this.staffName(data, lot.release?.by ?? null),
            dishHours: ingredient.kind === 'PREPARED' ? (ingredient.discardHours ?? null) : null,
          },
        ];
      });
  }

  /**
   * W3: the date on a lot, typed from the label (Use-by / Best-before) or Unknown; for cooked food the discard time in hours from
   * when it was made, optionally kept for every new batch of the dish. The person confirms it: Needs review ends. Owner / Manager.
   */
  setLotDate(input: LotDateInput): Promise<StockLot> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        this.requireOwnerOrManager(user);
        const lot = (data.inventory.lots ?? []).find((l) => l.id === input.lotId);
        if (!lot) throw new ApiError('NOT_FOUND', 'This delivery was not found.');
        const now = nowIso();
        if (input.discardHours !== undefined && input.discardHours !== null) {
          const problem = checkDiscardHours(input.discardHours);
          if (problem) throw new ApiError('VALIDATION', LOT_DATE_MESSAGES[problem]);
          Object.assign(lot, { date: null, dateKind: 'USE_BY', discardAt: discardAtOf(lot.receivedAt, input.discardHours), dateFrom: 'TYPED' });
          if (input.forDish) {
            const dish = data.inventory.ingredients.find((i) => i.id === lot.ingredientId && i.kind === 'PREPARED');
            if (dish) Object.assign(dish, { discardHours: input.discardHours, updatedAt: now });
          }
        } else {
          const problem = checkLotDate({ date: input.date, dateKind: input.dateKind });
          if (problem) throw new ApiError('VALIDATION', LOT_DATE_MESSAGES[problem]);
          Object.assign(lot, { date: input.date, dateKind: input.dateKind, discardAt: null, dateFrom: input.date ? 'TYPED' : 'NONE' });
          if (lot.source === 'OLD_STOCK') {
            // The item's one old date follows its old-stock lot
            const item = data.inventory.ingredients.find((i) => i.id === lot.ingredientId);
            if (item) Object.assign(item, { expiryDate: input.date, updatedAt: now });
          }
        }
        Object.assign(lot, { unverified: false, dateSetBy: user.id, dateSetAt: now });
        return lot;
      }),
    );
  }

  // ── Staff waste reports (W4, owner 2026-11-12) ──────────────────────────────────────────────

  /** One report as a list row; the cost (last purchase price / batch cost) only for the Owner and a Manager */
  private requestRow(data: DemoData, request: WasteRequest, withCost: boolean): WasteRequestRow {
    const inv = data.inventory;
    let cost: number | null = 0;
    const lines = request.lines.map((line) => {
      const item = inv.ingredients.find((i) => i.id === line.ingredientId);
      const cooked = item?.kind === 'PREPARED';
      const lineCost = !item ? null : cooked ? cookedWasteCost(this.cookedPrice(data, item.id), line.stockMilli) : (wasteCost(item, line.stockMilli)?.cost ?? null);
      cost = cost === null || lineCost === null ? null : cost + lineCost;
      return { name: item?.name ?? '—', purchaseUnit: item?.purchaseUnit ?? 'kg', stockUnit: item?.stockUnit ?? 'g', stockMilli: line.stockMilli, reason: line.reason, note: line.note, cooked };
    });
    return { request, lines, requestedByName: this.staffName(data, request.requestedBy), decidedByName: this.staffName(data, request.decidedBy ?? null), cost: withCost ? cost : null };
  }

  /** Pending reports first (oldest first), then those decided in the last 7 days (newest first) */
  private requestRows(data: DemoData, keep: (r: WasteRequest) => boolean, withCost: boolean): WasteRequestRow[] {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const all = (data.inventory.wasteRequests ?? []).filter(keep);
    const pending = all.filter((r) => r.status === 'PENDING').sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
    const decided = all.filter((r) => r.status !== 'PENDING' && (r.decidedAt ?? '') >= weekAgo).sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''));
    return [...pending, ...decided].map((r) => this.requestRow(data, r, withCost));
  }

  getWasteReport(): Promise<WasteReportView> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.require(data, 'inventory.waste.submit');
      // No prices for the Kitchen (owner's decision 4): the items are sent without them
      const items = data.inventory.ingredients
        .filter((i) => i.isActive)
        .map((i) => ({ ...i, purchasePrice: 0, loosePrice: null, packings: (i.packings ?? []).map((p) => ({ ...p, pricePaisa: 0 })), rates: undefined }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { items, mine: this.requestRows(data, (r) => r.requestedBy === user.id, false).slice(0, 10) };
    });
  }

  /**
   * W4: a staff waste report. Checked like Record Waste (a reason, never more than on hand); then each line's food is held at once:
   * one WASTE_HOLD movement out of its lots (the expired stock first) and one into a new held lot with the date of the lot it left.
   * On hand does not change; nothing is a loss; the khata never changes. Once per key.
   */
  submitWasteRequest(input: WasteRequestInput): Promise<WasteRequest> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.waste.submit');
        const inv = data.inventory;
        const key = 'waste-request:' + input.idempotencyKey;
        const done = data.idempotency[key];
        const first = done ? (inv.wasteRequests ?? []).find((r) => r.id === done) : undefined;
        if (first) return first;
        this.checkStockWaste(data, { at: input.at, kind: 'WASTE', stage: input.stage, lines: input.lines.map((l) => ({ ...l, lotId: null })), note: input.note, idempotencyKey: input.idempotencyKey });
        const now = nowIso();
        const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
        const requestId = newId();
        const lines = input.lines.map((line) => {
          const item = inv.ingredients.find((i) => i.id === line.ingredientId)!;
          const stockMilli = wasteStockMilli(line.parts, item)!;
          const outId = newId();
          const note = `Waste report: ${line.note.trim() || line.reason!.toLowerCase().replace(/_/g, ' ')}`.slice(0, MAX_MOVEMENT_NOTE);
          inv.movements.push({ id: outId, ...scope, ingredientId: item.id, type: 'WASTE_HOLD', quantityMilli: -stockMilli, reason: null, note, createdBy: user.id, createdAt: now });
          // The held lot keeps the date of the delivery it came from (the first one)
          const fromLot = (this.lotBook(data).ledger.taken.get(outId) ?? []).map((p) => (inv.lots ?? []).find((l) => l.id === p.lotId)).find(Boolean);
          const lot = this.newLot(
            data,
            { ingredientId: item.id, source: 'REQUEST', sourceId: requestId, firstMilli: stockMilli, cost: null, date: fromLot?.date ?? null, dateKind: fromLot?.dateKind ?? 'UNKNOWN', discardAt: fromLot?.discardAt ?? null, dateFrom: fromLot?.dateFrom ?? 'NONE', unverified: fromLot?.unverified ?? false, held: true, holdReason: note },
            user.id,
            now,
          );
          inv.movements.push({ id: newId(), ...scope, ingredientId: item.id, type: 'WASTE_HOLD', quantityMilli: stockMilli, reason: null, note, createdBy: user.id, createdAt: now, lotId: lot.id });
          return {
            ingredientId: item.id,
            parts: line.parts.map((p) => {
              const option = findBuyOption(item, p.unitKey)!;
              return { unitKey: option.key, unit: option.unit, unitSizeMilli: option.sizeMilli, quantityMilli: p.quantityMilli! };
            }),
            stockMilli,
            reason: line.reason!,
            note: line.note.trim(),
            heldLotId: lot.id,
          };
        });
        const request: WasteRequest = {
          id: requestId,
          ...scope,
          status: 'PENDING',
          at: new Date(input.at).toISOString(),
          businessDate: wasteBusinessDate(input.at, data.branch.timezone, data.branch.businessDayStart),
          stage: input.stage,
          lines,
          note: input.note.trim(),
          thrownAway: input.thrownAway,
          requestedBy: user.id,
          requestedAt: now,
        };
        (inv.wasteRequests ??= []).push(request);
        data.idempotency[key] = request.id;
        return request;
      }),
    );
  }

  /**
   * W4: approve = one waste entry from the held food (createdBy the reporter, approvedBy the approver), once; reject = a reason,
   * then the food is released (only confirmed safe and not expired, like any held food) or stays held. Owner / Manager.
   */
  decideWasteRequest(input: WasteDecisionInput): Promise<WasteRequest> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.waste.approve');
        this.requireOwnerOrManager(user);
        const inv = data.inventory;
        const request = (inv.wasteRequests ?? []).find((r) => r.id === input.requestId);
        if (!request) throw new ApiError('NOT_FOUND', 'This waste report was not found.');
        const problem = checkDecision(request, input.approve, input.reason);
        if (problem) throw new ApiError(problem === 'NOT_PENDING' ? 'CONFLICT' : 'VALIDATION', DECISION_MESSAGES[problem]);
        const book = this.lotBook(data);
        const now = nowIso();
        if (input.approve) {
          for (const line of request.lines) {
            if (book.remaining(line.heldLotId) < line.stockMilli) throw new ApiError('CONFLICT', 'Some of the held food was already used or recorded. Reject this report and record what is left.');
          }
          const event = this.writeStockWaste(
            data,
            { at: request.at, kind: 'WASTE', stage: request.stage, note: request.note, idempotencyKey: request.id, lines: request.lines.map((l) => ({ ingredientId: l.ingredientId, lotId: l.heldLotId, parts: l.parts.map((p) => ({ unitKey: p.unitKey, quantityMilli: p.quantityMilli })), reason: l.reason, note: l.note })) },
            user,
            { source: 'REQUEST', requestId: request.id, createdBy: request.requestedBy },
          );
          Object.assign(request, { status: 'APPROVED', decidedBy: user.id, decidedAt: now, wasteEventId: event.id });
          return request;
        }
        const lots = request.lines.map((l) => (inv.lots ?? []).find((lot) => lot.id === l.heldLotId)!).filter(Boolean);
        if (input.release) {
          for (const lot of lots) {
            const why = checkRelease(lot, book.remaining(lot.id), input.safe, book.now, inv.expiringSoonDays);
            if (why && why !== 'NOTHING_LEFT') throw new ApiError(why === 'EXPIRED' ? 'CONFLICT' : 'VALIDATION', RELEASE_MESSAGES[why]);
          }
          for (const lot of lots) Object.assign(lot, { held: false, release: { by: user.id, at: now, note: `Report rejected: ${input.reason.trim()}`.slice(0, MAX_REVERSE_REASON) } });
        } else {
          for (const lot of lots) lot.holdReason = `Report rejected, kept on hold: ${input.reason.trim()}`.slice(0, MAX_MOVEMENT_NOTE);
        }
        Object.assign(request, { status: 'REJECTED', decidedBy: user.id, decidedAt: now, rejectReason: input.reason.trim(), released: input.release });
        return request;
      }),
    );
  }

  /** W3: held (returned) food back to use, only when a person confirms it is safe and never after its date. Owner / Manager. */
  releaseLot(lotId: string, safe: boolean, note: string): Promise<StockLot> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        this.requireOwnerOrManager(user);
        const lot = (data.inventory.lots ?? []).find((l) => l.id === lotId);
        if (!lot) throw new ApiError('NOT_FOUND', 'This stock was not found.');
        const book = this.lotBook(data);
        const problem = checkRelease(lot, book.remaining(lot.id), safe, book.now, data.inventory.expiringSoonDays);
        if (problem) throw new ApiError(problem === 'EXPIRED' ? 'CONFLICT' : 'VALIDATION', RELEASE_MESSAGES[problem]);
        Object.assign(lot, { held: false, release: { by: user.id, at: nowIso(), note: note.trim().slice(0, MAX_REVERSE_REASON) } });
        return lot;
      }),
    );
  }

  /**
   * W2: what a cooked dish costs for a waste line: its newest batch that is not reversed (the batch cost shared by what it
   * actually made), else the recipe estimate for 1,000 stock units. Null = Unknown. Its raw ingredients are never costed again.
   */
  private cookedPrice(data: DemoData, preparedId: string): CookedPrice | null {
    const batch = [...(data.inventory.cookingBatches ?? [])]
      .filter((b) => b.preparedId === preparedId && b.status === 'DONE' && b.cost !== null && b.actualMilli > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (batch) return { basis: 'BATCH', paisa: batch.cost!, perMilli: batch.actualMilli };
    const perMilli = 1000 * MILLI;
    const recipe = ingredientCost(this.costBook(data), preparedId, perMilli);
    return recipe === null ? null : { basis: 'RECIPE', paisa: recipe, perMilli };
  }

  /** W2: Staff meals, donations and Reverse / Correct are for the Owner and the Manager only (owner, 2026-11-11). */
  private requireOwnerOrManager(user: StaffUser): void {
    if (user.role !== 'OWNER' && user.role !== 'MANAGER') throw new ApiError('FORBIDDEN', 'Only the Owner or a Manager may do this.');
  }

  /**
   * Writes one checked incident: one movement per line (WASTE, STAFF_MEAL or DONATION) on that item only — a cooked dish's
   * raw ingredients left at its batch and are never taken again — with the cost kept on the line and the movement.
   */
  private writeStockWaste(data: DemoData, input: StockWasteInput, user: StaffUser, extra: Partial<WasteEvent> = {}): WasteEvent {
    const inv = data.inventory;
    const kind = input.kind ?? 'WASTE';
    const now = nowIso();
    const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
    const eventId = newId();
    const lines = input.lines.map((line): WasteLine => {
      const ingredient = inv.ingredients.find((i) => i.id === line.ingredientId)!;
      const cooked = ingredient.kind === 'PREPARED';
      const stockMilli = wasteStockMilli(line.parts, ingredient)!;
      const valued = cooked ? null : wasteCost(ingredient, stockMilli);
      const price = cooked ? this.cookedPrice(data, ingredient.id) : null;
      const cost = cooked ? cookedWasteCost(price, stockMilli) : (valued?.cost ?? null);
      const beforeMilli = onHandOf(ingredient.id, inv.movements);
      const movementId = newId();
      const note = line.note.trim();
      const reason = kind === 'WASTE' ? line.reason : null;
      inv.movements.push({ id: movementId, ...scope, ingredientId: ingredient.id, type: kind, quantityMilli: -stockMilli, reason: null, note, createdBy: user.id, createdAt: now, wasteId: eventId, ...(reason ? { wasteReason: reason } : {}), cost, ...(line.lotId ? { lotId: line.lotId } : {}) });
      return {
        ingredientId: ingredient.id,
        lotId: line.lotId ?? null,
        itemKind: cooked ? 'COOKED' : 'STOCK',
        // Each way it was typed, with the size of that unit as it is now (a later packing edit changes nothing)
        parts: line.parts.map((p) => {
          const option = findBuyOption(ingredient, p.unitKey)!;
          return { unitKey: option.key, unit: option.unit, unitSizeMilli: option.sizeMilli, quantityMilli: p.quantityMilli! };
        }),
        stockMilli,
        reason,
        note,
        cost,
        costBasis: cooked ? (price?.basis ?? 'RECIPE') : 'PURCHASE_PRICE',
        pricePaisa: cooked ? (price?.paisa ?? null) : (valued?.pricePaisa ?? null),
        priceUnitMilli: cooked ? (price?.perMilli ?? null) : (valued?.priceUnitMilli ?? null),
        beforeMilli,
        afterMilli: beforeMilli - stockMilli,
        movementId,
      };
    });
    const event: WasteEvent = {
      id: eventId,
      ...scope,
      at: new Date(input.at).toISOString(),
      businessDate: wasteBusinessDate(input.at, data.branch.timezone, data.branch.businessDayStart),
      stage: input.stage,
      kind,
      source: 'RECORD',
      lines,
      note: input.note.trim(),
      status: 'POSTED',
      createdBy: user.id,
      createdAt: now,
      approvedBy: user.id,
      ...extra,
    };
    (inv.wasteEvents ??= []).push(event);
    return event;
  }

  /** Throws the first problem of an incident with the item's name (checked against the stock as it is now). */
  private checkStockWaste(data: DemoData, input: StockWasteInput): void {
    const inv = data.inventory;
    const book = this.lotBook(data);
    const lots = {
      lot: (lotId: string) => {
        const lot = book.lots.find((l) => l.id === lotId);
        return lot ? { ingredientId: lot.ingredientId, remainingMilli: book.remaining(lot.id), usable: isUsableState(book.state(lot)) } : null;
      },
      usable: book.usable,
    };
    const problem = checkWaste(input, inv.ingredients, (id) => onHandOf(id, inv.movements), Date.now(), lots);
    if (!problem) return;
    const name = problem.line === null ? '' : (inv.ingredients.find((i) => i.id === input.lines[problem.line!]?.ingredientId)?.name ?? '');
    throw new ApiError('VALIDATION', (name ? `${name}: ` : '') + WASTE_MESSAGES[problem.problem]);
  }

  /**
   * Puts a posted event's stock back by one WASTE_REVERSAL movement per line and marks the event REVERSED (never edited otherwise).
   * W3: a plain reversal brings the food back HELD, on its own lot with the date of the lot it left, until the Owner or a Manager
   * releases it (never when expired). A correction puts it back exactly into the lots it came from: it was a typing fix.
   */
  private writeReversal(data: DemoData, event: WasteEvent, reason: string, user: StaffUser, correction = false): void {
    const problem = checkReverse(event, reason);
    if (problem) throw new ApiError(problem === 'NOT_POSTED' ? 'CONFLICT' : 'VALIDATION', REVERSE_MESSAGES[problem]);
    const at = nowIso();
    const ledger = correction ? null : this.lotBook(data).ledger;
    const movementIds = event.lines.flatMap((line) => {
      if (!line.ingredientId || line.stockMilli <= 0) return [];
      const id = newId();
      let link: { lotId?: string; restoresMovementId?: string } = {};
      if (correction && line.movementId) link = { restoresMovementId: line.movementId };
      else if (ledger) {
        // The date of the lot it was taken from (the first one); a line from before lots has none: Unknown
        const fromLot = (ledger.taken.get(line.movementId ?? '') ?? []).map((p) => (data.inventory.lots ?? []).find((l) => l.id === p.lotId)).find(Boolean);
        const lot = this.newLot(
          data,
          { ingredientId: line.ingredientId, source: 'RETURNED', sourceId: event.id, firstMilli: line.stockMilli, cost: line.cost, date: fromLot?.date ?? null, dateKind: fromLot?.dateKind ?? 'UNKNOWN', discardAt: fromLot?.discardAt ?? null, dateFrom: fromLot?.dateFrom ?? 'NONE', unverified: fromLot?.unverified ?? false, held: true, holdReason: reason.trim() },
          user.id,
          at,
        );
        link = { lotId: lot.id };
      }
      data.inventory.movements.push({ id, restaurantId: event.restaurantId, branchId: event.branchId, ingredientId: line.ingredientId, type: 'WASTE_REVERSAL', quantityMilli: line.stockMilli, reason: null, note: reason.trim(), createdBy: user.id, createdAt: at, wasteId: event.id, cost: line.cost, ...link });
      return [id];
    });
    event.status = 'REVERSED';
    event.reversal = { by: user.id, at, reason: reason.trim(), movementIds, correctedById: null };
  }

  reverseStockWaste(eventId: string, reason: string): Promise<WasteEvent> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        this.requireOwnerOrManager(user);
        const event = (data.inventory.wasteEvents ?? []).find((e) => e.id === eventId);
        if (!event) throw new ApiError('NOT_FOUND', 'This entry was not found.');
        this.writeReversal(data, event, reason, user);
        return event;
      }),
    );
  }

  /**
   * W2: a correction in one change: the old event is reversed (its stock back), then the new one is checked against that stock
   * and posted with a link both ways. Nothing is written when either fails; a retry with the same key returns the new event.
   */
  correctStockWaste(eventId: string, reason: string, input: StockWasteInput): Promise<WasteEvent> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        this.requireOwnerOrManager(user);
        const inv = data.inventory;
        const key = 'stock-waste:' + input.idempotencyKey;
        const done = data.idempotency[key];
        const first = done ? (inv.wasteEvents ?? []).find((e) => e.id === done) : undefined;
        if (first) return first;
        const old = (inv.wasteEvents ?? []).find((e) => e.id === eventId);
        if (!old) throw new ApiError('NOT_FOUND', 'This entry was not found.');
        this.writeReversal(data, old, reason, user, true);
        this.checkStockWaste(data, input);
        const event = this.writeStockWaste(data, input, user, { correctsId: old.id });
        old.reversal!.correctedById = event.id;
        data.idempotency[key] = event.id;
        return event;
      }),
    );
  }

  /**
   * W1: one waste incident in one change: one movement per line with the event and the reason on it, the loss kept on the
   * line and the movement (null = no price), and the event itself. A double tap or retry with the same key returns the first
   * event. Every line is checked first: nothing is written while one line is wrong. W2: cooked stock, Staff meal and Donation
   * (those two by the Owner or a Manager only).
   */
  postStockWaste(input: StockWasteInput): Promise<WasteEvent> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        if ((input.kind ?? 'WASTE') !== 'WASTE') this.requireOwnerOrManager(user);
        const inv = data.inventory;
        const key = 'stock-waste:' + input.idempotencyKey;
        const done = data.idempotency[key];
        if (done) {
          const first = (inv.wasteEvents ?? []).find((e) => e.id === done);
          if (first) return first;
        }
        this.checkStockWaste(data, input);
        const event = this.writeStockWaste(data, input, user);
        data.idempotency[key] = event.id;
        return event;
      }),
    );
  }

  getStockLedger(query: StockLedgerQuery): Promise<StockLedgerView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const inv = data.inventory;
      const tz = data.branch.timezone;
      const after = balancesAfter(inv.movements);
      const dayOf = (iso: string) => businessDate(new Date(iso), tz, '00:00');
      const matching = inv.movements.filter(
        (m) =>
          (!query.ingredientId || m.ingredientId === query.ingredientId) &&
          (!query.type || m.type === query.type) &&
          (!query.staffId || m.createdBy === query.staffId) &&
          (!query.from || dayOf(m.createdAt) >= query.from) &&
          (!query.to || dayOf(m.createdAt) <= query.to),
      );
      const limit = 300;
      const rows = matching
        .map((movement, index) => ({ movement, index }))
        .sort((a, b) => b.movement.createdAt.localeCompare(a.movement.createdAt) || b.index - a.index)
        .slice(0, limit)
        .flatMap(({ movement }) => {
          const ingredient = inv.ingredients.find((i) => i.id === movement.ingredientId);
          return ingredient
            ? [
                {
                  movement,
                  ingredientName: ingredient.name,
                  purchaseUnit: ingredient.purchaseUnit,
                  stockUnit: ingredient.stockUnit,
                  byName: this.staffName(data, movement.createdBy),
                  balanceAfterMilli: after.get(movement.id) ?? 0,
                },
              ]
            : [];
        });
      const staffIds = [...new Set(inv.movements.map((m) => m.createdBy))];
      return {
        rows,
        total: matching.length,
        limit,
        staff: staffIds.map((sid) => ({ id: sid, name: this.staffName(data, sid) ?? '—' })).sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  }

  // ── Recipes & Food Cost (DEMO, Step B) ─────────────────────────────────────────────────────

  private costBook(data: DemoData) {
    return makeCostBook(data.inventory.ingredients, data.inventory.recipes);
  }

  private recipeFor(data: DemoData, target: RecipeTarget): Recipe | null {
    return data.inventory.recipes.find((r) => sameTarget(r.target, target)) ?? null;
  }

  /** The verified recipe version of each part of an order line; a part without one is left out (Not tracked). */
  private recipeVersionsOf(data: DemoData, line: Parameters<typeof lineRecipeTargets>[0]): Record<string, number> {
    return Object.fromEntries(
      lineRecipeTargets(line).flatMap(({ key, target }) => {
        const recipe = this.recipeFor(data, target);
        const version = recipe ? verifiedVersion(recipe) : null;
        return version ? [[key, version.version] as const] : [];
      }),
    );
  }

  /** The Menu's recipe badge per item: VERIFIED when every size's current recipe is, NONE when no size has one, else DRAFT. */
  private menuRecipeStates(data: DemoData, items: readonly MenuItem[]): NonNullable<MenuSetup['recipes']> {
    return Object.fromEntries(
      items.map((item) => {
        const states = (item.variants.length ? item.variants.map((v) => v.id) : [null]).map((variantId) => {
          const recipe = this.recipeFor(data, { kind: 'ITEM', menuItemId: item.id, variantId });
          return recipe ? (currentVersion(recipe)?.status ?? 'NONE') : 'NONE';
        });
        const state = states.every((s) => s === 'VERIFIED') ? 'VERIFIED' : states.every((s) => s === 'NONE') ? 'NONE' : 'DRAFT';
        const prepared = item.preparedItemId ? data.inventory.ingredients.find((i) => i.id === item.preparedItemId) : undefined;
        return [item.id, { state, preparedName: prepared?.name ?? null }] as const;
      }),
    );
  }

  /**
   * What a size costs: under Auto Scale an automatic size is the base cost × its share (so the sizes match the base
   * exactly); a custom size, or a size without Auto Scale, costs its own lines.
   */
  private sizeCost(data: DemoData, book: ReturnType<DemoAdapter['costBook']>, menuItemId: string, variantId: string | null, recipe: Recipe | null): number | null {
    const scale = variantId ? (data.inventory.recipeScales ?? []).find((s) => s.menuItemId === menuItemId && s.enabled) : undefined;
    const size = scale?.sizes.find((s) => s.variantId === variantId && s.active && !s.custom);
    const base = size ? this.recipeFor(data, { kind: 'ITEM', menuItemId, variantId: null }) : null;
    const baseVersion = base ? currentVersion(base) : null;
    if (scale && size && baseVersion) return scaleCost(linesCost(book, baseVersion.lines).total, size.quantityMilli, scale.baseQuantityMilli);
    const version = recipe ? currentVersion(recipe) : null;
    return version ? linesCost(book, version.lines).total : null;
  }

  /** One row per menu item and size (an item without sizes has one row). */
  private menuRecipeRows(data: DemoData): MenuRecipeRow[] {
    const book = this.costBook(data);
    const tax = data.branch.tax;
    const categories = [...data.categories].sort((a, b) => a.sort - b.sort);
    const items = data.items.filter((i) => !i.archivedAt).sort((a, b) => categories.findIndex((c) => c.id === a.categoryId) - categories.findIndex((c) => c.id === b.categoryId) || a.sort - b.sort);
    return items.flatMap((item) => {
      const sizes = item.variants.length ? [...item.variants].sort((a, b) => a.sort - b.sort) : [null];
      return sizes.map((variant) => {
        const recipe = this.recipeFor(data, { kind: 'ITEM', menuItemId: item.id, variantId: variant?.id ?? null });
        return {
          menuItemId: item.id,
          itemName: item.name,
          categoryName: categories.find((c) => c.id === item.categoryId)?.name ?? '',
          unit: item.unit,
          variantId: variant?.id ?? null,
          variantName: variant?.name ?? null,
          recipe,
          costing: foodCostOf(this.sizeCost(data, book, item.id, variant?.id ?? null, recipe), variant?.price ?? item.basePrice, tax),
        };
      });
    });
  }

  getRecipes(): Promise<RecipesView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const book = this.costBook(data);
      const inv = data.inventory;
      const tax = data.branch.tax;
      const addons = data.modifierGroups.flatMap((group) =>
        group.modifiers.map((modifier) => {
          const recipe = this.recipeFor(data, { kind: 'ADDON', modifierId: modifier.id });
          const version = recipe ? currentVersion(recipe) : null;
          return { modifierId: modifier.id, name: modifier.name, groupName: group.name, recipe, costing: foodCostOf(version ? linesCost(book, version.lines).total : null, modifier.price, tax) };
        }),
      );
      const prepared = inv.ingredients
        .filter((i) => i.kind === 'PREPARED' && i.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((ingredient) => {
          const recipe = this.recipeFor(data, { kind: 'PREPARED', ingredientId: ingredient.id });
          const version = recipe ? currentVersion(recipe) : null;
          return {
            ingredient,
            recipe,
            batchCost: version ? linesCost(book, version.lines).total : null,
            unitCost: ingredientCost(book, ingredient.id, displayFactorMilli(ingredient)),
            soldAs: data.items.filter((i) => !i.archivedAt && i.preparedItemId === ingredient.id).map((i) => ({ menuItemId: i.id, name: i.name })),
            rawTwice: ((twice) => (twice ? { menuItemId: twice.id, name: twice.name } : null))(this.rawTwiceWith(data, ingredient, recipe ? verifiedVersion(recipe) : null)),
          };
        });
      const people = new Set(inv.recipes.flatMap((r) => r.versions.flatMap((v) => [v.savedBy, v.verifiedBy ?? ''])).values());
      return {
        menu: this.menuRecipeRows(data),
        addons,
        prepared,
        ingredients: [...inv.ingredients].sort((a, b) => a.name.localeCompare(b.name)),
        batches: [...book.prepared.entries()].map(([ingredientId, v]) => ({ ingredientId, lines: v.lines, yieldMilli: v.yieldMilli })),
        scales: inv.recipeScales ?? [],
        // Base recipes of items with sizes: the pot that Auto Scale shares out (target variantId null).
        baseRecipes: inv.recipes.filter((r) => r.target.kind === 'ITEM' && r.target.variantId === null && data.items.some((i) => r.target.kind === 'ITEM' && i.id === r.target.menuItemId && i.variants.length > 0)),
        tax: { rateBps: tax.rateBps, pricesIncludeTax: tax.pricesIncludeTax },
        staffNames: Object.fromEntries([...people].filter(Boolean).map((uid) => [uid, this.staffName(data, uid) ?? ''])),
        onHand: Object.fromEntries(inv.ingredients.map((i) => [i.id, onHandOf(i.id, inv.movements)])),
        purchaseRecipes: this.purchaseRecipeRows(data),
        // I3: the newest cooking batches (each card shows its own)
        cookingBatches: [...(inv.cookingBatches ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200),
        lastPurchases: inv.movements
          .filter((m) => m.type === 'PURCHASE')
          .reduce<Record<string, { quantityMilli: number; at: string }>>((latest, m) => {
            if (!latest[m.ingredientId] || m.createdAt >= latest[m.ingredientId]!.at) latest[m.ingredientId] = { quantityMilli: m.quantityMilli, at: m.createdAt };
            return latest;
          }, {}),
      };
    });
  }

  saveRecipe(input: RecipeInput): Promise<Recipe> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const target = input.target;
        const exists =
          target.kind === 'ITEM'
            ? data.items.some((i) => i.id === target.menuItemId && !i.archivedAt && (target.variantId === null ? i.variants.length === 0 : i.variants.some((v) => v.id === target.variantId)))
            : target.kind === 'ADDON'
              ? data.modifierGroups.some((g) => g.modifiers.some((m) => m.id === target.modifierId))
              : inv.ingredients.some((i) => i.id === target.ingredientId && i.kind === 'PREPARED');
        if (!exists) throw new ApiError('NOT_FOUND', 'This menu item, size or add-on was not found.');
        const book = this.costBook(data);
        const problem = checkRecipe(input, inv.ingredients, book);
        if (problem) throw new ApiError('VALIDATION', problem.problem === 'MAIN_INVALID' ? 'The main ingredient must be one of the recipe lines.' : 'Please check the recipe lines.');
        const prepared = target.kind === 'PREPARED';
        return this.writeRecipe(data, user, book, target, input.lines, prepared ? input.yieldMilli : null, input.note, input.verify, prepared ? (input.mainIngredientId ?? null) : null);
      }),
    );
  }

  /** Adds a version when the lines changed (old versions stay); the same lines again only verify. */
  private writeRecipe(
    data: DemoData,
    user: StaffUser,
    book: ReturnType<DemoAdapter['costBook']>,
    target: RecipeTarget,
    lines: RecipeLine[],
    yieldMilli: number | null,
    note: string,
    verify: boolean,
    mainIngredientId: string | null = null,
  ): Recipe {
    const now = nowIso();
    let recipe = this.recipeFor(data, target);
    if (!recipe) {
      recipe = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, target, versions: [] };
      data.inventory.recipes.push(recipe);
    }
    const current = currentVersion(recipe);
    // Only cooked food carries a main ingredient; other recipes keep their old shape
    const next = { lines, yieldMilli, ...(mainIngredientId ? { mainIngredientId } : {}) };
    if (current && sameRecipe(current, next)) {
      // Nothing changed: a double tap adds nothing; "Save & verify" only marks it verified.
      if (verify && current.status === 'DRAFT') Object.assign(current, { status: 'VERIFIED', verifiedBy: user.id, verifiedAt: now });
      return recipe;
    }
    recipe.versions.push({
      version: (current?.version ?? 0) + 1,
      ...next,
      status: verify ? 'VERIFIED' : 'DRAFT',
      note: note.trim(),
      savedBy: user.id,
      savedAt: now,
      verifiedBy: verify ? user.id : null,
      verifiedAt: verify ? now : null,
      costAtSave: linesCost(book, lines).total,
    });
    return recipe;
  }

  /**
   * Auto Scale in one step, like one database transaction: (1) the Menu, only when the owner confirmed: new sizes and
   * changed prices, sizes keep their ids; (2) the base recipe (variantId null); (3) every ticked size: its own lines
   * when custom, else the base × its share; (4) the setup. Nothing is saved while one part is wrong.
   */
  saveScaledRecipe(input: ScaledRecipeInput): Promise<RecipeScale> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        inv.recipeScales ??= [];
        const item = data.items.find((i) => i.id === input.menuItemId && !i.archivedAt);
        if (!item) throw new ApiError('NOT_FOUND', 'This menu item was not found.');
        const variantOf = (variantId: string | null) => (variantId ? item.variants.find((v) => v.id === variantId) : undefined);
        if (input.sizes.some((s) => s.variantId !== null && !variantOf(s.variantId))) throw new ApiError('NOT_FOUND', 'This size was not found in the Menu.');
        const added = input.sizes.filter((s) => s.variantId === null);
        if (added.length > 0 && !input.updateMenu) throw new ApiError('VALIDATION', 'A new size reaches the Menu only after you confirm it.');
        const repriced = input.sizes.filter((s) => s.variantId !== null && variantOf(s.variantId)!.price !== s.price);
        const ids = new Map<number, string>();
        if (input.updateMenu && (added.length > 0 || repriced.length > 0)) {
          this.require(data, 'menu.manage');
          const sizes = [
            ...item.variants.map((v) => ({ name: v.name, price: input.sizes.find((s) => s.variantId === v.id)?.price ?? v.price })),
            ...added.map((s) => ({ name: cleanName(s.name), price: s.price })),
          ];
          const check = checkMenuItem({ name: item.name, description: item.description, price: null, sizes }, []);
          const category = data.categories.find((c) => c.id === item.categoryId);
          if (check) throw new ApiError('VALIDATION', menuMessage(check, item.name, category?.name ?? ''));
          for (const v of item.variants) v.price = input.sizes.find((s) => s.variantId === v.id)?.price ?? v.price;
          // An item sold per kg gets sizes for the first time: the size now says the weight ("1 × Chicken Karahi (½ kg)").
          if (item.variants.length === 0 && item.unit === 'kg') item.unit = 'piece';
          input.sizes.forEach((s, index) => {
            if (s.variantId !== null) return;
            const variant = { id: newId(), name: cleanName(s.name), price: s.price, sort: item.variants.length + 1 };
            item.variants.push(variant);
            ids.set(index, variant.id);
          });
          item.basePrice = Math.min(...item.variants.map((v) => v.price));
        }
        const sizes = input.sizes.map((s, index) => ({ ...s, variantId: s.variantId ?? ids.get(index)! }));

        const scaleProblem = checkRecipeScale({
          baseQuantityMilli: input.baseQuantityMilli,
          baseUnit: input.baseUnit,
          sizes: sizes.map((s) => ({ variantId: s.variantId, quantityMilli: s.quantityMilli, active: s.active, custom: s.customLines !== null })),
        });
        if (scaleProblem) throw new ApiError('VALIDATION', SCALE_MESSAGES[scaleProblem.problem]);
        const book = this.costBook(data);
        const baseTarget: RecipeTarget = { kind: 'ITEM', menuItemId: item.id, variantId: null };
        const toCheck = [
          { target: baseTarget, lines: input.baseLines },
          ...sizes.filter((s) => s.active && s.customLines).map((s) => ({ target: { kind: 'ITEM' as const, menuItemId: item.id, variantId: s.variantId }, lines: s.customLines! })),
        ];
        if (toCheck.some((r) => checkRecipe({ target: r.target, lines: r.lines, yieldMilli: null, note: input.note }, inv.ingredients, book) !== null)) {
          throw new ApiError('VALIDATION', 'Please check the recipe lines.');
        }

        this.writeRecipe(data, user, book, baseTarget, input.baseLines, null, input.note, input.verify);
        for (const size of sizes.filter((s) => s.active)) {
          const lines = size.customLines ?? scaleLines(input.baseLines, size.quantityMilli, input.baseQuantityMilli);
          this.writeRecipe(data, user, book, { kind: 'ITEM', menuItemId: item.id, variantId: size.variantId }, lines, null, input.note, input.verify);
        }
        const setup = {
          enabled: true,
          baseQuantityMilli: input.baseQuantityMilli,
          baseUnit: input.baseUnit,
          sizes: sizes.map((s) => ({ variantId: s.variantId, quantityMilli: s.quantityMilli, active: s.active, custom: s.customLines !== null })),
          updatedBy: user.id,
          updatedAt: nowIso(),
        };
        const existing = inv.recipeScales.find((s) => s.menuItemId === item.id);
        if (existing) return Object.assign(existing, setup);
        const scale: RecipeScale = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, menuItemId: item.id, ...setup };
        inv.recipeScales.push(scale);
        return scale;
      }),
    );
  }

  turnOffRecipeScale(menuItemId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const scale = (data.inventory.recipeScales ?? []).find((s) => s.menuItemId === menuItemId);
        if (scale) Object.assign(scale, { enabled: false, updatedBy: user.id, updatedAt: nowIso() });
      }),
    );
  }

  /**
   * A cooked dish on the POS, in one step like one database transaction (owner, 2026-11-08): (1) the menu product: the one
   * chosen to link, or a new one (never a second product with the same name, a new category when asked); (2) its link to the
   * dish; (3) each size's recipe = its portion of the dish, VERIFIED (a new version when it changed, old versions stay). Auto
   * Scale is turned off for a linked product: its sizes now come from the dish. Nothing is saved while one part is wrong.
   */
  sellPreparedItem(input: SellPreparedInput): Promise<MenuItem> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'menu.manage');
        const user = this.require(data, 'inventory.manage');
        const prepared = data.inventory.ingredients.find((i) => i.id === input.preparedId && i.kind === 'PREPARED');
        if (!prepared) throw new ApiError('NOT_FOUND', 'This prepared item was not found.');
        if (input.sizes.length === 0 || input.sizes.some((s) => !checkPortion(s.portionMilli))) {
          throw new ApiError('VALIDATION', 'Type how much of the dish each size takes (more than 0).');
        }

        let item: MenuItem;
        let rows = input.sizes;
        if (input.menuItemId) {
          const existing = data.items.find((i) => i.id === input.menuItemId && !i.archivedAt);
          if (!existing) throw new ApiError('NOT_FOUND', 'Menu item not found.');
          // His sizes and prices as typed here go to the Menu too (owner, 2026-11-08); a size keeps its id when only renamed or
          // repriced, so held bills still find it; old bills keep their own copies of the prices
          const one = input.sizes.length === 1 ? input.sizes[0]! : null;
          const sizes = one ? [] : input.sizes.map((s) => ({ name: s.name, price: s.price }));
          const check = checkMenuItem({ name: existing.name, description: existing.description, price: one ? one.price : null, sizes }, []);
          if (check) throw new ApiError('VALIDATION', menuMessage(check, existing.name, data.categories.find((c) => c.id === existing.categoryId)?.name ?? ''));
          const variants: ItemVariant[] = one
            ? []
            : input.sizes.map((s, index) => ({
                id: s.variantId && existing.variants.some((v) => v.id === s.variantId) ? s.variantId : newId(),
                name: cleanName(s.name),
                price: s.price ?? 0,
                sort: index + 1,
              }));
          Object.assign(existing, { variants, basePrice: variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : (one?.price ?? 0) });
          rows = input.sizes.map((s, index) => ({ ...s, variantId: variants[index]?.id ?? null }));
          item = existing;
        } else {
          const name = cleanName(input.name);
          const clash = data.items.find((i) => !i.archivedAt && (sameName(i.name, name) || sameDish(i.name, name)));
          if (clash) throw new ApiError('CONFLICT', `${clash.name} is already on the menu. Link it instead of making it again.`);
          let category = input.categoryId ? data.categories.find((c) => c.id === input.categoryId) : undefined;
          if (input.categoryId && !category) throw new ApiError('VALIDATION', 'Choose a category.');
          if (!category) {
            const categoryName = cleanName(input.newCategoryName);
            const problem = checkName(categoryName, data.categories.map((c) => c.name));
            if (problem) throw new ApiError('VALIDATION', menuMessage({ problem: problem as MenuProblem }, categoryName, 'category'));
            category = { id: newId(), restaurantId: data.restaurant.id, branchId: null, name: categoryName, sort: Math.max(0, ...data.categories.map((c) => c.sort)) + 1, isActive: true };
            data.categories.push(category);
          }
          if (!data.stations.some((s) => s.id === input.stationId)) throw new ApiError('VALIDATION', 'Choose a kitchen station.');
          // One row = one price per plate; two or more = sizes (Full plate, Half plate)
          const one = input.sizes.length === 1 ? input.sizes[0]! : null;
          const sizes = one ? [] : input.sizes.map((s) => ({ name: s.name, price: s.price }));
          const check = checkMenuItem({ name, description: '', price: one ? one.price : null, sizes }, []);
          if (check) throw new ApiError('VALIDATION', menuMessage(check, name, category.name));
          const variants: ItemVariant[] = sizes.map((s, index) => ({ id: newId(), name: cleanName(s.name), price: s.price ?? 0, sort: index + 1 }));
          item = {
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: null,
            categoryId: category.id,
            stationId: input.stationId,
            name,
            description: '',
            basePrice: variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : (one?.price ?? 0),
            unit: 'plate',
            isAvailable: true,
            isOnline: input.isOnline,
            sort: Math.max(0, ...data.items.map((i) => i.sort)) + 1,
            variants,
            modifierGroupIds: [],
            archivedAt: null,
          };
          data.items.push(item);
          // The rows now point at the sizes just made, in the same order
          rows = input.sizes.map((s, index) => ({ ...s, variantId: variants[index]?.id ?? null }));
        }

        item.preparedItemId = prepared.id;
        const scale = (data.inventory.recipeScales ?? []).find((s) => s.menuItemId === item.id && s.enabled);
        if (scale) Object.assign(scale, { enabled: false, updatedBy: user.id, updatedAt: nowIso() });
        const book = this.costBook(data);
        for (const size of rows) {
          const target: RecipeTarget = { kind: 'ITEM', menuItemId: item.id, variantId: size.variantId };
          this.writeRecipe(data, user, book, target, portionLines(prepared.id, size.portionMilli), null, `Sold from ${prepared.name}`, true);
        }
        return item;
      }),
    );
  }

  // ── Cooking batches and the cooking plan (I3, owner 2026-11-09) ──────────────────────────────

  /** A dish's verified recipe and how it is cooked: by its main raw ingredient, else by recipe batches (naan dough). */
  private cookingRecipe(data: DemoData, preparedId: string) {
    const dish = data.inventory.ingredients.find((i) => i.id === preparedId && i.kind === 'PREPARED');
    const recipe = dish ? this.recipeFor(data, { kind: 'PREPARED', ingredientId: dish.id }) : null;
    const version = recipe ? verifiedVersion(recipe) : null;
    const latest = recipe ? currentVersion(recipe) : null;
    const mode: CookMode = (version ?? latest)?.mainIngredientId ? 'MAIN' : 'BATCHES';
    return { dish, recipe, version, mode };
  }

  /**
   * The menu product that would take a cooked dish's raw ingredients a second time (IM1): the same dish, not linked to it, with a
   * verified recipe of its own that uses them. Null when there is none.
   */
  private rawTwiceWith(data: DemoData, dish: Ingredient, version: RecipeVersion | null): MenuItem | null {
    if (!version) return null;
    return (
      data.items.find((item) => {
        if (item.archivedAt) return false;
        const lines = (item.variants.length ? item.variants.map((v) => v.id) : [null]).flatMap((variantId) => {
          const recipe = this.recipeFor(data, { kind: 'ITEM', menuItemId: item.id, variantId });
          return (recipe ? verifiedVersion(recipe) : null)?.lines ?? [];
        });
        return takesRawTwice(dish, version.lines, item, lines);
      }) ?? null
    );
  }

  /**
   * The branch's calendar date today: only for expiry dates, which are calendar dates. Sales, purchases, the cooking plan and
   * its batches all follow the business day (branchToday), so every screen means the same "today" (IM1).
   */
  private calendarToday(data: DemoData): string {
    return localClock(new Date(), data.branch.timezone).date;
  }

  /**
   * Stock that may be cooked with, sold, eaten by staff or given away (W3): the lots that are not expired or held, plus stock on
   * no lot, never below zero. Stock without a confirmed date counts (it is Needs review, never shown as safe).
   */
  private usableStock(data: DemoData): (ingredientId: string) => number {
    const book = this.lotBook(data);
    return (ingredientId) => book.usable(ingredientId);
  }

  // ── Lots and expiry (W3, owner 2026-11-11) ─────────────────────────────────────────────────

  private lotClock(data: DemoData): LotClock {
    return { date: this.calendarToday(data), at: Date.now() };
  }

  /** Every lot's state and remaining stock, worked out from the movements once per call. */
  private lotBook(data: DemoData) {
    const inv = data.inventory;
    const lots = inv.lots ?? [];
    const now = this.lotClock(data);
    const stateOf = (lot: StockLot) => lotDateState(lot, now, inv.expiringSoonDays);
    // A past use is judged as the lots were then: expired by that day, held until it was released
    const tz = data.branch.timezone;
    const blockedAt = (lot: StockLot, at: string) => {
      const heldThen = lot.held || Boolean(lot.release && at < lot.release.at);
      return heldThen || lotDateState({ ...lot, held: false }, { date: localClock(new Date(at), tz).date, at: Date.parse(at) }, inv.expiringSoonDays) === 'EXPIRED';
    };
    const ledger = lotLedger(lots, inv.movements, inv.lotsSince ?? null, blockedAt);
    const remaining = (lotId: string) => ledger.remaining.get(lotId) ?? 0;
    const state = (lot: StockLot) => lotState(lot, remaining(lot.id), now, inv.expiringSoonDays);
    const usable = (ingredientId: string) => usableOfLots(ingredientId, lots, ledger, (lot) => isUsableState(stateOf(lot)));
    return { lots, ledger, now, remaining, state, usable };
  }

  private newLot(
    data: DemoData,
    fields: Pick<StockLot, 'ingredientId' | 'source' | 'sourceId' | 'firstMilli' | 'cost' | 'date' | 'dateKind' | 'dateFrom'> & Partial<Pick<StockLot, 'discardAt' | 'supplierId' | 'held' | 'holdReason' | 'unverified'>>,
    userId: string,
    at: string,
  ): StockLot {
    const lot: StockLot = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, receivedAt: at, unverified: false, held: false, createdBy: userId, createdAt: at, ...fields };
    (data.inventory.lots ??= []).push(lot);
    return lot;
  }

  /** The lot a cooking batch made ({} for a batch from before lots) */
  private batchLotOf(data: DemoData, batchId: string): { lotId?: string } {
    const lot = (data.inventory.lots ?? []).find((l) => l.source === 'BATCH' && l.sourceId === batchId);
    return lot ? { lotId: lot.id } : {};
  }

  /** What a day's plan still has to cook (each row's amount minus its batches of that day) needs, against the usable stock. */
  private planCheck(data: DemoData, date: string) {
    const inv = data.inventory;
    const rows = planOf(inv.cookingPlan, date).map((row) => ({ ...row, ...planLeft(row, inv.cookingBatches ?? [], date) }));
    // Only what is left to cook is needed: 2 of 5 kg cooked leaves 3 kg (IM1; before, any batch made the row done)
    const uses = planUses(
      rows.filter((r) => r.leftMilli > 0).map((r) => ({ preparedId: r.preparedId, mode: r.mode, amountMilli: r.leftMilli })),
      (preparedId) => this.cookingRecipe(data, preparedId).version,
    );
    return { rows, needs: stockNeeds(uses, this.usableStock(data)) };
  }

  recordCookingBatch(input: CookingBatchInput): Promise<CookingBatch> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        // A double tap or retry with the same key returns the first batch: the raw stock goes out once
        const key = 'cooking:' + input.idempotencyKey;
        const done = data.idempotency[key];
        if (done) {
          const first = (inv.cookingBatches ?? []).find((b) => b.id === done);
          if (first) return first;
        }
        const { dish, recipe, version, mode } = this.cookingRecipe(data, input.preparedId);
        if (!dish || !recipe) throw new ApiError('NOT_FOUND', 'This dish or its recipe was not found.');
        if (input.mode !== mode) throw new ApiError('VALIDATION', 'Please open the Cook box again: the recipe changed.');
        const twice = this.rawTwiceWith(data, dish, version);
        if (twice) throw new ApiError('CONFLICT', `${twice.name} on the POS still takes its raw ingredients by its own recipe. Link it first: Sell on POS on ${dish.name}. Then a sale takes the cooked dish and the raw stock is taken once.`);
        const plan = version ? batchPlan(version, mode, input.amountMilli) : null;
        const needs = plan ? stockNeeds(plan.uses, this.usableStock(data)) : [];
        const problem = checkBatch({ verified: Boolean(version), plan, actualMilli: input.actualMilli, plateMilli: input.plateMilli, needs });
        if (problem === 'SHORT') {
          const names = needs.filter((n) => n.shortMilli > 0).map((n) => inv.ingredients.find((i) => i.id === n.ingredientId)?.name ?? '');
          throw new ApiError('CONFLICT', `Not enough in stock: ${names.join(', ')}. Receive a purchase bill or correct the stock first.`);
        }
        if (problem || !plan || !version) throw new ApiError('VALIDATION', BATCH_MESSAGES[problem ?? 'AMOUNT_INVALID']);
        const now = nowIso();
        const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
        const book = this.costBook(data);
        const batch: CookingBatch = {
          id: newId(),
          ...scope,
          preparedId: dish.id,
          recipeId: recipe.id,
          recipeVersion: version.version,
          mode,
          amountMilli: input.amountMilli,
          uses: plan.uses,
          expectedMilli: plan.expectedMilli,
          actualMilli: input.actualMilli,
          cost: linesCost(book, plan.lines).total,
          plateMilli: input.plateMilli,
          planDate: input.planDate ?? this.branchToday(data),
          note: input.note.trim().slice(0, MAX_MOVEMENT_NOTE),
          status: 'DONE',
          createdBy: user.id,
          createdAt: now,
        };
        const note = `Cooked ${dish.name}`;
        for (const use of plan.uses) {
          inv.movements.push({ id: newId(), ...scope, ingredientId: use.ingredientId, type: 'COOK_USE', quantityMilli: -use.quantityMilli, reason: null, note, createdBy: user.id, createdAt: now, batchId: batch.id, cost: ingredientCost(book, use.ingredientId, use.quantityMilli) });
        }
        // W3: the batch is its own lot, thrown away after the dish's own hours (no default: none = Needs review)
        const hours = dish.discardHours ?? null;
        const lot = this.newLot(data, { ingredientId: dish.id, source: 'BATCH', sourceId: batch.id, firstMilli: input.actualMilli, cost: batch.cost, date: null, dateKind: hours ? 'USE_BY' : 'UNKNOWN', discardAt: hours ? discardAtOf(now, hours) : null, dateFrom: hours ? 'DISH_HOURS' : 'NONE' }, user.id, now);
        // The raw cost moves into the cooked food: the same money, not a second expense
        inv.movements.push({ id: newId(), ...scope, ingredientId: dish.id, type: 'COOKED', quantityMilli: input.actualMilli, reason: null, note, createdBy: user.id, createdAt: now, batchId: batch.id, cost: batch.cost, lotId: lot.id });
        (inv.cookingBatches ??= []).push(batch);
        Object.assign(dish, { plateMilli: input.plateMilli, updatedAt: now });
        data.idempotency[key] = batch.id;
        return batch;
      }),
    );
  }

  /** A batch of this branch that is still counted (not reversed), else an error. */
  private doneBatch(data: DemoData, batchId: string): CookingBatch {
    const batch = (data.inventory.cookingBatches ?? []).find((b) => b.id === batchId);
    if (!batch) throw new ApiError('NOT_FOUND', 'This cooking batch was not found.');
    if (batch.status !== 'DONE') throw new ApiError('CONFLICT', 'This batch was already reversed.');
    return batch;
  }

  correctCookingBatch(batchId: string, actualMilli: number, reason: string): Promise<CookingBatch> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const batch = this.doneBatch(data, batchId);
        const why = reason.trim();
        if (!why) throw new ApiError('VALIDATION', BATCH_MESSAGES.REASON_REQUIRED);
        if (!Number.isInteger(actualMilli) || actualMilli <= 0 || actualMilli > MAX_COOK_MILLI) throw new ApiError('VALIDATION', BATCH_MESSAGES.ACTUAL_INVALID);
        const delta = actualMilli - batch.actualMilli;
        if (delta === 0) return batch;
        if (delta < 0 && onHandOf(batch.preparedId, inv.movements) < -delta) throw new ApiError('CONFLICT', 'Less of this dish is left than the correction takes away.');
        const now = nowIso();
        // A corrected weight changes the amount, not what the batch cost
        inv.movements.push({ id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, ingredientId: batch.preparedId, type: 'COOKED', quantityMilli: delta, reason: null, note: `Correction: ${why}`.slice(0, MAX_MOVEMENT_NOTE), createdBy: user.id, createdAt: now, batchId: batch.id, cost: 0, ...this.batchLotOf(data, batch.id) });
        (batch.corrections ??= []).push({ fromMilli: batch.actualMilli, toMilli: actualMilli, reason: why, by: user.id, at: now });
        batch.actualMilli = actualMilli;
        return batch;
      }),
    );
  }

  reverseCookingBatch(batchId: string, reason: string): Promise<CookingBatch> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const batch = this.doneBatch(data, batchId);
        const why = reason.trim();
        if (!why) throw new ApiError('VALIDATION', BATCH_MESSAGES.REASON_REQUIRED);
        // Only while what it made is still there: sold or used food cannot go back to raw
        if (onHandOf(batch.preparedId, inv.movements) < batch.actualMilli) throw new ApiError('CONFLICT', 'Some of this batch is already used, so it cannot be reversed. Correct the stock instead.');
        const now = nowIso();
        const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
        const note = `Reversed: ${why}`.slice(0, MAX_MOVEMENT_NOTE);
        for (const use of batch.uses) {
          // The same value goes back that the batch took (missing on a batch from before IM1)
          const taken = inv.movements.find((m) => m.batchId === batch.id && m.type === 'COOK_USE' && m.ingredientId === use.ingredientId && m.quantityMilli < 0);
          inv.movements.push({ id: newId(), ...scope, ingredientId: use.ingredientId, type: 'COOK_USE', quantityMilli: use.quantityMilli, reason: null, note, createdBy: user.id, createdAt: now, batchId: batch.id, ...(taken?.cost !== undefined && { cost: taken.cost }) });
        }
        inv.movements.push({ id: newId(), ...scope, ingredientId: batch.preparedId, type: 'COOKED', quantityMilli: -batch.actualMilli, reason: null, note, createdBy: user.id, createdAt: now, batchId: batch.id, cost: batch.cost, ...this.batchLotOf(data, batch.id) });
        Object.assign(batch, { status: 'REVERSED', reversedBy: user.id, reversedAt: now, reverseReason: why });
        return batch;
      }),
    );
  }

  getCookingPlan(date?: string): Promise<CookingPlanView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const inv = data.inventory;
      const today = this.branchToday(data);
      // 'today' comes from the cooked-stock alert (I4)
      const day = date === 'today' ? today : date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : nextDate(today);
      const { rows, needs } = this.planCheck(data, day);
      const nameOf = (id: string | null | undefined) => (id ? (inv.ingredients.find((i) => i.id === id)?.name ?? null) : null);
      const lotBook = this.lotBook(data);
      const dishes = inv.ingredients
        .filter((i) => i.kind === 'PREPARED' && i.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((dish) => {
          const { version, mode, recipe } = this.cookingRecipe(data, dish.id);
          const main = (version ?? (recipe ? currentVersion(recipe) : null))?.mainIngredientId;
          return { preparedId: dish.id, name: dish.name, mode, mainId: main ?? null, mainName: nameOf(main), verified: Boolean(version), stockUnit: dish.stockUnit };
        });
      return {
        date: day,
        today,
        ownPlan: (inv.cookingPlan?.days ?? []).some((d) => d.date === day),
        daily: inv.cookingPlan?.daily ?? [],
        rows: rows.map((row) => {
          const dish = dishes.find((d) => d.preparedId === row.preparedId);
          const { version } = this.cookingRecipe(data, row.preparedId);
          return {
            ...row,
            name: dish?.name ?? '—',
            stockUnit: dish?.stockUnit ?? 'g',
            mainName: dish?.mainName ?? null,
            verified: dish?.verified ?? false,
            expectedMilli: version ? (batchPlan(version, row.mode, row.amountMilli)?.expectedMilli ?? null) : null,
            cooked: row.leftMilli === 0,
          };
        }),
        needs: needs
          .map((need) => {
            const ingredient = inv.ingredients.find((i) => i.id === need.ingredientId)!;
            const onHand = onHandOf(ingredient.id, inv.movements);
            const status = stockStatus({ onHandMilli: onHand, minStockMilli: ingredient.minStockMilli, isActive: ingredient.isActive });
            return {
              ...need,
              ingredient,
              low: status === 'LOW' || status === 'OUT',
              // W3: some of its stock is on an expired lot (it does not count as usable)
              expired: lotBook.lots.some((l) => l.ingredientId === ingredient.id && lotBook.state(l) === 'EXPIRED'),
              supplierName: nameOfSupplier(inv.suppliers, this.supplierFor(data, ingredient.id)),
            };
          })
          .sort((a, b) => Number(b.shortMilli > 0) - Number(a.shortMilli > 0) || a.ingredient.name.localeCompare(b.ingredient.name)),
        dishes,
        checks: inv.cookingChecks ?? [...DEFAULT_COOKING_CHECKS],
      };
    });
  }

  /** Who brings an ingredient: its preferred supplier, else the first supplier who has it on his list. */
  private supplierFor(data: DemoData, ingredientId: string): string | null {
    const inv = data.inventory;
    const preferred = inv.ingredients.find((i) => i.id === ingredientId)?.preferredSupplierId;
    if (preferred && inv.suppliers.some((s) => s.id === preferred && s.isActive)) return preferred;
    return inv.suppliers.find((s) => s.isActive && s.productIds.includes(ingredientId))?.id ?? null;
  }

  saveCookingPlan(input: { date: string | null; rows: PlanRow[] }): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const inv = data.inventory;
        if (input.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ApiError('VALIDATION', 'Choose a date.');
        const seen = new Set<string>();
        for (const row of input.rows) {
          const { dish, mode } = this.cookingRecipe(data, row.preparedId);
          if (!dish) throw new ApiError('NOT_FOUND', 'A dish of the plan was not found.');
          if (seen.has(row.preparedId)) throw new ApiError('VALIDATION', `${dish.name} is in the plan twice.`);
          seen.add(row.preparedId);
          if (row.mode !== mode || !Number.isInteger(row.amountMilli) || row.amountMilli <= 0 || row.amountMilli > MAX_COOK_MILLI) {
            throw new ApiError('VALIDATION', `Type how much ${dish.name} is cooked (more than 0).`);
          }
        }
        const plan = (inv.cookingPlan ??= { daily: [], days: [] });
        const rows = input.rows.map((r) => ({ preparedId: r.preparedId, mode: r.mode, amountMilli: r.amountMilli }));
        if (input.date === null) plan.daily = rows;
        else plan.days = [...plan.days.filter((d) => d.date !== input.date), { date: input.date, rows }];
      }),
    );
  }

  draftShortageBills(date: string): Promise<{ drafts: { supplierId: string; supplierName: string; lines: number }[]; withoutSupplier: string[] }> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const short = this.planCheck(data, date).needs.filter((n) => n.shortMilli > 0);
        const drafts = new Map<string, number>();
        const withoutSupplier: string[] = [];
        for (const need of short) {
          const ingredient = inv.ingredients.find((i) => i.id === need.ingredientId)!;
          const supplierId = this.supplierFor(data, ingredient.id);
          const option = findBuyOption(ingredient, 'main');
          if (!supplierId || !option) {
            withoutSupplier.push(ingredient.name);
            continue;
          }
          const supplier = inv.suppliers.find((s) => s.id === supplierId)!;
          // What is short, rounded up to whole purchase units (0.3 kg short of a 1 kg pack → 1 pack); a draft never changes stock
          const units = String(Math.ceil(need.shortMilli / option.sizeMilli));
          const draft =
            (inv.purchaseDrafts ?? []).find((d) => d.supplierId === supplierId) ??
            ({ supplierId, billNo: '', date: this.branchToday(data), lines: [], discount: '', discountMode: 'RS', paid: '', method: 'CASH', note: '', savedAt: nowIso() } satisfies PurchaseDraft);
          const line = draft.lines.find((l) => l.ingredientId === ingredient.id && (l.unitKey ?? 'main') === 'main');
          const rate = paisaToInput(supplier.rates?.[supplierRateKey(ingredient.id, 'main')] ?? ingredient.purchasePrice);
          if (line) line.quantity = String(Math.max(Number(line.quantity) || 0, Number(units)));
          else draft.lines.push({ ingredientId: ingredient.id, unitKey: 'main', quantity: units, rate });
          inv.purchaseDrafts = [...(inv.purchaseDrafts ?? []).filter((d) => d.supplierId !== supplierId), { ...draft, savedAt: nowIso() }];
          if (!supplier.productIds.includes(ingredient.id)) supplier.productIds.push(ingredient.id);
          drafts.set(supplierId, (drafts.get(supplierId) ?? 0) + 1);
        }
        return {
          drafts: [...drafts.entries()].map(([supplierId, lines]) => ({ supplierId, supplierName: inv.suppliers.find((s) => s.id === supplierId)?.name ?? '', lines })),
          withoutSupplier,
        };
      }),
    );
  }

  saveCookingChecks(checks: CookingCheckTime[]): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'settings.manage');
        if (checks.length > MAX_COOKING_CHECKS || checks.some((c) => !isClockTime(c.time) || (c.forDay !== 'TODAY' && c.forDay !== 'TOMORROW'))) {
          throw new ApiError('VALIDATION', `Type up to ${MAX_COOKING_CHECKS} times like 20:00.`);
        }
        data.inventory.cookingChecks = checks.map((c) => ({ time: c.time, forDay: c.forDay }));
      }),
    );
  }

  // ── I4: stock used by sales, ready food given to another order (owner, 2026-11-09) ───────────

  /** The recipe version a line kept (I2), from the recipe's saved versions. */
  private keptVersion(data: DemoData, target: RecipeTarget, version: number): RecipeVersion | null {
    return this.recipeFor(data, target)?.versions.find((v) => v.version === version) ?? null;
  }

  /** "Chicken Karahi (1 kg)" */
  private lineLabel(item: Pick<OrderItem, 'name' | 'variantName'>): string {
    return item.variantName ? `${item.name} (${item.variantName})` : item.name;
  }

  /** The names of a line's parts that have no verified recipe ("Chicken Karahi (1 kg)", "Extra makhan"). */
  private partNames(data: DemoData, item: OrderItem, keys: readonly string[]): string[] {
    return keys.map((key) => {
      if (key.startsWith('addon:')) return data.modifierGroups.flatMap((g) => g.modifiers).find((m) => m.id === key.slice(6))?.name ?? item.name;
      const variant = data.items.find((i) => i.id === item.menuItemId)?.variants.find((v) => v.id === key.slice(5));
      return variant ? `${item.name} (${variant.name})` : item.name;
    });
  }

  /** The reuse setting of a line's dish: may it go to another order after a cancel? */
  private reuseFor(data: DemoData, line: { menuItemId: string | null }): ReuseSetting {
    const menuItem = data.items.find((i) => i.id === line.menuItemId);
    if (!menuItem) return { enabled: false, safeHours: 0, overnight: false };
    return reuseOf(menuItem, data.categories.find((c) => c.id === menuItem.categoryId)?.name ?? '');
  }

  /** Cost of some portions of a ready food. */
  private foodCostShare(data: DemoData, availableId: string, quantity: number): number | null {
    const food = (data.inventory.availableFood ?? []).find((f) => f.id === availableId);
    return food && food.cost !== null && food.quantity > 0 ? mulDivRound(food.cost, quantity, food.quantity) : null;
  }

  /** Takes one line's stock, once, by its kept recipe: raw and cooked ingredients each from their own stock. Portions given from ready food take nothing raw. */
  private takeLineStock(data: DemoData, order: Order, item: OrderItem, userId: string, how: StockHow): void {
    const stock = item.stock;
    if (!stock || stock.takenAt || item.isVoid) return;
    const portions = Math.max(0, item.quantity - givenPortions(stock));
    const { uses, notTracked } = saleUses(item, portions, (target, version) => this.keptVersion(data, target, version));
    const at = nowIso();
    const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
    const note = `Order #${order.dailyNumber} · ${item.quantity} × ${this.lineLabel(item)}`.slice(0, MAX_MOVEMENT_NOTE);
    const book = this.costBook(data);
    for (const use of uses) {
      data.inventory.movements.push({ id: newId(), ...scope, ingredientId: use.ingredientId, type: 'SALE_USE', quantityMilli: -use.quantityMilli, reason: null, note, createdBy: userId, createdAt: at, orderId: order.id, orderItemId: item.id, cost: ingredientCost(book, use.ingredientId, use.quantityMilli) });
    }
    const costs = [...uses.map((u) => ingredientCost(book, u.ingredientId, u.quantityMilli)), ...(stock.fromAvailable ?? []).map((f) => this.foodCostShare(data, f.availableId, f.quantity))];
    stock.takenAt = at;
    stock.how = how;
    stock.notTracked = this.partNames(data, item, notTracked);
    stock.cost = costs.some((c) => c === null) ? null : costs.reduce<number>((sum, c) => sum + (c ?? 0), 0);
  }

  /** Gives back what a line still holds: the kitchen's Undo (taken again at Ready), or food put back in stock (stays handled). */
  private returnLineStock(data: DemoData, order: Order, item: OrderItem, userId: string, why: string, keepHandled: boolean): void {
    const stock = item.stock;
    if (!stock?.takenAt) return;
    const at = nowIso();
    const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
    const note = `${why} · Order #${order.dailyNumber} · ${this.lineLabel(item)}`.slice(0, MAX_MOVEMENT_NOTE);
    const own = data.inventory.movements.filter((m) => m.orderItemId === item.id);
    for (const back of netTaken(own)) {
      // What comes back is worth what the line took of it (its share when only a part is still held)
      const taken = own.filter((m) => m.ingredientId === back.ingredientId && m.type === 'SALE_USE');
      const takenMilli = taken.reduce((sum, m) => sum - m.quantityMilli, 0);
      const cost = takenMilli > 0 && taken.every((m) => typeof m.cost === 'number') ? mulDivRound(taken.reduce((sum, m) => sum + (m.cost ?? 0), 0), back.quantityMilli, takenMilli) : null;
      data.inventory.movements.push({ id: newId(), ...scope, ingredientId: back.ingredientId, type: 'SALE_RETURN', quantityMilli: back.quantityMilli, reason: null, note, createdBy: userId, createdAt: at, orderId: order.id, orderItemId: item.id, cost });
    }
    if (keepHandled) return;
    stock.takenAt = null;
    delete stock.how;
    delete stock.cost;
    delete stock.notTracked;
  }

  /** Takes the stock of every line whose ticket is Ready (or served) and not taken yet. */
  private syncStock(data: DemoData, order: Order, userId: string): void {
    for (const item of order.items) {
      const ticket = order.tickets.find((t) => t.id === item.ticketId);
      if (ticket && (ticket.status === 'READY' || ticket.status === 'SERVED') && ticket.cancelDecision !== 'PENDING') this.takeLineStock(data, order, item, userId, 'READY');
    }
  }

  private returnTicketStock(data: DemoData, order: Order, ticketId: string, userId: string): void {
    for (const item of order.items) if (item.ticketId === ticketId && item.stock?.how === 'READY') this.returnLineStock(data, order, item, userId, 'Kitchen Undo', false);
  }

  /** Decision 3: a dine-in bill paid before the kitchen pressed Ready takes the stock then. */
  private closeStock(data: DemoData, order: Order, userId: string): void {
    for (const item of order.items) this.takeLineStock(data, order, item, userId, 'CLOSE');
  }

  /** Portions a line was given from ready food go back to it (the line was voided or cancelled before it was made). */
  private giveBack(data: DemoData, item: OrderItem): void {
    for (const given of item.stock?.fromAvailable ?? []) {
      const food = (data.inventory.availableFood ?? []).find((f) => f.id === given.availableId);
      if (!food) continue;
      food.remaining += given.quantity;
      food.givenTo = food.givenTo.filter((g) => g.itemId !== item.id);
    }
    if (item.stock) item.stock.fromAvailable = [];
  }

  /** Was the line's food made, was it served, is it still cooking, and what may happen to it now. */
  private madeLine(data: DemoData, order: Order, item: OrderItem): Omit<MadeFoodLine, 'itemId' | 'name' | 'variantName' | 'quantity' | 'unit'> {
    const ticket = order.tickets.find((t) => t.id === item.ticketId);
    const made = Boolean(item.stock?.takenAt) && !item.stock?.outcome;
    const served = ticket?.status === 'SERVED';
    const reuse = this.reuseFor(data, item);
    const menuItem = data.items.find((i) => i.id === item.menuItemId);
    const fromPot = Boolean(menuItem?.preparedItemId) || Boolean(data.stations.find((s) => s.id === item.stationId)?.autoReady);
    return {
      made,
      served,
      cooking: !made && !item.isVoid && Boolean(item.stock) && !item.stock?.takenAt && ticket?.status === 'PREPARING',
      choices: made ? outcomeChoices({ served, reusable: reuse.enabled, returnable: fromPot && givenPortions(item.stock) === 0 }) : [],
      safeHours: reuse.enabled ? reuse.safeHours : null,
    };
  }

  /** Food that was made and then cancelled or voided: to Available Prepared Food, back to its stock, or wastage with a reason. */
  private applyOutcome(data: DemoData, order: Order, item: OrderItem, outcome: FoodOutcome, userId: string, at: string): void {
    const stock = item.stock;
    if (!stock) return;
    const reason = outcome.kind === 'WASTE' ? (outcome.reason ?? '').trim().slice(0, MAX_WASTE_REASON) : null;
    let availableId: string | null = null;
    if (outcome.kind === 'AVAILABLE') {
      const ticket = order.tickets.find((t) => t.id === item.ticketId);
      availableId = this.putAvailable(data, order, item, userId, ticket?.readyAt ?? stock.takenAt ?? at).id;
    }
    if (outcome.kind === 'BACK_TO_STOCK') this.returnLineStock(data, order, item, userId, 'Back to stock', true);
    if (outcome.kind === 'WASTE') this.recordWaste(data, { kind: 'WASTE', menuItemId: item.menuItemId, name: item.name, variantName: item.variantName, quantity: item.quantity, unit: item.unit, cost: stock.cost ?? null, reason: reason ?? '', orderId: order.id, dailyNumber: order.dailyNumber, availableId: null }, userId, at);
    stock.outcome = { kind: outcome.kind, reason, availableId, by: userId, at };
  }

  /** Puts a made line into Available Prepared Food: its raw stock was taken once, by this order; never taken again. */
  private putAvailable(data: DemoData, order: Order, item: OrderItem, userId: string, madeAt: string): AvailableFood {
    const reuse = this.reuseFor(data, item);
    const sources = (item.stock?.fromAvailable ?? []).flatMap((given) => (data.inventory.availableFood ?? []).filter((f) => f.id === given.availableId));
    const made = [madeAt, ...sources.map((f) => f.madeAt)].sort()[0] ?? madeAt;
    const safeUntil = [safeUntilOf(madeAt, Math.max(1, reuse.safeHours)), ...sources.map((f) => f.safeUntil)].sort()[0] ?? madeAt;
    const at = nowIso();
    const food: AvailableFood = {
      id: newId(),
      restaurantId: data.restaurant.id,
      branchId: data.branch.id,
      menuItemId: item.menuItemId ?? '',
      name: item.name,
      variantName: item.variantName,
      variantId: item.variantId ?? null,
      ...(item.sizeMix ? { sizeMix: item.sizeMix } : {}),
      modifierIds: item.modifierIds ?? [],
      modifierNames: item.modifiers.map((m) => m.name),
      unit: item.unit,
      quantity: item.quantity,
      remaining: item.quantity,
      fromOrderId: order.id,
      fromDailyNumber: order.dailyNumber,
      fromItemId: item.id,
      madeAt: made,
      safeUntil,
      cost: item.stock?.cost ?? null,
      givenTo: [],
      closed: [],
      createdBy: userId,
      createdAt: at,
    };
    (data.inventory.availableFood ??= []).push(food);
    return food;
  }

  /**
   * Order food that left without a sale. Kept in the Available Food list and, from W2, as a waste event of the same Waste Log
   * (wastage or staff meal) with one ORDER_FOOD line and NO stock movement: its stock left once, at the kitchen's Ready. The
   * callers write it once (a cancelled line's outcome is chosen once; Available Food is closed once, remaining → 0).
   */
  private recordWaste(data: DemoData, waste: Omit<FoodWaste, 'id' | 'restaurantId' | 'branchId' | 'createdBy' | 'createdAt'>, userId: string, at: string): void {
    const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
    (data.inventory.foodWaste ??= []).push({ id: newId(), ...scope, ...waste, createdBy: userId, createdAt: at });
    const fromAvailable = waste.availableId !== null;
    (data.inventory.wasteEvents ??= []).push({
      id: newId(),
      ...scope,
      at,
      businessDate: wasteBusinessDate(at, data.branch.timezone, data.branch.businessDayStart),
      stage: fromAvailable ? 'HOLDING' : 'CANCELLED_ORDER',
      kind: waste.kind,
      source: fromAvailable ? 'AVAILABLE_FOOD' : 'ORDER_CANCEL',
      lines: [
        {
          ingredientId: null,
          itemKind: 'ORDER_FOOD',
          orderFood: { menuItemId: waste.menuItemId, name: waste.name, variantName: waste.variantName, quantity: waste.quantity, unit: waste.unit, orderId: waste.orderId, dailyNumber: waste.dailyNumber, availableId: waste.availableId },
          parts: [],
          stockMilli: 0,
          reason: waste.kind === 'WASTE' ? (fromAvailable ? 'CLOSING_DISCARD' : 'CANCELLED_DISCARD') : null,
          note: waste.reason,
          cost: waste.cost,
          costBasis: 'ORDER',
          pricePaisa: null,
          priceUnitMilli: null,
          beforeMilli: 0,
          afterMilli: 0,
          movementId: null,
        },
      ],
      note: '',
      status: 'POSTED',
      createdBy: userId,
      createdAt: at,
      approvedBy: userId,
    });
  }

  /** The date the closing review is due for (food still left), or null. */
  private foodReviewDue(data: DemoData): string | null {
    const open = (data.inventory.availableFood ?? []).filter((f) => f.remaining > 0).map((f) => f.madeAt).sort();
    return closingReviewDue(data.inventory.closingTime ?? DEFAULT_CLOSING_TIME, open[0] ?? null, new Date(), data.branch.timezone);
  }

  /** Sold lines of a business day with a part that has no verified recipe, by name. */
  private notTrackedOn(data: DemoData, businessDay: string): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const order of data.orders) {
      if (order.businessDate !== businessDay) continue;
      for (const item of order.items) for (const name of item.stock?.takenAt ? (item.stock.notTracked ?? []) : []) counts.set(name, (counts.get(name) ?? 0) + item.quantity);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }

  getMadeFood(orderId: string, itemId: string | null = null): Promise<MadeFoodLine[]> {
    return this.request(() => {
      const data = this.store.read();
      this.requireUser(data);
      const order = this.findOrder(data, orderId);
      return order.items
        .filter((i) => !i.isVoid && (!itemId || i.id === itemId))
        .map((item) => ({ itemId: item.id, name: item.name, variantName: item.variantName, quantity: item.quantity, unit: item.unit, ...this.madeLine(data, order, item) }));
    });
  }

  giveAvailableFood(orderItemId: string, availableId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'ticket.update');
        const order = data.orders.find((o) => o.items.some((i) => i.id === orderItemId));
        const item = order?.items.find((i) => i.id === orderItemId);
        if (!order || !item) throw new ApiError('NOT_FOUND', 'Item not found.');
        if (!KITCHEN_ORDER_STATUSES.includes(order.status)) throw new ApiError('CONFLICT', 'This order is closed.');
        const ticket = order.tickets.find((t) => t.id === item.ticketId);
        if (!ticket) throw new ApiError('NOT_FOUND', 'Ticket not found.');
        if (user.role === 'KITCHEN' && user.stationIds.length > 0 && !user.stationIds.includes(ticket.stationId)) throw new ApiError('FORBIDDEN', 'This is not your station.');
        const food = (data.inventory.availableFood ?? []).find((f) => f.id === availableId);
        if (!food) throw new ApiError('NOT_FOUND', 'This ready food was not found.');
        const problem = checkGive({ food, line: item, ticketStatus: ticket.status, now: Date.now() });
        // A double tap: the line already has its food
        if (problem === 'ALREADY_GIVEN') return;
        if (problem) throw new ApiError('CONFLICT', GIVE_MESSAGES[problem]);
        const stock = item.stock;
        if (!stock) return;
        const quantity = Math.min(food.remaining, item.quantity - givenPortions(stock));
        const at = nowIso();
        food.remaining -= quantity;
        food.givenTo.push({ orderId: order.id, dailyNumber: order.dailyNumber, itemId: item.id, quantity, by: user.id, at });
        (stock.fromAvailable ??= []).push({ availableId: food.id, quantity, fromDailyNumber: food.fromDailyNumber, at, by: user.id });
        // Every line of the ticket has its food: Ready at once, and no raw stock is taken for it again
        const lines = order.items.filter((i) => i.ticketId === ticket.id && !i.isVoid);
        if (lines.every((i) => i.stock && givenPortions(i.stock) >= i.quantity)) {
          ticket.startedAt ??= at;
          ticket.status = 'READY';
          ticket.readyAt = at;
          this.syncStock(data, order, user.id);
          applyAutomaticSteps(order);
        }
      }),
    );
  }

  decideCancelledTicket(ticketId: string, decision: 'KEEP' | 'STOP', spoiltReason: string | null): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'ticket.update');
        const { order, ticket } = findTicket(data, ticketId);
        // Decided already (a double tap, or another tablet)
        if (ticket.cancelDecision !== 'PENDING') return;
        if (user.role === 'KITCHEN' && user.stationIds.length > 0 && !user.stationIds.includes(ticket.stationId)) throw new ApiError('FORBIDDEN', 'This is not your station.');
        const items = order.items.filter((i) => i.ticketId === ticket.id && !i.isVoid && i.stock && !i.stock.takenAt);
        if (decision === 'KEEP' && !items.some((i) => this.reuseFor(data, i).enabled)) throw new ApiError('CONFLICT', 'This food cannot be kept for another order. Choose Stop.');
        const spoilt = spoiltReason?.trim().slice(0, MAX_WASTE_REASON) || null;
        const at = nowIso();
        for (const item of items) {
          const stock = item.stock;
          if (!stock) continue;
          if (decision === 'KEEP' && this.reuseFor(data, item).enabled) {
            this.takeLineStock(data, order, item, user.id, 'KEEP');
            const food = this.putAvailable(data, order, item, user.id, at);
            stock.outcome = { kind: 'AVAILABLE', reason: null, availableId: food.id, by: user.id, at };
            continue;
          }
          this.giveBack(data, item);
          if (spoilt) {
            this.takeLineStock(data, order, item, user.id, 'WASTE');
            this.recordWaste(data, { kind: 'WASTE', menuItemId: item.menuItemId, name: item.name, variantName: item.variantName, quantity: item.quantity, unit: item.unit, cost: stock.cost ?? null, reason: spoilt, orderId: order.id, dailyNumber: order.dailyNumber, availableId: null }, user.id, at);
          }
          stock.outcome = { kind: spoilt ? 'WASTE' : 'STOPPED', reason: spoilt, availableId: null, by: user.id, at };
        }
        ticket.cancelDecision = decision;
      }),
    );
  }

  getAvailableFood(): Promise<AvailableFoodView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const now = Date.now();
      const tz = data.branch.timezone;
      const today = this.branchToday(data);
      const dayOf = (iso: string) => businessDate(new Date(iso), tz, data.branch.businessDayStart);
      const rows = (data.inventory.availableFood ?? [])
        .map((food) => ({ food, state: availableState(food, now), overnight: this.reuseFor(data, food).overnight }))
        .filter((r) => r.state !== 'DONE' || dayOf(r.food.createdAt) === today)
        .sort((a, b) => Number(a.state === 'DONE') - Number(b.state === 'DONE') || b.food.madeAt.localeCompare(a.food.madeAt));
      return {
        closingTime: data.inventory.closingTime ?? DEFAULT_CLOSING_TIME,
        reviewDue: this.foodReviewDue(data),
        rows,
        waste: (data.inventory.foodWaste ?? []).filter((w) => dayOf(w.createdAt) === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      };
    });
  }

  closeAvailableFood(availableId: string, kind: 'WASTE' | 'STAFF_MEAL' | 'KEEP', reason: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const food = (data.inventory.availableFood ?? []).find((f) => f.id === availableId);
        if (!food) throw new ApiError('NOT_FOUND', 'This ready food was not found.');
        if (food.remaining <= 0) return;
        const at = nowIso();
        if (kind === 'KEEP') {
          if (!this.reuseFor(data, food).overnight) throw new ApiError('CONFLICT', 'This dish is not kept overnight. Allow it in the Menu first.');
          food.keptAt = at;
          food.safeUntil = safeUntilOf(at, 24);
          return;
        }
        const why = reason.trim().slice(0, MAX_WASTE_REASON) || (kind === 'STAFF_MEAL' ? 'Staff meal' : '');
        if (!why) throw new ApiError('VALIDATION', OUTCOME_MESSAGES.REASON_REQUIRED);
        const quantity = food.remaining;
        food.closed.push({ kind, quantity, reason: why, by: user.id, at });
        food.remaining = 0;
        this.recordWaste(data, { kind, menuItemId: food.menuItemId, name: food.name, variantName: food.variantName, quantity, unit: food.unit, cost: this.foodCostShare(data, food.id, quantity), reason: why, orderId: food.fromOrderId, dailyNumber: food.fromDailyNumber, availableId: food.id }, user.id, at);
      }),
    );
  }

  saveClosingTime(time: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'settings.manage');
        if (!isClockTime(time)) throw new ApiError('VALIDATION', 'Enter a time like 23:00.');
        data.inventory.closingTime = time;
      }),
    );
  }

  addSupplier(input: SupplierInput): Promise<Supplier> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const name = cleanName(input.name);
        const phone = input.phone.trim();
        if (!name) throw new ApiError('VALIDATION', 'Type the supplier name.');
        if (name.length > MAX_NAME_LENGTH) throw new ApiError('VALIDATION', `Keep the name to ${MAX_NAME_LENGTH} characters.`);
        if (phone.length > 20 || (phone && !/^[\d +()-]+$/.test(phone))) throw new ApiError('VALIDATION', 'Type the phone number with digits only.');
        if (data.inventory.suppliers.some((s) => s.name.toLowerCase() === name.toLowerCase())) throw new ApiError('CONFLICT', `"${name}" is already in the list.`);
        const supplier: Supplier = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, name, phone, isActive: true, category: 'OTHER', address: '', notes: '', productIds: [] };
        data.inventory.suppliers.push(supplier);
        return supplier;
      }),
    );
  }

  setSupplierOrder(supplierIds: string[]): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const active = data.inventory.suppliers.filter((s) => s.isActive);
        if (supplierIds.length > 0 && (supplierIds.length !== active.length || new Set(supplierIds).size !== supplierIds.length || active.some((s) => !supplierIds.includes(s.id)))) {
          throw new ApiError('CONFLICT', 'The supplier list changed. Open it again and try once more.');
        }
        for (const supplier of data.inventory.suppliers) {
          const place = supplierIds.indexOf(supplier.id);
          if (place >= 0) supplier.sortOrder = place;
          else delete supplier.sortOrder;
        }
      }),
    );
  }

  // ── Suppliers and khata (DEMO, Suppliers S1) ───────────────────────────────────────────────

  private branchToday(data: DemoData): string {
    return businessDate(new Date(), data.branch.timezone, data.branch.businessDayStart);
  }

  private khataOf(data: DemoData, supplierId: string): KhataEntry[] {
    return data.inventory.khata.filter((e) => e.supplierId === supplierId);
  }

  getSuppliers(): Promise<SuppliersView> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const today = this.branchToday(data);
      const suppliers = sortSuppliers(data.inventory.suppliers.filter((s) => s.isActive)).map((supplier) => ({ supplier, summary: khataSummary(this.khataOf(data, supplier.id), today), hasDraft: (data.inventory.purchaseDrafts ?? []).some((d) => d.supplierId === supplier.id) }));
      return {
        today,
        suppliers,
        todayPurchases: suppliers.reduce((sum, r) => sum + r.summary.todayPurchases, 0),
        totalDue: suppliers.reduce((sum, r) => sum + r.summary.totalDue, 0),
      };
    });
  }

  getSupplierWorkspace(supplierId: string, period: KhataPeriod): Promise<SupplierWorkspace> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.view');
      const inv = data.inventory;
      const supplier = inv.suppliers.find((s) => s.id === supplierId);
      if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
      const today = this.branchToday(data);
      const khata = this.khataOf(data, supplier.id);
      const after = khataBalances(khata);
      const lastReceived = (ingredientId: string) =>
        inv.movements.filter((m) => m.type === 'PURCHASE' && m.ingredientId === ingredientId).reduce<string | null>((latest, m) => (!latest || m.createdAt > latest ? m.createdAt : latest), null);
      // What he brings most often first (owner, 2026-11-06).
      const uses = deliveriesPerProduct(khata, today);
      const his = supplier.productIds.flatMap((productId) => inv.ingredients.filter((i) => i.id === productId && i.isActive));
      const products = sortByUse(his, uses).map((ingredient) => ({
        ingredient,
        onHandMilli: onHandOf(ingredient.id, inv.movements),
        // His own last rate when he has one; else the product's purchase price.
        lastRatePaisa: supplier.rates?.[ingredient.id] ?? ingredient.purchasePrice,
        lastReceivedAt: lastReceived(ingredient.id),
        deliveries30d: uses.get(ingredient.id) ?? 0,
      }));
      const entries = khata
        .filter((e) => period === 'ALL' || e.businessDate === today)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((entry) => ({ entry, balanceAfter: after.get(entry.id) ?? 0, byName: this.staffName(data, entry.createdBy) }));
      return {
        today,
        supplier,
        summary: khataSummary(khata, today),
        products,
        entries,
        ingredients: inv.ingredients.filter((i) => i.kind === 'BOUGHT').sort((a, b) => a.name.localeCompare(b.name)),
      };
    });
  }

  saveSupplier(input: SupplierProfileInput): Promise<Supplier> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const existing = input.id ? inv.suppliers.find((s) => s.id === input.id) : null;
        if (input.id && !existing) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        const name = cleanName(input.name);
        const phone = input.phone.trim();
        if (!name) throw new ApiError('VALIDATION', 'Type the supplier name.');
        if (name.length > MAX_NAME_LENGTH) throw new ApiError('VALIDATION', `Keep the name to ${MAX_NAME_LENGTH} characters.`);
        if (phone.length > 20 || (phone && !/^[\d +()-]+$/.test(phone))) throw new ApiError('VALIDATION', 'Type the phone number with digits only.');
        if (inv.suppliers.some((s) => s.id !== input.id && s.name.toLowerCase() === name.toLowerCase())) throw new ApiError('CONFLICT', `"${name}" is already in the list.`);
        if (!SUPPLIER_CATEGORIES.includes(input.category)) throw new ApiError('VALIDATION', 'Choose a category.');
        if (input.address.trim().length > 120 || input.notes.trim().length > 200) throw new ApiError('VALIDATION', 'Keep the address to 120 and the notes to 200 characters.');
        const productIds = [...new Set(input.productIds)];
        if (productIds.some((pid) => !inv.ingredients.some((i) => i.id === pid && i.kind === 'BOUGHT'))) throw new ApiError('VALIDATION', 'Choose products from the ingredient list.');
        if (!existing && (!Number.isInteger(input.openingBalance) || input.openingBalance < 0 || input.openingBalance > MAX_SUPPLIER_AMOUNT)) {
          throw new ApiError('VALIDATION', 'Type the old balance in rupees, or leave it at 0.');
        }
        if (input.photo !== undefined && input.photo !== null && !isSupplierPhoto(input.photo)) throw new ApiError('VALIDATION', 'Choose a JPEG, PNG or WebP picture.');
        const fields = { name, phone, category: input.category, address: input.address.trim(), notes: input.notes.trim(), productIds, ...(input.photo !== undefined && { photo: input.photo }) };
        if (existing) return Object.assign(existing, fields);
        const supplier: Supplier = { id: newId(), restaurantId: data.restaurant.id, branchId: data.branch.id, isActive: true, ...fields };
        inv.suppliers.push(supplier);
        if (input.openingBalance > 0) {
          inv.khata.push({
            id: newId(),
            restaurantId: data.restaurant.id,
            branchId: data.branch.id,
            supplierId: supplier.id,
            kind: 'OPENING_BALANCE',
            amount: input.openingBalance,
            lines: [],
            method: null,
            businessDate: this.branchToday(data),
            note: '',
            createdBy: user.id,
            createdAt: nowIso(),
          });
        }
        return supplier;
      }),
    );
  }

  receiveStock(input: ReceiveStockInput): Promise<KhataEntry> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        // A double tap or retry with the same key returns the first delivery: stock goes up once.
        const key = 'supplier-receive:' + input.idempotencyKey;
        const done = data.idempotency[key];
        if (done) return inv.khata.find((e) => e.id === done)!;
        const supplier = inv.suppliers.find((s) => s.id === input.supplierId && s.isActive);
        if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        if (checkReceipt(input, inv.ingredients)) throw new ApiError('VALIDATION', 'Please check the quantities and rates.');
        // IM1: a quick receive is a bill of its own with nothing paid, posted the same way as New Purchase (Bill)
        const { purchase } = this.postPurchase(data, user, supplier, { lines: input.lines.map((l) => ({ ...l, unitKey: 'main' })), billNo: '', date: this.branchToday(data), discount: 0, paid: 0, method: null, note: input.note.trim() });
        this.addPurchaseRecipes(data, purchase);
        data.idempotency[key] = purchase.id;
        return purchase;
      }),
    );
  }

  /**
   * Every purchase is posted here, in one change (IM1): one PURCHASE khata entry (the lines minus the discount), one PURCHASE
   * stock movement per line with what the line cost after the discount, the supplier's last rate for each way to buy, the
   * product's price from this bill's average, and what was paid at once as a PAYMENT linked to the bill. Stock goes up here only.
   */
  private postPurchase(
    data: DemoData,
    user: StaffUser,
    supplier: Supplier,
    bill: Pick<PurchaseBillInput, 'lines' | 'billNo' | 'date' | 'discount' | 'paid' | 'method' | 'note'>,
  ): { purchase: KhataEntry; payment: KhataEntry | null } {
    const inv = data.inventory;
    const now = nowIso();
    const entryId = newId();
    const scope = { restaurantId: data.restaurant.id, branchId: data.branch.id };
    const billNo = bill.billNo.trim();
    const note = bill.note.trim();
    const lines = bill.lines.map((line) => {
      const ingredient = inv.ingredients.find((i) => i.id === line.ingredientId)!;
      // Every way to buy turns into the stock unit: 2 cartons of 12 = 24 bottles, a 25 kg bag = 25,000 g.
      const option = findBuyOption(ingredient, line.unitKey)!;
      // His last rate for this way to buy, and the product's usual price for it.
      supplier.rates = { ...supplier.rates, [supplierRateKey(ingredient.id, line.unitKey)]: line.ratePaisa };
      if (option.packing) ingredient.packings = (ingredient.packings ?? []).map((p) => (p.id === option.packing!.id ? { ...p, pricePaisa: line.ratePaisa } : p));
      else if (option.key !== 'main') ingredient.loosePrice = line.ratePaisa;
      if (!supplier.productIds.includes(ingredient.id)) supplier.productIds.push(ingredient.id);
      return { ingredientId: ingredient.id, quantityMilli: line.quantityMilli, ratePaisa: line.ratePaisa, amount: buyAmount(line.quantityMilli, line.ratePaisa, option.rateDivisor), stockMilli: buyStockMilli(line.quantityMilli, option.sizeMilli), movementId: newId(), unit: option.unit, unitSizeMilli: option.sizeMilli, rateDivisor: option.rateDivisor };
    });
    // Each movement keeps what its line cost on this bill, so a later price never changes an old report.
    const costs = lineCosts(lines.map((l) => l.amount), bill.discount);
    for (const [index, line] of lines.entries()) {
      // W3: every bill line is its own lot with the date typed from its label (none = Unknown: Needs review, never "safe")
      const typed = bill.lines[index]!;
      const date = typed.expiryDate || null;
      const lot = this.newLot(data, { ingredientId: line.ingredientId, source: 'PURCHASE', sourceId: entryId, supplierId: supplier.id, firstMilli: line.stockMilli, cost: costs[index] ?? null, date, dateKind: date ? (typed.dateKind ?? 'USE_BY') : 'UNKNOWN', dateFrom: date ? 'TYPED' : 'NONE' }, user.id, now);
      inv.movements.push({ id: line.movementId, ...scope, ingredientId: line.ingredientId, type: 'PURCHASE', quantityMilli: line.stockMilli, reason: null, note: billNo ? `Bill ${billNo}` : note, createdBy: user.id, createdAt: now, supplierId: supplier.id, khataEntryId: entryId, cost: costs[index] ?? null, lotId: lot.id });
    }
    // Recipes cost from this bill's average (owner's choice): all lines of a product, as the price of one main unit.
    for (const ingredientId of new Set(lines.map((l) => l.ingredientId))) {
      const ingredient = inv.ingredients.find((i) => i.id === ingredientId)!;
      const average = averageMainPrice(lines.filter((l) => l.ingredientId === ingredientId), findBuyOption(ingredient, 'main')!.sizeMilli);
      if (average !== null) Object.assign(ingredient, { purchasePrice: average, updatedAt: now });
    }
    const { total } = billTotals(lines, bill.discount);
    const purchase: KhataEntry = { id: entryId, ...scope, supplierId: supplier.id, kind: 'PURCHASE', amount: total, lines, method: null, businessDate: bill.date, note, createdBy: user.id, createdAt: now, billNo, discount: bill.discount };
    inv.khata.push(purchase);
    let payment: KhataEntry | null = null;
    if (bill.paid > 0) {
      payment = { id: newId(), ...scope, supplierId: supplier.id, kind: 'PAYMENT', amount: -bill.paid, lines: [], method: bill.method, businessDate: bill.date, note: '', createdBy: user.id, createdAt: now, billId: entryId, billNo };
      inv.khata.push(payment);
    }
    return { purchase, payment };
  }

  paySupplier(input: SupplierPaymentInput): Promise<KhataEntry> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        const key = 'supplier-pay:' + input.idempotencyKey;
        const done = data.idempotency[key];
        if (done) return inv.khata.find((e) => e.id === done)!;
        const supplier = inv.suppliers.find((s) => s.id === input.supplierId);
        if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        const today = this.branchToday(data);
        const due = khataSummary(this.khataOf(data, supplier.id), today).totalDue;
        const problem = checkSupplierPayment(input, due, today);
        if (problem) throw new ApiError('VALIDATION', PAYMENT_MESSAGES[problem]);
        const entry: KhataEntry = {
          id: newId(),
          restaurantId: data.restaurant.id,
          branchId: data.branch.id,
          supplierId: supplier.id,
          kind: 'PAYMENT',
          amount: -input.amount,
          lines: [],
          method: input.method,
          businessDate: input.date,
          note: input.note.trim(),
          createdBy: user.id,
          createdAt: nowIso(),
        };
        inv.khata.push(entry);
        data.idempotency[key] = entry.id;
        return entry;
      }),
    );
  }

  /**
   * Cooked food whose main raw ingredient is on this bill (owner, 2026-11-07): its recipe now follows the new stock. Read only:
   * nothing is saved, cooked or taken from stock, and the khata is not touched.
   */
  private recipeUpdates(data: DemoData, lines: readonly { ingredientId: string; stockMilli: number }[]): RecipeUpdate[] {
    const inv = data.inventory;
    return inv.ingredients.flatMap((dish) => {
      if (dish.kind !== 'PREPARED' || !dish.isActive) return [];
      const recipe = this.recipeFor(data, { kind: 'PREPARED', ingredientId: dish.id });
      const mainId = recipe ? currentVersion(recipe)?.mainIngredientId : null;
      const bought = mainId ? lines.filter((l) => l.ingredientId === mainId).reduce((sum, l) => sum + l.stockMilli, 0) : 0;
      if (!mainId || bought <= 0) return [];
      const afterMilli = onHandOf(mainId, inv.movements);
      return [{ dishName: dish.name, mainIngredientId: mainId, beforeMilli: afterMilli - bought, afterMilli }];
    });
  }

  /** Cooked dishes: active prepared items whose current recipe names its main raw ingredient. */
  private cookedDishes(data: DemoData): { dish: Ingredient; version: RecipeVersion; mainId: string }[] {
    return data.inventory.ingredients.flatMap((dish) => {
      if (dish.kind !== 'PREPARED' || !dish.isActive) return [];
      const recipe = this.recipeFor(data, { kind: 'PREPARED', ingredientId: dish.id });
      const version = recipe ? currentVersion(recipe) : null;
      return version?.mainIngredientId ? [{ dish, version, mainId: version.mainIngredientId }] : [];
    });
  }

  /**
   * P3 (owner, 2026-11-08): the bill's own recipe for every cooked dish whose main raw ingredient it brought, fixed on the bill's
   * day — the main ingredient at what this bill paid, the others at today's prices, today's recipe version. A record to read only:
   * stock, khata and recipes are not touched, nothing is cooked.
   */
  private addPurchaseRecipes(data: DemoData, purchase: KhataEntry): void {
    const inv = data.inventory;
    const book = this.costBook(data);
    for (const { dish, version, mainId } of this.cookedDishes(data)) {
      const bought = purchase.lines.filter((l) => l.ingredientId === mainId);
      const rawMilli = bought.reduce((sum, l) => sum + l.stockMilli, 0);
      const lines = rawMilli > 0 ? recipeForAmount(version, rawMilli) : null;
      if (!lines) continue;
      (inv.purchaseRecipes ??= []).push({
        id: newId(),
        restaurantId: data.restaurant.id,
        branchId: data.branch.id,
        purchaseId: purchase.id,
        preparedId: dish.id,
        recipeVersion: version.version,
        mainIngredientId: mainId,
        rawMilli,
        lines,
        cost: purchaseRecipeCost(book, lines, mainId, rawMilli, bought.reduce((sum, l) => sum + l.amount, 0)),
        createdAt: purchase.createdAt,
      });
    }
  }

  /**
   * Every purchase's recipe, newest first: the saved ones, and for bills from before P3 the same worked out now (the other
   * ingredients at today's prices, today's recipe). Each with the total raw stock now, apart from it.
   */
  private purchaseRecipeRows(data: DemoData, purchaseId?: string): PurchaseRecipeRow[] {
    const inv = data.inventory;
    const book = this.costBook(data);
    const dishes = this.cookedDishes(data);
    const onHand = (id: string) => onHandOf(id, inv.movements);
    const names = new Map(inv.ingredients.map((i) => [i.id, i.name]));
    const saved = inv.purchaseRecipes ?? [];
    const rows: PurchaseRecipeRow[] = [];
    for (const purchase of inv.khata) {
      if (purchase.kind !== 'PURCHASE' || (purchaseId && purchase.id !== purchaseId)) continue;
      const supplierName = inv.suppliers.find((s) => s.id === purchase.supplierId)?.name ?? '';
      const row = (r: Omit<PurchaseRecipeRow, 'supplierName' | 'billNo' | 'at' | 'shared' | 'mainOnHandMilli' | 'short' | 'dishName'>): PurchaseRecipeRow => ({
        ...r,
        dishName: names.get(r.preparedId) ?? '',
        supplierName,
        billNo: purchase.billNo ?? '',
        at: purchase.createdAt,
        shared: dishes.filter((d) => d.mainId === r.mainIngredientId).length > 1,
        mainOnHandMilli: onHand(r.mainIngredientId),
        short: shortages(r.lines, onHand),
      });
      for (const record of saved.filter((s) => s.purchaseId === purchase.id)) {
        rows.push(row({ id: record.id, purchaseId: purchase.id, preparedId: record.preparedId, mainIngredientId: record.mainIngredientId, rawMilli: record.rawMilli, lines: record.lines, cost: record.cost, recipeVersion: record.recipeVersion, todayPrices: false }));
      }
      if (saved.some((s) => s.purchaseId === purchase.id)) continue;
      for (const { dish, version, mainId } of dishes) {
        const bought = purchase.lines.filter((l) => l.ingredientId === mainId);
        const rawMilli = bought.reduce((sum, l) => sum + l.stockMilli, 0);
        const lines = rawMilli > 0 ? recipeForAmount(version, rawMilli) : null;
        if (!lines) continue;
        const cost = purchaseRecipeCost(book, lines, mainId, rawMilli, bought.reduce((sum, l) => sum + l.amount, 0));
        rows.push(row({ id: `${purchase.id}:${dish.id}`, purchaseId: purchase.id, preparedId: dish.id, mainIngredientId: mainId, rawMilli, lines, cost, recipeVersion: null, todayPrices: true }));
      }
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  }

  savePurchaseBill(input: PurchaseBillInput): Promise<PurchaseBillResult> {
    return this.request(() =>
      this.store.update((data) => {
        const user = this.require(data, 'inventory.manage');
        const inv = data.inventory;
        // A double tap or retry with the same key returns the first save: stock and khata go up once.
        const key = 'purchase-bill:' + input.idempotencyKey;
        const done = data.idempotency[key];
        if (done) {
          const purchase = inv.khata.find((e) => e.id === done)!;
          return { purchase, payment: inv.khata.find((e) => e.billId === purchase.id) ?? null, purchaseRecipes: this.purchaseRecipeRows(data, purchase.id) };
        }
        const supplier = inv.suppliers.find((s) => s.id === input.supplierId && s.isActive);
        if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        const today = this.branchToday(data);
        const problem = checkPurchaseBill(input, inv.ingredients, today);
        if (problem) throw new ApiError('VALIDATION', PURCHASE_BILL_MESSAGES[problem.problem]);
        // W3: a date on a line is a real label date with its kind; an empty one is Unknown
        for (const line of input.lines) {
          const dateProblem = line.expiryDate ? checkLotDate({ date: line.expiryDate, dateKind: line.dateKind ?? 'USE_BY' }) : null;
          if (dateProblem) throw new ApiError('VALIDATION', `${inv.ingredients.find((i) => i.id === line.ingredientId)?.name ?? ''}: ${LOT_DATE_MESSAGES[dateProblem]}`);
        }
        const { purchase, payment } = this.postPurchase(data, user, supplier, input);
        inv.purchaseDrafts = (inv.purchaseDrafts ?? []).filter((d) => d.supplierId !== supplier.id);
        data.idempotency[key] = purchase.id;
        this.addPurchaseRecipes(data, purchase);
        return { purchase, payment, recipeUpdates: this.recipeUpdates(data, purchase.lines), purchaseRecipes: this.purchaseRecipeRows(data, purchase.id) };
      }),
    );
  }

  getPurchaseDraft(supplierId: string): Promise<PurchaseDraft | null> {
    return this.request(() => {
      const data = this.store.read();
      this.require(data, 'inventory.manage');
      return (data.inventory.purchaseDrafts ?? []).find((d) => d.supplierId === supplierId) ?? null;
    });
  }

  savePurchaseDraft(draft: Omit<PurchaseDraft, 'savedAt'>): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const inv = data.inventory;
        if (!inv.suppliers.some((s) => s.id === draft.supplierId)) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        if (draft.lines.length > MAX_RECEIPT_LINES || draft.lines.some((l) => !inv.ingredients.some((i) => i.id === l.ingredientId))) throw new ApiError('VALIDATION', 'Please check the products of the bill.');
        // A draft never touches stock or the khata: it only keeps what was typed.
        inv.purchaseDrafts = [...(inv.purchaseDrafts ?? []).filter((d) => d.supplierId !== draft.supplierId), { ...draft, savedAt: nowIso() }];
      }),
    );
  }

  deletePurchaseDraft(supplierId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        data.inventory.purchaseDrafts = (data.inventory.purchaseDrafts ?? []).filter((d) => d.supplierId !== supplierId);
      }),
    );
  }

  addSupplierProduct(supplierId: string, input: IngredientInput): Promise<Ingredient> {
    return this.request(() =>
      this.store.update((data) => {
        if (input.id) throw new ApiError('VALIDATION', 'Add New Product makes a new product.');
        const supplier = data.inventory.suppliers.find((s) => s.id === supplierId && s.isActive);
        if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        // One shared product list: the same product is never added twice, whoever brings it.
        const ingredient = this.writeIngredient(data, { ...input, preferredSupplierId: input.preferredSupplierId ?? supplier.id });
        supplier.productIds.push(ingredient.id);
        supplier.rates = { ...supplier.rates, [ingredient.id]: ingredient.purchasePrice };
        return ingredient;
      }),
    );
  }

  updateSupplierProduct(supplierId: string, input: IngredientInput): Promise<Ingredient> {
    return this.request(() =>
      this.store.update((data) => {
        if (!input.id) throw new ApiError('VALIDATION', 'Choose the product to edit.');
        const supplier = data.inventory.suppliers.find((s) => s.id === supplierId);
        if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        const ingredient = this.writeIngredient(data, input);
        supplier.rates = { ...supplier.rates, [ingredient.id]: ingredient.purchasePrice };
        if (!supplier.productIds.includes(ingredient.id)) supplier.productIds.push(ingredient.id);
        return ingredient;
      }),
    );
  }

  removeSupplierProduct(supplierId: string, ingredientId: string): Promise<void> {
    return this.request(() =>
      this.store.update((data) => {
        this.require(data, 'inventory.manage');
        const supplier = data.inventory.suppliers.find((s) => s.id === supplierId);
        if (!supplier) throw new ApiError('NOT_FOUND', 'Supplier not found.');
        // Only his list changes: the shared product, its stock, bills and khata stay as they were.
        supplier.productIds = supplier.productIds.filter((id) => id !== ingredientId);
      }),
    );
  }

  // ── Notifications ──────────────────────────────────────────────────────────────────────────

  listNotifications(): Promise<StaffNotification[]> {
    return this.request(() => {
      const data = this.store.read();
      const user = this.currentUser(data);
      if (!user) return [];
      const getsFoodReady = (order: Order, tableId: string) => {
        if (user.role === 'OWNER' || user.role === 'MANAGER') return true;
        if (user.role === 'SERVICE_WAITER') return worksOnTable(user, tableId);
        // Owner, 2026-11-09: the Super Waiter who took the order is told too, also when a Service Waiter covers the table
        if (user.role === 'WAITER') return order.waiterId === user.id;
        return false;
      };
      const now = Date.now();

      const list: StaffNotification[] = [];
      // I3: the stock checks before cooking whose time has come today (8 pm for tomorrow, 7 am for today), while something is short
      if (this.permissionsOf(data, user).includes('inventory.manage')) {
        for (const check of dueChecks(data.inventory.cookingChecks ?? DEFAULT_COOKING_CHECKS, new Date(), data.branch.timezone)) {
          const short = this.planCheck(data, check.planDate).needs.filter((n) => n.shortMilli > 0);
          if (short.length === 0) continue;
          list.push({
            kind: 'COOKING_SHORTAGE',
            id: `cooking-short:${check.date}:${check.time}`,
            planDate: check.planDate,
            forDay: check.forDay,
            time: check.time,
            count: short.length,
            names: short.slice(0, 3).map((n) => data.inventory.ingredients.find((i) => i.id === n.ingredientId)?.name ?? ''),
            at: new Date().toISOString(),
          });
        }
        // I4: cooked food sold beyond what was recorded as cooked: record the Cooking Batch (decision 1)
        const negative = data.inventory.ingredients.filter((i) => i.kind === 'PREPARED' && onHandOf(i.id, data.inventory.movements) < 0);
        if (negative.length) {
          list.push({ kind: 'COOKED_NEGATIVE', id: `cooked-negative:${negative.map((i) => i.id).sort().join(',')}`, count: negative.length, names: negative.slice(0, 3).map((i) => i.name), at: new Date().toISOString() });
        }
        // W4: a staff waste report waits for the Owner or a Manager (one alert per report)
        if (this.permissionsOf(data, user).includes('inventory.waste.approve')) {
          for (const r of (data.inventory.wasteRequests ?? []).filter((x) => x.status === 'PENDING')) {
            const names = r.lines.map((l) => data.inventory.ingredients.find((i) => i.id === l.ingredientId)?.name ?? '');
            list.push({ kind: 'WASTE_REQUEST', id: `waste-request:${r.id}`, count: r.lines.length, names: names.slice(0, 3), byName: this.staffName(data, r.requestedBy) ?? '', at: r.requestedAt });
          }
        }
        // I4: the closing review of the ready food that is left
        const reviewDate = this.foodReviewDue(data);
        if (reviewDate) {
          const open = (data.inventory.availableFood ?? []).filter((f) => f.remaining > 0);
          list.push({ kind: 'FOOD_REVIEW', id: `food-review:${reviewDate}`, date: reviewDate, count: open.length, names: open.slice(0, 3).map((f) => foodLabel(f)), at: new Date().toISOString() });
        }
      }
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
            // Picked up: nothing to tell any more (owner, 2026-11-09)
            if (ticket.status !== 'READY' || !ticket.readyAt || ticket.pickedUpAt || voidedTicketAt(order, ticket) !== null) continue;
            const ready = {
              kind: 'FOOD_READY' as const,
              id: `ready:${ticket.id}`,
              orderId: order.id,
              tableId,
              tableName,
              stationName: data.stations.find((s) => s.id === ticket.stationId)?.name ?? '',
              items: order.items
                .filter((i) => i.ticketId === ticket.id && !i.isVoid)
                .map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name, variantName: i.variantName })),
              at: ticket.readyAt,
            };
            list.push(ready);
            // Still on the pass after 10 minutes: said once more
            if (waitingTooLong(ticket, false, now)) list.push({ ...ready, id: `ready-reminder:${ticket.id}`, reminder: true });
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

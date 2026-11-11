import type { ApiClient, DemoControls } from './client';
import { DemoAdapter } from './demo/demo-adapter';

export { ApiError } from './client';
export type {
  ApiClient,
  AreaInput,
  BulkTablesInput,
  AddonGroupInput,
  CounterOrderInput,
  MenuItemInput,
  SellPreparedInput,
  CookingBatchInput,
  CookingPlanView,
  AvailableFoodRow,
  AvailableFoodView,
  MadeFoodLine,
  DemoControls,
  HeldBillInput,
  KhataPeriod,
  PurchaseBillInput,
  PurchaseBillResult,
  PurchaseDraft,
  OrderFilter,
  RecordPaymentInput,
  SendRoundInput,
  Session,
  SettingsInput,
  StaffInput,
  StaffLink,
  StationInput,
  TableInput,
  CountLineInput,
  WasteDecisionInput,
  WasteReportView,
  WasteRequestInput,
} from './client';

let adapter: DemoAdapter | null = null;

/** Created on first use in the browser (the demo store needs browser storage). */
function demoAdapter(): DemoAdapter {
  adapter ??= new DemoAdapter();
  return adapter;
}

/**
 * The ApiClient used by every screen. Phase 4 replaces the DemoAdapter here with the HttpAdapter;
 * no screen changes.
 */
export function getApi(): ApiClient {
  return demoAdapter();
}

/** DEMO role switcher and demo tools — Phases 1–3 only. */
export function getDemoControls(): DemoControls {
  return demoAdapter();
}

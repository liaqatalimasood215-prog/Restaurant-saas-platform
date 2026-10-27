# AI Restaurant Manager — Design Plan (Lala Restaurant OS)

> **Khulasa (Roman Urdu):** AI Manager ek "samajhdar munshi" hai jo stock, sale, supplier aur
> purchase ka hisaab dekh kar mashwara deta hai. Lekin hisaab khud server ka pakka code karta hai,
> AI sirf sawal samajhta, jawab samjhata aur draft banata hai. AI kabhi stock khud nahi badlega,
> kabhi bina ijazat order nahi bhejega, aur kabhi koi number apni taraf se nahi banayega.
> Yeh module (Phase 10) tab banega jab pilot (order flow) aur Inventory / Recipe / Supplier ki buniyaad (Phase 8)
> asli data ke saath chal rahi ho.

Status: **PLANNED — not built (Phase 10).** Owner spec received 2026-10-25.
Must follow every rule in `PROJECT_RULES.md` (one backend, one database, `restaurant_id` +
`branch_id`, server-side permissions, REAL / DEMO / PLACEHOLDER / NOT CONNECTED labels).

---

## 1. Core principle: calculations are code, AI explains

| Job | Done by |
|---|---|
| Stock on hand, consumption, waste, reorder quantities, reports, supplier reliability | Deterministic server code (tested) |
| Demand forecast | Simple statistical model in server code (explainable, with confidence) |
| Understanding questions ("How much chicken is left?") | AI (LLM) |
| Fetching numbers | AI calls **read-only server tools** with the logged-in user's permissions |
| Explaining results, writing report summaries, drafting supplier messages | AI (LLM) |
| Changing anything (draft PO, approve, send) | Server code, only after a human presses a confirmation button, within rules |

The AI never reads the database directly, never does arithmetic from memory, and never invents a
number. If the data is missing, the answer says so.

Every AI answer is labelled per line:

- **FACT** — read from records (shows source + last updated time)
- **CALCULATION** — computed by server code from facts (shows formula inputs)
- **FORECAST** — prediction (shows confidence + assumptions)
- **RECOMMENDATION** — suggested action (never executed automatically in Stages 1–2)

## 2. Prerequisites (must be REAL before the AI Manager starts)

| Needed | Used for | Exists today |
|---|---|---|
| Pilot order flow (POS, online, kitchen, rider) — Phases 1–6 | Sales data | Not yet |
| Menu management | Products | Database design only |
| Ingredients + units + stock ledger | Stock levels | No |
| Recipes / BOM per menu item (verified) | Ingredient consumption | No |
| Waste recording | Waste, accurate stock | No |
| Physical stock counts | Correct "system stock vs real stock" | No |
| Suppliers, supplier items, quoted prices, lead times | Purchasing | No |
| Purchase orders + goods received | Delivery tracking, price differences | No |
| Rider cash collection / payment records | Cash summary | No |
| Tips recording | Tips in daily report | No |
| Reservations / special-day markers | Forecast inputs | No (dine-in is later) |
| MANAGER role | Approvals by manager | Planned for the pilot, not built yet |
| Sales history: ~8 weeks of real orders | Weekday forecasts | No — until then forecasts show LOW confidence |

## 3. New tables (all with `restaurant_id` + `branch_id`, UUID ids, money in paisa)

**Inventory (built before the AI, used by people first)**
- `ingredients` — name, base unit (g / ml / piece), min stock, track expiry
- `unit_conversions` — e.g. 1 kg = 1000 g, 1 crate = 30 eggs
- `stock_lots` — quantity, expiry date, received date, unit cost (for expiry tracking)
- `stock_movements` — the stock **ledger**: RECEIVED, CONSUMED_SALE, WASTE, COUNT_ADJUSTMENT,
  TRANSFER; signed quantity; source record; who; when.
  Stock = sum of movements. Nobody (human or AI) "types a new stock number".
- `stock_counts` + lines — physical counts; differences become COUNT_ADJUSTMENT movements
  only after approval
- `recipes` (menu item, version, status DRAFT / VERIFIED, verified by, verified at) +
  `recipe_lines` (ingredient, quantity per portion, waste/yield factor)
- `waste_records` — ingredient or menu item, quantity, reason, who

**Purchasing**
- `suppliers`, `supplier_contacts`
- `supplier_items` — ingredient, pack size, quoted price, quote date, min order qty,
  lead time (days), available yes/no
- `purchase_orders` + `purchase_order_lines`
  Status: DRAFT → PENDING_APPROVAL → APPROVED → READY_TO_SEND / SENT → ACKNOWLEDGED →
  PARTIALLY_RECEIVED → RECEIVED → CLOSED (or CANCELLED)
- `goods_receipts` + lines — received qty, actual price, expiry, differences vs order

**Automation and AI (audit everything)**
- `automation_rules` — enabled, approved suppliers, max spend per order / per day / per month,
  max quantity per item, approved by owner, approved at
- `automation_runs` — job name, branch, scheduled for, **unique idempotency key**
  (job + branch + date), status, result summary
- `emergency_stops` — per branch, per restaurant, platform-wide
- `ai_settings` — per restaurant: enabled, monthly AI budget, voice on/off
- `ai_conversations`, `ai_messages`, `ai_proposed_actions` (proposed by AI, confirmed by whom,
  executed when, result)
- `audit_logs` — who changed what, before / after

## 4. Calculations (server code)

**Consumption:** when the kitchen marks an order item prepared (READY), write CONSUMED_SALE
movements using the item's **VERIFIED** recipe version. Items without a verified recipe are
skipped and listed as "missing recipe — stock for these is not reliable". An order cancelled
after preparation is recorded as waste.

**Usable stock:** on hand − expired − quantity expiring before it can be used.

**Recommended purchase per ingredient:**

```
need      = forecast usage during (supplier lead time + days until next order) + safety stock
recommend = need − usable stock − quantity already on pending purchase orders
            → if ≤ 0: nothing to order
            → else round UP to pack size and supplier minimum order quantity
```

Safety stock v1 = owner-configured "days of cover" per ingredient. Statistical version later.

**Forecast v1 (explainable):** per menu item, per weekday = average of the same weekday over the
last 4–8 weeks, adjusted for recent trend. Manager can mark special days (Ramadan, Eid, match day,
event booking). Confidence = based on how much data exists and how much it varies (LOW / MEDIUM /
HIGH), with the reason shown. Menu-item forecast → ingredient forecast through verified recipes.

**Supplier comparison:** only from records — on-time delivery %, fill rate (received ÷ ordered),
price vs quote, last quote date. Shown only after a minimum number of orders; otherwise
"not enough data". No invented ratings.

## 5. Permissions

- AI Manager visible to OWNER (and MANAGER when that role exists).
- Money (sales totals, costs, cash, tips) only for OWNER, and MANAGER if the owner allows.
- AI tools run **as the logged-in user**: the AI can never see more than that user can.
- The AI can never: change stock, approve stock counts, mark payments verified, approve its own
  purchase order, send a purchase outside approved rules, or change automation rules / limits.

## 6. Stages

| Stage | What | Gate to move on |
|---|---|---|
| 0 | Prerequisites (section 2) built and used by people with real data | Stock counts match reality within an agreed margin |
| 1 | **Read-only:** daily report, low stock + expiry alerts, forecast, recommended purchase list, chat (questions only), dashboard | Tested on SIMULATED data, then checked against real data for 2+ weeks |
| 2 | **Drafts + approval:** AI/scheduled job creates PO drafts; manager/owner approves; send or ready-to-send; goods receipt; supplier reliability | Owner signs off |
| 3 | **Limited auto-ordering:** only within owner-approved rules (suppliers, spend + quantity limits), duplicate protection, emergency stop | Owner configures and approves limits |

## 7. Sending purchase orders

| Channel | Status shown | Notes |
|---|---|---|
| Ready-to-send (copy text / PDF / WhatsApp click-to-chat opened by the manager) | READY_TO_SEND — **"Not sent by the system"** until the manager marks it sent | Free, works with any supplier — first option |
| Email | SENT only after the email service confirms it accepted the message ("accepted by email service" ≠ "supplier read it") | Paid service after free tier — needs owner approval |
| WhatsApp Business API | SENT only after API confirmation | Paid, needs Meta approval — needs owner approval |
| Supplier API | SENT only after API confirmation | Rare in Pakistan |

Acknowledgement, expected delivery, received quantities, price differences and incomplete
deliveries are tracked on the purchase order. The system never says "sent" without confirmation.

## 8. Scheduled jobs

- Postgres-based job queue (e.g. pg-boss) — no extra server needed — or Railway cron calling a
  protected internal endpoint.
- Each branch has its time zone (default Asia/Karachi) and business hours.
- Unique key (job + branch + date/time slot) prevents duplicate runs; every run is logged in
  `automation_runs` and shown in "Automation history".

## 9. Chat and voice

- Chat panel in Restaurant OS. Supports English, Urdu and Roman Urdu.
- Stage 1 tools (read-only): `get_stock`, `get_low_stock`, `get_expiring`, `get_forecast`,
  `get_recommended_purchases`, `get_daily_report`, `list_purchase_orders`.
- Stage 2 action tools (e.g. `create_po_draft`) always show a **confirmation card** the user must
  press. Ambiguous requests ("order chicken") → the AI asks which item, how much, which supplier.
- Voice is optional. First try the browser's built-in speech (free, quality varies, Urdu support
  varies by phone). Paid voice services only after owner approval.

## 10. Costs — nothing paid is connected without owner approval

| Service | Needed for | How it is charged |
|---|---|---|
| AI model (LLM) API | Chat, summaries, drafts | Per use; a monthly budget cap per restaurant stops usage at the limit |
| Voice (speech-to-text / text-to-speech) | Optional voice | Per minute |
| Email service | Sending POs / reports | Free tier, then monthly |
| WhatsApp Business API | Sending POs / alerts | Per conversation |

Exact prices are checked at the time of choosing a provider and shown to the owner before
connecting. AI usage is logged per restaurant. Business idea: AI Manager as a paid add-on or
higher subscription plan.

Privacy: only the data needed for a question is sent to the AI provider; no customer phone
numbers or addresses. Restaurant terms of service must mention AI processing.

## 11. Dashboard (Restaurant OS → AI Manager)

Stock alerts · expiring soon · demand forecast · recommended purchase list · pending approvals ·
supplier order status · today's / yesterday's report · automation history · enable/disable
switches · emergency stop · AI usage this month.

## 12. Testing

- A simulated-data generator (≈12 weeks of orders, recipes, deliveries) — clearly labelled
  SIMULATED and never mixed with real data.
- Fixed question set with known answers: the AI's numbers must exactly match the server's.
- Tests: AI cannot exceed the user's permissions; no duplicate POs; scheduled job runs once even
  if triggered twice; emergency stop blocks everything; "SENT" never shown without confirmation;
  missing recipes are reported, not guessed.

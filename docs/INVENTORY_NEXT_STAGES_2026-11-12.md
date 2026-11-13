# Inventory & Suppliers — what is done and the next stages (2026-11-12)

Owner's brief (2026-11-12): after W4, continue the remaining Inventory & Supplier features — Stock Count, Inventory Reports, Supplier
Reports, Stock Movement History, a clean Inventory Dashboard and any remaining important feature — connected with Suppliers, Recipes,
Cooking Plan, Wastage, Expiry and Stock Count, without duplicating or changing W1–W4. Plan first; each stage only after his approval.
All stages are DEMO (frontend + demo data); the real backend stays Phase 4+.

Sources: `docs/INVENTORY_AUDIT_2026-11-10.md` (IM1–IM9, decisions §9), `docs/WASTAGE_EXPIRY_PLAN_2026-11-10.md` (W0–W5),
`PROJECT_RULES.md` §20, the Coming-soon texts of Reports and Stock Counts, MASTER_PROMPT.md Phase 8.

## 1. Complete (DEMO, committed on branch `claude/lala-restaurant-os-continue-9e41aa` unless noted)

| Area | What works |
|---|---|
| Ingredients | Add / edit, units and packings, low / out, categories, storage place field, Not in use, Adjust Stock with a reason (on `main`) |
| Suppliers S1 | Supplier list and workspace, New Purchase bill (units, discount, bill no., paid now), drafts, khata, Settle Payment, Edit order, pictures, ranges (on `main`) |
| Recipes | Recipe Builder R1 + R2 (Auto Scale, sizes), Prepared Items P1–P3, Sell on POS (I1), recipe versions on order lines (I2) (on `main`) |
| Cooking | Cooking Batch, cooked stock, Cooking Plan with shortage alerts and draft bills (I3) (on `main`) |
| Sales stock | Stock taken once at the kitchen's Ready, Undo, Available Food, closing review (I4) (on `main`) |
| IM1 | Stabilise fixes (business day, one purchase posting, movement cost, plan by quantity) (on `main`) |
| W1–W4 | Record Waste; cooked / order food, staff meal, donation, reverse / correct; lots and expiry (Expired blocked, Needs review, On hold, FEFO, bill-line dates); staff waste reports with approval |
| Compact UI | The 8 screens tidied (part of IM2) |
| Stock Movements | Every change with reason, who, when and stock after; filters item / kind / period / person (first 50 shown) |
| Overview | Cards: value, ingredients, low, out, expiring, purchases, food cost, Available Food, wastage, supplier due |

## 2. Missing

| Area | Today | Missing |
|---|---|---|
| Stock Count | PLACEHOLDER tab | Count sessions, blank ≠ zero, variance in quantity and Rs., approval, posting into the lots |
| Inventory Reports | PLACEHOLDER section | Stock valuation, in / out, usage, wastage, expiry, count variance; periods, drill-down, CSV, print |
| Supplier Reports | Khata per supplier (Today / All) | Purchases by supplier and item, payments, outstanding and age of dues, supplier statement by dates |
| Supplier corrections | — (S2 open) | Returns to the supplier and bill corrections as new entries (needed for correct reports) |
| Stock Movements | 50 newest, no dates, no source link | Custom dates, lot and source (bill, batch, order, waste, count) on each row, paging, CSV |
| Dashboard | Many cards, some "Soon" | One clean screen: few tiles, a "To do now" list, each opening its filtered list |
| Later (IM3–IM5, S3, S4) | — | Quick Receive, purchase orders, expenses, storage transfers, Sold out from stock, daily-plan modes and auto posting, recipe kinds, W5 / IM9 full check |

## 3. Stages (each only after the owner's approval; small steps, tests after each)

### Stage A — Stock Count (first priority) — built 2026-11-12 (DEMO), approved and committed ("Approve, commit karo")

Owner: "Approved — Start Stage A: Stock Count. I approve all 5 recommended decisions and the A → B → C → D → E → F sequence." Built:
`packages/shared/src/counts.ts` (scope, mixed units, blank ≠ zero, difference, approve rules), Stock → Stock Counts (list, New count, count
screen with search and filters All / Not counted / Differences, review, history), COUNT movements (less from the lots, expired first;
more = Needs review), permissions `inventory.count` / `inventory.count.approve` (Owner, Manager; data version 25), bell alert "Stock
count #n waits for approval", `walkthrough:counts`. Not built: counting by the Kitchen (it has no Inventory access; a later choice).

Plan as approved:
- **Start a count:** All stock, one category or one storage place. The system takes a snapshot of what it expects.
- **Count:** one row per item with its units (1 carton + 3 bottles); a blank row is "not counted", never zero; phone-friendly.
- **Sales and cooking during counting:** what moves after the snapshot is added to the expected figure, so nothing counts twice.
- **Review:** per item expected / counted / difference in quantity and Rs. (at cost), big differences highlighted; a note per row.
- **Approve and post:** one COUNT movement per item that differs; less = taken from the lots, the expired stock first; more = stock
  without a delivery (Needs review). Posted once; the count stays as a record (who counted, who approved, when).
- **Connections:** Stock Movements ("Counted"), lots and expiry, usable stock (Cooking Plan, low / out), Reports (variance).
- Permission `inventory.count` (count) and approval with the W4 rule: Owner / Manager approve.

### Stage B — Stock Movement History (small, the base of the reports)
- Custom from / to dates next to Today / 7 days / Month; the lot and the source on every row (Bill no., Batch, Order #, Waste entry,
  Count) with a tap to open it; Load more instead of 50; CSV.

### Stage C — Inventory Reports
- One Reports page, period Today / Yesterday / This week / This month / dates; every number opens its movements; CSV and Print.
- Reports: **Stock valuation** (on hand, usable, blocked, value at cost); **Stock in / out** (opening → purchases, cooked, returns,
  sales use, cooking use, waste, staff meal, donation, counts → closing); **Usage** (per item, sales vs cooking); **Wastage** (by
  reason, item, stage, with staff meals and donations apart); **Expiry** (expiring / expired / needs review, value at risk);
  **Count variance** (from Stage A).

### Stage D — Supplier Reports + returns and corrections (finishes S2)
- **Return to supplier** and **bill correction** as new linked entries (stock and khata both corrected; nothing edited or deleted).
- Reports: purchases by supplier / item / day; payments; outstanding balances with age (0–7, 8–30, 30+ days); one supplier's
  statement for dates (opening, bills, returns, payments, closing); print and CSV.

### Stage E — Inventory Dashboard
- Five or six tiles only (stock value, low / out, expired / needs review, today's purchases and dues, wastage, cooking shortages),
  "No data" differs from 0, and a **To do now** list: pending waste reports, held food, expired stock, counts to approve, plan
  shortages, unpaid bills — each opens its screen.

### Stage F — Remaining (each a separate plan later)
Quick Receive (IM3), purchase orders (S3), expenses (S4), storage places and transfers, Sold out on the POS when stock runs out,
daily-plan modes and auto posting (IM4–IM5), recipe kinds (IM2), and the full check (W5 / IM9).

## 4. Decisions for the owner

1. **Order:** A Stock Count → B Movements → C Inventory Reports → D Supplier Reports → E Dashboard → F — recommended.
2. **Who counts, who approves:** Owner, Manager (and Kitchen if switched on) count; the Owner or a Manager approves; a Manager does not
   approve his own count, the Owner may (audit decision #6) — recommended.
3. **Count scope:** all three (all stock, a category, a storage place) — recommended.
4. **Report periods and export:** Today, Yesterday, This week, This month, dates; CSV and Print — recommended.
5. **Returns and corrections in Stage D:** yes, because supplier balances are wrong without them — recommended.
6. Still open from the audit (no change until he answers): #2 safe hours default, #3 auto posting, #4 purchase-linked dishes,
   #5 cook today / tomorrow.

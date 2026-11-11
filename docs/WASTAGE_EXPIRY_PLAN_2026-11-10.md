# Wastage & Expiry — audit and plan (owner's Prompt 1, 2026-11-10)

> **Khulasa (Roman Urdu):** Yeh file batati hai ke Wastage & Expiry ke liye code mein abhi kya hai, kya nahi hai, aur
> hum isay 5 chhote steps (W1–W5) mein kaise banayenge. **Abhi kuch nahi bana: yeh sirf audit aur plan hai, owner ki
> approval ka intezar hai.**

**Status:** audit and proposal only, nothing built. Source: the owner's file `LALA_Inventory_Three_Detailed_Prompts-1.md`
(Prompt 1 only), his video `123.mp4` (the same file as earlier today: 7 minutes, 36 still frames looked at), his four
screenshots, and the code of this checkout (`claude/sleepy-shamir-5e83b0`, `ded7921`). Findings are read from the code, with
the place named; nothing here was re-tested by clicking. Everything is DEMO / PROTOTYPE unless it says PLACEHOLDER.

## 1. What exists today (read from the code)

| Area | What the code does | Where |
|---|---|---|
| Wastage & Expiry tab | PLACEHOLDER panel with three bullet points. Overview has a "Wastage" Soon card | `inventory-screen.tsx` (`PlannedPanel`), `overview-tab.tsx` 116 |
| Stock | Stock = the sum of an ingredient's movements; one balance per ingredient, no lots, no location balances. Types: OPENING, ADJUSTMENT, PURCHASE, COOK_USE, COOKED, SALE_USE, SALE_RETURN. **No WASTE type** | `inventory.ts` `MOVEMENT_TYPES`, `onHandOf` |
| Adjust Stock | Add / Remove with a reason (Counted again, Wrong entry before, Found more stock, Other + note); Remove never below zero; one save per key. It is a correction, not a waste record: no cost, no stage, no approval | `adjustStock`, `checkAdjustment` |
| Purchase → stock | One PURCHASE movement per bill line, linked to the khata entry and supplier. The bill line has **no expiry field** | `savePurchaseBill`, `ReceiptLine` |
| Expiry | **One date and one batch text per ingredient** (typed in Add / Edit Ingredient). "Expiring soon" = that date within 3 days (`expiringSoonDays`, no screen to change it). Once the date has passed, the Cooking Plan treats ALL stock of that ingredient as unusable, also stock bought later. The sample dates are fixed when the demo data is made, so they all pass with time | `Ingredient.expiryDate`, `expiryState`, `usableStock` 3276 |
| Cooked stock | A Cooking Batch takes raw stock once (COOK_USE) and adds the actual cooked amount (COOKED) to the prepared item. A batch keeps its cost, plate size and time. **No discard deadline** | `recordCookingBatch`, `CookingBatch` |
| Sales | Stock leaves once per order line at the kitchen's Ready (raw for made-to-order, cooked stock for a linked pot dish). Kitchen Undo gives it back | `takeLineStock`, `returnLineStock` |
| Cancelled order food | Outcome box: Available Prepared Food / back to stock / wastage with a reason. Wasted or staff-meal food is written to a separate list (`foodWaste`) with the order's cost. **No stock movement** (correct: its stock already left at Ready), but the list is only shown as "Wasted today" on Available Food. Nothing else reads it | `applyOutcome`, `closeAvailableFood`, `recordWaste`, `available-food-tab.tsx` |
| Units | kg / g, litre / ml, pieces and per-product packings (carton of 12, bag of 25 kg); several lines of one product in different units on a bill | `buyOptions`, `buyStockMilli` |
| Cost | Recipe and stock value use the ingredient's current purchase price; a new bill overwrites it. A movement keeps no cost **in this checkout** | `stockValueOf`, `ingredientCost` |
| Permissions | `inventory.view` and `inventory.manage`: Owner and Manager only. The Kitchen role cannot open Inventory at all. Checks run in the browser's demo server: this is not security | `permissions.ts` 20, 55; `sections.ts` 78 |
| Storage | A storage label per ingredient (Dry Store, Freezer …). A label only: there is no stock per location | `Ingredient.locationId` |

## 2. What is missing for Prompt 1

- A waste record with reason, stage, lines, cost snapshot, who recorded and who approved; a WASTE stock movement.
- Raw, packaging and prepared-stock waste. Only cancelled order food can be wasted today.
- Staff meal exists only for Available Food; donation does not exist. Supplier return does not exist (Suppliers S2 / IM3).
- Lots per receipt and per cooking batch; date kinds (use-by, best-before, unknown); usable against on-hand; hold; FEFO.
- Pending approval, hold while pending, rejection, reversal and correction.
- A cost that does not change later: needs the movement cost of IM1 (see §3).
- Warning-window setting; Expiring / Expired lists per lot.

## 3. Dependency the owner must know

The IM1 work of this morning (movement cost, `lineCosts`, one business day, "stock bought after a passed expiry date is
usable") is **not in this checkout**. It sits uncommitted in the other folder `restaurant-software-deploy-1b7e21`. Its
regression run is done (W0, 2026-11-10): all 25 older walkthroughs, `walkthrough:im1`, customer and rider pass; `:inventory` and
`:recipes` timed out once in the first run and passed when run again. Wastage needs the movement cost from it. This checkout holds
the two search commits (`c2757c1`, `ded7921`). **W0 is done (2026-11-10, "Approve, main par lao"):** IM1 is committed and both
branches are joined on `main`. Wastage is built on `main`.

## 4. "Cook now" against "no daily cooking confirmation"

On 2026-11-07 the owner said: no cooking module, no daily cooking buttons. On 2026-11-08 his integration brief replaced that
(decision log: I1–I7), and on 2026-11-09 he approved I3, the Cooking Batch with "Cook now" / "Record cooking". So the buttons in
the video are his approved design, and today raw stock of a pot dish only falls when a batch is recorded. His wish to not confirm
every day is the auto-posting step (IM5), not built. **This plan does not change cooking.** Cooked-stock waste simply uses the
cooked stock that batches created; a dish nobody recorded a batch for has no cooked stock to waste, and the form will say so.

## 5. Proposed screens (Stock → Wastage & Expiry, same red / white style)

**Top:** primary button **Record Waste**. Four small cards: Posted waste today (Rs.) · This week (Rs.) · Lots expiring ·
Pending requests. Pending values are never added to posted losses.

**Tabs:** Waste Log · Expiring soon · Expired / Blocked · Pending approval.

**Record Waste (one incident, several lines):**

| Field | Rule |
|---|---|
| When | Now by default; may be set earlier, never in the future |
| Stage | Storage · Preparation · Cooking · Holding / closing · Cancelled order · Served leftover (observation only) |
| What happened to it | **Waste** (default) · Staff meal · Donation. Each is its own movement type. Supplier return and discounted sale are not offered here |
| Line: item | Search in four groups: Raw ingredients · Packaging · Prepared food (cooked stock) · Cancelled order food (Available Food) |
| Line: lot | Suggested: expired lots first, then the earliest date. "No lot" for old stock |
| Line: quantity | Quantity + unit; "+ another unit" (1 carton + 2 bottles = 14 bottles; 500 g = 0.5 kg). Prepared food: kg / g, or plates only when the dish has a saved plate size ("4 plates × 250 g = 1 kg") |
| Line: reason | Expired / use-by passed · Spoiled · Damaged packaging / breakage · Spilled · Burnt / overcooked · Preparation mistake · Unsold cooked food discarded at closing · Cancelled prepared food discarded · Other (note required) |
| Preview | In stock now → after; loss in Rs. with its basis (Lot cost / Batch cost / Estimate at today's price / Unknown — needs setup) |
| Note | Optional. Photo: see decision 5 |
| Submit | Owner / Manager: **Post**. Staff (step W4): **Send for approval** |

**Waste Log:** when, item, quantity, reason, stage, loss, by, approved by, status (Posted / Reversed / Corrected); opens the
event with its stock movements. **Expiring soon / Expired-Blocked:** one row per lot: item, lot (supplier + bill or cooking
batch), received, date and its kind, on hand, usable, action (Record waste · Set date · Hold / Release). **Pending approval:**
request, lines, held quantity, Approve · Reject · Ask.

## 6. Stock and cost rules

| Case | Stock change | Never |
|---|---|---|
| Raw or packaging wasted | One WASTE movement on that ingredient (and its lot) | — |
| Cooked stock wasted (1 kg cooked daal) | One WASTE movement on the cooked dish | A second raw deduction: the raw left at the batch |
| Cancelled order food wasted (karahi) | None: its stock left at Ready. The waste event links to that order line and takes the Available Food portion | A new stock pool or a second deduction |
| Cancelled order food kept for reuse | None; it is not waste | Counting it as a loss |
| Served leftover | None; an observation with a note | Any loss in Rs. |
| Staff meal / donation | Own movement type, own totals | Mixing into waste cost |
| Purchase spoiled later | WASTE movement only | Changing the supplier's khata |

- **Once:** one idempotency key per form; a repeated tap, refresh or retry returns the first event. All lines post together or
  not at all (the demo store's copy-then-keep change).
- **Never below zero:** a line cannot take more than the lot / stock / Available Food portion still holds. A portion being
  given to an order cannot be wasted in the same change, and the other way round.
- **History:** a posted event is never edited. **Reverse** = a linked event that puts the quantity back, with a reason. The food
  is not made usable by a reversal: the lot comes back **held** until the Owner or Manager releases it. **Correct** = reverse + a
  new event, both linked.
- **Cost:** inventory cost, never the selling price. Raw: the lot's own cost (the bill line after discount) when the lot is
  known; old stock without a lot: today's purchase price, labelled *estimate*. Cooked stock: the batch cost shared by what the
  batch actually made; without a batch, the recipe estimate, labelled. Order food: the cost kept on the order line at Ready.
  Missing price = **Unknown — needs setup**, never Rs. 0. The event keeps the cost, the unit conversion and the recipe version.

## 7. Lots and expiry

- **Lot** = item, where it came from (supplier bill line, cooking batch, or "old stock"), received time, first quantity, cost,
  date and date kind, held yes / no. A lot is made for every new purchase line and every new cooking batch.
- **Date kinds:** Use-by / expiry · Best-before · Unknown. No shelf life is built in for any food. A date is what the staff
  types from the label; a cooked dish gets a discard time only when the owner sets hours for that dish. The screen shows where
  each date came from.
- **Date-only rule:** "use by 12 Nov" is usable through the end of 12 Nov in Asia/Karachi and blocked from 00:00 on 13 Nov.
  Best-before passed = "Past best-before: review", not blocked by itself. Unknown date = "Needs review", never shown as safe.
- **On hand against usable:** usable = on hand − expired lots − held lots − quantity in pending requests. Low stock, the
  Cooking Plan and Cook use the usable number. Expiry only blocks: nothing is written off until a person records the disposal.
- **Remaining per lot (pilot rule):** sales and cooking movements name no lot today. Remaining is worked out: use that names no
  lot is taken from the usable lots, earliest date first (FEFO); it never empties an expired or held lot. When use is more than
  the usable lots hold, the item is flagged "check the expired lot" instead of guessing. A waste line names its lot and takes
  exactly from it.
- **Warning windows:** today / next 3 days / next 7 days, changed by the Owner; labelled as alert preferences.
- **Old data:** every ingredient with stock gets one "old stock" lot with the date it has now, marked "from before lots —
  check". Data version 22 → 23 with an upgrade; his saved data is kept.

## 8. Permissions and approval

- Step W1–W3: Owner and Manager record and post (they hold `inventory.manage` today).
- Step W4: two new permissions, `inventory.waste.submit` and `inventory.waste.approve`, in Role Permissions. A staff request
  posts no loss; its quantity is held and leaves sale and cooking at once. Reject does not release the food: the approver
  chooses Release (it is fine) or Keep held. "Already thrown away" is a tick on the request; approval then posts it as it is.
- No Rs. threshold is invented. Proposal: staff requests always wait for approval; an optional threshold field in Settings,
  empty until the owner types a number.
- All checks run in the browser's demo server. Real access control is the backend (Phase 4).

## 9. Connections

Ingredients list (On hand · Usable · Held / expired), Stock Movements (Waste, Staff meal, Donation with a link to the event),
Prepared Items (cooked usable), Available Food (its Wastage button posts through the same function), Overview (the Wastage card
becomes real; Expiring opens the lots), Cooking Plan (usable stock). Supplier khata: unchanged. Closing-time promotion: not
built; lots keep their original deadline so a later promotion can use it.

## 10. Steps (each after the owner's approval; all DEMO)

| Step | Work | Proof |
|---|---|---|
| **W0** | Finish IM1's regression run; after his approval commit IM1 and bring both branches onto `main` | 25 walkthroughs |
| **W1** | Record Waste for raw ingredients and packaging: event, WASTE movement, units, cost snapshot, once-only posting, Waste Log, the four cards, Overview card, Stock Movements | 10 L milk − 2 L = 8 L, one loss; carton + pieces; repeated submit; too much refused; supplier due unchanged |
| **W2** | Prepared stock and cancelled order food through the same posting; Staff meal and Donation apart; Reverse and Correct | 1 kg cooked daal: no raw movement; karahi reused or wasted exactly once; correction history |
| **W3** | Lots and expiry: lots from bills and batches, old-stock lots, date kinds, Expiring / Expired-Blocked, usable against on hand, FEFO suggestion, warning windows, data version 23 | two lots of one item with different dates; expired lot blocked while the other is usable |
| **W4** | Staff requests: Pending approval, holds, Approve / Reject, optional threshold, a Record Waste entry for the Kitchen | pending and rejected request behaviour |
| **W5** | New `walkthrough:wastage` with all ten checks of Prompt 1 §7, documents, screenshots | full run |

## 10b. W1 — built 2026-11-11 (DEMO), waiting for the owner's review

Record Waste for raw ingredients and packaging as in §5–§6: several items, units with "another unit", reason, where, when, preview, Post waste = one
`WasteEvent` and one `WASTE` movement per item, once per key, all or none; loss at the last purchase price (estimate; lot cost in W3), Unknown without a
price. Waste Log, four cards (Pending approval says W4), Expiring soon / Expired lists by the one date per ingredient, Stock Movements "Wasted: <reason>",
Overview "Today's wastage". Files: `packages/shared/src/wastage.ts`, `screens/inventory/wastage-tab.tsx`, `postStockWaste` / `getWasteView` in the demo
server. Test: `walkthrough:wastage`. Prompt 1 §7 checks covered so far: 10 L − 2 L = 8 L with one loss; carton + pieces; repeated submission; insufficient
quantity; supplier debt unchanged. The other five come with W2–W4.

## 10c. W2 — built 2026-11-11 (DEMO), waiting for the owner's review

Owner: "Approved — Start W2 with both recommended decisions": (1) only the Owner and a Manager record Staff meals, Donations and
Reverse / Correct (checked on the role in the demo server, besides `inventory.manage`); (2) no default discard time — the
per-dish safe hours of Available Food (approved default 3 hours, 2026-11-09) stay as they are; a discard time per cooked lot
comes with W3.

- **Cooked stock** in Record Waste ("Cooked food" group, reasons incl. "Unsold cooked food discarded at closing", stage
  Holding / closing): one WASTE movement on the cooked dish only — its raw ingredients left at the batch and are never taken
  again. Loss = the newest batch's cost ÷ what it actually made ("batch cost (estimate)"), else the recipe estimate, else Unknown.
- **Order food** (a cancelled / voided line wasted, Available Food wasted or eaten at closing) now also writes a waste event in
  the same Waste Log: one ORDER_FOOD line, cost kept on the order, **no stock movement** (it left once at the kitchen's Ready).
  The callers already write it once (an outcome is chosen once; Available Food closes to 0), so it can never be reused and
  wasted, or wasted twice. The `foodWaste` list on Available Food stays.
- **Staff meal / Donation**: own kinds with their own movement types and totals ("Today apart from waste"); never in waste cost.
- **Reverse**: a reason; one WASTE_REVERSAL movement per line linked to the event; the event stays as REVERSED (never edited or
  deleted); a second reversal is refused. Order-food entries are not reversible (the food left the kitchen). **Correct** =
  reverse + new event in one change, linked both ways (`reversal.correctedById`, `correctsId`); nothing is written if either part
  fails; one key per form. Reversed stock is usable again at once — "held until released" needs usable stock and lots (W3).
- Files: `packages/shared/src/wastage.ts` (kinds, `checkReverse`, `cookedWasteCost`, reasons per item), `inventory.ts` (movement
  types), demo server (`writeStockWaste`, `reverseStockWaste`, `correctStockWaste`, `recordWaste`), `wastage-tab.tsx`. Tests:
  3 new unit tests; `walkthrough:wastage` steps 9–12; `walkthrough:sales-stock` checks the order-food entries.

## 10d. W3 — built 2026-11-12 (DEMO), approved and committed on the feature branch ("Approve, commit karo")

Owner: "Approved to start W3 with all three recommended decisions" — (1) the expiry date is typed on each purchase-bill line AND with
"Set date" on a lot; (2) held stock is released by the Owner or a Manager only; (3) the old stock becomes one lot per item with its
current date, marked not confirmed. His two rules: unknown or unconfirmed dates stay **Needs review** and are never shown as safe;
expired or unsafe returned food is **never released**.

- **Lots** (`packages/shared/src/lots.ts`): every bill line, every cooking batch, the opening stock of a new item and every reversed
  waste line is its own lot; data version 22 → 23 turns the stock on hand into one OLD_STOCK lot per item (its old date, not
  confirmed). Nothing on hand changes; a lot is never deleted.
- **States:** Use-by passed → EXPIRED (blocked); Best-before passed → PAST_BEST (usable, look at it); no date or a date nobody
  confirmed → NEEDS_REVIEW (usable, never "safe"); held → HELD; within the warning days → SOON (shown even on an unconfirmed date,
  which also stays in Needs review). Date-only rule: usable through the end of the day (Asia/Karachi).
- **Usable = on hand − expired − held.** Low / out, Cooking Plan, Cook, staff meals and donations use it. Sales are never blocked
  (2026-11-04 decision): beyond the usable lots the item is flagged "check the expired or held stock".
- **FEFO:** sales and cooking take from the usable lots, earliest date first; an Undo, a reversed batch or a corrected waste goes
  back to the lots it came from. Waste may name its lot; without one it takes the expired stock first.
- **Hold:** a plain Reverse brings the food back HELD on its own lot (date of the lot it left); Release needs the "safe" tick and is
  refused once the date has passed. A Correct puts the stock straight back into its lots (a typing fix, not held).
- **Cooked food:** a batch is its own lot; with the dish's own discard hours (set on a cooked lot, optionally "for every new batch")
  it expires that many hours after cooking; without hours it is Needs review. No default (owner's W2 decision). Available Food's 3
  safe hours are unchanged.
- **Screens:** bill line "Use by" date + "Best before" tick; Stock → Wastage & Expiry lists per delivery: Expiring soon, Expired,
  Needs review, On hold, with Set date, Release and Record waste (pre-filled with that delivery); a waste line may pick its
  delivery; the stock list shows "x expired / on hold" and the earliest date.
- Not in W3: staff requests and approval (W4), the full check (W5); warning windows stay the one "expiring soon" days setting.

## 10e. W4 — built 2026-11-12 (DEMO), approved and committed on the feature branch

Owner: "Approved. Start W4 with all four recommended settings" — (1) the Kitchen reports waste by default, Cashier / Waiter / Service
Waiter only when the Owner switches it on in Role Permissions; (2) a **Report waste** button on the Kitchen / KDS title bar; (3) no Rs.
limit: every staff report waits for approval (no threshold field built); (4) no prices for the Kitchen.

- Permissions `inventory.waste.submit` (Owner, Manager, Kitchen; may be granted to Cashier, Waiter, Service Waiter) and
  `inventory.waste.approve` (Owner, Manager only); new row "Waste Reports" in Role Permissions. Data version 24 adds them to saved
  Kitchen / Manager roles and people.
- **Report:** one item, quantity + unit, reason (a note for Other), "Already thrown away" tick; checked like Record Waste (never more
  than on hand); once per key. The food is **held at once**: one WASTE_HOLD movement out of its lots (expired stock first) and one into
  a held REQUEST lot with the date of the lot it left. On hand unchanged, no loss, khata unchanged. The chef sees "My reports" with
  Waiting / Approved / Rejected.
- **Pending approval** (card, tab, bell alert with sound and voice, link `/inventory?waste=pending`): Approve = one waste entry from
  the held lot (reported by the chef, approved by the Owner / Manager), once; Reject = a reason, then **Release** (only with the safe
  tick, never when expired — the W3 rule) or **Keep on hold** (On hold list). Decided reports stay listed for 7 days; nothing is deleted.
- Not in W4: a photo (Phase 7); a message back to the chef's phone (the status shows in My reports); the full check (W5).

## 11. Limits of the DEMO

One browser's storage; tabs sync by sending all data, the last writer wins. Nothing runs while no tab is open: a lot becomes
"expired" when a screen is opened, and no alert reaches a phone. A photo would be kept inside the same browser storage and can
fill it. Permission checks are not security. Production (Phase 4–5): lots, waste events and movements as append-only tables in
the one PostgreSQL database, each posting in one transaction with a unique key, a scheduler for expiry alerts, file storage for
photos, server-side roles.

## 12. Decisions for the owner

1. **W0 first** (IM1 reviewed, committed, both branches on `main`) — recommended: yes.
2. **Who records first:** Owner / Manager in W1–W3, Kitchen requests in W4 — recommended.
3. **Approval threshold:** none now; staff requests always need approval — recommended.
4. **Where the expiry date is typed:** an optional field on each purchase-bill line AND "Set date" on the lot list. This adds
   one small field to the New Purchase screen — recommended: both.
5. **Photo:** note only now; photo when file storage exists (Phase 7), because a photo in browser storage can fill it —
   recommended. This is less than Prompt 1 asks ("optional photo").
6. **Discard time of cooked food:** typed per dish by the owner, no default. The approved "3 safe hours" default of Available
   Food (2026-11-09) stays as it is until he changes it.

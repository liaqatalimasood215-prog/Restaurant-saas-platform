# Inventory & Suppliers — audit and improvement plan (2026-11-10)

> **Khulasa (Roman Urdu):** Owner ne video (7 minute) aur do briefs bheje. Yeh file batati hai ke Inventory & Suppliers mein
> abhi kya chal raha hai, kya adhoora hai, kaun se bugs code mein mile, aur aage ka plan IM1–IM7 kya hai.
> **Abhi kuch nahi bana: yeh sirf audit aur plan hai, owner ki approval ka intezar hai.**

**Status of this document:** the audit and proposal of 2026-11-10; at that time nothing was built. IM1 was built afterwards (§8). Everything below is
DEMO / PROTOTYPE unless it says PLACEHOLDER. How it was checked: the owner's video `123.mp4` (36 still frames), the code
(`packages/shared/src`, `apps/restaurant-os/src/lib/api/demo/demo-adapter.ts`, `screens/inventory/`), and `pnpm test`
(189 unit tests pass). The walkthroughs were not run again for this audit, and no bug below was reproduced by clicking: each
one is read from the code, with the place named.

## 1. The six flows, traced through the code

| Flow | What happens today | Status |
|---|---|---|
| Supplier purchase → khata → raw stock → movement | `savePurchaseBill`: one PURCHASE khata entry, one PURCHASE movement per line (stock unit), optional PAYMENT entry linked by `billId`, one idempotency key, all inside one `store.update` (all or nothing). The same ingredient from two suppliers is one stock record. Bag + loose kg = two lines of one product (25 kg bag + 5 kg = 30 kg) | DEMO, works |
| Supplier payment | `paySupplier`: khata only, never a stock movement, never more than due | DEMO, works |
| Menu product → recipe → sizes → POS | Recipes with versions (Draft / Verified), Auto Scale, order lines keep size id, add-on ids and recipe version (I2). A mixed line 1 kg + ½ kg takes the 1 kg recipe + the ½ kg recipe | DEMO, works |
| Prepared recipe → main raw ingredient → plan → cooked stock | Cooking Batch: COOK_USE (raw out, once) + COOKED (actual output in). Cooking Plan = one daily list + a list per date. **A purchase never changes the plan** | DEMO, partly |
| POS / KDS → stock | `takeLineStock`: SALE_USE once per order line (see §2) | DEMO, works |
| Cancel → reusable food or wastage | Outcome box after Ready: Available Prepared Food / back to stock / wastage with a reason. Refund never touches stock | DEMO, works |
| Purchase edit / return → stock and plan | **Not built.** Khata kinds are only OPENING_BALANCE, PURCHASE, PAYMENT. Unfinished S2 rules sit in worktree `restaurant-software-setup-1ed6fb` | Missing |

## 2. The exact stock deduction trigger per product type

| Product type | Trigger | From which stock |
|---|---|---|
| Made to order (karahi, BBQ) | Kitchen ticket → READY (`updateTicket` → `syncStock`); an auto-ready station: at Send; a dine-in bill paid before Ready: at payment (`closeStock`) | Raw ingredients, by the recipe version the line kept. Kitchen Undo gives it back |
| Menu product linked to a cooked dish (`MenuItem.preparedItemId`) | The same trigger | The cooked stock of the dish, by the size's portion (Full plate 250 g …). Raw is not touched |
| Cooked dish (pot) | Only when someone records a **Cooking Batch** | Raw out, cooked in |
| Internal preparation (naan dough) | Naan sold → dough stock (SALE_USE). Dough's own raw ingredients leave only with a dough batch | Dough stock; may go below zero with an alert |
| Add-on | With its line, at the same trigger | Its own recipe |
| No verified recipe | Never | "Not tracked" |

## 3. Confirmed bugs (read from the code)

| # | Bug | Where | Effect |
|---|---|---|---|
| B1 | **Raw stock can be taken twice.** The 8 sample cooked dishes are not linked to their menu products (no `preparedItemId` in `lala-seed.ts`), and menu "Daal Mash" has its own VERIFIED raw recipe. Cook a batch of Cooked Daal Mash (raw out) and sell Daal Mash on the POS (raw out again at Ready) | `lala-seed.ts` 552, `recordCookingBatch`, `takeLineStock` | Raw daal, ghee, onions counted out twice; cooked stock only grows. Nothing warns |
| B2 | **One expiry date for the whole ingredient.** A new purchase does not change it (`savePurchaseBill` has no expiry), and `usableStock` treats ALL stock as unusable once that date has passed | `inventory.ts` `expiryDate`, `demo-adapter.ts` 3276 | Fresh stock stays "expired": Cook is refused, the plan shows Short. The seed dates do not move, so it gets worse each day (video: "18 expiring, 1 already expired") |
| B3 | **Three different "today".** Suppliers and orders use the business day (06:00 start); Inventory expiry and the Cooking Plan use the calendar day; "Sold today, not tracked" compares an order's business date with the calendar date | `getInventory` 2686, `cookingToday` 3271, `notTrackedOn` 3724 | Between midnight and 06:00 the cards look at different days |
| B4 | **Stale texts say stock is not used.** "Stock is not used yet; that comes in Step G", "Nothing is taken from stock yet (DEMO)", "will take stock later (Step G)". Stock has been taken at Ready since I4 | `en.ts` 1552, 1630, 1690 | Wrong information on the Recipe screens (in the video) |
| B5 | **Stale heading on the supplier screen:** "Type what came and tap Receive". There is no Receive button; a tap puts the product on a bill. `receiveStock` exists in the API with different rules (main unit only, price = the last rate, not the bill average) and no screen calls it | `en.ts` 1278, `demo-adapter.ts` 4011 | Confusing text; a second posting path that can drift |
| B6 | **A dish counts as cooked after any batch.** Plan 5 kg, cook 2 kg → the plan row is "cooked" and its needs leave the check | `planCheck` 3291 | Shortages hidden; an extra batch is not seen |
| B7 | **A rice purchase is given in full to every dish that uses rice.** Each cooked dish with that main ingredient gets a purchase recipe for the whole quantity, and each card works its recipe out for the whole raw stock (marked "Shared", counted once in the total) | `addPurchaseRecipes` 4125, `cookedDishes` in `cooked-card.tsx` | Display only (no stock is taken), but both dishes look fully supplied |
| B8 | **Sell on POS treats every prepared item the same:** first category (Karahi) and Full plate / Half plate, also for Naan dough and rice | `sell-dialog.tsx` 81–85 | Video: "Sell Naan dough on POS", category Karahi |
| B9 | **Success toasts stack** ("Cooking plan saved" twice in the video) | `cooking-plan-tab.tsx` 81, toast component | Noise |
| B10 | **No cost kept on a stock movement.** Stock value and recipe cost use today's purchase price; a new bill overwrites it | `stockValueOf`, `savePurchaseBill` 4230 | Past reports would change when a price changes |

Smaller: order-linked wastage is a separate list (`foodWaste`) while its stock stays a SALE_USE movement, so the stock
history shows wasted food as "sold"; the "In Stock" pill on a prepared card means *raw ingredients are enough*, next to
"Cooked stock: 0 g" (video); the plan's check times and the closing review only run while a Restaurant OS tab is open.

## 4. What is missing against the two briefs

| Area | Today | Missing |
|---|---|---|
| Daily plan | Daily list + per-date list, amount per dish, "Cook now", stock check, draft bills for shortages | Per-dish settings, weekdays, Fixed vs Purchase-linked mode, today / tomorrow destination, cooking time, pause, allocation of a shared ingredient, purchases updating the plan, exceptions list |
| Auto posting | Not built (was I6) | Everything; a real schedule needs the backend |
| Purchasing | Bill with many products, units, discount, bill no., partial / unpaid, drafts | Returns, bill corrections, Quick Receive, the one-line result ("Stock 10 → 15 kg. Due Rs. X") |
| Recipe kinds | Raw vs Prepared; "Dough & sauces" = a prepared item without a main ingredient | An explicit kind: internal preparation / sellable cooked dish / made to order; raw basis, cooked yield, portion and price are stored, but the kind is guessed |
| Available Food | Built for cancelled, unserved order food; default "safe 3 hours" for Karahi / BBQ / Fish (owner decision 2026-11-09) | Clear name; per-dish times only (the new brief asks for no universal time) |
| Wastage | PLACEHOLDER tab; only order-linked cooked wastage exists | Raw, preparation and cooked-stock wastage as stock movements; staff meal and supplier return as their own kinds |
| Expiry | One date per ingredient (B2) | Lots per receipt and per cooking batch; Expiring soon / Expired-blocked / Usable; earliest first |
| Stock Count | PLACEHOLDER tab; Adjust Stock one item at a time | Count session, snapshot, blank ≠ zero, review, authorised posting |
| Reports | PLACEHOLDER tab | All nine reports, drill-down, CSV, print |
| Permissions | One permission `inventory.manage` (Owner, Manager) for receive, pay, adjust, cook, reverse | Record vs approve; nobody approves their own entry |

## 5. Reliability — what the DEMO does and does not do

- **Does:** every change runs on a copy and is kept only if nothing throws (all or nothing); purchase, payment, adjust and
  cooking each take an idempotency key, so a double tap or retry posts once; movements keep who, when, quantity, reason,
  and the supplier / khata entry / batch / order line they came from; entries are never edited or deleted.
- **Does not:** it is one browser's `localStorage`. Tabs sync by sending the whole data set, the last writer wins, so two
  tabs saving in the same moment can lose one change. A full storage (supplier photos are kept inside it) fails silently
  and the change is gone after a reload. Nothing runs when no tab is open. Another phone or tablet never sees it.
  **This is not real-time and not production.**
- **Production (Phase 4–5, separate approval):** PostgreSQL tables for stock movements (append-only), lots, khata, plans,
  batches, counts; every posting in one transaction with a unique idempotency key; row locks or a balance check so two
  sales cannot take the same last portion; a server job scheduler for plan generation, alerts and auto-posting (Asia/Karachi
  business date); Socket.IO events that only tell screens to reload; role checks on the server; audit log.

## 6. Proposed compact UI (existing screens only, red / white kept)

| Screen | Change |
|---|---|
| Inventory header | One slim title row. The big buttons change with the section: Suppliers → **New Purchase**; Stock → **Receive Stock** + small **Adjust Stock**; Recipes → **Add Recipe**; Cooking Plan → **Edit this day** / **Change daily default**. "Add Ingredient" moves into Stock → Ingredients, labelled "New ingredient (no stock)" |
| Stock sub-tabs | One row that scrolls sideways (no second line). "Available Food" → "Cancelled order food" |
| Supplier screen | Four small figures in one line; his products as compact rows on desktop (cards / list switch), cards on phones; khata under it. Quick Receive on a row = a one-line bill through the same posting. One result line after saving |
| Cooking Plan | No red banner. Row: Dish · Mode · Raw available · Planned raw · Expected cooked · Ready to sell · Status. Exceptions as chips (No purchase, No recipe, Short, Paused, Changed). Details fold open |
| Prepared items | "In Stock" pill replaced by two labels: **Raw: enough / short / none** and **Cooked: 12 kg ready / none**. Cost and versions inside "Details" |
| Wastage (new, in Stock) | Item → quantity + unit → reason → Save; shows available and estimated loss first; optional lot, place, order, note |
| Stock Count (new, in Stock) | Choose items → type counted (blank = not counted) → review differences and value → post (authorised) |
| Overview | Six tiles only: Low / out, Expiring / blocked, Today's purchases, Supplier dues, Cooking shortages, Recorded waste. "No data" differs from 0. Each opens its filtered list |
| Reports | List of reports, Today / Yesterday / dates, each total opens its movements, Print and CSV |
| Toasts | One at a time; the same message replaces itself |

## 7. Phased plan (each step only after the owner's approval; all DEMO until the backend)

| Step | Work | Covers |
|---|---|---|
| **IM1 Stabilise** — built 2026-11-10, see §9 | B1 link check before a batch; B2 stock received after a passed expiry date is usable (until lots, IM7); B3 one business day (Asia/Karachi) for sales, purchases and the plan; B4, B5 texts and one posting function for every purchase; B6 plan row cooked by quantity; B9 toasts; B10 cost on each movement | Brief 1 §2, §9; brief 2 step 1 |
| **IM2 Compact UI** | §6: header, contextual actions, tabs, raw / planned / cooked labels, rename Available Food, recipe kinds and Sell on POS defaults (B8) | Brief 1 §3, §6, §7, §8 |
| **IM3 Purchasing** | Quick Receive, result line, supplier returns and bill corrections as new entries (finish S2), plan and stock corrected by them | Brief 1 §4 |
| **IM4 Daily plan** | Per-dish settings, Fixed and Purchase-linked modes, weekdays, today / tomorrow, one-day override, shared-ingredient rule or "ambiguous" flag (B7), exceptions, one plan per business date, completed batches never rewritten | Brief 1 §5 |
| **IM5 Auto posting** | Owner switch per dish, once per plan row, checks all ingredients and reservations, marked Estimated / Auto-posted, Skip / Change / Actual yield / Extra batch. DEMO: only while a tab is open, a late run labelled late | Brief 1 §6 |
| **IM6 Stock Count + Wastage** | Count sessions with snapshot; wastage for raw, preparation, cooked and order food; staff meal and return apart; record vs approve permission | Brief 2 §1, §3 |
| **IM7 Lot expiry** | Lots per receipt and batch, three views, earliest first, expired blocked but never deleted | Brief 2 §2 |
| **IM8 Reports + Overview** | Nine reports from the same movements, drill-down, CSV, print, six-tile Overview | Brief 2 §4, §5 |
| **IM9 Full check** | Both briefs' verification lists as unit tests and walkthroughs | Brief 1 §10, brief 2 §6 |

This replaces the open steps I5 (wastage), I6 (Auto Cooking) and I7 (full check) of the integration plan, and S2 of Suppliers.

## 8. IM1 Stabilise — built and approved 2026-11-10 (DEMO)

Owner: "Approve, IM1 karo". Rules in `packages/shared`, the demo server in `demo-adapter.ts`, four screens. No data version
change: old saved data keeps working, old movements simply have no cost.

| Bug | What changed | Where |
|---|---|---|
| B1 | A cooking batch is refused while a menu product that is the same dish is not linked to it and has its own verified recipe using the dish's raw ingredients. The Cook box says so in red and names the fix (Sell on POS → link); `recordCookingBatch` refuses too. His saved data is not changed: he links each dish himself | `takesRawTwice` (`cooking.ts`), `rawTwiceWith`, `PreparedRow.rawTwice`, `cooking-dialog.tsx` |
| B2 | Until lots (IM7): when the one expiry date has passed, the stock bought or cooked AFTER that date is usable, never more than is on hand. The Expired badge stays | `usableMilli`, `usableStock` |
| B3 | Sales, purchases, the Cooking Plan, its batches, "Sold today, not tracked" and the Available Food lists follow the business day (06:00, Asia/Karachi). The calendar date is used only for expiry dates | `branchToday`, `calendarToday` |
| B4 | Three Recipe texts now say that a verified recipe takes stock at the kitchen's Ready | `en.ts` |
| B5 | Supplier heading "His products", hint "Tap a product to put it on a new bill". `receiveStock` and `savePurchaseBill` post through one function, `postPurchase` | `en.ts`, `demo-adapter.ts` |
| B6 | A plan row is done by quantity: 5 kg planned, 2 kg cooked → "Cooked 2 kg of 5 kg", 3 kg still needed, Cook now offers 3 kg | `planLeft`, `planCheck`, `cooking-plan-tab.tsx` |
| B9 | The same message again replaces the one on screen | `toast.tsx` |
| B10 | Every new stock movement keeps what it was worth (`StockMovement.cost`): a purchase line's share of its bill after the discount (`lineCosts`), the cost of the day for cooking, sales and corrections; a reversal or Undo gives back the same value | `inventory.ts`, `suppliers.ts`, `demo-adapter.ts` |

Not in IM1, by design: **B7** (a shared raw ingredient split between dishes) needs the allocation rule of IM4; **B8** (Sell on POS
defaults for dough and rice) belongs to the recipe kinds of IM2; the full fix of **B2** is lots (IM7). Nothing shows the movement
cost on a screen yet: Reports (IM8) will read it. Not exercised by a test: the server-side refusal of B1 on its own (the Cook box
blocks it first).

Tests: `pnpm test` 193 (4 new), `pnpm typecheck`, `pnpm lint` pass; new `walkthrough:im1` (texts, purchase cost, Cook refused
then linked, 2 of 5 kg, one toast, expired date with fresh stock, 01:30 = still the business day, phone). `walkthrough:cooking`
links Daal Mash before it cooks. `pnpm build` not run (the dev server was running). Regression: all 25 older walkthroughs, customer and rider pass (`:inventory` and `:recipes` timed out once and passed when run again; PROGRESS.md §7).

## 9. Decisions the owner has to make

1. **Scope:** DEMO frontend now, backend later (his rule "all frontend first") — recommended: yes.
2. **Safe hours:** the approved default "3 hours for Karahi / BBQ / Fish" (2026-11-09) against the new brief "no universal
   time" — recommended: no default; reuse stays OFF for a dish until he types its time.
3. **Auto posting** replaces "a batch is typed by a person" for the dishes he switches on — recommended: yes, marked Estimated.
4. **Purchase-linked dishes:** Daal Mash, Daal Chana, Daal Masoor, Daal Makhni; all others Fixed — recommended.
5. **Destination:** a daal purchase is cooked today or tomorrow — his answer per dish (default asked in IM4).
6. **Who approves** counts and wastage — recommended: Manager records, Owner approves; Owner may do both.

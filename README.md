# Lala Restaurant OS

Three separate apps — **Restaurant OS**, **Customer Online App** and **Rider App** — on ONE backend,
ONE PostgreSQL database, ONE order system and ONE trusted pricing engine. Repository folder:
`restaurant-saas-platform` (local Git, branch `phase-1/restaurant-os-ui`, not pushed).

Read before changing anything:

1. **[CLAUDE.md](CLAUDE.md)** — entry point for Claude Code (loaded automatically)
2. **[PROJECT_RULES.md](PROJECT_RULES.md)** — rules, development order (UI first), statuses, decision log
3. **[docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md)** — what to build: features, workflows, data, tests
4. **[docs/AI_MANAGER_PLAN.md](docs/AI_MANAGER_PLAN.md)** — AI Restaurant Manager design (Phase 10)

## Current stage

**Phase 2 — Customer website: redesigned from the owner's six-screen picture on 2026-10-31, waiting for the owner's
review (DEMO / PROTOTYPE).** The owner asked for the website first, then the Rider App; Riders page and refunds in
Phase 1 wait. See [apps/customer/README.md](apps/customer/README.md).

**Online App / Website rework (owner's brief, 2026-10-30):** step A (inspection) approved, step B (Overview, tabs, status
header) built, DEMO only. Next steps C–H wait for the owner's approval.

**Phase 1 — Restaurant OS UI prototype: mostly built (DEMO / PROTOTYPE).** Approved by the owner: Preview 1,
the waiter → kitchen → cashier workflow (2026-10-28), POS / New Bill, Preview 4 (Orders, Online Orders),
Tables management and the Staff design (2026-10-30).

Built in Preview 5: Menu, Settings, Today's Summary, Online App. Still to build in Phase 1: Riders; refunds and
payment reversals. Nothing is connected to a real backend yet (Phase 4).

## Folder map

| Folder | What it is | Status |
|---|---|---|
| `docs/` | Master prompt v2.1, AI Manager plan | Written |
| `packages/shared` | Seven roles (Super Waiter, Service Waiter) and permission matrix, sidebar sections, order engine (dine-in, delivery, takeaway), kitchen tickets, pricing engine, payments/refunds, business day, selling units, API data types | NOT CONNECTED — 88 unit tests pass |
| `apps/restaurant-os` | Restaurant OS (Next.js, Tailwind) with ApiClient + DemoAdapter; installable PWA | DEMO / PROTOTYPE |
| `backend/api/prisma/schema.prisma` | Database design draft (delivery only, 4 roles) | NOT CONNECTED — draft, not validated; Phase 4 |
| `apps/customer` | Customer website: one app, a brand per restaurant; deploys on its own | DEMO / PROTOTYPE — Phase 2 |
| `apps/rider` | Rider App (PWA) | Not started — Phase 3 |
| `backend/api` (NestJS) | The one backend | Not started — Phase 4 |
| `apps/admin` | Platform Admin | Phase 9 |

## Feature status

Statuses: REAL / VERIFIED · DEMO / PROTOTYPE · NOT CONNECTED · PLACEHOLDER · BLOCKED.
Nothing is REAL / VERIFIED before Phase 4 — there is no backend yet.

| Feature | Status |
|---|---|
| Shared rules: roles, permissions, order and ticket transitions, bill formula (Test A Rs. 4,200 → Rs. 5,900, Test C), payments, refunds, business day, units | NOT CONNECTED — 57 unit tests pass |
| Layout: sidebar always visible (tablet/desktop), bottom navigation (phone), one feature per screen; sidebar starts with POS, Tables, Orders, Online Orders | DEMO / PROTOTYPE |
| One small "Demo mode" indicator with explanation (no live connection is claimed) | DEMO / PROTOTYPE |
| DEMO login (pick an account, no password); profile top-right with Log out; nobody can change their own role | DEMO / PROTOTYPE — real phone + password login in Phase 4 |
| Super Waiter: tables, guests, menu with sizes / add-ons / notes / units, rounds, Send to kitchen (double-tap safe), item statuses, Request Bill + cashier acknowledgement | DEMO / PROTOTYPE |
| Service Waiter: assigned tables only, food-ready notifications with items and quantities, Served (partly ready orders), Request Bill / Call Cashier; no ordering, prices, discounts, payments, refunds or voids | DEMO / PROTOTYPE |
| Kitchen / KDS: chefs see only their station (Pizza Oven, Grill & Fry, Chicken Station, Hot Kitchen, Drinks), same order number and table on every station, units ("1 kg"), timers, Start / Ready / Undo, VOID, out of stock, sound | DEMO / PROTOTYPE |
| Tables: live board with search and area / status filters (Free, Occupied, Bill requested, Cleaning, Out of service), compact cards with "guests / capacity"; a waiter with assigned tables sees only those. Owner/Manager: Manage Areas (add, rename, reorder, deactivate), + Add Table (one or many, e.g. T1–T10), edit name / area / seats / display order, out of service, remove (archived when used); open-bill locks | DEMO / PROTOTYPE — same table data in Tables, POS and Waiter Orders |
| POS / New Bill: product cards with pictures, categories and search; Order Type Table · Takeaway · Delivery · Call Waiter (a new bill starts as Takeaway: product + Bill Now, no table or customer needed; Table opens a box of all tables by area; Delivery needs name, phone, address); edit / remove items, Hold and reopen, Clear all; discount by Owner/Manager (or anyone the Owner allows) also before sending; Send to Kitchen; Bill Now → Cash / Card / Online, split and pending; pre-bill, receipt, reprint DUPLICATE; many tables at once; Running bills list and bill requests | DEMO / PROTOTYPE — approved 2026-10-30; same order records as Waiter, Kitchen, Tables and Orders |
| Staff Management: employee list (initials, Employee ID, role, branch, contact, Active / Inactive / Invited, last login, ⋯ actions; search, role / branch / status filters), 3-step Add / Edit wizard (personal → role & branch → permissions), Role Permissions matrix (View / Create / Edit / Delete / Approve; recommended, copy from role, turn all off) and per-person custom permissions; single-use activation and PIN-reset links, own PIN, Deactivate / Reactivate, Delete; Owner only, Manager read-only | DEMO / PROTOTYPE — the demo server checks the permissions; real server checks, audit log, email and photo upload later (Phases 4–7) |
| Installable app (PWA): manifest, icons, Install App in the profile and on the login screen | DEMO / PROTOTYPE — needs HTTPS to install on a real phone (hosting needs owner approval); no offline data |
| Notifications: food ready (Service Waiter), bill requested (Cashier), bill accepted (waiter) with message, sound and vibration | DEMO / PROTOTYPE — between tabs of one browser only |
| Owner workflow + Test A steps 1–6 + safety checks (automated walkthrough) | DEMO / PROTOTYPE — passes |
| Test A step 7 (Today's Summary) | PLACEHOLDER — Preview 5 |
| Online Orders: customer orders with a repeating alarm, Accept with prep time / Reject with reason, phone delivery (known phone fills name and address) and takeaway orders, kitchen tickets by station, automatic Preparing / Ready, assign or change rider, Picked up, takeaway payment and receipt, rider cash to settle, Cancel with reason | DEMO / PROTOTYPE |
| Customer orders and rider steps (Picked up – On the way, Delivered + cash collected) | DEMO / PROTOTYPE — simulated by DEMO buttons until the Customer App (Phase 2) and Rider App (Phase 3) exist |
| Orders: today / all, search (number, table, customer, phone), filter by type and status, detail with items, payments, kitchen tickets and full timeline; header search | DEMO / PROTOTYPE |
| Test D (online delivery → accept → kitchen → rider → delivered → cash settled) | DEMO / PROTOTYPE — walkthrough passes with DEMO customer/rider buttons |
| Refunds and payment reversals | PLACEHOLDER — next step of Phase 1 |
| Menu: items (one price or sizes, add-ons, station, unit, In stock / Online switches, search, filters, edit, delete or archive), categories (add, rename, reorder, hide, delete when empty), add-on groups | DEMO / PROTOTYPE — Preview 5 step 1; changes reach POS, Waiter Orders and the kitchen at once, old bills keep their prices |
| Settings: restaurant and branch, tax and service charge (with live example), rounding, delivery fee, minimum order, prep time, business day, receipt texts with preview, kitchen stations | DEMO / PROTOTYPE — Preview 5 step 2; Owner only; changes apply to new bills only (each order keeps its own bill settings) |
| Today's Summary: sales, average bill, cash received, tips, open bills, refunds, tax + service; sales by order type, payments by method, top items, tips per waiter, discounts / voids / refunds / cancellations with who and why; earlier business days | DEMO / PROTOTYPE — Preview 5 step 3; Test A step 7 passes in the walkthrough |
| Online App: online orders ON/OFF, delivery fee, minimum order, prep time, customer link and QR code, product Online ON/OFF | DEMO / PROTOTYPE — Preview 5 step 4; switches and link NOT CONNECTED to the website until Phase 4 |
| Online App / Website page: tabs (Overview, Website, Mobile App, Android App, Settings), status header, Publish Website apart from Android, website and phone previews, View Website | DEMO / PROTOTYPE — publishing states are demo only, nothing goes online; previews show the real `apps/customer` with its own sample data; domain, PWA and Android tabs show plans and honest states only (PLACEHOLDER until later steps) |
| Riders page: app preview + Open Full App | PLACEHOLDER — Rider App in Phase 3 |
| Customer website: Login, Home, Menu, Product, Cart with checkout, Tracking, Orders, Account, bottom bar; three sample brands, branch selector, install offer, offline message; phone, tablet, desktop | DEMO / PROTOTYPE — `walkthrough` in `apps/customer` (169 checks) passes on dev and on the production build; orders NOT CONNECTED to Restaurant OS until Phase 4 |
| Customer website: OTP and Google login, JazzCash / Easypaisa / Card, map and rider contact | NOT CONNECTED — screens only, clearly labelled; no paid service, no money moves |
| Dashboard, Customers, Finance & Reports (P7), Inventory & Suppliers, Payroll (P8), AI Manager (P10) | PLACEHOLDER — Coming Soon |
| Sync between phones, tablets and laptops | Not started — needs the shared backend (Phase 4) and Socket.IO (Phase 5) |

Known gaps: the optional "different tax rate per payment method" setting (MASTER_PROMPT.md §8) is
not in the pricing engine yet — add it with tests when the owner confirms the tax rules. Half-kg
portions need a size (variant) or decimal quantities — decide with the real menu. The Prisma
schema draft does not have the new roles, units, waiter tables and bill requests yet (Phase 4).

## Progress log

| Date | Step | Result |
|---|---|---|
| 2026-10-24 | Project rules, monorepo skeleton, shared order rules, schema draft | 14 unit tests pass |
| 2026-10-25 | AI Restaurant Manager design | Document only |
| 2026-10-26 | Master Prompt v1.0 (dine-in core, order engine, phases) | Document; Table 5 totals checked with the shared money code |
| 2026-10-26 | Documents reconciled: PROJECT_RULES v2.0, MASTER_PROMPT v2.0, `CLAUDE.md`; UI-first order | Waiting for owner approval |
| 2026-10-27 | Owner approved the documents and the Phase 1 plan. Project moved to `C:\Users\ADMIN\Projects\restaurant-saas-platform`, local Git baseline commit | Docs v2.1: navigation, Open Full App, white-label direction, open decisions #16–#18 |
| 2026-10-27 | Tooling: turbo, pnpm lockfile, build-script allowlist; `packages/shared` extended to the approved rules | 55 unit tests pass; `pnpm test`, `pnpm typecheck` pass at the root |
| 2026-10-27 | Phase 1 · Preview 1: `apps/restaurant-os` layout and navigation, DEMO role switcher, ApiClient + DemoAdapter, placeholders | `pnpm typecheck`, `pnpm lint`, `pnpm build` pass; 13 screenshots (phone, tablet, desktop); waiting for owner review |
| 2026-10-28 | Preview 1 feedback: sidebar starts with POS / New Bill, Tables, Orders, Online Orders; long DEMO strip removed (screen-title and role-switcher DEMO badges stay) | 55 tests, `pnpm typecheck`, `pnpm lint` pass; screenshots retaken; waiting for owner review |
| 2026-10-28 | Owner and Manager now open on POS / New Bill (owner decision) | 55 tests, typecheck, lint pass |
| 2026-10-28 | Phase 1 · Preview 2: Tables board, Waiter order screen (rounds, Served, Void, Print bill), Kitchen Display by station, food-ready alerts; DEMO sync now sends the data with the message (a tab read stale data before) | 55 tests, typecheck, lint, build pass; Test A steps 1–5 + Test B void walkthrough passes (run twice); screenshots; waiting for owner review |
| 2026-10-28 | Owner workflow: Super Waiter / Service Waiter, assigned tables, chefs per station, units (1 kg), notifications, bill request → accept → acknowledgement, POS table billing with pre-bill, payment and receipt, Staff screen, DEMO login, one "Demo mode" indicator, installable PWA | 57 tests, typecheck, lint, build pass; full workflow walkthrough passes (Test A steps 1–6 + safety checks); screenshots; waiting for owner review |
| 2026-10-28 | Phase 1 · Preview 4: Online Orders (alarm, accept/reject, phone and takeaway orders, riders, cash on delivery and settlement) and Orders (search, filters, timeline); header search. Fixed: auto-ready drinks no longer mark an order Preparing; a short search no longer matches phone numbers | 57 tests, typecheck, lint, build pass; both walkthroughs pass (workflow + Test A, and Test D + takeaway + phone + reject + timeline); screenshots; waiting for owner review |
| 2026-10-28 | POS / New Bill rebuilt (owner request): Flow A (cashier makes dine-in / takeaway / delivery bills, hold, discount, split and pending payment, complete) and Flow B (waiter's table bill paid at the POS) on the same order records. Fixed: Find table now reads the latest bills | 57 tests, typecheck, lint, build pass; all three walkthroughs pass (workflow, online, POS) |
| 2026-10-28 | POS layout made compact (owner, sizes only): narrower sidebar (icon rail below 1280 px), smaller top area, more products per row, POS fills one screen on tablet/desktop — products scroll on their own, the bill's totals and Clear bill / Hold / Send to kitchen always visible; optional customer box folds into one line; Clear bill asks first | 57 tests, typecheck, lint, build pass; all three walkthroughs pass (POS walkthrough now also checks Clear bill) |
| 2026-10-28 | POS layout round 2 (owner): Find bill and Running bills (table bills, takeaway/delivery to pay, held bills) move into the title row as a search box and a drop-down list, so products and the bill start higher; sidebar slightly wider (240 px) with cleaner labels | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-28 | POS look (owner): product tiles get a picture area with a food illustration (pizza, burger, chicken, fries, pasta, drink), category tabs get icons, bill rows are larger with a small picture, a pencil (edit) and a bin (remove), "Items (n)"; bill panel 28rem on desktop. Real menu photos still come with photo upload (Phase 7) | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-28 | POS on short laptop screens (owner's screen ≈ 1278×627 at 150 % scaling): the bill's upper part scrolls as one area, the newest item scrolls into view and flashes, totals and Clear bill / Hold / Send to kitchen always visible; smaller gaps and pictures on screens under 760 px high; categories above search; icons on Dine-in / Delivery / Takeaway; product columns follow the menu width; sidebar shows full names from 1024 px with a Collapse button (remembered in the browser) | 57 tests, typecheck, lint pass; all three walkthroughs pass; checked at 1278×627, 1440×900 and 1024×768 |
| 2026-10-29 | POS follows the owner's reference design: product cards with a large picture (food emoji until real photos, Phase 7), price and description; order panel with Dine-in / Takeaway / Delivery / Phone Call, Table & Customer, Items (n) with Hold and Clear all, green totals block (Subtotal, Tax & service, Total) and two big buttons Send to Kitchen and Bill Now (sends new items, then opens the payment). Phone Call = takeaway ordered by phone (channel PHONE). Product search moved into the title row. Demo data version 6 (product descriptions) | 57 tests, typecheck, lint pass; all three walkthroughs pass (POS walkthrough adds Phone Call + Bill Now); checked at 1278×627 (3 items + totals + buttons), 1440×900 (4 items), 1024×768 |
| 2026-10-29 | Owner feedback: the 4th button is **Call Waiter** (not a phone order): the table's Service Waiter (or the order's Super Waiter) gets "Cashier calls you — T5". Owner/Manager can now give a discount on a new bill before Send to Kitchen / Bill Now (saved together with the new order; a held bill keeps it); the Cashier sees "Only the Owner or Manager can give a discount." Bill Now on dine-in without a table points to the table box. Demo data version 7 | 57 tests, typecheck, lint pass; all three walkthroughs pass (POS walkthrough adds discount on a new bill and Call Waiter); 1278×627 shows 4 items + totals + buttons |
| 2026-10-29 | POS: the Dine-in button is labelled **Table** (owner); Orders, receipts and reports still say Dine-in | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-29 | POS: the table drop-down is removed; tapping **Table** opens a box with every table (green = free, red/amber = running bill with its amount). The chosen table shows at the top and next to Guests; Send / Bill Now without a table opens the box | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-29 | POS: the Guests counter is removed from the new bill; the Table and Customer rows are shown instead (Table row opens the table box; guests default to 1 for new dine-in orders; the Waiter screen still has Guests) | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-29 | POS: the "Table & Customer" block is removed from a new Table bill (owner): the table is chosen with the Table button, which then shows the table (e.g. Table T7) and the title says "T7 · New bill". Takeaway and Delivery keep their customer box because the order needs a name and phone | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-29 | POS: many tables at once (owner). The Table button always opens the table box, also on a bill that is already sent; the sent bill keeps running and is reopened from the box or Running bills. New items that were not sent are put on Hold for that table when you leave it. Fixed: Bill Now on a reopened held bill now opens the payment | 57 tests, typecheck, lint, build pass; all three walkthroughs pass (POS walkthrough adds T9 and T10 running together, hold on leaving, both paid and free) |
| 2026-10-29 | POS quick sale (owner): the "Find table no." search box is removed (tables are opened from the Table box or Running bills). A new bill now starts as Takeaway and needs no table and no customer: tap a product, tap Bill Now. Customer name and phone are optional on Takeaway (shown as "Walk-in customer"); Delivery still needs name, phone and address | 57 tests, typecheck, lint pass; all three walkthroughs pass (POS walkthrough adds the quick sale) |
| 2026-10-29 | POS quick sale fix (owner): tapping Table no longer turns the bill into a Table bill until a table is actually chosen; a bill without a table is sent as a counter sale (Takeaway) and never shows "Choose a table first" | 57 tests, typecheck, lint pass; all three walkthroughs pass (quick sale now also taps Table and closes the box) |
| 2026-10-29 | Call Waiter is always on (owner): it also works without a table (counter customer) and then alerts every waiter on duty ("Cashier calls you — at the counter"); with a table it alerts that table's waiter as before | 57 tests, typecheck, lint pass; all three walkthroughs pass (POS walkthrough adds the counter call) |
| 2026-10-29 | Call Waiter speaks (owner): the waiter's phone says "Counter par aayein" aloud with its own voice (Urdu or Hindi voice if the phone has one, else Roman text), together with the beep, vibration and message. Free browser feature, no paid service; works after the first tap on the page. Tested by recording what the phone is told to say, not by listening | 57 tests, typecheck, lint pass; all three walkthroughs pass |
| 2026-10-29 | Tables management (owner): Manage Areas (add, rename, reorder, deactivate) and + Add Table (one, or many such as T1–T10 with 4 seats) on the Tables screen for Owner/Manager; edit a table's name, area, seats and display order; Cleaning (any floor staff) and Out of service; search and status filters; "2 / 6 guests" on occupied cards; tables with running or held bills cannot be removed, taken out of service or moved, areas with them cannot be deactivated; used tables are archived (old bills keep the name). POS table box groups tables by area and disables out-of-service tables; Waiter Orders the same. Demo data version 8 (resets the demo once) | 64 tests (7 new), typecheck, lint, build pass; all four walkthroughs pass (new `walkthrough:tables`); screenshots in `screenshots/tables`; waiting for owner review |
| 2026-10-29 | Staff upgrade, frontend only (owner: "front end first, back end last"): only the Owner manages staff (Manager sees the list), last active Owner protected, mobile / email / branch on staff, single-use activation links that expire after 48 hours (copy or share on WhatsApp — email NOT CONNECTED), resend / cancel, activation page where the person creates their own PIN (6 digits, not too simple; DEMO never stores it), PIN reset, Disable ends every session at once and Enable needs a fresh login (DEMO session version). Real login, hashed PINs, device enrolment, attempt limits, server sessions, real-time revoke and HTTPS hosting are Phase 4–6 work | 68 tests (4 new), typecheck, lint, build pass; all five walkthroughs pass (new `walkthrough:staff`); screenshots in `screenshots/staff`; waiting for owner review |
| 2026-10-29 | Phone numbers (owner): a mobile number can be typed in any common way — 03001234567, 0300 1234567, 0300-1234567, +92 300 1234567 — and is saved as 0300-1234567 (Staff, POS and phone / delivery customers). Shared rule `normalizePhone`. Fixed: customer search now finds a number typed without the dash | 70 tests (2 new), typecheck, lint, build pass; all five walkthroughs pass (staff walkthrough types 03001112233 and +92 300 4445566) |
| 2026-10-29 | Staff Delete (owner): the Owner can delete a staff member (confirmation first). Someone never used is deleted completely; someone with orders, bills or history is archived — hidden from the list and login, logged out, but old bills keep the name. Never yourself or the last active Owner; the Manager cannot delete. Also: no Reset PIN on your own row; Manager role hint updated. Demo data version 10 | 70 tests, typecheck, lint, build pass; all five walkthroughs pass (staff walkthrough deletes an unused and an archived person) |
| 2026-10-29 | Staff redesign (owner's picture, panels 1–3, in the app's red + navy): employee list, 3-step Add Staff wizard and Role Permissions. Permissions are now per role (Owner-editable) and per person: every screen, sidebar section and demo-server check uses the person's own permissions; switching on is limited to what the order rules allow, Staff management and Settings stay Owner only. Employee ID (EMP001 …) and last login. Tap a name to open the person. Demo data version 11 | 75 tests (5 new), typecheck, lint, build pass; all five walkthroughs pass (staff walkthrough now covers the wizard, Role Permissions switching Tables off and on for Super Waiters, and a Cashier's own discount permission); screenshots in `screenshots/staff` |
| 2026-10-30 | Owner approves the Staff design (list, 3-step wizard, Role Permissions) | No code change; approval recorded in the decision log |
| 2026-10-30 | Owner approves POS / New Bill, Preview 4 (Orders, Online Orders) and Tables management; README "Current stage" and the POS row refreshed | No code change; approvals recorded in the decision log |
| 2026-10-30 | Preview 5 started ("shuru karo"). Step 1 Menu: items, categories and add-on groups on the Menu screen (Owner / Manager); hidden categories and removed items leave POS and Waiter Orders; a removed item that was ever ordered is archived; prices typed in rupees, kept in paisa. Demo data version 12 | 78 tests (3 new), typecheck, lint, build pass; all six walkthroughs pass (new `walkthrough:menu`); screenshots in `screenshots/menu` |
| 2026-10-30 | Preview 5 step 2 Settings (Owner only): restaurant and branch, tax and service charge, rounding, delivery, receipt, business day, kitchen stations. Each order now keeps the bill settings it was made with, so a Settings change never changes a running or old bill. Demo data version 13 | 82 tests (4 new), typecheck, lint, build pass; all seven walkthroughs pass (new `walkthrough:settings`); screenshots in `screenshots/settings` |
| 2026-10-30 | Preview 5 step 3 Today's Summary (Reports permission): one business day's sales, payments, tips per waiter, top items (by sales, because kg and pieces cannot be added up), and discounts, voids, refunds and cancellations with who and why. Shared `summarizeDay` | 84 tests (2 new: Test A step 7, open / discount / void / refund / cancel), typecheck, lint, build pass; all seven walkthroughs pass (Test A now steps 1–7; the POS walkthrough checks the "Staff meal" discount in the summary). One POS walkthrough run timed out while the dev server was recompiling and passed on the next runs |
| 2026-10-30 | Preview 5 step 4 Online App page: orders ON/OFF, delivery fee, minimum order, prep time, customer link and QR code (free browser library `qrcode-generator`), product Online ON/OFF. DEMO customer orders now also refuse items that are not online and orders below the minimum | 85 tests (1 new), typecheck, lint, build pass; all eight walkthroughs pass (new `walkthrough:online-app`); QR picture decoded with jsQR once = same link; no real phone scan |
| 2026-10-30 | Phase 2 customer website (owner: website first, then rider): `apps/customer` with home, menu, product details, cart, checkout, tracking, account screens, one app with two sample brands. Shared rules in `online-order.ts`. Online App page now previews the website | 88 tests (3 new), typecheck, lint, build pass; website walkthrough 43 checks passes on dev and on the production build; all eight Restaurant OS walkthroughs pass; not tested on a real phone; not pushed, not deployed |
| 2026-10-30 | Online App / Website rework step B (owner's brief and reference picture): page split into five tabs, status header, three setup cards, website and phone previews, demo Publish Website (Owner only, new permission `onlineApp.publish`), publishing states in `packages/shared/src/online-app.ts`. Existing switches, fee form, link, QR and item list kept, moved into tabs. Demo data version 14 | 93 tests (5 new), typecheck, lint, build pass; `walkthrough:online-app` now checks the website inside the preview frames, on 4 sizes; all eight Restaurant OS walkthroughs and the customer walkthrough pass; not tested on a real phone; not pushed, not deployed |
| 2026-10-31 | Menu redesign (owner's reference picture): category cards on top; tapping one shows only its products, search stays inside the category, size filter added, the category drop-down is replaced by the cards, prices line up in one column. App's light colours kept; food pictures stay emoji (Phase 7) | `walkthrough:menu` passes with a new card check; typecheck and lint pass; not pushed, not deployed |
| 2026-10-31 | Customer App redesign (owner's six-screen picture, frontend only in `apps/customer`): Login, Home, Menu, Product, one-page Cart with Delivery / Pickup / Dine-in and payment choices, Tracking with rider card and map area, Orders with Reorder, bottom bar; new sample restaurant LALA with two branches and required crust; skeletons, empty and error states, branch selector, closed banner, install offer, offline message, "Rs 1,300", 44 px tap targets. `packages/shared`, Restaurant OS and backend untouched | Customer lint, type-check and build pass; website walkthrough 169 checks on dev and on the production build (includes 44 px and accessible-name audits on 8 screens); `walkthrough:online-app` passes; 93 shared tests pass; install offer tested with a simulated browser event, not on a real phone; not pushed, not deployed |

## Commands

Keep the repository in a short folder path: Windows cannot create files with paths longer than 260
characters, which breaks `node_modules`.

```bash
pnpm install
pnpm dev                                            # Restaurant OS on http://localhost:3000
pnpm test                                           # shared rules (unit tests)
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @restaurant-saas/restaurant-os screenshots   # needs pnpm dev running; uses installed Microsoft Edge
pnpm --filter @restaurant-saas/restaurant-os walkthrough          # owner workflow + Test A steps 1–6 (needs pnpm dev)
pnpm --filter @restaurant-saas/restaurant-os walkthrough:online   # Test D, takeaway, phone, reject, Orders timeline
pnpm --filter @restaurant-saas/restaurant-os walkthrough:pos      # POS Flow A (new bills) and Flow B (waiter bill)
pnpm --filter @restaurant-saas/restaurant-os walkthrough:tables   # areas, add / edit / remove tables, cleaning, out of service
pnpm --filter @restaurant-saas/restaurant-os walkthrough:staff    # staff list, wizard, permissions, links, PIN, Deactivate, Delete
pnpm --filter @restaurant-saas/restaurant-os walkthrough:menu     # categories, items with sizes / add-ons, prices, stock, delete
pnpm --filter @restaurant-saas/restaurant-os walkthrough:settings # tax / service for new bills only, branch, receipt, day, stations
pnpm --filter @restaurant-saas/restaurant-os walkthrough:online-app # online ON/OFF, fee, minimum, link and QR
pnpm --filter @restaurant-saas/customer walkthrough                 # customer website: order, tracking, account, second brand
```

Screenshots are written to `screenshots/` (git-ignored).

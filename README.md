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

**Phase 1 — Restaurant OS UI prototype: in progress.** Preview 1 and the waiter → kitchen → cashier
workflow are approved (2026-10-28). Preview 4 (Orders, Online Orders) is ready for the owner's review.

Still to build in Phase 1: Menu, Online App, Riders, Today's Summary, Settings (Preview 5); refunds
and payment reversals.

## Folder map

| Folder | What it is | Status |
|---|---|---|
| `docs/` | Master prompt v2.1, AI Manager plan | Written |
| `packages/shared` | Seven roles (Super Waiter, Service Waiter) and permission matrix, sidebar sections, order engine (dine-in, delivery, takeaway), kitchen tickets, pricing engine, payments/refunds, business day, selling units, API data types | NOT CONNECTED — 57 unit tests pass |
| `apps/restaurant-os` | Restaurant OS (Next.js, Tailwind) with ApiClient + DemoAdapter; installable PWA | DEMO / PROTOTYPE |
| `backend/api/prisma/schema.prisma` | Database design draft (delivery only, 4 roles) | NOT CONNECTED — draft, not validated; Phase 4 |
| `apps/customer` | Customer Online App (PWA) | Not started — Phase 2 |
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
| Tables: live board, a waiter with assigned tables sees only those | DEMO / PROTOTYPE |
| POS / New Bill: new dine-in, takeaway or delivery bill, Call Waiter for a table, discount by Owner/Manager also before sending (table, guests, customer search or quick add, menu categories, product search, sizes, add-ons, notes, quantity, edit and remove items), Hold and reopen, Send to kitchen, add items to a running table bill, discount (Owner/Manager), subtotal / tax / delivery / discount / grand total, payment by Cash / Card / Online, split and pending, pre-bill, paid receipt, Complete; plus bill requests, Find a bill by table number and Running table bills | DEMO / PROTOTYPE — same order records as Waiter, Kitchen, Tables and Orders |
| Staff: add / edit / disable, Super Waiter or Service Waiter, assigned tables, chef stations | DEMO / PROTOTYPE — passwords in Phase 4 |
| Installable app (PWA): manifest, icons, Install App in the profile and on the login screen | DEMO / PROTOTYPE — needs HTTPS to install on a real phone (hosting needs owner approval); no offline data |
| Notifications: food ready (Service Waiter), bill requested (Cashier), bill accepted (waiter) with message, sound and vibration | DEMO / PROTOTYPE — between tabs of one browser only |
| Owner workflow + Test A steps 1–6 + safety checks (automated walkthrough) | DEMO / PROTOTYPE — passes |
| Test A step 7 (Today's Summary) | PLACEHOLDER — Preview 5 |
| Online Orders: customer orders with a repeating alarm, Accept with prep time / Reject with reason, phone delivery (known phone fills name and address) and takeaway orders, kitchen tickets by station, automatic Preparing / Ready, assign or change rider, Picked up, takeaway payment and receipt, rider cash to settle, Cancel with reason | DEMO / PROTOTYPE |
| Customer orders and rider steps (Picked up – On the way, Delivered + cash collected) | DEMO / PROTOTYPE — simulated by DEMO buttons until the Customer App (Phase 2) and Rider App (Phase 3) exist |
| Orders: today / all, search (number, table, customer, phone), filter by type and status, detail with items, payments, kitchen tickets and full timeline; header search | DEMO / PROTOTYPE |
| Test D (online delivery → accept → kitchen → rider → delivered → cash settled) | DEMO / PROTOTYPE — walkthrough passes with DEMO customer/rider buttons |
| Refunds and payment reversals | PLACEHOLDER — next step of Phase 1 |
| Menu, Online App and Riders management, Today's Summary, Settings | PLACEHOLDER — Preview 5 |
| Online App and Riders pages: app preview + Open Full App | PLACEHOLDER — Customer App in Phase 2, Rider App in Phase 3 |
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
```

Screenshots are written to `screenshots/` (git-ignored).

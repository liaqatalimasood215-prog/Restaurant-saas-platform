# PROGRESS.md — Lala Restaurant OS (handover for a new chat)

> **Khulasa (Roman Urdu):** Yeh file naye chat ke liye "yaad-dasht" hai. Is mein likha hai ke ab tak
> kya bana, kya aap ki approval ka intezar kar raha hai, kya baqi hai aur agla qadam kya hai. Naye chat
> mein sab se pehle likhein: **"PROGRESS.md aur CLAUDE.md padho, phir wahin se jaari rakho."**
> Naya project mat banana, code mat badalna jab tak kaam na diya jaye.

**Last updated:** 2026-10-29 · **Owner:** Liaqat Ali (restaurant owner, beginner at software; explain
everything in very easy Roman Urdu, code and documents in English)

---

## 0. How to start the new chat

1. Open the folder `C:\Users\ADMIN\Projects\restaurant-saas-platform` (short path on purpose: Windows
   breaks `node_modules` in long paths). Branch `phase-1/restaurant-os-ui`.
2. First message to Claude: *"Read PROGRESS.md and CLAUDE.md, then continue the same LALA Restaurant OS
   project. Do not create a new project."*
3. Claude reads, in this order: `CLAUDE.md` (loads `PROJECT_RULES.md`) → this file → `README.md`
   (status table + progress log) → `docs/MASTER_PROMPT.md` only for the sections the task needs.
4. Start the preview: `.claude/launch.json` already has the `restaurant-os` server (`pnpm dev`, port 3000).
5. Before any new work run `pnpm install`, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` (see §8)
   to confirm the starting point is green.

## 1. Project in one paragraph

Lala Restaurant OS is a multi-tenant restaurant SaaS for Pakistan: **Restaurant OS** (staff software),
**Customer PWA** and **Rider PWA** on ONE backend, ONE PostgreSQL database, ONE order system and ONE
pricing engine. Development is **UI first**: Phase 1 Restaurant OS UI prototype with DEMO data (this is
where we are), Phase 2 Customer App UI, Phase 3 Rider App UI, Phase 4 backend + database, Phase 5 live
sync (Socket.IO), Phase 6 security / pilot. Never start a phase or preview without the owner's approval
("shuru karo"). Rules: `PROJECT_RULES.md` (the decision log in §20 is the newest owner truth).

## 2. Hard rules (never break)

- Do not push to GitHub, deploy, publish, make the repo public or connect a paid service without the
  owner's explicit approval. Local commits on this branch are allowed (owner authorised); **nothing has
  been pushed**.
- Never commit passwords, API keys, database credentials or private customer data. Use environment
  variables and placeholder-only example files.
- Git identity is the placeholder `liaqat.ali@restaurant-saas-platform.local` — do **not** use the owner's
  Gmail (it contains his phone number).
- Production tenant isolation is enforced by the backend (Phase 4); browser filters are not security. The
  DEMO login is not secure and is labelled DEMO.
- Use the five statuses: REAL / VERIFIED, DEMO / PROTOTYPE, NOT CONNECTED, PLACEHOLDER, BLOCKED. Never
  invent test results, screenshots or integrations. Report to the owner with the template in
  `docs/MASTER_PROMPT.md` §15.4 in easy Roman Urdu.
- No paid service (SMS, WhatsApp, email, AI, voice, maps, payment gateway) without explaining the monthly
  cost and getting approval. (The "speaks aloud" Call Waiter uses the browser's own free voice.)
- Do not build a recreation of an existing game/product and do not expand the phase scope: the owner's
  design pictures are a visual reference only.

## 3. Approval status

| Item | Status |
|---|---|
| Phase 0 documents (PROJECT_RULES v2.1, MASTER_PROMPT v2.1) | **Approved** 2026-10-27 |
| Phase 1 plan | **Approved** ("ok start") 2026-10-27 |
| Preview 1 (layout and navigation) | **Approved** 2026-10-28 |
| Waiter → kitchen → cashier workflow (two waiter roles, stations, bill request) | **Approved** 2026-10-28 |
| Preview 4 (Online Orders + Orders) | **Waiting for the owner's approval** (he asked to see it, never said approved) |
| POS / New Bill (rebuilt many times at the owner's request) | **Waiting for the owner's final approval** — the last answer he gave was feedback on Call Waiter |
| Tables management (Manage Areas, Add Table, Cleaning, Out of service — owner request 2026-10-29) | **Built, waiting for the owner's review** (Cleaning stays manual — owner) |
| Staff upgrade + redesign (Owner-only, activation links, PIN, Deactivate ends sessions, employee list, 3-step wizard, Role Permissions — owner requests 2026-10-29) | **Approved** 2026-10-30 (DEMO frontend); backend parts wait for Phase 4–6 |
| Preview 5 (Menu, Online App, Riders, Today's Summary, Settings) | **Not started** — start only after the owner approves and says "shuru karo" |

## 4. What is built (all DEMO / PROTOTYPE unless noted)

Last work: Tables management (2026-10-29), one local commit on `phase-1/restaurant-os-ui` after
`3d17acb`; see `git log`. Nothing pushed.

### 4.1 Foundation

- Monorepo: pnpm 10.28 workspaces + Turborepo; Next.js 16 (App Router, Turbopack), React 19, Tailwind 4,
  TypeScript 6, ESLint 9, lucide-react. Apps: `apps/restaurant-os`. Packages: `packages/shared`.
  Not started: `apps/customer`, `apps/rider`, `apps/admin`, `backend/api` (only an unvalidated Prisma draft).
- `packages/shared` (NOT CONNECTED — **57 unit tests pass**): 7 roles (OWNER, MANAGER, CASHIER, WAITER =
  Super Waiter, SERVICE_WAITER, KITCHEN, RIDER) and the permission matrix, sidebar sections, order
  engine (dine-in, delivery, takeaway), kitchen tickets (station split, auto-ready, undo within 2 min),
  pricing engine (paisa + basis points: discount, service charge, tax, delivery fee, rounding), payments,
  refunds checks, business day (Asia/Karachi, 06:00), selling units (1 kg), shared types.
- Data layer: `ApiClient` interface (`src/lib/api/client.ts`) + `DemoAdapter` (`src/lib/api/demo/*`).
  Screens use `getApi()`; an ESLint rule blocks importing the demo folder anywhere else. Demo data in
  localStorage + BroadcastChannel (the message carries the data); the login session is per tab in
  sessionStorage. **Demo data version is 11** (changing it resets everyone's demo data once).
- All UI text lives in `apps/restaurant-os/src/i18n/en.ts` (Urdu UI is Phase 7).
- Installable PWA (manifest, icons, no-cache service worker, Install App in the profile menu); no offline
  data. One small "Demo mode" indicator in the header explains that sync works only between tabs of one
  browser.

### 4.2 Screens

| Screen | What works |
|---|---|
| Login | DEMO login: pick an account, no password |
| Tables | Live board with search, area and status filters (Free, Occupied, Bill requested, Cleaning, Out of service); compact cards ("2 / 6 guests" when occupied); a waiter with assigned tables sees only those. Owner/Manager: **Manage Areas** (add, rename, reorder, deactivate), **+ Add Table** (one, or many such as T1–T10), edit (name, area, seats, display order), Out of service, Remove (archived when used). Open bills lock a table and its area. Any floor staff marks Cleaning by hand. Rules: `packages/shared/src/tables.ts` |
| Waiter Orders | Super Waiter: tables, guests, menu with sizes/add-ons/notes/units, rounds, Send to kitchen (double-tap safe), item status, Void, Print bill, Request Bill + cashier acknowledgement. Service Waiter: assigned tables, food-ready alerts, Served, Request Bill; no ordering/prices/payments |
| Kitchen / KDS | Chefs see only their station; same order number and table everywhere; units, timers, Start / Ready / Undo, VOID, out of stock, sound |
| Online Orders | Repeating alarm for customer orders, Accept (prep time) / Reject (reason), phone delivery and takeaway orders, tickets by station, assign/change rider, Picked up, takeaway payment/receipt, rider cash to settle, Cancel. Customer and rider steps are simulated by labelled DEMO buttons until Phases 2–3 |
| Orders | Today / all, search (number, table, customer, phone), filters, detail with items, payments, kitchen tickets and timeline; header search |
| Staff | Redesigned like the owner's picture (panels 1–3, app colours): **Employees** tab (initials, #EMP…, role, branch, contact, Active / Inactive / Invited, last login, ⋯ menu: Edit details, Edit permissions, Resend / Cancel link, Reset PIN, Deactivate / Reactivate, Delete; search and filters; tap a name to open) and **Role Permissions** tab (matrix View / Create / Edit / Delete / Approve, copy from role, use recommended, turn all off). **3-step wizard** for Add and Edit (personal → role & branch → permissions). Per-person permissions within each role's allowed set; Staff management and Settings Owner only; Manager read-only. Activation links, own PIN (`/activate`), PIN reset, last-Owner protection as before. Rules: `packages/shared/src/access.ts`, `staff.ts`, `phone.ts`; screens: `apps/restaurant-os/src/screens/staff/` |
| POS / New Bill | See §5 |
| Placeholders | Menu, Online App, Riders, Today's Summary, Settings (Preview 5); Dashboard, Customers, Finance & Reports, Inventory, Payroll, AI Manager (Coming Soon) |

DEMO accounts (restaurant "Aziz Pizza — DEMO"): Aziz Ahmed 101 OWNER · Sana Khan 102 MANAGER · Bilal
Hussain 103 CASHIER · Imran Ali 104 Super WAITER · Usman Tariq 105 SERVICE_WAITER (T1–T8) · Kashif Raza
109 SERVICE_WAITER (T9–T16) · Rashid Mehmood 106 KITCHEN (all stations) · Nadeem 110 (Pizza Oven) · Javed
111 (Grill & Fry) · Akram 112 (Chicken Station) · Faisal Riaz 107 and Naveed Akhtar 108 RIDERS.
Stations: Pizza Oven, Grill & Fry, Chicken Station, Hot Kitchen, Drinks (auto-ready). Tables T1–T16.

## 5. POS / New Bill — current behaviour (owner decisions, do not undo)

Files: `apps/restaurant-os/src/screens/pos/` — `pos-screen.tsx`, `current-bill.tsx`, `menu-panel.tsx`,
`product-art.tsx`, `customer-fields.tsx`, `discount-dialog.tsx`, `draft.ts`, `payment-dialog.tsx`,
`print-dialog.tsx`, `printable-bill.tsx`; item dialog `screens/waiter/item-dialog.tsx`.

- **Layout** (owner's reference picture): category tabs on top, product cards with a large picture (food
  emoji on a soft colour — real photos are Phase 7), name, price, short description and a red + button;
  order panel on the right. Product search ("Search menu") and "Running bills" + "New bill" sit in the
  title row. On tablet/desktop the POS fills exactly one screen: products scroll on their own, the bill
  scrolls inside, and Subtotal / Tax & service / Total (green block) and the two big buttons **Send to
  Kitchen** and **Bill Now** never scroll away. Tested at 1278×627 (the owner's laptop), 1440×900,
  1024×768. Sidebar: full names from 1024 px with a Collapse button (remembered per browser).
- **Order Type buttons:** Table · Takeaway · Delivery · **Call Waiter**.
  - A **new bill starts as Takeaway** (counter sale): tap a product, tap Bill Now — no table, no customer
    needed. Customer name/phone are optional on Takeaway (shown as "Walk-in customer"); Delivery needs
    name, phone and address.
  - **Table** always opens a box with all tables (green free, red/amber running bill with its amount). The
    bill becomes a Table bill only after a table is chosen. There is no table drop-down, no Guests counter
    and no Table & Customer block (new table bills use 1 guest; the Waiter screen still has Guests).
  - A bill with no table is sent as a counter sale (Takeaway); the screen never says "Choose a table first".
  - **Many tables at once:** the Table button works also on a bill that is already sent. The sent bill keeps
    running (reopen from the Table box or Running bills); unsent items are put on **Hold** for that table
    when you leave it.
  - **Call Waiter** is always on. With a table it alerts that table's Service Waiter (or the order's Super
    Waiter); without a table every waiter on duty gets "Cashier calls you — at the counter". The waiter's
    phone shows the message, beeps, vibrates and **speaks "Counter par aayein"** (device voice: Urdu, else
    Hindi, else Roman text; needs one tap on the page first). A double tap within 10 seconds is one call.
- **Items:** + / − quantity, pencil (edit size/add-ons/note), bin, **Hold**, **Discount** (Owner/Manager only,
  reason required, % or fixed; also on a new bill before sending — saved with the new order; the Cashier
  sees "Only the Owner or Manager can give a discount."), **Clear all** (asks first, removes only unsent items).
- **Running bills** list (title row): running table bills, takeaway/delivery orders still to pay, held bills.
  Bill requests from waiters show as an amber strip with Open / Accept.
- **Bill Now:** sends the new items (same order record as Waiter, Kitchen, Tables, Orders), then opens the
  payment: Cash (with change), Card, Online / Wallet (recorded, not processed online), split, or **Pay
  later (pending)**. Then Print Bill (pre-bill "NOT A RECEIPT"), Print Receipt / Reprint (DUPLICATE),
  "Complete — start a new bill", takeaway "Complete — handed to customer".
- "Find a bill by table number" (search box) was **removed at the owner's request** (it replaced his earlier
  "keep it" request; recorded in the decision log).
- Tax is 0 in the demo restaurant; the totals block shows "Tax & service".

## 6. Notifications and sound

Food ready (Service Waiter), bill requested (Cashier/Owner/Manager), bill accepted (the waiter who asked),
online order (repeating alarm until answered), counter order ready, **waiter called**. Message + beep +
vibration; Call Waiter also speaks. DEMO sync: between tabs of one browser only — real devices need the
backend and Socket.IO (Phases 4–5). Code: `src/components/shell/notifications.tsx`, `src/lib/sound.ts`.

## 7. Test status (last run, all green)

- `pnpm test` — 75 unit tests pass. `pnpm typecheck`, `pnpm lint` and `pnpm build` pass (2026-10-29, Staff
  upgrade).
- Automated walkthroughs (Edge through `playwright-core`, while `pnpm dev` runs), all pass:
  - `pnpm --filter @restaurant-saas/restaurant-os walkthrough` — waiter → kitchen → cashier workflow, Test A
    steps 1–6, permission checks.
  - `... walkthrough:online` — Test D (online delivery), takeaway, phone lookup, reject, Orders timeline.
  - `... walkthrough:pos` — POS Flow A (dine-in, takeaway, hold, Owner discount on a running and a new
    bill, split and pending payment, Bill Now, Clear all), Flow B (waiter's table bill, Call Waiter),
    many tables at once (T9/T10), quick sale (product + Bill Now), counter Call Waiter incl. what the
    phone is told to say. The script asserts order/invoice numbers (#1–#7): adding or removing orders in an
    earlier step shifts later numbers.
  - `... walkthrough:tables` — Manage Areas (add, duplicate refused, rename, reorder), Add Table many
    (T17–T22) and one (duplicate, 0 and 2.5 seats refused), edit seats and display order, open-bill locks on
    T1 and Hall, Cleaning, Out of service, POS table box by area, Waiter Orders list, remove (deleted vs
    archived), search, area deactivation, Manager vs Cashier buttons.
  - `... walkthrough:staff` — add staff (bad email refused), single-use link, resend cancels the old link,
    weak / mismatched PIN refused, activation, link cannot be reused, login with assigned tables only, PIN
    reset logs the person out, Disable logs out at once, Enable needs a fresh login, cancel link, Owner cannot
    change own role / disable himself, Manager read-only.
- Screenshots go to `screenshots/` (git-ignored). `... screenshots` retakes the standard set.
- **Not verified:** the actual spoken voice (only the text handed to the speech engine is tested); real
  phones/tablets (sync is DEMO); PWA install on a phone (needs HTTPS hosting = owner approval); no test of
  printing to a real printer (print dialog only).
- Once the POS walkthrough failed on its first run while the dev server was recompiling and passed 3 times
  afterwards; treat a one-off failure right after editing as a timing issue only after re-running.

## 8. Commands

```bash
pnpm install
pnpm dev                                   # Restaurant OS on http://localhost:3000
pnpm test                                  # shared rules (57 unit tests)
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @restaurant-saas/restaurant-os walkthrough          # needs pnpm dev running
pnpm --filter @restaurant-saas/restaurant-os walkthrough:online
pnpm --filter @restaurant-saas/restaurant-os walkthrough:pos
pnpm --filter @restaurant-saas/restaurant-os screenshots
```

Working notes that saved time: use the Edit tool for multi-line code changes (long shell here-docs with
backticks/quotes break); use Bash, not PowerShell, for scripts (PowerShell once failed with EPERM); the
walkthrough scripts clear localStorage themselves; the POS bill panel remounts when `orderId` or `heldId`
changes (state that must survive, such as `payNow`, lives in the draft, `screens/pos/draft.ts`).

## 9. Pending tasks and next steps (in this order)

1. **Get the owner's answer** on POS, Preview 4, Tables management and the Staff upgrade (approved or
   changes). Do not start Preview 5 before that.
2. **Housekeeping docs (no code):** `README.md` "Current stage" and the POS row in the feature table are
   partly outdated (they still mention Preview 4 as latest and "Find a bill by table number"); refresh them
   with the progress log. `docs/MASTER_PROMPT.md` §7.1 POS row should describe the final POS above. Check
   `apps/restaurant-os/scripts/screenshots.mjs` still takes the POS screens in the new layout.
3. **Preview 5** (after approval): Menu management (categories, items, sizes, add-ons, units, stations,
   online ON/OFF, out of stock), Online App page (ON/OFF, link, QR, Customer App preview + Open Full App =
   PLACEHOLDER), Riders page (add/disable, assignments, cash to settle, Rider App preview + Open Full App =
   PLACEHOLDER), Today's Summary (Test A step 7: Rs. 5,900 etc.), Settings (restaurant, branch, tax, service
   charge, delivery fee, business day, receipt). Add each to `src/lib/build-plan.ts` / `section-page.tsx`.
4. **Refunds and payment reversals** (Owner/Manager, reason, original payment never edited) — PLACEHOLDER now.
5. Phase 1 gate: running preview + screenshots of every screen + screen/status list + the owner's approval
   in the decision log; then Phase 2 (Customer App UI) only when he says "shuru karo".
6. Later (not now): backend/Prisma (Phase 4), Socket.IO (Phase 5), real photos and printers (Phase 7).
   Staff backend list for Phase 4–6 (owner: "back end last"): phone + password login, argon2 PIN hash,
   `staff_invites` (token hash, 48 h, single-use), `staff_devices` (PIN unlock only on enrolled, verified
   devices), failed-attempt limits, `token_version` on Disable / Enable / PIN reset / role change, real-time
   room revoke, no private data in PWA caches, HTTPS hosting, email service for links (cost + approval).

## 10. Open questions and known gaps (ask the owner one short question with a recommendation)

- Call Waiter voice: the owner asked for speech; he has not yet confirmed how it sounds on a real phone or
  whether the wording is right. His other idea — the **waiter calling the cashier at any time, without a
  table** (today a waiter can only send Request Bill on a table bill) — was offered and not answered.
- Staff (not built, owner's long request 2026-10-29): Email / WhatsApp / POS-PIN invite methods (panel 4 of the
  picture), extra roles (Dispatcher, Inventory, Finance), photo upload (Phase 7), Import Staff, custom roles.
- Staff: what is the primary login on a new device — phone + password (current rule, recommended; the
  activation page would then also set a password) or something else? Decide before Phase 4. Riders are still
  added on the Riders page (Preview 5) and follow the same Owner-only rule.
- Tables: Cleaning stays **manual** (owner, 2026-10-29): staff press the sparkle button on a free table; a
  paid table does not go to Cleaning by itself. Settings (Preview 5) no longer needs areas/tables — they live on the Tables screen.
- Real food photos: owner may want them before Phase 7 (needs his own photos; never use other people's).
- Table bills no longer capture guests or a customer name at the POS (owner removed those fields).
- "Dine-in" still appears on the Orders list, receipts and reports (only the POS button says "Table").
- The reference picture also showed Customers and Reports in the sidebar and product favourites (hearts),
  an Open/Closed button and 5 % tax / 10 % service: not built (new features / Settings in Preview 5).
- Optional pricing setting "different tax rate per payment method" is not in the pricing engine yet.
- Half-kg portions need a size (variant) or decimal quantities — decide with the real menu.
- `backend/api/prisma/schema.prisma` is an unvalidated draft (delivery only, 4 roles) — Phase 4.
- Open owner decisions: `docs/MASTER_PROMPT.md` §16 (#16 rider availability before Phase 3).
- A full customer list/screen is not built (search finds customers from earlier orders only).

## 11. Where the history lives

`PROJECT_RULES.md` §20 (decision log, newest owner decisions), `README.md` (status table and dated progress
log of every step), `docs/MASTER_PROMPT.md` (features, workflows, data model, tests; change log at the end),
`git log` (every step is one local commit; messages say what and why).

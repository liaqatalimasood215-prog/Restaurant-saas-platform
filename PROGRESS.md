# PROGRESS.md — Lala Restaurant OS (handover for a new chat)

> **Khulasa (Roman Urdu):** Yeh file naye chat ke liye "yaad-dasht" hai. Is mein likha hai ke ab tak
> kya bana, kya aap ki approval ka intezar kar raha hai, kya baqi hai aur agla qadam kya hai. Naye chat
> mein sab se pehle likhein: **"PROGRESS.md aur CLAUDE.md padho, phir wahin se jaari rakho."**
> Naya project mat banana, code mat badalna jab tak kaam na diya jaye.

**Last updated:** 2026-10-31 · **Owner:** Liaqat Ali (restaurant owner, beginner at software; explain
everything in very easy Roman Urdu, code and documents in English)

---

## 0. How to start the new chat

1. Open the folder `C:\Users\ADMIN\Projects\restaurant-saas-platform` (short path on purpose: Windows
   breaks `node_modules` in long paths). Branch `phase-1/restaurant-os-ui`.
2. First message to Claude: *"Read PROGRESS.md and CLAUDE.md, then continue the same LALA Restaurant OS
   project. Do not create a new project."*
3. Claude reads, in this order: `CLAUDE.md` (loads `PROJECT_RULES.md`) → this file → `README.md`
   (status table + progress log) → `docs/MASTER_PROMPT.md` only for the sections the task needs.
4. Start the preview: `.claude/launch.json` has `restaurant-os` (port 3000) and `customer` (port 3001). `pnpm dev` starts both.
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
| Preview 4 (Online Orders + Orders) | **Approved** 2026-10-30 |
| POS / New Bill (rebuilt many times at the owner's request) | **Approved** 2026-10-30 |
| Tables management (Manage Areas, Add Table, Cleaning, Out of service — owner request 2026-10-29) | **Approved** 2026-10-30 (Cleaning stays manual — owner) |
| Staff upgrade + redesign (Owner-only, activation links, PIN, Deactivate ends sessions, employee list, 3-step wizard, Role Permissions — owner requests 2026-10-29) | **Approved** 2026-10-30 (DEMO frontend); backend parts wait for Phase 4–6 |
| Preview 5 (Menu, Online App, Riders, Today's Summary, Settings) | **Started** 2026-10-30 ("shuru karo"). Steps 1 **Menu**, 2 **Settings**, 3 **Today's Summary** and 4 **Online App: built**; Riders and refunds **paused** (owner: website first) |
| Phase 2 customer website (`apps/customer`) | **Redesigned from the owner's six-screen picture, plan and five decisions approved, built 2026-10-31, waiting for the owner's review** (owner, 2026-10-30: "first making website … then rider") |
| Online App / Website rework (owner's brief, steps A–H) | Step A inspection **approved** 2026-10-30 with its four decisions; step B **built, waiting for the owner's review**; steps C–H not started |

## 4. What is built (all DEMO / PROTOTYPE unless noted)

Last work: Tables management (2026-10-29), one local commit on `phase-1/restaurant-os-ui` after
`3d17acb`; see `git log`. Nothing pushed.

### 4.1 Foundation

- Monorepo: pnpm 10.28 workspaces + Turborepo; Next.js 16 (App Router, Turbopack), React 19, Tailwind 4,
  TypeScript 6, ESLint 9, lucide-react. Apps: `apps/restaurant-os`, `apps/customer`. Packages: `packages/shared`.
  Not started: `apps/rider`, `apps/admin`, `backend/api` (only an unvalidated Prisma draft).
- `packages/shared` (NOT CONNECTED — **93 unit tests pass**): 7 roles (OWNER, MANAGER, CASHIER, WAITER =
  Super Waiter, SERVICE_WAITER, KITCHEN, RIDER) and the permission matrix, sidebar sections, order
  engine (dine-in, delivery, takeaway), kitchen tickets (station split, auto-ready, undo within 2 min),
  pricing engine (paisa + basis points: discount, service charge, tax, delivery fee, rounding), payments,
  refunds checks, business day (Asia/Karachi, 06:00), selling units (1 kg), shared types.
- Data layer: `ApiClient` interface (`src/lib/api/client.ts`) + `DemoAdapter` (`src/lib/api/demo/*`).
  Screens use `getApi()`; an ESLint rule blocks importing the demo folder anywhere else. Demo data in
  localStorage + BroadcastChannel (the message carries the data); the login session is per tab in
  sessionStorage. **Demo data version is 14** (changing it resets everyone's demo data once).
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
| Menu | Items tab with **category cards on top** (All Menu, Pizza, Burgers … with item counts; tap one and only its products show, owner's reference picture 2026-10-31, in the app's light colours; search stays inside the category; size filter where items have sizes). Each item: picture, station, unit, one price or sizes, add-ons, In stock and Online switches, edit, delete = archive when ever ordered. Then Categories tab (add, rename, reorder, hide / show, delete when empty), Add-ons tab (groups with "choose min–max" and add-ons, free or priced). Changes reach POS, Waiter Orders and the kitchen at once; old bills keep their prices. Rules: `packages/shared/src/menu.ts`; screens: `apps/restaurant-os/src/screens/menu/` |
| Settings | Owner only: restaurant and branch (name, phone, address), tax rate and switches (prices include tax, tax on service / delivery), dine-in service charge, round to rupee, live example bill, delivery fee, minimum order, usual prep time, business day start, receipt top / bottom text with preview, kitchen stations (add, edit warn / late minutes and "ready at once", reorder, remove only when unused). **Every order keeps the bill settings it was made with** (`order.pricing`): a Settings change affects new bills only. Rules: `packages/shared/src/settings.ts` |
| Today's Summary | One business day (pick earlier days): sales of paid bills (big number), average bill, cash received (and cash still with riders), tips, open bills and amount due, refunds, tax + service; sales by order type, payments by method, top items by sales, tips per waiter, discounts / voids / refunds / cancellations with who and why. Permission "Reports" (Owner; Manager when Role Permissions allow). Calculation: `packages/shared/src/reports.ts` (Test A step 7 unit test) |
| Online App / Website | Rework step B, owner's reference picture in the app's own colours. Tabs: **Overview** (status header with link, copy, View Website, Publish Website and the orders ON/OFF switch; cards Website, Installable App, Android App; Website Preview Desktop / Mobile and phone preview, both the real `apps/customer` in a frame), **Website** (customer link and QR code, custom domain = Planned, product Online ON/OFF with search), **Mobile App (PWA)** (honest list: offline = Planned, install = needs hosting), **Android App** (5 steps, screens only), **Settings** (delivery fee, minimum order, prep time, same values as Settings). Publish Website is a demo state, Owner only (`onlineApp.publish`), and never touches Android. The DEMO customer buttons on Online Orders obey the switches and the minimum order. Link NOT CONNECTED: works on this computer only until hosting. Rules: `packages/shared/src/online-app.ts`; screens: `apps/restaurant-os/src/screens/online-app/` |
| Placeholders | Riders (Preview 5); Dashboard, Customers, Finance & Reports, Inventory, Payroll, AI Manager (Coming Soon) |

### 4.3 Customer website (`apps/customer`, Phase 2, DEMO / PROTOTYPE)

One Next.js app on port 3001 serves every restaurant at `/<restaurant>/<branch>`; name, colours, logo and menu are data
(`CustomerBrand`, `--store-primary`, `--store-accent`). Sample brands: `lala-restaurant/main` (the owner's design, red and
yellow, crust; second branch `lala-restaurant/gulberg` starts closed), `aziz-pizza/main` and `demo-karahi/main` (teal).
Redesigned 2026-10-31 from the owner's six-screen picture. Screens: Home `/` (address, time, search, categories, Deal
slider, Popular Now, branch selector, closed banner, install offer), Menu `/menu` (category tabs, grid, heart, Favourites
tab, sold out, hidden items never shown, side cart on desktop), Product `/item/<id>` (size, required crust, extras, note,
quantity, price on the button; `?line=` edits a cart line), Cart `/cart` (Delivery / Pickup / Dine-in, details remembered,
Complete your meal, payment choices, bill; `/checkout` redirects here), Tracking `/track/<token>` (private link, steps, DEMO
buttons, rider card with call and WhatsApp while a rider has the order, map area, order again), Orders `/orders` (Reorder),
Account `/account`, Login `/login` (first visit on a device, once, with Skip; also in the header), bell, filter and sort, bottom
bar below 1024 px. **NOT CONNECTED screens only:** OTP, Google, JazzCash / Easypaisa / Card, map, rider contact. Dine-in is DEMO only
(borrows the pickup steps, `lib/order-rules.ts`). Same pattern as Restaurant OS: `getApi()`, DemoAdapter and all mock data in
`src/lib/api/demo` (marked `// DEMO`, localStorage `lala-store-demo-v2`, cart `lala-store-cart-v2`), text in `src/i18n/en.ts`,
rules and money only from `packages/shared` (not changed by the redesign). Run and publish notes: `apps/customer/README.md`.
**Not connected to Restaurant OS** (separate sample data) until Phase 4. The Online App preview still opens Aziz Pizza.

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

- `pnpm test` — 93 unit tests pass. `pnpm typecheck`, `pnpm lint` and `pnpm build` pass (2026-10-30, Online App
  rework step B; the build covers both apps). All eight Restaurant OS walkthroughs and the customer walkthrough ran
  after step B and pass. A full-page screenshot leaves the website frames empty although they show on screen: use viewport screenshots.
- Customer App redesign (2026-10-31): `pnpm --filter @restaurant-saas/customer lint`, `typecheck` and `build` pass.
- `pnpm --filter @restaurant-saas/customer walkthrough` — 182 checks on phone, tablet and desktop sizes, on the dev
  server and on the production build (after `build`: preview `customer-production` in `.claude/launch.json`, port 3012,
  then `CUSTOMER_URL=http://localhost:3012`): the six screens, delivery / pickup / Dine-in orders, required crust, minimum
  order, sold out, hidden item, favourites, double tap makes one order, tracking, rider and map labels, Reorder, reject,
  login, branches, closed and not taking orders, offline, install offer, empty screens, wrong links, three brands, 44 px and
  accessible names on 8 screens, no sideways scroll. Screenshots in `screenshots/customer`. Not verified: a real phone; the
  real browser install prompt (a simulated browser event is used); the network-failure error state (demo data cannot fail).
- Automated walkthroughs (Edge through `playwright-core`, while `pnpm dev` runs), all pass:
  - `pnpm --filter @restaurant-saas/restaurant-os walkthrough` — waiter → kitchen → cashier workflow, Test A
    steps 1–7 (step 7 = Today's Summary: Rs. 5,900 cash, Rs. 6,000 received, Rs. 100 tip to the waiter), permission checks.
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
  - `... walkthrough:menu` — categories (add, duplicate refused, reorder, hide → gone from POS, show), add-on group
    (rule check), new item with sizes and add-ons (on the POS at once), a new price keeps the old bill on T1,
    out of stock / online switches, delete (deleted vs archived), Manager edits, Kitchen "No access".
  - `... walkthrough:settings` — tax 60 % refused, 16 % + 5 % saved (example Rs. 1,210), the running T1 bill
    keeps its old settings (Rs. 250) while a new T2 bill uses the new ones (Rs. 151), branch / receipt / business
    day, kitchen stations (times checked, in-use station locked), Manager "No access".
  - `... walkthrough:online-app` — link copied, orders OFF refuses a DEMO customer order, product OFF refuses it, bad fee and minimum order refused, fee reaches new orders and Settings, website preview link, Manager may change, Cashier "No access". The QR picture was decoded once with a separate tool (jsQR) and gave the same link; a real phone scan is not tested.
- Screenshots go to `screenshots/` (git-ignored). `... screenshots` retakes the standard set.
- **Not verified:** the actual spoken voice (only the text handed to the speech engine is tested); real
  phones/tablets (sync is DEMO); PWA install on a phone (needs HTTPS hosting = owner approval); no test of
  printing to a real printer (print dialog only).
- Once the POS walkthrough failed on its first run while the dev server was recompiling and passed 3 times
  afterwards; treat a one-off failure right after editing as a timing issue only after re-running.

## 8. Commands

```bash
pnpm install
pnpm dev                                   # Restaurant OS on http://localhost:3000, website on :3001
pnpm test                                  # shared rules (93 unit tests)
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @restaurant-saas/restaurant-os walkthrough          # needs pnpm dev running
pnpm --filter @restaurant-saas/restaurant-os walkthrough:online
pnpm --filter @restaurant-saas/restaurant-os walkthrough:pos
pnpm --filter @restaurant-saas/restaurant-os screenshots
pnpm --filter @restaurant-saas/customer walkthrough               # customer website
```

Working notes that saved time: use the Edit tool for multi-line code changes (long shell here-docs with
backticks/quotes break); use Bash, not PowerShell, for scripts (PowerShell once failed with EPERM); the
walkthrough scripts clear localStorage themselves; the POS bill panel remounts when `orderId` or `heldId`
changes (state that must survive, such as `payNow`, lives in the draft, `screens/pos/draft.ts`).

## 9. Pending tasks and next steps (in this order)

**Now (owner, 2026-10-31): the owner reviews the redesigned Customer App** (§4.3) and approves it or asks for changes.
His first feedback is done (2026-10-31): whole bottom bar in the phone preview, first visit opens on Login once with Skip,
the customer calls the rider while a rider has the order, details closer to the picture. Testing note: after
`build`, stop and start `customer-production`, or it still serves the old build.
Decided in the plan: login never forced; Dine-in DEMO only (open decision #19, MASTER_PROMPT.md §16);
COD default, other payments take no money; LALA is sample data; food pictures stay emoji, no photos from the internet.

**Then (owner, 2026-10-30): Online App / Website rework, steps A–H.** Frontend and demo data only. Without separate
approval: no real backend, custom domain, image upload, Google Play or publishing.

- A inspection: done, approved. B Overview, tabs, status header: built, the owner has not answered yet (Phase C was asked).
- C connect the preview to the Restaurant OS menu (the website keeps its own sample data today; a direct website link stays
  on its sample data until Phase 4). Offer the LALA sample restaurant on the Online App page (it now exists on the website, not
  yet in Restaurant OS). D Website tab: branding, homepage, menu display,
  delivery and pickup switches, opening hours, contact, SEO, domain screens, Download QR. E PWA screens. F Android screens
  (mock states, no real tooling). G tenant by domain with mock data; the "One website, every restaurant" start page becomes a
  developer page only. H full check, screenshots, documents.
- Each next step waits for the owner's approval. Riders page, refunds and Rider App stay paused.

**Before that (owner, 2026-10-30): website first, then rider.** The customer website is built; next:

- A. Owner reviews the website and approves it or asks for changes (Phase 2 gate).
- B. Rider App (Phase 3) after his "shuru karo". First ask: the owner said "rider sign up", but the decision log says
  riders are created by the owner with no public signup. Recommended: keep owner-created riders, or let a rider
  apply and the owner approve. Also decide rider Online / Offline (§10).
- C. The paused Phase 1 items below (Riders page, refunds, Phase 1 gate) when he says so.
- The website brief he pasted was cut off at the top: items 1–8 may hold more wishes; ask him to resend if they matter.

Older list, kept for the paused items:

1. Done 2026-10-30: the owner approved POS, Preview 4, Tables management and the Staff design. **Preview 5
   waits for the owner's "shuru karo"** (plan shown to him on 2026-10-30).
2. Done 2026-10-30: README "Current stage" and POS row, MASTER_PROMPT §7.1 POS row refreshed; the screenshot
   set already takes the POS in its new layout (10-tablet-landscape-cashier-pos).
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

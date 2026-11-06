# PROGRESS.md — Lala Restaurant OS (handover for a new chat)

> **Khulasa (Roman Urdu):** Yeh file naye chat ke liye "yaad-dasht" hai. Is mein likha hai ke ab tak
> kya bana, kya aap ki approval ka intezar kar raha hai, kya baqi hai aur agla qadam kya hai. Naye chat
> mein sab se pehle likhein: **"PROGRESS.md aur CLAUDE.md padho, phir wahin se jaari rakho."**
> Naya project mat banana, code mat badalna jab tak kaam na diya jaye.

**Last updated:** 2026-11-06 · **Owner:** Liaqat Ali (restaurant owner, beginner at software; explain
everything in very easy Roman Urdu, code and documents in English)

---

## 0. How to start the new chat

1. Open the folder `C:\Users\ADMIN\Projects\restaurant-saas-platform` (short path on purpose: Windows
   breaks `node_modules` in long paths). Branch `phase-1/restaurant-os-ui`.
2. First message to Claude: *"Read PROGRESS.md and CLAUDE.md, then continue the same LALA Restaurant OS
   project. Do not create a new project."*
3. Claude reads, in this order: `CLAUDE.md` (loads `PROJECT_RULES.md`) → this file → `README.md`
   (status table + progress log) → `docs/MASTER_PROMPT.md` only for the sections the task needs.
4. Start the preview: `.claude/launch.json` has `restaurant-os` (port 3000), `customer` (port 3001) and `rider` (port 3002). `pnpm dev` starts all three.
   If another chat already runs them, use `restaurant-os-running` and `customer-running`: they attach to the running servers (Next.js allows one dev server per app folder).
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
| Preview 5 (Menu, Online App, Riders, Today's Summary, Settings) | **Started** 2026-10-30 ("shuru karo"). Steps 1 **Menu**, 2 **Settings**, 3 **Today's Summary**, 4 **Online App** and **Riders: built**; refunds still to do |
| Phase 3 Rider App + Riders page | **Started** 2026-11-01 ("Haan, shuru karo"); **built, waiting for the owner's review** |
| Settings redesign (owner's picture 2026-11-03: feature cards, then the chosen setting) | **Approved** 2026-11-03 ("Approve"), DEMO frontend |
| Red & White design (owner's picture 2026-11-03: white sidebar with red ends, red gradients, softer shadows, POS cards and bill panel) | **Approved** 2026-11-03 ("Approve"), styling only; thin Collapse bar ("Theek hai") |
| POS added-product tick (green tick on add, red ✓ quantity while in the bill) | **Approved** 2026-11-04 ("Approve"), display only |
| Inventory & Suppliers plan (steps A–H) and its 6 decisions (owner's brief 2026-11-04) | **Approved** 2026-11-04. **Step A approved** 2026-11-04 ("Approve, Step B"); **Step B (Recipes & Food Cost) built** the same day (DEMO). His second brief the same day: **revised plan approved** (inventory phases 1–6, `PROJECT_RULES.md` §20); **phase 1 (tidy UI + Stock Movements) built** 2026-11-05 (DEMO; not reviewed separately). **Recipe Builder R1** built 2026-11-05; **R2 (Auto Scale, his second picture and brief) built and approved 2026-11-05 ("Approve")**; next: phase 2 (automatic stock use), only after his "shuru karo" |
| Demo data "Lala Restaurant — DEMO" (owner's four answers 2026-11-05: desi menu yes, Roti/Naan + cold drink/water + raita/salad yes, name Lala Restaurant, keep what he added) | **Approved** 2026-11-05 ("Approve"), DEMO; POS / Waiter cards show the 1 kg price first |
| Supplier list order, pictures and ranges (owner 2026-11-06) | **Built** 2026-11-06 (DEMO), waiting for his review |
| Suppliers (owner's Smart Supplier brief 2026-11-05) | Phase 0 plan **approved** ("Approve, S1 karo"); **S1 built and approved** 2026-11-06 ("Approve"), DEMO, with the Edit order button; then S2, S3, S4 each after his "shuru karo" |
| Phase 2 customer website (`apps/customer`) | **Approved** 2026-10-31 ("Approve, Phase C karo"): redesigned from the owner's six-screen picture, DEMO |
| Online App / Website rework (owner's brief, steps A–H) | Steps A–D **approved** (D on 2026-11-01); steps E–H **paused** by the owner, not cancelled |

## 4. What is built (all DEMO / PROTOTYPE unless noted)

Last work: Tables management (2026-10-29), one local commit on `phase-1/restaurant-os-ui` after
`3d17acb`; see `git log`. Nothing pushed.

### 4.1 Foundation

- Monorepo: pnpm 10.28 workspaces + Turborepo; Next.js 16 (App Router, Turbopack), React 19, Tailwind 4,
  TypeScript 6, ESLint 9, lucide-react. Apps: `apps/restaurant-os`, `apps/customer`. Packages: `packages/shared`.
  Not started: `apps/rider`, `apps/admin`, `backend/api` (only an unvalidated Prisma draft).
- `packages/shared` (NOT CONNECTED — **98 unit tests pass**): 7 roles (OWNER, MANAGER, CASHIER, WAITER =
  Super Waiter, SERVICE_WAITER, KITCHEN, RIDER) and the permission matrix, sidebar sections, order
  engine (dine-in, delivery, takeaway), kitchen tickets (station split, auto-ready, undo within 2 min),
  pricing engine (paisa + basis points: discount, service charge, tax, delivery fee, rounding), payments,
  refunds checks, business day (Asia/Karachi, 06:00), selling units (1 kg), shared types.
- Data layer: `ApiClient` interface (`src/lib/api/client.ts`) + `DemoAdapter` (`src/lib/api/demo/*`).
  Screens use `getApi()`; an ESLint rule blocks importing the demo folder anywhere else. Demo data in
  localStorage + BroadcastChannel (the message carries the data); the login session is per tab in
  sessionStorage. **Demo data version is 15** (changing it resets everyone's demo data once).
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
| POS / New Bill | See §5. Product cards with sizes show the first size's price ("Rs. 2,800 / 1 kg", owner 2026-11-05), not "from" the cheapest; the size is chosen in the box after a tap |
| Menu | Items tab with **category cards on top** (All Menu, Karahi, Sabzi & Daal … with item counts; tap one and only its products show, owner's reference picture 2026-10-31, in the app's light colours; search stays inside the category; size filter where items have sizes). Each item: picture, station, unit, one price or sizes, add-ons, In stock and Online switches, edit, delete = archive when ever ordered. Then Categories tab (add, rename, reorder, hide / show, delete when empty), Add-ons tab (groups with "choose min–max" and add-ons, free or priced). Changes reach POS, Waiter Orders and the kitchen at once; old bills keep their prices. Rules: `packages/shared/src/menu.ts`; screens: `apps/restaurant-os/src/screens/menu/` |
| Inventory & Suppliers (Step A) | Owner / Manager (`inventory.view`, `inventory.manage`). Tabs Overview and Ingredients; the later sections (Recipes B, Suppliers and Purchases C, Wastage, Counts and Movements D, Expenses E, Reports F) are shown greyed with their step. **Overview:** stock value, ingredients, low, out, expiring (+ expired) open the filtered list; today's purchases / kitchen use / wastage, supplier payments due and food cost say which step fills them; lists Low & out of stock, Expiring soon, Recent stock changes. **Ingredients:** search, category, filters All / Low / Out / Expiring / Not in use; table on wide screens, cards on phones. **Add / Edit:** name, code (suggested: CHK-001), category, bought-in and recipe units (kg ↔ g and l ↔ ml fixed, packages need their size, weight never becomes pieces), stock now (opening stock, new only), low-stock level, usual order, price per purchase unit, preferred supplier, storage place, batch, expiry, In use. The recipe unit is locked after stock was recorded. **Adjust Stock:** Add / Remove, quantity, reason (Counted again, Wrong entry before, Found more stock, Other + note), never below zero, a double tap saves once. Stock = sum of movements (OPENING, ADJUSTMENT). Rules: `packages/shared/src/inventory.ts`; demo data: `apps/restaurant-os/src/lib/api/demo/inventory-seed.ts`; screens: `apps/restaurant-os/src/screens/inventory/` |
| Recipe Builder R1 + R2 (Auto Scale) | **Owner's two pictures (2026-11-05).** Opens instead of the recipe list. **Top bar:** Recipes › Add / Edit Recipe · name, Save Draft, Verify Recipe; leaving with changes asks for a second tap. **Grid** (lg 13 / flexible / 14.5 rem, xl 15 / – / 17, 2xl 16.5 / – / 18; one column on phones, `min-w-0` so nothing scrolls sideways); the page scrolls once (no "one screen high" any more). **Left:** picture (emoji; pencil says photos come in Phase 7), name and category from the Menu, **Base Recipe Quantity** (number + kg / g / L / ml / pcs / plate / portion; converting kg ↔ g also converts the sizes) when Auto Scale is on, **Auto Scale** switch. **Middle:** Ingredients ("for the base recipe (1 kg)" or "Ingredients of ½ kg"), "+ Add Ingredient" focuses the search, lines with a picture per ingredient (`ingredientArt`), Quantity + Unit, cost, ▾ loss / optional / substitute; an automatic size shows its lines read-only (base × share) with **Customize this size**; a custom size is editable with **Back to Auto**; Copy from (sizes), note. **Right:** "Base Recipe (1 kg)" / size summary (cost, selling price field, food cost badge, profit, margin), Versions (last 5). **Below:** Recipe Sizes (Auto Scaled) — tick, size ("(Base)" on the size equal to the base, New / Custom badges), scaling %, total cost, selling price field, food cost, profit; tap a row to see its lines; **Customize Sizes** dialog (`sizes-dialog.tsx`: tick, name for new sizes, quantity, share, price, presets ½ kg / Pao / Half Pao / Small / Medium / Large / Other, remove new, Back to Auto; max 6 sizes). **Saving:** `saveScaledRecipe` writes in one step the base recipe (target variantId null), every ticked size (custom lines or base × share, its own versions) and the setup (`recipeScales`); changed prices / new sizes go to the Menu only after "Change the Menu too?" ("Save recipe only" when only prices changed); a kg item that gets sizes becomes per plate. Turning Auto Scale off keeps every size's recipe (`turnOffRecipeScale`). Turning it on keeps sizes whose own recipe is not base × share as Custom. An automatic size costs base cost × share everywhere (builder and Recipes list). Files: `screens/inventory/recipes/recipe-builder.tsx`, `sizes-dialog.tsx`, `recipe-lines.tsx`; rules in `packages/shared/src/recipes.ts` (`scaleLines`, `scaleCost`, `scaleShareBps`, `guessSizeQuantity`, `convertScaleQuantity`, `checkRecipeScale`) |
| Demo data: Lala Restaurant | `apps/restaurant-os/src/lib/api/demo/lala-seed.ts`: stations Karahi Station, BBQ & Grill, Hot Kitchen, Tandoor, Chai Counter, Drinks; 8 categories; 19 items (karahi 1 kg / ½ kg / Pao, fish 1 kg / ½ kg, sample prices); add-on Extra makhan; 39 ingredients with opening stock (shared ids with the old data where the same: chicken boneless, tomatoes, onions, oil, chilli, cream, drinks, bags, dish wash) + Naan dough (prepared); 9 suppliers; sample recipes, Auto Scale on Chicken Karahi, Mutton Karahi (draft) and Fish Fry; White Karahis have no recipe so he can try. **Upgrade 17 → 18** (`upgradeToLala`): name, receipt text, website texts and sample names change only when he never changed them; pizza items archived, their categories hidden, add-on groups removed when unused, pizza ingredients Not in use; desi data added; his own items, ingredients, recipes, orders kept. **Fixture:** `createSeed('acceptance')` = the old Aziz Pizza data for the walkthroughs (`localStorage['lala-os-demo-fixture'] = 'acceptance'`; that data also stays Aziz Pizza on upgrade). "+ New supplier" (name, phone) in the ingredient form (`addSupplier`) |
| Suppliers S1 | Inventory → **Suppliers** (was the Purchasing placeholder). Left: totals (bought today, we owe), search, supplier cards (category, today's purchases, due, Paid / Partly paid / Unpaid), Add supplier. Right: one supplier — name, phone (tap to call), Edit, **Settle Payment**; Previous due, Bought today, Paid today, Total due; **his products** (shared ingredients) with stock now, last rate, Quantity (purchase unit), Rate, **Receive** per product and "Receive all n · Rs." for a delivery of several; "+ Add product"; **khata** Today / All with running balance and who. Receive = one PURCHASE stock movement per product (supplier and khata entry on it) + one khata entry, once per idempotency key; the rate becomes the product's purchase price; a received product joins his products. Payment: amount (full offered), Cash / Bank transfer / Other, date (not future), note; never more than due; never changes stock. Add / Edit supplier: name, phone, category, address, notes, products (search + tick), old balance (new only = OPENING_BALANCE entry). Overview cards "Today's purchases" and "Supplier payments due" are filled. Phone: list, then one supplier with "All suppliers". Owner / Manager (`inventory.manage`); Cashier no access. Data version 19 (`withSupplierProfiles`, `khata`). Rules: `packages/shared/src/suppliers.ts`; screen: `apps/restaurant-os/src/screens/inventory/suppliers-tab.tsx` |
| Inventory section order | Suppliers · Stock · Recipes · Overview · Reports (owner 2026-11-06); opens on the first. **Edit order** (pencil at the end of the tab bar): tap sections in the wanted order, numbers 1, 2, 3 show, Done saves (`lala-os-inventory-order` in this browser), Reset = the usual order. Screen: `inventory-screen.tsx` (`useSectionOrder`) |
| Inventory phase 1: sections and Stock Movements | Five sections: **Overview · Stock · Recipes · Purchasing (Soon) · Reports (Soon)**; Stock: **Ingredients · Stock Movements · Wastage & Expiry (Soon) · Stock Counts (Soon)**. A Soon section opens a PLACEHOLDER panel with its list and inventory phase. **Stock Movements:** newest first (up to 300, total shown), when, ingredient, change (+ green / − red), why (reason or kind, note), by, stock after (red below zero); filters ingredient, kind, staff, period (Today, Last 7 days, This month, All time), Clear filters; History button on each ingredient row (phone: History link) opens it filtered; Overview "Recent stock changes → View all" opens it. Rules: `balancesAfter`, `periodRange` in `packages/shared/src/inventory.ts`; screen: `apps/restaurant-os/src/screens/inventory/movements-tab.tsx` |
| Inventory Step B: Recipes & Food Cost | Tab Recipes & Food Cost (Owner / Manager). Summary: menu items with a recipe, verified recipes, average food cost (simple average), above 45 %. Groups Menu items (one card per item, a line per size), Add-ons, Prepared items; filters All / No recipe / Draft / Verified / High. **Editor:** size tabs with status and "Changed", lines (ingredient grouped by category, quantity in the recipe unit, loss % with "Kitchen uses …", live cost; More: guest may leave it out, substitute with the same unit), Copy from another size, note, live Food cost panel (recipe cost, price, price without tax when prices include tax, food cost %, gross profit estimate, margin), version history; Save draft / Save & verify. Saving the same lines again only verifies; changed lines add a version. **Prepared items:** name, category, counted in, what one batch makes; cost per kg flows into every recipe that uses it; a prepared item can never use itself. Guide 35 % / 45 % is an assumption shown as such. Stock is not used until Step G (verified recipes only). Rules: `packages/shared/src/recipes.ts`; demo recipes: `apps/restaurant-os/src/lib/api/demo/recipe-seed.ts`; screens: `apps/restaurant-os/src/screens/inventory/recipes/` |
| Settings | Owner only: restaurant and branch (name, phone, address), tax rate and switches (prices include tax, tax on service / delivery), dine-in service charge, round to rupee, live example bill, delivery fee, minimum order, usual prep time, business day start, receipt top / bottom text with preview, kitchen stations (add, edit warn / late minutes and "ready at once", reorder, remove only when unused). **Layout (owner's picture 2026-11-03):** 12 feature cards (Restaurant & Branches, Bill/Tax & Service, Delivery & Online Orders incl. business day, Kitchen Stations, Menu & Pricing → Menu page, Recipes = Coming soon, Payment Methods (recorded Cash / Card / Wallet), Business Hours → Online App → Website, Printers & Devices incl. receipt text, Notifications & Alerts, System Preferences, Permissions & Roles → Staff); the chosen card opens beside them on wide screens and instead of them on phone and tablet. **Every order keeps the bill settings it was made with** (`order.pricing`): a Settings change affects new bills only. Rules: `packages/shared/src/settings.ts` |
| Today's Summary | One business day (pick earlier days): sales of paid bills (big number), average bill, cash received (and cash still with riders), tips, open bills and amount due, refunds, tax + service; sales by order type, payments by method, top items by sales, tips per waiter, discounts / voids / refunds / cancellations with who and why. Permission "Reports" (Owner; Manager when Role Permissions allow). Calculation: `packages/shared/src/reports.ts` (Test A step 7 unit test) |
| Online App / Website | Rework steps B–D, owner's reference picture in the app's own colours. The **Website** tab now has nine parts beside a phone preview: Branding, Homepage, Menu display (with product Online ON/OFF), Delivery & Pickup, Opening hours, Contact, Custom domain (DEMO steps), SEO & Sharing, QR code (preview, download). Saved settings reach the previews at once; on a published website they wait for Publish Website. Owner only, except the Delivery / Pickup / Dine-in switches. Tabs as first built: **Overview** (status header with link, copy, View Website, Publish Website and the orders ON/OFF switch; cards Website, Installable App, Android App; Website Preview Desktop / Mobile and phone preview, both the real `apps/customer` in a frame), **Website** (customer link and QR code, custom domain = Planned, product Online ON/OFF with search), **Mobile App (PWA)** (honest list: offline = Planned, install = needs hosting), **Android App** (5 steps, screens only), **Settings** (delivery fee, minimum order, prep time, same values as Settings). Publish Website is a demo state, Owner only (`onlineApp.publish`), and never touches Android. The DEMO customer buttons on Online Orders obey the switches and the minimum order. Link NOT CONNECTED: during development the shared link, Copy and QR use this computer's Wi-Fi address (`customerShareUrl`, `NEXT_PUBLIC_LAN_ADDRESS` from `next.config.ts`, read when the server starts), so a phone on the same Wi-Fi can open the website for testing; View Website and the previews stay on localhost; customers' phones need hosting. Rules: `packages/shared/src/online-app.ts`; screens: `apps/restaurant-os/src/screens/online-app/` |
| Riders | Totals (Online now, deliveries running, cash to settle), one card per rider (phone, Online / Offline / Disabled / Invited, now carrying, delivered today, cash to settle, Take cash), the real Rider App in a phone frame with "Show the app as", Open Full App, phone link and QR. Owner: Add Rider (name, mobile, activation link), Edit, New link, Disable / Enable, Delete. Manager: sees, may take cash. Cashier: no page, takes cash on Online Orders. Online Orders offers only Online, activated riders and says so when nobody is Online. Screen: `apps/restaurant-os/src/screens/riders/` |
| Placeholders | Dashboard, Customers, Finance & Reports, Inventory, Payroll, AI Manager (Coming Soon) |

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
Its own sample data on a direct link. Inside the Online App previews, or a tab opened with View Website, it shows the Restaurant OS menu, prices and switches (DEMO browser link: `apps/restaurant-os/src/screens/online-app/website-bridge.ts`, the website's DemoAdapter, `isWebsitePreviewData` in shared), with its own cart. **Orders do not reach Restaurant OS** until Phase 4.

### 4.4 Rider App (`apps/rider`, Phase 3, DEMO / PROTOTYPE)

One Next.js app on port 3002 at `/<restaurant>/<branch>` (`aziz-pizza/main`, `demo-karahi/main`; `/` goes to the first). Screens: DEMO Login (pick an account; disabled and
not-activated riders refused; no public sign-up), My deliveries with the Online / Offline switch, Delivery (tap to call, free Google Maps link, amount to collect, Picked up – On the way,
Delivered + cash confirmation, double tap safe), Today (done, collected, given, with the rider), Account, bottom bar. New assignment: message, beep, vibration. Installable PWA on HTTPS,
no offline data. Same pattern: `getApi()`, DemoAdapter in `src/lib/api/demo` (marked `// DEMO`), text in `src/i18n/en.ts`, rules in `packages/shared/src/riders.ts`.
**Two data sources:** direct link and phone = sample data with labelled DEMO buttons (`lala-rider-demo-v1`); Riders page frame and Open Full App = Restaurant OS orders through a DEMO
browser link (`screens/riders/rider-bridge.ts`, mounted in the app shell; the rider tab asks every second; closing Restaurant OS shows a clear message). It never crosses devices: a phone
always shows sample data until Phases 4–5. The customer website does not see rider steps until Phase 4. The DEMO rider buttons on Online Orders stay; `walkthrough:online` uses them.

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

- **2026-11-05 (Suppliers S1):** `pnpm test` 153 unit tests pass (khata: 50 L × Rs. 220 = Rs. 11,000, 15,400 − 10,000 = Rs. 5,400 Partly paid, carried to the next day; payment checks), `pnpm typecheck` and `pnpm lint` pass. All 14 Restaurant OS walkthroughs pass, with the new `:suppliers` (milk 20 → 70 → 90 L, Rs. 15,400, Rs. 20,000 refused, Rs. 10,000 paid → Rs. 5,400 Partly paid, payment does not touch stock, two products in one delivery Rs. 3,300, new rate becomes the price, Stock Movements, Overview cards, Ali Milk Supplier with Rs. 2,000 old balance, Manager yes / Cashier no, desktop, tablet, phone). Not run: `:previews`, `:riders`, `:connected`.
- **2026-11-05 (Lala demo + Recipe Builder R2):** `pnpm test` 149 unit tests pass (Auto Scale with the picture's numbers: 1,505 → 752.50 / 376.25 / 188.13, food cost 53.8 / 50.2 / 47 / 41.8 %; card price), `pnpm typecheck`, `pnpm lint` and the Restaurant OS build pass. Walkthroughs pass: `walkthrough`, `:online`, `:pos`, `:tables`, `:staff`, `:menu`, `:settings`, `:online-app` (needs the website on 3001), `:sub-orders`, `:refunds`, `:inventory`, `:recipes` (size rows instead of size tabs; laptop check = Verify on the first screen, no sideways scroll) and the new `:auto-scale` (upgrade 17 → 18 keeps an own item, desi POS, Chicken Karahi 1 kg Rs. 889.24 → ½ kg 444.62 → Pao 222.31, base change follows at once, Customize / Back to Auto, price 1,500 → confirm → Menu, White Karahi + Half Pao verified, new supplier, tablet and phone). Not run: `:previews`, `:riders`, `:connected` (need the Rider App on 3002). Not verified: his own laptop browser and a real phone.

- `pnpm test` — 107 unit tests pass. `pnpm typecheck`, `pnpm lint` and `pnpm build` pass (2026-11-01, Rider App; the build
  covers all three apps). All nine Restaurant OS walkthroughs, the customer walkthrough and the rider walkthrough ran and pass.
  A full-page screenshot leaves the website frames empty although they show on screen: use viewport screenshots.
- `pnpm --filter @restaurant-saas/rider walkthrough` — 73 checks on localhost, 72 on the Wi-Fi address (no service worker there), on phone, tablet and
  desktop sizes. `... restaurant-os walkthrough:riders` — Add Rider, activation, permissions, assign → app alert → On the way → Delivered → Take cash, Online / Offline, Disable, closed tab.
  Not verified: a real phone, the real sound (a tap is needed first; the vibration call is checked), PWA install on a phone (needs HTTPS).
- If walkthroughs fail with `ERR_CONNECTION_REFUSED`, the dev server stopped (a sleeping computer or a closed chat): start it and run them again.
- Customer App redesign (2026-10-31): `pnpm --filter @restaurant-saas/customer lint`, `typecheck` and `build` pass.
- `pnpm --filter @restaurant-saas/customer walkthrough` — 182 checks on phone, tablet and desktop sizes, on the dev
  server and on the production build (after `build`: preview `customer-production` in `.claude/launch.json`, port 3012,
  then `CUSTOMER_URL=http://localhost:3012`): the six screens, delivery / pickup / Dine-in orders, required crust, minimum
  order, sold out, hidden item, favourites, double tap makes one order, tracking, rider and map labels, Reorder, reject,
  login, branches, closed and not taking orders, offline, install offer, empty screens, wrong links, three brands, 44 px and
  accessible names on 8 screens, no sideways scroll. Screenshots in `screenshots/customer`. Not verified: a real phone; the
  real browser install prompt (a simulated browser event is used); the network-failure error state (demo data cannot fail).
  Also runs on the Wi-Fi address (`CUSTOMER_URL=http://<wifi-address>:3001`, 181 checks, 2026-10-31): a plain-HTTP address has no
  `crypto.randomUUID` and no service worker, so use `lib/new-id.ts` for ids, and the website cannot be installed or work offline there.
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
pnpm dev                                   # Restaurant OS on http://localhost:3000, website on :3001, Rider App on :3002
pnpm test                                  # shared rules (107 unit tests)
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @restaurant-saas/restaurant-os walkthrough          # needs pnpm dev running
pnpm --filter @restaurant-saas/restaurant-os walkthrough:online
pnpm --filter @restaurant-saas/restaurant-os walkthrough:pos
pnpm --filter @restaurant-saas/restaurant-os screenshots
pnpm --filter @restaurant-saas/customer walkthrough               # customer website
pnpm --filter @restaurant-saas/rider walkthrough                  # Rider App on sample data
pnpm --filter @restaurant-saas/restaurant-os walkthrough:riders   # Riders page + Rider App together
pnpm --filter @restaurant-saas/restaurant-os walkthrough:refunds  # Refunds and Correct Payment
pnpm --filter @restaurant-saas/restaurant-os walkthrough:inventory # Inventory Step A
pnpm --filter @restaurant-saas/restaurant-os walkthrough:recipes   # Inventory Step B
pnpm --filter @restaurant-saas/restaurant-os walkthrough:auto-scale # Lala demo upgrade + Recipe Builder R2 (Auto Scale)
pnpm --filter @restaurant-saas/restaurant-os walkthrough:suppliers  # Suppliers S1: receive, khata, payment, new supplier
```

Working notes that saved time: use the Edit tool for multi-line code changes (long shell here-docs with
backticks/quotes break); use Bash, not PowerShell, for scripts (PowerShell once failed with EPERM); the
walkthrough scripts clear localStorage themselves; the POS bill panel remounts when `orderId` or `heldId`
changes (state that must survive, such as `payNow`, lives in the draft, `screens/pos/draft.ts`).

## 9. Pending tasks and next steps (in this order)

**Supplier order, pictures and ranges built 2026-11-06 (DEMO), waiting for the owner's review** (his request, restated and confirmed: Edit order for suppliers, demo picture + Upload, whole range per supplier, easy UI). Supplier `sortOrder` and `photo` (256 px JPEG data URL, `isSupplierPhoto`, max 150,000 characters) in `packages/shared/src/inventory.ts` / `suppliers.ts`; `setSupplierOrder` in the ApiClient; data version 20 (`addSupplierRanges` in `lala-seed.ts`, Lala data only). `walkthrough:supplier-order`. Also 2026-11-06: the demo data's made-up 150–350 ms delay per call is gone (POS and Tables felt slow). The unfinished S2 rules of the earlier chat (returns, corrections, periods) are not in this branch: they are still uncommitted in the worktree `restaurant-software-setup-1ed6fb`; S2 waits for his "shuru karo".

**Suppliers S1 built 2026-11-05 and approved 2026-11-06 ("Approve"), DEMO.** His brief (one supplier = one screen, milk 50 L in the morning, pay in the evening). Next after his approval: **S2** returns and corrections (new entries with a reason, never deletes), history filters Yesterday / Week / Month / date, printable daily statement; **S3** optional purchase orders (draft → approve → partly / fully received → cancelled; only what arrives goes into stock); **S4** expenses (no double counting of purchases); then inventory phase 2 (sales take stock by verified recipes). Open: advance payments to suppliers (refused in S1), supplier cash in the cash count (Phase 7), Cashier receiving stock (Role Permissions later).

**Lala Restaurant demo + Recipe Builder R2 built and approved 2026-11-05 ("Approve"), DEMO.** He sent the current screen and his approved design (two pictures) with a long brief, then: "auto recipe cannot open … only making karahi mutton, daal, vegetables, fish, BBQ, tea, coffee … pizza burger remove … demo suppliers easy to add". His four answers: the desi menu (sample prices), plus Roti/Naan, cold drink/water, raita/salad; name "Lala Restaurant — DEMO"; keep what he added. The inventory work of the earlier chat (branch `claude/restaurant-software-dev-f6daad`) was brought into this chat's branch `claude/restaurant-software-setup-1ed6fb` by fast-forward (local only). Next, each only after his approval: real prices and recipes from him; inventory phase 2 (a sold size takes its own size recipe from stock, order lines keep the size id and recipe version). Not done by design: photo upload (Phase 7), removing a Menu size from the builder (use the Menu), the full Suppliers page (inventory phase 3), the website / Rider App direct-link sample data (still pizza; they follow Restaurant OS only through the DEMO link). His browser keeps his own demo data: in this chat's browser pane the upgrade ran on the old data; his own browser upgrades when he opens the new version.

**Previews, 2026-11-03:** every preview needs its own app running (3001, 3002): start all three with `pnpm dev`. A frame now says when its app is not running. The Wi-Fi address in the link and QR is read when Restaurant OS starts: after changing network, restart it.

**Sub-orders built 2026-11-02 (DEMO), waiting for the owner's review.** He rejected the first version (one order per table, customer numbers on items): his customers are strangers who arrive and leave at different times, and he confirmed this flow: the waiter opens T1, New sub-order; at the counter the customer says "Table 1", the cashier sees T1-1 Chicken and T1-2 Coffee, asks the waiter with Call Waiter if unsure, taps one and bills only that. Each sub-order is an own order with an own invoice. "Whole table on one bill" stays from his earlier Option 3; there is no combined printed bill yet, each order prints its own. The demo menu has no Coffee: he can add it on the Menu page (walkthroughs count the seeded items).

**DEMO connection and sounds built 2026-11-02, waiting for the owner's review.** Open a Restaurant OS tab, then `localhost:3001/aziz-pizza/main` and `localhost:3002/aziz-pizza/main` in the same browser. `walkthrough:connected` checks the whole path. The hidden `/demo-link` page must never use storage: in the browser test its storage was separate, and writing from it wiped orders. Limits: one browser only; keep a Restaurant OS tab open; sound starts after the first tap on a page, and the voice depends on the device; phones keep sample data until the backend.

**Rider App frontend built 2026-11-01 (DEMO), approved by the owner the same day; owner: "only front end; all front end, last backend".** All six picture screens, Delivery History, Profile, the design tokens, badges and four-tab bar are merged into `phase-1/restaurant-os-ui` (commit `4990138`), not pushed; no GitHub remote is connected. Decisions: no Accept Order; Picked Up is display only (`riderStage`); max 3 in the UI only. Live Tracking and Earnings are DEMO / NOT CONNECTED; COD cash is apart from earnings. Next: test on a real Android phone, then the remaining frontend (below), with his approval. Backend comes last, with its own approval. To test on this copy with Restaurant OS: production builds on 3100 and 3102 with the browser's 3000 and 3002 routed to them, because the DEMO link only believes those two addresses. Open for the backend: how riders are paid, whether Picked Up becomes a status, the server rule for max 3. Activation's "Open the Rider App" link now opens the LALA sample, not the rider's Restaurant OS restaurant, until real login.

An older undone attempt is kept, not committed: `git stash list`, "Rider App picture redesign attempt" (green screens, AI Manager tab, `riderStopPlan` with tests). Its last test
run had not finished. Use it only if he wants it. Limits to tell him when they come up: AI Manager is DEMO rules until Phase 10; Live Tracking, km and ETA are NOT CONNECTED until GPS (Phase 11) and a map cost approval.

**Customer App approved 2026-10-31.** Kept from the plan and feedback: login never forced (first visit opens on Login once
with Skip); Dine-in DEMO only (open decision #19, MASTER_PROMPT.md §16); COD default, other payments take no money; LALA is
sample data; food pictures stay emoji, no photos from the internet; the customer calls the rider while a rider has the order.
Testing note: after `build`, stop and start `customer-production`, or it still serves the old build.

**Now (owner, 2026-10-30): Online App / Website rework, steps A–H.** Frontend and demo data only. Without separate
approval: no real backend, custom domain, image upload, Google Play or publishing.

- A inspection, B Overview, tabs, status header: approved.
- C previews and View Website show the Restaurant OS menu, prices and switches (DEMO browser link); LALA sample in the previews;
  approved. Not done by design: a direct website link keeps sample data; orders stay on the website.
- D Website tab (`website-tab.tsx`, `website-settings.tsx`, `website-domain.tsx`, `website-qr.tsx`): built 2026-10-31, the owner reviews it
  next. Not done by design: real domain or DNS, picture upload, SEO on the real pages, hours closing the website by themselves.
  Added 2026-10-31 at the owner's request: the QR opens on a phone on the same Wi-Fi. **The owner has not yet confirmed it on his real phone.**
  His phone was on 4.5G, so it must join the computer's Wi-Fi. A new Wi-Fi address needs a server restart. Restaurant OS itself stays computer-only.
- E PWA screens. F Android screens
  (mock states, no real tooling). G tenant by domain with mock data; the "One website, every restaurant" start page becomes a
  developer page only. H full check, screenshots, documents.
- E–H are paused by the owner (2026-11-01), not cancelled.

**Plan agreed with the owner (2026-11-01):**

- A. Rider App frontend approved and merged 2026-11-01. Not yet verified on his real phone. The Riders page of Restaurant OS has not had a separate design review.
- B. Refunds and Correct Payment built 2026-11-02 (DEMO), waiting for his review. Then the Phase 1 gate. Open for later: "the money never came" (a paid order does not go back to unpaid).
- C. Phase 4 backend after his "shuru karo". Before it he prepares: real name, branch, menu and prices, tax and service charge; decides how often the internet drops
  (#13: changes the offline plan) and table ordering from a phone (#19). Explain hosting costs and get approval before any paid service.
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
4. Done 2026-11-02: refunds and Correct Payment (DEMO).
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
  activation page would then also set a password) or something else? Decide before Phase 4. Riders are
  added on the Riders page and follow the same Owner-only rule.
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
- Open owner decisions: `docs/MASTER_PROMPT.md` §16 (#13 internet drops and #19 table ordering before Phase 4).
- A full customer list/screen is not built (search finds customers from earlier orders only).

## 11. Where the history lives

`PROJECT_RULES.md` §20 (decision log, newest owner decisions), `README.md` (status table and dated progress
log of every step), `docs/MASTER_PROMPT.md` (features, workflows, data model, tests; change log at the end),
`git log` (every step is one local commit; messages say what and why).

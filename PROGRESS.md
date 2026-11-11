# PROGRESS.md — Lala Restaurant OS (handover for a new chat)

> **Khulasa (Roman Urdu):** Yeh file naye chat ke liye "yaad-dasht" hai. Is mein likha hai ke ab tak
> kya bana, kya aap ki approval ka intezar kar raha hai, kya baqi hai aur agla qadam kya hai. Naye chat
> mein sab se pehle likhein: **"PROGRESS.md aur CLAUDE.md padho, phir wahin se jaari rakho."**
> Naya project mat banana, code mat badalna jab tak kaam na diya jaye.

**Last updated:** 2026-11-10 · **Owner:** Liaqat Ali (restaurant owner, beginner at software; explain
everything in very easy Roman Urdu, code and documents in English)

---

## 0. How to start the new chat

1. Open the folder `C:\Users\ADMIN\Projects\restaurant-saas-platform` (short path on purpose: Windows
   breaks `node_modules` in long paths). Work from branch `main`, the same as GitHub `origin/main` (pushed 2026-11-10).
   `phase-1/restaurant-os-ui` is an older branch (stops at 2026-11-01); the folder itself was still on it on 2026-11-10.
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
  owner's explicit approval. Local commits are allowed (owner authorised). **`main` was pushed once, with his approval
  ("Haan, push karo"), on 2026-11-10** to his private repository `github.com/liaqatalimasood215-prog/Restaurant-saas-platform`
  (remote `origin`). Every later push needs his approval again. Never force push.
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
| Mixed sizes on one line (1 kg + ½ kg = one "1.5 kg" bill and kitchen line, POS and Waiter) | **Approved** 2026-11-07 ("Approve, commit karo"), DEMO |
| Cooked food P1: recipe once, follows the raw stock from supplier bills, Out of Stock at 0 (plan P1–P4) | **Approved** 2026-11-08 ("Approve, commit karo"), DEMO; P2–P4 each after his approval; Wastage & Expiry on hold |
| Cooked food P2: Prepared Items design from his picture (compact cards 3 per row, summary cards, chips, search, cards / list) and recipe groups on the whole screen | **Approved** 2026-11-08 ("Approve, commit karo"), DEMO; P3, P4 each after his approval |
| Cooked food P3: every supplier purchase its own recipe (5 kg, a separate 8 kg), apart from the total stock; bill preview, summary after saving, Purchases on each card | **Approved** 2026-11-08 ("Approve, commit karo"), DEMO; P4 after his approval |
| Integration brief (one connected system): audit, plan I1–I7 and 5 decisions | **Approved** 2026-11-08 ("Approve, I1 karo") |
| Integration I1: one product made once (Sell on POS from Prepared Items, link or make the menu product, portions, recipe badges in the Menu, one name once) | **Approved** 2026-11-08 ("Approve, commit karo"), DEMO, committed locally (`e31137c`); I2 after his approval |
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
- **2026-11-12 (Stage A Stock Count, committed on this branch):** `pnpm test` 214 (5 new), `pnpm typecheck`, `pnpm lint` pass. Walkthroughs pass: new `:counts` (8 steps:
  category count, 1 carton + 3 bottles = 27, a 0 count, blank rows; 2 bottles wasted during counting not taken twice (27 − 2 = 25); a Manager cannot approve
  his own count; the Owner approves from the bell, one COUNT per difference, history; storage-place count cancelled with a reason; sent back; phone),
  `:wastage` (20), `:staff`, `:kds`, `:inventory`, `:im1`, `:suppliers`, `:supplier-order`, `:units`, `:recipes`, `:cooked`, `:auto-scale`, `:integration`.
  Changed tests: data version 24 → 25 (5 walkthroughs). Not run: `:cooking` and `:sales-stock` (between midnight and 06:00), the others, customer, rider,
  `pnpm build`, a real phone.
- **2026-11-12 (W4 staff waste reports, committed on this branch):** `pnpm test` 209 (2 new), `pnpm typecheck`, `pnpm lint` pass. Walkthroughs pass: `:wastage` (20 steps; W4 =
  17 chef reports 1 L milk, held, no prices, no loss; 18 bell + Approve = one waste entry from the held food; 19 Reject + Release needs the safe tick,
  Reject + Keep on hold; 20 phone), `:staff`, `:kds`, `:inventory`, `:im1`, `:suppliers`, `:supplier-order`, `:units`, `:recipes`, `:cooked`,
  `:auto-scale`, `:integration`. Changed tests: data version 23 → 24 (5 walkthroughs). Not run: `:cooking` and `:sales-stock` (still between midnight
  and 06:00, see the W3 line), the other walkthroughs, customer, rider, `pnpm build`, a real phone.
- **2026-11-12 (W3 lots and expiry, committed on this branch):** `pnpm test` 207 (9 new), `pnpm typecheck`, `pnpm lint` pass. Walkthroughs pass: `:wastage` (16 steps; W3 =
  13 expired blocked, 14 bill line date = own lot, 15 Set date confirms, 16 held → Release only with the safe tick), `:inventory`, `:im1`, `:suppliers`,
  `:supplier-order`, `:units`, `:recipes`, `:cooked`, `:auto-scale`, `:integration`, `:kds`. Changed tests: data version 22 → 23 (5 walkthroughs);
  `:inventory` Out of stock 1 → 2 (the expired item has no usable stock); `:im1` step 6 now sets the date on the old-stock lot and expects the W3 result
  (cooking after the date passed used the fresh 5 kg, the expired 8 kg stay blocked → 6 kg short). `:cooking` and `:sales-stock` fail at 00:19–00:50
  (Asia/Karachi), between midnight and the 06:00 business-day start, at the same step on the last commit without W3 too (checked in a temporary copy):
  a test timing issue, to be run again after 06:00. Not run: the other walkthroughs, customer, rider, `pnpm build`, a real phone.
- **2026-11-11 (Inventory compact UI, committed with W2 on this branch):** `pnpm typecheck`, `pnpm lint` pass; walkthroughs `:inventory`, `:wastage`, `:suppliers`,
  `:cooking`, `:sales-stock`, `:recipes`, `:im1`, `:cooked` pass. Not run: the other walkthroughs, customer, rider, `pnpm build`, a real phone.
- **2026-11-11 (W2 Wastage, committed on this branch):** `pnpm test` 201 (3 new), `pnpm typecheck`, `pnpm lint` pass. `walkthrough:wastage` passes (12 steps; W2 =
  9 cooked daal 1 kg wasted from cooked stock only, 10 staff meal + donation apart, 11 reverse once, 12 correct linked), `:inventory` and `:sales-stock`
  (new order-food Waste Log checks) pass. Not run this time: the other walkthroughs, customer, rider, `pnpm build`, a real phone.
- **2026-11-11 (W1 restored in worktree `lala-restaurant-os-continue-9e41aa`, then committed there with the owner's approval):** files equal to `6e16416`; `pnpm test` 198 and
  `pnpm typecheck` pass. With this folder's servers on 3000 / 3001 / 3002, the four that had failed (port 3000 was another folder's) now pass:
  `:online-app`, `:riders` (first run: a screenshot timed out waiting for fonts after all its checks; passed when run again), `:connected`, `:previews`.
- **2026-11-11 (W1 Stock Wastage):** `pnpm test` 198 (5 new), `pnpm typecheck`, `pnpm lint` pass. New `walkthrough:wastage` passes (twice). On port 3010:
  `:inventory`, `:im1`, `:sales-stock`, `:suppliers`, `:supplier-order`, `:units`, `:recipes`, `:cooked`, `:integration`, `:pos`, `:kds` pass. `:cooking` (step 7) and
  `walkthrough` (step 4, a click waiting for a page change) stopped on 30-second timeouts in the long run; `:cooking` passed alone at once, `walkthrough`
  stopped again at another place (a page load) and passed on the third run. No server errors were logged; the cause is not found (three dev servers and
  many browser tabs at once). Not run: the other 11 walkthroughs, customer, rider, `pnpm build`, a real phone.
- **2026-11-10 (IM1 Stabilise):** `pnpm test` 193, `pnpm typecheck`, `pnpm lint` pass. All 25 older Restaurant OS walkthroughs pass, the new `walkthrough:im1`, customer (182 checks) and rider (275 checks) too. In the first run of the 25, `:inventory` and `:recipes` each stopped on a 30-second timeout (a click on the All filter; the page load); both passed when run again alone, the cause was not found. `pnpm build` not run (the dev servers were running).
- **2026-11-09 (bug run + phone fixes on this newest version, commit `d026d93`, pushed 2026-11-10):** `pnpm test` 189, `pnpm typecheck`, `pnpm lint` and `pnpm build`
  pass. ALL walkthroughs pass: the 25 Restaurant OS ones, customer, rider, the new rider `walkthrough:phone` (Wi-Fi address, storage blocked), and on
  the Wi-Fi address `walkthrough`, `:pos` and the customer walkthrough (181 checks). `:sales-stock` failed once while two test groups ran at the same
  time (it reads the order number straight after Send) and passed when run again. Not verified: a real phone. Fixes and files: README progress log.
- **2026-11-08 (Integration I1: one product, made once):** `pnpm test` 169 unit tests pass (2 new), `pnpm typecheck` and `pnpm lint` pass. Walkthroughs pass: new `:integration` (Tests A and B), `walkthrough`, `:pos`, `:menu`, `:recipes`, `:cooked`, `:auto-scale`, `:sizes`, `:inventory`, `:suppliers`, `:units`, `:supplier-order`. Not run: `:tables`, `:staff`, `:settings`, `:online-app`, `:online`, `:riders`, `:refunds`, `:connected`, `:previews`, `:sub-orders`. Not verified: his own browser and a real phone. Note: in a background shell `pnpm walkthrough…` once failed to start (`/usr/bin/dirname: Permission denied` in the pnpm shim); `node scripts/walkthrough-….mjs` runs the same script.
- **2026-11-08 (Cooked food P3: every purchase its own recipe):** `pnpm test` 167 unit tests pass, `pnpm typecheck` and `pnpm lint` pass. Walkthroughs pass: `:cooked` (P1–P3), `:units`, `:supplier-order` (both now tap Done on the purchase summary), `:suppliers`, `:inventory`, `:recipes`, `:auto-scale`. Not run: the other walkthroughs. Not verified: his own laptop and a real phone.
- **2026-11-08 (Cooked food P2: Prepared Items design from his picture + full-screen groups):** `pnpm test` 166 unit tests pass, `pnpm typecheck` and `pnpm lint` pass. Walkthroughs pass: `:cooked` (summary 9 / 7 / 0 / 1, filters, search, list view, full screen and "← Recipes", his 0 → 5 → 7 kg example, phone and laptop without sideways scroll), `:recipes` (button now "Add Recipe", Menu items tapped first), `:auto-scale` ("← Recipes" before Stock), `:units`, `:suppliers`. Not run this time: the other walkthroughs. Not verified: his own laptop and a real phone.
- **2026-11-08 (Cooked food P1 changed: recipes follow the raw stock):** `pnpm test` 166 unit tests pass, `pnpm typecheck` and `pnpm lint` pass. Walkthroughs pass: `:cooked` (his example: daal counted to 0 = Out of Stock, bill 5 kg → 5 kg, bill 2 kg → 7 kg, khata 2 bills, no cooked stock, builder, new dish, laptop and phone, upgrade 21 → 22), `:recipes`, `:auto-scale`, `:inventory`, `:suppliers`, `:supplier-order`, `:units`, `:sizes`, `walkthrough`, `:pos`. Not run: `:tables`, `:staff`, `:menu`, `:settings`, `:online-app`, `:riders`, `:refunds`, `:connected`, `:previews`, `:online`, `:sub-orders`. Not verified: his own browser and a real phone.
- **2026-11-07 (Mixed sizes + Cooked food P1):** `pnpm test` 165 unit tests pass, `pnpm typecheck` and `pnpm lint` pass. Walkthroughs pass: new `:sizes` and `:cooked`, and `walkthrough`, `:pos`, `:sub-orders`, `:auto-scale`, `:online`, `:recipes`, `:inventory`, `:suppliers`, `:supplier-order`, `:units`. Not run this time: `:tables`, `:staff`, `:menu`, `:settings`, `:online-app`, `:riders`, `:refunds`, `:connected`, `:previews`. Not verified: his own browser and a real phone.

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

**Stage A Stock Count built 2026-11-12 (DEMO), approved ("Approve, commit karo") and committed on this branch — not pushed, not on main** (plan `docs/INVENTORY_NEXT_STAGES_2026-11-12.md`,
approved with its 5 decisions and the order A → F). Stock → Stock Counts; `counts.ts`; COUNT movements; permissions `inventory.count` /
`inventory.count.approve` (data version 25); bell alert. Next, each after his approval: Stage B (Stock Movement History:
dates, lot and source on each row, Load more, CSV); run `:cooking` and `:sales-stock` after 06:00.

**W4 staff waste reports built 2026-11-12 (DEMO), approved and committed on this branch — not pushed, not on main** (owner: "Approved. Start W4 with all four
recommended settings"). Details: `docs/WASTAGE_EXPIRY_PLAN_2026-11-10.md` §10e. Kitchen / KDS → Report waste (no prices; the food is held at once, no
loss); Owner / Manager → Pending approval (bell alert): Approve = one waste entry from the held food; Reject = Release (safe tick, never expired) or Keep
on hold. Permissions `inventory.waste.submit` / `inventory.waste.approve` (Role Permissions row "Waste Reports"; data version 24). Next, each after his
approval: run `:cooking` and `:sales-stock` after 06:00; W5 (full check of Prompt 1 §7); merge into `main` / push.

**W3 lots and expiry built 2026-11-12 (DEMO), approved ("Approve, commit karo") and committed on this branch — not pushed, not on main** (owner: "Approved to start W3 with all three
recommended decisions"; his rules: unknown / unconfirmed dates stay Needs review, never safe; expired or unsafe returned food is never released). Details:
`docs/WASTAGE_EXPIRY_PLAN_2026-11-10.md` §10d. Every bill line, cooking batch, new item's opening stock and reversed waste line is its own lot (`lots.ts`);
data version 23 makes the stock on hand one old-stock lot per item (date not confirmed). Usable = on hand − expired − held (Cooking Plan, Cook, low / out,
staff meals, donations); FEFO, each past use judged as the lots were then; held reversals released only with the safe tick, never after the date; bill
line "Use by" date; lists Expiring soon / Expired / Needs review / On hold with Set date, Release, Record waste. Next: run `:cooking` and `:sales-stock` again after 06:00; each
after his approval: merge into `main` / push, then W4 (staff requests and approval), W5 (full check).

**Inventory compact UI built 2026-11-11 (styling only), approved and committed with W2 on this branch, not pushed** (owner: "Approve, commit karo") (his brief: clean the 8 screens Suppliers, Stock,
Recipes overview, Stock Movements, Cooking Plan, Available Food, Wastage, Expiry). Slim title row and smaller header buttons; section tabs lower; Stock
sub-tabs in one grey row that scrolls sideways; light-red chips instead of red gradients; compact tables and phone cards (an ingredient card ~115 px, was
~250 px); Cooking Plan without the red banner, "Nothing planned" once; Available Food and Wastage headers on one row; Expiry rows with a small Record waste
link; Recipes overview with small figures and three wide rows to tap. No label, workflow, calculation or data changed; Recipe Builder, Prepared Items and
the supplier screen (his pictures) untouched. New: `Button size="sm"`, `scripts/screenshots-inventory.mjs`; pictures in `screenshots/inventory-ui-before`
and `-after`. This is part of IM2 of the audit; its button moves and renames were NOT done (they change labels the walkthroughs and he know).

**W2 Wastage built 2026-11-11 (DEMO), approved and committed on branch `claude/lala-restaurant-os-continue-9e41aa`, not pushed, not on main** (owner: "Approve, commit karo") (owner: "Approved — Start W2 with both recommended
decisions"; W3–W5 each need his separate approval). Details: `docs/WASTAGE_EXPIRY_PLAN_2026-11-10.md` §10c. Cooked stock in Record Waste (one movement on the
cooked dish, raw never again, batch cost); cancelled-order / Available Food waste in the same Waste Log with no second movement; Staff meal and Donation
counted apart (Owner / Manager only); Reverse and Correct with a reason, linked, nothing deleted. Open for W3: reversed stock is usable again at once
("held until released" needs usable stock and lots); a discard time per cooked lot. Next, each only after his approval: merge into `main`, push, W3.

**W1 Stock Wastage built 2026-11-11 (DEMO), approved for a local commit on branch `claude/sleepy-shamir-5e83b0` only — not merged into `main`, not pushed** (owner: "Approved. Start W1 … Do not commit or push").
On 2026-11-11 the owner asked to restore it in worktree `lala-restaurant-os-continue-9e41aa` (branch `claude/lala-restaurant-os-continue-9e41aa`): applied there
identical to `6e16416`, then committed on that branch with his approval ("Approve, commit karo"). Merge into `main`, push and W2 each wait for his approval.
Stock → Wastage & Expiry is no longer a placeholder: **Record Waste** (one entry, several items; raw ingredients and packaging; quantity in any of the
item's units with "another unit" — 1 carton + 2 bottles = 26 bottles; reason; Other needs a note; where: Storage / Preparation / Cooking; when, not in the
future, at most 7 days back; preview "In stock 10 litres → 8 litres" and the loss), **Post waste** = one `WasteEvent` + one `WASTE` stock movement per item,
once per key, all or none; loss at the last purchase price (estimate), no price = "Unknown — needs a price", never Rs. 0. Waste Log (table / phone cards),
cards Waste today · Last 7 days · Expiring soon · Pending approval (W4), Expiring soon / Expired lists (one date per ingredient until W3), Stock Movements
"Wasted: <reason>", Overview card "Today's wastage". Supplier khata never changes. Rules `packages/shared/src/wastage.ts` (5 unit tests); `postStockWaste`,
`getWasteView`; `DemoInventory.wasteEvents` (optional, no data version change); screen `screens/inventory/wastage-tab.tsx`; `walkthrough:wastage`.
Not in W1: prepared / cancelled-order food, staff meal, donation, reversal (W2), lots and dates per delivery (W3), staff requests and approval (W4), photo
(Phase 7). Cancelled-order food waste stays in its own list on Available Food until W2. **Next only after his approval: W2.**


**All work of 2026-11-10 is on local `main` (owner: "Approve, main par lao").** IM1 (`98255ac`) and its docs note (`9bb7483`) were already pushed to GitHub
`main` on 2026-11-11 by another chat (owner: "push"). The search / Find customer / Wastage-plan branch (`claude/sleepy-shamir-5e83b0`) was merged on top,
README, PROGRESS and PROJECT_RULES joined by hand. These newer commits were **pushed to GitHub `main` on 2026-11-11** (owner: "ok push gitap"), fast-forward, no force. Every later push needs his approval again. W1 of `docs/WASTAGE_EXPIRY_PLAN_2026-11-10.md` was then built (see above). His order of the
inventory work is now Prompt 1 Wastage & Expiry (W1–W5), Prompt 2 Stock Counts, Prompt 3 Reports; IM2–IM5 of the audit wait.

**Wastage & Expiry audit and plan shown 2026-11-10 (owner's Prompt 1 of `LALA_Inventory_Three_Detailed_Prompts-1.md`), waiting for his approval.
Nothing built.** Plan: `docs/WASTAGE_EXPIRY_PLAN_2026-11-10.md` — what exists (placeholder tab; one expiry date per ingredient; no WASTE movement; order-food
waste in a separate `foodWaste` list only shown on Available Food), what is missing, screens, stock and cost rules, lots and expiry, permissions, steps
**W0–W5** and 6 decisions. **W0:** the IM1 work (movement cost, needed here) is uncommitted in worktree `restaurant-software-deploy-1b7e21`. Owner:
"Approve, W0 karo" — its regression run is done (all 25 older walkthroughs, `:im1`, customer, rider pass; `:inventory` and `:recipes` timed out once and
passed when run again). Then ("Approve, main par lao") IM1 was committed and both branches joined on `main`: W0 is done. Prompt 2 (Stock
Counts) and Prompt 3 (Reports) come after, each with its own audit.

**POS Find customer in the title row, built 2026-11-10 (DEMO), approved ("Approve, commit karo") and committed on branch `claude/sleepy-shamir-5e83b0`, on `main`, pushed 2026-11-11** (owner: "table search can remove,
his place customer search"). The box beside Running bills now finds a customer by name or phone (from 2 letters, earlier customers from the orders) and puts
them on the bill; a bill with unsent items asks to send or hold first. Then (his second picture) a takeaway bill has no customer box: one line
"Customer: name · phone" with ×; nobody found → add a new customer in the search (name, phone optional); on phones too. Delivery keeps name, phone,
address. `screens/pos/customer-search.tsx`, `current-bill.tsx`. Tests: typecheck, lint, `walkthrough:pos`, `walkthrough`, `:online`, `:sub-orders`,
`:sizes`, `:refunds` pass on port 3010. **Open:** his customer khata (regular customers buy on credit, pay later) — plan first, needs his approval.

**Searches swap places, built 2026-11-10 (DEMO), approved ("Approve, commit karo") and committed on branch `claude/sleepy-shamir-5e83b0`, on `main`, pushed 2026-11-11.** His two
screenshots: "CHICKEN" in the header found no orders, and the small POS box was the menu search. Now the header finds menu items (on the POS as he types;
Enter on another screen opens the POS) and the POS title-row box finds orders (number, table, customer → Orders). Phone: the header has no search, so the
POS box stays the menu search. Someone with Orders but no POS keeps the old header order search. `src/lib/menu-search.ts`, `header.tsx`, `pos-screen.tsx`,
`walkthrough:pos` (new last step). Also `.claude/launch.json` `restaurant-os-3010`: another worktree's server held port 3000. Tests: typecheck, lint,
`walkthrough:pos`, `walkthrough`, `:online` pass on port 3010. 

**IM1 (Stabilise) built 2026-11-10 (DEMO), approved after the full regression run ("Approve, main par lao"), committed (`98255ac`) and pushed to GitHub `main` on 2026-11-11 (owner: "push").** Owner: "Approve, IM1 karo". What changed, bug by bug: `docs/INVENTORY_AUDIT_2026-11-10.md` §8
(B1 Cook refused until the dish is linked with Sell on POS, B2 stock bought after a passed expiry date is usable, B3 one business day, B4 / B5 texts and one
`postPurchase`, B6 plan row by quantity, B9 toasts, B10 `StockMovement.cost`). B7 waits for IM4, B8 for IM2, lots for IM7. New: `planLeft`, `takesRawTwice`,
`usableMilli` third argument (`cooking.ts`), `lineCosts` (`suppliers.ts`), `PreparedRow.rawTwice`, `CookingPlanView` rows `cookedMilli` / `leftMilli`,
`walkthrough:im1`. No data version change. His own browser data was not changed: his cooked dishes are still not linked, so Cook shows the red
message until he links each one. IM2 (compact UI, raw / planned / cooked labels, recipe kinds) waits: he chose Wastage & Expiry first.

**Inventory & Suppliers audit and improvement plan shown 2026-11-10 (owner then approved IM1).** His video (`123.mp4`,
7 minutes of the Inventory screens) and two briefs (workflow audit, compact UI, purchasing, daily plan modes, auto posting, recipe kinds, Available
Food; then Wastage, Expiry, Stock Count, Reports, cleaner Overview). Full audit: `docs/INVENTORY_AUDIT_2026-11-10.md` — the six flows traced, the
stock trigger per product type, 10 bugs read from the code (B1 raw stock taken twice when a cooked dish is not linked to its menu product, B2 one
expiry date per ingredient blocks fresh stock, B3 three different "today", B4 / B5 stale texts and the unused `receiveStock` path, B6 a plan row
"cooked" after any batch, B7 a shared raw ingredient given in full to every dish, B8 Sell on POS defaults, B9 stacked toasts, B10 no cost on a
movement), what is missing, DEMO limits against production, the compact UI and the plan **IM1–IM9** (IM1 stabilise, IM2 compact UI, IM3 purchasing
+ returns, IM4 daily plan, IM5 auto posting, IM6 Stock Count + Wastage, IM7 lot expiry, IM8 Reports + Overview, IM9 full check). It replaces the
open steps I5–I7 and Suppliers S2. Five owner decisions are still open (§9 of the audit, #2–#6; #2 changes the approved "3 safe hours" default). Checked with
`pnpm test` (189 pass); walkthroughs not run for the audit; no bug reproduced by clicking.

**On GitHub since 2026-11-10 (owner: "Haan, push karo").** Private repository `liaqatalimasood215-prog/Restaurant-saas-platform`, remote `origin`,
branch `main` at `d026d93` then this docs update (375 files, 98 commits, placeholder email only). Before the push: read-only audit 2026-11-09 — no
secrets in files or history; `backend/api` drafts kept (owner: "Keep them as they are"); the GitHub repository was empty. Not on GitHub, still only on
this computer: the other `claude/*` branches (all contained in `main`), the old stash, the unfinished Suppliers S2 rules in worktree
`restaurant-software-setup-1ed6fb` (left untouched on purpose) and leftovers in `restaurant-software-setup-92cf0c` / `restaurant-website-chat-699380`
(their useful parts are now in `main`). Next GitHub step only with his approval: push new work on `main` (no force push).

**Bug run + phone fixes 2026-11-09 (owner approved the fixes, the commit "Yes, commit" and the push), commit `d026d93`.** Five bug fixes and the unsaved
phone fixes of worktree `restaurant-software-setup-92cf0c` (README progress log 2026-11-09); all tests pass (§7). The toast move (top centre on every
size) is visible to him: easy to change back. Not verified: a real phone.

**I4 ("Step 14") sales take stock at the kitchen's READY, with Available Prepared Food, built and approved 2026-11-09 (DEMO), committed locally (`3770ae3`), not pushed.** Shared `packages/shared/src/sales-stock.ts` (`saleUses`, `saleParts`, `netTaken`, `ItemStock`, `newItemStock`, `givenPortions`, `ReuseSetting` / `defaultReuse` / `reuseOf`, `AvailableFood`, `availableState`, `checkGive`, `sameOrderDish`, `outcomeChoices`, `checkOutcome`, `FoodWaste`, `WASTE_REASONS`, `closingReviewDue`; 11 unit tests); movements `SALE_USE`, `SALE_RETURN` with `orderId` / `orderItemId`; `OrderItem.stock` (new lines only: older lines never take stock), `KitchenTicket.cancelDecision`, `MenuItem.reuse`; `DemoInventory.availableFood`, `foodWaste`, `closingTime` (optional, no data version change). Server: stock at Ready / auto-ready send / dine-in paid before Ready, returned on kitchen Undo; `voidItem` and `cancelOrder` take each made line's outcome; `getMadeFood`, `giveAvailableFood`, `decideCancelledTicket`, `getAvailableFood`, `closeAvailableFood`, `saveClosingTime`; notifications `COOKED_NEGATIVE`, `FOOD_REVIEW`. Screens: `components/food-outcome.tsx` in the waiter's Void box and the new `online-orders/cancel-order-dialog.tsx`; KDS "Ready: from #n — Give this" with a safety check and cancelled tickets with Finish & keep / Stop; POS "n ready" badge; Stock → Available Food (`available-food-tab.tsx`, closing review, `/inventory?food=review`); Overview cards "Sold today, not tracked" and "Ready food for another order"; Menu item "If cancelled after Ready: give to another order" + safe hours + overnight; Settings closing time; each line's stock on the Orders detail. Tests: 189 unit; new `walkthrough:sales-stock` (karahi 1 kg: 0 at Send, the recipe once at Ready, Undo back, Ready again once; cancel after Ready → the box, safety tick, Available Food, no wastage; POS "1 ready"; "Give this" → Ready at once, 0 raw; a second tablet cannot give it again; another karahi made from raw once; served T3 karahi voided → only Wastage, with reason; naan takes naan dough (prepared, below zero → alert), never its atta; 23:05 closing review → wasted "Time over"; closing time 22:30; Menu switch 3 h; phone); 23 other walkthroughs pass (walkthrough, :online, :pos, :tables, :staff, :menu, :settings, :online-app, :kds, :integration, :cooked, :cooking, :recipes, :suppliers, :inventory, :units, :supplier-order, :auto-scale, :sizes, :sub-orders, :refunds, :connected, :riders). Added at his request: a paid karahi, made, then fully refunded → 0 new stock movements, every ingredient unchanged; cancelled while cooking → KDS "CANCELLED while cooking" → Finish & keep (raw once, Available Food), Stop + spoilt (wastage with reason, raw once, never reused), Stop (nothing taken, no wastage). DEMO limit: two tablets that tap in the very same moment, before the browser sync arrives, could both act; the walkthrough waits for the sync, and the real backend (Phase 4) checks it in one database transaction. **Next after his approval: I5** (wastage of raw and prepared stock, expiry).

**I3 Cooking Batch, cooked stock and the stock check before cooking built and approved 2026-11-09 (DEMO), committed locally (`8f6f79f`), not pushed.** Shared `packages/shared/src/cooking.ts` (`batchPlan`, `stockNeeds`, `usableMilli`, `costPer`, `platesOf`, `checkBatch`, `planOf`, `planUses`, `dueChecks`, `localClock`; 5 unit tests); movements `COOK_USE`, `COOKED` with `batchId`; Ingredient `plateMilli`; `DemoInventory.cookingBatches`, `cookingPlan`, `cookingChecks` (optional, no data version change). ApiClient `recordCookingBatch`, `correctCookingBatch`, `reverseCookingBatch`, `getCookingPlan`, `saveCookingPlan`, `draftShortageBills`, `saveCookingChecks`; notification `COOKING_SHORTAGE` (Owner / Manager, at the check times). Screens `recipes/cooking-dialog.tsx` (Cook, batch list, Correct / Reverse), `cooking-plan-tab.tsx` (Stock → Cooking Plan; `/inventory?cooking=<date>`), cooked stock on `cooked-card.tsx`, Overview card, Stock list "Cooked food", `settings/cooking-checks.tsx`, SuppliersTab `openBill`. Tests: 178 unit; new `walkthrough:cooking` (purchase 5 kg → cook 5 kg = recipe × 5, actual 50 plates, Rs. 89.56 a plate; double tap; short refused; correct + reverse; movements; tomorrow 20 kg short; 20:00 alert to the Owner not the Cashier; draft bills, stock unchanged; saved bill → no longer short; check time 21:00; phone); `:cooked`, `:recipes`, `:suppliers`, `:inventory`, `:units`, `:supplier-order`, `:integration`, `:kds`, `:settings`, `walkthrough`, `:pos`, `:auto-scale` pass. **Next after his approval: I4** (sales take stock at kitchen READY: cooked-to-order by the verified recipe, sold-from-a-dish from cooked stock by the size portion; void / cancel / refund rules; never twice).


**KDS v2 (pickup workflow, smaller cards, full screen) built 2026-11-09 (DEMO), approved ("Approve, commit karo"), committed locally (`93114fd`), not pushed.** Ready → Picked up (waiter phone: `screens/waiter/pickup-controls.tsx` in the Service Waiter screen and sent rounds; rider / counter order steps count) → Served, three steps; `pickUpTicket`, `undoPickup` in the ApiClient; KDS keeps a picked-up card 5 minutes with Undo, then hides (`ticketPickup`, `kdsState`, `waitingTooLong`, `checkPickup`, `checkUndoPickup` in `kitchen.ts`); 10-minute warning on the card and one reminder notification (`FOOD_READY.reminder`, the bell looks again every 30 s); Ready alerts go to the Service Waiter and the Super Waiter. Cards ~30 % lower (11 whole tickets on 1280 × 800, 9 on 1024 × 600); full screen toggles, hides the shell (`kds-chrome` in `app-shell.tsx`, `globals.css`), tries landscape lock, explains refusals. Tests: 173 unit; `:kds` (10 checks incl. clock +5 min hide on a fresh load, +10 min warning and reminder, history kept), `walkthrough`, `:pos`, `:online`, `:sizes`, `:sub-orders`, `:connected`, `:riders`, `:integration`, `:tables`, `:staff` pass.

**Kitchen / KDS redesign for a budget landscape tablet built 2026-11-08 (DEMO, UI only), approved 2026-11-09, committed (`93114fd`).** His picture and brief: red title bar, station chips, coloured columns, compact cards (`screens/kitchen/kitchen-screen.tsx`, `ticket-card.tsx`: size chip, ×qty, notes, 96 × 48 px Start / Ready, progress bar, "+ n more", `data-kds-ticket`, `data-kds-order`, `data-kds-line`). Statuses, Undo, sound, out of stock unchanged; no Served button and no Wi-Fi icon (see decision log). New `walkthrough:kds` (10 POS orders: 10 whole tickets on 1280 × 800, 6 on 1024 × 600, long ticket opens, phone). Kitchen text checks of `walkthrough`, `:pos`, `:online`, `:sizes`, `:connected` follow the new card; those plus `:integration`, `:riders` pass.

**Integration I2 (order lines keep ids and recipe versions) built 2026-11-08 (DEMO), approved 2026-11-09, committed (`93114fd`).** New order lines (POS, Waiter, counter, online; all through `priceDraft`) keep `variantId`, `modifierIds` and `recipeVersions` (verified version per part, `lineRecipeTargets` in `recipes.ts`; missing = Not tracked); old lines have none. Kitchen ticket: "Total <dish>: 1.5 kg" when one dish is in two or more lines (`dishTotals` in `size-mix.ts`, `screens/kitchen/ticket-card.tsx`). Tests: 172 unit; `:integration` (I2 part: 1 kg + makhan + note, ½ kg + note, Mutton draft = Not tracked, kitchen total), `walkthrough`, `:pos`, `:sizes`, `:online`, `:sub-orders`, `:refunds`, `:tables` pass. Next after his approval: I3 cooked stock + Cooking Batch.

**Integration I1 (one product, made once) built 2026-11-08 (DEMO) and approved ("Approve, commit karo"), committed locally (`e31137c`), not pushed.** His brief ("Complete Module Integration, Automatic Recipe Scaling, Inventory & Cooking Automation"): audit shown, plan I1–I7 and 5 decisions approved ("Approve, I1 karo"; decisions in `PROJECT_RULES.md` §20). Work happens in the chat worktree `.claude/worktrees/restroom-software-setup-930ebb`, branch `claude/restroom-software-setup-930ebb`, fast-forwarded to the P3 commit `16dc106` of `claude/loving-hawking-2833df` (local only). Chicken Biryani root cause: Prepared Items → Add Recipe makes only an inventory item (`kind: 'PREPARED'`, `recipe-builder.tsx` `saveIngredient`), and the POS lists only menu products (`getMenu`); no field linked the two. Built: `MenuItem.preparedItemId`; `ApiClient.sellPreparedItem` (one step: link the same dish or make the product once with category / new category, station, sizes, prices; each size's recipe = `portionLines` of the dish, verified, a new version when it changed; Auto Scale turned off for a linked product); `dishKey` / `sameDish` / `menuNameFor` (`menu.ts`), `guessPortionMilli` (Full plate 250 g, Half plate 125 g, packing 500 / 250 g, weights by name) and `portionLines` (`recipes.ts`); screens `recipes/sell-dialog.tsx`, POS line on every prepared card ("On POS: … / Sell on POS"), the question after a new prepared recipe, Recipes → Menu items → Add Recipe with a menu-product list, Menu rows with recipe state + "From …" + Recipe (`/inventory?recipe=<id>` opens the builder), "Add recipe now" banner after Add Item, one name once in the whole Menu. His own browser data was not changed (the walkthroughs use their own browser). His feedback the same day (screenshots, Daal Chana): when linking, the sizes, prices and portions are editable in the same table as a new product (add Half plate, Rs. 150 / Rs. 100) and go to the Menu in the same step; fixed a bug where the first typed price of a linked row was lost (unstable row keys). `walkthrough:integration` covers his Daal Chana case. Then (his request) quick size buttons Full plate, Half plate, 1 kg, ½ kg, Pao (250 g) and "Other size (e.g. 300 g)"; a size named by its weight fills its portion (300 g → 300) unless typed by hand; checked with Daal Makhni 1 kg / ½ kg / 300 g and 1 kg + ½ kg = one 1.5 kg POS line. Then (his request) plate and packing sizes mix like weights on the POS and Waiter Orders: Full plate + Half plate = one line "Full plate + Half plate" (`isPlateSize`, `canMixSizes`, `sizeMixFor` in `size-mix.ts`; 170 unit tests); Small / Medium / Large stay one at a time. **Next, each after his approval:** I2 order lines keep size id, add-on ids and recipe version (+ kitchen total for separate lines of one dish); I3 cooked stock + Cooking Batch (expected vs actual output, raw out once, cooked in); I4 sales take stock at kitchen READY (cooked-to-order: raw by the verified recipe; sold from a cooked dish: from its cooked stock; void / cancel / refund rules; never twice); I5 wastage raw and prepared; I6 Auto Cooking ON / OFF per dish (planned batch from a purchase, shared raw split, DEMO only while a tab is open); I7 full check. Still open from P4: Full / Half Packing and a custom weight on the POS.

**Cooked food P3 (every purchase its own recipe) built 2026-11-08 (DEMO) and approved ("Approve, commit karo").** His requirement: recipe saved once (1 kg = Rs. 800); each supplier purchase of the main raw ingredient gets its own recipe (5 kg → Rs. 4,000, a separate 8 kg → Rs. 6,400), apart from the total raw stock. Built: preview in the bill, summary card after saving (until Done), Purchases on each cooked card, Recent purchases (last 5). `inventory.purchaseRecipes` (optional, no data version change) saved per bill and per receive; bills from before P3 worked out live ("today’s prices"). Next only after his approval: P4.

**Cooked food P2 (Prepared Items design) built 2026-11-08 (DEMO) from his picture and approved ("Approve, commit karo").** Also (his request, confirmed): Recipes opens on the overview (4 food-cost cards + Menu items / Add-ons / Prepared items); a tapped group takes the whole screen (Inventory title, tabs and cards step aside, no scrolling) with a bar "← Recipes" + the three groups; the group stays open after a recipe closes; the other Inventory tabs come back after "← Recipes". His picture: red title bar "Prepared Items (Recipes)" with Add Recipe; four summary cards All Recipes / In Stock / Not Enough / Out of Stock; chips with counts (+ Dough & sauces kept), search by dish or raw ingredient, a cards / list button; compact cards 3 per row from 1024 px (dish on a round plate, name + green tick when verified or Draft, pill In Stock / Not Enough / Out of Stock, chevron, Raw Stock (with * and "Uses: … (Shared)" when shared, footnote "counted once"), Recipe Cost, small Ingredients and Edit). "Recipe for 1 kg …" moved into the opened ingredients. Real data only; emoji instead of photos (Phase 7). First version of the same day (bigger cards) replaced: New card shell for every prepared item (`recipes/cooked-card.tsx`): food picture on soft red, name, "Recipe for …", recipe status, a stock pill (Enough in stock / Not enough in stock / Out of Stock), two tiles (main ingredient in stock, estimated cost in soft red), Short and shared notes, "Show ingredients" and "Edit" side by side; dough and sauces get the same shell (One batch, Cost of 1 kg). Filter chips with counts: All, In stock, Not enough, Out of Stock, Dough & sauces. Latest purchase as a card. Functions unchanged. `walkthrough:cooked` adds the filter checks.

**Cooked food P1 changed 2026-11-08 at his request and approved ("Approve, commit karo"), DEMO.** Next only after his approval: P2, P3, P4 (see below). The recipe follows the actual raw stock of its main ingredient (`stockPlan`): bill 5 kg → recipe for 5 kg, 2 kg more → 7 kg; 0 → Out of Stock, the saved recipe stays. Prepared items cards (`recipes/cooked-card.tsx`): stock, estimated cost, Not enough in stock, shared main ingredient, Show ingredients, Latest purchase strip. Builder: "Recipe for your stock" + Try another amount. A saved bill toasts "Recipes updated". No plates or yield shown for now. Buying is never cooking. `walkthrough:cooked` follows his example. **Earlier the same day (replaced in part):** Cooked food P1 (recipe once, any amount) built 2026-11-07 (DEMO). His brief "Automatic Recipe Scaling & Purchase-Based Prepared Items"; plan P1–P4 approved with five decisions (PROJECT_RULES.md §20). P1: a prepared item names its main raw ingredient (one of its lines, whose quantity is what the recipe is for); the Recipe Builder shows "Recipe for", "Makes (estimate)", plates at 250 g, and the panel "Any amount, same recipe" (1 / 2 / 5 / 10 kg or typed: lines in kg / L, cost, yield; read only, nothing saved or taken from stock). 8 sample cooked dishes and raw daal masoor, kali daal, beef qeema; data version 22 (`addCookedFood` in `lala-seed.ts`). Rules `scaleBatch`, `platesIn` in `packages/shared/src/recipes.ts`; screens `recipe-builder.tsx` (`CookAnyAmount`), `recipes-tab.tsx`; `walkthrough:cooked`. **Next, each after his approval:** P2 smart Prepared Items cards (raw stock on hand, scaled ingredients, estimated cost and yield, shared ingredients counted once, Option A/B), P3 purchase bill → recipe update summary (no khata or extra stock change), P4 POS sizes Full / Half Plate, Full / Half Packing, custom weight, sales per type, Option B estimated remaining. **Wastage & Expiry (W1–W5) is on hold** by the owner.

**Mixed sizes on one line built and approved 2026-11-07 ("Approve, commit karo"), DEMO.** Owner's brief: "dedh kg" Chicken Karahi = tap 1 kg and ½ kg in the same box. Two or more weight sizes = one line "1.5 kg: 1 kg + ½ kg", price = sum of the size prices, one kitchen line (one pot); add-ons and the note go on that line once. Rules `packages/shared/src/size-mix.ts`; box `screens/waiter/item-dialog.tsx` (POS, Waiter Orders, counter order); `walkthrough:sizes`. Open: inventory phase 2 must take stock per size from `OrderItem.sizeMix`; per-size add-ons (makhan on only one size) not built — ask him if needed.

**Multiple purchase units built 2026-11-07 (DEMO), waiting for his review.** Rules in `packages/shared/src/inventory.ts` (`Packing`, `PACKING_KINDS`, `buyOptions`, `findBuyOption`, `buyAmount`, `buyStockMilli`, `checkPackings`; Ingredient `packings`, `loosePrice`; units `tray`, `dozen`) and `suppliers.ts` (bill lines with `unitKey`, ReceiptLine `unit` / `unitSizeMilli` / `rateDivisor`, `averageMainPrice`, `supplierRateKey`). Screens: `packings-editor.tsx` (Add / Edit Product and the Stock form), bill rows in `purchase-bill.tsx`; the bill hides the Inventory header (`onFocus`). Data version 21 (`addDemoPackings`, eggs; old bill lines get their unit). `walkthrough:units`. Not built: choosing which packing is the main one apart from the main-unit fields.

**Edit Product built 2026-11-06 (DEMO), waiting for his review:** ✏️ on product cards (supplier screen and bill) → `ProductScreen` in `purchase-bill.tsx` (also Add New Product); ApiClient `updateSupplierProduct`, `removeSupplierProduct`.

**New Purchase (Bill) + Add New Product built 2026-11-06 (DEMO), waiting for his review.** `screens/inventory/purchase-bill.tsx` (bill, product tiles, Add New Product, print); ApiClient `savePurchaseBill`, `get/save/deletePurchaseDraft`, `addSupplierProduct`; rules `billTotals`, `discountFromPercent`, `checkPurchaseBill`, `similarIngredients` in `packages/shared/src/suppliers.ts`; KhataEntry `billNo`, `discount`, `billId`; Supplier `rates`; `inventory.purchaseDrafts` (optional, no data version change). The supplier screen's product tiles open the bill; per-card Receive is gone (`receiveStock` stays in the API). Not built: unit switching on a bill line (bag ↔ kg), product photos (Phase 7), returns (S2).

**Supplier full screen built 2026-11-06 (DEMO), waiting for his review:** the list is a card grid; a tap opens one supplier on the whole screen (← All suppliers) with his products as picture cards, a search, most delivered in 30 days first (`deliveriesPerProduct`, `sortByUse` in `packages/shared/src/suppliers.ts`; `deliveries30d` on each product row). Walkthroughs open a supplier through `backToList` first.

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

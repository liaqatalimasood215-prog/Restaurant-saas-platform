# PROJECT_RULES.md — Lala Restaurant OS

> **Khulasa (Roman Urdu):** Yeh file project ka "qanoon" hai. Is mein likha hai ke kaam kaise karna
> hai, kaun se rules kabhi nahi todne, aur kis tarteeb mein banana hai. Kya banana hai (features ki
> poori tafseel) `docs/MASTER_PROMPT.md` mein hai.
>
> - Teen alag apps, lekin ek backend, ek database, ek order system aur ek pricing engine.
> - Nayi tarteeb **"pehle design"** hai: Restaurant OS ka design → aap approve karein → Customer
>   App ka design → approve → Rider App ka design → approve → phir asli backend aur database →
>   live sync → security aur pilot.
> - Jo cheez asli nahi, us pe saaf label lagega: **DEMO / PROTOTYPE**. Koi jhoota "ho gaya" nahi.

**Version:** 2.1 · **Last updated:** 2026-10-27 · **Owner:** Liaqat Ali

---

## 1. Documents — what to read and which one wins

| Document | Purpose |
|---|---|
| `CLAUDE.md` | Short entry point that Claude Code loads automatically in every session |
| `PROJECT_RULES.md` (this file) | How we work: non-negotiable rules, development order, statuses, decision log |
| `docs/MASTER_PROMPT.md` | What we build: features, workflows, order engine, money, data model, acceptance tests |
| `docs/AI_MANAGER_PLAN.md` | AI Restaurant Manager design (Phase 10) |
| `README.md` | Current status of every feature and the progress log |

- Process, development order and statuses: **this file wins**. Features and technical details:
  **MASTER_PROMPT.md**.
- If two documents disagree, the newest owner decision in the decision log (§20) wins. Fix the
  other document in the same change and record it. Never silently overwrite an owner decision.
- A new idea is added to MASTER_PROMPT.md with its phase (after the owner agrees), then built.

## 2. What we are building

- **Lala Restaurant OS** — three separate real applications on one platform:
  1. **Restaurant OS** — `apps/restaurant-os`
  2. **Customer Online App** — `apps/customer`
  3. **Rider App** — `apps/rider`
  4. Platform Admin — `apps/admin` (Phase 9)
- All of them use ONE shared backend, ONE PostgreSQL database, ONE order system and ONE trusted
  pricing engine.
- The first working product is for the owner's own restaurant. Multi-restaurant subscriptions and
  commercial billing come later, but the code is SaaS-ready from day one (§6).
- It is not a Foodpanda-style marketplace.
- **Most important rule:** never sacrifice architecture to make the UI look complete, and never
  present a prototype as working software.

## 3. Repository structure

```
restaurant-saas-platform/        (repository folder of Lala Restaurant OS)
├── CLAUDE.md
├── PROJECT_RULES.md
├── README.md                    feature status table + progress log
├── apps/
│   ├── restaurant-os/           Next.js — staff software, role-based: Tables, Waiter, Kitchen
│   │                            Display, Cashier/POS, Orders, Menu, Online App + Riders panels …
│   ├── customer/                Next.js PWA — the real customer app (one deployment, all restaurants)
│   ├── rider/                   Next.js PWA — the real rider app (one deployment, all restaurants)
│   └── admin/                   Next.js — Platform Admin (Phase 9)
├── backend/api/                 NestJS + Prisma + Socket.IO — the only backend
├── packages/shared/             statuses, transitions, roles, money/pricing functions,
│                                real-time names, shared types
└── docs/                        MASTER_PROMPT.md, AI_MANAGER_PLAN.md
```

Development ports: restaurant-os `3000`, customer `3001`, rider `3002`, api `4000`.

### Management and preview sections inside Restaurant OS

| Page in Restaurant OS | What it does | Separate real app |
|---|---|---|
| Online App | Product online ON/OFF, online orders ON/OFF, link, QR code, **live preview of the Customer App**, **Open Full App** button | `apps/customer` |
| Riders | Add/disable riders, assignments, cash to settle, **preview of the Rider App**, **Open Full App** button | `apps/rider` |

These pages manage and preview the real apps; they never replace them. The real apps stay separate
and are deployed separately. Until an app exists (Customer App: Phase 2, Rider App: Phase 3), its
preview and its Open Full App button are clearly labelled PLACEHOLDERS.

### Restaurant OS navigation (owner, 2026-10-27)

- The left sidebar stays visible on tablet and desktop. Each sidebar feature opens its own screen;
  the main workspace shows only the selected feature. Phones use a bottom navigation bar with the
  same sections.
- Sidebar order, most-used first (owner, after Preview 1): POS / New Bill, Tables, Orders, Online
  Orders, Waiter Orders, Kitchen / KDS, Menu, Online App, Riders, Staff, Today's Summary, Settings —
  then a "Coming Soon" group (Dashboard and the later modules) marked PLACEHOLDER.
- No long DEMO notice strip. DEMO stays visible through the badge next to every screen title
  (DEMO / PROTOTYPE or PLACEHOLDER), the DEMO label on the role switcher and the restaurant name
  "Aziz Pizza — DEMO" in the header.
- POS / New Bill is the default home for Owner and Manager (owner, 2026-10-28; Cashier → POS,
  Waiter → Tables, Kitchen → Kitchen / KDS).
- The owner's design pictures are a visual reference (colours, cards, spacing, navigation) and show
  the future product vision. They never expand the current phase.

## 4. Technology (approved)

| Part | Choice |
|---|---|
| Frontend | Next.js + TypeScript (Tailwind CSS) |
| Backend | Node.js + NestJS |
| Database | PostgreSQL hosted on Supabase (used as a database only) |
| ORM / migrations | Prisma |
| Real-time | Socket.IO |
| Monorepo | pnpm workspaces + Turborepo |
| Code | Private GitHub repository |
| Frontend deploy | Vercel (one project per app) |
| Backend deploy | Railway (long-running server, needed for Socket.IO) |
| Customer and Rider apps | PWA first; native apps later |
| Files and images | Object storage with versioning (Phase 7) |

- Login, permissions and real-time are handled by our NestJS backend, not by Supabase services, so
  security has one source of truth.
- Do not change a technology unless inspection shows a serious problem. Then explain the problem
  and ask the owner first.

## 5. One backend, one database, one order system, one pricing engine

- All apps talk only to `backend/api`. No app connects to the database directly.
- No second database, no second order system, no per-app copies of orders.
- One order record travels from start to finish and has the same id in every app.
- **Trusted pricing engine:** the backend calculates every price, discount, service charge, tax,
  total and refund with the functions in `packages/shared`. Numbers from the browser are for
  display only and are ignored by the server. Prototypes use the same shared functions, so demo
  totals match the real ones.
- The database is the source of truth. Real-time events only tell screens to reload data from the
  API.

## 6. Multi-restaurant data isolation (SaaS-ready from day one)

- Every business table has `restaurant_id`; branch-level tables (and their child tables) also have
  `branch_id`. All ids are UUIDs.
- The staff login token carries user id, role, `restaurant_id` and allowed branch(es). The server
  takes `restaurant_id`/`branch_id` from the token, **never from the request body or URL**.
- Every staff query is filtered by the user's restaurant (and branch). A record of another
  restaurant is answered with "not found".
- Automated tests prove that Restaurant A can never read or change Restaurant B's data, through
  the API or a real-time room.
- One Customer App deployment and one Rider App deployment serve every restaurant:
  `<domain>/<restaurant-slug>/<branch-slug>`. Custom domains later. Never design code that needs a
  new app published per restaurant.
- Optional second layer later: PostgreSQL Row Level Security.

## 7. Roles and permissions

- Roles: **OWNER, MANAGER, CASHIER, WAITER (Super Waiter), SERVICE_WAITER (Service Waiter), KITCHEN,
  RIDER**. Full permission matrix: MASTER_PROMPT.md §4. The Service Waiter serves food on assigned
  tables and calls the cashier; it never creates or changes orders, prices, discounts, payments,
  refunds or voids (owner, 2026-10-28).
- The Owner works across all branches; everyone else belongs to one branch.
- Each role sees only its own sections in Restaurant OS.
- Riders can use only the Rider App; staff can use only Restaurant OS.
- A disabled user cannot log in, and existing sessions stop working immediately (checked on every
  request).
- Platform admins are a separate type of user (Phase 9).

## 8. Orders and money — non-negotiable rules

Details: MASTER_PROMPT.md §6 (order engine) and §8 (money).

- Order types: DINE_IN, DELIVERY, TAKEAWAY. Only the status changes listed in MASTER_PROMPT.md §6
  are allowed; the server rejects everything else.
- Dine-in supports multiple rounds; items are split into kitchen tickets per station.
- Every change runs in one database transaction and writes a history row (who, when, from, to,
  reason). The current status is checked first, so two people cannot do the same step twice.
- **Idempotency keys** on Send to kitchen, Place order, Record payment, Refund and Assign rider:
  double taps and retries never create duplicates.
- **Historical snapshots:** order items keep the name, size, add-ons and prices at order time. Menu
  changes never change old orders or bills.
- Money is stored as whole numbers in **paisa** (Rs. 1 = 100 paisa).
- Payments, refunds and reversals are never edited or deleted. A correction is a new entry with a
  reason, made by the Owner or Manager. Tips are recorded separately from sales.
- The audit log records voids, discounts, payments, refunds, reversals, reprints, cancellations,
  settings changes and staff changes.
- First version: payments are **recorded**, not processed online (cash, card on an external
  machine, wallet transfer; Cash on Delivery / pay at pickup for online orders).
- Two money systems stay completely separate: customer food payments (customer → restaurant) and
  subscription billing (restaurant → platform).
- Delivery: the rider is assigned after READY; "Picked up – On the way" is one status
  (OUT_FOR_DELIVERY) in the first version; customer tracking shows order status only (no GPS map).

## 9. Real-time

- Rooms per branch, kitchen station, waiter, rider, tracking link and public menu (MASTER_PROMPT.md
  §6.7). The server checks permission before any connection joins a room.
- Updates appear on other screens within 2 seconds; after reconnecting, screens reload their data.
- Related features are always built on both sides:

| Restaurant OS action | Must show in |
|---|---|
| Menu data | Customer App uses the same menu |
| Product Online ON/OFF | Customer App shows or hides the product |
| Online orders ON/OFF | Customer App allows or blocks checkout (the server also blocks) |
| Assign rider | Rider App receives the order |
| Kitchen marks Ready | Waiter, Cashier and customer tracking |
| Rider marks On the way / Delivered | Restaurant OS, Rider App and customer tracking |

- Real-time is reported as REAL / VERIFIED only after Phase 5. Any screen-to-screen sync in the UI
  phases is DEMO.

## 10. Security and login

- Restaurant, branch and role checks on the server for every API call and every real-time room.
- Staff and riders log in with phone + password (hashed with bcrypt or argon2); login is
  rate-limited. A per-user `token_version` logs a disabled user out everywhere.
- Staff accounts start with a single-use, expiring activation link; the person creates their own PIN.
  PIN unlock only on an enrolled, verified device; PINs hashed; failed attempts limited. A PIN is never
  sent, shown or logged (MASTER_PROMPT.md §10.3).
- Input validation on every endpoint; safe error messages; rate limits on login, order placement
  and tracking.
- Customer tracking links use long random tokens.
- HTTPS only. Two-step verification for owners (Phase 7) and platform admins (Phase 9).

## 11. Data storage, email and backups

- All restaurant data (orders, customers, payments, menu, staff …) is stored **only in the
  database**. Email is used only for password reset, verification, invoices, subscription
  reminders and security alerts.
- Automatic daily database backups from the host, plus a **separate encrypted copy** in a different
  place (scheduled `pg_dump`, kept at least 30 days).
- Restoring a backup is tested regularly — an untested backup is not a backup. Point-in-time
  recovery later.
- Images and files: separate storage with versioning and its own backup.
- Development, staging and production use **different databases**. Never test on production data.

## 12. Secrets and source code

- Source code lives in a **private GitHub repository**.
- Passwords, API keys and database URLs are never written in code or committed. Use environment
  variables; `.env` files are git-ignored; `.env.example` (placeholders only) is committed.
- Production secrets live in the Vercel / Railway / Supabase settings.
- Never print secrets in logs. If a secret leaks, change it immediately.
- Demo and seed passwords are for local development only.

## 13. Database changes

- The production database is never edited by hand.
- All schema changes go through **Prisma migrations** (`prisma migrate dev` locally,
  `prisma migrate deploy` in production). No `prisma db push` on production.
- Before an important migration: test on a non-production database and verify a fresh backup.
- Risky changes (removing or renaming columns) are done in two safe steps.
- With Supabase: pooled `DATABASE_URL` for the app, direct `DIRECT_URL` for migrations.

## 14. Deploy — one repo, separate apps

| Change in | Deploy |
|---|---|
| `apps/restaurant-os` | Restaurant OS only |
| `apps/customer` | Customer App only |
| `apps/rider` | Rider App only |
| `apps/admin` | Admin only |
| `backend/api` | Backend only |
| `packages/shared` | Test and deploy every app that uses it |

- Each frontend is its own Vercel project; Turborepo skips apps that did not change.
- Railway deploys the backend only when `backend/api` or `packages/shared` change.
- GitHub Actions runs type checks and tests before anything is merged or deployed.
- Migrations run during the backend deploy, never by hand.

## 15. Development order — UI first (approved by the owner on 2026-10-26)

| Phase | Work | Result | Gate before the next phase |
|---|---|---|---|
| 0 | Foundation and documents | Rules, master prompt, AI plan, shared rules (tested), schema draft | Owner approves these documents |
| 1 | **Restaurant OS UI** | Clickable prototype of all pilot screens with DEMO data | Owner reviews the preview and approves |
| 2 | **Customer App UI** | Prototype: menu → cart → checkout → tracking | Owner approves |
| 3 | **Rider App UI** | Prototype: login → deliveries → on the way → delivered | Owner approves |
| 4 | **Backend + database integration** | NestJS, Prisma, login, roles, isolation, order and pricing engines; screens switched from demo data to the real API — dine-in first, then online orders and riders | Acceptance tests A–E pass for data, money and permissions |
| 5 | **Real-time synchronisation** | Socket.IO; every screen updates live across devices | Tests A–E pass with several users at once |
| 6 | **Security, reliability, offline behaviour, production readiness** | Security tests, backup-restore test, internet-drop tests, staging → production → **pilot in the owner's restaurant** | Owner signs off the pilot |
| 7 | Management upgrade | Reports and analytics, shifts and cash count, printers, split/move/merge tables, images and branding, Urdu UI, customer accounts | — |
| 8 | Staff and payroll, inventory and suppliers, expenses | Salaries, attendance, advances; stock, recipes, suppliers, purchase orders | — |
| 9 | SaaS platform | Platform Admin, onboarding, plans, subscriptions, billing, tax-invoice check — required before selling | — |
| 10 | AI Restaurant Manager | `docs/AI_MANAGER_PLAN.md`, stages 1–3 | — |
| 11 | Later | Full offline operation, online payments, native apps, GPS tracking, shared delivery, reservations, loyalty, marketplace | — |

- Never start the next phase before its gate is passed. Phases 1–3 each end with the owner's
  approval of a real preview.
- The **pilot release** is everything tagged "Pilot" in MASTER_PROMPT.md §7: dine-in, online orders
  and own riders. It is built through Phases 1–6.
- Build only what the current phase needs. Minimal shared configuration is allowed; the full
  backend is not built before Phase 4.
- Offline: Phase 6 tests what happens when the internet drops (clear message, no lost or duplicate
  orders). Full offline operation (POS keeps working without internet and syncs later) is Phase 11,
  unless the owner moves it earlier (MASTER_PROMPT.md §16).

## 16. UI-first rules (Phases 1–3)

- Screens get data only through each app's API client interface (`src/lib/api`). In Phases 1–3 a
  **demo adapter** with in-memory DEMO data implements it; Phase 4 replaces it with the real API
  adapter. Screens never import demo data directly, so nothing has to be rebuilt.
- Statuses, transitions, roles and money come from `packages/shared`, so prototype screens follow
  the real rules and show correct totals (Table 5 = Rs. 5,900).
- DEMO stays visible on every screen through one small **"Demo mode"** indicator in the header; tapping
  it explains that the data is sample data ("Aziz Pizza — DEMO") and that sync works only between
  tabs of one browser. PLACEHOLDER screens keep their own badge (owner, 2026-10-28).
- A simple DEMO login (pick your account, no password) replaces real login during Phases 1–3 and is
  labelled DEMO. Staff cannot change their own role; only the Owner does it in Staff (owner, 2026-10-29).
- Screen-to-screen updates in the prototype are "DEMO sync — not real-time"; nothing may be labelled
  live before Phase 5.
- Mobile-first for Waiter, Customer and Rider; tablet layout for Kitchen and Cashier; follow the
  owner's design (brand red, white cards, left sidebar).
- Each UI phase ends with: a running preview, screenshots of every screen, the list of screens with
  their status, and the owner's approval recorded in the decision log.

## 17. Progress reporting and statuses

| Status | Meaning |
|---|---|
| **REAL / VERIFIED** | Works with the real backend and database and was tested (the report names the tests) |
| **DEMO / PROTOTYPE** | Visible and clickable with demo data; not connected to the backend |
| **NOT CONNECTED** | The screen or the backend part exists, but the two are not linked yet |
| **PLACEHOLDER** | "Coming Soon" screen without function |
| **BLOCKED** | Cannot continue; the report says why and what is needed (owner decision, account, network …) |

After every meaningful step:

1. Explain what changed.
2. Show the real preview or screenshots when available.
3. State what works and what is only a prototype (statuses above).
4. Report the tests actually performed and their results.
5. Name errors and remaining work.
6. Update the README status table and progress log.

- **Never invent** test results, previews, screenshots, deployments or working integrations. If a
  preview cannot be shown, say so and mark it BLOCKED with the reason.
- Report to the owner in easy Roman Urdu with the template in MASTER_PROMPT.md §15.4.
- Preview options: (a) Claude Code running on the owner's computer — `pnpm dev`, then the app opens
  in his browser next to the chat (live preview); (b) Claude Code on the web — Claude runs the app
  in the cloud and shares screenshots; after Vercel is connected, every branch also gets a preview
  link that opens on any phone.

## 18. Working rules

- Inspect the existing project, code and documents first. Never restart the project; never delete
  working code or useful features.
- Small steps; test each step before the next.
- When something is unclear or two instructions conflict, ask the owner one short question with a
  recommended answer.
- Never connect a paid service (SMS, WhatsApp API, email, AI, voice, maps, payment gateway) without
  explaining the monthly cost and getting the owner's approval.
- Never build a later-phase feature early unless the owner moves it in MASTER_PROMPT.md first.
- Simple, mobile-friendly interface.
- Code, comments and documents in English; explanations to the owner in easy Roman Urdu (Urdu
  script when he asks).

## 19. AI Restaurant Manager (Phase 10)

Full design: `docs/AI_MANAGER_PLAN.md`. Non-negotiable:

- Same backend and database — no second inventory or order database.
- Calculations (stock, consumption, reorder quantities, reports) are tested server code. The AI only
  understands questions, calls read-only server tools as the logged-in user, explains results and
  writes drafts.
- AI output is labelled FACT / CALCULATION / FORECAST / RECOMMENDATION with source data, last-updated
  time and confidence. The AI never invents stock, sales, prices, deliveries or forecasts.
- The AI never changes stock, approves counts, marks payments verified, approves its own purchase
  orders, sends purchases outside owner-approved rules, or changes automation limits.
- Stages: read-only → drafts with human approval → limited auto-ordering under owner limits, with
  duplicate protection and an emergency stop. Tested on simulated data first.
- A supplier order is never called "sent" unless the sending service confirms it.

## 20. Decision log

| Date | Decision | Status |
|---|---|---|
| 2026-10-24 | One monorepo; apps customer, restaurant-os, rider, admin; backend/api; one PostgreSQL database | Active |
| 2026-10-24 | `restaurant_id` + `branch_id` from day one; server-side tenant checks | Active |
| 2026-10-24 | Roles OWNER, CASHIER, KITCHEN, RIDER | Superseded 2026-10-26 (six roles) |
| 2026-10-24 | Stack: Next.js, NestJS, Prisma, Socket.IO, PostgreSQL (Supabase), Vercel, Railway | Active |
| 2026-10-24 | Supabase used as a database only; login and real-time in NestJS | Active |
| 2026-10-24 | Tracking shows order status only; guest checkout with a private tracking link | Active (pilot) |
| 2026-10-24 | Money in paisa; totals calculated on the server | Active |
| 2026-10-24 | Cash on Delivery as the only payment in the first version | Superseded 2026-10-26 (recorded cash/card/wallet payments; COD for online orders) |
| 2026-10-24 | Rider assigned after READY; "Picked up – On the way" is one status | Active |
| 2026-10-24 | Online App and Riders pages are control panels; the real apps are separate | Active (2026-10-26: plus previews) |
| 2026-10-24 | Riders are created by the owner; no public rider signup | Active |
| 2026-10-24 | One Customer App and one Rider App deployment for all restaurants | Active |
| 2026-10-24 | First real goal = delivery flow end to end with the backend; "do not build the entire frontend first" | Superseded 2026-10-26 (UI-first, §15) |
| 2026-10-24 | Build order: foundation + three app layouts, then modules with the backend | Superseded 2026-10-26 (UI-first, §15) |
| 2026-10-24 | Four status labels (REAL, DEMO, PLACEHOLDER, NOT CONNECTED) | Superseded 2026-10-26 (five statuses, §17) |
| 2026-10-24 | Demo data "Aziz Pizza" until the owner sends the real menu | Active |
| 2026-10-25 | Product name: Lala Restaurant OS | Active |
| 2026-10-25 | AI Restaurant Manager is a planned module, built after inventory | Active (Phase 10, after Phase 8) |
| 2026-10-25 | The AI explains and drafts; calculations are tested server code | Active |
| 2026-10-26 | MASTER_PROMPT.md is the complete feature specification | Active (v2.0) |
| 2026-10-26 | Dine-in in the core: tables, waiter, rounds, kitchen stations, running bills, split payments, tips, receipts | Active |
| 2026-10-26 | Six roles: OWNER, MANAGER, CASHIER, WAITER, KITCHEN, RIDER | Active |
| 2026-10-26 | Recommended order "dine-in core first (with backend), then online" | Superseded 2026-10-26 (UI-first); dine-in stays first inside Phase 4 |
| 2026-10-26 | Business day start per branch; daily order numbers; gap-free invoice numbers | Active |
| 2026-10-26 | **UI-first order** (owner): Restaurant OS UI → Customer UI → Rider UI → backend → real-time → security, reliability, offline behaviour, production; owner approval after each UI phase | Active |
| 2026-10-26 | Five statuses: REAL / VERIFIED, DEMO / PROTOTYPE, NOT CONNECTED, PLACEHOLDER, BLOCKED | Active |
| 2026-10-26 | Restaurant OS includes management and preview sections for the Customer and Rider Apps | Active |
| 2026-10-26 | Refunds added (Owner/Manager, with reason; the original payment is never changed) | Active |
| 2026-10-26 | Payroll moved from the "avoid" list to Phase 8 (with staff); full accounting stays out of scope | Active |
| 2026-10-26 | Offline: behaviour tested in Phase 6; full offline operation in Phase 11 unless the owner moves it | Active |
| 2026-10-26 | PROJECT_RULES.md v2.0: duplicate and pointer sections removed; `CLAUDE.md` added for Claude Code | Active |
| 2026-10-26 | The owner's prompt mentions "Master Prompt Version 4"; only v1.0 existed in the Project, so v2.0 merges the owner's latest points | Note — share v4 if it exists elsewhere |
| 2026-10-27 | Owner approves PROJECT_RULES.md v2.0 and MASTER_PROMPT.md v2.0 as the baseline (Phase 0 gate) | Active |
| 2026-10-27 | Owner approves the Phase 1 plan ("ok start"); Phase 1 starts on branch `phase-1/restaurant-os-ui` | Active |
| 2026-10-27 | Repository folder and future private GitHub repository: `restaurant-saas-platform`. Product name stays Lala Restaurant OS; package names stay `@restaurant-saas/*` | Active |
| 2026-10-27 | Local Git started with an unchanged baseline commit of the ZIP; nothing is pushed until the owner approves GitHub | Active |
| 2026-10-27 | Restaurant OS navigation (§3): sidebar always visible on tablet/desktop, one feature per screen, bottom navigation on phones, Tables as home, Dashboard and later modules under "Coming Soon" | Active |
| 2026-10-27 | Online App and Riders pages get an Open Full App button; previews and the button are PLACEHOLDERS until Phases 2 and 3 | Active |
| 2026-10-27 | Design pictures are a visual reference only; menu photos stay in Phase 7 | Active |
| 2026-10-27 | White-label branding per restaurant is the confirmed future direction (MASTER_PROMPT.md §7.6): shared code and deployment; branding P7, custom domains P9, separately branded Android apps are Publishing Stage B (P11) after a store-policy review | Active (future) |
| 2026-10-27 | Extra roles (Admin, Inventory Staff, Finance Staff) are a future idea; they need an explicit update of the permission model first | Idea — not scheduled |
| 2026-10-27 | Rider availability status (online/offline) requested by the owner; decide its scope before Phase 3 | Open — MASTER_PROMPT.md §16 |
| 2026-10-27 | Preview 1 feedback (owner): sidebar starts with the most-used sections — POS / New Bill, Tables, Orders, Online Orders (§3). The build order of the previews does not change | Active (replaces the sidebar order in the navigation row above) |
| 2026-10-27 | Preview 1 feedback (owner): the long DEMO notice strip is removed; the DEMO / PROTOTYPE badge on every screen title and the DEMO role-switcher label stay (§16) | Active |
| 2026-10-28 | Owner and Manager start at POS / New Bill instead of Tables (owner, after Preview 1) | Active (replaces "Tables as home" in the navigation row above) |
| 2026-10-28 | Owner approves Preview 1 (layout and navigation) and starts Preview 2: Tables → Waiter Orders → Kitchen / KDS | Active |
| 2026-10-28 | Owner workflow: two waiter roles — Super Waiter (WAITER, takes orders) and Service Waiter (SERVICE_WAITER, serves food on assigned tables, calls the cashier); assigned tables per waiter; chefs per kitchen station; selling units (1 kg); bill request → cashier accepts → waiter sees it; cashier finds a bill by table number, prints a pre-bill, records payment, prints the paid receipt | Active (permission model updated, MASTER_PROMPT.md §4, §5.1) |
| 2026-10-28 | Moved forward into Phase 1 by the owner: POS dine-in billing (from Preview 3) and Staff with waiter type and tables (from Preview 5); DEMO login replaces the role switcher; Restaurant OS is installable as one PWA for all staff (no offline data) | Active |
| 2026-10-28 | One small "Demo mode" indicator replaces the per-screen DEMO badges and the green connection dot (a simulated sync is never shown as live) | Active (§16) |
| 2026-10-28 | Owner approves the waiter → kitchen → cashier workflow and starts Preview 4: Orders and Online Orders | Active |
| 2026-10-28 | Until the Customer App (Phase 2) and Rider App (Phase 3) exist, Online Orders has clearly labelled DEMO buttons that place a customer order and do the rider steps | Active (Phase 1 only) |
| 2026-10-28 | POS / New Bill becomes a full ordering screen (owner): new dine-in / takeaway / delivery bills, Hold, discount (Owner/Manager), split and pending payments, pre-bill, receipt, complete — on the same order records; Find table and Running table bills stay. "Online" payment = recorded transfer (wallet / bank), not processed online | Active |
| 2026-10-28 | POS layout (owner, size changes only, no new features): compact top, narrower sidebar, the POS fits one screen on tablet/desktop with the bill totals and actions always visible; Clear bill (with confirmation) removes only unsent items. Menu photos stay in Phase 7 | Active |
| 2026-10-28 | POS title row holds "Find bill: table no." and a "Running bills" list (table bills, takeaway/delivery to pay, held bills); bill requests stay as a strip when there are any | Active |
| 2026-10-28 | POS product pictures (owner): food illustrations chosen by product name and category until real menu photos (photo upload stays Phase 7) | Active |
| 2026-10-28 | Sidebar: full names from 1024 px wide with a Collapse button (icon rail), choice remembered per browser; POS is checked on a short laptop screen (1278×627) as well as desktop and tablet | Active |
| 2026-10-29 | POS reference design (owner's picture): four order buttons Dine-in, Takeaway, Delivery, Phone Call ("Better Call" in the picture, read as a phone order the customer collects: TAKEAWAY + channel PHONE; home delivery by phone stays under Delivery); big Send to Kitchen and Bill Now buttons; Hold and Clear all next to Items | Superseded 2026-10-29 (the 4th button is Call Waiter) |
| 2026-10-29 | Owner: the 4th POS button is "Call Waiter" — an alert to the table's Service Waiter (or the order's Super Waiter); no phone-order button. The Owner/Manager may give a discount on a new bill before it is sent (saved with the new order in one step); the Cashier still cannot | Active (replaces "discounts only after sending to the kitchen") |
| 2026-10-29 | POS (owner): "Find a bill by table number" is removed (it replaced an earlier owner request to keep it); a bill is opened from the Table box or Running bills. A new bill starts as Takeaway — a counter sale with no table and no customer, product then Bill Now; Delivery keeps its required customer details | Active (replaces the 2026-10-28 request to keep Find bill by table number) |
| 2026-10-29 | Tables (owner): Owner/Manager set up areas and tables on the Tables screen (moved forward from Settings / Preview 5) — Manage Areas (add, rename, reorder, deactivate), + Add Table (one or many, e.g. T1–T10 with 4 seats), edit name / area / seats / display order; search and filters Free, Occupied, Bill requested, Cleaning, Out of service; "guests / capacity" on occupied cards; tables with open bills cannot be removed, taken out of service or moved; areas with open bills cannot be deactivated; used tables are archived. Same table data in Tables, POS and Waiter Orders. UI/DEMO only; reservations, table merging and split bills stay later | Active |
| 2026-10-29 | Tables (owner): Cleaning stays manual — floor staff mark a table for cleaning and press "Table is clean"; a table does not go to Cleaning automatically after its bill is paid | Active |
| 2026-10-29 | Staff (owner): only the Owner manages staff, roles, links and Enable / Disable (replaces "Owner or Manager"; the Manager sees the list); last active Owner protected; add staff with mobile, optional email, branch, role, tables / station; single-use 48-hour activation and PIN-reset links, resend / cancel; own PIN; PIN unlock on enrolled devices; Disable ends sessions. Owner: "frontend first, backend last" — Phase 1 builds the DEMO screens; real login, PIN hashing, devices, sessions, email and HTTPS hosting in Phases 4–6 | Active |

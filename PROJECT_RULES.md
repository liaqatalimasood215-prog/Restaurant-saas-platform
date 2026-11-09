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
| Online App / Website | Tabs Overview, Website, Mobile App (PWA), Android App, Settings; publishing status; product online ON/OFF, online orders ON/OFF, link, QR code, **preview of the Customer App**, **View Website** button | `apps/customer` |
| Riders | Add/disable riders, assignments, cash to settle, **preview of the Rider App**, **Open Full App** button | `apps/rider` |

These pages manage and preview the real apps; they never replace them. The real apps stay separate
and are deployed separately.

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
  owner's Red & White design (brand red gradients, white cards, white left sidebar with red ends).
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
| 2026-10-24 | Demo data "Aziz Pizza" until the owner sends the real menu | Superseded 2026-11-05 (Lala Restaurant desi demo; Aziz Pizza = automatic-test data) |
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
| 2026-10-29 | Staff (owner): a Delete option. Never used = deleted; named on orders, bills or history = archived (hidden, cannot log in, old bills keep the name). Not yourself, not the last active Owner; Owner only | Active |
| 2026-10-29 | Staff redesign (owner's reference picture, panels 1–3; app colours kept: brand red + navy): employee list (initials, Employee ID, role, branch, contact, status Active / Inactive / Invited, last login, actions menu, search and filters), 3-step Add Staff wizard, Role Permissions matrix and per-person custom permissions. Permissions can be switched off freely and on only within what the order rules allow; Staff management and Settings stay Owner only. Photo upload stays Phase 7; new roles (Dispatcher, Inventory, Finance) and extra invite methods are not built yet | Active |
| 2026-10-30 | Owner approves the Staff design (employee list, 3-step Add Staff wizard, Role Permissions, per-person permissions) as the DEMO frontend; backend parts stay in Phases 4–6 | Active |
| 2026-10-30 | Owner approves POS / New Bill, Preview 4 (Orders, Online Orders) and Tables management ("Haan, sab approved"). Next: Preview 5 after "shuru karo" | Active |
| 2026-10-30 | Owner starts Preview 5 ("shuru karo"), in this order: Menu, Settings, Today's Summary, Online App, Riders, then refunds. Menu is built first | Active |
| 2026-10-30 | Settings (Preview 5 step 2): bill settings (tax, service charge, rounding, delivery fee) apply to new bills only — every order keeps the settings it was made with; the Manager money-reports switch now lives in Role Permissions | Active |
| 2026-10-30 | Owner: "first making website, beautiful and UI clean … then rider". Phase 2 (customer website, `apps/customer`) starts before the Phase 1 gate; the Riders page and refunds wait; the Rider App (Phase 3) comes after the website | Active (replaces the Preview 5 order for Riders and refunds) |
| 2026-10-30 | Owner's website brief: public website frontend only, in its own folder, easy to publish on its own, for mobile, tablet and desktop; backend, real accounts, orders, payments, POS connection and live tracking later; no push or deploy without approval | Active |
| 2026-10-30 | Moved forward into Phase 2 as DEMO, because the brief asks for a branded website with customer accounts: per-restaurant name and colour (from P7 branding, logo letters only; logo upload stays P7) and customer account screens (from P7; no password or code is checked, real sign-in needs a phone code by SMS, a paid service needing approval). Ordering never needs an account | Active |
| 2026-10-30 | Owner's Online App / Website brief, steps A–H: Online App becomes the control panel of each restaurant's own branded website, PWA and optional Android app. Each restaurant looks like its own website to customers (not "One website, every restaurant"), from one shared codebase, backend, database, menu, pricing and order system. Website and Android are two separate publishing flows; Publish Website never needs Android. The restaurant buys and owns its domain; a suspended subscription never takes it | Active |
| 2026-10-30 | Moved forward as DEMO screens only, by that brief: custom domain (real work stays P9) and Android / Google Play publishing (real work stays P11, Publishing Stage B). No real domain, image upload, deployment, Android tooling, signing keys or Google Play without separate approval | Active |
| 2026-10-30 | Owner approves the inspection report with its four decisions: the website work is committed locally first; Aziz Pizza stays the Restaurant OS demo, LALA Restaurant comes as a sample restaurant on the Online App; Publish, domain and Android are Owner only (permission `onlineApp.publish`), the Manager keeps orders ON/OFF, fee and minimum order; food pictures stay emoji, upload shown as Planned, real photos P7 | Active |
| 2026-10-31 | Menu (owner's reference picture): category cards on top instead of a category drop-down; tapping one shows only its products. The picture's dark colours and food photos are a visual reference only: the app's light colours and emoji stay | Active |
| 2026-10-31 | Customer App design (owner's six-screen picture and brief, frontend only): Login, Home, Menu, Product, Cart, Tracking, bottom bar Home / Menu / Cart / Orders / Account; red, white, yellow accent; "Rs 1,300" on the website; skeletons, empty and error states, branch selector, closed banner, Reorder, install offer, offline message, 44 px tap targets. OTP, Google login, JazzCash / Easypaisa / Card, map and rider contact are screens only, marked NOT CONNECTED; the real ones keep their phases and need approval | Active |
| 2026-10-31 | Owner approves the plan's five decisions: the website opens on Home and login is never forced ("Skip"; ordering never needs an account); Dine-in on the website is DEMO only, not joined to tables and waiters, real table ordering to be decided later; COD is the default and the other payments can be tapped but take no money; LALA Restaurant is sample data (red and yellow, two branches, crust) and the code holds no LALA branding, Aziz Pizza and Demo Karahi stay; food pictures stay emoji, no photos from the internet | Active (the first point changed the same day: see the next row) |
| 2026-10-31 | Owner's feedback on the Customer App: the first visit on a device opens on Login once, with Skip, like the picture (replaces "opens on Home"; direct links and previews are never sent to Login, ordering still never needs an account); Login also in the header. While a rider has the order, the customer calls the rider, not the restaurant; real calling uses a plain phone call and a free WhatsApp link once real rider numbers exist (Phase 3–4), in the demo the buttons explain themselves. The phone preview in Online App must show the website's whole bottom bar | Active |
| 2026-10-31 | Owner approves the Customer App ("Approve, Phase C karo": Phase 2 design gate) and starts Online App step C: the website previews and View Website show the Restaurant OS menu, prices and switches through a DEMO browser link; a direct website link keeps its sample data and orders do not reach Restaurant OS until Phase 4; LALA Restaurant can be chosen as a sample in the previews | Active |
| 2026-10-31 | Owner approves step C and starts step D ("Approve, Phase D karo"): Website tab with Branding, Homepage, Menu display, Delivery & Pickup, Opening hours, Contact, Custom domain, SEO & Sharing, QR code, as DEMO. Products, prices and categories stay in the Menu; phone, address, fee, minimum and time stay in one place. Owner only: look, texts, hours, domain, SEO. Owner and Manager: Delivery / Pickup / Dine-in switches, which work at once like online orders ON/OFF. A saved look change waits for Publish Website on a published website. No real domain, DNS, picture upload or hosting: pictures show Planned, DNS values are an example, the link and QR stay on this computer. Opening hours are shown but do not close the website by themselves until the backend | Active |
| 2026-10-31 | Owner ("Haan, theek karo", after his phone could not open the QR link): the customer link, Copy and QR code use this computer's Wi-Fi address during development, so they open on a phone on the same Wi-Fi for testing (replaces "the link and QR stay on this computer"). The phone shows sample data and its orders stay on it. View Website and the previews stay on localhost. Development only: the address is never in a production build. Customers' phones still need hosting, with separate approval | Active |
| 2026-11-01 | Owner ("Haan, shuru karo"): step D of the Online App approved; steps E–H paused, not cancelled; Phase 3 starts with the Rider App and the Riders page together, then refunds, then the backend | Active |
| 2026-11-01 | Riders (owner, MASTER_PROMPT.md §16 #16): the Owner creates riders, no public sign-up; the Manager sees them and may take their cash. The rider sets Online / Offline; Owner, Manager and Cashier see it; an Offline rider gets no new order; a rider with a running delivery cannot go Offline and cannot be disabled (replaces "Owner or Manager adds a rider") | Active |
| 2026-11-01 | Rider App is built as DEMO: sample data on a direct link and on a phone; in the Riders page frame or Open Full App it uses the Restaurant OS orders through a DEMO link in one browser. The customer website does not see rider steps until Phase 4 | Active |
| 2026-11-01 | Owner approved the Rider App audit against his six-screen picture. Phase 1A: tokens, badges, four-tab bottom bar (Home, Orders, Earnings, Profile), Login (phone + PIN or password, no sign-up), Home (New Orders, My Orders), Order Details. Frontend only, no backend, no push, merge or deploy without him | Active |
| 2026-11-01 | No Accept Order: the cashier assigns. Picked Up is a DEMO display step of the Rider App (`riderStage`); RIDER_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED stay the only statuses. Supersedes "Picked up – On the way is one button" for the rider's screen only; the status decision is postponed to the backend | Active |
| 2026-11-01 | Up to 3 deliveries with the rider, shown in the UI only. Live Tracking and Earnings stay DEMO / NOT CONNECTED. COD cash is never shown as the rider's earnings | Active |
| 2026-11-01 | Owner approved Phase 1A and said "only front end; all front end, last backend": the whole Rider App frontend is built next (Live Tracking, My Active Deliveries, Today Summary, Delivery History, Profile), backend only after all frontend, with his separate approval | Active |
| 2026-11-01 | Owner approved the Rider App frontend ("Approve, commit karo"): committed locally on the working branch; no push or merge | Active |
| 2026-11-01 | Owner ("Haan, merge karo"): the Rider App frontend merged into `phase-1/restaurant-os-ui`; nothing pushed. No GitHub remote is connected yet | Active |
| 2026-11-02 | The Rider App's "today" is the restaurant's business day (default start 06:00, `riderDay`), found by the walkthrough just after midnight; the branch's own start time comes with the backend | Active |
| 2026-11-02 | Refunds and Correct Payment built (DEMO) on the Orders page, Owner and Manager only. Correct Payment changes the method only; "the money never came" is not built (owner chose the smaller way). Refunds and corrections count on the day they were made. A rider's cash cannot be corrected | Active |
| 2026-11-02 | Owner: "demo connect" the whole software before the backend. Delivery and pickup orders from the customer website (Aziz Pizza link) go to Restaurant OS, and the Rider App reaches it, in one browser on this computer through a hidden DEMO page (`/demo-link`). A Restaurant OS tab must be open. Other phones keep sample data until Phases 4–5. Supersedes "orders do not reach Restaurant OS until Phase 4" for this DEMO only | Active |
| 2026-11-02 | Each staff alert has its own tune and a spoken line (free browser voice): new online order with the customer's name, kitchen ticket, food ready, bill, Call Waiter; the Rider App and the customer's tracking speak too. No rider Accept step: the owner's 2026-11-01 decision stays, "Pick Up Order" is the rider's first tap | Active |
| 2026-11-02 | Owner: strangers share a table in a rush. Each customer is an own order on that table (T1-1, T1-2) with an own bill and invoice; the cashier bills the one the customer names; the table is free when none is open; the whole table can also pay at once. The one-order-per-table rule ends here; the split bill moved up from Phase 7. DEMO until the backend | Active |
| 2026-11-03 | Settings page from the owner's picture: 12 feature cards first, the chosen card's settings beside them (phone: instead of them). Existing settings only; unfinished parts say Coming soon. Owner approved ("Approve") | Active |
| 2026-11-03 | Red & White design (owner's picture) replaces the dark navy sidebar: white sidebar with red top and bottom, red gradients on active items and buttons, soft red POS cards and bill total, subtle shadows and animations. Styling only; features and workflows unchanged. Owner approved ("Approve") | Active |
| 2026-11-04 | POS: adding a product pops a green tick on its card; a red ✓ with the quantity stays while it is in the bill's unsent items, so nobody adds it twice by mistake. Display only. Owner approved ("Approve") | Active |
| 2026-11-04 | Owner approves the Inventory & Suppliers plan (steps A–H) and its 6 decisions: frontend DEMO now, moved up from Phase 8; stock used at kitchen READY; no Inventory Staff role yet; auto Sold out only with a verified recipe; salaries as a simple expense; Inventory section for Owner / Manager. Step A (Overview + Ingredients) only, then wait for his approval. Existing demo data must not be reset without his approval | Active |
| 2026-11-04 | Owner approves Inventory Step A ("Approve, Step B") and starts Step B: Recipes & Food Cost (DEMO) | Active |
| 2026-11-04 | Owner's second Inventory brief: revised plan approved ("Approve, Phase 1"), replacing steps C–H. Steps A and B stay as built (Step B was not reviewed separately: he continued with the revised plan). Inventory phases: 1 tidy UI (sections Overview · Stock · Recipes · Purchasing · Reports) + full Stock Movements history; 2 automatic stock use from orders; 3 suppliers, purchase orders, receiving, supplier payments; 4 wastage, expiry, stock counts, locations; 5 expenses; 6 reports, Sold out from stock, packaging. Decisions: stock use before suppliers; a prepared item (dough) is used as its raw ingredients until batch making exists (phase 4); stock may go below zero with a red alert, an order is never blocked; items without a verified recipe take no stock and are listed as Not tracked. Order lines will keep the size id, add-on ids and recipe version (same order system) | Active |
| 2026-11-05 | Recipe Builder (owner's picture): R1 = the picture's layout (red top bar with Save Draft / Verify Recipe, product card left, ingredients table with search in the middle, cost summary right) and a Quantity + Unit pair on every line (kg, g, mg, L, ml, pcs, dozen, pack, bottle, bag, box, tray, portion; package sizes set by the owner). R2 later: one base recipe auto-scales every size, with per-size overrides. Existing recipes and menu prices must not change without his confirmation; sizes and prices stay in the Menu. Show R1 before R2. Inventory phase 1 was not reviewed separately (he moved on to the Recipe Builder) | Active |
| 2026-11-05 | Owner's four answers: the Restaurant OS demo becomes his desi restaurant "Lala Restaurant — DEMO" — Karahi (Chicken, Mutton, Chicken White, Mutton White in 1 kg / ½ kg / Pao), Mix Sabzi, Daal Mash, Daal Chana, Chicken Tikka, Seekh Kabab, Malai Boti, Fish Fry (1 kg / ½ kg), Roti, Naan, Raita, Salad, Doodh Patti Chai, Coffee, Cold Drink, Mineral Water at sample prices he changes in the Menu; desi ingredients, suppliers and sample recipes. Pizza, burgers, fries, pasta and wings leave his demo (archived in saved data, so old bills keep them); everything he added himself stays. Replaces "Aziz Pizza stays the Restaurant OS demo" and "the code holds no LALA branding" (2026-10-30/31) for the Restaurant OS demo. Aziz Pizza stays only as the fixed data of the automatic tests (MASTER_PROMPT.md §12, Test A = Rs. 5,900). The website and Rider App direct links keep their own sample data; the DEMO link slug stays `aziz-pizza` | Active |
| 2026-11-05 | Recipe Builder R2 from the owner's second picture and brief ("Approve"-style go-ahead: "auto scale cannot open … some redesign"): Auto Scale built as DEMO — one base recipe (e.g. 1 kg) and every ticked size = base × its share (½ kg = 50 %, Pao = 25 %, Half Pao = 12.5 %), loss % not scaled twice; a size can be Customized and sent Back to Auto; Customize Sizes (tick, quantity / share, price, add ½ kg, Pao, Half Pao, Small, Medium, Large or another size, remove a new one); the Recipe Sizes table under the builder (scaling, cost, selling price, food cost, profit). A changed price or a new size reaches the Menu only after a confirm box (new bills only); a kg item that gets sizes is counted per plate ("1 × Chicken Karahi (½ kg)"). The builder page scrolls once on a laptop instead of being one screen high (the picture puts the sizes table below). Product photo stays emoji (Phase 7); name and category stay in the Menu. No stock is taken yet (inventory phase 2) | Active (approved 2026-11-05) |
| 2026-11-05 | Owner: suppliers easy to add: "+ New supplier" (name, phone) inside the ingredient form; the full Suppliers page stays inventory phase 3 | Active |
| 2026-11-05 | Owner (POS picture): a product card shows the FIRST size's price ("Rs. 2,800 / 1 kg"), not "from" the cheapest (Pao); ½ kg and Pao are chosen after a tap. Same on Waiter Orders (`cardPrice`, `packages/shared/src/menu.ts`). The size still has to be chosen in the box (nothing is preselected) | Active |
| 2026-11-05 | Owner approves ("Approve") the Lala Restaurant desi demo, Recipe Builder R2 (Auto Scale, sizes table, Customize Sizes, Menu prices after a confirm box), "+ New supplier" and the 1 kg price on POS / Waiter cards. Next only after his "shuru karo": inventory phase 2 (a sold size takes its own size recipe from stock) | Active |
| 2026-11-05 | Owner's Smart Supplier brief, Phase 0 plan approved ("Approve, S1 karo") with its four answers: his floor workflow (supplier comes → Suppliers → his products → quantity → Receive → stock and khata go up; evening → Settle Payment → the rest carries to tomorrow) is right; Owner and Manager receive and pay (Cashier later through Role Permissions); the rate paid becomes the product's purchase price (recipe costs follow); Suppliers (old inventory phase 3) comes BEFORE stock use from sales (phase 2), reversing the 2026-11-04 order. Steps: S1 Suppliers screen, Receive Stock, khata, Settle Payment (built 2026-11-05, DEMO); S2 returns and corrections, history filters, daily statement; S3 optional purchase orders; S4 expenses. Payments are recorded only; supplier cash is not yet taken from Today's Summary cash (cash count = Phase 7). A payment may not exceed what is owed (no advance in S1) | Active |
| 2026-11-06 | Owner: Inventory sections in the order Suppliers, Stock, Recipes, Overview, Reports, and Inventory opens on the first one (replaces Overview first). An **Edit order** button lets him tap the sections in his own order (1, 2, 3 …; the others follow), with Done, Reset and Cancel; the order is kept in this browser | Active |
| 2026-11-06 | Owner approves ("Approve") Suppliers S1 and the Edit order button. Next only after his "shuru karo": S2 returns, corrections and daily statement | Active |
| 2026-11-06 | Owner: POS and Tables felt slow. The demo data's made-up network delay (150–350 ms per call) is removed; screens answer at once. Display speed only, no feature change | Active |
| 2026-11-06 | Owner (his restated request confirmed): the supplier list gets its own **Edit order** (tap 1, 2, 3; the others follow; Reset A–Z); each supplier a picture: the demo picture of what he brings, or **Upload picture** moved forward from Phase 7 as DEMO only (a small copy kept in this browser; real photo storage stays Phase 7); the karyana, sabzi, chicken and doodh demo suppliers bring their whole range (19 more sample products). His own "samad karina store" (was City Packaging) stays as he made it, and Madina Kiryana Store stays too | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-07 | Owner's multiple-units brief, plan approved ("Approve, shuru karo"): one product, several ways to buy, one stock in its base unit. The main unit stays what recipes cost from; loose kg / g, litre / ml or pieces are always offered; packings (bag, pack, box, carton, tray, dozen, bottle) are per product with their own size and price. One product may be on a bill several times in different units, never twice in the same unit. Recipe cost = the bill's average per base unit (owner's choice). Each saved bill line keeps its unit and size, so editing a packing never changes old bills or stock. The packing list is also in Stock → Add / Edit Ingredient (owner's choice). DEMO, frontend only | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-06 | Owner: an Edit button on every product of a supplier list and of the bill (his choices: edit and remove from the list, in both places). Edits change the one shared product; weight stays weight and volume stays volume; Remove takes it off that supplier only | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-06 | Owner's New Purchase (Bill) brief and picture, approved with his choices: two screens, one at a time (the bill; Add New Product only after its button). Tapping a product puts it on the bill; a new product is saved once in the shared list, on the supplier's list and on the bill (Option 2), and the unfinished bill is kept. Drafts never touch stock or the khata; Save Purchase writes stock and the khata once (bill no., discount) and a payment linked to the bill, never more than the bill (older debt with Settle Payment). Product photos stay emoji (Phase 7); the bill uses each product's purchase unit (no unit switching yet); Print is the browser's print; drafts stay in this browser. 'bag' added as a packing unit | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-06 | Owner (restated and confirmed): a supplier opens on the whole screen with all his products as picture cards and a search; the most used products come first, counted automatically from his deliveries of the last 30 days (no stars, owner's choice); the supplier list becomes a grid of cards. The supplier Edit order is one wide strip like the sections' | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-07 | Owner (brief and screenshots, steps restated and confirmed): weight sizes of one item can be tapped together in the size box (POS, Waiter Orders, counter order). Two or more make ONE bill line and ONE kitchen line, e.g. "Chicken Karahi (1.5 kg: 1 kg + ½ kg)" Rs. 2,600 + Rs. 1,400 = Rs. 4,000, each size with its own quantity; add-ons and the note belong to that one pot. One size stays a plain line; Small / Medium / Large stay one size at a time. DEMO until the backend. Owner approved ("Approve, commit karo") | Active |
| 2026-11-07 | Owner's Wastage & Expiry brief: audit and plan W1–W5 shown; then put on hold by the owner (priority changed). Not built | On hold |
| 2026-11-07 | Owner's "Automatic Recipe Scaling & Purchase-Based Prepared Items" brief: plan P1–P4 approved with its decisions (plate 250 g full / 125 g half / 500 g full packing / 250 g half packing as editable estimates; every dish starts in Option A, no prepared-stock tracking; sales never change raw stock in the DEMO, real deduction is phase 2 with separate approval; Chicken Karahi keeps its sized Auto Scale; order P1 → P4). No separate cooking module, no daily cooking buttons. P1 built (DEMO): a prepared item may name its main raw ingredient (one of the lines); its line quantity is what the recipe is for (1, 2, 5 kg …); the builder works the recipe out for any amount with cost and yield, labelled as an estimate; 8 sample cooked dishes | Active (P1 changed 2026-11-08, next row) |
| 2026-11-08 | Owner's P1 changes ("Changes chahiye", then "Approve both decisions"): the recipe of a cooked dish follows the ACTUAL raw stock of its main ingredient (opening, supplier bills and corrections): 5 kg daal mash bought → the recipe for 5 kg; 2 kg more → 7 kg, every ingredient and the estimated cost with it. Stock 0 or below: "Out of Stock" and the saved recipe stays. A saved supplier bill says which recipes changed; the khata and stock change only by the bill. Buying is never cooking: nothing is marked cooked or taken from stock; actual use stays separate (later, with approval). Plates and cooking yield wait for a later step (the old "One batch makes" field stays). Another cooked dish with the same main ingredient is shown as sharing that stock, never added twice | Active (P1 approved 2026-11-08: "Approve, commit karo"; P2–P4 each after his approval) |
| 2026-11-08 | Owner's picture for Prepared Items (P2): red title bar with Add Recipe, four summary cards, chips with counts, search, a cards / list button, compact cards three per row (raw stock, recipe cost, stock pill, shared main ingredient marked * and counted once, small Ingredients and Edit). Real data only, emoji until photos (Phase 7). Also his request (restated and confirmed): Recipes opens on its overview; Menu items, Add-ons or Prepared items open on the whole screen with a "← Recipes" bar. Owner approved ("Approve, commit karo") | Active |
| 2026-11-08 | Owner's main requirement for P3 (restated and confirmed, "Approve, P3 karo"): the recipe is saved once (1 kg Daal Mash = Rs. 800); each supplier purchase of its main raw ingredient gets its own recipe calculation (5 kg → Rs. 4,000; a separate 8 kg → Rs. 6,400), kept apart from the total raw stock, for all prepared items. Decisions: fixed on the bill's day (main ingredient at that bill's price, the others at that day's prices); a recipe changed later leaves old purchases on their recipe; bills from before P3 are shown worked out now, marked "today's prices"; the last 5 per card with Show all. Bill preview before saving, a summary card after saving (stays until Done), Purchases on every cooked card, Recent purchases (last 5). Nothing is cooked, saved to stock or taken from it; the khata changes only by the bill | Active (P3 approved 2026-11-08: "Approve, commit karo"; P4 after his approval) |
| 2026-11-08 | Owner's integration brief ("Complete Module Integration, Automatic Recipe Scaling, Inventory & Cooking Automation"): audit shown (all modules already use ONE demo store; missing: menu ↔ prepared-item link, stock use from sales, cooked stock, cooking batches, wastage; Chicken Biryani was only an inventory item, the POS lists menu products). Plan I1–I7 approved ("Approve, I1 karo") with 5 decisions: (1) cooked-to-order dishes take stock at kitchen READY (keeps 2026-11-04); (2) a raw ingredient shared by two dishes (rice: Biryani, Zeera Rice) is split per dish by the owner, else Auto Cooking waits for him; (3) DEMO Auto Cooking runs only while a Restaurant OS tab is open, a late run is labelled late; a real schedule is a backend job (Phase 4+); (4) portions Full plate 250 g / Half plate 125 g, changed per dish; (5) the one-pot mixed line (1 kg + ½ kg) stays, separate lines keep their own notes and the kitchen shows their total. Replaces "no cooking module / no daily cooking buttons" (2026-11-07) and takes Wastage off hold (raw and prepared, step I5). "Buying is never cooking" stays: a purchase only plans a batch. Steps I1 → I7, each after his approval | Active |
| 2026-11-08 | I1 built (DEMO): one product, made once. Prepared Items → **Sell on POS** links the menu product that is the same dish ("Cooked Daal Mash" ↔ "Daal Mash") or makes it once (POS category or a new one, station, sizes, prices, portion of the dish per size); each size's recipe becomes its portion of the cooked dish (verified, old versions kept), `MenuItem.preparedItemId`; a new prepared recipe asks "Do you sell it on the POS?" at once. A menu name is unique in the whole Menu (was: per category). Menu rows show the recipe state, "From …" and a Recipe button; Add Item offers "Add recipe now"; Recipes → Menu items has Add Recipe with a menu-product list. No stock is taken yet (I3–I4) | Active (approved 2026-11-08: "Approve, commit karo") |
| 2026-11-08 | Owner (screenshots, I1 review): plate and packing sizes mix like weights — Full plate + Half plate tapped together is ONE bill and kitchen line ("Full plate + Half plate", sum of the prices), and weights and plates of one dish mix too (Biryani "1 kg + Full plate"). Small / Medium / Large stay one size per line (2026-11-07). Also in Sell on POS: sizes, prices and portions editable when linking (saved to the Menu), quick sizes Full plate, Half plate, 1 kg, ½ kg, Pao (250 g), Other (e.g. 300 g) | Active (approved 2026-11-08: "Approve, commit karo") |
| 2026-11-08 | Owner approves Integration I1 ("Approve, commit karo"): committed locally, not pushed. Next only after his approval: I2 (order lines keep the size id, add-on ids and recipe version) | Active |
| 2026-11-08 | Integration I2 built (DEMO, "I2 shuru karo"): every new order line keeps its size id (`variantId`), add-on ids (`modifierIds`) and the VERIFIED recipe version of each part (`recipeVersions`, keys "item:<size>" / "addon:<id>"; a part without a verified recipe is left out = Not tracked), so stock use (I4) follows the recipe of the order's day. Old lines keep no ids (no data version change). The kitchen ticket shows the total of a dish that is in two or more lines ("Total Chicken Karahi: 1.5 kg"; plates counted "3 × Full plate + 1 × Half plate"); each line keeps its own note (decision 5). Screens otherwise unchanged | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-08 | Owner's KDS brief and picture: Kitchen / KDS redesigned for a budget 10–12k PKR Android tablet in landscape (UI only). Red title bar (name, sound, out of stock, full screen, time), station chips with counts, three coloured columns New (red) / Preparing (amber) / Ready (green), compact cards (~30 % lower): order number, type, table, timer; item, size chip (1 kg, ½ kg, 300 g, Full plate), quantity, add-ons, notes; Start / Ready 96 × 48 px beside the items; a progress bar while preparing; long tickets show 3 lines and "+ n more". Ticket statuses, Undo, sound, out of stock and data unchanged. Not copied from the picture: a "Served" button in Ready (serving stays with the Service Waiter; the kitchen keeps Undo) and a Wi-Fi icon (sync is DEMO, nothing to show) | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-09 | Owner's KDS brief 2 (audit, then his revised plan approved: "Approve, shuru karo"): **Ready, Picked up and Served are three separate steps.** The kitchen marks Ready; the waiter confirms Picked up on his phone for dine-in (Service Waiter or Super Waiter, Owner / Manager too), the rider's "On the way" and the counter's "Picked up" count as pickup for delivery and takeaway; Served stays the waiter's own step at the table and is never automatic. Ready is told to the Service Waiter AND the Super Waiter of the order. A picked-up card stays 5 minutes ("Picked up · name · hides in 4:12") with Undo, then hides (from the saved time, so it never comes back after a refresh); nothing is deleted. Food nobody picks up stays, with a red warning and one reminder to the waiters after 10 minutes. No new status: the ticket keeps `pickedUpAt` / `pickedUpBy` (`PICKUP_VISIBLE_MS`, `READY_REMINDER_MS` in `packages/shared/src/kitchen.ts`, a branch setting later). Cards ~30 % lower again; full screen enters and leaves, folds the sidebar and top bar away, asks Android for landscape and explains a browser that refuses | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-09 | Owner approves Integration I2, the KDS design and KDS v2 (Ready → Picked up → Served) together ("Approve, commit karo"): committed locally (`93114fd`), not pushed. Next only after his approval: I3 (cooked stock + Cooking Batch) | Active |
| 2026-11-09 | Owner's I3 brief + "Smart Pre-Cooking Stock Alert" brief: audit and revised plan C1–C6 with 8 decisions approved ("Approve, I3 shuru karo"): cooked stock counted in kg inside, plates on screen (plate size per dish, default 250 g); a batch is refused while an ingredient is short; actual output can be corrected and a batch reversed (reason, Owner / Manager) while its cooked food is still in stock; batches and the plan by Owner / Manager (chef later through Role Permissions); Stock → Cooking Plan tab + an Overview card; a daily plan per dish, changed for any date; check times 20:00 for tomorrow and 07:00 for today, changed in Settings → Notifications & Alerts (Owner); the shortage goes onto each supplier's draft bill, rounded up to whole purchase units. Built (DEMO): Cook dialog (verified recipe × amount of the main raw ingredient or × batches, loss included, expected vs actual output in kg or plates, cost, cost a kg / plate), COOK_USE / COOKED movements with the batch, one save per key, cooked stock and batch history on each prepared card, Stock list "Cooked food", the plan's needs added up against usable stock (expired = none) with Short / Low stock badges apart, an alert to Owner / Manager at the check times (bell, sound, voice), draft bills from the plan, recheck after a saved bill. A real scheduled alert to a phone needs the backend; SMS / WhatsApp are paid services needing approval | Active (approved 2026-11-09: "Approve, commit karo") |
| 2026-11-09 | Owner approves Integration I3 ("Approve, commit karo"): committed locally (`8f6f79f`), not pushed. Next only after his approval: I4 (sales take stock at kitchen READY: cooked-to-order dishes by the verified recipe, dishes sold from a cooked pot from cooked stock by the size portion; void / cancel rules; never twice) | Active |
| 2026-11-09 | Owner's I4 ("Step 14") brief: plan with 5 decisions, then his reuse rule ("Changes"), revised plan with 9 decisions approved ("Approve, I4 shuru karo"): stock is taken ONCE per order line at the kitchen's READY (an auto-ready station: when sent) by the recipe version the line kept; each recipe line from its own stock (raw from raw, a cooked dish from its cooked stock: a cooked dish's raw ingredients left at cooking and are never taken again); kitchen Undo gives it back; nothing at Send, Hold, Picked up, Served or Paid; refunds and payment corrections never touch stock. (1) Cooked stock may go below zero with an alert to record the Cooking Batch; (2) food made and then cancelled or voided is never wastage by itself: not served and safe → **Available Prepared Food** (with a safety tick), a pot dish or bottle → back to stock, served or unsafe → wastage with a reason; (3) a dine-in bill paid before Ready takes the stock then; (4) no back-fill of older orders; (5) optional recipe lines are not taken; (6) per menu product "give to another order" with safe hours (default ON for Karahi, Handi, BBQ, Fish, 3 hours, never overnight; never for a dish sold from a pot); (7) only the same dish, size and add-ons, 1 kg never split, the kitchen gives it with "Give this" after a safety check, raw stock is not taken again and the same food is never given twice; (8) closing review at 23:00 (Settings, Owner) to Owner / Manager: keep for tomorrow where allowed, staff meal (apart), or wastage with a reason; (9) an order cancelled while cooking: the kitchen chooses Finish & keep or Stop (spoilt = wastage). Built as DEMO; a small cooked-food wastage record comes before I5 | Active (built, waiting for his review) |

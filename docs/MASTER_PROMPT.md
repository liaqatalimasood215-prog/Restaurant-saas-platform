# Lala Restaurant OS — Master Developer Prompt & Requirements

**Version:** 2.1 · **Date:** 2026-10-27 · **Owner:** Liaqat Ali
**Status:** Approved baseline (owner, 2026-10-27) — UI first. Current: Phase 1 (Restaurant OS UI
prototype). Development order and gates: `PROJECT_RULES.md` §15.

> **Yeh document kya hai? (Roman Urdu)**
>
> Yeh **Lala Restaurant OS** ka poora naqsha hai: kya banana hai, kaun kya kar sakta hai, order
> kaise chalta hai, bill kaise banta hai, data kahan save hota hai, aur har phase kab "mukammal"
> mana jayega. Claude Code isay `PROJECT_RULES.md` ke saath parh kar kaam karta hai.
>
> **Kaise use karein:**
>
> 1. Claude Code har session mein `CLAUDE.md` khud parhta hai, aur woh isay yahan tak le aata hai.
> 2. Claude Code ko ek waqt mein sirf **ek phase** dein. Tayyar prompts §17 mein hain.
> 3. Pehle teeno apps ka **design (DEMO)** banega aur aap har ek ko approve karenge. Phir asli
>    backend aur database judenge.
> 4. Nayi idea ho to pehle is document mein likhwayein (kis phase mein), phir banwayein.
> 5. Project ke beech mein AI tool mat badlein.
> 6. Jahan "assumption" likha hai, woh andaza hai. §16 mein confirm ya change karein.

---

## 0. Instructions to the AI developer (read first)

You are a senior full-stack engineer and product architect building **Lala Restaurant OS**.
The owner runs a restaurant and is a beginner at software. Deliver working, tested software in
small, verifiable steps, and never present a prototype as working software.

1. Read `PROJECT_RULES.md` and this document before writing code. Inspect the existing project
   first; never restart it and never delete working code.
2. Build only the current phase (`PROJECT_RULES.md` §15). Do not start the next phase until its
   gate is passed and the owner has approved.
3. Phases 1–3 are UI prototypes: use the demo adapter and DEMO data (§3.5). Never claim that a
   screen is connected to the backend when it is not.
4. ONE backend and ONE database for all apps (from Phase 4). Never create a second database, a
   second order system, or per-app copies of orders.
5. Label every feature: REAL / VERIFIED, DEMO / PROTOTYPE, NOT CONNECTED, PLACEHOLDER, BLOCKED
   (§15.3). Never invent test results, previews, deployments or integrations.
6. Enforce restaurant, branch and role permissions on the server. Never trust the browser.
7. If something is unclear or two requirements conflict, ask the owner one short question with a
   recommended answer. Small technical choices: decide yourself and mention them in the report.
8. Never connect a paid service (SMS, WhatsApp API, email, AI, voice, maps, payment gateway)
   without explaining the monthly cost and getting the owner's approval.
9. Never commit secrets. Change the database only through Prisma migrations.
10. Code, comments and docs in English. Explain progress and decisions to the owner in very easy
    Roman Urdu, using the report template in §15.4.

## 1. App overview

I want you to build **a restaurant operating system with a connected customer ordering app and
rider app** for **restaurants in Pakistan — first my own restaurant (pilot), then many restaurants
on a monthly subscription (SaaS)**.

| App | Folder | Used by | Purpose |
|---|---|---|---|
| **Restaurant OS** | `apps/restaurant-os` | Owner, Manager, Cashier, Waiter, Kitchen | Run the restaurant: tables, waiter orders, kitchen screens, billing, online orders, riders, menu, staff, reports |
| **Customer Online App** (PWA) | `apps/customer` | Customers | Browse the menu, order delivery or pickup, track the order live |
| **Rider App** (PWA) | `apps/rider` | The restaurant's own riders | Receive assigned deliveries, update status, record cash collected |
| **Platform Admin** (Phase 9) | `apps/admin` | Platform owner | Onboard restaurants, plans, monthly subscriptions |

**Main problem:** restaurants lose time, money and orders because dine-in service, the kitchen,
billing, phone/online orders and riders run on paper slips, shouting and disconnected apps.

**Solution:** every order is ONE digital record that moves through the restaurant in real time.
The server calculates every bill, every important action is logged, and the owner sees everything
live. The first working product serves one restaurant; the design is SaaS-ready from day one.

## 2. Context

### 2.1 How restaurants work today (the pain)

- Waiters write orders on paper and walk to the kitchen and the cashier. Slips get lost or
  misread; items are forgotten.
- The kitchen has no clear queue; waiters keep asking "Is Table 5 ready?".
- The cashier adds up the bill by hand or re-types it into a separate POS → mistakes, and food
  that was served but never billed.
- Phone and WhatsApp delivery orders are written on paper; customers call again and again to ask
  where their order is.
- Riders' cash-on-delivery money is not tracked properly.
- Many restaurants have no online ordering of their own, depend on delivery apps with high
  commissions, and don't own their customer data.
- The owner can't see what is happening right now and has no reliable daily sales report.
- Existing POS software is often expensive, complicated, desktop-only, and not connected to online
  ordering or riders.

### 2.2 How Lala Restaurant OS solves it

- The waiter takes the order on a phone → it reaches the right kitchen station instantly → the
  waiter is alerted when it is ready → the cashier already has the exact bill
  ("Table 5 — Rs. 5,900").
- Online and phone orders flow into the same POS and kitchen; the restaurant's own riders deliver;
  the customer tracks every step without refreshing.
- The owner sees live tables, orders and today's sales. Voids, discounts and refunds need
  permission and are logged.

### 2.3 Goals

1. **Pilot:** run the owner's restaurant on it every day.
2. **Own online ordering:** direct orders from the restaurant's customers, without commission.
3. **Own riders** managed in the same system.
4. **SaaS:** sell to many restaurants on a monthly subscription; each restaurant's data is fully
   separated.
5. **Later:** staff and payroll, inventory and suppliers, analytics, AI manager, online payments,
   offline operation, native apps.

### 2.4 Users

| User | Device | Needs |
|---|---|---|
| Owner | Phone / laptop | Live overview, control over voids, discounts and refunds, daily report, simple setup |
| Manager | Phone / tablet | Run the shift, approve voids/discounts/refunds, menu availability, riders |
| Cashier | Laptop / tablet + receipt printer | Fast billing and payments, online-order alerts, rider assignment |
| Waiter | Own Android phone | Very fast order taking with big buttons, "food ready" alerts |
| Kitchen staff | Tablet or TV per station | Big clear tickets, sound for new orders, one-tap Start / Ready |
| Rider | Own phone, on a bike | Very simple delivery list, call and map buttons, cash to collect |
| Customer | Phone, sometimes slow internet | Quick ordering, clear prices, live status |
| Platform owner | Laptop | Restaurants, subscriptions, support |

### 2.5 Assumptions (change in §16 if wrong)

Android phones are common; staff can use basic apps; some staff prefer Urdu; internet is usually
available but can be slow or drop; currency PKR; time zone Asia/Karachi; cash is the most common
payment; restaurants stay open after midnight.

## 3. Product structure and architecture

### 3.1 One monorepo

```
restaurant-saas-platform/       (repository folder of Lala Restaurant OS)
├── CLAUDE.md                   entry point loaded by Claude Code every session
├── PROJECT_RULES.md            rules, development order, statuses, decision log
├── README.md                   feature status table + progress log
├── apps/
│   ├── restaurant-os/   Next.js — staff software, role-based: Tables, Waiter (mobile),
│   │                    Kitchen Display, Cashier/POS, Orders, Menu, Online App panel (with
│   │                    Customer App preview), Riders panel (with Rider App preview),
│   │                    Staff, Reports, Settings
│   ├── customer/        Next.js PWA — the real customer app. ONE deployment for ALL
│   │                    restaurants: <domain>/<restaurant-slug>/<branch-slug>
│   ├── rider/           Next.js PWA — the real rider app. ONE deployment for all restaurants
│   └── admin/           Next.js — Platform Admin (Phase 9)
├── backend/api/         NestJS + Prisma + Socket.IO — the ONLY backend (Phase 4)
├── packages/shared/     order types/statuses/transitions, roles/permissions, money and
│                        pricing functions, real-time names, shared types
└── docs/                MASTER_PROMPT.md (this file), AI_MANAGER_PLAN.md
```

Waiter and Kitchen screens are role views inside Restaurant OS (same login), installable as a PWA
on the waiter's phone or the kitchen tablet.

### 3.2 Management and preview sections vs real apps

| Page inside Restaurant OS | Manages / previews | Separate real app |
|---|---|---|
| Online App | Product online ON/OFF, online orders ON/OFF, link, QR code, live preview of the Customer App, Open Full App button | `apps/customer` |
| Riders | Add/disable riders, assignments, cash to settle, preview of the Rider App, Open Full App button | `apps/rider` |

From Phase 5, a change on these pages shows in the real app within 2 seconds, because both use the
same backend and database. Until the real app exists (Customer App: Phase 2, Rider App: Phase 3),
the preview and the Open Full App button are clearly labelled PLACEHOLDERS.

### 3.3 Architecture rules

- Apps talk only to `backend/api` (REST + Socket.IO). No app connects to the database directly.
- The database is the source of truth. Real-time events only tell screens to reload data from the
  API.
- Every business table has `restaurant_id`; branch-level tables also have `branch_id`. All ids are
  UUIDs.
- For staff, `restaurant_id` and `branch_id` come from the login token — never from the request
  body or URL. A record of another restaurant is answered with "not found".
- Customer and Rider apps are reusable for every restaurant (slug in the URL). Custom domains later.
- **Trusted pricing engine:** the backend calculates all money with the functions in
  `packages/shared`; numbers from the browser are display-only.
- One modular NestJS application (modules per feature). No microservices.

### 3.4 Current state of the code

The live status of every part is in `README.md`. Phase 1 started on 2026-10-27 on the owner's
computer (`C:\Users\ADMIN\Projects\restaurant-saas-platform`, local Git, not pushed). Package
downloads work there. Keep the repository in a short folder path: Windows cannot create files with
paths longer than 260 characters, which breaks `node_modules`.

### 3.5 UI first without rebuilding (Phases 1–3)

```
screen → hooks (useTables, useOrders …) → ApiClient interface (src/lib/api)
                                            ├── DemoAdapter   Phases 1–3: in-memory DEMO data
                                            └── HttpAdapter   Phase 4+:   real API + Socket.IO
```

- Screens never import demo data directly. Switching from DemoAdapter to HttpAdapter must not
  require changing screens.
- The ApiClient methods and data types follow §6 and §9 (types live in `packages/shared`), so the
  backend later implements the same contract.
- Prototype totals use the shared pricing functions, so the Table 5 bill already shows Rs. 5,900
  in DEMO.
- Simulated updates between screens (e.g. two tabs in one browser) are labelled
  "DEMO sync — not real-time".
- A demo "switch role" menu replaces login in Phases 1–3 and is labelled DEMO.
- Every prototype screen shows a **DEMO / PROTOTYPE** badge; the README lists every screen with
  its status.

## 4. Roles and permissions

Roles: **OWNER, MANAGER, CASHIER, WAITER (Super Waiter), SERVICE_WAITER (Service Waiter), KITCHEN,
RIDER.** Platform admins are a separate type of user (Phase 9). Further staff roles (e.g. Admin,
Inventory Staff, Finance Staff) are a future idea and need an explicit update of this matrix first
(§16 #17).

- The Owner works across all branches of their restaurant; everyone else belongs to one branch.
- Kitchen users (chefs) are linked to one or more stations (or all stations) and see only those
  tickets.
- Waiters can be assigned tables (empty = all tables). A Service Waiter sees only the assigned
  tables and gets their food-ready notifications (owner, 2026-10-28).
- Riders can use only the Rider App; staff can use only Restaurant OS.
- A disabled user cannot log in, and their existing sessions stop working immediately (checked on
  every request). Nobody changes their own role; the Owner or a Manager does it in Staff.
- Each role sees only its own sections. Home screen by role: Super Waiter → Tables, Service
  Waiter → Ready to Serve, Kitchen → Kitchen Display, Cashier → POS, Owner/Manager → POS / New Bill
  (owner, 2026-10-28).

| Action | Owner | Manager | Cashier | Super Waiter | Service Waiter | Kitchen | Rider |
|---|---|---|---|---|---|---|---|
| Open table, add items, send to kitchen | ✓ | ✓ | ✓ | ✓ | | | |
| Request bill / call cashier | ✓ | ✓ | ✓ | ✓ | ✓ (own tables) | | |
| Accept a bill request, print the pre-bill | ✓ | ✓ | ✓ | | | | |
| Void an item after sending (with reason) | ✓ | ✓ | | | | | |
| Start / Ready / Undo kitchen tickets (own stations) | ✓ | ✓ | | | | ✓ | |
| Mark served | ✓ | ✓ | | ✓ | ✓ (own tables) | | |
| Mark item out of stock | ✓ | ✓ | ✓ | | | ✓ | |
| Give discount (with reason) | ✓ | ✓ | | | | | |
| Record payment and tip, print/reprint receipt | ✓ | ✓ | ✓ | | | | |
| Refund or reverse a payment (with reason) | ✓ | ✓ | | | | | |
| Accept/reject online orders, phone and takeaway orders, assign rider | ✓ | ✓ | ✓ | | | | |
| Cancel order (with reason) | ✓ | ✓ | delivery/takeaway, before the kitchen starts | | | | |
| Picked up / Delivered / cash collected | | | | | | | own orders only |
| Settle rider cash | ✓ | ✓ | ✓ | | | | |
| Mark a table for cleaning / clean again | ✓ | ✓ | ✓ | ✓ | ✓ (own tables) | | |
| Menu, areas and tables (Manage Areas, Add Table, edit, out of service, remove), stations; Online App and Riders pages | ✓ | ✓ | | | | | |
| Staff management (incl. waiter type and assigned tables) | ✓ | ✓ (not Owner/Manager accounts) | | | | | |
| Payroll (Phase 8) | ✓ | | | | | | |
| Money reports | ✓ | if the Owner allows | | own tips | own tips | | own cash |
| Settings (tax, service charge, receipt, business day) | ✓ | | | | | | |

## 5. Core workflows

"Pilot" = part of the pilot release, built through Phases 1–6.

### 5.1 Dine-in — Pilot (the owner's main daily flow)

1. The waiter opens **Tables** on a phone: tables by area, coloured Free / Occupied /
   Bill requested, with running total and time seated.
2. Taps **Table 5** → number of guests → adds items: category → item → size → add-ons →
   note ("no onion") → quantity.
3. Taps **Send to kitchen**. The server creates the table's order (if none is open) and
   **round 1**, then splits the items into **kitchen tickets by station** (e.g. Pizza Oven,
   Grill & Fry, Hot Kitchen). Bottled drinks go to an "auto-ready" Drinks station.
4. Each station's Kitchen Display shows its ticket instantly with a sound. The cashier sees Table
   5's running bill instantly.
5. The kitchen taps **Start**, then **Ready**. The **Service Waiter** of that table gets a
   notification with the table number, items and quantities — "T5 — Pizza Oven ready: 2 × Classic
   Pizza (Medium)" (sound + vibration). Without a Service Waiter for the table, the Super Waiter who
   took the order is notified. Items that are ready can be served while others still cook.
6. The waiter serves and taps **Served** (repeated taps change nothing).
7. Guests order more → the Super Waiter adds **round 2** to the same order → new tickets → same bill.
8. Guests ask for the bill → the waiter taps **Request Bill / Call Cashier** → POS shows
   "T5 requested bill" → the cashier taps **Accept** (or prints the bill) → the waiter sees "Cashier
   accepted the bill request". A customer at the counter can also say "Table 5": the cashier finds
   the running bill by table number.
9. The cashier opens Table 5 → total **Rs. 5,900** → **Print Bill** prints the pre-bill ("NOT A
   RECEIPT"; the order is not paid by this) → discount if allowed → records payment (cash / card /
   wallet; can be split) and tip → order **PAID** with an invoice number → **Print Receipt** →
   table becomes **Free**.
10. The owner sees all of this live and in today's summary.

Rules: before sending, items can be changed freely. After sending, only the Owner or Manager can
**void** an item, with a reason (shown as VOID on the kitchen screen, removed from the bill,
logged). Adding a round after the bill was printed reopens the bill. After payment, only the Owner
or Manager can **refund**, with a reason. Move/merge tables and split bill by items come in
Phase 7.

### 5.2 Online delivery or pickup — Pilot

1. The customer opens the restaurant's link or QR → menu → cart → checkout (name, phone, address
   or pickup, note) → **Cash on Delivery / Pay at pickup** → private tracking link.
2. Restaurant OS rings with a **repeating alarm** until the cashier **Accepts** (choosing prep
   time, e.g. 30 min) or **Rejects** (with reason). Advice: call the customer before accepting if
   an order looks fake.
3. Kitchen tickets by station, as in dine-in. The order becomes PREPARING when the first ticket
   starts and READY when all tickets are ready — automatically.
4. Delivery: the cashier assigns an active rider → Rider App alert → **Picked up – On the way** →
   **Delivered** + cash collected. Pickup: the cashier marks **Picked up**.
5. The tracking page updates at every step without refresh.
6. At the end of the shift the cashier **settles each rider's cash**.

### 5.3 Phone delivery order — Pilot

The cashier creates a delivery order in the POS (customer phone → previous name and address are
filled in automatically) → it starts as ACCEPTED → same flow as §5.2 from step 3. The cashier can
send the tracking link through WhatsApp click-to-chat (opens WhatsApp with a ready message — free).

### 5.4 Takeaway at the counter — Pilot

The cashier creates a takeaway order, takes payment before or after, kitchen tickets → READY (call
the daily order number) → **Picked up**.

### 5.5 Online App page — Pilot

Product Online ON/OFF, Online orders ON/OFF, delivery fee, minimum order, default prep time,
customer link, QR code, live preview of the Customer App and an **Open Full App** button. From
Phase 5, changes show in the Customer App within 2 seconds, and the server enforces them. In
Phase 1 the preview and the button are PLACEHOLDERS (the Customer App is built in Phase 2).

### 5.6 Riders page — Pilot

The Owner or Manager adds a rider (name, phone, password), sets Active/Disabled, sees each rider's
current deliveries and cash to settle, and sees a preview of the Rider App with an **Open Full App**
button. No public rider signup. In Phases 1–2 the preview and the button are PLACEHOLDERS (the
Rider App is built in Phase 3).

### 5.7 End of day

- Pilot: **Today's summary** — sales by order type and payment method, refunds, number of orders,
  tips per waiter, top items, voids and discounts with who and why.
- Phase 7: shifts with opening and closing cash count and differences; reports and analytics.

## 6. Order engine

### 6.1 Concepts

| Term | Meaning |
|---|---|
| Order | One per table visit, delivery or takeaway. Has type, channel, status, totals, payments. |
| Order item | Menu item + size + add-ons + note + quantity, with name and prices **copied** at order time. |
| Round | A batch of items sent to the kitchen together. A dine-in order can have many rounds. |
| Kitchen ticket | The items of one round for one station. The kitchen works on tickets, not whole orders. |
| Payment | Money received for an order. An order can have several (cash + card). Tips are recorded with the payment but are not sales. |
| Refund / reversal | A new money entry that gives money back or corrects a mistake. The original payment is never changed. |

### 6.2 Types and channels

- `type`: **DINE_IN**, **DELIVERY**, **TAKEAWAY**
- `channel`: **WAITER**, **POS**, **CUSTOMER_APP**, **PHONE**

### 6.3 Order statuses by type

```
DINE_IN   OPEN → BILL_REQUESTED → PAID
          BILL_REQUESTED → OPEN          (a new round was added)
          OPEN → PAID                    (paid without a pre-bill)
          OPEN / BILL_REQUESTED → CANCELLED   (reason; only if no payment)

DELIVERY  PLACED → ACCEPTED → PREPARING → READY → RIDER_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED
          PLACED → REJECTED              (reason)
          ACCEPTED … RIDER_ASSIGNED → CANCELLED   (reason)

TAKEAWAY  PLACED → ACCEPTED → PREPARING → READY → PICKED_UP
          PLACED → REJECTED              (reason)
          ACCEPTED … READY → CANCELLED   (reason)
```

- Orders created by staff (phone, counter) start at ACCEPTED.
- ACCEPTED → PREPARING and PREPARING → READY are set **automatically** from the kitchen tickets.
  PREPARING starts when a cook starts a ticket; auto-ready tickets (bottled drinks) do not count.
- Delivery: cash on delivery is recorded when the rider marks Delivered, then settled by the
  cashier. Takeaway: paid at the counter before or after.
- Refunds do not change the order status; they are separate money entries (§8).

### 6.4 Kitchen ticket statuses

`NEW → PREPARING → READY → SERVED` (SERVED is used for dine-in only).

- Undo: READY → PREPARING within 2 minutes (for mistakes). If a delivery or takeaway order is
  already READY, the undo moves the order back to PREPARING automatically. Undo is not possible
  after a rider is assigned or the order is picked up.
- A ticket whose items were all voided shows "VOID — do not cook" on the kitchen screen for 2
  minutes and then leaves it; it never blocks the order from becoming READY.
- Pressing a ticket button twice (double tap, retry) is harmless: asking for the status a ticket
  already has changes nothing.
- "Auto-ready" stations (e.g. bottled drinks) create tickets that are READY at once.
- Delivery/takeaway tickets leave the screen when the order is OUT_FOR_DELIVERY or PICKED_UP.
- Every ticket shows a timer; it turns orange after `warn_minutes` and red after `late_minutes`
  (per station, default 10 and 20).

### 6.5 Who may change what

| Change | Who |
|---|---|
| Dine-in: create order / add a round (Send to kitchen) | Owner, Manager, Cashier, Waiter |
| Dine-in: → BILL_REQUESTED (Print bill); back to OPEN when a round is added | Owner, Manager, Cashier, Waiter |
| Dine-in: → PAID (payments ≥ total; the table becomes Free) | Owner, Manager, Cashier |
| Dine-in: → CANCELLED (reason, no payments) | Owner, Manager |
| Online order: → PLACED | Customer |
| Phone / counter order: created as ACCEPTED | Owner, Manager, Cashier |
| PLACED → ACCEPTED (with prep time) / REJECTED (with reason) | Owner, Manager, Cashier |
| ACCEPTED → PREPARING → READY | Automatic, from kitchen tickets |
| READY → RIDER_ASSIGNED; change rider before pickup | Owner, Manager, Cashier (active rider of the same branch) |
| RIDER_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED | The assigned rider only |
| Takeaway: READY → PICKED_UP | Owner, Manager, Cashier |
| Delivery/takeaway → CANCELLED (reason) | Cashier while ACCEPTED; Owner and Manager until OUT_FOR_DELIVERY / PICKED_UP |
| Ticket: NEW → PREPARING → READY; Undo within 2 minutes | Kitchen (own station), Owner, Manager |
| Ticket: READY → SERVED | Waiter, Owner, Manager |
| Refund / reversal (reason) | Owner, Manager |

### 6.6 Engine rules

- Only the changes above are allowed; anything else is rejected with a clear message.
- Each change runs in one database transaction and writes a history row (who, when, from, to,
  reason).
- Every change checks the current status first, so two people cannot do the same step twice.
- **Idempotency keys** on Send to kitchen, Place order, Record payment, Refund and Assign rider:
  double taps and network retries never create duplicates.
- Numbers: a short **daily order number** per branch (#1, #2 … restarts every business day) for the
  kitchen and customers, and a permanent **invoice number** per branch, given when the order is
  paid — sequential and never reused.
- **Business day:** each branch has a day start time (default 06:00), so sales after midnight count
  for the previous business day.
- A table's status is **derived** from its open order (Free / Occupied / Bill requested), never
  stored twice. Two states belong to the table itself: **Cleaning** (a flag set by floor staff,
  cleared by "Table is clean" or when the next guests are seated) and **Out of service** (the table
  is not in service: shown on the Tables board, but no new bill can be opened). An open bill always
  wins over both.

### 6.7 Real-time (Phase 5)

| Room | Who joins | Used for |
|---|---|---|
| `branch:{branchId}` | Owner, Manager, Cashier and Waiters of the branch | Tables, orders, bills, payments |
| `station:{stationId}` | Kitchen screens of that station | Tickets |
| `waiter:{userId}` | One waiter | "Food ready" alerts |
| `rider:{userId}` | One rider | Assignments |
| `track:{trackingToken}` | One customer's tracking page | Status of that order |
| `menu:{branchId}` | Customer App | Item and online-orders ON/OFF |

- Events: `order.created`, `order.updated`, `ticket.created`, `ticket.updated`,
  `payment.recorded`, `menu.updated`, `branch.updated`.
- The server checks permission before a connection joins any room.
- Updates appear on other screens within **2 seconds**. After reconnecting, screens reload their
  data from the API.

## 7. Features by app

"Pilot" = built through Phases 1–6 (UI in Phases 1–3, connected in Phases 4–5). P7–P11 = later
phases (`PROJECT_RULES.md` §15).

### 7.1 Restaurant OS

Layout: left sidebar on tablet/desktop, bottom navigation on phones; header with branch, user,
connection dot (green/red) and alerts bell. Sections outside the current phase show "Coming Soon"
(PLACEHOLDER).

Navigation (owner, 2026-10-27):

- The sidebar stays visible on tablet and desktop. Each sidebar feature opens its own screen; the
  main workspace shows only the selected feature (never several features on one screen).
- Sidebar order, most-used first (owner, after Preview 1): POS / New Bill, Tables, Orders, Online
  Orders, Waiter Orders, Kitchen / KDS, Menu, Online App, Riders, Staff, Today's Summary, Settings.
  Below them a "Coming Soon" group: Dashboard,
  Customers, Finance & Reports, Inventory & Suppliers, Payroll, AI Manager (PLACEHOLDER, with
  their phase).
- POS / New Bill is the default home for Owner and Manager (owner, 2026-10-28). Cashier → POS /
  New Bill, Waiter → Tables, Kitchen → Kitchen / KDS.
- The owner's design pictures are a visual reference (brand red, white cards, spacing, sidebar)
  and show the future vision; they never expand the current phase. Menu photos come in P7.

| Module | Phase | Requirements |
|---|---|---|
| Login | Pilot | Phone + password, redirect by role, rate-limited, clear errors (DEMO role switcher in Phases 1–3) |
| Tables | Pilot | Live board with search, area filter and status filter (Free, Occupied, Bill requested, Cleaning, Out of service); compact cards: name, capacity and status, an occupied table also shows its bill, "guests / capacity", waiter, time seated and kitchen progress. Owner/Manager set up areas and tables here (owner, 2026-10-29): **Manage Areas** (add, rename, reorder, deactivate) and **+ Add Table** (one table, or many at once such as T1–T10 with 4 seats each); edit a table's name, area, seats and display order; take it out of service; remove it. Rules: seats are a positive whole number (1–50); a table name is unique inside its area; a table with a running or held bill cannot be removed, taken out of service or moved to another area; an area with running or held bills cannot be deactivated; a removed table that has old bills (or is assigned to a waiter) is archived, never deleted, so old bills keep its name. Tables, POS and Waiter Orders read the same table data. Reservations, merging tables and split bills come later |
| Waiter | Pilot | Mobile; table board → order screen (search, categories, sizes, add-ons, notes, quantity); Send; ready alerts; Served; Print bill |
| Kitchen Display | Pilot | Choose station; columns New / Preparing / Ready; big text; table or order number, type, waiter, notes, VOID marks; timers; sound; Start / Ready / Undo; "out of stock" button |
| Cashier / POS | Pilot | New bill for dine-in, takeaway or delivery (table or customer, menu with sizes and add-ons, Hold and reopen, send to the kitchen); open tables with running bills; bill detail; discount (permission); service charge; tax; payments by several methods; tip; change; refund (permission); print pre-bill and receipt; reprint (marked DUPLICATE, logged) |
| Cashier / POS — online | Pilot | Online orders inbox with repeating alarm; accept with prep time / reject with reason; phone and takeaway orders; assign or change rider; settle rider cash |
| Orders | Pilot | Today's and past orders; search and filter by type, status, table; order detail with full timeline |
| Menu | Pilot | Categories; items with price, sizes, add-on groups, kitchen station, available ON/OFF, online ON/OFF, display order |
| Online App page | Pilot | §5.5, with Customer App preview |
| Riders page | Pilot | §5.6, with Rider App preview |
| Staff | Pilot | Add/edit staff, role, branch, stations, reset password, disable |
| Reports | Pilot | Today's summary (§5.7) |
| Settings | Pilot | Restaurant and branch details, tax, service charge, receipt header/footer, business day start, kitchen stations |
| Dashboard | P7 | Live cards: open tables, running orders, today's sales, late tickets |
| Reports and analytics | P7 | Date ranges; by item, category, waiter, branch, hour; Excel export |
| Menu extras | P7 | Images, bulk price update, import from Excel |
| Customers | P7 | Customer list from orders, order history, phone search |
| Staff and payroll | P8 | Salaries, attendance, advances, payroll runs |
| Inventory, suppliers, expenses | P8 | `docs/AI_MANAGER_PLAN.md` §2–§3 |
| AI Manager | P10 | `docs/AI_MANAGER_PLAN.md` |

### 7.2 Customer Online App (PWA) — Pilot

- Address `<domain>/<restaurant-slug>/<branch-slug>` and a QR code. One deployment serves all
  restaurants.
- Home: restaurant name, open/closed state, categories, search, items with prices (logo and images
  in P7).
- Item: size, add-ons, note, quantity. Cart: edit, subtotal, delivery fee, minimum-order check.
- Checkout: Delivery or Pickup; name, phone, address, note; Cash on Delivery / Pay at pickup.
  Details are remembered on this device (no account needed).
- Tracking page (private link): steps with times, estimated time, "Call restaurant" button, live
  updates.
- Online orders OFF → "Not taking orders right now". Item OFF → hidden. The server also refuses
  both.
- Fast on slow internet (§10.6). English first; Urdu in P7.
- Later: accounts with phone OTP (paid SMS — needs approval), saved addresses, reorder (P7); online
  payment, loyalty and coupons (P11).

### 7.3 Rider App (PWA) — Pilot

- Login with phone + password (RIDER role only). A disabled rider cannot log in.
- My deliveries: customer name with **tap to call**, address with **Open in Google Maps** (a free
  link, no paid maps API), items, **amount to collect**.
- Buttons: **Picked up – On the way** → **Delivered** (confirm cash collected).
- Alert on a new assignment (sound + vibration; web push in P7).
- Today: deliveries done, cash collected, cash settled.
- Availability status (online/offline), requested by the owner on 2026-10-27: scope decided before
  Phase 3 (§16 #16).
- Later (P11): GPS live location, rider applications with owner approval, shared delivery pool.

### 7.4 Platform Admin — P9

Restaurants list; onboarding (restaurant, branch, owner account, plan); plans; subscriptions
(trial, active, past due, suspended); platform invoices and payments — **completely separate from
customer food payments**; suspend/activate; email reminders; usage overview. Platform admin login
requires two-step verification.

### 7.5 AI Manager — P10

Follow `docs/AI_MANAGER_PLAN.md`: read-only first, then drafts with human approval, then limited
automation. Facts and recommendations are labelled; the AI never changes stock, payments or rules.

### 7.6 White-label branding and publishing — future direction (owner, 2026-10-27)

Every restaurant gets its own branded customer experience from the **shared** codebase, backend and
database — never a copied application per restaurant.

| What | Phase |
|---|---|
| Restaurant name, logo, brand colours, website title, contact details, opening hours | P7 (branding), stored per restaurant in the one database |
| PWA name and icons per restaurant | P7, from the same Customer App deployment (`<domain>/<restaurant-slug>/<branch-slug>`) |
| Custom domain per restaurant (e.g. `azizpizza.com` — an example, not a registered site) | P9, optional, mapped to the same deployment |
| Menu and prices | Already per restaurant (Pilot) |

Publishing stages (separate from the numbered development phases):

- **Stage A — websites and PWAs:** branded Customer Websites/PWAs, authenticated Restaurant OS and
  authenticated Rider PWA, after the Phase 6 gate. Private data stays behind login.
- **Stage B — Android apps (P11):** separately branded customer apps (own application ID, name,
  icon and Google Play listing) built from shared code with configurable builds. Before any work:
  review current store policies (including repetitive-content rules), approval requirements,
  developer-account costs and maintenance. Google Play approval is never promised.

## 8. Money, billing and receipts (trusted pricing engine)

- All amounts are whole numbers in **paisa** (Rs. 1 = 100 paisa). The **server** calculates every
  total with the shared functions; prices sent by the browser are ignored.
- Order items keep a copy of name, size, add-ons and prices at order time.

```
items_subtotal = Σ (size or base price + add-on prices) × quantity   (voided items excluded)
discount       = % or fixed amount on items_subtotal                 (reason + permission)
service_charge = service charge % × (items_subtotal − discount)      (dine-in, if enabled)
tax            = branch tax rate × taxable amount                    (see tax settings below)
delivery_fee   = branch delivery fee                                  (delivery only)
rounding       = to the nearest rupee (setting), shown as its own line
total          = items_subtotal − discount + service_charge + tax + delivery_fee ± rounding
tip            = recorded with the payment; NOT sales; credited to the table's waiter or the rider
```

- **Tax settings per branch:** rate; whether menu prices already include tax; whether tax applies
  to the service charge and delivery fee; optional different rate per payment method. The owner
  sets these values — the developer must not guess legal rates.
- **Discounts:** Owner/Manager only, % or fixed, reason required, logged.
- **Payments:** CASH (cash received, change), CARD (external card machine, optional reference),
  WALLET (JazzCash/Easypaisa transfer, reference). Several payments per order. The order is PAID
  when payments ≥ total.
- **Refunds and reversals:** Owner/Manager only, with reason and method; recorded as new entries
  (full or partial); the original payment is never edited or deleted; today's summary shows refunds
  separately; a refund receipt can be printed.
- **Receipts (80 mm):** restaurant name, branch address and phone, tax registration numbers (if
  set), invoice number, daily order number, date/time, table/waiter/cashier or customer, items with
  sizes and add-ons, subtotal, discount, service charge, tax, delivery fee, rounding, total,
  payments, change, tip, footer text, and a QR code to the online menu. Pre-bills are marked
  "NOT A RECEIPT"; reprints are marked "DUPLICATE".
- **Rider cash on delivery:** amount to collect = order total; the rider confirms collection; the
  cashier settles rider cash.
- **Two separate money systems:** customer food payments (customer → restaurant) and subscription
  billing (restaurant → platform). Separate tables, code and screens.
- **Tax authorities:** FBR or provincial authorities (such as PRA, SRB, KPRA) may require integrated
  invoicing for some restaurants. Check the requirements before selling to other restaurants (gate
  in Phase 9).

## 9. Data model (PostgreSQL via Prisma — built in Phase 4)

Every table has `id` (UUID), `restaurant_id` (+ `branch_id` for branch-level data), `created_at`,
`updated_at`. Menu items and staff are deactivated, never deleted. Orders, payments and refunds are
never deleted.

| Table | Key columns | Phase |
|---|---|---|
| `restaurants` | name, slug, status | Pilot |
| `branches` | name, slug, phone, address, timezone, business_day_start, tax settings, service_charge_pct, receipt_header, receipt_footer, online_orders_enabled, delivery_fee, min_order, default_prep_minutes | Pilot |
| `staff_users` | branch_id (empty = all branches, Owner only), name, phone, password_hash, role (incl. WAITER = Super Waiter, SERVICE_WAITER), is_active, token_version | Pilot |
| `staff_tables` | staff_user_id, table_id — assigned tables of a waiter (none = all tables) | Pilot |
| `kitchen_stations` | name, auto_ready, warn_minutes, late_minutes, sort | Pilot |
| `staff_stations` | staff_user_id, station_id | Pilot |
| `areas` | name, sort, is_active | Pilot |
| `dining_tables` | area_id, name (unique per area among tables that are not archived), seats (1–50), is_active (false = out of service), sort (display order in the area), cleaning, archived_at (order status is derived, not stored) | Pilot |
| `menu_categories` | branch_id (empty = all branches), name, sort, is_active | Pilot |
| `menu_items` | category_id, station_id, name, description, base_price, unit (piece / kg / plate / litre), is_available, is_online, sort, image_url (P7) | Pilot |
| `item_variants` | menu_item_id, name (Small / Medium / Large), price, sort | Pilot |
| `modifier_groups`, `modifiers` | group: name, min_select, max_select · modifier: group_id, name, price, is_available | Pilot |
| `menu_item_modifier_groups` | menu_item_id, group_id, sort | Pilot |
| `orders` | type, channel, status, business_date, daily_number, invoice_number, bill_requested_by, bill_requested_at, bill_accepted_by, bill_accepted_at, receipt_prints, table_id, waiter_id, guests, customer_id, customer name/phone/address (copies), rider_id, tracking_token, prep_minutes, items_subtotal, discount_total, service_charge, tax_total, delivery_fee, rounding, total, paid_total, refunded_total, tip_total, payment_status, note, created_by, milestone times | Pilot |
| `order_items` | order_id, menu_item_id, variant_id, copies of name/size/add-ons (JSON), unit_price, quantity, unit (copy), line_total, note, round_no, ticket_id, is_void, void_reason, voided_by, voided_at | Pilot |
| `kitchen_tickets` | order_id, station_id, round_no, status, started_at, ready_at, served_at | Pilot |
| `order_status_history` | order_id, from_status, to_status, changed_by, reason, changed_at | Pilot |
| `payments` | order_id, kind (PAYMENT / REFUND / REVERSAL), method, amount, tip_amount, cash_received, change_given, reference, received_by, related_payment_id, reason, idempotency_key | Pilot |
| `discounts` | order_id, kind (PERCENT / FIXED), value, amount, reason, given_by | Pilot |
| `counters` | branch_id, kind (DAILY_ORDER / INVOICE), period, value — gap-free numbers | Pilot |
| `audit_logs` | actor_id, action, entity, entity_id, before, after, reason | Pilot |
| `idempotency_keys` | key, user_id, route, response (kept 24 hours) | Pilot |
| `customers` | name, phone (unique per restaurant), last_address | Pilot |
| `held_bills` | type, discount (JSON), table_id, guests, customer copies, note, items (JSON drafts), held_by, held_at — POS bills on hold, not orders | Pilot |
| `waiter_calls` | table_id (null = counter call), called_by, called_at — POS "Call Waiter"; the table's waiter is alerted for 15 minutes | Pilot |
| `rider_cash_settlements` | rider_id, amount, order ids, settled_by | Pilot |
| Shifts, printers, customer accounts and addresses | — | P7 |
| Payroll: salary settings, attendance, advances, payroll runs | — | P8 |
| Inventory and purchasing tables | `docs/AI_MANAGER_PLAN.md` §3 | P8 |
| `platform_admins`, `subscription_plans`, `restaurant_subscriptions`, `platform_invoices`, `platform_payments` | — | P9 |
| AI settings, conversations, proposed actions, automation runs | `docs/AI_MANAGER_PLAN.md` §3 | P10 |

## 10. Technical requirements

### 10.1 Platform

Web and mobile, through the web: responsive web apps; Customer, Rider and Waiter installable as
PWAs; Kitchen Display in the browser of an Android tablet or TV; Cashier on a laptop, desktop or
tablet. Native Play Store apps only in P11.

### 10.2 Stack

| Part | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js + TypeScript + Tailwind CSS, one shared UI kit |
| Backend | Node.js + NestJS (one modular app), REST + Socket.IO |
| Validation | Shared schemas (e.g. zod) used by the API and the forms |
| Database | PostgreSQL, hosted on Supabase and used as a database only |
| ORM / migrations | Prisma |
| Login | Own JWT login in NestJS (no third-party auth service) |
| Background jobs (P8–P10) | Postgres-based job queue |
| Hosting | Vercel (each frontend app), Railway (backend), Supabase (database) |
| Files (P7) | Object storage with versioning |
| Code and CI | Private GitHub + GitHub Actions |
| Tests | Unit tests, API tests (Supertest), browser tests (Playwright) |

This stack needs a full-code AI developer (Claude Code). AI website builders that only use their
own backend may be used for visual mockups only, never to rebuild this system.

### 10.3 Login and accounts

- Staff and riders: phone + password (minimum 8 characters), hashed with bcrypt or argon2; login is
  rate-limited with a temporary lockout.
- Short-lived access token + refresh token in a secure httpOnly cookie. In production all apps and
  the API use sub-domains of one domain (e.g. `os.`, `order.`, `rider.`, `api.`) so cookies work
  safely.
- `token_version` on each user: disabling a user or changing a password logs them out everywhere.
- Owner and Manager reset staff passwords (Pilot). Owner password reset by email (P7). Two-step
  verification for owners (P7) and platform admins (P9).
- Customers: no account in the pilot (guest checkout); optional accounts with phone OTP in P7 (paid
  SMS — needs approval).
- Restaurant owner accounts are created during onboarding (P9); until then by the seed script.

### 10.4 Data storage

| What | Where |
|---|---|
| Restaurants, branches, settings, staff, tables, stations, menu, orders, items, tickets, payments, refunds, tips, customers, rider cash, history, audit logs | PostgreSQL (the one database) |
| Menu images and logos (P7) | Object storage with versioning and backup |
| Login session, cart, saved customer details | Browser (convenience data only) |
| Email | Only password reset, verification, invoices, subscription reminders and security alerts — never business data |

Backups: automatic daily backups + a separate encrypted copy in a different place; restore is
tested regularly (first time in Phase 6); point-in-time recovery later.

### 10.5 Notifications

| Who | Event | How | Phase | Cost |
|---|---|---|---|---|
| Kitchen | New ticket, void | Screen + sound | Pilot | Free |
| Waiter | Food ready | In-app sound + vibration | Pilot | Free |
| Cashier | New online order | Repeating alarm until accepted | Pilot | Free |
| Rider | New assignment | In-app sound + vibration | Pilot | Free |
| Customer | Order status | Live tracking page | Pilot | Free |
| Customer | Tracking link | WhatsApp click-to-chat opened by the cashier | Pilot | Free |
| Staff and riders | Alerts while the app is in the background | Web push | P7 | Free |
| Owner | Daily summary | In-app (Pilot); email or WhatsApp (P7) | Pilot / P7 | Free / paid with approval |
| Customer | Status by SMS or WhatsApp message | SMS gateway or WhatsApp Business API | P7+ | Paid — owner approval |

### 10.6 Speed

- Customer menu: first screen in under about 3 seconds on a normal 4G phone, and still usable on
  slow 3G — small pages, compressed and lazy-loaded images (WebP), cached menu data.
- Staff actions: the server usually answers in under 300 ms; other screens update within 2 seconds.
- Waiter and Kitchen screens run smoothly on low-cost Android devices.
- Long lists are paginated; database indexes on (`restaurant_id`, `branch_id`, `status`,
  `created_at`).

### 10.7 Reliability and offline

- **Offline behaviour (pilot, tested in Phase 6):** if the internet drops, a clear "No internet —
  reconnecting" banner; buttons that change data are disabled until the connection returns; data
  reloads on reconnect; no order or payment is lost or duplicated. The pilot restaurant should keep
  a backup internet connection (4G device).
- **Full offline operation (P11, or earlier if the owner decides — §16):** POS and Kitchen keep
  working without internet and sync safely later.
- Health-check endpoint, uptime monitoring and error tracking (free tiers first; paid only with
  approval).
- The audit log records voids, discounts, payments, refunds, reversals, reprints, cancellations,
  settings changes and staff changes.

### 10.8 Security

- Restaurant, branch and role checks on the server for every API call and every real-time room.
- Input validation on every endpoint; safe error messages; rate limits on login, order placement
  and tracking.
- HTTPS only; secrets only in environment variables; private GitHub repository; `.env` is never
  committed.
- Tracking links use long random tokens.
- Automated tests prove that Restaurant A can never read or change Restaurant B's data.

### 10.9 Printing and hardware

- Pilot: receipts, pre-bills and refund slips through the browser's print function with an 80 mm
  layout. Chrome's kiosk printing mode on the cashier computer allows one-click printing.
- P7: kitchen printers (KOT slips), silent printing and cash-drawer opening through a small local
  print bridge.
- Pilot hardware (assumption): cashier laptop or tablet + 80 mm thermal printer; one Android tablet
  or TV per kitchen station (or one screen showing several stations); waiters' own Android phones;
  reliable Wi-Fi + backup 4G.

### 10.10 Language and formats

- English UI first. All UI text lives in translation files from day one, so Urdu (right-to-left,
  Nastaliq font) can be added in P7 without rewriting screens.
- Money is shown as **Rs. 5,900** (as in the owner's design and `formatPaisa` in
  `packages/shared`); dates dd/mm/yyyy; 12-hour time; Pakistani phone numbers (03XX-XXXXXXX); time
  zone per branch (default Asia/Karachi).

### 10.11 Environments, preview and deploy

- **Local** (developer), **Staging** (deploys automatically from `main`, test link for the owner,
  DEMO data), **Production** (the real restaurant). Separate databases; never test on production.
- **Preview during UI phases:** Claude Code on the owner's computer runs `pnpm dev` and the owner
  opens the app in his browser (live preview); Claude Code on the web runs the app in the cloud and
  shares screenshots; once Vercel is connected, every branch gets a preview link.
- Each frontend app is its own Vercel project; the backend runs on Railway; only changed apps are
  deployed (Turborepo). A change in `packages/shared` → test and deploy every app that uses it.
- Database migrations run automatically during the backend deploy; take and verify a backup before
  risky ones.

### 10.12 Testing

- Unit tests: order rules, permissions, money, tax, rounding and refunds (from Phase 1 for shared
  logic).
- API tests with a test database: permissions and restaurant isolation for every endpoint (Phase 4).
- Browser tests (Playwright) with several users at once (waiter, kitchen, cashier, rider, customer)
  to prove real-time updates (Phase 5).
- Screenshots of every prototype screen at phone, tablet and desktop sizes (Phases 1–3).
- CI (GitHub Actions) runs all tests on every push; a failing test blocks deployment.

## 11. UI / UX guidelines

- Simple, clean and beautiful. Follow the owner's reference design: brand red (about `#E31E24`) as
  the main colour, white cards on a light grey background, rounded corners, clear icons, left
  sidebar.
- Mobile-first for Waiter, Customer and Rider; tablet-first for Kitchen and Cashier.
- Big touch targets (at least 48 px); the most common actions take 3 taps or fewer.
- The same status colours everywhere, always with text as well: New = blue, Preparing = orange,
  Ready = green, Served / Delivered / Paid = grey, Late / Rejected / Cancelled / Void = red.
- Kitchen Display: very large text readable from 2 metres, high contrast, optional dark theme,
  screen stays awake, and a "Tap to enable sound" button once per session (browsers block sound
  until the user taps).
- Every screen has loading, empty, error and offline states.
- Ask for confirmation only for risky actions (void, cancel, reject, refund, reversal).
- DEMO / PROTOTYPE and PLACEHOLDER badges are always visible.
- The UI phases are the time to get the design right: changes are cheap before Phase 4.

## 12. Phases and acceptance tests

Order and gates: `PROJECT_RULES.md` §15 (owner decision 2026-10-26: UI first).

### Phase 0 — Foundation and documents (done)

Rules, this document, AI plan, monorepo files, `packages/shared` (delivery rules, 14 unit tests),
schema draft, `CLAUDE.md`. **Gate:** the owner approves PROJECT_RULES.md v2.0 and this document.

### Phase 1 — Restaurant OS UI (prototype)

**Build:** `apps/restaurant-os` with layout (sidebar / bottom navigation), DEMO role switcher, API
client + DemoAdapter (§3.5), and every Pilot screen of §7.1: Tables, Waiter order screen, Kitchen
Display by station, Cashier/POS (running bills, payments, tip, refund, pre-bill and receipt print
layout), online orders inbox with alarm, Orders with timeline, Menu (sizes and add-ons), Staff,
Today's summary, Settings, Online App page and Riders page (their previews show a placeholder until
Phases 2 and 3). Later modules as PLACEHOLDER. First extend `packages/shared` for dine-in, kitchen
tickets, six roles, five statuses and the new sidebar — with unit tests.

**Gate (owner review):**

- Test A can be clicked through in the prototype: round 1 → Rs. 4,200; round 2 → Rs. 5,900;
  Rs. 6,000 cash with Rs. 100 tip → change Rs. 0; Table 5 becomes Free — using the shared pricing
  functions.
- Kitchen view splits tickets by station; the waiter view shows "ready" items.
- Screenshots at phone (waiter), tablet (kitchen, cashier) and desktop sizes.
- Every screen carries the DEMO / PROTOTYPE badge; nothing claims to be connected.
- The owner approves (recorded in the decision log).

### Phase 2 — Customer App UI (prototype)

**Build:** `apps/customer`: home, categories and search, item with size/add-ons/note, cart,
checkout (delivery or pickup, details remembered), order placed, tracking page (simulated steps),
"not taking orders" and hidden-item states, basic PWA install. The Online App page in Restaurant OS
shows this app's preview.
**Gate:** the order flow can be clicked through on a phone; badges visible; owner approval.

### Phase 3 — Rider App UI (prototype)

**Build:** `apps/rider`: DEMO login, my deliveries, delivery detail with call and map buttons and
amount to collect, Picked up – On the way → Delivered + cash confirmation, today's summary. The
Riders page in Restaurant OS shows this app's preview.
**Gate:** the delivery flow can be clicked through on a phone; owner approval.

### Phase 4 — Backend and database integration

**Build:** NestJS API; Prisma schema for all Pilot tables (§9) + first migration; seed (DEMO
restaurant "Aziz Pizza" + a second test restaurant for isolation tests); real login and roles;
restaurant/branch isolation; order engine (§6); trusted pricing engine (§8); audit log;
idempotency. Replace DemoAdapter with HttpAdapter app by app: Restaurant OS dine-in first
(Tests A–C), then online orders and riders (Tests D–E).
**Gate:** Tests A–E pass for data, money and permissions. The "without refresh within 2 seconds"
parts are checked in Phase 5. Only features that passed are marked REAL / VERIFIED.

### Phase 5 — Real-time synchronisation

**Build:** Socket.IO rooms and events (§6.7) with permission checks; every screen updates without
refresh; reconnect reloads data.
**Gate:** Tests A–E pass as automated browser tests with several users at once, including the
2-second updates.

### Phase 6 — Security, reliability, offline behaviour, production readiness → pilot

**Build and check:** security and isolation tests for every endpoint and room; rate limits; secrets
check; backup + restore test; internet-drop tests (banner, no lost or duplicate orders, payments or
refunds); speed check on a low-cost phone; staging deploy; production deploy with the real menu;
pilot in the owner's restaurant.
**Gate:** the owner signs off the pilot. Pilot problems are fixed before new features.

### Phase 7 — Management upgrade

Dashboard; reports and analytics with date ranges and Excel export; shifts and cash count; kitchen
printers and silent printing (print bridge); split bill, move and merge tables; menu images, logo
and colours; opening-hours schedule; delivery areas; customer list and optional accounts (OTP —
paid, needs approval); PIN quick login on shared devices; Urdu UI; web push; two-step verification
for owners.

### Phase 8 — Staff and payroll, inventory and suppliers, expenses

Payroll (salary settings, attendance, advances, payroll runs); ingredients, stock ledger, recipes,
waste, stock counts, suppliers, purchase orders, goods received, expenses
(`docs/AI_MANAGER_PLAN.md` §2–§3).

### Phase 9 — SaaS platform (required before selling to other restaurants)

Platform Admin (§7.4), onboarding, plans, subscriptions, platform invoices, email reminders,
suspension; terms of service and privacy policy; tax-invoicing requirements checked (and built if
required); custom domains (optional).

### Phase 10 — AI Restaurant Manager

Stages 1–3 of `docs/AI_MANAGER_PLAN.md`.

### Phase 11 — Later

Full offline operation, online payment gateway, native apps, GPS rider tracking, shared delivery
pool or courier integration, table reservations, loyalty and coupons, marketplace.

### Acceptance tests (DEMO in Phases 1–3, REAL / VERIFIED from Phases 4–5)

**DEMO test data:** areas Hall (T1–T10) and Family (T11–T16); stations Pizza Oven, Grill & Fry, Hot
Kitchen, Drinks (auto-ready); items Classic Pizza (Medium) Rs. 850, Zinger Burger Rs. 450, Loaded
Fries Rs. 350, Alfredo Pasta Rs. 600, Cold Drink Rs. 125; tax 0%, service charge off.

**Test A — Table 5**

1. A waiter opens Table 5 on a phone with 4 guests.
2. Round 1: 2 × Classic Pizza, 4 × Zinger Burger, 2 × Loaded Fries → Send. Pizza Oven shows only
   the pizzas; Grill & Fry shows only the burgers and fries; the cashier sees Table 5 =
   **Rs. 4,200** — within 2 seconds, without refresh (from Phase 5).
3. Kitchen: Start → Ready on both tickets → the waiter gets two alerts → marks Served.
4. Round 2: 2 × Alfredo Pasta, 4 × Cold Drink → Send. Hot Kitchen gets the pasta; the drinks are
   ready at once; the cashier sees **Rs. 5,900**.
5. Print bill → the pre-bill shows Rs. 5,900 and "NOT A RECEIPT".
6. The customer gives Rs. 6,000 cash and leaves Rs. 100 as a tip → total Rs. 5,900, tip Rs. 100,
   change Rs. 0 → the receipt prints with an invoice number → Table 5 becomes Free.
7. Today's summary: sales Rs. 5,900 (cash), tip Rs. 100 credited to that waiter, cash received
   Rs. 6,000, 1 dine-in order, correct top items.

**Test B — safety:** a waiter cannot void a sent item; a manager can, with a reason (VOID on the
kitchen screen, bill reduced, audit log entry); a cashier cannot refund; a manager refunds
Rs. 450 with a reason → refund entry, original payment unchanged, today's summary shows the refund
separately; Restaurant B's staff cannot see Table 5 through the API or a real-time room; a disabled
waiter is logged out at the next action; double-tapping Send creates one round; double-tapping Pay
creates one payment.

**Test C — bill math:** with the service charge and an example tax rate switched on, every bill line
matches the formula in §8 (unit tests cover rounding, tax-inclusive prices and partial refunds).

**Test D — delivery:** a customer orders on a phone (Classic Pizza + Cold Drink, Cash on Delivery) →
Restaurant OS alarm → Accept with 30 minutes → Pizza Oven ticket → the order becomes PREPARING,
then READY automatically → assign rider → Rider App alert → Picked up – On the way → Delivered +
cash collected → the customer's tracking page showed every step without refresh → the cashier
settles the rider's cash → today's summary shows the delivery sale.

**Test E — controls and safety:** an item switched Online OFF disappears from the Customer App within
2 seconds; with Online orders OFF the server refuses checkout, even from an old open page; another
order's tracking link → "not found"; a disabled rider cannot log in; a rider cannot see another
rider's orders; phone and takeaway orders go through the same kitchen flow.

## 13. Success criteria

The system is successful when it is fully functional, secure and easy for anyone to use.

| # | Criterion | Proven by |
|---|---|---|
| 1 | **Easy to use:** simple, mobile-friendly screens for owners, cashiers, waiters, kitchen staff and riders | Owner approval of the UI phases; a new waiter takes and sends an order after 5 minutes of training; common actions in 3 taps or fewer on a low-cost Android phone |
| 2 | **Restaurant management:** menu, tables, orders, staff and daily sales in one system | Pilot modules REAL / VERIFIED; analytics in P7 |
| 3 | **POS & receipts:** bills, payments, refunds, receipts and tips | Test A steps 5–7, Tests B and C |
| 4 | **Kitchen & waiters:** orders reach the right station; waiters see when food is ready | Test A steps 2–4 |
| 5 | **Customer app:** browse, order, track | Test D |
| 6 | **Rider app:** the owner manages own riders; shared delivery later | Tests D and E |
| 7 | **One connected system:** one backend and one database for all apps | Tests confirm the same order id across all apps |
| 8 | **AI assistant:** accurate data, owner approval for important actions | AI Manager tests (`docs/AI_MANAGER_PLAN.md` §12) in P10 |
| 9 | **Multi-restaurant security:** each restaurant sees only its own data | Automated isolation tests (B and E) on every push |
| 10 | **Real-world testing:** a real order travels customer → restaurant → kitchen → cashier → rider (where delivery applies) with correct totals and live status | Tests A–E pass on staging with real phones (Phase 6) |

Do not mark a feature complete until it works with real backend data and has been tested. Clearly
label demo or unfinished features.

## 14. Out of scope — avoid for now

| Kind | Avoid | Why / when |
|---|---|---|
| Complicated early | Full offline operation and sync | Hard to get right; P11 unless the owner moves it (offline *behaviour* is tested in Phase 6) |
| Complicated early | Live GPS map of riders | Paid maps and battery use; P11 |
| Complicated early | Online payment gateway | Needs business agreements; P11 |
| Complicated early | AI auto-ordering | Needs months of reliable data; P10, stage 3 |
| Complicated early | Automatic rider assignment | Manual assignment is enough for own riders |
| Overkill | Foodpanda-style marketplace | A different business; P11 or later |
| Overkill | Native apps before the PWAs prove themselves | P11 |
| Overkill | Microservices, Kubernetes, several databases | One modular backend is enough |
| Overkill | Fancy chart dashboards and animations before the pilot | Simple numbers and tables first; analytics in P7 |
| Overkill | Multi-country / multi-currency | Pakistan first |
| Overkill | Custom domain per restaurant | When paying customers ask |
| Unrelated | Social feed, food blog, recipe videos, games | Not the core problem |
| Unrelated | Full double-entry accounting | Simple expenses and payroll come in P8 |

Make the app simple, beautiful and extremely focused on the main problem: **one connected,
real-time system for a restaurant's daily orders — dine-in, kitchen, billing, online orders and
riders — that anyone can use.**

## 15. Working rules for the AI developer

### 15.1 Step size

- UI phases: one screen or flow at a time, then screenshots.
- Integration phases: one complete slice at a time: database → API with permissions → switch the
  screen to the real adapter → real-time → tests. Then report.

### 15.2 Definition of Done

**UI phases (1–3):**

- [ ] Screen gets data only through the API client (DemoAdapter), never directly
- [ ] Uses `packages/shared` for statuses, roles and money; shared unit tests pass
- [ ] DEMO / PROTOTYPE badge visible; README status updated
- [ ] Works at phone size (and tablet for Kitchen and Cashier); loading, empty and error states
- [ ] Screenshots shared; owner feedback applied

**Integration phases (4–6):**

- [ ] Works with the real backend and database (no demo data in REAL features)
- [ ] Permissions checked on the server; a restaurant-isolation test added
- [ ] Real-time updates tested where other screens are affected (Phase 5+)
- [ ] Offline/error states; all automated tests pass in CI; earlier features still pass
- [ ] Migration created if the database changed; no secrets committed
- [ ] README status table and progress log updated; owner report sent (§15.4)

### 15.3 Statuses

| Status | Meaning |
|---|---|
| REAL / VERIFIED | Works with the real backend and database and was tested (the report names the tests) |
| DEMO / PROTOTYPE | Visible and clickable with demo data; not connected |
| NOT CONNECTED | The screen or backend part exists, but the two are not linked yet |
| PLACEHOLDER | "Coming Soon" screen without function |
| BLOCKED | Cannot continue; the report says why and what is needed |

### 15.4 Report template (in Roman Urdu)

```
Kya bana: …
REAL / VERIFIED: …
DEMO / PROTOTYPE: …
NOT CONNECTED: …
PLACEHOLDER: …
BLOCKED: … (kyun, aur kya chahiye)
Preview: screenshots / link / "pnpm dev" ke steps
Tests jo asal mein chale: … pass, … fail
Masle / baqi kaam: …
Agla qadam: … (aapki approval ka intezar)
```

### 15.5 Changes and new ideas

A new idea is first added to this document with its phase (after the owner agrees), then built.
Never expand scope silently. Record every change in the change log at the end of this file and the
decision in `PROJECT_RULES.md` §20.

## 16. Open decisions (owner) and assumptions

| # | Decision | Assumption used until confirmed |
|---|---|---|
| 1 | Development order | **Decided 2026-10-26: UI first** (`PROJECT_RULES.md` §15) |
| 2 | Real restaurant name, branch and menu (sizes, add-ons, prices) | DEMO "Aziz Pizza" menu |
| 3 | Kitchen stations | Pizza Oven, Grill & Fry, Hot Kitchen, Drinks (auto-ready) |
| 4 | Areas and tables | Hall T1–T10, Family T11–T16 |
| 5 | Tax rate(s), prices with or without tax, service charge | Owner provides; tests use 0% and an example rate |
| 6 | Receipt header/footer, tax registration numbers | Restaurant name, address, phone, "Thank you" |
| 7 | Payment methods | Cash, card (external machine), JazzCash/Easypaisa transfer |
| 8 | Who may give discounts and refunds, and the maximum | Owner and Manager, no maximum |
| 9 | Business day start | 06:00 |
| 10 | Delivery fee, minimum order, delivery area | Flat fee set by the owner |
| 11 | Receipt printer | 80 mm thermal, USB |
| 12 | Platform domain | Chosen before staging/production |
| 13 | How often does the internet drop at the restaurant? | Rarely → full offline operation stays in P11 |
| 14 | Payroll rules (monthly salary, daily wage, advances) | Decided in Phase 8 |
| 15 | "Master Prompt Version 4" mentioned by the owner | Only v1.0 existed in the Project; v2.0 merges the owner's latest points — share v4 if it exists elsewhere |
| 16 | Rider availability status (online/offline): who sees it, does it block assignment? | Decide before Phase 3 |
| 17 | Extra staff roles (Admin, Inventory Staff, Finance Staff) | Not in the permission model; decide before the phase that needs them |
| 18 | Separately branded Android apps per restaurant (Publishing Stage B) | Evaluated in P11 after a Google Play policy and cost review; no approval is guaranteed |

## 17. Ready-to-use Claude Code prompts (copy and paste)

Claude Code loads `CLAUDE.md` automatically, which imports `PROJECT_RULES.md`.

**A — First message in a new session**

```
Read CLAUDE.md, PROJECT_RULES.md and docs/MASTER_PROMPT.md completely, then inspect the whole
repository and README.md. Do not change anything yet.
Tell me in easy Roman Urdu: what exists, the status of each part (REAL / VERIFIED,
DEMO / PROTOTYPE, NOT CONNECTED, PLACEHOLDER, BLOCKED), any conflict you found between the
documents, and the exact next step according to PROJECT_RULES.md §15.
Wait for me to say "shuru karo".
```

**B — Start or continue a phase**

```
Shuru karo: Phase <N> — <name>, exactly as described in docs/MASTER_PROMPT.md §12 and
PROJECT_RULES.md §15–§16. Inspect the existing code first and keep everything that works.
Work in small steps, run the tests after each step, and show screenshots of every new screen.
Report with the template in docs/MASTER_PROMPT.md §15.4 in Roman Urdu.
```

**C — Feedback on a preview**

```
Preview feedback for Phase <N>:
1) …
2) …
Change only these points and keep everything else. Show new screenshots and update README.md.
```

**D — Approve a phase**

```
Phase <N> approved. Record the approval in the decision log (PROJECT_RULES.md §20), update the
README progress log, then tell me the plan for Phase <N+1> and wait for "shuru karo".
```

**E — Report a bug**

```
Bug in <app / screen>: <what happened>. Steps: 1) … 2) … 3) … Expected: <…>.
Find the cause, fix it, add a test so it cannot come back, and report in Roman Urdu.
```

**F — New idea**

```
New idea: <idea>. Do not build it yet.
Tell me which phase it belongs to, what it affects, and any monthly cost.
After I approve, add it to docs/MASTER_PROMPT.md and the decision log.
```

**G — Phase check**

```
Run the gate checks of Phase <N> (docs/MASTER_PROMPT.md §12) and show the real results with
screenshots. List everything that is not REAL / VERIFIED yet. Do not invent any result.
```

## Appendix — Glossary (Roman Urdu)

| Lafz | Matlab |
|---|---|
| Prototype / DEMO | Design jo click ho sakta hai, lekin nakli data pe chalta hai — abhi asli nahi. |
| Demo adapter | Nakli data dene wala hissa. Baad mein isi jagah asli backend lag jata hai, screens dobara nahi banti. |
| Gate | Agla phase shuru karne se pehle ki shart (test pass + aapki approval). |
| Blocked | Kaam ruka hua hai — wajah aur zaroorat report mein likhi hoti hai. |
| Round | Ek dafa mein kitchen bheje gaye items. Customer baad mein aur mangwaye to naya round. |
| Kitchen ticket (KOT) | Ek round ke woh items jo ek station pe bante hain — kitchen ki "parchi", screen pe. |
| Station | Kitchen ka hissa: Pizza Oven, Grill & Fry, Drinks… |
| KDS | Kitchen Display — kitchen ki screen jahan tickets aate hain. |
| Pre-bill | Payment se pehle table pe diya jane wala bill ("NOT A RECEIPT"). |
| Void | Kitchen bhejne ke baad item cancel karna — sirf Manager/Owner, wajah ke saath. |
| Refund | Payment ke baad paise wapas — sirf Manager/Owner, wajah ke saath, nayi entry ki shakal mein. |
| Business day | Restaurant ka din — raat 12 ke baad ki sale pichle din mein ginti hoti hai. |
| PWA | Website jo phone pe app ki tarah install ho jati hai, Play Store ke baghair. |
| Restaurant isolation | Har restaurant ka data alag — koi doosre ka data nahi dekh sakta. |
| Idempotency | Double tap ya internet ke masle se do order ya do payment na banein. |
| Migration | Database mein tabdeeli ka mehfooz, likha hua tareeqa. |
| Staging | Test wali website jahan asli se pehle check kiya jata hai. |

## Change log

| Date | Change |
|---|---|
| 2026-10-26 | v1.0 created from the owner's requirements template, `PROJECT_RULES.md` and `docs/AI_MANAGER_PLAN.md`: dine-in core, kitchen stations, billing, roles, Phases 0–7. |
| 2026-10-26 | v2.0: owner's UI-first order (Phases 0–11, gates in PROJECT_RULES.md §15); demo adapter (§3.5); five statuses; Customer/Rider App previews in Restaurant OS; refunds; payroll moved to P8; offline behaviour (Phase 6) vs full offline operation (P11); Claude Code prompts (§17). |
| 2026-10-27 | v2.1: owner approved the baseline and the Phase 1 plan; Restaurant OS navigation (§7.1); Open Full App buttons (§5.5, §5.6); white-label branding and publishing stages (§7.6); kitchen Undo on READY delivery/takeaway orders (§6.4); open decisions #16–#18; repository folder `restaurant-saas-platform`. |
| 2026-10-27 | v2.1 update after Preview 1: sidebar starts with POS / New Bill, Tables, Orders, Online Orders; long DEMO strip removed (badges stay). |
| 2026-10-28 | Owner and Manager home screen: POS / New Bill (§4, §7.1). |
| 2026-10-28 | §4, §5.1: Super Waiter and Service Waiter, assigned tables, chefs per station, bill request → accept → acknowledgement, cashier finds a bill by table number; §9: selling units and waiter tables. |
| 2026-10-28 | §6.4: fully voided tickets ("do not cook", 2 minutes) and harmless repeated ticket presses (Preview 2). |
| 2026-10-28 | §6.3: auto-ready tickets do not make an order PREPARING (Preview 4). |
| 2026-10-28 | §7.1 POS: full new-bill screen with Hold, discount, split and pending payment; §9 `held_bills`. |
| 2026-10-29 | §7.1 POS: Phone Call order button (takeaway, channel PHONE) and Bill Now (send, then take payment); `held_bills.phone_order`. |
| 2026-10-29 | §7.1 POS: Phone Call replaced by Call Waiter (`waiter_calls`, notification WAITER_CALLED); §8 Owner/Manager discount also on a new bill before sending (saved with the new order); `held_bills.discount` instead of `phone_order`. |
| 2026-10-29 | §4, §6.6, §7.1 Tables, §9: area and table setup on the Tables screen (owner) — Manage Areas, Add Table (one or many), edit, display order, Cleaning and Out of service states, open-bill locks, archive instead of delete; search and status filters; permission "mark a table for cleaning". |

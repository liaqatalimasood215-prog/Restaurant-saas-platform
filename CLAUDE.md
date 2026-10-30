# CLAUDE.md — Lala Restaurant OS

Owner: Liaqat Ali — restaurant owner, beginner at software. Explain everything to him in very easy
Roman Urdu (Urdu script if he asks). Code, comments and documents stay in English.

## Always loaded

@PROJECT_RULES.md

## Read when needed

- **`PROGRESS.md` — read it first in every new chat**: what is built, what waits for the owner's
  approval, pending tasks and the next steps. Update it at the end of every working session.
- `docs/MASTER_PROMPT.md` — what to build. Read §0 and every section the current phase needs
  before writing code.
- `docs/AI_MANAGER_PLAN.md` — only for AI Manager work (Phase 10).
- `README.md` — status of every feature and the progress log. Update it after every step.

## Current stage (2026-10-30)

- Phase 0 approved by the owner on 2026-10-27.
- **Phase 1 — Restaurant OS UI prototype** in progress on branch `phase-1/restaurant-os-ui`
  (PROJECT_RULES.md §15–§16, MASTER_PROMPT.md §12). Local commits only; **nothing pushed** (see `git log`).
- **Built (DEMO / PROTOTYPE):** layout and sidebar, DEMO login, Tables, Waiter Orders (Super + Service
  Waiter), Kitchen / KDS, Staff, Online Orders, Orders, installable PWA, notifications (message, beep,
  vibration), the full **POS / New Bill** (see below) and **Tables management** (Manage Areas, Add Table,
  Cleaning, Out of service) and the **Staff upgrade** (Owner-only, activation links, PIN — DEMO). 88 unit tests
  and the eight walkthroughs (`walkthrough`, `walkthrough:online`, `walkthrough:pos`, `walkthrough:tables`,
  `walkthrough:staff`, `walkthrough:menu`, `walkthrough:settings`, `walkthrough:online-app`) pass.
- **Approved by the owner:** documents, Phase 1 plan, Preview 1, the waiter → kitchen → cashier workflow,
  and on 2026-10-30 the final POS, Preview 4 (Online Orders, Orders), Tables management and the Staff design.
- **Preview 5 started** 2026-10-30. Steps 1 **Menu**, 2 **Settings**, 3 **Today's Summary** and 4 **Online App** built (`walkthrough:menu`,
  `walkthrough:settings`, `walkthrough:online-app`; Test A step 7 in `walkthrough`); Riders and refunds are paused. Every order keeps its own bill
  settings (`order.pricing`): Settings changes affect new bills only.
- **Phase 2 customer website built, waiting for the owner's review** (owner, 2026-10-30: "first website, then rider"):
  `apps/customer`, port 3001, DEMO, not connected to Restaurant OS until Phase 4; `pnpm --filter @restaurant-saas/customer
  walkthrough`. Run and publish notes: `apps/customer/README.md`.
- **Next (only after approval and "shuru karo"):** Rider App (Phase 3). The Riders page and refunds in Phase 1 are paused.
  Details and open questions: `PROGRESS.md` §9–§10.
- The Online App page previews the real customer website; the Rider App (Phase 3) stays a PLACEHOLDER inside Restaurant OS.
- Never start a phase until the owner says "shuru karo" or approves it. Never push, deploy or
  connect a paid service without the owner's approval.

## POS / New Bill — owner decisions, do not undo

- A **new bill starts as Takeaway** (counter sale): tap a product, tap **Bill Now**; no table and no
  customer needed. A bill without a table is never an error. Delivery needs name, phone and address.
- Order Type buttons: **Table · Takeaway · Delivery · Call Waiter**. **Table** opens a box with all tables;
  the bill becomes a Table bill only when a table is chosen. No table drop-down, no Guests counter, no
  "Find table no." search box (all removed at the owner's request).
- **Many tables at once:** Table works also on a sent bill; unsent items are put on Hold for that table.
- **Call Waiter** is always on (with or without a table); the waiter's phone shows a message, beeps,
  vibrates and speaks "Counter par aayein" (free browser voice).
- Owner/Manager may give a discount (reason required) also on a new bill; the Cashier may not.
- The POS fits one screen (tested at 1278×627, 1440×900, 1024×768); totals and Send to Kitchen / Bill Now
  stay visible. Product pictures are emoji until real photos (Phase 7).

## Tables — owner decisions (2026-10-29)

- Owner/Manager set up areas and tables on the Tables screen: **Manage Areas** and **+ Add Table** (one or
  many). Table: name (unique in its area), area, seats (1–50), display order. Cleaning (any floor staff, set
  by hand; seating new guests clears it) and Out of service (no new bill). Open bills lock a table (no move,
  out of service or remove) and its area (no deactivate); used tables are archived, never deleted.
- Shared rules: `packages/shared/src/tables.ts`; screens: `apps/restaurant-os/src/screens/tables/`.

## Staff — owner decisions (2026-10-29)

- Only the **Owner** manages staff (add, edit, roles, tables / station, links, Enable / Disable); the Manager
  sees the list. The last active Owner is protected. Single-use activation / PIN-reset links (48 hours); the
  person creates their own PIN; nobody else sees it.
- Staff screen = owner's picture panels 1–3 in the app's red + navy: Employees list, 3-step wizard, Role
  Permissions. Permissions are per role and per person (`packages/shared/src/access.ts`): screens and the demo
  server use `session.permissions` / `allowed()`, never `can(role, …)`. Switch ON only within the role's
  allowed set ("ceiling"); Staff management and Settings stay Owner only.
- Owner: **"front end first, back end last."** Phase 1 has the DEMO screens only. Real login (phone +
  password), hashed PINs, device enrolment, attempt limits, server sessions, real-time revoke, email sending
  and HTTPS hosting are Phases 4–6 (MASTER_PROMPT.md §10.3). Never treat the DEMO login or localStorage as security.

## Every session

1. Inspect the repository and README.md before changing anything. Never restart the project and
   never delete working code.
2. Work only on the current phase, in small steps; run the tests after each step.
3. Use the five statuses: REAL / VERIFIED, DEMO / PROTOTYPE, NOT CONNECTED, PLACEHOLDER, BLOCKED.
4. Never invent test results, previews, screenshots, deployments or integrations.
5. Show progress: run the app and share screenshots of every new screen. `pnpm --filter
   @restaurant-saas/restaurant-os screenshots` drives the installed Microsoft Edge through
   `playwright-core` (no browser download) while `pnpm dev` runs. Add new screens to
   `apps/restaurant-os/scripts/screenshots.mjs`. `pnpm --filter @restaurant-saas/restaurant-os walkthrough` clicks
   through the owner workflow and Test A steps 1–6 (each person in their own tab);
   `walkthrough:online` covers Test D, takeaway, phone orders and the Orders timeline;
   `walkthrough:pos` covers the POS (new bills, hold, discounts, payments, many tables, quick sale, Call Waiter);
   `walkthrough:tables` covers areas and tables (add one / many, edit, locks, cleaning, out of service, remove);
   `walkthrough:staff` covers staff links, activation + PIN, PIN reset, Disable / Enable and Manager read-only.
6. Report with the template in MASTER_PROMPT.md §15.4, in Roman Urdu.
7. If something is unclear, ask one short question with a recommended answer. Never connect a
   paid service without explaining the cost and getting approval.
8. At the end of a session update `PROGRESS.md` (built, waiting for approval, pending, next steps) and
   the README progress log, so the next chat can continue from the files alone.

## How Restaurant OS is built

- Screens get data only through `getApi()` from `apps/restaurant-os/src/lib/api` (the ApiClient).
  The DemoAdapter lives in `src/lib/api/demo`; an ESLint rule blocks importing it anywhere else.
- Rules and money always come from `packages/shared` (rebuilt automatically by turbo before `dev`,
  `typecheck`, `lint` and `build`).
- All UI text lives in `apps/restaurant-os/src/i18n/en.ts` (Urdu in Phase 7).
- `src/lib/build-plan.ts` lists which preview builds which screen; remove an entry when the screen
  is built and render it in `src/screens/section-page.tsx`.

## Commands

```bash
pnpm install
pnpm dev          # restaurant-os :3000 (customer :3001, rider :3002, api :4000 in later phases)
pnpm test         # shared rules (unit tests)
pnpm typecheck
pnpm lint
pnpm build
```

Keep the repository in a short folder path — Windows' 260-character path limit breaks
`node_modules` in deep folders.

## Known gaps

- `backend/api/prisma/schema.prisma` is an unvalidated draft (delivery only, 4 roles) — Phase 4 work.
- Pricing engine: the optional "different tax rate per payment method" setting is not built yet.
- Open owner decisions: MASTER_PROMPT.md §16 (#16 rider availability before Phase 3).

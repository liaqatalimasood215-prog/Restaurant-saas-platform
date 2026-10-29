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

## Current stage (2026-10-29)

- Phase 0 approved by the owner on 2026-10-27.
- **Phase 1 — Restaurant OS UI prototype** in progress on branch `phase-1/restaurant-os-ui`
  (PROJECT_RULES.md §15–§16, MASTER_PROMPT.md §12). 26 local commits, last `a03c8c3`; **nothing pushed**.
- **Built (DEMO / PROTOTYPE):** layout and sidebar, DEMO login, Tables, Waiter Orders (Super + Service
  Waiter), Kitchen / KDS, Staff, Online Orders, Orders, installable PWA, notifications (message, beep,
  vibration), and the full **POS / New Bill** (see below). 57 unit tests and the three walkthroughs
  (`walkthrough`, `walkthrough:online`, `walkthrough:pos`) pass.
- **Approved by the owner:** documents, Phase 1 plan, Preview 1, the waiter → kitchen → cashier workflow.
  **Waiting for his approval:** Preview 4 (Online Orders, Orders) and the final POS.
- **Next (only after approval and "shuru karo"):** Preview 5 — Menu, Online App, Riders, Today's Summary,
  Settings; then refunds. Details and open questions: `PROGRESS.md` §9–§10.
- Customer App (Phase 2) and Rider App (Phase 3) stay PLACEHOLDERS inside Restaurant OS.
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
   `walkthrough:pos` covers the POS (new bills, hold, discounts, payments, many tables, quick sale, Call Waiter).
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

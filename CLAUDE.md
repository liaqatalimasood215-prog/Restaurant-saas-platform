# CLAUDE.md — Lala Restaurant OS

Owner: Liaqat Ali — restaurant owner, beginner at software. Explain everything to him in very easy
Roman Urdu (Urdu script if he asks). Code, comments and documents stay in English.

## Always loaded

@PROJECT_RULES.md

## Read when needed

- `docs/MASTER_PROMPT.md` — what to build. Read §0 and every section the current phase needs
  before writing code.
- `docs/AI_MANAGER_PLAN.md` — only for AI Manager work (Phase 10).
- `README.md` — status of every feature and the progress log. Update it after every step.

## Current stage

- Phase 0 approved by the owner on 2026-10-27.
- **Phase 1 — Restaurant OS UI prototype** in progress on branch `phase-1/restaurant-os-ui`
  (PROJECT_RULES.md §15–§16, MASTER_PROMPT.md §12). Build in the approved preview order and wait
  for the owner's review after each preview: 1 layout and navigation → 2 Tables, Waiter, Kitchen →
  3 Cashier / POS → 4 Online Orders, Orders → 5 Menu, Online App, Riders, Staff, Summary, Settings.
- Customer App (Phase 2) and Rider App (Phase 3) stay PLACEHOLDERS inside Restaurant OS.
- Never start a phase until the owner says "shuru karo" or approves it. Never push, deploy or
  connect a paid service without the owner's approval.

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
   through Test A steps 1–5 and the void check with two tabs (waiter phone, kitchen tablet).
6. Report with the template in MASTER_PROMPT.md §15.4, in Roman Urdu.
7. If something is unclear, ask one short question with a recommended answer. Never connect a
   paid service without explaining the cost and getting approval.

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

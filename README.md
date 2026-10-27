# Lala Restaurant OS

Three separate apps — **Restaurant OS**, **Customer Online App** and **Rider App** — on ONE backend,
ONE PostgreSQL database, ONE order system and ONE trusted pricing engine. Repository folder:
`restaurant-saas-platform` (local Git, branch `phase-1/restaurant-os-ui`, not pushed).

Read before changing anything:

1. **[CLAUDE.md](CLAUDE.md)** — entry point for Claude Code (loaded automatically)
2. **[PROJECT_RULES.md](PROJECT_RULES.md)** — rules, development order (UI first), statuses, decision log
3. **[docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md)** — what to build: features, workflows, data, tests
4. **[docs/AI_MANAGER_PLAN.md](docs/AI_MANAGER_PLAN.md)** — AI Restaurant Manager design (Phase 10)

## Current stage

**Phase 1 — Restaurant OS UI prototype: in progress.** Preview 1 (layout, navigation, DEMO role
switcher, data layer) is ready for the owner's review.

Phase 1 preview order: 1 layout and navigation → 2 Tables, Waiter, Kitchen → 3 Cashier / POS →
4 Online Orders, Orders → 5 Menu, Online App, Riders, Staff, Today's Summary, Settings.

## Folder map

| Folder | What it is | Status |
|---|---|---|
| `docs/` | Master prompt v2.1, AI Manager plan | Written |
| `packages/shared` | Six roles and permission matrix, sidebar sections, order engine (dine-in, delivery, takeaway), kitchen tickets, pricing engine, payments/refunds, business day, real-time names, API data types | NOT CONNECTED — 55 unit tests pass |
| `apps/restaurant-os` | Restaurant OS (Next.js, Tailwind) with ApiClient + DemoAdapter | DEMO / PROTOTYPE — Preview 1 |
| `backend/api/prisma/schema.prisma` | Database design draft (delivery only, 4 roles) | NOT CONNECTED — draft, not validated; Phase 4 |
| `apps/customer` | Customer Online App (PWA) | Not started — Phase 2 |
| `apps/rider` | Rider App (PWA) | Not started — Phase 3 |
| `backend/api` (NestJS) | The one backend | Not started — Phase 4 |
| `apps/admin` | Platform Admin | Phase 9 |

## Feature status

Statuses: REAL / VERIFIED · DEMO / PROTOTYPE · NOT CONNECTED · PLACEHOLDER · BLOCKED.
Nothing is REAL / VERIFIED before Phase 4 — there is no backend yet.

| Feature | Status |
|---|---|
| Shared rules: roles, permissions, order and ticket transitions, bill formula (Test A Rs. 4,200 → Rs. 5,900, Test C), payments, refunds, business day | NOT CONNECTED — 55 unit tests pass |
| Restaurant OS layout: sidebar always visible (tablet/desktop), bottom navigation (phone), one feature per screen | DEMO / PROTOTYPE |
| DEMO role switcher (6 roles), per-role sidebar, role home screens, "not available for this role" screen | DEMO / PROTOTYPE — not a login; real login in Phase 4 |
| Rider role in Restaurant OS → "Riders use the Rider App" | DEMO / PROTOTYPE |
| ApiClient + DemoAdapter, DEMO sync between tabs, simulated connection error, reset demo data | DEMO / PROTOTYPE |
| Tables, Waiter Orders, Kitchen / KDS | PLACEHOLDER — Preview 2 |
| POS / New Bill | PLACEHOLDER — Preview 3 |
| Online Orders, Orders, header search | PLACEHOLDER — Preview 4 |
| Menu, Staff, Today's Summary, Settings | PLACEHOLDER — Preview 5 |
| Online App and Riders pages: management area | PLACEHOLDER — Preview 5 |
| Online App and Riders pages: app preview + Open Full App | PLACEHOLDER — Customer App in Phase 2, Rider App in Phase 3 |
| Dashboard, Customers, Finance & Reports (P7), Inventory & Suppliers, Payroll (P8), AI Manager (P10) | PLACEHOLDER — Coming Soon |
| Alerts bell | PLACEHOLDER — alerts arrive in Previews 2 and 4 |
| Real-time between devices | Not started — Phase 5 (Phase 1 only has "DEMO sync — not real-time" between tabs of one browser) |

Known gaps: the optional "different tax rate per payment method" setting (MASTER_PROMPT.md §8) is
not in the pricing engine yet — add it with tests when the owner confirms the tax rules.

## Progress log

| Date | Step | Result |
|---|---|---|
| 2026-10-24 | Project rules, monorepo skeleton, shared order rules, schema draft | 14 unit tests pass |
| 2026-10-25 | AI Restaurant Manager design | Document only |
| 2026-10-26 | Master Prompt v1.0 (dine-in core, order engine, phases) | Document; Table 5 totals checked with the shared money code |
| 2026-10-26 | Documents reconciled: PROJECT_RULES v2.0, MASTER_PROMPT v2.0, `CLAUDE.md`; UI-first order | Waiting for owner approval |
| 2026-10-27 | Owner approved the documents and the Phase 1 plan. Project moved to `C:\Users\ADMIN\Projects\restaurant-saas-platform`, local Git baseline commit | Docs v2.1: navigation, Open Full App, white-label direction, open decisions #16–#18 |
| 2026-10-27 | Tooling: turbo, pnpm lockfile, build-script allowlist; `packages/shared` extended to the approved rules | 55 unit tests pass; `pnpm test`, `pnpm typecheck` pass at the root |
| 2026-10-27 | Phase 1 · Preview 1: `apps/restaurant-os` layout and navigation, DEMO role switcher, ApiClient + DemoAdapter, placeholders | `pnpm typecheck`, `pnpm lint`, `pnpm build` pass; 13 screenshots (phone, tablet, desktop); waiting for owner review |

## Commands

Keep the repository in a short folder path: Windows cannot create files with paths longer than 260
characters, which breaks `node_modules`.

```bash
pnpm install
pnpm dev                                            # Restaurant OS on http://localhost:3000
pnpm test                                           # shared rules (unit tests)
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @restaurant-saas/restaurant-os screenshots   # needs pnpm dev running; uses installed Microsoft Edge
```

Screenshots are written to `screenshots/` (git-ignored).

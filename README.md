# Lala Restaurant OS

Three separate apps — **Restaurant OS**, **Customer Online App** and **Rider App** — on ONE backend,
ONE PostgreSQL database, ONE order system and ONE trusted pricing engine. Repository folder:
`restaurant-saas`.

Read before changing anything:

1. **[CLAUDE.md](CLAUDE.md)** — entry point for Claude Code (loaded automatically)
2. **[PROJECT_RULES.md](PROJECT_RULES.md)** — rules, development order (UI first), statuses, decision log
3. **[docs/MASTER_PROMPT.md](docs/MASTER_PROMPT.md)** — what to build: features, workflows, data, tests
4. **[docs/AI_MANAGER_PLAN.md](docs/AI_MANAGER_PLAN.md)** — AI Restaurant Manager design (Phase 10)

## Current stage

**Phase 0 — Foundation and documents: done.** Waiting for the owner's approval.
**Next: Phase 1 — Restaurant OS UI prototype** (DEMO data).

## Folder map

| Folder | What it is | Status |
|---|---|---|
| `docs/` | Master prompt v2.0, AI Manager plan | Written |
| `packages/shared` | Order statuses and transitions, roles, sidebar access, money in paisa, real-time names | NOT CONNECTED — logic verified by 14 unit tests; delivery path and 4 roles only, to be extended in Phase 1 |
| `backend/api/prisma/schema.prisma` | Database design draft (`restaurant_id` + `branch_id`) | NOT CONNECTED — draft, not validated; Phase 4 |
| `apps/restaurant-os` | Restaurant OS | Not started — Phase 1 |
| `apps/customer` | Customer Online App (PWA) | Not started — Phase 2 |
| `apps/rider` | Rider App (PWA) | Not started — Phase 3 |
| `backend/api` (NestJS) | The one backend | Not started — Phase 4 |
| `apps/admin` | Platform Admin | Phase 9 |

## Feature status

Statuses: REAL / VERIFIED · DEMO / PROTOTYPE · NOT CONNECTED · PLACEHOLDER · BLOCKED

| Feature | Status |
|---|---|
| Order lifecycle rules (delivery path: allowed steps, roles, assigned rider only) | NOT CONNECTED — 14 unit tests pass |
| Money calculation in paisa (Table 5 = Rs. 5,900 checked) | NOT CONNECTED — unit tests pass |
| AI Restaurant Manager | PLACEHOLDER — design only (`docs/AI_MANAGER_PLAN.md`) |
| Running the apps in the earlier claude.ai chat session | BLOCKED — package downloads were blocked there; use Claude Code with the GitHub repository |
| Everything else | Not started |

## Progress log

| Date | Step | Result |
|---|---|---|
| 2026-10-24 | Project rules, monorepo skeleton, shared order rules, schema draft | 14 unit tests pass |
| 2026-10-25 | AI Restaurant Manager design | Document only |
| 2026-10-26 | Master Prompt v1.0 (dine-in core, order engine, phases) | Document; Table 5 totals checked with the shared money code |
| 2026-10-26 | Documents reconciled: PROJECT_RULES v2.0, MASTER_PROMPT v2.0, `CLAUDE.md`; UI-first order | Waiting for owner approval |

## Commands (after dependencies are installed)

```bash
pnpm install
pnpm --filter @restaurant-saas/shared test   # shared rules
pnpm dev                                     # all apps (once they exist)
```

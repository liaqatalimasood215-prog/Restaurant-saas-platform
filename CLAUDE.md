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

- Phase 0 (foundation + documents): done — waiting for the owner to approve PROJECT_RULES.md v2.0
  and MASTER_PROMPT.md v2.0.
- Next: **Phase 1 — Restaurant OS UI prototype** with DEMO data (PROJECT_RULES.md §15–§16,
  MASTER_PROMPT.md §12).
- Never start a phase until the owner says "shuru karo" or approves it.

## Every session

1. Inspect the repository and README.md before changing anything. Never restart the project and
   never delete working code.
2. Work only on the current phase, in small steps; run the tests after each step.
3. Use the five statuses: REAL / VERIFIED, DEMO / PROTOTYPE, NOT CONNECTED, PLACEHOLDER, BLOCKED.
4. Never invent test results, previews, screenshots, deployments or integrations.
5. Show progress: run the app and share screenshots of every new screen (Playwright is available
   for screenshots). If the owner runs the project on his own computer, give him the exact steps
   to open the preview.
6. Report with the template in MASTER_PROMPT.md §15.4, in Roman Urdu.
7. If something is unclear, ask one short question with a recommended answer. Never connect a
   paid service without explaining the cost and getting approval.

## Commands

```bash
pnpm install
pnpm --filter @restaurant-saas/shared test    # shared rules (unit tests)
pnpm dev                                      # restaurant-os :3000, customer :3001, rider :3002, api :4000
```

## Known gaps to fix at the start of Phase 1

- `packages/shared` models only the delivery path and 4 roles. Extend it to dine-in, kitchen
  tickets, refunds, six roles and five statuses (MASTER_PROMPT.md §4, §6, §8, §15.3), with tests.
- `OS_SECTIONS` in `packages/shared/src/roles.ts` uses the old sidebar and `phase1Status`; update it
  to MASTER_PROMPT.md §7.1.
- Root `package.json` has no `turbo` dev dependency yet; add it when the first app is created.
- `backend/api/prisma/schema.prisma` is an unvalidated draft (delivery only) — it is Phase 4 work.

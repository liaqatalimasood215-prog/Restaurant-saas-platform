# Customer website (`apps/customer`)

The online ordering website of Lala Restaurant OS. **One website, every restaurant:** each restaurant gets
its own address (`/<restaurant-slug>/<branch-slug>`), name, colour and menu from data, never a new copy of
the code. Phase 2. Status: **DEMO / PROTOTYPE** (sample data, kept in the visitor's browser).

## Run it

From the repository root:

```bash
pnpm install
pnpm dev                                             # website on http://localhost:3001 (Restaurant OS on :3000)
pnpm --filter @restaurant-saas/customer walkthrough  # 43 checks in Microsoft Edge, while pnpm dev runs
```

Try <http://localhost:3001> for the two sample restaurants: `aziz-pizza/main` and `demo-karahi/main`.

## What is real and what is not

| Part | Status |
|---|---|
| Home, menu, categories, search, product details (sizes, add-ons, note), cart, checkout, tracking steps, account screens; phone, tablet and desktop; a brand colour per restaurant | DEMO / PROTOTYPE |
| Prices and totals | Same rules as Restaurant OS (`packages/shared`) |
| Orders reaching Restaurant OS, the same menu, Online ON/OFF | NOT CONNECTED: backend, Phase 4 (labelled DEMO buttons stand in for the restaurant) |
| Live tracking | NOT CONNECTED: Phase 5 (no GPS map in the first version) |
| Customer accounts | DEMO: no password or code is checked, details stay in the browser. Real sign-in needs a phone code by SMS (paid: owner approval) and the backend |
| Online payment | Not built. Cash on delivery and pay at pickup only |
| Product photos | Food pictures chosen by name until photo upload (Phase 7) |

Browser storage here is for the demo only, never security.

## How it is built

- Screens get data only through `getApi()` from `src/lib/api`. `src/lib/api/demo` is the DemoAdapter; an ESLint
  rule blocks importing it anywhere else. Phase 4 adds an API adapter and the screens stay the same.
- Rules and money come from `packages/shared` (`online-order.ts`, `calculateBill`, `normalizePhone`). The demo
  prices every order again from the menu, as the server will: numbers from the browser are never trusted.
- All text is in `src/i18n/en.ts`.
- The brand is data: `StoreBrand` sets `--store-primary`, and the Tailwind `brand` colours follow it.

## Publishing (not done: only with the owner's approval)

The website deploys on its own, without Restaurant OS or the Rider App:

- New Vercel project on this repository, **Root Directory** `apps/customer`, framework Next.js. Vercel installs
  the whole workspace, so `packages/shared` is built with it through `transpilePackages`.
- No environment variables and no secrets are needed while it uses DEMO data.
- Published now, it would show sample restaurants only: visitors' orders go nowhere. Taking real orders needs
  the backend (Phase 4), real-time (Phase 5) and security work (Phase 6) first.

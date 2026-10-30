# Customer website (`apps/customer`)

The online ordering website and PWA of Lala Restaurant OS. One codebase serves every restaurant: each one gets its
own address (`/<restaurant-slug>/<branch-slug>`), name, colours and menu from data, never a new copy of the code.
Phase 2. Status: **DEMO / PROTOTYPE** (sample data, kept in the visitor's browser).

## Run it

From the repository root:

```bash
pnpm install
pnpm dev                                             # website on http://localhost:3001 (Restaurant OS on :3000)
pnpm --filter @restaurant-saas/customer walkthrough  # 169 checks in Microsoft Edge, while pnpm dev runs
```

Try <http://localhost:3001> for the sample restaurants: `lala-restaurant/main` (the owner's design; second branch
`lala-restaurant/gulberg` starts closed), `aziz-pizza/main` and `demo-karahi/main`.

## Screens and status

| Screen | Address after `/<restaurant>/<branch>` | Status |
|---|---|---|
| Home: address, time, search, categories, Deal slider, Popular Now, branch selector, closed banner, install offer | `/` | DEMO / PROTOTYPE |
| Menu: category tabs, product grid, add, favourites | `/menu` | DEMO / PROTOTYPE; favourites on this device only |
| Product: size, crust, extras, note, quantity, price on the button | `/item/<id>` | DEMO / PROTOTYPE |
| Cart and checkout on one page: Delivery / Pickup / Dine-in, quantity, Complete your meal, details, bill | `/cart` | DEMO / PROTOTYPE; Dine-in is not joined to the restaurant's tables |
| Payment: Cash | `/cart` | DEMO / PROTOTYPE |
| Payment: JazzCash, Easypaisa, Card | `/cart` | NOT CONNECTED: no money moves |
| Tracking: steps with times, DEMO buttons standing in for the restaurant | `/track/<token>` | DEMO / PROTOTYPE; never called "live" before Phase 5 |
| Tracking: map area, rider card, rider's call and WhatsApp buttons | `/track/<token>` | NOT CONNECTED: a drawing and made-up details |
| Orders, Reorder | `/orders` | DEMO / PROTOTYPE; orders on this device only |
| Account: details, saved addresses | `/account` | DEMO / PROTOTYPE |
| Login: +92 phone, WhatsApp / SMS code, Google | `/login` | NOT CONNECTED: no code is sent and nothing is checked |
| Install offer, offline message | Home, every page | DEMO / PROTOTYPE; a real install needs HTTPS hosting; no offline mode (Phase 11) |

| Part | Status |
|---|---|
| Prices and totals | Shown with the shared rules (`packages/shared`), and worked out again when the order is placed |
| Orders reaching Restaurant OS, the same menu, Online ON/OFF | NOT CONNECTED: backend, Phase 4 |
| Live tracking | NOT CONNECTED: Phase 5 (no GPS map in the first version) |
| Product photos | Food pictures chosen by name until photo upload (Phase 7) |

Ordering never needs an account. Browser storage here is for the demo only, never security.

## How it is built

- Screens get data only through `getApi()` from `src/lib/api`. `src/lib/api/demo` is the DemoAdapter and all mock data,
  every file marked `// DEMO`; an ESLint rule blocks importing it anywhere else. Phase 4 adds an API adapter and the
  screens stay the same. Extras the backend does not know yet (deals, branches, Dine-in) are typed in `src/lib/api/client.ts`.
- Rules and money come from `packages/shared` (`calculateBill`, `unitPriceFor`, `online-order.ts`, `normalizePhone`). This
  app has no pricing or order rules of its own; `lib/format.ts` only changes how "Rs 1,300" looks. A deal is an ordinary
  menu item with its own price. Dine-in borrows the pickup steps (`lib/order-rules.ts`).
- All text is in `src/i18n/en.ts`.
- The brand is data: `CustomerBrand` sets `--store-primary` and `--store-accent`, and the Tailwind `brand` and `accent`
  colours follow them. The code knows nothing about any one restaurant; LALA is sample data only.
- The cart, favourites and "Not now" are kept on the device (`lib/device-store.ts`), per branch or restaurant.

## Publishing (not done: only with the owner's approval)

The website deploys on its own, without Restaurant OS or the Rider App:

- New Vercel project on this repository, **Root Directory** `apps/customer`, framework Next.js. Vercel installs
  the whole workspace, so `packages/shared` is built with it through `transpilePackages`.
- No environment variables and no secrets are needed while it uses DEMO data.
- Published now, it would show sample restaurants only: visitors' orders go nowhere. Taking real orders needs
  the backend (Phase 4), real-time (Phase 5) and security work (Phase 6) first.

# Rider App (`apps/rider`, Phase 3, DEMO / PROTOTYPE)

The app for a restaurant's own riders. One app serves every restaurant at `/<restaurant>/<branch>`; name, colour and login picture are data.

## Run

```bash
pnpm install
pnpm --filter @restaurant-saas/rider dev    # http://localhost:3002 (also started by pnpm dev)
pnpm --filter @restaurant-saas/rider walkthrough
```

`RIDER_URL=http://<address>:<port>` runs the walkthrough on another address.

## Screens

Built from the owner's six-screen picture:

- **Login:** phone + PIN or password, show/hide, Forgot PIN, no sign-up. DEMO: nothing is checked; buttons fill in a sample account.
- **Home:** rider header, bell, Online / Offline, three counts, New Orders (assigned, not picked up) and My Orders (with the rider, n/3).
- **Order Details:** four-step stepper, call the restaurant and the customer, Google Maps link, items with their saved prices, COD or Paid,
  one button: Pick Up Order → Start Delivery → Mark Delivered, with Customer Pay and Cash Collected to confirm.
- **Live Tracking** (`/delivery/<id>/tracking`): a drawn DEMO MAP (`components/demo-map.tsx`), not a map service and not a location; Navigate uses the free Google Maps link.
- **Orders tab, My Active Deliveries (n/3):** drop number, customer, area, status; orders waiting for pick up; Delivery History.
- **Earnings tab, Today Summary:** date selector, earnings card and rows, and a separate cash card (Cash Collected, Cash Given, Cash to Deposit).
- **Delivery History:** Today, Yesterday or a date; All, COD or Paid. An area only, no customer details.
- **Profile:** read only: phone, restaurant, branch, availability, app version, install, log out.

Future GPS (only during an active delivery, every 10–15 seconds, stopped when it ends, with permission and connection-loss handling) replaces `DemoMap` behind the RiderApi; nothing tracks a location today.

A new assignment shows a message, beeps and vibrates. Installable as a PWA on HTTPS; no offline data.
Colours are only the tokens in `src/app/globals.css`. `components/status-badge.tsx` is the one badge.

## Rules that are display only

- **Picked Up** is not an order status. `riderStage` in `packages/shared/src/riders.ts` shows it after a DEMO tap kept in this browser; the
  order stays `RIDER_ASSIGNED`, and Restaurant OS shows "Rider assigned" and may still change the rider or cancel, until Start Delivery.
- **Up to 3 with the rider** turns off the next Pick Up in this app only. Restaurant OS can still assign more. The server rule comes with the backend.
- **Distance and time** are sample numbers on the sample orders. Restaurant OS orders have none, so the line is hidden.
- **COD cash** belongs to the restaurant and is never earnings.
- **Earnings** are fixed sample numbers on sample data (`src/lib/api/demo/seed.ts`), and NOT CONNECTED on Restaurant OS orders. Nothing here decides how riders are paid.

## Where the data comes from

- **Direct link, also on a phone:** sample deliveries kept in that browser. DEMO buttons stand in for the cashier.
- **Riders page of Restaurant OS** (phone frame or Open Full App): the real demo orders of Restaurant OS through a DEMO
  browser link (`src/lib/api/demo/demo-adapter.ts`, `apps/restaurant-os/src/screens/riders/rider-bridge.ts`). It works only
  in one browser, while the Restaurant OS tab stays open.

Screens use only `getApi()`; Phase 4 replaces the DemoAdapter with the real API. Rules and money come from `packages/shared`
(`riders.ts`). Nothing here is security: the server checks the rider from Phase 4.

## Not built on purpose

Real phone + PIN login (Phase 4), live sync between phones (Phase 5), web push for a closed app (Phase 7), GPS
tracking and rider applications (Phase 11). The customer website does not see these steps until Phase 4.

## Publish

One Vercel project of its own, with the owner's approval only. Nothing is deployed.

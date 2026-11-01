# Rider App (`apps/rider`, Phase 3, DEMO / PROTOTYPE)

The app for a restaurant's own riders. One app serves every restaurant at `/<restaurant>/<branch>`; name and colour are data.

## Run

```bash
pnpm install
pnpm --filter @restaurant-saas/rider dev    # http://localhost:3002 (also started by pnpm dev)
pnpm --filter @restaurant-saas/rider walkthrough
```

`RIDER_URL=http://<wifi-address>:3002` runs the walkthrough on the Wi-Fi address.

## Screens

Login (DEMO: pick an account), My deliveries with the Online / Offline switch, Delivery (call, Google Maps link, amount to
collect, Picked up – On the way, Delivered + cash confirmation), Today (deliveries done, cash collected, given, with the
rider), Account. A new assignment shows a message, beeps and vibrates. Installable as a PWA on HTTPS; no offline data.

## Where the data comes from

- **Direct link, also on a phone:** sample deliveries kept in that browser. DEMO buttons stand in for the cashier.
- **Riders page of Restaurant OS** (phone frame or Open Full App): the real demo orders of Restaurant OS through a DEMO
  browser link (`src/lib/api/demo/demo-adapter.ts`, `apps/restaurant-os/src/screens/riders/rider-bridge.ts`). It works only
  in one browser, while the Restaurant OS tab stays open.

Screens use only `getApi()`; Phase 4 replaces the DemoAdapter with the real API. Rules and money come from `packages/shared`
(`riders.ts`). Nothing here is security: the server checks the rider from Phase 4.

## Not built on purpose

Real phone + password login (Phase 4), live sync between phones (Phase 5), web push for a closed app (Phase 7), GPS
tracking and rider applications (Phase 11). The customer website does not see these steps until Phase 4.

## Publish

One Vercel project of its own, with the owner's approval only. Nothing is deployed.

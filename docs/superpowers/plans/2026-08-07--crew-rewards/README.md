# Crew Rewards implementation plan

## Problem

ROCKY needs a real loyalty profile connected to Shopify Customer Accounts and
paid orders: permanent XP, spendable tickets, collectible avatars, levels and a
digital reward shop.

Approved behavior lives in
`docs/superpowers/specs/2026-08-07--crew-rewards.md`.

## Scope

- Encrypted per-customer Crew profiles.
- XP, ticket and level rules.
- Idempotent paid-order credit.
- Authenticated Crew API.
- Responsive `/mi-crew` profile and digital ticket shop.
- Trusted Crew context for logged-in Rocky IA sessions.
- Tests, build, security scan and browser verification.

## Non-goals

- Ticket payment for normal Shopify products.
- Physical reward fulfillment.
- Staff balance tools.
- Social profiles or leaderboards.
- Partial-refund reconciliation.
- New dependencies or a new database.

## Architecture delta

Add one cohesive `server/crew` domain module backed by the existing encrypted
store. Extend the existing Shopify account router for authenticated reads and
mutations. Pass verified `orders/paid` payloads from the existing webhook
boundary into the Crew service. Add one lazy React route using the existing
Shopify account state and API client. Rocky IA reads a server-generated summary;
the browser never sends balances.

## Sequencing

1. Domain and persistence establish all invariants.
2. HTTP API exposes the domain through existing identity/session boundaries.
3. Shopify webhooks credit real purchases.
4. UI consumes the authenticated API.
5. Rocky IA gains read-only trusted context.
6. Documentation and full verification close the slice.

## Verification matrix

| Concern | Proof |
|---|---|
| Reward maths and levels | focused Vitest domain tests |
| Balance and redemption integrity | focused service tests |
| Auth and origin boundary | Shopify HTTP contract tests |
| Paid-order idempotency | signed webhook tests |
| Profile UX | component tests and Playwright desktop/mobile |
| Existing behavior | `npm run test:run` |
| Production bundle | `npm run build` |
| Secret safety | `npm run security:check` |

## Risks and rollback

- All new persisted data is isolated in a new namespace; rollback can stop
  routing and webhook processing without touching carts or customer tokens.
- The current encrypted store is single-instance. Do not run multiple writers.
- Shopify must subscribe `orders/paid` on the final HTTPS domain.
- Keep rewards digital until refunds are reconciled automatically.

## Tasks

1. `tasks/01-domain-and-store.md`
2. `tasks/02-authenticated-api.md`
3. `tasks/03-paid-order-webhook.md`
4. `tasks/04-profile-ui.md`
5. `tasks/05-rocky-ia-context.md`
6. `tasks/06-rollout-and-verification.md`

## Progress

- [x] Task 01 — domain and store. Added `server/crew/rewards.mjs` and seven
  focused tests. `npx vitest run server/crew/rewards.test.mjs` passes.
- [x] Task 02 — authenticated API. Added authenticated read/equip/redeem
  contracts and browser API functions. The focused domain and HTTP set passes
  15 tests.
- [x] Task 03 — paid-order webhook. Verified raw HMAC before JSON parsing,
  wired `orders/paid` into Crew credit and added the deployment allowlist. The
  focused backend set passes 25 tests.
- [x] Task 04 — profile UI. Added the responsive `/mi-crew` carnet, level
  progress, character locker, ticket shop and credited-order history. The
  focused component and domain set passes 9 tests.
- [x] Task 05 — Rocky IA context. Authenticated chat now receives a compact,
  server-owned Crew summary without email, token or Customer GID; anonymous and
  failed lookups degrade safely. The focused chat/server set passes 41 tests.
- [x] Task 06 — rollout and verification. `npm run check` passes 124 tests,
  production build and secret scan; production dependency audit reports zero
  vulnerabilities. Playwright confirms zero horizontal overflow at 390 px,
  one semantic `main` and no console errors. The managed server was restarted
  without replacing the ngrok tunnel.

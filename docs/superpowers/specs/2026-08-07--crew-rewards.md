# Crew Rewards

## Goal

Convert the Shopify customer account into a ROCKY Crew profile with permanent
experience, spendable Crew Tickets, levels, collectible avatars and a digital
rewards shop. Paid Shopify orders must credit the correct customer exactly once.

## Approved product rules

- A customer earns 1 XP for every complete euro paid.
- A customer earns 0.1 Crew Tickets for every complete euro paid.
- XP is historical and never decreases when tickets are spent.
- Ticket balances are stored as integer tenths to avoid floating-point money
  errors. For example, an eligible EUR 34.99 order grants 34 XP and 3.4 tickets.
- Only paid EUR orders linked to a Shopify Customer are eligible.
- The first profile owns the starter skater avatar.
- Level thresholds are:
  - Recién Llegado: 0 XP
  - Del Barrio: 100 XP
  - Crew Member: 300 XP
  - Rocky Rider: 750 XP
  - OG de la Colmena: 1,500 XP
  - Leyenda 035: 3,000 XP
- Redeeming a digital reward spends tickets, adds the reward to the collection
  and never changes XP or level.
- A customer can equip only an avatar they own.

## Constraints

- Reuse the existing Shopify Customer Account login, opaque application session,
  encrypted single-instance store and verified Shopify webhook boundary.
- Do not expose Shopify customer tokens, full order payloads, webhook secrets or
  internal store keys to the browser.
- Keep all credit and redemption operations idempotent.
- Do not introduce a database, state library, component library or new runtime
  dependency for this slice.
- Preserve the existing free-only Rocky IA model guardrails.
- Shopify remains the authority for orders, prices and stock.

## Proposed approach

### Identity and persistence

The existing Customer Account API returns the canonical Shopify Customer GID.
Crew data is stored in the encrypted state store under a SHA-256 key derived
from that GID. The profile contains only the data required by the feature:

- XP and ticket balance in tenths;
- lifetime tickets earned and spent;
- selected avatar and owned reward IDs;
- compact purchase history and activity entries;
- credited order IDs for idempotency;
- completed redemption operation IDs for safe client retries.

The profile does not duplicate customer email, addresses, payment data or full
Shopify order payloads.

### Reward domain

A small server module owns the level thresholds, reward catalogue, validation,
credit calculations and per-customer mutation lock. It exposes:

- read/create a public profile view;
- credit a paid Shopify order exactly once;
- redeem a reward exactly once;
- equip an owned avatar;
- produce a compact Rocky IA context summary.

The initial catalogue uses the existing ROCKY character artwork. It includes
avatar rewards unlocked by level or purchased with tickets, plus profile frames
and badges. The data model supports adding future heads, hats and glasses without
changing the balance rules.

### Shopify webhook

The verified `orders/paid` webhook passes the already-authenticated JSON payload
to the Crew service. The handler uses:

- `admin_graphql_api_id` as the order identity;
- `customer.admin_graphql_api_id` as the profile identity;
- `current_total_price_set.shop_money` as the eligible paid amount;
- a compact, bounded list of purchased item titles for the collection history.

Missing customers, non-EUR orders and malformed totals are accepted by the
webhook boundary but skipped by the Crew credit processor with a non-sensitive
log reason. Shopify does not guarantee webhook ordering, so order-level
idempotency lives in the profile in addition to delivery-level deduplication.

The deployment must subscribe the app to `orders/paid` and retain `read_orders`.
The implementation follows Shopify's 2026-07 webhook contract and does not use
the removed `checkout_id` field.

### Authenticated API

The existing Shopify router gains three authenticated account endpoints:

- `GET /api/shopify/account/crew`
- `PATCH /api/shopify/account/crew/avatar`
- `POST /api/shopify/account/crew/redeem`

Unauthenticated reads return `401` with a stable code. Mutations also require the
existing exact-origin middleware. Redemption accepts a client operation ID so a
retry cannot spend tickets twice.

### Frontend

Add `/mi-crew` with four responsive areas:

1. Profile identity, current avatar, level and progress to the next level.
2. XP, available tickets and lifetime collection counters.
3. Avatar locker for owned and locked characters.
4. Crew Ticket shop and recent activity/purchases.

When Customer Accounts are unavailable or the visitor is logged out, the page
explains the system and shows the correct Shopify login action. Logged-in users
reach the profile from the navigation instead of using their name as an implicit
logout button. Logout remains an explicit action inside the profile.

### Rocky IA

When the chat session belongs to a logged-in customer, the server adds a compact
trusted Crew summary (level, XP, tickets and next unlock) to the existing system
context. The browser cannot provide or override this balance data. No new model,
provider or paid endpoint is introduced.

## Non-goals for this slice

- Paying for normal Shopify products with tickets.
- Shipping physical rewards automatically.
- A staff administration dashboard or manual balance adjustments.
- Social profiles, public leaderboards or user-to-user transfers.
- Automatic partial-refund reconciliation. Until it is added, refunded orders
  require an operator adjustment before public launch of financial rewards.
- Layered artwork generation for arbitrary hat/glasses combinations. The schema
  and catalogue can add those assets later; the first UI equips complete avatars.

## Acceptance criteria

- A new authenticated customer receives the starter avatar, zero XP and zero
  tickets.
- EUR 34.99 grants exactly 34 XP and 3.4 tickets.
- Replaying an `orders/paid` event for the same order grants nothing twice.
- A level changes at the documented thresholds and never drops after redemption.
- A redemption cannot overdraw tickets or buy the same one-time reward twice.
- A retry with the same redemption operation ID returns the prior result without
  spending again.
- An unowned avatar cannot be equipped.
- The Crew profile is usable on desktop and mobile without horizontal overflow.
- Logged-out visitors see a login path, never another customer's Crew data.
- Rocky IA receives server-authored Crew context only for a logged-in customer.
- Existing tests, production build and secret scan continue to pass.

## Test strategy

- Unit tests for euro conversion, levels and public profile projections.
- Service tests for order credit, duplicate delivery, redemption idempotency,
  insufficient balance and avatar ownership.
- Webhook tests for a signed paid order and duplicate delivery.
- HTTP tests for authentication and origin enforcement on Crew endpoints.
- Component tests for logged-out and populated Crew profile states.
- Browser validation at desktop and mobile widths.

## Risks and rollout

- The encrypted file store is intentionally single-instance. Multiple Node
  replicas require a transactional shared store before enabling rewards.
- `orders/paid` must be subscribed in Shopify and delivered to the final HTTPS
  domain before credits can occur.
- Customer Account login must be configured so purchases have a stable customer
  identity.
- Refund reconciliation is a release blocker for assigning redeemable monetary
  value to tickets; the first release should keep rewards digital until that
  follow-up is complete.

## References

- https://shopify.dev/docs/apps/build/webhooks
- https://shopify.dev/docs/api/webhooks/2026-07
- https://shopify.dev/docs/api/admin-graphql/2026-07/enums/WebhookSubscriptionTopic
- https://shopify.dev/changelog/removed-checkout-id-from-checkouts-and-orders-webhooks

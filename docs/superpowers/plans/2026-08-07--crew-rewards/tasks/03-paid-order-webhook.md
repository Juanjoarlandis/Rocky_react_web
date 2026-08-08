# Task

Credit Crew rewards from verified Shopify paid-order webhooks.

# Goal

Pass authenticated `orders/paid` payloads to the Crew service exactly once per
order while preserving delivery deduplication and lifecycle handling.

# Inputs / prerequisite decisions

- Shopify 2026-07 `orders/paid` payload fields from the approved spec.
- Order-level idempotency is authoritative because Shopify can redeliver events.

# Files likely to change

- `server/shopify/config.mjs`
- `server/shopify/config.test.mjs`
- `server/shopify/webhooks.mjs`
- `server/shopify/webhooks.test.mjs`
- `server.mjs`
- `.env.example`

# Detailed changes to make

- Allow `orders/paid` by default when webhooks are configured.
- Parse JSON only after raw-body HMAC verification.
- Invoke a delivery callback for paid orders, including retries, relying on
  order-level idempotency to recover after partial failures.
- Log skip/failure reasons without order payloads or customer data.

# Commands to run

- `npx vitest run server/shopify/config.test.mjs server/shopify/webhooks.test.mjs server/shopify/routes.test.mjs`

# Acceptance criteria

- Signed paid order credits the expected profile.
- Duplicate webhook/order grants nothing twice.
- Invalid HMAC never parses or processes the payload.

# Risks / edge cases

- Shopify subscription and `read_orders` scope remain deployment prerequisites.

# Done evidence to report back

- Signed webhook test output and configuration diff.

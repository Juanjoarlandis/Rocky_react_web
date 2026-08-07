# Task

Implement fixed Shopify server contracts.

# Goal

Provide a least-privilege Storefront catalog, server-held cart, Customer Account PKCE flow, optional Admin token acquisition, and authenticated webhook ingress.

# Inputs / prerequisite decisions

- API version `2026-07` for Storefront/Admin.
- Customer endpoints are discovered from the configured store domain.
- Shopify features remain disabled unless their complete configuration is present.

# Files likely to change

- `server/shopify/config.mjs`, `graphql.mjs`, `storefront.mjs`, `cart.mjs`
- `server/shopify/customer-account.mjs`, `admin.mjs`, `webhooks.mjs`, route composition
- Shopify tests and `.env.example`

# Detailed changes to make

- Validate the canonical `.myshopify.com` domain.
- Use allowlisted GraphQL documents, timeouts, structured errors, and bounded pagination.
- Keep the full Cart ID encrypted server-side; expose only sanitized cart data.
- Serialize cart mutations and store idempotency responses.
- Implement Customer Account discovery, PKCE/state/nonce, token storage, session rotation, account query, and logout.
- Obtain Admin tokens with single-flight refresh but expose no generic Admin proxy.
- Verify webhook raw-body HMAC, shop/topic/version, and persistent delivery deduplication.

# Commands to run

- `npm test -- --run shopify`

# Acceptance criteria

- Client prices and Cart IDs are never trusted or returned.
- OAuth transactions are one-use and replay-safe.
- Invalid webhook bytes/signatures/shops fail; duplicate IDs are idempotent.

# Risks / edge cases

- Final OAuth and GraphQL schema behavior requires an HTTPS development-store E2E.

# Done evidence to report back

- Mocked contract tests and configuration fail-closed tests.

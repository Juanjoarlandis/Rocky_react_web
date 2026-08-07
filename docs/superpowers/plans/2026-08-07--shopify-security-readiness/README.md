# Shopify security readiness

## Problem statement

Prepare the current ROCKY 035 React/Express application for a single organization-owned Shopify store without exposing credentials, cart secrets, customer tokens, or client-controlled commerce data.

## Scope

- Replace Create React App with a maintained Vite build and a production static-serving path.
- Harden the current Express boundary, especially the public Rocky IA endpoint.
- Add encrypted single-instance persistence for cart sessions, OAuth transactions, customer tokens, idempotency records, and webhook delivery IDs.
- Add fixed Shopify Storefront operations for catalog and server-held carts.
- Add a PKCE Customer Account flow and raw-body webhook verification.
- Make the React storefront consume Shopify as the commerce authority when configured and remain a non-checkout demo when it is not.
- Add unit, integration, build, dependency, and browser verification.

## Non-goals

- No multi-merchant installation platform.
- No custom checkout, payment, inventory reservation, order service, or local commerce authority.
- No complete product/customer/order mirror unless a later operational need justifies one.
- No production credentials, Shopify app creation, protected-customer-data approval, or live webhook subscription; those require external account access.
- No history rewrite. Historical credentials must be rotated externally before real Shopify secrets are introduced.

## Architecture delta

The browser can read sanitized catalog data and send only variant IDs, quantities, and operation IDs. A same-origin Express BFF owns the full Shopify Cart ID, encrypted persistence, Customer Account tokens, and webhook HMAC verification. Shopify remains authoritative for product publication, variant identity, price, currency, availability, cart cost, checkout, customer, order, and payment state.

## Dependencies and sequencing

- Use Node 24 and built-in `fetch`, `crypto`, and filesystem APIs.
- Remove `react-scripts`, `node-fetch`, and unrestricted CORS middleware.
- Add only Vite/Vitest/jsdom/plugin-react as development tooling.
- Upgrade Express within major 4 and React Router within major 6 to minimize application changes.
- Build/security foundation precedes Shopify features; encrypted storage precedes carts/accounts/webhooks; frontend integration follows stable server contracts.

## Verification matrix

| Surface | Evidence |
| --- | --- |
| Build | `npm run build` and production static smoke |
| Unit/integration | `npm test -- --run` |
| Dependencies | `npm audit --json` and `npm audit --omit=dev --json` |
| HTTP security | integration tests plus live header/origin probes |
| Secrets | tracked-file/history-name checks and frontend bundle canary scan |
| Shopify | mocked GraphQL contracts plus development-store checklist |
| User flow | browser catalog, cart-disabled demo, and configured-mode mocks |

## Risks and rollback

- The worktree already contains extensive user changes. Every edit must preserve current visual work and avoid destructive Git operations.
- Customer Account and live Shopify behavior cannot be fully proven without a configured development store and HTTPS callback.
- Encrypted file persistence supports one controlled server instance. Multi-instance deployment requires migration to a shared relational store.
- Rollback is disabling Shopify environment variables and retaining checkout-off demo behavior.

## Tasks

1. `tasks/01-build-runtime.md`
2. `tasks/02-http-security.md`
3. `tasks/03-encrypted-storage.md`
4. `tasks/04-shopify-server.md`
5. `tasks/05-storefront-ui.md`
6. `tasks/06-verification.md`

# Progress

## Task 01 — Build/runtime

- Status: completed
- Changed: CRA entry/build/test configuration migrated to Vite/Vitest; Node 24 declared; runtime/build dependencies separated; old CRA lock regenerated.
- Evidence:
  - `npm test -- --run`: 1 file, 2 tests passed.
  - `npm run build`: Vite production build completed.
  - Install graph: 300 packages and 3 moderate audit findings after regeneration.
- Open risk: production Express static serving is completed in Task 02.

## Task 02 — HTTP security

- Status: completed
- Changed: exact-origin policy, CSP/security headers, bounded JSON, chat schema validation, per-IP rate limit, global concurrency limit, timeout/disconnect cancellation, normalized chat DTO, health endpoint, static production serving, and graceful shutdown. Removed wildcard CORS and the legacy proxy route.
- Evidence:
  - `npm test -- --run`: 2 files, 8 tests passed.
  - `npm run build`: production build completed under the strict CSP-compatible UI.
- Open risk: live reverse-proxy trust must match the eventual hosting topology.

## Task 03 — Encrypted storage and sessions

- Status: completed
- Changed: AES-256-GCM atomic encrypted store, serialized mutations, expiry/consume/set-if-absent operations, in-memory test store, and opaque rotating application sessions with hardened cookies.
- Evidence:
  - `npm test -- --run server/encrypted-store.test.mjs server/session.test.mjs`: 2 files, 7 tests passed.
  - Disk test proves token plaintext is absent from the encrypted envelope.
- Open risk: file storage intentionally supports one persistent server instance; horizontal deployment requires a shared relational store.

## Task 04 — Shopify server contracts

- Status: completed
- Changed: fail-closed Shopify configuration; fixed Storefront product/cart documents; sanitized product/cart DTOs; server-held full Cart ID; idempotent serialized cart routes; Customer Account PKCE/state/nonce/ES256-or-RS256 ID-token verification/refresh/logout; Admin client-credentials token cache; raw-body HMAC webhook route and persistent deduplication.
- Evidence:
  - `npm test -- --run`: 10 files, 29 tests passed.
  - Route integration verifies raw webhook bytes are handled before JSON parsing and Cart ID secrets remain server-side.
- Open risk: live schema, OAuth callback, scopes, protected-customer-data approval, and checkout domain require a Shopify development store.

## Task 05 — Storefront UI

- Status: completed
- Changed: same-origin Shopify client/hook, safe demo fallback, sanitized product/cart mapping, handle routes, variant selection, sold-out/cart-disabled states, Shopify Money formatting, authoritative cart totals, validated checkout handoff, and conditional customer login/logout.
- Evidence:
  - Browser API tests prove client-supplied title/price/subtotal fields are discarded.
  - Catalog/cart normalization and hook tests cover demo and Shopify modes.
  - Variant component test verifies that the selected variant GID and its Shopify price move together.
  - `npm test -- --run`: 16 files, 45 tests passed at the integration checkpoint.
  - `npm run build`: Vite/React 19/React Router 8 production bundle completed.
- Open risk: the configured-mode browser path still requires a real development store and HTTPS callback.

## Task 06 — Verification and release readiness

- Status: completed
- Changed: React Router upgraded to the patched 8.3.0 line, external icon runtime removed, production HTTPS enforced, commerce rate limiting added, OAuth state bound to the initiating session, discovery URLs constrained to HTTPS, token/state retention bounded, Storefront private-token headers corrected, secret/bundle scanning added, and CI/security documentation created. Final hardening added bounded outbound OAuth/Admin requests, strict token lifetime parsing, and required OIDC time claims plus audience/authorized-party and JWK-use validation.
- Evidence:
  - Full and production-only `npm audit`: 0 vulnerabilities.
  - Local secret/bundle scan: passed without reading ignored `.env` files.
  - Production HTTP smoke: health/static SPA routes returned the expected CSP/HSTS/no-store headers; untrusted and missing origins were rejected before mutation.
  - Real-browser demo flow: home, product detail, cart, drops, Studio/Spotify CSP, and unconfigured chat fallback verified without unexpected console errors.
  - Mocked Shopify browser flow: variant availability, server prices/totals, cart checkout state, and absence of Cart IDs/tokens in browser storage verified.
  - Final Node 24.14.0 checkpoint: clean `npm ci`, 16 files and 49 tests passed, production build passed, secret scan passed, and full plus production-only audits reported 0 vulnerabilities.
  - Two browser-based Oracle review attempts were run with secret-free, explicitly bounded bundles. Both remained incomplete until their time limits and were cancelled; no partial response was treated as approval.
- Remaining external work: real Shopify development-store schema/OAuth/webhook validation, credential rotation and coordinated Git-history cleanup, and hosting-specific reverse-proxy/shared-store configuration.

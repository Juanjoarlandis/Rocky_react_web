# Task

Authenticated Crew API inside the existing Shopify account router.

# Goal

Allow only the logged-in Shopify customer to read and mutate their Crew profile.

# Inputs / prerequisite decisions

- Reuse `sessions.read()` and `customerAccounts.getCustomerProfile()`.
- Reuse the existing exact-origin middleware for mutations.

# Files likely to change

- `server/shopify/routes.mjs`
- `server/shopify/routes.test.mjs`
- `src/shopify/api.js`

# Detailed changes to make

- Add GET profile, PATCH avatar and POST redemption endpoints.
- Return stable 401/409/422-style errors without leaking internal state.
- Inject the Crew service and optional Customer Account test double.
- Add browser API functions.

# Commands to run

- `npx vitest run server/shopify/routes.test.mjs`

# Acceptance criteria

- Logged-out access is rejected.
- Reads return only the authenticated customer profile.
- Cross-origin mutations are rejected before state changes.
- Valid mutations return the updated public profile.

# Risks / edge cases

- Expired Shopify tokens follow the current Customer Account error behavior.
- Login callback should return to `/mi-crew` safely.

# Done evidence to report back

- HTTP tests showing auth and origin isolation.

# Task

Connect the React storefront to sanitized Shopify contracts.

# Goal

Use Shopify product/variant/cart state when configured while preserving a safe, checkout-disabled visual demo when Shopify is absent.

# Inputs / prerequisite decisions

- Local product JSON is presentation/demo data only.
- Product URLs use handles and cart actions use variant GIDs.

# Files likely to change

- `src/App.js`, product/cart/button components, price utility
- A small `src/shopify/` client/hook and focused CSS updates

# Detailed changes to make

- Load capability/catalog/cart state from same-origin endpoints.
- Add explicit variant selection and sold-out states.
- Send only variant ID, quantity, line ID, and operation ID.
- Display Shopify-provided amount/currency/cost; do not calculate payable totals.
- Keep checkout disabled in demo mode and redirect only to a validated server-provided URL.
- Add account login/logout controls only when enabled.

# Commands to run

- `npm test -- --run src`
- `npm run build`
- Browser smoke in demo and mocked Shopify modes.

# Acceptance criteria

- No full Cart ID or token enters browser storage or responses.
- Client product fields cannot influence Shopify mutation input.
- Existing design and character assets remain intact.

# Risks / edge cases

- Existing local product IDs and Shopify handles need a compatible routing transition.

# Done evidence to report back

- Component tests, build, and browser screenshots/smoke results.

# Task

Integrate the concepts into the storefront and Rocky IA demo recommendation path.

# Goal

Expose all six mockups as preview products and make their metadata queryable when Shopify is unavailable.

# Inputs / prerequisite decisions

The existing JSON catalog remains the browser demo source. Configured Shopify remains authoritative. Preview cards must not claim live availability.

# Files likely to change

- `src/PRODUCTOS_ROCKY.json`
- Rocky IA catalog-selection server modules and focused tests

# Detailed changes to make

- Append stable product records with handles, drop handles, image alt text, semantic descriptions, preview specifications, and no real price.
- Reuse the current product/drop/detail UI without adding layout abstractions.
- Add the smallest server-side fallback needed to select sanitized non-live demo products when no Storefront client exists.
- Cover representative collection, color, and motif queries.

# Commands to run

- `npm run test:run -- <focused test files>`

# Acceptance criteria

The storefront exposes all three drops and six products. Rocky IA returns relevant preview cards locally and never uses the fallback over configured Shopify.

# Risks / edge cases

Synthetic demo variants must never be accepted by the Shopify cart path. Keep preview availability explicit and non-live.

# Done evidence to report back

Changed records, test queries, and passing focused test output.

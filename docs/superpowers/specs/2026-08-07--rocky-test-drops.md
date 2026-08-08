# Goal

Add six visually distinct ROCKY 035 T-shirt concepts across three test drops so the storefront has more variety and Rocky IA can exercise recommendation queries by color, mood, motif, and collection.

# Non-goals

- Do not publish fictional inventory, prices, or availability to live Shopify.
- Do not change checkout, payments, production deployment, or existing products.
- Do not redesign the current product grid, drop menu, or product detail page.

# Constraints

- Preserve the current square, front-facing oversized T-shirt mockup language.
- Store every final project asset under `public/products/` as an optimized WebP.
- Keep the concepts clearly marked as previews with no real price in both demo and configured Shopify presentation modes.
- Preserve all unrelated local changes in the dirty worktree.
- Add no dependencies.

# Proposed approach

Create two mockups for each of three deliberately different drops:

- `ASPHALT AFTERDARK`: dark garments, racing/graffiti/night signals.
- `COLMENA SIGNAL`: light/cobalt garments, characters/radio/analog-tech signals.
- `COSTA 035`: sand/turquoise garments, skate/sun/summer signals.

Add descriptive product records to a shared preview catalog consumed by the browser and server. Each record will include a stable handle, drop handle, title, image alt text, semantic description, preview specification, and no real price. Layer those concepts after real Shopify products when Shopify is configured, omitting any preview whose handle has become a real Shopify product. Add the same concepts to Rocky IA ranking after a successful Shopify lookup, while preserving real Shopify variants and availability as the only commerce authority. When Shopify is unavailable, Rocky IA can rank the preview catalog alone. A configured Shopify lookup failure remains visible and does not silently fall back to previews.

# Affected areas

- `public/products/`: six new mockups.
- `src/PRODUCTOS_ROCKY.json`: six preview products.
- Shopify/demo catalog composition, Rocky IA catalog selection boundary, and focused tests.
- Existing catalog/drop/recommendation tests where needed.

# Acceptance criteria

- Six new mockups are visible on the storefront and product detail routes.
- The drop menu exposes three new collection routes and each route contains two products.
- New concepts are visibly and semantically distinct.
- Rocky IA can rank representative concept queries with and without configured Shopify without claiming live stock.
- The active Shopify-backed ngrok storefront visibly includes the concepts after real products, and real products win any handle collision.
- No new product can be checked out as real Shopify merchandise.
- Browser verification through the active ngrok URL shows the new assets without broken images or console errors.

# Test strategy

- Focused catalog/recommendation unit tests for drop, color, and motif matches.
- Existing test suite, production build, and secret scan.
- Real-browser route sweep on desktop and mobile through ngrok.

# Risks / rollout notes

- Generated text may be imperfect; inspect every asset and regenerate only failed concepts.
- The active ngrok server may need a local rebuild/restart before it serves the new bundle.
- Live Shopify remains authoritative when configured; publishing these concepts there requires a separate explicit action.

# Open questions

None. The user approved generation, application, and visual presentation on 2026-08-07.

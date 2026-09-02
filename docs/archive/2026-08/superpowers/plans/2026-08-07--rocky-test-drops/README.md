# ROCKY test drops

## Problem

The demo storefront has one drop and only three released-looking product images. That is too little visual and semantic variety for meaningful Rocky IA recommendation tests.

## Scope and non-goals

Generate six concept mockups, add them to the local catalog under three new drops, and make the demo recommendation path testable without live Shopify. Do not publish inventory, alter checkout, add dependencies, redesign storefront components, or deploy production.

## Behavior delta

The existing catalog renders six additional preview products and three additional drop links in demo and configured Shopify presentation modes. Real Shopify products remain the only sellable records and win handle collisions. Rocky IA ranks live and preview results together after a successful Shopify lookup, and uses the explicitly non-live local catalog alone when Shopify is not configured.

## Sequence

1. [Generate and optimize mockups](tasks/01-generate-assets.md)
2. [Integrate catalog and recommendations](tasks/02-integrate-catalog.md)
3. [Verify and present through ngrok](tasks/03-verify-and-present.md)

## Verification matrix

| Surface | Evidence |
| --- | --- |
| Image quality | Visual inspection of all six square WebP assets |
| Storefront | Home, drop filter, and detail route show the correct images |
| Recommendation | Focused tests for drop, color, and motif queries |
| Regression | `npm run check` |
| Public preview | Desktop/mobile browser screenshots through ngrok; clean console |

## Risks and rollback

Generated text can require one targeted regeneration. Catalog rollback is removal of the six appended records and their six new assets. The recommendation fallback stays isolated from configured Shopify mode.

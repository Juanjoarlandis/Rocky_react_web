# Goal

Increase the visual impact of the first viewport on the storefront home route without replacing, redrawing, adding or removing the two existing hero characters.

# Selected visual target

- Product Design ideation option 1, selected by the user on 2026-08-10.
- Workspace reference: `output/visual-audit/round-06-home-impact/reference-option-1.png`.
- Reference SHA-256: `401a592dbd44be6501383f87dae4a25ff43ad2442f7aa25e51e8d14a325a939b`.

# Non-goals

- No character, logo, product-image, product-card, navigation or MiniPlayer redesign.
- No new dependencies, routes, API calls, Shopify changes or generated production assets.
- No category-page hero expansion.
- No production deployment in this slice.

# Constraints

- Reuse the current `cruiserPatinando` and `grafiteroSpray` assets unchanged.
- Preserve the paper, ink, red and blue palette and the existing font families.
- Keep the MiniPlayer in normal flow and the product grid discoverable in the first viewport.
- Keep the home useful at 360, 390, 400, 720, 820 and 1440 CSS px.
- Preserve the compact heading used by `/products/:category`.

# Proposed approach

Turn the home-only `product-page-head` into an editorial hero. The left copy block contains a much larger `ROCKY 035` heading, the existing phrase `HECHO DESDE LA COLMENA`, the live product count and a `VER DROP 4` link to the real product grid. The existing red line remains the visual bridge between the two unchanged characters and the catalog.

Desktop uses a left-weighted poster composition with generous negative space and a visible four-card row below. Tablet reduces title and character scale while retaining the same hierarchy. Mobile stacks the copy above a shorter character line and keeps the first product row visible below it.

# Affected areas

- `src/components/ProductPage.jsx`
- `src/components/ProductPage.test.jsx`
- `src/styles/ProductPage.css`
- Visual evidence under `output/visual-audit/round-06-home-impact/`

# Acceptance criteria

1. `/` shows `ROCKY 035`, `HECHO DESDE LA COLMENA`, the live product count and a working `VER DROP 4` link before the product grid.
2. The CTA targets the actual home grid and does not create a new route.
3. Both existing characters retain their current source files, poses and decorative semantics.
4. Category pages keep their compact existing heading and do not show the home tagline or CTA.
5. At 1440 × 1000, the composition visibly follows selected option 1 and the beginning of the first product row remains visible.
6. At mobile widths, the hero does not overflow horizontally, hide navigation, obscure the MiniPlayer or push the catalog entirely beyond an 844–900 px first viewport.
7. Keyboard focus, touch targets and reduced-motion behavior remain valid.
8. Targeted tests, full checks and visual design QA pass before handoff.

# Test strategy

- Component tests for the home-only content, CTA target, source order and category exclusions.
- CSS contract checks for the editorial title scale and mobile/tablet layout boundaries.
- Full `npm run check` and whitespace validation.
- Same-state screenshots at desktop, tablet and mobile, compared with the selected reference.

# Risks / rollout notes

- A literal desktop-sized title can overwhelm mobile; use bounded `clamp()` sizing instead of fixed pixels.
- A taller hero can bury the store; measure the first product row in each target viewport.
- The ImageGen reference is art direction rather than a pixel source. Existing assets and live product data remain authoritative.
- The working tree already contains the previously deployed visual round and must not be reset or overwritten.

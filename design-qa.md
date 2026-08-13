# Design QA — Homepage first impact, option 1

Date: 2026-08-11

## Comparison target

- Source visual truth: `output/visual-audit/round-06-home-impact/reference-option-1.png`
- Source SHA-256: `401a592dbd44be6501383f87dae4a25ff43ad2442f7aa25e51e8d14a325a939b`
- Route and state: homepage, Shopify catalog loaded, top of page, default theme, no hover/focus state, surprise peeker still in its initial hidden interval.
- Browser: ChatGPT Atlas, as selected by the user.
- Existing character art retained without replacement: `grafitero-spray.webp` and `cruiser-patinando.webp`.

## Normalization and evidence

### Desktop fidelity comparison

- CSS viewport: `1505 × 901`.
- Source original: `1505 × 1045` at 1×; normalized by taking the top `1505 × 901` content crop.
- Implementation source capture: Atlas Retina screen capture `3024 × 1964`; the browser content region was `3010 × 1802` at 2× and was normalized with Lanczos downsampling to `1505 × 901`.
- Source normalized: `output/visual-audit/round-06-home-impact/reference-option-1-1505x901.png`
- Implementation normalized: `output/visual-audit/round-06-home-impact/implementation-home-1505x901-final-clean.png`
- Combined comparison input opened and judged at equal size: `output/visual-audit/round-06-home-impact/compare-reference-vs-implementation-1505x901-final-clean.png`

The comparison contains the reference and implementation together in one image, at the same route, viewport width, top-of-page state, crop, and normalized pixel dimensions.

### Responsive evidence

- Tablet: `820 × 900` CSS pixels, `output/visual-audit/round-06-home-impact/implementation-home-820x900-final.png`.
- Mobile: `360 × 900` CSS pixels, `output/visual-audit/round-06-home-impact/implementation-home-360x900-final.png`.
- The tablet capture was normalized from a `1640 × 1800` Atlas Retina content region.
- The mobile capture was normalized from the Atlas responsive preview region (`648 × 1620`) to the declared `360 × 900` CSS viewport.
- The source option is desktop-only, so responsive evidence is evaluated as a faithful reflow of the selected direction rather than a pixel comparison against an invented mobile mock.

No separate focused-region image was needed: the final combined input is retained at its original `3010 × 901` pixels and the complete scoped region—headline, tagline, count, CTA, both retained characters, red guide line, and the first product row—is readable without enlarging a detail crop. The responsive captures were opened separately at their original normalized sizes.

## Comparison history

### Iteration 1 — blocked by P1 hierarchy drift

- Evidence: `output/visual-audit/round-06-home-impact/compare-reference-vs-implementation-1505x1045.png`.
- Finding: the first implementation kept the headline inside the existing 1200 px content inset, capped it at `8.5rem`, and used a `190 × 52` CTA. The result was materially quieter and more inset than option 1.
- Fixes:
  - allowed only the homepage hero copy to break 96 px beyond the catalog inset at wide viewports;
  - raised the title scale to `clamp(5.75rem, 12vw, 11.25rem)`;
  - increased the tagline scale;
  - resized the desktop CTA to at least `240 × 64` and reused the product's existing typographic arrow treatment;
  - preserved explicit tablet and mobile overrides so the enlarged desktop treatment cannot overflow narrow screens.
- Post-fix evidence: `output/visual-audit/round-06-home-impact/compare-reference-vs-implementation-1505x901-final.png`.

### Iteration 2 — blocked by P2 character/line placement and responsive interruptions

- Evidence:
  - desktop: `output/visual-audit/round-06-home-impact/compare-reference-vs-implementation-1505x901-final.png`;
  - mobile wrap check: `output/visual-audit/round-06-home-impact/atlas-home-400x900-postfix-visible-raw.png`;
  - clean mobile follow-up: `output/visual-audit/round-06-home-impact/atlas-home-400x900-postfix-final-raw.png`.
- Findings:
  - the live desktop characters and red guide line sat lower and read smaller than in the selected composition;
  - at one narrow width the tagline wrapped while adjacent narrow widths did not;
  - the global surprise peeker could select the new hero as a hiding surface and overlap the count/CTA.
- Fixes:
  - lifted the desktop guide line by 28 px, enlarged both retained character files proportionally, and tightened the gap before the catalog;
  - reset the line offset and character sizes inside the existing tablet/mobile breakpoints;
  - let the mobile tagline use the full available copy width;
  - added `.product-page-head--home` to the peeker's blocked-zone selector and covered the reservation with a unit test.
- Post-fix evidence:
  - final same-size comparison: `output/visual-audit/round-06-home-impact/compare-reference-vs-implementation-1505x901-final-clean.png`;
  - tablet: `output/visual-audit/round-06-home-impact/implementation-home-820x900-final.png`;
  - mobile: `output/visual-audit/round-06-home-impact/implementation-home-360x900-final.png`.

## Final findings

There are no remaining actionable P0, P1, or P2 findings in the scoped homepage-first-impact composition.

### Required fidelity surfaces

- Fonts and typography: the existing ROCKY display and handwritten families remain in use. The headline now carries the reference's dominant weight and scale, stays on one line at desktop/tablet/mobile evidence widths, and the tagline/count retain their distinct hierarchy without truncation or unexpected wrapping.
- Spacing and layout rhythm: the copy begins close to the reference's left edge at wide viewports, the CTA and product count follow the source rhythm, the guide line bridges the hero to the first product row, and the 820/360 reflows keep safe edges and visible catalog continuation.
- Colors and visual tokens: paper, ink, muted copy, red accent, card borders, and shadows continue to use the existing project tokens. The balance matches the selected black/cream/red direction without introducing a new palette or gradient.
- Image quality and asset fidelity: the source site's real logo, player, product images, background treatment, and both requested character assets are retained. They are proportionally scaled, remain sharp in Atlas, and show no stretching or transparency halos. No placeholder, custom replacement illustration, or generated character was introduced.
- Copy and content: `ROCKY 035`, `HECHO DESDE LA COLMENA`, the live product count, and `VER DROP 4` match the selected concept. The count remains data-driven and the CTA points to the real catalog grid.
- Affordance and accessibility: the CTA is a semantic anchor with a visible focus ring and touch-safe mobile height; `#productos` exists and has scroll-margin; decorative character/line media remain hidden from assistive technology. The primary CTA target and home/category state separation are covered by component tests.

### Primary interaction and runtime checks

- Primary CTA contract: verified by `ProductPage.test.jsx` (`href="#productos"`, matching grid `id`, and DOM order).
- Responsive behavior: visually checked in Atlas at 1505, 820, 400, 360, and the explicit 900/640 CSS breakpoints are covered by the stylesheet contract test.
- Dynamic peeker exclusion: verified by `CuriousPeeker.test.jsx` and clean Atlas captures; the character may still appear later on eligible catalog cards, but not over the hero.
- Atlas showed no runtime error overlay during the captures. The detached Atlas DevTools surface rendered blank, so the console itself was not used as completion evidence; repository checks and browser rendering are the evidence for this Codex Desktop round.

## Follow-up polish (P3, non-blocking)

- The ImageGen reference paints a more exaggerated curve in the red guide line than the live reusable squiggle. The implementation intentionally keeps the site's existing line language and animation-safe DOM instead of rasterizing the reference.
- The reference's large decorative star is more prominent. The implementation keeps the existing brand star treatment so this round does not introduce or approximate a new asset.
- At 1505 px the live copy begins roughly a few tens of pixels farther right than the generative mock. This is accepted to preserve safe browser edges and the existing catalog grid alignment.

## Implementation checklist

- [x] Preserve both existing hero characters.
- [x] Match option 1's desktop hierarchy and CTA emphasis.
- [x] Keep the catalog visible in the first viewport.
- [x] Protect tablet and mobile compositions.
- [x] Prevent the surprise peeker from covering the hero.
- [x] Compare source and implementation together at the same normalized viewport.
- [x] Resolve every P0/P1/P2 finding and retain final evidence.

final result: passed

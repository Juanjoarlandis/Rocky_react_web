# Design QA — Larguirucho estático en Mi Crew

## Artifacts and normalization

- Source visual truth: `/Users/juanjo/.codex/generated_images/019fdb92-3d2b-7dc2-95f2-3deb98c76b17/exec-4dd80f74-3829-4030-903e-b74499ce430c.png`
- Source dimensions: 1254 × 1254 px, RGB, nominal 1× density.
- Production master after background removal and geometry crop: `/Users/juanjo/Rocky_react_web/src/images/characters/larguirucho-esquina.png`, 829 × 1157 px, RGBA.
- Browser implementation, desktop: `/tmp/rocky-larguirucho-final-desktop.jpg`, 1298 × 811 px.
- Browser implementation, mobile: `/tmp/rocky-larguirucho-final-mobile.jpg`, 344 × 745 px.
- Desktop CSS viewport: 1309 × 818 CSS px, reported device pixel ratio 1.1. Requested browser viewport: 1440 × 900.
- Mobile CSS viewport: 354 × 767 CSS px, reported device pixel ratio 1.1. Requested browser viewport: 390 × 844.
- Density normalization: the source and each implementation capture were independently scaled to 640 px high before being placed side by side. No crop was applied to the character.
- Desktop side-by-side comparison: `/tmp/rocky-larguirucho-final-qa-desktop.jpg`.
- Mobile side-by-side comparison: `/tmp/rocky-larguirucho-final-qa-mobile.jpg`.
- State: `/mi-crew`, local demo/Shopify-disconnected gate, page scrolled to the top, light theme.

## Findings

- No actionable P0, P1, or P2 findings remain.
- The selected character, pose, face, suit, red accents and line quality are preserved; the integration uses the generated raster asset, not a code-drawn substitute.
- The character is completely static. Browser-computed styles report `animation-name: none` and `transition-duration: 0s` at both tested widths.
- The geometry reads intentionally: the top and right edges are aligned to the host corner, and the standing foot lands on the top edge of the following preview panel. Desktop top/right/bottom deltas are 0 px; mobile deltas are within 0.02 px of zero because of fractional CSS scaling.
- Mobile has no horizontal overflow: document scroll width was 343 px for a 354 px CSS viewport.

## Required fidelity surfaces

- Fonts and typography: no font, weight, line-height, wrapping or copy changes were introduced. The desktop and mobile headings retain the existing ROCKY hierarchy; the narrower mobile wrap remains readable and is not caused by the illustration.
- Spacing and layout rhythm: the desktop asset is 300 × 419 CSS px; on the narrow mobile capture it is 141.8 × 198.1 CSS px. Its reserved host uses the same aspect ratio, so there is no floating floor gap. The illustration remains part of document flow and scrolls away with the page rather than following the user.
- Colors and visual tokens: the source black, white and ROCKY red are unchanged. Transparency reveals the existing `--paper` background without an added rectangle, gradient or shadow.
- Image quality and asset fidelity: the optimized 600 × 838 WebP remains sharp at the maximum rendered width of 300 CSS px. The white face and shirt details survived background removal; no visible matte, white cutout, blur or compression artifact appears in either comparison.
- Copy and content: no application text was changed. The character is decorative (`alt=""`, `aria-hidden="true"`) and adds no duplicated or misleading accessible content.

## Full-view comparison evidence

- Desktop: the side-by-side comparison shows the complete source pose reproduced in the upper-right of the Mi Crew gate. It balances the copy on the left and visually stands on the preview frame without covering the heading, status notice or navigation.
- Mobile: the full mobile capture shows the same complete silhouette at a reduced scale. The face, bent leg, tie and two shoes remain distinguishable, and the character does not overlap the fixed mini-player.

## Focused region comparison evidence

A separate crop was not needed because the character occupies a large, unobstructed region in both full-view captures. The side-by-side composites retain enough resolution to inspect the face, outline, red details, transparency edge, top/right alignment and foot contact directly.

## Comparison history

### Iteration 1 — blocked by a mobile P2

- Earlier finding: at the narrow mobile viewport, the first responsive size rendered the character at approximately 198.5 × 277.3 CSS px. The fixed mini-player overlapped it by approximately 150.3 × 56.3 px, obscuring the lower body. The fixed 300 px host also left about 23 px between the foot and the following panel edge.
- Impact: the overlap weakened the posture and made the character look partially covered by an unrelated control.
- Fix: below 480 px, the character now uses `min(40vw, 160px)` and the host height is derived from the raster aspect ratio with `min(55.87vw, 223.5px)`.
- Post-fix evidence: at the final mobile viewport the character measures approximately 141.8 × 198.1 CSS px, the host bottom and character bottom differ by only 0.014 px, and its vertical overlap with the mini-player is 0 px.

### Iteration 2 — passed

- Desktop and mobile were recaptured after the fix and recombined with the source image.
- No P0/P1/P2 visual difference remained. No further visual correction was made after this pass.

## Primary interactions and runtime checks

- Loaded `/mi-crew` from a fresh local browser reload at desktop and mobile widths.
- Verified responsive reflow, top/right/bottom geometric contact, absence of horizontal overflow and absence of animation/transition.
- Verified the fixed mini-player remains unobstructed in the narrow mobile state.
- Console checked after final reloads: no error-level messages; only Vite connection/debug and React development notices were present.
- The authenticated profile branch is covered structurally by the component test but could not be browser-captured locally because the local runtime intentionally exposes the Shopify-disconnected demo state.

## Implementation checklist

- [x] Use the selected ImageGen raster asset.
- [x] Remove the character from the animated peeker lifecycle.
- [x] Place it statically in a corner that matches its pose.
- [x] Preserve the full silhouette and transparent background.
- [x] Keep navigation, copy and mini-player unobstructed.
- [x] Validate desktop and narrow mobile layouts.
- [x] Confirm no animation, transition or horizontal overflow.

## Follow-up polish

- P3 test gap: capture the authenticated Shopify profile state in a production-like local session when that account runtime is available. The same static asset and responsive class are rendered there, and the component test verifies its presence.

final result: passed

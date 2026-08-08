# Task

Remove offscreen and oversized image transfer without visual changes.

# Goal

Reduce initial image bytes using native lazy loading, intrinsic sizing, and measured WebP variants.

# Inputs / prerequisite decisions

- Recorded source dimensions, rendered CSS maxima, and baseline waterfalls.

# Files likely to change

- `src/components/NavBar.jsx`
- `src/components/Footer.jsx`
- `src/components/ProductPage.jsx`
- `src/components/StreetWall.jsx`
- `src/components/SplashIntro.jsx`
- Image imports/assets directly used by those components

# Detailed changes to make

- Lazy-load genuinely below-fold images; do not lazy-load splash art.
- Add async decoding and intrinsic dimensions where they do not alter CSS sizing.
- Give high priority to at most one visible product image, conditional on the splash state if needed.
- Generate same-dimension lossless WebP when worthwhile and right-sized 2x shell variants for measured oversized icons/illustrations.
- Retain original PNG sources.

# Commands to run

- `npm run build` and compare asset inventory.
- Browser screenshots/network checks at desktop and mobile widths.

# Acceptance criteria

- Offscreen footer/street assets are absent from the initial request set.
- Image bytes materially decrease.
- No clipping, blur, alpha halo, position, dimension, or layout change is visible.

# Risks / edge cases

- Right-sizing changes source pixels and requires screenshot validation.
- Product priority must not compete unnecessarily with first-session splash assets.

# Done evidence to report back

- Byte comparison, screenshots, request list, and any retained exception.

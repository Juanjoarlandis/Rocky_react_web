# Task

Implement the selected home hero with tests.

# Goal

Create the option-1 editorial composition on `/` without changing character assets, commerce behavior or category headers.

# Inputs / prerequisite decisions

- Approved spec: `docs/superpowers/specs/2026-08-10--homepage-first-impact.md`.
- Selected reference: `output/visual-audit/round-06-home-impact/reference-option-1.png`.

# Files likely to change

- `src/components/ProductPage.jsx`
- `src/components/ProductPage.test.jsx`
- `src/styles/ProductPage.css`

# Detailed changes to make

- Add home-only tagline and a CTA targeting the real product grid.
- Give the grid a stable fragment target on home.
- Keep existing title/count/character assets and category behavior.
- Add bounded desktop/tablet/mobile layout rules matching the selected reference.

# Commands to run

- `npm run test:run -- src/components/ProductPage.test.jsx`
- `npm run check`
- `git diff --check`

# Acceptance criteria

- Home and category contracts pass.
- CTA reaches the grid.
- No dependency or asset changes.
- Full repository checks pass.

# Risks / edge cases

- Empty/loading product counts.
- Long translated/category labels must remain limited to compact category layout.
- Mobile title and character line must not overflow.

# Done evidence to report back

- Red and green targeted-test output.
- Full check result and changed-file summary.

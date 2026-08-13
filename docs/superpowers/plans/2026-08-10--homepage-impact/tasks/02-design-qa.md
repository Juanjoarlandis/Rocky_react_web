# Task

Run responsive visual comparison and close design QA.

# Goal

Prove the coded home follows selected option 1 and remains usable at representative breakpoints.

# Inputs / prerequisite decisions

- Task 01 passes.
- Reference and local storefront are available.

# Files likely to change

- `design-qa.md`
- Evidence under `output/visual-audit/round-06-home-impact/`
- ProductPage JSX/CSS/test only if QA exposes a scoped mismatch.

# Detailed changes to make

- Capture the stable home at 1440 × 1000, 820 × 900 and 390 × 844.
- Compare the desktop capture with the selected reference at the same viewport.
- Measure horizontal overflow, CTA/grid geometry, title/character visibility and first-row discovery.
- Fix P0/P1/P2 mismatches and repeat until `design-qa.md` says `final result: passed`.

# Commands to run

- Existing local Vite/Express development command.
- Browser screenshot and DOM measurement workflow.
- Final `npm run check` and `git diff --check` after any QA fix.

# Acceptance criteria

- The selected hierarchy is recognizable at desktop.
- Tablet/mobile remain coherent and do not horizontally scroll.
- CTA works, first product row remains discoverable and console has no errors.
- `design-qa.md` ends with `final result: passed`.

# Risks / edge cases

- The reference is a compositional mock, not a pixel-perfect rendering of live font metrics.
- Auth state may change navbar width; capture the same visible signed-out state as the reference unless the existing Atlas session remains authenticated.

# Done evidence to report back

- Accepted screenshots, DOM measurements, console result and design QA verdict.

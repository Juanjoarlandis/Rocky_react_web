# Homepage first-impact implementation

## Problem

The current storefront opens with a small title and a wide area whose two characters read as decoration rather than a deliberate editorial scene. The user selected Product Design option 1 to make the opening more memorable while retaining the existing characters and store.

## Scope

Implement a home-only editorial header using the current assets, design tokens and product grid. Preserve category pages and all commerce behavior.

## Non-goals

- No new assets, dependencies, routes, data, characters or production deployment.
- No changes to cards, navigation, MiniPlayer, Shopify or lower-page sections.

## Behavior delta

- Home gains a large title, existing brand phrase, count and grid-scroll CTA.
- The existing red line and two existing characters become a composed stage.
- Category headers remain compact.

## Sequencing

1. Pin the home/category contract with failing tests.
2. Implement the smallest JSX/CSS change and pass targeted tests.
3. Run full checks and complete visual design QA at matching viewports.

## Verification matrix

| Surface | Evidence |
| --- | --- |
| Home semantics | ProductPage component tests |
| Category isolation | ProductPage component tests |
| Responsive contract | CSS contract tests plus screenshots |
| Repository safety | `npm run check`, `git diff --check` |
| Visual fidelity | reference/prototype comparison at 1440 × 1000, plus 820 and 390 px regressions |

## Risks and rollback

- Risk: hero height hides products. Gate on measured product-grid position.
- Risk: title or characters overflow. Gate on document width and screenshots.
- Rollback: revert only the ProductPage JSX/CSS/test delta from this block; previous production files remain untouched.

## Tasks

1. `tasks/01-home-hero.md`
2. `tasks/02-design-qa.md`

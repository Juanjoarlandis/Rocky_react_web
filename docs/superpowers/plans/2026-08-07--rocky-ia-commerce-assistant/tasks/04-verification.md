# Task

Verify the integrated feature.

# Goal

Prove the commerce assistant works without regressing security, build output, or the free-only AI contract.

# Inputs / prerequisite decisions

- Tasks 01–03 are complete.

# Files likely to change

- Only implementation-owned fixes found during verification.

# Detailed changes to make

- Run focused server and UI tests.
- Run the complete repository check.
- Launch the site and inspect Rocky IA at desktop and mobile viewport sizes.
- Exercise one product request, variant choice, product link, and add-to-cart path with deterministic local/mocked data where live Shopify is unavailable.

# Commands to run

- `npm run check`
- Local browser smoke test.

# Acceptance criteria

- All tests, build, and secret scan pass.
- The chat remains functional when Shopify is absent or errors.
- UI is readable and interactive at desktop and mobile widths.

# Risks / edge cases

- Live OpenRouter or Shopify credentials may not exist locally; automated mocks must cover those boundaries.

# Done evidence to report back

Fresh command results and explicit browser verification scope.

# Task

Documentation, full checks and public verification.

# Goal

Document the Shopify setup and prove the feature works without regressing the
existing store, security boundary or responsive layout.

# Inputs / prerequisite decisions

- `orders/paid` requires `read_orders` and the final HTTPS webhook endpoint.
- Refund automation is explicitly not in this slice.

# Files likely to change

- `README.md`
- `SECURITY.md`
- `.env.example`
- `output/playwright/*` verification artifacts only

# Detailed changes to make

- Add Crew setup, rate rules, webhook topic and operational limitations.
- Run all repository checks.
- Rebuild production assets.
- Restart only the managed public ROCKY service and verify the new profile on
  desktop and mobile.

# Commands to run

- `npm run check`
- Playwright public/local flow at desktop and 390px.

# Acceptance criteria

- Tests, build and secret scan pass.
- Public profile has no horizontal overflow or console errors.
- Existing catalogue, cart and Rocky IA routes still load.

# Risks / edge cases

- Do not claim live accrual until Shopify Customer Accounts and `orders/paid`
  subscription are configured on the final domain.

# Done evidence to report back

- Full check output, browser evidence, changed-file summary and remaining rollout prerequisites.

# Task

Crew reward domain and encrypted persistence.

# Goal

Create the level/reward catalogue and a service that safely creates profiles,
credits orders, redeems rewards and equips owned avatars.

# Inputs / prerequisite decisions

- Use integer euro cents and ticket tenths.
- Store profiles under a SHA-256 customer key.
- Use a per-customer in-process lock because the current deployment is explicitly
  single-instance.

# Files likely to change

- `server/crew/rewards.mjs`
- `server/crew/rewards.test.mjs`

# Detailed changes to make

- Define level thresholds and an initial catalogue using current ROCKY artwork IDs.
- Validate Shopify GIDs, order data, reward IDs and operation IDs.
- Return a bounded public projection without internal idempotency records.
- Make duplicate order credit and duplicate redemption retries harmless.
- Keep histories bounded.

# Commands to run

- `npx vitest run server/crew/rewards.test.mjs`

# Acceptance criteria

- EUR 34.99 grants 34 XP and 34 ticket tenths.
- Duplicate orders do not credit twice.
- Redemptions cannot overdraw or duplicate a one-time reward.
- Equipping requires ownership.

# Risks / edge cases

- Malformed/non-EUR/guest orders must be skipped without profile creation.
- Public output must not contain customer IDs or internal operation/order keys.

# Done evidence to report back

- Focused test output and a summary of persisted fields.

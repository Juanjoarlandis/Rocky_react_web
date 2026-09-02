# Task

Add minimal durable encrypted persistence.

# Goal

Persist security-sensitive session and idempotency state without adding a database dependency or exposing plaintext secrets on disk.

# Inputs / prerequisite decisions

- Single controlled Node process and persistent disk.
- `APP_ENCRYPTION_KEY` is a 32-byte base64 key and is mandatory when Shopify stateful features are enabled.

# Files likely to change

- `server/encrypted-store.mjs`, `server/session.mjs`
- `.gitignore`, `.env.example`, storage tests

# Detailed changes to make

- AES-256-GCM encrypted JSON envelope with atomic replacement.
- Serialized mutations, expiry cleanup, get/put/delete/consume operations.
- Opaque cookie sessions; only hashes index records.
- Production `Secure`/`HttpOnly`/`SameSite=Lax` cookie policy.

# Commands to run

- `npm test -- --run encrypted-store session`

# Acceptance criteria

- Plaintext values never appear in the data file.
- Concurrent mutations do not lose records.
- Expired and one-time records fail closed.

# Risks / edge cases

- Not suitable for horizontally scaled or ephemeral multi-instance hosting.

# Done evidence to report back

- Encryption, atomicity, expiry, and cookie tests.

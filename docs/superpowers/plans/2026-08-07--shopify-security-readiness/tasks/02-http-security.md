# Task

Harden Express and Rocky IA.

# Goal

Make the existing internet-facing server same-origin, bounded, observable without leaking sensitive data, and safe to extend.

# Inputs / prerequisite decisions

- No production security dependency is required; use small local middleware.
- The API and built SPA share one origin in production.

# Files likely to change

- `server.mjs`, `server/config.mjs`, `server/security.mjs`, `server/chat.mjs`
- `server/*.test.mjs`

# Detailed changes to make

- Disable `X-Powered-By`; add CSP and security headers.
- Validate configured origins and state-changing request origins.
- Bound JSON bodies, messages, rate, and global upstream concurrency.
- Remove `/api/proxy`; normalize chat responses and redact logs.
- Add timeouts, client-disconnect cancellation, health/readiness, static production serving, and graceful shutdown.

# Commands to run

- `npm test -- --run server`
- Live OPTIONS/POST/header probes against a random port.

# Acceptance criteria

- Arbitrary origins fail; configured origin succeeds.
- Abuse limits and schema failures happen before upstream work.
- Responses and logs contain no upstream payload or secret.

# Risks / edge cases

- Reverse-proxy IP handling must be explicitly configured for the deployment.

# Done evidence to report back

- Passing security integration tests and response headers.

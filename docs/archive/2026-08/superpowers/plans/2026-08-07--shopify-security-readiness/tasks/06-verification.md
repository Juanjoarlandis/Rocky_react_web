# Task

Verify and review the full security-readiness slice.

# Goal

Produce fresh evidence for build, tests, audit, runtime headers, bundle secrecy, and key Shopify invariants before handoff.

# Inputs / prerequisite decisions

- No production Shopify credential is available or required for local verification.

# Files likely to change

- Tests and documentation only when verification exposes a specific defect.

# Detailed changes to make

- Run complete tests and build under Node 24.
- Run full and production-only dependency audits.
- Scan tracked files, generated JS, and source maps for secret patterns/canaries.
- Start production server and verify SPA/API behavior and headers.
- Browser-test the existing visual pages and demo checkout gate.
- Run an independent Oracle review at the tested-diff checkpoint and disposition findings.

# Commands to run

- `npm test -- --run`
- `npm run build`
- `npm audit --json`
- Production smoke and secret scans

# Acceptance criteria

- No untriaged critical/high production vulnerability.
- All relevant tests/build/smokes pass.
- Any limitation requiring Shopify account access is explicit.

# Risks / edge cases

- Dependency advisories can change between runs and need reachability analysis.

# Done evidence to report back

- Exact command results, Oracle receipt, files changed, remaining external gates.

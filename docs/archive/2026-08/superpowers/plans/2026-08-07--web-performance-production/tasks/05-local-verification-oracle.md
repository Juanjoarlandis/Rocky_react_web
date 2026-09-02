# Task

Full local verification and Oracle finding closure.

# Goal

Prove behavior, performance, and visual stability, then obtain Oracle confirmation that the cache-boundary blocker is closed.

# Inputs / prerequisite decisions

- Completed tasks 01-04 and fresh diff.

# Files likely to change

- No production files unless verification exposes a defect.
- Progress/review record in this plan directory.

# Detailed changes to make

- Run the complete project check and inspect the final diff.
- Measure cold first-session and repeat-session requests/bytes.
- Exercise routes, audio, console, screenshots, and response headers.
- Continue Oracle session `rocky-web-performanc-plan` with only the bounded changed files/tests/evidence required to close its high-severity finding.

# Commands to run

- `npm run check`
- Production local server plus Playwright/curl probes.
- Oracle dry-run and saved follow-up in browser Pro mode.

# Acceptance criteria

- All local checks pass and measured load improves.
- No visual or console regression.
- Oracle confirms the terminal asset boundary and release-transition behavior, or deployment stops for user direction.

# Risks / edge cases

- Do not attach secrets, `.env`, production data, logs, or the whole repository to Oracle.

# Done evidence to report back

- Commands/results, before-after metrics, Oracle session/outcome, and residual risks.

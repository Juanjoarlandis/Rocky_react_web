# Task

Deploy the verified optimization to the shared Raspberry Pi and test production.

# Goal

Publish one isolated `rocky035` release without disturbing unrelated workloads, then verify private origin, Cloudflare edge behavior, browser flows, restart, and rollback.

# Inputs / prerequisite decisions

- Task 05 passed, Oracle blocker closed, and current production release/image recorded.

# Files likely to change

- Raspberry Pi release directory and `rocky035` image/container only.
- Deployment progress record in this plan directory.

# Detailed changes to make

- Read-only audit CPU/load, memory/swap, disk, thermals, Docker processes/limits, listening ports, current services, tunnel, and `rocky035` health.
- Stop before mutation if headroom is unsafe.
- Sync a secret-free timestamped release using the existing exclusions and protected environment path.
- Build the new arm64 image, run contained tests/build, switch only the existing Compose service, and retain the previous image/release.
- Verify local origin, public apex/`www`, SPA fallback, cache HIT/miss behavior, missing asset 404, APIs, audio, console, key routes, logs, and controlled restart.
- Confirm unrelated containers/services remain healthy.

# Commands to run

- Existing SSH/Docker/Compose deployment commands documented in the prior Raspberry Pi plan, after resolving exact current targets read-only.
- Public curl and Playwright probes.

# Acceptance criteria

- New `rocky035` container is healthy and the public site serves the optimized build.
- Second same-edge hashed-asset request is `HIT` with positive `Age` where Cloudflare policy permits.
- Missing assets remain uncached 404; HTML/API policies are correct.
- No audio request before Play and key browser flows work.
- Unrelated Raspberry Pi processes remain up with no material resource regression.
- Previous image/release and exact rollback command are recorded.

# Risks / edge cases

- Do not restart `cloudflared`, unrelated containers, or shared services unless separately authorized.
- On any critical failure, restore only the previous `rocky035` image through the existing Compose project.

# Done evidence to report back

- Release/image IDs, health and resource evidence, public measurements, restart result, unrelated-service status, and rollback command.

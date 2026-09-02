# Task

Verify and deploy the completed interaction to the Raspberry Pi.

# Goal

Publish one isolated release while preserving the current release for rollback
and leaving Cloudflare and unrelated services untouched.

# Inputs / prerequisite decisions

Tasks 01 and 02 must pass. The active production release and image are resolved
read-only immediately before mutation.

# Files likely to change

No additional application files. Production changes are limited to a timestamped
release, one Docker image, `/opt/rocky035/current` and the existing Compose image
selection.

# Detailed changes to make

- Run `git diff --check` and `npm run check` locally.
- Audit Raspberry capacity and active rollback targets.
- Sync only Docker build inputs and build the ARM64 image on the Raspberry.
- Recreate only `rocky035`, wait for health and perform a controlled restart.
- Verify private origin, apex, `www`, current asset caching, logs and unrelated
  container state.

# Commands to run

Use the existing `/opt/rocky035` Compose release procedure documented in the
Raspberry deployment record.

# Acceptance criteria

The new container is healthy, public health endpoints return 200, the current
bundle contains the peeker implementation, and the previous release remains
available for rollback.

# Risks / edge cases

Stop before activation if capacity is unsafe or the target build fails. Never
restart `cloudflared` or unrelated services.

# Done evidence to report back

Release/image IDs, check results, public probes, rollback target and known risk.

# Raspberry Pi and Cloudflare Tunnel deployment

## Goal

Deploy the current ROCKY 035 React/Express workspace to the Tailscale-connected Raspberry Pi as one persistent production instance and expose only that application through a Cloudflare Tunnel hostname.

## Current system facts

- The application is a Vite frontend served by the same Express process as its API.
- Production requires Node 24, an exact HTTPS `PUBLIC_ORIGIN`, and an exact reverse-proxy trust count.
- The application state store supports one process on persistent local disk.
- The Raspberry Pi is Debian 13 on arm64 with Docker, systemd, Tailscale, and `cloudflared` already running.
- The Pi's system Node is 22 and must not be upgraded in place because other applications share the host.
- Port `3001` is already published by another Docker container. Ports `3010`, `3100`, and `3200` were free during discovery.
- The active `cloudflared.service` uses a remotely managed tunnel token. Its public hostnames must be changed in Cloudflare, not in the stale local `/etc/cloudflared/config.yml` template.
- The local Git worktree contains user changes. The deployment must include them without committing, reverting, or rewriting them.

## Simplest viable design

1. Build a small production image from an official Node 24 Debian image on the arm64 Pi.
2. Run `npm ci`, tests, and the production build inside the build stage, then retain only production dependencies and `dist/` in the runtime stage. Run the Git-aware secret scan on the source workspace before syncing; do not copy `.git` or its historical secret-bearing objects into the Docker build context.
3. Run one non-root container named `rocky035`, publish container port `3001` only as `127.0.0.1:3100`, and mount `/var/lib/rocky035` at `/app/.data` for persistent state.
4. Store runtime configuration at `/etc/rocky035/rocky.env` with root-only permissions. Transfer the current ignored `.env` over SSH without placing it in the image or release directory, then replace only the deployment values: `NODE_ENV`, `PORT`, `PUBLIC_ORIGIN`, `API_ALLOWED_ORIGINS`, `TRUST_PROXY_HOPS`, and `STATE_STORE_PATH`.
5. Add one public hostname to the existing remotely managed Cloudflare tunnel with origin service `http://127.0.0.1:3100`. Keep the tunnel's catch-all rule closed.
6. Keep Tailscale for administration only. Do not open router ports, publish the container on LAN/Tailscale interfaces, or expose SSH through Cloudflare.

## Files and areas affected

- Repository: `Dockerfile`, `.dockerignore`, `compose.production.yaml`, deployment documentation.
- Raspberry Pi: a timestamped release under `/opt/rocky035/releases`, `/etc/rocky035/rocky.env`, `/var/lib/rocky035`, Docker image/container state.
- Cloudflare: one public hostname and one tunnel ingress mapping.

## Non-goals

- No system-wide Node upgrade on the Raspberry Pi.
- No modification or restart of unrelated Docker containers, existing application services, or the separate TimesUp tunnel.
- No Shopify credential creation, historical-secret cleanup, DNS-zone migration, horizontal scaling, database migration, or router/firewall redesign.
- No commit or push of the user's current working-tree changes.

## Execution slices and verification

1. **Package and validate** — add the bounded container files; run the source secret scan, then verify with an arm64 Docker build that runs `npm ci`, tests, and the production build, plus production-only `npm audit`.
2. **Deploy the private origin** — sync a secret-free release, install the protected runtime environment, start exactly one container, and verify container health, logs, restart policy, persistent mount, and `curl http://127.0.0.1:3100/api/health` from the Pi.
3. **Publish through Cloudflare** — add the chosen hostname to the existing remote tunnel and verify DNS, HTTPS, `/api/health`, SPA fallback, security headers, and an untrusted-origin rejection from outside the Pi.
4. **Restart and rollback proof** — restart the container, confirm health returns, and record the exact previous image/container commands. If public verification fails, remove/disable the new hostname and stop the new container without touching other services.

## Risks and rollback

- The exact Cloudflare zone/hostname is not yet selected. Discovery may choose an unambiguous existing zone; otherwise this is the only user decision required before public DNS mutation.
- Cloudflare is the single trusted HTTP proxy in front of the origin, so `TRUST_PROXY_HOPS=1`. This must be rechecked against the observed request path after publication.
- The local `.env` currently lacks a production public origin and contains only the optional Rocky IA credential. Deployment must not silently enable Shopify checkout or accounts.
- Rollback is reversible: remove the new Cloudflare public hostname, stop/remove only `rocky035`, and retain the prior image/release plus `/var/lib/rocky035` state.

## Independent review status

Oracle plan review was explicitly bypassed by the user on 2026-08-07. Local, target-runtime, and public-path verification remain mandatory.

## Acceptance criteria

- The current workspace, including uncommitted user files, is served from the Pi by Node 24.
- The origin listens only on Pi loopback port `3100` and survives a process/host restart through Docker restart policy.
- The public HTTPS hostname works through Cloudflare Tunnel without inbound router ports.
- Existing containers, port `3001`, `cloudflared.service`, and TimesUp services remain operational.
- Tests, build, secret scan, production dependency audit, local health, public health, SPA route, headers, logs, and rollback checks have fresh evidence.

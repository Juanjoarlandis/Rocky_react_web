# Deployment record

## Result

- Status: deployed and publicly verified on 2026-08-07.
- Primary public URL: `https://rocky035.com`
- Public alias: `https://www.rocky035.com`
- Raspberry Pi release: `/opt/rocky035/releases/20260807T171139Z-d4a7bb2`
- Docker image: `rocky035:20260807T171139Z-d4a7bb2`
- Docker image ID: `sha256:4ea43dcd769dcde577b8638adf87e6da32ca9d1e4861f08c56e5a690a8b2968c`
- Previous release retained for rollback: `/opt/rocky035/releases/20260807T114958Z-d4a7bb2`
- Container: `rocky035`
- Private origin: `http://127.0.0.1:3100`
- Cloudflare tunnel: `crm-natu-prod` (`aa13bcb5-1c08-450f-ad84-21ef44a172a5`), remotely managed configuration version 5.
- Persistent state: `/var/lib/rocky035` mounted at `/app/.data`
- Runtime environment: `/etc/rocky035/rocky.env`, owned by `root`, mode `0600`; local secrets were transferred over SSH and deployment-specific values were applied afterward.

## Verification evidence

- Docker build used the pinned official Node `24.14.0` multi-architecture image on `linux/arm64`.
- Vitest: 22 files and 104 tests passed in the target build.
- Vite: production build completed successfully.
- Source secret scan: passed before the source was synchronized.
- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilities.
- Runtime: Node `v24.14.0`, `linux/arm64`, UID `1000`, read-only root filesystem, all capabilities dropped, `no-new-privileges`, PID limit 256.
- Container health: healthy before and after a controlled restart; restart policy is `unless-stopped`.
- Network: only `127.0.0.1:3100` is published for ROCKY 035.
- Local probes: `/api/health` and SPA routes returned 200, trusted preflights for apex and `www` returned 204, and a chat request from an untrusted origin returned 403.
- Public probes: apex and `www` health returned 200 through Cloudflare; `/`, `/crew`, and `/rockyIA` returned 200; expected CSP/HSTS/security headers and Cloudflare edge headers were present.
- DNS and TLS: proxied CNAME records for apex and `www` target the tunnel subdomain; Cloudflare Universal SSL is active for `rocky035.com` and `*.rocky035.com`, and TLS validation succeeded. The old `rocky035.aliomarket.com` ingress and DNS record were removed after the new hostnames passed verification.
- Browser: the in-app browser retained a negative DNS cache from the pre-migration lookup and reported `ERR_NAME_NOT_RESOLVED`, so this rollout does not claim a fresh visual browser check. Independent DNS through 1.1.1.1, direct TLS/HTTPS checks, the Raspberry resolver, HTTP probes, and the full application suite passed.
- Shopify runtime: `/api/shopify/status` reports Shopify mode with catalog and cart enabled. A public read-only catalog request returned 200 with three products and a next page; customer accounts, Admin API, and webhooks remain disabled because those separate credentials are not configured.
- Rocky IA runtime: the protected environment resolved to three `:free` OpenRouter models, a global daily maximum of 45, and a configured provider key without exposing its value. One end-to-end provider request returned the expected ROCKY persona successfully.
- Existing services: `cloudflared`, `timesup-papelitos-tunnel`, and `timesup-papelitos` remained active; `https://crm.aliomarket.com` continued returning 200; the pre-existing port `3001` listener was unchanged.
- Compose: the deployment reuses the original project ID through `COMPOSE_PROJECT_NAME`, preventing release-directory names from creating competing projects on later rollouts.
- Oracle review: explicitly bypassed by the user.

## Operations

Check the deployment:

```bash
ssh rpi-tailscale
sudo docker ps --filter name=rocky035
curl --fail http://127.0.0.1:3100/api/health
```

Restart it:

```bash
ssh rpi-tailscale
sudo docker restart --time 20 rocky035
```

Recreate the container from the recorded image:

```bash
ssh rpi-tailscale
cd /opt/rocky035/current
sudo docker compose \
  --env-file /opt/rocky035/compose.env \
  -f compose.production.yaml \
  up -d --no-build
```

## Rollback

To restore the immediately previous verified version without changing Cloudflare:

```bash
ssh rpi-tailscale
printf '%s\n' \
  'ROCKY_IMAGE=rocky035:20260807T114958Z-d4a7bb2' \
  'COMPOSE_PROJECT_NAME=20260807t094206z-d4a7bb2' \
  | sudo tee /opt/rocky035/compose.env >/dev/null
sudo chmod 600 /opt/rocky035/compose.env
sudo ln -sfn \
  /opt/rocky035/releases/20260807T114958Z-d4a7bb2 \
  /opt/rocky035/current
cd /opt/rocky035/current
sudo docker compose \
  --env-file /opt/rocky035/compose.env \
  -f compose.production.yaml \
  up -d --no-build
```

To revert the complete hostname migration as well as the application:

1. Recreate a proxied `CNAME` for `rocky035.aliomarket.com` pointing to `aa13bcb5-1c08-450f-ad84-21ef44a172a5.cfargotunnel.com`.
2. Restore the tunnel ingress sequence to `crm.aliomarket.com`, `rocky035.aliomarket.com`, and the `http_status:404` catch-all.
3. Restore `/etc/rocky035/rocky.env.pre-20260807T171139Z-d4a7bb2` to `/etc/rocky035/rocky.env` with root ownership and mode `0600`, then force-recreate the Compose service. This protected backup contains the pre-migration runtime configuration.

To remove the public application entirely:

1. In Cloudflare, remove only the `rocky035.com` and `www.rocky035.com` published-application routes and their two DNS records from `crm-natu-prod`. Do not rotate the tunnel token or change `crm.aliomarket.com`.
2. Stop and remove only the ROCKY 035 container and its Compose network:

```bash
ssh rpi-tailscale
cd /opt/rocky035/current
sudo docker compose \
  --env-file /opt/rocky035/compose.env \
  -f compose.production.yaml \
  down
```

The release image, protected environment, and `/var/lib/rocky035` data remain available for recovery.

## Known boundaries

- Shopify Storefront is configured for catalog and cart operations. Customer accounts, Admin API operations, and webhooks are intentionally unavailable until their dedicated credentials are configured.
- `rocky035.com` is the primary origin and `www.rocky035.com` is a direct alias; no redirect from `www` to apex is configured.
- The public route shares the healthy `crm-natu-prod` connector. A tunnel outage or token rotation affects both hostnames even though their origin services remain separate.
- The test suite emits existing React `act(...)` warnings for the splash tests even though all tests pass.
- The release is the stable build-relevant workspace snapshot synchronized at `2026-08-07T17:11:39Z`. Relative to the prior verified release, it includes the latest Shopify storefront normalization/client changes, cart and chat UI updates, free-model handling, global/Crew/MiniPlayer styles, their related tests, and `scripts/seed-drop4.mjs`. The runtime hash `289b0e9817c05c13a4729ceb5540398cb7c63b4c` remained unchanged through the test-and-wait gate, and dry runs found no delta between the local snapshot and the release. Prompt-generation assets, temporary files, documentation-only planning files, and `.env` files were excluded from the release; the `.env` values were instead installed separately into the root-only runtime environment over SSH.

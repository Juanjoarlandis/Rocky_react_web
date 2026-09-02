# Web performance and production rollout

Status: completed and verified in production on 2026-08-07.

## Problem

The current build transfers large offscreen images, opens the 2.68 MB audio resource before user interaction, depends on render-blocking third-party fonts, and revalidates content-hashed assets through Cloudflare. The production target is a shared Raspberry Pi, so reducing origin hits and avoiding interference with unrelated workloads are both required.

## Scope and behavior delta

- Optimize Express cache boundaries, dynamic-import recovery, audio activation, images, and fonts.
- Preserve visuals and all storefront/API contracts.
- Deploy only the `rocky035` release/container after local verification and Oracle closure.
- Audio will begin loading only after an explicit playback action; this is the sole intentional behavior change.

## Sequencing

1. Cache safety and stale-chunk recovery.
2. Audio deferral.
3. Image optimization.
4. Font self-hosting and CSP.
5. Full local/browser verification and Oracle finding closure.
6. Raspberry Pi capacity audit and isolated deployment.
7. Private/public verification, restart proof, and rollback record.

## Verification matrix

| Boundary | Required evidence |
| --- | --- |
| Hashed asset | 200, correct MIME, one-year immutable cache headers |
| Missing hashed asset | 404, not HTML, `no-store` at origin and public edge |
| SPA HTML | 200 with revalidation, current asset hashes after deployment |
| APIs | `no-store`, never edge HIT |
| Audio | no pre-click request; successful play/pause/seek after click |
| Images/fonts | lower bytes, no Google font requests, no screenshot/layout regression |
| Local quality | `npm run check`, browser console clean, measured before/after improvement |
| Raspberry Pi | sufficient headroom, unrelated processes unchanged, new container healthy |
| Public | apex/`www`, SPA routes, cache behavior, audio and key flows pass |

## Risks and rollback

- Cache poisoning risk is controlled by a terminal missing-asset boundary.
- A stale lazy chunk triggers only one guarded document reload.
- Image variants are accepted only after browser comparison.
- The previous verified image/release remains available. On failure, restore the recorded previous image through the existing Compose project without touching Cloudflare or other services.

The deployed release, public measurements, restart proof and exact retained rollback targets are recorded in `PROGRESS.md`.

## Tasks

- `tasks/01-cache-boundaries.md`
- `tasks/02-audio-deferral.md`
- `tasks/03-images.md`
- `tasks/04-fonts.md`
- `tasks/05-local-verification-oracle.md`
- `tasks/06-deploy-and-verify.md`

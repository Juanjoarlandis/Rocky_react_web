# Goal

Reduce first-load and repeat-load transfer, browser work, and Raspberry Pi origin traffic without changing the storefront's visual design, then deploy the verified build to the existing `rocky035` production service behind Cloudflare Tunnel.

# Non-goals

- No redesign, content changes, route changes, Shopify contract changes, or unrelated refactors.
- No new npm dependencies, service worker, Nginx layer, runtime compression, manual Rollup chunking, or broad Cloudflare "Cache Everything" rule.
- No mutation of unrelated Raspberry Pi containers, ports, system services, tunnels, or persistent data.

# Constraints

- Preserve the dirty worktree and all user-owned changes.
- Keep SPA HTML revalidated, APIs uncached, and only real content-hashed files immutable.
- Never request audio before an explicit playback action.
- Preserve the exact fonts and visual geometry; validate image changes in a real browser.
- Deploy through the existing release/image/Compose path and retain the current production image for rollback.

# Proposed approach

1. Mount `/assets` separately in Express. Successful hashed files receive one-year immutable browser/CDN caching; missing assets terminate with 404 and `no-store` before the SPA fallback.
2. Revalidate SPA HTML and give stable-name public files conservative caching. Keep `/api/*` at `no-store`.
3. Recover once from Vite stale dynamic-import errors after an A-to-B deployment.
4. Keep `<audio>` without a source until a user playback action, then load/play in that interaction path.
5. Lazy-load genuinely below-fold images, add asynchronous decoding/intrinsic dimensions where safe, and prioritize at most one visible product image when the splash is absent.
6. Replace measured oversized shell/splash PNG delivery with evidence-backed WebP variants while retaining source PNGs.
7. Self-host the exact Google Fonts WOFF2 files and weights currently used, then remove external font connections and narrow only `font-src` and `style-src`.
8. Verify locally, close Oracle's cache-boundary finding with the tested diff, audit the Raspberry Pi, deploy one new release, and verify private-origin and public behavior with rollback ready.

# Acceptance criteria

- No visual regression across the principal routes at desktop and mobile sizes.
- No audio request before Play; all player controls still work after activation.
- A real hashed asset is cached immutably; a missing `/assets/*.js` returns uncached 404 and never SPA HTML.
- HTML revalidates and APIs remain `no-store`.
- Build transfer and request count improve materially against the recorded baseline.
- Local checks pass, Oracle's high-severity finding is closed, and the production container is healthy after deployment and restart.
- Public apex and `www` routes, SPA routes, API health, cache headers, audio, console, and key user flows pass.
- Unrelated Raspberry Pi workloads remain up and unchanged.

# Test strategy

- Unit/integration tests for static cache boundaries, missing assets, HTML policy, audio activation, and stale-chunk recovery where practical.
- `npm run check`, production build inventory, header probes, and Playwright network/browser checks.
- Before/after desktop/mobile screenshots and cold/repeat request measurements.
- Remote capacity/process audit, target Docker build, private-origin probes, public Cloudflare probes, controlled restart, logs, and rollback record.

# Risks / rollout notes

- Long-lived browser caches are safe only for content-hashed, successfully resolved assets.
- Existing tabs may request old lazy chunks after deployment; one-shot reload recovery prevents a blank route.
- Right-sized images require screenshot validation because resampling is not mathematically pixel-identical.
- The deployment must not build under resource pressure that could disturb unrelated Raspberry Pi processes; inspect capacity first and stop before mutation if headroom is inadequate.

# Oracle review

- Status: completed at plan, implementation closure and final CLS closure checkpoints
- Sessions: `rocky-web-performanc-plan`, `rocky-web-performanc-closure`, `rocky-web-performanc-cls-closure`
- Outcome: the plan review identified the terminal `/assets` 404 requirement plus one-shot Vite preload recovery and source-less audio. Both implementation closure reviews returned **GO** after those findings and the measured CLS regression were resolved.

# Production outcome

- Deployed release: `/opt/rocky035/releases/20260807T213144Z-d4a7bb2-perf2`
- Public post-restart trace: TTFB `176 ms`, FCP `292 ms`, LCP `660 ms`, CLS `0.000132`, zero long tasks.
- Cloudflare contract: dynamic/revalidated HTML, no-store APIs and missing assets, immutable/HIT hashed assets.
- Isolation: only `rocky035` was recreated/restarted; unrelated container state and tunnel services remained unchanged.

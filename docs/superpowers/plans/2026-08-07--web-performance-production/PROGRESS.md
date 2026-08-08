# Progress

## Task 01 — cache boundaries and stale chunks

- Status: completed locally
- Files: `server.mjs`, `server/server.test.mjs`, `src/main.jsx`, `src/preloadRecovery.js`, `src/preloadRecovery.test.js`
- Evidence:
  - Regression tests failed first because static fixture assets and SPA routes were served from the old fallback behavior.
  - `npm run test:run -- src/preloadRecovery.test.js server/server.test.mjs`: 2 files, 21 tests passed.
  - `npm run build`: passed; Vite transformed 160 modules.
- Result: only resolved `/assets` files receive immutable headers; missing assets terminate as 404/no-store; HTML revalidates; a guarded Vite preload error reloads once and clears after a stable boot.
- Production closure: Cloudflare headers, HIT/Age behavior and missing-asset bypass are verified in Task 07.

## Task 02 — strict audio deferral

- Status: completed locally
- Files: `src/context/MusicContext.jsx`, `src/context/MusicContext.test.jsx`
- Evidence:
  - New tests failed first because the audio mounted with `/music/barro.m4a` and selection set an optimistic playing state.
  - `npm run test:run -- src/context/MusicContext.test.jsx src/components/ChatComponent.test.jsx src/utils/beatCodec.test.js`: 3 files, 9 tests passed.
- Result: the audio renders without `src` and with `preload="none"`; the first playback action assigns, loads, and plays the source in the same interaction path; media events own the playing state.
- Production closure: zero pre-click network activity, source assignment, AAC metadata and HTTP range delivery are verified in Task 07; automated playback is limited by the test Chromium's missing AAC decoder.

## Task 03 — image delivery and visual parity

- Status: completed locally
- Files: `src/images/optimized/`, image imports and intrinsic metadata across shell, splash, catalogue, cart, chat, crew, product detail, drops and studio components; `src/styles/Footer.css`
- Evidence:
  - `npm run build`: passed; the production artifact fell from 7.4 MB to 5.2 MB while retaining the original source artwork.
  - Fresh no-splash desktop navigation transferred 1,130,790 bytes across 27 resources, down from the 1.95 MB baseline; the first-visit splash sample transferred 1,034,250 bytes at 500 ms, down from the 2.72 MB baseline.
  - Browser route sweep across `/`, drops, cart, product detail, studio, crew, chat and 404 found no broken images, no console warnings/errors and no pre-interaction audio source.
  - Reference and optimized full-page captures have identical dimensions: desktop 1290×3773 and mobile 390×4978. SSIM is 0.9889 desktop and 0.9902 mobile; remaining pixel differences include the animated ticker and lossless resized artwork.
  - A captured mobile regression showed the footer image rendered at 234×538 instead of its 234×146 natural ratio. The targeted `height: auto` correction was rechecked in Chrome at 234×146.375 with a 0.011 px rounding delta.
- Result: oversized raster imports are replaced by route-appropriate lossless WebP variants, below-fold media is lazy/async where safe, and only the first above-fold catalogue image receives priority when the splash is absent.
- Production closure: public desktop/mobile transfer and Cloudflare cache behavior are measured in Task 07.

## Task 04 — self-hosted fonts

- Status: completed locally
- Files: `src/fonts/`, `src/index.css`, `index.html`, `server/security.mjs`, `server/server.test.mjs`
- Evidence:
  - Security regression test failed first while the CSP still allowed Google font hosts, then `npm run test:run -- server/server.test.mjs` passed all 19 tests.
  - Browser checks passed for Archivo 400/500/800, Patrick Hand 400 and Permanent Marker 400.
  - A fresh navigation had no external resource origins and no console warnings or errors.
  - Local response checks confirm `font-src 'self'` and `style-src 'self'`; the Google preconnect and stylesheet requests are gone.
- Result: the exact latin WOFF2 font files are served through Vite's hashed asset graph with their upstream licenses, removing two third-party connection origins without changing typography.
- Production closure: same-origin font delivery and immutable Cloudflare headers are verified in Task 07.

## Task 05 — full local verification and Oracle closure

- Status: completed
- Evidence:
  - Final `npm run check`: 29 test files and 134 tests passed; Vite production build and source secret scan passed.
  - `git diff --check`: passed.
  - Local real-asset, missing-asset, SPA and API probes returned the intended MIME/status/cache boundaries.
  - Oracle saved follow-up `rocky-web-performanc-closure` reviewed 20 current text files (104 KB; binary assets and secrets excluded) against the completed plan session.
- Oracle result: **GO for controlled production deployment**; no remaining high-severity blocker and no material cache-safety, audio-state, visual-parity, font/CSP or correctness defect in the attached implementation.
- Release gates retained from Oracle: public missing-asset 404/no-store, immutable asset HIT/Age, API no-store, stale-tab recovery and post-click audio behavior.

## Task 06 — production CLS closure and final Oracle gate

- Status: completed
- Files: `src/App.jsx`, `index.html`, `src/App.test.jsx`
- Evidence:
  - The first optimized public release exposed a `0.351` CLS that was not visible in the local visual-diff pass. Layout-shift attribution isolated `0.30225` to the lazy home catalogue boundary, `0.04342` to the temporary storefront-connection notice, and the remainder to the above-fold Patrick Hand swap.
  - `ProductPage` is now eager only on the home/catalogue path; secondary routes remain lazy. The temporary checking notice no longer enters the layout, while the persistent demo and error notices remain.
  - The self-hosted, hashed Patrick Hand file is preloaded once from the same origin.
  - Fresh local browser verification after the delta measured CLS `0.000168`, FCP `188 ms`, LCP `388 ms`, 18 products and no broken images or console diagnostics.
  - Oracle session `rocky-web-performanc-cls-closure` reviewed the measured cause, code delta and final bundle and returned **GO**. It accepted the small main-bundle increase because it removes the request/layout boundary responsible for the measured shift.
- Result: the public catalogue keeps the same UI while its initial geometry is stable.

## Task 07 — Raspberry Pi rollout and public verification

- Status: completed in production
- Release: `/opt/rocky035/releases/20260807T213144Z-d4a7bb2-perf2`
- Image: `rocky035:20260807T213144Z-d4a7bb2-perf2`
- Image ID: `sha256:edfad646d14820969c8145b9daf0f0391f858164b83da13a5167e91ee3919f2b`
- Evidence:
  - Preflight found 4 CPU cores, 7.9 GiB RAM with 5.2 GiB available, 25 GiB disk free and CPU at 57.9 C. The release was built as ARM64 in Docker and passed the full 134-test/build/secret-scan gate before activation.
  - The Compose switch changed only `rocky035`, retained project `20260807t094206z-d4a7bb2`, and reached `healthy`. A controlled container restart subsequently returned healthy in six seconds.
  - Private origin: HTML 200/revalidate, current JS/CSS/font 200 with correct MIME and one-year immutable headers, audio byte range 206, API 200/no-store, and missing or uncached stale assets 404 text/no-store.
  - Cloudflare apex and `www`: HTML `DYNAMIC`, API `DYNAMIC`/no-store, current hashed JS/CSS/font `HIT` with increasing `Age`, and random missing assets `BYPASS` 404/no-store. An already cached prior hashed asset correctly remains available at the edge for stale tabs.
  - Fresh public desktop trace with cache disabled and splash skipped: 18 products, 693,596 transferred bytes, FCP `608 ms`, LCP `1,144 ms`, CLS `0.000132`, zero long tasks, no broken images, no console diagnostics and no audio request before interaction.
  - Fresh public mobile trace: 525,568 transferred bytes, FCP `252 ms`, LCP `600 ms`, CLS `0.000363`, no horizontal overflow, no broken images and exact footer illustration aspect ratio.
  - Fresh first-visit splash trace: 276,866 transferred bytes at the first sample (about 0.79 s after navigation) and 849,969 bytes after the splash, versus the recorded 2.72 MB first-load baseline; no audio request, long task, broken image or console diagnostic.
  - Post-restart cold public trace: TTFB `176 ms`, FCP `292 ms`, LCP `660 ms`, CLS `0.000132`, zero long tasks, 18 products and no diagnostics.
  - Browser route sweep passed apex, `www`, home, valid category/detail routes, drops, cart, Rocky IA, studio, crew, account and 404. The synthetic `vite:preloadError` test caused one successful reload and rejected a second reload while guarded.
  - Chromium used by automation has no AAC decoder, so it could verify source assignment but not playback. `ffprobe` identifies the production file as AAC stereo/44.1 kHz/113.13 s, and the production server returned `206 Partial Content` for its byte range.
  - Unrelated container state was identical before and after restart. `cloudflared`, `timesup-papelitos-tunnel` and `timesup-papelitos` remained active; `crm.aliomarket.com` remained 200. `prometheus` was already in `Restarting (2)` before this rollout and was not touched.
- Rollback retained:
  - Immediate previous release: `/opt/rocky035/releases/20260807T212153Z-d4a7bb2-perf`
  - Immediate previous image: `rocky035:20260807T212153Z-d4a7bb2-perf` (`sha256:8256ccc611f236415db28966413ef0877944d6e22b5fbe649e8a4e65d128f850`)
  - Original pre-optimization image is also retained as `rocky035:20260807T171139Z-d4a7bb2`.

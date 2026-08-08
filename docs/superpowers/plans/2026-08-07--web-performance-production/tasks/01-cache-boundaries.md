# Task

Safe static caching and release-transition recovery.

# Goal

Cache only successfully resolved content-hashed assets for one year, keep HTML current, and recover stale lazy imports after deployment.

# Inputs / prerequisite decisions

- Oracle plan verdict in the approved specification.
- Current Express SPA fallback and Vite route lazy imports.

# Files likely to change

- `server.mjs`
- `server/server.test.mjs`
- `src/main.jsx`
- Focused frontend test if needed

# Detailed changes to make

- Serve `/assets` from `dist/assets` with immutable successful-file headers.
- Add a terminal `/assets` 404 with browser/CDN `no-store`.
- Apply conservative stable-public caching and explicit SPA HTML revalidation.
- Preserve API `no-store`.
- Add a one-shot `vite:preloadError` reload guard.

# Commands to run

- `npm run test:run -- server/server.test.mjs`
- `npm run build`
- Local `curl` probes for real/missing assets, SPA routes, and APIs.

# Acceptance criteria

- Missing `.js`/`.css` assets never return SPA HTML.
- Only real hashed assets receive immutable headers.
- HTML and APIs retain safe policies.
- Stale preload recovery cannot loop.

# Risks / edge cases

- Express static misses must not reach the generic 500 handler.
- Cloudflare-specific headers must not override API or error responses.

# Done evidence to report back

- Focused test output and representative response headers.

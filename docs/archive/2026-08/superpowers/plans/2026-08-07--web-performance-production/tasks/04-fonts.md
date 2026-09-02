# Task

Self-host the current fonts and narrow font/style CSP.

# Goal

Remove third-party font connections while preserving exact family names, weights, subsets, and `font-display: swap`.

# Inputs / prerequisite decisions

- Current production Google Fonts CSS for a modern production browser user agent.

# Files likely to change

- `index.html`
- `src/index.css`
- `server/security.mjs`
- Local font and license assets
- Relevant security tests

# Detailed changes to make

- Download the exact WOFF2 resources and preserve licenses.
- Declare matching local `@font-face` rules through Vite's asset graph.
- Remove Google stylesheet/preconnects.
- Narrow only `style-src` and `font-src`; retain commerce image/frame/form allowances.

# Commands to run

- Focused security tests, build, and browser network/console checks.

# Acceptance criteria

- No Google Fonts requests.
- All used Archivo weights and both handwritten families render locally without synthesis.
- No CSP violation or visual text regression.

# Risks / edge cases

- A single static Archivo file may not cover all requested weights/subsets.
- Font preload can compete with splash/product media and is out of scope unless measured.

# Done evidence to report back

- Font request list, computed font checks, CSP headers, and screenshots.

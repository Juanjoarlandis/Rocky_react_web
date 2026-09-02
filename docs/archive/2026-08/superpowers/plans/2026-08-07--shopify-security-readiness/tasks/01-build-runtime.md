# Task

Modernize the build and runtime boundary.

# Goal

Produce a Vite frontend build and a minimal Node 24 production runtime without CRA, Jest, webpack-dev-server, or `node-fetch`.

# Inputs / prerequisite decisions

- Preserve React 18 and React Router v6 behavior.
- Development tools may change; user authorized necessary dependency changes.

# Files likely to change

- `package.json`, `package-lock.json`, `index.html`, `vite.config.js`
- `src/index.js`, `src/setupTests.js`, `.nvmrc`, `.gitignore`, `README.md`

# Detailed changes to make

- Move test packages to dev dependencies.
- Remove CRA and browser-irrelevant runtime dependencies.
- Add Vite/Vitest tooling and Node 24 engine metadata.
- Move the HTML entry to Vite's root and update asset URLs.
- Add development proxy and production scripts.

# Commands to run

- `npm install`
- `npm run build`
- `npm test -- --run`

# Acceptance criteria

- Vite builds the existing visual application.
- Tests run under Vitest.
- Production script does not start a development server.

# Risks / edge cases

- CRA environment-variable and `%PUBLIC_URL%` behavior differ from Vite.

# Done evidence to report back

- Build/test outputs and production dependency tree.

# Task

Integrate and visually tune the peeker in the existing application shell.

# Goal

Make each hiding place look intentional on desktop and mobile without covering
controls or creating horizontal overflow.

# Inputs / prerequisite decisions

Navbar z-index is 1000 and MiniPlayer z-index is 2500. The peeker must render
under those elements and remain above normal page artwork.

# Files likely to change

- `src/styles/CuriousPeeker.css`
- `src/App.jsx`

# Detailed changes to make

- Mount the component once with route and splash context.
- Style Navbar, lateral and player positions with reveal transitions.
- Add mobile sizing and `prefers-reduced-motion` handling.
- Run a local authenticated visual state and capture desktop plus 390 px.

# Commands to run

```bash
npm run test:run -- src/components/CuriousPeeker.test.jsx src/App.test.jsx
npm run build
```

# Acceptance criteria

The character visibly peeks from each intended layer, does not intercept input
and does not create page overflow or cover primary controls.

# Risks / edge cases

The player is absent in Estudio. Its position must fall back to a side reveal or
be excluded from the rotation on that route.

# Done evidence to report back

Targeted test output and accepted screenshots at both viewports.

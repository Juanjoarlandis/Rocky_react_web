# Task

Implement the timed Curious Peeker behavior through tests.

# Goal

Create one deterministic component that appears, hides and rotates positions
without receiving input.

# Inputs / prerequisite decisions

Use `asomado-borde-600.webp`; initial wait, visible duration and repeat wait are
module constants. Exclude splash, `/rockyIA` and `/cart`.

# Files likely to change

- `src/components/CuriousPeeker.jsx`
- `src/components/CuriousPeeker.test.jsx`

# Detailed changes to make

- Write failing tests with fake timers for the visible lifecycle and exclusions.
- Implement deterministic position rotation and timer cleanup.
- Mark the component and image as decorative and non-interactive.

# Commands to run

```bash
npm run test:run -- src/components/CuriousPeeker.test.jsx
```

# Acceptance criteria

All targeted tests pass after demonstrating the intended red state first.

# Risks / edge cases

Route or splash changes must clear pending timers and reset the hidden state.

# Done evidence to report back

Failing and passing targeted-test output.

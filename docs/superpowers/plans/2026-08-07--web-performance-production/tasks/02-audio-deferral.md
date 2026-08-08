# Task

Strict audio deferral.

# Goal

Guarantee zero audio/network activity until an explicit player action while preserving controls across routes.

# Inputs / prerequisite decisions

- User approved removal of mount-time autoplay and preload.

# Files likely to change

- `src/context/MusicContext.jsx`
- Existing music/studio tests or a focused provider test

# Detailed changes to make

- Render the audio element without `src` before activation.
- Load and play within toggle/select/next/previous user interaction paths.
- Keep media events authoritative for `playing`.
- Preserve ended, seek, duration, and persistent-provider behavior.

# Commands to run

- Focused Vitest tests.
- Browser request inspection before and after Play.

# Acceptance criteria

- No `/music/` request before interaction.
- Play, pause, previous, next, ended, seek, and route changes still work.
- Failed playback never leaves a false playing state.

# Risks / edge cases

- Calling `play()` outside the gesture path can trigger autoplay rejection.
- Source changes must reset progress and load metadata correctly.

# Done evidence to report back

- Focused test output and browser request sequence.

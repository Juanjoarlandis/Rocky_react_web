# Task

Verify the integrated catalog and present it through ngrok.

# Goal

Prove the new drops work in tests, build output, and a real browser, then show the user the results.

# Inputs / prerequisite decisions

Use the active ROCKY ngrok tunnel that points to `localhost:3002`. Do not deploy production.

# Files likely to change

- Browser screenshots under `output/playwright/rocky-test-drops/`

# Detailed changes to make

- Run the full project check.
- Ensure the local server serves the new build without disrupting unrelated tunnels.
- Exercise home, each new drop, one detail page, and Rocky IA.
- Check desktop/mobile layout, image requests, and browser console.
- Produce a contact sheet or screenshots that show all six concepts.

# Commands to run

- `npm run check`
- Browser automation against the active ngrok URL

# Acceptance criteria

All checks pass; public preview routes return the new bundle and all images; screenshots show the six concepts; no unexpected console errors occur.

# Risks / edge cases

The free ngrok hostname can change if the tunnel restarts. Query the local ngrok API before final reporting.

# Done evidence to report back

Public URL, screenshot paths, checks run, results, and any remaining production-publication limitation.

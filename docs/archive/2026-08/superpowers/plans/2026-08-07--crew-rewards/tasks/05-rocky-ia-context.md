# Task

Trusted Crew context for Rocky IA.

# Goal

Let Rocky IA answer level/ticket questions for the logged-in customer without
accepting balance claims from the browser or changing free-only model routing.

# Inputs / prerequisite decisions

- Use the current opaque session and Customer Account token.
- Add only a compact server-authored system context message.

# Files likely to change

- `server/chat.mjs`
- `server/chat-free-models.test.mjs` or `server/server.test.mjs`
- `server.mjs`

# Detailed changes to make

- Resolve the logged-in customer only when a session has a customer token.
- Read the public Crew summary and add level, XP, tickets and next unlock.
- Treat account/Crew lookup failure as non-fatal to chat.
- Preserve the hard `:free` model filters and cost verification.

# Commands to run

- `npx vitest run server/server.test.mjs server/chat-free-models.test.mjs`

# Acceptance criteria

- Logged-in chat receives trusted Crew context.
- Logged-out chat receives no balance context.
- Crew lookup failure does not disable Rocky IA.
- All selected models remain free-only.

# Risks / edge cases

- Never log or return the customer token or raw Customer GID.

# Done evidence to report back

- Chat contract tests and inspected upstream request body.

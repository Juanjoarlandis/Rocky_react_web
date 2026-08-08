# Task

Integrate trusted catalog context into `/api/chat`.

# Goal

Return `{ message, products }` without changing free-only routing or trusting the model with card structure.

# Inputs / prerequisite decisions

- Task 01 is complete.
- Reuse one Storefront client in the Express app.
- Catalog failure must not take the entire chat down.

# Files likely to change

- `server.mjs`
- `server/chat.mjs`
- `server/rocky-prompt.mjs`
- `server/shopify/routes.mjs`
- `server/server.test.mjs`

# Detailed changes to make

- Allow the Shopify router to receive an existing Storefront client.
- Load relevant products only for commerce intent.
- Insert fact-only catalog context into the system-message sequence.
- Return server-selected cards separately from the model message.
- Log sanitized catalog failures and continue with no cards.

# Commands to run

`npm test -- server/chat-commerce.test.mjs server/server.test.mjs server/rocky-prompt.test.mjs`

# Acceptance criteria

- A shopping request receives product cards and factual prompt context.
- A normal brand question makes no Shopify request.
- A Shopify failure still yields an ordinary Rocky IA response.
- Existing origin, rate-limit, session, and cost tests pass.

# Risks / edge cases

- The same injected `fetchImpl` handles Shopify and OpenRouter during tests.
- Chat history must store only conversational text, not card payloads.

# Done evidence to report back

Focused API tests passing with explicit request/response assertions.

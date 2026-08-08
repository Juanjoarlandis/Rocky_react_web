# Rocky IA commerce assistant

## Problem

Rocky IA can answer about the brand but cannot currently surface trustworthy products, prices, variants, or stock. The chat UI also has no product discovery or cart interaction.

## Scope

- Select relevant Shopify products on the server for each chat request.
- Give the free model a compact, trusted commerce context while keeping the UI data separate.
- Return sanitized product cards alongside the assistant message.
- Render a responsive chat-shopping experience with product links, variant selection, stock state, and add-to-cart.
- Preserve the existing free-only model routing, cost circuit, session history, origin checks, and Shopify cart validation.

## Non-goals

- Model tool-calling or model-generated HTML/JSON.
- Personalized recommendations based on private customer/order data.
- Writing stock, prices, products, discounts, or orders from the chat model.
- Claiming real inventory in local demo mode.

## Architecture delta

The Express app creates one Storefront client and shares it with the Shopify router and chat handler. A small commerce module identifies shopping intent, ranks sanitized products, builds a fact-only prompt context, and returns a bounded card DTO. `/api/chat` keeps `message` and adds `products`. React renders those cards and sends only the selected Shopify variant ID through the existing cart mutation.

Exact quantities remain optional. Without `SHOPIFY_EXPOSE_QUANTITY=true`, cards show only available/agotado. Shopify revalidates inventory during every cart mutation.

## Sequencing

1. Define catalog selection and card DTO with unit tests.
2. Share the Storefront client and extend the chat contract with integration tests.
3. Add card component and refactor the chat UI with component tests.
4. Run the complete repository check and inspect desktop/mobile rendering.

## Verification matrix

| Behavior | Evidence |
| --- | --- |
| Relevant products are ranked and bounded | commerce unit tests |
| No shopping intent means no catalog request/cards | chat HTTP test |
| Product facts stay outside model output | chat HTTP contract test |
| Variant IDs and stock states render safely | React component test |
| Add-to-cart uses the chosen variant | React component test |
| Existing security/free-only behavior remains intact | full `npm run check` |
| Responsive UI is usable | browser inspection at desktop and mobile widths |

## Risks and rollback

- Shopify latency: only shopping-related prompts query the existing Storefront client; failures degrade to normal chat without cards.
- Stale availability between display and click: Shopify remains authoritative and rejects unavailable variants during cart mutation.
- Model hallucination: numeric commerce facts are shown by React; the prompt tells the model to refer to the cards instead of repeating figures.
- Rollback is limited to the shared Storefront wiring, chat commerce module, response field, and new card UI.

## Tasks

1. `tasks/01-commerce-contract.md`
2. `tasks/02-chat-integration.md`
3. `tasks/03-chat-ui.md`
4. `tasks/04-verification.md`

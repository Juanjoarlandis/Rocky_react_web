# Task

Build the product-aware Rocky IA interface.

# Goal

Make the chat feel like a ROCKY shopping corner and support product navigation, variant choice, and add-to-cart within the conversation.

# Inputs / prerequisite decisions

- `/api/chat` returns sanitized card DTOs.
- Existing `addToCart(product, variantId)` is reused.
- Demo catalog cards never claim live stock.

# Files likely to change

- `src/App.jsx`
- `src/components/ChatComponent.jsx`
- `src/components/ChatProductCard.jsx`
- `src/components/ChatComponent.test.jsx`
- `src/styles/ChatComponent.css`

# Detailed changes to make

- Pass commerce mode, cart capability, and `addToCart` into the chat route.
- Add a branded introduction, example prompt chips, clearer loading state, and accessible live regions.
- Render product cards under their assistant answer.
- Select the first available variant and allow size/variant changes.
- Link media/title to the existing product detail route.
- Disable purchase when sold out or Shopify cart capability is unavailable.
- Make the shell and card rail responsive without a new UI dependency.

# Commands to run

`npm test -- src/components/ChatComponent.test.jsx`

# Acceptance criteria

- Example prompts submit correctly.
- Product details and availability are visible.
- Choosing a variant changes the ID sent to `addToCart`.
- Mobile layout has no horizontal page overflow and controls remain usable.

# Risks / edge cases

- Long product names and variant labels.
- Product images missing or failing to load.
- Multiple chat turns each containing cards.

# Done evidence to report back

Component tests and browser screenshots/inspection notes.

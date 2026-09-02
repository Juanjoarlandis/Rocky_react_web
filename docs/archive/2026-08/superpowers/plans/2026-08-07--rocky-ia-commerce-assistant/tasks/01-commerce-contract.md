# Task

Define the trusted commerce context.

# Goal

Detect product-shopping messages, rank Shopify catalog results, and return a bounded card DTO plus prompt-safe facts.

# Inputs / prerequisite decisions

- Shopify is authoritative.
- Model-generated product identifiers, prices, links, and HTML are forbidden.
- At most three cards are returned.

# Files likely to change

- `server/chat-commerce.mjs`
- `server/chat-commerce.test.mjs`

# Detailed changes to make

- Normalize Spanish search text and recognize shopping intent.
- Rank title/drop/description/variant matches with deterministic weights.
- Prefer products that are currently sellable.
- Sanitize images, money, variants, quantity, and route handles.
- Build a compact fact block that tells the model to point at the cards.

# Commands to run

`npm test -- server/chat-commerce.test.mjs`

# Acceptance criteria

- Generic product requests return up to three available products.
- Specific names and sizes rank matching products.
- Non-commerce messages do not request catalog context.
- Unsafe or malformed fields are omitted.

# Risks / edge cases

- Accent and plural variants in Spanish.
- Products with no variants or no featured image.
- Exact quantities hidden by Shopify configuration.

# Done evidence to report back

Focused test output with all contract cases passing.

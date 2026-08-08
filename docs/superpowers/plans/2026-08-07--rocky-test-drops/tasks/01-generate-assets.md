# Task

Generate and optimize six ROCKY T-shirt mockups.

# Goal

Create two visually distinct, square, front-facing catalog images for each approved test drop.

# Inputs / prerequisite decisions

Use the current product images only as composition references. Use built-in image generation, not the API/CLI fallback. Keep exact garment colors and concept-specific graphics from the approved spec.

# Files likely to change

- `public/products/rocky-test-*.webp`

# Detailed changes to make

- Generate one image per concept with no model, hanger, watermark, or unrelated props.
- Inspect garment shape, print legibility, cropping, and background consistency.
- Regenerate only assets that materially fail the prompt.
- Convert selected outputs to square, web-optimized WebP files without overwriting current products.

# Commands to run

- `file public/products/rocky-test-*.webp`
- `identify public/products/rocky-test-*.webp`

# Acceptance criteria

Six distinct mockups exist, are square, renderable, and visually suitable for the current product grid.

# Risks / edge cases

Image generation may distort small text or produce inconsistent sleeves. Prefer strong readable motifs over dense typography.

# Done evidence to report back

Final paths, prompt set, image dimensions, file sizes, and a visual contact sheet.

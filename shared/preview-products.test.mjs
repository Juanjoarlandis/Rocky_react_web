import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import previewProducts from './preview-products.mjs';

describe('preview product catalog', () => {
  it('contains six unique, non-live concepts split evenly across three drops', () => {
    expect(previewProducts).toHaveLength(6);
    expect(new Set(previewProducts.map((product) => product.handle)).size).toBe(6);

    const productsPerDrop = previewProducts.reduce((drops, product) => {
      drops[product.dropHandle] = [...(drops[product.dropHandle] || []), product];
      return drops;
    }, {});
    expect(Object.values(productsPerDrop).map((products) => products.length)).toEqual([2, 2, 2]);
    expect(
      previewProducts.every((product) => product.isPreview === true && product.price === null)
    ).toBe(true);
  });

  it('points every concept at a real project-bound WebP asset', async () => {
    await Promise.all(
      previewProducts.map(async (product) => {
        expect(product.image).toMatch(/^\/products\/[a-z0-9-]+\.webp$/);
        const asset = path.resolve(process.cwd(), 'public', product.image.slice(1));
        await expect(fs.access(asset)).resolves.toBeUndefined();
      })
    );
  });
});

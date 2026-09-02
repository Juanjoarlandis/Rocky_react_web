import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKnownProducts, loadDemoCatalogHandles, slugify } from './known-products.mjs';

const temporaryDirectories = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

async function writeCatalog(products) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-catalog-'));
  temporaryDirectories.push(directory);
  const filePath = path.join(directory, 'demoCatalog.json');
  await fs.writeFile(filePath, JSON.stringify(products));
  return filePath;
}

describe('known product handles', () => {
  it('derives the same handles as the browser from the demo catalog', async () => {
    expect(slugify('35 RED')).toBe('35-red');
    expect(slugify('ROCKY DROP 4')).toBe('rocky-drop-4');

    const filePath = await writeCatalog([
      { id: 1, title: '35 RED', drop: 'ROCKY DROP 4' },
      { id: 2, title: 'Flora Blue', drop: 'ROCKY DROP 4' },
    ]);

    expect([...loadDemoCatalogHandles(filePath)]).toEqual(['35-red', 'rocky-drop-4', 'flora-blue']);
  });

  it('reads the real demo catalog and the preview concepts', () => {
    const known = createKnownProducts();

    expect(known.staticHandles.has('rocky-drop-4')).toBe(true);
    expect(known.staticHandles.has('35-red')).toBe(true);
    expect(known.staticHandles.has('rocky-signal-ghost')).toBe(true);
    expect(known.staticHandles.has('colmena-signal')).toBe(true);
    expect(known.staticHandles.has('cualquier-cosa')).toBe(false);
  });

  it('keeps working with a warning when the demo catalog is missing', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const known = createKnownProducts({ demoCatalogPath: '/nope/demoCatalog.json', logger });

    expect(known.staticHandles.has('rocky-signal-ghost')).toBe(true);
    expect(known.staticHandles.has('35-red')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'Demo catalog could not be loaded for known product handles',
      { reason: 'ENOENT' }
    );
  });

  it('consults the live catalog only for handles the static set does not know', async () => {
    const catalog = {
      list: vi.fn().mockResolvedValue({
        products: [{ handle: 'rocky-racing', drop: { handle: 'drop-4', title: 'DROP 4' } }],
      }),
    };
    const known = createKnownProducts({ catalog });

    await expect(known.includes('rocky-signal-ghost')).resolves.toBe(true);
    expect(catalog.list).not.toHaveBeenCalled();
    await expect(known.includes('rocky-racing')).resolves.toBe(true);
    await expect(known.includes('drop-4')).resolves.toBe(true);
    await expect(known.includes('inventado')).resolves.toBe(false);

    catalog.list.mockRejectedValueOnce(new Error('caído'));
    await expect(known.includes('rocky-racing')).resolves.toBe(false);
  });
});

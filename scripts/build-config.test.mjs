import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryDirectories = [];

afterEach(async () => {
  // Vite deja esta marca en el proceso cuando lee NODE_ENV de un .env.
  delete process.env.VITE_USER_NODE_ENV;
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

describe('build independiente del entorno local', () => {
  it('Vite no lee el .env que haya en la raíz del proyecto', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-vite-'));
    temporaryDirectories.push(root);
    await fs.writeFile(path.join(root, '.env'), 'NODE_ENV=development\nVITE_PROBE=1\n');

    const config = await resolveConfig(
      { root, configFile: path.join(repositoryRoot, 'vite.config.mjs'), logLevel: 'silent' },
      'build',
      'production'
    );

    expect(config.env).not.toHaveProperty('VITE_PROBE');
    expect(process.env.VITE_USER_NODE_ENV).toBeUndefined();
  });
});

describe('npm run check', () => {
  it('mide el presupuesto justo después de construir, antes del control de secretos', async () => {
    const { scripts } = JSON.parse(
      await fs.readFile(path.join(repositoryRoot, 'package.json'), 'utf8')
    );

    expect(scripts['budget:check']).toBe('node scripts/check-budget.mjs');
    expect(scripts.check).toMatch(
      /npm run build && npm run budget:check && npm run security:check$/
    );
  });
});

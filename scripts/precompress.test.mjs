import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { precompress } from './precompress.mjs';

const temporaryDirectories = [];

async function makeDist(files) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-precompress-'));
  temporaryDirectories.push(directory);
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(directory, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
  return directory;
}

async function listing(directory, prefix = '') {
  const names = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      names.push(...(await listing(path.join(directory, entry.name), `${prefix}${entry.name}/`)));
    } else {
      names.push(`${prefix}${entry.name}`);
    }
  }
  return names.sort();
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

// Texto repetitivo: se comprime de sobra.
const text = (seed) => `/* ${seed} */\n${'const rocky = "035";\n'.repeat(400)}`;

describe('precompresión del build', () => {
  it('deja una variante Brotli y otra gzip junto a cada fichero de texto', async () => {
    const dist = await makeDist({
      'index.html': text('html'),
      'assets/index-AAAAAAAA.js': text('js'),
      'assets/worker-BBBBBBBB.mjs': text('mjs'),
      'assets/index-CCCCCCCC.css': text('css'),
      'favicon.svg': text('svg'),
      'manifest.json': text('json'),
      'robots.txt': text('txt'),
    });

    await precompress(dist);

    expect(await listing(dist)).toEqual(
      [
        'assets/index-AAAAAAAA.js',
        'assets/index-CCCCCCCC.css',
        'assets/worker-BBBBBBBB.mjs',
        'favicon.svg',
        'index.html',
        'manifest.json',
        'robots.txt',
      ]
        .flatMap((name) => [name, `${name}.br`, `${name}.gz`])
        .sort()
    );
  });

  it('cada variante es más pequeña que su original y se descomprime a él', async () => {
    const source = text('js');
    const dist = await makeDist({ 'assets/index-AAAAAAAA.js': source });
    await precompress(dist);
    const file = path.join(dist, 'assets/index-AAAAAAAA.js');
    const [brotli, gzip] = await Promise.all([
      fs.readFile(`${file}.br`),
      fs.readFile(`${file}.gz`),
    ]);

    expect(brotli.length).toBeLessThan(source.length);
    expect(gzip.length).toBeLessThan(source.length);
    expect(zlib.brotliDecompressSync(brotli).toString()).toBe(source);
    expect(zlib.gunzipSync(gzip).toString()).toBe(source);
    expect(await fs.readFile(file, 'utf8')).toBe(source);
  });

  it('no comprime lo que ya va comprimido: imágenes, fuentes y audio', async () => {
    const dist = await makeDist({
      'assets/foto.webp': Buffer.alloc(4000, 1),
      'logo512.png': Buffer.alloc(4000, 2),
      'assets/archivo.woff2': Buffer.alloc(4000, 3),
      'music/barro.m4a': Buffer.alloc(4000, 4),
      'favicon.ico': Buffer.alloc(4000, 5),
    });

    await precompress(dist);

    expect((await listing(dist)).filter((name) => /\.(br|gz)$/.test(name))).toEqual([]);
  });

  it('omite la variante que no es más pequeña que el original', async () => {
    const dist = await makeDist({ 'vacio.txt': '', 'mini.json': '{}' });

    await precompress(dist);

    expect(await listing(dist)).toEqual(['mini.json', 'vacio.txt']);
  });

  it('ejecutarlo dos veces da el mismo resultado y no comprime las variantes', async () => {
    const dist = await makeDist({
      'assets/index-AAAAAAAA.js': text('js'),
      'index.html': text('h'),
    });
    await precompress(dist);
    const first = await listing(dist);
    const bytes = await fs.readFile(path.join(dist, 'index.html.br'));

    const summary = await precompress(dist);

    expect(await listing(dist)).toEqual(first);
    expect(await fs.readFile(path.join(dist, 'index.html.br'))).toEqual(bytes);
    expect(summary.files).toBe(2);
  });

  it('retira la variante de un fichero que ha cambiado y ya no gana nada', async () => {
    const dist = await makeDist({ 'nota.txt': text('txt') });
    await precompress(dist);
    await fs.writeFile(path.join(dist, 'nota.txt'), 'x');

    await precompress(dist);

    expect(await listing(dist)).toEqual(['nota.txt']);
  });

  it('retira las variantes de un fichero que ya no está', async () => {
    const dist = await makeDist({ 'viejo.js': text('js'), 'sigue.js': text('js2') });
    await precompress(dist);
    await fs.rm(path.join(dist, 'viejo.js'));

    await precompress(dist);

    expect(await listing(dist)).toEqual(['sigue.js', 'sigue.js.br', 'sigue.js.gz']);
  });

  it('no toca un .gz que no es variante de nada compresible', async () => {
    const dist = await makeDist({ 'datos.tar.gz': Buffer.alloc(300, 1), 'a.js': text('js') });

    await precompress(dist);

    expect(await listing(dist)).toEqual(['a.js', 'a.js.br', 'a.js.gz', 'datos.tar.gz']);
  });

  it('dice cuánto se ahorra', async () => {
    const dist = await makeDist({ 'assets/index-AAAAAAAA.js': text('js') });

    const summary = await precompress(dist);

    expect(summary).toMatchObject({ files: 1 });
    expect(summary.originalBytes).toBe(text('js').length);
    expect(summary.brotliBytes).toBeLessThan(summary.gzipBytes);
    expect(summary.gzipBytes).toBeLessThan(summary.originalBytes);
  });
});

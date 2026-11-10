import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { mountStaticApp, preferredEncoding } from './static.mjs';

const servers = new Set();
const directories = new Set();

const INDEX_HTML = `<!doctype html><html><body>ROCKY TEST APP ${'x'.repeat(600)}</body></html>`;
const APP_JS = `export const ok = true;\n${'// relleno para que comprimir compense\n'.repeat(60)}`;
const AUDIO = Buffer.alloc(4096, 7);

afterEach(async () => {
  await Promise.all([...servers].map((server) => new Promise((done) => server.close(done))));
  servers.clear();
  await Promise.all(
    [...directories].map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
  directories.clear();
});

// Un dist/ mínimo. Con `variants`, deja junto a los ficheros de texto lo mismo
// que scripts/precompress.mjs.
async function makeDist({ variants = true } = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-static-neg-'));
  directories.add(directory);
  await fs.mkdir(path.join(directory, 'assets'));
  await fs.mkdir(path.join(directory, 'music'));
  const files = {
    'index.html': INDEX_HTML,
    'assets/app-test.js': APP_JS,
    'assets/foto-test.webp': 'fake-webp',
    'music/barro.m4a': AUDIO,
  };
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(directory, name), content);
    if (variants && /\.(js|html)$/.test(name)) {
      await fs.writeFile(path.join(directory, `${name}.br`), zlib.brotliCompressSync(content));
      await fs.writeFile(path.join(directory, `${name}.gz`), zlib.gzipSync(content));
    }
  }
  return directory;
}

async function start(options = {}) {
  const app = express();
  mountStaticApp(app, { staticDirectory: await makeDist(options), isPrivate: options.isPrivate });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  servers.add(server);
  return server.address().port;
}

// fetch descomprime por su cuenta y manda su propio Accept-Encoding: aquí hace
// falta ver los bytes y las cabeceras tal como salen.
function request(port, pathname, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: pathname, method, headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });
}

describe('qué codificación prefiere una petición', () => {
  const both = { br: true, gzip: true };

  it.each([
    ['br, gzip', 'br'],
    ['gzip, deflate, br', 'br'],
    ['gzip', 'gzip'],
    ['gzip;q=1, br;q=0.1', 'br'],
    ['br;q=0, gzip', 'gzip'],
    ['br;q=0, gzip;q=0', null],
    ['*', 'br'],
    ['*;q=0', null],
    ['identity', null],
    ['deflate', null],
    ['', null],
    [undefined, null],
    ['BR', 'br'],
    ['br ;q=0, *', 'gzip'],
    ['br ; q=0 , gzip ; q=0.5', 'gzip'],
  ])('Accept-Encoding «%s» → %s', (header, expected) => {
    expect(preferredEncoding(header, both)).toBe(expected);
  });

  it('solo ofrece las variantes que existen', () => {
    expect(preferredEncoding('br, gzip', { br: false, gzip: true })).toBe('gzip');
    expect(preferredEncoding('br', { br: false, gzip: true })).toBeNull();
  });
});

describe('servido de las variantes precomprimidas', () => {
  it('responde con Brotli a quien lo acepta, y el cuerpo es el fichero original', async () => {
    const port = await start();
    const response = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br, gzip' },
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('br');
    expect(zlib.brotliDecompressSync(response.body).toString()).toBe(APP_JS);
    expect(response.body.length).toBeLessThan(APP_JS.length);
  });

  it('responde con gzip a quien solo acepta gzip', async () => {
    const port = await start();
    const response = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'gzip' },
    });

    expect(response.headers['content-encoding']).toBe('gzip');
    expect(zlib.gunzipSync(response.body).toString()).toBe(APP_JS);
  });

  it.each([[{}], [{ 'Accept-Encoding': 'br;q=0, gzip;q=0' }]])(
    'sirve el original a quien no acepta compresión: %j',
    async (headers) => {
      const port = await start();
      const response = await request(port, '/assets/app-test.js', { headers });

      expect(response.status).toBe(200);
      expect(response.headers).not.toHaveProperty('content-encoding');
      expect(response.body.toString()).toBe(APP_JS);
    }
  );

  it('en HEAD da las cabeceras de la variante sin cuerpo', async () => {
    const port = await start();
    const response = await request(port, '/assets/app-test.js', {
      method: 'HEAD',
      headers: { 'Accept-Encoding': 'br' },
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('br');
    expect(Number(response.headers['content-length'])).toBe(zlib.brotliCompressSync(APP_JS).length);
    expect(response.body.length).toBe(0);
  });

  it('conserva el tipo, la caché y añade Vary', async () => {
    const port = await start();
    const response = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br' },
    });

    expect(response.headers['content-type']).toMatch(/^(application|text)\/javascript/);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(response.headers['cloudflare-cdn-cache-control']).toBe('public, max-age=31536000');
    expect(response.headers.vary).toMatch(/Accept-Encoding/i);
  });

  it('también añade Vary cuando sirve el original de un recurso con variantes', async () => {
    const port = await start();
    const response = await request(port, '/assets/app-test.js');

    expect(response.headers.vary).toMatch(/Accept-Encoding/i);
  });

  it('revalida con 304 solo la variante que el cliente ya tiene', async () => {
    const port = await start();
    const brotli = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br' },
    });
    const gzip = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(brotli.headers.etag).toBeTruthy();
    expect(brotli.headers.etag).not.toBe(gzip.headers.etag);

    const same = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br', 'If-None-Match': brotli.headers.etag },
    });
    const other = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br', 'If-None-Match': gzip.headers.etag },
    });

    expect(same.status).toBe(304);
    expect(other.status).toBe(200);
  });

  it.each(['/', '/cart', '/index.html'])('negocia también el documento en %s', async (route) => {
    const port = await start();
    const response = await request(port, route, { headers: { 'Accept-Encoding': 'br' } });

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('br');
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(response.headers.vary).toMatch(/Accept-Encoding/i);
    expect(zlib.brotliDecompressSync(response.body).toString()).toBe(INDEX_HTML);
  });

  it('el documento sin compresión sigue llegando entero', async () => {
    const port = await start();
    const response = await request(port, '/cart');

    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(response.body.toString()).toBe(INDEX_HTML);
  });

  it('no comprime el audio y sigue sirviéndolo por rangos', async () => {
    const port = await start();
    const response = await request(port, '/music/barro.m4a', {
      headers: { 'Accept-Encoding': 'br', Range: 'bytes=0-1023' },
    });

    expect(response.status).toBe(206);
    expect(response.body.length).toBe(1024);
    expect(response.headers).not.toHaveProperty('content-encoding');
  });

  it('una imagen llega sin Content-Encoding acepte lo que acepte el cliente', async () => {
    const port = await start();
    const response = await request(port, '/assets/foto-test.webp', {
      headers: { 'Accept-Encoding': 'br, gzip' },
    });

    expect(response.status).toBe(200);
    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(response.body.toString()).toBe('fake-webp');
  });

  it('un asset que no existe sigue siendo un 404 sin caché y sin codificación', async () => {
    const port = await start();
    const response = await request(port, '/assets/no-existe.js', {
      headers: { 'Accept-Encoding': 'br' },
    });

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/^text\/plain/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(response.body.toString()).not.toContain('ROCKY TEST APP');
  });

  it('no deja salir de dist/ con una ruta codificada', async () => {
    const port = await start();
    const response = await request(port, '/assets/..%2f..%2findex.html', {
      headers: { 'Accept-Encoding': 'br' },
    });

    expect(response.status).toBe(404);
    expect(response.headers).not.toHaveProperty('content-encoding');
  });

  it('con la puerta activa comprime igual y conserva las cabeceras privadas', async () => {
    const port = await start({ isPrivate: true });
    const response = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br' },
    });

    expect(response.headers['content-encoding']).toBe('br');
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers.vary).toMatch(/Cookie/i);
    expect(response.headers.vary).toMatch(/Accept-Encoding/i);
  });

  it('sin variantes en dist/ arranca y sirve los originales', async () => {
    const port = await start({ variants: false });
    const asset = await request(port, '/assets/app-test.js', {
      headers: { 'Accept-Encoding': 'br' },
    });
    const document = await request(port, '/cart', { headers: { 'Accept-Encoding': 'br' } });

    expect(asset.status).toBe(200);
    expect(asset.headers).not.toHaveProperty('content-encoding');
    expect(asset.body.toString()).toBe(APP_JS);
    expect(document.headers).not.toHaveProperty('content-encoding');
    expect(document.body.toString()).toBe(INDEX_HTML);
  });
});

describe('si una variante desaparece con el servidor en marcha', () => {
  it('no deja la codificación ni el tipo de la variante en lo que se sirve en su lugar', async () => {
    const directory = await makeDist();
    await fs.writeFile(path.join(directory, 'datos.json'), '{"a":"'.padEnd(400, 'x') + '"}');
    await fs.writeFile(path.join(directory, 'datos.json.br'), zlib.brotliCompressSync('x'));
    const app = express();
    mountStaticApp(app, { staticDirectory: directory });
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    servers.add(server);
    await fs.rm(path.join(directory, 'datos.json.br'));
    await fs.rm(path.join(directory, 'index.html.br'));
    await fs.rm(path.join(directory, 'index.html.gz'));

    const response = await request(server.address().port, '/datos.json', {
      headers: { 'Accept-Encoding': 'br' },
    });

    // La variante ya no está: lo que responde en su lugar no hereda nada de
    // ella. Desde seo-y-cache ya no es el documento de la aplicación (eso es
    // solo para rutas que la aplicación conoce) sino el 404 de un fichero.
    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/^text\/plain/);
    expect(response.body.toString()).toBe('Not found.');
  });
});

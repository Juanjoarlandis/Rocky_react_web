import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { encodePattern, emptyPattern } from '../shared/beat-codec.mjs';
import { EncryptedFileStore } from './storage/encrypted-file-store.mjs';

/* El servidor de verdad, como proceso, con un almacén cifrado temporal: lo que
   se comprueba es qué queda en el fichero después de un apagado ordenado
   (SIGTERM) y de una muerte brusca (SIGKILL). */

const entry = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.mjs');
const children = new Set();
const directories = new Set();

afterEach(async () => {
  for (const child of children) child.kill('SIGKILL');
  children.clear();
  await Promise.all(
    [...directories].map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
  directories.clear();
});

const freePort = () =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

async function startServer() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-shutdown-'));
  directories.add(directory);
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const key = crypto.randomBytes(32).toString('base64');
  const filePath = path.join(directory, 'state.enc');
  // cwd temporal: el servidor no encuentra ningún .env que cargar.
  const child = spawn(process.execPath, [entry], {
    cwd: directory,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      PORT: String(port),
      PUBLIC_ORIGIN: origin,
      API_ALLOWED_ORIGINS: origin,
      SITE_ACCESS_ENABLED: 'false',
      STATE_STORE_PATH: filePath,
      APP_ENCRYPTION_KEY: key,
      AVISOS_RATE_LIMIT_MAX: '100',
    },
    stdio: 'ignore',
  });
  children.add(child);
  const exited = new Promise((resolve) =>
    child.once('exit', (code, signal) => resolve({ code, signal }))
  );
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {
      /* arrancando */
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  const post = (route, body, headers = {}) =>
    fetch(`${origin}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, ...headers },
      body: JSON.stringify(body),
    });
  // Lo que hay en disco, leído por otra instancia del almacén con la misma clave.
  const onDisk = () => new EncryptedFileStore({ filePath, key });
  return { child, exited, post, onDisk, directory, origin };
}

function beat() {
  const pattern = emptyPattern();
  pattern[0][1] = 3;
  pattern[1][3] = 2;
  return {
    code: encodePattern(pattern),
    bpm: 92,
    swing: 0.2,
    tono: 'do',
    name: 'Barro',
    alias: 'asako',
  };
}

const aviso = (email) => ({ producto: 'rocky-airwave', email, consentimiento: true });

async function publishAndLike(server) {
  const published = await server.post('/api/beats', beat());
  expect(published.status).toBe(201);
  const { beat: created } = await published.json();
  const cookie = published.headers.get('set-cookie').split(';', 1)[0];
  // Otro visitante le da «me mola»: una escritura diferida.
  const liked = await server.post(`/api/beats/${created.id}/like`, {});
  expect(liked.status).toBe(200);
  return { id: created.id, cookie };
}

const likesOf = async (store, id) => Object.keys((await store.get('beats', id))?.likes ?? {});

describe('apagado del servidor y estado en disco', () => {
  it('con SIGTERM, una escritura diferida reciente llega al disco antes de salir', async () => {
    const server = await startServer();
    const { id } = await publishAndLike(server);
    // Aún no han pasado los 5 s de la ventana: el «me mola» solo está en memoria.
    expect(await likesOf(server.onDisk(), id)).toHaveLength(0);

    server.child.kill('SIGTERM');
    const { code } = await server.exited;

    expect(code).toBe(0);
    expect(await likesOf(server.onDisk(), id)).toHaveLength(1);
  });

  it('con SIGKILL, lo confirmado está y el fichero se descifra; lo diferido reciente puede faltar', async () => {
    const server = await startServer();
    const response = await server.post('/api/avisos', aviso('a@example.test'));
    expect(response.status).toBe(200);
    const { id } = await publishAndLike(server);

    server.child.kill('SIGKILL');
    await server.exited;

    const store = server.onDisk();
    const lista = await store.get('avisos', 'rocky-airwave');
    expect(lista.map((entrada) => entrada.email)).toEqual(['a@example.test']);
    // El beat publicado es confirmado; su «me mola», diferido, no llegó a escribirse.
    expect(await store.get('beats', id)).not.toBeNull();
    expect(await likesOf(store, id)).toHaveLength(0);
  });

  it('con SIGKILL en plena ráfaga de volcados queda un estado completo y ningún temporal', async () => {
    const server = await startServer();
    await server.post('/api/avisos', aviso('primero@example.test'));
    const burst = Array.from({ length: 40 }, (_, i) =>
      server
        .post('/api/avisos', aviso(`persona${i}@example.test`), {
          'X-Forwarded-For': `198.51.100.${i + 1}`,
        })
        .catch(() => null)
    );
    await new Promise((resolve) => setTimeout(resolve, 15));

    server.child.kill('SIGKILL');
    await server.exited;
    await Promise.all(burst);

    // El fichero se descifra entero (si no, get lanzaría) y lleva lo confirmado antes de la ráfaga.
    const lista = await server.onDisk().get('avisos', 'rocky-airwave');
    expect(lista[0].email).toBe('primero@example.test');
    expect(new Set(lista.map((entrada) => entrada.email)).size).toBe(lista.length);
    // Un temporal de un volcado a medias, si quedó, se limpia cuando ya es viejo.
    const leftovers = (await fs.readdir(server.directory)).filter((name) => name.endsWith('.tmp'));
    const old = new Date(Date.now() - 60 * 60 * 1_000);
    await Promise.all(
      leftovers.map((name) => fs.utimes(path.join(server.directory, name), old, old))
    );
    await server.onDisk().get('avisos', 'rocky-airwave');
    const names = await fs.readdir(server.directory);
    expect(names.filter((name) => name.endsWith('.tmp'))).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.mjs';
import { encodePattern, emptyPattern } from '../../../shared/beat-codec.mjs';
import { MemoryStore } from '../../storage/memory-store.mjs';

const ORIGEN = 'https://rocky.test';
const ADMIN = 'una-llave-de-admin-bien-larga-035';
const runningServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...runningServers].map((server) => new Promise((resolve) => server.close(resolve)))
  );
  runningServers.clear();
});

async function arrancaServidor(env = {}) {
  const app = createApp({
    env: { NODE_ENV: 'test', PUBLIC_ORIGIN: ORIGEN, OPENROUTER_API_KEY: 'test-key', ...env },
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
    store: new MemoryStore(),
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  runningServers.add(server);
  return `http://127.0.0.1:${server.address().port}`;
}

function beatCode() {
  const pattern = emptyPattern();
  pattern[0][0] = 3;
  pattern[1][4] = 2;
  return encodePattern(pattern);
}

const BEAT = {
  code: beatCode(),
  bpm: 92,
  swing: 0.25,
  tono: 're',
  name: 'Pista uno',
  alias: 'crew035',
};

function post(baseUrl, path, body, { cookie, origin = ORIGEN, headers = {} } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function sessionCookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0];
}

describe('/api/beats', () => {
  it('publica un beat de la mesa y sale en el ranking', async () => {
    const baseUrl = await arrancaServidor();
    const empty = await fetch(`${baseUrl}/api/beats`);
    expect(await empty.json()).toEqual({ orden: 'semana', beats: [] });

    const created = await post(baseUrl, '/api/beats', BEAT);
    expect(created.status).toBe(201);
    const { beat, duplicate } = await created.json();
    expect(duplicate).toBe(false);
    expect(beat).toMatchObject({ name: 'Pista uno', alias: 'crew035', likes: 0, mine: true });

    const again = await post(baseUrl, '/api/beats', BEAT);
    expect(again.status).toBe(200);
    expect((await again.json()).duplicate).toBe(true);

    const list = await (await fetch(`${baseUrl}/api/beats?orden=nuevos`)).json();
    expect(list.orden).toBe('nuevos');
    expect(list.beats.map((item) => item.id)).toEqual([beat.id]);
  });

  it('sin el origen de la web no se publica ni se vota', async () => {
    const baseUrl = await arrancaServidor();
    const response = await post(baseUrl, '/api/beats', BEAT, { origin: 'https://otra.web' });
    expect(response.status).toBe(403);
  });

  it('dice en castellano qué falla de lo que se publica', async () => {
    const baseUrl = await arrancaServidor();
    const vacio = await post(baseUrl, '/api/beats', {
      ...BEAT,
      code: encodePattern(emptyPattern()),
    });
    expect(vacio.status).toBe(400);
    expect((await vacio.json()).message).toMatch(/vacío/);

    const feo = await post(baseUrl, '/api/beats', { ...BEAT, name: 'porno' });
    expect(feo.status).toBe(400);

    const orden = await fetch(`${baseUrl}/api/beats?orden=siempre`);
    expect(orden.status).toBe(400);
  });

  it('el campo trampa hace como que publica y no guarda nada', async () => {
    const baseUrl = await arrancaServidor();
    const response = await post(baseUrl, '/api/beats', { ...BEAT, web: 'http://spam' });
    expect(response.status).toBe(201);
    const list = await (await fetch(`${baseUrl}/api/beats`)).json();
    expect(list.beats).toEqual([]);
  });

  it('un like por navegador, siguiendo a su cookie de sesión', async () => {
    const baseUrl = await arrancaServidor();
    const { beat } = await (await post(baseUrl, '/api/beats', BEAT)).json();

    const primero = await post(baseUrl, `/api/beats/${beat.id}/like`);
    const cookie = sessionCookie(primero);
    expect(await primero.json()).toEqual({ liked: true, likes: 1 });

    const quitar = await post(baseUrl, `/api/beats/${beat.id}/like`, undefined, { cookie });
    expect(await quitar.json()).toEqual({ liked: false, likes: 0 });

    const otro = await post(baseUrl, `/api/beats/${beat.id}/like`);
    expect(await otro.json()).toEqual({ liked: true, likes: 1 });

    const noExiste = await post(baseUrl, '/api/beats/noexiste123/like');
    expect(noExiste.status).toBe(404);
  });

  it('quitar beats sólo existe con BEATS_ADMIN_TOKEN y con la llave buena', async () => {
    const sinLlave = await arrancaServidor();
    const { beat } = await (await post(sinLlave, '/api/beats', BEAT)).json();
    const borrar = (baseUrl, id, token) =>
      fetch(`${baseUrl}/api/beats/${id}`, {
        method: 'DELETE',
        headers: { Origin: ORIGEN, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
    expect((await borrar(sinLlave, beat.id, ADMIN)).status).toBe(404);

    const conLlave = await arrancaServidor({ BEATS_ADMIN_TOKEN: ADMIN });
    const { beat: otro } = await (await post(conLlave, '/api/beats', BEAT)).json();
    expect((await borrar(conLlave, otro.id, 'llave-equivocada-pero-bien-larga')).status).toBe(401);
    expect((await borrar(conLlave, otro.id, ADMIN)).status).toBe(200);
    const list = await (await fetch(`${conLlave}/api/beats`)).json();
    expect(list.beats).toEqual([]);
  });

  it('una llave de admin corta no arranca', () => {
    expect(() =>
      createApp({
        env: { NODE_ENV: 'test', PUBLIC_ORIGIN: ORIGEN, BEATS_ADMIN_TOKEN: 'corta' },
        logger: { error: vi.fn(), info: vi.fn() },
        store: new MemoryStore(),
      })
    ).toThrow(/BEATS_ADMIN_TOKEN/);
  });
});

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.mjs';
import { hashPassword } from './lib/password-hash.mjs';
import { MemoryStore } from './storage/memory-store.mjs';

const ORIGIN = 'https://rocky.test';
const running = new Set();

afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

// La pared solo se enciende con El Taller configurado (su moderación).
const TALLER = {
  SHOPIFY_STORE_DOMAIN: 'rocky-dev.myshopify.com',
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: 'storefront-token',
  SHOPIFY_CLIENT_ID: 'client',
  SHOPIFY_CLIENT_SECRET: 'secret',
  SHOPIFY_HEADLESS_PUBLICATION_ID: 'gid://shopify/Publication/1',
  TALLER_TOTP_SECRET: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
};
let tallerHash;

async function start(env = {}, { conTaller = true } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-pared-app-'));
  tallerHash ??= await hashPassword('clave de prueba del taller', { N: 1024, r: 8, p: 1 });
  const app = createApp({
    env: {
      NODE_ENV: 'test',
      PUBLIC_ORIGIN: ORIGIN,
      OPENROUTER_API_KEY: 'test-key',
      APP_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString('base64'),
      SHARED_WALL_ENABLED: 'true',
      SHARED_WALL_PATH: path.join(dir, 'pared.enc'),
      ...(conTaller ? { ...TALLER, TALLER_PASSWORD_HASH: tallerHash } : {}),
      ...env,
    },
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    store: new MemoryStore(),
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return `http://127.0.0.1:${server.address().port}`;
}

/* Un navegador: guarda su cookie de sesión entre peticiones. Con `ip`, llega
   desde esa red a través del proxy (la app arranca con TRUST_PROXY_HOPS=1). */
function navegador(base, ip = null) {
  let cookie = '';
  return async (ruta, { method = 'GET', body, headers = {} } = {}) => {
    const response = await fetch(`${base}${ruta}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' ? { Origin: ORIGIN } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  };
}

const trazo = { c: 1, s: 42, p: [-20, 300, -18, 306], d: [[-18, 306, 40]] };
const Q = 'pagina=%2Fcrew&ancho=ancha';

describe('la pared compartida en la app', () => {
  it('lo que pinta uno lo ve otro, firmado; la firma del cuerpo se ignora', async () => {
    const base = await start();
    const ana = navegador(base);
    const berto = navegador(base);
    const pintado = await ana('/api/pared/trazos', {
      method: 'POST',
      body: {
        pagina: '/crew',
        ancho: 'ancha',
        trazo: { ...trazo, firma: 'HACKER-1' },
        firma: 'YO-1',
      },
    });
    expect(pintado.status).toBe(201);
    const { id, firma } = await pintado.json();
    expect(firma).toMatch(/^[A-Z]+-\d{1,2}$/);
    const vista = await (await berto(`/api/pared?${Q}`)).json();
    expect(vista.enabled).toBe(true);
    expect(vista.strokes).toEqual([{ id, firma, c: 1, s: 42, p: trazo.p, d: trazo.d }]);
    expect(vista.firmas).toEqual([{ firma, mia: false }]);
    expect(vista.firma).toBe(null);
  });

  it('responde 304 con el ETag de la versión y no-store', async () => {
    const base = await start();
    const ana = navegador(base);
    await ana('/api/pared/trazos', {
      method: 'POST',
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    const primera = await ana(`/api/pared?${Q}`);
    expect(primera.headers.get('cache-control')).toContain('no-store');
    const etag = primera.headers.get('etag');
    expect(etag).toBeTruthy();
    const segunda = await ana(`/api/pared?${Q}`, { headers: { 'If-None-Match': etag } });
    expect(segunda.status).toBe(304);
  });

  it('rechaza trazos deformes, páginas inventadas y Origin ajeno', async () => {
    const base = await start();
    const ana = navegador(base);
    const deforme = await ana('/api/pared/trazos', {
      method: 'POST',
      body: { pagina: '/crew', ancho: 'ancha', trazo: { ...trazo, c: 9 } },
    });
    expect(deforme.status).toBe(400);
    expect((await deforme.json()).code).toBe('WALL_INVALID_STROKE');
    const inventada = await ana('/api/pared/trazos', {
      method: 'POST',
      body: { pagina: '/taller', ancho: 'ancha', trazo },
    });
    expect(inventada.status).toBe(400);
    const ajeno = await ana('/api/pared/trazos', {
      method: 'POST',
      body: { pagina: '/crew', ancho: 'ancha', trazo },
      headers: { Origin: 'https://malo.test' },
    });
    expect(ajeno.status).toBe(403);
  });

  it('deshacer y borrar solo tocan lo propio', async () => {
    const base = await start();
    const ana = navegador(base);
    const berto = navegador(base);
    const { id: deAna } = await (
      await ana('/api/pared/trazos', {
        method: 'POST',
        body: { pagina: '/crew', ancho: 'ancha', trazo },
      })
    ).json();
    const { id: deBerto } = await (
      await berto('/api/pared/trazos', {
        method: 'POST',
        body: { pagina: '/crew', ancho: 'ancha', trazo },
      })
    ).json();
    const ajeno = await ana(`/api/pared/trazos/${deBerto}?${Q}`, { method: 'DELETE' });
    expect(ajeno.status).toBe(403);
    expect((await ajeno.json()).code).toBe('WALL_NOT_YOURS');
    expect((await ana(`/api/pared/trazos/${deAna}?${Q}`, { method: 'DELETE' })).status).toBe(204);
    expect((await ana(`/api/pared/mios?${Q}`, { method: 'DELETE' })).status).toBe(204);
    const vista = await (await berto(`/api/pared?${Q}`)).json();
    expect(vista.strokes.map((s) => s.id)).toEqual([deBerto]);
  });

  it('tres reportes de visitantes distintos lo ocultan; ya no puede pintar ahí', async () => {
    const base = await start({ TRUST_PROXY_HOPS: '1' });
    const ana = navegador(base, '192.0.2.10');
    const { firma } = await (
      await ana('/api/pared/trazos', {
        method: 'POST',
        body: { pagina: '/crew', ancho: 'ancha', trazo },
      })
    ).json();
    for (const ip of ['198.51.100.1', '203.0.113.2', '2001:db8:5::1']) {
      const otro = navegador(base, ip);
      const r = await otro('/api/pared/reportes', {
        method: 'POST',
        body: { pagina: '/crew', ancho: 'ancha', firma },
      });
      expect(r.status).toBe(202);
    }
    const vista = await (await navegador(base)(`/api/pared?${Q}`)).json();
    expect(vista.strokes).toEqual([]);
    const otraVez = await ana('/api/pared/trazos', {
      method: 'POST',
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    expect(otraVez.status).toBe(403);
    expect((await otraVez.json()).code).toBe('WALL_HIDDEN_AUTHOR');
  });

  it('tres sesiones nuevas desde la misma red cuentan como un solo reporte', async () => {
    const base = await start({ TRUST_PROXY_HOPS: '1' });
    const ana = navegador(base, '192.0.2.10');
    const { firma } = await (
      await ana('/api/pared/trazos', {
        method: 'POST',
        body: { pagina: '/crew', ancho: 'ancha', trazo },
      })
    ).json();
    // Sin cookie cada petición estrena sesión, pero la red es la misma (un /64).
    for (const ip of ['2001:db8:7::1', '2001:db8:7::2', '2001:db8:7::3']) {
      const r = await navegador(base, ip)('/api/pared/reportes', {
        method: 'POST',
        body: { pagina: '/crew', ancho: 'ancha', firma },
      });
      expect(r.status).toBe(202);
    }
    const vista = await (await navegador(base, '198.51.100.9')(`/api/pared?${Q}`)).json();
    expect(vista.strokes).toHaveLength(1);
  });

  it('frena las ráfagas de trazos con 429', async () => {
    const base = await start();
    const ana = navegador(base);
    let ultimo;
    for (let i = 0; i < 41; i += 1) {
      ultimo = await ana('/api/pared/trazos', {
        method: 'POST',
        body: { pagina: '/estudio', ancho: 'ancha', trazo },
      });
    }
    expect(ultimo.status).toBe(429);
  });

  it('sin configurar, la pared está apagada: ni se sirve ni acepta trazos', async () => {
    const base = await start({ SHARED_WALL_ENABLED: '' });
    const ana = navegador(base);
    expect(await (await ana(`/api/pared?${Q}`)).json()).toEqual({ enabled: false });
    const pintado = await ana('/api/pared/trazos', {
      method: 'POST',
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    expect(pintado.status).toBe(404);
    expect((await pintado.json()).code).toBe('WALL_DISABLED');
  });

  it('sin El Taller configurado no se enciende aunque lo diga el entorno: nadie podría moderarla', async () => {
    const base = await start({}, { conTaller: false });
    const ana = navegador(base);
    expect(await (await ana(`/api/pared?${Q}`)).json()).toEqual({ enabled: false });
  });
});

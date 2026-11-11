import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createDropsRouter } from './drops.mjs';
import { errorHandler } from '../middleware/error-handler.mjs';
import { MemoryStore } from '../../storage/memory-store.mjs';
import { silentLogger } from '../../lib/logger.mjs';
import { createAvisosService } from '../../services/avisos.mjs';
import { createEsquina } from '../../services/esquina.mjs';

const running = new Set();
afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

const D6 = {
  handle: 'rocky-drop-6',
  number: 6,
  title: 'ROCKY DROP 6',
  state: 'anunciado',
  launchAt: '2026-11-13T20:00:00+01:00',
  designCount: 5,
  designs: null,
};
const D3 = {
  ...D6,
  handle: 'rocky-drop-3',
  number: 3,
  state: 'archivo',
  designs: ['rocky-congelado'],
};

async function arranca({ esquina } = {}) {
  const app = express();
  const drops = {
    publicPayload: async () => ({ now: '2026-11-09T12:00:00.000Z', featured: D6, drops: [D6, D3] }),
    publicDrop: async (handle) => [D6, D3].find((drop) => drop.handle === handle) ?? null,
  };
  app.use(
    '/api/drops',
    createDropsRouter({ config: { publicOrigin: 'https://rocky035.com' }, drops, esquina })
  );
  app.use(errorHandler({ logger: { error() {}, warn() {}, info() {} } }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return `http://127.0.0.1:${server.address().port}`;
}

describe('/api/drops', () => {
  it('devuelve la hora del servidor, el destacado y los drops sin caché compartida', async () => {
    const base = await arranca();
    const response = await fetch(`${base}/api/drops`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-cache');
    expect(await response.json()).toEqual({
      now: '2026-11-09T12:00:00.000Z',
      featured: D6,
      drops: [D6, D3],
    });
  });

  // La esquina de la espera (esquina-de-la-espera): el anunciado dice cuántos
  // esperan, en decenas, y de la lista de avisos no sale nada más.
  it('el drop anunciado dice cuántos esperan, en decenas y sin ningún email', async () => {
    const avisos = createAvisosService({ store: new MemoryStore(), logger: silentLogger });
    for (let i = 0; i < 23; i += 1) {
      await avisos.register({ product: 'rocky-drop-6', email: `crew${i}@esquina.test` });
    }
    const dropsModel = { sources: async () => [{ handle: 'rocky-drop-6', products: [] }] };
    const base = await arranca({
      esquina: createEsquina({ avisos, dropsModel, logger: silentLogger }),
    });

    const body = await (await fetch(`${base}/api/drops`)).json();

    expect(body.featured).toEqual({ ...D6, waiting: 20 });
    expect(body.drops).toEqual([{ ...D6, waiting: 20 }, D3]);
    expect(JSON.stringify(body)).not.toContain('@');
  });

  it('si la cuenta de la esquina falla, /api/drops responde igual, sin el número', async () => {
    const avisos = {
      list: async () => {
        throw Object.assign(new Error('roto'), { code: 'STORE_LOCKED' });
      },
    };
    const dropsModel = { sources: async () => [{ handle: 'rocky-drop-6', products: [] }] };
    const base = await arranca({
      esquina: createEsquina({ avisos, dropsModel, logger: silentLogger }),
    });

    const response = await fetch(`${base}/api/drops`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      now: '2026-11-09T12:00:00.000Z',
      featured: D6,
      drops: [D6, D3],
    });
  });

  it('da el calendario de un drop anunciado con su página', async () => {
    const base = await arranca();
    const response = await fetch(`${base}/api/drops/rocky-drop-6/calendario.ics`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/calendar/);
    const ics = await response.text();
    expect(ics).toContain('DTSTART:20261113T190000Z');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('URL:https://rocky035.com/products/rocky-drop-6');
  });

  it('un drop en archivo no tiene calendario', async () => {
    const base = await arranca();
    const response = await fetch(`${base}/api/drops/rocky-drop-3/calendario.ics`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'DROP_NOT_ANNOUNCED' });
  });

  it('un handle que no es de drop o no existe responde 404 sin consultar nada raro', async () => {
    const base = await arranca();
    for (const handle of ['rocky-drop-9', 'frontpage', '..%2F..%2Fetc']) {
      const response = await fetch(`${base}/api/drops/${handle}/calendario.ics`);
      expect(response.status).toBe(404);
    }
  });
});

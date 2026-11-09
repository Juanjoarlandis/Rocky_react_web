import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../errors.mjs';
import { errorHandler } from '../middleware/error-handler.mjs';
import { requireTrustedOrigin } from '../middleware/origin-policy.mjs';
import { createWallService } from '../../services/pared/servicio.mjs';
import { createTallerRouter } from './taller.mjs';

const ORIGIN = 'https://rocky.test';
const running = new Set();

afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

const trazo = { c: 0, s: 1, p: [0, 10, 2, 12], d: [] };

async function start({ loggedIn = true, enabled = true } = {}) {
  const pared = createWallService({ config: { enabled, filePath: '/no/se/usa.enc', key: '' } });
  await pared.listo;
  const auth = {
    login: vi.fn(),
    status: vi.fn(async () => ({ active: loggedIn, expiresAt: null })),
    logout: vi.fn(),
    requireTaller: (req, res, next) =>
      loggedIn
        ? next()
        : next(
            new HttpError('Entra en el Taller para seguir.', {
              status: 401,
              code: 'TALLER_AUTH_REQUIRED',
            })
          ),
  };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.use(
    '/api/taller',
    createTallerRouter({
      taller: { auth, service: {} },
      pared,
      requireOrigin: requireTrustedOrigin({ allowedOrigins: new Set([ORIGIN]) }),
      logger,
    })
  );
  app.use(errorHandler({ logger }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return { base: `http://127.0.0.1:${server.address().port}/api/taller`, pared, logger };
}

const send = (url, method, body, { origin = ORIGIN } = {}) =>
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

function pintar(pared, sesion, pagina = '/crew') {
  return pared.pintar({ pagina, ancho: 'ancha', sesion: { key: sesion }, trazo });
}

describe('El Taller: la limpieza de la pared', () => {
  it('sin sesión de El Taller no se ve ni se toca nada', async () => {
    const { base, pared } = await start({ loggedIn: false });
    pintar(pared, 'ana');
    expect((await fetch(`${base}/pared`)).status).toBe(401);
    const r = await send(`${base}/pared/limpiar`, 'POST', { pagina: '/crew', ancho: 'ancha' });
    expect(r.status).toBe(401);
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha' }).strokes).toHaveLength(1);
  });

  it('lista las paredes con su estado y detalla una con sus firmas', async () => {
    const { base, pared } = await start();
    const { firma } = pintar(pared, 'ana');
    const lista = await (await fetch(`${base}/pared`)).json();
    expect(lista.estado).toEqual({ configurada: true, encendida: true, corrupta: false });
    expect(lista.paredes).toEqual([expect.objectContaining({ pared: '/crew|ancha', trazos: 1 })]);
    const detalle = await (await fetch(`${base}/pared/detalle?pagina=%2Fcrew&ancho=ancha`)).json();
    expect(detalle.firmas).toEqual([{ firma, trazos: 1, reportes: 0, oculta: false }]);
  });

  it('oculta, muestra y borra lo de una firma, y limpia la pared, dejando registro', async () => {
    const { base, pared, logger } = await start();
    const { firma } = pintar(pared, 'ana');
    pintar(pared, 'berto');
    const cuerpo = { pagina: '/crew', ancho: 'ancha', firma };
    expect((await send(`${base}/pared/ocultar`, 'POST', cuerpo)).status).toBe(200);
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha' }).strokes).toHaveLength(1);
    expect((await send(`${base}/pared/mostrar`, 'POST', cuerpo)).status).toBe(200);
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha' }).strokes).toHaveLength(2);
    expect((await send(`${base}/pared/borrar-firma`, 'POST', cuerpo)).status).toBe(200);
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha' }).strokes).toHaveLength(1);
    const limpiar = await send(`${base}/pared/limpiar`, 'POST', {
      pagina: '/crew',
      ancho: 'ancha',
    });
    expect(limpiar.status).toBe(200);
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha' }).strokes).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith('Taller', {
      action: 'pared-ocultar',
      target: `/crew|ancha|${firma}`,
      result: 'ok',
    });
    // Ni sesiones ni claves de autor en el registro
    const lineas = JSON.stringify(logger.info.mock.calls);
    expect(lineas).not.toContain('ana');
    expect(lineas).not.toContain('berto');
  });

  it('las acciones exigen el Origin exacto', async () => {
    const { base, pared } = await start();
    pintar(pared, 'ana');
    const r = await send(
      `${base}/pared/limpiar`,
      'POST',
      { pagina: '/crew', ancho: 'ancha' },
      { origin: 'https://malo.test' }
    );
    expect(r.status).toBe(403);
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha' }).strokes).toHaveLength(1);
  });

  it('el interruptor apaga la pared al momento y la vuelve a encender', async () => {
    const { base, pared } = await start();
    expect((await send(`${base}/pared/estado`, 'PUT', { encendida: false })).status).toBe(200);
    expect(pared.activa()).toBe(false);
    const lista = await (await fetch(`${base}/pared`)).json();
    expect(lista.estado.encendida).toBe(false);
    await send(`${base}/pared/estado`, 'PUT', { encendida: true });
    expect(pared.activa()).toBe(true);
  });

  it('sin configurar, el interruptor no la enciende y lo dice', async () => {
    const { base } = await start({ enabled: false });
    const r = await send(`${base}/pared/estado`, 'PUT', { encendida: true });
    expect(r.status).toBe(409);
    expect((await r.json()).code).toBe('WALL_NOT_CONFIGURED');
  });

  it('una firma que no ha pintado en esa pared es un 404', async () => {
    const { base } = await start();
    const r = await send(`${base}/pared/ocultar`, 'POST', {
      pagina: '/crew',
      ancho: 'ancha',
      firma: 'LUNA-7',
    });
    expect(r.status).toBe(404);
  });

  it('mientras la pared carga su fichero, El Taller espera antes de tocarla', async () => {
    const { base, pared } = await start();
    let soltar;
    const cargando = new Promise((resolve) => {
      soltar = resolve;
    });
    // Simula un arranque lento: la pared aún no ha leído su fichero.
    Object.defineProperty(pared, 'listo', { value: cargando });
    let respondio = false;
    const peticion = fetch(`${base}/pared/detalle?pagina=%2Fcrew&ancho=ancha`).then((r) => {
      respondio = true;
      return r;
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(respondio).toBe(false);
    soltar();
    expect((await peticion).status).toBe(404);
  });
});

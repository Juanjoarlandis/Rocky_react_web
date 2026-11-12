import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWallService } from '../../services/pared/servicio.mjs';
import { createSessionManager } from '../../services/sessions.mjs';
import { MemoryStore } from '../../storage/memory-store.mjs';
import { errorHandler } from '../middleware/error-handler.mjs';
import { createWallRouter } from './pared.mjs';

/* pared-espera-a-cargar: lo que llega mientras la pared lee su fichero espera a la carga en vez
   de responder que la pared está apagada. El fichero se simula con una carga que no termina hasta
   que la prueba la suelta. */
const trazo = { c: 1, s: 42, p: [-20, 300, -18, 306], d: [[-18, 306, 40]] };
const Q = 'pagina=%2Fcrew&ancho=ancha';
const running = new Set();

afterEach(async () => {
  await Promise.all([...running].map((server) => new Promise((resolve) => server.close(resolve))));
  running.clear();
});

// Un estado guardado: lo que había en el fichero antes de arrancar.
function estadoGuardado({ encendida = true } = {}) {
  const previo = createWallService({ config: { enabled: true }, persistencia: discoInmediato() });
  const { firma } = previo.pintar({
    pagina: '/crew',
    ancho: 'ancha',
    sesion: { key: 'sesion-de-antes' },
    trazo,
  });
  if (!encendida) previo.encender(false);
  return { estado: previo.snapshot(), firma };
}

function discoInmediato(estado = null) {
  return {
    corrupto: false,
    cargar: async () => ({ estado, corrupto: false }),
    programar: () => {},
    volcar: async () => {},
    apartarCorrupto: async () => {},
  };
}

// Una carga que espera a `soltar()`, como un fichero que tarda en leerse.
function discoLento(estado = null) {
  let soltar;
  const leido = new Promise((resolve) => {
    soltar = resolve;
  });
  return {
    soltar: () => soltar(),
    corrupto: false,
    cargar: async () => {
      await leido;
      return { estado, corrupto: false };
    },
    programar: () => {},
    volcar: async () => {},
    apartarCorrupto: async () => {},
  };
}

async function arrancar(disco) {
  const pared = createWallService({ config: { enabled: true }, persistencia: disco });
  const sessions = createSessionManager({ store: new MemoryStore(), isProduction: false });
  const app = express();
  app.use(express.json());
  app.use(
    '/api/pared',
    createWallRouter({ pared, sessions, requireOrigin: (q, s, next) => next() })
  );
  app.use(errorHandler({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return { pared, base: `http://127.0.0.1:${server.address().port}/api/pared` };
}

const enviar = (url, { method = 'POST', body } = {}) =>
  fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

// Da tiempo a que la petición llegue al servidor y se quede esperando (o se rechace).
const unRato = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('las rutas de la pared mientras se carga su fichero', () => {
  it('un trazo enviado durante la carga espera y queda en la pared', async () => {
    const disco = discoLento();
    const { pared, base } = await arrancar(disco);

    const pintando = enviar(`${base}/trazos`, {
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    await unRato();
    expect(pared.activa()).toBe(false);
    disco.soltar();
    const respuesta = await pintando;

    expect(respuesta.status).toBe(201);
    const { id } = await respuesta.json();
    const vista = await (await fetch(`${base}?${Q}`)).json();
    expect(vista.strokes.map((s) => s.id)).toEqual([id]);
  });

  it('un reporte y un borrado durante la carga responden como con la pared cargada', async () => {
    const { estado, firma } = estadoGuardado();
    const disco = discoLento(estado);
    const { base } = await arrancar(disco);

    const reportando = enviar(`${base}/reportes`, {
      body: { pagina: '/crew', ancho: 'ancha', firma },
    });
    const borrando = enviar(`${base}/mios?${Q}`, { method: 'DELETE' });
    await unRato();
    disco.soltar();

    expect((await reportando).status).toBe(202);
    expect((await borrando).status).toBe(204);
  });

  it('si tras cargar la pared está apagada, el trazo no entra', async () => {
    const { estado } = estadoGuardado({ encendida: false });
    const disco = discoLento(estado);
    const { pared, base } = await arrancar(disco);

    const pintando = enviar(`${base}/trazos`, {
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    await unRato();
    disco.soltar();
    const respuesta = await pintando;

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).code).toBe('WALL_DISABLED');
    expect(pared.snapshot()).toEqual(estado);
  });
});

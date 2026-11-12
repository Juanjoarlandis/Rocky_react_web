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
  const { id, firma } = previo.pintar({
    pagina: '/crew',
    ancho: 'ancha',
    sesion: { key: 'sesion-de-antes' },
    trazo,
  });
  if (!encendida) previo.encender(false);
  return { estado: previo.snapshot(), id, firma };
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

// Una carga que espera a `soltar()`, como un fichero que tarda en leerse. Con `corrupto`, el
// fichero resulta ilegible al terminar.
function discoLento(estado = null, { corrupto = false } = {}) {
  let soltar;
  const leido = new Promise((resolve) => {
    soltar = resolve;
  });
  const disco = {
    soltar: () => soltar(),
    corrupto: false,
    cargar: async () => {
      await leido;
      disco.corrupto = corrupto;
      return { estado: corrupto ? null : estado, corrupto };
    },
    programar: () => {},
    volcar: async () => {},
    apartarCorrupto: async () => {},
  };
  return disco;
}

/* Arranca la pared con su disco y avisa de cada petición que entra en el router. Lo que va de
   `requireOrigin` a la comprobación de la pared es síncrono (límite, validación), así que cuando
   `llegadas(n)` se cumple, esas n peticiones ya han pasado por ella: o esperan a la carga o ya se
   han rechazado. Nada depende de cuánto tarde la máquina. */
async function arrancar(disco) {
  const pared = createWallService({ config: { enabled: true }, persistencia: disco });
  const sessions = createSessionManager({ store: new MemoryStore(), isProduction: false });
  let entradas = 0;
  const esperas = [];
  const requireOrigin = (req, res, next) => {
    next();
    entradas += 1;
    for (const espera of esperas.filter((e) => e.n <= entradas)) espera.resolve();
  };
  const llegadas = (n) =>
    new Promise((resolve) => {
      if (entradas >= n) resolve();
      else esperas.push({ n, resolve });
    });
  const app = express();
  app.use(express.json());
  app.use('/api/pared', createWallRouter({ pared, sessions, requireOrigin }));
  app.use(errorHandler({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  running.add(server);
  return { pared, llegadas, base: `http://127.0.0.1:${server.address().port}/api/pared` };
}

const enviar = (url, { method = 'POST', body } = {}) =>
  fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

describe('las rutas de la pared mientras se carga su fichero', () => {
  it('un trazo enviado durante la carga espera y se suma a lo que había en el fichero', async () => {
    const { estado, id: previo } = estadoGuardado();
    const disco = discoLento(estado);
    const { pared, llegadas, base } = await arrancar(disco);

    const pintando = enviar(`${base}/trazos`, {
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    await llegadas(1);
    expect(pared.activa()).toBe(false);
    disco.soltar();
    const respuesta = await pintando;

    expect(respuesta.status).toBe(201);
    const { id } = await respuesta.json();
    const vista = await (await fetch(`${base}?${Q}`)).json();
    expect(vista.strokes.map((s) => s.id)).toEqual([previo, id]);
  });

  it('deshacer, borrar y reportar durante la carga responden como con la pared cargada', async () => {
    const { estado, id: previo, firma } = estadoGuardado();
    const disco = discoLento(estado);
    const { llegadas, base } = await arrancar(disco);

    // Sin sesión, el trazo de otro no es suyo (403), y borrar lo propio no borra nada (204).
    const deshaciendo = enviar(`${base}/trazos/${previo}?${Q}`, { method: 'DELETE' });
    const borrando = enviar(`${base}/mios?${Q}`, { method: 'DELETE' });
    const reportando = enviar(`${base}/reportes`, {
      body: { pagina: '/crew', ancho: 'ancha', firma },
    });
    await llegadas(3);
    disco.soltar();

    const deshecho = await deshaciendo;
    expect(deshecho.status).toBe(403);
    expect((await deshecho.json()).code).toBe('WALL_NOT_YOURS');
    expect((await borrando).status).toBe(204);
    expect((await reportando).status).toBe(202);
  });

  // También pasaba antes del arreglo (se rechazaba al momento): fija que esperar no deja entrar
  // nada en una pared que resulta apagada.
  it('si tras cargar la pared está apagada, el trazo no entra', async () => {
    const { estado } = estadoGuardado({ encendida: false });
    const disco = discoLento(estado);
    const { pared, llegadas, base } = await arrancar(disco);

    const pintando = enviar(`${base}/trazos`, {
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    await llegadas(1);
    disco.soltar();
    const respuesta = await pintando;

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).code).toBe('WALL_DISABLED');
    expect(pared.snapshot()).toEqual(estado);
  });

  it('si tras cargar el fichero resulta corrupto, el trazo no entra', async () => {
    const disco = discoLento(null, { corrupto: true });
    const { pared, llegadas, base } = await arrancar(disco);

    const pintando = enviar(`${base}/trazos`, {
      body: { pagina: '/crew', ancho: 'ancha', trazo },
    });
    await llegadas(1);
    disco.soltar();
    const respuesta = await pintando;

    expect(respuesta.status).toBe(404);
    expect((await respuesta.json()).code).toBe('WALL_DISABLED');
    expect(pared.leer({ pagina: '/crew', ancho: 'ancha', sesion: null }).strokes).toEqual([]);
  });
});

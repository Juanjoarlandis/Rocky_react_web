import { describe, expect, it } from 'vitest';
import { FIRMA_RE } from './firmas.mjs';
import { createWallModel } from './model.mjs';

const T0 = Date.parse('2026-11-10T12:00:00Z');
const DIA = 24 * 60 * 60 * 1000;

// Un trazo de n puntos
const trazo = (n = 2, c = 0) => ({
  c,
  s: 7,
  p: Array.from({ length: n * 2 }, (_, i) => (i % 2 ? 100 + i : i)),
  d: [],
});

function modelo(limites = {}) {
  let now = T0;
  let n = 0;
  const model = createWallModel({
    clock: () => now,
    random: () => ((n += 1) * 0.137) % 1,
    limites: {
      puntosPorPared: { ancha: 100, estrecha: 50 },
      puntosPorAutorYDia: 60,
      paredes: 3,
      reportesParaOcultar: 3,
      costeMinimo: 1,
      ...limites,
    },
  });
  return { model, avanzar: (ms) => (now += ms) };
}

const P = '/crew|ancha';

describe('la pared: pintar y ver', () => {
  it('lo que pinta uno lo ve otro, con su firma y en orden', () => {
    const { model } = modelo();
    const ana = model.firmaPara('ana');
    const { id: primero } = model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.pintar({ pared: P, autor: 'berto', trazo: trazo(2, 1) });
    const vista = model.leer({ pared: P, autor: 'berto' });
    expect(vista.strokes.map((s) => s.id)[0]).toBe(primero);
    expect(vista.strokes[0]).toMatchObject({ firma: ana, c: 0 });
    expect(vista.strokes[1]).toMatchObject({ firma: model.firmaPara('berto'), c: 1 });
    expect(vista.strokes[0]).not.toHaveProperty('a');
    expect(vista.firmas).toEqual([
      { firma: ana, mia: false },
      { firma: model.firmaPara('berto'), mia: true },
    ]);
  });

  it('cada autor tiene una firma estable y distinta de las demás', () => {
    const { model } = modelo();
    const firmas = new Set();
    for (let i = 0; i < 40; i += 1) firmas.add(model.firmaPara(`autor-${i}`));
    expect(firmas.size).toBe(40);
    expect(model.firmaPara('autor-3')).toBe(model.firmaPara('autor-3'));
  });

  it('cada cambio sube la versión de esa pared y solo de esa', () => {
    const { model } = modelo();
    const antes = model.leer({ pared: P, autor: 'x' }).version;
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    expect(model.leer({ pared: P, autor: 'x' }).version).toBeGreaterThan(antes);
    expect(model.leer({ pared: '/estudio|ancha', autor: 'x' }).version).toBe(0);
  });

  it('las paredes ancha y estrecha de una página son distintas', () => {
    const { model } = modelo();
    model.pintar({ pared: '/estudio|estrecha', autor: 'ana', trazo: trazo() });
    expect(model.leer({ pared: '/estudio|ancha', autor: 'x' }).strokes).toEqual([]);
    expect(model.leer({ pared: '/estudio|estrecha', autor: 'x' }).strokes).toHaveLength(1);
  });
});

describe('la pared: topes', () => {
  it('con la pared llena se va lo más antiguo', () => {
    const { model } = modelo({ puntosPorAutorYDia: 1000 });
    const ids = [];
    for (let i = 0; i < 6; i += 1) {
      ids.push(model.pintar({ pared: P, autor: `a${i}`, trazo: trazo(20) }).id);
    }
    // 6 × 20 = 120 puntos con tope 100: se va el primero y vuelve a caber (100).
    expect(model.leer({ pared: P, autor: 'x' }).strokes.map((s) => s.id)).toEqual(ids.slice(1));
  });

  it('la pared estrecha tiene la mitad de tope', () => {
    const { model } = modelo({ puntosPorAutorYDia: 1000 });
    for (let i = 0; i < 4; i += 1) {
      model.pintar({ pared: '/crew|estrecha', autor: `a${i}`, trazo: trazo(20) });
    }
    expect(model.leer({ pared: '/crew|estrecha', autor: 'x' }).strokes).toHaveLength(2);
  });

  it('cada autor tiene un tope de pintura por pared y día', () => {
    const { model, avanzar } = modelo();
    model.pintar({ pared: P, autor: 'ana', trazo: trazo(40) });
    expect(() => model.pintar({ pared: P, autor: 'ana', trazo: trazo(30) })).toThrow(
      expect.objectContaining({ status: 429, code: 'WALL_DAILY_LIMIT' })
    );
    // En otra pared sí puede, y al día siguiente también.
    model.pintar({ pared: '/estudio|ancha', autor: 'ana', trazo: trazo(30) });
    avanzar(DIA);
    model.pintar({ pared: P, autor: 'ana', trazo: trazo(30) });
  });

  it('con más paredes del tope se borra la que lleva más tiempo sin pintarse', () => {
    const { model, avanzar } = modelo();
    for (const pagina of ['/a', '/b', '/c']) {
      model.pintar({ pared: `${pagina}|ancha`, autor: 'ana', trazo: trazo() });
      avanzar(1000);
    }
    model.pintar({ pared: '/a|ancha', autor: 'berto', trazo: trazo() });
    avanzar(1000);
    model.pintar({ pared: '/d|ancha', autor: 'ana', trazo: trazo() });
    const paredes = model
      .resumen()
      .map((r) => r.pared)
      .sort();
    expect(paredes).toEqual(['/a|ancha', '/c|ancha', '/d|ancha']);
  });
});

describe('la pared: topes contra abusos (revisión de seguridad)', () => {
  it('las secciones y las páginas legales nunca se desalojan: el tope es de las de producto', () => {
    const { model, avanzar } = modelo();
    model.pintar({ pared: '/crew|ancha', autor: 'ana', trazo: trazo() });
    model.pintar({ pared: '/legal/privacidad|ancha', autor: 'ana', trazo: trazo() });
    avanzar(1000);
    for (let i = 0; i < 6; i += 1) {
      model.pintar({ pared: `/product/x${i}|ancha`, autor: `b${i}`, trazo: trazo() });
      avanzar(1000);
    }
    const paredes = model.resumen().map((r) => r.pared);
    expect(paredes).toEqual(expect.arrayContaining(['/crew|ancha', '/legal/privacidad|ancha']));
    // Solo caben 3 de producto: las más recientes
    expect(paredes.filter((id) => id.startsWith('/product/')).sort()).toEqual([
      '/product/x3|ancha',
      '/product/x4|ancha',
      '/product/x5|ancha',
    ]);
  });

  it('cada trazo cuenta como mínimo 20 puntos en los topes de la pared y del día', () => {
    const { model } = modelo({ costeMinimo: 20, puntosPorAutorYDia: 1000 });
    const ids = [];
    for (let i = 0; i < 6; i += 1) {
      ids.push(model.pintar({ pared: P, autor: `a${i}`, trazo: trazo(1) }).id);
    }
    // 6 trazos de 1 punto cuentan 120 con tope 100: se va el primero.
    expect(model.leer({ pared: P, autor: 'x' }).strokes.map((s) => s.id)).toEqual(ids.slice(1));
    const dia = modelo({ costeMinimo: 20, puntosPorAutorYDia: 60 }).model;
    for (let i = 0; i < 3; i += 1) dia.pintar({ pared: P, autor: 'ana', trazo: trazo(1) });
    expect(() => dia.pintar({ pared: P, autor: 'ana', trazo: trazo(1) })).toThrow(
      expect.objectContaining({ code: 'WALL_DAILY_LIMIT' })
    );
  });

  it('las firmas siempre cumplen el patrón y no se repiten, aunque se gasten las de dos cifras', () => {
    // Un azar que siempre da lo mismo: obliga a buscar hueco.
    const model = createWallModel({ random: () => 0.5, limites: { autores: 5000 } });
    const firmas = new Set();
    for (let i = 0; i < 2000; i += 1) firmas.add(model.firmaPara(`autor-${i}`));
    expect(firmas.size).toBe(2000);
    for (const firma of firmas) expect(firma).toMatch(FIRMA_RE);
  });

  it('con el tope de autores lleno, uno nuevo no puede pintar y los de siempre sí', () => {
    const { model } = modelo({ autores: 2 });
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.pintar({ pared: P, autor: 'berto', trazo: trazo() });
    expect(() => model.pintar({ pared: P, autor: 'carla', trazo: trazo() })).toThrow(
      expect.objectContaining({ status: 503, code: 'WALL_FULL' })
    );
    expect(() => model.pintar({ pared: P, autor: 'ana', trazo: trazo() })).not.toThrow();
  });

  it('los autores sin nada en ninguna pared se olvidan pasado un día y dejan sitio', () => {
    const { model, avanzar } = modelo({ autores: 2 });
    const { id } = model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.pintar({ pared: P, autor: 'berto', trazo: trazo() });
    model.deshacer({ pared: P, autor: 'ana', id });
    avanzar(DIA + 1);
    // Carla cabe porque Ana ya no tiene nada pintado; Berto se queda.
    expect(() => model.pintar({ pared: P, autor: 'carla', trazo: trazo() })).not.toThrow();
    expect(model.firmaExistente('ana')).toBe(null);
    expect(model.firmaExistente('berto')).not.toBe(null);
  });

  it('los reportes desde una misma red cuentan como uno para ocultar', () => {
    const { model } = modelo();
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    const firma = model.firmaPara('ana');
    // Tres sesiones nuevas desde la misma red: no basta.
    for (const reporter of ['r1', 'r2', 'r3']) {
      expect(model.reportar({ pared: P, reporter, cliente: 'red-1', firma })).toEqual({
        oculta: false,
      });
    }
    expect(model.reportar({ pared: P, reporter: 'r4', cliente: 'red-2', firma }).oculta).toBe(
      false
    );
    expect(model.reportar({ pared: P, reporter: 'r5', cliente: 'red-3', firma }).oculta).toBe(true);
  });
});

describe('la pared: cada uno manda en lo suyo', () => {
  it('deshacer quita el trazo propio para todos; el ajeno no', () => {
    const { model } = modelo();
    const { id: deAna } = model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    const { id: deBerto } = model.pintar({ pared: P, autor: 'berto', trazo: trazo() });
    expect(() => model.deshacer({ pared: P, autor: 'ana', id: deBerto })).toThrow(
      expect.objectContaining({ status: 403, code: 'WALL_NOT_YOURS' })
    );
    model.deshacer({ pared: P, autor: 'ana', id: deAna });
    expect(model.leer({ pared: P, autor: 'x' }).strokes.map((s) => s.id)).toEqual([deBerto]);
    expect(() => model.deshacer({ pared: P, autor: 'ana', id: 'no-existe' })).toThrow(
      expect.objectContaining({ status: 404 })
    );
  });

  it('borrar quita todo lo propio de esa pared y nada más', () => {
    const { model } = modelo();
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.pintar({ pared: '/estudio|ancha', autor: 'ana', trazo: trazo() });
    const { id: deBerto } = model.pintar({ pared: P, autor: 'berto', trazo: trazo() });
    model.borrarMios({ pared: P, autor: 'ana' });
    expect(model.leer({ pared: P, autor: 'x' }).strokes.map((s) => s.id)).toEqual([deBerto]);
    expect(model.leer({ pared: '/estudio|ancha', autor: 'x' }).strokes).toHaveLength(1);
  });
});

describe('la pared: reportes', () => {
  it('cada visitante cuenta una vez y con tres distintos se oculta', () => {
    const { model } = modelo();
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    const firma = model.firmaPara('ana');
    expect(model.reportar({ pared: P, reporter: 'r1', firma })).toEqual({ oculta: false });
    expect(model.reportar({ pared: P, reporter: 'r1', firma })).toEqual({ oculta: false });
    expect(model.reportar({ pared: P, reporter: 'r2', firma })).toEqual({ oculta: false });
    expect(model.leer({ pared: P, autor: 'x' }).strokes).toHaveLength(1);
    expect(model.reportar({ pared: P, reporter: 'r3', firma })).toEqual({ oculta: true });
    expect(model.leer({ pared: P, autor: 'x' }).strokes).toEqual([]);
  });

  it('reportarse a uno mismo no cuenta', () => {
    const { model } = modelo({ reportesParaOcultar: 1 });
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.reportar({ pared: P, reporter: 'ana', firma: model.firmaPara('ana') });
    expect(model.leer({ pared: P, autor: 'x' }).strokes).toHaveLength(1);
  });

  it('una firma oculta no puede volver a pintar en esa pared', () => {
    const { model } = modelo({ reportesParaOcultar: 1 });
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.reportar({ pared: P, reporter: 'r1', firma: model.firmaPara('ana') });
    expect(() => model.pintar({ pared: P, autor: 'ana', trazo: trazo() })).toThrow(
      expect.objectContaining({ status: 403, code: 'WALL_HIDDEN_AUTHOR' })
    );
    model.pintar({ pared: '/estudio|ancha', autor: 'ana', trazo: trazo() });
  });

  it('reportar una firma que no está en esa pared es un 404', () => {
    const { model } = modelo();
    expect(() => model.reportar({ pared: P, reporter: 'r1', firma: 'LUNA-7' })).toThrow(
      expect.objectContaining({ status: 404, code: 'WALL_SIGNATURE_NOT_FOUND' })
    );
  });
});

describe('la pared: la limpieza de El Taller', () => {
  it('resume cada pared y detalla firmas, reportes y lo oculto', () => {
    const { model } = modelo({ reportesParaOcultar: 1 });
    model.pintar({ pared: P, autor: 'ana', trazo: trazo(3) });
    model.pintar({ pared: P, autor: 'berto', trazo: trazo(2) });
    model.reportar({ pared: P, reporter: 'r1', firma: model.firmaPara('ana') });
    const [resumen] = model.resumen();
    expect(resumen).toMatchObject({
      pared: P,
      trazos: 2,
      puntos: 5,
      firmas: 2,
      reportes: 1,
      ocultas: 1,
    });
    const detalle = model.detalle(P);
    expect(detalle.strokes).toHaveLength(2);
    expect(detalle.firmas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          firma: model.firmaPara('ana'),
          trazos: 1,
          reportes: 1,
          oculta: true,
        }),
        expect.objectContaining({
          firma: model.firmaPara('berto'),
          trazos: 1,
          reportes: 0,
          oculta: false,
        }),
      ])
    );
  });

  it('oculta, vuelve a mostrar y borra lo de una firma; limpia una pared', () => {
    const { model } = modelo();
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.pintar({ pared: P, autor: 'berto', trazo: trazo() });
    const ana = model.firmaPara('ana');
    model.ocultar(P, ana);
    expect(model.leer({ pared: P, autor: 'x' }).strokes).toHaveLength(1);
    model.mostrar(P, ana);
    expect(model.leer({ pared: P, autor: 'x' }).strokes).toHaveLength(2);
    model.borrarFirma(P, ana);
    expect(model.detalle(P).strokes).toHaveLength(1);
    model.limpiar(P);
    expect(model.leer({ pared: P, autor: 'x' }).strokes).toEqual([]);
    expect(() => model.ocultar(P, 'NADIE-1')).toThrow(expect.objectContaining({ status: 404 }));
  });

  it('el interruptor apaga y enciende', () => {
    const { model } = modelo();
    expect(model.encendida()).toBe(true);
    model.encender(false);
    expect(model.encendida()).toBe(false);
  });
});

describe('la pared: memoria', () => {
  it('se puede volcar y recuperar tal cual, con su sal', () => {
    const { model } = modelo();
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.encender(false);
    const copia = createWallModel({ clock: () => T0, estado: model.snapshot() });
    expect(copia.leer({ pared: P, autor: 'x' })).toEqual(model.leer({ pared: P, autor: 'x' }));
    expect(copia.sal()).toBe(model.sal());
    expect(copia.encendida()).toBe(false);
    expect(copia.firmaPara('ana')).toBe(model.firmaPara('ana'));
  });

  it('avisa de cada cambio para guardarlo', () => {
    const { model } = modelo();
    let cambios = 0;
    model.onChange(() => (cambios += 1));
    model.pintar({ pared: P, autor: 'ana', trazo: trazo() });
    model.leer({ pared: P, autor: 'ana' });
    model.encender(false);
    expect(cambios).toBe(2);
  });
});

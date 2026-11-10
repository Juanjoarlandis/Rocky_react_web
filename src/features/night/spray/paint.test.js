import { describe, expect, it } from 'vitest';
import {
  NOZZLE,
  TAG_LINE,
  TAG_MARGEN,
  atenuar,
  drawStroke,
  drawTag,
  firmaEn,
  manoDe,
  pintadas,
  posicionesDeFirmas,
  strokeBounds,
} from './paint.js';

// Un contexto de mentira que apunta cada llamada: sirve para comparar dos
// repintados sin necesitar un canvas de verdad.
function recorder() {
  const calls = [];
  const ctx = new Proxy(
    { calls },
    {
      get(target, key) {
        if (key === 'calls') return calls;
        return (...args) =>
          calls.push([key, ...args.map((a) => (typeof a === 'number' ? +a.toFixed(3) : a))]);
      },
      set(target, key, value) {
        calls.push([`=${String(key)}`, value]);
        return true;
      },
    }
  );
  return ctx;
}

const stroke = { c: 1, s: 1234, p: [0, 100, 40, 110, 80, 150], d: [[80, 150, 40]] };

describe('El trazo del spray', () => {
  it('repintar una pintada la deja idéntica', () => {
    const a = recorder();
    const b = recorder();
    drawStroke(a, stroke, 500, [null, null], ['#aaa', '#bbb']);
    drawStroke(b, stroke, 500, [null, null], ['#aaa', '#bbb']);
    expect(a.calls).toEqual(b.calls);
    expect(a.calls.length).toBeGreaterThan(20);
  });

  it('otra semilla, otras motas', () => {
    const a = recorder();
    const b = recorder();
    drawStroke(a, stroke, 500, [null, null], ['#aaa', '#bbb']);
    drawStroke(b, { ...stroke, s: 99 }, 500, [null, null], ['#aaa', '#bbb']);
    expect(a.calls).not.toEqual(b.calls);
  });

  it('la caja incluye el chorro y los chorretones', () => {
    const box = strokeBounds(stroke, 500);
    expect(box.minX).toBeCloseTo(500 - NOZZLE * 2.4);
    expect(box.maxX).toBeCloseTo(580 + NOZZLE * 2.4);
    expect(box.maxY).toBeCloseTo(150 + 40 + 4 + NOZZLE * 2.4);
  });
});

describe('Las firmas de la pared compartida', () => {
  const de = (firma, p, c = 0) => ({ c, s: 1, p, d: [], firma });
  const de_ = (sitios, firma) => sitios.filter((sitio) => sitio.firma === firma);

  it('la misma firma en dos sitios lleva su firma junto a cada pintada, no entre las dos', () => {
    const strokes = [
      de('LUNA-7', [-600, 100, -560, 120]),
      de('TELE-2', [0, 50]),
      de('LUNA-7', [560, 300, 600, 320], 2),
    ];
    const sitios = posicionesDeFirmas(strokes, 720, 1440);
    const lunas = de_(sitios, 'LUNA-7');
    expect(lunas).toHaveLength(2);
    const izquierda = strokeBounds(strokes[0], 720);
    const derecha = strokeBounds(strokes[2], 720);
    // Cada una acaba en el borde derecho de su pintada, por debajo de ella
    expect(lunas[0].x).toBeCloseTo(izquierda.maxX - NOZZLE, 5);
    expect(lunas[0].y).toBeCloseTo(izquierda.maxY - NOZZLE, 5);
    expect(lunas[1].x).toBeCloseTo(derecha.maxX - NOZZLE, 5);
    expect(lunas[1].y).toBeCloseTo(derecha.maxY - NOZZLE, 5);
    // El color, el del último trazo de cada pintada
    expect(lunas.map((sitio) => sitio.c)).toEqual([0, 2]);
    // Y en el orden en que se pintó cada una
    expect(sitios.map((sitio) => sitio.firma)).toEqual(['LUNA-7', 'TELE-2', 'LUNA-7']);
  });

  it('varios trazos juntos de una firma son una sola pintada con una sola firma', () => {
    const strokes = [
      de('LUNA-7', [0, 100, 40, 120]),
      de('LUNA-7', [10, 110, 60, 140], 1),
      de('LUNA-7', [-20, 90, 20, 100], 2),
    ];
    const sitios = posicionesDeFirmas(strokes, 500, 1440);
    expect(sitios).toHaveLength(1);
    const caja = strokeBounds({ p: [0, 100, 40, 120, 10, 110, 60, 140, -20, 90, 20, 100] }, 500);
    expect(sitios[0].x).toBeCloseTo(caja.maxX - NOZZLE, 5);
    expect(sitios[0].y).toBeCloseTo(caja.maxY - NOZZLE, 5);
    expect(sitios[0].c).toBe(2);
    expect(pintadas(strokes, 500)).toHaveLength(1);
  });

  it('un trazo que une dos pintadas de la misma firma las funde en una', () => {
    const strokes = [
      de('LUNA-7', [0, 100]),
      de('LUNA-7', [200, 100]),
      de('LUNA-7', [0, 100, 100, 100, 200, 100]),
    ];
    expect(pintadas(strokes.slice(0, 2), 500)).toHaveLength(2);
    expect(pintadas(strokes, 500)).toHaveLength(1);
  });

  it('la firma crece hacia dentro: acaba en el borde derecho de la pintada y cabe debajo de ella', () => {
    const trazo = de('LUNA-7', [0, 100, 40, 120]);
    const caja = strokeBounds(trazo, 500);
    const [sitio] = posicionesDeFirmas([trazo], 500, 1440);
    expect(sitio.ancho).toBeGreaterThan(0);
    expect(sitio.x).toBeLessThanOrEqual(caja.maxX);
    // Todo el texto queda bajo lo pintado, no a su derecha
    expect(sitio.x - sitio.ancho).toBeGreaterThanOrEqual(caja.minX);
  });

  it('retocar una pintada la pone la última: el orden es el del último trazo', () => {
    const strokes = [
      de('LUNA-7', [0, 100, 40, 120]),
      de('TELE-2', [-400, 100]),
      de('LUNA-7', [10, 110], 2),
    ];
    expect(pintadas(strokes, 500).map((p) => p.firma)).toEqual(['TELE-2', 'LUNA-7']);
    expect(posicionesDeFirmas(strokes, 500, 1440).map((sitio) => sitio.firma)).toEqual([
      'TELE-2',
      'LUNA-7',
    ]);
  });

  it('dos trazos que no se tocan pero quedan cerca son la misma pintada; lejos, dos', () => {
    // Cada punto lleva 31 px de aire: a 100 px sus cajas quedan a 38 px (< 48)
    expect(pintadas([de('LUNA-7', [0, 100]), de('LUNA-7', [100, 100])], 500)).toHaveLength(1);
    // A 130 px quedan a 68 px: ya son dos pintadas
    expect(pintadas([de('LUNA-7', [0, 100]), de('LUNA-7', [130, 100])], 500)).toHaveLength(2);
  });

  it('la línea de firma deja sitio al remate, para que dos apiladas no se monten', () => {
    // 15 px de letra y el remate hasta 23 px por debajo de la línea
    expect(TAG_LINE).toBeGreaterThanOrEqual(24);
  });

  it('el remate que va delante del texto (la estrella) tampoco se sale por la izquierda', () => {
    const firmas = Array.from({ length: 80 }, (_, i) => `TAG-${i}`);
    const conEstrella = firmas.filter((firma) => manoDe(firma).remate === 2);
    expect(conEstrella.length).toBeGreaterThan(0);
    for (const firma of conEstrella) {
      const [sitio] = posicionesDeFirmas([de(firma, [-715, 400])], 720, 1440);
      const ctx = recorder();
      drawTag(ctx, firma, sitio.x, sitio.y, '#fff', 'Fuente');
      const xs = ctx.calls
        .filter(([n]) => ['moveTo', 'lineTo'].includes(n))
        .map(([, x]) => sitio.x + x);
      // Con el giro (≤ 8°) apenas se mueve en horizontal: un par de píxeles de holgura
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(TAG_MARGEN - 2);
    }
  });

  it('una pintada pegada al borde derecho deja la firma entera dentro de la página', () => {
    const [sitio] = posicionesDeFirmas([de('CURIOSO-76', [700, 400])], 720, 1440);
    expect(sitio.x).toBeLessThanOrEqual(1440 - TAG_MARGEN);
    expect(sitio.x - sitio.ancho).toBeGreaterThanOrEqual(TAG_MARGEN);
  });

  it('una pintada pegada al borde izquierdo deja la firma entera dentro de la página', () => {
    const [sitio] = posicionesDeFirmas([de('CURIOSO-76', [-710, 400])], 720, 1440);
    expect(sitio.x - sitio.ancho).toBeGreaterThanOrEqual(TAG_MARGEN);
    expect(sitio.x).toBeLessThanOrEqual(1440 - TAG_MARGEN);
  });

  it('dos firmas que caerían en el mismo sitio no se pisan: la segunda baja una línea', () => {
    const strokes = [
      de('LUNA-7', [0, 100, 40, 120]),
      de('TELE-2', [0, 100, 40, 120]),
      de('BOMBO-3', [10, 104, 46, 124]),
    ];
    const sitios = posicionesDeFirmas(strokes, 500, 1440);
    const [luna, tele, bombo] = ['LUNA-7', 'TELE-2', 'BOMBO-3'].map((f) => de_(sitios, f)[0]);
    expect(tele.x).toBe(luna.x);
    expect(tele.y).toBe(luna.y + TAG_LINE);
    // La tercera, que solaparía con las dos, baja por debajo de ambas
    expect(bombo.y).toBeGreaterThanOrEqual(tele.y + TAG_LINE);
  });

  it('con cientos de pintadas apiladas no se cuelga: rotula las 150 últimas y bajan como mucho 8 líneas', () => {
    const strokes = Array.from({ length: 2000 }, (_, i) => de(`TAG-${i}`, [0, 100, 40, 120]));
    const inicio = performance.now();
    const sitios = posicionesDeFirmas(strokes, 500, 1440);
    expect(performance.now() - inicio).toBeLessThan(250);
    expect(sitios).toHaveLength(150);
    const firmas = new Set(sitios.map((sitio) => sitio.firma));
    expect(firmas.has('TAG-1999')).toBe(true);
    expect(firmas.has('TAG-0')).toBe(false);
    const ys = sitios.map((sitio) => sitio.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(8 * TAG_LINE);
  });

  it('una firma que pinta cientos de trazos sueltos tampoco cuelga la página', () => {
    const strokes = Array.from({ length: 600 }, (_, i) =>
      de('LUNA-7', [((i % 30) - 15) * 200, Math.floor(i / 30) * 200])
    );
    const inicio = performance.now();
    const sitios = posicionesDeFirmas(strokes, 3000, 6000);
    expect(performance.now() - inicio).toBeLessThan(250);
    expect(sitios).toHaveLength(150);
  });

  it('las firmas que no se tocan se quedan donde acaba su pintada', () => {
    const strokes = [de('LUNA-7', [0, 100, 40, 120]), de('TELE-2', [-300, 100, -260, 120])];
    const sitios = posicionesDeFirmas(strokes, 500, 1440);
    expect(de_(sitios, 'LUNA-7')[0].y).toBe(de_(sitios, 'TELE-2')[0].y);
  });

  it('señalar un punto encuentra la firma cuya pintada lo cubre', () => {
    const strokes = [de('LUNA-7', [0, 100, 40, 120]), de('TELE-2', [-200, 50])];
    expect(firmaEn(strokes, 500, { x: 520, y: 110 })).toBe('LUNA-7');
    expect(firmaEn(strokes, 500, { x: 300, y: 50 })).toBe('TELE-2');
    expect(firmaEn(strokes, 500, { x: 900, y: 900 })).toBe(null);
  });

  it('el hueco entre dos pintadas de la misma firma no señala a nadie', () => {
    const strokes = [de('LUNA-7', [-600, 100]), de('LUNA-7', [600, 100])];
    expect(firmaEn(strokes, 720, { x: 720, y: 100 })).toBe(null);
    expect(firmaEn(strokes, 720, { x: 120, y: 100 })).toBe('LUNA-7');
    expect(firmaEn(strokes, 720, { x: 1320, y: 100 })).toBe('LUNA-7');
  });

  it('si dos pintadas cubren el punto, gana la más reciente', () => {
    const strokes = [de('LUNA-7', [0, 100]), de('TELE-2', [5, 100])];
    expect(firmaEn(strokes, 500, { x: 502, y: 100 })).toBe('TELE-2');
  });
});

describe('La mano de cada firma', () => {
  const GRADO = Math.PI / 180;

  it('la misma firma tiene siempre la misma mano', () => {
    expect(manoDe('LUNA-7')).toEqual(manoDe('LUNA-7'));
    expect(manoDe('CURIOSO-76')).toEqual(manoDe('CURIOSO-76'));
  });

  it('la inclinación no vuelca el texto: como mucho 8 grados, y el remate es uno de los tres', () => {
    for (let i = 0; i < 400; i += 1) {
      const { giro, remate } = manoDe(`FIRMA-${i}`);
      expect(Math.abs(giro)).toBeLessThanOrEqual(8 * GRADO + 1e-9);
      expect([0, 1, 2]).toContain(remate);
    }
  });

  it('no todas las firmas llevan la misma mano', () => {
    const manos = Array.from({ length: 60 }, (_, i) => manoDe(`TAG-${i}`));
    expect(new Set(manos.map((mano) => mano.remate)).size).toBe(3);
    expect(new Set(manos.map((mano) => mano.giro.toFixed(3))).size).toBeGreaterThan(5);
  });

  it('la firma se escribe con el color de su autor, inclinada desde su borde derecho y con remate', () => {
    const ctx = recorder();
    drawTag(ctx, 'LUNA-7', 100, 50, '#c4ff00', 'Fuente');
    const de = (nombre) => ctx.calls.filter(([n]) => n === nombre);
    // El ancla es el borde derecho: ahí se traslada y gira, y el texto acaba en 0
    expect(de('translate')).toEqual([['translate', 100, 50]]);
    expect(de('rotate')).toEqual([['rotate', +manoDe('LUNA-7').giro.toFixed(3)]]);
    expect(de('fillText')).toEqual([['fillText', 'LUNA-7', 0, 0]]);
    expect(ctx.calls).toContainEqual(['=textAlign', 'right']);
    expect(ctx.calls).toContainEqual(['=fillStyle', '#c4ff00']);
    expect(ctx.calls).toContainEqual(['=strokeStyle', '#c4ff00']);
    // El remate es un trazo o una figura rellena, además del texto
    expect(de('stroke').length + de('fill').length).toBeGreaterThanOrEqual(1);
    // Y deja el lienzo como estaba
    expect(de('save')).toHaveLength(de('restore').length);
    const orden = ctx.calls.map(([n]) => n);
    expect(orden.indexOf('save')).toBeLessThan(orden.indexOf('translate'));
    expect(orden.lastIndexOf('restore')).toBe(orden.length - 1);
  });

  it('los remates se ajustan al ancho de verdad del texto, no al estimado', () => {
    // Un lienzo que mide: 40 px para cualquier texto
    const calls = [];
    const ctx = new Proxy(
      {},
      {
        get: (_, key) =>
          key === 'measureText'
            ? () => ({ width: 40 })
            : (...args) => {
                calls.push([key, ...args]);
              },
        set: () => true,
      }
    );
    const firma = Array.from({ length: 80 }, (_, i) => `TAG-${i}`).find(
      (candidata) => manoDe(candidata).remate === 1
    );
    drawTag(ctx, firma, 0, 0, '#fff', 'Fuente');
    const xs = calls.filter(([n]) => ['moveTo', 'lineTo'].includes(n)).map(([, x]) => x);
    // La flecha arranca donde empieza el texto medido (−40), no en el estimado (−54 o más)
    expect(Math.min(...xs)).toBe(-40);
  });

  it('cada remate se dibuja sin salirse por la derecha del ancla más de unos píxeles', () => {
    for (const firma of ['TAG-1', 'TAG-2', 'TAG-3', 'TAG-4', 'TAG-5', 'TAG-6']) {
      const ctx = recorder();
      drawTag(ctx, firma, 0, 0, '#fff', 'Fuente');
      const xs = ctx.calls.filter(([n]) => ['moveTo', 'lineTo'].includes(n)).map(([, x]) => x);
      expect(Math.max(0, ...xs)).toBeLessThanOrEqual(8);
    }
  });
});

describe('Destacar lo de una firma', () => {
  it('atenuar baja la opacidad de todo lo pintado sin borrarlo y deja el lienzo como estaba', () => {
    const ctx = recorder();
    atenuar(ctx, 1440, 3000);
    expect(ctx.calls).toContainEqual(['=globalCompositeOperation', 'destination-out']);
    expect(ctx.calls).toContainEqual(['fillRect', 0, 0, 1440, 3000]);
    const alfa = ctx.calls.find(([n]) => n === '=globalAlpha')[1];
    expect(alfa).toBeGreaterThan(0.5);
    expect(alfa).toBeLessThan(1);
    const orden = ctx.calls.map(([n]) => n);
    expect(orden[0]).toBe('save');
    expect(orden.at(-1)).toBe('restore');
  });
});

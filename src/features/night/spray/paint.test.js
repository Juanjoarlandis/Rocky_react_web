import { describe, expect, it } from 'vitest';
import {
  NOZZLE,
  TAG_LINE,
  drawStroke,
  drawTag,
  firmaEn,
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

  it('cada firma va abajo a la derecha de la caja de todo lo suyo', () => {
    const strokes = [
      de('LUNA-7', [0, 100, 40, 120]),
      de('TELE-2', [-200, 50]),
      de('LUNA-7', [60, 300], 2),
    ];
    const sitios = posicionesDeFirmas(strokes, 500);
    const luna = sitios.get('LUNA-7');
    const caja = strokeBounds({ p: [0, 100, 40, 120, 60, 300] }, 500);
    expect(luna.x).toBeCloseTo(caja.maxX - NOZZLE, 5);
    expect(luna.y).toBeCloseTo(caja.maxY - NOZZLE, 5);
    // El color, el de su último trazo
    expect(luna.c).toBe(2);
    // En el orden de su último trazo: LUNA-7 volvió a pintar después de TELE-2.
    expect([...sitios.keys()]).toEqual(['TELE-2', 'LUNA-7']);
  });

  it('dos firmas que caerían en el mismo sitio no se pisan: la segunda baja una línea', () => {
    const strokes = [
      de('LUNA-7', [0, 100, 40, 120]),
      de('TELE-2', [0, 100, 40, 120]),
      de('BOMBO-3', [10, 104, 46, 124]),
    ];
    const sitios = posicionesDeFirmas(strokes, 500);
    const [luna, tele, bombo] = ['LUNA-7', 'TELE-2', 'BOMBO-3'].map((f) => sitios.get(f));
    expect(tele.x).toBe(luna.x);
    expect(tele.y).toBe(luna.y + TAG_LINE);
    // La tercera, que solaparía con las dos, baja por debajo de ambas
    expect(bombo.y).toBeGreaterThanOrEqual(tele.y + TAG_LINE);
  });

  it('con cientos de firmas apiladas no se cuelga: pinta las 150 últimas y bajan como mucho 8 líneas', () => {
    const strokes = Array.from({ length: 2000 }, (_, i) => de(`TAG-${i}`, [0, 100, 40, 120]));
    const inicio = performance.now();
    const sitios = posicionesDeFirmas(strokes, 500);
    expect(performance.now() - inicio).toBeLessThan(250);
    expect(sitios.size).toBe(150);
    expect(sitios.has('TAG-1999')).toBe(true);
    expect(sitios.has('TAG-0')).toBe(false);
    const ys = [...sitios.values()].map((sitio) => sitio.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(8 * TAG_LINE);
  });

  it('las firmas que no se tocan se quedan donde acaba su pintada', () => {
    const strokes = [de('LUNA-7', [0, 100, 40, 120]), de('TELE-2', [-300, 100, -260, 120])];
    const sitios = posicionesDeFirmas(strokes, 500);
    expect(sitios.get('LUNA-7').y).toBe(sitios.get('TELE-2').y);
  });

  it('señalar un punto encuentra la firma cuya pintada lo cubre', () => {
    const strokes = [de('LUNA-7', [0, 100, 40, 120]), de('TELE-2', [-200, 50])];
    expect(firmaEn(strokes, 500, { x: 520, y: 110 })).toBe('LUNA-7');
    expect(firmaEn(strokes, 500, { x: 300, y: 50 })).toBe('TELE-2');
    expect(firmaEn(strokes, 500, { x: 900, y: 900 })).toBe(null);
  });

  it('la firma se pinta como texto con el color de su autor', () => {
    const ctx = recorder();
    drawTag(ctx, 'LUNA-7', 10, 20, '#c4ff00', 'Fuente');
    const llamadas = ctx.calls.map(([nombre]) => nombre);
    expect(llamadas).toContain('fillText');
    expect(ctx.calls.find(([n]) => n === 'fillText')).toEqual(['fillText', 'LUNA-7', 10, 20]);
    expect(ctx.calls).toContainEqual(['=fillStyle', '#c4ff00']);
  });
});

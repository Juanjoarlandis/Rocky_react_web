import { describe, expect, it } from 'vitest';
import { NOZZLE, drawStroke, strokeBounds } from './paint.js';

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

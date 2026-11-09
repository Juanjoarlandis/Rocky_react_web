import { describe, expect, it } from 'vitest';
import { scribblePasses, scribblePath } from './scribble.js';

// Móviles en vertical y en horizontal, tablet, portátil, sobremesa y ultrapanorámico.
const SIZES = [
  [320, 568],
  [390, 844],
  [1080, 2400],
  [844, 390],
  [768, 1024],
  [1280, 800],
  [1920, 1080],
  [3440, 1440],
];

// Altura de una pasada (curva cuadrática, monótona en x) a la altura de una x de pantalla.
function yAt(pass, x) {
  const bx = (t) =>
    (1 - t) ** 2 * pass.from[0] + 2 * (1 - t) * t * pass.control[0] + t * t * pass.to[0];
  const increasing = pass.to[0] > pass.from[0];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (bx(mid) < x === increasing) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return (1 - t) ** 2 * pass.from[1] + 2 * (1 - t) * t * pass.control[1] + t * t * pass.to[1];
}

describe('El garabato de rotulador', () => {
  it.each(SIZES)('a %i × %i tapa toda la pantalla sin huecos', (width, height) => {
    const { strokeWidth, passes } = scribblePasses(width, height);
    const half = strokeWidth / 2;
    const step = Math.max(4, width / 160);
    let worstGap = 0;
    for (let x = 0; x <= width; x += step) {
      expect(yAt(passes[0], x) - half).toBeLessThanOrEqual(0);
      expect(yAt(passes.at(-1), x) + half).toBeGreaterThanOrEqual(height);
      for (let i = 1; i < passes.length; i += 1) {
        worstGap = Math.max(worstGap, Math.abs(yAt(passes[i], x) - yAt(passes[i - 1], x)));
      }
    }
    // Entre dos pasadas seguidas no queda nunca una franja sin tinta.
    expect(worstGap).toBeLessThan(strokeWidth * 0.95);
  });

  it.each(SIZES)('a %i × %i los giros quedan fuera de la pantalla', (width, height) => {
    const { strokeWidth, passes } = scribblePasses(width, height);
    passes.forEach(({ from, to }) => {
      [from[0], to[0]].forEach((x) => {
        expect(x <= -strokeWidth / 2 || x >= width + strokeWidth / 2).toBe(true);
      });
    });
  });

  it.each([
    [390, 844],
    [320, 568],
    [844, 390],
    [568, 320],
    [600, 300],
    [1280, 300],
    [800, 250],
    [1920, 1080],
    [1080, 2400],
  ])('a %i × %i el trazo es de rotulador, no un telón (≤ 40 % del lado corto)', (width, height) => {
    const { strokeWidth } = scribblePasses(width, height);
    expect(strokeWidth).toBeLessThanOrEqual(Math.min(width, height) * 0.4);
  });

  it('en pantallas grandes conserva el grosor de siempre', () => {
    expect(scribblePasses(1280, 800).strokeWidth).toBeCloseTo((800 / 6) * 1.8);
  });

  it('las pasadas van de ida y vuelta y bajan', () => {
    const { passes } = scribblePasses(390, 844);
    expect(passes.length).toBeGreaterThanOrEqual(5);
    passes.forEach((pass, i) => {
      expect(pass.to[1]).toBeGreaterThan(pass.from[1]);
      if (i > 0)
        expect(Math.sign(pass.to[0] - pass.from[0])).not.toBe(
          Math.sign(passes[i - 1].to[0] - passes[i - 1].from[0])
        );
    });
  });

  it('se dibuja como un único trazo con todas las pasadas en orden', () => {
    const { d, strokeWidth } = scribblePath(390, 844);
    const { passes } = scribblePasses(390, 844);
    expect(d).toMatch(/^M/);
    expect(d.match(/Q/g)).toHaveLength(passes.length);
    // scribblePath redondea el grosor a una décima.
    expect(strokeWidth).toBeCloseTo(scribblePasses(390, 844).strokeWidth, 1);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('con un tamaño imposible usa uno mínimo en vez de romperse', () => {
    const { d, width, height } = scribblePath(0, Number.NaN);
    expect(d).toMatch(/^M/);
    expect(d).not.toMatch(/NaN|Infinity/);
    // ModeStroke pone este tamaño en el viewBox: nunca 0 × 0.
    expect([width, height]).toEqual([1, 1]);
  });
});

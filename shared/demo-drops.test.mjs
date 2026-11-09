import { describe, expect, it } from 'vitest';
import { createDemoDrops } from './demo-drops.mjs';
import { DROP_STATES } from './drops.mjs';

const NOW = new Date('2026-11-09T12:00:00Z');
const products = [
  { handle: 'rocky-35-red', dropHandle: 'rocky-drop-4', availableForSale: false },
  { handle: 'rocky-danger', dropHandle: 'rocky-drop-4', availableForSale: false },
  { handle: 'rocky-airwave', dropHandle: 'colmena-signal', availableForSale: false },
  { handle: 'rocky-night-runner', dropHandle: 'asphalt-afterdark', availableForSale: false },
  { handle: 'suelta', dropHandle: 'tienda', availableForSale: false },
];

describe('drops de demostración', () => {
  it('cubre anunciado, en la calle y archivo, en el orden del muro', () => {
    const { drops } = createDemoDrops({ products, now: NOW });
    expect(drops.map((d) => [d.handle, d.state])).toEqual([
      ['rocky-drop-4', DROP_STATES.ANNOUNCED],
      ['colmena-signal', DROP_STATES.LIVE],
      ['asphalt-afterdark', DROP_STATES.ARCHIVE],
    ]);
  });

  it('el anunciado es el destacado y no enseña sus diseños', () => {
    const { featured, drops } = createDemoDrops({ products, now: NOW });
    expect(featured.handle).toBe('rocky-drop-4');
    expect(drops[0]).toMatchObject({ designCount: 2, designs: null });
  });

  it('cuenta las fechas desde ahora y devuelve la hora de referencia', () => {
    const { now, drops } = createDemoDrops({ products, now: NOW });
    expect(now).toBe(NOW.toISOString());
    expect(Date.parse(drops[0].launchAt)).toBeGreaterThan(NOW.getTime());
    expect(Date.parse(drops[2].endsAt)).toBeLessThan(NOW.getTime());
  });

  it('los conceptos de la calle no inventan agotados', () => {
    const { drops } = createDemoDrops({ products, now: NOW });
    expect(drops[1]).toMatchObject({ designs: ['rocky-airwave'], soldOut: false });
  });
});

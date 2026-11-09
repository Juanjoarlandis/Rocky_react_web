import { describe, expect, it } from 'vitest';
import { isTornFlipped } from './tornVariant.js';

describe('Variante del desgarro de un agotado', () => {
  it('depende solo del producto: el mismo producto siempre igual', () => {
    expect(isTornFlipped('rocky-marea-035')).toBe(isTornFlipped('rocky-marea-035'));
  });

  it('una parrilla de agotados mezcla las dos variantes', () => {
    const handles = [
      'rocky-airwave',
      'rocky-marea-035',
      'rocky-night-runner',
      'rocky-solar-club',
      'rocky-signal-ghost',
      'rocky-pit-crew',
      'rocky-racing',
      'rockydz-boyz',
    ];
    const variantes = new Set(handles.map(isTornFlipped));
    expect(variantes).toEqual(new Set([true, false]));
  });

  it('acepta claves vacías sin romperse', () => {
    expect(typeof isTornFlipped('')).toBe('boolean');
    expect(typeof isTornFlipped(undefined)).toBe('boolean');
  });
});

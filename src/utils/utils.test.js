import { afterEach, describe, expect, it, vi } from 'vitest';
import { between, clamp } from './math.js';
import { matches, prefersReducedMotion } from './media.js';
import { readJson, readStorage, writeJson, writeStorage } from './storage.js';
import { errorMessage } from './errors.js';
import { formatTime } from './time.js';

describe('utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('clamp y between se quedan dentro del rango', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(between([10, 20])).toBe(15);
  });

  it('matches responde false con el matchMedia de pruebas y no revienta', () => {
    expect(matches('(min-width: 1px)')).toBe(false);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('el almacenamiento falla en silencio y el JSON corrupto vuelve al valor por defecto', () => {
    expect(writeStorage('rocky-test', '1')).toBe(true);
    expect(readStorage('rocky-test')).toBe('1');
    localStorage.setItem('rocky-json', '{roto');
    expect(readJson('rocky-json', [])).toEqual([]);
    expect(writeJson('rocky-json', { a: 1 })).toBe(true);
    expect(readJson('rocky-json')).toEqual({ a: 1 });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(writeStorage('rocky-test', '2')).toBe(false);
  });

  it('errorMessage y formatTime', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('boom', 'reserva')).toBe('reserva');
    expect(formatTime(83)).toBe('1:23');
    expect(formatTime(NaN)).toBe('0:00');
  });
});

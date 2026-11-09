import { describe, expect, it } from 'vitest';
import { parseArgs, UsageError } from './enviar-avisos.mjs';

describe('npm run avisos:enviar', () => {
  it('envía por drop con --drop', () => {
    expect(parseArgs(['--drop', 'rocky-drop-6', '--apply'])).toMatchObject({
      drop: 'rocky-drop-6',
      handle: null,
      apply: true,
    });
  });

  it('por defecto es simulacro', () => {
    expect(parseArgs(['--drop', 'rocky-drop-6']).apply).toBe(false);
  });

  it('sigue enviando por producto', () => {
    expect(parseArgs(['35-red', '--titulo', '35 RED'])).toMatchObject({
      handle: '35-red',
      titulo: '35 RED',
      drop: null,
    });
  });

  it.each([
    [['--drop', 'frontpage'], /handle del drop/],
    [['--drop', 'rocky-drop-6', '35-red'], /no los dos/],
    [[], /a quién avisar/],
    [['--nada'], /desconocida/],
  ])('rechaza %j', (argv, mensaje) => {
    expect(() => parseArgs(argv)).toThrow(UsageError);
    expect(() => parseArgs(argv)).toThrow(mensaje);
  });
});

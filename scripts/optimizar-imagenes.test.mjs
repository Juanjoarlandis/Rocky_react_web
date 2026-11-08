import { describe, expect, it } from 'vitest';
import { parseArgs, planTargets } from './optimizar-imagenes.mjs';

describe('opciones de optimización de imágenes', () => {
  it.each([
    ['--width'],
    ['--source'],
    ['--quality', '--dry-run'],
    ['--width', '600px'],
    ['--width', '0'],
    ['--width', '-2'],
    ['--quality', '101'],
    ['--quality', 'NaN'],
  ])('rechaza argumentos inválidos antes de escribir: %j', (...args) => {
    expect(() => parseArgs(args)).toThrow();
  });

  it('acepta exportación sin pérdida y anchos explícitos', () => {
    expect(parseArgs(['--width', '1200', '--lossless', '--dry-run'])).toMatchObject({
      width: 1200,
      lossless: true,
      dryRun: true,
    });
  });
});

describe('dimensiones de personajes', () => {
  const master = { stem: 'grafitero-spray', relativeDirectory: 'characters' };

  it('interpreta el tamaño por defecto del personaje como altura', () => {
    expect(planTargets('/output', master, [], null)).toEqual([
      { file: '/output/characters/grafitero-spray-600.webp', height: 600 },
    ]);
  });

  it('preserva las dimensiones existentes y el maestro HD sin confiar en el sufijo', () => {
    const existing = [
      {
        file: '/output/characters/grafitero-spray-600.webp',
        preserveDimensions: true,
        original: false,
      },
      {
        file: '/output/characters/grafitero-spray-hd.webp',
        preserveDimensions: false,
        original: true,
      },
    ];
    expect(planTargets('/output', master, existing, null)).toEqual(existing);
  });

  it('un ancho explícito no sobrescribe una salida histórica nombrada por altura', () => {
    expect(planTargets('/output', master, [], 600)).toEqual([
      { file: '/output/characters/grafitero-spray-w600.webp', width: 600 },
    ]);
  });
});

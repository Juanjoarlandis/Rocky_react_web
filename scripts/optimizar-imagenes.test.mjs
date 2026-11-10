import { describe, expect, it, vi } from 'vitest';
import { encodeTarget, parseArgs, planTargets } from './optimizar-imagenes.mjs';

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

describe('varias medidas en una pasada', () => {
  it.each([
    ['--widths', '320,640,x'],
    ['--widths', '0,320'],
    ['--widths', ''],
    ['--heights', '320,9000'],
    ['--widths', '320', '--heights', '320'],
    ['--widths', '320', '--width', '600'],
  ])('rechaza listas de medidas inválidas o incompatibles: %j', (...args) => {
    expect(() => parseArgs(args)).toThrow();
  });

  it('acepta listas de anchos y de altos, ordenadas y sin repetidos', () => {
    expect(parseArgs(['--widths', '1280,320,640,320']).widths).toEqual([320, 640, 1280]);
    expect(parseArgs(['--heights', '640,320']).heights).toEqual([320, 640]);
  });

  it('planifica una foto por ancho: la mayor conserva el nombre y las demás llevan sufijo', () => {
    const master = { stem: 'rocky35-camel', relativeDirectory: '', width: 5906 };

    expect(
      planTargets('/repo/public/products', master, [], null, { widths: [320, 640, 1280] })
    ).toEqual([
      { file: '/repo/public/products/rocky35-camel.webp', width: 1280 },
      { file: '/repo/public/products/rocky35-camel-640.webp', width: 640 },
      { file: '/repo/public/products/rocky35-camel-320.webp', width: 320 },
    ]);
  });

  it('no planifica ninguna salida más ancha que el maestro', () => {
    const master = { stem: 'rocky-racing', relativeDirectory: '', width: 850 };

    expect(planTargets('/out', master, [], null, { widths: [320, 640, 1280] })).toEqual([
      { file: '/out/rocky-racing.webp', width: 850 },
      { file: '/out/rocky-racing-640.webp', width: 640 },
      { file: '/out/rocky-racing-320.webp', width: 320 },
    ]);
    expect(
      planTargets('/out', { ...master, width: 300 }, [], null, { widths: [320, 640, 1280] })
    ).toEqual([{ file: '/out/rocky-racing.webp', width: 300 }]);
  });

  it('las medidas pedidas mandan sobre las salidas que ya existen', () => {
    const master = { stem: 'rocky-racing', relativeDirectory: '', width: 850 };
    const existing = [
      { file: '/out/rocky-racing.webp', preserveDimensions: true, original: false },
    ];

    expect(planTargets('/out', master, existing, null, { widths: [320] })).toEqual([
      { file: '/out/rocky-racing.webp', width: 320 },
    ]);
  });

  it('copia tal cual un WebP que ya mide lo pedido, en vez de comprimirlo otra vez', () => {
    const master = {
      stem: 'rocky-racing',
      relativeDirectory: '',
      width: 850,
      absolutePath: '/m/rocky-racing.webp',
    };

    expect(planTargets('/out', master, [], null, { widths: [320, 1280] })).toEqual([
      { file: '/out/rocky-racing.webp', width: 850, copy: true },
      { file: '/out/rocky-racing-320.webp', width: 320 },
    ]);
    expect(
      planTargets('/out', { ...master, absolutePath: '/m/rocky-racing.png' }, [], null, {
        widths: [1280],
      })
    ).toEqual([{ file: '/out/rocky-racing.webp', width: 850 }]);
  });

  it('planifica una ilustración por alto, con el alto en el nombre', () => {
    const master = { stem: 'skater-ollie', relativeDirectory: 'characters', width: 912 };

    expect(planTargets('/out', master, [], null, { heights: [320, 640] })).toEqual([
      { file: '/out/characters/skater-ollie-h320.webp', height: 320 },
      { file: '/out/characters/skater-ollie-h640.webp', height: 640 },
    ]);
  });
});

describe('codificación de una salida', () => {
  function fakeSharp() {
    const calls = [];
    const pipeline = {
      resize: vi.fn((options) => {
        calls.push(['resize', options]);
        return pipeline;
      }),
      webp: vi.fn((options) => {
        calls.push(['webp', options]);
        return pipeline;
      }),
      toFile: vi.fn(async (file) => {
        calls.push(['toFile', file]);
      }),
    };
    const sharp = vi.fn((input, options) => {
      calls.push(['open', input, options]);
      return pipeline;
    });
    return { sharp, calls };
  }

  it('abre el maestro con todos sus fotogramas para no congelar una animación', async () => {
    const { sharp, calls } = fakeSharp();

    await encodeTarget(
      sharp,
      { absolutePath: '/m/lata-paseo.webp' },
      { file: '/out/lata-paseo-h112.webp', height: 112 },
      { quality: 82, lossless: false }
    );

    expect(calls).toEqual([
      ['open', '/m/lata-paseo.webp', { animated: true }],
      ['resize', { width: undefined, height: 112, fit: 'inside', withoutEnlargement: true }],
      ['webp', { quality: 82, lossless: false, effort: 6 }],
      ['toFile', '/out/lata-paseo-h112.webp'],
    ]);
  });

  it('no redimensiona cuando la salida es del tamaño del maestro y respeta el modo sin pérdida', async () => {
    const { sharp, calls } = fakeSharp();

    await encodeTarget(
      sharp,
      { absolutePath: '/m/a.png' },
      { file: '/out/a-hd.webp', original: true },
      { quality: 82, lossless: false }
    );

    expect(calls.map(([step]) => step)).toEqual(['open', 'webp', 'toFile']);
    expect(calls[1][1]).toMatchObject({ lossless: true });
  });
});

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BudgetError,
  evaluateBudget,
  formatReport,
  measureBuild,
  parseEntryDocument,
  readImageSize,
  runBudgetCheck,
  validateBudget,
} from './check-budget.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const temporaryDirectories = [];

// Crea un dist/ de mentira en un directorio temporal a partir de { ruta: contenido }.
async function makeDist(files) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rocky-budget-'));
  temporaryDirectories.push(directory);
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(directory, name);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true }))
  );
});

// Texto pseudoaleatorio y repetible: gzip no lo reduce a nada, así que los
// tamaños comprimidos de dos ficheros distintos también son distintos.
function noise(seed, length) {
  let state = seed;
  let text = '';
  while (text.length < length) {
    state = (state * 1103515245 + 12345) % 2147483648;
    text += state.toString(36);
  }
  return text.slice(0, length);
}

const gzipSize = (content) => zlib.gzipSync(Buffer.from(content), { level: 9 }).length;

// Un index.html con la misma forma que el que genera Vite para esta web.
function entryDocument({
  entry = '/assets/index-AAAAAAAA.js',
  modulePreloads = [],
  stylesheets = [],
  fonts = [],
  classicScripts = [],
} = {}) {
  const fontLinks = fonts.map(
    (href) =>
      `    <link\n      rel="preload"\n      href="${href}"\n      as="font"\n      type="font/woff2"\n      crossorigin\n    />`
  );
  return [
    '<!doctype html>',
    '<html lang="es">',
    '  <head>',
    '    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />',
    '    <link rel="canonical" href="https://rocky035.com/" />',
    '    <link rel="manifest" href="/manifest.json" />',
    ...fontLinks,
    `    <script type="module" crossorigin src="${entry}"></script>`,
    ...modulePreloads.map((href) => `    <link rel="modulepreload" crossorigin href="${href}">`),
    ...stylesheets.map((href) => `    <link rel="stylesheet" crossorigin href="${href}">`),
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    ...classicScripts.map((src) => `    <script src="${src}"></script>`),
    '  </body>',
    '</html>',
  ].join('\n');
}

describe('lectura de index.html', () => {
  it('separa el script de entrada, los módulos precargados, las hojas de estilo y las fuentes', () => {
    const html = entryDocument({
      modulePreloads: ['/assets/shared-BBBBBBBB.js'],
      stylesheets: ['/assets/index-CCCCCCCC.css'],
      fonts: ['/assets/archivo-DDDDDDDD.woff2'],
      classicScripts: ['/theme-init.js'],
    });

    expect(parseEntryDocument(html)).toEqual({
      scripts: ['/assets/index-AAAAAAAA.js', '/theme-init.js'],
      modulePreloads: ['/assets/shared-BBBBBBBB.js'],
      stylesheets: ['/assets/index-CCCCCCCC.css'],
      fontPreloads: ['/assets/archivo-DDDDDDDD.woff2'],
    });
  });

  it('no confunde iconos, manifiestos ni canónicos con recursos que pesar', () => {
    const parsed = parseEntryDocument(entryDocument());

    expect(parsed.stylesheets).toEqual([]);
    expect(parsed.modulePreloads).toEqual([]);
    expect(parsed.fontPreloads).toEqual([]);
  });
});

describe('medidor del build', () => {
  const entryJs = noise(1, 9000);
  const sharedJs = noise(2, 4000);
  const themeJs = noise(3, 300);
  const routeJs = noise(4, 6000);
  const otherRouteJs = noise(5, 2500);
  const mainCss = noise(6, 5000);
  const routeCss = noise(7, 1200);

  function baseFiles(documentOptions = {}) {
    return {
      'index.html': entryDocument({
        modulePreloads: ['/assets/shared-BBBBBBBB.js'],
        stylesheets: ['/assets/index-CCCCCCCC.css'],
        classicScripts: ['/theme-init.js'],
        ...documentOptions,
      }),
      'assets/index-AAAAAAAA.js': entryJs,
      'assets/shared-BBBBBBBB.js': sharedJs,
      'assets/index-CCCCCCCC.css': mainCss,
      'assets/Studio-EEEEEEEE.js': routeJs,
      'assets/Cart-FFFFFFFF.js': otherRouteJs,
      'assets/Studio-GGGGGGGG.css': routeCss,
      'theme-init.js': themeJs,
    };
  }

  it('suma en gzip el JavaScript que index.html carga al abrir cualquier página', async () => {
    const measurement = await measureBuild(await makeDist(baseFiles()));

    expect(measurement.initialJs.files).toEqual([
      { file: 'assets/index-AAAAAAAA.js', bytes: gzipSize(entryJs) },
      { file: 'theme-init.js', bytes: gzipSize(themeJs) },
      { file: 'assets/shared-BBBBBBBB.js', bytes: gzipSize(sharedJs) },
    ]);
    expect(measurement.initialJs.bytes).toBe(
      gzipSize(entryJs) + gzipSize(themeJs) + gzipSize(sharedJs)
    );
  });

  it('suma en gzip solo las hojas de estilo que enlaza index.html', async () => {
    const measurement = await measureBuild(await makeDist(baseFiles()));

    expect(measurement.initialCss).toEqual({
      bytes: gzipSize(mainCss),
      files: [{ file: 'assets/index-CCCCCCCC.css', bytes: gzipSize(mainCss) }],
    });
  });

  it('da por diferido todo el JavaScript de assets/ que no es inicial, de mayor a menor', async () => {
    const measurement = await measureBuild(await makeDist(baseFiles()));

    expect(measurement.deferredJs).toEqual([
      { file: 'assets/Studio-EEEEEEEE.js', bytes: gzipSize(routeJs) },
      { file: 'assets/Cart-FFFFFFFF.js', bytes: gzipSize(otherRouteJs) },
    ]);
  });

  it('cuenta como inicial un módulo que el build empieza a precargar', async () => {
    const before = await measureBuild(await makeDist(baseFiles()));
    const after = await measureBuild(
      await makeDist(
        baseFiles({ modulePreloads: ['/assets/shared-BBBBBBBB.js', '/assets/Cart-FFFFFFFF.js'] })
      )
    );

    expect(after.initialJs.bytes).toBe(before.initialJs.bytes + gzipSize(otherRouteJs));
    expect(after.deferredJs.map((chunk) => chunk.file)).toEqual(['assets/Studio-EEEEEEEE.js']);
  });

  it('pesa sin comprimir las fuentes que index.html precarga', async () => {
    const measurement = await measureBuild(
      await makeDist({
        ...baseFiles({
          fonts: ['/assets/archivo-DDDDDDDD.woff2', '/assets/luckiest-HHHHHHHH.woff2'],
        }),
        'assets/archivo-DDDDDDDD.woff2': Buffer.alloc(31000, 7),
        'assets/luckiest-HHHHHHHH.woff2': Buffer.alloc(12500, 9),
        'assets/no-precargada-IIIIIIII.woff2': Buffer.alloc(40000, 3),
      })
    );

    expect(measurement.preloadedFonts).toEqual({
      bytes: 43500,
      files: [
        { file: 'assets/archivo-DDDDDDDD.woff2', bytes: 31000 },
        { file: 'assets/luckiest-HHHHHHHH.woff2', bytes: 12500 },
      ],
    });
  });

  it('lista las pistas de audio con su peso en disco', async () => {
    const measurement = await measureBuild(
      await makeDist({
        ...baseFiles(),
        'music/barro.m4a': Buffer.alloc(5000, 1),
        'music/modo-neon.m4a': Buffer.alloc(3000, 2),
      })
    );

    expect(measurement.audio).toEqual([
      { file: 'music/barro.m4a', bytes: 5000 },
      { file: 'music/modo-neon.m4a', bytes: 3000 },
    ]);
  });

  it('avisa de que falta el build en vez de medir', async () => {
    const directory = await makeDist({ 'assets/index-AAAAAAAA.js': entryJs });

    await expect(measureBuild(directory)).rejects.toThrow(BudgetError);
    await expect(measureBuild(directory)).rejects.toThrow(/dist\/index\.html/);
  });

  it('se niega a medir un build de desarrollo', async () => {
    const directory = await makeDist({
      ...baseFiles(),
      'assets/shared-BBBBBBBB.js': `${sharedJs};var jsxDEV=function(){};`,
    });

    await expect(measureBuild(directory)).rejects.toThrow(BudgetError);
    await expect(measureBuild(directory)).rejects.toThrow(/desarrollo/);
  });

  it.each([
    ['un fichero que no está en dist/', '/assets/perdido-JJJJJJJJ.js', /perdido-JJJJJJJJ\.js/],
    ['un recurso de otro origen', 'https://cdn.example.com/lib.js', /cdn\.example\.com/],
  ])('no da por bueno un index.html que carga %s', async (_label, href, expected) => {
    const directory = await makeDist(
      baseFiles({ modulePreloads: ['/assets/shared-BBBBBBBB.js', href] })
    );

    await expect(measureBuild(directory)).rejects.toThrow(BudgetError);
    await expect(measureBuild(directory)).rejects.toThrow(expected);
  });
});

describe('rutas que nombra index.html', () => {
  it('no lee un fichero de fuera de dist/ aunque index.html lo pida', async () => {
    const directory = await makeDist({
      'dist/index.html': entryDocument({ modulePreloads: ['/..%2Ffuera.js'] }),
      'dist/assets/index-AAAAAAAA.js': noise(13, 800),
      'fuera.js': noise(14, 800),
    });

    await expect(measureBuild(path.join(directory, 'dist'))).rejects.toThrow(BudgetError);
    await expect(measureBuild(path.join(directory, 'dist'))).rejects.toThrow(/fuera\.js/);
  });

  it('no revienta con una ruta mal codificada', async () => {
    const directory = await makeDist({
      'index.html': entryDocument({ modulePreloads: ['/assets/%E0%A4%A.js'] }),
      'assets/index-AAAAAAAA.js': noise(15, 800),
    });

    await expect(measureBuild(directory)).rejects.toThrow(BudgetError);
  });
});

// Cabeceras mínimas de cada formato, construidas aquí para no versionar binarios.
function riff(fourcc, payload) {
  const chunkHeader = Buffer.alloc(8);
  chunkHeader.write(fourcc, 0, 'latin1');
  chunkHeader.writeUInt32LE(payload.length, 4);
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), chunkHeader, payload]);
  const header = Buffer.alloc(8);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

// VP8 con pérdida: etiqueta de fotograma, código de inicio y 14 bits por lado;
// los dos bits altos de cada lado son la escala y no forman parte de la medida.
function lossyWebp(width, height) {
  const payload = Buffer.alloc(10);
  payload.set([0x9d, 0x01, 0x2a], 3);
  payload.writeUInt16LE(width | 0x4000, 6);
  payload.writeUInt16LE(height | 0x8000, 8);
  return riff('VP8 ', payload);
}

// VP8L sin pérdida: firma 0x2f y, en 32 bits, ancho-1 y alto-1 (14 bits cada
// uno), el bit de alfa y la versión.
function losslessWebp(width, height) {
  const payload = Buffer.alloc(5);
  payload[0] = 0x2f;
  payload.writeUInt32LE(((width - 1) | ((height - 1) << 14) | (1 << 28)) >>> 0, 1);
  return riff('VP8L', payload);
}

// VP8X extendido: banderas (0x02 = animación, 0x10 = alfa) y el lienzo en
// 24 bits por lado, restando uno.
function extendedWebp(width, height, { animated = false } = {}) {
  const payload = Buffer.alloc(10);
  payload[0] = 0x10 | (animated ? 0x02 : 0);
  payload.writeUIntLE(width - 1, 4, 3);
  payload.writeUIntLE(height - 1, 7, 3);
  return riff('VP8X', payload);
}

function png(width, height) {
  const header = Buffer.alloc(24);
  header.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'latin1');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

describe('medidas de una imagen', () => {
  it('lee un WebP con pérdida (VP8) sin contar los bits de escala', () => {
    expect(readImageSize(lossyWebp(1254, 836), 'foto.webp')).toEqual({
      width: 1254,
      height: 836,
      animated: false,
    });
  });

  it('lee un WebP sin pérdida (VP8L), también cuando es enorme', () => {
    expect(readImageSize(losslessWebp(5906, 5906), 'foto.webp')).toEqual({
      width: 5906,
      height: 5906,
      animated: false,
    });
    expect(readImageSize(losslessWebp(16384, 1), 'tira.webp')).toMatchObject({
      width: 16384,
      height: 1,
    });
  });

  it('lee el lienzo de un WebP extendido (VP8X) y distingue si está animado', () => {
    expect(readImageSize(extendedWebp(398, 224, { animated: true }), 'paseo.webp')).toEqual({
      width: 398,
      height: 224,
      animated: true,
    });
    expect(readImageSize(extendedWebp(70000, 320), 'dibujo.webp')).toEqual({
      width: 70000,
      height: 320,
      animated: false,
    });
  });

  it('lee un PNG', () => {
    expect(readImageSize(png(1200, 630), 'og.png')).toEqual({
      width: 1200,
      height: 630,
      animated: false,
    });
  });

  it.each([
    ['un WebP cortado', lossyWebp(640, 480).subarray(0, 22), 'cortado.webp'],
    ['un WebP sin su firma', Buffer.from(noise(8, 64)), 'falso.webp'],
    ['un WebP con un bloque desconocido', riff('ALPH', Buffer.alloc(10)), 'raro.webp'],
    ['un VP8 sin código de inicio', riff('VP8 ', Buffer.alloc(10)), 'roto.webp'],
    ['un PNG sin su firma', Buffer.from(noise(9, 64)), 'falso.png'],
    ['un PNG cortado', png(10, 10).subarray(0, 18), 'cortado.png'],
    ['un formato sin lector', Buffer.from(noise(10, 64)), 'foto.jpg'],
  ])('rechaza %s', (_label, content, file) => {
    expect(() => readImageSize(content, file)).toThrow(BudgetError);
  });
});

describe('imágenes del build', () => {
  const files = {
    'index.html': entryDocument(),
    'assets/index-AAAAAAAA.js': noise(11, 500),
  };

  it('mide cada WebP y PNG de dist/ con su peso en disco', async () => {
    const photo = Buffer.concat([losslessWebp(5906, 5906), Buffer.alloc(900)]);
    const walk = Buffer.concat([extendedWebp(398, 224, { animated: true }), Buffer.alloc(4000)]);
    const measurement = await measureBuild(
      await makeDist({
        ...files,
        'products/rocky35-camel.webp': photo,
        'assets/toxico-paseo-224-KKKKKKKK.webp': walk,
        'og.png': png(1200, 630),
      })
    );

    expect(measurement.images).toEqual([
      {
        file: 'assets/toxico-paseo-224-KKKKKKKK.webp',
        bytes: walk.length,
        width: 398,
        height: 224,
        animated: true,
      },
      { file: 'og.png', bytes: 24, width: 1200, height: 630, animated: false },
      {
        file: 'products/rocky35-camel.webp',
        bytes: photo.length,
        width: 5906,
        height: 5906,
        animated: false,
      },
    ]);
    expect(measurement.unreadableImages).toEqual([]);
  });

  it('pesa los SVG y los ICO sin exigirles medidas en píxeles', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"/>';
    const measurement = await measureBuild(
      await makeDist({ ...files, 'favicon.svg': svg, 'favicon.ico': Buffer.alloc(300) })
    );

    expect(measurement.images).toEqual([
      { file: 'favicon.ico', bytes: 300, width: null, height: null, animated: false },
      { file: 'favicon.svg', bytes: svg.length, width: null, height: null, animated: false },
    ]);
    expect(measurement.unreadableImages).toEqual([]);
    expect(measurement.unknownFiles).toEqual([]);
  });

  it.each(['foto.jpg', 'foto.JPEG', 'foto.jfif', 'foto.avif', 'foto.gif', 'intro.mp4', 'voz.weba'])(
    'no da por bueno %s, un tipo de fichero para el que no tiene regla',
    async (name) => {
      const measurement = await measureBuild(
        await makeDist({ ...files, [`products/${name}`]: Buffer.alloc(2000, 5) })
      );

      expect(measurement.images).toEqual([]);
      expect(measurement.audio).toEqual([]);
      expect(measurement.unknownFiles).toEqual([{ file: `products/${name}`, bytes: 2000 }]);
    }
  );

  it('conoce los tipos que la web ya publica y no mira los ficheros ocultos', async () => {
    const measurement = await measureBuild(
      await makeDist({
        ...files,
        'robots.txt': 'User-agent: *',
        'manifest.json': '{}',
        'assets/Cart-FFFFFFFF.css': noise(41, 300),
        'assets/archivo-DDDDDDDD.woff2': Buffer.alloc(500),
        'street/.gitkeep': '',
      })
    );

    expect(measurement.unknownFiles).toEqual([]);
  });

  it('no da por buena una imagen con la cabecera rota', async () => {
    const measurement = await measureBuild(
      await makeDist({ ...files, 'products/rota.webp': Buffer.from(noise(12, 400)) })
    );

    expect(measurement.images).toEqual([]);
    expect(measurement.unreadableImages).toEqual([
      { file: 'products/rota.webp', reason: expect.any(String) },
    ]);
  });
});

// Una medición dentro de todos los límites de sampleBudget().
function sampleMeasurement(overrides = {}) {
  return {
    initialJs: { bytes: 99_000, files: [] },
    initialCss: { bytes: 14_500, files: [] },
    deferredJs: [
      { file: 'assets/Studio-EEEEEEEE.js', bytes: 20_400 },
      { file: 'assets/Cart-FFFFFFFF.js', bytes: 3_000 },
    ],
    preloadedFonts: { bytes: 54_000, files: [] },
    images: [
      {
        file: 'products/rocky-racing.webp',
        bytes: 30_000,
        width: 1254,
        height: 1254,
        animated: false,
      },
      {
        file: 'assets/dibujo-GGGGGGGG.webp',
        bytes: 150_000,
        width: 640,
        height: 320,
        animated: false,
      },
    ],
    unreadableImages: [],
    unknownFiles: [],
    audio: [{ file: 'music/modo-neon.m4a', bytes: 1_021_000 }],
    ...overrides,
  };
}

// Límites iguales a sus objetivos, para que el trinquete no intervenga salvo
// en las pruebas que lo buscan.
function sampleBudget({ metrics = {}, exceptions = [] } = {}) {
  return {
    metrics: {
      initialJs: { limit: 100, target: 100 },
      initialCss: { limit: 15, target: 15 },
      deferredChunk: { limit: 21, target: 21 },
      preloadedFonts: { limit: 55, target: 55 },
      imageSide: { limit: 1600, target: 1600 },
      imageWeight: { limit: 200, target: 200 },
      imagesTotal: { limit: 200, target: 200 },
      audioTrack: { limit: 1100, target: 1100 },
      audioTotal: { limit: 1100, target: 1100 },
      ...metrics,
    },
    exceptions,
  };
}

const hugePhoto = {
  file: 'products/rocky35-camel.webp',
  bytes: 17_000,
  width: 5906,
  height: 5906,
  animated: false,
};

describe('reglas del presupuesto', () => {
  it('no encuentra fallos cuando todo está dentro de sus límites', () => {
    const evaluation = evaluateBudget(sampleMeasurement(), sampleBudget());

    expect(evaluation.failures).toEqual([]);
    expect(evaluation.rows).toHaveLength(9);
  });

  it('falla cuando el JavaScript inicial supera su límite y dice cuánto y contra qué', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialJs: { bytes: 101_500, files: [] } }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/JavaScript inicial.*101,50 kB.*100 kB/)]);
  });

  it('da por bueno un JavaScript inicial igual a su límite', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialJs: { bytes: 100_000, files: [] } }),
      sampleBudget()
    );

    expect(failures).toEqual([]);
  });

  it('falla cuando el CSS inicial supera su límite', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialCss: { bytes: 15_010, files: [] } }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/CSS inicial.*15,01 kB.*15 kB/)]);
  });

  it('falla cuando las fuentes precargadas superan su límite', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ preloadedFonts: { bytes: 81_760, files: [] } }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/Fuentes precargadas.*81,76 kB.*55 kB/)]);
  });

  it('nombra el chunk diferido que crece demasiado', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        deferredJs: [
          { file: 'assets/Studio-EEEEEEEE.js', bytes: 23_100 },
          { file: 'assets/Cart-FFFFFFFF.js', bytes: 3_000 },
        ],
      }),
      sampleBudget()
    );

    expect(failures).toEqual([
      expect.stringMatching(/assets\/Studio-EEEEEEEE\.js.*23,10 kB.*21 kB/),
    ]);
  });

  it('nombra la imagen enorme, sus medidas y el límite', () => {
    const { failures } = evaluateBudget(sampleMeasurement({ images: [hugePhoto] }), sampleBudget());

    expect(failures).toEqual([
      expect.stringMatching(/products\/rocky35-camel\.webp.*5906 × 5906 px.*1600 px/),
    ]);
  });

  it('nombra la imagen que cumple en píxeles pero pesa demasiado', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        images: [
          {
            file: 'assets/cartel-HHHHHHHH.png',
            bytes: 250_000,
            width: 800,
            height: 600,
            animated: false,
          },
        ],
      }),
      sampleBudget({ metrics: { imagesTotal: { limit: 300, target: 300 } } })
    );

    expect(failures).toEqual([
      expect.stringMatching(/assets\/cartel-HHHHHHHH\.png.*250,00 kB.*200 kB/),
    ]);
  });

  it('no da por buena una imagen que no se ha podido medir', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        unreadableImages: [{ file: 'products/foto.jpg', reason: 'es de un formato raro' }],
      }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/products\/foto\.jpg.*formato raro/)]);
  });

  it('nombra la pista de audio demasiado pesada', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ audio: [{ file: 'music/nueva.m4a', bytes: 1_500_000 }] }),
      sampleBudget({ metrics: { audioTotal: { limit: 1600, target: 1600 } } })
    );

    expect(failures).toEqual([expect.stringMatching(/music\/nueva\.m4a.*1500,00 kB.*1100 kB/)]);
  });

  it('falla por el total cuando ninguna imagen se pasa pero entre todas sí', () => {
    const image = (file) => ({ file, bytes: 90_000, width: 640, height: 640, animated: false });
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [image('a.webp'), image('b.webp'), image('c.webp')] }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/Total de imágenes.*270,00 kB.*200 kB/)]);
  });

  it('falla por el total de audio', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        audio: [
          { file: 'music/a.m4a', bytes: 600_000 },
          { file: 'music/b.m4a', bytes: 600_000 },
        ],
      }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/Total de audio.*1200,00 kB.*1100 kB/)]);
  });

  it('nombra todas las métricas que fallan, no solo la primera', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        initialJs: { bytes: 130_000, files: [] },
        initialCss: { bytes: 19_000, files: [] },
        images: [hugePhoto],
      }),
      sampleBudget()
    );

    expect(failures).toEqual([
      expect.stringMatching(/JavaScript inicial/),
      expect.stringMatching(/CSS inicial/),
      expect.stringMatching(/rocky35-camel/),
    ]);
  });
});

describe('excepciones del presupuesto', () => {
  const sideException = {
    file: 'products/rocky35-camel.webp',
    metric: 'imageSide',
    limit: 5906,
    reason: 'H-003: la sustituye imagenes-y-medios',
  };

  it('admite un recurso declarado mientras no supere su propio techo', () => {
    const evaluation = evaluateBudget(
      sampleMeasurement({ images: [hugePhoto] }),
      sampleBudget({ exceptions: [sideException] })
    );

    expect(evaluation.failures).toEqual([]);
    expect(evaluation.exceptions).toEqual([
      expect.objectContaining({
        file: 'products/rocky35-camel.webp',
        reason: sideException.reason,
      }),
    ]);
  });

  it('falla si el recurso supera el techo de su excepción', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [{ ...hugePhoto, width: 6000 }] }),
      sampleBudget({ exceptions: [sideException] })
    );

    expect(failures).toEqual([
      expect.stringMatching(/products\/rocky35-camel\.webp.*6000 × 5906 px.*techo.*5906 px/),
    ]);
  });

  it('pide retirar la excepción cuando el recurso ya cumple el límite general', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [{ ...hugePhoto, width: 1280, height: 1280 }] }),
      sampleBudget({ exceptions: [sideException] })
    );

    expect(failures).toEqual([
      expect.stringMatching(/products\/rocky35-camel\.webp.*ya cumple.*[Rr]etira/),
    ]);
  });

  it('pide retirar la excepción de un recurso que ya no está en dist/', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement(),
      sampleBudget({ exceptions: [sideException] })
    );

    expect(failures).toEqual([
      expect.stringMatching(/products\/rocky35-camel\.webp.*no está en dist\/.*[Rr]et[ií]ra/),
    ]);
  });

  it('reconoce por su nombre sin hash un recurso que Vite renombra en cada build', () => {
    const walk = {
      file: 'assets/toxico-paseo-224-BT8VHUm-.webp',
      bytes: 150_000,
      width: 166,
      height: 224,
      animated: true,
    };
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [{ ...walk, bytes: 709_174 }] }),
      sampleBudget({
        metrics: { imagesTotal: { limit: 720, target: 720 } },
        exceptions: [
          {
            file: 'assets/toxico-paseo-224.webp',
            metric: 'imageWeight',
            limit: 710,
            reason: 'H-169',
          },
        ],
      })
    );

    expect(failures).toEqual([]);
  });

  it('solo perdona la métrica que nombra la excepción', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [{ ...hugePhoto, bytes: 260_000 }] }),
      sampleBudget({
        metrics: { imagesTotal: { limit: 300, target: 300 } },
        exceptions: [sideException],
      })
    );

    expect(failures).toEqual([expect.stringMatching(/rocky35-camel\.webp.*260,00 kB.*200 kB/)]);
  });

  it('admite una pista de audio declarada', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ audio: [{ file: 'music/barro.m4a', bytes: 2_679_868 }] }),
      sampleBudget({
        metrics: { audioTotal: { limit: 2700, target: 2700 } },
        exceptions: [
          { file: 'music/barro.m4a', metric: 'audioTrack', limit: 2700, reason: 'H-145' },
        ],
      })
    );

    expect(failures).toEqual([]);
  });
});

describe('los límites solo bajan', () => {
  it('falla y propone el límite nuevo cuando la medida queda más de un 10 % por debajo', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialJs: { bytes: 105_300, files: [] } }),
      sampleBudget({ metrics: { initialJs: { limit: 123, target: 100 } } })
    );

    expect(failures).toEqual([
      expect.stringMatching(/JavaScript inicial.*105,30 kB.*123 kB.*106 kB/),
    ]);
  });

  it('no propone un límite por debajo del objetivo', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialJs: { bytes: 80_000, files: [] } }),
      sampleBudget({ metrics: { initialJs: { limit: 123, target: 100 } } })
    );

    expect(failures).toEqual([expect.stringMatching(/JavaScript inicial.*123 kB.*\b100 kB/)]);
    expect(failures[0]).not.toMatch(/\b80 kB/);
  });

  it('no molesta mientras la medida esté a menos de un 10 % del límite', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialJs: { bytes: 110_700, files: [] } }),
      sampleBudget({ metrics: { initialJs: { limit: 123, target: 100 } } })
    );

    expect(failures).toEqual([]);
  });

  it('no falla si el límite ya está en su objetivo, por holgada que quede la medida', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ initialJs: { bytes: 40_000, files: [] } }),
      sampleBudget()
    );

    expect(failures).toEqual([]);
  });

  it('aplica el trinquete a la mayor medida de las métricas por fichero', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement(),
      sampleBudget({ metrics: { deferredChunk: { limit: 30, target: 21 } } })
    );

    expect(failures).toEqual([expect.stringMatching(/chunk diferido.*20,40 kB.*30 kB.*21 kB/i)]);
  });
});

describe('configuración del presupuesto', () => {
  it('acepta un presupuesto bien declarado', () => {
    expect(validateBudget(sampleBudget())).toEqual([]);
  });

  it.each([
    ['un límite sin objetivo', { initialJs: { limit: 100 } }, /initialJs.*objetivo/],
    [
      'un límite por debajo de su objetivo',
      { initialJs: { limit: 90, target: 100 } },
      /initialJs.*90.*100/,
    ],
    [
      'un límite que no es un número',
      { initialCss: { limit: '19', target: 15 } },
      /initialCss.*límite/,
    ],
    ['una métrica sin declarar', { audioTotal: undefined }, /audioTotal/],
    [
      'una métrica que no existe',
      { initialJavascript: { limit: 1, target: 1 } },
      /initialJavascript/,
    ],
  ])('rechaza %s', (_label, metrics, expected) => {
    expect(validateBudget(sampleBudget({ metrics }))).toEqual([expect.stringMatching(expected)]);
  });

  it.each([
    ['sin motivo', { file: 'a.webp', metric: 'imageSide', limit: 2000 }, /a\.webp.*motivo/],
    ['sin techo', { file: 'a.webp', metric: 'imageSide', reason: 'H-003' }, /a\.webp.*techo/],
    ['sin recurso', { metric: 'imageSide', limit: 2000, reason: 'H-003' }, /recurso/],
    [
      'de una métrica que no va por fichero',
      { file: 'a.webp', metric: 'imagesTotal', limit: 9000, reason: 'H-003' },
      /a\.webp.*imagesTotal/,
    ],
  ])('rechaza una excepción %s', (_label, exception, expected) => {
    expect(validateBudget(sampleBudget({ exceptions: [exception] }))).toEqual([
      expect.stringMatching(expected),
    ]);
  });

  it('rechaza un fichero que no tiene la forma de un presupuesto', () => {
    expect(validateBudget([])).toEqual([expect.any(String)]);
    expect(validateBudget({ metrics: sampleBudget().metrics, exceptions: 'ninguna' })).toEqual([
      expect.stringMatching(/exceptions/),
    ]);
  });
});

describe('informe del presupuesto', () => {
  it('lista cada métrica con lo medido, su límite y su objetivo', () => {
    const report = formatReport(
      evaluateBudget(
        sampleMeasurement(),
        sampleBudget({ metrics: { initialJs: { limit: 105, target: 100 } } })
      )
    );
    const lines = report.split('\n');

    expect(lines[0]).toMatch(/Métrica.*Medido.*Límite.*Objetivo/);
    expect(lines.find((line) => line.includes('JavaScript inicial'))).toMatch(
      /99,00 kB\s+105 kB\s+100 kB/
    );
    expect(lines.find((line) => line.includes('CSS inicial'))).toMatch(/14,50 kB\s+15 kB\s+15 kB/);
    expect(lines.find((line) => line.includes('chunk diferido'))).toMatch(
      /20,40 kB\s+21 kB\s+21 kB\s+assets\/Studio-EEEEEEEE\.js/
    );
    expect(lines.find((line) => line.includes('lado de imagen'))).toMatch(
      /1254 px\s+1600 px\s+1600 px\s+products\/rocky-racing\.webp/
    );
    expect(lines.find((line) => line.includes('Total de imágenes'))).toMatch(/180,00 kB/);
    expect(lines.find((line) => line.includes('Total de audio'))).toMatch(/1021,00 kB/);
  });

  it('enseña las excepciones vigentes con su techo y su motivo', () => {
    const report = formatReport(
      evaluateBudget(
        sampleMeasurement({ images: [hugePhoto] }),
        sampleBudget({
          exceptions: [
            {
              file: 'products/rocky35-camel.webp',
              metric: 'imageSide',
              limit: 5906,
              reason: 'H-003',
            },
          ],
        })
      )
    );

    expect(report).toMatch(/products\/rocky35-camel\.webp.*5906 × 5906 px.*5906 px.*H-003/);
  });
});

describe('comprobación completa', () => {
  const entryJs = noise(21, 4000);
  const mainCss = noise(22, 2000);
  const distFiles = {
    'index.html': entryDocument({ stylesheets: ['/assets/index-CCCCCCCC.css'] }),
    'assets/index-AAAAAAAA.js': entryJs,
    'assets/index-CCCCCCCC.css': mainCss,
    'og.png': png(1200, 630),
  };
  const roomyMetrics = {
    initialJs: { limit: 4, target: 4 },
    initialCss: { limit: 2, target: 2 },
    deferredChunk: { limit: 21, target: 21 },
    preloadedFonts: { limit: 82, target: 82 },
    imageSide: { limit: 1600, target: 1600 },
    imageWeight: { limit: 200, target: 200 },
    imagesTotal: { limit: 5200, target: 5200 },
    audioTrack: { limit: 1100, target: 1100 },
    audioTotal: { limit: 3750, target: 3750 },
  };

  async function writeBudget(budget) {
    const directory = await makeDist({ 'performance-budget.json': JSON.stringify(budget) });
    return path.join(directory, 'performance-budget.json');
  }

  it('termina bien y enseña la tabla cuando todo cabe', async () => {
    const result = await runBudgetCheck({
      distDirectory: await makeDist(distFiles),
      budgetFile: await writeBudget({ metrics: roomyMetrics, exceptions: [] }),
    });

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/JavaScript inicial/);
    expect(result.stdout).toMatch(/Total de audio/);
  });

  it('termina con error y nombra las dos métricas que fallan', async () => {
    const result = await runBudgetCheck({
      distDirectory: await makeDist(distFiles),
      budgetFile: await writeBudget({
        metrics: {
          ...roomyMetrics,
          initialJs: { limit: 1, target: 1 },
          imageSide: { limit: 1000, target: 1000 },
        },
        exceptions: [],
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/JavaScript inicial/);
    expect(result.stderr).toMatch(/JavaScript inicial.*1 kB/);
    expect(result.stderr).toMatch(/og\.png.*1200 × 630 px.*1000 px/);
  });

  it('dice que falta el build y no mide nada', async () => {
    const result = await runBudgetCheck({
      distDirectory: await makeDist({ 'robots.txt': 'User-agent: *' }),
      budgetFile: await writeBudget({ metrics: roomyMetrics, exceptions: [] }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/dist\/index\.html/);
  });

  it('dice que el build es de desarrollo y no mide nada', async () => {
    const result = await runBudgetCheck({
      distDirectory: await makeDist({
        ...distFiles,
        'assets/index-AAAAAAAA.js': `${entryJs};export{jsxDEV};`,
      }),
      budgetFile: await writeBudget({ metrics: roomyMetrics, exceptions: [] }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/desarrollo/);
  });

  it('termina con un error de configuración si un límite está mal declarado', async () => {
    const result = await runBudgetCheck({
      distDirectory: await makeDist(distFiles),
      budgetFile: await writeBudget({
        metrics: { ...roomyMetrics, initialJs: { limit: 3, target: 4 } },
        exceptions: [],
      }),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/configuración/);
    expect(result.stderr).toMatch(/initialJs/);
  });

  it.each([
    ['no existe', null],
    ['no es JSON', '{ "metrics": '],
  ])('termina con un error de configuración si el fichero de límites %s', async (_label, raw) => {
    const directory = await makeDist(raw === null ? {} : { 'performance-budget.json': raw });
    const result = await runBudgetCheck({
      distDirectory: await makeDist(distFiles),
      budgetFile: path.join(directory, 'performance-budget.json'),
    });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/configuración/);
  });
});

// ---------------------------------------------------------------------------
// Casos añadidos tras la revisión independiente del cambio.
// ---------------------------------------------------------------------------

describe('lectura de index.html: casos límite', () => {
  it('ignora las etiquetas que están dentro de un comentario', () => {
    const html = [
      '<!-- <link rel="modulepreload" href="/assets/viejo.js"> -->',
      '<!--\n<script type="module" src="/assets/otro.js"></script>\n-->',
      '<script type="module" src="/assets/index-AAAAAAAA.js"></script>',
    ].join('\n');

    expect(parseEntryDocument(html)).toMatchObject({
      scripts: ['/assets/index-AAAAAAAA.js'],
      modulePreloads: [],
    });
  });

  it('entiende rel como una lista de palabras y cuenta las precargas de scripts y estilos', () => {
    const html = [
      '<link rel="prefetch modulepreload" href="/assets/a.js">',
      '<link rel="preload" as="script" href="/assets/b.js">',
      '<link rel="preload" as="style" href="/assets/c.css">',
      '<link rel="preload" as="image" href="/hero.webp">',
      '<link rel="preload" as="font" href="/assets/f.woff2">',
    ].join('\n');

    expect(parseEntryDocument(html)).toEqual({
      scripts: [],
      modulePreloads: ['/assets/a.js', '/assets/b.js'],
      stylesheets: ['/assets/c.css'],
      fontPreloads: ['/assets/f.woff2'],
    });
  });
});

describe('JavaScript inicial que index.html no precarga', () => {
  const shared = `import"./deep-LLLLLLLL.js";${noise(31, 3000)}`;
  const deep = noise(32, 1500);
  const studio = noise(34, 2500);

  it('cuenta lo que la entrada importa de forma estática, y lo que eso importa a su vez', async () => {
    const entry = `import{a as b}from"./shared-BBBBBBBB.js";${noise(33, 5000)};const open=()=>import("./Studio-EEEEEEEE.js");`;
    const measurement = await measureBuild(
      await makeDist({
        'index.html': entryDocument(),
        'assets/index-AAAAAAAA.js': entry,
        'assets/shared-BBBBBBBB.js': shared,
        'assets/deep-LLLLLLLL.js': deep,
        'assets/Studio-EEEEEEEE.js': studio,
      })
    );

    expect(measurement.initialJs.files.map(({ file }) => file)).toEqual([
      'assets/index-AAAAAAAA.js',
      'assets/shared-BBBBBBBB.js',
      'assets/deep-LLLLLLLL.js',
    ]);
    expect(measurement.initialJs.bytes).toBe(gzipSize(entry) + gzipSize(shared) + gzipSize(deep));
    expect(measurement.deferredJs).toEqual([
      { file: 'assets/Studio-EEEEEEEE.js', bytes: gzipSize(studio) },
    ]);
  });

  it('sigue las reexportaciones y cuenta una sola vez un módulo compartido', async () => {
    const entry = `export{a}from"./shared-BBBBBBBB.js";import*as d from"./deep-LLLLLLLL.js";${noise(35, 900)}`;
    const measurement = await measureBuild(
      await makeDist({
        'index.html': entryDocument(),
        'assets/index-AAAAAAAA.js': entry,
        'assets/shared-BBBBBBBB.js': shared,
        'assets/deep-LLLLLLLL.js': deep,
      })
    );

    expect(measurement.initialJs.files.map(({ file }) => file)).toEqual([
      'assets/index-AAAAAAAA.js',
      'assets/shared-BBBBBBBB.js',
      'assets/deep-LLLLLLLL.js',
    ]);
    expect(measurement.deferredJs).toEqual([]);
  });

  it('no se inventa un fichero a partir de un texto que parece un import', async () => {
    const entry = `const help='import "./no-existe.js"';${noise(36, 900)}`;
    const measurement = await measureBuild(
      await makeDist({ 'index.html': entryDocument(), 'assets/index-AAAAAAAA.js': entry })
    );

    expect(measurement.initialJs.files).toEqual([
      { file: 'assets/index-AAAAAAAA.js', bytes: gzipSize(entry) },
    ]);
  });
});

describe('medidor del build: casos límite', () => {
  const entry = noise(37, 1200);

  it('cuenta una sola vez un fichero que index.html nombra dos veces', async () => {
    const measurement = await measureBuild(
      await makeDist({
        'index.html': entryDocument({ modulePreloads: ['/assets/index-AAAAAAAA.js'] }),
        'assets/index-AAAAAAAA.js': entry,
      })
    );

    expect(measurement.initialJs).toEqual({
      bytes: gzipSize(entry),
      files: [{ file: 'assets/index-AAAAAAAA.js', bytes: gzipSize(entry) }],
    });
  });

  it('no da por bueno un index.html que no carga ningún script', async () => {
    const directory = await makeDist({
      'index.html': '<!doctype html><html><body><div id="root"></div></body></html>',
      'assets/index-AAAAAAAA.js': entry,
    });

    await expect(measureBuild(directory)).rejects.toThrow(BudgetError);
    await expect(measureBuild(directory)).rejects.toThrow(/ningún script/);
  });

  it.each([
    ['una carpeta', '/assets'],
    ['una ruta con un carácter nulo', '/assets/a%00.js'],
  ])('explica en castellano que no puede leer %s', async (_label, href) => {
    const directory = await makeDist({
      'index.html': entryDocument({ modulePreloads: [href] }),
      'assets/index-AAAAAAAA.js': entry,
    });

    await expect(measureBuild(directory)).rejects.toThrow(BudgetError);
  });

  it('da por diferido cualquier JavaScript de dist/ que no sea inicial, esté donde esté', async () => {
    const vendor = noise(38, 4000);
    const worker = noise(39, 2000);
    const measurement = await measureBuild(
      await makeDist({
        'index.html': entryDocument({ classicScripts: ['/theme-init.js'] }),
        'assets/index-AAAAAAAA.js': entry,
        'theme-init.js': noise(40, 200),
        'vendor/three.min.js': vendor,
        'assets/worker-PPPPPPPP.mjs': worker,
      })
    );

    expect(measurement.deferredJs).toEqual([
      { file: 'vendor/three.min.js', bytes: gzipSize(vendor) },
      { file: 'assets/worker-PPPPPPPP.mjs', bytes: gzipSize(worker) },
    ]);
  });

  it('reconoce como audio los formatos habituales, no solo m4a', async () => {
    const measurement = await measureBuild(
      await makeDist({
        'index.html': entryDocument(),
        'assets/index-AAAAAAAA.js': entry,
        'music/a.mp3': Buffer.alloc(700),
        'music/b.ogg': Buffer.alloc(600),
        'music/c.wav': Buffer.alloc(500),
      })
    );

    expect(measurement.audio).toEqual([
      { file: 'music/a.mp3', bytes: 700 },
      { file: 'music/b.ogg', bytes: 600 },
      { file: 'music/c.wav', bytes: 500 },
    ]);
    expect(measurement.unknownFiles).toEqual([]);
  });
});

describe('reglas del presupuesto: casos límite', () => {
  const image = (overrides) => ({
    file: 'products/foto.webp',
    bytes: 20_000,
    width: 800,
    height: 800,
    animated: false,
    ...overrides,
  });

  it('mide el lado mayor, también cuando la imagen es vertical', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [image({ width: 800, height: 5906 })] }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/products\/foto\.webp.*800 × 5906 px/)]);
  });

  it('da por bueno un fichero que mide exactamente su límite', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        images: [image({ width: 1600, height: 900, bytes: 200_000 })],
        deferredJs: [{ file: 'assets/Studio-EEEEEEEE.js', bytes: 21_000 }],
        audio: [{ file: 'music/a.m4a', bytes: 1_100_000 }],
      }),
      sampleBudget()
    );

    expect(failures).toEqual([]);
  });

  it('pesa un SVG o un ICO aunque no tenga medidas en píxeles', () => {
    const evaluation = evaluateBudget(
      sampleMeasurement({
        images: [image({ file: 'hero.svg', bytes: 6_000_000, width: null, height: null })],
      }),
      sampleBudget({ metrics: { imagesTotal: { limit: 7000, target: 7000 } } })
    );

    expect(evaluation.failures).toEqual([expect.stringMatching(/hero\.svg.*6000,00 kB.*200 kB/)]);
    expect(evaluation.rows.find(({ id }) => id === 'imageSide')).toMatchObject({
      measured: '0 px',
      file: '',
    });
  });

  it('dice que una imagen pesada es una animación', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        images: [
          image({ file: 'paseo.webp', bytes: 709_174, width: 166, height: 224, animated: true }),
        ],
      }),
      sampleBudget({ metrics: { imagesTotal: { limit: 710, target: 710 } } })
    );

    expect(failures).toEqual([expect.stringMatching(/paseo\.webp.*709,17 kB.*animación/)]);
  });

  it('no da por bueno un fichero de un tipo para el que no hay regla', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ unknownFiles: [{ file: 'intro.mp4', bytes: 20_000_000 }] }),
      sampleBudget()
    );

    expect(failures).toEqual([expect.stringMatching(/intro\.mp4.*\.mp4.*20000,00 kB/)]);
  });

  it('no propone bajar un límite al mismo valor que ya tiene', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ deferredJs: [{ file: 'assets/Cart-FFFFFFFF.js', bytes: 1_500 }] }),
      sampleBudget({ metrics: { deferredChunk: { limit: 2, target: 1 } } })
    );

    expect(failures).toEqual([]);
  });
});

describe('excepciones del presupuesto: casos límite', () => {
  const logo = (hash, bytes) => ({
    file: `assets/logo-${hash}.webp`,
    bytes,
    width: 400,
    height: 400,
    animated: false,
  });
  const weightException = {
    file: 'assets/logo.webp',
    metric: 'imageWeight',
    limit: 710,
    reason: 'H-169',
  };

  it('pide retirar la excepción de un recurso que mide exactamente el límite general', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [logo('AAAAAAAA', 200_000)] }),
      sampleBudget({ exceptions: [weightException] })
    );

    expect(failures).toEqual([expect.stringMatching(/logo-AAAAAAAA\.webp.*ya cumple/)]);
  });

  it('no deja que una excepción cubra a dos ficheros con el mismo nombre', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({ images: [logo('AAAAAAAA', 700_000), logo('BBBBBBBB', 650_000)] }),
      sampleBudget({
        metrics: { imagesTotal: { limit: 1400, target: 1400 } },
        exceptions: [weightException],
      })
    );

    expect(failures).toEqual([
      expect.stringMatching(/assets\/logo\.webp.*2 ficheros.*logo-AAAAAAAA.*logo-BBBBBBBB/),
      expect.stringMatching(/logo-AAAAAAAA\.webp.*700,00 kB.*200 kB/),
      expect.stringMatching(/logo-BBBBBBBB\.webp.*650,00 kB.*200 kB/),
    ]);
  });

  it('solo quita del nombre el hash de ocho caracteres de Vite', () => {
    const { failures } = evaluateBudget(
      sampleMeasurement({
        images: [{ ...logo('grande', 20_000), file: 'assets/logo-grande.webp' }],
      }),
      sampleBudget({ exceptions: [weightException] })
    );

    expect(failures).toEqual([expect.stringMatching(/assets\/logo\.webp.*no está en dist\//)]);
  });
});

describe('configuración del presupuesto: casos límite', () => {
  it('rechaza una excepción cuyo techo no supera el límite general', () => {
    const errors = validateBudget(
      sampleBudget({
        exceptions: [{ file: 'a.webp', metric: 'imageSide', limit: 1500, reason: 'H-003' }],
      })
    );

    expect(errors).toEqual([expect.stringMatching(/a\.webp.*1500.*1600/)]);
  });

  it('rechaza dos excepciones para el mismo recurso y la misma métrica', () => {
    const exception = { file: 'a.webp', metric: 'imageSide', limit: 5906, reason: 'H-003' };

    expect(validateBudget(sampleBudget({ exceptions: [exception, { ...exception }] }))).toEqual([
      expect.stringMatching(/a\.webp.*repetida/),
    ]);
  });

  it('el presupuesto versionado del proyecto está bien declarado', async () => {
    const budget = JSON.parse(
      await fs.readFile(path.join(scriptsDirectory, 'performance-budget.json'), 'utf8')
    );

    expect(validateBudget(budget)).toEqual([]);
  });
});

describe('línea de comandos', () => {
  it('se ejecuta y habla aunque se le llame a través de un enlace simbólico', async () => {
    const directory = await makeDist({});
    const link = path.join(directory, 'scripts');
    await fs.symlink(scriptsDirectory, link, 'dir');

    // El resultado depende de si hay un dist/ construido; lo que no puede
    // pasar es que termine en silencio, que equivaldría a dar el visto bueno.
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [path.join(link, 'check-budget.mjs')],
      { encoding: 'utf8' }
    ).catch((error) => error);

    expect(`${stdout}${stderr}`).toMatch(/presupuesto/i);
  });
});

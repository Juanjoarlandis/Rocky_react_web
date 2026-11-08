import { describe, expect, it } from 'vitest';
import {
  buildReleaseManifest,
  buildSha256Sums,
  contentHash,
  filterReleaseFiles,
  findForbiddenFiles,
  formatReleaseTimestamp,
  imageTag,
  isExcluded,
  parseArgs,
  parseDockerignore,
  releaseId,
  safePath,
  validateLabel,
  validateReleaseId,
  validateStamp,
} from './lib.mjs';

const DOCKERIGNORE = [
  '.git',
  '.claude',
  '.data',
  '._*',
  '**/._*',
  '.env',
  '.env.*',
  '!.env.example',
  'coverage',
  'dist',
  'docs',
  'node_modules',
  'output',
  'posters',
  'prompts-munecos',
  'assets-master',
  'yarn.lock',
  '*.log',
  '*.md',
].join('\n');

const HASH = 'a'.repeat(64);
const COMMIT = 'f'.repeat(40);

describe('identificador de release', () => {
  it('formatea la fecha en UTC como AAAAMMDDTHHMMSSZ', () => {
    expect(formatReleaseTimestamp(new Date('2026-09-29T10:06:41.999Z'))).toBe('20260929T100641Z');
  });

  it('compone fecha, etiqueta y los 8 primeros caracteres del hash del contenido', () => {
    expect(
      releaseId({
        date: new Date('2026-09-29T10:06:41Z'),
        label: 'el-toxico',
        contentHash: '5617951b' + 'c'.repeat(56),
      })
    ).toBe('20260929T100641Z-el-toxico-5617951b');
  });

  it('rechaza un hash de contenido que no son 64 caracteres hexadecimales', () => {
    expect(() => releaseId({ date: new Date(), label: 'x', contentHash: 'abc' })).toThrow(/hash/i);
  });

  it('acepta etiquetas en kebab-case de hasta 40 caracteres', () => {
    expect(validateLabel('crew-noche-16')).toBe('crew-noche-16');
  });

  it.each([
    '',
    'Con-Mayusculas',
    'con espacio',
    'acaba-',
    '-empieza',
    'a/b',
    'x'.repeat(41),
    'punto.y.coma;',
  ])('rechaza la etiqueta %j', (label) => {
    expect(() => validateLabel(label)).toThrow(/etiqueta/i);
  });

  it('da la etiqueta de imagen rocky035:<release>', () => {
    expect(imageTag('20260929T100641Z-el-toxico-5617951b')).toBe(
      'rocky035:20260929T100641Z-el-toxico-5617951b'
    );
  });
});

describe('exclusiones de .dockerignore', () => {
  const rules = parseDockerignore(DOCKERIGNORE);

  it.each([
    ['docs/README.md', true],
    ['docs/auditoria/2026-11/hallazgos.md', true],
    ['posters/img/01.png', true],
    ['prompts-munecos/README.md', true],
    ['README.md', true],
    ['CLAUDE.md', true],
    ['build.log', true],
    ['.env', true],
    ['.env.production', true],
    ['.env.example', false],
    ['src/._foto.webp', true],
    ['._raiz', true],
    ['src/App.jsx', false],
    ['server/index.mjs', false],
    ['Dockerfile', false],
    ['.dockerignore', false],
    ['package-lock.json', false],
    ['src/features/legal/notas.md', false],
  ])('%s → excluido=%s', (path, excluded) => {
    expect(isExcluded(path, rules)).toBe(excluded);
  });

  it('ignora líneas vacías y comentarios', () => {
    expect(parseDockerignore('# comentario\n\n dist \n')).toEqual([
      { pattern: 'dist', negate: false },
    ]);
  });
});

describe('ficheros de la release', () => {
  it('se queda solo con lo que entra en la imagen, ordenado por bytes', () => {
    const files = [
      'src/App.jsx',
      'docs/x.md',
      '.env.example',
      'Dockerfile',
      '.dockerignore',
      'README.md',
      '.git/config',
    ];
    expect(filterReleaseFiles(files, DOCKERIGNORE)).toEqual([
      '.dockerignore',
      '.env.example',
      'Dockerfile',
      'src/App.jsx',
    ]);
  });

  it('nunca incluye .env* salvo .env.example, aunque .dockerignore no lo excluya', () => {
    expect(filterReleaseFiles(['.env.local', 'server/.env', '.env.example'], '')).toEqual([
      '.env.example',
    ]);
  });

  it('señala los .env* versionados (salvo .env.example) como prohibidos', () => {
    expect(
      findForbiddenFiles(['.env.example', 'server/.env', '.env.production', 'src/env.js'])
    ).toEqual(['.env.production', 'server/.env']);
  });
});

describe('SHA256SUMS y release.json', () => {
  it('escribe una línea «hash␣␣ruta» por fichero, ordenadas por ruta', () => {
    const sums = buildSha256Sums([
      { path: 'Dockerfile', sha256: 'b'.repeat(64) },
      { path: '.dockerignore', sha256: 'a'.repeat(64) },
    ]);
    expect(sums).toBe(`${'a'.repeat(64)}  .dockerignore\n${'b'.repeat(64)}  Dockerfile\n`);
  });

  it('rechaza un hash de fichero mal formado', () => {
    expect(() => buildSha256Sums([{ path: 'x', sha256: 'nope' }])).toThrow(/sha256/i);
  });

  it('calcula el hash del contenido como sha256 de SHA256SUMS', () => {
    expect(contentHash('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('construye release.json con sus siete campos', () => {
    const manifest = buildReleaseManifest({
      release: '20260929T100641Z-el-toxico-5617951b',
      sourceHash: HASH,
      commit: COMMIT,
      branch: 'origin/main',
      productionBase: '20260928T101659Z-crew-noche-16-fe7c1d2a',
      fileCount: 422,
    });
    expect(manifest).toEqual({
      release: '20260929T100641Z-el-toxico-5617951b',
      image: 'rocky035:20260929T100641Z-el-toxico-5617951b',
      sourceHash: HASH,
      commit: COMMIT,
      branch: 'origin/main',
      productionBase: '20260928T101659Z-crew-noche-16-fe7c1d2a',
      fileCount: 422,
    });
  });

  it.each([
    [{ commit: 'abc' }, /commit/i],
    [{ sourceHash: 'x' }, /hash/i],
    [{ fileCount: 0 }, /ficheros/i],
    [{ branch: '' }, /rama/i],
  ])('rechaza release.json con %o', (override, error) => {
    const base = {
      release: '20260929T100641Z-a-12345678',
      sourceHash: HASH,
      commit: COMMIT,
      branch: 'origin/main',
      productionBase: null,
      fileCount: 1,
    };
    expect(() => buildReleaseManifest({ ...base, ...override })).toThrow(error);
  });
});

describe('identificadores de releases existentes', () => {
  it.each([
    '20260929T100641Z-el-toxico-5617951b',
    '20260831T101511Z-335534d-catalog8-beats-r2',
    '20260807T094206Z-d4a7bb2',
    '20260907T153330Z-audit-hd-557626f0',
  ])('acepta %s, para poder revertir a ella', (id) => {
    expect(validateReleaseId(id)).toBe(id);
  });

  it.each([
    '20260929T100641Z',
    '20260929T100641Z-x\n;id',
    '20260929T100641Z-$(id)',
    'x-20260929T100641Z',
    '20260929T100641Z-Mayus',
  ])('rechaza %j', (id) => {
    expect(() => validateReleaseId(id)).toThrow(/release/i);
  });

  it('valida la marca de tiempo de cada operación', () => {
    expect(validateStamp('20261108T120000Z')).toBe('20261108T120000Z');
    expect(() => validateStamp('2026-11-08')).toThrow(/marca/i);
  });
});

describe('rutas seguras para el shell remoto', () => {
  it('acepta rutas absolutas simples y quita la barra final', () => {
    expect(safePath('/opt/rocky035/', 'x')).toBe('/opt/rocky035');
  });

  it.each([
    'relativa',
    '/opt/x;echo INYECTADO',
    '/opt/con espacio',
    '/opt/../etc',
    '/opt/$(id)',
    "/opt/'x'",
  ])('rechaza %j', (value) => {
    expect(() => safePath(value, 'la prueba')).toThrow(/ruta/i);
  });
});

describe('argumentos de las órdenes', () => {
  const spec = { options: ['etiqueta'], flags: ['aplicar'] };

  it('lee opciones y banderas previstas', () => {
    expect(parseArgs(['--etiqueta', 'x', '--aplicar'], spec)).toEqual({
      etiqueta: 'x',
      aplicar: true,
    });
    expect(parseArgs([], spec)).toEqual({ aplicar: false });
  });

  it('rechaza argumentos desconocidos', () => {
    expect(() => parseArgs(['--commit', 'abc'], spec)).toThrow(/no reconocido/);
    expect(() => parseArgs(['suelto'], spec)).toThrow(/no reconocido/);
  });

  it('rechaza una opción sin valor', () => {
    expect(() => parseArgs(['--etiqueta'], spec)).toThrow(/valor/);
    expect(() => parseArgs(['--etiqueta', '--aplicar'], spec)).toThrow(/valor/);
  });
});

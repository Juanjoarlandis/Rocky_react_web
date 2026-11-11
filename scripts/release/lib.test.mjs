import { describe, expect, it } from 'vitest';
import {
  IMAGE_INSPECT_FORMAT,
  VERIFIED_MARK,
  buildReleaseManifest,
  buildSha256Sums,
  contentHash,
  diffSha256Sums,
  dockerArch,
  filterReleaseFiles,
  findForbiddenFiles,
  formatReleaseTimestamp,
  imageTag,
  isExcluded,
  parseArgs,
  parseDockerignore,
  parseImageInspect,
  parseSha256Sums,
  releaseId,
  safePath,
  validateImageId,
  validateLabel,
  validateReleaseId,
  validateStamp,
  verifiedMark,
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

describe('arquitectura e identidad de la imagen', () => {
  it('traduce lo que dice uname -m a la arquitectura de Docker', () => {
    expect(dockerArch('aarch64\n')).toBe('arm64');
    expect(dockerArch('x86_64')).toBe('amd64');
    expect(dockerArch('arm64')).toBe('arm64');
  });

  it.each(['riscv64', 'armv7l', '', 'aarch64; reboot', '$(reboot)', 'constructor', '__proto__'])(
    'no acepta «%s» como arquitectura',
    (machine) => {
      expect(() => dockerArch(machine)).toThrow(/arquitectura/);
    }
  );

  it('solo acepta identificadores de imagen con forma de sha256', () => {
    const id = `sha256:${'a1'.repeat(32)}`;
    expect(validateImageId(`${id}\n`)).toBe(id);
    for (const bad of ['', 'rocky035:latest', `${id}; rm -rf /`, `sha256:${'g'.repeat(64)}`]) {
      expect(() => validateImageId(bad)).toThrow(/no válido/);
    }
  });

  it('la marca de verificación dice imagen, arquitectura y número de ficheros, y nada más', () => {
    const image = `sha256:${'a1'.repeat(32)}`;
    expect(VERIFIED_MARK).toBe('imagen-verificada.txt');
    expect(verifiedMark({ image, architecture: 'arm64', files: 1500 })).toBe(`${image} arm64 1500`);
    expect(() => verifiedMark({ image, architecture: 'arm64', files: 0 })).toThrow();
    expect(() => verifiedMark({ image, architecture: "arm64'; reboot", files: 3 })).toThrow();
    expect(() =>
      verifiedMark({ image: "x' > /etc/passwd", architecture: 'arm64', files: 3 })
    ).toThrow();
  });
});

describe('huellas del contenido de la imagen', () => {
  const a = 'a'.repeat(64);
  const b = 'b'.repeat(64);

  it('lee la salida de sha256sum, también en modo binario y con espacios en la ruta', () => {
    const sums = parseSha256Sums(`${a}  ./dist/index.html\n${b} *./dist/con espacio.js\n`);
    expect([...sums]).toEqual([
      ['./dist/index.html', a],
      ['./dist/con espacio.js', b],
    ]);
  });

  it('una línea que no es una huella es un error, no se ignora', () => {
    expect(() => parseSha256Sums(`${a}  ./x\nsha256sum: ./y: Permiso denegado\n`)).toThrow(
      /no reconocida/
    );
  });

  it('idénticas: sin diferencias, sea cual sea el orden', () => {
    expect(diffSha256Sums(`${a}  ./x\n${b}  ./y\n`, `${b}  ./y\n${a}  ./x`)).toEqual([]);
  });

  it('nombra lo que no coincide, lo que falta y lo que sobra', () => {
    expect(
      diffSha256Sums(`${a}  ./x\n${b}  ./y\n${a}  ./z`, `${b}  ./x\n${a}  ./z\n${a}  ./w`)
    ).toEqual(['falta ./y', 'no coincide ./x', 'sobra ./w']);
  });
});

describe('huella de una imagen', () => {
  const id = `sha256:${'a1'.repeat(32)}`;
  const lines = (overrides = {}) => {
    const image = {
      layers: [`sha256:${'c1'.repeat(32)}`],
      entrypoint: null,
      cmd: ['node', 'server/index.mjs'],
      env: ['A=1 con espacios'],
      user: 'node',
      workdir: '/app',
      healthcheck: { Test: ['CMD', 'bash'], Interval: 30 },
      ...overrides,
    };
    return [
      `arm64 ${id}`,
      ...[
        image.layers,
        image.entrypoint,
        image.cmd,
        image.env,
        image.user,
        image.workdir,
        image.healthcheck,
      ].map((field) => JSON.stringify(field)),
    ].join('\n');
  };

  it('la plantilla es fija: una línea de arquitectura e identificador y una de JSON por campo', () => {
    expect(IMAGE_INSPECT_FORMAT.split('{{"\\n"}}')).toEqual([
      '{{.Architecture}} {{.Id}}',
      '{{json .RootFS.Layers}}',
      '{{json .Config.Entrypoint}}',
      '{{json .Config.Cmd}}',
      '{{json .Config.Env}}',
      '{{json .Config.User}}',
      '{{json .Config.WorkingDir}}',
      '{{json .Config.Healthcheck}}',
    ]);
    // Va entre comillas simples en una orden de shell: no puede llevar ninguna
    expect(IMAGE_INSPECT_FORMAT).not.toContain("'");
  });

  it('lee arquitectura, identificador y huella', () => {
    const parsed = parseImageInspect(`${lines()}\n`);
    expect(parsed.architecture).toBe('arm64');
    expect(parsed.id).toBe(id);
    expect(parsed.fingerprint).toContain('server/index.mjs');
  });

  it('la huella no depende del orden en que Docker escriba las claves', () => {
    const reordered = lines({ healthcheck: { Interval: 30, Test: ['CMD', 'bash'] } });
    expect(parseImageInspect(reordered).fingerprint).toBe(parseImageInspect(lines()).fingerprint);
  });

  it.each([
    ['otra capa', { layers: [`sha256:${'c9'.repeat(32)}`] }],
    ['otro orden de capas', { layers: [`sha256:${'c2'.repeat(32)}`, `sha256:${'c1'.repeat(32)}`] }],
    ['otra orden', { cmd: ['sh'] }],
    ['otro usuario', { user: 'root' }],
    ['una entrada', { entrypoint: ['sh', '-c'] }],
  ])('sí cambia con %s', (_what, change) => {
    expect(parseImageInspect(lines(change)).fingerprint).not.toBe(
      parseImageInspect(
        lines({ layers: [`sha256:${'c1'.repeat(32)}`, `sha256:${'c2'.repeat(32)}`] })
      ).fingerprint
    );
    expect(parseImageInspect(lines(change)).fingerprint).not.toBe(
      parseImageInspect(lines()).fingerprint
    );
  });

  it.each([
    ['vacía', ''],
    ['sin identificador válido', lines().replace(id, 'rocky035:latest')],
    ['con una línea de menos', lines().split('\n').slice(0, 7).join('\n')],
    ['con una línea que no es JSON', lines().replace('"node"', 'node')],
    ['sin capas', lines({ layers: [] })],
    ['con algo más en la primera línea', lines().replace(`arm64 ${id}`, `arm64 ${id} extra`)],
  ])('una respuesta %s es un error', (_what, text) => {
    expect(() => parseImageInspect(text)).toThrow(/no se reconoce|no válido/i);
  });
});

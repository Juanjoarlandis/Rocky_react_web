import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IMAGE_INSPECT_FORMAT, parseImageInspect } from './lib.mjs';
import { prepareRelease } from './preparar.mjs';

const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function write(dir, file, content) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
}

let tmp;
let origin;
let repo;

const IMAGE_ID = `sha256:${'ab'.repeat(32)}`;
// Lo que dice `docker image inspect` de la imagen: una línea con arquitectura e
// identificador y una de JSON por campo de la huella (capas y arranque).
const IMAGE = {
  layers: [`sha256:${'c1'.repeat(32)}`, `sha256:${'c2'.repeat(32)}`],
  entrypoint: ['docker-entrypoint.sh'],
  cmd: ['node', 'server/index.mjs'],
  env: ['NODE_ENV=production', 'NODE_OPTIONS=--max-old-space-size=64 --max-semi-space-size=4'],
  user: 'node',
  workdir: '/app',
  healthcheck: {
    Test: ['CMD', 'bash', 'scripts/healthcheck.sh'],
    Interval: 30000000000,
    Retries: 3,
  },
};
const inspected = (arch, id = IMAGE_ID, image = IMAGE) =>
  [
    `${arch} ${id}`,
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
// Lo que hay en /app dentro de la imagen, con el formato de sha256sum.
const APP_SUMS = [
  `${'1'.repeat(64)}  ./dist/index.html`,
  `${'2'.repeat(64)}  ./node_modules/express/index.js`,
  `${'3'.repeat(64)}  ./server/index.mjs`,
  // El binario de Node de la imagen base: el que la Raspberry leyó dañado en noviembre de 2026
  `${'4'.repeat(64)}  /usr/local/bin/node`,
].join('\n');

/* La Raspberry de mentira. `machine` es su `uname -m`; `image` lo que diría
   `docker image inspect` de la imagen cargada; `appSums` lo que hay dentro de
   ella; `failOn` hace fallar la orden que contenga ese texto. */
function fakeRemote({
  current = '/opt/rocky035/releases/20260929T100641Z-el-toxico-5617951b',
  machine = 'aarch64',
  image = inspected('arm64'),
  appSums = APP_SUMS,
  failOn = null,
} = {}) {
  const calls = [];
  return {
    calls,
    host: 'prueba',
    async read(command) {
      calls.push({ kind: 'read', command });
      if (command.startsWith('readlink')) return `${current}\n`;
      if (command.startsWith('df')) return '12000000\n';
      if (command.startsWith('ls -1')) return '44\n';
      if (command === 'uname -m') return `${machine}\n`;
      if (command.startsWith('docker image inspect')) return `${image}\n`;
      if (command.startsWith('docker run')) return `${appSums}\n`;
      return '';
    },
    async run(command) {
      calls.push({ kind: 'run', command });
      if (failOn && command.includes(failOn)) throw new Error(`Falló en prueba: ${command}`);
    },
    async upload(localDir, remoteDir) {
      // El paquete se inspecciona aquí: después se borra la carpeta temporal.
      const listing = execFileSync('find', ['.', '-type', 'f'], { cwd: localDir, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .sort();
      const optional = (file) =>
        fs.existsSync(path.join(localDir, file))
          ? fs.readFileSync(path.join(localDir, file), 'utf8')
          : null;
      calls.push({
        kind: 'upload',
        localDir,
        remoteDir,
        listing,
        manifest: fs.readFileSync(path.join(localDir, 'release.json'), 'utf8'),
        imageSums: optional('IMAGEN-SHA256SUMS'),
        transferSum: optional('imagen.tar.gz.sha256'),
      });
    },
  };
}

/* El Docker del equipo del operador, de mentira: apunta lo que se le pide en
   la misma lista que la Raspberry, para poder comprobar el orden entre los dos. */
function fakeDocker(remote, { buildFails = false, appSums = APP_SUMS, image = IMAGE } = {}) {
  const note = (call) => remote.calls.push({ kind: 'docker', ...call });
  return {
    async check() {
      note({ step: 'check' });
    },
    async build({ context, tag, platform }) {
      note({ step: 'build', tag, platform, hasDockerfile: fs.existsSync(`${context}/Dockerfile`) });
      if (buildFails) throw new Error('Las pruebas han fallado durante la construcción.');
    },
    async contentSums(tag) {
      note({ step: 'sums', tag });
      return appSums;
    },
    async fingerprint(tag) {
      note({ step: 'fingerprint', tag });
      // El Docker local da los mismos datos, con las claves en el orden que quiera
      const { Retries, Interval, Test } = image.healthcheck;
      const reordered = { ...image, healthcheck: { Retries, Interval, Test } };
      return parseImageInspect(inspected('amd64', IMAGE_ID, reordered)).fingerprint;
    },
    async save(tag, file) {
      note({ step: 'save', tag, file: path.basename(file) });
      fs.writeFileSync(file, 'imagen de mentira');
      return 'f'.repeat(64);
    },
    async remove(tag) {
      note({ step: 'remove', tag });
    },
  };
}

const okScan = async () => ({ ok: true, output: 'limpio' });
const changing = (remote) => remote.calls.filter((c) => c.kind !== 'read');
// Lo que cambia algo en la Raspberry (sin las lecturas ni el Docker local).
const onRaspberry = (remote) => remote.calls.filter((c) => c.kind === 'run' || c.kind === 'upload');
const tmpDirs = () =>
  fs.readdirSync(os.tmpdir()).filter((d) => d.startsWith('rocky-release-')).length;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rocky-prep-test-'));
  origin = path.join(tmp, 'origin.git');
  repo = path.join(tmp, 'repo');
  git(tmp, 'init', '--bare', '-q', '-b', 'main', origin);
  git(tmp, 'clone', '-q', origin, repo);
  git(repo, 'config', 'user.email', 'pruebas@ejemplo.es');
  git(repo, 'config', 'user.name', 'Pruebas');
  write(repo, '.dockerignore', 'docs\n*.md\n.env\n.env.*\n!.env.example\nab.txt\n');
  write(repo, 'Dockerfile', 'FROM scratch\n');
  write(repo, 'src/App.jsx', 'export default 1;\n');
  write(repo, 'docs/nota.md', '# fuera\n');
  write(repo, '.env.example', 'PORT=3001\n');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'inicial');
  git(repo, 'push', '-q', 'origin', 'main');
});

afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('preparar una release', () => {
  it('con un commit subido y el árbol limpio, construye la release en simulacro sin tocar la Raspberry', async () => {
    const remote = fakeRemote();
    const before = tmpDirs();
    const plan = await prepareRelease(
      { cwd: repo, label: 'prueba', apply: false, now: new Date('2026-11-08T12:00:00Z') },
      { remote, secretScan: okScan }
    );
    expect(plan.manifest.commit).toBe(git(repo, 'rev-parse', 'HEAD'));
    expect(plan.manifest.branch).toBe('main');
    expect(plan.manifest.fileCount).toBe(4);
    expect(plan.files).toEqual(['.dockerignore', '.env.example', 'Dockerfile', 'src/App.jsx']);
    expect(plan.manifest.release).toMatch(/^20261108T120000Z-prueba-[0-9a-f]{8}$/);
    expect(plan.manifest.productionBase).toBe('20260929T100641Z-el-toxico-5617951b');
    expect(plan.steps[0]).toMatch(/MB libres.*44 releases/);
    expect(changing(remote)).toEqual([]);
    expect(tmpDirs()).toBe(before);
  });

  it('aborta sin contactar con la Raspberry si el commit no está en ninguna rama de origin', async () => {
    write(repo, 'src/App.jsx', 'export default 2;\n');
    git(repo, 'commit', '-q', '-am', 'solo local');
    const remote = fakeRemote();
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba', apply: true }, { remote, secretScan: okScan })
    ).rejects.toThrow(/no está en el remoto/);
    expect(remote.calls).toEqual([]);
  });

  it('no acepta un commit que solo está en otro remoto', async () => {
    const other = path.join(tmp, 'otro.git');
    git(tmp, 'init', '--bare', '-q', '-b', 'main', other);
    git(repo, 'remote', 'add', 'otro', other);
    write(repo, 'src/App.jsx', 'export default 5;\n');
    git(repo, 'commit', '-q', '-am', 'solo en otro');
    git(repo, 'push', '-q', 'otro', 'HEAD:main');
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba' }, { remote: fakeRemote(), secretScan: okScan })
    ).rejects.toThrow(/no está en el remoto/);
  });

  it('no acepta una rama que ya se borró en origin', async () => {
    git(repo, 'checkout', '-q', '-b', 'feature');
    write(repo, 'src/App.jsx', 'export default 6;\n');
    git(repo, 'commit', '-q', '-am', 'en feature');
    git(repo, 'push', '-q', 'origin', 'feature');
    const otherClone = path.join(tmp, 'otro-clon');
    git(tmp, 'clone', '-q', origin, otherClone);
    git(otherClone, 'push', '-q', 'origin', '--delete', 'feature');
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba' }, { remote: fakeRemote(), secretScan: okScan })
    ).rejects.toThrow(/no está en el remoto/);
  });

  it('aborta y lista los ficheros si el árbol tiene cambios sin commit', async () => {
    write(repo, 'src/App.jsx', 'export default 3;\n');
    write(repo, 'nuevo.txt', 'x\n');
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba' }, { remote: fakeRemote(), secretScan: okScan })
    ).rejects.toThrow(/cambios sin commit[\s\S]*src\/App\.jsx[\s\S]*nuevo\.txt/);
  });

  it('aborta si el commit versiona un .env distinto de .env.example', async () => {
    write(repo, 'server/.env', 'SECRETO=1\n');
    // -f: el .gitignore global de la máquina puede ignorar .env.
    git(repo, 'add', '-f', 'server/.env');
    git(repo, 'commit', '-q', '-m', 'con env');
    git(repo, 'push', '-q', 'origin', 'main');
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba' }, { remote: fakeRemote(), secretScan: okScan })
    ).rejects.toThrow(/server\/\.env/);
  });

  it('trata los nombres de fichero de forma literal, también los no ASCII y los que parecen patrones', async () => {
    write(repo, 'src/canción.txt', 'a\n');
    write(repo, 'a[b].txt', 'b\n');
    write(repo, 'ab.txt', 'excluido por .dockerignore\n');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'nombres raros');
    git(repo, 'push', '-q', 'origin', 'main');
    const remote = fakeRemote();
    const plan = await prepareRelease(
      { cwd: repo, label: 'prueba', apply: true },
      { remote, docker: fakeDocker(remote), secretScan: okScan }
    );
    expect(plan.files).toEqual(expect.arrayContaining(['src/canción.txt', 'a[b].txt']));
    const upload = onRaspberry(remote)[0];
    expect(upload.listing).toContain('./src/canción.txt');
    expect(upload.listing).toContain('./a[b].txt');
    expect(upload.listing).not.toContain('./ab.txt');
  });

  it('aborta sin subir nada si el escáner de secretos falla', async () => {
    const remote = fakeRemote();
    const badScan = async () => ({ ok: false, output: 'posible credencial en src/App.jsx' });
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba', apply: true }, { remote, secretScan: badScan })
    ).rejects.toThrow(/secretos/);
    expect(changing(remote)).toEqual([]);
  });

  it('aborta si no reconoce la release activa', async () => {
    const remote = fakeRemote({ current: '/opt/rocky035/releases/cosa-rara' });
    await expect(
      prepareRelease({ cwd: repo, label: 'prueba', apply: true }, { remote, secretScan: okScan })
    ).rejects.toThrow(/No se reconoce la release activa/);
    expect(changing(remote)).toEqual([]);
  });

  it('exige publicar el commit que está en HEAD', async () => {
    const first = git(repo, 'rev-parse', 'HEAD');
    write(repo, 'src/App.jsx', 'export default 4;\n');
    git(repo, 'commit', '-q', '-am', 'otro');
    git(repo, 'push', '-q', 'origin', 'main');
    await expect(
      prepareRelease(
        { cwd: repo, label: 'prueba', commit: first },
        { remote: fakeRemote(), secretScan: okScan }
      )
    ).rejects.toThrow(/HEAD/);
  });

  it('rechaza una etiqueta o una raíz no válidas antes de hacer nada', async () => {
    const remote = fakeRemote();
    await expect(
      prepareRelease(
        { cwd: repo, label: 'Mala Etiqueta', apply: true },
        { remote, secretScan: okScan }
      )
    ).rejects.toThrow(/etiqueta/i);
    await expect(
      prepareRelease(
        { cwd: repo, label: 'ok', root: '/opt/x;echo INYECTADO' },
        { remote, secretScan: okScan }
      )
    ).rejects.toThrow(/ruta/i);
    expect(remote.calls).toEqual([]);
  });
});

/* despliegue-ligero: la imagen se construye en el equipo del operador, viaja
   con su huella y solo queda marcada como verificada si en la Raspberry es de
   su arquitectura y lleva dentro los mismos ficheros. */
describe('preparar: construir fuera, enviar y verificar', () => {
  const prepare = (remote, docker, extra = {}) =>
    prepareRelease(
      { cwd: repo, label: 'prueba', apply: true, ...extra },
      { remote, docker, secretScan: okScan }
    );
  const steps = (remote) =>
    changing(remote).map((call) =>
      call.kind === 'docker'
        ? `local:${call.step}`
        : call.kind === 'upload'
          ? 'subir'
          : call.command
    );

  it('con --aplicar construye en local, envía la imagen con su huella, la verifica y la marca, en ese orden', async () => {
    const remote = fakeRemote();
    const before = tmpDirs();
    const plan = await prepare(remote, fakeDocker(remote));
    const release = plan.manifest.release;
    const dir = `/opt/rocky035/releases/${release}`;
    const tag = `rocky035:${release}`;

    expect(steps(remote)).toEqual([
      'local:check',
      'local:build',
      'local:sums',
      'local:fingerprint',
      'local:save',
      'subir',
      `cd ${dir} && sha256sum -c --quiet SHA256SUMS`,
      `cd ${dir} && sha256sum -c --quiet imagen.tar.gz.sha256`,
      `docker load -q -i ${dir}/imagen.tar.gz`,
      `rm -f ${dir}/imagen.tar.gz`,
      `printf '%s\\n' '${IMAGE_ID} arm64 4' > ${dir}/imagen-verificada.txt`,
      'local:remove',
    ]);
    const build = remote.calls.find((call) => call.step === 'build');
    // Se construye desde el paquete del commit, no desde el árbol de trabajo
    expect(build).toMatchObject({ tag, platform: 'linux/arm64', hasDockerfile: true });
    const upload = remote.calls.find((call) => call.kind === 'upload');
    expect(upload.listing).toEqual([
      './.dockerignore',
      './.env.example',
      './Dockerfile',
      './IMAGEN-SHA256SUMS',
      './SHA256SUMS',
      './imagen.tar.gz',
      './imagen.tar.gz.sha256',
      './release.json',
      './src/App.jsx',
    ]);
    expect(upload.imageSums).toBe(`${APP_SUMS}\n`);
    expect(upload.transferSum).toBe(`${'f'.repeat(64)}  imagen.tar.gz\n`);
    // Arquitectura e identidad se leen de la imagen ya cargada, y su contenido también
    const reads = remote.calls.filter((call) => call.kind === 'read').map((call) => call.command);
    expect(reads).toContain(`docker image inspect ${tag} --format '${IMAGE_INSPECT_FORMAT}'`);
    expect(reads.some((command) => command.startsWith(`docker run --rm --network none`))).toBe(
      true
    );
    expect(plan.verified).toEqual({ image: IMAGE_ID, architecture: 'arm64', files: 4 });
    expect(tmpDirs()).toBe(before);
  });

  it('en producción no se ejecuta ningún docker build', async () => {
    const remote = fakeRemote();
    await prepare(remote, fakeDocker(remote));

    expect(remote.calls.some((call) => /docker\s+(buildx\s+)?build/.test(call.command ?? ''))).toBe(
      false
    );
  });

  it('en simulacro no construye ni sube nada, y enseña la arquitectura de destino', async () => {
    const remote = fakeRemote({ machine: 'x86_64' });
    const plan = await prepareRelease(
      { cwd: repo, label: 'prueba' },
      { remote, docker: fakeDocker(remote), secretScan: okScan }
    );

    // Solo comprueba que el Docker local puede construir
    expect(changing(remote).map((call) => call.step)).toEqual(['check']);
    expect(plan.applied).toBe(false);
    expect(plan.steps.join('\n')).toMatch(/linux\/amd64/);
    expect(plan.steps.join('\n')).toMatch(/docker buildx build --platform linux\/amd64 --load/);
    expect(plan.steps.join('\n')).toMatch(/imagen-verificada\.txt/);
  });

  it('si las pruebas fallan durante la construcción, no se sube nada', async () => {
    const remote = fakeRemote();

    await expect(prepare(remote, fakeDocker(remote, { buildFails: true }))).rejects.toThrow(
      /pruebas han fallado/
    );
    expect(onRaspberry(remote)).toEqual([]);
  });

  it('no reconoce la arquitectura de producción: aborta antes de construir', async () => {
    const remote = fakeRemote({ machine: 'riscv64' });

    await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(/arquitectura.*riscv64/i);
    expect(changing(remote)).toEqual([]);
  });

  it('si la huella del fichero recibido no coincide, aborta, no carga la imagen y borra el fichero', async () => {
    const remote = fakeRemote({ failOn: 'imagen.tar.gz.sha256' });
    const plan = prepare(remote, fakeDocker(remote));

    await expect(plan).rejects.toThrow(/no ha llegado íntegra/);
    const commands = onRaspberry(remote).map((call) => call.command ?? 'subir');
    expect(commands.some((command) => command.startsWith('docker load'))).toBe(false);
    expect(commands.at(-1)).toMatch(/^rm -f \/opt\/rocky035\/releases\/[^ ]+\/imagen\.tar\.gz$/);
    expect(commands.some((command) => command.includes('imagen-verificada'))).toBe(false);
  });

  it.each([
    ['la copia del código llega dañada', 'SHA256SUMS'],
    ['docker load falla', 'docker load'],
  ])('si %s, el fichero de la imagen tampoco se queda en la Raspberry', async (_what, failOn) => {
    const remote = fakeRemote({ failOn });

    await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(/Falló en prueba/);
    const commands = onRaspberry(remote).map((call) => call.command ?? 'subir');
    expect(commands.at(-1)).toMatch(/^rm -f \/opt\/rocky035\/releases\/[^ ]+\/imagen\.tar\.gz$/);
    expect(commands.some((command) => command.includes('imagen-verificada'))).toBe(false);
  });

  it('el fichero de la imagen se borra una sola vez cuando todo va bien', async () => {
    const remote = fakeRemote();
    await prepare(remote, fakeDocker(remote));

    expect(
      onRaspberry(remote).filter((call) => (call.command ?? '').startsWith('rm -f')).length
    ).toBe(1);
  });

  it('el binario de Node de la imagen base también se compara: es el que se leyó dañado', async () => {
    const remote = fakeRemote({ appSums: APP_SUMS.replace('4'.repeat(64), '0'.repeat(64)) });

    await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(/\/usr\/local\/bin\/node/);
    const sums = remote.calls.find((call) => (call.command ?? '').startsWith('docker run'));
    expect(sums.command).toContain('sha256sum /usr/local/bin/node');
    expect(remote.calls.some((call) => (call.command ?? '').includes('imagen-verificada'))).toBe(
      false
    );
  });

  it('si un fichero de la imagen tiene otra huella en producción, lo nombra y no deja marca', async () => {
    const damaged = APP_SUMS.replace('3'.repeat(64), '9'.repeat(64));
    const remote = fakeRemote({ appSums: damaged });

    await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(/\.\/server\/index\.mjs/);
    expect(remote.calls.some((call) => (call.command ?? '').includes('imagen-verificada'))).toBe(
      false
    );
  });

  it('un fichero que falta o que sobra en la imagen cargada también es un fallo', async () => {
    const missing = fakeRemote({
      appSums: APP_SUMS.split('\n')
        .filter((line) => !line.includes('./server/index.mjs'))
        .join('\n'),
    });
    await expect(prepare(missing, fakeDocker(missing))).rejects.toThrow(
      /falta.*\.\/server\/index\.mjs/
    );

    const extra = fakeRemote({ appSums: `${APP_SUMS}\n${'7'.repeat(64)}  ./server/intruso.mjs` });
    await expect(prepare(extra, fakeDocker(extra))).rejects.toThrow(
      /sobra.*\.\/server\/intruso\.mjs/
    );
  });

  it('si la imagen cargada es de otra arquitectura, error y sin marca', async () => {
    const remote = fakeRemote({ image: inspected('amd64') });

    await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(/amd64.*arm64/);
    expect(remote.calls.some((call) => (call.command ?? '').includes('imagen-verificada'))).toBe(
      false
    );
  });

  it.each([
    ['otra capa', { layers: [IMAGE.layers[0], `sha256:${'ee'.repeat(32)}`] }],
    ['una capa de más', { layers: [...IMAGE.layers, `sha256:${'ee'.repeat(32)}`] }],
    ['otra orden de arranque', { cmd: ['node', 'otro.mjs'] }],
    ['otro usuario', { user: 'root' }],
    ['otro entorno', { env: [...IMAGE.env, 'NODE_OPTIONS=--inspect=0.0.0.0'] }],
    ['otra sonda', { healthcheck: { ...IMAGE.healthcheck, Test: ['NONE'] } }],
  ])(
    'si la imagen cargada tiene %s que la que se construyó, error y sin marca',
    async (_what, change) => {
      const remote = fakeRemote({ image: inspected('arm64', IMAGE_ID, { ...IMAGE, ...change }) });

      await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(
        /no es la que se construyó/
      );
      expect(remote.calls.some((call) => (call.command ?? '').includes('imagen-verificada'))).toBe(
        false
      );
    }
  );

  it('el identificador puede diferir entre los dos Docker (cada uno guarda las imágenes a su modo): manda la huella', async () => {
    const otherId = `sha256:${'cd'.repeat(32)}`;
    const remote = fakeRemote({ image: inspected('arm64', otherId) });
    const plan = await prepare(remote, fakeDocker(remote));

    // La marca lleva el identificador que la imagen tiene en producción
    expect(plan.verified.image).toBe(otherId);
    expect(remote.calls.some((call) => (call.command ?? '').includes(`'${otherId} arm64 4'`))).toBe(
      true
    );
  });

  it('una respuesta de la Raspberry que no tiene la forma esperada no se da por buena', async () => {
    const remote = fakeRemote({ image: inspected('arm64', 'cualquier-cosa') });
    await expect(prepare(remote, fakeDocker(remote))).rejects.toThrow(/no válido|no se reconoce/i);
  });

  it('con --aplicar hace falta el Docker local', async () => {
    const remote = fakeRemote();

    await expect(
      prepareRelease({ cwd: repo, label: 'prueba', apply: true }, { remote, secretScan: okScan })
    ).rejects.toThrow(/Docker/);
    expect(onRaspberry(remote)).toEqual([]);
  });
});

describe('preparar: construir en producción, el último recurso', () => {
  it('con la opción, sube el código, construye allí, lo avisa y pasa la misma verificación de contenido', async () => {
    const remote = fakeRemote();
    const plan = await prepareRelease(
      { cwd: repo, label: 'prueba', apply: true, buildInProduction: true },
      { remote, docker: fakeDocker(remote), secretScan: okScan }
    );
    const release = plan.manifest.release;
    const dir = `/opt/rocky035/releases/${release}`;
    const raspberry = onRaspberry(remote).map((call) => call.command ?? 'subir');

    expect(raspberry).toEqual([
      'subir',
      `cd ${dir} && sha256sum -c --quiet SHA256SUMS`,
      `docker build -t rocky035:${release} ${dir}`,
      `printf '%s\\n' '${IMAGE_ID} arm64 4' > ${dir}/imagen-verificada.txt`,
    ]);
    // La imagen no viaja: solo sus huellas, calculadas con una build del operador
    const upload = remote.calls.find((call) => call.kind === 'upload');
    expect(upload.listing).toContain('./IMAGEN-SHA256SUMS');
    expect(upload.listing).not.toContain('./imagen.tar.gz');
    expect(remote.calls.filter((call) => call.kind === 'docker').map((call) => call.step)).toEqual([
      'check',
      'build',
      'sums',
      'remove',
    ]);
    expect(plan.steps.join('\n')).toMatch(/ÚLTIMO RECURSO/);
    expect(plan.verified).toEqual({ image: IMAGE_ID, architecture: 'arm64', files: 4 });
  });

  it('una imagen construida allí con un fichero distinto tampoco se puede promover', async () => {
    const damaged = APP_SUMS.replace('1'.repeat(64), '8'.repeat(64));
    const remote = fakeRemote({ appSums: damaged });

    await expect(
      prepareRelease(
        { cwd: repo, label: 'prueba', apply: true, buildInProduction: true },
        { remote, docker: fakeDocker(remote), secretScan: okScan }
      )
    ).rejects.toThrow(/\.\/dist\/index\.html/);
    expect(remote.calls.some((call) => (call.command ?? '').includes('imagen-verificada'))).toBe(
      false
    );
  });
});

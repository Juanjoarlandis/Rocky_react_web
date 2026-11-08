import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

function fakeRemote({
  current = '/opt/rocky035/releases/20260929T100641Z-el-toxico-5617951b',
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
      return '';
    },
    async run(command) {
      calls.push({ kind: 'run', command });
    },
    async upload(localDir, remoteDir) {
      // El paquete se inspecciona aquí: después se borra la carpeta temporal.
      const listing = execFileSync('find', ['.', '-type', 'f'], { cwd: localDir, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)
        .sort();
      calls.push({
        kind: 'upload',
        localDir,
        remoteDir,
        listing,
        manifest: fs.readFileSync(path.join(localDir, 'release.json'), 'utf8'),
      });
    },
  };
}

const okScan = async () => ({ ok: true, output: 'limpio' });
const changing = (remote) => remote.calls.filter((c) => c.kind !== 'read');
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

  it('con --aplicar sube la release, verifica la copia y construye la imagen, en ese orden', async () => {
    const remote = fakeRemote();
    const before = tmpDirs();
    const plan = await prepareRelease(
      { cwd: repo, label: 'prueba', apply: true },
      { remote, secretScan: okScan }
    );
    const [upload, verify, build] = changing(remote);
    expect(upload.kind).toBe('upload');
    expect(upload.remoteDir).toBe(`/opt/rocky035/releases/${plan.manifest.release}`);
    expect(upload.listing).toEqual([
      './.dockerignore',
      './.env.example',
      './Dockerfile',
      './SHA256SUMS',
      './release.json',
      './src/App.jsx',
    ]);
    expect(upload.manifest).toContain(plan.manifest.commit);
    expect(verify.command).toBe(
      `cd /opt/rocky035/releases/${plan.manifest.release} && sha256sum -c --quiet SHA256SUMS`
    );
    expect(build.command).toBe(
      `docker build -t rocky035:${plan.manifest.release} /opt/rocky035/releases/${plan.manifest.release}`
    );
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
      { remote, secretScan: okScan }
    );
    expect(plan.files).toEqual(expect.arrayContaining(['src/canción.txt', 'a[b].txt']));
    const upload = changing(remote)[0];
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

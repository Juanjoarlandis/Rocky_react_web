// Ejecuta de verdad el script de promoción con bash, un `docker` falso en el PATH y una
// raíz, un estado y unas copias en una carpeta temporal. Prueba la vuelta atrás.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { END_MARK, renderPromoteScript } from './promote-template.mjs';

const A = '20261108T000001Z-prueba-a-0000000a';
const B = '20261108T000002Z-prueba-b-0000000b';
const BAD = '20261108T000003Z-prueba-mala-0000000c';

// docker falso: el estado vive en $FAKE (imagen activa, imágenes existentes, imágenes que
// no arrancan). `compose up` arranca la imagen del selector salvo que esté en $FAKE/bad.
const FAKE_DOCKER = `#!/usr/bin/env bash
set -u
case "$1 $2" in
  "inspect rocky035")
    if [[ "$*" == *Active=* ]]; then echo "Active=$(cat "$FAKE/image") Health=healthy"; else cat "$FAKE/image"; fi ;;
  "image inspect") grep -qxF "$3" "$FAKE/images" ;;
  "ps --format") echo "otro abc running" ;;
  "stop --time") echo parado > "$FAKE/estado" ;;
  "compose --env-file")
    img=$(grep '^ROCKY_IMAGE=' "$3" | cut -d= -f2)
    if grep -qxF "$img" "$FAKE/bad"; then echo "unhealthy $img" >&2; exit 1; fi
    echo "$img" > "$FAKE/image" ;;
  *) echo "docker falso: orden no prevista: $*" >&2; exit 99 ;;
esac
`;

let tmp;
let root;
let fake;
let bin;
const owner = `${process.getuid()}:${process.getgid()}`;

function setup(active = A) {
  for (const r of [A, B, BAD]) fs.mkdirSync(path.join(root, 'releases', r), { recursive: true });
  fs.symlinkSync(path.join(root, 'releases', active), path.join(root, 'current'));
  fs.writeFileSync(
    path.join(root, 'compose.env'),
    `ROCKY_IMAGE=rocky035:${active}\nCOMPOSE_PROJECT_NAME=prueba\n`
  );
  fs.writeFileSync(path.join(fake, 'image'), `rocky035:${active}\n`);
  fs.writeFileSync(
    path.join(fake, 'images'),
    [A, B, BAD].map((r) => `rocky035:${r}`).join('\n') + '\n'
  );
  fs.writeFileSync(path.join(fake, 'bad'), `rocky035:${BAD}\n`);
  fs.writeFileSync(path.join(tmp, 'state.enc'), 'estado');
}

function promote(release, previous, stamp = '20261108T120000Z') {
  const script = renderPromoteScript({
    release,
    previous,
    project: 'prueba',
    stamp,
    root,
    stateFile: path.join(tmp, 'state.enc'),
    backupsRoot: path.join(tmp, 'backups'),
    waitTimeout: 10,
    owner,
  });
  return spawnSync('bash', ['-s'], {
    input: script,
    encoding: 'utf8',
    env: { PATH: `${bin}:${process.env.PATH}`, FAKE: fake },
  });
}

const current = () => path.basename(fs.realpathSync(path.join(root, 'current')));
const active = () => fs.readFileSync(path.join(fake, 'image'), 'utf8').trim();
const selector = () => fs.readFileSync(path.join(root, 'compose.env'), 'utf8');

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rocky-promote-'));
  root = path.join(tmp, 'opt');
  fake = path.join(tmp, 'fake');
  bin = path.join(tmp, 'bin');
  fs.mkdirSync(fake, { recursive: true });
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'docker'), FAKE_DOCKER, { mode: 0o755 });
});

afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

describe('script de promoción ejecutado', () => {
  it('release sana: activa la nueva, anota la anterior y registra los servicios', () => {
    setup(A);
    const r = promote(B, A);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain(`${END_MARK}ok`);
    expect(current()).toBe(B);
    expect(active()).toBe(`rocky035:${B}`);
    expect(selector()).toBe(`ROCKY_IMAGE=rocky035:${B}\nCOMPOSE_PROJECT_NAME=prueba\n`);
    expect(fs.readFileSync(path.join(root, 'releases', B, 'anterior.txt'), 'utf8')).toBe(`${A}\n`);
    expect(fs.existsSync(path.join(root, 'releases', B, 'services-before.txt'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'releases', B, 'services-after.txt'))).toBe(true);
    // El usuario de despliegue (no root) lee estos registros: no pueden quedar en 600.
    for (const f of ['anterior.txt', 'services-before.txt', 'services-after.txt']) {
      expect(fs.statSync(path.join(root, 'releases', B, f)).mode & 0o044, f).not.toBe(0);
    }
    expect(
      fs.existsSync(
        path.join(tmp, 'backups', `deploy-${B}-20261108T120000Z`, 'pre-activation-state.enc')
      )
    ).toBe(true);
  });

  it('release que no arranca: vuelve sola a la anterior y sale con código 1', () => {
    setup(B);
    const r = promote(BAD, B);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(`${END_MARK}vuelta-atras`);
    expect(current()).toBe(B);
    expect(active()).toBe(`rocky035:${B}`);
    expect(selector()).toContain(`rocky035:${B}`);
  });

  it('estado inesperado: sale con código 2 sin tocar nada', () => {
    setup(A);
    const before = selector();
    const r = promote(B, BAD);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain(`${END_MARK}precondicion`);
    expect(r.stderr).toContain('la release activa no es');
    expect(current()).toBe(A);
    expect(selector()).toBe(before);
    expect(fs.existsSync(path.join(tmp, 'backups'))).toBe(false);
  });

  it('un current.next residual de una ejecución interrumpida no desvía current', () => {
    setup(A);
    fs.symlinkSync(path.join(root, 'releases', BAD), path.join(root, 'current.next'));
    const r = promote(B, A);
    expect(r.status, r.stderr).toBe(0);
    expect(current()).toBe(B);
  });

  it('un fallo dentro de set_current dispara la vuelta atrás (errtrace)', () => {
    setup(A);
    fs.mkdirSync(path.join(root, 'current.next', 'algo'), { recursive: true });
    const r = promote(B, A);
    expect(r.status).toBe(3);
    expect(r.stdout).toContain(`${END_MARK}vuelta-atras-fallida`);
    expect(r.stderr).toContain('La activación ha fallado');
    expect(selector()).toContain(`rocky035:${A}`);
  });

  it('volver a promover no pisa las copias ni los registros anteriores', () => {
    setup(A);
    expect(promote(B, A, '20261108T120000Z').status).toBe(0);
    expect(promote(A, B, '20261108T130000Z').status).toBe(0);
    const r = promote(B, A, '20261108T140000Z');
    expect(r.status, r.stderr).toBe(0);
    const files = fs.readdirSync(path.join(root, 'releases', B));
    expect(files).toEqual(
      expect.arrayContaining([
        'anterior.txt',
        'anterior-hasta-20261108T140000Z.txt',
        'services-before-hasta-20261108T140000Z.txt',
      ])
    );
    expect(fs.readdirSync(path.join(tmp, 'backups'))).toHaveLength(3);
  });
});

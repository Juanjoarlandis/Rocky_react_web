// Ejecuta de verdad el script de promoción con bash, un `docker` falso en el PATH y una
// raíz, un estado y unas copias en una carpeta temporal. Prueba la vuelta atrás.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    if [[ "$*" == *Active=* ]]; then echo "Active=$(cat "$FAKE/image") Health=healthy"
    elif [[ "$*" == *'{{.Image}}'* ]]; then
      # La imagen que de verdad corre: la del selector, salvo que $FAKE/swap diga otra
      if [ -f "$FAKE/swap" ]; then cat "$FAKE/swap"; else echo "sha256:$(printf '%s' "$(cat "$FAKE/image")" | sha256sum | cut -d' ' -f1)"; fi
    else cat "$FAKE/image"; fi ;;
  "image inspect")
    grep -qxF "$3" "$FAKE/images" || exit 1
    if [[ "$*" == *.Id* ]]; then echo "sha256:$(printf '%s' "$3" | sha256sum | cut -d' ' -f1)"; fi ;;
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
  // Las tres releases pasaron la verificación de `preparar` (despliegue-ligero).
  for (const r of [A, B, BAD]) verify(r);
}

// La identidad que el docker falso da a la imagen de una release.
const imageIdOf = (release) =>
  `sha256:${createHash('sha256').update(`rocky035:${release}`).digest('hex')}`;
const markOf = (release) => path.join(root, 'releases', release, 'imagen-verificada.txt');
function verify(release, id = imageIdOf(release)) {
  fs.writeFileSync(markOf(release), `${id} arm64 1500\n`);
}

function promote(release, previous, stamp = '20261108T120000Z', extra = {}) {
  const script = renderPromoteScript({
    ...extra,
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

  /* despliegue-ligero: solo se promueve una imagen que `preparar` verificó en
     esta máquina. */
  it('release sin marca de verificación: código 2 sin tocar nada', () => {
    setup(A);
    fs.rmSync(markOf(B));
    const before = selector();
    const r = promote(B, A);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain(`${END_MARK}precondicion`);
    expect(r.stderr).toContain('no está verificada');
    expect(current()).toBe(A);
    expect(active()).toBe(`rocky035:${A}`);
    expect(selector()).toBe(before);
    expect(fs.existsSync(path.join(tmp, 'backups'))).toBe(false);
  });

  it('la imagen ya no es la que se verificó (misma etiqueta, otra imagen): código 2 sin tocar nada', () => {
    setup(A);
    verify(B, `sha256:${'0'.repeat(64)}`);
    const r = promote(B, A);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('no es la que se verificó');
    expect(current()).toBe(A);
    expect(fs.existsSync(path.join(tmp, 'backups'))).toBe(false);
  });

  it('una marca que es un enlace simbólico no vale', () => {
    setup(A);
    fs.rmSync(markOf(B));
    fs.symlinkSync(markOf(A), markOf(B));
    expect(promote(B, A).status).toBe(2);
    expect(current()).toBe(A);
  });

  it('volver a una release anterior sin marca sigue funcionando', () => {
    setup(B);
    fs.rmSync(markOf(A));
    const r = promote(A, B, '20261108T120000Z', { requireVerified: false });
    expect(r.status, r.stderr).toBe(0);
    expect(current()).toBe(A);
    expect(active()).toBe(`rocky035:${A}`);
  });

  it('el límite de memoria del selector sobrevive a la promoción; lo que no tiene forma de límite, no', () => {
    setup(A);
    fs.appendFileSync(path.join(root, 'compose.env'), 'ROCKY_MEM_LIMIT=256m\nOTRA_COSA=1\n');
    expect(promote(B, A).status).toBe(0);
    expect(selector()).toBe(
      `ROCKY_IMAGE=rocky035:${B}\nCOMPOSE_PROJECT_NAME=prueba\nROCKY_MEM_LIMIT=256m\n`
    );

    fs.writeFileSync(
      path.join(root, 'compose.env'),
      `ROCKY_IMAGE=rocky035:${B}\nCOMPOSE_PROJECT_NAME=prueba\nROCKY_MEM_LIMIT=256m; reboot\n`
    );
    expect(promote(A, B, '20261108T130000Z').status).toBe(0);
    expect(selector()).toBe(`ROCKY_IMAGE=rocky035:${A}\nCOMPOSE_PROJECT_NAME=prueba\n`);
  });

  it('si la release nueva no arranca, la vuelta atrás devuelve el selector con su límite', () => {
    setup(B);
    fs.appendFileSync(path.join(root, 'compose.env'), 'ROCKY_MEM_LIMIT=256m\n');
    const before = selector();
    expect(promote(BAD, B).status).toBe(1);
    expect(selector()).toBe(before);
  });

  it('si lo que arranca no es la imagen verificada (etiqueta cambiada entre comprobar y arrancar), vuelve atrás', () => {
    setup(A);
    // El contenedor arranca, pero con otra imagen que la de la marca
    fs.writeFileSync(path.join(fake, 'swap'), `sha256:${'5'.repeat(64)}\n`);
    const r = promote(B, A);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(`${END_MARK}vuelta-atras`);
    expect(r.stderr).toContain('no es la imagen verificada');
    expect(current()).toBe(A);
    expect(selector()).toContain(`rocky035:${A}`);
  });

  it('un límite de memoria que no tiene forma de límite se descarta, y el log lo dice', () => {
    setup(A);
    fs.appendFileSync(path.join(root, 'compose.env'), 'ROCKY_MEM_LIMIT=1.5g\n');
    const r = promote(B, A);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stderr).toMatch(/ROCKY_MEM_LIMIT.*no se conserva/);
    expect(selector()).toBe(`ROCKY_IMAGE=rocky035:${B}\nCOMPOSE_PROJECT_NAME=prueba\n`);
  });
});

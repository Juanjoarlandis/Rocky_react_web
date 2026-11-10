// El Docker del equipo desde el que se publica (despliegue-ligero): construye la
// imagen para la arquitectura de producción, saca de ella las huellas de los
// ficheros de la aplicación sin ejecutarla y la exporta comprimida con su huella.
// Todo con execFile/spawn y argumentos sueltos: nada pasa por un shell.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { IMAGE_INSPECT_FORMAT, parseImageInspect } from './lib.mjs';

const read = (args) =>
  execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// Huellas de todos los ficheros normales bajo `directory`, como las da
// `find . -type f | xargs sha256sum`: «<huella>  ./ruta», ordenadas por ruta.
export function directorySums(directory) {
  const lines = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) {
        const hash = createHash('sha256')
          .update(fs.readFileSync(path.join(directory, file)))
          .digest('hex');
        lines.push([file, `${hash}  ${file}`]);
      }
    }
  };
  walk('.');
  return lines
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, line]) => line)
    .join('\n');
}

// El binario de Node de la imagen base. No es de la aplicación, pero es lo que
// la ejecuta, y es el fichero que la Raspberry leyó dañado en noviembre de
// 2026: sus huellas se comparan junto a las de /app.
export const NODE_BINARY = '/usr/local/bin/node';

// Las huellas que se comparan en producción: todo /app (rutas «./…») y el
// binario de Node (con su ruta absoluta), en el formato de sha256sum.
export function imageSums({ app, node }) {
  const hash = createHash('sha256').update(fs.readFileSync(node)).digest('hex');
  return `${directorySums(app)}\n${hash}  ${NODE_BINARY}`;
}

export function createLocalDocker() {
  return {
    // ¿Puede este equipo construir para otra plataforma? (buildx, sin emulación.)
    async check() {
      const result = spawnSync('docker', ['buildx', 'version'], { stdio: 'ignore' });
      if (result.status !== 0) {
        throw new Error(
          'Docker con buildx no está disponible en este equipo: hace falta para construir la imagen (ver docs/ops/publicar.md).'
        );
      }
    },

    // Construye `tag` desde `context` para `platform` y la deja en el Docker local.
    async build({ context, tag, platform }) {
      const result = spawnSync(
        'docker',
        ['buildx', 'build', '--platform', platform, '--load', '-t', tag, context],
        { stdio: 'inherit' }
      );
      if (result.status !== 0) {
        throw new Error(
          `La construcción de ${tag} ha fallado (código ${result.status}): no se ha subido nada.`
        );
      }
    },

    // Huellas de /app y del binario de Node dentro de la imagen, sin
    // ejecutarla: se crea un contenedor parado y se copian de él.
    async contentSums(tag) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rocky-imagen-'));
      let container = null;
      try {
        container = read(['create', tag]);
        const copy = (from, to) =>
          execFileSync('docker', ['cp', `${container}:${from}`, path.join(dir, to)], {
            stdio: ['ignore', 'ignore', 'pipe'],
          });
        copy('/app', 'app');
        copy(NODE_BINARY, 'node');
        return imageSums({ app: path.join(dir, 'app'), node: path.join(dir, 'node') });
      } finally {
        if (container) spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },

    // Capas y arranque de la imagen: lo que tiene que ser igual en producción.
    async fingerprint(tag) {
      return parseImageInspect(read(['image', 'inspect', tag, '--format', IMAGE_INSPECT_FORMAT]))
        .fingerprint;
    },

    // `docker save | gzip` a `file`; devuelve el sha256 de lo escrito.
    async save(tag, file) {
      const child = spawn('docker', ['save', tag], { stdio: ['ignore', 'pipe', 'inherit'] });
      const exited = new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('close', resolve);
      });
      const hash = createHash('sha256');
      const gzip = createGzip({ level: 1 });
      gzip.on('data', (chunk) => hash.update(chunk));
      await pipeline(child.stdout, gzip, fs.createWriteStream(file, { mode: 0o600 }));
      const code = await exited;
      if (code !== 0) throw new Error(`No se ha podido exportar ${tag} (código ${code}).`);
      return hash.digest('hex');
    },

    // La imagen local ya no hace falta: ocupa unos 280 MB por release.
    async remove(tag) {
      spawnSync('docker', ['image', 'rm', tag], { stdio: 'ignore' });
    },
  };
}

// Acceso a la Raspberry por SSH. Lecturas (read) y órdenes que cambian algo (run, upload)
// van por separado para que el simulacro pueda limitarse a las primeras.
import { execFileSync, spawnSync } from 'node:child_process';

const HOST = /^[A-Za-z0-9._][A-Za-z0-9._@-]*$/;

export function createRemote({ host = process.env.RELEASE_HOST || 'raspberry' } = {}) {
  if (!HOST.test(host)) throw new Error(`RELEASE_HOST no válido: ${host}`);
  const ssh = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '--', host];
  return {
    host,
    async read(command) {
      return execFileSync('ssh', [...ssh, command], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60_000,
      });
    },
    async run(command, { input } = {}) {
      const result = spawnSync('ssh', [...ssh, command], {
        input,
        stdio: [input ? 'pipe' : 'ignore', 'inherit', 'inherit'],
      });
      if (result.status !== 0)
        throw new Error(`Falló en ${host}: ${command} (código ${result.status})`);
    },
    async upload(localDir, remoteDir) {
      const mk = spawnSync('ssh', [...ssh, `mkdir -p ${remoteDir}`], { stdio: 'inherit' });
      if (mk.status !== 0) throw new Error(`No se pudo crear ${remoteDir} en ${host}`);
      const sync = spawnSync(
        'rsync',
        ['-a', '-e', 'ssh -o BatchMode=yes', '--', `${localDir}/`, `${host}:${remoteDir}/`],
        { stdio: 'inherit' }
      );
      if (sync.status !== 0) throw new Error(`No se pudo subir la release a ${host}:${remoteDir}`);
    },
  };
}

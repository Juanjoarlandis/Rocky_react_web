#!/usr/bin/env node
// Prepara una release desde el commit en HEAD: comprueba que está en una rama de origin y
// que el árbol está limpio, empaqueta solo lo que entra en la imagen, escribe SHA256SUMS y
// release.json y, con --aplicar, la sube a la Raspberry, verifica la copia y construye su
// imagen.
//
//   npm run release:preparar -- --etiqueta <nombre> [--aplicar]
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildReleaseManifest,
  buildSha256Sums,
  contentHash,
  filterReleaseFiles,
  findForbiddenFiles,
  imageTag,
  parseArgs,
  releaseId,
  safePath,
  validateLabel,
  validateReleaseId,
} from './lib.mjs';
import { createRemote } from './remote.mjs';

const git = (cwd, ...args) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });

// Ramas de origin (tras --prune) que contienen el commit, con main primero si está.
function originBranches(cwd, sha) {
  git(cwd, 'fetch', '--quiet', '--prune', 'origin');
  const refs = git(
    cwd,
    'for-each-ref',
    '--contains',
    sha,
    '--format=%(refname:short)',
    'refs/remotes/origin/'
  )
    .split('\n')
    .map((line) => line.trim())
    .filter((ref) => ref && ref !== 'origin' && ref !== 'origin/HEAD')
    .map((ref) => ref.replace(/^origin\//, ''));
  return [...refs.filter((ref) => ref === 'main'), ...refs.filter((ref) => ref !== 'main')];
}

export async function prepareRelease(
  { cwd, label, commit = 'HEAD', apply = false, now = new Date(), root = '/opt/rocky035' },
  { remote, secretScan }
) {
  validateLabel(label);
  const base = safePath(root, 'RELEASE_ROOT');

  const dirty = git(cwd, 'status', '--porcelain', '--untracked-files=all').trimEnd();
  if (dirty) {
    const files = dirty
      .split('\n')
      .map((line) => `  ${line.slice(3)}`)
      .join('\n');
    throw new Error(`El árbol de trabajo tiene cambios sin commit:\n${files}`);
  }
  const sha = git(cwd, 'rev-parse', '--verify', `${commit}^{commit}`).trim();
  if (sha !== git(cwd, 'rev-parse', 'HEAD').trim()) {
    throw new Error(
      `Solo se publica el commit que está en HEAD: haz checkout de ${sha} antes de preparar la release.`
    );
  }
  const branches = originBranches(cwd, sha);
  if (!branches.length) {
    throw new Error(
      `El commit ${sha} no está en el remoto (ninguna rama de origin lo contiene): súbelo a GitHub antes de publicarlo.`
    );
  }

  const all = git(cwd, 'ls-tree', '-r', '-z', '--name-only', sha).split('\0').filter(Boolean);
  const forbidden = findForbiddenFiles(all);
  if (forbidden.length)
    throw new Error(
      `El commit versiona ficheros de entorno que no pueden publicarse: ${forbidden.join(', ')}`
    );
  const dockerignore = all.includes('.dockerignore')
    ? git(cwd, 'show', `${sha}:.dockerignore`)
    : '';
  const files = filterReleaseFiles(all, dockerignore);

  const scan = await secretScan(cwd);
  if (!scan.ok)
    throw new Error(`El escáner de secretos ha fallado; no se publica nada:\n${scan.output}`);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rocky-release-'));
  try {
    const archive = execFileSync(
      'git',
      ['--literal-pathspecs', 'archive', '--format=tar', sha, '--', ...files],
      {
        cwd,
        maxBuffer: 512 * 1024 * 1024,
      }
    );
    execFileSync('tar', ['-x', '-C', dir], { input: archive });
    const sums = buildSha256Sums(
      files.map((file) => ({
        path: file,
        sha256: createHash('sha256')
          .update(fs.readFileSync(path.join(dir, file)))
          .digest('hex'),
      }))
    );
    const hash = contentHash(sums);
    const release = releaseId({ date: now, label, contentHash: hash });
    const currentRaw = path.basename((await remote.read(`readlink -f ${base}/current`)).trim());
    let productionBase;
    try {
      productionBase = validateReleaseId(currentRaw);
    } catch {
      throw new Error(
        `No se reconoce la release activa en ${base}/current («${currentRaw}»); revisa la Raspberry antes de publicar.`
      );
    }
    const free = (await remote.read(`df -Pk ${base} | awk 'NR==2{print $4}'`)).trim();
    const count = (await remote.read(`ls -1 ${base}/releases | wc -l`)).trim();
    const manifest = buildReleaseManifest({
      release,
      sourceHash: hash,
      commit: sha,
      branch: branches[0],
      productionBase,
      fileCount: files.length,
    });
    fs.writeFileSync(path.join(dir, 'SHA256SUMS'), sums);
    fs.writeFileSync(path.join(dir, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`);

    const remoteDir = `${base}/releases/${release}`;
    const verify = `cd ${remoteDir} && sha256sum -c --quiet SHA256SUMS`;
    const build = `docker build -t ${imageTag(release)} ${remoteDir}`;
    const steps = [
      `Raspberry: ${Math.round(Number(free) / 1024) || '?'} MB libres en ${base}, ${count} releases guardadas`,
      `Subir ${files.length} ficheros, SHA256SUMS y release.json a ${remote.host ?? 'la Raspberry'}:${remoteDir}`,
      verify,
      build,
    ];
    if (apply) {
      await remote.upload(dir, remoteDir);
      await remote.run(verify);
      await remote.run(build);
    }
    return { manifest, files, sums, steps, applied: apply };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function projectSecretScan(cwd) {
  const result = spawnSync(process.execPath, ['scripts/check-secrets.mjs'], {
    cwd,
    encoding: 'utf8',
  });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim() };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cwd = path.resolve(fileURLToPath(import.meta.url), '../../..');
  Promise.resolve()
    .then(() => {
      const args = parseArgs(process.argv.slice(2), { options: ['etiqueta'], flags: ['aplicar'] });
      if (!args.etiqueta) throw new Error('Falta --etiqueta <nombre>.');
      return prepareRelease(
        {
          cwd,
          label: args.etiqueta,
          apply: args.aplicar,
          root: process.env.RELEASE_ROOT || '/opt/rocky035',
        },
        { remote: createRemote(), secretScan: async (dir) => projectSecretScan(dir) }
      );
    })
    .then((plan) => {
      console.log(JSON.stringify(plan.manifest, null, 2));
      console.log(`\n${plan.applied ? 'Hecho' : 'Simulacro (añade --aplicar para ejecutarlo)'}:`);
      for (const step of plan.steps) console.log(`  - ${step}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

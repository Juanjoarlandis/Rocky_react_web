#!/usr/bin/env node
// Prepara una release desde el commit en HEAD: comprueba que está en una rama de origin y
// que el árbol está limpio, empaqueta solo lo que entra en la imagen y escribe SHA256SUMS y
// release.json. Con --aplicar construye la imagen EN ESTE EQUIPO para la arquitectura de
// la Raspberry (dependencias, pruebas y build corren aquí), la sube ya hecha con su
// huella, la carga allí y comprueba que es de su arquitectura y que lleva dentro los
// mismos ficheros que al construirla. Solo entonces deja la marca que exige `promover`.
//
//   npm run release:preparar -- --etiqueta <nombre> [--aplicar]
//
// Último recurso, si este equipo no puede construir: --construir-en-produccion hace el
// `docker build` en la Raspberry, como antes, y le pasa la misma verificación de contenido.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NODE_BINARY, createLocalDocker } from './docker.mjs';
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
  imageTag,
  parseArgs,
  parseImageInspect,
  parseSha256Sums,
  releaseId,
  safePath,
  validateLabel,
  validateReleaseId,
  verifiedMark,
} from './lib.mjs';
import { createRemote } from './remote.mjs';

// Ficheros que acompañan a la imagen en la carpeta de la release.
const IMAGE_FILE = 'imagen.tar.gz';
const IMAGE_SUMS = 'IMAGEN-SHA256SUMS';
// Cuántas diferencias se nombran en el error antes de resumir.
const MAX_DIFFERENCES = 8;

/* Comprueba en la Raspberry que la imagen cargada es de su arquitectura, que
   (si se construyó aquí) es la misma imagen, capa a capa y con el mismo
   arranque, y que los ficheros de /app que lleva dentro son los que se
   calcularon al construirla. Devuelve lo comprobado; lanza, nombrando el
   fichero, si algo no coincide. */
async function verifyImage(
  remote,
  { tag, architecture, expectedSums, expectedFingerprint = null }
) {
  const loaded = parseImageInspect(
    await remote.read(`docker image inspect ${tag} --format '${IMAGE_INSPECT_FORMAT}'`)
  );
  const loadedArch = loaded.architecture;
  if (loadedArch !== architecture) {
    throw new Error(
      `La imagen ${tag} es ${loadedArch} y la máquina de producción es ${architecture}: no se puede promover.`
    );
  }
  // El identificador es el que la imagen tiene en ESTA máquina (el que mirará
  // el script de promoción). Para saber si es la que se construyó se comparan
  // sus capas y su arranque, que no dependen de cómo guarde las imágenes cada Docker.
  const { id: image } = loaded;
  if (expectedFingerprint !== null && loaded.fingerprint !== expectedFingerprint) {
    throw new Error(
      `La imagen ${tag} cargada en producción no es la que se construyó: sus capas o su arranque no coinciden. No se ha marcado como verificada.`
    );
  }
  // La orden de docs/ops/publicar.md: las huellas de lo que hay en /app y la
  // del binario de Node, leídas dentro de la imagen, sin red y sin arrancar el
  // servidor.
  const actualSums = await remote.read(
    `docker run --rm --network none --entrypoint sh ${tag} -c 'cd /app && find . -type f -print0 | sort -z | xargs -0 sha256sum && sha256sum ${NODE_BINARY}'`
  );
  const differences = diffSha256Sums(expectedSums, actualSums);
  if (differences.length) {
    const shown = differences.slice(0, MAX_DIFFERENCES).join('; ');
    const more =
      differences.length > MAX_DIFFERENCES
        ? ` (y ${differences.length - MAX_DIFFERENCES} más)`
        : '';
    throw new Error(
      `La imagen ${tag} no lleva en producción los mismos ficheros que al construirla: ${shown}${more}. No se ha marcado como verificada.`
    );
  }
  return { image, architecture, files: parseSha256Sums(expectedSums).size };
}

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
  {
    cwd,
    label,
    commit = 'HEAD',
    apply = false,
    buildInProduction = false,
    now = new Date(),
    root = '/opt/rocky035',
  },
  { remote, docker = null, secretScan }
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
    const tag = imageTag(release);
    const architecture = dockerArch(await remote.read('uname -m'));
    const platform = `linux/${architecture}`;
    const verifyCode = `cd ${remoteDir} && sha256sum -c --quiet SHA256SUMS`;
    const verifyTransfer = `cd ${remoteDir} && sha256sum -c --quiet ${IMAGE_FILE}.sha256`;
    const load = `docker load -q -i ${remoteDir}/${IMAGE_FILE}`;
    const dropTransfer = `rm -f ${remoteDir}/${IMAGE_FILE}`;
    const remoteBuild = `docker build -t ${tag} ${remoteDir}`;
    const markFile = `${remoteDir}/${VERIFIED_MARK}`;
    const steps = [
      `Raspberry: ${Math.round(Number(free) / 1024) || '?'} MB libres en ${base}, ${count} releases guardadas; arquitectura ${platform}`,
      ...(buildInProduction
        ? [
            'ÚLTIMO RECURSO: la imagen se construye en la máquina de producción (--construir-en-produccion)',
            `En este equipo, solo como referencia de huellas: docker buildx build --platform ${platform} --load -t ${tag} <paquete>`,
            `Subir ${files.length} ficheros, SHA256SUMS, release.json e ${IMAGE_SUMS} a ${remote.host ?? 'la Raspberry'}:${remoteDir}`,
            verifyCode,
            remoteBuild,
          ]
        : [
            `En este equipo: docker buildx build --platform ${platform} --load -t ${tag} <paquete> (dependencias, pruebas y build)`,
            `En este equipo: huellas de /app dentro de la imagen (${IMAGE_SUMS}) y docker save | gzip → ${IMAGE_FILE} con su sha256`,
            `Subir ${files.length} ficheros, SHA256SUMS, release.json y la imagen a ${remote.host ?? 'la Raspberry'}:${remoteDir}`,
            verifyCode,
            verifyTransfer,
            load,
            dropTransfer,
          ]),
      `Comprobar en la Raspberry que ${tag} es ${architecture} y que /app lleva las huellas de ${IMAGE_SUMS}`,
      `Marcar la release como verificada: ${markFile}`,
    ];
    // También en simulacro: que este equipo puede construir se sabe antes de empezar.
    if (docker) await docker.check();
    let verified = null;
    if (apply) {
      if (!docker) {
        throw new Error(
          'Hace falta el Docker de este equipo para construir la imagen de la release.'
        );
      }
      let built = false;
      try {
        await docker.build({ context: dir, tag, platform });
        built = true;
        const expectedSums = await docker.contentSums(tag);
        fs.writeFileSync(path.join(dir, IMAGE_SUMS), `${expectedSums}\n`);
        let expectedFingerprint = null;
        if (!buildInProduction) {
          expectedFingerprint = await docker.fingerprint(tag);
          const transferSum = await docker.save(tag, path.join(dir, IMAGE_FILE));
          fs.writeFileSync(
            path.join(dir, `${IMAGE_FILE}.sha256`),
            `${transferSum}  ${IMAGE_FILE}\n`
          );
        }
        // El fichero de la imagen (unos 100 MB) no se queda en la Raspberry pase
        // lo que pase: se borra tras cargarlo y también si algo falla antes.
        let transferLeft = false;
        try {
          transferLeft = !buildInProduction;
          await remote.upload(dir, remoteDir);
          await remote.run(verifyCode);
          if (buildInProduction) {
            await remote.run(remoteBuild);
          } else {
            try {
              await remote.run(verifyTransfer);
            } catch {
              throw new Error(
                `La imagen no ha llegado íntegra a ${remoteDir} (su huella no coincide): no se ha cargado y el fichero se ha borrado. Vuelve a preparar la release.`
              );
            }
            await remote.run(load);
          }
        } finally {
          if (transferLeft) await remote.run(dropTransfer);
        }
        verified = await verifyImage(remote, {
          tag,
          architecture,
          expectedSums,
          expectedFingerprint,
        });
        await remote.run(`printf '%s\\n' '${verifiedMark(verified)}' > ${markFile}`);
      } finally {
        if (built) await docker.remove(tag);
      }
    }
    return { manifest, files, sums, steps, applied: apply, verified };
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
      const args = parseArgs(process.argv.slice(2), {
        options: ['etiqueta'],
        flags: ['aplicar', 'construir-en-produccion'],
      });
      if (!args.etiqueta) throw new Error('Falta --etiqueta <nombre>.');
      return prepareRelease(
        {
          cwd,
          label: args.etiqueta,
          apply: args.aplicar,
          buildInProduction: args['construir-en-produccion'],
          root: process.env.RELEASE_ROOT || '/opt/rocky035',
        },
        {
          remote: createRemote(),
          docker: createLocalDocker(),
          secretScan: async (dir) => projectSecretScan(dir),
        }
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

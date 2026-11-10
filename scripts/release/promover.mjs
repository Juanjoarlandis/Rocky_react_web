#!/usr/bin/env node
// Promueve una release ya preparada, o revierte a la anterior, en la Raspberry. Sin
// --aplicar solo lee el estado actual y muestra el script que ejecutaría.
//
// Con --aplicar el script se guarda en la carpeta de la release y se lanza desacoplado de
// la sesión SSH (sudo setsid), con su salida en un log junto a él; aquí solo se sigue ese
// log. Si la conexión se corta, la promoción y su vuelta atrás siguen en la Raspberry.
//
//   npm run release:promover -- --release <id> [--aplicar]
//   npm run release:revertir -- [--aplicar]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  VERIFIED_MARK,
  formatReleaseTimestamp,
  imageTag,
  parseArgs,
  safePath,
  validateReleaseId,
} from './lib.mjs';
import { END_MARK, renderPromoteScript } from './promote-template.mjs';
import { createRemote } from './remote.mjs';

const RESULTS = {
  ok: null,
  precondicion:
    'La promoción no ha empezado: no se cumplía una precondición (ver el log). No se ha cambiado nada.',
  'vuelta-atras': 'La release nueva no quedó sana: se ha restaurado la anterior (ver el log).',
  'vuelta-atras-fallida':
    'LA VUELTA ATRÁS HA FALLADO: revisa a mano compose.env, current y el contenedor rocky035 (ver el log).',
};

async function readState(remote, root) {
  const current = validateReleaseId(
    path.basename((await remote.read(`readlink -f ${root}/current`)).trim())
  );
  const project = (
    await remote.read(
      `docker inspect rocky035 --format '{{index .Config.Labels "com.docker.compose.project"}}'`
    )
  ).trim();
  const sudo =
    (await remote.read('sudo -n true 2>/dev/null && echo si || echo no')).trim() === 'si';
  return {
    current,
    project,
    warnings: sudo
      ? []
      : ['sudo pide contraseña en la Raspberry: --aplicar fallará (ver docs/ops/publicar.md).'],
  };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MISSING = '__NO_EXISTE__';

async function readOptional(remote, file) {
  const out = await remote.read(`if [ -e ${file} ]; then cat ${file}; else echo ${MISSING}; fi`);
  return out.trim() === MISSING ? null : out;
}

function announce({ log = console.log }, { previous, release, project, warnings }) {
  log(`${previous} → ${release} (proyecto ${project})`);
  for (const warning of warnings) log(`Aviso: ${warning}`);
}

async function execute({
  remote,
  script,
  release,
  stamp,
  root,
  log = console.log,
  sleep = wait,
  timeoutMs = 600_000,
}) {
  const dir = `${root}/releases/${release}`;
  const file = `${dir}/promover-${stamp}.sh`;
  const logFile = `${dir}/promover-${stamp}.log`;
  await remote.run(`cat > ${file}`, { input: script });
  await remote.run(`sudo -n setsid -f bash ${file} > ${logFile} 2>&1 < /dev/null`);
  let shown = 0;
  for (let waited = 0; waited <= timeoutMs; waited += 2000) {
    const text = await remote.read(`cat ${logFile}`);
    if (text.length > shown) {
      log(text.slice(shown).trimEnd());
      shown = text.length;
    }
    const match = text.match(new RegExp(`${END_MARK}([a-z-]+)`));
    if (match) {
      if (!(match[1] in RESULTS))
        throw new Error(`Resultado desconocido en ${logFile}: ${match[1]}`);
      if (RESULTS[match[1]]) throw new Error(RESULTS[match[1]]);
      return { logFile, scriptFile: file };
    }
    await sleep(2000);
  }
  throw new Error(
    `Sin resultado tras ${timeoutMs / 1000} s: la promoción puede seguir en marcha; revisa ${logFile} en la Raspberry.`
  );
}

export async function promoteRelease(
  { release, apply = false, root = '/opt/rocky035', now = new Date() },
  { remote, ...io }
) {
  validateReleaseId(release);
  const base = safePath(root, 'RELEASE_ROOT');
  const { current, project, warnings } = await readState(remote, base);
  if (release === current) throw new Error(`La release ${release} ya está activa.`);
  if (
    (await remote.read(`test -d ${base}/releases/${release} && echo si || echo no`)).trim() !== 'si'
  ) {
    throw new Error(`La release ${release} no existe en ${base}/releases: prepárala antes.`);
  }
  if (
    (
      await remote.read(
        `docker image inspect ${imageTag(release)} >/dev/null 2>&1 && echo si || echo no`
      )
    ).trim() !== 'si'
  ) {
    throw new Error(`La imagen ${imageTag(release)} no está construida en la Raspberry.`);
  }
  // Solo se promueve una imagen que `preparar` verificó en la Raspberry (su arquitectura y
  // las huellas de sus ficheros). El script lo vuelve a exigir, con la identidad de la imagen.
  const mark = await readOptional(remote, `${base}/releases/${release}/${VERIFIED_MARK}`);
  if (!mark || !/^sha256:[0-9a-f]{64} (?:arm64|amd64) \d+\n?$/.test(mark)) {
    throw new Error(
      `La imagen de ${release} no está verificada (falta ${VERIFIED_MARK} o no es válida): prepárala con release:preparar. No se ha cambiado nada.`
    );
  }
  const stamp = formatReleaseTimestamp(now);
  const script = renderPromoteScript({ release, previous: current, project, stamp, root: base });
  const plan = { release, previous: current, project, script, warnings, applied: apply };
  if (!apply) return plan;
  announce(io, plan);
  return { ...plan, ...(await execute({ remote, script, release, stamp, root: base, ...io })) };
}

export async function revertRelease(
  { apply = false, root = '/opt/rocky035', now = new Date() },
  { remote, ...io }
) {
  const base = safePath(root, 'RELEASE_ROOT');
  const { current, project, warnings } = await readState(remote, base);
  // Releases promovidas con estas órdenes: anterior.txt. Las promovidas a mano solo tienen
  // la release de partida de su release.json. Un fichero que existe y no se puede leer es un
  // error, no una ausencia: no se cae al respaldo en silencio.
  let target =
    (await readOptional(remote, `${base}/releases/${current}/anterior.txt`))?.trim() || '';
  if (!target) {
    const raw = await readOptional(remote, `${base}/releases/${current}/release.json`);
    const manifest = raw ? JSON.parse(raw) : {};
    target = typeof manifest.productionBase === 'string' ? manifest.productionBase : '';
    if (target)
      warnings.push(
        `${current} no tiene anterior.txt: se usa la release de partida de su release.json (${target}).`
      );
  }
  if (!target)
    throw new Error(
      `No hay release anterior registrada para ${current} (ni anterior.txt ni release.json).`
    );
  const release = validateReleaseId(target);
  const stamp = formatReleaseTimestamp(now);
  // Volver atrás no exige la marca de verificación: la release anterior ya estuvo en
  // producción, y las de antes de despliegue-ligero no la tienen.
  const script = renderPromoteScript({
    release,
    previous: current,
    project,
    stamp,
    root: base,
    requireVerified: false,
  });
  const plan = { release, previous: current, project, script, warnings, applied: apply };
  if (!apply) return plan;
  announce(io, plan);
  return { ...plan, ...(await execute({ remote, script, release, stamp, root: base, ...io })) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [mode, ...rest] = process.argv.slice(2);
  try {
    if (!['promover', 'revertir'].includes(mode))
      throw new Error(
        'Uso: promover.mjs promover --release <id> [--aplicar] | revertir [--aplicar]'
      );
    const args = parseArgs(
      rest,
      mode === 'promover' ? { options: ['release'], flags: ['aplicar'] } : { flags: ['aplicar'] }
    );
    if (mode === 'promover' && !args.release) throw new Error('Falta --release <id>.');
    const root = process.env.RELEASE_ROOT || '/opt/rocky035';
    const remote = createRemote();
    const task =
      mode === 'revertir'
        ? revertRelease({ apply: args.aplicar, root }, { remote })
        : promoteRelease({ release: args.release, apply: args.aplicar, root }, { remote });
    task
      .then((plan) => {
        if (!plan.applied) {
          for (const warning of plan.warnings) console.warn(`Aviso: ${warning}`);
          console.log(
            `${mode === 'revertir' ? 'Revertir' : 'Promover'}: ${plan.previous} → ${plan.release} (proyecto ${plan.project})`
          );
        }
        if (plan.applied)
          console.log(`Hecho. Script y log en ${plan.scriptFile} y ${plan.logFile}`);
        else {
          console.log(
            '\nSimulacro (añade --aplicar para ejecutarlo). Script que se ejecutaría con sudo:\n'
          );
          console.log(plan.script);
        }
      })
      .catch((error) => {
        console.error(error.message);
        process.exit(1);
      });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

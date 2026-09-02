// Regenera src/images/optimized/** a partir de una carpeta maestra con las
// imágenes originales (PNG, JPG, WebP, TIFF), conservando la estructura de
// carpetas y los anchos que ya tienen los ficheros generados.
//
//   npm run images:optimize                              # lee assets-master/
//   npm run images:optimize -- --source ~/rocky-master   # otra carpeta maestra
//   npm run images:optimize -- --dry-run                 # sólo enseña el plan
//   npm run images:optimize -- --only characters/lata-spray
//
// Regla de nombres: assets-master/<carpeta>/<nombre>.png genera
// src/images/optimized/<carpeta>/<nombre>-<ancho>.webp por cada ancho que ya
// exista para ese nombre (p. ej. characters/lata-spray-600.webp) o, si no
// hay ninguno, <nombre>.webp a tamaño maestro (o al ancho por defecto de la
// carpeta, si lo tiene). Con --width se fuerza un único ancho.
//
// sharp no es dependencia del proyecto (arrastra binarios nativos al build):
//   npm install --no-save sharp

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = 'assets-master';
const DEFAULT_OUTPUT = 'src/images/optimized';
const MASTER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff']);
// Anchos por defecto cuando una carpeta todavía no tiene salidas generadas.
const DEFAULT_WIDTH_BY_FOLDER = Object.freeze({ characters: 600 });
const DEFAULT_QUALITY = 82;

function parseArgs(argv) {
  const options = {
    source: DEFAULT_SOURCE,
    output: DEFAULT_OUTPUT,
    dryRun: false,
    only: null,
    width: null,
    quality: DEFAULT_QUALITY,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => argv[(index += 1)];
    if (argument === '--source') options.source = next();
    else if (argument === '--output') options.output = next();
    else if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--only') options.only = next();
    else if (argument === '--width') options.width = Number.parseInt(next(), 10);
    else if (argument === '--quality') options.quality = Number.parseInt(next(), 10);
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error(`Argumento desconocido: ${argument}`);
  }
  return options;
}

async function loadSharp() {
  try {
    return (await import('sharp')).default;
  } catch {
    console.error(
      'Falta sharp. Instálalo sin tocar package.json:\n\n  npm install --no-save sharp\n'
    );
    process.exit(1);
  }
  return null;
}

async function listMasters(sourceDirectory, relativeDirectory = '') {
  const absoluteDirectory = path.join(sourceDirectory, relativeDirectory);
  const entries = await fs.readdir(absoluteDirectory, { withFileTypes: true });
  const masters = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name.startsWith('.')) continue;
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      masters.push(...(await listMasters(sourceDirectory, relativePath)));
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    if (!MASTER_EXTENSIONS.has(extension)) continue;
    masters.push({
      absolutePath: path.join(sourceDirectory, relativePath),
      relativeDirectory,
      stem: path.basename(entry.name, path.extname(entry.name)),
      key: path.join(relativeDirectory, path.basename(entry.name, path.extname(entry.name))),
    });
  }
  return masters;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Salidas ya generadas para un maestro: <stem>.webp o <stem>-<ancho>.webp.
async function existingTargets(outputDirectory, master) {
  const directory = path.join(outputDirectory, master.relativeDirectory);
  let names;
  try {
    names = await fs.readdir(directory);
  } catch {
    return [];
  }
  const pattern = new RegExp(`^${escapeRegExp(master.stem)}(?:-(\\d{2,4}))?\\.webp$`);
  return names
    .map((name) => pattern.exec(name))
    .filter(Boolean)
    .map((match) => ({
      file: path.join(directory, match[0]),
      width: match[1] ? Number.parseInt(match[1], 10) : null,
    }));
}

function planTargets(outputDirectory, master, existing, forcedWidth) {
  if (forcedWidth) {
    return [
      {
        file: path.join(
          outputDirectory,
          master.relativeDirectory,
          `${master.stem}-${forcedWidth}.webp`
        ),
        width: forcedWidth,
      },
    ];
  }
  if (existing.length > 0) return existing;
  const folder = master.relativeDirectory.split(path.sep)[0];
  const width = DEFAULT_WIDTH_BY_FOLDER[folder] ?? null;
  return [
    {
      file: path.join(
        outputDirectory,
        master.relativeDirectory,
        width ? `${master.stem}-${width}.webp` : `${master.stem}.webp`
      ),
      width,
    },
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.info(
      'Uso: npm run images:optimize -- [--source dir] [--output dir] [--only carpeta/nombre] [--width N] [--quality N] [--dry-run]'
    );
    return;
  }
  const sourceDirectory = path.resolve(rootDirectory, options.source);
  const outputDirectory = path.resolve(rootDirectory, options.output);

  try {
    await fs.access(sourceDirectory);
  } catch {
    throw new Error(
      `No existe la carpeta maestra ${options.source}. Crea assets-master/ (ignorada por git) o pasa --source.`
    );
  }

  const masters = (await listMasters(sourceDirectory)).filter(
    (master) =>
      !options.only || master.key === options.only || master.key.startsWith(`${options.only}/`)
  );
  if (masters.length === 0) {
    throw new Error('No hay imágenes maestras que procesar.');
  }

  const sharp = options.dryRun ? null : await loadSharp();
  let generated = 0;
  for (const master of masters) {
    const targets = planTargets(
      outputDirectory,
      master,
      await existingTargets(outputDirectory, master),
      options.width
    );
    for (const target of targets) {
      const label = `${master.key} → ${path.relative(rootDirectory, target.file)}${
        target.width ? ` (${target.width}px)` : ' (tamaño maestro)'
      }`;
      if (options.dryRun) {
        console.info(`  [simulacro] ${label}`);
        continue;
      }
      await fs.mkdir(path.dirname(target.file), { recursive: true });
      let pipeline = sharp(master.absolutePath);
      if (target.width) {
        pipeline = pipeline.resize({ width: target.width, withoutEnlargement: true });
      }
      await pipeline.webp({ quality: options.quality, effort: 6 }).toFile(target.file);
      generated += 1;
      console.info(`  ${label}`);
    }
  }
  console.info(
    options.dryRun
      ? `\nSimulacro: ${masters.length} maestros. Nada escrito.`
      : `\nListo: ${generated} ficheros WebP regenerados a partir de ${masters.length} maestros.`
  );
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});

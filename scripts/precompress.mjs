// Deja junto a cada fichero de texto de dist/ su variante Brotli (.br) y gzip
// (.gz), para que el servidor solo tenga que elegir fichero: la compresión
// máxima se paga una vez, en el build, y no en cada petición.
//
//   npm run build        # vite build && node scripts/precompress.mjs
//
// Sin dependencias: node:zlib. Lo que ya va comprimido (imágenes, fuentes,
// audio) no se toca, y una variante que no gana nada no se escribe.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

export const COMPRESSIBLE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.txt',
]);
export const VARIANT_EXTENSIONS = Object.freeze({ br: '.br', gzip: '.gz' });

const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

async function listFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files.sort();
}

// Escribe la variante si es más pequeña que el original; si no, la retira.
async function writeVariant(file, compressed, originalLength) {
  if (compressed.length < originalLength) {
    await fs.writeFile(file, compressed);
    return compressed.length;
  }
  await fs.rm(file, { force: true });
  return originalLength;
}

const isCompressible = (file) => COMPRESSIBLE_EXTENSIONS.has(path.extname(file).toLowerCase());

export async function precompress(distDirectory) {
  const summary = { files: 0, originalBytes: 0, brotliBytes: 0, gzipBytes: 0 };
  const files = await listFiles(distDirectory);
  const present = new Set(files);
  for (const file of files) {
    // Variante de un fichero de texto que ya no está: se retira.
    const variantOf = Object.values(VARIANT_EXTENSIONS)
      .filter((suffix) => file.endsWith(suffix))
      .map((suffix) => file.slice(0, -suffix.length))
      .find(isCompressible);
    if (variantOf && !present.has(variantOf)) await fs.rm(file, { force: true });
    if (!isCompressible(file)) continue;
    const content = await fs.readFile(file);
    const [asBrotli, asGzip] = await Promise.all([
      brotli(content, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: content.length,
        },
      }),
      gzip(content, { level: 9 }),
    ]);
    summary.files += 1;
    summary.originalBytes += content.length;
    summary.brotliBytes += await writeVariant(
      `${file}${VARIANT_EXTENSIONS.br}`,
      asBrotli,
      content.length
    );
    summary.gzipBytes += await writeVariant(
      `${file}${VARIANT_EXTENSIONS.gzip}`,
      asGzip,
      content.length
    );
  }
  return summary;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const kB = (bytes) => `${(bytes / 1000).toFixed(1).replace('.', ',')} kB`;
  const summary = await precompress(path.join(root, 'dist'));
  console.info(
    `Precompresión: ${summary.files} ficheros de texto, ${kB(summary.originalBytes)} → ` +
      `${kB(summary.brotliBytes)} en Brotli y ${kB(summary.gzipBytes)} en gzip.`
  );
}

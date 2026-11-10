// Presupuesto de rendimiento: mide el dist/ recién construido y lo compara con
// los límites de scripts/performance-budget.json.
//
//   npm run build && npm run budget:check
//
// No tiene dependencias: JS y CSS se pesan con el gzip de node:zlib (nivel 9)
// y las medidas de cada imagen se leen de la cabecera del fichero.

import { realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

// Error que se cuenta al usuario tal cual, sin traza: falta el build, es de
// desarrollo o index.html carga algo que no se puede medir.
export class BudgetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BudgetError';
  }
}

const TAG_PATTERN = /<(script|link)\b([^>]*)>/gi;
const ATTRIBUTE_PATTERN = /([a-zA-Z-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
// Imports estáticos de un chunk ya minificado: `import"./a.js"`,
// `import{x}from"./a.js"` y `export{x}from"./a.js"`. Los dinámicos llevan
// paréntesis y no casan.
const STATIC_IMPORT_PATTERN =
  /\b(?:import|export)\s*(?:[\w$*{}\s,]+?\s*from\s*)?["'](\.{1,2}\/[^"']+)["']/g;
// Origen ficticio para resolver las rutas de index.html y reconocer las ajenas.
const DIST_ORIGIN = 'http://dist.invalid';
// React solo exporta esta función en su runtime de desarrollo.
const DEVELOPMENT_MARKER = 'jsxDEV';
const AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.flac',
  '.m4a',
  '.mp3',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
]);
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs']);
const SIZED_IMAGE_EXTENSIONS = new Set(['.png', '.webp']);
// Imágenes sin un tamaño en píxeles que limitar: solo se pesan.
const WEIGHED_IMAGE_EXTENSIONS = new Set(['.ico', '.svg']);
// Tipos que la web ya publica y que no tienen un límite por fichero. Cualquier
// otra extensión hace fallar la comprobación hasta que alguien le dé una
// regla: es la señal de que ha entrado un tipo de recurso nuevo (un JPEG, un
// vídeo…) que nadie está pesando.
const UNLIMITED_EXTENSIONS = new Set(['.css', '.html', '.json', '.txt', '.woff2']);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// Dónde se cambian los límites; aparece en los mensajes que piden tocarlos.
const BUDGET_FILE_LABEL = 'scripts/performance-budget.json';
// Los límites se escriben en kB (1.000 bytes, como los imprime Vite) o en píxeles.
const UNIT_SCALE = { kB: 1000, px: 1 };

const sumBytes = (items) => items.reduce((total, { bytes }) => total + bytes, 0);
const byBytes = (items) => items.map(({ file, bytes }) => ({ file, value: bytes }));

// Cada métrica es un total (`total`) o un límite por fichero (`items`); solo
// las segundas admiten excepciones.
const METRICS = [
  {
    id: 'initialJs',
    label: 'JavaScript inicial (gzip)',
    unit: 'kB',
    total: (measurement) => measurement.initialJs.bytes,
  },
  {
    id: 'initialCss',
    label: 'CSS inicial (gzip)',
    unit: 'kB',
    total: (measurement) => measurement.initialCss.bytes,
  },
  {
    id: 'deferredChunk',
    label: 'Mayor chunk diferido (gzip)',
    unit: 'kB',
    noun: 'Chunk diferido',
    scope: 'por chunk',
    items: (measurement) => byBytes(measurement.deferredJs),
  },
  {
    id: 'preloadedFonts',
    label: 'Fuentes precargadas',
    unit: 'kB',
    total: (measurement) => measurement.preloadedFonts.bytes,
  },
  {
    id: 'imageSide',
    label: 'Mayor lado de imagen',
    unit: 'px',
    noun: 'Imagen',
    scope: 'de lado',
    items: (measurement) =>
      measurement.images
        .filter(({ width }) => width !== null)
        .map(({ file, width, height }) => ({
          file,
          value: Math.max(width, height),
          text: `${width} × ${height} px`,
        })),
  },
  {
    id: 'imageWeight',
    label: 'Imagen más pesada',
    unit: 'kB',
    noun: 'Imagen',
    scope: 'por imagen',
    items: (measurement) =>
      measurement.images.map(({ file, bytes, animated }) => ({
        file,
        value: bytes,
        text: animated ? `${formatValue(bytes, 'kB')} (animación)` : undefined,
      })),
  },
  {
    id: 'imagesTotal',
    label: 'Total de imágenes',
    unit: 'kB',
    total: (measurement) => sumBytes(measurement.images),
  },
  {
    id: 'audioTrack',
    label: 'Pista de audio más pesada',
    unit: 'kB',
    noun: 'Pista',
    scope: 'por pista',
    items: (measurement) => byBytes(measurement.audio),
  },
  {
    id: 'audioTotal',
    label: 'Total de audio',
    unit: 'kB',
    total: (measurement) => sumBytes(measurement.audio),
  },
];
const METRIC_IDS = new Set(METRICS.map(({ id }) => id));
const PER_FILE_METRIC_IDS = new Set(METRICS.filter(({ items }) => items).map(({ id }) => id));

function parseAttributes(source) {
  const attributes = {};
  for (const match of source.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

// Lo que index.html hace descargar antes de pintar: sus scripts, los módulos
// y scripts que precarga, sus hojas de estilo y las fuentes precargadas.
export function parseEntryDocument(html) {
  const parsed = { scripts: [], modulePreloads: [], stylesheets: [], fontPreloads: [] };
  for (const [, tag, source] of html.replace(COMMENT_PATTERN, '').matchAll(TAG_PATTERN)) {
    const attributes = parseAttributes(source);
    if (tag.toLowerCase() === 'script') {
      if (attributes.src) parsed.scripts.push(attributes.src);
      continue;
    }
    if (!attributes.href) continue;
    const rel = new Set((attributes.rel ?? '').toLowerCase().split(/\s+/));
    const preloadAs = rel.has('preload') ? (attributes.as ?? '').toLowerCase() : '';
    if (rel.has('modulepreload') || preloadAs === 'script') {
      parsed.modulePreloads.push(attributes.href);
    }
    if (rel.has('stylesheet') || preloadAs === 'style') {
      parsed.stylesheets.push(attributes.href);
    }
    if (preloadAs === 'font') parsed.fontPreloads.push(attributes.href);
  }
  return parsed;
}

// Ruta dentro de dist/ del recurso que nombra index.html.
function resolveReference(reference) {
  const url = new URL(reference, `${DIST_ORIGIN}/`);
  if (url.origin !== DIST_ORIGIN) {
    throw new BudgetError(
      `index.html carga ${reference}, que es de otro origen y no se puede medir.`
    );
  }
  let file = null;
  try {
    file = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    // Ruta mal codificada: se trata como una que no es de dist/.
  }
  // La URL ya ha resuelto los `..` legítimos; si queda alguno, venía escondido
  // en una barra codificada y apunta fuera de dist/.
  if (file === null || file.split(/[\\/]/).includes('..')) {
    throw new BudgetError(`index.html carga ${reference}, que no es una ruta de dist/.`);
  }
  return file;
}

async function readReferenced(distDirectory, references) {
  const files = [];
  const seen = new Set();
  for (const reference of references) {
    const file = resolveReference(reference);
    if (seen.has(file)) continue;
    seen.add(file);
    try {
      files.push({ file, content: await fs.readFile(path.join(distDirectory, file)) });
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new BudgetError(`index.html carga ${file}, que no existe en dist/.`);
      }
      throw new BudgetError(
        `index.html carga ${reference}, que no se puede leer en dist/ (${error.code ?? error.message}).`
      );
    }
  }
  return files;
}

async function listFiles(directory, prefix = '') {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directory, entry.name), `${relativePath}/`)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

function requireLength(content, length) {
  if (content.length < length) throw new BudgetError('tiene la cabecera cortada');
}

const fourCharacters = (content, offset) => content.toString('latin1', offset, offset + 4);

// https://developers.google.com/speed/webp/docs/riff_container
function readWebpSize(content) {
  requireLength(content, 16);
  if (fourCharacters(content, 0) !== 'RIFF' || fourCharacters(content, 8) !== 'WEBP') {
    throw new BudgetError('no tiene la firma de un WebP');
  }
  const chunk = fourCharacters(content, 12);
  if (chunk === 'VP8 ') {
    // Con pérdida: tras la etiqueta del fotograma va el código de inicio y
    // 14 bits por lado (los dos bits altos son la escala).
    requireLength(content, 30);
    if (content[23] !== 0x9d || content[24] !== 0x01 || content[25] !== 0x2a) {
      throw new BudgetError('no tiene el código de inicio de un fotograma VP8');
    }
    return {
      width: content.readUInt16LE(26) & 0x3fff,
      height: content.readUInt16LE(28) & 0x3fff,
      animated: false,
    };
  }
  if (chunk === 'VP8L') {
    // Sin pérdida: firma 0x2f y ancho-1 y alto-1 en 14 bits cada uno.
    requireLength(content, 25);
    if (content[20] !== 0x2f) throw new BudgetError('no tiene la firma de un WebP sin pérdida');
    const bits = content.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
      animated: false,
    };
  }
  if (chunk === 'VP8X') {
    // Extendido (alfa, animación): banderas y lienzo en 24 bits por lado.
    requireLength(content, 30);
    return {
      width: content.readUIntLE(24, 3) + 1,
      height: content.readUIntLE(27, 3) + 1,
      animated: (content[20] & 0x02) !== 0,
    };
  }
  throw new BudgetError(`empieza por un bloque WebP que no se sabe leer (${chunk.trim()})`);
}

function readPngSize(content) {
  requireLength(content, 24);
  if (!content.subarray(0, 8).equals(PNG_SIGNATURE) || fourCharacters(content, 12) !== 'IHDR') {
    throw new BudgetError('no tiene la firma de un PNG');
  }
  return { width: content.readUInt32BE(16), height: content.readUInt32BE(20), animated: false };
}

// Ancho y alto en píxeles, leídos de la cabecera. Lanza BudgetError con el
// motivo (sin el nombre del fichero) si no se puede saber.
export function readImageSize(content, file) {
  const extension = path.extname(file).toLowerCase();
  if (extension === '.webp') return readWebpSize(content);
  if (extension === '.png') return readPngSize(content);
  throw new BudgetError(`es de un formato (${extension}) que la comprobación no sabe medir`);
}

const gzipBytes = (content) => zlib.gzipSync(content, { level: 9 }).length;

function weigh(files, sizeOf) {
  const weighed = files.map(({ file, content }) => ({ file, bytes: sizeOf(content) }));
  return { bytes: sumBytes(weighed), files: weighed };
}

const byWeightThenName = (a, b) => b.bytes - a.bytes || (a.file < b.file ? -1 : 1);

export async function measureBuild(distDirectory) {
  let html;
  try {
    html = await fs.readFile(path.join(distDirectory, 'index.html'), 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new BudgetError('No hay dist/index.html: ejecuta antes `npm run build`.');
  }

  const entry = parseEntryDocument(html);
  const distFiles = await listFiles(distDirectory);
  const initialScripts = await readReferenced(distDirectory, [
    ...entry.scripts,
    ...entry.modulePreloads,
  ]);
  if (!initialScripts.length) {
    throw new BudgetError('dist/index.html no carga ningún script: no parece el build de la web.');
  }

  // El navegador también descarga al abrir lo que esos scripts importan de
  // forma estática, lo precargue index.html o no. Solo se sigue lo que existe
  // en dist/, para no tomar por import un texto que lo parezca.
  const knownFiles = new Set(distFiles);
  const initialFiles = new Set(initialScripts.map(({ file }) => file));
  for (const { file, content } of initialScripts) {
    for (const [, specifier] of content.toString('utf8').matchAll(STATIC_IMPORT_PATTERN)) {
      const imported = path.posix.join(path.posix.dirname(file), specifier);
      if (initialFiles.has(imported) || !knownFiles.has(imported)) continue;
      initialFiles.add(imported);
      initialScripts.push({
        file: imported,
        content: await fs.readFile(path.join(distDirectory, imported)),
      });
    }
  }

  const developmentScript = initialScripts.find(({ content }) =>
    content.includes(DEVELOPMENT_MARKER)
  );
  if (developmentScript) {
    throw new BudgetError(
      `El build de dist/ es de desarrollo: ${developmentScript.file} contiene \`${DEVELOPMENT_MARKER}\`, ` +
        'la marca del runtime de desarrollo de React. Repite `npm run build` sin NODE_ENV=development en la shell.'
    );
  }

  const initialJs = weigh(initialScripts, gzipBytes);
  const initialCss = weigh(await readReferenced(distDirectory, entry.stylesheets), gzipBytes);
  const preloadedFonts = weigh(
    await readReferenced(distDirectory, entry.fontPreloads),
    (content) => content.length
  );

  const deferredJs = [];
  const audio = [];
  const images = [];
  const unreadableImages = [];
  const unknownFiles = [];
  for (const file of distFiles) {
    const extension = path.extname(file).toLowerCase();
    const filePath = path.join(distDirectory, file);
    if (SCRIPT_EXTENSIONS.has(extension)) {
      if (!initialFiles.has(file)) {
        deferredJs.push({ file, bytes: gzipBytes(await fs.readFile(filePath)) });
      }
    } else if (AUDIO_EXTENSIONS.has(extension)) {
      audio.push({ file, bytes: (await fs.stat(filePath)).size });
    } else if (SIZED_IMAGE_EXTENSIONS.has(extension)) {
      const content = await fs.readFile(filePath);
      try {
        images.push({ file, bytes: content.length, ...readImageSize(content, file) });
      } catch (error) {
        if (!(error instanceof BudgetError)) throw error;
        unreadableImages.push({ file, reason: error.message });
      }
    } else if (WEIGHED_IMAGE_EXTENSIONS.has(extension)) {
      const { size } = await fs.stat(filePath);
      images.push({ file, bytes: size, width: null, height: null, animated: false });
    } else if (!UNLIMITED_EXTENSIONS.has(extension) && !path.posix.basename(file).startsWith('.')) {
      unknownFiles.push({ file, bytes: (await fs.stat(filePath)).size });
    }
  }
  deferredJs.sort(byWeightThenName);

  return {
    initialJs,
    initialCss,
    deferredJs,
    preloadedFonts,
    images,
    unreadableImages,
    unknownFiles,
    audio,
  };
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isPositiveNumber = (value) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

// Errores de configuración del fichero de límites; una lista vacía si está bien.
export function validateBudget(budget) {
  if (!isPlainObject(budget) || !isPlainObject(budget.metrics)) {
    return ['El presupuesto tiene que ser un objeto con sus métricas en `metrics`.'];
  }
  const errors = [];
  for (const { id } of METRICS) {
    const entry = budget.metrics[id];
    if (!isPlainObject(entry)) {
      errors.push(`Falta la métrica ${id}.`);
    } else if (!isPositiveNumber(entry.limit)) {
      errors.push(`La métrica ${id} no declara un límite (limit) numérico.`);
    } else if (!isPositiveNumber(entry.target)) {
      errors.push(`La métrica ${id} no declara un objetivo (target) numérico.`);
    } else if (entry.limit < entry.target) {
      errors.push(
        `El límite de ${id} (${entry.limit}) está por debajo de su objetivo (${entry.target}).`
      );
    }
  }
  for (const id of Object.keys(budget.metrics)) {
    if (!METRIC_IDS.has(id)) errors.push(`La métrica ${id} no existe.`);
  }

  const exceptions = budget.exceptions ?? [];
  if (!Array.isArray(exceptions)) {
    errors.push('`exceptions` tiene que ser una lista.');
    return errors;
  }
  const declared = new Set();
  for (const exception of exceptions) {
    if (!isPlainObject(exception) || typeof exception.file !== 'string' || !exception.file) {
      errors.push('Una excepción no nombra su recurso (file).');
      continue;
    }
    const general = budget.metrics[exception.metric];
    const key = `${exception.metric} ${exception.file}`;
    if (!PER_FILE_METRIC_IDS.has(exception.metric)) {
      errors.push(
        `La excepción de ${exception.file} nombra una métrica que no va por fichero (${exception.metric}).`
      );
    } else if (!isPositiveNumber(exception.limit)) {
      errors.push(`La excepción de ${exception.file} no declara su techo (limit).`);
    } else if (typeof exception.reason !== 'string' || !exception.reason.trim()) {
      errors.push(`La excepción de ${exception.file} no declara su motivo (reason).`);
    } else if (isPositiveNumber(general?.limit) && exception.limit <= general.limit) {
      errors.push(
        `El techo de la excepción de ${exception.file} (${exception.limit}) no supera el límite general de ${exception.metric} (${general.limit}).`
      );
    } else if (declared.has(key)) {
      errors.push(`La excepción de ${exception.file} para ${exception.metric} está repetida.`);
    }
    declared.add(key);
  }
  return errors;
}

// Vite añade un hash de ocho caracteres a lo que emite en assets/; las
// excepciones nombran esos ficheros sin él para no caducar en cada build.
function logicalName(file) {
  return file.replace(/^(assets\/.+)-[A-Za-z0-9_-]{8}(\.[^./]+)$/, '$1$2');
}

function formatValue(value, unit) {
  if (unit === 'px') return `${value} px`;
  return `${(value / UNIT_SCALE.kB).toFixed(2).replace('.', ',')} kB`;
}

const largestOf = (items) =>
  items.reduce((largest, item) => (largest && largest.value >= item.value ? largest : item), null);

// Compara una medición con un presupuesto ya validado. Devuelve las filas del
// informe, las excepciones vigentes y la lista completa de fallos.
export function evaluateBudget(measurement, budget) {
  const rows = [];
  const exceptionRows = [];
  const failures = [];

  for (const metric of METRICS) {
    const { limit, target } = budget.metrics[metric.id];
    const scale = UNIT_SCALE[metric.unit];
    const limitText = `${limit} ${metric.unit}`;
    let measured;
    let file = '';

    if (metric.total) {
      measured = metric.total(measurement);
      if (measured > limit * scale) {
        failures.push(
          `${metric.label}: ${formatValue(measured, metric.unit)}, por encima de su límite de ${limitText}.`
        );
      }
    } else {
      const items = metric.items(measurement);
      const describe = (item) =>
        `${metric.noun} ${item.file}: ${item.text ?? formatValue(item.value, metric.unit)}`;
      const excepted = new Set();

      for (const exception of (budget.exceptions ?? []).filter((e) => e.metric === metric.id)) {
        const matches = items.filter((item) => logicalName(item.file) === exception.file);
        if (!matches.length) {
          failures.push(
            `La excepción de ${exception.file} (${metric.id}) nombra un recurso que no está en dist/. ` +
              `Retírala de ${BUDGET_FILE_LABEL}.`
          );
          continue;
        }
        if (matches.length > 1) {
          // Una excepción nombra un recurso concreto: si casa con varios, no
          // perdona a ninguno.
          failures.push(
            `La excepción de ${exception.file} (${metric.id}) coincide con ${matches.length} ficheros ` +
              `(${matches.map((match) => match.file).join(', ')}) y solo puede nombrar uno.`
          );
          continue;
        }
        const [worst] = matches;
        excepted.add(worst.file);
        const ceilingText = `${exception.limit} ${metric.unit} ${metric.scope}`;
        if (worst.value > exception.limit * scale) {
          failures.push(
            `${describe(worst)}, por encima del techo de su excepción (${ceilingText}).`
          );
        } else if (worst.value <= limit * scale) {
          failures.push(
            `${describe(worst)}, ya cumple el límite general de ${limitText} ${metric.scope}. ` +
              `Retira su excepción de ${BUDGET_FILE_LABEL}.`
          );
        }
        exceptionRows.push({
          file: exception.file,
          metric: metric.id,
          measured: worst.text ?? formatValue(worst.value, metric.unit),
          limit: ceilingText,
          reason: exception.reason,
        });
      }

      const general = items.filter((item) => !excepted.has(item.file));
      for (const item of general) {
        if (item.value > limit * scale) {
          failures.push(
            `${describe(item)}, por encima del límite de ${limitText} ${metric.scope}.`
          );
        }
      }
      const largest = largestOf(general);
      measured = largest?.value ?? 0;
      file = largest?.file ?? '';
    }

    // Trinquete: una mejora que deja el límite holgado más de un 10 % obliga a
    // bajarlo, hasta que llega a su objetivo. En enteros, para no depender de
    // cómo redondea 0,9.
    const proposed = Math.max(Math.ceil(measured / scale), target);
    if (limit > target && proposed < limit && measured * 10 < limit * scale * 9) {
      failures.push(
        `${metric.label}: ${formatValue(measured, metric.unit)} queda más de un 10 % por debajo de su límite de ${limitText}. ` +
          `Bájalo a ${proposed} ${metric.unit} en ${BUDGET_FILE_LABEL}.`
      );
    }

    rows.push({
      id: metric.id,
      label: metric.label,
      measured: formatValue(measured, metric.unit),
      limit: limitText,
      target: `${target} ${metric.unit}`,
      file,
    });
  }

  for (const { file, reason } of measurement.unreadableImages) {
    failures.push(`Imagen ${file}: ${reason}.`);
  }
  for (const { file, bytes } of measurement.unknownFiles) {
    const type = path.extname(file).toLowerCase() || 'sin extensión';
    failures.push(
      `${file}: es de un tipo (${type}) para el que el presupuesto no tiene regla y pesa ${formatValue(bytes, 'kB')}. ` +
        'Añade su regla a scripts/check-budget.mjs.'
    );
  }

  return { rows, exceptions: exceptionRows, failures };
}

// Tabla de métricas (medido, límite y objetivo) y excepciones vigentes.
export function formatReport({ rows, exceptions }) {
  const table = [
    ['Métrica', 'Medido', 'Límite', 'Objetivo', ''],
    ...rows.map((row) => [row.label, row.measured, row.limit, row.target, row.file]),
  ];
  const widths = [0, 1, 2, 3].map((column) => Math.max(...table.map((row) => row[column].length)));
  const lines = table.map((row) =>
    row
      .map((cell, column) => (column < widths.length ? cell.padEnd(widths[column]) : cell))
      .join('  ')
      .trimEnd()
  );
  if (exceptions.length) {
    lines.push('Excepciones con techo propio:');
    for (const exception of exceptions) {
      lines.push(
        `  ${exception.file}: ${exception.measured}, techo de ${exception.limit} — ${exception.reason}`
      );
    }
  }
  return lines.join('\n');
}

const listed = (title, items) => [title, ...items.map((item) => `- ${item}`)].join('\n');

// La comprobación entera. Devuelve el código de salida y lo que hay que
// escribir, para poder probarla sin lanzar un proceso.
export async function runBudgetCheck({ distDirectory, budgetFile }) {
  let budget;
  try {
    budget = JSON.parse(await fs.readFile(budgetFile, 'utf8'));
  } catch (error) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Error de configuración del presupuesto: no se puede leer ${BUDGET_FILE_LABEL} (${error.message}).`,
    };
  }
  const configurationErrors = validateBudget(budget);
  if (configurationErrors.length) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: listed(
        `Error de configuración del presupuesto (${BUDGET_FILE_LABEL}):`,
        configurationErrors
      ),
    };
  }

  let measurement;
  try {
    measurement = await measureBuild(distDirectory);
  } catch (error) {
    if (!(error instanceof BudgetError)) throw error;
    return {
      exitCode: 1,
      stdout: '',
      stderr: `La comprobación de presupuesto no ha medido nada: ${error.message}`,
    };
  }

  const evaluation = evaluateBudget(measurement, budget);
  const report = `Presupuesto de rendimiento de dist/:\n${formatReport(evaluation)}`;
  if (evaluation.failures.length) {
    return {
      exitCode: 1,
      stdout: report,
      stderr: listed('La comprobación de presupuesto ha fallado:', evaluation.failures),
    };
  }
  return {
    exitCode: 0,
    stdout: `${report}\nPresupuesto de rendimiento: todo dentro de sus límites.`,
    stderr: '',
  };
}

// Node resuelve los enlaces simbólicos del módulo principal pero no los de
// argv: sin realpath, llamar al script a través de un enlace no haría nada y
// terminaría en verde.
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
  const result = await runBudgetCheck({
    distDirectory: path.join(root, 'dist'),
    budgetFile: path.join(root, BUDGET_FILE_LABEL),
  });
  if (result.stdout) console.info(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.exitCode;
}

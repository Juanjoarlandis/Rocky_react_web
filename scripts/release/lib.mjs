// Lógica pura del proceso de publicación: identificadores, ficheros de la release,
// SHA256SUMS y release.json. Sin red, sin git y sin disco, para poder probarla.
import { createHash } from 'node:crypto';

const HEX64 = /^[0-9a-f]{64}$/;
const HEX40 = /^[0-9a-f]{40}$/;
const LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Cualquier release existente: «<marca UTC>-<texto en kebab-case>». Cubre el formato actual
// (…-<etiqueta>-<8 hex>) y los antiguos (…-<commit>-<etiqueta>), y es seguro para el shell.
const RELEASE = /^\d{8}T\d{6}Z-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STAMP = /^\d{8}T\d{6}Z$/;
const SAFE_PATH = /^\/[A-Za-z0-9._/-]+$/;

export function formatReleaseTimestamp(date) {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function validateLabel(label) {
  const value = String(label ?? '');
  if (!LABEL.test(value) || value.length > 40) {
    throw new Error(
      'La etiqueta debe ir en kebab-case (a-z, 0-9 y guiones) y tener como mucho 40 caracteres.'
    );
  }
  return value;
}

export function releaseId({ date, label, contentHash: hash }) {
  if (!HEX64.test(String(hash)))
    throw new Error('El hash del contenido debe tener 64 caracteres hexadecimales.');
  return `${formatReleaseTimestamp(date)}-${validateLabel(label)}-${hash.slice(0, 8)}`;
}

export function validateReleaseId(release) {
  if (!RELEASE.test(String(release ?? '')))
    throw new Error(`Identificador de release no válido: ${release}`);
  return release;
}

export function validateStamp(stamp) {
  if (!STAMP.test(String(stamp ?? ''))) throw new Error(`Marca de tiempo no válida: ${stamp}`);
  return stamp;
}

export function safePath(value, what) {
  const text = String(value ?? '');
  if (!SAFE_PATH.test(text) || text.split('/').includes('..')) {
    throw new Error(
      `Ruta no válida para ${what}: debe ser absoluta y sin espacios ni caracteres especiales.`
    );
  }
  return text.replace(/\/+$/, '') || '/';
}

// Argumentos de las órdenes: solo los previstos; una opción con valor exige el valor.
export function parseArgs(argv, { options = [], flags = [] } = {}) {
  const out = {};
  for (const flag of flags) out[flag] = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const name = arg.startsWith('--') ? arg.slice(2) : null;
    if (name && flags.includes(name)) out[name] = true;
    else if (name && options.includes(name)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--'))
        throw new Error(`Falta el valor de --${name}.`);
      out[name] = value;
      i += 1;
    } else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  return out;
}

export function imageTag(release) {
  return `rocky035:${validateReleaseId(release)}`;
}

// .dockerignore con la semántica de Docker: cada patrón se compara con la ruta y con
// sus carpetas padre; `*` y `?` no cruzan «/», `**` sí; la última regla que casa manda.
export function parseDockerignore(text) {
  return String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const negate = line.startsWith('!');
      const pattern = (negate ? line.slice(1) : line).replace(/^\/+/, '').replace(/\/+$/, '');
      return { pattern, negate };
    });
}

function globToRegExp(pattern) {
  let out = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        out += '(?:.*/)?';
        i += 2;
      } else {
        out += '.*';
        i += 1;
      }
    } else if (c === '*') out += '[^/]*';
    else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

function candidates(path) {
  const parts = path.split('/');
  return parts.map((_, i) => parts.slice(0, i + 1).join('/'));
}

export function isExcluded(path, rules) {
  let excluded = false;
  for (const { pattern, negate } of rules) {
    const re = globToRegExp(pattern);
    if (candidates(path).some((candidate) => re.test(candidate))) excluded = !negate;
  }
  return excluded;
}

const byBytes = (a, b) =>
  Buffer.from(a) < Buffer.from(b) ? -1 : Buffer.from(a) > Buffer.from(b) ? 1 : 0;

function isEnvFile(path) {
  const name = path.split('/').pop();
  return name.startsWith('.env') && name !== '.env.example';
}

export function findForbiddenFiles(paths) {
  return paths.filter(isEnvFile).sort(byBytes);
}

export function filterReleaseFiles(paths, dockerignoreText) {
  const rules = parseDockerignore(dockerignoreText);
  return paths
    .filter((path) => !path.startsWith('.git/') && path !== '.git')
    .filter((path) => !isEnvFile(path))
    .filter((path) => !isExcluded(path, rules))
    .sort(byBytes);
}

export function buildSha256Sums(entries) {
  return [...entries]
    .sort((a, b) => byBytes(a.path, b.path))
    .map(({ path, sha256 }) => {
      if (!HEX64.test(String(sha256))) throw new Error(`sha256 no válido para ${path}`);
      return `${sha256}  ${path}\n`;
    })
    .join('');
}

export function contentHash(sumsText) {
  return createHash('sha256').update(sumsText).digest('hex');
}

export function buildReleaseManifest({
  release,
  sourceHash,
  commit,
  branch,
  productionBase,
  fileCount,
}) {
  validateReleaseId(release);
  if (!HEX64.test(String(sourceHash)))
    throw new Error('El hash del contenido debe tener 64 caracteres hexadecimales.');
  if (!HEX40.test(String(commit)))
    throw new Error('El commit debe ser un SHA-1 completo de 40 caracteres.');
  if (!String(branch ?? '').trim()) throw new Error('Falta la rama remota que contiene el commit.');
  if (!Number.isInteger(fileCount) || fileCount < 1)
    throw new Error('El número de ficheros debe ser un entero positivo.');
  if (productionBase !== null && productionBase !== undefined) validateReleaseId(productionBase);
  return {
    release,
    image: imageTag(release),
    sourceHash,
    commit,
    branch,
    productionBase: productionBase ?? null,
    fileCount,
  };
}

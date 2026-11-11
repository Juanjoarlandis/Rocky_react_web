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

/* Los paquetes que `npm ci --omit=dev` instala según package-lock.json (todo lo
   que no está marcado `dev`), con su ruta bajo node_modules como nombre. */
export function productionPackages(lock) {
  return Object.entries(lock?.packages ?? {})
    .filter(([location, entry]) => location !== '' && !entry.dev)
    .map(([location, entry]) => ({
      name: location.replace(/^node_modules\//, ''),
      version: entry.version,
      entry,
    }));
}

const NATIVE_SIGNS = [
  ['os', 'os'],
  ['cpu', 'cpu'],
  ['hasInstallScript', 'script de instalación'],
  ['gypfile', 'binding nativo'],
];

/* Paquetes de producción que no son JavaScript puro: declaran sistema o
   procesador, o compilan al instalarse. La imagen se construye en la
   plataforma del operador y se copia tal cual a la de producción
   (despliegue-ligero), así que uno de estos la rompería en silencio. Devuelve
   «nombre@versión (motivo)», ordenado; vacío si todo es JavaScript. */
export function nativePackages(lock) {
  return productionPackages(lock)
    .flatMap(({ name, version, entry }) => {
      const sign = NATIVE_SIGNS.find(([key]) => entry[key]);
      return sign ? [`${name}@${version} (${sign[1]})`] : [];
    })
    .sort();
}

// Lo que dice `uname -m` en producción → la arquitectura de Docker para la imagen.
const DOCKER_ARCH = Object.freeze({
  aarch64: 'arm64',
  arm64: 'arm64',
  x86_64: 'amd64',
  amd64: 'amd64',
});

export function dockerArch(machine) {
  const name = String(machine).trim();
  const arch = Object.hasOwn(DOCKER_ARCH, name) ? DOCKER_ARCH[name] : null;
  if (!arch) {
    throw new Error(
      `No se reconoce la arquitectura de la máquina de producción («${String(machine).trim()}»): se esperaba aarch64 o x86_64.`
    );
  }
  return arch;
}

const IMAGE_ID = /^sha256:[0-9a-f]{64}$/;

export function validateImageId(id) {
  const value = String(id).trim();
  if (!IMAGE_ID.test(value)) throw new Error(`Identificador de imagen no válido: ${value}`);
  return value;
}

/* Lo que identifica a una imagen igual en cualquier Docker: sus capas (todo su
   sistema de ficheros) y cómo arranca (entrada, orden, entorno, usuario,
   carpeta y sonda). El `.Id` no sirve para comparar entre máquinas: un Docker
   con el almacén clásico da el resumen de la configuración y uno con el de
   containerd, el del manifiesto. */
const FINGERPRINT_FIELDS = Object.freeze([
  '.RootFS.Layers',
  '.Config.Entrypoint',
  '.Config.Cmd',
  '.Config.Env',
  '.Config.User',
  '.Config.WorkingDir',
  '.Config.Healthcheck',
]);

/* Plantilla de `docker image inspect --format`, fija (no lleva nada
   interpolado): una línea con la arquitectura y el identificador y una línea
   de JSON por cada campo de la huella. */
export const IMAGE_INSPECT_FORMAT = [
  '{{.Architecture}} {{.Id}}',
  ...FINGERPRINT_FIELDS.map((field) => `{{json ${field}}}`),
].join('{{"\\n"}}');

// JSON con las claves ordenadas: Docker no garantiza su orden entre versiones,
// ni siquiera entre dos plantillas en la misma máquina.
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/* Lee la salida de `docker image inspect --format IMAGE_INSPECT_FORMAT`:
   arquitectura, identificador y la huella de la imagen en forma canónica,
   comparable entre máquinas. Una salida que no tiene esa forma es un error. */
export function parseImageInspect(text) {
  const lines = String(text).trim().split('\n');
  const [architecture = '', id = '', ...rest] = (lines[0] ?? '').split(' ');
  if (rest.length || lines.length !== FINGERPRINT_FIELDS.length + 1) {
    throw new Error('No se reconoce la respuesta de docker image inspect.');
  }
  let fields;
  try {
    fields = lines.slice(1).map((line) => JSON.parse(line));
  } catch {
    throw new Error('No se reconoce la respuesta de docker image inspect.');
  }
  if (!Array.isArray(fields[0]) || fields[0].length === 0) {
    throw new Error(
      'No se reconoce la respuesta de docker image inspect: la imagen no tiene capas.'
    );
  }
  return { architecture, id: validateImageId(id), fingerprint: canonicalJson(fields) };
}

// Nombre del fichero que deja `preparar` en la carpeta de una release verificada.
export const VERIFIED_MARK = 'imagen-verificada.txt';

// «<id de imagen> <arquitectura> <n.º de ficheros>»: lo que se comprobó.
export function verifiedMark({ image, architecture, files }) {
  if (!Number.isInteger(files) || files < 1) throw new Error('Número de ficheros no válido.');
  return `${validateImageId(image)} ${dockerArch(architecture)} ${files}`;
}

/* Lee la salida de `sha256sum` («<huella>  <ruta>») a un mapa ruta → huella.
   Una línea que no tiene esa forma es un error: no se ignora nada. */
export function parseSha256Sums(text) {
  const sums = new Map();
  for (const line of String(text).split('\n')) {
    if (!line) continue;
    const match = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!match) throw new Error(`Línea de huellas no reconocida: ${line.slice(0, 120)}`);
    sums.set(match[2], match[1]);
  }
  return sums;
}

/* Compara las huellas de los ficheros de una imagen (las calculadas al
   construirla y las leídas en producción). Devuelve las diferencias, cada una
   con el nombre del fichero; vacío si son idénticas. */
export function diffSha256Sums(expectedText, actualText) {
  const expected = parseSha256Sums(expectedText);
  const actual = parseSha256Sums(actualText);
  const differences = [];
  for (const [file, hash] of expected) {
    if (!actual.has(file)) differences.push(`falta ${file}`);
    else if (actual.get(file) !== hash) differences.push(`no coincide ${file}`);
  }
  for (const file of actual.keys()) {
    if (!expected.has(file)) differences.push(`sobra ${file}`);
  }
  return differences.sort();
}

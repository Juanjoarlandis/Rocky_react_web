// EL CALENDARIO DE DROPS — qué es un drop y en qué punto está.
//
// Un drop es una colección de Shopify `rocky-drop-<slug>` con el metacampo JSON
// `rocky.drop`. Aquí no hay red ni DOM: la misma función decide el estado en el
// servidor (con su reloj) y en el navegador (con el reloj corregido por el `now`
// del servidor), así la cuenta atrás y la venta cambian a la vez. Ver
// openspec/changes/sistema-de-drops.

export const DROP_HANDLE_PREFIX = 'rocky-drop-';
export const DROP_METAFIELD = Object.freeze({ namespace: 'rocky', key: 'drop' });
export const DROP_CONFIG_VERSION = 1;
// Las últimas 48 h antes del cierre el cartel se despega.
export const LAST_HOURS_MS = 48 * 60 * 60 * 1000;
// Un drop dura como poco una hora: menos sería un error al escribir la fecha.
export const MIN_DROP_MS = 60 * 60 * 1000;

export const DROP_STATES = Object.freeze({
  DRAFT: 'borrador',
  ANNOUNCED: 'anunciado',
  LIVE: 'en-la-calle',
  LAST_HOURS: 'ultimas-horas',
  ARCHIVE: 'archivo',
});

export const CONFIG_STATUS = Object.freeze({ DRAFT: 'borrador', SCHEDULED: 'programado' });

const MAX_NUMBER = 999;
const MAX_TAGLINE = 80;
const MAX_STORY = 600;
const MAX_SLUG = 40;
const HANDLE_RE = new RegExp(`^${DROP_HANDLE_PREFIX}[a-z0-9]+(?:-[a-z0-9]+)*$`);
// ISO 8601 con fecha, hora y zona obligatoria (Z o ±hh:mm): una fecha sin zona
// se leería distinta en el servidor y en cada navegador.
const ISO_WITH_ZONE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
// Caracteres de control, salvo el salto de línea de la historia.
function hasControlChars(text) {
  for (const char of text) {
    const code = char.codePointAt(0);
    if ((code < 0x20 && code !== 0x0a) || code === 0x7f) return true;
  }
  return false;
}

function fail(field, message) {
  return { ok: false, error: { code: 'DROP_INVALID', field, message } };
}

function readText(value, field, max, label) {
  if (value === undefined || value === null) return { value: '' };
  if (typeof value !== 'string') return { error: fail(field, `${label} tiene que ser texto.`) };
  const text = value.trim();
  if (text.length > max)
    return { error: fail(field, `${label} no puede pasar de ${max} caracteres.`) };
  if (hasControlChars(text)) return { error: fail(field, `${label} lleva caracteres no válidos.`) };
  return { value: text };
}

// «2026-11-13T20:00» tal como se escribió, a partir del instante y de la zona.
function wallClock(time, value) {
  const zone = value.match(/(Z|[+-]\d{2}:\d{2})$/)[1];
  const offsetMinutes =
    zone === 'Z'
      ? 0
      : (zone[0] === '-' ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));
  return new Date(time + offsetMinutes * 60_000).toISOString().slice(0, 16);
}

function readDate(value, field, label) {
  if (value === undefined || value === null || value === '') return { value: null, time: null };
  if (typeof value !== 'string' || !ISO_WITH_ZONE_RE.test(value)) {
    return { error: fail(field, `${label} tiene que ser una fecha con zona horaria.`) };
  }
  const time = Date.parse(value);
  // Date.parse puede aceptar un 31 de febrero desplazándolo: se comprueba que
  // la fecha y la hora escritas existan, deshaciendo la zona horaria.
  if (!Number.isFinite(time) || wallClock(time, value) !== value.slice(0, 16)) {
    return { error: fail(field, `${label} no es una fecha válida.`) };
  }
  return { value, time };
}

/* Valida la configuración de un drop, venga como objeto o como el JSON del
   metacampo. Nunca lanza: devuelve { ok: true, config } o
   { ok: false, error: { code, field, message } }. El número único entre drops lo
   comprueba quien guarda, que es quien ve todos los drops. */
export function parseDropConfig(input) {
  let raw = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch {
      return fail('config', 'La configuración del drop no es JSON válido.');
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fail('config', 'La configuración del drop tiene que ser un objeto.');
  }

  if (raw.version !== DROP_CONFIG_VERSION) {
    return fail('version', 'Versión de configuración desconocida.');
  }
  if (!Number.isInteger(raw.number) || raw.number < 1 || raw.number > MAX_NUMBER) {
    return fail('number', `El número del drop va de 1 a ${MAX_NUMBER}.`);
  }
  const tagline = readText(raw.tagline, 'tagline', MAX_TAGLINE, 'El lema');
  if (tagline.error) return tagline.error;
  const story = readText(raw.story, 'story', MAX_STORY, 'La historia');
  if (story.error) return story.error;
  if (!Object.values(CONFIG_STATUS).includes(raw.status)) {
    return fail('status', 'El estado tiene que ser borrador o programado.');
  }
  const launch = readDate(raw.launchAt, 'launchAt', 'El lanzamiento');
  if (launch.error) return launch.error;
  const ends = readDate(raw.endsAt, 'endsAt', 'El cierre');
  if (ends.error) return ends.error;

  if (raw.status === CONFIG_STATUS.SCHEDULED && launch.time === null) {
    return fail('launchAt', 'Para programar un drop hace falta la fecha de lanzamiento.');
  }
  if (ends.time !== null && launch.time === null) {
    return fail('endsAt', 'No puede haber cierre sin lanzamiento.');
  }
  if (ends.time !== null && ends.time - launch.time < MIN_DROP_MS) {
    return fail('endsAt', 'El cierre tiene que ser al menos una hora después del lanzamiento.');
  }

  return {
    ok: true,
    config: {
      version: DROP_CONFIG_VERSION,
      number: raw.number,
      tagline: tagline.value,
      story: story.value,
      launchAt: launch.value,
      endsAt: ends.value,
      status: raw.status,
    },
  };
}

/* El estado público con la hora `now`. `soldOut` dice si todos sus diseños
   están agotados: sin fecha de cierre, eso lo manda al archivo. */
export function dropState(drop, now = new Date(), { soldOut = false } = {}) {
  if (drop?.status !== CONFIG_STATUS.SCHEDULED || !drop.launchAt) return DROP_STATES.DRAFT;
  const time = now instanceof Date ? now.getTime() : Number(now);
  const launch = Date.parse(drop.launchAt);
  if (time < launch) return DROP_STATES.ANNOUNCED;
  if (drop.endsAt) {
    const ends = Date.parse(drop.endsAt);
    if (time >= ends) return DROP_STATES.ARCHIVE;
    if (ends - time <= LAST_HOURS_MS) return DROP_STATES.LAST_HOURS;
    return DROP_STATES.LIVE;
  }
  return soldOut ? DROP_STATES.ARCHIVE : DROP_STATES.LIVE;
}

export function isOnSale(state) {
  return state === DROP_STATES.LIVE || state === DROP_STATES.LAST_HOURS;
}

export function isPublicState(state) {
  return Object.values(DROP_STATES).includes(state) && state !== DROP_STATES.DRAFT;
}

const launchTime = (drop) => Date.parse(drop.launchAt) || 0;

/* El drop que anuncian la portada y la cinta: el anunciado más próximo; si no
   hay, el último lanzado que siga a la venta; si tampoco, ninguno. Recibe drops
   con su `state` ya calculado. */
export function featuredDrop(drops = []) {
  const announced = drops
    .filter((drop) => drop.state === DROP_STATES.ANNOUNCED)
    .sort((a, b) => launchTime(a) - launchTime(b));
  if (announced.length) return announced[0];
  const onSale = drops
    .filter((drop) => isOnSale(drop.state))
    .sort((a, b) => launchTime(b) - launchTime(a));
  return onSale[0] ?? null;
}

const WALL_RANK = Object.freeze({
  [DROP_STATES.ANNOUNCED]: 0,
  [DROP_STATES.LIVE]: 1,
  [DROP_STATES.LAST_HOURS]: 1,
  [DROP_STATES.ARCHIVE]: 2,
});

/* El orden del muro: anunciados del más próximo al más lejano, después los que
   están a la venta y al final el archivo, ambos del más nuevo al más viejo. */
export function sortForWall(drops = []) {
  return [...drops].sort((a, b) => {
    const rank = (WALL_RANK[a.state] ?? 3) - (WALL_RANK[b.state] ?? 3);
    if (rank !== 0) return rank;
    return a.state === DROP_STATES.ANNOUNCED
      ? launchTime(a) - launchTime(b)
      : launchTime(b) - launchTime(a);
  });
}

export function isDropHandle(handle) {
  return typeof handle === 'string' && handle.length <= DROP_HANDLE_PREFIX.length + MAX_SLUG
    ? HANDLE_RE.test(handle)
    : false;
}

/* «Invierno Ñandú 26!» → «invierno-nandu-26». Null si no queda nada. */
export function normalizeSlug(value) {
  if (typeof value !== 'string') return null;
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG)
    .replace(/-+$/, '');
  return slug || null;
}

export function dropHandleFromSlug(slug) {
  return `${DROP_HANDLE_PREFIX}${slug}`;
}

/* Lo que falta, partido para pintarlo. Nunca negativo. */
export function countdownParts(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
    done: total === 0,
  };
}

/* La cara pública de un drop. Recibe la colección ya leída
   ({ handle, title, poster, config, designs: [{ handle, availableForSale }] }) y
   devuelve lo que puede ver cualquiera, o null si es un borrador. Del anunciado
   solo sale el teaser: ni los diseños ni la historia (catalogo-vivo). */
export function publicDrop(source, now = new Date()) {
  const designs = source.designs ?? [];
  const soldOut =
    designs.length > 0 && designs.every((design) => design.availableForSale === false);
  const state = dropState(source.config, now, { soldOut });
  if (!isPublicState(state)) return null;
  const teaser = state === DROP_STATES.ANNOUNCED;
  return {
    handle: source.handle,
    number: source.config.number,
    title: source.title,
    tagline: source.config.tagline,
    story: teaser ? '' : source.config.story,
    poster: source.poster ?? null,
    launchAt: source.config.launchAt,
    endsAt: source.config.endsAt,
    state,
    designCount: designs.length,
    designs: teaser ? null : designs.map((design) => design.handle),
    soldOut,
  };
}

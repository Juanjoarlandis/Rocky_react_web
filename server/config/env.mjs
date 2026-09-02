// Lectura de variables de entorno con validación cerrada: lo que no encaja
// se sustituye por el valor por defecto o hace fallar el arranque, nunca se
// interpreta a medias.

export function readPositiveInteger(
  value,
  fallback,
  { min = 1, max = Number.MAX_SAFE_INTEGER } = {}
) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

// Sólo admite "true" o "false" literales: un "yes" o un "1" es ambiguo y
// mejor que lo diga el arranque a que se interprete como apagado.
export function readBooleanFlag(value, fallback, label) {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${label} sólo puede ser true o false.`);
}

// Variante permisiva para banderas informativas que no cambian la seguridad.
export function readLooseBoolean(value) {
  return ['1', 'true', 'yes'].includes(String(value || '').toLowerCase());
}

export function normalizeOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} debe ser un origen HTTP(S) válido.`);
  }

  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value.replace(/\/$/, '')) {
    throw new Error(`${label} debe contener sólo esquema, host y puerto.`);
  }
  return url.origin;
}

export function readList(value, fallback = []) {
  return (value || fallback.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

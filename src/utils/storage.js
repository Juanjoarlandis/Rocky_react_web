/* Lectura y escritura seguras en Web Storage. En Safari privado, con el
   almacenamiento bloqueado o sin cuota, getItem/setItem lanzan: aquí eso se
   traduce en «no hay valor» o «no se ha guardado», y la app sigue. */

function storageOf(kind) {
  try {
    return kind === 'session' ? globalThis.sessionStorage : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readStorage(key, { kind = 'local' } = {}) {
  try {
    return storageOf(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key, value, { kind = 'local' } = {}) {
  try {
    storageOf(kind)?.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key, { kind = 'local' } = {}) {
  try {
    storageOf(kind)?.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// JSON con red: si lo guardado está corrupto, devuelve el valor por defecto.
export function readJson(key, fallback = null, options) {
  const raw = readStorage(key, options);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value, options) {
  return writeStorage(key, JSON.stringify(value), options);
}

import { sha256Hex } from '../../lib/hash.mjs';

// LAS FIRMAS DE LA PARED — nadie escribe la suya: el servidor la genera con
// el vocabulario de la crew y un número (pared-compartida). Así hay autoría
// sin nombres ofensivos ni datos personales.

export const PALABRAS = Object.freeze([
  'ABEJA',
  'BARRO',
  'COLMENA',
  'CONGELAO',
  'CURIOSO',
  'DADO',
  'DIANA',
  'FREEZE',
  'LATA',
  'LUNA',
  'MIRON',
  'PEGADOR',
  'PORTERO',
  'RECADERO',
  'ROCKY',
  'TACHON',
  'TELE',
  'VIGIA',
]);

// Lo que puede ser una firma: una palabra y un número de hasta 4 cifras. El
// generador nunca da otra cosa y las rutas validan con este mismo patrón.
export const FIRMA_RE = /^[A-Z]{3,10}-\d{1,4}$/;

// Con `max` 99 salen números de dos cifras; el modelo pasa a 9999 cuando las
// de dos cifras están muy gastadas.
export function generarFirma(random = Math.random, { max = 99 } = {}) {
  const palabra = PALABRAS[Math.min(PALABRAS.length - 1, Math.floor(random() * PALABRAS.length))];
  const numero = Math.min(max, 1 + Math.floor(random() * max));
  return `${palabra}-${numero}`;
}

// 16 caracteres del SHA-256 de la sesión con la sal de la pared: distingue
// autores sin guardar la sesión ni poder volver a ella.
export function claveDeAutor(sessionKey, sal) {
  if (!sessionKey) return null;
  return sha256Hex(`${sal}:${sessionKey}`).slice(0, 16);
}

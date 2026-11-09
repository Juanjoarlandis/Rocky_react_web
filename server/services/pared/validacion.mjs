// LA PARED COMPARTIDA — qué se acepta (pared-compartida, design.md D2).
// Todo lo que llega del navegador pasa por aquí antes de tocar el modelo:
// solo páginas de la web, dos anchos y trazos con el formato del spray, con
// sus topes. Lo que no cuadra se rechaza con un mensaje en castellano.

export const ANCHOS = Object.freeze(['ancha', 'estrecha']);

export const LIMITES = Object.freeze({
  // Lo que pinta el spray: 3 colores (Lima, Violeta, Blanco UV).
  colores: 3,
  puntosPorTrazo: 600,
  chorretones: 40,
  largoChorreton: 120,
  dx: 1600,
  y: 40_000,
});

const SECCIONES = new Set(['/', '/menudrop', '/estudio', '/crew', '/mi-crew', '/rockyIA', '/cart']);
// Las páginas legales que existen (src/config/legal.js): una lista cerrada,
// para que nadie abra paredes con slugs inventados.
const LEGALES = new Set([
  '/legal/aviso-legal',
  '/legal/privacidad',
  '/legal/cookies',
  '/legal/compra',
]);
const HANDLE = '[a-z0-9][a-z0-9-]{0,99}';
const DE_PRODUCTO = [new RegExp(`^/product/${HANDLE}$`), new RegExp(`^/products/${HANDLE}$`)];

// Las fijas (secciones y legales) son pocas y conocidas: no compiten por el
// tope de paredes. Las de producto sí, porque su handle no se puede cerrar.
export function esPaginaFija(value) {
  return SECCIONES.has(value) || LEGALES.has(value);
}

export function esPagina(value) {
  if (typeof value !== 'string' || value.length > 120) return false;
  return esPaginaFija(value) || DE_PRODUCTO.some((pattern) => pattern.test(value));
}

export function esAncho(value) {
  return ANCHOS.includes(value);
}

// La clave de una pared: su página y su ancho.
export function paredDe(pagina, ancho) {
  return `${pagina}|${ancho}`;
}

const esEntero = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const esNumero = (value) => typeof value === 'number' && Number.isFinite(value);

function fallo(message) {
  return { ok: false, message };
}

function puntosLimpios(p) {
  if (!Array.isArray(p) || p.length < 2 || p.length % 2 !== 0) return null;
  if (p.length > LIMITES.puntosPorTrazo * 2) return null;
  const limpios = [];
  for (let i = 0; i < p.length; i += 2) {
    const [dx, y] = [p[i], p[i + 1]];
    if (!esNumero(dx) || !esNumero(y)) return null;
    const x = Math.round(dx);
    const yy = Math.round(y);
    if (Math.abs(x) > LIMITES.dx || yy < 0 || yy > LIMITES.y) return null;
    limpios.push(x, yy);
  }
  return limpios;
}

function chorretonesLimpios(d) {
  if (d === undefined) return [];
  if (!Array.isArray(d) || d.length > LIMITES.chorretones) return null;
  const limpios = [];
  for (const drip of d) {
    if (!Array.isArray(drip) || drip.length !== 3 || !drip.every(esNumero)) return null;
    const [dx, y, largo] = drip.map(Math.round);
    if (Math.abs(dx) > LIMITES.dx || y < 0 || y > LIMITES.y) return null;
    if (largo < 0 || largo > LIMITES.largoChorreton) return null;
    limpios.push([dx, y, largo]);
  }
  return limpios;
}

// Devuelve { ok: true, trazo } con un objeto nuevo y solo los campos del
// spray, o { ok: false, message }.
export function validarTrazo(entrada) {
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return fallo('Ese trazo no viene del spray.');
  }
  const { c, s, p, d } = entrada;
  if (!esEntero(c, 0, LIMITES.colores - 1)) return fallo('Ese color no está en el spray.');
  if (!esEntero(s, 0, 2 ** 32 - 1)) return fallo('Ese trazo no viene del spray.');
  const puntos = puntosLimpios(p);
  if (!puntos) return fallo('El trazo se sale de la pared o es demasiado largo.');
  const chorretones = chorretonesLimpios(d);
  if (!chorretones) return fallo('Los chorretones del trazo no cuadran.');
  return { ok: true, trazo: { c, s, p: puntos, d: chorretones } };
}

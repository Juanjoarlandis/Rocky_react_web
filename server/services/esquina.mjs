// La esquina de la espera (esquina-de-la-espera): cuántos se han apuntado a que
// les avisen de un drop anunciado. De la lista de avisos solo sale ese número,
// redondeado a la decena de abajo y solo desde 10: así nunca dice más de lo que
// hay y no sirve para saber si alguien concreto se ha apuntado. Se calcula como
// mucho una vez por minuto y drop, y si falla, los drops salen como siempre.

import { DROP_STATES } from '../../shared/drops.mjs';
import { ensureLogger } from '../lib/logger.mjs';
import { countPending } from './avisos.mjs';

export const ESQUINA_MINIMO = 10;
export const ESQUINA_TTL_MS = 60_000;
// Tras un fallo, unos segundos sin reintentar: con el almacén mal, ni se relee
// en cada visita ni se escribe una línea de registro por petición.
export const ESQUINA_FALLO_MS = 10_000;

const enDecenas = (n) => Math.floor(n / 10) * 10;

export function createEsquina({
  avisos,
  dropsModel,
  clock = () => Date.now(),
  ttlMs = ESQUINA_TTL_MS,
  falloMs = ESQUINA_FALLO_MS,
  minimo = ESQUINA_MINIMO,
  logger,
}) {
  const log = ensureLogger(logger);
  // handle → { hasta, promesa }: un solo cálculo en vuelo por drop. La promesa
  // da el número o null si no se ha podido contar.
  const cache = new Map();
  const sinCuenta = (error) => log.warn('Esquina sin cuenta', { reason: error?.code || 'error' });

  function contar(handle, claves) {
    const ahora = clock();
    const guardado = cache.get(handle);
    if (guardado && guardado.hasta > ahora) return guardado.promesa;
    const promesa = countPending(avisos, claves).catch((error) => {
      sinCuenta(error);
      cache.set(handle, { hasta: clock() + falloMs, promesa: Promise.resolve(null) });
      return null;
    });
    cache.set(handle, { hasta: ahora + ttlMs, promesa });
    return promesa;
  }

  return {
    async decorate(payload) {
      const anunciados = payload.drops.filter((drop) => drop.state === DROP_STATES.ANNOUNCED);
      if (!anunciados.length) return payload;
      let sources;
      try {
        sources = await dropsModel.sources();
      } catch (error) {
        sinCuenta(error);
        return payload;
      }
      const esperan = new Map();
      for (const drop of anunciados) {
        // Sin su fuente (es otra lectura del catálogo) no se sabe qué diseños
        // sumar: mejor no decir nada que decir de menos durante un minuto.
        const source = sources.find((candidate) => candidate.handle === drop.handle);
        if (!source) continue;
        const claves = [drop.handle, ...source.products.map((product) => product.handle)];
        // Cada drop cuenta por su lado: si falla uno, los demás conservan su número.
        const cuenta = await contar(drop.handle, claves);
        if (cuenta === null) continue;
        const redondeado = enDecenas(cuenta);
        if (redondeado >= minimo) esperan.set(drop.handle, redondeado);
      }
      if (!esperan.size) return payload;
      const conNumero = (drop) =>
        drop && esperan.has(drop.handle) ? { ...drop, waiting: esperan.get(drop.handle) } : drop;
      return {
        ...payload,
        featured: conNumero(payload.featured),
        drops: payload.drops.map(conNumero),
      };
    },
  };
}

// La lista de avisos del drop: quién quiere que El Recadero le avise cuando
// un producto "Próximamente" caiga de verdad. Vive en el store cifrado y de
// ahí sólo sale con scripts/exportar-avisos.mjs, nunca por la API.

import { ensureLogger } from '../lib/logger.mjs';
import { createSerialQueue } from '../lib/serial-queue.mjs';

export const AVISOS_NAMESPACE = 'avisos';
// Clave interna con la lista de productos que tienen avisos. El store no sabe
// enumerar claves, así que el índice se lleva a mano. Ningún producto puede
// llamarse así: los ids de Shopify y los handles no empiezan por '!'.
export const AVISOS_INDICE = '!indice';

// Válvulas de seguridad, no metas.
const MAX_POR_PRODUCTO = 5_000;
const EMAIL_MAX = 254;
const PRODUCTO_MAX = 128;
// Suficiente para "algo@algo.tld" sin pretender validar el RFC entero: el
// filtro de verdad es que el aviso llegue.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

// El producto y el email llegan del navegador. Si una celda empieza como una
// fórmula, Excel o Sheets puede ejecutarla al abrir el CSV, aunque vaya entre
// comillas. El apóstrofo la deja como texto y el escape doble conserva las
// comillas legítimas del valor.
export function celdaCsvSegura(value) {
  const texto = String(value ?? '');
  const neutralizado = CSV_FORMULA_PREFIX.test(texto) ? `'${texto}` : texto;
  return `"${neutralizado.replaceAll('"', '""')}"`;
}

export function createAvisosService({ store, logger, clock = () => new Date() }) {
  const log = ensureLogger(logger);
  // Las altas van en fila india: el get y el set del store son atómicos por
  // separado, y dos altas a la vez se pisarían la lista entre medias.
  const enFila = createSerialQueue();

  return {
    normalizeProduct(value) {
      if (typeof value !== 'string') return null;
      const product = value.trim();
      if (product === '' || product.length > PRODUCTO_MAX || product.startsWith('!')) {
        return null;
      }
      return product;
    },

    normalizeEmail(value) {
      const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
      if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) return null;
      return email;
    },

    // Devuelve {status: 'added' | 'duplicate' | 'full'}.
    async register({ product, email }) {
      return enFila(async () => {
        const lista = (await store.get(AVISOS_NAMESPACE, product)) ?? [];
        if (lista.some((entrada) => entrada.email === email)) {
          return { status: 'duplicate' };
        }
        if (lista.length >= MAX_POR_PRODUCTO) {
          return { status: 'full' };
        }

        lista.push({ email, fecha: clock().toISOString() });
        await store.set(AVISOS_NAMESPACE, product, lista);

        const indice = (await store.get(AVISOS_NAMESPACE, AVISOS_INDICE)) ?? [];
        if (!indice.includes(product)) {
          await store.set(AVISOS_NAMESPACE, AVISOS_INDICE, [...indice, product]);
        }

        // A los logs sólo viajan números, nunca el email.
        log.info('Aviso de drop apuntado', { producto: product, total: lista.length });
        return { status: 'added' };
      });
    },
  };
}

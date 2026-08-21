// La lista de avisos del drop: quién quiere que El Recadero le avise cuando
// un producto "Próximamente" caiga de verdad. Vive en el store cifrado y de
// ahí sólo sale con scripts/exportar-avisos.mjs, nunca por la API.

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

export function createAvisosHandler({ store, logger, clock = () => new Date() }) {
  // Las altas van en fila india: el get y el set del store son atómicos por
  // separado, y dos altas a la vez se pisarían la lista entre medias.
  let cola = Promise.resolve();
  const enFila = (accion) => {
    const paso = cola.then(accion, accion);
    cola = paso.catch(() => {});
    return paso;
  };

  return async (req, res) => {
    const { producto, email, consentimiento, apodo } = req.body ?? {};

    // El campo trampa: ningún humano lo ve, así que quien lo rellena es un
    // bot. Se le dice que sí a todo y no se guarda nada.
    if (typeof apodo === 'string' && apodo.trim() !== '') {
      return res.json({ ok: true, repetido: false });
    }

    if (
      typeof producto !== 'string' ||
      producto.trim() === '' ||
      producto.trim().length > PRODUCTO_MAX ||
      producto.trim().startsWith('!')
    ) {
      return res.status(400).json({ message: 'Falta saber de qué producto avisarte.' });
    }
    const emailLimpio = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!emailLimpio || emailLimpio.length > EMAIL_MAX || !EMAIL_RE.test(emailLimpio)) {
      return res.status(400).json({ message: 'Ese email no parece un email.' });
    }
    if (consentimiento !== true) {
      return res.status(400).json({ message: 'Necesitamos tu permiso para apuntarte.' });
    }

    const clave = producto.trim();
    try {
      const salida = await enFila(async () => {
        const lista = (await store.get(AVISOS_NAMESPACE, clave)) ?? [];
        if (lista.some((entrada) => entrada.email === emailLimpio)) {
          return { ok: true, repetido: true };
        }
        if (lista.length >= MAX_POR_PRODUCTO) {
          return { lleno: true };
        }

        lista.push({ email: emailLimpio, fecha: clock().toISOString() });
        await store.set(AVISOS_NAMESPACE, clave, lista);

        const indice = (await store.get(AVISOS_NAMESPACE, AVISOS_INDICE)) ?? [];
        if (!indice.includes(clave)) {
          await store.set(AVISOS_NAMESPACE, AVISOS_INDICE, [...indice, clave]);
        }

        // A los logs sólo viajan números, nunca el email.
        logger.info?.('Aviso de drop apuntado', { producto: clave, total: lista.length });
        return { ok: true, repetido: false };
      });

      if (salida.lleno) {
        return res
          .status(503)
          .json({ message: 'La lista está a reventar; inténtalo más tarde.' });
      }
      return res.json(salida);
    } catch (error) {
      logger.error?.('Aviso de drop fallido', {
        requestId: req.requestId,
        reason: error?.message,
      });
      return res.status(500).json({ message: 'No hemos podido apuntarte. Prueba otra vez.' });
    }
  };
}

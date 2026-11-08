import { sha256Hex } from '../lib/hash.mjs';
import { ensureLogger } from '../lib/logger.mjs';

// El día del drop: coge la lista de un producto, manda el aviso por lotes y
// borra la lista al terminar, que es lo que promete el formulario. Cada lote
// se marca como enviado antes de pasar al siguiente, así un fallo a medias
// se reanuda sin repetir correos.

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function createAvisosSender({
  avisos,
  mailer,
  from,
  replyTo = null,
  batchSize = 100,
  logger,
}) {
  const log = ensureLogger(logger);
  if (!from?.raw) throw new Error('El envío de avisos necesita un remitente (AVISOS_FROM).');
  const contacto = replyTo?.email || from.email;

  function buildMessage(email, { subject, html, text }) {
    return {
      from: from.raw,
      to: [email],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo.raw } : {}),
      headers: {
        // Sin endpoint de baja: la lista se borra con el envío, así que la
        // baja es un correo al contacto.
        'List-Unsubscribe': `<mailto:${contacto}?subject=baja>`,
      },
    };
  }

  return {
    // Devuelve un resumen; en simulacro (dryRun) no manda ni marca nada.
    async send({ product, subject, html, text, dryRun = true, keep = false }) {
      const lista = await avisos.list(product);
      const pendientes = lista.filter((entrada) => !entrada.enviado);
      const summary = {
        product,
        total: lista.length,
        pending: pendientes.length,
        sent: 0,
        batches: 0,
        cleared: false,
        dryRun,
      };
      if (dryRun) return summary;

      for (const lote of chunk(pendientes, batchSize)) {
        const emails = lote.map((entrada) => entrada.email);
        const idempotencyKey = `avisos-${sha256Hex(`${product}\n${emails.join('\n')}`).slice(0, 40)}`;
        await mailer.sendBatch(
          emails.map((email) => buildMessage(email, { subject, html, text })),
          { idempotencyKey }
        );
        await avisos.markSent(product, emails);
        summary.sent += emails.length;
        summary.batches += 1;
        log.info('Lote de avisos de drop enviado', {
          producto: product,
          lote: emails.length,
          enviados: summary.sent,
        });
      }

      const restantes = (await avisos.list(product)).filter((entrada) => !entrada.enviado);
      if (!keep && restantes.length === 0) {
        await avisos.clear(product);
        summary.cleared = true;
        log.info('Lista de avisos borrada tras el envío', { producto: product });
      }
      return summary;
    },
  };
}

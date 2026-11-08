import { readPositiveInteger } from './env.mjs';

// Correo saliente de los avisos de drop. Sólo lo usa scripts/enviar-avisos.mjs:
// el servidor web nunca manda correos, así que sin clave no pasa nada, salvo
// que el envío avise de que falta.

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
// "Nombre <quien@dominio>" o "quien@dominio" a secas.
const NAMED_ADDRESS_RE = /^([^<>]+?)\s*<([^<>\s]+)>$/;

export function parseAddress(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const named = raw.match(NAMED_ADDRESS_RE);
  const email = (named ? named[2] : raw).toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return { name: named ? named[1].trim() : '', email, raw };
}

export function createMailConfig(env = process.env) {
  const from = parseAddress(env.AVISOS_FROM);
  if (env.AVISOS_FROM && !from) {
    throw new Error('AVISOS_FROM debe ser un email o "Nombre <email@dominio>".');
  }
  const replyTo = parseAddress(env.AVISOS_REPLY_TO);
  if (env.AVISOS_REPLY_TO && !replyTo) {
    throw new Error('AVISOS_REPLY_TO debe ser un email o "Nombre <email@dominio>".');
  }
  const apiKey = env.RESEND_API_KEY || '';

  return Object.freeze({
    apiKey,
    from,
    replyTo,
    // Resend admite hasta 100 correos por llamada al endpoint batch.
    batchSize: readPositiveInteger(env.AVISOS_BATCH_SIZE, 100, { max: 100 }),
    enabled: Boolean(apiKey && from),
  });
}

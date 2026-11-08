// Manda el aviso de un drop a la lista de un producto, por Resend.
//
//   npm run avisos:enviar -- <handle>                  → simulacro: cuenta y enseña el correo
//   npm run avisos:enviar -- <handle> --apply          → envía y borra la lista al acabar
//   npm run avisos:enviar -- <handle> --apply --conservar   → envía sin borrar la lista
//   npm run avisos:enviar -- <handle> --titulo "35 RED" --url https://rocky035.com/product/35-red
//
// Corre donde viva el servidor, con APP_ENCRYPTION_KEY, STATE_STORE_PATH,
// PUBLIC_ORIGIN, RESEND_API_KEY y AVISOS_FROM en el entorno. Cada lote se
// marca como enviado antes del siguiente: si algo falla a medias, se vuelve
// a lanzar y sigue por donde iba sin repetir correos.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import previewProducts from '../shared/preview-products.mjs';
import { normalizeOrigin } from '../server/config/env.mjs';
import { createMailConfig } from '../server/config/mail.mjs';
import { createResendClient } from '../server/integrations/resend/client.mjs';
import { createAvisosSender } from '../server/services/avisos-envio.mjs';
import { renderAvisoDrop } from '../server/services/avisos-plantilla.mjs';
import { createAvisosService } from '../server/services/avisos.mjs';
import { slugify } from '../server/services/known-products.mjs';
import { EncryptedStore } from '../server/storage/encrypted-file-store.mjs';
import { createLogger } from '../server/lib/logger.mjs';

dotenv.config({ quiet: true });

const DEMO_CATALOG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/demoCatalog.json'
);

function parseArgs(argv) {
  const options = { handle: null, apply: false, keep: false, titulo: null, url: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--conservar') options.keep = true;
    else if (arg === '--titulo') options.titulo = argv[(index += 1)] ?? null;
    else if (arg === '--url') options.url = argv[(index += 1)] ?? null;
    else if (arg.startsWith('--')) fail(`Opción desconocida: ${arg}`);
    else if (!options.handle) options.handle = arg;
    else fail(`Sobra un argumento: ${arg}`);
  }
  if (!options.handle) fail('Dime de qué producto avisar: npm run avisos:enviar -- <handle>');
  return options;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

// El título sale del catálogo demo o de los conceptos de vista previa; si el
// producto sólo existe en Shopify, se pasa con --titulo.
function findTitle(handle) {
  const preview = previewProducts.find((product) => product.handle === handle);
  if (preview) return preview.title;
  try {
    const parsed = JSON.parse(fs.readFileSync(DEMO_CATALOG_PATH, 'utf8'));
    const products = Array.isArray(parsed) ? parsed : (parsed?.products ?? []);
    const match = products.find((product) => slugify(product?.handle || product?.title) === handle);
    return match?.title ?? null;
  } catch {
    return null;
  }
}

const options = parseArgs(process.argv.slice(2));
const key = process.env.APP_ENCRYPTION_KEY;
if (!key) fail('Falta APP_ENCRYPTION_KEY: la lista vive cifrada y sin llave no hay lista.');

const publicOrigin = normalizeOrigin(
  process.env.PUBLIC_ORIGIN || 'http://localhost:3000',
  'PUBLIC_ORIGIN'
);
const titulo = options.titulo ?? findTitle(options.handle);
if (!titulo) fail(`No sé cómo se llama "${options.handle}"; pásalo con --titulo "Nombre".`);
const url = options.url ?? `${publicOrigin}/product/${encodeURIComponent(options.handle)}`;

const mail = createMailConfig(process.env);
if (options.apply && !mail.enabled) {
  fail('Para enviar hacen falta RESEND_API_KEY y AVISOS_FROM en el entorno.');
}

const store = new EncryptedStore({
  filePath: path.resolve(process.env.STATE_STORE_PATH || '.data/rocky-state.enc'),
  key,
});
const logger = createLogger();
const avisos = createAvisosService({ store, logger });
const correo = renderAvisoDrop({
  titulo,
  url,
  contacto: mail.replyTo?.email ?? mail.from?.email ?? '',
});

const sender = createAvisosSender({
  avisos,
  mailer: options.apply ? createResendClient({ apiKey: mail.apiKey }) : null,
  from: mail.from ?? { raw: 'simulacro@localhost', email: 'simulacro@localhost', name: '' },
  replyTo: mail.replyTo,
  batchSize: mail.batchSize,
  logger,
});

const resumen = await sender.send({
  product: options.handle,
  ...correo,
  dryRun: !options.apply,
  keep: options.keep,
});

if (resumen.dryRun) {
  console.error(
    `Simulacro: ${resumen.pending} pendientes de ${resumen.total} apuntados a "${options.handle}".`
  );
  console.error(`Asunto: ${correo.subject}`);
  console.error(`Enlace: ${url}`);
  console.error('---');
  console.error(correo.text);
  console.error('---');
  console.error('Añade --apply para enviar de verdad.');
} else {
  console.error(
    `Enviados ${resumen.sent} avisos en ${resumen.batches} lotes (${resumen.total} apuntados).` +
      (resumen.cleared ? ' Lista borrada.' : ' Lista conservada.')
  );
}

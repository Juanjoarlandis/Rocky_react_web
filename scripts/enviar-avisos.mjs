// Manda el aviso de un drop por Resend: a la lista de un producto o a la de un
// drop entero (avisos-de-drop).
//
//   npm run avisos:enviar -- --drop rocky-drop-6           → simulacro del drop
//   npm run avisos:enviar -- --drop rocky-drop-6 --apply   → envía y borra las listas
//   npm run avisos:enviar -- <handle>                      → simulacro de un producto
//   npm run avisos:enviar -- <handle> --apply --conservar  → envía sin borrar la lista
//   npm run avisos:enviar -- <handle> --titulo "35 RED" --url https://rocky035.com/product/35-red
//
// Con --drop junta la lista del drop con las de sus diseños (leídos de Shopify
// por la Admin API), quita los repetidos y enlaza a la página del drop.
// Corre donde viva el servidor, con APP_ENCRYPTION_KEY, STATE_STORE_PATH,
// PUBLIC_ORIGIN, RESEND_API_KEY y AVISOS_FROM en el entorno (y las credenciales
// Admin de Shopify para --drop). Cada lote se marca como enviado antes del
// siguiente: si algo falla a medias, se vuelve a lanzar y sigue por donde iba.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { isDropHandle } from '../shared/drops.mjs';
import previewProducts from '../shared/preview-products.mjs';
import { createConfig } from '../server/config/app.mjs';
import { normalizeOrigin } from '../server/config/env.mjs';
import { createMailConfig } from '../server/config/mail.mjs';
import { createShopifyConfig } from '../server/config/shopify.mjs';
import { createAdminClient } from '../server/integrations/shopify/admin.mjs';
import { createDropsAdmin } from '../server/integrations/shopify/drops-admin.mjs';
import { createResendClient } from '../server/integrations/resend/client.mjs';
import { createAvisosSender } from '../server/services/avisos-envio.mjs';
import { renderAvisoDrop } from '../server/services/avisos-plantilla.mjs';
import { createAvisosService } from '../server/services/avisos.mjs';
import { slugify } from '../server/services/known-products.mjs';
import { EncryptedStore } from '../server/storage/encrypted-file-store.mjs';
import { createLogger } from '../server/lib/logger.mjs';

const DEMO_CATALOG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../src/data/demoCatalog.json'
);

export class UsageError extends Error {}

export function parseArgs(argv) {
  const options = {
    handle: null,
    drop: null,
    apply: false,
    keep: false,
    titulo: null,
    url: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') options.apply = true;
    else if (arg === '--conservar') options.keep = true;
    else if (arg === '--titulo') options.titulo = argv[(index += 1)] ?? null;
    else if (arg === '--url') options.url = argv[(index += 1)] ?? null;
    else if (arg === '--drop') options.drop = argv[(index += 1)] ?? null;
    else if (arg.startsWith('--')) throw new UsageError(`Opción desconocida: ${arg}`);
    else if (!options.handle) options.handle = arg;
    else throw new UsageError(`Sobra un argumento: ${arg}`);
  }
  if (options.drop !== null && !isDropHandle(options.drop)) {
    throw new UsageError('--drop necesita el handle del drop, como rocky-drop-6.');
  }
  if (options.drop && options.handle) {
    throw new UsageError('O un drop (--drop) o un producto, no los dos.');
  }
  if (!options.drop && !options.handle) {
    throw new UsageError(
      'Dime a quién avisar: npm run avisos:enviar -- --drop <handle> o -- <producto>'
    );
  }
  return options;
}

// El título de un producto sale del catálogo demo o de los conceptos de vista
// previa; si el producto sólo existe en Shopify, se pasa con --titulo.
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

/* El drop desde Shopify: su título y los handles de sus diseños. */
async function readDrop(handle) {
  const shopify = createShopifyConfig(process.env, createConfig(process.env));
  if (!shopify.capabilities.admin) {
    throw new UsageError(
      'Para --drop hacen falta las credenciales Admin de Shopify en el entorno.'
    );
  }
  const drops = createDropsAdmin({ admin: createAdminClient({ config: shopify }) });
  const drop = (await drops.listDrops()).find((candidate) => candidate.handle === handle);
  if (!drop) throw new UsageError(`No existe el drop "${handle}" en Shopify.`);
  return { title: drop.title, designs: drop.products.map((product) => product.handle) };
}

async function main() {
  dotenv.config({ quiet: true });
  const options = parseArgs(process.argv.slice(2));
  const key = process.env.APP_ENCRYPTION_KEY;
  if (!key)
    throw new UsageError(
      'Falta APP_ENCRYPTION_KEY: la lista vive cifrada y sin llave no hay lista.'
    );

  const publicOrigin = normalizeOrigin(
    process.env.PUBLIC_ORIGIN || 'http://localhost:3000',
    'PUBLIC_ORIGIN'
  );
  let keys;
  let titulo;
  let url;
  if (options.drop) {
    const drop = await readDrop(options.drop);
    keys = [options.drop, ...drop.designs];
    titulo = options.titulo ?? drop.title;
    url = options.url ?? `${publicOrigin}/products/${encodeURIComponent(options.drop)}`;
  } else {
    keys = [options.handle];
    titulo = options.titulo ?? findTitle(options.handle);
    if (!titulo) {
      throw new UsageError(
        `No sé cómo se llama "${options.handle}"; pásalo con --titulo "Nombre".`
      );
    }
    url = options.url ?? `${publicOrigin}/product/${encodeURIComponent(options.handle)}`;
  }

  const mail = createMailConfig(process.env);
  if (options.apply && !mail.enabled) {
    throw new UsageError('Para enviar hacen falta RESEND_API_KEY y AVISOS_FROM en el entorno.');
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

  const resumen = await sender.sendMany({
    keys,
    ...correo,
    dryRun: !options.apply,
    keep: options.keep,
  });

  const destino = options.drop ?? options.handle;
  if (resumen.dryRun) {
    console.error(
      `Simulacro: ${resumen.pending} personas por avisar en ${keys.length} listas de "${destino}".`
    );
    console.error(`Asunto: ${correo.subject}`);
    console.error(`Enlace: ${url}`);
    console.error('---');
    console.error(correo.text);
    console.error('---');
    console.error('Añade --apply para enviar de verdad.');
  } else {
    console.error(
      `Enviados ${resumen.sent} avisos en ${resumen.batches} lotes.` +
        (resumen.cleared ? ' Listas borradas.' : ' Listas conservadas.')
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

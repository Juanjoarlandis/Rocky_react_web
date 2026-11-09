// Siembra el calendario de drops en la tienda de DESARROLLO (rocky035-pruebas):
// escribe el metacampo rocky.drop en los 4 drops de prueba, sube sus carteles,
// pone foto a los diseños que no la tienen y deja la publicación de cada diseño
// según su estado (solo en el canal Headless; de los demás canales, fuera).
//
//   node scripts/drops-semilla.mjs             → simulacro: enseña el plan
//   node scripts/drops-semilla.mjs --aplicar   → lo escribe en la tienda
//
// Lee el .env del repo (credenciales Admin y SHOPIFY_HEADLESS_PUBLICATION_ID) y
// los recursos de assets-master/ (fuera de Git). Se niega con cualquier otra
// tienda. Las fechas se calculan desde ahora:
//   Drop 3  archivo        (lanzado hace 40 días, cerró hace 30)
//   Drop 4  últimas horas  (lanzado hace 10 días, cierra dentro de 30 h)
//   Drop 5  en la calle    (lanzado hace 2 días, sin cierre)
//   Drop 6  anunciado      (el jueves que viene a las 20:00, hora de Madrid)

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_STATUS, DROP_CONFIG_VERSION, parseDropConfig } from '../shared/drops.mjs';
import { createShopifyConfig } from '../server/config/shopify.mjs';
import { createConfig } from '../server/config/app.mjs';
import { createAdminClient } from '../server/integrations/shopify/admin.mjs';
import { createDropsAdmin } from '../server/integrations/shopify/drops-admin.mjs';

const TIENDA_PRUEBAS = 'rocky035-pruebas.myshopify.com';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAMISETAS = path.join(REPO, 'assets-master/camisetas-prueba');
const CARTELES = path.join(REPO, 'assets-master/carteles-prueba');
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/* El próximo jueves a las 20:00 en Madrid, como ISO con su zona. */
export function nextThursdayAt20Madrid(now = new Date()) {
  for (let offset = 1; offset <= 8; offset += 1) {
    const day = new Date(now.getTime() + offset * DAY);
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      weekday: 'short',
    }).format(day);
    if (weekday !== 'Thu') continue;
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(day);
    const zone = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      timeZoneName: 'longOffset',
    })
      .formatToParts(new Date(`${ymd}T20:00:00Z`))
      .find((part) => part.type === 'timeZoneName')
      .value.replace('GMT', '');
    return `${ymd}T20:00:00${zone || '+00:00'}`;
  }
  throw new Error('No hay jueves en la próxima semana.');
}

const iso = (time) => new Date(time).toISOString().replace(/\.\d{3}Z$/, 'Z');

export function plan(now = new Date()) {
  const t = now.getTime();
  return [
    { handle: 'rocky-drop-3', number: 3, launchAt: iso(t - 40 * DAY), endsAt: iso(t - 30 * DAY) },
    { handle: 'rocky-drop-4', number: 4, launchAt: iso(t - 10 * DAY), endsAt: iso(t + 30 * HOUR) },
    { handle: 'rocky-drop-5', number: 5, launchAt: iso(t - 2 * DAY), endsAt: null },
    { handle: 'rocky-drop-6', number: 6, launchAt: nextThursdayAt20Madrid(now), endsAt: null },
  ];
}

async function main() {
  const aplicar = process.argv.includes('--aplicar');
  process.loadEnvFile(path.join(REPO, '.env'));
  const shopify = createShopifyConfig(process.env, createConfig(process.env));
  if (shopify.storeDomain !== TIENDA_PRUEBAS) {
    throw new Error(`Solo se siembra ${TIENDA_PRUEBAS}; el .env apunta a otra tienda.`);
  }
  const publicationId = process.env.SHOPIFY_HEADLESS_PUBLICATION_ID;
  if (!publicationId) throw new Error('Falta SHOPIFY_HEADLESS_PUBLICATION_ID en el .env.');
  const catalogo = JSON.parse(readFileSync(path.join(CAMISETAS, 'catalogo.json'), 'utf8'));

  const admin = createAdminClient({ config: shopify });
  const drops = createDropsAdmin({ admin, publicationId });
  const existentes = await drops.listDrops();
  const now = new Date();

  console.log(`${aplicar ? 'APLICANDO' : 'SIMULACRO'} en ${shopify.storeDomain}`);
  for (const paso of plan(now)) {
    const coleccion = existentes.find((drop) => drop.handle === paso.handle);
    if (!coleccion)
      throw new Error(`No existe la colección ${paso.handle}: sube antes las camisetas.`);
    const datos = catalogo.drops.find((drop) => drop.handle === paso.handle);
    const parsed = parseDropConfig({
      version: DROP_CONFIG_VERSION,
      number: paso.number,
      tagline: datos?.descripcion ?? '',
      story: '',
      launchAt: paso.launchAt,
      endsAt: paso.endsAt,
      status: CONFIG_STATUS.SCHEDULED,
    });
    if (!parsed.ok) throw new Error(`${paso.handle}: ${parsed.error.message}`);
    const cartel = path.join(CARTELES, `cartel-drop-${paso.number}.png`);
    const futuro = Date.parse(paso.launchAt) > now.getTime();
    console.log(
      `  ${paso.handle}: ${paso.launchAt} → ${paso.endsAt ?? 'sin cierre'} · ${coleccion.products.length} diseños · cartel ${existsSync(cartel) ? 'sí' : 'no'} · publicar ${futuro ? 'con fecha' : 'ya'}`
    );
    if (!aplicar) continue;

    await drops.setConfig({ id: coleccion.id, configJson: JSON.stringify(parsed.config) });
    if (existsSync(cartel)) {
      const subido = await drops.uploadImage({
        buffer: readFileSync(cartel),
        mimeType: 'image/png',
        filename: `cartel-drop-${paso.number}.png`,
        alt: `Cartel del Drop ${paso.number} de ROCKY 035`,
      });
      await drops.updateCollection({
        id: coleccion.id,
        poster: { url: subido.url, alt: `Cartel del Drop ${paso.number} de ROCKY 035` },
      });
    }

    for (const product of coleccion.products) {
      // Los diseños bajo llave no tenían foto: con el calendario se revelan
      // solos a su hora, así que llevan su foto desde ya.
      const slug = product.handle.replace(/^rocky-/, '');
      const foto = path.join(CAMISETAS, `${slug}.png`);
      if (!product.image && existsSync(foto)) {
        const subida = await drops.uploadImage({
          buffer: readFileSync(foto),
          mimeType: 'image/png',
          filename: `${slug}.png`,
          alt: catalogo.productos.find((p) => p.slug === slug)?.alt ?? product.title,
        });
        await drops.upsertProduct({
          handle: product.handle,
          title: product.title,
          descriptionHtml: product.descriptionHtml,
          price: product.variants[0]?.price ?? catalogo.precio,
          sizes: product.variants.map(({ size, quantity }) => ({ size, quantity })),
          fileId: subida.fileId,
        });
      }
      // Solo en Headless, con fecha si el drop aún no ha caído.
      const { publications } = await admin.query('{ publications(first: 20) { nodes { id } } }');
      const otras = publications.nodes.map((n) => n.id).filter((id) => id !== publicationId);
      if (otras.length) {
        await admin.query(
          'mutation($id: ID!, $input: [PublicationInput!]!) { publishableUnpublish(id: $id, input: $input) { userErrors { message } } }',
          { id: product.id, input: otras.map((id) => ({ publicationId: id })) }
        );
      }
      await drops.unpublish(product.id);
      await drops.publish(product.id, futuro ? new Date(paso.launchAt).toISOString() : null);
    }
    console.log(`  ${paso.handle} listo`);
  }
  if (!aplicar) console.log('Nada escrito. Repite con --aplicar.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}

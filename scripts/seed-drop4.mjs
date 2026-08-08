// Crea en Shopify los productos del DROP 4 a partir de src/PRODUCTOS_ROCKY.json.
//
//   node scripts/seed-drop4.mjs                 # simulacro, no escribe nada
//   node scripts/seed-drop4.mjs --limit 1       # simulacro de un solo producto
//   node scripts/seed-drop4.mjs --apply         # escribe en la tienda
//
// Autentica de una de estas dos formas, en este orden:
//
//   1. SHOPIFY_ADMIN_ACCESS_TOKEN — token estatico de una app personalizada
//      creada en el admin (Configuracion > Apps y canales de venta >
//      Desarrollar apps). Es el camino corto.
//   2. SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET — intercambio OAuth
//      client_credentials, que exige que la app este instalada en la tienda.
//
// En ambos casos hacen falta los permisos write_products y write_publications.
//
// Es idempotente: productSet identifica por handle, asi que reejecutarlo
// actualiza los productos existentes en lugar de duplicarlos.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createConfig } from '../server/config.mjs';
import { createAdminClient } from '../server/shopify/admin.mjs';
import { createShopifyConfig } from '../server/shopify/config.mjs';
import { requestShopifyGraphql } from '../server/shopify/graphql.mjs';

dotenv.config({ quiet: true });

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Datos inventados a falta de los reales. Cambiar aqui cuando se revele el drop.
const PRICE = '34.99';
const SIZES = ['S', 'M', 'L', 'XL'];
const VENDOR = 'ROCKY 035';
const PRODUCT_TYPE = 'Camiseta';
const OPTION_NAME = 'Talla';

function parseArgs(argv) {
  const limitIndex = argv.indexOf('--limit');
  return {
    apply: argv.includes('--apply'),
    limit: limitIndex === -1 ? null : Number.parseInt(argv[limitIndex + 1], 10),
  };
}

export function toHandle(title) {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `rocky-${slug}`;
}

export function buildProductInput(product) {
  return {
    handle: toHandle(product.title),
    title: product.title,
    descriptionHtml: `<p>${product.description}</p>`,
    vendor: VENDOR,
    productType: PRODUCT_TYPE,
    status: 'ACTIVE',
    tags: [product.drop, VENDOR],
    productOptions: [
      { name: OPTION_NAME, values: SIZES.map((size) => ({ name: size })) },
    ],
    variants: SIZES.map((size) => ({
      optionValues: [{ optionName: OPTION_NAME, name: size }],
      price: PRICE,
      // Sin seguimiento de stock: siempre disponible y no hace falta
      // configurar ubicaciones ni cantidades.
      inventoryItem: { tracked: false },
    })),
  };
}

const PRODUCT_SET = `
  mutation SeedProduct($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;

const PUBLICATIONS = `
  query Publications { publications(first: 25) { nodes { id name } } }
`;

const PUBLISH = `
  mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }
`;

// Devuelve un cliente con la misma forma que createAdminClient ({ query }),
// pero usando el token estatico si esta disponible.
function createAdminApi(shopifyConfig) {
  const staticToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (staticToken) {
    const endpoint = `https://${shopifyConfig.storeDomain}/admin/api/${shopifyConfig.apiVersion}/graphql.json`;
    return {
      source: 'SHOPIFY_ADMIN_ACCESS_TOKEN',
      query: async (document, variables = {}) => {
        const { data } = await requestShopifyGraphql({
          endpoint,
          query: document,
          variables,
          headers: { 'X-Shopify-Access-Token': staticToken },
        });
        return data;
      },
    };
  }

  if (!shopifyConfig.capabilities.admin) {
    throw new Error(
      'Admin API sin configurar. Define SHOPIFY_ADMIN_ACCESS_TOKEN, o bien ' +
        'SHOPIFY_CLIENT_ID y SHOPIFY_CLIENT_SECRET de una app instalada en la tienda.'
    );
  }
  return { source: 'client_credentials', ...createAdminClient({ config: shopifyConfig }) };
}

function assertNoUserErrors(payload, label) {
  const userErrors = payload?.userErrors || [];
  if (userErrors.length > 0) {
    const detail = userErrors.map((error) => `${error.field || '-'}: ${error.message}`).join(' | ');
    throw new Error(`${label} -> ${detail}`);
  }
  return payload;
}

async function main() {
  const { apply, limit } = parseArgs(process.argv.slice(2));

  const shopifyConfig = createShopifyConfig(process.env, createConfig(process.env));

  const source = JSON.parse(
    fs.readFileSync(path.join(rootDirectory, 'src/PRODUCTOS_ROCKY.json'), 'utf8')
  );
  const catalog = Array.isArray(source) ? source : source.products;
  const products = Number.isInteger(limit) ? catalog.slice(0, limit) : catalog;

  console.info(
    `${apply ? 'ESCRIBIENDO' : 'SIMULACRO'}: ${products.length} productos, ` +
      `${SIZES.length} tallas (${SIZES.join('/')}) a ${PRICE} ${'EUR'} cada uno.`
  );

  if (!apply) {
    for (const product of products) {
      console.info(`  ${toHandle(product.title).padEnd(28)} ${product.title}`);
    }
    console.info('\nNada escrito. Repite con --apply para crearlos de verdad.');
    return;
  }

  const admin = createAdminApi(shopifyConfig);
  console.info(`Autenticando con: ${admin.source}`);

  const { publications } = await admin.query(PUBLICATIONS);
  const targets = publications.nodes;
  console.info(`Canales de publicación: ${targets.map((node) => node.name).join(', ')}`);

  let created = 0;
  for (const product of products) {
    const input = buildProductInput(product);
    const data = await admin.query(PRODUCT_SET, { input });
    const { product: saved } = assertNoUserErrors(data.productSet, `productSet ${input.handle}`);

    const publishData = await admin.query(PUBLISH, {
      id: saved.id,
      input: targets.map((node) => ({ publicationId: node.id })),
    });
    assertNoUserErrors(publishData.publishablePublish, `publish ${input.handle}`);

    created += 1;
    console.info(`  [${created}/${products.length}] ${saved.handle} — ${saved.title}`);
  }

  console.info(`\nListo: ${created} productos creados o actualizados y publicados.`);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  if (error.details?.length) console.error(JSON.stringify(error.details, null, 2));
  process.exitCode = 1;
});

import { DROP_METAFIELD, isDropHandle } from '../../../shared/drops.mjs';
import { ShopifyGraphqlError } from '../../http/errors.mjs';
import { fetchJson } from '../../lib/fetch-json.mjs';
import { shopifyTransportError } from './graphql.mjs';

// Las operaciones de drops sobre la Admin API de Shopify (ver
// openspec/changes/sistema-de-drops/design.md, D1, D2, D4, D8 y D9). Aquí solo
// hay GraphQL y su traducción a objetos planos; las reglas (validación,
// número único, «un diseño, un drop») viven en services/drops/.

const SIZE_OPTION = 'Talla';
const UPLOAD_POLL_MS = 1_000;
const UPLOAD_MAX_POLLS = 20;

// Sin id de publicación (la web pública sin Taller) no se pregunta si el
// producto está en el canal Headless: ese campo exige el id.
const productFields = (withPublication) => `
  id
  handle
  title
  status
  descriptionHtml
  featuredImage { url altText }
  ${withPublication ? 'publishedOnPublication(publicationId: $publicationId)' : ''}
  collections(first: 10) { nodes { handle } }
  variants(first: 10) {
    nodes {
      id
      availableForSale
      price
      inventoryQuantity
      selectedOptions { name value }
      inventoryItem { id tracked }
    }
  }
`;

/* Sin el parámetro query: el buscador de Shopify tarda segundos en ver una
   colección recién creada y el Taller la perdería justo después de crearla.
   Se recorren todas las colecciones y se filtran por handle aquí. */
const COLLECTIONS_PAGE_SIZE = 100;
const MAX_COLLECTION_PAGES = 20;
const PRODUCT_READS_AT_ONCE = 4;

const LIST_DROPS = `
  query RockyDrops($after: String) {
    collections(first: ${COLLECTIONS_PAGE_SIZE}, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        image { url altText }
        metafield(namespace: "${DROP_METAFIELD.namespace}", key: "${DROP_METAFIELD.key}") { value }
      }
    }
  }
`;

const dropProducts = (withPublication) => `
  query RockyDropProducts($id: ID!${withPublication ? ', $publicationId: ID!' : ''}) {
    collection(id: $id) { products(first: 100) { nodes { ${productFields(withPublication)} } } }
  }
`;

const CREATE_COLLECTION = `
  mutation RockyDropCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle }
      userErrors { field message }
    }
  }
`;

const UPDATE_COLLECTION = `
  mutation RockyDropUpdate($input: CollectionInput!) {
    collectionUpdate(input: $input) {
      collection { id }
      userErrors { field message }
    }
  }
`;

const SET_METAFIELD = `
  mutation RockyDropConfig($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message }
    }
  }
`;

const ADD_PRODUCTS = `
  mutation RockyDropAdd($id: ID!, $productIds: [ID!]!) {
    collectionAddProducts(id: $id, productIds: $productIds) { userErrors { field message } }
  }
`;

const REMOVE_PRODUCTS = `
  mutation RockyDropRemove($id: ID!, $productIds: [ID!]!) {
    collectionRemoveProducts(id: $id, productIds: $productIds) { userErrors { field message } }
  }
`;

const PRODUCT_FIELDS = productFields(true);

const PRODUCT_SET = `
  mutation RockyDesignSet(
    $input: ProductSetInput!
    $identifier: ProductSetIdentifiers
    $publicationId: ID!
  ) {
    productSet(synchronous: true, input: $input, identifier: $identifier) {
      product { ${PRODUCT_FIELDS} }
      userErrors { field message }
    }
  }
`;

const PRODUCT_BY_ID = `
  query RockyDesign($id: ID!, $publicationId: ID!) { product(id: $id) { ${PRODUCT_FIELDS} } }
`;

const PRODUCT_BY_HANDLE = `
  query RockyDesignByHandle($handle: String!, $publicationId: ID!) {
    productByIdentifier(identifier: { handle: $handle }) { ${PRODUCT_FIELDS} }
  }
`;

const SEARCH_PRODUCTS = `
  query RockyDesignSearch($query: String!, $publicationId: ID!) {
    products(first: 20, query: $query, sortKey: UPDATED_AT, reverse: true) {
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

const SET_QUANTITIES = `
  mutation RockyDesignStock($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) { userErrors { field message } }
  }
`;

const LOCATIONS = `query RockyLocations { locations(first: 1) { nodes { id } } }`;

const PUBLISH = `
  mutation RockyPublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

const UNPUBLISH = `
  mutation RockyUnpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) { userErrors { field message } }
  }
`;

const PUBLICATIONS = `
  query RockyPublications { publications(first: 50) { nodes { id } } }
`;

const COLLECTION_BY_HANDLE = `
  query RockyCollectionByHandle($handle: String!) {
    collectionByIdentifier(identifier: { handle: $handle }) { id handle }
  }
`;

const STAGED_UPLOAD = `
  mutation RockyStaged($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets { url resourceUrl parameters { name value } }
      userErrors { field message }
    }
  }
`;

const FILE_CREATE = `
  mutation RockyFile($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id fileStatus }
      userErrors { field message }
    }
  }
`;

const FILE_STATUS = `
  query RockyFileStatus($id: ID!) {
    node(id: $id) { ... on MediaImage { fileStatus image { url } } }
  }
`;

/* Un `userErrors` no vacío es un rechazo de Shopify: 422 con un mensaje que no
   cuenta los detalles (van en `details`, para el log, nunca al navegador). */
function assertAccepted(payload, what) {
  if (!payload) {
    throw new ShopifyGraphqlError(`Shopify no ha devuelto el resultado (${what}).`);
  }
  if (payload.userErrors?.length) {
    throw new ShopifyGraphqlError('Shopify no ha aceptado el cambio.', {
      status: 422,
      code: 'SHOPIFY_REJECTED',
      details: payload.userErrors.map(({ field, message }) => ({ what, field, message })),
    });
  }
  return payload;
}

export function mapAdminProduct(node) {
  const variants = (node.variants?.nodes ?? []).map((variant) => ({
    id: variant.id,
    size:
      variant.selectedOptions?.find((option) => option.name === SIZE_OPTION)?.value ??
      variant.selectedOptions?.[0]?.value ??
      '',
    price: variant.price,
    availableForSale: Boolean(variant.availableForSale),
    tracked: Boolean(variant.inventoryItem?.tracked),
    quantity: variant.inventoryItem?.tracked ? (variant.inventoryQuantity ?? 0) : null,
    inventoryItemId: variant.inventoryItem?.id ?? null,
  }));
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    status: node.status,
    descriptionHtml: node.descriptionHtml ?? '',
    image: node.featuredImage
      ? { url: node.featuredImage.url, alt: node.featuredImage.altText || '' }
      : null,
    publishedOnHeadless: Boolean(node.publishedOnPublication),
    collections: (node.collections?.nodes ?? []).map((collection) => collection.handle),
    availableForSale: variants.some((variant) => variant.availableForSale),
    variants,
  };
}

/* Solo letras, números, espacios y guiones: el texto va dentro de la sintaxis
   de búsqueda de Shopify y no debe poder cambiar la consulta. */
export function sanitizeSearch(term) {
  return String(term ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function createDropsAdmin({
  admin,
  publicationId,
  fetchImpl = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let locationId = null;

  const withPublication = Boolean(publicationId);
  const DROP_PRODUCTS = dropProducts(withPublication);

  async function productsOf(collectionId) {
    const data = await admin.query(
      DROP_PRODUCTS,
      withPublication ? { id: collectionId, publicationId } : { id: collectionId }
    );
    return (data.collection?.products?.nodes ?? []).map(mapAdminProduct);
  }

  async function getLocationId() {
    if (locationId) return locationId;
    const data = await admin.query(LOCATIONS);
    locationId = data.locations?.nodes?.[0]?.id ?? null;
    if (!locationId) {
      throw new ShopifyGraphqlError('La tienda no tiene ninguna ubicación de inventario.', {
        code: 'NO_LOCATION',
      });
    }
    return locationId;
  }

  let publicationIds = null;
  async function allPublications() {
    if (!publicationIds) {
      const data = await admin.query(PUBLICATIONS);
      const ids = (data.publications?.nodes ?? []).map((node) => node.id);
      if (publicationId && !ids.includes(publicationId)) ids.push(publicationId);
      publicationIds = ids;
    }
    return publicationIds;
  }

  return {
    publicationId,

    /* Todas las colecciones de drop, con su metacampo crudo y sus productos.
       La validación del metacampo la hace quien lee. */
    async listDrops() {
      const collections = [];
      let after = null;
      for (let page = 0; page < MAX_COLLECTION_PAGES; page += 1) {
        const data = await admin.query(LIST_DROPS, { after });
        collections.push(
          ...(data.collections?.nodes ?? []).filter((node) => isDropHandle(node.handle))
        );
        const info = data.collections?.pageInfo;
        if (!info?.hasNextPage || !info.endCursor) break;
        after = info.endCursor;
      }
      // Los productos se piden de PRODUCT_READS_AT_ONCE en
      // PRODUCT_READS_AT_ONCE: en serie, cada colección más del archivo
      // alargaría la espera del guardián del carrito; todas a la vez podrían
      // agotar el cupo de la Admin API.
      const drops = [];
      for (let start = 0; start < collections.length; start += PRODUCT_READS_AT_ONCE) {
        const batch = collections.slice(start, start + PRODUCT_READS_AT_ONCE);
        drops.push(
          ...(await Promise.all(
            batch.map(async (collection) => ({
              id: collection.id,
              handle: collection.handle,
              title: collection.title,
              poster: collection.image
                ? { url: collection.image.url, alt: collection.image.altText || '' }
                : null,
              rawConfig: collection.metafield?.value ?? null,
              products: await productsOf(collection.id),
            }))
          ))
        );
      }
      return drops;
    },

    async createCollection({ handle, title, configJson }) {
      const data = await admin.query(CREATE_COLLECTION, {
        input: {
          handle,
          title,
          metafields: [{ ...DROP_METAFIELD, type: 'json', value: configJson }],
        },
      });
      return assertAccepted(data.collectionCreate, 'collectionCreate').collection;
    },

    async updateCollection({ id, title, poster }) {
      const input = { id };
      if (title !== undefined) input.title = title;
      if (poster !== undefined) {
        input.image = poster ? { src: poster.url, altText: poster.alt || '' } : null;
      }
      const data = await admin.query(UPDATE_COLLECTION, { input });
      assertAccepted(data.collectionUpdate, 'collectionUpdate');
    },

    async setConfig({ id, configJson }) {
      const data = await admin.query(SET_METAFIELD, {
        metafields: [{ ...DROP_METAFIELD, ownerId: id, type: 'json', value: configJson }],
      });
      assertAccepted(data.metafieldsSet, 'metafieldsSet');
    },

    async addProducts(collectionId, productIds) {
      if (!productIds.length) return;
      const data = await admin.query(ADD_PRODUCTS, { id: collectionId, productIds });
      assertAccepted(data.collectionAddProducts, 'collectionAddProducts');
    },

    async removeProducts(collectionId, productIds) {
      if (!productIds.length) return;
      const data = await admin.query(REMOVE_PRODUCTS, { id: collectionId, productIds });
      assertAccepted(data.collectionRemoveProducts, 'collectionRemoveProducts');
    },

    /* Crea o reescribe un diseño entero por su handle. `sizes` es
       [{ size, quantity }] con quantity null = sin límite. Las existencias de
       productSet solo cuentan al crear la variante: al editar, las ajusta
       setQuantities. */
    async upsertProduct({ handle, title, descriptionHtml, price, sizes, fileId = null }) {
      const location = await getLocationId();
      const input = {
        handle,
        title,
        descriptionHtml,
        vendor: 'ROCKY 035',
        productType: 'Camiseta',
        status: 'ACTIVE',
        productOptions: [{ name: SIZE_OPTION, values: sizes.map(({ size }) => ({ name: size })) }],
        variants: sizes.map(({ size, quantity }) => ({
          optionValues: [{ optionName: SIZE_OPTION, name: size }],
          price,
          inventoryPolicy: 'DENY',
          inventoryItem: { tracked: quantity !== null },
          ...(quantity !== null
            ? { inventoryQuantities: [{ locationId: location, name: 'available', quantity }] }
            : {}),
        })),
      };
      if (fileId) input.files = [{ id: fileId }];
      const data = await admin.query(PRODUCT_SET, {
        input,
        identifier: { handle },
        publicationId,
      });
      return mapAdminProduct(assertAccepted(data.productSet, 'productSet').product);
    },

    async getProduct(id) {
      const data = await admin.query(PRODUCT_BY_ID, { id, publicationId });
      return data.product ? mapAdminProduct(data.product) : null;
    },

    /* Para no pisar un producto con el mismo handle al crear un diseño. */
    async findProductByHandle(handle) {
      const data = await admin.query(PRODUCT_BY_HANDLE, { handle, publicationId });
      return data.productByIdentifier ? mapAdminProduct(data.productByIdentifier) : null;
    },

    async searchProducts(term) {
      const clean = sanitizeSearch(term);
      const data = await admin.query(SEARCH_PRODUCTS, {
        query: clean ? `title:${clean}*` : '',
        publicationId,
      });
      return (data.products?.nodes ?? []).map(mapAdminProduct);
    },

    /* changes: [{ inventoryItemId, quantity, changeFromQuantity }] */
    async setQuantities(changes) {
      if (!changes.length) return;
      const location = await getLocationId();
      const data = await admin.query(SET_QUANTITIES, {
        input: {
          name: 'available',
          reason: 'correction',
          quantities: changes.map((change) => ({ ...change, locationId: location })),
        },
      });
      assertAccepted(data.inventorySetQuantities, 'inventorySetQuantities');
    },

    /* Publica en el canal Headless, con fecha si es futura (Shopify la sirve a
       esa hora) o al momento si no se da. */
    async publish(productId, publishDate = null) {
      const data = await admin.query(PUBLISH, {
        id: productId,
        input: [{ publicationId, ...(publishDate ? { publishDate } : {}) }],
      });
      assertAccepted(data.publishablePublish, 'publishablePublish');
    },

    /* Despublica de todos los canales, no solo de Headless: un diseño que
       siguiera en la tienda online u otro canal se podría ver o comprar sin
       pasar por el BFF. Publicar, en cambio, es solo en Headless. */
    async unpublish(productId) {
      const input = (await allPublications()).map((id) => ({ publicationId: id }));
      if (!input.length) return;
      const data = await admin.query(UNPUBLISH, { id: productId, input });
      assertAccepted(data.publishableUnpublish, 'publishableUnpublish');
    },

    /* Cualquier colección con ese handle, sea o no un drop válido: Shopify
       añadiría un sufijo al crear otra con el mismo. */
    async findCollectionByHandle(handle) {
      const data = await admin.query(COLLECTION_BY_HANDLE, { handle });
      return data.collectionByIdentifier ?? null;
    },

    /* Sube una imagen ya validada: subida segura, fileCreate y espera a que
       Shopify la procese. Devuelve { fileId, url } (url del CDN). */
    async uploadImage({ buffer, mimeType, filename, alt = '' }) {
      const staged = await admin.query(STAGED_UPLOAD, {
        input: [
          {
            resource: 'IMAGE',
            filename,
            mimeType,
            httpMethod: 'POST',
            fileSize: String(buffer.length),
          },
        ],
      });
      const [target] = assertAccepted(
        staged.stagedUploadsCreate,
        'stagedUploadsCreate'
      ).stagedTargets;
      if (!target || !/^https:\/\//.test(target.url)) {
        throw new ShopifyGraphqlError('Shopify no ha dado un destino de subida válido.', {
          code: 'UPLOAD_TARGET',
        });
      }
      const form = new FormData();
      target.parameters.forEach(({ name, value }) => form.append(name, value));
      form.append('file', new Blob([buffer], { type: mimeType }), filename);
      let response;
      try {
        ({ response } = await fetchJson({
          url: target.url,
          fetchImpl,
          timeoutMs: 60_000,
          options: { method: 'POST', body: form },
        }));
      } catch (error) {
        throw shopifyTransportError(error);
      }
      if (!response.ok) {
        throw new ShopifyGraphqlError('No se ha podido subir la imagen a Shopify.', {
          code: 'UPLOAD_FAILED',
        });
      }

      const created = await admin.query(FILE_CREATE, {
        files: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt }],
      });
      const [file] = assertAccepted(created.fileCreate, 'fileCreate').files;
      for (let poll = 0; poll < UPLOAD_MAX_POLLS; poll += 1) {
        await sleep(UPLOAD_POLL_MS);
        const status = await admin.query(FILE_STATUS, { id: file.id });
        const node = status.node;
        if (node?.fileStatus === 'FAILED') {
          throw new ShopifyGraphqlError('Shopify no ha podido procesar la imagen.', {
            status: 422,
            code: 'IMAGE_FAILED',
          });
        }
        if (node?.image?.url) return { fileId: file.id, url: node.image.url };
      }
      throw new ShopifyGraphqlError('Shopify está tardando en procesar la imagen.', {
        status: 504,
        code: 'IMAGE_TIMEOUT',
      });
    },
  };
}

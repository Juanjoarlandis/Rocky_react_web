import { describe, expect, it, vi } from 'vitest';
import { createDropsAdmin, mapAdminProduct, sanitizeSearch } from './drops-admin.mjs';

const PUBLICATION = 'gid://shopify/Publication/1';

function productNode(patch = {}) {
  return {
    id: 'gid://shopify/Product/1',
    handle: 'rocky-el-jefe',
    title: 'El Jefe',
    status: 'ACTIVE',
    descriptionHtml: '<p>Aquí manda él.</p>',
    featuredImage: { url: 'https://cdn.shopify.com/jefe.png', altText: 'El Jefe' },
    publishedOnPublication: true,
    collections: { nodes: [{ handle: 'rocky-drop-6' }] },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/11',
          availableForSale: true,
          price: '34.99',
          inventoryQuantity: 3,
          selectedOptions: [{ name: 'Talla', value: 'M' }],
          inventoryItem: { id: 'gid://shopify/InventoryItem/21', tracked: true },
        },
        {
          id: 'gid://shopify/ProductVariant/12',
          availableForSale: true,
          price: '34.99',
          inventoryQuantity: 0,
          selectedOptions: [{ name: 'Talla', value: 'L' }],
          inventoryItem: { id: 'gid://shopify/InventoryItem/22', tracked: false },
        },
      ],
    },
    ...patch,
  };
}

/* Admin falso: responde según el nombre de la operación y guarda las llamadas. */
function fakeAdmin(handlers) {
  const calls = [];
  return {
    calls,
    query: vi.fn(async (document, variables = {}) => {
      const name = document.match(/(?:query|mutation)\s+(\w+)/)[1];
      calls.push({ name, variables });
      const handler = handlers[name];
      if (!handler) throw new Error(`Operación inesperada: ${name}`);
      return handler(variables, calls);
    }),
  };
}

describe('lectura de drops por la Admin API', () => {
  it('lista solo colecciones de drop, con su metacampo y sus productos', async () => {
    const admin = fakeAdmin({
      RockyDrops: () => ({
        collections: {
          nodes: [
            {
              id: 'gid://shopify/Collection/6',
              handle: 'rocky-drop-6',
              title: 'ROCKY DROP 6',
              image: { url: 'https://cdn.shopify.com/cartel.png', altText: 'Cartel' },
              metafield: { value: '{"version":1}' },
            },
            {
              id: 'gid://shopify/Collection/9',
              handle: 'frontpage',
              title: 'Home',
              image: null,
              metafield: null,
            },
          ],
        },
      }),
      RockyDropProducts: () => ({ collection: { products: { nodes: [productNode()] } } }),
    });
    const drops = await createDropsAdmin({ admin, publicationId: PUBLICATION }).listDrops();
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({
      handle: 'rocky-drop-6',
      title: 'ROCKY DROP 6',
      poster: { url: 'https://cdn.shopify.com/cartel.png', alt: 'Cartel' },
      rawConfig: '{"version":1}',
    });
    expect(drops[0].products[0].handle).toBe('rocky-el-jefe');
    expect(admin.calls.find((c) => c.name === 'RockyDropProducts').variables.publicationId).toBe(
      PUBLICATION
    );
  });

  it('lee las colecciones sin el buscador (que tarda en ver las nuevas) y recorre todas las páginas', async () => {
    const page = (handle, hasNextPage, endCursor) => ({
      collections: {
        pageInfo: { hasNextPage, endCursor },
        nodes: [{ id: `c-${handle}`, handle, title: handle, image: null, metafield: null }],
      },
    });
    const admin = fakeAdmin({
      RockyDrops: ({ after }) =>
        after === 'p2' ? page('rocky-drop-7', false, null) : page('rocky-drop-6', true, 'p2'),
      RockyDropProducts: () => ({ collection: { products: { nodes: [] } } }),
    });
    const drops = await createDropsAdmin({ admin, publicationId: null }).listDrops();
    expect(drops.map((drop) => drop.handle)).toEqual(['rocky-drop-6', 'rocky-drop-7']);
    const listCalls = admin.calls.filter((c) => c.name === 'RockyDrops');
    expect(listCalls.map((c) => c.variables.after)).toEqual([null, 'p2']);
    expect(admin.query.mock.calls[0][0]).not.toMatch(/query:\s*"/);
  });

  it('sin id de publicación lista igual, sin preguntar por el canal Headless', async () => {
    const admin = fakeAdmin({
      RockyDrops: () => ({
        collections: {
          nodes: [{ id: 'c', handle: 'rocky-drop-6', title: 'D6', image: null, metafield: null }],
        },
      }),
      RockyDropProducts: () => ({
        collection: { products: { nodes: [productNode({ publishedOnPublication: undefined })] } },
      }),
    });
    await createDropsAdmin({ admin, publicationId: null }).listDrops();
    const call = admin.calls.find((c) => c.name === 'RockyDropProducts');
    expect(call.variables).toEqual({ id: 'c' });
    expect(admin.query.mock.calls[1][0]).not.toContain('publishedOnPublication');
  });

  it('traduce un producto de la Admin API', () => {
    expect(mapAdminProduct(productNode())).toEqual({
      id: 'gid://shopify/Product/1',
      handle: 'rocky-el-jefe',
      title: 'El Jefe',
      status: 'ACTIVE',
      descriptionHtml: '<p>Aquí manda él.</p>',
      image: { url: 'https://cdn.shopify.com/jefe.png', alt: 'El Jefe' },
      publishedOnHeadless: true,
      collections: ['rocky-drop-6'],
      availableForSale: true,
      variants: [
        {
          id: 'gid://shopify/ProductVariant/11',
          size: 'M',
          price: '34.99',
          availableForSale: true,
          tracked: true,
          quantity: 3,
          inventoryItemId: 'gid://shopify/InventoryItem/21',
        },
        {
          id: 'gid://shopify/ProductVariant/12',
          size: 'L',
          price: '34.99',
          availableForSale: true,
          tracked: false,
          quantity: null,
          inventoryItemId: 'gid://shopify/InventoryItem/22',
        },
      ],
    });
  });
});

describe('escritura de drops y diseños', () => {
  it('crea la colección con el metacampo JSON y sin publicarla', async () => {
    const admin = fakeAdmin({
      RockyDropCreate: () => ({
        collectionCreate: {
          collection: { id: 'gid://shopify/Collection/7', handle: 'rocky-drop-7' },
          userErrors: [],
        },
      }),
    });
    const created = await createDropsAdmin({ admin, publicationId: PUBLICATION }).createCollection({
      handle: 'rocky-drop-7',
      title: 'ROCKY DROP 7',
      configJson: '{"version":1}',
    });
    expect(created.id).toBe('gid://shopify/Collection/7');
    expect(admin.calls[0].variables.input).toEqual({
      handle: 'rocky-drop-7',
      title: 'ROCKY DROP 7',
      metafields: [{ namespace: 'rocky', key: 'drop', type: 'json', value: '{"version":1}' }],
    });
  });

  it('un rechazo de Shopify es un 422 sin detalles para el navegador', async () => {
    const admin = fakeAdmin({
      RockyDropUpdate: () => ({
        collectionUpdate: {
          collection: null,
          userErrors: [{ field: ['title'], message: 'Title is too long' }],
        },
      }),
    });
    const error = await createDropsAdmin({ admin, publicationId: PUBLICATION })
      .updateCollection({ id: 'x', title: 'x'.repeat(300) })
      .catch((e) => e);
    expect(error).toMatchObject({
      status: 422,
      code: 'SHOPIFY_REJECTED',
      message: 'Shopify no ha aceptado el cambio.',
    });
    expect(error.details[0]).toMatchObject({
      what: 'collectionUpdate',
      message: 'Title is too long',
    });
  });

  it('el diseño solo lleva existencias en las tallas con número y reutiliza la foto subida', async () => {
    const admin = fakeAdmin({
      RockyLocations: () => ({ locations: { nodes: [{ id: 'gid://shopify/Location/1' }] } }),
      RockyDesignSet: () => ({ productSet: { product: productNode(), userErrors: [] } }),
    });
    await createDropsAdmin({ admin, publicationId: PUBLICATION }).upsertProduct({
      handle: 'rocky-el-jefe',
      title: 'El Jefe',
      descriptionHtml: '<p>Aquí manda él.</p>',
      price: '34.99',
      sizes: [
        { size: 'M', quantity: 3 },
        { size: 'L', quantity: null },
      ],
      fileId: 'gid://shopify/MediaImage/5',
    });
    const { input, identifier } = admin.calls.find((c) => c.name === 'RockyDesignSet').variables;
    expect(identifier).toEqual({ handle: 'rocky-el-jefe' });
    expect(input.files).toEqual([{ id: 'gid://shopify/MediaImage/5' }]);
    expect(input.variants[0]).toMatchObject({
      inventoryItem: { tracked: true },
      inventoryQuantities: [
        { locationId: 'gid://shopify/Location/1', name: 'available', quantity: 3 },
      ],
    });
    expect(input.variants[1]).toEqual({
      optionValues: [{ optionName: 'Talla', name: 'L' }],
      price: '34.99',
      inventoryPolicy: 'DENY',
      inventoryItem: { tracked: false },
    });
  });

  it('publica solo en el canal Headless y despublica de todos los canales', async () => {
    // Un diseño que siguiera en la tienda online u otro canal se podría ver o
    // comprar sin pasar por el BFF: se saca de todos (venta-de-drops).
    const admin = fakeAdmin({
      RockyPublications: () => ({
        publications: {
          nodes: [{ id: PUBLICATION }, { id: 'gid://shopify/Publication/2' }],
        },
      }),
      RockyPublish: () => ({ publishablePublish: { userErrors: [] } }),
      RockyUnpublish: () => ({ publishableUnpublish: { userErrors: [] } }),
    });
    const drops = createDropsAdmin({ admin, publicationId: PUBLICATION });
    await drops.publish('gid://shopify/Product/1', '2026-11-13T19:00:00.000Z');
    await drops.unpublish('gid://shopify/Product/1');
    await drops.unpublish('gid://shopify/Product/2');
    const publish = admin.calls.find((c) => c.name === 'RockyPublish');
    expect(publish.variables.input).toEqual([
      { publicationId: PUBLICATION, publishDate: '2026-11-13T19:00:00.000Z' },
    ]);
    const unpublish = admin.calls.filter((c) => c.name === 'RockyUnpublish');
    expect(unpublish[0].variables.input).toEqual([
      { publicationId: PUBLICATION },
      { publicationId: 'gid://shopify/Publication/2' },
    ]);
    // La lista de canales se pide una vez.
    expect(admin.calls.filter((c) => c.name === 'RockyPublications')).toHaveLength(1);
  });

  it('busca una colección por handle, sea o no un drop válido', async () => {
    const admin = fakeAdmin({
      RockyCollectionByHandle: ({ handle }) => ({
        collectionByIdentifier:
          handle === 'rocky-drop-4' ? { id: 'gid://shopify/Collection/4', handle } : null,
      }),
    });
    const drops = createDropsAdmin({ admin, publicationId: PUBLICATION });
    expect(await drops.findCollectionByHandle('rocky-drop-4')).toEqual({
      id: 'gid://shopify/Collection/4',
      handle: 'rocky-drop-4',
    });
    expect(await drops.findCollectionByHandle('rocky-drop-9')).toBe(null);
  });

  it('ajusta existencias comparando con lo que había', async () => {
    const admin = fakeAdmin({
      RockyLocations: () => ({ locations: { nodes: [{ id: 'gid://shopify/Location/1' }] } }),
      RockyDesignStock: () => ({ inventorySetQuantities: { userErrors: [] } }),
    });
    await createDropsAdmin({ admin, publicationId: PUBLICATION }).setQuantities([
      { inventoryItemId: 'gid://shopify/InventoryItem/21', quantity: 5, changeFromQuantity: 3 },
    ]);
    expect(admin.calls.at(-1).variables.input).toEqual({
      name: 'available',
      reason: 'correction',
      quantities: [
        {
          inventoryItemId: 'gid://shopify/InventoryItem/21',
          quantity: 5,
          changeFromQuantity: 3,
          locationId: 'gid://shopify/Location/1',
        },
      ],
    });
  });

  it('busca un producto por su handle', async () => {
    const admin = fakeAdmin({
      RockyDesignByHandle: ({ handle }) => ({
        productByIdentifier: handle === 'rocky-el-jefe' ? productNode() : null,
      }),
    });
    const drops = createDropsAdmin({ admin, publicationId: PUBLICATION });
    expect((await drops.findProductByHandle('rocky-el-jefe')).id).toBe('gid://shopify/Product/1');
    expect(await drops.findProductByHandle('rocky-nadie')).toBe(null);
  });

  it('la búsqueda no deja colar sintaxis de Shopify', async () => {
    expect(sanitizeSearch('jefe" OR status:draft (')).toBe('jefe OR status draft');
    const admin = fakeAdmin({
      RockyDesignSearch: () => ({ products: { nodes: [productNode()] } }),
    });
    const found = await createDropsAdmin({ admin, publicationId: PUBLICATION }).searchProducts(
      'El Jefe'
    );
    expect(admin.calls[0].variables.query).toBe('title:El Jefe*');
    expect(found[0].handle).toBe('rocky-el-jefe');
  });
});

describe('subida de imágenes', () => {
  const staged = () => ({
    stagedUploadsCreate: {
      stagedTargets: [
        {
          url: 'https://shopify-staged-uploads.storage.googleapis.com/',
          resourceUrl: 'https://shopify-staged-uploads.storage.googleapis.com/tmp/x.png',
          parameters: [{ name: 'key', value: 'tmp/x.png' }],
        },
      ],
      userErrors: [],
    },
  });

  it('sube, crea el fichero y espera a que Shopify lo procese', async () => {
    let polls = 0;
    const admin = fakeAdmin({
      RockyStaged: staged,
      RockyFile: () => ({
        fileCreate: {
          files: [{ id: 'gid://shopify/MediaImage/5', fileStatus: 'UPLOADED' }],
          userErrors: [],
        },
      }),
      RockyFileStatus: () => {
        polls += 1;
        return {
          node:
            polls < 3
              ? { fileStatus: 'PROCESSING', image: null }
              : { fileStatus: 'READY', image: { url: 'https://cdn.shopify.com/x.png' } },
        };
      },
    });
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const uploaded = await createDropsAdmin({
      admin,
      publicationId: PUBLICATION,
      fetchImpl,
      sleep: async () => {},
    }).uploadImage({
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      filename: 'cartel.png',
      alt: 'Cartel',
    });
    expect(uploaded).toEqual({
      fileId: 'gid://shopify/MediaImage/5',
      url: 'https://cdn.shopify.com/x.png',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://shopify-staged-uploads.storage.googleapis.com/',
      expect.objectContaining({ method: 'POST' })
    );
    expect(admin.calls.find((c) => c.name === 'RockyFile').variables.files[0]).toEqual({
      originalSource: 'https://shopify-staged-uploads.storage.googleapis.com/tmp/x.png',
      contentType: 'IMAGE',
      alt: 'Cartel',
    });
  });

  it('si Shopify no puede procesarla, responde 422', async () => {
    const admin = fakeAdmin({
      RockyStaged: staged,
      RockyFile: () => ({
        fileCreate: { files: [{ id: 'f', fileStatus: 'UPLOADED' }], userErrors: [] },
      }),
      RockyFileStatus: () => ({ node: { fileStatus: 'FAILED', image: null } }),
    });
    const fetchImpl = vi.fn(async () => new Response(null, { status: 201 }));
    await expect(
      createDropsAdmin({
        admin,
        publicationId: PUBLICATION,
        fetchImpl,
        sleep: async () => {},
      }).uploadImage({
        buffer: Buffer.from([1]),
        mimeType: 'image/png',
        filename: 'x.png',
      })
    ).rejects.toMatchObject({ status: 422, code: 'IMAGE_FAILED' });
  });

  it('si la subida falla, no crea el fichero', async () => {
    const admin = fakeAdmin({ RockyStaged: staged });
    const fetchImpl = vi.fn(async () => new Response('denied', { status: 403 }));
    await expect(
      createDropsAdmin({
        admin,
        publicationId: PUBLICATION,
        fetchImpl,
        sleep: async () => {},
      }).uploadImage({
        buffer: Buffer.from([1]),
        mimeType: 'image/png',
        filename: 'x.png',
      })
    ).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
    expect(admin.calls.map((c) => c.name)).toEqual(['RockyStaged']);
  });

  it('rechaza un destino de subida que no es HTTPS', async () => {
    const admin = fakeAdmin({
      RockyStaged: () => {
        const result = staged();
        result.stagedUploadsCreate.stagedTargets[0].url = 'http://169.254.169.254/';
        return result;
      },
    });
    const fetchImpl = vi.fn();
    await expect(
      createDropsAdmin({ admin, publicationId: PUBLICATION, fetchImpl }).uploadImage({
        buffer: Buffer.from([1]),
        mimeType: 'image/png',
        filename: 'x.png',
      })
    ).rejects.toMatchObject({ code: 'UPLOAD_TARGET' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('tamaño y variantes del póster y de los diseños (imagenes-y-medios)', () => {
  const shopifyImage = (file) => ({
    url: `https://cdn.shopify.com/${file}`,
    altText: 'Cartel',
    width: 1024,
    height: 1536,
    w320: `https://cdn.shopify.com/${file}?width=320`,
    w640: `https://cdn.shopify.com/${file}?width=640`,
    w1280: `https://cdn.shopify.com/${file}?width=1280`,
  });
  const mapped = (file) => ({
    url: `https://cdn.shopify.com/${file}`,
    alt: 'Cartel',
    width: 1024,
    height: 1536,
    sources: [
      { width: 320, url: `https://cdn.shopify.com/${file}?width=320` },
      { width: 640, url: `https://cdn.shopify.com/${file}?width=640` },
      { width: 1024, url: `https://cdn.shopify.com/${file}?width=1280` },
    ],
  });

  it('el póster de un drop lleva su tamaño real y una URL por ancho', async () => {
    const admin = fakeAdmin({
      RockyDrops: () => ({
        collections: {
          nodes: [
            {
              id: 'gid://shopify/Collection/6',
              handle: 'rocky-drop-6',
              title: 'ROCKY DROP 6',
              image: shopifyImage('cartel.png'),
              metafield: null,
            },
          ],
        },
      }),
      RockyDropProducts: () => ({ collection: { products: { nodes: [] } } }),
    });
    const drops = await createDropsAdmin({ admin, publicationId: PUBLICATION }).listDrops();

    expect(drops[0].poster).toEqual(mapped('cartel.png'));
    const [document] = admin.query.mock.calls.find(([text]) => /query RockyDrops\b/.test(text));
    expect(document).toContain('w640: url(transform: { maxWidth: 640 })');
  });

  it('la foto de un diseño también', () => {
    expect(
      mapAdminProduct({ ...productNode(), featuredImage: shopifyImage('jefe.png') }).image
    ).toEqual(mapped('jefe.png'));
    expect(mapAdminProduct({ ...productNode(), featuredImage: null }).image).toBeNull();
  });
});

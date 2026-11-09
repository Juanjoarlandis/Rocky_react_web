import { describe, expect, it, vi } from 'vitest';
import { createDropsModel } from './model.mjs';
import {
  createTallerService,
  descriptionToHtml,
  htmlToDescription,
  sniffImage,
} from './taller.mjs';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const FUTURE = '2026-11-13T20:00:00+01:00';
const FUTURE_UTC = '2026-11-13T19:00:00.000Z';

/* Shopify en memoria: colecciones con metacampo, productos y publicación. */
function memoryShopify() {
  const collections = new Map();
  const products = new Map();
  const published = new Map();
  let seq = 0;

  const variantOf = (productId, { size, quantity }, price) => ({
    id: `${productId}/v-${size}`,
    size,
    price,
    availableForSale: quantity === null || quantity > 0,
    tracked: quantity !== null,
    quantity,
    inventoryItemId: `${productId}/i-${size}`,
  });

  const view = (product) => ({
    ...product,
    collections: [...collections.values()]
      .filter((c) => c.productIds.includes(product.id))
      .map((c) => c.handle),
    publishedOnHeadless: published.has(product.id),
    availableForSale: product.variants.some((v) => v.availableForSale),
  });

  const admin = {
    publicationId: 'gid://shopify/Publication/1',
    listDrops: vi.fn(async () =>
      [...collections.values()].map((c) => ({
        id: c.id,
        handle: c.handle,
        title: c.title,
        poster: c.poster,
        rawConfig: c.config,
        products: c.productIds.map((id) => view(products.get(id))),
      }))
    ),
    createCollection: vi.fn(async ({ handle, title, configJson }) => {
      const id = `col-${(seq += 1)}`;
      collections.set(id, { id, handle, title, config: configJson, poster: null, productIds: [] });
      return { id, handle };
    }),
    updateCollection: vi.fn(async ({ id, title, poster }) => {
      const c = collections.get(id);
      if (title !== undefined) c.title = title;
      if (poster !== undefined) c.poster = poster;
    }),
    setConfig: vi.fn(async ({ id, configJson }) => {
      collections.get(id).config = configJson;
    }),
    addProducts: vi.fn(async (id, ids) => {
      collections.get(id).productIds.push(...ids);
    }),
    removeProducts: vi.fn(async (id, ids) => {
      const c = collections.get(id);
      c.productIds = c.productIds.filter((p) => !ids.includes(p));
    }),
    findProductByHandle: vi.fn(async (handle) => {
      const found = [...products.values()].find((p) => p.handle === handle);
      return found ? view(found) : null;
    }),
    getProduct: vi.fn(async (id) => (products.has(id) ? view(products.get(id)) : null)),
    upsertProduct: vi.fn(async ({ handle, title, descriptionHtml, price, sizes, fileId }) => {
      const existing = [...products.values()].find((p) => p.handle === handle);
      const id = existing?.id ?? `prod-${(seq += 1)}`;
      const previous = existing?.variants ?? [];
      const product = {
        id,
        handle,
        title,
        status: 'ACTIVE',
        descriptionHtml,
        image: fileId
          ? { url: `https://cdn.shopify.com/${fileId}.png`, alt: '' }
          : (existing?.image ?? null),
        variants: sizes.map((s) => {
          const old = previous.find((v) => v.size === s.size);
          // productSet solo fija existencias al crear la variante.
          return old && old.tracked && s.quantity !== null
            ? { ...old, price }
            : variantOf(id, s, price);
        }),
      };
      products.set(id, product);
      return view(product);
    }),
    setQuantities: vi.fn(async (changes) => {
      for (const change of changes) {
        for (const product of products.values()) {
          const variant = product.variants.find(
            (v) => v.inventoryItemId === change.inventoryItemId
          );
          if (!variant) continue;
          if (variant.quantity !== change.changeFromQuantity) throw new Error('compare failed');
          variant.quantity = change.quantity;
          variant.availableForSale = change.quantity > 0;
        }
      }
    }),
    publish: vi.fn(async (id, date = null) => published.set(id, date)),
    unpublish: vi.fn(async (id) => published.delete(id)),
    searchProducts: vi.fn(async () => [...products.values()].map(view)),
    uploadImage: vi.fn(async () => ({
      fileId: 'gid://shopify/MediaImage/9',
      url: 'https://cdn.shopify.com/cartel.png',
    })),
  };
  return { admin, collections, products, published };
}

function setup({ avisos = null } = {}) {
  const shopify = memoryShopify();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const dropsModel = createDropsModel({ dropsAdmin: shopify.admin, clock: () => NOW, logger });
  const catalog = { invalidate: vi.fn() };
  const taller = createTallerService({
    dropsAdmin: shopify.admin,
    dropsModel,
    catalog,
    avisos,
    clock: () => NOW,
    logger,
  });
  return { ...shopify, taller, logger, catalog, dropsModel };
}

const SIZES = [
  { size: 'S', quantity: null },
  { size: 'M', quantity: 3 },
];

async function dropWithDesign(ctx) {
  await ctx.taller.createDrop({ title: 'ROCKY DROP 7', number: 7, slug: '7' });
  await ctx.taller.updateDrop('rocky-drop-7', { launchAt: FUTURE });
  return ctx.taller.createDesign('rocky-drop-7', {
    title: 'El Jefe',
    description: 'Aquí manda él.',
    price: '34.99',
    sizes: SIZES,
    fileId: 'gid://shopify/MediaImage/5',
  });
}

describe('el Taller: drops', () => {
  it('crea un drop en borrador que no sale en la web pública', async () => {
    const ctx = setup();
    const created = await ctx.taller.createDrop({ title: 'ROCKY DROP 7', number: 7, slug: ' 7 ' });
    expect(created).toEqual({ handle: 'rocky-drop-7' });
    const [collection] = ctx.collections.values();
    expect(JSON.parse(collection.config)).toEqual({
      version: 1,
      number: 7,
      tagline: '',
      story: '',
      launchAt: null,
      endsAt: null,
      status: 'borrador',
    });
    expect((await ctx.dropsModel.publicPayload()).drops).toEqual([]);
    const [drop] = await ctx.taller.listDrops();
    expect(drop).toMatchObject({
      handle: 'rocky-drop-7',
      state: 'borrador',
      designs: [],
      notices: 0,
    });
  });

  it('no repite número ni handle', async () => {
    const ctx = setup();
    await ctx.taller.createDrop({ title: 'D7', number: 7, slug: '7' });
    await expect(
      ctx.taller.createDrop({ title: 'Otro', number: 7, slug: 'otro' })
    ).rejects.toMatchObject({
      status: 409,
      code: 'DROP_NUMBER_TAKEN',
    });
    await expect(
      ctx.taller.createDrop({ title: 'Otro', number: 8, slug: '7' })
    ).rejects.toMatchObject({
      status: 409,
      code: 'DROP_HANDLE_TAKEN',
    });
    await expect(
      ctx.taller.createDrop({ title: 'Otro', number: 9, slug: '¡¡!!' })
    ).rejects.toMatchObject({
      status: 400,
      code: 'DROP_INVALID',
    });
  });

  it('edita textos y fechas, y rechaza fechas incoherentes sin tocar Shopify', async () => {
    const ctx = setup();
    await ctx.taller.createDrop({ title: 'D7', number: 7, slug: '7' });
    await ctx.taller.updateDrop('rocky-drop-7', {
      title: 'ROCKY DROP 7',
      tagline: 'Pronto',
      launchAt: FUTURE,
      endsAt: '2026-11-20T20:00:00+01:00',
      poster: { url: 'https://cdn.shopify.com/cartel.png', alt: 'Cartel' },
    });
    const [collection] = ctx.collections.values();
    expect(collection.title).toBe('ROCKY DROP 7');
    expect(collection.poster).toEqual({ url: 'https://cdn.shopify.com/cartel.png', alt: 'Cartel' });
    expect(JSON.parse(collection.config)).toMatchObject({ tagline: 'Pronto', launchAt: FUTURE });

    ctx.admin.setConfig.mockClear();
    ctx.admin.updateCollection.mockClear();
    await expect(
      ctx.taller.updateDrop('rocky-drop-7', { title: 'Nuevo', endsAt: '2026-11-13T19:00:00+01:00' })
    ).rejects.toMatchObject({ status: 400, code: 'DROP_INVALID' });
    expect(ctx.admin.setConfig).not.toHaveBeenCalled();
    expect(ctx.admin.updateCollection).not.toHaveBeenCalled();
  });

  it('un drop que no existe es un 404', async () => {
    const ctx = setup();
    await expect(ctx.taller.updateDrop('rocky-drop-99', { tagline: 'x' })).rejects.toMatchObject({
      status: 404,
      code: 'DROP_NOT_FOUND',
    });
  });

  it('programar publica los diseños en Headless con la fecha de lanzamiento', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    expect(ctx.published.has(design.id)).toBe(false);
    await ctx.taller.schedule('rocky-drop-7');
    expect(ctx.published.get(design.id)).toBe(FUTURE_UTC);
    const payload = await ctx.dropsModel.publicPayload();
    expect(payload.drops[0]).toMatchObject({
      handle: 'rocky-drop-7',
      state: 'anunciado',
      designCount: 1,
    });
    expect(ctx.logger.info).toHaveBeenCalledWith('Taller', {
      action: 'programar',
      target: 'rocky-drop-7',
      result: 'ok',
    });
  });

  it('no programa un drop vacío ni sin fecha', async () => {
    const ctx = setup();
    await ctx.taller.createDrop({ title: 'D7', number: 7, slug: '7' });
    await expect(ctx.taller.schedule('rocky-drop-7')).rejects.toMatchObject({
      status: 409,
      code: 'DROP_EMPTY',
    });
    await ctx.taller.createDesign('rocky-drop-7', {
      title: 'X',
      description: '',
      price: '30',
      sizes: SIZES,
      fileId: null,
    });
    await expect(ctx.taller.schedule('rocky-drop-7')).rejects.toMatchObject({
      status: 400,
      code: 'DROP_INVALID',
    });
  });

  it('despublicar lo vuelve a borrador y lo saca de Headless', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    await ctx.taller.schedule('rocky-drop-7');
    await ctx.taller.unschedule('rocky-drop-7');
    expect(ctx.published.has(design.id)).toBe(false);
    expect((await ctx.dropsModel.publicPayload()).drops).toEqual([]);
  });

  it('mover la fecha de un drop programado reprograma sus diseños', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    await ctx.taller.schedule('rocky-drop-7');
    await ctx.taller.updateDrop('rocky-drop-7', { launchAt: '2026-11-14T20:00:00+01:00' });
    expect(ctx.published.get(design.id)).toBe('2026-11-14T19:00:00.000Z');
  });

  it('si la fecha ya pasó, publica al momento', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    await ctx.taller.updateDrop('rocky-drop-7', { launchAt: '2026-11-01T20:00:00+01:00' });
    await ctx.taller.schedule('rocky-drop-7');
    expect(ctx.published.get(design.id)).toBe(null);
  });

  it('cuenta los avisos del drop y de sus diseños sin repetir ni enseñar emails', async () => {
    const lists = {
      'rocky-drop-7': [{ email: 'a@x.es' }, { email: 'b@x.es', enviado: '2026-11-01' }],
      'rocky-el-jefe': [{ email: 'a@x.es' }, { email: 'c@x.es' }],
    };
    const ctx = setup({ avisos: { list: vi.fn(async (key) => lists[key] ?? []) } });
    await dropWithDesign(ctx);
    const [drop] = await ctx.taller.listDrops();
    expect(drop.notices).toBe(2);
    expect(JSON.stringify(drop)).not.toContain('@x.es');
  });
});

describe('el Taller: diseños', () => {
  it('crea el diseño completo, en su drop y sin publicar mientras sea borrador', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    expect(design).toMatchObject({
      handle: 'rocky-el-jefe',
      title: 'El Jefe',
      description: 'Aquí manda él.',
      price: '34.99',
      sizes: [
        { size: 'S', quantity: null, availableForSale: true },
        { size: 'M', quantity: 3, availableForSale: true },
      ],
      publishedOnHeadless: false,
    });
    expect(ctx.admin.upsertProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptionHtml: '<p>Aquí manda él.</p>',
        fileId: 'gid://shopify/MediaImage/5',
      })
    );
    const [collection] = ctx.collections.values();
    expect(collection.productIds).toEqual([design.id]);
  });

  it('no pisa un producto que ya tiene ese handle', async () => {
    const ctx = setup();
    await dropWithDesign(ctx);
    const second = await ctx.taller.createDesign('rocky-drop-7', {
      title: 'El Jefe',
      description: '',
      price: '30',
      sizes: SIZES,
      fileId: null,
    });
    expect(second.handle).toBe('rocky-el-jefe-2');
    expect(ctx.products.size).toBe(2);
  });

  it('en un drop programado, el diseño nuevo sale programado también', async () => {
    const ctx = setup();
    await dropWithDesign(ctx);
    await ctx.taller.schedule('rocky-drop-7');
    const extra = await ctx.taller.createDesign('rocky-drop-7', {
      title: 'Ni idea de dónde',
      description: '',
      price: '34.99',
      sizes: SIZES,
      fileId: null,
    });
    expect(ctx.published.get(extra.id)).toBe(FUTURE_UTC);
  });

  it('edita precio, texto y existencias comparando con lo que había', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    const updated = await ctx.taller.updateDesign(design.id, {
      price: '39.99',
      description: 'Línea uno\n\nOtro párrafo',
      sizes: [
        { size: 'S', quantity: null },
        { size: 'M', quantity: 7 },
      ],
    });
    expect(ctx.admin.setQuantities).toHaveBeenCalledWith([
      { inventoryItemId: `${design.id}/i-M`, quantity: 7, changeFromQuantity: 3 },
    ]);
    expect(updated).toMatchObject({ price: '39.99', description: 'Línea uno\n\nOtro párrafo' });
    expect(updated.sizes.find((s) => s.size === 'M').quantity).toBe(7);
  });

  it('no edita productos que no son de ningún drop', async () => {
    const ctx = setup();
    ctx.products.set('suelto', {
      id: 'suelto',
      handle: 'suelto',
      title: 'Suelto',
      variants: [],
      descriptionHtml: '',
    });
    await expect(ctx.taller.updateDesign('suelto', { price: '10' })).rejects.toMatchObject({
      status: 409,
      code: 'DESIGN_NOT_IN_DROP',
    });
    await expect(ctx.taller.updateDesign('nadie', { price: '10' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('añade un producto existente, pero no uno de otro drop', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    await ctx.taller.createDrop({ title: 'D8', number: 8, slug: '8' });
    await expect(ctx.taller.addExistingDesign('rocky-drop-8', design.id)).rejects.toMatchObject({
      status: 409,
      code: 'DESIGN_IN_OTHER_DROP',
    });
    ctx.products.set('suelto', {
      id: 'suelto',
      handle: 'suelto',
      title: 'Suelto',
      variants: [],
      descriptionHtml: '',
    });
    await ctx.taller.addExistingDesign('rocky-drop-8', 'suelto');
    const drop8 = [...ctx.collections.values()].find((c) => c.handle === 'rocky-drop-8');
    expect(drop8.productIds).toEqual(['suelto']);
  });

  it('quitar un diseño lo saca del drop y de la venta', async () => {
    const ctx = setup();
    const design = await dropWithDesign(ctx);
    await ctx.taller.schedule('rocky-drop-7');
    await ctx.taller.removeDesign('rocky-drop-7', design.id);
    const [collection] = ctx.collections.values();
    expect(collection.productIds).toEqual([]);
    expect(ctx.published.has(design.id)).toBe(false);
    await expect(ctx.taller.removeDesign('rocky-drop-7', design.id)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('la búsqueda dice en qué drop está cada producto', async () => {
    const ctx = setup();
    await dropWithDesign(ctx);
    const [found] = await ctx.taller.searchProducts('jefe');
    expect(found).toMatchObject({ handle: 'rocky-el-jefe', drop: 'rocky-drop-7' });
  });

  it('cada cambio invalida el modelo y el catálogo', async () => {
    const ctx = setup();
    await dropWithDesign(ctx);
    expect(ctx.catalog.invalidate).toHaveBeenCalled();
  });
});

describe('el Taller: imágenes', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const WEBP = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([1, 2, 3, 4]),
    Buffer.from('WEBPVP8 '),
  ]);

  it('identifica PNG, JPEG y WebP por su contenido', () => {
    expect(sniffImage(PNG)).toEqual({ mime: 'image/png', ext: 'png' });
    expect(sniffImage(JPEG)).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
    expect(sniffImage(WEBP)).toEqual({ mime: 'image/webp', ext: 'webp' });
    expect(sniffImage(Buffer.from('<!doctype html><script>'))).toBe(null);
    expect(sniffImage(Buffer.alloc(0))).toBe(null);
  });

  it('sube lo que es imagen y rechaza lo disfrazado con 415', async () => {
    const ctx = setup();
    await expect(ctx.taller.uploadImage({ buffer: PNG, alt: 'Cartel' })).resolves.toEqual({
      fileId: 'gid://shopify/MediaImage/9',
      url: 'https://cdn.shopify.com/cartel.png',
    });
    expect(ctx.admin.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'image/png',
        alt: 'Cartel',
        filename: expect.stringMatching(/\.png$/),
      })
    );
    await expect(
      ctx.taller.uploadImage({ buffer: Buffer.from('<html>'), alt: '' })
    ).rejects.toMatchObject({
      status: 415,
      code: 'IMAGE_UNSUPPORTED',
    });
  });
});

describe('texto de la descripción', () => {
  it('escapa el HTML y respeta párrafos y saltos', () => {
    expect(descriptionToHtml('Hola <script>alert(1)</script> & "tú"\n\nOtro\npárrafo')).toBe(
      '<p>Hola &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;tú&quot;</p><p>Otro<br>párrafo</p>'
    );
    expect(descriptionToHtml('')).toBe('');
  });

  it('vuelve a texto plano', () => {
    expect(htmlToDescription('<p>Hola &amp; adiós</p><p>Otro<br>párrafo</p>')).toBe(
      'Hola & adiós\n\nOtro\npárrafo'
    );
  });
});

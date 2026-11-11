import {
  CONFIG_STATUS,
  DROP_CONFIG_VERSION,
  dropHandleFromSlug,
  dropState,
  isDropHandle,
  normalizeSlug,
  parseDropConfig,
} from '../../../shared/drops.mjs';
import { HttpError } from '../../http/errors.mjs';
import { ensureLogger } from '../../lib/logger.mjs';
import { countPending } from '../avisos.mjs';

// Las operaciones del Taller (taller-de-drops, design.md D4 y D8). Aquí viven
// las reglas: validación del calendario, número y handle únicos, slug fijo, «un
// diseño, un drop» y la publicación en Headless según el estado del drop. Lo de
// Shopify lo hace drops-admin; cada cambio invalida el modelo y el catálogo.

const PRODUCT_HANDLE_ATTEMPTS = 20;
const EDITABLE = ['number', 'tagline', 'story', 'launchAt', 'endsAt'];

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ENTITIES[char]);

/* Texto del Taller → HTML de Shopify: escapado, párrafos por línea en blanco y
   saltos por línea simple. */
export function descriptionToHtml(text = '') {
  const clean = String(text).replace(/\r\n?/g, '\n').trim();
  if (!clean) return '';
  return clean
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

const DECODE = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

export function htmlToDescription(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => DECODE[entity])
    .trim();
}

/* PNG, JPEG o WebP por sus primeros bytes; lo demás, null. */
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function sniffImage(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 8 && PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

const notFound = (what = 'Ese drop no existe.', code = 'DROP_NOT_FOUND') =>
  new HttpError(what, { status: 404, code });

const invalid = (error) =>
  new HttpError(error.message, { status: 400, code: 'DROP_INVALID', details: [error] });

/* Lo que el Taller enseña de un diseño. */
function adminDesign(product) {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: htmlToDescription(product.descriptionHtml),
    image: product.image ?? null,
    price: product.variants[0]?.price ?? null,
    sizes: product.variants.map(({ size, quantity, availableForSale }) => ({
      size,
      quantity,
      availableForSale,
    })),
    publishedOnHeadless: Boolean(product.publishedOnHeadless),
    status: product.status ?? 'ACTIVE',
  };
}

export function createTallerService({
  dropsAdmin,
  dropsModel,
  catalog = null,
  avisos = null,
  clock = () => Date.now(),
  logger,
}) {
  const log = ensureLogger(logger);

  const sources = () => dropsModel.sources({ strict: true });

  async function requireDrop(handle) {
    const source = isDropHandle(handle)
      ? (await sources()).find((candidate) => candidate.handle === handle)
      : null;
    if (!source) throw notFound();
    return source;
  }

  function refresh() {
    dropsModel.invalidate();
    catalog?.invalidate();
  }

  const audit = (action, target) => log.info('Taller', { action, target, result: 'ok' });

  /* La fecha con la que Shopify publica: la de lanzamiento si aún no ha
     llegado; si ya pasó, al momento. */
  function publishDateFor(config) {
    const launch = Date.parse(config.launchAt ?? '');
    return Number.isFinite(launch) && launch > clock() ? new Date(launch).toISOString() : null;
  }

  async function syncPublication(productIds, config) {
    const date = publishDateFor(config);
    for (const productId of productIds) {
      // Despublicar antes deja limpia una fecha anterior.
      await dropsAdmin.unpublish(productId);
      await dropsAdmin.publish(productId, date);
    }
  }

  // La misma regla que el número público del cartel (esquina-de-la-espera).
  async function countNotices(source) {
    if (!avisos) return 0;
    return countPending(avisos, [
      source.handle,
      ...source.products.map((product) => product.handle),
    ]);
  }

  async function freeProductHandle(title) {
    const slug = normalizeSlug(title);
    if (!slug) {
      throw new HttpError('El diseño necesita un título con letras o números.', {
        status: 400,
        code: 'DESIGN_INVALID',
      });
    }
    const base = `rocky-${slug}`;
    for (let attempt = 1; attempt <= PRODUCT_HANDLE_ATTEMPTS; attempt += 1) {
      const candidate = attempt === 1 ? base : `${base}-${attempt}`;
      if (!(await dropsAdmin.findProductByHandle(candidate))) return candidate;
    }
    throw new HttpError('Ya hay demasiados diseños con ese título.', {
      status: 409,
      code: 'DESIGN_HANDLE_TAKEN',
    });
  }

  /* Los handles de los drops válidos. Una colección `rocky-drop-*` sin
     metacampo (de antes del sistema de drops) no es un drop y no cuenta. */
  const dropHandles = async () => new Set((await sources()).map((source) => source.handle));

  async function requireDropDesign(productId) {
    const product = await dropsAdmin.getProduct(productId);
    if (!product) throw notFound('Ese diseño no existe.', 'DESIGN_NOT_FOUND');
    const valid = await dropHandles();
    if (!product.collections.some((collection) => valid.has(collection))) {
      throw new HttpError('Ese producto no es de ningún drop.', {
        status: 409,
        code: 'DESIGN_NOT_IN_DROP',
      });
    }
    return product;
  }

  return {
    async listDrops() {
      const now = clock();
      const all = await sources();
      const drops = [];
      for (const source of all) {
        const designs = source.products.map(adminDesign);
        const soldOut = designs.length > 0 && source.products.every((p) => !p.availableForSale);
        drops.push({
          handle: source.handle,
          title: source.title,
          poster: source.poster ?? null,
          config: source.config,
          state: dropState(source.config, now, { soldOut }),
          designs,
          notices: await countNotices(source),
        });
      }
      return drops.sort((a, b) => b.config.number - a.config.number);
    },

    async createDrop({ title, number, slug }) {
      const clean = normalizeSlug(slug);
      if (!clean) throw invalid({ field: 'slug', message: 'El slug necesita letras o números.' });
      const handle = dropHandleFromSlug(clean);
      const parsed = parseDropConfig({
        version: DROP_CONFIG_VERSION,
        number,
        tagline: '',
        story: '',
        launchAt: null,
        endsAt: null,
        status: CONFIG_STATUS.DRAFT,
      });
      if (!parsed.ok) throw invalid(parsed.error);
      const existing = await sources();
      if (existing.some((source) => source.handle === handle)) {
        throw new HttpError('Ya hay un drop con ese slug.', {
          status: 409,
          code: 'DROP_HANDLE_TAKEN',
        });
      }
      if (existing.some((source) => source.config.number === number)) {
        throw new HttpError('Ya hay un drop con ese número.', {
          status: 409,
          code: 'DROP_NUMBER_TAKEN',
        });
      }
      // Una colección con ese handle, aunque no sea un drop válido: Shopify
      // crearía la nueva con un sufijo y el Taller perdería la pista.
      if (await dropsAdmin.findCollectionByHandle(handle)) {
        throw new HttpError(
          'Ya hay una colección con ese handle en Shopify. Elige otro slug o adopta la colección con su metacampo (docs/ops/drops.md).',
          { status: 409, code: 'DROP_HANDLE_TAKEN' }
        );
      }
      const created = await dropsAdmin.createCollection({
        handle,
        title,
        configJson: JSON.stringify(parsed.config),
      });
      refresh();
      if (created?.handle && created.handle !== handle) {
        log.error('Drop creado con otro handle', { requested: handle, created: created.handle });
        throw new HttpError('Shopify ha creado el drop con otro handle. Revísalo en Shopify.', {
          status: 409,
          code: 'DROP_HANDLE_TAKEN',
        });
      }
      audit('crear', handle);
      return { handle };
    },

    async updateDrop(handle, patch) {
      const source = await requireDrop(handle);
      const next = { ...source.config };
      for (const key of EDITABLE) {
        if (patch[key] !== undefined) next[key] = patch[key];
      }
      const parsed = parseDropConfig(next);
      if (!parsed.ok) throw invalid(parsed.error);
      const config = parsed.config;
      if (config.number !== source.config.number) {
        const taken = (await sources()).some(
          (other) => other.handle !== handle && other.config.number === config.number
        );
        if (taken) {
          throw new HttpError('Ya hay un drop con ese número.', {
            status: 409,
            code: 'DROP_NUMBER_TAKEN',
          });
        }
      }

      try {
        if (patch.title !== undefined || patch.poster !== undefined) {
          await dropsAdmin.updateCollection({
            id: source.id,
            title: patch.title,
            poster: patch.poster,
          });
        }
        // Primero la publicación y después la configuración: si algo falla a
        // medias, la fecha guardada sigue siendo la vieja y repetir el cambio
        // vuelve a sincronizarlo todo.
        const moved = config.launchAt !== source.config.launchAt;
        if (config.status === CONFIG_STATUS.SCHEDULED && moved) {
          await syncPublication(
            source.products.map((product) => product.id),
            config
          );
        }
        if (JSON.stringify(config) !== JSON.stringify(source.config)) {
          await dropsAdmin.setConfig({ id: source.id, configJson: JSON.stringify(config) });
        }
      } finally {
        refresh();
      }
      audit('editar', handle);
      return { handle };
    },

    async schedule(handle) {
      const source = await requireDrop(handle);
      if (!source.products.length) {
        throw new HttpError('Un drop sin diseños no se puede programar.', {
          status: 409,
          code: 'DROP_EMPTY',
        });
      }
      const parsed = parseDropConfig({ ...source.config, status: CONFIG_STATUS.SCHEDULED });
      if (!parsed.ok) throw invalid(parsed.error);
      // Se publica antes de marcarlo programado: si falla a medias, sigue en
      // borrador y «Programar» se puede repetir.
      try {
        await syncPublication(
          source.products.map((product) => product.id),
          parsed.config
        );
        await dropsAdmin.setConfig({ id: source.id, configJson: JSON.stringify(parsed.config) });
      } finally {
        refresh();
      }
      audit('programar', handle);
      return { handle };
    },

    async unschedule(handle) {
      const source = await requireDrop(handle);
      const config = { ...source.config, status: CONFIG_STATUS.DRAFT };
      // Igual que al programar: primero Shopify, así un fallo a medias deja el
      // drop programado y «Despublicar» se puede repetir.
      try {
        for (const product of source.products) await dropsAdmin.unpublish(product.id);
        await dropsAdmin.setConfig({ id: source.id, configJson: JSON.stringify(config) });
      } finally {
        refresh();
      }
      audit('despublicar', handle);
      return { handle };
    },

    async createDesign(handle, { title, description = '', price, sizes, fileId = null }) {
      const source = await requireDrop(handle);
      const productHandle = await freeProductHandle(title);
      const product = await dropsAdmin.upsertProduct({
        handle: productHandle,
        title,
        descriptionHtml: descriptionToHtml(description),
        price,
        sizes,
        fileId,
      });
      await dropsAdmin.addProducts(source.id, [product.id]);
      if (source.config.status === CONFIG_STATUS.SCHEDULED) {
        await dropsAdmin.publish(product.id, publishDateFor(source.config));
      }
      refresh();
      audit('crear-diseño', productHandle);
      const created = (await dropsAdmin.getProduct(product.id)) ?? product;
      return adminDesign(created);
    },

    async updateDesign(productId, patch) {
      const product = await requireDropDesign(productId);
      const current = product.variants.map(({ size, quantity }) => ({ size, quantity }));
      const sizes = patch.sizes ?? current;
      const updated = await dropsAdmin.upsertProduct({
        handle: product.handle,
        title: patch.title ?? product.title,
        descriptionHtml:
          patch.description !== undefined
            ? descriptionToHtml(patch.description)
            : product.descriptionHtml,
        price: patch.price ?? product.variants[0]?.price,
        sizes,
        fileId: patch.fileId ?? null,
      });
      // productSet solo fija existencias al crear la variante: el resto se
      // ajusta comparando con lo que hay (changeFromQuantity).
      const changes = sizes
        .filter(({ quantity }) => quantity !== null)
        .map(({ size, quantity }) => {
          const variant = updated.variants.find((candidate) => candidate.size === size);
          return variant?.tracked && variant.quantity !== quantity
            ? {
                inventoryItemId: variant.inventoryItemId,
                quantity,
                changeFromQuantity: variant.quantity,
              }
            : null;
        })
        .filter(Boolean);
      await dropsAdmin.setQuantities(changes);
      refresh();
      audit('editar-diseño', product.handle);
      return adminDesign((await dropsAdmin.getProduct(productId)) ?? updated);
    },

    async addExistingDesign(handle, productId) {
      const source = await requireDrop(handle);
      const product = await dropsAdmin.getProduct(productId);
      if (!product) throw notFound('Ese diseño no existe.', 'DESIGN_NOT_FOUND');
      const valid = await dropHandles();
      if (product.collections.some((other) => other !== handle && valid.has(other))) {
        throw new HttpError('Ese diseño ya está en otro drop.', {
          status: 409,
          code: 'DESIGN_IN_OTHER_DROP',
        });
      }
      await dropsAdmin.addProducts(source.id, [productId]);
      if (source.config.status === CONFIG_STATUS.SCHEDULED) {
        await syncPublication([productId], source.config);
      } else {
        await dropsAdmin.unpublish(productId);
      }
      refresh();
      audit('añadir-diseño', product.handle);
      return { handle };
    },

    /* Quitar un diseño lo saca también de la venta: si no, se quedaría a la
       venta como «Tienda» sin que nadie lo decidiera. */
    async removeDesign(handle, productId) {
      const source = await requireDrop(handle);
      const product = source.products.find((candidate) => candidate.id === productId);
      if (!product) throw notFound('Ese diseño no está en el drop.', 'DESIGN_NOT_FOUND');
      await dropsAdmin.removeProducts(source.id, [productId]);
      await dropsAdmin.unpublish(productId);
      refresh();
      audit('quitar-diseño', product.handle);
      return { handle };
    },

    async searchProducts(term) {
      const valid = await dropHandles();
      return (await dropsAdmin.searchProducts(term)).map((product) => ({
        id: product.id,
        handle: product.handle,
        title: product.title,
        image: product.image ?? null,
        drop: product.collections.find((collection) => valid.has(collection)) ?? null,
      }));
    },

    async uploadImage({ buffer, alt = '' }) {
      const type = sniffImage(buffer);
      if (!type) {
        throw new HttpError('Solo se aceptan imágenes PNG, JPEG o WebP.', {
          status: 415,
          code: 'IMAGE_UNSUPPORTED',
        });
      }
      const uploaded = await dropsAdmin.uploadImage({
        buffer,
        mimeType: type.mime,
        filename: `taller-${clock()}.${type.ext}`,
        alt,
      });
      audit('subir-imagen', type.ext);
      return uploaded;
    },
  };
}

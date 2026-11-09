import express from 'express';
import { isDropHandle } from '../../../shared/drops.mjs';
import { HttpError } from '../errors.mjs';
import { ensureLogger } from '../../lib/logger.mjs';
import { asyncRoute } from '../middleware/async-route.mjs';
import { createFixedWindowRateLimiter } from '../middleware/rate-limit.mjs';
import { rules, validateBody, validateQuery, ValidationError } from '../middleware/validate.mjs';

// La API del Taller (taller-de-drops). Apagado, todo es 404. Encendido:
//   /session          entrar (POST), estado (GET) y salir (DELETE)
//   /drops            listar y crear; /drops/:handle editar, programar,
//                     despublicar y sus diseños
//   /designs/:id      editar un diseño
//   /products?q=      buscar productos para añadirlos a un drop
//   /images           subir una imagen (cuerpo binario, 8 MB)
// Todo con no-store. Lo que cambia algo exige el Origin exacto y deja una
// línea en el log, también si falla (sin cuerpo ni datos personales).

const SIZES = new Set(['S', 'M', 'L', 'XL']);
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const PRODUCT_ID = /^gid:\/\/shopify\/Product\/\d+$/;
const MEDIA_ID = /^gid:\/\/shopify\/MediaImage\/\d+$/;
const PRICE = /^\d{1,3}(\.\d{1,2})?$/;
const CDN_PREFIX = 'https://cdn.shopify.com/';

const disabled = () =>
  new HttpError('El Taller no está disponible.', { status: 404, code: 'TALLER_DISABLED' });

/* Texto que puede quedarse vacío: '' borra, ausente no toca. */
const text = (max) => (value, field) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length > max) {
    throw new ValidationError(`El campo «${field}» no es válido.`, { field });
  }
  return value.trim();
};

/* Fecha que se puede borrar: null o '' la quitan, ausente no la toca. El
   formato lo valida el dominio del calendario. */
const nullableDate = (value, field) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 40) {
    throw new ValidationError(`El campo «${field}» no es una fecha válida.`, { field });
  }
  return value;
};

const poster = (value, field) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const url = value?.url;
  const alt = value?.alt ?? '';
  if (typeof url !== 'string' || !url.startsWith(CDN_PREFIX) || url.length > 500) {
    throw new ValidationError('El cartel tiene que ser una imagen subida desde el Taller.', {
      field,
    });
  }
  if (typeof alt !== 'string' || alt.length > 200) {
    throw new ValidationError('El texto alternativo del cartel es demasiado largo.', { field });
  }
  return { url, alt: alt.trim() };
};

const price = (value, field) => {
  if (typeof value !== 'string' || !PRICE.test(value) || Number(value) < 1) {
    throw new ValidationError('El precio va de 1 a 999 €, con punto decimal.', { field });
  }
  return value;
};

const sizes = (value, field) => {
  const fail = () =>
    new ValidationError('Las tallas son S, M, L o XL, sin repetir, con 0 a 999 o sin límite.', {
      field,
    });
  if (!Array.isArray(value) || value.length === 0 || value.length > SIZES.size) throw fail();
  const seen = new Set();
  return value.map((entry) => {
    const { size, quantity } = entry ?? {};
    const okQuantity =
      quantity === null || (Number.isInteger(quantity) && quantity >= 0 && quantity <= 999);
    if (!SIZES.has(size) || seen.has(size) || !okQuantity) throw fail();
    seen.add(size);
    return { size, quantity };
  });
};

const DROP_CREATE = {
  title: rules.string({ max: 80 }),
  number: rules.integer({ min: 1, max: 999 }),
  slug: rules.string({ max: 40 }),
};

const DROP_PATCH = {
  title: rules.optional(rules.string({ max: 80 })),
  number: rules.optional(rules.integer({ min: 1, max: 999 })),
  tagline: text(80),
  story: text(600),
  launchAt: nullableDate,
  endsAt: nullableDate,
  poster,
};

const DESIGN_CREATE = {
  title: rules.string({ max: 80 }),
  description: text(1000),
  price,
  sizes,
  fileId: rules.optional(rules.string({ max: 80, pattern: MEDIA_ID })),
};

const DESIGN_PATCH = {
  title: rules.optional(rules.string({ max: 80 })),
  description: text(1000),
  price: rules.optional(price),
  sizes: rules.optional(sizes),
  fileId: rules.optional(rules.string({ max: 80, pattern: MEDIA_ID })),
};

const SESSION_BODY = {
  password: rules.string({ max: 256, trim: false }),
  // Un código mal formado no se distingue de uno equivocado: lo decide el TOTP.
  code: rules.string({ max: 12 }),
};

function dropHandle(req) {
  if (!isDropHandle(req.params.handle)) {
    throw new HttpError('Ese drop no existe.', { status: 404, code: 'DROP_NOT_FOUND' });
  }
  return req.params.handle;
}

function productId(value) {
  if (typeof value !== 'string' || !PRODUCT_ID.test(value)) {
    throw new ValidationError('Ese diseño no es válido.', { field: 'productId' });
  }
  return value;
}

export function createTallerRouter({ taller, requireOrigin, logger }) {
  const router = express.Router();
  const log = ensureLogger(logger);

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!taller) return next(disabled());
    return next();
  });
  if (!taller) return router;

  const { auth, service } = taller;

  /* Una mutación del Taller: Origin exacto, permiso y una línea en el log. */
  const mutation = (action, target, handler) => [
    requireOrigin,
    auth.requireTaller,
    asyncRoute(async (req, res) => {
      const subject = target(req);
      try {
        return await handler(req, res, subject);
      } catch (error) {
        log.warn('Taller', {
          action,
          target: subject,
          result: 'error',
          code: error?.code || 'error',
        });
        throw error;
      }
    }),
  ];

  router.post(
    '/session',
    requireOrigin,
    validateBody(SESSION_BODY),
    asyncRoute(async (req, res) => res.json(await auth.login(req, res, req.body)))
  );

  router.get(
    '/session',
    asyncRoute(async (req, res) => res.json(await auth.status(req)))
  );

  router.delete(
    '/session',
    requireOrigin,
    asyncRoute(async (req, res) => {
      await auth.logout(req);
      return res.status(204).end();
    })
  );

  // Por encima de la entrada: aunque sea el panel de la crew, nada sin freno.
  router.use(createFixedWindowRateLimiter({ max: 240, windowMs: 60_000 }));

  router.get(
    '/drops',
    auth.requireTaller,
    asyncRoute(async (req, res) => res.json({ drops: await service.listDrops() }))
  );

  router.post(
    '/drops',
    validateBody(DROP_CREATE),
    ...mutation(
      'crear',
      (req) => req.body?.slug ?? '',
      async (req, res) => res.status(201).json(await service.createDrop(req.body))
    )
  );

  router.patch(
    '/drops/:handle',
    validateBody(DROP_PATCH),
    ...mutation('editar', dropHandle, async (req, res, handle) =>
      res.json(await service.updateDrop(handle, req.body))
    )
  );

  router.post(
    '/drops/:handle/schedule',
    ...mutation('programar', dropHandle, async (req, res, handle) =>
      res.json(await service.schedule(handle))
    )
  );

  router.post(
    '/drops/:handle/unschedule',
    ...mutation('despublicar', dropHandle, async (req, res, handle) =>
      res.json(await service.unschedule(handle))
    )
  );

  router.post(
    '/drops/:handle/designs',
    validateBody(DESIGN_CREATE),
    ...mutation('crear-diseño', dropHandle, async (req, res, handle) =>
      res.status(201).json(await service.createDesign(handle, req.body))
    )
  );

  router.post(
    '/drops/:handle/designs/existing',
    validateBody({ productId }),
    ...mutation('añadir-diseño', dropHandle, async (req, res, handle) =>
      res.json(await service.addExistingDesign(handle, req.body.productId))
    )
  );

  router.delete(
    '/drops/:handle/designs/:productId',
    ...mutation('quitar-diseño', dropHandle, async (req, res, handle) =>
      res.json(await service.removeDesign(handle, productId(req.params.productId)))
    )
  );

  router.patch(
    '/designs/:productId',
    validateBody(DESIGN_PATCH),
    ...mutation(
      'editar-diseño',
      (req) => productId(req.params.productId),
      async (req, res, id) => res.json(await service.updateDesign(id, req.body))
    )
  );

  router.get(
    '/products',
    auth.requireTaller,
    validateQuery({ q: rules.optional(rules.string({ max: 60 })) }),
    asyncRoute(async (req, res) =>
      res.json({ products: await service.searchProducts(req.query.q ?? '') })
    )
  );

  router.put(
    '/images',
    requireOrigin,
    auth.requireTaller,
    express.raw({ type: IMAGE_TYPES, limit: '8mb' }),
    validateQuery({ alt: rules.optional(rules.string({ max: 200 })) }),
    ...mutation(
      'subir-imagen',
      () => 'imagen',
      async (req, res) => {
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          throw new HttpError('Solo se aceptan imágenes PNG, JPEG o WebP.', {
            status: 415,
            code: 'IMAGE_UNSUPPORTED',
          });
        }
        return res
          .status(201)
          .json(await service.uploadImage({ buffer: req.body, alt: req.query.alt ?? '' }));
      }
    ).slice(2)
  );

  return router;
}

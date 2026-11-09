import { HttpError, ShopifyGraphqlError, isHttpError } from '../http/errors.mjs';
import { createKeyedLock } from '../lib/keyed-lock.mjs';

const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1_000;
const AMBIGUOUS_RETENTION_MS = 10 * 60 * 1_000;

function validateCheckoutUrl(value, allowedHosts) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ShopifyGraphqlError('Shopify ha devuelto un checkout no válido.');
  }
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new ShopifyGraphqlError('El dominio de checkout no está permitido.');
  }
  return url.toString();
}

// Operaciones del carrito ligadas a la sesión: idempotencia por operationId,
// un candado por sesión para que dos mutaciones no se pisen y comprobación de
// que la línea pertenece al carrito antes de tocarla.
//
// Con `catalog` (el catálogo vivo), además, solo se vende lo que está en la
// calle (venta-de-drops): no se añade ni se sube la cantidad de un diseño de un
// drop que no está a la venta, y el pago se para si queda alguna línea así. Lo
// que el catálogo no conoce lo decide Shopify.
export function createCartOperations({
  store,
  storefront,
  sessions,
  checkoutHosts,
  catalog = null,
  clock = () => Date.now(),
}) {
  const withCartLock = createKeyedLock();

  async function assertOnSale(variantId, context) {
    if (!catalog) return;
    const product = await catalog.findByVariant(variantId, context);
    if (product && !product.purchasable) {
      throw new HttpError('Este diseño no está a la venta: su drop no está en la calle.', {
        status: 409,
        code: 'DROP_NOT_ON_SALE',
      });
    }
  }

  async function closedTitles(lines, context) {
    if (!catalog) return [];
    const titles = [];
    for (const line of lines) {
      const product = await catalog.findByVariant(line.variant.id, context);
      if (product && !product.purchasable)
        titles.push(line.variant.product?.title || product.title);
    }
    return [...new Set(titles)];
  }

  async function runIdempotent(session, operationId, action) {
    const idempotencyKey = `${session.key}:${operationId}`;
    return withCartLock(session.key, async () => {
      await sessions.reload(session);
      const existing = await store.get('cartOperations', idempotencyKey);
      if (existing?.status === 'completed') return existing.response;
      if (existing) {
        throw new ShopifyGraphqlError('La operación anterior sigue pendiente.', {
          status: 409,
          code: 'OPERATION_PENDING',
        });
      }
      const now = clock();
      await store.setIfAbsent(
        'cartOperations',
        idempotencyKey,
        { status: 'pending', createdAt: now },
        { expiresAt: now + IDEMPOTENCY_RETENTION_MS }
      );
      try {
        const response = await action();
        await store.set(
          'cartOperations',
          idempotencyKey,
          { status: 'completed', response, completedAt: clock() },
          { expiresAt: clock() + IDEMPOTENCY_RETENTION_MS }
        );
        return response;
      } catch (error) {
        // Un rechazo claro (4xx) no deja el carrito a medias: se libera la
        // operación para que el cliente pueda corregir y reintentar con el
        // mismo operationId. Sólo un fallo ambiguo (red, 5xx) queda marcado.
        if (isHttpError(error) && error.status < 500) {
          await store.delete('cartOperations', idempotencyKey);
        } else {
          await store.set(
            'cartOperations',
            idempotencyKey,
            { status: 'ambiguous', failedAt: clock() },
            { expiresAt: clock() + AMBIGUOUS_RETENTION_MS }
          );
        }
        throw error;
      }
    });
  }

  function requireCartId(session) {
    if (!session?.record.cartId) {
      throw new ShopifyGraphqlError('No existe un carrito activo.', { status: 404 });
    }
    return session.record.cartId;
  }

  async function requireOwnedLine(cartId, lineId, context) {
    const current = await storefront.getCart(cartId, context);
    const line = current.cart?.lines.find((candidate) => candidate.id === lineId);
    // Una línea de otro carrito no existe para quien pregunta: 404, no 400.
    if (!line) {
      throw new ShopifyGraphqlError('La línea no pertenece al carrito.', {
        status: 404,
        code: 'LINE_NOT_FOUND',
      });
    }
    return line;
  }

  return {
    async read(session, context) {
      if (!session?.record.cartId) return { cart: null, warnings: [] };
      const result = await storefront.getCart(session.record.cartId, context);
      return { cart: result.cart, warnings: [] };
    },

    async addLine(session, { variantId, quantity, operationId }, context) {
      return runIdempotent(session, operationId, async () => {
        await assertOnSale(variantId, context);
        if (!session.record.cartId) {
          const created = await storefront.createCartForSession({ variantId, quantity }, context);
          await sessions.save(session, { cartId: created.fullCartId });
          return { cart: created.cart, warnings: created.warnings };
        }
        return storefront.addLines(session.record.cartId, { variantId, quantity }, context);
      });
    },

    async updateLine(session, { lineId, quantity, operationId }, context) {
      return runIdempotent(session, operationId, async () => {
        const cartId = requireCartId(session);
        const line = await requireOwnedLine(cartId, lineId, context);
        // Bajar o quitar siempre se puede; subir, solo si sigue a la venta.
        if (quantity > (line.quantity ?? 0)) await assertOnSale(line.variant.id, context);
        return storefront.updateLines(cartId, { lineId, quantity }, context);
      });
    },

    async removeLine(session, { lineId, operationId }, context) {
      return runIdempotent(session, operationId, async () => {
        const cartId = requireCartId(session);
        await requireOwnedLine(cartId, lineId, context);
        return storefront.removeLines(cartId, { lineId }, context);
      });
    },

    async checkout(session, context) {
      const cartId = requireCartId(session);
      const current = await storefront.getCart(cartId, context);
      if (!current.cart?.lines.length) {
        throw new ShopifyGraphqlError('El carrito está vacío.', { status: 409 });
      }
      const closed = await closedTitles(current.cart.lines, context);
      if (closed.length) {
        throw new HttpError(
          `Quita del carrito lo que ya no se vende para poder pagar: ${closed.join(', ')}.`,
          { status: 409, code: 'DROP_CLOSED_IN_CART' }
        );
      }
      return { checkoutUrl: validateCheckoutUrl(current.checkoutUrl, checkoutHosts) };
    },
  };
}

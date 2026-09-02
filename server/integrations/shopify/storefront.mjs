import { assertMutationSucceeded, requestShopifyGraphql, ShopifyGraphqlError } from './graphql.mjs';
import net from 'node:net';

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  featuredImage { url altText }
  collections(first: 5) { nodes { handle title } }
  variants(first: 100) {
    nodes {
      id
      title
      availableForSale
      quantityAvailable @include(if: $includeQuantity)
      selectedOptions { name value }
      price { amount currencyCode }
      image { url altText }
    }
  }
`;

const CART_FIELDS = `
  id
  totalQuantity
  checkoutUrl
  lines(first: 100) {
    nodes {
      id
      quantity
      cost { totalAmount { amount currencyCode } }
      merchandise {
        ... on ProductVariant {
          id
          title
          availableForSale
          product { handle title }
          image { url altText }
          price { amount currencyCode }
        }
      }
    }
  }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
`;

const LIST_PRODUCTS = `
  query RockyProducts($first: Int!, $after: String, $includeQuantity: Boolean!) {
    products(first: $first, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes { ${PRODUCT_FIELDS} }
    }
  }
`;

const CREATE_CART = `
  mutation RockyCartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ${CART_FIELDS} }
      userErrors { field message code }
      warnings { code message target }
    }
  }
`;

const GET_CART = `query RockyCart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;
const ADD_LINES = `
  mutation RockyCartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message code }
      warnings { code message target }
    }
  }
`;
const UPDATE_LINES = `
  mutation RockyCartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ${CART_FIELDS} }
      userErrors { field message code }
      warnings { code message target }
    }
  }
`;
const REMOVE_LINES = `
  mutation RockyCartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ${CART_FIELDS} }
      userErrors { field message code }
      warnings { code message target }
    }
  }
`;

function mapImage(image) {
  return image ? { url: image.url, alt: image.altText || '' } : null;
}

function mapProduct(product) {
  const drop = product.collections?.nodes?.[0] || null;
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description || '',
    image: mapImage(product.featuredImage),
    drop: drop ? { handle: drop.handle, title: drop.title } : null,
    variants: (product.variants?.nodes || []).map((variant) => ({
      id: variant.id,
      title: variant.title,
      availableForSale: Boolean(variant.availableForSale),
      quantityAvailable:
        typeof variant.quantityAvailable === 'number' ? variant.quantityAvailable : null,
      selectedOptions: variant.selectedOptions || [],
      price: variant.price,
      image: mapImage(variant.image),
    })),
  };
}

export function sanitizeCart(cart) {
  if (!cart) return null;
  return {
    totalQuantity: cart.totalQuantity || 0,
    lines: (cart.lines?.nodes || []).map((line) => ({
      id: line.id,
      quantity: line.quantity,
      cost: line.cost || null,
      variant: {
        id: line.merchandise.id,
        title: line.merchandise.title,
        availableForSale: Boolean(line.merchandise.availableForSale),
        product: line.merchandise.product,
        image: mapImage(line.merchandise.image),
        price: line.merchandise.price,
      },
    })),
    cost: cart.cost,
  };
}

// Shopify entrega el id de linea como UUID y le cuelga el token del carrito:
// gid://shopify/CartLine/<uuid>?cart=<token>. Esto solo descarta formas
// imposibles; la pertenencia real la valida el servicio de carrito contra el
// carrito de la sesion antes de llamar a la mutacion.
export const CART_LINE_ID = /^gid:\/\/shopify\/CartLine\/[A-Za-z0-9-]+(\?cart=[A-Za-z0-9_-]+)?$/;
export const PRODUCT_VARIANT_ID = /^gid:\/\/shopify\/ProductVariant\/[A-Za-z0-9]+$/;

function validateVariantInput(input) {
  const variantId = input?.variantId;
  const quantity = Number.parseInt(input?.quantity, 10);
  if (!PRODUCT_VARIANT_ID.test(variantId || '')) {
    throw new ShopifyGraphqlError('La variante no es válida.', {
      status: 400,
      code: 'INVALID_VARIANT',
    });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    throw new ShopifyGraphqlError('La cantidad no es válida.', {
      status: 400,
      code: 'INVALID_QUANTITY',
    });
  }
  return { merchandiseId: variantId, quantity };
}

export function createStorefrontClient({ config, fetchImpl = globalThis.fetch }) {
  const endpoint = `https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`;
  function requestHeaders(buyerIp) {
    if (!config.storefrontToken) return {};
    if (config.storefrontTokenType === 'public') {
      return { 'X-Shopify-Storefront-Access-Token': config.storefrontToken };
    }
    return {
      'Shopify-Storefront-Private-Token': config.storefrontToken,
      ...(net.isIP(buyerIp || '') ? { 'Shopify-Storefront-Buyer-IP': buyerIp } : {}),
    };
  }
  const request = (query, variables, buyerIp) =>
    requestShopifyGraphql({
      endpoint,
      query,
      variables,
      headers: requestHeaders(buyerIp),
      fetchImpl,
    });

  async function createCartForSession(input, { buyerIp } = {}) {
    const line = validateVariantInput(input);
    const { data } = await request(CREATE_CART, { lines: [line] }, buyerIp);
    const payload = assertMutationSucceeded(data.cartCreate);
    return {
      fullCartId: payload.cart.id,
      cart: sanitizeCart(payload.cart),
      warnings: payload.warnings || [],
    };
  }

  return {
    async listProducts({ first = 20, after = null, buyerIp } = {}) {
      const boundedFirst = Math.max(1, Math.min(Number.parseInt(first, 10) || 20, 50));
      const { data } = await request(
        LIST_PRODUCTS,
        {
          first: boundedFirst,
          after: after || null,
          includeQuantity: Boolean(config.exposeQuantity),
        },
        buyerIp
      );
      return {
        products: data.products.nodes.map(mapProduct),
        pageInfo: data.products.pageInfo,
      };
    },

    async createCart(input, context) {
      const result = await createCartForSession(input, context);
      return { cart: result.cart, warnings: result.warnings };
    },

    createCartForSession,

    async getCart(fullCartId, { buyerIp } = {}) {
      const { data } = await request(GET_CART, { id: fullCartId }, buyerIp);
      return {
        fullCartId: data.cart?.id || fullCartId,
        checkoutUrl: data.cart?.checkoutUrl || null,
        cart: sanitizeCart(data.cart),
      };
    },

    async addLines(fullCartId, input, { buyerIp } = {}) {
      const line = validateVariantInput(input);
      const { data } = await request(ADD_LINES, { cartId: fullCartId, lines: [line] }, buyerIp);
      const payload = assertMutationSucceeded(data.cartLinesAdd);
      return { cart: sanitizeCart(payload.cart), warnings: payload.warnings || [] };
    },

    async updateLines(fullCartId, { lineId, quantity }, { buyerIp } = {}) {
      if (!CART_LINE_ID.test(lineId || '')) {
        throw new ShopifyGraphqlError('La línea del carrito no es válida.', {
          status: 400,
          code: 'INVALID_LINE',
        });
      }
      const parsedQuantity = Number.parseInt(quantity, 10);
      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 20) {
        throw new ShopifyGraphqlError('La cantidad no es válida.', {
          status: 400,
          code: 'INVALID_QUANTITY',
        });
      }
      const { data } = await request(
        UPDATE_LINES,
        {
          cartId: fullCartId,
          lines: [{ id: lineId, quantity: parsedQuantity }],
        },
        buyerIp
      );
      const payload = assertMutationSucceeded(data.cartLinesUpdate);
      return { cart: sanitizeCart(payload.cart), warnings: payload.warnings || [] };
    },

    async removeLines(fullCartId, { lineId }, { buyerIp } = {}) {
      if (!CART_LINE_ID.test(lineId || '')) {
        throw new ShopifyGraphqlError('La línea del carrito no es válida.', {
          status: 400,
          code: 'INVALID_LINE',
        });
      }
      const { data } = await request(
        REMOVE_LINES,
        {
          cartId: fullCartId,
          lineIds: [lineId],
        },
        buyerIp
      );
      const payload = assertMutationSucceeded(data.cartLinesRemove);
      return { cart: sanitizeCart(payload.cart), warnings: payload.warnings || [] };
    },
  };
}

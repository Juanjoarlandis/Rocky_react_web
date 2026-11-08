import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { addCartLine, beginCheckout, removeCartLine, updateCartLine } from '../../api/shopify.js';
import { normalizeCart } from './normalize.js';
import { errorMessage } from '../../utils/errors.js';

export const EMPTY_CART = Object.freeze({ items: [], cost: null, totalQuantity: 0 });

function withTotals(items) {
  return {
    items,
    cost: null,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/* El carrito demo vive en el navegador y se describe con acciones; el de
   Shopify llega ya calculado del BFF y se aplica tal cual (replace). */
export function cartReducer(state, action) {
  switch (action.type) {
    case 'replace':
      return action.cart;
    case 'add': {
      const { product } = action;
      const existing = state.items.find((item) => item.id === product.id);
      const items = existing
        ? state.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...state.items, { ...product, productId: product.id, quantity: 1 }];
      return withTotals(items);
    }
    case 'remove':
      return withTotals(state.items.filter((item) => item.id !== action.item.id));
    case 'quantity':
      return withTotals(
        state.items
          .map((item) =>
            item.id === action.item.id ? { ...item, quantity: item.quantity + action.delta } : item
          )
          .filter((item) => item.quantity > 0)
      );
    default:
      return state;
  }
}

function parseCheckoutUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Shopify no ha devuelto un enlace de pago válido.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('Shopify ha devuelto un enlace de pago no seguro.');
  }
  return url.toString();
}

function variantQuantity(cart, variantId) {
  return cart.items.reduce(
    (sum, item) => sum + (item.variantId === variantId ? item.quantity : 0),
    0
  );
}

/* Cada operación espera a la anterior: una respuesta antigua nunca pisa el
   carrito nuevo. `busy` incluye también las operaciones que esperan turno. */
export function useCart({ mode, cartEnabled, onError }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const cartRef = useRef(EMPTY_CART);
  const operationsRef = useRef(Promise.resolve());
  // Shopify avisa aquí de cosas como MERCHANDISE_OUT_OF_STOCK cuando la
  // variante se agota entre que se pinta el catálogo y se pulsa añadir.
  const [warnings, setWarnings] = useState([]);
  const [inFlight, setInFlight] = useState(0);

  // Para lo que ya llega normalizado (la primera lectura del arranque)
  const applyNormalizedCart = useCallback((normalizedCart) => {
    cartRef.current = normalizedCart;
    dispatch({ type: 'replace', cart: normalizedCart });
  }, []);

  const applyServerCart = useCallback(
    (serverCart) => {
      const normalized = normalizeCart(serverCart);
      applyNormalizedCart(normalized);
      return normalized;
    },
    [applyNormalizedCart]
  );

  const ensureCartAvailable = useCallback(() => {
    if (mode !== 'demo' && (mode !== 'shopify' || !cartEnabled)) {
      throw new Error('El carrito no está disponible.');
    }
  }, [mode, cartEnabled]);

  const runCartOperation = useCallback(
    (operation) => {
      setInFlight((count) => count + 1);
      const pending = operationsRef.current.then(async () => {
        onError?.('');
        try {
          return await operation();
        } catch (operationError) {
          onError?.(errorMessage(operationError));
          throw operationError;
        } finally {
          setInFlight((count) => count - 1);
        }
      });
      // Un fallo se devuelve al llamador, pero no bloquea el siguiente turno.
      operationsRef.current = pending.catch(() => {});
      return pending;
    },
    [onError]
  );

  const runCartMutation = useCallback(
    (mutation, addedVariantId) =>
      runCartOperation(async () => {
        const previousQuantity = variantQuantity(cartRef.current, addedVariantId);
        const response = await mutation();
        // Otra operación en la cola puede haber eliminado ya esta línea.
        if (response === null) return null;
        const normalized = applyServerCart(response.cart);
        // `target` lleva el token del carrito: sólo se expone el aviso público.
        const publicWarnings = (response.warnings || []).map((warning) => ({
          code: warning.code || 'CART_WARNING',
          message: warning.message,
        }));
        setWarnings(publicWarnings);
        return {
          ...response,
          warnings: publicWarnings,
          ...(addedVariantId
            ? { added: variantQuantity(normalized, addedVariantId) > previousQuantity }
            : {}),
        };
      }),
    [applyServerCart, runCartOperation]
  );

  const addToCart = useCallback(
    async (product, variantId) => {
      ensureCartAvailable();
      if (mode === 'shopify') {
        if (!variantId) {
          throw new Error('Este producto no tiene una variante disponible.');
        }
        return runCartMutation(() => addCartLine({ variantId, quantity: 1 }), variantId);
      }
      dispatch({ type: 'add', product });
      return { added: true, warnings: [] };
    },
    [ensureCartAvailable, mode, runCartMutation]
  );

  const removeFromCart = useCallback(
    async (item) => {
      ensureCartAvailable();
      if (mode === 'shopify') {
        return runCartMutation(() => removeCartLine({ lineId: item.lineId }));
      }
      dispatch({ type: 'remove', item });
      return null;
    },
    [ensureCartAvailable, mode, runCartMutation]
  );

  const changeQuantity = useCallback(
    async (item, delta) => {
      ensureCartAvailable();
      if (mode === 'shopify') {
        return runCartMutation(() => {
          const currentItem = cartRef.current.items.find((line) => line.lineId === item.lineId);
          if (!currentItem) return null;
          const quantity = currentItem.quantity + delta;
          return quantity < 1
            ? removeCartLine({ lineId: currentItem.lineId })
            : updateCartLine({ lineId: currentItem.lineId, quantity });
        });
      }
      dispatch({ type: 'quantity', item, delta });
      return null;
    },
    [ensureCartAvailable, mode, runCartMutation]
  );

  const incrementQuantity = useCallback((item) => changeQuantity(item, 1), [changeQuantity]);
  const decrementQuantity = useCallback((item) => changeQuantity(item, -1), [changeQuantity]);

  const checkout = useCallback(async () => {
    if (mode !== 'shopify' || !cartEnabled) return null;
    return runCartOperation(async () => {
      const response = await beginCheckout();
      return parseCheckoutUrl(response?.checkoutUrl);
    });
  }, [cartEnabled, mode, runCartOperation]);

  const totalItems = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  return {
    items: cart.items,
    cost: cart.cost,
    warnings,
    totalItems,
    busy: inFlight > 0,
    applyServerCart,
    applyNormalizedCart,
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    checkout,
  };
}

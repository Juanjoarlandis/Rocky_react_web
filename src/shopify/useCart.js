import { useCallback, useMemo, useReducer, useState } from 'react';
import { addCartLine, beginCheckout, removeCartLine, updateCartLine } from './api.js';
import { normalizeCart } from './normalize.js';
import { errorMessage } from '../utils/errors.js';

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
        state.items.map((item) =>
          item.id === action.item.id ? { ...item, quantity: action.quantity } : item
        )
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

/* Operaciones del carrito en los dos modos. `busy` cuenta las mutaciones
   en vuelo: dos a la vez no se liberan la una a la otra. */
export function useCart({ mode, cartEnabled, onError }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  // Shopify avisa aquí de cosas como MERCHANDISE_OUT_OF_STOCK cuando la
  // variante se agota entre que se pinta el catálogo y se pulsa añadir.
  const [warnings, setWarnings] = useState([]);
  const [inFlight, setInFlight] = useState(0);

  const applyServerCart = useCallback((serverCart) => {
    dispatch({ type: 'replace', cart: normalizeCart(serverCart) });
  }, []);

  // Para lo que ya llega normalizado (la primera lectura del arranque)
  const applyNormalizedCart = useCallback((normalizedCart) => {
    dispatch({ type: 'replace', cart: normalizedCart });
  }, []);

  const runCartMutation = useCallback(
    async (mutation) => {
      setInFlight((count) => count + 1);
      onError?.('');
      try {
        const response = await mutation();
        applyServerCart(response.cart);
        // Solo el texto: `target` lleva el id de línea con el token del carrito.
        setWarnings(
          (response.warnings || []).map((warning) => ({
            code: warning.code || 'CART_WARNING',
            message: warning.message,
          }))
        );
        return response;
      } catch (mutationError) {
        onError?.(errorMessage(mutationError));
        throw mutationError;
      } finally {
        setInFlight((count) => count - 1);
      }
    },
    [applyServerCart, onError]
  );

  const addToCart = useCallback(
    async (product, variantId) => {
      if (mode === 'shopify') {
        if (!cartEnabled || !variantId) {
          throw new Error('Este producto no tiene una variante disponible.');
        }
        return runCartMutation(() => addCartLine({ variantId, quantity: 1 }));
      }
      dispatch({ type: 'add', product });
      return null;
    },
    [cartEnabled, mode, runCartMutation]
  );

  const removeFromCart = useCallback(
    async (item) => {
      if (mode === 'shopify') {
        return runCartMutation(() => removeCartLine({ lineId: item.lineId }));
      }
      dispatch({ type: 'remove', item });
      return null;
    },
    [mode, runCartMutation]
  );

  const changeQuantity = useCallback(
    async (item, quantity) => {
      if (quantity < 1) return removeFromCart(item);
      if (mode === 'shopify') {
        return runCartMutation(() => updateCartLine({ lineId: item.lineId, quantity }));
      }
      dispatch({ type: 'quantity', item, quantity });
      return null;
    },
    [mode, removeFromCart, runCartMutation]
  );

  const incrementQuantity = useCallback(
    (item) => changeQuantity(item, item.quantity + 1),
    [changeQuantity]
  );
  const decrementQuantity = useCallback(
    (item) => changeQuantity(item, item.quantity - 1),
    [changeQuantity]
  );

  const checkout = useCallback(async () => {
    if (mode !== 'shopify' || !cartEnabled) return null;
    setInFlight((count) => count + 1);
    onError?.('');
    try {
      const response = await beginCheckout();
      return parseCheckoutUrl(response?.checkoutUrl);
    } catch (checkoutError) {
      onError?.(errorMessage(checkoutError));
      throw checkoutError;
    } finally {
      setInFlight((count) => count - 1);
    }
  }, [cartEnabled, mode, onError]);

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

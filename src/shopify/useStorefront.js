import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCartLine,
  beginCheckout,
  getCart,
  getCustomerAccount,
  getShopifyStatus,
  listProducts,
  logoutCustomerAccount,
  removeCartLine,
  updateCartLine,
} from './api.js';
import { normalizeCart, normalizeCatalog } from './normalize.js';

const DISABLED_CAPABILITIES = Object.freeze({
  catalog: false,
  cart: false,
  customerAccounts: false,
  admin: false,
  webhooks: false,
});

const EMPTY_CART = Object.freeze({ items: [], cost: null, totalQuantity: 0 });

function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'La tienda no ha podido completar la operación.';
}

export function useStorefront({ demoProducts = [] } = {}) {
  const [mode, setMode] = useState('checking');
  const [capabilities, setCapabilities] = useState(DISABLED_CAPABILITIES);
  const [products, setProducts] = useState(demoProducts);
  const [cartState, setCartState] = useState(EMPTY_CART);
  const [account, setAccount] = useState({ loggedIn: false, customer: null });
  const [loading, setLoading] = useState(true);
  const [cartBusy, setCartBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const status = await getShopifyStatus();
        if (!active) return;

        const nextCapabilities = {
          ...DISABLED_CAPABILITIES,
          ...status.capabilities,
        };
        setCapabilities(nextCapabilities);

        if (status.mode !== 'shopify' || !nextCapabilities.catalog) {
          setMode('demo');
          return;
        }

        const [catalogResponse, cartResponse, accountResponse] = await Promise.all([
          listProducts(),
          nextCapabilities.cart ? getCart() : Promise.resolve({ cart: null }),
          nextCapabilities.customerAccounts
            ? getCustomerAccount()
            : Promise.resolve({ loggedIn: false, customer: null }),
        ]);
        if (!active) return;

        setProducts(normalizeCatalog(catalogResponse.products));
        setCartState(normalizeCart(cartResponse.cart));
        setAccount(accountResponse);
        setMode('shopify');
      } catch (requestError) {
        if (!active) return;
        setMode('demo');
        setCapabilities(DISABLED_CAPABILITIES);
        setProducts(demoProducts);
        setError(
          `${errorMessage(requestError)} Se muestra el catálogo de prueba y el pago sigue desactivado.`
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, [demoProducts]);

  const applyServerCart = useCallback((cart) => {
    setCartState(normalizeCart(cart));
  }, []);

  const runCartMutation = useCallback(async (mutation) => {
    setCartBusy(true);
    setError('');
    try {
      const response = await mutation();
      applyServerCart(response.cart);
      return response;
    } catch (mutationError) {
      setError(errorMessage(mutationError));
      throw mutationError;
    } finally {
      setCartBusy(false);
    }
  }, [applyServerCart]);

  const addToCart = useCallback(async (product, variantId) => {
    if (mode === 'shopify') {
      if (!capabilities.cart || !variantId) {
        throw new Error('Este producto no tiene una variante disponible.');
      }
      return runCartMutation(() => addCartLine({ variantId, quantity: 1 }));
    }

    setCartState((current) => {
      const existing = current.items.find((item) => item.id === product.id);
      const items = existing
        ? current.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...current.items, { ...product, productId: product.id, quantity: 1 }];
      return {
        items,
        cost: null,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      };
    });
    return null;
  }, [capabilities.cart, mode, runCartMutation]);

  const removeFromCart = useCallback(async (item) => {
    if (mode === 'shopify') {
      return runCartMutation(() => removeCartLine({ lineId: item.lineId }));
    }
    setCartState((current) => {
      const items = current.items.filter((candidate) => candidate.id !== item.id);
      return {
        items,
        cost: null,
        totalQuantity: items.reduce((sum, candidate) => sum + candidate.quantity, 0),
      };
    });
    return null;
  }, [mode, runCartMutation]);

  const changeQuantity = useCallback(async (item, quantity) => {
    if (quantity < 1) return removeFromCart(item);
    if (mode === 'shopify') {
      return runCartMutation(() =>
        updateCartLine({ lineId: item.lineId, quantity })
      );
    }
    setCartState((current) => {
      const items = current.items.map((candidate) =>
        candidate.id === item.id ? { ...candidate, quantity } : candidate
      );
      return {
        items,
        cost: null,
        totalQuantity: items.reduce((sum, candidate) => sum + candidate.quantity, 0),
      };
    });
    return null;
  }, [mode, removeFromCart, runCartMutation]);

  const incrementQuantity = useCallback(
    (item) => changeQuantity(item, item.quantity + 1),
    [changeQuantity]
  );
  const decrementQuantity = useCallback(
    (item) => changeQuantity(item, item.quantity - 1),
    [changeQuantity]
  );

  const checkout = useCallback(async () => {
    if (mode !== 'shopify' || !capabilities.cart) return null;
    setCartBusy(true);
    setError('');
    try {
      const response = await beginCheckout();
      const checkoutUrl = new URL(response.checkoutUrl);
      if (checkoutUrl.protocol !== 'https:') {
        throw new Error('Shopify ha devuelto un enlace de pago no seguro.');
      }
      return checkoutUrl.toString();
    } catch (checkoutError) {
      setError(errorMessage(checkoutError));
      throw checkoutError;
    } finally {
      setCartBusy(false);
    }
  }, [capabilities.cart, mode]);

  const logout = useCallback(async () => {
    setError('');
    try {
      const response = await logoutCustomerAccount();
      setAccount({ loggedIn: false, customer: null });
      return response.logoutUrl || null;
    } catch (logoutError) {
      setError(errorMessage(logoutError));
      throw logoutError;
    }
  }, []);

  const totalItems = useMemo(
    () => cartState.items.reduce((sum, item) => sum + item.quantity, 0),
    [cartState.items]
  );

  return {
    mode,
    capabilities,
    products,
    cartItems: cartState.items,
    cartCost: cartState.cost,
    totalItems,
    account,
    loading,
    cartBusy,
    error,
    canCheckout: mode === 'shopify' && capabilities.cart,
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    checkout,
    logout,
  };
}

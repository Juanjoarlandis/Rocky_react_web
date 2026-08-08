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
const EMPTY_PRODUCTS = Object.freeze([]);

function errorMessage(error) {
  return error instanceof Error
    ? error.message
    : 'La tienda no ha podido completar la operación.';
}

export function useStorefront({
  demoProducts = EMPTY_PRODUCTS,
  previewProducts = EMPTY_PRODUCTS,
} = {}) {
  const [mode, setMode] = useState('checking');
  const [capabilities, setCapabilities] = useState(DISABLED_CAPABILITIES);
  const [products, setProducts] = useState(EMPTY_PRODUCTS);
  const [cartState, setCartState] = useState(EMPTY_CART);
  // Shopify avisa aqui de cosas como MERCHANDISE_OUT_OF_STOCK cuando la
  // variante se agota entre que se pinta el catalogo y se pulsa anadir.
  const [cartWarnings, setCartWarnings] = useState([]);
  const [account, setAccount] = useState({ loggedIn: false, customer: null });
  const [loading, setLoading] = useState(true);
  const [cartBusy, setCartBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let isShopifyConfirmed = false;

    async function initialize() {
      try {
        const status = await getShopifyStatus();
        if (!active) return;

        const nextCapabilities = {
          ...DISABLED_CAPABILITIES,
          ...status.capabilities,
        };

        if (status.mode !== 'shopify' || !nextCapabilities.catalog) {
          setCapabilities(nextCapabilities);
          setProducts(demoProducts);
          setMode('demo');
          return;
        }

        isShopifyConfirmed = true;
        setMode('shopify');
        setProducts(EMPTY_PRODUCTS);
        setCapabilities({
          ...nextCapabilities,
          cart: false,
          customerAccounts: false,
        });

        const catalogResponse = await listProducts();
        if (!active) return;

        const liveProducts = normalizeCatalog(catalogResponse.products);
        const liveHandles = new Set(liveProducts.map((product) => product.handle));
        const localPreviews = previewProducts.filter(
          (product) => !liveHandles.has(product.handle)
        );
        setProducts([...liveProducts, ...localPreviews]);

        const unavailable = [];
        function reportUnavailable(label) {
          unavailable.push(label);
          if (!active) return;
          setError(
            `El catálogo está disponible, pero no se pudieron cargar ${unavailable.join(' y ')}. Esas funciones siguen desactivadas.`
          );
        }

        async function initializeCart() {
          if (!nextCapabilities.cart) return;
          try {
            const response = await getCart();
            if (!active) return;
            setCartState(normalizeCart(response.cart));
            setCapabilities((current) => ({ ...current, cart: true }));
          } catch {
            reportUnavailable('el carrito');
          }
        }

        async function initializeAccount() {
          if (!nextCapabilities.customerAccounts) return;
          try {
            const response = await getCustomerAccount();
            if (!active) return;
            setAccount(response);
            setCapabilities((current) => ({ ...current, customerAccounts: true }));
          } catch {
            reportUnavailable('la cuenta');
          }
        }

        await Promise.all([initializeCart(), initializeAccount()]);
      } catch (requestError) {
        if (!active) return;
        setCapabilities(DISABLED_CAPABILITIES);
        setProducts(EMPTY_PRODUCTS);
        if (isShopifyConfirmed) {
          setMode('shopify');
          setError(
            `${errorMessage(requestError)} No se pudo verificar el catálogo vivo y el pago sigue desactivado.`
          );
        } else {
          setMode('unavailable');
          setError(
            `${errorMessage(requestError)} No se pudo determinar el modo de la tienda y el pago sigue desactivado.`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, [demoProducts, previewProducts]);

  const applyServerCart = useCallback((cart) => {
    setCartState(normalizeCart(cart));
  }, []);

  const runCartMutation = useCallback(async (mutation) => {
    setCartBusy(true);
    setError('');
    try {
      const response = await mutation();
      applyServerCart(response.cart);
      // Solo el texto: `target` lleva el id de linea con el token del carrito.
      setCartWarnings(
        (response.warnings || []).map((warning) => ({
          code: warning.code || 'CART_WARNING',
          message: warning.message,
        }))
      );
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
    cartWarnings,
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

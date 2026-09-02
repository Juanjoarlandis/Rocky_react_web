import { useEffect, useState } from 'react';
import { getCart, getCustomerAccount, getShopifyStatus, listProducts } from '../../api/shopify.js';
import { normalizeCart, normalizeCatalog } from './normalize.js';
import { errorMessage } from '../../utils/errors.js';

export const DISABLED_CAPABILITIES = Object.freeze({
  catalog: false,
  cart: false,
  customerAccounts: false,
  admin: false,
  webhooks: false,
});

export const EMPTY_PRODUCTS = Object.freeze([]);

/* Modo de la tienda y catálogo. Pregunta al BFF qué hay configurado: sin
   Shopify sirve el catálogo demo; con Shopify carga el catálogo vivo y
   sólo enciende carrito y cuenta cuando su primera lectura ha ido bien
   (fallo cerrado). Devuelve además lo leído de carrito y cuenta para que
   sus hooks arranquen con datos sin pedirlos otra vez. */
export function useStorefrontStatus({
  demoProducts = EMPTY_PRODUCTS,
  onCart,
  onAccount,
  onCapability,
} = {}) {
  const [mode, setMode] = useState('checking');
  const [capabilities, setCapabilities] = useState(DISABLED_CAPABILITIES);
  const [products, setProducts] = useState(EMPTY_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let isShopifyConfirmed = false;

    function enable(capability) {
      setCapabilities((current) => ({ ...current, [capability]: true }));
      onCapability?.(capability);
    }

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
        setProducts(normalizeCatalog(catalogResponse.products));

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
            onCart?.(normalizeCart(response.cart));
            enable('cart');
          } catch {
            reportUnavailable('el carrito');
          }
        }

        async function initializeAccount() {
          if (!nextCapabilities.customerAccounts) return;
          try {
            const response = await getCustomerAccount();
            if (!active) return;
            onAccount?.(response);
            enable('customerAccounts');
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
    // Los callbacks se leen en cada paso; volver a arrancar por ellos no tiene sentido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoProducts]);

  return { mode, capabilities, products, loading, error, setError };
}

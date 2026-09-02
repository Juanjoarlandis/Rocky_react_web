import { useCallback, useMemo, useRef } from 'react';
import { useCart } from './useCart.js';
import { useCrewProfile } from './useCrewProfile.js';
import { useCustomerAccount } from './useCustomerAccount.js';
import { EMPTY_PRODUCTS, useStorefrontStatus } from './useStorefrontStatus.js';

/* La tienda vista desde la app: compone estado (modo y catálogo), carrito,
   cuenta y perfil Crew, y devuelve un objeto memoizado para que sólo cambie
   cuando cambia algo de verdad. */
export function useStorefront({ demoProducts = EMPTY_PRODUCTS } = {}) {
  // El arranque lee el carrito antes de que exista el hook del carrito: la
  // ref hace de buzón y se vacía en cuanto hay a quién entregárselo.
  const seedCartRef = useRef(null);
  const onCart = useCallback((normalizedCart) => {
    seedCartRef.current?.(normalizedCart);
  }, []);

  const customer = useCustomerAccount();
  const status = useStorefrontStatus({
    demoProducts,
    onCart,
    onAccount: customer.applyAccount,
  });
  const { mode, capabilities, products, loading, error, setError } = status;

  const cart = useCart({ mode, cartEnabled: capabilities.cart, onError: setError });
  seedCartRef.current = cart.applyNormalizedCart;

  const crewProfile = useCrewProfile({
    enabled: capabilities.customerAccounts && customer.account.loggedIn,
  });

  // En Shopify manda el carrito del BFF; en demo se puede añadir siempre que
  // el producto tenga precio y variante (eso lo decide availability.js).
  const canAddToCart = mode !== 'shopify' || capabilities.cart;

  const { account, logout } = customer;
  const {
    items: cartItems,
    cost: cartCost,
    warnings: cartWarnings,
    totalItems,
    busy: cartBusy,
    addToCart,
    removeFromCart,
    incrementQuantity,
    decrementQuantity,
    checkout,
  } = cart;
  const { equippedAvatarId: crewAvatarId, applyAvatar: updateCrewAvatar } = crewProfile;

  return useMemo(
    () => ({
      mode,
      capabilities,
      products,
      cartItems,
      cartCost,
      cartWarnings,
      totalItems,
      account,
      crewAvatarId,
      crewProfile,
      loading,
      cartBusy,
      error,
      canCheckout: mode === 'shopify' && capabilities.cart,
      canAddToCart,
      addToCart,
      removeFromCart,
      incrementQuantity,
      decrementQuantity,
      checkout,
      logout,
      updateCrewAvatar,
    }),
    [
      mode,
      capabilities,
      products,
      cartItems,
      cartCost,
      cartWarnings,
      totalItems,
      account,
      crewAvatarId,
      crewProfile,
      loading,
      cartBusy,
      error,
      canAddToCart,
      addToCart,
      removeFromCart,
      incrementQuantity,
      decrementQuantity,
      checkout,
      logout,
      updateCrewAvatar,
    ]
  );
}

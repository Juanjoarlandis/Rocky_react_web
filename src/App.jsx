import React, { Suspense, useEffect, useState } from 'react';
import { Route, Routes } from 'react-router';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import ScrollToTop from './components/ScrollToTop';
import MiniPlayer from './components/MiniPlayer';
import { MusicProvider } from './context/MusicContext';
import { CrosshairSpinner } from './components/BrandDoodles';
import demoProducts from './PRODUCTOS_ROCKY.json';
import { useStorefront } from './shopify/useStorefront';
import loadingGif from './images/rocky035.gif';
import './App.css';

// Páginas cargadas bajo demanda
const ProductPage = React.lazy(() => import('./components/ProductPage'));
const ProductDetail = React.lazy(() => import('./components/ProductDetail'));
const Cart = React.lazy(() => import('./components/Cart'));
const ChatComponent = React.lazy(() => import('./components/ChatComponent'));
const MenuDrop = React.lazy(() => import('./components/MenuDrop'));
const Studio = React.lazy(() => import('./components/Studio'));
const Crew = React.lazy(() => import('./components/Crew'));

const SPLASH_KEY = 'rocky-splash-seen';
const SPLASH_MS = 2200;

function App() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem(SPLASH_KEY)
  );
  const commerce = useStorefront({ demoProducts });

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setShowSplash(false);
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [showSplash]);

  if (showSplash) {
    return (
      <div className="splash">
        <img src={loadingGif} alt="Cargando ROCKY 035..." className="splash-gif" />
      </div>
    );
  }

  return (
    <MusicProvider>
    <div className="app">
      <NavBar
        totalItems={commerce.totalItems}
        accountEnabled={commerce.capabilities.customerAccounts}
        account={commerce.account}
        onLogout={commerce.logout}
      />
      <ScrollToTop />
      <main className="app-main">
        {(commerce.loading || commerce.mode === 'demo' || commerce.error) && (
          <div
            className={`commerce-notice ${commerce.error ? 'commerce-notice-error' : ''}`}
            role={commerce.error ? 'alert' : 'status'}
          >
            {commerce.error || (commerce.loading
              ? 'Comprobando conexión segura con la tienda…'
              : 'Modo demo: catálogo de muestra, sin reserva de stock ni pagos.')}
          </div>
        )}
        <Suspense
          fallback={
            <div className="page-loading">
              <CrosshairSpinner className="page-loading-spinner" />
              <span>Cargando...</span>
            </div>
          }
        >
          <Routes>
            <Route
              path="/"
              element={
                <ProductPage
                  products={commerce.products}
                  addToCart={commerce.addToCart}
                  commerceMode={commerce.mode}
                  canAddToCart={commerce.mode !== 'shopify' || commerce.capabilities.cart}
                />
              }
            />
            <Route
              path="/products/:category"
              element={
                <ProductPage
                  products={commerce.products}
                  addToCart={commerce.addToCart}
                  commerceMode={commerce.mode}
                  canAddToCart={commerce.mode !== 'shopify' || commerce.capabilities.cart}
                />
              }
            />
            <Route path="/menudrop" element={<MenuDrop products={commerce.products} />} />
            <Route
              path="/cart"
              element={
                <Cart
                  cart={commerce.cartItems}
                  cartCost={commerce.cartCost}
                  commerceMode={commerce.mode}
                  canCheckout={commerce.canCheckout}
                  busy={commerce.cartBusy}
                  checkout={commerce.checkout}
                  removeFromCart={commerce.removeFromCart}
                  incrementQuantity={commerce.incrementQuantity}
                  decrementQuantity={commerce.decrementQuantity}
                />
              }
            />
            <Route
              path="/product/:productId"
              element={
                <ProductDetail
                  products={commerce.products}
                  addToCart={commerce.addToCart}
                  commerceMode={commerce.mode}
                  canAddToCart={commerce.mode !== 'shopify' || commerce.capabilities.cart}
                />
              }
            />
            <Route path="/rockyIA" element={<ChatComponent />} />
            <Route path="/estudio" element={<Studio />} />
            <Route path="/crew" element={<Crew />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <MiniPlayer />
    </div>
    </MusicProvider>
  );
}

export default App;

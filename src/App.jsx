import React, { Suspense, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import NotFound from './components/NotFound';
import ScrollToTop from './components/ScrollToTop';
import MiniPlayer from './components/MiniPlayer';
import { MusicProvider } from './context/MusicContext';
import { CrosshairSpinner } from './components/BrandDoodles';
import SplashIntro from './components/SplashIntro';
import ProductPage from './components/ProductPage';
import demoProducts from './PRODUCTOS_ROCKY.json';
import previewProducts from '../server/preview-products.mjs';
import { useStorefront } from './shopify/useStorefront';
import './App.css';

// Páginas cargadas bajo demanda
const ProductDetail = React.lazy(() => import('./components/ProductDetail'));
const Cart = React.lazy(() => import('./components/Cart'));
const ChatComponent = React.lazy(() => import('./components/ChatComponent'));
const MenuDrop = React.lazy(() => import('./components/MenuDrop'));
const Studio = React.lazy(() => import('./components/Studio'));
const Crew = React.lazy(() => import('./components/Crew'));
const CrewProfile = React.lazy(() => import('./components/CrewProfile'));

const SPLASH_KEY = 'rocky-splash-seen';
const SPLASH_MS = 3000;
const DEMO_CATALOG = Object.freeze([...demoProducts, ...previewProducts]);

function App() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem(SPLASH_KEY)
  );
  const commerce = useStorefront({
    demoProducts: DEMO_CATALOG,
    previewProducts,
  });
  // Rocky IA es una pantalla de chat a viewport completo: sin footer ni scroll de página
  const esChat = useLocation().pathname === '/rockyIA';

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, '1');
      setShowSplash(false);
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [showSplash]);

  return (
    <MusicProvider>
    {showSplash && <SplashIntro />}
    <div className={`app ${esChat ? 'app--chat' : ''}`}>
      <NavBar
        totalItems={commerce.totalItems}
        accountEnabled={commerce.capabilities.customerAccounts}
        account={commerce.account}
      />
      <ScrollToTop />
      <main className="app-main">
        {((!commerce.loading && commerce.mode === 'demo') || commerce.error) && (
          <div
            className={`commerce-notice ${commerce.error ? 'commerce-notice-error' : ''}`}
            role={commerce.error ? 'alert' : 'status'}
          >
            {commerce.error || 'Modo demo: catálogo de muestra, sin reserva de stock ni pagos.'}
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
                  prioritizeFirstImage={!showSplash}
                  loading={commerce.loading}
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
                  prioritizeFirstImage={!showSplash}
                  loading={commerce.loading}
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
                  warnings={commerce.cartWarnings}
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
            <Route
              path="/rockyIA"
              element={
                <ChatComponent
                  addToCart={commerce.addToCart}
                  commerceMode={commerce.mode}
                  canAddToCart={commerce.mode === 'shopify' && commerce.capabilities.cart}
                />
              }
            />
            <Route path="/estudio" element={<Studio />} />
            <Route path="/crew" element={<Crew />} />
            <Route
              path="/mi-crew"
              element={
                <CrewProfile
                  accountEnabled={commerce.capabilities.customerAccounts}
                  account={commerce.account}
                  onLogout={commerce.logout}
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!esChat && <Footer />}
      <MiniPlayer />
    </div>
    </MusicProvider>
  );
}

export default App;

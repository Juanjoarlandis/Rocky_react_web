import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { matchPath, Route, Routes, useLocation, useNavigate } from 'react-router';
import NavBar from './components/NavBar';
import ScrollToTop from './components/ScrollToTop';
import MiniPlayer from './features/music/MiniPlayer';
import { MusicProvider } from './features/music/MusicContext';
import { CrosshairSpinner } from './components/doodles/CrosshairSpinner';
import SplashIntro from './components/SplashIntro';
import ProductPage from './features/catalog/ProductPage';
import { listenForSecret } from './features/estampida/secret.js';
import { lazyPiece, preloadPieces, usePiecesReady } from './utils/pieces.jsx';
import { useCanonicalUrl } from './hooks/usePageMetadata.js';
import { useStorefront } from './features/storefront/useStorefront';
import { useDrops } from './features/drops/useDrops.js';
import { STORAGE_KEYS } from './config/storageKeys.js';
import { readStorage, writeStorage } from './utils/storage.js';
import { ROUTE_PATHS, ROUTES } from './config/routes.js';

// Piezas opcionales: no hacen falta para pintar la página, así que su código
// y su CSS se piden con la página en reposo o al primer gesto.
const CuriousPeeker = lazyPiece(() => import('./features/peeker/CuriousPeeker'));
const CartRunner = lazyPiece(() => import('./features/cart/CartRunner'));
const Descontrol = lazyPiece(() => import('./features/night/Descontrol'));
const Estampida = lazyPiece(() => import('./features/estampida/Estampida'));

// Páginas cargadas bajo demanda
const NotFound = React.lazy(() => import('./components/NotFound'));
const ProductDetail = React.lazy(() => import('./features/catalog/ProductDetail'));
const Cart = React.lazy(() => import('./features/cart/Cart'));
const ChatComponent = React.lazy(() => import('./features/chat/ChatComponent'));
const Muro = React.lazy(() => import('./features/drops/Muro'));
const Studio = React.lazy(() => import('./features/studio/Studio'));
const Crew = React.lazy(() => import('./features/crew/Crew'));
const CrewProfile = React.lazy(() => import('./features/crew/CrewProfile'));
const Legal = React.lazy(() => import('./features/legal/Legal'));
// El panel de drops de la crew: sin enlace en la barra y con noindex.
const Taller = React.lazy(() => import('./features/taller/Taller'));
// El pie queda siempre bajo el pliegue (.app-main ocupa la pantalla): su
// código, su CSS y sus imágenes no viajan en la carga inicial.
const Footer = React.lazy(() => import('./components/Footer'));

const SPLASH_MS = 3000;
// El catálogo de muestra solo hace falta sin Shopify: se pide entonces.
const loadDemoCatalog = () => import('./data/demoProducts.js').then((module) => module.default);

function App() {
  // La URL canónica y el og:url de la ruta en curso (seo-y-cache).
  useCanonicalUrl();
  const [showSplash, setShowSplash] = useState(
    () => !readStorage(STORAGE_KEYS.splashSeen, { kind: 'session' })
  );
  const commerce = useStorefront({
    demoProducts: loadDemoCatalog,
  });
  const [estampidas, setEstampidas] = useState(0);
  const llamarALaCrew = useCallback(() => setEstampidas((n) => n + 1), []);
  // Los drops (calendario-de-drops): al caer uno se recarga el catálogo, que
  // es cuando sus diseños empiezan a salir, y la crew sale a celebrarlo.
  const drops = useDrops({
    mode: commerce.mode,
    products: commerce.products,
    onLaunch: commerce.refreshCatalog,
    onFall: llamarALaCrew,
  });
  const [carreras, setCarreras] = useState(0);
  // Las piezas opcionales esperan al catálogo: antes, la red es de la tienda.
  const piecesReady = usePiecesReady({ hold: commerce.loading });
  // En reposo se piden también las que no se montan solas (la Estampida, el
  // lightbox): quien teclee «035» o abra una foto no espera a la red.
  useEffect(() => {
    if (piecesReady) preloadPieces();
  }, [piecesReady]);
  // La escucha de «035» se queda aquí, en dos líneas: la Estampida (y con ella
  // toda la crew) solo se carga si alguien la llama: tecleándolo, desde el pie
  // o porque acaba de caer un drop.
  useEffect(() => {
    if (showSplash) return undefined;
    return listenForSecret(llamarALaCrew);
  }, [showSplash, llamarALaCrew]);
  const location = useLocation();
  const navigate = useNavigate();

  // Encender el descontrol acaba en la portada, cuando se apaga el rótulo; si
  // ya se está en ella, no se apila otra entrada en el historial.
  const { pathname } = location;
  const irALaPortada = useCallback(() => {
    if (pathname !== ROUTES.home) navigate(ROUTES.home);
  }, [pathname, navigate]);

  /* Un único envoltorio sobre el `addToCart` de la tienda para no repetirlo en
     cada página. Sólo cuenta la carrera si el añadido ha salido bien: si la
     mutación revienta, el error sube tal cual al botón y no sale nadie
     corriendo a celebrar algo que no ha pasado. */
  const { addToCart: addToCartInStore } = commerce;
  const addToCart = useCallback(
    async (...args) => {
      const resultado = await addToCartInStore(...args);
      if (resultado?.added) setCarreras((n) => n + 1);
      return resultado;
    },
    [addToCartInStore]
  );
  // Rocky IA es una pantalla de chat a viewport completo: sin footer ni scroll de página
  const esChat = Boolean(matchPath('/rockyIA', location.pathname));
  const esEstudio = Boolean(matchPath('/estudio', location.pathname));
  const muestraPlayerDeContenido = !esChat && !esEstudio;

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      writeStorage(STORAGE_KEYS.splashSeen, '1', { kind: 'session' });
      setShowSplash(false);
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [showSplash]);

  const catalogPage = (
    <ProductPage
      products={commerce.products}
      addToCart={addToCart}
      commerceMode={commerce.mode}
      canAddToCart={commerce.canAddToCart}
      loading={commerce.loading}
      dropsLoading={drops.loading}
      drops={drops.drops}
      featured={drops.featured}
      serverNow={drops.serverNow}
    />
  );

  return (
    <MusicProvider>
      {showSplash && <SplashIntro />}
      <div className={`app ${esChat ? 'app--chat' : ''}`}>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <NavBar
          totalItems={commerce.totalItems}
          accountEnabled={commerce.capabilities.customerAccounts}
          account={commerce.account}
          crewAvatarId={commerce.crewAvatarId}
        />
        {muestraPlayerDeContenido && (
          <div className="mini-player-slot mini-player-slot--content">
            <MiniPlayer />
          </div>
        )}
        <ScrollToTop />
        {piecesReady && <CuriousPeeker pathname={location.pathname} disabled={showSplash} />}
        {(piecesReady || carreras > 0) && <CartRunner runId={carreras} disabled={showSplash} />}
        {piecesReady && (
          <Descontrol
            pathname={location.pathname}
            disabled={showSplash}
            onActivated={irALaPortada}
            announceIfNight
          />
        )}
        {estampidas > 0 && (
          <Estampida disabled={showSplash} listen={false} launchSignal={estampidas} />
        )}
        <main id="main-content" className="app-main" tabIndex={-1}>
          {((!commerce.loading && commerce.mode === 'demo') || commerce.error) && (
            <div
              className={`commerce-notice ${commerce.error ? 'commerce-notice-error' : ''}`}
              role={commerce.error ? 'alert' : 'status'}
            >
              {commerce.error || 'Modo demo · catálogo de muestra, sin stock ni pagos.'}
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
              {/* La portada y las categorías son la misma página; /products/:category?
                  cubre la lista con y sin categoría, y / es la portada. */}
              <Route path={ROUTE_PATHS.home} element={catalogPage} />
              <Route path={ROUTE_PATHS.catalog} element={catalogPage} />
              <Route
                path={ROUTE_PATHS.drops}
                element={
                  <Muro
                    drops={drops.drops}
                    featured={drops.featured}
                    products={commerce.products}
                    serverNow={drops.serverNow}
                    loading={drops.loading}
                    error={drops.error}
                  />
                }
              />
              <Route
                path={ROUTE_PATHS.cart}
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
                path={ROUTE_PATHS.product}
                element={
                  <ProductDetail
                    products={commerce.products}
                    loading={commerce.loading}
                    catalogError={
                      commerce.capabilities.catalog || commerce.mode === 'demo'
                        ? ''
                        : commerce.error
                    }
                    addToCart={addToCart}
                    commerceMode={commerce.mode}
                    canAddToCart={commerce.canAddToCart}
                    drops={drops.drops}
                  />
                }
              />
              <Route
                path={ROUTE_PATHS.chat}
                element={
                  <ChatComponent
                    addToCart={addToCart}
                    commerceMode={commerce.mode}
                    canAddToCart={commerce.canAddToCart}
                    headerPlayer={<MiniPlayer variant="chat" />}
                  />
                }
              />
              <Route path={ROUTE_PATHS.studio} element={<Studio />} />
              <Route path={ROUTE_PATHS.crew} element={<Crew />} />
              <Route
                path={ROUTE_PATHS.myCrew}
                element={
                  <CrewProfile
                    accountEnabled={commerce.capabilities.customerAccounts}
                    account={commerce.account}
                    onLogout={commerce.logout}
                    onAvatarChange={commerce.updateCrewAvatar}
                    crewProfile={commerce.crewProfile}
                  />
                }
              />
              <Route path={ROUTE_PATHS.legal} element={<Legal />} />
              <Route path={ROUTE_PATHS.taller} element={<Taller />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        {/* Se pide cuando ha llegado el catálogo (o al primer gesto): antes, sus
            imágenes le quitarían red a lo que sí se ve. */}
        {!esChat && (piecesReady || !commerce.loading) && (
          <Suspense fallback={null}>
            <Footer featuredDrop={drops.featured} onLlamada={llamarALaCrew} />
          </Suspense>
        )}
      </div>
    </MusicProvider>
  );
}

export default App;

import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
// Importaciones que no necesitan ser divididas
import Header from './components/Header';
import Footer from './components/Footer';
import NavBar from './components/NavBar';
import MenuDrop from './components/MenuDrop';
import NotFound from './components/NotFound';
import products from './PRODUCTOS_ROCKY.json';
import loadingGif from './images/rocky035.gif';
import ScrollToTop from './components/ScrollToTop';
import './App.css';

// Componentes dinámicos
const ProductPage = React.lazy(() => import('./components/ProductPage'));
const ProductDetail = React.lazy(() => import('./components/ProductDetail'));
const Cart = React.lazy(() => import('./components/Cart'));
const ChatComponent = React.lazy(() => import('./components/ChatComponent'));


function App() {
  const [cart, setCart] = useState([]);
  const location = useLocation();
  const [showVideo, setShowVideo] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const videoDuration = 3000; // Duración del video en milisegundos (ajusta este valor según la duración real de tu video)

    const timer = setTimeout(() => {
      setShowVideo(false);
    }, videoDuration);

    // Limpieza: eliminar el timer si el componente se desmonta antes de que se ejecute el setTimeout
    return () => {
      clearTimeout(timer);
    };

  }, []);

  const addToCart = (product) => {
    const existingProduct = cart.find(p => p.id === product.id);
    if (existingProduct) {
      // Si el producto ya existe en el carrito, aumentamos la cantidad
      const updatedCart = cart.map(p =>
        p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      );
      setCart(updatedCart);
    } else {
      // Si el producto no existe en el carrito, lo agregamos con cantidad 1
      setCart(prevCart => [...prevCart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter(product => product.id !== productId);
    setCart(updatedCart);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const incrementQuantity = (productId) => {
    const updatedCart = cart.map(product =>
      product.id === productId ? { ...product, quantity: product.quantity + 1 } : product
    );
    setCart(updatedCart);
  }

  const decrementQuantity = (productId) => {
    const product = cart.find(p => p.id === productId);
    if (product.quantity > 1) {
      const updatedCart = cart.map(p =>
        p.id === productId ? { ...p, quantity: p.quantity - 1 } : p
      );
      setCart(updatedCart);
    } else {
      removeFromCart(productId);  // si la cantidad es 1, simplemente lo eliminamos
    }
  }

  const [filteredProducts, setFilteredProducts] = useState(products);

  const handleCategoryChange = (drop) => {
    if (drop === "all") {
      setFilteredProducts(products);
      navigate("/");  // Navega a la página principal de productos
    } else {
      const newFilteredProducts = products.filter(product => product.drop === drop);
      setFilteredProducts(newFilteredProducts);
      navigate("/products/" + drop);  // Navega a la página de productos de esa categoría
    }
  }

  return (
    <div className="App" id="outer-container">
      {showVideo ? (
        <img src={loadingGif} alt="Loading..." className="loading-animation" />
      ) : (
        <Suspense fallback={<div>Cargando...</div>}> {/* Fallback mientras se cargan los componentes */}
          <NavBar totalItems={totalItems} cart={cart} />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<ProductPage products={filteredProducts} cart={cart} addToCart={addToCart} />} />
            <Route path="/products/:category" element={<ProductPage products={filteredProducts} cart={cart} addToCart={addToCart} />} />
            <Route path="/menudrop" element={<MenuDrop products={products} onCategoryChange={handleCategoryChange} />} />
            <Route path="/cart" element={<Cart cart={cart} removeFromCart={removeFromCart} incrementQuantity={incrementQuantity} decrementQuantity={decrementQuantity} />} />
            <Route path="/product/:productId" element={<ProductDetail products={products} addToCart={addToCart} />} />
            <Route path="/rockyIA" element={<ChatComponent apiEndpoint={"https://api.bitapai.io/text"} />} />
            {/* Otras rutas */}
          </Routes>
          <Footer />
        </Suspense>
      )}
    </div>
  );
}

export default App;
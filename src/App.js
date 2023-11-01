import './App.css';
import logo from './images/Rockypng.png';
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductPage from './components/ProductPage';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import { slide as Menu } from 'react-burger-menu';
import menuicon from './images/menu-icon.png';
import { BrowserRouter as Router, Route, Link, Routes, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import cartIcon from './images/cart.png';
import iaIcon from './images/ia.png';
import medidasIcon from './images/medidas.png';
import loadingGif from './images/rocky035.gif';
import ChatComponent from './components/ChatComponent';
import Medidas from './components/Medidas';

const products = [
  {
    id: 1,
    title: 'Rocky KND',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$100',
    specifications: ['Camiseta Rocky, blah blah blha', 'Especificación 2', 'Especificación 3']
  },
  {
    id: 2,
    title: 'Producto 2',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Camiseta Rocky, blah blah blha']
  },

  {
    id: 3,
    title: 'Producto 3',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },

  {
    id: 4,
    title: 'Producto 1',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$100',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },
  {
    id: 5,
    title: 'Producto 2',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },

  {
    id: 6,
    title: 'Producto 3',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },
  // ... Puedes agregar más productos aquí
];

function App() {
  const [cart, setCart] = useState([]);
  const location = useLocation();
  const [showVideo, setShowVideo] = useState(true);

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



  return (
    <div className="App" id="outer-container">
      {showVideo ? (
        <img src={loadingGif} alt="Loading..." className="loading-animation" />
      ) : (
        <>
          <Menu customBurgerIcon={<img src={menuicon} />} width={'280px'} right pageWrapId={"page-wrap"} outerContainerId={"outer-container"}>
            {/* Links del menú siguen igual */}
          </Menu>
          <main id="page-wrap">
            <Header />
            {location.pathname !== "/cart" && (
              <Link to="/cart" className="cart-icon-container">
                <img src={cartIcon} alt="Cart" className="cart-icon" />
                {cart.length > 0 && <span className="cart-counter">{totalItems + " items"}</span>}
              </Link>
            )}
            <Link to="/rockyIA" className="ia-icon-container">
              <img src={iaIcon} alt="Cart" className="ia-icon" />
            </Link>

            <Link to="/medidas" className="medidas-icon-container">
              <img src={medidasIcon} alt="Cart" className="medidas-icon" />
            </Link>

            <Routes>
              <Route path="/" element={<ProductPage products={products} cart={cart} addToCart={addToCart} />} />
              <Route path="/cart" element={<Cart cart={cart} removeFromCart={removeFromCart} incrementQuantity={incrementQuantity} decrementQuantity={decrementQuantity} />} />
              <Route path="/product/:productId" element={<ProductDetail products={products} addToCart={addToCart} />} />
              <Route path="/rockyIA" element={<ChatComponent />} />
              <Route path="/medidas" element={<Medidas />} />
              {/* Aquí puedes agregar otras rutas para About, Contact, etc. usando el mismo formato */}
            </Routes>
            <Footer />
          </main>
        </>
      )}
    </div>
  );

}

export default App;
import './App.css';
import logo from './images/Rockypng.png';
import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import ProductPage from './components/ProductPage';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import { slide as Menu } from 'react-burger-menu';
import { BrowserRouter as Router, Route, Link, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import loadingGif from './images/rocky035.gif';
import ChatComponent from './components/ChatComponent';
import Medidas from './components/Medidas';
import NavBar from './components/NavBar';
import MenuDrop from './components/MenuDrop';
import NotFound from './components/NotFound';

const products = [

  {
    "id": 1,
    "drop": "Rocky PEPE",
    "title": "Microsoft Surface Laptop 4",
    "specifications": ["Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"],
    "price": "$1499",
    "image": "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp"
  },
  {
    id: 2,
    drop: 'Rocky FIRE',
    title: 'Producto 2',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Camiseta Rocky, blah blah blha']
  },

  {
    id: 3,
    drop: 'Rocky WATER',
    title: 'Producto 3',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },

  {
    id: 4,
    drop: 'Rocky WATER',
    title: 'Producto 1',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$100',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },
  {
    id: 5,
    drop: 'Rocky WATER',
    title: 'Producto 2',
    image: "https://rockystorage.s3.us-east-1.amazonaws.com/1.webp",
    price: '$200',
    specifications: ['Especificación 1', 'Especificación 2', 'Especificación 3']
  },

  {
    id: 6,
    drop: 'Rocky WATER',
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
        <>

          <NavBar totalItems={totalItems} cart={cart} />

          <Routes>
            <Route path="/" element={<ProductPage products={filteredProducts} cart={cart} addToCart={addToCart} />} />
            <Route path="/products/:category" element={<ProductPage products={filteredProducts} cart={cart} addToCart={addToCart} />} />
            <Route path="/menudrop" element={<MenuDrop products={products} onCategoryChange={handleCategoryChange} />} />
            <Route path="/cart" element={<Cart cart={cart} removeFromCart={removeFromCart} incrementQuantity={incrementQuantity} decrementQuantity={decrementQuantity} />} />
            <Route path="/product/:productId" element={<ProductDetail products={products} addToCart={addToCart} />} />
            <Route path="/rockyIA" element={<ChatComponent />} />
            <Route path="/medidas" element={<Medidas />} />
            <Route path="*" element={<NotFound />} />
            {/* Aquí puedes agregar otras rutas para About, Contact, etc. usando el mismo formato */}
          </Routes>
          <Footer />

        </>
      )}
    </div>
  );

}

export default App;
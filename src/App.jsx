import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import './App.css';

// Configuración de Cognito
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_u4CTFLq9U',     
      userPoolClientId: '448a06m1c5kqtbu7l3fjr5rii6', 
    }
  }
});

// Productos - Colección "Among Ravens & Crimson Roses"
const productosIniciales = [
  { 
    id: 1, 
    nombre: 'Cojín de Terciopelo Mira', 
    precio: 89.99, 
    categoria: 'Hogar', 
    stock: 12, 
    imagen: '/images/cojin-terciopelo.jpg',
    descripcion: 'Terciopelo burdeos con bordados en hilo dorado'
  },
  { 
    id: 2, 
    nombre: 'Anillo de Plata Ascua', 
    precio: 149.99, 
    categoria: 'Joyas', 
    stock: 8, 
    imagen: '/images/anillo-plata.jpg',
    descripcion: 'Plara esterlina con rubí sintético talla princesa'
  },
  { 
    id: 3, 
    nombre: 'Set de Escritorio de Piel Atelier', 
    precio: 299.99, 
    categoria: 'Accesorios', 
    stock: 5, 
    imagen: '/images/set-escritorio.jpg',
    descripcion: 'Piel genuina negra con herrajes dorados'
  },
  { 
    id: 4, 
    nombre: 'Vestido Raven Noir', 
    precio: 249.99, 
    categoria: 'Vestidos', 
    stock: 7, 
    imagen: '/images/vestido-raven.jpg',
    descripcion: 'Gasa de seda negra con detalles de encaje'
  },
  { 
    id: 5, 
    nombre: 'Collar Perla Negra', 
    precio: 189.99, 
    categoria: 'Joyas', 
    stock: 10, 
    imagen: '/images/collar-perla.jpg',
    descripcion: 'Perlas negras de agua dulce con cierre de plata'
  },
  { 
    id: 6, 
    nombre: 'Velas Aromáticas Crimson', 
    precio: 45.99, 
    categoria: 'Hogar', 
    stock: 20, 
    imagen: '/images/velas-crimson.jpg',
    descripcion: 'Set de 3 velas con aroma a rosas y sándalo'
  }
];

function App() {
  const [carrito, setCarrito] = useState(() => {
    const savedCart = localStorage.getItem('carrito');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [productos] = useState(productosIniciales);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo });
    setTimeout(() => setNotificacion(null), 3000);
  };

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.id === producto.id);
    
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
      mostrarNotificacion(`+1 ${producto.nombre} añadido al carrito`);
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
      mostrarNotificacion(`${producto.nombre} añadido al carrito`);
    }
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.id !== productoId));
    mostrarNotificacion('Producto eliminado del carrito', 'info');
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      eliminarDelCarrito(productoId);
      return;
    }
    
    setCarrito(carrito.map(item =>
      item.id === productoId
        ? { ...item, cantidad: nuevaCantidad }
        : item
    ));
  };

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const productosFiltrados = categoriaActiva === 'todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  const categorias = ['todas', ...new Set(productos.map(p => p.categoria))];

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app-container">
          {/* Notificación Toast */}
          {notificacion && (
            <div className={`toast-notification ${notificacion.tipo}`}>
              {notificacion.mensaje}
            </div>
          )}

          {/* Header - Estilo Crimson Raven */}
          <header className="main-header">
            <div className="header-content">
              <div className="logo-section">
                <div className="logo">
                  <img src="/images/raven-logo.png" alt="Crimson Raven" />
                </div>
                <div className="logo-text">
                  <h1>CRIMSON RAVEN</h1>
                  <p>Atelier & Co.</p>
                </div>
              </div>
              
              <nav className="main-nav">
                <a href="#">INICIO</a>
                <a href="#">COLECCIÓN</a>
                <a href="#">ATELIER</a>
                <a href="#">CONTACTO</a>
              </nav>

              <div className="user-section">
                <span>⚜️ Hola, <strong>{user?.username}</strong></span>
                <button className="cart-button" onClick={() => setCarritoAbierto(!carritoAbierto)}>
                  🛒 ({totalItems})
                </button>
                <button className="logout-button" onClick={signOut}>
                  ✦ SALIR
                </button>
              </div>
            </div>
          </header>

          {/* Hero Section - "Among Ravens & Crimson Roses" */}
          <section className="hero">
            <div className="hero-content">
              <h2>AMONG RAVENS &<br />CRIMSON ROSES</h2>
              <div className="divider"></div>
              <p>
                Descubre una colección exclusiva inspirada en la elegancia victoriana, 
                la oscuridad romántica y el lujo atemporal.
              </p>
              <button onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>
                EXPLORAR COLECCIÓN
              </button>
            </div>
          </section>

          {/* Catálogo de productos */}
          <section id="catalog" className="catalog-section">
            <div className="section-title">
              <h3>LA COLECCIÓN</h3>
              <div className="section-line"></div>
            </div>

            {/* Filtros simplificados - estilo elegante */}
            <div className="filters-wrapper">
              {categorias.map(cat => (
                <button
                  key={cat}
                  className={`filter-chip ${categoriaActiva === cat ? 'active' : ''}`}
                  onClick={() => setCategoriaActiva(cat)}
                >
                  {cat === 'todas' ? 'TODAS' : cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            <div className="products-grid">
              {productosFiltrados.map((prod) => (
                <div key={prod.id} className="product-card">
                  <div className="product-image">
                    <img 
                      src={prod.imagen} 
                      alt={prod.nombre}
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/600x800/3b0614/d6b17a?text=CRIMSON+RAVEN';
                      }}
                    />
                  </div>
                  <div className="product-content">
                    <h4>{prod.nombre}</h4>
                    <div className="card-divider"></div>
                    <p className="price">${prod.precio.toFixed(2)}</p>
                    <button 
                      onClick={() => agregarAlCarrito(prod)}
                      disabled={prod.stock === 0}
                    >
                      {prod.stock > 0 ? 'AÑADIR AL CARRO' : 'AGOTADO'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="main-footer">
            <p>© 2024 CRIMSON RAVEN — Atelier de Oscuridad Romántica</p>
            <div className="socials">
              <a href="#">IG</a>
              <a href="#">FB</a>
              <a href="#">X</a>
              <a href="#">YT</a>
            </div>
          </footer>

          {/* Carrito lateral deslizable */}
          <div className={`cart-sidebar ${carritoAbierto ? 'open' : ''}`}>
            <div className="cart-header">
              <h2>✦ TU CARRO ✦</h2>
              <button className="close-cart" onClick={() => setCarritoAbierto(false)}>✖</button>
            </div>
            
            {carrito.length === 0 ? (
              <p className="empty-cart">Tu carro está vacío</p>
            ) : (
              <>
                <div className="cart-items">
                  {carrito.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{item.nombre}</h4>
                        <p>${item.precio.toFixed(2)} c/u</p>
                      </div>
                      <div className="cart-item-controls">
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}>
                          -
                        </button>
                        <span>{item.cantidad}</span>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}>
                          +
                        </button>
                        <button 
                          className="remove-item"
                          onClick={() => eliminarDelCarrito(item.id)}
                        >
                          ✕
                        </button>
                      </div>
                      <p className="item-subtotal">
                        Subtotal: ${(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="cart-footer">
                  <div className="cart-total">
                    <strong>TOTAL:</strong>
                    <strong>${totalPrecio.toFixed(2)}</strong>
                  </div>
                  <button className="checkout-button" onClick={() => alert('Próximamente: Integración con Stripe')}>
                    PROCEDER AL PAGO
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Overlay para cerrar carrito */}
          {carritoAbierto && <div className="cart-overlay" onClick={() => setCarritoAbierto(false)} />}
        </div>
      )}
    </Authenticator>
  );
}

export default App;
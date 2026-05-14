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

// LA RUTA HACIA TU BACKEND (Asegúrate de pegar tu URL real aquí)
const API_URL = "https://d319e7lqvk.execute-api.us-east-1.amazonaws.com/productos";

function App() {
  const [carrito, setCarrito] = useState(() => {
    const savedCart = localStorage.getItem('carrito');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  // Estados para la conexión con la base de datos
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modoAdmin, setModoAdmin] = useState(false);

  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  // 1. Función para descargar el catálogo desde DynamoDB
  const cargarProductos = async () => {
    setCargando(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setProductos(data || []);
    } catch (error) {
      console.error("Error al cargar la colección:", error);
      mostrarNotificacion("Error al conectar con el Atelier", "error");
    } finally {
      setCargando(false);
    }
  };

  // Se ejecuta al cargar la página
  useEffect(() => {
    cargarProductos();
  }, []);

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
      mostrarNotificacion(`+1 ${producto.nombre} al carro`);
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
      mostrarNotificacion(`${producto.nombre} añadido`);
    }
  };

  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.id !== productoId));
    mostrarNotificacion('Artículo retirado', 'info');
  };

  const actualizarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      eliminarDelCarrito(productoId);
      return;
    }
    setCarrito(carrito.map(item =>
      item.id === productoId ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  // 2. Función para subir nuevos productos desde el panel
  const guardarNuevoProducto = async (e) => {
    e.preventDefault();
    
    const nuevoProducto = {
      id: Date.now().toString(),
      nombre: e.target.nombre.value,
      precio: parseFloat(e.target.precio.value),
      categoria: e.target.categoria.value,
      stock: parseInt(e.target.stock.value),
      imagen: e.target.imagen.value || '/images/default-item.jpg',
      descripcion: e.target.descripcion.value
    };

    try {
      mostrarNotificacion("Forjando artículo en la nube...", "info");
      await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(nuevoProducto)
      });
      
      mostrarNotificacion("¡Pieza agregada a la colección!");
      e.target.reset(); 
      cargarProductos(); 
      setModoAdmin(false);
    } catch (error) {
      console.error("Error:", error);
      mostrarNotificacion("El ritual de guardado falló", "error");
    }
  };

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const productosFiltrados = categoriaActiva === 'todas'
    ? productos
    : productos.filter(p => p.categoria === categoriaActiva);

  const categorias = ['todas', ...new Set(productos.map(p => p.categoria))];

  return (
    // ¡El loginMechanisms es vital para Cognito!
    <Authenticator loginMechanisms={['email']}>
      {({ signOut, user }) => (
        <div className="app-container">
          {notificacion && (
            <div className={`toast-notification ${notificacion.tipo}`}>
              {notificacion.mensaje}
            </div>
          )}

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
                <button className="cart-button" onClick={() => setModoAdmin(!modoAdmin)}>
                  {modoAdmin ? '✦ CERRAR ATELIER' : '✦ ADMIN'}
                </button>
                <button className="cart-button" onClick={() => setCarritoAbierto(!carritoAbierto)}>
                  🛒 ({totalItems})
                </button>
                <button className="logout-button" onClick={signOut}>
                  ✦ SALIR
                </button>
              </div>
            </div>
          </header>

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

          <section id="catalog" className="catalog-section">
            <div className="section-title">
              <h3>LA COLECCIÓN</h3>
              <div className="section-line"></div>
            </div>

            {/* Panel de Administrador */}
            {modoAdmin && (
              <div className="admin-panel" style={{ backgroundColor: '#111', padding: '25px', marginBottom: '30px', border: '1px solid #8b0000', borderRadius: '4px' }}>
                <h3 style={{ color: '#d4af37', marginTop: 0, fontFamily: 'serif' }}>Añadir Nueva Creación</h3>
                <form onSubmit={guardarNuevoProducto} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <input name="nombre" type="text" placeholder="Nombre de la pieza" required style={{ flex: '1 1 200px', padding: '10px', background: '#222', color: '#eaeaea', border: '1px solid #444' }} />
                  <input name="precio" type="number" step="0.01" placeholder="Precio (USD)" required style={{ flex: '1 1 100px', padding: '10px', background: '#222', color: '#eaeaea', border: '1px solid #444' }} />
                  <input name="categoria" type="text" placeholder="Categoría (Ej: Joyas)" required style={{ flex: '1 1 150px', padding: '10px', background: '#222', color: '#eaeaea', border: '1px solid #444' }} />
                  <input name="stock" type="number" placeholder="Unidades" required style={{ flex: '1 1 100px', padding: '10px', background: '#222', color: '#eaeaea', border: '1px solid #444' }} />
                  <input name="imagen" type="text" placeholder="Ruta de imagen (Ej: /images/anillo.jpg)" style={{ flex: '1 1 200px', padding: '10px', background: '#222', color: '#eaeaea', border: '1px solid #444' }} />
                  <textarea name="descripcion" placeholder="Descripción de la pieza..." required style={{ flex: '1 1 100%', padding: '10px', background: '#222', color: '#eaeaea', border: '1px solid #444', minHeight: '60px' }}></textarea>
                  <button type="submit" style={{ flex: '1 1 100%', backgroundColor: '#8b0000', color: '#fff', padding: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', letterSpacing: '2px' }}>
                    FORJAR ARTÍCULO EN DYNAMODB
                  </button>
                </form>
              </div>
            )}

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

            {/* Grid dinámico conectado a la nube */}
            <div className="products-grid">
              {cargando ? (
                <p style={{ textAlign: 'center', width: '100%', color: '#d4af37', fontStyle: 'italic' }}>Invocando la colección desde los archivos...</p>
              ) : productos.length === 0 ? (
                <p style={{ textAlign: 'center', width: '100%', color: '#888' }}>La bóveda está vacía. Usa el Panel Admin para añadir tesoros.</p>
              ) : (
                productosFiltrados.map((prod) => (
                  <div key={prod.id} className="product-card">
                    <div className="product-image">
                      <img 
                        src={prod.imagen} 
                        alt={prod.nombre}
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/600x800/111111/d4af37?text=CRIMSON+RAVEN';
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
                ))
              )}
            </div>
          </section>

          <footer className="main-footer">
            <p>© 2026 CRIMSON RAVEN — Atelier de Oscuridad Romántica</p>
            <div className="socials">
              <a href="#">IG</a>
              <a href="#">FB</a>
              <a href="#">X</a>
              <a href="#">YT</a>
            </div>
          </footer>

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
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}> - </button>
                        <span>{item.cantidad}</span>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}> + </button>
                        <button className="remove-item" onClick={() => eliminarDelCarrito(item.id)}> ✕ </button>
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

          {carritoAbierto && <div className="cart-overlay" onClick={() => setCarritoAbierto(false)} />}
        </div>
      )}
    </Authenticator>
  );
}

export default App;
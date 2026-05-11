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

// Productos de ROPA (coherentes con tu tienda)
const productosIniciales = [
  { id: 1, nombre: 'Camisa de Lino Premium', precio: 59.99, categoria: 'Camisas', stock: 15, imagen: '/images/camisa-lino.jpg' },
  { id: 2, nombre: 'Pantalón Chino Elástico', precio: 79.99, categoria: 'Pantalones', stock: 10, imagen: '/images/pantalon-chino.jpg' },
  { id: 3, nombre: 'Chaqueta de Cuero Vegano', precio: 149.99, categoria: 'Chaquetas', stock: 5, imagen: '/images/chaqueta-cuero.jpg' },
  { id: 4, nombre: 'Vestido Floral Veraniego', precio: 89.99, categoria: 'Vestidos', stock: 8, imagen: '/images/vestido-floral.jpg' },
  { id: 5, nombre: 'Zapatos Casual Oxford', precio: 119.99, categoria: 'Calzado', stock: 12, imagen: '/images/zapatos-oxford.jpg' }
];

function App() {
  const [carrito, setCarrito] = useState(() => {
    // Persistir carrito en localStorage
    const savedCart = localStorage.getItem('carrito');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  
  const [productos, setProductos] = useState(productosIniciales);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState(null);

  // Guardar carrito en localStorage
  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  // Mostrar notificación temporal
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

  const productosFiltrados = filtroCategoria === 'todas'
    ? productos
    : productos.filter(p => p.categoria === filtroCategoria);

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

          {/* Header con navegación */}
          <header className="main-header">
            <div className="header-content">
              <h1>👔 Elite Fashion Store</h1>
              <div className="user-section">
                <span>✨ Hola, <strong>{user?.username}</strong></span>
                <button className="cart-button" onClick={() => setCarritoAbierto(!carritoAbierto)}>
                  🛒 Carrito ({totalItems})
                </button>
                <button className="logout-button" onClick={signOut}>
                  🚪 Cerrar Sesión
                </button>
              </div>
            </div>
          </header>

          <div className="main-layout">
            {/* Sidebar con filtros */}
            <aside className="filters-sidebar">
              <h3>Filtrar por categoría</h3>
              {categorias.map(cat => (
                <button
                  key={cat}
                  className={`filter-button ${filtroCategoria === cat ? 'active' : ''}`}
                  onClick={() => setFiltroCategoria(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </aside>

            {/* Catálogo de productos */}
            <main className="catalogo">
              <h2>Nuestra Colección {filtroCategoria !== 'todas' && `- ${filtroCategoria}`}</h2>
              <div className="productos-grid">
                {productosFiltrados.map((prod) => (
                  <div key={prod.id} className="tarjeta-producto">
                    <div className="product-image-placeholder">
                      🏷️ {prod.categoria}
                    </div>
                    <h3>{prod.nombre}</h3>
                    <p className="precio">${prod.precio.toFixed(2)} USD</p>
                    <p className="stock">📦 Stock: {prod.stock} unidades</p>
                    <button 
                      onClick={() => agregarAlCarrito(prod)}
                      disabled={prod.stock === 0}
                    >
                      {prod.stock > 0 ? '➕ Añadir al Carrito' : '❌ Agotado'}
                    </button>
                  </div>
                ))}
              </div>
            </main>

            {/* Carrito lateral deslizable */}
            <div className={`cart-sidebar ${carritoAbierto ? 'open' : ''}`}>
              <div className="cart-header">
                <h2>🛍️ Tu Carrito</h2>
                <button className="close-cart" onClick={() => setCarritoAbierto(false)}>✖</button>
              </div>
              
              {carrito.length === 0 ? (
                <p className="empty-cart">Tu carrito está vacío</p>
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
                            🗑️
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
                      <strong>Total:</strong>
                      <strong>${totalPrecio.toFixed(2)} USD</strong>
                    </div>
                    <button className="checkout-button" onClick={() => alert('Próximamente: Integración con Stripe')}>
                      Proceder al Pago 💳
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Overlay para cerrar carrito */}
          {carritoAbierto && <div className="cart-overlay" onClick={() => setCarritoAbierto(false)} />}
        </div>
      )}
    </Authenticator>
  );
}

export default App;
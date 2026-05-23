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
  // Lista de administradores autorizados (puedes expandirla o gestionarla desde la nube)
  const administradores = [
    'al22020345@itsa.edu.mx'
  ];

  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [notificacion, setNotificacion] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);



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
  // 3. Función para destruir un producto en la nube
  const eliminarProductoDeLaNube = async (id) => {
    // Pedimos confirmación para evitar accidentes
    if (!window.confirm("¿Estás seguro de que deseas eliminar este tesoro de la bóveda?")) return;

    try {
      mostrarNotificacion("Eliminando de los archivos...", "info");
      await fetch(API_URL, {
        method: 'DELETE',
        body: JSON.stringify({ id }) // Le enviamos a Lambda el ID a borrar
      });
      
      mostrarNotificacion("Pieza eliminada con éxito");
      cargarProductos(); // Recargamos la lista para que desaparezca visualmente
    } catch (error) {
      console.error("Error:", error);
      mostrarNotificacion("El ritual de eliminación falló", "error");
    }
  };

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalPrecio = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

const productosFiltrados = productos.filter(p => {
    // 1. ¿Cumple con la categoría seleccionada?
    const coincideCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva;
    
    // 2. ¿Coincide con el texto de búsqueda?
    const textoBusqueda = busqueda.toLowerCase();
    
    // ¡LA CORRECCIÓN ESTÁ AQUÍ! 
    // Si el nombre o la descripción no existen (porque son productos viejos), usamos un texto vacío ('')
    const nombreSeguro = (p.nombre || '').toLowerCase();
    const descripcionSegura = (p.descripcion || '').toLowerCase();
    
    const coincideTexto = nombreSeguro.includes(textoBusqueda) || 
                          descripcionSegura.includes(textoBusqueda);
    
    // Solo mostramos el producto si cumple AMBAS condiciones
    return coincideCategoria && coincideTexto;
  });

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

              {/* NUEVA BARRA DE BÚSQUEDA */}
              <div className="search-bar" style={{ display: 'flex', alignItems: 'center', margin: '0 20px' }}>
                <span style={{ position: 'absolute', marginLeft: '10px', color: '#888' }}>🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar en el Atelier..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ 
                    padding: '8px 10px 8px 35px', 
                    borderRadius: '20px', 
                    border: '1px solid #444', 
                    background: '#222', 
                    color: '#eaeaea',
                    width: '250px',
                    outline: 'none',
                    fontFamily: 'serif'
                  }} 
                />
              </div>

              <div className="user-section">
                <span>⚜️ Hola, <strong>{user?.signInDetails?.loginId || user?.attributes?.email}</strong></span>
                {/* Verificamos si el correo del usuario actual está en la lista VIP */}
                {administradores.includes(user?.signInDetails?.loginId || user?.attributes?.email) && (
                  <button className="cart-button" onClick={() => setModoAdmin(!modoAdmin)}>
                    {modoAdmin ? '✦ CERRAR ATELIER' : '✦ ADMIN'}
                  </button>
                )}
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
                        onClick={() => setProductoSeleccionado(prod)} // ¡NUEVO EVENTO!
                        style={{ cursor: 'pointer' }} // Hace que el mouse cambie a la manita
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



                      {/* Botón de Eliminar: Solo aparece si el Modo Admin está activado */}
                      {modoAdmin && (
                        <button 
                          onClick={() => eliminarProductoDeLaNube(prod.id)}
                          style={{ backgroundColor: '#8b0000', marginTop: '10px', fontSize: '0.8em', padding: '8px' }}
                        >
                          🗑️ ELIMINAR DEL ATELIER
                        </button>
                      )}

                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <footer className="main-footer">
            <p>© 2026 CRIMSON RAVEN — Atelier de Oscuridad Romántica</p>
            <div className="socials">
              <a href="https://www.instagram.com/nyx_bee24/">IG</a>
              <a href="#">FB</a>
              <a href="#">X</a>
              <a href="#">YT</a>
            </div>
          </footer>

          {/* Pop-up de Vista Rápida del Producto */}
          {productoSeleccionado && (
            <div className="cart-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setProductoSeleccionado(null)}>
              {/* Detenemos el clic para que al tocar la tarjeta no se cierre el fondo */}
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#111', border: '1px solid #8b0000', borderRadius: '8px', padding: '30px', maxWidth: '800px', width: '90%', display: 'flex', gap: '30px', position: 'relative' }}>
                
                <button className="close-cart" onClick={() => setProductoSeleccionado(null)} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', color: '#d4af37', fontSize: '1.5em', cursor: 'pointer' }}>✖</button>
                
                <div style={{ flex: '1' }}>
                  <img 
                    src={productoSeleccionado.imagen} 
                    alt={productoSeleccionado.nombre} 
                    style={{ width: '100%', borderRadius: '4px', border: '1px solid #333' }}
                    onError={(e) => e.target.src = 'https://placehold.co/600x800/111111/d4af37?text=CRIMSON+RAVEN'}
                  />
                </div>
                
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h2 style={{ color: '#d4af37', marginTop: 0, fontFamily: 'serif', fontSize: '2em' }}>{productoSeleccionado.nombre}</h2>
                  <p style={{ color: '#eaeaea', fontSize: '1.5em', margin: '10px 0' }}>${productoSeleccionado.precio.toFixed(2)} USD</p>
                  <div className="card-divider" style={{ width: '100%', margin: '15px 0' }}></div>
                  <p style={{ color: '#aaa', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '20px' }}>
                    "{productoSeleccionado.descripcion}"
                  </p>
                  <p style={{ color: '#666', marginBottom: '20px' }}>Disponibles en bóveda: {productoSeleccionado.stock}</p>
                  
                  <button 
                    onClick={() => {
                      agregarAlCarrito(productoSeleccionado);
                      setProductoSeleccionado(null); // Cierra el pop-up después de agregarlo
                    }}
                    disabled={productoSeleccionado.stock === 0}
                    style={{ backgroundColor: '#8b0000', color: '#fff', padding: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', letterSpacing: '2px', width: '100%' }}
                  >
                    {productoSeleccionado.stock > 0 ? '✦ AÑADIR AL CARRO ✦' : 'AGOTADO'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
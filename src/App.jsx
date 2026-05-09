import { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // Estilos mágicos del login de AWS
import './App.css';

// 1. Configuramos la conexión con tu Cognito
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_1VEYNSxJS',      // Ej: us-east-1_xxxxxxxxx
      userPoolClientId: '448a06m1c5kqtbu7l3fjr5rii6', // Ej: 1234567890abcdefghijklmno
    }
  }
});

const productos = [
  { id: 1, nombre: 'Té Earl Grey Premium', precio: 25 },
  { id: 2, nombre: 'Juego de Tazas de Porcelana', precio: 120 },
  { id: 3, nombre: 'Reloj de Bolsillo Plateado', precio: 85 }
];

function App() {
  const [carrito, setCarrito] = useState([]);

  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto]);
  };

  const total = carrito.reduce((sum, item) => sum + item.precio, 0);

  return (
    // 2. Envolvemos la App en el Autenticador
    <Authenticator>
      {({ signOut, user }) => (
        <div className="mansion-container">
          <header>
            <h1>Mansión Phantomhive - Catálogo Oficial</h1>
            
            <div style={{ marginTop: '10px', color: '#d4af37' }}>
              <span>Bienvenido, <strong>{user?.username}</strong> </span>
              <button onClick={signOut} style={{ marginLeft: '15px', padding: '5px 10px' }}>
                Cerrar Sesión
              </button>
            </div>
          </header>

          <main className="catalogo">
            {productos.map((prod) => (
              <div key={prod.id} className="tarjeta-producto">
                <h3>{prod.nombre}</h3>
                <p className="precio">${prod.precio} USD</p>
                <button onClick={() => agregarAlCarrito(prod)}>Agregar al Carrito</button>
              </div>
            ))}
          </main>

          <aside className="carrito">
            <h2>Tu Carrito ({carrito.length})</h2>
            <p>Total a pagar: <strong>${total} USD</strong></p>
          </aside>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
import { useState } from 'react';
import './App.css';

const productos = [
  { id: 1, nombre: 'Té Earl Grey Premium', precio: 25 },
  { id: 2, nombre: 'Juego de Tazas de Porcelana', precio: 120 },
  { id: 3, nombre: 'Reloj de Bolsillo Plateado', precio: 85 }
];

function App() {
  // Hook para gestionar el estado del carrito
  const [carrito, setCarrito] = useState([]);

  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto]);
  };

  const total = carrito.reduce((sum, item) => sum + item.precio, 0);

  return (
    <div className="mansion-container">
      <header>
        <h1>Mansión Phantomhive!</h1>
        <p>Catálogo de Artículos Exclusivos</p>
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
  );
}

export default App;
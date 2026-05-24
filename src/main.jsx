import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// 1. Importamos el enrutador
import { BrowserRouter } from 'react-router-dom'
// 2. Importamos el proveedor global de autenticación
import { Authenticator } from '@aws-amplify/ui-react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Authenticator.Provider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Authenticator.Provider>
  </React.StrictMode>,
)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CustomerScanView from './CustomerScanView.jsx' // Predpokladám, že tento súbor máš
import { db } from './firebase.js' // Tu si skontroluj, či sa tvoja firebase volá firebase.js alebo firebase-config.js

const root = createRoot(document.getElementById('root'));

// KĽÚČOVÁ LOGIKA: 
// Ak adresa obsahuje "/scan", spusti zákaznícky režim, inak spusti pokladňu (App)
if (window.location.pathname.includes('/scan')) {
  root.render(
    <StrictMode>
      <CustomerScanView db={db} />
    </StrictMode>
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
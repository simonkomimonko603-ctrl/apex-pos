import React from 'react';
import ReactDOM from 'react-dom/client';
import CustomerScanView from './CustomerScanView'; // Tvoj súbor s ponukou
import { db } from "./firebase-config";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CustomerScanView db={db} />
  </React.StrictMode>
);
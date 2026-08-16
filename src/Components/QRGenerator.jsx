import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../firebaseConfig'; // Uprav cestu k tvojmu firebase configu, ak ho máš inde
import { collection, addDoc } from 'firebase/firestore';

export default function QRGenerator() {
  const [locationName, setLocationName] = useState('');
  const [locationType, setLocationType] = useState('room'); // room, table, wellness
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [savedStatus, setSavedStatus] = useState('');

  // Vygeneruje unikátne ID a URL pre dané miesto
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!locationName) return;

    const uniqueId = `${locationType}_${Math.random().toString(36).substring(2, 7)}`;
    // Predpokladáme, že tvoja webová adresa bude napr. https://velvetnights.sk/scan?id=...
    // Pre lokálny test môžeš použiť http://localhost:5173/scan?id=...
    const url = `${window.location.origin}/scan?id=${uniqueId}`;
    
    setGeneratedUrl(url);

    try {
      // Uloženie miesta do Firestore kolekcie "locations"
      await addDoc(collection(db, 'locations'), {
        name: locationName,
        type: locationType,
        qrId: uniqueId,
        url: url,
        createdAt: new Date()
      });
      setSavedStatus('Miesto úspešne uložené do Firestore!');
    } catch (error) {
      console.error('Chyba pri ukladaní do Firestore:', error);
      setSavedStatus('Chyba pri ukladaní.');
    }
  };

  return (
    <div style={{ padding: '20px', background: '#2c1e15', color: '#f9f9f9', borderRadius: '8px', maxWidth: '500px', margin: '20px auto' }}>
      <h2 style={{ color: '#d4af37', fontFamily: 'serif' }}>Generátor QR kódov (Velvet Nights)</h2>
      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Názov miesta (napr. Izba 101 / Stol 3)" 
          value={locationName} 
          onChange={(e) => setLocationName(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d4af37' }}
          required
        />
        <select 
          value={locationType} 
          onChange={(e) => setLocationType(e.target.value)}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #d4af37' }}
        >
          <option value="room">Izba (Hotel)</option>
          <option value="table">Stol (Bar/Reštaurácia)</option>
          <option value="wellness">Wellness</option>
        </select>
        <button 
          type="submit" 
          style={{ padding: '10px', background: '#d4af37', color: '#2c1e15', fontWeight: 'bold', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
        >
          Vygenerovať a uložiť
        </button>
      </form>

      {savedStatus && <p style={{ fontSize: '14px', color: '#a3e4d7', marginTop: '10px' }}>{savedStatus}</p>}

      {generatedUrl && (
        <div style={{ marginTop: '20px', textAlign: 'center', background: '#fff', padding: '20px', borderRadius: '8px' }}>
          <QRCodeSVG value={generatedUrl} size={180} />
          <p style={{ color: '#333', fontSize: '12px', marginTop: '10px', wordBreak: 'break-all' }}>{generatedUrl}</p>
        </div>
      )}
    </div>
  );
}
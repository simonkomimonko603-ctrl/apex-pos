import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CustomerScanView({ db }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('Všetko');

  // Načítanie produktov z Firebase databázy
  useEffect(() => {
    async function fetchProducts() {
      if (!db) return;
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
      } catch (err) {
        console.error("Chyba pri načítaní produktov:", err);
      }
    }
    fetchProducts();
  }, [db]);

  // Pridanie do košíka
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  // Odoslanie objednávky do Firebase
  const submitOrder = async () => {
    if (cart.length === 0) return alert("Košík je prázdny!");
    try {
      await addDoc(collection(db, 'orders'), {
        items: cart,
        createdAt: serverTimestamp(),
        status: 'new',
        table: 'QR Objednávka'
      });
      alert("Objednávka bola úspešne odoslaná!");
      setCart([]);
    } catch (err) {
      console.error("Chyba pri odosielaní objednávky:", err);
      alert("Nepodarilo sa odoslať objednávku.");
    }
  };

  const filteredProducts = category === 'Všetko' 
    ? products 
    : products.filter(p => p.category === category);

  return (
    <div style={{ backgroundColor: '#121212', color: '#f5f5f5', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#d4af37', letterSpacing: '2px' }}>VELVET NIGHTS</h1>
      <p style={{ textAlign: 'center', color: '#888' }}>Kalná nad Hronom</p>

      {/* Kategorie */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0', flexWrap: 'wrap' }}>
        {['Všetko', 'Nealko napoje', 'Cocktaily', 'Alkohol', 'Voda', 'Káva'].map(cat => (
          <button 
            key={cat} 
            onClick={() => setCategory(cat)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #d4af37',
              background: category === cat ? '#d4af37' : 'transparent',
              color: category === cat ? '#000' : '#d4af37',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Zoznam produktov */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px', maxWidth: '1000px', margin: '0 auto' }}>
        {filteredProducts.map(product => (
          <div key={product.id} style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>{product.name}</h3>
              <p style={{ color: '#d4af37', fontSize: '18px', fontWeight: 'bold' }}>{product.price} €</p>
            </div>
            <button 
              onClick={() => addToCart(product)}
              style={{
                marginTop: '15px',
                background: '#d4af37',
                color: '#000',
                border: 'none',
                padding: '10px',
                borderRadius: '5px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Pridať do objednávky
            </button>
          </div>
        ))}
      </div>

      {/* Košík / Spodná lišta */}
      {cart.length > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1e1e1e', borderTop: '2px solid #d4af37', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Položiek v košíku: {cart.reduce((sum, item) => sum + item.qty, 0)}</strong>
          </div>
          <button 
            onClick={submitOrder}
            style={{
              background: '#28a745',
              color: '#fff',
              border: 'none',
              padding: '12px 25px',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Odoslať objednávku
          </button>
        </div>
      )}
    </div>
  );
}
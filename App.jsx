import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const firebaseConfig = {
  apiKey: "AIzaSyCdSygqAlIKW-q_pDMwFvLKVlmKYmANA7U",
  authDomain: "apexpos-ef6a0.firebaseapp.com",
  projectId: "apexpos-ef6a0",
  storageBucket: "apexpos-ef6a0.appspot.com",
  messagingSenderId: "123316014625",
  appId: "1:123316014625:web:edd04e73ba2d1d524f5d60"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.log("Audio error");
  }
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [currentTab, setCurrentTab] = useState('pos');
  const [selectedTable, setSelectedTable] = useState('Bar 1');
  
  const [tableCarts, setTableCarts] = useState({});
  const [activeCategory, setActiveCategory] = useState('Všetko');
  const [isOnline, setIsOnline] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [inAppNotification, setInAppNotification] = useState(null);

  const [kdsOrders, setKdsOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [tables] = useState(['Stôl 1', 'VIP Box', 'Bar 1', 'Terasa 1', 'Terasa 2']);
  
  const [editingProdId, setEditingProdId] = useState(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Káva');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');

  // Reálny blok / účet pri platení
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Hotovosť');
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  // Vernostné karty a vouchery databáza/stav
  const [loyaltyCards, setLoyaltyCards] = useState([
    { id: 1, cardNumber: 'CARD-88421', owner: 'Jozef Mrkva', discountPercent: 10, points: 340 },
    { id: 2, cardNumber: 'CARD-55129', owner: 'Anna Krátka', discountPercent: 15, points: 510 }
  ]);
  const [newCardOwner, setNewCardOwner] = useState('');
  const [newCardDiscount, setNewCardDiscount] = useState('10');
  const [generatedCardNumber, setGeneratedCardNumber] = useState('');

  const [vouchersList, setVouchersList] = useState([
    { id: 1, code: 'VOUCHER5', value: 5.00, active: true },
    { id: 2, code: 'VIP10', value: 10.00, active: true }
  ]);
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherValue, setNewVoucherValue] = useState('');

  // Modál na pridanie poznámky k položke v košíku
  const [noteModalItem, setNoteModalItem] = useState(null);
  const [itemNoteInput, setItemNoteInput] = useState('');

  // Modál na schválenie storna manažérom
  const [pendingCancelItem, setPendingCancelItem] = useState(null);
  const [managerPinModal, setManagerPinModal] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');

  // Rezervácie stôl
  const [reservations, setReservations] = useState([
    { id: 1, table: 'VIP Box', time: '19:00', name: 'Pán Novák', pax: 4 }
  ]);
  const [newResTable, setNewResTable] = useState('Stôl 1');
  const [newResTime, setNewResTime] = useState('18:00');
  const [newResName, setNewResName] = useState('');
  const [newResPax, setNewResPax] = useState('2');

  // Denná / mesačná uzávierka a Automatické Z-uzávierky
  const [paidReceiptsHistory, setPaidReceiptsHistory] = useState([]);
  const [automaticClosures, setAutomaticClosures] = useState([]);
  const [showClosureModal, setShowClosureModal] = useState(false);

  // Inventúra so skenerom
  const [inventoryWizardState, setInventoryWizardState] = useState('select');
  const [inventoryTargetProduct, setInventoryTargetProduct] = useState(null);
  const [inventoryScannedCount, setInventoryScannedCount] = useState(0);

  const categoryConfig = {
    'Všetko': { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#f59e0b', dot: '#f59e0b' },
    'Káva': { bg: 'rgba(180, 130, 90, 0.15)', border: '#b4825a', text: '#d4a373', dot: '#d4a373' },
    'Alkohol': { bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444', text: '#f87171', dot: '#ef4444' },
    'Cocktaily': { bg: 'rgba(236, 72, 153, 0.12)', border: '#ec4899', text: '#f472b6', dot: '#ec4899' },
    'Nealko napoje': { bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6', text: '#60a5fa', dot: '#3b82f6' },
    'Voda': { bg: 'rgba(20, 184, 166, 0.12)', border: '#14b8a6', text: '#2dd4bf', dot: '#14b8a6' }
  };

  const categories = Object.keys(categoryConfig);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      const elem = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {
      console.log("Fullscreen toggle error");
    }
  };

  const triggerInAppAlert = (message) => {
    setInAppNotification(message);
    playNotificationSound();
    setTimeout(() => {
      setInAppNotification(null);
    }, 4000);
  };

  // FUNKCIA NA REÁLNE ODOSLANIE REPORTU NA TELEGRAM
  const sendReportToTelegram = async (reportData) => {
    const token = "8758769903:AAFsnzKXh_3QnLKJNN6IpLVpf4fXjwL7lIg";
    const chatId = "8876034280";
    
    const message = `📊 *DENNÁ Z-UZÁVIERKA (APEX POS)*\n` +
                    `📅 Dátum: ${reportData.date}\n` +
                    `🕒 Čas: ${reportData.timestamp}\n\n` +
                    `💳 Zaplatené tržby: ${reportData.paidRevenue.toFixed(2)} € (${reportData.paidCount} blokov)\n` +
                    `🪑 Otvorené stoly: ${reportData.openTablesRevenue.toFixed(2)} €\n` +
                    `💰 *Celkový obrat: ${reportData.totalRevenue.toFixed(2)} €*`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}&parse_mode=Markdown`);
      const data = await response.json();
      if (data.ok) {
        console.log("Z-uzávierka bola úspešne odoslaná na Telegram.");
        triggerInAppAlert("📧 Ranná Z-uzávierka bola úspešne odoslaná na Telegram!");
      } else {
        console.error("Chyba Telegram API:", data);
      }
    } catch (err) {
      console.error("Chyba pri sieťovom volaní na Telegram:", err);
    }
  };

  // AUTOMATICKÁ POLNOČNÁ Z-UZÁVIERKA & RANNÉ ODOSLANIE NA TELEGRAM OKOLO 8:00
  useEffect(() => {
    const checkMidnightAndMorning = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const todayStr = now.toDateString();

      // Polnočná uzávierka (spustí sa o 00:00)[cite: 2, 3]
      if (hours === 0 && minutes === 0) {
        const lastAutoDate = localStorage.getItem('last_auto_closure_date');
        if (lastAutoDate !== todayStr) {
          let totalTableItemsValue = 0;
          let allTableItemsCount = 0;
          let openTablesSummary = {};

          Object.keys(tableCarts).forEach(tName => {
            const items = tableCarts[tName] || [];
            if (items.length > 0) {
              const tableSum = items.reduce((sum, i) => sum + i.price, 0);
              totalTableItemsValue += tableSum;
              allTableItemsCount += items.length;
              openTablesSummary[tName] = { count: items.length, sum: tableSum };
            }
          });

          const paidSum = paidReceiptsHistory.reduce((sum, r) => sum + (r.total || 0), 0);
          const grandTotal = paidSum + totalTableItemsValue;

          const closureReport = {
            date: new Date().toLocaleDateString(),
            timestamp: now.toLocaleString(),
            paidRevenue: paidSum,
            openTablesRevenue: totalTableItemsValue,
            totalRevenue: grandTotal,
            paidCount: paidReceiptsHistory.length,
            openTablesCount: allTableItemsCount,
            openTablesDetail: openTablesSummary
          };

          setAutomaticClosures(prev => [closureReport, ...prev]);
          localStorage.setItem('last_auto_closure_date', todayStr);
          localStorage.setItem('pending_telegram_report', JSON.stringify(closureReport));
          console.log("Automatická polnočná Z-uzávierka bola vykonaná.");
        }
      }

      // Ranné odoslanie na Telegram okolo 8:00 (spustí sa medzi 8:00 a 8:01)[cite: 2, 3]
      if (hours === 8 && minutes === 0) {
        const lastTelegramDate = localStorage.getItem('last_telegram_sent_date');
        if (lastTelegramDate !== todayStr) {
          const pendingReportStr = localStorage.getItem('pending_telegram_report');
          if (pendingReportStr) {
            const report = JSON.parse(pendingReportStr);
            sendReportToTelegram(report);
            localStorage.setItem('last_telegram_sent_date', todayStr);
          }
        }
      }
    };

    const intervalTimer = setInterval(checkMidnightAndMorning, 30000);
    return () => clearInterval(intervalTimer);
  }, [tableCarts, paidReceiptsHistory]);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (prods.length === 0) {
        const initial = [
          { name: 'Espresso', category: 'Káva', price: 2.00, stock: 100, barcode: '8593837099887', vat: 20 },
          { name: 'Vodka Absolut 4cl', category: 'Alkohol', price: 2.50, stock: 15, barcode: '7312040011531', vat: 20 },
          { name: 'Aperol Spritz', category: 'Cocktaily', price: 5.50, stock: 20, barcode: '8593837054321', vat: 20 },
          { name: 'Coca-Cola 0.33l', category: 'Nealko napoje', price: 2.20, stock: 50, barcode: '5449000000996', vat: 20 },
          { name: 'Mattoni 0.33l', category: 'Voda', price: 1.80, stock: 40, barcode: '8594001002345', vat: 20 }
        ];
        initial.forEach(p => addDoc(collection(db, 'products'), p));
      } else {
        setProducts(prods);
      }
      setIsOnline(true);
    }, () => {
      setIsOnline(false);
    });

    const unsubTables = onSnapshot(collection(db, 'tableCarts'), (snapshot) => {
      const cartsData = {};
      snapshot.docs.forEach(docSnap => {
        cartsData[docSnap.id] = docSnap.data().items || [];
      });
      setTableCarts(cartsData);
    });

    const unsubHistory = onSnapshot(collection(db, 'paidReceipts'), (snapshot) => {
      const history = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setPaidReceiptsHistory(history);
    });

    let isFirstLoad = true;
    const unsubKds = onSnapshot(collection(db, 'kdsOrders'), (snapshot) => {
      const orders = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      
      if (!isFirstLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newOrderData = change.doc.data();
            triggerInAppAlert("Nová objednávka pre: " + newOrderData.table);
          }
        });
      }

      isFirstLoad = false;
      setKdsOrders(orders);
    });

    return () => {
      unsubProducts();
      unsubTables();
      unsubHistory();
      unsubKds();
    };
  }, []);

  useEffect(() => {
    let scanner = null;
    if (currentTab === 'scanner' && inventoryWizardState === 'scanning') {
      const timer = setTimeout(() => {
        scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
        
        scanner.render(async () => {
          setInventoryScannedCount(prev => prev + 1);
          playNotificationSound();
        }, () => {});
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(() => {});
        }
      };
    }
  }, [currentTab, inventoryWizardState]);

  const handlePinSubmit = () => {
    if (pinInput === '1111') {
      setCurrentUser({ name: 'Šimon D.', role: 'Admin', simplified: false, isAdmin: true });
    } else if (pinInput === '2222') {
      setCurrentUser({ name: 'Dorota D.', role: 'Obsluha', simplified: true, isAdmin: false });
    } else {
      setPinInput('');
    }
  };

  const cart = tableCarts[selectedTable] || [];

  const saveTableCartToFirebase = async (newCartItems, tableName = selectedTable) => {
    try {
      await setDoc(doc(db, 'tableCarts', tableName), { items: newCartItems });
    } catch (e) {
      console.log("Firebase error");
    }
  };

  const addToCart = async (product) => {
    const currentTableCart = tableCarts[selectedTable] || [];
    const updatedCart = [...currentTableCart, { 
      ...product, 
      cartId: Date.now() + Math.random(), 
      sentToBar: false, 
      note: '',
      vat: product.vat || 20 
    }];
    
    setTableCarts({ ...tableCarts, [selectedTable]: updatedCart });
    await saveTableCartToFirebase(updatedCart);
  };

  const requestRemoveFromCart = (cartId) => {
    if (currentUser?.isAdmin) {
      executeRemoveFromCart(cartId);
    } else {
      setPendingCancelItem(cartId);
      setManagerPinModal(true);
      setManagerPinInput('');
    }
  };

  const executeRemoveFromCart = async (cartId) => {
    const currentTableCart = tableCarts[selectedTable] || [];
    const updatedCart = cartId === 'all' ? [] : currentTableCart.filter(item => item.cartId !== cartId);
    
    setTableCarts({ ...tableCarts, [selectedTable]: updatedCart });
    await saveTableCartToFirebase(updatedCart);
    triggerInAppAlert("Položka bola úspešne stornovaná.");
  };

  const handleManagerPinVerify = () => {
    if (managerPinInput === '1111') {
      setManagerPinModal(false);
      if (pendingCancelItem) {
        executeRemoveFromCart(pendingCancelItem);
        setPendingCancelItem(null);
      }
    } else {
      triggerInAppAlert("Nesprávny manažérsky PIN!");
      setManagerPinInput('');
    }
  };

  const saveItemNote = async () => {
    if (!noteModalItem) return;
    const currentTableCart = tableCarts[selectedTable] || [];
    const updatedCart = currentTableCart.map(item => {
      if (item.cartId === noteModalItem.cartId) {
        return { ...item, note: itemNoteInput };
      }
      return item;
    });

    setTableCarts({ ...tableCarts, [selectedTable]: updatedCart });
    await saveTableCartToFirebase(updatedCart);
    setNoteModalItem(null);
    setItemNoteInput('');
    triggerInAppAlert("Poznámka uložená k položke.");
  };

  const payForTable = async (tableName = selectedTable) => {
    const targetCart = tableCarts[tableName] || [];
    if (targetCart.length === 0) {
      triggerInAppAlert("Účet pre " + tableName + " je prázdny.");
      return;
    }

    const currentTotal = targetCart.reduce((sum, i) => sum + i.price, 0);
    
    setActiveReceipt({
      tableName,
      items: [...targetCart],
      total: currentTotal,
      timestamp: new Date().toLocaleString(),
      paidAmount: '',
      change: 0
    });
    setPaymentMethod('Hotovosť');
    setAppliedVoucher('');
    setVoucherDiscount(0);
  };

  const handleProcessPayment = async () => {
    if (!activeReceipt) return;
    let finalTotalToPay = activeReceipt.total - voucherDiscount;
    if (finalTotalToPay < 0) finalTotalToPay = 0;

    const paid = paymentMethod === 'Hotovosť' ? (parseFloat(activeReceipt.paidAmount.toString().replace(',', '.')) || 0) : finalTotalToPay;
    
    if (paymentMethod === 'Hotovosť' && paid < finalTotalToPay) {
      triggerInAppAlert("Zadaná suma je nižšia ako celkový účet!");
      return;
    }

    const tableName = activeReceipt.tableName;

    try {
      await addDoc(collection(db, 'paidReceipts'), {
        tableName,
        items: activeReceipt.items,
        total: finalTotalToPay,
        originalTotal: activeReceipt.total,
        paymentMethod,
        voucherDiscount,
        timestamp: activeReceipt.timestamp,
        createdAt: Date.now(),
        cashier: currentUser?.name || 'Neznámy'
      });
    } catch (e) {
      console.log("Error saving receipt history");
    }

    setTableCarts({ ...tableCarts, [tableName]: [] });
    await saveTableCartToFirebase([], tableName);
    
    triggerInAppAlert("Účet pre " + tableName + " bol úspešne zaplatený (" + paymentMethod + ").");
    setActiveReceipt(null);
  };

  const handleSendToBar = async () => {
    if (cart.length === 0) return;

    const unsentCart = cart.filter(item => !item.sentToBar);
    if (unsentCart.length === 0) return;

    try {
      for (let cartItem of unsentCart) {
        if (cartItem.stock !== 99) {
          const newStock = Math.max(0, (cartItem.stock || 0) - 1);
          const prodRef = doc(db, 'products', cartItem.id);
          await updateDoc(prodRef, { stock: newStock });
        }
      }

      const barItems = unsentCart.filter(i => ['Káva', 'Alkohol', 'Cocktaily', 'Nealko napoje', 'Voda'].includes(i.category));
      const kitchenItems = unsentCart.filter(i => !['Káva', 'Alkohol', 'Cocktaily', 'Nealko napoje', 'Voda'].includes(i.category));

      if (barItems.length > 0) {
        await addDoc(collection(db, 'kdsOrders'), {
          table: selectedTable + " (BAR)",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: barItems.map(i => ({ name: i.name + (i.note ? ` [${i.note}]` : ''), qty: 1 })),
          status: 'Nové',
          createdAt: Date.now()
        });
      }

      if (kitchenItems.length > 0) {
        await addDoc(collection(db, 'kdsOrders'), {
          table: selectedTable + " (KUCHYŇA)",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: kitchenItems.map(i => ({ name: i.name + (i.note ? ` [${i.note}]` : ''), qty: 1 })),
          status: 'Nové',
          createdAt: Date.now()
        });
      }

      const updatedTableCart = cart.map(item => ({ ...item, sentToBar: true }));
      setTableCarts({ ...tableCarts, [selectedTable]: updatedTableCart });
      await saveTableCartToFirebase(updatedTableCart);
      triggerInAppAlert("Objednávka úspešne vytlačená (Bar / Kuchyňa) a odoslaná na KDS");
    } catch (e) {
      console.log("Error sending to bar");
    }
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await deleteDoc(doc(db, 'kdsOrders', orderId));
    } catch (e) {
      console.log("Error deleting order");
    }
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.price, 0).toFixed(2);

  const todayReceipts = paidReceiptsHistory.filter(() => true);
  const totalRevenueToday = todayReceipts.reduce((sum, r) => sum + (r.total || 0), 0);
  const totalTransactionsCount = todayReceipts.length;

  let unresolvedTablesTotal = 0;
  let unresolvedItemsCount = 0;
  Object.keys(tableCarts).forEach(tName => {
    const tItems = tableCarts[tName] || [];
    unresolvedTablesTotal += tItems.reduce((sum, i) => sum + i.price, 0);
    unresolvedItemsCount += tItems.length;
  });

  const categoryStockData = {
    labels: categories.filter(c => c !== 'Všetko'),
    datasets: [
      {
        label: 'Počet kusov na sklade',
        data: categories.filter(c => c !== 'Všetko').map(cat => 
          products
            .filter(p => p.category === cat && p.stock !== 99)
            .reduce((acc, p) => acc + (p.stock || 0), 0)
        ),
        backgroundColor: ['#d4a373', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6'],
        borderWidth: 0,
      },
    ],
  };

  const styles = `
    @keyframes pulseGlow {
      0% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.4)); }
      50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(245, 158, 11, 0.8)); }
      100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(245, 158, 11, 0.4)); }
    }
    .pulse-logo { animation: pulseGlow 2.5s infinite ease-in-out; }
    #reader video { width: 100% !important; border-radius: 12px; object-fit: cover; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #07090e; }
    ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 3px; }

    .tablet-only-actions { display: none; }
    .fullscreen-btn { display: none; }

    @media (min-width: 1025px) {
      .fullscreen-btn { display: inline-block; }
    }

    @media (max-width: 1024px) {
      .tablet-only-actions { display: flex; align-items: center; gap: 10px; }
    }

    .pos-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      gap: 12px;
    }

    @media (min-width: 768px) and (orientation: landscape) {
      .pos-container {
        flex-direction: row;
      }
      .pos-left-pane {
        flex: 1;
        overflow-y: auto;
      }
      .pos-right-pane {
        width: 380px;
        flex-shrink: 0;
        max-height: 100%;
      }
    }

    @media (orientation: portrait) {
      .pos-container {
        flex-direction: column;
      }
      .pos-left-pane {
        flex: 1;
        overflow-y: auto;
      }
      .pos-right-pane {
        height: 250px;
        flex-shrink: 0;
      }
    }
  `;

  if (showSplash) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#030303', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999, color: '#f59e0b', fontFamily: 'system-ui, sans-serif' }}>
        <style>{styles}</style>
        <div className="pulse-logo" style={{ width: '90px', height: '90px', background: '#f59e0b', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#030303', fontSize: '48px', fontWeight: '900', marginBottom: '20px' }}>A</div>
        <h1 style={{ fontSize: '32px', letterSpacing: '8px', margin: 0, color: '#fff', fontWeight: '800' }}>APEX POS</h1>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#030303', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <style>{styles}</style>
        <div style={{ background: '#0b0f19', padding: '40px', borderRadius: '24px', border: '1px solid rgba(245, 158, 11, 0.3)', width: '380px', textAlign: 'center' }}>
          <h2 style={{ color: '#f59e0b', marginBottom: '5px' }}>APEX POS</h2>
          <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '25px' }}>Zadajte PIN (Šimon Admin: 1111 | Dorota Obsluha: 2222)</p>
          <input 
            type="password" 
            value={pinInput} 
            readOnly 
            placeholder="••••" 
            style={{ fontSize: '28px', textAlign: 'center', marginBottom: '20px', padding: '12px', width: '100%', background: '#030303', color: '#f59e0b', border: '1px solid #1f2937', borderRadius: '12px', letterSpacing: '10px', boxSizing: 'border-box' }} 
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
              <button key={num} onClick={() => setPinInput(prev => prev.length < 4 ? prev + num : prev)} style={{ padding: '16px', fontSize: '18px', fontWeight: 'bold', background: '#111827', color: '#fff', border: '1px solid #1f2937', borderRadius: '12px', cursor: 'pointer' }}>{num}</button>
            ))}
            <button onClick={() => setPinInput('')} style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold', background: '#1f1113', color: '#ef4444', border: '1px solid #371d22', borderRadius: '12px', cursor: 'pointer' }}>C</button>
            <button onClick={handlePinSubmit} style={{ padding: '16px', fontSize: '16px', fontWeight: 'bold', background: '#f59e0b', color: '#030303', border: 'none', borderRadius: '12px', cursor: 'pointer', gridColumn: 'span 2' }}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: '#0b0f19', color: '#f3f4f6', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', boxSizing: 'border-box' }}>
      <style>{styles}</style>
      
      {inAppNotification && (
        <div style={{ position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', background: '#111827', border: '2px solid #f59e0b', color: '#fff', padding: '12px 24px', borderRadius: '12px', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 'bold' }}>
          <span>🔔 {inAppNotification}</span>
        </div>
      )}

      {managerPinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #ef4444', borderRadius: '20px', width: '340px', padding: '24px', textAlign: 'center', color: '#fff' }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Vyžadované schválenie</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '15px' }}>Pre stornovanie položky zadajte PIN manažéra (1111):</p>
            <input 
              type="password" 
              autoFocus
              value={managerPinInput} 
              onChange={e => setManagerPinInput(e.target.value)} 
              placeholder="••••" 
              style={{ fontSize: '24px', textAlign: 'center', padding: '10px', width: '100%', background: '#030303', color: '#ef4444', border: '1px solid #374151', borderRadius: '8px', marginBottom: '15px', letterSpacing: '8px', boxSizing: 'border-box' }} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleManagerPinVerify} style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Schváliť</button>
              <button onClick={() => { setManagerPinModal(false); setPendingCancelItem(null); }} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {noteModalItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '360px', padding: '24px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '16px' }}>Poznámka k položke</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 15px 0' }}>{noteModalItem.name}</p>
            <input 
              type="text" 
              autoFocus
              value={itemNoteInput} 
              onChange={e => setItemNoteInput(e.target.value)} 
              placeholder="napr. bez ľadu, extra citrón..." 
              style={{ padding: '10px', width: '100%', background: '#030303', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box' }} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={saveItemNote} style={{ flex: 1, background: '#f59e0b', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Uložiť</button>
              <button onClick={() => setNoteModalItem(null)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {activeReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '420px', padding: '24px', display: 'flex', flexDirection: 'column', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #374151', paddingBottom: '12px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '18px' }}>APEX BAR & RESTAURANT</h3>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>Stôl: {activeReceipt.tableName} | {activeReceipt.timestamp}</p>
            </div>
            
            <div style={{ maxHeight: '140px', overflowY: 'auto', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeReceipt.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{item.name} {item.note && <span style={{ color: '#38bdf8', fontSize: '11px' }}>[{item.note}]</span>}</span>
                  <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{item.price.toFixed(2)} €</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#030303', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '11px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
              <span>Základ DPH (20%): {(activeReceipt.total / 1.2).toFixed(2)} €</span>
              <span>DPH: {(activeReceipt.total - (activeReceipt.total / 1.2)).toFixed(2)} €</span>
            </div>

            <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px' }}>Spôsob platby:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '12px' }}>
              {['Hotovosť', 'Karta', 'Stravné lístky', 'QR platba'].map(m => (
                <button key={m} onClick={() => setPaymentMethod(m)} style={{ padding: '8px', background: paymentMethod === m ? '#f59e0b' : '#030303', color: paymentMethod === m ? '#030303' : '#fff', border: '1px solid #374151', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  {m}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px', display: 'block' }}>Darčeková poukážka / Voucher:</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  placeholder="Zadajte kód voucheru" 
                  value={appliedVoucher}
                  onChange={e => setAppliedVoucher(e.target.value)}
                  style={{ flex: 1, background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }}
                />
                <button onClick={() => {
                  const foundVoucher = vouchersList.find(v => v.code.toUpperCase() === appliedVoucher.toUpperCase() && v.active);
                  if (foundVoucher) {
                    setVoucherDiscount(foundVoucher.value);
                    triggerInAppAlert("Uplatnený voucher " + foundVoucher.code + " v hodnote " + foundVoucher.value.toFixed(2) + " €");
                  } else {
                    triggerInAppAlert("Neplatný alebo neaktívny kód poukážky!");
                  }
                }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  Použiť
                </button>
              </div>
              {voucherDiscount > 0 && <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>Zľava z voucheru: -{voucherDiscount.toFixed(2)} €</div>}
            </div>

            <div style={{ borderTop: '1px solid #374151', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', marginBottom: '12px' }}>
              <span>Celkom k úhrade:</span>
              <span style={{ color: '#34d399' }}>{Math.max(0, activeReceipt.total - voucherDiscount).toFixed(2)} €</span>
            </div>

            {paymentMethod === 'Hotovosť' && (
              <>
                <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px' }}>Zákazník platí (€):</label>
                <input 
                  type="number" 
                  autoFocus
                  placeholder="0.00" 
                  value={activeReceipt.paidAmount} 
                  onChange={e => setActiveReceipt({ ...activeReceipt, paidAmount: e.target.value })} 
                  style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '16px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' }} 
                />

                {activeReceipt.paidAmount !== '' && parseFloat(activeReceipt.paidAmount) >= Math.max(0, activeReceipt.total - voucherDiscount) && (
                  <div style={{ fontSize: '14px', color: '#34d399', fontWeight: 'bold', marginBottom: '15px', textAlign: 'center' }}>
                    Vydávať: {(parseFloat(activeReceipt.paidAmount) - Math.max(0, activeReceipt.total - voucherDiscount)).toFixed(2)} €
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleProcessPayment} style={{ flex: 1, background: '#34d399', color: '#030303', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                Uhrať a vytlačiť blok
              </button>
              <button onClick={() => setActiveReceipt(null)} style={{ background: '#1f2937', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}

      {showClosureModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '450px', padding: '24px', display: 'flex', flexDirection: 'column', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #374151', paddingBottom: '12px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '18px' }}>DENNÁ UZÁVIERKA (Z-UZÁVIERKA)[cite: 3]</h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Dátum: {new Date().toLocaleDateString()}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#030303', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9ca3af' }}>Už zaplatené tržby:</span>
                <span style={{ fontWeight: 'bold', color: '#34d399' }}>{totalRevenueToday.toFixed(2)} € ({totalTransactionsCount} blokov)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#030303', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ color: '#9ca3af' }}>Nezaplatené položky na stoloch:</span>
                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{unresolvedTablesTotal.toFixed(2)} € ({unresolvedItemsCount} ks)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#111827', border: '1px solid #f59e0b', padding: '12px 14px', borderRadius: '8px', fontSize: '14px' }}>
                <span style={{ color: '#fff', fontWeight: 'bold' }}>Celkový obrat (Vrátane stolov):</span>
                <span style={{ fontWeight: '900', color: '#34d399' }}>{(totalRevenueToday + unresolvedTablesTotal).toFixed(2)} €</span>
              </div>

              {automaticClosures.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>História automatických polnočných uzávierok:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                    {automaticClosures.map((ac, idx) => (
                      <div key={idx} style={{ background: '#030303', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1f2937', fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{ac.timestamp}</span>
                        <span style={{ color: '#34d399', fontWeight: 'bold' }}>{ac.totalRevenue.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                const manualReport = {
                  date: new Date().toLocaleDateString(),
                  timestamp: new Date().toLocaleString(),
                  paidRevenue: totalRevenueToday,
                  openTablesRevenue: unresolvedTablesTotal,
                  totalRevenue: totalRevenueToday + unresolvedTablesTotal,
                  paidCount: totalTransactionsCount,
                  openTablesCount: unresolvedItemsCount
                };
                sendReportToTelegram(manualReport);
                setShowClosureModal(false);
              }} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                📧 Poslať na Telegram
              </button>
              <button onClick={() => {
                triggerInAppAlert("Z-uzávierka bola úspešne vytlačená.");
                setShowClosureModal(false);
              }} style={{ background: '#f59e0b', color: '#030303', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                Vytlačiť uzávierku
              </button>
              <button onClick={() => setShowClosureModal(false)} style={{ background: '#1f2937', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                Zavrieť
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ height: '60px', background: '#07090e', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', position: 'relative', zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '2px', background: '#f59e0b' }}></div>
            <div style={{ width: '20px', height: '2px', background: '#f59e0b' }}></div>
            <div style={{ width: '20px', height: '2px', background: '#f59e0b' }}></div>
          </button>
          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>APEX POS</span>
          <span style={{ color: '#4b5563' }}>|</span>
          <span style={{ textTransform: 'uppercase', fontSize: '13px', color: '#9ca3af', fontWeight: '600' }}>{currentTab}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '13px' }}>
          <button className="fullscreen-btn" onClick={toggleFullscreen} style={{ background: '#111827', border: '1px solid #1f2937', color: '#f59e0b', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
            {isFullscreen ? '⏹ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          <div className="tablet-only-actions">
            {!currentUser.simplified && (
              <button onClick={handleSendToBar} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                Odoslať na KDS
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#9ca3af' }}>Obsluha: <strong style={{ color: '#fff' }}>{currentUser.name}</strong></span>
            
            <select 
              value={selectedTable} 
              onChange={(e) => setSelectedTable(e.target.value)} 
              style={{ background: '#111827', border: '1px solid #1f2937', color: '#f59e0b', padding: '6px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
            >
              {tables.map(t => (
                <option key={t} value={t}>{t} {(tableCarts[t] || []).length > 0 ? `(${((tableCarts[t] || []).reduce((s, i) => s + i.price, 0)).toFixed(2)} €)` : ''}</option>
              ))}
            </select>

            <span onClick={() => setCurrentTab('service')} style={{ color: isOnline ? '#34d399' : '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>{isOnline ? '● Online' : '● Offline'}</span>
          </div>
        </div>

        {menuOpen && (
          <div style={{ position: 'absolute', top: '65px', left: '15px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '14px', width: '250px', zIndex: 1000, padding: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
            <div onClick={() => { setCurrentTab('pos'); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'pos' ? '#f59e0b' : 'transparent', color: currentTab === 'pos' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>🧮 Pokladňa</div>
            <div onClick={() => { payForTable(selectedTable); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#34d399', fontWeight: '600', marginBottom: '5px' }}>💳 Účet / Zaplatiť (Blok)</div>
            <div onClick={() => { setShowClosureModal(true); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#f59e0b', fontWeight: '600', marginBottom: '5px' }}>📊 Denná uzávierka (Z)[cite: 3]</div>
            <div onClick={() => { setCurrentTab('kds'); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'kds' ? '#f59e0b' : 'transparent', color: currentTab === 'kds' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>🖥️ KDS Displej & Oddelená tlač</div>
            <div onClick={() => { setCurrentTab('floorplan'); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'floorplan' ? '#f59e0b' : 'transparent', color: currentTab === 'floorplan' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>🗺️ Mapa stôl & Rezervácie</div>
            <div onClick={() => { setCurrentTab('loyalty'); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'loyalty' ? '#f59e0b' : 'transparent', color: currentTab === 'loyalty' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>⭐ Vernostný program & Vouchery</div>
            <div onClick={() => { setCurrentTab('inventory'); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'inventory' ? '#f59e0b' : 'transparent', color: currentTab === 'inventory' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>🍷 Zásoby & Sklad</div>
            <div onClick={() => { 
              setInventoryWizardState('select');
              setInventoryTargetProduct(null);
              setInventoryScannedCount(0);
              setCurrentTab('scanner'); 
              setMenuOpen(false); 
            }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'scanner' ? '#f59e0b' : 'transparent', color: currentTab === 'scanner' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>📷 Inventúrny Skener</div>
            {currentUser.isAdmin && (
              <div onClick={() => { 
                setEditingProdId(null);
                setNewProdName('');
                setNewProdCat('Káva');
                setNewProdPrice('');
                setNewProdStock('');
                setNewProdBarcode('');
                setCurrentTab('settings'); 
                setMenuOpen(false); 
              }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'settings' ? '#f59e0b' : 'transparent', color: currentTab === 'settings' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '5px' }}>⚙️ Nastavenia / Produkt</div>
            )}
            <div style={{ borderTop: '1px solid #1f2937', margin: '5px 0' }}></div>
            <div onClick={() => { setCurrentUser(null); setPinInput(''); setMenuOpen(false); }} style={{ padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: '600' }}>🔒 Odhlásiť</div>
          </div>
        )}
      </header>

      <div style={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* POKLADŇA */}
        {currentTab === 'pos' && (
          <div style={{ flexGrow: 1, padding: '12px', overflowY: 'auto', boxSizing: 'border-box', height: '100%' }}>
            <div className="pos-container">
              
              <div className="pos-left-pane" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px', flexShrink: 0 }}>
                  {categories.map(cat => {
                    const conf = categoryConfig[cat] || categoryConfig['Všetko'];
                    const isActive = activeCategory === cat;
                    return (
                      <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)} 
                        style={{ 
                          padding: '8px 14px', 
                          borderRadius: '10px', 
                          background: isActive ? conf.border : conf.bg, 
                          color: isActive ? '#030303' : conf.text, 
                          border: `1px solid ${conf.border}`, 
                          fontWeight: '600', 
                          cursor: 'pointer', 
                          fontSize: '12px', 
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isActive ? '#030303' : conf.dot }}></span>
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', paddingBottom: '10px' }}>
                  {products.filter(p => activeCategory === 'Všetko' || p.category === activeCategory).map(product => {
                    const conf = categoryConfig[product.category] || categoryConfig['Všetko'];
                    const isUntracked = product.stock === 99;
                    return (
                      <div 
                        key={product.id} 
                        onClick={() => addToCart(product)} 
                        style={{ 
                          background: '#111827', 
                          border: '1px solid #1f2937', 
                          borderLeft: `3px solid ${conf.border}`, 
                          borderRadius: '12px', 
                          padding: '12px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          justifyContent: 'space-between', 
                          minHeight: '90px' 
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', color: conf.text, fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>{product.category}</div>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: '#fff', lineHeight: '1.25' }}>{product.name}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>{isUntracked ? '∞' : `${product.stock} ks`}</div>
                          <div style={{ color: '#f59e0b', fontWeight: '800', fontSize: '15px' }}>{product.price.toFixed(2)} €</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pos-right-pane" style={{ background: '#07090e', border: '1px solid #1f2937', borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#fff' }}>Účet: <span style={{ color: '#f59e0b' }}>{selectedTable}</span></h3>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>{totalAmount} €</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexShrink: 0 }}>
                  {!currentUser.simplified && (
                    <button style={{ flex: 1, padding: '8px 4px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }} onClick={handleSendToBar}>
                      POSLAŤ (BAR/KUCHYŇA)
                    </button>
                  )}
                  <button style={{ flex: 1, padding: '8px 4px', background: '#f59e0b', color: '#030303', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }} onClick={() => payForTable(selectedTable)}>
                    ZAPLATIŤ ÚČET
                  </button>
                </div>
                
                <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #1f2937', borderBottom: '1px solid #1f2937', padding: '8px 0' }}>
                  {cart.length === 0 ? (
                    <p style={{ color: '#4b5563', textAlign: 'center', margin: '15px 0', fontSize: '12px' }}>Žiadne položky</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '6px 10px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                        <div style={{ flexGrow: 1, cursor: 'pointer' }} onClick={() => setNoteModalItem(item)}>
                          <div style={{ fontSize: '12px', fontWeight: '600' }}>
                            {item.name} {item.sentToBar && <span style={{ fontSize: '9px', color: '#34d399', marginLeft: '4px' }}>(poslané)</span>}
                          </div>
                          {item.note && <div style={{ fontSize: '10px', color: '#38bdf8' }}>Pozn: {item.note}</div>}
                          <div style={{ fontSize: '10px', color: '#f59e0b' }}>{item.price.toFixed(2)} €</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button onClick={() => setNoteModalItem(item)} style={{ background: '#1f2937', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '11px', padding: '4px 6px', borderRadius: '4px' }}>📝</button>
                          <button onClick={() => requestRemoveFromCart(item.cartId)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, fontSize: '12px', color: '#9ca3af' }}>
                  <span>Položiek: {cart.length}</span>
                  <button onClick={() => requestRemoveFromCart('all')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline' }}>Vyčistiť</button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VERNOSTNÝ PROGRAM & VOUCHERY */}
        {currentTab === 'loyalty' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>⭐ Vernostný program, Karty & Vouchery</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#f59e0b' }}>💳 Generovanie a správa štamgatských kariet</h3>
                
                <div style={{ background: '#030303', padding: '14px', borderRadius: '12px', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="Meno majiteľa karty" 
                    value={newCardOwner} 
                    onChange={e => setNewCardOwner(e.target.value)} 
                    style={{ background: '#111827', border: '1px solid #374151', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select 
                      value={newCardDiscount} 
                      onChange={e => setNewCardDiscount(e.target.value)} 
                      style={{ flex: 1, background: '#111827', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <option value="5">5% zľava</option>
                      <option value="10">10% zľava</option>
                      <option value="15">15% zľava</option>
                      <option value="20">20% zľava</option>
                    </select>
                    
                    <button onClick={() => {
                      if (!newCardOwner) {
                        triggerInAppAlert("Zadajte meno majiteľa karty!");
                        return;
                      }
                      const randomCardNo = "CARD-" + Math.floor(10000 + Math.random() * 90000);
                      setGeneratedCardNumber(randomCardNo);
                      setLoyaltyCards([...loyaltyCards, {
                        id: Date.now(),
                        cardNumber: randomCardNo,
                        owner: newCardOwner,
                        discountPercent: parseInt(newCardDiscount),
                        points: 0
                      }]);
                      setNewCardOwner('');
                      triggerInAppAlert("Vygenerovaná nová karta: " + randomCardNo);
                    }} style={{ background: '#f59e0b', color: '#030303', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                      Vygenerovať kartu
                    </button>
                  </div>
                  {generatedCardNumber && (
                    <div style={{ fontSize: '12px', color: '#34d399', textAlign: 'center', marginTop: '4px' }}>
                      Posledná vygenerovaná karta: <strong>{generatedCardNumber}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {loyaltyCards.map(card => (
                    <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030303', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1f2937', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{card.owner} <span style={{ color: '#f59e0b' }}>({card.cardNumber})</span></div>
                        <div style={{ color: '#9ca3af', fontSize: '11px' }}>Zľava: {card.discountPercent}% | Body: {card.points} b.</div>
                      </div>
                      <button onClick={async () => {
                        setLoyaltyCards(loyaltyCards.filter(c => c.id !== card.id));
                        triggerInAppAlert("Karta zmazaná.");
                      }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#38bdf8' }}>🎫 Tvorba a správa zľavových voucherov</h3>
                
                <div style={{ background: '#030303', padding: '14px', borderRadius: '12px', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="Kód voucheru (npr. SUMMER2026)" 
                    value={newVoucherCode} 
                    onChange={e => setNewVoucherCode(e.target.value)} 
                    style={{ background: '#111827', border: '1px solid #374151', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="number" 
                      placeholder="Hodnota (€)" 
                      value={newVoucherValue} 
                      onChange={e => setNewVoucherValue(e.target.value)} 
                      style={{ flex: 1, background: '#111827', border: '1px solid #374151', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                    />
                    <button onClick={() => {
                      if (!newVoucherCode || !newVoucherValue) {
                        triggerInAppAlert("Vyplňte kód aj hodnotu voucheru!");
                        return;
                      }
                      setVouchersList([...vouchersList, {
                        id: Date.now(),
                        code: newVoucherCode.toUpperCase(),
                        value: parseFloat(newVoucherValue),
                        active: true
                      }]);
                      setNewVoucherCode('');
                      setNewVoucherValue('');
                      triggerInAppAlert("Voucher úspešne vytvorený.");
                    }} style={{ background: '#38bdf8', color: '#030303', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                      Pridať voucher
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {vouchersList.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030303', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1f2937', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>{v.code}</div>
                        <div style={{ color: '#34d399', fontSize: '11px', fontWeight: 'bold' }}>Hodnota: {v.value.toFixed(2)} €</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button onClick={() => {
                          setVouchersList(vouchersList.map(item => item.id === v.id ? { ...item, active: !item.active } : item));
                        }} style={{ background: v.active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: v.active ? '#34d399' : '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
                          {v.active ? 'Aktívny' : 'Neaktívny'}
                        </button>
                        <button onClick={() => setVouchersList(vouchersList.filter(item => item.id !== v.id))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* INVENTÚRNY SKENER */}
        {currentTab === 'scanner' && (
          <div style={{ flexGrow: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff', marginBottom: '5px' }}>Inventúrny skener produktov</h2>
            
            {inventoryWizardState === 'select' ? (
              <div style={{ width: '100%', maxWidth: '450px', background: '#111827', padding: '20px', borderRadius: '16px', border: '1px solid #1f2937' }}>
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: 0 }}>Vyberte produkt, ktorý chcete fyzicky preskúmať a spočítať:</p>
                
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                  {products.map(prod => (
                    <div 
                      key={prod.id} 
                      onClick={() => setInventoryTargetProduct(prod)}
                      style={{ 
                        background: inventoryTargetProduct?.id === prod.id ? '#1f2937' : '#030303', 
                        border: inventoryTargetProduct?.id === prod.id ? '2px solid #f59e0b' : '1px solid #1f2937', 
                        padding: '10px 14px', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{prod.name}</span>
                      <span style={{ fontSize: '11px', color: '#f59e0b' }}>{prod.stock === 99 ? '∞ (Netrackované)' : `${prod.stock} ks`}</span>
                    </div>
                  ))}
                </div>

                <button 
                  disabled={!inventoryTargetProduct}
                  onClick={() => {
                    setInventoryScannedCount(0);
                    setInventoryWizardState('scanning');
                  }} 
                  style={{ 
                    width: '100%', 
                    background: inventoryTargetProduct ? '#f59e0b' : '#374151', 
                    color: inventoryTargetProduct ? '#030303' : '#9ca3af', 
                    border: 'none', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontWeight: 'bold', 
                    cursor: inventoryTargetProduct ? 'pointer' : 'not-allowed', 
                    fontSize: '14px' 
                  }}
                >
                  Spustiť skenovanie tohto produktu
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', maxWidth: '450px', background: '#111827', padding: '15px', borderRadius: '16px', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Produkt:</span>
                    <div style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '15px' }}>{inventoryTargetProduct?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>Naskenované:</span>
                    <div style={{ fontWeight: '800', color: '#34d399', fontSize: '22px' }}>{inventoryScannedCount} ks</div>
                  </div>
                </div>

                <div id="reader" style={{ width: '100%', marginBottom: '15px' }}></div>

                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button 
                    onClick={async () => {
                      if (inventoryTargetProduct) {
                        await updateDoc(doc(db, 'products', inventoryTargetProduct.id), { stock: inventoryScannedCount });
                        triggerInAppAlert("Zásoba produktu " + inventoryTargetProduct.name + " upravená na " + inventoryScannedCount + " ks.");
                      }
                      setInventoryWizardState('select');
                      setInventoryTargetProduct(null);
                      setCurrentTab('inventory');
                    }} 
                    style={{ flex: 1, background: '#34d399', color: '#030303', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Uložiť do zásoby
                  </button>
                  <button 
                    onClick={() => {
                      setInventoryWizardState('select');
                      setInventoryTargetProduct(null);
                    }} 
                    style={{ background: '#1f2937', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                  >
                    Zrušiť
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KDS */}
        {currentTab === 'kds' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: '0 0 15px 0', fontSize: '17px', color: '#fff' }}>KDS - Živé Objednávky & Oddelená tlač (Bar / Kuchyňa)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '15px' }}>
              {kdsOrders.map(order => (
                <div key={order.id} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f59e0b' }}>{order.table}</span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{order.time}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' }}>
                      {order.items && order.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span>{it.name}</span>
                          <span style={{ fontWeight: 'bold', color: '#34d399' }}>{it.qty}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleCompleteOrder(order.id)} style={{ width: '100%', padding: '10px', background: '#22c55e', color: '#030303', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                    ✓ HOTOVO
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAPA STÔL A REZERVÁCIE */}
        {currentTab === 'floorplan' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Mapa stôl & Rezervácie</h2>
            </div>

            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px', maxWidth: '600px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '14px' }}>Vytvoriť novú rezerváciu stola</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                <select value={newResTable} onChange={e => setNewResTable(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>
                  {tables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" placeholder="Čas (19:00)" value={newResTime} onChange={e => setNewResTime(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
                <input type="text" placeholder="Meno hosta" value={newResName} onChange={e => setNewResName(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
                <button onClick={() => {
                  if (!newResName) return;
                  setReservations([...reservations, { id: Date.now(), table: newResTable, time: newResTime, name: newResName, pax: newResPax }]);
                  setNewResName('');
                  triggerInAppAlert("Rezervácia úspešne pridaná.");
                }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  Pridať
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {reservations.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#030303', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', border: '1px solid #1f2937' }}>
                    <span><strong>{r.table}</strong> ({r.time}) - {r.name}</span>
                    <button onClick={() => setReservations(reservations.filter(x => x.id !== r.id))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Zmazať</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              {tables.map(t => {
                const tCart = tableCarts[t] || [];
                const tTotal = tCart.reduce((sum, i) => sum + i.price, 0).toFixed(2);
                const hasItems = tCart.length > 0;
                const hasRes = reservations.find(r => r.table === t);

                return (
                  <div key={t} style={{ width: '150px', height: '110px', background: '#111827', border: selectedTable === t ? '2px solid #f59e0b' : '1px solid #1f2937', borderRadius: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px', boxSizing: 'border-box' }}>
                    <div onClick={() => { setSelectedTable(t); setCurrentTab('pos'); }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{t}</span>
                      {hasItems ? (
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold', marginTop: '2px' }}>{tTotal} €</span>
                      ) : hasRes ? (
                        <span style={{ fontSize: '10px', color: '#38bdf8', marginTop: '2px' }}>Rezervované ({hasRes.time})</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>Voľný</span>
                      )}
                    </div>
                    {hasItems && (
                      <button onClick={() => payForTable(t)} style={{ background: '#f59e0b', color: '#030303', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', padding: '4px', cursor: 'pointer' }}>
                        Zaplatiť
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ZÁSOBY A SKLAD */}
        {currentTab === 'inventory' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Zásoby & Skladový manažment</h2>
              {currentUser.isAdmin && (
                <button onClick={() => {
                  setEditingProdId(null);
                  setNewProdName('');
                  setNewProdCat('Káva');
                  setNewProdPrice('');
                  setNewProdStock('10');
                  setNewProdBarcode('');
                  setCurrentTab('settings');
                }} style={{ background: '#f59e0b', color: '#030303', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  + Nový produkt
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#f59e0b', fontSize: '14px' }}>Stav skladu</h4>
                <div style={{ width: '100%', maxWidth: '280px', height: '220px', display: 'flex', justifyContent: 'center' }}>
                  <Pie data={categoryStockData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af', boxWidth: 12 } } } }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px' }}>Zoznam položiek na úpravu</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {products.map(prod => {
                  const isUntracked = prod.stock === 99;
                  return (
                    <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030303', padding: '10px 14px', borderRadius: '10px', border: '1px solid #1f2937' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{prod.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>{prod.category} | Sklad: {isUntracked ? '∞ (Netrackované)' : `${prod.stock} ks`} | {prod.price.toFixed(2)} €</div>
                      </div>
                      {currentUser.isAdmin && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => {
                            setEditingProdId(prod.id);
                            setNewProdName(prod.name);
                            setNewProdCat(prod.category || 'Káva');
                            setNewProdPrice(prod.price.toString());
                            setNewProdStock(prod.stock !== undefined ? prod.stock.toString() : '');
                            setNewProdBarcode(prod.barcode || '');
                            setCurrentTab('settings');
                          }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                            Upraviť
                          </button>
                          <button onClick={async () => {
                            if (window.confirm("Naozaj vymazať produkt " + prod.name + "?")) {
                              await deleteDoc(doc(db, 'products', prod.id));
                            }
                          }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer' }}>
                            Zmazať
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SERVIS */}
        {currentTab === 'service' && (
          <div style={{ flexGrow: 1, padding: '25px', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff' }}>🛠️ Diagnostický Displej</h2>
            <p style={{ color: '#9ca3af' }}>Firebase Firestore: {isOnline ? '🟢 Aktívny' : '🔴 Výpadok'}</p>
            <button onClick={() => setCurrentTab('pos')} style={{ background: '#1f2937', color: '#fff', border: '1px solid #374151', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer' }}>Späť</button>
          </div>
        )}

        {/* NASTAVENIA / PRODUKT */}
        {currentTab === 'settings' && currentUser && currentUser.isAdmin && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
            <h2 style={{ color: '#fff', marginBottom: '15px' }}>{editingProdId ? 'Úprava produktu' : 'Tvorba nového produktu'}</h2>
            <div style={{ background: '#111827', padding: '16px', borderRadius: '16px', border: '1px solid #1f2937', maxWidth: '500px' }}>
              <input type="text" placeholder="Názov produktu" value={newProdName} onChange={e => setNewProdName(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' }} />
              
              <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '5px' }}>Kategória:</label>
              <select value={newProdCat} onChange={e => setNewProdCat(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '10px', boxSizing: 'border-box', cursor: 'pointer' }}>
                {categories.filter(c => c !== 'Všetko').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <input type="number" placeholder="Cena (€)" value={newProdPrice} onChange={e => setNewProdPrice(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '10px', boxSizing: 'border-box' }} />
              <input type="number" placeholder="Počet na sklade (99 = vypnúť trackovanie)" value={newProdStock} onChange={e => setNewProdStock(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '5px', boxSizing: 'border-box' }} />
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '0', marginBottom: '10px' }}>Zadajte <strong>99</strong> pre vypnutie sledovania tohto produktu.</p>
              
              <input type="text" placeholder="EAN kód" value={newProdBarcode} onChange={e => setNewProdBarcode(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#f59e0b', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '15px', boxSizing: 'border-box' }} />
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={async () => {
                  if (!newProdName || !newProdPrice) return;
                  const productData = {
                    name: newProdName,
                    category: newProdCat,
                    price: parseFloat(newProdPrice),
                    stock: parseInt(newProdStock) || 0,
                    barcode: newProdBarcode || '',
                    vat: 20
                  };

                  if (editingProdId) {
                    await updateDoc(doc(db, 'products', editingProdId), productData);
                  } else {
                    await addDoc(collection(db, 'products'), productData);
                  }

                  setEditingProdId(null);
                  setNewProdName(''); setNewProdPrice(''); setNewProdStock(''); setNewProdBarcode('');
                  setCurrentTab('inventory');
                }} style={{ flex: 1, background: '#f59e0b', color: '#030303', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {editingProdId ? 'Uložiť zmeny' : 'Vytvoriť produkt'}
                </button>
                <button onClick={() => setCurrentTab('inventory')} style={{ background: '#1f2937', color: '#fff', border: '1px solid #374151', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Zrušiť
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

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

// Pomocná funkcia na bezpečné kódovanie znakov (ä, ô, í, š...) pre tlač a databázu
const sanitizeTextForPrint = (text) => {
  if (!text) return "";
  try {
    return decodeURIComponent(encodeURIComponent(text));
  } catch (e) {
    return text;
  }
};

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

  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');

  const [itemDiscountModal, setItemDiscountModal] = useState(null); 
  const [itemDiscountPercent, setItemDiscountPercent] = useState('');
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);

  const [showMoveTableModal, setShowMoveTableModal] = useState(false);
  const [targetMoveTable, setTargetMoveTable] = useState('Stôl 1');

  const [tablePaxData, setTablePaxData] = useState({}); 
  const [showPaxModal, setShowPaxModal] = useState(false);
  const [tempPaxInput, setTempPaxInput] = useState('2');
  const [tableToConfigPax, setTableToConfigPax] = useState('');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDetailModal, setHistoryDetailModal] = useState(null);

  const [previewBillModal, setPreviewBillModal] = useState(null);
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

  const [activeReceipt, setActiveReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Hotovosť'); 
  const [appliedVoucher, setAppliedVoucher] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);

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

  const [noteModalItem, setNoteModalItem] = useState(null);
  const [itemNoteInput, setItemNoteInput] = useState('');

  const [pendingCancelItem, setPendingCancelItem] = useState(null);
  const [managerPinModal, setManagerPinModal] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');

  const [reservations, setReservations] = useState([
    { id: 1, table: 'VIP Box', time: '19:00', name: 'Pán Novák', pax: 4 }
  ]);
  const [newResTable, setNewResTable] = useState('Stôl 1');
  const [newResTime, setNewResTime] = useState('18:00');
  const [newResName, setNewResName] = useState('');
  const [newResPax, setNewResPax] = useState('2');

  const [paidReceiptsHistory, setPaidReceiptsHistory] = useState([]);
  const [automaticClosures, setAutomaticClosures] = useState([]);
  const [showClosureModal, setShowClosureModal] = useState(false);

  const [inventoryWizardState, setInventoryWizardState] = useState('select');
  const [inventoryTargetProduct, setInventoryTargetProduct] = useState(null);
  const [inventoryScannedCount, setInventoryScannedCount] = useState(0);

  const categoryConfig = {
    'Všetko': { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: '#f59e0b', dot: '#f59e0b' },
    'Káva': { bg: 'rgba(180, 130, 90, 0.15)', border: '#b4825a', text: '#d4a373', dot: '#d4a373' },
    'Alkohol': { bg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444', text: '#f87171', dot: '#ef4444' },
    'Cocktaily': { bg: 'rgba(236, 72, 153, 0.12)', border: '#ec4899', text: '#f472b6', dot: '#ec4899' },
    'Nealko napoje': { bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6', text: '#60a5fa', dot: '#3b82f6' },
    'Voda': { bg: 'rgba(20, 184, 166, 0.12)', border: '#14b8a6', text: '#2dd4bf', dot: '#14b8a6' },
    'Jedlá': { bg: 'rgba(234, 179, 8, 0.12)', border: '#eab308', text: '#facc15', dot: '#eab308' },
    'Pivo': { bg: 'rgba(249, 115, 22, 0.12)', border: '#f97316', text: '#fb923c', dot: '#f97316' },
    'Víno': { bg: 'rgba(168, 85, 247, 0.12)', border: '#a855f7', text: '#c084fc', dot: '#a855f7' },
    'Dezerty': { bg: 'rgba(236, 72, 153, 0.15)', border: '#db2777', text: '#f472b6', dot: '#db2777' }
  };

  const categories = Object.keys(categoryConfig);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
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

  useEffect(() => {
    const checkMidnightAndMorning = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const todayStr = now.toDateString();

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
        }
      }

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
    const sanitizedName = sanitizeTextForPrint(product.name);
    const updatedCart = [...currentTableCart, { 
      ...product, 
      name: sanitizedName,
      cartId: Date.now() + Math.random(), 
      sentToBar: false, 
      note: '',
      discountPercent: 0,
      vat: product.vat || 20 
    }];
    
    setTableCarts({ ...tableCarts, [selectedTable]: updatedCart });
    await saveTableCartToFirebase(updatedCart);
  };

  const addCustomItemToCart = async () => {
    if (!customItemName || !customItemPrice) {
      triggerInAppAlert("Zadajte názov aj cenu vlastnej položky!");
      return;
    }
    const priceVal = parseFloat(customItemPrice.toString().replace(',', '.')) || 0;
    const sanitizedCustomName = sanitizeTextForPrint(customItemName);
    const customProduct = {
      id: 'custom_' + Date.now(),
      name: sanitizedCustomName,
      category: 'Ostatné',
      price: priceVal,
      stock: 99,
      vat: 20
    };
    await addToCart(customProduct);
    setCustomItemName('');
    setCustomItemPrice('');
    setShowCustomItemModal(false);
    triggerInAppAlert("Vlastná položka pridaná do účtu.");
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
    const sanitizedNote = sanitizeTextForPrint(itemNoteInput);
    const updatedCart = currentTableCart.map(item => {
      if (item.cartId === noteModalItem.cartId) {
        return { ...item, note: sanitizedNote };
      }
      return item;
    });

    setTableCarts({ ...tableCarts, [selectedTable]: updatedCart });
    await saveTableCartToFirebase(updatedCart);
    setNoteModalItem(null);
    setItemNoteInput('');
    triggerInAppAlert("Poznámka uložená k položke.");
  };

  const applyItemDiscount = async () => {
    if (!itemDiscountModal) return;
    const p = parseFloat(itemDiscountPercent) || 0;
    const currentTableCart = tableCarts[selectedTable] || [];
    const updatedCart = currentTableCart.map(item => {
      if (item.cartId === itemDiscountModal.cartId) {
        const basePrice = item.originalPrice || item.price;
        const discounted = basePrice * (1 - p / 100);
        return { ...item, originalPrice: basePrice, price: discounted, discountPercent: p };
      }
      return item;
    });
    setTableCarts({ ...tableCarts, [selectedTable]: updatedCart });
    await saveTableCartToFirebase(updatedCart);
    setItemDiscountModal(null);
    setItemDiscountPercent('');
    triggerInAppAlert(`Zľava ${p}% aplikovaná na položku.`);
  };

  const payForTable = async (tableName = selectedTable) => {
    const targetCart = tableCarts[tableName] || [];
    if (targetCart.length === 0) {
      triggerInAppAlert("Účet pre " + tableName + " je prázdny.");
      return;
    }

    let currentTotal = targetCart.reduce((sum, i) => sum + i.price, 0);
    if (globalDiscountPercent > 0) {
      currentTotal = currentTotal * (1 - globalDiscountPercent / 100);
    }
    
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
        cashier: currentUser?.name || 'Neznámy',
        status: 'Zaplatene'
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

      const barItems = unsentCart.filter(i => ['Káva', 'Alkohol', 'Cocktaily', 'Nealko napoje', 'Voda', 'Pivo', 'Víno'].includes(i.category));
      const kitchenItems = unsentCart.filter(i => !['Káva', 'Alkohol', 'Cocktaily', 'Nealko napoje', 'Voda', 'Pivo', 'Víno'].includes(i.category));

      if (barItems.length > 0) {
        await addDoc(collection(db, 'kdsOrders'), {
          table: selectedTable + " (BAR)",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: barItems.map(i => ({ name: sanitizeTextForPrint(i.name) + (i.note ? ` [${sanitizeTextForPrint(i.note)}]` : ''), qty: 1 })),
          status: 'Nové',
          createdAt: Date.now()
        });
      }

      if (kitchenItems.length > 0) {
        await addDoc(collection(db, 'kdsOrders'), {
          table: selectedTable + " (KUCHYŇA)",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          items: kitchenItems.map(i => ({ name: sanitizeTextForPrint(i.name) + (i.note ? ` [${sanitizeTextForPrint(i.note)}]` : ''), qty: 1 })),
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

  let subtotalAmount = cart.reduce((sum, i) => sum + i.price, 0);
  let finalCartTotal = subtotalAmount * (1 - globalDiscountPercent / 100);
  const totalAmount = finalCartTotal.toFixed(2);

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

  const getTopSellingProducts = () => {
    const counts = {};
    paidReceiptsHistory.forEach(rec => {
      if (rec.items) {
        rec.items.forEach(it => {
          counts[it.name] = (counts[it.name] || 0) + 1;
        });
      }
    });
    const sorted = Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count);
    return sorted.slice(0, 5);
  };

  const topProducts = getTopSellingProducts();

  const dailyRevenueChartData = {
    labels: paidReceiptsHistory.slice(-7).map((r, idx) => `Blok #${idx + 1}`),
    datasets: [
      {
        label: 'Tržba v €',
        data: paidReceiptsHistory.slice(-7).map(r => r.total || 0),
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        borderColor: '#f59e0b',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }
    ]
  };

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
        backgroundColor: ['#d4a373', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6', '#eab308', '#f97316', '#a855f7', '#db2777'],
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

      {showCustomItemModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '360px', padding: '24px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '16px' }}>Vlastná položka (Voľná cena)</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 15px 0' }}>Zadajte názov a vlastnú cenu pre položku pri pokladni:</p>
            <input 
              type="text" 
              autoFocus
              value={customItemName} 
              onChange={e => setCustomItemName(e.target.value)} 
              placeholder="Názov položky (napr. Dopsat jedlo)" 
              style={{ padding: '10px', width: '100%', background: '#030303', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: '14px', marginBottom: '10px', boxSizing: 'border-box' }} 
            />
            <input 
              type="number" 
              value={customItemPrice} 
              onChange={e => setCustomItemPrice(e.target.value)} 
              placeholder="Cena (€)" 
              style={{ padding: '10px', width: '100%', background: '#030303', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', boxSizing: 'border-box' }} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={addCustomItemToCart} style={{ flex: 1, background: '#f59e0b', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Pridať do účtu</button>
              <button onClick={() => setShowCustomItemModal(false)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {itemDiscountModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #38bdf8', borderRadius: '20px', width: '340px', padding: '24px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '16px' }}>Zľava na položku</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 15px 0' }}>{itemDiscountModal.name}</p>
            <input 
              type="number" 
              autoFocus
              value={itemDiscountPercent} 
              onChange={e => setItemDiscountPercent(e.target.value)} 
              placeholder="Zľava v % (npr. 10)" 
              style={{ padding: '10px', width: '100%', background: '#030303', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: '16px', marginBottom: '15px', boxSizing: 'border-box' }} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={applyItemDiscount} style={{ flex: 1, background: '#38bdf8', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Aplikovať zľavu</button>
              <button onClick={() => setItemDiscountModal(null)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {showMoveTableModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '360px', padding: '24px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '16px' }}>Presun / Zlúčenie stola</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 15px 0' }}>Presunúť obsah stola <strong>{selectedTable}</strong> na cieľový stôl:</p>
            <select 
              value={targetMoveTable} 
              onChange={e => setTargetMoveTable(e.target.value)} 
              style={{ padding: '10px', width: '100%', background: '#030303', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: '14px', marginBottom: '15px', cursor: 'pointer' }}
            >
              {tables.filter(t => t !== selectedTable).map(t => (
                <option key={t} value={t}>{t} {(tableCarts[t] || []).length > 0 ? '(obsadený - zlúči sa)' : '(voľný)'}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={async () => {
                const sourceCart = tableCarts[selectedTable] || [];
                const destCart = tableCarts[targetMoveTable] || [];
                const merged = [...destCart, ...sourceCart];
                
                const newCarts = { ...tableCarts, [targetMoveTable]: merged, [selectedTable]: [] };
                setTableCarts(newCarts);
                await saveTableCartToFirebase(merged, targetMoveTable);
                await saveTableCartToFirebase([], selectedTable);

                setSelectedTable(targetMoveTable);
                setShowMoveTableModal(false);
                triggerInAppAlert(`Stôl úspešne presunutý/zlúčený na ${targetMoveTable}.`);
              }} style={{ flex: 1, background: '#f59e0b', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Potvrdiť presun</button>
              <button onClick={() => setShowMoveTableModal(false)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {showPaxModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #38bdf8', borderRadius: '20px', width: '340px', padding: '24px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '16px' }}>Počet osôb pri stole</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 15px 0' }}>Zadajte počet hostí pre {tableToConfigPax}:</p>
            <input 
              type="number" 
              autoFocus
              value={tempPaxInput} 
              onChange={e => setTempPaxInput(e.target.value)} 
              style={{ padding: '10px', width: '100%', background: '#030303', color: '#fff', border: '1px solid #374151', borderRadius: '8px', fontSize: '18px', textAlign: 'center', marginBottom: '15px', boxSizing: 'border-box' }} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                const paxNum = parseInt(tempPaxInput) || 1;
                setTablePaxData({ ...tablePaxData, [tableToConfigPax]: paxNum });
                setShowPaxModal(false);
                setSelectedTable(tableToConfigPax);
                setCurrentTab('pos');
                triggerInAppAlert(`Stôl ${tableToConfigPax} otvorený pre ${paxNum} osôb.`);
              }} style={{ flex: 1, background: '#38bdf8', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Uložiť a otvoriť</button>
              <button onClick={() => setShowPaxModal(false)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zrušiť</button>
            </div>
          </div>
        </div>
      )}

      {previewBillModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '380px', padding: '24px', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #374151', paddingBottom: '12px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '16px' }}>PREDBEŽNÝ ÚČET (NEFIŠKÁLNY)</h3>
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: '4px 0 0 0' }}>Stôl: {previewBillModal.tableName} | {new Date().toLocaleTimeString()}</p>
            </div>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' }}>
              {previewBillModal.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{it.name}</span>
                  <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{it.price.toFixed(2)} €</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginBottom: '20px' }}>
              <span>Spolu k úhrade:</span>
              <span style={{ color: '#34d399' }}>{previewBillModal.items.reduce((s, i) => s + i.price, 0).toFixed(2)} €</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                triggerInAppAlert("Predbežný účet bol vytlačený na účtenkovej tlačiarni.");
                setPreviewBillModal(null);
              }} style={{ flex: 1, background: '#f59e0b', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Vytlačiť predbežný účet</button>
              <button onClick={() => setPreviewBillModal(null)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>Zavrieť</button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 11000 }}>
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '500px', padding: '24px', display: 'flex', flexDirection: 'column', color: '#fff', maxHeight: '90vh' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#f59e0b', fontSize: '18px' }}>História uzavretých účtov</h3>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
              {paidReceiptsHistory.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center' }}>Žiadne uzavreté účty</p>
              ) : (
                paidReceiptsHistory.map(rec => (
                  <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030303', padding: '10px 14px', borderRadius: '10px', border: '1px solid #1f2937' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>Stôl: {rec.tableName} | <span style={{ color: '#34d399' }}>{rec.total?.toFixed(2)} €</span></div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Platba: {rec.paymentMethod} | Čas: {rec.timestamp} | Kasír: {rec.cashier}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setHistoryDetailModal(rec)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Detail</button>
                      {currentUser.isAdmin && (
                        <button onClick={async () => {
                          if (window.confirm("Naozaj stornovať tento uzavretý účet?")) {
                            await deleteDoc(doc(db, 'paidReceipts', rec.id));
                            triggerInAppAlert("Účet bol úspešne stornovaný z histórie.");
                          }
                        }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Storno</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowHistoryModal(false)} style={{ background: '#374151', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Zavrieť</button>
          </div>
        </div>
      )}

      {historyDetailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 12000 }}>
          <div style={{ background: '#111827', border: '1px solid #38bdf8', borderRadius: '20px', width: '380px', padding: '24px', color: '#fff' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '16px' }}>Detail bloku: {historyDetailModal.tableName}</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 15px 0' }}>Zaplatené: {historyDetailModal.timestamp} | Spôsob: {historyDetailModal.paymentMethod}</p>
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' }}>
              {historyDetailModal.items && historyDetailModal.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>{it.name}</span>
                  <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{it.price.toFixed(2)} €</span>
                </div>
              ))}
            </div>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', marginBottom: '20px' }}>
              <span>Celkom zaplatené:</span>
              <span style={{ color: '#34d399' }}>{historyDetailModal.total?.toFixed(2)} €</span>
            </div>
            <button onClick={() => setHistoryDetailModal(null)} style={{ width: '100%', background: '#374151', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Zavrieť detail</button>
          </div>
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
              {['Hotovosť', 'Karta', 'Gastro lístky', 'Faktúra'].map(m => (
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
          <div style={{ background: '#111827', border: '1px solid #f59e0b', borderRadius: '20px', width: '480px', padding: '24px', display: 'flex', flexDirection: 'column', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #374151', paddingBottom: '12px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '18px' }}>DENNÁ UZÁVIERKA (Z-UZÁVIERKA)</h3>
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

              <div style={{ background: '#030303', padding: '12px', borderRadius: '12px', border: '1px solid #1f2937', marginTop: '5px' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>📈 Grafický vývoj tržieb:</span>
                <div style={{ height: '150px' }}>
                  <Line data={dailyRevenueChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#9ca3af', font: { size: 10 } } }, y: { ticks: { color: '#9ca3af', font: { size: 10 } } } } }} />
                </div>
              </div>

              {automaticClosures.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>História automatických polnočných uzávierok:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
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
              }} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                📧 Telegram
              </button>
              <button onClick={() => {
                triggerInAppAlert("Z-uzávierka bola úspešne vytlačená.");
                setShowClosureModal(false);
              }} style={{ background: '#f59e0b', color: '#030303', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                Vytlačiť
              </button>
              <button onClick={() => setShowClosureModal(false)} style={{ background: '#1f2937', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
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
          <div style={{ background: '#111827', border: '1px solid #1f2937', padding: '6px 10px', borderRadius: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '12px' }}>
            🕒 {currentTimeStr}
          </div>

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
            <span style={{ color: '#9ca3af' }}>Čašník: <strong style={{ color: '#fff' }}>{currentUser.name}</strong></span>
            
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
          <div style={{ position: 'absolute', top: '65px', left: '15px', background: '#0f172a', border: '1px solid #1f2937', borderRadius: '14px', width: '270px', zIndex: 1000, padding: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}>
            <div onClick={() => { setCurrentTab('pos'); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'pos' ? '#f59e0b' : 'transparent', color: currentTab === 'pos' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>🧮 Pokladňa</div>
            <div onClick={() => { payForTable(selectedTable); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#34d399', fontWeight: '600', marginBottom: '4px' }}>💳 Účet / Zaplatiť (Blok)</div>
            <div onClick={() => { setShowHistoryModal(true); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#38bdf8', fontWeight: '600', marginBottom: '4px' }}>📜 História uzavretých účtov</div>
            <div onClick={() => { setShowClosureModal(true); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#f59e0b', fontWeight: '600', marginBottom: '4px' }}>📊 Denná uzávierka (Z)</div>
            <div onClick={() => { setCurrentTab('stats'); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'stats' ? '#f59e0b' : 'transparent', color: currentTab === 'stats' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>📈 Manažérske štatistiky</div>
            <div onClick={() => { setCurrentTab('kds'); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'kds' ? '#f59e0b' : 'transparent', color: currentTab === 'kds' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>🖥️ KDS Displej & Oddelená tlač</div>
            <div onClick={() => { setCurrentTab('floorplan'); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'floorplan' ? '#f59e0b' : 'transparent', color: currentTab === 'floorplan' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>🗺️ Mapa stôl & Rezervácie</div>
            <div onClick={() => { setCurrentTab('loyalty'); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'loyalty' ? '#f59e0b' : 'transparent', color: currentTab === 'loyalty' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>⭐ Vernostný program & Vouchery</div>
            <div onClick={() => { setCurrentTab('inventory'); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'inventory' ? '#f59e0b' : 'transparent', color: currentTab === 'inventory' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>🍷 Správa skladu a produktov</div>
            <div onClick={() => { 
              setInventoryWizardState('select');
              setInventoryTargetProduct(null);
              setInventoryScannedCount(0);
              setCurrentTab('scanner'); 
              setMenuOpen(false); 
            }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'scanner' ? '#f59e0b' : 'transparent', color: currentTab === 'scanner' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>📷 Inventúrny Skener</div>
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
              }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', background: currentTab === 'settings' ? '#f59e0b' : 'transparent', color: currentTab === 'settings' ? '#030303' : '#fff', fontWeight: '600', marginBottom: '4px' }}>⚙️ Nastavenia / Produkt</div>
            )}
            <div style={{ borderTop: '1px solid #1f2937', margin: '5px 0' }}></div>
            <div onClick={() => { setCurrentUser(null); setPinInput(''); setMenuOpen(false); }} style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', fontWeight: '600' }}>🔒 Odhlásiť</div>
          </div>
        )}
      </header>

      <div style={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        
        {currentTab === 'pos' && (
          <div style={{ flexGrow: 1, padding: '12px', overflowY: 'auto', boxSizing: 'border-box', height: '100%' }}>
            <div className="pos-container">
              
              <div className="pos-left-pane" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', flexShrink: '0' }}>
                  <input 
                    type="text" 
                    placeholder="🔍 Rýchle vyhľadávanie produktu podľa názvu/kódu..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, background: '#111827', border: '1px solid #1f2937', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontSize: '13px' }}
                  />
                  <button onClick={() => { setCustomItemName(''); setCustomItemPrice(''); setShowCustomItemModal(true); }} style={{ background: '#f59e0b', color: '#030303', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    + Vlastná položka
                  </button>
                </div>

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
                  {products
                    .filter(p => activeCategory === 'Všetko' || p.category === activeCategory)
                    .filter(p => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
                    })
                    .map(product => {
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
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#fff' }}>Stôl: <span style={{ color: '#f59e0b' }}>{selectedTable}</span> {tablePaxData[selectedTable] ? `(${tablePaxData[selectedTable]} os.)` : ''}</h3>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>{totalAmount} €</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '6px', flexShrink: 0 }}>
                  <button style={{ padding: '8px 4px', background: '#38bdf8', color: '#030303', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }} onClick={() => setPreviewBillModal({ tableName: selectedTable, items: cart })}>
                    🖨️ PREDBEŽNÝ ÚČET
                  </button>
                  <button style={{ padding: '8px 4px', background: '#f59e0b', color: '#030303', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '11px' }} onClick={() => payForTable(selectedTable)}>
                    💳 ZAPLATIŤ ÚČET
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '11px', color: '#9ca3af', flexShrink: 0 }}>
                  <span>Zľava na účet:</span>
                  {[0, 5, 10, 15].map(p => (
                    <button key={p} onClick={() => setGlobalDiscountPercent(p)} style={{ background: globalDiscountPercent === p ? '#f59e0b' : '#111827', color: globalDiscountPercent === p ? '#030303' : '#fff', border: '1px solid #1f2937', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}>
                      {p}%
                    </button>
                  ))}
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
                            {item.discountPercent > 0 && <span style={{ fontSize: '9px', color: '#38bdf8', marginLeft: '4px' }}>(-{item.discountPercent}%)</span>}
                          </div>
                          {item.note && <div style={{ fontSize: '10px', color: '#38bdf8' }}>Pozn: {item.note}</div>}
                          <div style={{ fontSize: '10px', color: '#f59e0b' }}>{item.price.toFixed(2)} €</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button onClick={() => setItemDiscountModal(item)} style={{ background: '#1f2937', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '10px', padding: '4px 6px', borderRadius: '4px' }} title="Zľava">🏷️</button>
                          <button onClick={() => setNoteModalItem(item)} style={{ background: '#1f2937', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '11px', padding: '4px 6px', borderRadius: '4px' }}>📝</button>
                          <button onClick={() => requestRemoveFromCart(item.cartId)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, fontSize: '12px', color: '#9ca3af' }}>
                  <span>Položiek: {cart.length}</span>
                  <button onClick={() => requestRemoveFromCart('all')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontWeight: 'bold' }}>🗑️ Zmazať celý košík</button>
                </div>
              </div>

            </div>
          </div>
        )}

        {currentTab === 'stats' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>📈 Manažérske štatistiky najpredávanejších produktov</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#f59e0b' }}>🏆 Top 5 najpredávanejších položiek</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topProducts.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>Zatiaľ žiadne dáta z predaja.</p>
                  ) : (
                    topProducts.map((tp, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#030303', padding: '10px 14px', borderRadius: '10px', border: '1px solid #1f2937', fontSize: '13px' }}>
                        <span><strong>#{idx + 1}</strong> {tp.name}</span>
                        <span style={{ color: '#34d399', fontWeight: 'bold' }}>{tp.count} predajov</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#38bdf8' }}>📊 Prehľad obratu a výkonnosti</h3>
                <div style={{ background: '#030303', padding: '14px', borderRadius: '12px', border: '1px solid #1f2937', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Celkový počet uzavretých blokov:</span>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{totalTransactionsCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Celková tržba dnes:</span>
                    <span style={{ fontWeight: 'bold', color: '#34d399' }}>{totalRevenueToday.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                        owner: sanitizeTextForPrint(newCardOwner),
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
                        code: sanitizeTextForPrint(newVoucherCode.toUpperCase()),
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

        {currentTab === 'floorplan' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>Mapa stôl & Rezervácie</h2>
              <button onClick={() => setShowMoveTableModal(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                🔀 Presunúť / Zlúčiť stôl ({selectedTable})
              </button>
            </div>

            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px', maxWidth: '600px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b', fontSize: '14px' }}>Vytvoriť novú rezerváciu stola</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                <select value={newResTable} onChange={e => setNewResTable(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }}>
                  {tables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" placeholder="Čas (npr. 19:00)" value={newResTime} onChange={e => setNewResTime(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
                <input type="text" placeholder="Meno hosťa" value={newResName} onChange={e => setNewResName(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
                <input type="number" placeholder="Počet osôb" value={newResPax} onChange={e => setNewResPax(e.target.value)} style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '12px' }} />
              </div>
              <button onClick={() => {
                if (!newResName) {
                  triggerInAppAlert("Zadajte meno pre rezerváciu!");
                  return;
                }
                setReservations([...reservations, {
                  id: Date.now(),
                  table: newResTable,
                  time: newResTime,
                  name: sanitizeTextForPrint(newResName),
                  pax: parseInt(newResPax) || 2
                }]);
                setNewResName('');
                triggerInAppAlert("Rezervácia úspešne pridaná.");
              }} style={{ width: '100%', background: '#f59e0b', color: '#030303', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                Pridať rezerváciu
              </button>
            </div>

            <h3 style={{ margin: '10px 0 0 0', fontSize: '15px', color: '#fff' }}>Prehľad stolov & Aktívne rezervácie</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
              {tables.map(tName => {
                const tCart = tableCarts[tName] || [];
                const tSum = tCart.reduce((s, i) => s + i.price, 0);
                const isOccupied = tCart.length > 0;
                const pax = tablePaxData[tName];
                const resForTable = reservations.filter(r => r.table === tName);

                return (
                  <div 
                    key={tName} 
                    style={{ 
                      background: '#111827', 
                      border: isOccupied ? '2px solid #f59e0b' : '1px solid #1f2937', 
                      borderRadius: '16px', 
                      padding: '16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>{tName}</span>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: isOccupied ? 'rgba(245, 158, 11, 0.2)' : 'rgba(52, 211, 153, 0.2)', color: isOccupied ? '#f59e0b' : '#34d399', fontWeight: 'bold' }}>
                        {isOccupied ? 'Obsadený' : 'Voľný'}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      {pax ? `Počet osôb: ${pax}` : 'Počet osôb nenastavený'}
                    </div>

                    {isOccupied && (
                      <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 'bold' }}>
                        Účet: {tSum.toFixed(2)} € ({tCart.length} ks)
                      </div>
                    )}

                    {resForTable.length > 0 && (
                      <div style={{ background: '#030303', padding: '6px 8px', borderRadius: '6px', border: '1px solid #1f2937', fontSize: '11px', color: '#38bdf8' }}>
                        📅 Rezervácia: {resForTable[0].time} - {resForTable[0].name} ({resForTable[0].pax} os.)
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                      <button 
                        onClick={() => {
                          if (!isOccupied) {
                            setTableToConfigPax(tName);
                            setTempPaxInput('2');
                            setShowPaxModal(true);
                          } else {
                            setSelectedTable(tName);
                            setCurrentTab('pos');
                          }
                        }} 
                        style={{ flex: 1, background: '#f59e0b', color: '#030303', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                      >
                        {isOccupied ? 'Otvoriť účet' : 'Otvoriť stôl'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentTab === 'inventory' && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>🍷 Správa skladu a produktov</h2>
              <button onClick={() => {
                setInventoryWizardState('select');
                setInventoryTargetProduct(null);
                setInventoryScannedCount(0);
                setCurrentTab('scanner');
              }} style={{ background: '#f59e0b', color: '#030303', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                📷 Spustiť inventúrny skener
              </button>
            </div>

            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#f59e0b' }}>Grafický prehľad zásob podľa kategórií</h3>
              <div style={{ height: '220px' }}>
                <Bar data={categoryStockData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#9ca3af', font: { size: 10 } } }, y: { ticks: { color: '#9ca3af', font: { size: 10 } } } } }} />
              </div>
            </div>

            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#fff' }}>Zoznam skladových položiek</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {products.map(prod => (
                  <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030303', padding: '10px 14px', borderRadius: '10px', border: '1px solid #1f2937', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{prod.name} <span style={{ color: '#f59e0b', fontSize: '11px' }}>({prod.category})</span></div>
                      <div style={{ color: '#9ca3af', fontSize: '11px' }}>EAN: {prod.barcode || 'Nedostupný'} | Cena: {prod.price.toFixed(2)} €</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontWeight: 'bold', color: prod.stock === 99 ? '#9ca3af' : '#34d399' }}>{prod.stock === 99 ? '∞ (Neobmedzené)' : `${prod.stock} ks`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'settings' && currentUser.isAdmin && (
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', color: '#fff' }}>⚙️ Nastavenia a Správa produktov (Admin)</h2>
            
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px', maxWidth: '500px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#f59e0b' }}>{editingProdId ? 'Upraviť produkt' : 'Pridať nový produkt do ponuky'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                <input 
                  type="text" 
                  placeholder="Názov produktu" 
                  value={newProdName} 
                  onChange={e => setNewProdName(e.target.value)} 
                  style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                />
                <select 
                  value={newProdCat} 
                  onChange={e => setNewProdCat(e.target.value)} 
                  style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
                >
                  {categories.filter(c => c !== 'Všetko').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="number" 
                    placeholder="Cena (€)" 
                    value={newProdPrice} 
                    onChange={e => setNewProdPrice(e.target.value)} 
                    style={{ flex: 1, background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                  />
                  <input 
                    type="number" 
                    placeholder="Počet ks na sklade (99 = ∞)" 
                    value={newProdStock} 
                    onChange={e => setNewProdStock(e.target.value)} 
                    style={{ flex: 1, background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Čiarový kód (EAN)" 
                  value={newProdBarcode} 
                  onChange={e => setNewProdBarcode(e.target.value)} 
                  style={{ background: '#030303', border: '1px solid #374151', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', boxSizing: 'border-box' }} 
                />
              </div>
              <button onClick={async () => {
                if (!newProdName || !newProdPrice) {
                  triggerInAppAlert("Zadajte názov a cenu produktu!");
                  return;
                }
                const prodData = {
                  name: sanitizeTextForPrint(newProdName),
                  category: newProdCat,
                  price: parseFloat(newProdPrice) || 0,
                  stock: newProdStock === '' ? 99 : parseInt(newProdStock),
                  barcode: newProdBarcode || '',
                  vat: 20
                };

                if (editingProdId) {
                  await updateDoc(doc(db, 'products', editingProdId), prodData);
                  triggerInAppAlert("Produkt úspešne upravený.");
                } else {
                  await addDoc(collection(db, 'products'), prodData);
                  triggerInAppAlert("Nový produkt úspešne pridaný.");
                }

                setEditingProdId(null);
                setNewProdName('');
                setNewProdPrice('');
                setNewProdStock('');
                setNewProdBarcode('');
              }} style={{ width: '100%', background: '#f59e0b', color: '#030303', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                {editingProdId ? 'Uložiť zmeny' : 'Pridať produkt'}
              </button>
            </div>

            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '16px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: '#fff' }}>Existujúce produkty v systéme</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                {products.map(prod => (
                  <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#030303', padding: '10px 14px', borderRadius: '10px', border: '1px solid #1f2937', fontSize: '13px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{prod.name} <span style={{ color: '#f59e0b', fontSize: '11px' }}>({prod.category})</span> - <span style={{ color: '#34d399' }}>{prod.price.toFixed(2)} €</span></div>
                      <div style={{ color: '#9ca3af', fontSize: '11px' }}>Sklad: {prod.stock === 99 ? '∞' : `${prod.stock} ks`} | EAN: {prod.barcode || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => {
                        setEditingProdId(prod.id);
                        setNewProdName(prod.name);
                        setNewProdCat(prod.category);
                        setNewProdPrice(prod.price.toString());
                        setNewProdStock(prod.stock === 99 ? '' : prod.stock.toString());
                        setNewProdBarcode(prod.barcode || '');
                      }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Upraviť</button>
                      <button onClick={async () => {
                        if (window.confirm("Naozaj vymazať tento produkt?")) {
                          await deleteDoc(doc(db, 'products', prod.id));
                          triggerInAppAlert("Produkt bol zmazaný.");
                        }
                      }} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>Zmazať</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
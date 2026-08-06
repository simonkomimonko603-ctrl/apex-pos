const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Pripojenie do SQLite databázy
const db = new sqlite3.Database('./pos.db', (err) => {
  if (err) {
    console.error('Chyba pri pripájaní k databáze:', err.message);
  } else {
    console.log('Úspešne pripojené k SQLite databáze.');
  }
});

// Vytvorenie základných tabuliek, ak neexistujú
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin TEXT UNIQUE,
    name TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name INTEGER,
    waiter_name TEXT,
    items TEXT,
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Vloženie predvolených používateľov (PIN 1111 pre čašníka, 1234 pre manažéra)
  db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO users (pin, name, role) VALUES ('1111', 'Peter Čašník', 'waiter')`);
      db.run(`INSERT INTO users (pin, name, role) VALUES ('1234', 'Jozef Manažér', 'manager')`);
      console.log('Predvolení používatelia (PIN 1111 a 1234) boli vytvorení.');
    }
  });
});

// Endpoint na overenie stavu servera
app.get('/ping', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint na prihlásenie pomocou PIN kódu
app.post('/api/login', (req, res) => {
  const { pin } = req.body;
  db.get(`SELECT * FROM users WHERE pin = ?`, [pin], (err, user) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Chyba databázy' });
    } else if (user) {
      res.json({ success: true, user: { name: user.name, role: user.role } });
    } else {
      res.json({ success: false, message: 'Neplatný PIN kód!' });
    }
  });
});

// Endpoint na synchronizáciu a ukladanie akcií (objednávky, storná)
app.post('/api/sync', (req, res) => {
  const { action_type, payload } = req.body;

  if (action_type === 'CREATE_ORDER') {
    const { tableName, waiterName, items, totalAmount } = payload;
    const itemsJson = JSON.stringify(items);

    db.run(
      `INSERT INTO orders (table_name, waiter_name, items, total_amount) VALUES (?, ?, ?, ?)`,
      [tableName, waiterName, itemsJson, totalAmount],
      function (err) {
        if (err) {
          res.status(500).json({ success: false, error: err.message });
        } else {
          res.json({ success: true, orderId: this.lastID });
        }
      }
    );
  } else if (action_type === 'CANCEL_ITEM') {
    console.log('Evidujem storno položky:', payload);
    res.json({ success: true, message: 'Storno zaevidované' });
  } else {
    res.status(400).json({ success: false, message: 'Neznámy typ akcie' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server beží na porte ${PORT}`);
});
/**
 * CRICK222 – Local JSON Server
 * Run: node server.js
 * Then open: http://localhost:3000
 */

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const url     = require('url');

const PORT    = 3000;
const DB_PATH = path.join(__dirname, 'database.json');
const PUBLIC  = __dirname;

// ── Helpers ───────────────────────────────────────────────────
function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon'
  };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
      res.end(data);
    }
  });
}

function bodyJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch(e) { reject(e); }
    });
  });
}

// ── Router ────────────────────────────────────────────────────
const routes = {

  // ── AUTH ──────────────────────────────────────────────────
  'POST /api/login': async (req, res) => {
    const { username, password } = await bodyJSON(req);
    const db = readDB();
    const user = db.users.find(u => u.username === username && u.password === password && u.status === 'active');
    if (user) {
      const { password: _, ...safeUser } = user;
      send(res, 200, { success: true, user: safeUser });
    } else {
      send(res, 401, { success: false, message: 'Invalid credentials or account blocked.' });
    }
  },

  'POST /api/admin/login': async (req, res) => {
    const { username, password } = await bodyJSON(req);
    const db = readDB();
    const admin = db.admins.find(a => a.username === username && a.password === password);
    if (admin) {
      send(res, 200, { success: true, admin: { username: admin.username, role: admin.role } });
    } else {
      send(res, 401, { success: false, message: 'Invalid admin credentials.' });
    }
  },

  // ── USERS ─────────────────────────────────────────────────
  'GET /api/users': (req, res) => {
    const db = readDB();
    const safe = db.users.map(({ password, ...u }) => u);
    send(res, 200, { success: true, users: safe });
  },

  'POST /api/users': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    if (db.users.find(u => u.username === body.username)) {
      return send(res, 400, { success: false, message: 'Username already exists.' });
    }
    const newUser = {
      id:       Date.now(),
      username: body.username,
      password: body.password,
      balance:  parseFloat(body.balance) || 0,
      mobile:   body.mobile || '',
      status:   'active',
      created:  new Date().toISOString().split('T')[0],
      role:     'user'
    };
    db.users.push(newUser);
    writeDB(db);
    const { password: _, ...safeUser } = newUser;
    send(res, 201, { success: true, user: safeUser });
  },

  'PUT /api/users': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    const idx = db.users.findIndex(u => u.id === body.id);
    if (idx === -1) return send(res, 404, { success: false, message: 'User not found.' });
    if (body.balance  !== undefined) db.users[idx].balance  = parseFloat(body.balance);
    if (body.status   !== undefined) db.users[idx].status   = body.status;
    if (body.mobile   !== undefined) db.users[idx].mobile   = body.mobile;
    if (body.password !== undefined && body.password !== '') db.users[idx].password = body.password;
    writeDB(db);
    const { password: _, ...safeUser } = db.users[idx];
    send(res, 200, { success: true, user: safeUser });
  },

  'DELETE /api/users': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    db.users = db.users.filter(u => u.id !== body.id);
    writeDB(db);
    send(res, 200, { success: true });
  },

  // ── DEPOSITS ──────────────────────────────────────────────
  'GET /api/deposits': (req, res) => {
    const db = readDB();
    send(res, 200, { success: true, deposits: db.deposits });
  },

  'POST /api/deposits': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    const dep = {
      id:       Date.now(),
      userId:   body.userId,
      username: body.username,
      amount:   parseFloat(body.amount),
      utr:      body.utr || '',
      date:     new Date().toISOString().split('T')[0],
      status:   'pending'
    };
    db.deposits.push(dep);
    writeDB(db);
    send(res, 201, { success: true, deposit: dep });
  },

  'PUT /api/deposits': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    const dep = db.deposits.find(d => d.id === body.id);
    if (!dep) return send(res, 404, { success: false, message: 'Deposit not found.' });
    dep.status = body.status;
    // If approved, credit user balance
    if (body.status === 'approved') {
      const user = db.users.find(u => u.id === dep.userId || u.username === dep.username);
      if (user) user.balance = (user.balance || 0) + dep.amount;
    }
    writeDB(db);
    send(res, 200, { success: true, deposit: dep });
  },

  // ── WITHDRAWALS ───────────────────────────────────────────
  'GET /api/withdrawals': (req, res) => {
    const db = readDB();
    send(res, 200, { success: true, withdrawals: db.withdrawals });
  },

  'POST /api/withdrawals': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    const user = db.users.find(u => u.id === body.userId || u.username === body.username);
    if (!user) return send(res, 404, { success: false, message: 'User not found.' });
    if (user.balance < body.amount) return send(res, 400, { success: false, message: 'Insufficient balance.' });
    const wd = {
      id:        Date.now(),
      userId:    body.userId,
      username:  body.username,
      amount:    parseFloat(body.amount),
      accountNo: body.accountNo || '',
      ifsc:      body.ifsc || '',
      date:      new Date().toISOString().split('T')[0],
      status:    'pending'
    };
    db.withdrawals.push(wd);
    writeDB(db);
    send(res, 201, { success: true, withdrawal: wd });
  },

  'PUT /api/withdrawals': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    const wd = db.withdrawals.find(w => w.id === body.id);
    if (!wd) return send(res, 404, { success: false, message: 'Withdrawal not found.' });
    const prevStatus = wd.status;
    wd.status = body.status;
    // If approved, deduct balance
    if (body.status === 'approved' && prevStatus !== 'approved') {
      const user = db.users.find(u => u.id === wd.userId || u.username === wd.username);
      if (user) user.balance = Math.max(0, (user.balance || 0) - wd.amount);
    }
    writeDB(db);
    send(res, 200, { success: true, withdrawal: wd });
  },

  // ── PAYMENT DETAILS ───────────────────────────────────────
  'GET /api/payment-details': (req, res) => {
    const db = readDB();
    send(res, 200, { success: true, paymentDetails: db.paymentDetails });
  },

  'PUT /api/payment-details': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    if (body.bank)      db.paymentDetails.bank      = { ...db.paymentDetails.bank,      ...body.bank };
    if (body.upi)       db.paymentDetails.upi        = { ...db.paymentDetails.upi,       ...body.upi };
    if (body.whatsapp)  db.paymentDetails.whatsapp   = body.whatsapp;
    writeDB(db);
    send(res, 200, { success: true, paymentDetails: db.paymentDetails });
  },

  // ── SETTINGS ──────────────────────────────────────────────
  'GET /api/settings': (req, res) => {
    const db = readDB();
    send(res, 200, { success: true, settings: db.settings });
  },

  'PUT /api/settings': async (req, res) => {
    const body = await bodyJSON(req);
    const db = readDB();
    db.settings = { ...db.settings, ...body };
    writeDB(db);
    send(res, 200, { success: true, settings: db.settings });
  }
};

// ── Main Server ───────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API routes
  const key = `${req.method} ${pathname}`;
  if (routes[key]) {
    try { await routes[key](req, res); }
    catch(e) { send(res, 500, { success: false, message: e.message }); }
    return;
  }

  // Static file serving
  let filePath = path.join(PUBLIC, pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ✅  Crick222 server running!');
  console.log(`  🌐  Open: http://localhost:${PORT}`);
  console.log(`  📁  Database: ${DB_PATH}`);
  console.log('  🛑  Press Ctrl+C to stop');
  console.log('');
});

/**
 * CRICK222 – API Client
 * All fetch calls to the local Node.js server go through here.
 */

const API = 'http://localhost:3000/api';

// ── Generic fetch wrapper ─────────────────────────────────────
async function apiFetch(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res  = await fetch(API + endpoint, opts);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('API error:', e);
    return { success: false, message: 'Cannot connect to server. Is server.js running?' };
  }
}

// ── Auth ──────────────────────────────────────────────────────
const Auth = {
  login:      (username, password) => apiFetch('/login',       'POST', { username, password }),
  adminLogin: (username, password) => apiFetch('/admin/login', 'POST', { username, password }),

  getUser()  { return JSON.parse(sessionStorage.getItem('crick222_user')  || 'null'); },
  getAdmin() { return JSON.parse(sessionStorage.getItem('crick222_admin') || 'null'); },

  setUser(u)  { sessionStorage.setItem('crick222_user',  JSON.stringify(u)); },
  setAdmin(a) { sessionStorage.setItem('crick222_admin', JSON.stringify(a)); },

  logout() {
    sessionStorage.removeItem('crick222_user');
    window.location.href = '/login.html';
  },
  adminLogout() {
    sessionStorage.removeItem('crick222_admin');
    window.location.href = '/admin/login.html';
  },

  requireUser() {
    if (!this.getUser()) { window.location.href = '/login.html'; return false; }
    return true;
  },
  requireAdmin() {
    if (!this.getAdmin()) { window.location.href = '/admin/login.html'; return false; }
    return true;
  }
};

// ── Users ─────────────────────────────────────────────────────
const Users = {
  getAll:    ()     => apiFetch('/users'),
  create:    (data) => apiFetch('/users',  'POST',   data),
  update:    (data) => apiFetch('/users',  'PUT',    data),
  remove:    (id)   => apiFetch('/users',  'DELETE', { id })
};

// ── Deposits ──────────────────────────────────────────────────
const Deposits = {
  getAll:    ()     => apiFetch('/deposits'),
  submit:    (data) => apiFetch('/deposits', 'POST', data),
  setStatus: (id, status) => apiFetch('/deposits', 'PUT', { id, status })
};

// ── Withdrawals ───────────────────────────────────────────────
const Withdrawals = {
  getAll:    ()     => apiFetch('/withdrawals'),
  submit:    (data) => apiFetch('/withdrawals', 'POST', data),
  setStatus: (id, status) => apiFetch('/withdrawals', 'PUT', { id, status })
};

// ── Payment Details ───────────────────────────────────────────
const PaymentDetails = {
  get:    ()     => apiFetch('/payment-details'),
  update: (data) => apiFetch('/payment-details', 'PUT', data)
};

// ── Settings ──────────────────────────────────────────────────
const Settings = {
  get:    ()     => apiFetch('/settings'),
  update: (data) => apiFetch('/settings', 'PUT', data)
};

// ── UI Helpers ────────────────────────────────────────────────
function updateHeaderUI() {
  const user = Auth.getUser();
  const idEl  = document.getElementById('headerUserId');
  const balEl = document.getElementById('headerBalance');
  if (idEl)  idEl.textContent  = user ? user.username : 'Guest';
  if (balEl) balEl.textContent = user ? '₹' + Number(user.balance).toFixed(2) : '₹0.00';
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function statusBadge(s) {
  if (s === 'approved') return '<span class="status-approved">✓ Approved</span>';
  if (s === 'rejected') return '<span class="status-rejected">✗ Rejected</span>';
  return '<span class="status-pending">⏳ Pending</span>';
}

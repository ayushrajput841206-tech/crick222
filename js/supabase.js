/**
 * CRICK222 – Supabase Client
 * Replaces local server.js + api.js for online/live use.
 */

// ── Init Supabase ─────────────────────────────────────────────
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── AUTH ──────────────────────────────────────────────────────
const Auth = {
  getUser()  { return JSON.parse(sessionStorage.getItem('crick222_user')  || 'null'); },
  getAdmin() { return JSON.parse(sessionStorage.getItem('crick222_admin') || 'null'); },
  setUser(u)  { sessionStorage.setItem('crick222_user',  JSON.stringify(u)); },
  setAdmin(a) { sessionStorage.setItem('crick222_admin', JSON.stringify(a)); },

  async login(username, password) {
    const { data, error } = await db
      .from('users')
      .select('id, username, balance, mobile, status, role')
      .eq('username', username)
      .eq('password', password)
      .eq('status', 'active')
      .single();
    if (error || !data) return { success: false, message: 'Invalid credentials or account blocked.' };
    return { success: true, user: data };
  },

  async adminLogin(username, password) {
    const { data, error } = await db
      .from('admins')
      .select('id, username, role')
      .eq('username', username)
      .eq('password', password)
      .single();
    if (error || !data) return { success: false, message: 'Invalid admin credentials.' };
    return { success: true, admin: data };
  },

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

// ── USERS ─────────────────────────────────────────────────────
const Users = {
  async getAll() {
    const { data, error } = await db
      .from('users')
      .select('id, username, balance, mobile, status, role, created_at')
      .order('created_at', { ascending: true });
    if (error) return { success: false, message: error.message };
    return { success: true, users: data };
  },

  async create(body) {
    const { data, error } = await db
      .from('users')
      .insert([{
        username: body.username,
        password: body.password,
        balance:  parseFloat(body.balance) || 0,
        mobile:   body.mobile || '',
        status:   'active',
        role:     'user'
      }])
      .select('id, username, balance, mobile, status, role')
      .single();
    if (error) return { success: false, message: error.message.includes('unique') ? 'Username already exists.' : error.message };
    return { success: true, user: data };
  },

  async update(body) {
    const updates = {};
    if (body.balance  !== undefined) updates.balance  = parseFloat(body.balance);
    if (body.status   !== undefined) updates.status   = body.status;
    if (body.mobile   !== undefined) updates.mobile   = body.mobile;
    if (body.password !== undefined && body.password !== '') updates.password = body.password;
    const { data, error } = await db
      .from('users').update(updates).eq('id', body.id)
      .select('id, username, balance, mobile, status, role').single();
    if (error) return { success: false, message: error.message };
    return { success: true, user: data };
  },

  async remove(id) {
    const { error } = await db.from('users').delete().eq('id', id);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }
};

// ── DEPOSITS ──────────────────────────────────────────────────
const Deposits = {
  async getAll() {
    const { data, error } = await db
      .from('deposits').select('*').order('created_at', { ascending: false });
    if (error) return { success: false, message: error.message };
    return { success: true, deposits: data };
  },

  async submit(body) {
    const { data, error } = await db
      .from('deposits')
      .insert([{ user_id: body.userId, username: body.username, amount: body.amount, utr: body.utr || '', status: 'pending' }])
      .select().single();
    if (error) return { success: false, message: error.message };
    return { success: true, deposit: data };
  },

  async setStatus(id, status) {
    // Get deposit first
    const { data: dep } = await db.from('deposits').select('*').eq('id', id).single();
    if (!dep) return { success: false, message: 'Deposit not found.' };

    const { error } = await db.from('deposits').update({ status }).eq('id', id);
    if (error) return { success: false, message: error.message };

    // Credit balance if approved
    if (status === 'approved') {
      const { data: user } = await db.from('users').select('balance').eq('username', dep.username).single();
      if (user) {
        await db.from('users').update({ balance: (user.balance || 0) + dep.amount }).eq('username', dep.username);
      }
    }
    return { success: true };
  }
};

// ── WITHDRAWALS ───────────────────────────────────────────────
const Withdrawals = {
  async getAll() {
    const { data, error } = await db
      .from('withdrawals').select('*').order('created_at', { ascending: false });
    if (error) return { success: false, message: error.message };
    return { success: true, withdrawals: data };
  },

  async submit(body) {
    const { data: user } = await db.from('users').select('balance').eq('username', body.username).single();
    if (!user) return { success: false, message: 'User not found.' };
    if (user.balance < body.amount) return { success: false, message: 'Insufficient balance.' };
    const { data, error } = await db
      .from('withdrawals')
      .insert([{ user_id: body.userId, username: body.username, amount: body.amount, account_no: body.accountNo || '', ifsc: body.ifsc || '', status: 'pending' }])
      .select().single();
    if (error) return { success: false, message: error.message };
    return { success: true, withdrawal: data };
  },

  async setStatus(id, status) {
    const { data: wd } = await db.from('withdrawals').select('*').eq('id', id).single();
    if (!wd) return { success: false, message: 'Withdrawal not found.' };
    const { error } = await db.from('withdrawals').update({ status }).eq('id', id);
    if (error) return { success: false, message: error.message };
    // Deduct balance if approved
    if (status === 'approved' && wd.status !== 'approved') {
      const { data: user } = await db.from('users').select('balance').eq('username', wd.username).single();
      if (user) {
        await db.from('users').update({ balance: Math.max(0, (user.balance || 0) - wd.amount) }).eq('username', wd.username);
      }
    }
    return { success: true };
  }
};

// ── PAYMENT DETAILS ───────────────────────────────────────────
const PaymentDetails = {
  async get() {
    const { data, error } = await db.from('payment_details').select('*').limit(1).single();
    if (error) return { success: false, message: error.message };
    return {
      success: true,
      paymentDetails: {
        bank: { accountName: data.account_name, accountNumber: data.account_number, ifsc: data.ifsc, bankName: data.bank_name, accountType: data.account_type },
        upi:  { upiId: data.upi_id },
        whatsapp: data.whatsapp
      }
    };
  },

  async update(body) {
    const updates = { updated_at: new Date().toISOString() };
    if (body.bank) {
      if (body.bank.accountName)   updates.account_name   = body.bank.accountName;
      if (body.bank.accountNumber) updates.account_number = body.bank.accountNumber;
      if (body.bank.ifsc)          updates.ifsc           = body.bank.ifsc;
      if (body.bank.bankName)      updates.bank_name      = body.bank.bankName;
      if (body.bank.accountType)   updates.account_type   = body.bank.accountType;
    }
    if (body.upi?.upiId)  updates.upi_id    = body.upi.upiId;
    if (body.whatsapp)    updates.whatsapp  = body.whatsapp;
    const { error } = await db.from('payment_details').update(updates).gt('id', 0);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }
};

// ── SETTINGS ──────────────────────────────────────────────────
const Settings = {
  async get() {
    const { data, error } = await db.from('settings').select('*').limit(1).single();
    if (error) return { success: false, message: error.message };
    return { success: true, settings: { minDeposit: data.min_deposit, minWithdrawal: data.min_withdrawal, maintenanceMode: data.maintenance_mode } };
  },
  async update(body) {
    const updates = { updated_at: new Date().toISOString() };
    if (body.minDeposit    !== undefined) updates.min_deposit      = body.minDeposit;
    if (body.minWithdrawal !== undefined) updates.min_withdrawal   = body.minWithdrawal;
    if (body.maintenanceMode !== undefined) updates.maintenance_mode = body.maintenanceMode;
    const { error } = await db.from('settings').update(updates).gt('id', 0);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }
};

// ── REALTIME – Admin deposit/withdrawal notifications ─────────
function subscribeRealtime(onDeposit, onWithdrawal) {
  db.channel('realtime-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deposits' },    payload => onDeposit && onDeposit(payload.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'withdrawals' }, payload => onWithdrawal && onWithdrawal(payload.new))
    .subscribe();
}

// ── UI HELPERS ────────────────────────────────────────────────
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
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function statusBadge(s) {
  if (s === 'approved') return '<span class="status-approved">✓ Approved</span>';
  if (s === 'rejected') return '<span class="status-rejected">✗ Rejected</span>';
  return '<span class="status-pending">⏳ Pending</span>';
}

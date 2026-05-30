/* ===== CRICK222 ADMIN JS – reads/writes database.json via server.js ===== */

// ── Auth guard ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAdmin()) return;
  initTabs();
  initHamburger();
  initLogout();
  await Promise.all([
    loadUsers(),
    loadDeposits(),
    loadWithdrawals(),
    loadPaymentDetails(),
    loadSettings()
  ]);
});

// ── Tab Navigation ────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.admin-nav-item').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('tab-' + item.dataset.tab).classList.add('active');
    });
  });
}

function initHamburger() {
  const btn     = document.getElementById('adminHamburger');
  const sidebar = document.getElementById('adminSidebar');
  if (btn) btn.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function initLogout() {
  const btn = document.getElementById('adminLogout');
  if (btn) btn.addEventListener('click', () => Auth.adminLogout());
}

// ── USERS ─────────────────────────────────────────────────────
async function loadUsers(filter = '') {
  const res  = await Users.getAll();
  if (!res.success) return showToast(res.message, 'error');
  const list = res.users.filter(u =>
    u.username.toLowerCase().includes(filter.toLowerCase())
  );
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = list.length ? list.map((u, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${u.username}</strong></td>
      <td style="color:#22c55e;font-weight:700">₹${Number(u.balance).toFixed(2)}</td>
      <td>${u.mobile || '—'}</td>
      <td>${u.status === 'active'
        ? '<span class="status-approved">● Active</span>'
        : '<span class="status-rejected">● Blocked</span>'}</td>
      <td>${u.created}</td>
      <td>
        <button class="btn-edit"   onclick="editUser(${u.id},'${u.username}',${u.balance},'${u.status}')"><i class="fa fa-edit"></i> Edit</button>
        <button class="btn-delete" onclick="deleteUser(${u.id},'${u.username}')"><i class="fa fa-trash"></i></button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px">No users found</td></tr>';
}

window.filterUsers = (val) => loadUsers(val);

window.createUser = async () => {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const balance  = document.getElementById('newBalance').value  || '0';
  const mobile   = document.getElementById('newMobile').value.trim();
  if (!username || !password) { showToast('Username and password are required.', 'error'); return; }

  const res = await Users.create({ username, password, balance, mobile });
  if (res.success) {
    showToast(`User "${username}" created successfully!`, 'success');
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('newBalance').value  = '';
    document.getElementById('newMobile').value   = '';
    loadUsers();
  } else {
    showToast(res.message, 'error');
  }
};

window.editUser = (id, username, balance, status) => {
  const newBalance = prompt(`Edit balance for "${username}":`, balance);
  if (newBalance === null) return;
  const newStatus  = confirm(`Is "${username}" active? (OK = Active, Cancel = Blocked)`) ? 'active' : 'blocked';
  Users.update({ id, balance: newBalance, status: newStatus }).then(res => {
    if (res.success) { showToast('User updated!', 'success'); loadUsers(); }
    else showToast(res.message, 'error');
  });
};

window.deleteUser = (id, username) => {
  if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
  Users.remove(id).then(res => {
    if (res.success) { showToast('User deleted.', 'info'); loadUsers(); }
    else showToast(res.message, 'error');
  });
};

// ── DEPOSITS ──────────────────────────────────────────────────
async function loadDeposits() {
  const res = await Deposits.getAll();
  if (!res.success) return;
  const tbody = document.getElementById('depositRequestsBody');
  if (!tbody) return;
  tbody.innerHTML = res.deposits.length ? res.deposits.slice().reverse().map((d, i) => `
    <tr id="dep-row-${d.id}">
      <td>${i + 1}</td>
      <td><strong>${d.username}</strong></td>
      <td style="color:#22c55e;font-weight:700">₹${Number(d.amount).toLocaleString()}</td>
      <td>${d.utr || '—'}</td>
      <td>${d.date}</td>
      <td id="dep-status-${d.id}">${statusBadge(d.status)}</td>
      <td>
        ${d.status === 'pending' ? `
          <button class="btn-approve" onclick="approveDeposit(${d.id})">✓ Approve</button>
          <button class="btn-reject"  onclick="rejectDeposit(${d.id})">✗ Reject</button>
        ` : '—'}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px">No deposit requests</td></tr>';

  // Update overview stats
  const pending = res.deposits.filter(d => d.status === 'pending').length;
  const pendingEl = document.getElementById('statPending');
  if (pendingEl) pendingEl.textContent = pending;
}

window.approveDeposit = async (id) => {
  const res = await Deposits.setStatus(id, 'approved');
  if (res.success) { showToast('Deposit approved! Balance credited.', 'success'); loadDeposits(); loadUsers(); }
  else showToast(res.message, 'error');
};
window.rejectDeposit = async (id) => {
  const res = await Deposits.setStatus(id, 'rejected');
  if (res.success) { showToast('Deposit rejected.', 'info'); loadDeposits(); }
  else showToast(res.message, 'error');
};

// ── WITHDRAWALS ───────────────────────────────────────────────
async function loadWithdrawals() {
  const res = await Withdrawals.getAll();
  if (!res.success) return;
  const tbody = document.getElementById('withdrawalRequestsBody');
  if (!tbody) return;
  tbody.innerHTML = res.withdrawals.length ? res.withdrawals.slice().reverse().map((w, i) => `
    <tr id="wd-row-${w.id}">
      <td>${i + 1}</td>
      <td><strong>${w.username}</strong></td>
      <td style="color:#ef4444;font-weight:700">₹${Number(w.amount).toLocaleString()}</td>
      <td>${w.accountNo || '—'}</td>
      <td>${w.date}</td>
      <td id="wd-status-${w.id}">${statusBadge(w.status)}</td>
      <td>
        ${w.status === 'pending' ? `
          <button class="btn-approve" onclick="approveWithdrawal(${w.id})">✓ Approve</button>
          <button class="btn-reject"  onclick="rejectWithdrawal(${w.id})">✗ Reject</button>
        ` : '—'}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px">No withdrawal requests</td></tr>';
}

window.approveWithdrawal = async (id) => {
  const res = await Withdrawals.setStatus(id, 'approved');
  if (res.success) { showToast('Withdrawal approved! Balance deducted.', 'success'); loadWithdrawals(); loadUsers(); }
  else showToast(res.message, 'error');
};
window.rejectWithdrawal = async (id) => {
  const res = await Withdrawals.setStatus(id, 'rejected');
  if (res.success) { showToast('Withdrawal rejected.', 'info'); loadWithdrawals(); }
  else showToast(res.message, 'error');
};

// ── PAYMENT DETAILS ───────────────────────────────────────────
async function loadPaymentDetails() {
  const res = await PaymentDetails.get();
  if (!res.success) return;
  const p = res.paymentDetails;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('pdAccName',   p.bank.accountName);
  set('pdAccNo',     p.bank.accountNumber);
  set('pdIfsc',      p.bank.ifsc);
  set('pdBankName',  p.bank.bankName);
  set('pdAccType',   p.bank.accountType);
  set('pdUpiId',     p.upi.upiId);
  set('pdWhatsapp',  p.whatsapp);
}

window.savePaymentDetails = async () => {
  const g = (id) => document.getElementById(id)?.value.trim() || '';
  const data = {
    bank: {
      accountName:   g('pdAccName'),
      accountNumber: g('pdAccNo'),
      ifsc:          g('pdIfsc'),
      bankName:      g('pdBankName'),
      accountType:   g('pdAccType')
    },
    upi:       { upiId: g('pdUpiId') },
    whatsapp:  g('pdWhatsapp')
  };
  const res = await PaymentDetails.update(data);
  if (res.success) showToast('Payment details saved to database.json!', 'success');
  else showToast(res.message, 'error');
};

// ── SETTINGS ──────────────────────────────────────────────────
async function loadSettings() {
  const res = await Settings.get();
  if (!res.success) return;
  const s = res.settings;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('settMinDeposit',    s.minDeposit);
  set('settMinWithdrawal', s.minWithdrawal);
  const maint = document.getElementById('settMaintenance');
  if (maint) maint.checked = s.maintenanceMode;
}

window.saveSettings = async () => {
  const data = {
    minDeposit:      parseInt(document.getElementById('settMinDeposit')?.value)    || 100,
    minWithdrawal:   parseInt(document.getElementById('settMinWithdrawal')?.value) || 200,
    maintenanceMode: document.getElementById('settMaintenance')?.checked || false
  };
  const res = await Settings.update(data);
  if (res.success) showToast('Settings saved!', 'success');
  else showToast(res.message, 'error');
};

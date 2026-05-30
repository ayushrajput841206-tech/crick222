/* ===== CRICK222 – MAIN APP JS ===== */

// ── Auth helpers ──────────────────────────────────────────────
const getUser = () => JSON.parse(localStorage.getItem('crick222_user') || 'null');
const setUser = (u) => localStorage.setItem('crick222_user', JSON.stringify(u));

function requireAuth() {
  const user = getUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}

// ── Update header with user info ──────────────────────────────
function updateHeader() {
  const user = getUser();
  const idEl = document.getElementById('headerUserId');
  const balEl = document.getElementById('headerBalance');
  if (idEl) idEl.textContent = user ? user.username : 'Guest';
  if (balEl) balEl.textContent = user ? '₹' + (user.balance || '0.00') : '₹0.00';
}

// ── Hamburger / Sidebar ───────────────────────────────────────
function initSidebar() {
  const btn = document.getElementById('hamburgerBtn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const closeBtn = document.getElementById('closeSidebar');
  if (!btn) return;
  btn.addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  });
  [overlay, closeBtn].forEach(el => el && el.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }));
}

// ── User dropdown ─────────────────────────────────────────────
function initUserDropdown() {
  const btn = document.getElementById('userMenuBtn');
  const dd  = document.getElementById('userDropdown');
  if (!btn || !dd) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dd.classList.toggle('open');
  });
  document.addEventListener('click', () => dd.classList.remove('open'));
}

// ── Logout ────────────────────────────────────────────────────
function initLogout() {
  ['logoutBtn','sidebarLogout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('crick222_user');
      window.location.href = 'login.html';
    });
  });
}

// ── Nav active state ──────────────────────────────────────────
function initNavTabs() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  });
  document.querySelectorAll('.nav-item2').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item2').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  });
  document.querySelectorAll('.nav-item3').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item3').forEach(x => x.classList.remove('active'));
      el.classList.add('active');
    });
  });
}

// ── Match Data ────────────────────────────────────────────────
const matches = [
  {
    id: 1, league: 'IPL 2025', live: true,
    team1: 'Gujarat Titans', team2: 'Rajasthan Royals',
    score1: '186/4 (18.2)', score2: 'Batting',
    date: 'Today', time: '7:30 PM',
    back1: '1.85', lay1: '1.87',
    backX: '0', layX: '0',
    back2: '2.10', lay2: '2.12',
  },
  {
    id: 2, league: 'IPL 2025', live: true,
    team1: 'Mumbai Indians', team2: 'Chennai Super Kings',
    score1: '142/6 (20)', score2: '98/3 (14.1)',
    date: 'Today', time: '3:30 PM',
    back1: '1.60', lay1: '1.62',
    backX: '0', layX: '0',
    back2: '2.50', lay2: '2.52',
  },
  {
    id: 3, league: 'IPL 2025', live: false,
    team1: 'Royal Challengers', team2: 'Kolkata Knight Riders',
    score1: '', score2: '',
    date: 'Tomorrow', time: '7:30 PM',
    back1: '1.95', lay1: '1.97',
    backX: '0', layX: '0',
    back2: '1.95', lay2: '1.97',
  },
  {
    id: 4, league: 'IPL 2025', live: false,
    team1: 'Delhi Capitals', team2: 'Punjab Kings',
    score1: '', score2: '',
    date: 'Tomorrow', time: '3:30 PM',
    back1: '1.75', lay1: '1.77',
    backX: '0', layX: '0',
    back2: '2.20', lay2: '2.22',
  },
];

function renderMatchCards() {
  const container = document.getElementById('matchCards');
  if (!container) return;
  container.innerHTML = matches.map(m => `
    <div class="match-card" onclick="openMatch(${m.id})">
      <div class="match-card-header">
        <span><i class="fa fa-trophy" style="color:#f59e0b;margin-right:5px"></i>${m.league}</span>
        <span>${m.date} &nbsp; ${m.time}</span>
        ${m.live ? '<span class="match-live-badge">● LIVE</span>' : ''}
      </div>
      <div class="match-card-body">
        <div class="match-teams">
          <div class="team">
            <div class="team-name">${m.team1}</div>
            ${m.score1 ? `<div class="team-score">${m.score1}</div>` : ''}
          </div>
          <div class="vs-badge">VS</div>
          <div class="team">
            <div class="team-name">${m.team2}</div>
            ${m.score2 ? `<div class="team-score">${m.score2}</div>` : ''}
          </div>
        </div>
        <div class="odds-label-row">
          <div class="odds-label">1 (Back/Lay)</div>
          <div class="odds-label">X</div>
          <div class="odds-label">2 (Back/Lay)</div>
        </div>
        <div class="odds-row">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <button class="odds-btn back"><span class="odds-val">${m.back1}</span><span class="odds-stake">Back</span></button>
            <button class="odds-btn lay"><span class="odds-val">${m.lay1}</span><span class="odds-stake">Lay</span></button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <button class="odds-btn back" style="opacity:0.4"><span class="odds-val">—</span><span class="odds-stake">Back</span></button>
            <button class="odds-btn lay" style="opacity:0.4"><span class="odds-val">—</span><span class="odds-stake">Lay</span></button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            <button class="odds-btn back"><span class="odds-val">${m.back2}</span><span class="odds-stake">Back</span></button>
            <button class="odds-btn lay"><span class="odds-val">${m.lay2}</span><span class="odds-stake">Lay</span></button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function openMatch(id) {
  console.log('Open match', id);
}

// ── Casino Data ───────────────────────────────────────────────
const casinoGames = [
  { name: 'Lightning Roulette', provider: 'Evolution', badge: 'HOT', icon: '⚡', color: '#f59e0b' },
  { name: 'Aviator', provider: 'Spribe', badge: 'POPULAR', icon: '✈️', color: '#ef4444' },
  { name: 'Ezugi Live', provider: 'Ezugi', badge: 'LIVE', icon: '🎰', color: '#22c55e' },
  { name: 'Marble Run', provider: 'Turbo', badge: 'NEW', icon: '🔮', color: '#8b5cf6' },
  { name: 'Sexy Baccarat', provider: 'AE Sexy', badge: 'HOT', icon: '🃏', color: '#ec4899' },
  { name: 'Teen Patti', provider: 'Ezugi', badge: 'LIVE', icon: '🀄', color: '#f59e0b' },
  { name: 'Dragon Tiger', provider: 'Evolution', badge: 'LIVE', icon: '🐉', color: '#ef4444' },
  { name: 'Andar Bahar', provider: 'Ezugi', badge: 'LIVE', icon: '🎴', color: '#22c55e' },
  { name: 'Crazy Time', provider: 'Evolution', badge: 'HOT', icon: '🎡', color: '#f59e0b' },
  { name: 'Speed Baccarat', provider: 'Evolution', badge: 'LIVE', icon: '🎲', color: '#8b5cf6' },
  { name: 'Monopoly Live', provider: 'Evolution', badge: 'NEW', icon: '🎩', color: '#ec4899' },
  { name: 'Sic Bo', provider: 'Ezugi', badge: 'LIVE', icon: '🎯', color: '#22c55e' },
];

function renderCasinoGrid() {
  const container = document.getElementById('casinoGrid');
  if (!container) return;
  container.innerHTML = casinoGames.map(g => `
    <div class="casino-card" onclick="openCasino('${g.name}')">
      <div class="casino-thumb" style="background:linear-gradient(135deg,${g.color}22,${g.color}44)">
        <span style="font-size:2.5rem">${g.icon}</span>
      </div>
      <span class="casino-badge">${g.badge}</span>
      <div class="casino-info">
        <div class="casino-name">${g.name}</div>
        <div class="casino-provider">${g.provider}</div>
      </div>
    </div>
  `).join('');
}

function openCasino(name) {
  console.log('Open casino game:', name);
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateHeader();
  initSidebar();
  initUserDropdown();
  initLogout();
  initNavTabs();
  renderMatchCards();
  renderCasinoGrid();
});

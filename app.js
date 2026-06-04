// WFD App — Core shell, auth, navigation, shared utilities

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Global state ───────────────────────────────────────────────
let currentUser       = null;
let currentProfile    = null;
let selectedCandidate = null;
let radarChart        = null;
let historyChart      = null;

// ── Boot ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();

  if (session) {
    currentUser = session.user;
    await loadProfile();
    showApp();
  } else {
    showAuth();
  }

  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showResetPassword();
      return;
    }
    if (session) {
      currentUser = session.user;
      await loadProfile();
      showApp();
    } else {
      currentUser = null;
      currentProfile = null;
      showAuth();
    }
  });
});

async function loadProfile() {
  const { data } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
}

// ── Auth screens ───────────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display   = 'flex';
  document.getElementById('forgot-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display  = 'none';
  document.getElementById('app').style.display = 'none';
}

function showForgotPassword() {
  document.getElementById('auth-screen').style.display   = 'none';
  document.getElementById('forgot-screen').style.display = 'flex';
  document.getElementById('reset-screen').style.display  = 'none';
  const email = document.getElementById('auth-email').value.trim();
  if (email) document.getElementById('forgot-email').value = email;
}

function showSignIn() {
  document.getElementById('auth-screen').style.display   = 'flex';
  document.getElementById('forgot-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display  = 'none';
}

function showResetPassword() {
  document.getElementById('auth-screen').style.display   = 'none';
  document.getElementById('forgot-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display  = 'flex';
}

async function handleLogin() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.style.display = 'block';
    return;
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; }
}

async function handleForgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  const errEl = document.getElementById('forgot-error');
  const sucEl = document.getElementById('forgot-success');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!email) {
    errEl.textContent = 'Please enter your email address.';
    errEl.style.display = 'block';
    return;
  }

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
  } else {
    sucEl.textContent = `Reset link sent to ${email}. Check your inbox — it may take a minute.`;
    sucEl.style.display = 'block';
  }
}

async function handleResetPassword() {
  const password = document.getElementById('reset-password').value;
  const confirm  = document.getElementById('reset-password-confirm').value;
  const errEl    = document.getElementById('reset-error');
  const sucEl    = document.getElementById('reset-success');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!password || password.length < 8) {
    errEl.textContent = 'Password must be at least 8 characters.';
    errEl.style.display = 'block';
    return;
  }
  if (password !== confirm) {
    errEl.textContent = 'Passwords do not match.';
    errEl.style.display = 'block';
    return;
  }

  const { error } = await db.auth.updateUser({ password });
  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
  } else {
    sucEl.textContent = 'Password updated. Signing you in…';
    sucEl.style.display = 'block';
    setTimeout(() => showApp(), 1500);
  }
}

async function handleSignOut() {
  await db.auth.signOut();
}

// ── App shell ──────────────────────────────────────────────────
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('forgot-screen').style.display = 'none';
  document.getElementById('reset-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('sidebar-name').textContent = currentProfile?.full_name || '';
  document.getElementById('sidebar-role').textContent = (currentProfile?.role || '').replace('_',' ');
  buildNav();
  renderCandidateList();
}

// ── Navigation ─────────────────────────────────────────────────
function buildNav() {
  const role = currentProfile?.role;
  const items = [
    { key: 'candidates', label: 'Candidates', roles: ['fti','sam_officer','admin'],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
    { key: 'reference',  label: 'Reference',  roles: ['fti','sam_officer','admin'],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>` },
    { key: 'admin',      label: 'Admin',      roles: ['sam_officer','admin'],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>` },
    { key: 'registry',   label: 'Registry',   roles: ['sam_officer','admin'],
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>` },
  ];

  const visible = items.filter(i => i.roles.includes(role));

  document.getElementById('sidebar-nav').innerHTML = visible.map(i =>
    `<button class="nav-item" id="nav-${i.key}" onclick="navTo('${i.key}')">
      <span class="nav-dot"></span>${i.label}
    </button>`).join('');

  const mobileNav = document.getElementById('mobile-nav-bar');
  if (mobileNav) {
    mobileNav.innerHTML = visible.map(i =>
      `<button class="mobile-nav-item" id="mobile-nav-${i.key}" onclick="navTo('${i.key}')">
        ${i.icon}
        ${i.label}
      </button>`).join('');
  }

  setActiveNav('candidates');
}

function navTo(page) {
  setActiveNav(page);
  selectedCandidate = null;
  if (page === 'candidates') renderCandidateList();
  if (page === 'reference')  renderReference();
  if (page === 'admin')      renderAdmin();
  if (page === 'registry')   renderNameRegistry();
}

function setActiveNav(key) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
  const el  = document.getElementById(`nav-${key}`);
  const mob = document.getElementById(`mobile-nav-${key}`);
  if (el)  el.classList.add('active');
  if (mob) mob.classList.add('active');
}

// ── Page rendering ─────────────────────────────────────────────
function setMain(html) {
  destroyCharts();
  document.getElementById('main-content').innerHTML = html;
}

function destroyCharts() {
  if (radarChart)   { radarChart.destroy();   radarChart = null; }
  if (historyChart) { historyChart.destroy(); historyChart = null; }
}

// ── Shared UI helpers ──────────────────────────────────────────
function phaseBadge(phase) {
  return `<span class="phase-badge">Phase ${phase}</span>`;
}

function acuityBadge(acuity) {
  const colors = { green: 'var(--green)', yellow: 'var(--amber)', red: 'var(--red)' };
  return `<span style="font-family:var(--mono);font-size:11px;color:${colors[acuity]||'var(--muted)'}">${(acuity||'').toUpperCase()}</span>`;
}

function criticalTag() {
  return `<span class="critical-tag">Critical domain</span>`;
}

function alertHTML(type, msg) {
  return `<div class="alert alert-${type}">${msg}</div>`;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function tabRow(tabs, activeKey) {
  return `<div class="tab-row">${tabs.map(t =>
    `<button class="btn btn-sm ${t.key===activeKey?'btn-primary':''}" onclick="${t.onclick}">${t.label}</button>`
  ).join('')}</div>`;
}

// Change #10 — FTI can see all candidates (read), write only their own
// Change #11 — isManager() used throughout instead of separate role checks
function candidateTabs(active) {
  const tabs = [
    { key: 'overview',    label: 'Gap overview',    onclick: 'renderCandidateOverview()' },
    { key: 'gaps',        label: 'Capability gaps', onclick: 'renderGapList()' },
    { key: 'dcas',        label: 'DCA history',     onclick: 'loadAndRenderDcaHistory()' },
    { key: 'conferences', label: 'SAM conferences', onclick: 'renderConferenceList()' },
    { key: 'phase',       label: 'Phase log',       onclick: 'renderPhaseLog()' },
    { key: 'capstone',    label: 'Capstone',        onclick: 'renderCapstoneForm()' },
  ];

  // Only show New DCA if this is the assigned FTI or a manager
  const isAssignedFti = selectedCandidate?.assigned_fti_id === currentProfile?.id;
  if (isAssignedFti || isManager()) {
    tabs.push({ key: 'new-dca', label: '+ New DCA', onclick: 'renderDcaForm()' });
  }

  return tabRow(tabs, active);
}

function backToCandidate(label) {
  return `<button class="btn btn-sm back-btn" onclick="renderCandidateOverview()">← ${label||'Overview'}</button>`;
}

function backToList() {
  return `<button class="btn btn-sm back-btn" onclick="renderCandidateList()">← All candidates</button>`;
}

function scoreDisplay(score, type) {
  if (score === null || score === undefined) return '<span style="color:var(--muted)">—</span>';
  const color = type === 'demand' ? '#4a7cff' : '#ff6b6b';
  return `<span style="font-family:var(--mono);color:${color}">${score}</span>`;
}

// ── ePCR link helper (Changes #14, #15) ───────────────────────
function epcrlinkHTML(url, label) {
  if (!url) return '<span style="color:var(--muted)">—</span>';
  return `<a href="${url}" target="_blank" rel="noopener noreferrer"
    style="color:var(--accent);font-size:11px;font-family:var(--mono);text-decoration:none;white-space:nowrap"
    title="Open ePCR / ImageTrend record">
    ${label || '↗ ePCR'}
  </a>`;
}

// ── Shared fetch helpers ───────────────────────────────────────
async function fetchCandidate(id) {
  const { data } = await db.from('candidates').select('*').eq('id', id).single();
  selectedCandidate = data;
  return data;
}

async function fetchDcas(candidateId) {
  const { data } = await db.from('dcas').select('*').eq('candidate_id', candidateId).order('incident_date');
  return data || [];
}

async function fetchGaps(candidateId) {
  const { data } = await db.from('capability_gaps')
    .select('*, dca:dca_id(epcrlink)')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });
  return data || [];
}

async function fetchProfiles(role) {
  let query = db.from('profiles').select('*').order('full_name');
  if (role) query = query.eq('role', role);
  const { data } = await query;
  return data || [];
}

// ── Filename helper for exports ────────────────────────────────
function exportFilename(candidate, phase, ext) {
  const parts = (candidate.full_name || 'Unknown').split(' ');
  const last  = parts[parts.length - 1];
  const first = parts[0];
  const date  = new Date().toISOString().split('T')[0];
  return `${last}_${first}_Phase${phase}_${date}.${ext}`;
}

// WFD App — Core shell, auth, navigation, shared utilities

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Global state ───────────────────────────────────────────────
let currentUser    = null;
let currentProfile = null;
let selectedCandidate = null;
let radarChart     = null;
let historyChart   = null;

// ── Boot ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) { currentUser = session.user; await loadProfile(); showApp(); }

  db.auth.onAuthStateChange(async (_e, session) => {
    if (session) { currentUser = session.user; await loadProfile(); showApp(); }
    else { currentUser = null; currentProfile = null; showAuth(); }
  });
});

async function loadProfile() {
  const { data } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
}

// ── Auth ───────────────────────────────────────────────────────
function showAuth() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

async function handleLogin() {
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl    = document.getElementById('auth-error');
  errEl.style.display = 'none';
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; }
}

async function handleSignOut() {
  await db.auth.signOut();
}

// ── App shell ──────────────────────────────────────────────────
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('sidebar-name').textContent = currentProfile?.full_name || '';
  document.getElementById('sidebar-role').textContent = (currentProfile?.role || '').replace('_',' ');
  buildNav();
  renderCandidateList();
}

function buildNav() {
  const role = currentProfile?.role;
  const items = [
    { key: 'candidates', label: 'Candidates',  roles: ['fti','sam_officer','admin'] },
    { key: 'reference',  label: 'DCA Reference', roles: ['fti','sam_officer','admin'] },
    { key: 'admin',      label: 'Admin',        roles: ['sam_officer','admin'] },
  ];
  document.getElementById('sidebar-nav').innerHTML = items
    .filter(i => i.roles.includes(role))
    .map(i => `<button class="nav-item" id="nav-${i.key}" onclick="navTo('${i.key}')">
      <span class="nav-dot"></span>${i.label}
    </button>`).join('');
  setActiveNav('candidates');
}

function navTo(page) {
  setActiveNav(page);
  selectedCandidate = null;
  if (page === 'candidates') renderCandidateList();
  if (page === 'reference')  renderReference();
  if (page === 'admin')      renderAdmin();
}

function setActiveNav(key) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`nav-${key}`);
  if (el) el.classList.add('active');
}

// ── Page rendering helpers ─────────────────────────────────────
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
  return `<span style="font-family:var(--mono);font-size:11px;color:${colors[acuity] || 'var(--muted)'}">${(acuity||'').toUpperCase()}</span>`;
}

function criticalTag() {
  return `<span class="critical-tag">Critical domain</span>`;
}

function alertHTML(type, msg) {
  return `<div class="alert alert-${type}">${msg}</div>`;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tabRow(tabs, activeKey) {
  return `<div class="tab-row">${tabs.map(t =>
    `<button class="btn btn-sm ${t.key === activeKey ? 'btn-primary' : ''}" onclick="${t.onclick}">${t.label}</button>`
  ).join('')}</div>`;
}

function candidateTabs(active) {
  const c = selectedCandidate;
  return tabRow([
    { key: 'overview',    label: 'Gap overview',     onclick: 'renderCandidateOverview()' },
    { key: 'gaps',        label: 'Capability gaps',  onclick: 'renderGapList()' },
    { key: 'dcas',        label: 'DCA history',      onclick: 'loadAndRenderDcaHistory()' },
    { key: 'conferences', label: 'SAM conferences',  onclick: 'renderConferenceList()' },
    { key: 'phase',       label: 'Phase log',        onclick: 'renderPhaseLog()' },
    { key: 'capstone',    label: 'Capstone',         onclick: 'renderCapstoneForm()' },
    { key: 'new-dca',     label: '+ New DCA',        onclick: 'renderDcaForm()' },
  ], active);
}

function backToCandidate(label) {
  return `<button class="btn btn-sm back-btn" onclick="renderCandidateOverview()">← ${label || 'Overview'}</button>`;
}

function backToList() {
  return `<button class="btn btn-sm back-btn" onclick="renderCandidateList()">← All candidates</button>`;
}

function scoreDisplay(score, type) {
  if (!score) return '<span style="color:var(--muted)">—</span>';
  const color = type === 'demand' ? '#4a7cff' : '#ff6b6b';
  return `<span style="font-family:var(--mono);color:${color}">${score}</span>`;
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
  const { data } = await db.from('capability_gaps').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false });
  return data || [];
}

async function fetchProfiles(role) {
  const query = db.from('profiles').select('*').order('full_name');
  if (role) query.eq('role', role);
  const { data } = await query;
  return data || [];
}

// pages/anonymization.js — Candidate anonymization system (corrected model)
//
// SECURITY MODEL:
// The app stores ONLY the NFL alias and numeric code — never a mapping between
// alias and real name. The encoding methodology (name-based matching against
// the 1972 Miami Dolphins roster) and the WFD roster are maintained separately
// as a controlled document by the EMS Chief. A breach of this system yields
// only aliases and evaluation data — no real identities.
//
// The Name Registry page does NOT exist in this app.

// ── Letter frequency scoring ───────────────────────────────────
function letterFrequency(name) {
  const clean = name.toLowerCase().replace(/[^a-z]/g, '');
  const freq  = {};
  for (const ch of clean) freq[ch] = (freq[ch] || 0) + 1;
  return freq;
}

function sortedLetters(name) {
  return name.toLowerCase().replace(/[^a-z]/g, '').split('').sort().join('');
}

function letterOverlapScore(a, b) {
  const fa = letterFrequency(a);
  const fb = letterFrequency(b);
  const allKeys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  let overlap = 0, total = 0;
  for (const k of allKeys) {
    const va = fa[k] || 0;
    const vb = fb[k] || 0;
    overlap += Math.min(va, vb);
    total   += Math.max(va, vb);
  }
  return total === 0 ? 0 : overlap / total;
}

function lengthScore(a, b) {
  const la = a.replace(/[^a-zA-Z]/g, '').length;
  const lb = b.replace(/[^a-zA-Z]/g, '').length;
  const diff = Math.abs(la - lb);
  return Math.max(0, 1 - diff / Math.max(la, lb));
}

function sortedLetterScore(a, b) {
  const sa = sortedLetters(a);
  const sb = sortedLetters(b);
  let matches = 0, j = 0;
  for (let i = 0; i < sa.length && j < sb.length; i++) {
    if (sa[i] === sb[j]) { matches++; j++; }
  }
  return matches / Math.max(sa.length, sb.length);
}

function matchScore(candidateName, nflName) {
  const overlap = letterOverlapScore(candidateName, nflName);
  const sorted  = sortedLetterScore(candidateName, nflName);
  const length  = lengthScore(candidateName, nflName);
  return (overlap * 0.45) + (sorted * 0.40) + (length * 0.15);
}

// ── Find top NFL matches ───────────────────────────────────────
// Used as a lookup tool only — the EMS Chief uses this to find
// a candidate's alias given their real name. The result is never
// stored alongside the real name in the database.
function findNflMatches(candidateName, topN) {
  topN = topN || 3;
  const scored = NFL_ROSTER.map(player => ({
    name:  player,
    score: matchScore(candidateName, player)
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}

// ── Generate next numeric candidate code ──────────────────────
async function generateCandidateCode() {
  const { data } = await db
    .from('candidates')
    .select('candidate_code')
    .not('candidate_code', 'is', null)
    .order('candidate_code', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.candidate_code) return 'WFD-PM-001';
  const num = parseInt(data.candidate_code.replace('WFD-PM-', '')) + 1;
  return `WFD-PM-${String(num).padStart(3, '0')}`;
}

// ── Alias lookup tool ──────────────────────────────────────────
// This page allows the EMS Chief to look up what alias corresponds
// to a real name WITHOUT storing that mapping in the database.
// It is a one-way lookup tool only.
function renderAliasLookup() {
  if (!isManager()) {
    setMain(`<div class="page">${alertHTML('error', 'Access restricted to SAM Officers and admins.')}</div>`);
    return;
  }

  setMain(`<div class="page">
    <h1 class="section-title">Alias Lookup Tool</h1>

    ${alertHTML('warn',
      'This tool derives NFL aliases from real names using the encoding methodology. ' +
      'It does not store or display any name-to-alias mapping. ' +
      'The lookup result should be recorded in the EMS Chief\'s controlled document — not in this system.'
    )}

    <div class="card">
      <div class="card-title">Look up alias for a candidate</div>
      <p class="text-muted mb-2" style="font-size:13px">
        Enter a candidate's real name to find their closest matches among the encoding roster.
        Select the alias and record it in the controlled document maintained by the EMS Chief.
        Do not record the result here.
      </p>
      <div class="form-group mb-2">
        <label>Candidate real name</label>
        <input type="text" id="lookup-name" placeholder="e.g. Jane Smith"
          onkeydown="if(event.key==='Enter') runAliasLookup()" />
      </div>
      <button class="btn btn-primary" onclick="runAliasLookup()">Find alias matches</button>
    </div>

    <div id="lookup-results"></div>

    <div class="card" style="margin-top:8px">
      <div class="card-title">Assign alias to candidate record</div>
      <p class="text-muted mb-2" style="font-size:13px">
        Once the alias has been determined and recorded in the controlled document,
        enter it here to assign it to the candidate's record in the system.
        Only the alias is stored — the real name is not recorded alongside it.
      </p>
      <div class="form-grid">
        <div class="form-group">
          <label>Candidate</label>
          <select id="alias-assign-candidate">
            <option value="">Loading…</option>
          </select>
        </div>
        <div class="form-group">
          <label>NFL alias to assign</label>
          <input type="text" id="alias-assign-value"
            placeholder="e.g. Larry Csonka" />
        </div>
      </div>
      <div id="alias-assign-error"   class="alert alert-error"   style="display:none;margin-top:10px"></div>
      <div id="alias-assign-success" class="alert alert-success" style="display:none;margin-top:10px"></div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="assignAlias()">Assign alias</button>
    </div>
  </div>`);

  // Load candidates for the assign dropdown — show only code, no real name
  loadCandidatesForAliasAssign();
}

async function loadCandidatesForAliasAssign() {
  const { data } = await db
    .from('candidates')
    .select('id, candidate_code, nfl_alias')
    .order('candidate_code');

  const sel = document.getElementById('alias-assign-candidate');
  if (!sel) return;

  sel.innerHTML = '<option value="">Select candidate code…</option>' +
    (data || []).map(c =>
      `<option value="${c.id}">${c.candidate_code}${c.nfl_alias ? ' ✓' : ''}</option>`
    ).join('');
}

function runAliasLookup() {
  const name = document.getElementById('lookup-name')?.value?.trim();
  if (!name) return;

  const matches = findNflMatches(name, 5);
  const resultsEl = document.getElementById('lookup-results');
  if (!resultsEl) return;

  const cards = matches.map((m, i) => `
    <div class="alias-option ${i === 0 ? 'alias-recommended' : ''}"
         onclick="selectLookupResult('${m.name.replace(/'/g, "\\'")}')">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="alias-name">${m.name}</span>
        ${i === 0 ? '<span style="font-size:10px;font-family:var(--mono);color:var(--accent);border:1px solid rgba(74,124,255,0.3);padding:1px 6px;border-radius:20px">Best match</span>' : ''}
      </div>
      <div class="alias-score">Letter similarity: ${Math.round(m.score * 100)}%</div>
    </div>`).join('');

  resultsEl.innerHTML = `
    <div class="card">
      <div class="card-title">Top matches for "${name}"</div>
      <p class="text-muted mb-2" style="font-size:12px">
        Record your selection in the EMS Chief's controlled document.
        Click a match to copy it to the alias assignment field below.
      </p>
      ${cards}
      <div class="alert alert-info" style="margin-top:12px;font-size:12px">
        ⚠ Do not screenshot or export this page. Close after recording the alias.
      </div>
    </div>`;
}

function selectLookupResult(aliasName) {
  const input = document.getElementById('alias-assign-value');
  if (input) {
    input.value = aliasName;
    input.focus();
    input.scrollIntoView({ behavior: 'smooth' });
  }
}

async function assignAlias() {
  const errEl = document.getElementById('alias-assign-error');
  const sucEl = document.getElementById('alias-assign-success');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  const candidateId = document.getElementById('alias-assign-candidate')?.value;
  const alias       = document.getElementById('alias-assign-value')?.value?.trim();

  if (!candidateId || !alias) {
    errEl.textContent = 'Please select a candidate code and enter an alias.';
    errEl.style.display = 'block';
    return;
  }

  sucEl.textContent = 'Saving…';
  sucEl.style.display = 'block';
  sucEl.className = 'alert alert-info';

  const { error } = await db.from('candidates')
    .update({ nfl_alias: alias })
    .eq('id', candidateId);

  if (error) {
    sucEl.style.display = 'none';
    errEl.textContent = 'Error: ' + error.message;
    errEl.style.display = 'block';
    return;
  }

  sucEl.textContent = `Alias assigned. The candidate's record now shows "${alias}". Real name is not stored here.`;
  sucEl.className = 'alert alert-success';

  // Clear fields and refresh dropdown
  document.getElementById('alias-assign-value').value = '';
  document.getElementById('alias-assign-candidate').value = '';
  document.getElementById('lookup-name').value = '';
  document.getElementById('lookup-results').innerHTML = '';
  loadCandidatesForAliasAssign();
  invalidateCache(candidateId);
}

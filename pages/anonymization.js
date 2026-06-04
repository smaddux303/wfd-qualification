// pages/anonymization.js — Candidate anonymization system
// Two modes:
//   1. Numeric code: WFD-PM-001 (official record-keeping)
//   2. NFL alias: closest name match from historical roster (human-readable alias)

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
  // Longest common subsequence as a proportion
  let matches = 0;
  let j = 0;
  for (let i = 0; i < sa.length && j < sb.length; i++) {
    if (sa[i] === sb[j]) { matches++; j++; }
  }
  return matches / Math.max(sa.length, sb.length);
}

// Combined score — weighted toward letter overlap and sorted letters (anagram-ish)
function matchScore(candidateName, nflName) {
  const overlap = letterOverlapScore(candidateName, nflName);
  const sorted  = sortedLetterScore(candidateName, nflName);
  const length  = lengthScore(candidateName, nflName);
  return (overlap * 0.45) + (sorted * 0.40) + (length * 0.15);
}

// ── Find top NFL matches for a candidate name ──────────────────
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

  const num  = parseInt(data.candidate_code.replace('WFD-PM-', '')) + 1;
  return `WFD-PM-${String(num).padStart(3, '0')}`;
}

// ── NFL Alias assignment UI ────────────────────────────────────
function renderNflAliasPicker(candidateId, candidateName) {
  const matches = findNflMatches(candidateName, 3);

  const optionCards = matches.map((m, i) => `
    <div class="alias-option ${i === 0 ? 'alias-recommended' : ''}"
         onclick="selectNflAlias('${candidateId}', '${m.name.replace(/'/g,"\\'")}', this)">
      <div style="display:flex;align-items:center;gap:8px">
        <span class="alias-name">${m.name}</span>
        ${i === 0 ? '<span style="font-size:10px;font-family:var(--mono);color:var(--accent);border:1px solid rgba(74,124,255,0.3);padding:1px 6px;border-radius:20px">Best match</span>' : ''}
      </div>
      <div class="alias-score">Letter similarity: ${Math.round(m.score * 100)}%</div>
    </div>`).join('');

  return `
    <div id="nfl-alias-picker-${candidateId}" class="alias-picker">
      <div class="card-title">NFL alias — top 3 matches for "${candidateName}"</div>
      <p class="text-muted mb-2" style="font-size:12px">
        Select the alias to assign. This is stored permanently and used in place of the candidate's
        real name on exported records. The name registry (Admin → Name Registry) maps aliases back to real names.
      </p>
      ${optionCards}
      <div style="margin-top:12px">
        <label style="font-size:11px;font-family:var(--mono);color:var(--muted);text-transform:uppercase;letter-spacing:0.06em">
          Or enter a custom NFL player name
        </label>
        <div style="display:flex;gap:8px;margin-top:6px">
          <input type="text" id="custom-alias-${candidateId}" placeholder="e.g. Dan Marino"
            style="flex:1" />
          <button class="btn btn-sm" onclick="useCustomAlias('${candidateId}')">Use this</button>
        </div>
      </div>
      <div id="alias-confirm-${candidateId}" class="alert alert-success" style="display:none;margin-top:10px"></div>
    </div>`;
}

let selectedAliasValue = {};

function selectNflAlias(candidateId, aliasName, el) {
  // Highlight selected
  document.querySelectorAll(`#nfl-alias-picker-${candidateId} .alias-option`)
    .forEach(o => o.classList.remove('alias-selected'));
  el.classList.add('alias-selected');
  selectedAliasValue[candidateId] = aliasName;
}

function useCustomAlias(candidateId) {
  const val = document.getElementById(`custom-alias-${candidateId}`)?.value?.trim();
  if (!val) return;
  selectedAliasValue[candidateId] = val;
  document.querySelectorAll(`#nfl-alias-picker-${candidateId} .alias-option`)
    .forEach(o => o.classList.remove('alias-selected'));
  const confirmEl = document.getElementById(`alias-confirm-${candidateId}`);
  if (confirmEl) {
    confirmEl.textContent = `Custom alias set: "${val}" — will be saved when you save the candidate.`;
    confirmEl.style.display = 'block';
  }
}

async function saveNflAlias(candidateId, afterSave) {
  const alias = selectedAliasValue[candidateId];
  if (!alias) {
    alert('Please select or enter an NFL alias first.');
    return;
  }

  // Show immediate saving feedback
  const confirmEl = document.getElementById(`alias-confirm-${candidateId}`);
  if (confirmEl) {
    confirmEl.textContent = 'Saving…';
    confirmEl.style.display = 'block';
    confirmEl.className = 'alert alert-info';
  }

  const { error } = await db.from('candidates')
    .update({ nfl_alias: alias })
    .eq('id', candidateId);

  if (error) {
    if (confirmEl) {
      confirmEl.textContent = 'Error: ' + error.message;
      confirmEl.className = 'alert alert-error';
    }
    return;
  }

  if (confirmEl) {
    confirmEl.textContent = `✓ Alias "${alias}" saved.`;
    confirmEl.className = 'alert alert-success';
  }

  delete selectedAliasValue[candidateId];

  if (typeof afterSave === 'function') {
    setTimeout(afterSave, 800);
    return;
  }

  // Refresh the registry table in place
  setTimeout(() => renderNameRegistry(), 700);
}

// ── Name Registry page ─────────────────────────────────────────
async function renderNameRegistry() {
  if (!isManager()) {
    setMain(`<div class="page">${alertHTML('error', 'Access restricted to SAM Officers and admins.')}</div>`);
    return;
  }

  setMain('<div class="page"><div class="loading">Loading name registry…</div></div>');

  const { data: candidates } = await db
    .from('candidates')
    .select('id, full_name, candidate_code, nfl_alias, current_phase, program_status')
    .order('candidate_code');

  const rows = (candidates || []).map(c => `
    <tr>
      <td style="font-family:var(--mono);font-size:12px;color:var(--accent)">${c.candidate_code || '—'}</td>
      <td style="font-weight:500">${c.full_name}</td>
      <td style="font-size:13px;color:var(--muted)">${c.nfl_alias || '<span style="color:var(--amber)">Not assigned</span>'}</td>
      <td>${phaseBadge(c.current_phase)}</td>
      <td><span style="font-family:var(--mono);font-size:11px;color:var(--green)">${c.program_status}</span></td>
      <td>
        <button class="btn btn-sm" onclick="showAliasAssignment('${c.id}','${c.full_name.replace(/'/g,"\\'")}')">
          ${c.nfl_alias ? 'Change alias' : 'Assign alias'}
        </button>
      </td>
    </tr>`).join('');

  setMain(`<div class="page">
    <h1 class="section-title">Name Registry</h1>
    ${alertHTML('warn', 'This page is restricted. It contains the mapping between candidate real names, numeric codes, and NFL aliases. Do not share or screenshot this page outside of authorized personnel.')}

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:20px">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Code</th><th>Real name</th><th>NFL alias</th><th>Phase</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:20px">No candidates yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div id="alias-assignment-area"></div>
  </div>`);
}

function showAliasAssignment(candidateId, candidateName) {
  const area = document.getElementById('alias-assignment-area');
  if (!area) return;
  area.innerHTML = `
    <div class="card">
      ${renderNflAliasPicker(candidateId, candidateName)}
      <button class="btn btn-primary" style="margin-top:14px"
        onclick="saveNflAlias('${candidateId}')">
        Save alias
      </button>
    </div>`;
  area.scrollIntoView({ behavior: 'smooth' });
}

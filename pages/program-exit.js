// pages/program-exit.js — Section 3.7 exit documentation check, qualification
// workflow, and Program History view

// ── Section 3.7 — Exit Documentation completeness check ───────
// Returns { complete: boolean, missing: string[] }
async function checkExitDocumentation(candidateId) {
  const missing = [];

  const [dcaRes, gapRes, transRes, confRes] = await Promise.all([
    db.from('dcas').select('id, phase').eq('candidate_id', candidateId),
    db.from('capability_gaps').select('id, status, is_critical, domain_name').eq('candidate_id', candidateId),
    db.from('phase_transitions').select('id, from_phase, to_phase, direction').eq('candidate_id', candidateId),
    db.from('sam_conferences').select('id, conference_type').eq('candidate_id', candidateId)
  ]);

  const dcas         = dcaRes.data || [];
  const gaps          = gapRes.data || [];
  const transitions   = transRes.data || [];
  const conferences   = confRes.data || [];

  // 1. At least one DCA per phase I–IV
  const phasesWithDca = new Set(dcas.map(d => d.phase));
  for (const phase of ['I','II','III','IV']) {
    if (!phasesWithDca.has(phase)) {
      missing.push(`No DCA recorded for Phase ${phase}`);
    }
  }

  // 2. No open capability gaps — especially critical domain gaps
  const openGaps = gaps.filter(g => g.status === 'open');
  const openCritical = openGaps.filter(g => g.is_critical);
  if (openCritical.length > 0) {
    missing.push(`${openCritical.length} open Critical Domain gap(s) must be closed: ${openCritical.map(g=>g.domain_name).join(', ')}`);
  } else if (openGaps.length > 0) {
    missing.push(`${openGaps.length} open capability gap(s) remain undocumented as closed: ${openGaps.map(g=>g.domain_name).join(', ')}`);
  }

  // 3. Phase transition records for each advancement (I→II, II→III, III→IV)
  const advancements = transitions.filter(t => t.direction === 'advance');
  const requiredAdvancements = [['I','II'],['II','III'],['III','IV']];
  for (const [from, to] of requiredAdvancements) {
    const found = advancements.some(t => t.from_phase === from && t.to_phase === to);
    if (!found) missing.push(`Missing phase transition record: Phase ${from} → Phase ${to}`);
  }

  // 4. All three SAM Conference records
  const requiredConferences = CONFERENCE_TYPES.map(c => c.value);
  const completedConferences = new Set(conferences.map(c => c.conference_type));
  for (const conf of CONFERENCE_TYPES) {
    if (!completedConferences.has(conf.value)) {
      missing.push(`Missing SAM Conference record: ${conf.label}`);
    }
  }

  return { complete: missing.length === 0, missing };
}

// ── Qualify candidate (the actual exit action) ─────────────────
async function qualifyCandidate(candidateId, ipeRecordId) {
  const { error } = await db.from('candidates').update({
    program_status: 'qualified',
    qualified_at:   new Date().toISOString(),
    qualified_by:   currentProfile.id
  }).eq('id', candidateId);

  return { error };
}

// ── Reverse qualification (admin-only safety net) ──────────────
async function reverseQualification(candidateId) {
  if (!isManager()) {
    alert('Only SAM Officers and admins can reverse a qualification.');
    return;
  }

  const reason = prompt(
    'Reversing a qualification is a significant personnel action and will be logged. ' +
    'Please enter a reason for this reversal:'
  );

  if (!reason || !reason.trim()) {
    alert('A reason is required to reverse a qualification. No changes made.');
    return;
  }

  const { error } = await db.from('candidates').update({
    program_status: 'active',
    qualification_reversed_at:     new Date().toISOString(),
    qualification_reversed_by:     currentProfile.id,
    qualification_reversal_reason: reason.trim()
  }).eq('id', candidateId);

  if (error) { alert('Error reversing qualification: ' + error.message); return; }

  invalidateCache(candidateId);
  alert('Qualification reversed. Candidate returned to active status.');
  renderProgramHistory();
}

// ── Program History list ────────────────────────────────────────
async function renderProgramHistory() {
  destroyCharts();
  setActiveNav('program-history');
  setMain('<div class="page"><div class="loading">Loading program history…</div></div>');

  // Visible to managers and to FTIs viewing their own former candidates
  const { data: candidates } = await db.from('candidates')
    .select('*, fti:assigned_fti_id(first_name,last_name), sam:assigned_sam_id(first_name,last_name), qualifier:qualified_by(first_name,last_name)')
    .eq('program_status', 'qualified')
    .order('qualified_at', { ascending: false });

  const visibleCandidates = (candidates || []).filter(c =>
    isManager() || c.assigned_fti_id === currentProfile?.id
  );

  const rows = visibleCandidates.length === 0
    ? '<tr><td colspan="6" style="color:var(--muted);text-align:center;padding:24px">No candidates have completed the program yet.</td></tr>'
    : visibleCandidates.map(c => `
      <tr class="clickable" onclick="openHistoryCandidate('${c.id}')">
        <td style="font-weight:500">${displayName(c)}</td>
        <td style="font-family:var(--mono);font-size:11px;color:var(--accent)">${c.candidate_code||'—'}</td>
        <td style="font-size:12px;color:var(--muted)">${CANDIDATE_GROUP_LABELS[c.candidate_group]||c.candidate_group}</td>
        <td style="font-size:12px;color:var(--green);font-family:var(--mono)">QUALIFIED</td>
        <td style="font-size:12px;color:var(--muted)">${formatDate(c.qualified_at)}</td>
        <td style="font-size:12px;color:var(--muted)">${c.qualifier ? displayName(c.qualifier) : '—'}</td>
      </tr>`).join('');

  setMain(`<div class="page">
    <h1 class="section-title">Program History</h1>
    <p class="text-muted mb-3">Candidates who have completed the WFD Paramedic Qualification Program and been designated as WFD Fire Paramedics.</p>

    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Code</th><th>Group</th><th>Status</th><th>Qualified</th><th>By</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </div>`);
}

async function openHistoryCandidate(id) {
  setMain('<div class="page"><div class="loading">Loading…</div></div>');
  const { candidate, avg, dcas, gaps } = await getCandidateData(id);
  selectedCandidate = candidate;

  setMain(`<div class="page">
    <button class="btn btn-sm back-btn" onclick="renderProgramHistory()">← Program History</button>

    <div class="page-header">
      <h1 class="section-title" style="margin:0">${displayName(candidate)}</h1>
      <span style="font-family:var(--mono);font-size:11px;color:var(--green);border:1px solid rgba(62,207,142,0.3);background:rgba(62,207,142,0.1);padding:3px 10px;border-radius:20px">QUALIFIED — WFD Fire Paramedic</span>
    </div>

    ${alertHTML('info', `Qualified on ${formatDate(candidate.qualified_at)}. This candidate has exited the active qualification program. Full record retained per Manual Section 3.9.7.`)}

    <div class="card">
      <div class="card-title">Download full program record</div>
      <p class="text-muted mb-2">Generates a complete record including all DCAs, capability gaps, phase transitions, SAM Conferences, and the Independent Practice Evaluation. Available to the SAM Officer whenever needed — no time limit.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="exportFullHistoryCSV()">⬇ Full record CSV</button>
        <button class="btn btn-primary" onclick="exportFullHistoryPDF()">⬇ Full record PDF</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Program summary</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Total DCAs</span><span>${dcas.length}</span></div>
        <div class="info-row"><span class="info-label">Total hours</span><span>${candidate.qualifying_hours}h</span></div>
        <div class="info-row"><span class="info-label">Attempt</span><span>${candidate.attempt_number} of 3</span></div>
        <div class="info-row"><span class="info-label">Program start</span><span>${formatDate(candidate.program_start_date)}</span></div>
        <div class="info-row"><span class="info-label">Qualified</span><span>${formatDate(candidate.qualified_at)}</span></div>
      </div>
    </div>

    ${isManager() ? `
      <div class="card" style="border-color:rgba(239,68,68,0.3)">
        <div class="card-title" style="color:#fca5a5">Reverse qualification</div>
        <p class="text-muted mb-2" style="font-size:12px">
          This is a significant action and should not be used routinely. Reversing a qualification returns the
          candidate to active status and requires a logged reason. Use only to correct a genuine error.
        </p>
        <button class="btn btn-danger" onclick="reverseQualification('${candidate.id}')">Reverse qualification</button>
      </div>` : ''}
  </div>`);
}

// pages/capstone.js — Independent Practice Evaluation (formerly Capstone)
// Proctored by SAM Officer. Passing triggers Section 3.7 exit documentation
// check before the candidate can be marked Qualified.

async function renderCapstoneForm() {
  destroyCharts();
  const c = selectedCandidate;
  const canProctor = ['sam_officer','admin'].includes(currentProfile?.role);

  setMain('<div class="page"><div class="loading">Loading…</div></div>');

  const { data: existing } = await db
    .from('capstone_evaluations')
    .select('*')
    .eq('candidate_id', c.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const d = existing || {};
  const ftis = await fetchProfiles('fti');

  function ftiOptions() {
    return ftis.map(f => `<option value="${f.id}" ${d.fti_id===f.id||c.assigned_fti_id===f.id?'selected':''}>${displayName(f)}</option>`).join('');
  }

  function checkRow(key, label, checked) {
    return `<div class="check-row">
      <input type="checkbox" id="cap-${key}" ${checked?'checked':''} />
      <label style="font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:13px;color:var(--text)">${label}</label>
    </div>`;
  }

  function domainScoreRow(key, label, minNote) {
    const demandVal = d[`scenario_${key}_demand`]||'';
    const capVal    = d[`cap_${key}`]||'';
    return `<div class="form-grid" style="margin-bottom:12px">
      <div class="form-group">
        <label>${label} — Demand (scenario) ${minNote||''}</label>
        <select id="cap-demand-${key}">
          <option value="">—</option>
          ${[1,2,3,4,5].map(n=>`<option value="${n}" ${demandVal==n?'selected':''}>${n}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>${label} — Capability (min 4 to pass)</label>
        <select id="cap-cap-${key}" onchange="checkCapstonePassFail()">
          <option value="">—</option>
          ${[1,2,3,4,5].map(n=>`<option value="${n}" ${capVal==n?'selected':''}>${n}</option>`).join('')}
        </select>
      </div>
    </div>`;
  }

  if (!canProctor) {
    setMain(`<div class="page">
      ${backToCandidate()}
      <h1 class="section-title">${displayName(c)} — Independent Practice Evaluation</h1>
      ${candidateTabs('capstone')}
      ${existing
        ? `<div class="card">
            <div class="card-title">Evaluation result</div>
            <div class="metric-row" style="grid-template-columns:1fr 1fr">
              <div class="metric">
                <div class="metric-label">Outcome</div>
                <div class="metric-value ${existing.passed?'green':'red'}">${existing.passed?'PASS':'FAIL'}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Date</div>
                <div class="metric-value" style="font-size:16px">${formatDate(existing.evaluation_date)}</div>
              </div>
            </div>
            ${existing.sam_narrative ? `<p style="color:var(--muted);font-size:13px;margin-top:8px">${existing.sam_narrative}</p>` : ''}
          </div>`
        : alertHTML('info', 'No Independent Practice Evaluation on file yet. This evaluation is proctored by a SAM Officer.')}
    </div>`);
    return;
  }

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${displayName(c)} — Independent Practice Evaluation</h1>
    ${candidateTabs('capstone')}

    ${alertHTML('warn', 'Proctored by the SAM Officer. Minimum capability score of 4 in all domains required. All critical performance checklist items must be met. A Pass result will check Section 3.7 exit documentation requirements before the candidate can be marked Qualified.')}

    <div id="cap-error"   class="alert alert-error"   style="display:none"></div>
    <div id="cap-success" class="alert alert-success" style="display:none"></div>
    <div id="cap-missing-docs" class="alert alert-error" style="display:none"></div>

    <div class="card">
      <div class="card-title">Section 1 — Administrative</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Evaluation date *</label>
          <input type="date" id="cap-date" value="${d.evaluation_date||new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Attempt number</label>
          <select id="cap-attempt">
            <option value="1" ${d.attempt_number==1?'selected':''}>First</option>
            <option value="2" ${d.attempt_number==2?'selected':''}>Second (within current attempt)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Location</label>
          <input type="text" id="cap-location" value="${d.location||''}" placeholder="e.g. Station 1 training bay" />
        </div>
        <div class="form-group">
          <label>FTI present</label>
          <select id="cap-fti">
            <option value="">Select…</option>
            ${ftiOptions()}
          </select>
        </div>
        <div class="form-group">
          <label>Total program hours at time of evaluation</label>
          <input type="number" id="cap-total-hours" value="${d.total_program_hours||c.qualifying_hours||''}" />
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 2 — Scenario elements checklist</div>
      <div class="checklist">
        ${CAPSTONE_ELEMENTS.map(e => checkRow(e.key, e.label, d[e.key])).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 3 — Domain scores</div>
      <p class="text-muted mb-2">Demand scores are pre-set by SAM Officer in scenario design. Minimum demand score of 3 in all domains, minimum 4 in Clinical Management and Motor Skills.</p>
      ${domainScoreRow('d1', 'Patient Assessment')}
      ${domainScoreRow('d2', 'Clinical Management', '(min 4)')}
      ${domainScoreRow('d3', 'Motor Skills', '(min 4)')}
      ${domainScoreRow('d4', 'Time Pressure / Cadence', '(min 4)')}
      ${domainScoreRow('d5', 'CRM', '')}

      <div id="cap-pass-indicator" style="margin-top:14px;font-family:var(--mono);font-size:13px;color:var(--muted)">
        — Score all domains to see pass/fail indicator —
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 4 — Critical performance checklist</div>
      <div class="checklist">
        ${CAPSTONE_CHECKS.map(ch => checkRow(ch.key, ch.label, d[ch.key])).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 5 — Outcome</div>
      <div class="form-group mb-2">
        <label>Overall result</label>
        <select id="cap-result">
          <option value="">Select…</option>
          <option value="pass" ${d.passed===true?'selected':''}>PASS</option>
          <option value="fail" ${d.passed===false?'selected':''}>FAIL</option>
        </select>
      </div>
      <div class="form-group mb-2" id="cap-fail-wrap" style="${d.passed===false?'':'display:none'}">
        <label>If fail — SAM Officer determination</label>
        <select id="cap-fail-outcome">
          <option value="">Select…</option>
          <option value="retake" ${d.outcome_determination==='retake'?'selected':''}>Appropriate for retake within current attempt</option>
          <option value="regress_phase_iii" ${d.outcome_determination==='regress_phase_iii'?'selected':''}>Requires regression to Phase III before retake</option>
          <option value="formal_failure_review" ${d.outcome_determination==='formal_failure_review'?'selected':''}>Performance warrants formal failure review (Section 3.9.3)</option>
        </select>
      </div>
      <div class="form-group">
        <label>SAM Officer narrative — summary of performance</label>
        <textarea id="cap-narrative" placeholder="Describe the candidate's performance across all domains…">${d.sam_narrative||''}</textarea>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:32px">
      <button class="btn" onclick="renderCandidateOverview()">Cancel</button>
      <button class="btn btn-primary" style="margin-left:auto" id="save-ipe-btn" onclick="saveCapstone('${existing?.id||''}')">
        ${existing ? 'Update evaluation record' : 'Save Independent Practice Evaluation'}
      </button>
    </div>
  </div>`);

  document.getElementById('cap-result')?.addEventListener('change', function() {
    document.getElementById('cap-fail-wrap').style.display = this.value === 'fail' ? 'block' : 'none';
  });
}

function checkCapstonePassFail() {
  const domains = ['d1','d2','d3','d4','d5'];
  const scores  = domains.map(d => parseInt(document.getElementById(`cap-cap-${d}`)?.value)||0);
  const allScored = scores.every(s => s > 0);
  const allPass   = scores.every(s => s >= 4);

  const el = document.getElementById('cap-pass-indicator');
  if (!el) return;
  if (!allScored) { el.textContent = '— Score all domains to see pass/fail indicator —'; el.style.color = 'var(--muted)'; return; }

  if (allPass) {
    el.textContent = '✓ All domain scores ≥ 4 — meets capability threshold';
    el.style.color = 'var(--green)';
  } else {
    const failed = domains.filter((_,i) => scores[i] < 4).map(d => DOMAIN_LABELS[d]);
    el.textContent = `✗ Below threshold: ${failed.join(', ')}`;
    el.style.color = 'var(--red)';
  }
}

async function saveCapstone(existingId) {
  const errEl     = document.getElementById('cap-error');
  const missingEl = document.getElementById('cap-missing-docs');
  errEl.style.display = 'none';
  missingEl.style.display = 'none';

  const date   = document.getElementById('cap-date').value;
  const result = document.getElementById('cap-result').value;

  if (!date || !result) {
    errEl.textContent = 'Evaluation date and outcome are required.';
    errEl.style.display = 'block';
    return;
  }

  // ── If the result is Pass, run the Section 3.7 exit documentation check
  // BEFORE saving anything, and require explicit confirmation ───────────
  if (result === 'pass') {
    const btn = document.getElementById('save-ipe-btn');
    btn.disabled = true;
    btn.textContent = 'Checking exit documentation…';

    const { complete, missing } = await checkExitDocumentation(selectedCandidate.id);

    btn.disabled = false;
    btn.textContent = existingId ? 'Update evaluation record' : 'Save Independent Practice Evaluation';

    if (!complete) {
      missingEl.innerHTML = `
        <strong>Cannot mark candidate Qualified — exit documentation incomplete (Manual Section 3.7):</strong>
        <ul style="margin:8px 0 0 18px;padding:0">
          ${missing.map(m => `<li style="margin-bottom:4px">${m}</li>`).join('')}
        </ul>
        <p style="margin-top:10px;font-size:12px">Resolve the items above, then return here to record the Pass result.</p>
      `;
      missingEl.style.display = 'block';
      missingEl.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    // All exit documentation complete — require explicit confirmation
    const confirmed = confirm(
      `All Section 3.7 exit documentation requirements are met.\n\n` +
      `You are about to qualify ${displayName(selectedCandidate)} as a WFD Fire Paramedic. ` +
      `This will exit them from active candidate status and move their full record to Program History.\n\n` +
      `This is a significant personnel action. An admin can reverse it later if needed, but it should not ` +
      `be treated as routine.\n\nConfirm qualification?`
    );

    if (!confirmed) return;
  }

  const payload = {
    candidate_id:      selectedCandidate.id,
    sam_id:            currentProfile.id,
    fti_id:            document.getElementById('cap-fti')?.value || null,
    evaluation_date:   date,
    attempt_number:    parseInt(document.getElementById('cap-attempt')?.value)||1,
    location:          document.getElementById('cap-location')?.value || null,
    total_program_hours: parseFloat(document.getElementById('cap-total-hours')?.value)||null,

    ...Object.fromEntries(CAPSTONE_ELEMENTS.map(e => [e.key, document.getElementById(`cap-${e.key}`)?.checked||false])),

    scenario_d1_demand: parseInt(document.getElementById('cap-demand-d1')?.value)||null,
    scenario_d2_demand: parseInt(document.getElementById('cap-demand-d2')?.value)||null,
    scenario_d3_demand: parseInt(document.getElementById('cap-demand-d3')?.value)||null,
    scenario_d4_demand: parseInt(document.getElementById('cap-demand-d4')?.value)||null,
    scenario_d5_demand: parseInt(document.getElementById('cap-demand-d5')?.value)||null,
    cap_d1: parseInt(document.getElementById('cap-cap-d1')?.value)||null,
    cap_d2: parseInt(document.getElementById('cap-cap-d2')?.value)||null,
    cap_d3: parseInt(document.getElementById('cap-cap-d3')?.value)||null,
    cap_d4: parseInt(document.getElementById('cap-cap-d4')?.value)||null,
    cap_d5: parseInt(document.getElementById('cap-cap-d5')?.value)||null,

    ...Object.fromEntries(CAPSTONE_CHECKS.map(ch => [ch.key, document.getElementById(`cap-${ch.key}`)?.checked||false])),

    passed:               result === 'pass',
    outcome_determination: document.getElementById('cap-fail-outcome')?.value || null,
    sam_narrative:        document.getElementById('cap-narrative')?.value || null,
    sam_signed_at:        new Date().toISOString()
  };

  let error, savedRecord;
  if (existingId) {
    ({ error } = await db.from('capstone_evaluations').update(payload).eq('id', existingId));
  } else {
    ({ data: savedRecord, error } = await db.from('capstone_evaluations').insert(payload).select().single());
  }

  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

  // If passed, execute the actual qualification/exit action
  if (result === 'pass') {
    const { error: qualError } = await qualifyCandidate(
      selectedCandidate.id,
      existingId || savedRecord?.id
    );
    if (qualError) {
      errEl.textContent = 'Evaluation saved, but qualification status update failed: ' + qualError.message;
      errEl.style.display = 'block';
      return;
    }
    invalidateCache(selectedCandidate.id);

    document.getElementById('cap-success').textContent =
      `Independent Practice Evaluation saved. Result: PASS. Candidate qualified and moved to Program History.`;
    document.getElementById('cap-success').style.display = 'block';
    setTimeout(() => renderProgramHistory(), 2000);
    return;
  }

  invalidateCache(selectedCandidate.id);
  document.getElementById('cap-success').textContent = `Independent Practice Evaluation saved. Result: ${result.toUpperCase()}.`;
  document.getElementById('cap-success').style.display = 'block';
  setTimeout(() => renderCandidateOverview(), 1600);
}

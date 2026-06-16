// pages/dca-form.js — DCA form with auto-save to localStorage
// Auto-save key is scoped to candidate ID so drafts don't cross-contaminate

let dcaScores = {};
let autoSaveTimer = null;

// ── Draft storage key ──────────────────────────────────────────
function draftKey() {
  return `wfd_dca_draft_${selectedCandidate?.id}`;
}

// ── Collect current form state ─────────────────────────────────
function collectFormState() {
  return {
    savedAt:          new Date().toISOString(),
    candidateId:      selectedCandidate?.id,
    candidateName:    selectedCandidate?.full_name,
    scores:           JSON.parse(JSON.stringify(dcaScores)),
    incident_date:    document.getElementById('dca-date')?.value || '',
    incident_number:  document.getElementById('dca-incident')?.value || '',
    epcrlink:         document.getElementById('dca-epcrlink')?.value || '',
    acuity:           document.getElementById('dca-acuity')?.value || '',
    trigger_type:     document.getElementById('dca-trigger')?.value || '',
    int_prompt:       document.getElementById('dca-int-prompt')?.value || '',
    int_action:       document.getElementById('dca-int-action')?.value || '',
    int_affected:     document.getElementById('dca-int-affected')?.value || 'no',
    int_description:  document.getElementById('dca-int-description')?.value || '',
    notes_d1:         document.getElementById('notes-d1')?.value || '',
    notes_d2:         document.getElementById('notes-d2')?.value || '',
    notes_d3:         document.getElementById('notes-d3')?.value || '',
    notes_d4:         document.getElementById('notes-d4')?.value || '',
    notes_d5:         document.getElementById('notes-d5')?.value || '',
    doc_accuracy:     document.getElementById('doc-accuracy')?.value || 'satisfactory',
    doc_completeness: document.getElementById('doc-completeness')?.value || 'satisfactory',
    doc_timeliness:   document.getElementById('doc-timeliness')?.value || 'satisfactory',
    doc_consistency:  document.getElementById('doc-consistency')?.value || 'satisfactory',
    doc_deficiency:   document.getElementById('doc-deficiency-notes')?.value || '',
    next_call:        document.getElementById('dca-next-call')?.value || '',
    d4_mismatch:      document.getElementById('d4-mismatch-direction')?.value || ''
  };
}

// ── Save draft to localStorage ─────────────────────────────────
function saveDraft() {
  try {
    const state = collectFormState();
    localStorage.setItem(draftKey(), JSON.stringify(state));
    // Update save indicator
    const ind = document.getElementById('autosave-indicator');
    if (ind) {
      ind.textContent = `Draft saved ${new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}`;
      ind.style.color = 'var(--green)';
    }
  } catch(e) {
    // localStorage full or unavailable — fail silently
  }
}

// ── Clear draft ────────────────────────────────────────────────
function clearDraft() {
  try { localStorage.removeItem(draftKey()); } catch(e) {}
}

// ── Load draft into form ───────────────────────────────────────
function loadDraft(draft) {
  // Restore scores memory
  dcaScores = draft.scores || {};

  // Restore score button visual states
  for (const [domain, scores] of Object.entries(dcaScores)) {
    for (const [type, value] of Object.entries(scores)) {
      const btn = document.getElementById(`score-${domain}-${type}-${value}`);
      if (btn) btn.classList.add('selected');
    }
    // Re-run gap detection
    const dem = dcaScores[domain]?.demand;
    const cap = dcaScores[domain]?.capability;
    if (dem && cap && dem > cap) {
      const gapInd = document.getElementById(`gap-ind-${domain}`);
      const obsReq = document.getElementById(`obs-req-${domain}`);
      if (gapInd) gapInd.style.display = 'inline-flex';
      if (obsReq)  obsReq.style.display  = 'inline';
      const capBtn = document.getElementById(`score-${domain}-capability-${cap}`);
      if (capBtn) { capBtn.classList.remove('selected'); capBtn.classList.add('gap-selected'); }
    }
  }

  // Restore text fields
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  set('dca-date',             draft.incident_date);
  set('dca-incident',         draft.incident_number);
  set('dca-epcrlink',         draft.epcrlink);
  set('dca-acuity',           draft.acuity);
  set('dca-trigger',          draft.trigger_type);
  set('dca-int-prompt',       draft.int_prompt);
  set('dca-int-action',       draft.int_action);
  set('dca-int-affected',     draft.int_affected);
  set('dca-int-description',  draft.int_description);
  set('notes-d1',             draft.notes_d1);
  set('notes-d2',             draft.notes_d2);
  set('notes-d3',             draft.notes_d3);
  set('notes-d4',             draft.notes_d4);
  set('notes-d5',             draft.notes_d5);
  set('doc-accuracy',         draft.doc_accuracy);
  set('doc-completeness',     draft.doc_completeness);
  set('doc-timeliness',       draft.doc_timeliness);
  set('doc-consistency',      draft.doc_consistency);
  set('doc-deficiency-notes', draft.doc_deficiency);
  set('dca-next-call',        draft.next_call);
  set('d4-mismatch-direction',draft.d4_mismatch);

  // Restore conditional visibility
  if (draft.trigger_type === 'safety_intervention') {
    const el = document.getElementById('intervention-section');
    if (el) el.style.display = 'block';
  }
  if (draft.int_affected === 'yes') {
    const el = document.getElementById('int-affected-detail');
    if (el) el.style.display = 'block';
  }
  if (['accuracy','completeness','timeliness','consistency'].some(f => {
    const el = document.getElementById(`doc-${f}`);
    return el && el.value === 'deficient';
  })) {
    const el = document.getElementById('doc-deficiency-wrap');
    if (el) el.style.display = 'block';
  }

  checkPhaseTransitionWarning();
}

// ── Start auto-save timer ──────────────────────────────────────
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(saveDraft, 15000); // every 15 seconds
}

function stopAutoSave() {
  if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
}

// ── Render DCA form ────────────────────────────────────────────
function renderDcaForm() {
  destroyCharts();
  stopAutoSave();
  dcaScores = {};
  const c = selectedCandidate;

  // Check for existing draft
  let existingDraft = null;
  try {
    const raw = localStorage.getItem(draftKey());
    if (raw) existingDraft = JSON.parse(raw);
  } catch(e) {}

  const domains = [
    { key:'d1', label:'Domain 1: Patient Assessment',         critical:false },
    { key:'d2', label:'Domain 2: Clinical Management',        critical:true  },
    { key:'d3', label:'Domain 3: Motor Skills',               critical:true  },
    { key:'d4', label:'Domain 4: Time Pressure / Cadence',    critical:false },
    { key:'d5', label:'Domain 5: CRM',                        critical:false }
  ];

  function scoreButtons(domain, type) {
    const descs = type === 'demand' ? DEMAND_DESCRIPTORS[domain] : CAP_DESCRIPTORS[domain];
    if (!descs) return '';
    return `<div class="score-grid" id="scores-${domain}-${type}">
      ${[1,2,3,4,5].map(n => `
        <button type="button" class="score-btn" id="score-${domain}-${type}-${n}"
          onclick="selectScore('${domain}','${type}',${n});saveDraft()">
          <span class="num">${n}</span>
          <span>${descs[n-1]}</span>
        </button>`).join('')}
    </div>`;
  }

  const domainHTML = domains.map(d => `
    <div class="domain-section">
      <div class="domain-header">
        <span class="domain-title">${d.label}</span>
        ${d.critical ? criticalTag() : ''}
        <span id="gap-ind-${d.key}" style="display:none" class="gap-chip gap-critical">
          <span class="dot" style="background:var(--red)"></span>Gap exists
        </span>
      </div>

      <p class="score-label">Demand — ${d.key === 'd4' ? 'time pressure / urgency required' : 'call complexity'}</p>
      ${scoreButtons(d.key, 'demand')}

      <p class="score-label" style="margin-top:14px">Capability — ${d.key === 'd4' ? 'cadence (pace calibration)' : 'candidate performance'}</p>
      ${scoreButtons(d.key, 'capability')}

      ${d.key === 'd4' ? `
        <div class="alert alert-info" style="margin-top:10px;font-size:12px">
          <strong>Cadence scoring:</strong> A high score means pace was appropriately matched to demand — not necessarily fast.
          A gap exists when the call required more urgency than the Candidate demonstrated.
          Over-urgency on a low-demand call is a calibration concern — capture in narrative, not a formal gap.
        </div>` : ''}

      <div class="form-group" style="margin-top:12px">
        <label>Observations
          <span id="obs-req-${d.key}" style="color:var(--red);display:none">(required)</span>
          <span style="color:var(--muted)"> — optional unless gap or score ≤ 2${d.key === 'd4' ? ', or over-urgency noted' : ''}</span>
        </label>
        <textarea id="notes-${d.key}" oninput="saveDraft()"
          placeholder="Specific, behavioral observations for ${DOMAIN_LABELS[d.key]}…"></textarea>
        ${d.key === 'd4' ? `
          <div style="margin-top:8px">
            <label style="text-transform:none;letter-spacing:0;font-size:12px;color:var(--muted)">If mismatch noted, direction:</label>
            <select id="d4-mismatch-direction" style="margin-top:4px;font-size:13px" onchange="saveDraft()">
              <option value="">— not applicable —</option>
              <option value="under_urgent">Under-urgent relative to demand (formal gap)</option>
              <option value="over_urgent">Over-urgent relative to demand (calibration concern — narrative only)</option>
            </select>
          </div>` : ''}
      </div>
    </div>`).join('');

  // Draft banner
  const draftBanner = existingDraft ? `
    <div id="draft-banner" class="alert alert-warn" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span>📋 You have an unsaved draft from ${new Date(existingDraft.savedAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}.</span>
      <div style="display:flex;gap:8px;margin-left:auto">
        <button class="btn btn-sm btn-primary" onclick="resumeDraft()">Resume draft</button>
        <button class="btn btn-sm btn-danger" onclick="discardDraft()">Discard</button>
      </div>
    </div>` : '';

  setMain(`<div class="page">
    ${backToCandidate('Overview')}
    <h1 class="section-title">New DCA — ${c.full_name}</h1>
    ${candidateTabs('new-dca')}

    ${draftBanner}

    <div id="dca-error"   class="alert alert-error"   style="display:none"></div>
    <div id="dca-success" class="alert alert-success" style="display:none"></div>

    <!-- Section 1 -->
    <div class="card">
      <div class="card-title">Section 1 — Incident information</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Incident date *</label>
          <input type="date" id="dca-date" value="${new Date().toISOString().split('T')[0]}" oninput="saveDraft()" />
        </div>
        <div class="form-group">
          <label>Incident number</label>
          <input type="text" id="dca-incident" placeholder="e.g. 2025-00412" oninput="saveDraft()" />
        </div>
        <div class="form-group full">
          <label>ePCR / ImageTrend link
            <span id="epcr-required-flag" style="display:none;color:var(--red)">(required — gap identified)</span>
          </label>
          <input type="text" id="dca-epcrlink" placeholder="https://…" oninput="saveDraft();clearEpcrRequiredStyle()" />
        </div>
        <div class="form-group">
          <label>Acuity *</label>
          <select id="dca-acuity" onchange="saveDraft()">
            <option value="">Select…</option>
            <option value="green">Green — low risk, reversible error</option>
            <option value="yellow">Yellow — moderate risk, limited discretion</option>
            <option value="red">Red — high risk, non-discretionary</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Section 2 -->
    <div class="card">
      <div class="card-title">Section 2 — DCA trigger</div>
      <div class="form-group">
        <label>Primary trigger *</label>
        <select id="dca-trigger" onchange="onTriggerChange();saveDraft()">
          <option value="">Select trigger…</option>
          ${TRIGGERS.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
        </select>
      </div>

      <div id="phase-transition-warning" style="display:none" class="alert alert-warn" style="margin-top:10px">
        ⚠ Phase transition DCAs require a minimum Demand score of 3 across all domains per Manual Section 3.3.
        A low-acuity shift cannot be used to support a phase transition evaluation.
        Contact your SAM Officer to arrange a structured simulation scenario if field conditions are insufficient.
      </div>

      <div id="intervention-section" style="display:none;margin-top:14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);border-radius:var(--radius);padding:14px">
        <div class="card-title" style="color:#fca5a5">Section 2A — FTI intervention detail</div>
        <div class="form-group mb-2">
          <label>What prompted the intervention?</label>
          <textarea id="dca-int-prompt" oninput="saveDraft()"></textarea>
        </div>
        <div class="form-group mb-2">
          <label>What action did the FTI take?</label>
          <textarea id="dca-int-action" oninput="saveDraft()"></textarea>
        </div>
        <div class="form-group mb-2">
          <label>Was patient care affected?</label>
          <select id="dca-int-affected" onchange="toggleIntAffected();saveDraft()">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div id="int-affected-detail" style="display:none" class="form-group">
          <label>Describe patient care impact</label>
          <textarea id="dca-int-description" oninput="saveDraft()"></textarea>
        </div>
      </div>
    </div>

    <!-- Section 3 -->
    <div class="card">
      <div class="card-title">Section 3 — Domain scoring</div>
      ${alertHTML('info', 'Narrative required when Demand > Capability (gap exists) or any score ≤ 2. Scores are not averaged — they are compared. Total score is out of 25.')}
      ${domainHTML}
    </div>

    <!-- Section 5 -->
    <div class="card">
      <div class="card-title">Section 5 — Documentation quality</div>
      <div class="form-grid">
        ${['accuracy','completeness','timeliness','consistency'].map(f => `
          <div class="form-group">
            <label>${f.charAt(0).toUpperCase()+f.slice(1)}</label>
            <select id="doc-${f}" onchange="checkDocDeficiency();saveDraft()">
              <option value="satisfactory">Satisfactory</option>
              <option value="deficient">Deficient</option>
            </select>
          </div>`).join('')}
        <div class="form-group full" id="doc-deficiency-wrap" style="display:none">
          <label>Deficiency notes (required)</label>
          <textarea id="doc-deficiency-notes" oninput="saveDraft()"></textarea>
        </div>
      </div>
    </div>

    <!-- Section 6 -->
    <div class="card">
      <div class="card-title">Section 6 — Next call adjustment (optional)</div>
      <div class="form-group">
        <label>Specific adjustment for next similar call</label>
        <textarea id="dca-next-call" oninput="saveDraft()"
          placeholder="Describe the behavioral or clinical adjustment…"></textarea>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;flex-wrap:wrap">
      <button class="btn" onclick="cancelDcaForm()">Cancel</button>
      <span id="autosave-indicator" style="font-size:11px;font-family:var(--mono);color:var(--muted)">Auto-saves every 15 seconds</span>
      <button class="btn btn-primary" style="margin-left:auto" id="submit-dca-btn" onclick="submitDca()">Submit DCA</button>
    </div>
  </div>`);

  // Start auto-save
  startAutoSave();
}

// ── Draft actions ──────────────────────────────────────────────
function resumeDraft() {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return;
    const draft = JSON.parse(raw);
    loadDraft(draft);
    const banner = document.getElementById('draft-banner');
    if (banner) {
      banner.className = 'alert alert-success';
      banner.innerHTML = '✓ Draft restored. Continue where you left off.';
      setTimeout(() => { if (banner) banner.style.display = 'none'; }, 3000);
    }
  } catch(e) {}
}

function discardDraft() {
  clearDraft();
  const banner = document.getElementById('draft-banner');
  if (banner) banner.style.display = 'none';
}

function cancelDcaForm() {
  stopAutoSave();
  // Keep draft intact on cancel — they may want to come back
  renderCandidateOverview();
}

// ── Score selection ────────────────────────────────────────────
function selectScore(domain, type, value) {
  if (!dcaScores[domain]) dcaScores[domain] = {};
  dcaScores[domain][type] = value;

  for (let n = 1; n <= 5; n++) {
    const btn = document.getElementById(`score-${domain}-${type}-${n}`);
    if (!btn) continue;
    btn.classList.remove('selected','gap-selected');
    if (n === value) btn.classList.add('selected');
  }

  const dem    = dcaScores[domain]?.demand;
  const cap    = dcaScores[domain]?.capability;
  const gapInd = document.getElementById(`gap-ind-${domain}`);
  const obsReq = document.getElementById(`obs-req-${domain}`);

  if (dem && cap) {
    const hasGap = dem > cap;
    if (gapInd) gapInd.style.display = hasGap ? 'inline-flex' : 'none';
    if (obsReq) obsReq.style.display  = hasGap ? 'inline' : 'none';
    if (hasGap) {
      const capBtn = document.getElementById(`score-${domain}-capability-${cap}`);
      if (capBtn) { capBtn.classList.remove('selected'); capBtn.classList.add('gap-selected'); }
    }
  }

  checkPhaseTransitionWarning();
  checkEpcrRequirement();
}

// Live check — show/hide the "required" flag on the ePCR field as scores change
function checkEpcrRequirement() {
  const flag = document.getElementById('epcr-required-flag');
  if (!flag) return;
  const hasAnyGap = ['d1','d2','d3','d4','d5'].some(dn => {
    const dem = dcaScores[dn]?.demand;
    const cap = dcaScores[dn]?.capability;
    return dem && cap && dem > cap;
  });
  flag.style.display = hasAnyGap ? 'inline' : 'none';
}

function clearEpcrRequiredStyle() {
  const el = document.getElementById('dca-epcrlink');
  if (el) el.style.borderColor = '';
}

function onTriggerChange() {
  const val = document.getElementById('dca-trigger').value;
  document.getElementById('intervention-section').style.display =
    val === 'safety_intervention' ? 'block' : 'none';
  checkPhaseTransitionWarning();
}

function checkPhaseTransitionWarning() {
  const trigger   = document.getElementById('dca-trigger')?.value;
  const warningEl = document.getElementById('phase-transition-warning');
  if (!warningEl) return;

  if (trigger !== 'phase_transition') { warningEl.style.display = 'none'; return; }

  const hasLowDemand = ['d1','d2','d3','d4','d5'].some(d => {
    const dem = dcaScores[d]?.demand;
    return dem && dem < 3;
  });
  warningEl.style.display = hasLowDemand ? 'block' : 'none';
}

function toggleIntAffected() {
  const val = document.getElementById('dca-int-affected').value;
  document.getElementById('int-affected-detail').style.display =
    val === 'yes' ? 'block' : 'none';
}

function checkDocDeficiency() {
  const hasDeficient = ['accuracy','completeness','timeliness','consistency']
    .some(f => document.getElementById(`doc-${f}`)?.value === 'deficient');
  document.getElementById('doc-deficiency-wrap').style.display = hasDeficient ? 'block' : 'none';
}

// ── DCA submission ─────────────────────────────────────────────
async function submitDca() {
  const errEl = document.getElementById('dca-error');
  errEl.style.display = 'none';

  const acuity  = document.getElementById('dca-acuity').value;
  const trigger = document.getElementById('dca-trigger').value;
  const date    = document.getElementById('dca-date').value;

  if (!acuity || !trigger || !date) {
    errEl.textContent = 'Acuity, trigger type, and incident date are required.';
    errEl.style.display = 'block';
    errEl.scrollIntoView({ behavior:'smooth' });
    return;
  }

  for (const dn of ['d1','d2','d3','d4','d5']) {
    if (!dcaScores[dn]?.demand) {
      errEl.textContent = `Please score demand for ${DOMAIN_LABELS[dn]}.`;
      errEl.style.display = 'block';
      errEl.scrollIntoView({ behavior:'smooth' });
      return;
    }
    if (!dcaScores[dn]?.capability) {
      errEl.textContent = `Please score capability for ${DOMAIN_LABELS[dn]}.`;
      errEl.style.display = 'block';
      errEl.scrollIntoView({ behavior:'smooth' });
      return;
    }
  }

  // Change — ePCR link required when any domain shows a gap (demand > capability)
  const hasAnyGap = ['d1','d2','d3','d4','d5'].some(dn => {
    const dem = dcaScores[dn]?.demand;
    const cap = dcaScores[dn]?.capability;
    return dem && cap && dem > cap;
  });
  const epcrLinkValue = document.getElementById('dca-epcrlink')?.value?.trim();

  if (hasAnyGap && !epcrLinkValue) {
    errEl.textContent = 'A capability gap was identified. The ePCR / ImageTrend link is required to document the source incident before this DCA can be submitted.';
    errEl.style.display = 'block';
    document.getElementById('dca-epcrlink').scrollIntoView({ behavior:'smooth' });
    document.getElementById('dca-epcrlink').style.borderColor = 'var(--red)';
    return;
  }

  const btn = document.getElementById('submit-dca-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  // Stop auto-save before submitting
  stopAutoSave();

  const payload = {
    candidate_id: selectedCandidate.id,
    fti_id:       currentProfile.id,
    phase:        selectedCandidate.current_phase,
    incident_date:   date,
    incident_number: document.getElementById('dca-incident').value || null,
    epcrlink:        document.getElementById('dca-epcrlink').value || null,
    acuity,
    trigger_type: trigger,

    intervention_prompt:           document.getElementById('dca-int-prompt')?.value || null,
    intervention_action:           document.getElementById('dca-int-action')?.value || null,
    intervention_patient_affected: document.getElementById('dca-int-affected')?.value === 'yes',
    intervention_description:      document.getElementById('dca-int-description')?.value || null,

    d1_demand: dcaScores.d1?.demand, d1_capability: dcaScores.d1?.capability,
    d1_notes:  document.getElementById('notes-d1')?.value || null,
    d2_demand: dcaScores.d2?.demand, d2_capability: dcaScores.d2?.capability,
    d2_notes:  document.getElementById('notes-d2')?.value || null,
    d3_demand: dcaScores.d3?.demand, d3_capability: dcaScores.d3?.capability,
    d3_notes:  document.getElementById('notes-d3')?.value || null,
    d4_demand: dcaScores.d4?.demand, d4_capability: dcaScores.d4?.capability,
    d4_notes:  document.getElementById('notes-d4')?.value || null,
    d5_demand: dcaScores.d5?.demand, d5_capability: dcaScores.d5?.capability,
    d5_notes:  document.getElementById('notes-d5')?.value || null,

    doc_accuracy:     document.getElementById('doc-accuracy')?.value,
    doc_completeness: document.getElementById('doc-completeness')?.value,
    doc_timeliness:   document.getElementById('doc-timeliness')?.value,
    doc_consistency:  document.getElementById('doc-consistency')?.value,
    doc_deficiency_notes: document.getElementById('doc-deficiency-notes')?.value || null,

    next_call_adjustment: document.getElementById('dca-next-call')?.value || null,
    fti_signed_at: new Date().toISOString()
  };

  const { data: dca, error } = await db.from('dcas').insert(payload).select().single();

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Submit DCA';
    startAutoSave(); // Resume auto-save if submission fails
    return;
  }

  // Auto-create gaps
  const gaps = [];
  for (const dn of [1,2,3,4,5]) {
    const dem = dcaScores[`d${dn}`]?.demand;
    const cap = dcaScores[`d${dn}`]?.capability;
    if (dem && cap && dem > cap) {
      const notes = document.getElementById(`notes-d${dn}`)?.value || '';
      gaps.push({
        dca_id:        dca.id,
        candidate_id:  selectedCandidate.id,
        domain_number: dn,
        domain_name:   DOMAIN_LABELS[`d${dn}`],
        gap_description: `Gap on ${date}: demand ${dem}, capability ${cap}${notes ? '. ' + notes : ''}`.trim(),
        status: 'open'
      });
    }
  }
  if (gaps.length > 0) await db.from('capability_gaps').insert(gaps);

  // Clear draft on successful submission
  clearDraft();
  invalidateCache(selectedCandidate.id);

  document.getElementById('dca-success').textContent =
    `DCA saved.${gaps.length > 0 ? ` ${gaps.length} capability gap(s) created automatically.` : ' No gaps identified.'}`;
  document.getElementById('dca-success').style.display = 'block';
  document.getElementById('dca-success').scrollIntoView({ behavior:'smooth' });

  setTimeout(() => renderCandidateOverview(), 1800);
}

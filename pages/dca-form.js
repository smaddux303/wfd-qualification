// pages/dca-form.js — DCA form, score selection, submission

let dcaScores = {};

function renderDcaForm() {
  destroyCharts();
  dcaScores = {};
  const c = selectedCandidate;

  const domains = [
    { key:'d1', label:'Domain 1: Patient Assessment',  critical:false, demandOnly:false },
    { key:'d2', label:'Domain 2: Clinical Management', critical:true,  demandOnly:false },
    { key:'d3', label:'Domain 3: Motor Skills',        critical:true,  demandOnly:false },
    { key:'d4', label:'Domain 4: Time Pressure',       critical:false, demandOnly:true  },
    { key:'d5', label:'Domain 5: CRM',                 critical:false, demandOnly:false }
  ];

  function scoreButtons(domain, type) {
    const descs = type === 'demand' ? DEMAND_DESCRIPTORS[domain] : CAP_DESCRIPTORS[domain];
    if (!descs) return '';
    return `<div class="score-grid" id="scores-${domain}-${type}">
      ${[1,2,3,4,5].map(n => `
        <button type="button" class="score-btn" id="score-${domain}-${type}-${n}"
          onclick="selectScore('${domain}','${type}',${n})">
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

      <p class="score-label">Demand — ${d.demandOnly ? 'urgency context' : 'call complexity'}</p>
      ${scoreButtons(d.key, 'demand')}

      ${!d.demandOnly ? `
        <p class="score-label" style="margin-top:14px">Capability — candidate performance</p>
        ${scoreButtons(d.key, 'capability')}
        <div class="form-group" style="margin-top:12px">
          <label>Observations <span id="obs-req-${d.key}" style="color:var(--red);display:none">(required)</span><span style="color:var(--muted)"> — optional unless gap or score ≤ 2</span></label>
          <textarea id="notes-${d.key}" placeholder="Specific, behavioral observations for ${DOMAIN_LABELS[d.key]}…"></textarea>
        </div>
      ` : `
        <div class="alert alert-info" style="margin-top:12px;font-size:12px">
          Time Pressure is demand-only. It contextualises other domain scores but is not scored for capability.
        </div>
      `}
    </div>`).join('');

  setMain(`<div class="page">
    ${backToCandidate('Overview')}
    <h1 class="section-title">New DCA — ${c.full_name}</h1>
    ${candidateTabs('new-dca')}

    <div id="dca-error"   class="alert alert-error"   style="display:none"></div>
    <div id="dca-success" class="alert alert-success" style="display:none"></div>

    <div class="card">
      <div class="card-title">Section 1 — Incident information</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Incident date *</label>
          <input type="date" id="dca-date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Incident number</label>
          <input type="text" id="dca-incident" placeholder="e.g. 2025-00412" />
        </div>
        <div class="form-group">
          <label>ePCR / ImageTrend link</label>
          <input type="text" id="dca-epcrlink" placeholder="https://…" />
        </div>
        <div class="form-group">
          <label>Acuity *</label>
          <select id="dca-acuity">
            <option value="">Select…</option>
            <option value="green">Green — low risk, reversible error</option>
            <option value="yellow">Yellow — moderate risk, limited discretion</option>
            <option value="red">Red — high risk, non-discretionary</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 2 — DCA trigger</div>
      <div class="form-group">
        <label>Primary trigger *</label>
        <select id="dca-trigger" onchange="toggleIntervention()">
          <option value="">Select trigger…</option>
          ${TRIGGERS.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
        </select>
      </div>

      <div id="intervention-section" style="display:none;margin-top:14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);border-radius:var(--radius);padding:14px">
        <div class="card-title" style="color:#fca5a5">Section 2A — FTI intervention detail</div>
        <div class="form-group mb-2">
          <label>What prompted the intervention?</label>
          <textarea id="dca-int-prompt"></textarea>
        </div>
        <div class="form-group mb-2">
          <label>What action did the FTI take?</label>
          <textarea id="dca-int-action"></textarea>
        </div>
        <div class="form-group mb-2">
          <label>Was patient care affected?</label>
          <select id="dca-int-affected" onchange="toggleIntAffected()">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div id="int-affected-detail" style="display:none" class="form-group">
          <label>Describe patient care impact</label>
          <textarea id="dca-int-description"></textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 3 — Domain scoring</div>
      ${alertHTML('info', 'Narrative required when Demand > Capability (gap exists) or any score ≤ 2. Optional otherwise.')}
      ${domainHTML}
    </div>

    <div class="card">
      <div class="card-title">Section 5 — Documentation quality</div>
      <div class="form-grid">
        ${['accuracy','completeness','timeliness','consistency'].map(f => `
          <div class="form-group">
            <label>${f.charAt(0).toUpperCase()+f.slice(1)}</label>
            <select id="doc-${f}" onchange="checkDocDeficiency()">
              <option value="satisfactory">Satisfactory</option>
              <option value="deficient">Deficient</option>
            </select>
          </div>`).join('')}
        <div class="form-group full" id="doc-deficiency-wrap" style="display:none">
          <label>Deficiency notes (required)</label>
          <textarea id="doc-deficiency-notes"></textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Section 6 — Next call adjustment (optional)</div>
      <div class="form-group">
        <label>Specific adjustment for next similar call</label>
        <textarea id="dca-next-call" placeholder="Describe the behavioral or clinical adjustment…"></textarea>
      </div>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:32px">
      <button class="btn" onclick="renderCandidateOverview()">Cancel</button>
      <button class="btn btn-primary" style="margin-left:auto" id="submit-dca-btn" onclick="submitDca()">Submit DCA</button>
    </div>
  </div>`);
}

function selectScore(domain, type, value) {
  if (!dcaScores[domain]) dcaScores[domain] = {};
  dcaScores[domain][type] = value;

  for (let n = 1; n <= 5; n++) {
    const btn = document.getElementById(`score-${domain}-${type}-${n}`);
    if (!btn) continue;
    btn.classList.remove('selected','gap-selected');
    if (n === value) btn.classList.add('selected');
  }

  const dem = dcaScores[domain]?.demand;
  const cap = dcaScores[domain]?.capability;
  const gapInd = document.getElementById(`gap-ind-${domain}`);
  const obsReq  = document.getElementById(`obs-req-${domain}`);

  if (dem && cap) {
    const hasGap = dem > cap;
    if (gapInd) gapInd.style.display = hasGap ? 'inline-flex' : 'none';
    if (obsReq)  obsReq.style.display  = hasGap ? 'inline' : 'none';
    if (hasGap) {
      const capBtn = document.getElementById(`score-${domain}-capability-${cap}`);
      if (capBtn) { capBtn.classList.remove('selected'); capBtn.classList.add('gap-selected'); }
    }
  }
}

function toggleIntervention() {
  const val = document.getElementById('dca-trigger').value;
  document.getElementById('intervention-section').style.display =
    val === 'safety_intervention' ? 'block' : 'none';
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
    if (dn !== 'd4' && !dcaScores[dn]?.capability) {
      errEl.textContent = `Please score capability for ${DOMAIN_LABELS[dn]}.`;
      errEl.style.display = 'block';
      errEl.scrollIntoView({ behavior:'smooth' });
      return;
    }
  }

  const btn = document.getElementById('submit-dca-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = {
    candidate_id: selectedCandidate.id,
    fti_id: currentProfile.id,
    phase: selectedCandidate.current_phase,
    incident_date: date,
    incident_number: document.getElementById('dca-incident').value || null,
    epcrlink: document.getElementById('dca-epcrlink').value || null,
    acuity, trigger_type: trigger,
    intervention_prompt:          document.getElementById('dca-int-prompt')?.value || null,
    intervention_action:          document.getElementById('dca-int-action')?.value || null,
    intervention_patient_affected: document.getElementById('dca-int-affected')?.value === 'yes',
    intervention_description:     document.getElementById('dca-int-description')?.value || null,
    d1_demand: dcaScores.d1?.demand, d1_capability: dcaScores.d1?.capability,
    d1_notes: document.getElementById('notes-d1')?.value || null,
    d2_demand: dcaScores.d2?.demand, d2_capability: dcaScores.d2?.capability,
    d2_notes: document.getElementById('notes-d2')?.value || null,
    d3_demand: dcaScores.d3?.demand, d3_capability: dcaScores.d3?.capability,
    d3_notes: document.getElementById('notes-d3')?.value || null,
    d4_demand: dcaScores.d4?.demand,
    d5_demand: dcaScores.d5?.demand, d5_capability: dcaScores.d5?.capability,
    d5_notes: document.getElementById('notes-d5')?.value || null,
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
    return;
  }

  // Auto-create gap records
  const gaps = [];
  for (const dn of [1,2,3,5]) {
    const dem = dcaScores[`d${dn}`]?.demand;
    const cap = dcaScores[`d${dn}`]?.capability;
    if (dem && cap && dem > cap) {
      const notes = document.getElementById(`notes-d${dn}`)?.value || '';
      gaps.push({
        dca_id: dca.id,
        candidate_id: selectedCandidate.id,
        domain_number: dn,
        domain_name: DOMAIN_LABELS[`d${dn}`],
        gap_description: `Gap on ${date}: demand ${dem}, capability ${cap}${notes ? '. ' + notes : ''}`.trim(),
        status: 'open'
      });
    }
  }
  if (gaps.length > 0) await db.from('capability_gaps').insert(gaps);

  document.getElementById('dca-success').textContent =
    `DCA saved.${gaps.length > 0 ? ` ${gaps.length} capability gap(s) created automatically.` : ' No gaps identified.'}`;
  document.getElementById('dca-success').style.display = 'block';
  document.getElementById('dca-success').scrollIntoView({ behavior:'smooth' });

  setTimeout(() => renderCandidateOverview(), 1800);
}

// pages/sam-conferences.js — Initial Alignment, Midpoint Calibration, Pre-Capstone

async function renderConferenceList() {
  destroyCharts();
  const c = selectedCandidate;
  setMain('<div class="page"><div class="loading">Loading conferences…</div></div>');

  const { data: conferences } = await db
    .from('sam_conferences')
    .select('*')
    .eq('candidate_id', c.id)
    .order('conference_date');

  const confMap = {};
  (conferences || []).forEach(conf => { confMap[conf.conference_type] = conf; });

  const rows = CONFERENCE_TYPES.map(ct => {
    const conf = confMap[ct.value];
    return `<tr>
      <td style="font-weight:500">${ct.label}</td>
      <td>${conf ? formatDate(conf.conference_date) : '<span style="color:var(--muted)">Not completed</span>'}</td>
      <td>${conf
        ? `<span style="color:var(--green);font-family:var(--mono);font-size:11px">COMPLETE</span>`
        : `<span style="color:var(--amber);font-family:var(--mono);font-size:11px">PENDING</span>`}</td>
      <td>
        <button class="btn btn-sm" onclick="renderConferenceForm('${ct.value}')">
          ${conf ? 'View / Edit' : 'Start'}
        </button>
      </td>
    </tr>`;
  }).join('');

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${c.full_name} — SAM Conferences</h1>
    ${candidateTabs('conferences')}

    ${alertHTML('info', 'All three SAM Conference records are required for program completion. Conferences must include the Candidate, FTI, and SAM Officer.')}

    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Conference</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </div>`);
}

async function renderConferenceForm(type) {
  destroyCharts();
  const c = selectedCandidate;
  setMain('<div class="page"><div class="loading">Loading…</div></div>');

  const { data: existing } = await db
    .from('sam_conferences')
    .select('*')
    .eq('candidate_id', c.id)
    .eq('conference_type', type)
    .maybeSingle();

  const [ftis, sams] = await Promise.all([
    fetchProfiles('fti'),
    fetchProfiles('sam_officer')
  ]);

  const d = existing || {};
  const title = CONFERENCE_TYPES.find(ct => ct.value === type)?.label || type;

  function ftiOptions() {
    return ftis.map(f => `<option value="${f.id}" ${d.fti_id===f.id?'selected':''}>${f.full_name}</option>`).join('');
  }
  function samOptions() {
    return sams.map(s => `<option value="${s.id}" ${d.sam_id===s.id?'selected':''}>${s.full_name}</option>`).join('');
  }

  // Shared header fields
  const headerFields = `
    <div class="form-grid">
      <div class="form-group">
        <label>Conference date *</label>
        <input type="date" id="conf-date" value="${d.conference_date||new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Hours completed to date</label>
        <input type="number" id="conf-hours" value="${d.hours_at_conference||''}" placeholder="e.g. 192" />
      </div>
      <div class="form-group">
        <label>SAM Officer *</label>
        <select id="conf-sam">
          <option value="">Select…</option>
          ${samOptions()}
        </select>
      </div>
      <div class="form-group">
        <label>FTI *</label>
        <select id="conf-fti">
          <option value="">Select…</option>
          ${ftiOptions()}
        </select>
      </div>
    </div>`;

  let typeFields = '';

  if (type === 'initial_alignment') {
    typeFields = `
      <div class="card">
        <div class="card-title">Section 2 — Candidate background</div>
        <div class="form-group mb-2">
          <label>Prior EMS experience (certifications, years, prior agency)</label>
          <textarea id="conf-prior-ems">${d.prior_ems_experience||''}</textarea>
        </div>
        <div class="form-group mb-2">
          <label>Prior clinical experience relevant to paramedic practice</label>
          <textarea id="conf-prior-clinical">${d.prior_clinical_experience||''}</textarea>
        </div>
        <div class="form-group mb-2">
          <label>Self-identified strengths</label>
          <textarea id="conf-strengths">${d.self_identified_strengths||''}</textarea>
        </div>
        <div class="form-group mb-2">
          <label>Self-identified areas for development</label>
          <textarea id="conf-development">${d.self_identified_development||''}</textarea>
        </div>
        <div class="form-group">
          <label>Learning style / preferences noted by FTI</label>
          <textarea id="conf-learning-style">${d.learning_style_notes||''}</textarea>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Section 3 — Program expectations reviewed</div>
        ${alertHTML('info', 'Confirm the following were reviewed with the candidate before signing.')}
        <div class="checklist">
          ${['Phase structure and advancement criteria (Phases I–IV)',
             'DCA trigger criteria and scoring framework',
             'Critical Domain requirements and phase advancement implications',
             'Documentation requirements and standards',
             'Capability Gap identification and closure process',
             'Extension process and timeline',
             'Capstone structure and completion requirements',
             'Candidate Pay Upgrade Agreement terms (Paramedic Cadets only)'
            ].map(item => `<div class="check-row">
              <input type="checkbox" id="chk-${item.substring(0,10).replace(/\s/g,'')}" checked />
              <label style="font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:13px;color:var(--text)">${item}</label>
            </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Section 5 — Goals for Phase II</div>
        <div class="form-group mb-2">
          <label>Goal 1</label>
          <input type="text" id="conf-goal-1" value="${(d.goals_phase_ii||[])[0]||''}" placeholder="e.g. Develop organized primary assessment on all ALS calls" />
        </div>
        <div class="form-group mb-2">
          <label>Goal 2</label>
          <input type="text" id="conf-goal-2" value="${(d.goals_phase_ii||[])[1]||''}" />
        </div>
        <div class="form-group">
          <label>Goal 3</label>
          <input type="text" id="conf-goal-3" value="${(d.goals_phase_ii||[])[2]||''}" />
        </div>
      </div>`;
  }

  if (type === 'midpoint_calibration') {
    typeFields = `
      <div class="card">
        <div class="card-title">Section 2 — DCA review</div>
        <div class="form-grid">
          <div class="form-group">
            <label>Total DCAs completed to date</label>
            <input type="number" id="conf-dca-count" value="${d.total_dcas_completed||''}" />
          </div>
        </div>
        <div class="form-group mb-2" style="margin-top:12px">
          <label>Domains showing consistent strength</label>
          <textarea id="conf-strengths-domains">${d.domains_strength||''}</textarea>
        </div>
        <div class="form-group">
          <label>Domains showing persistent gaps or need for development</label>
          <textarea id="conf-dev-domains">${d.domains_needing_development||''}</textarea>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Section 4 — FTI effectiveness review</div>
        <div class="form-group mb-2">
          <label>Is the candidate responding to coaching?</label>
          <select id="conf-coaching-response">
            <option value="">Select…</option>
            <option value="yes" ${d.fti_responding_to_coaching==='yes'?'selected':''}>Yes</option>
            <option value="partially" ${d.fti_responding_to_coaching==='partially'?'selected':''}>Partially</option>
            <option value="no" ${d.fti_responding_to_coaching==='no'?'selected':''}>No</option>
          </select>
        </div>
        <div class="form-group mb-2">
          <label>SAM Officer assessment of FTI effectiveness</label>
          <textarea id="conf-fti-effectiveness">${d.fti_effectiveness_notes||''}</textarea>
        </div>
        <div class="form-group mb-2">
          <label>Concerns about FTI-candidate dynamic or evaluation consistency?</label>
          <select id="conf-dynamic-concern" onchange="toggleDynamicNote()">
            <option value="false" ${!d.fti_candidate_dynamic_concern?'selected':''}>No</option>
            <option value="true" ${d.fti_candidate_dynamic_concern?'selected':''}>Yes</option>
          </select>
        </div>
        <div id="dynamic-note-wrap" style="display:${d.fti_candidate_dynamic_concern?'block':'none'}" class="form-group">
          <label>Describe concern</label>
          <textarea id="conf-dynamic-notes">${d.fti_dynamic_notes||''}</textarea>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Section 5 — Phase III advancement</div>
        <div class="form-group mb-2">
          <label>Candidate approved to advance to Phase III?</label>
          <select id="conf-p3-approved">
            <option value="">Select…</option>
            <option value="yes" ${d.phase_iii_approved==='yes'?'selected':''}>Yes</option>
            <option value="conditional" ${d.phase_iii_approved==='conditional'?'selected':''}>Conditional</option>
            <option value="no" ${d.phase_iii_approved==='no'?'selected':''}>No</option>
          </select>
        </div>
        <div class="form-group mb-2">
          <label>If conditional or no — describe requirements or plan</label>
          <textarea id="conf-p3-conditions">${d.phase_iii_conditions||''}</textarea>
        </div>
        <div class="form-group mb-2">
          <label>Goal 1 for Phase III</label>
          <input type="text" id="conf-p3-goal-1" value="${(d.goals_phase_iii||[])[0]||''}" />
        </div>
        <div class="form-group mb-2">
          <label>Goal 2</label>
          <input type="text" id="conf-p3-goal-2" value="${(d.goals_phase_iii||[])[1]||''}" />
        </div>
        <div class="form-group">
          <label>Goal 3</label>
          <input type="text" id="conf-p3-goal-3" value="${(d.goals_phase_iii||[])[2]||''}" />
        </div>
      </div>`;
  }

  if (type === 'pre_capstone_readiness') {
    typeFields = `
      <div class="card">
        <div class="card-title">Section 2 — Minimum requirements checklist</div>
        ${alertHTML('warn', 'All items must be confirmed complete before Capstone approval is granted.')}
        <div class="checklist">
          ${[
            { id:'req-dca-p1',   label:'Minimum one DCA completed in Phase I' },
            { id:'req-midpoint', label:'Midpoint Calibration SAM Conference completed' },
            { id:'req-gaps-p2',  label:'All Phase II Critical Domain gaps closed and documented' },
            { id:'req-gaps-p3',  label:'All Phase III Critical Domain gaps closed and documented' },
            { id:'req-phase-rec',label:'Phase transition records completed for each advancement' },
            { id:'req-primary',  label:'Candidate functioning as Primary Paramedic on Phase IV calls' },
            { id:'req-doc',      label:'Documentation quality consistently satisfactory' }
          ].map(r => `<div class="check-row">
            <input type="checkbox" id="${r.id}" />
            <label style="font-family:var(--sans);text-transform:none;letter-spacing:0;font-size:13px;color:var(--text)">${r.label}</label>
          </div>`).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Section 3 — Readiness assessment</div>
        <div class="form-group mb-2">
          <label>Summary of candidate performance in Phase IV to date</label>
          <textarea id="conf-p4-summary">${d.readiness_assessment||''}</textarea>
        </div>
        <div class="form-group mb-2">
          <label>FTI assessment of candidate readiness</label>
          <select id="conf-readiness">
            <option value="">Select…</option>
            <option value="ready" ${d.fti_readiness_notes==='ready'?'selected':''}>Ready — consistent performance, no unresolved gaps</option>
            <option value="conditionally_ready" ${d.fti_readiness_notes==='conditionally_ready'?'selected':''}>Conditionally ready — minor concerns noted</option>
            <option value="not_ready" ${d.fti_readiness_notes==='not_ready'?'selected':''}>Not ready — recommend continued Phase IV or regression</option>
          </select>
        </div>
        <div class="form-group mb-2">
          <label>FTI notes</label>
          <textarea id="conf-fti-notes">${d.fti_effectiveness_notes||''}</textarea>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Section 4 — Capstone design</div>
        <div class="form-group mb-2">
          <label>Capstone approved?</label>
          <select id="conf-capstone-approved">
            <option value="">Select…</option>
            <option value="true" ${d.capstone_approved===true?'selected':''}>Yes — proceed to Capstone</option>
            <option value="false" ${d.capstone_approved===false?'selected':''}>No — requirements not yet met</option>
          </select>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Scheduled Capstone date</label>
            <input type="date" id="conf-capstone-date" value="${d.capstone_scheduled_date||''}" />
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" id="conf-capstone-location" value="${d.capstone_location||''}" placeholder="e.g. Station 1 training bay" />
          </div>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Scenario design notes (min demand score 3 all domains, min 4 in Clinical Mgmt and Motor Skills)</label>
          <textarea id="conf-scenario-notes">${d.capstone_scenario_notes||''}</textarea>
        </div>
      </div>`;
  }

  setMain(`<div class="page">
    ${backToCandidate('SAM Conferences')}
    <h1 class="section-title">${c.full_name} — ${title}</h1>
    ${candidateTabs('conferences')}

    <div id="conf-error"   class="alert alert-error"   style="display:none"></div>
    <div id="conf-success" class="alert alert-success" style="display:none"></div>

    <div class="card">
      <div class="card-title">Section 1 — Administrative</div>
      ${headerFields}
    </div>

    ${typeFields}

    <div style="display:flex;gap:12px;margin-bottom:32px">
      <button class="btn" onclick="renderConferenceList()">Cancel</button>
      <button class="btn btn-primary" style="margin-left:auto" onclick="saveConference('${type}', '${existing?.id||''}')">
        ${existing ? 'Update record' : 'Save conference record'}
      </button>
    </div>
  </div>`);
}

function toggleDynamicNote() {
  const val = document.getElementById('conf-dynamic-concern').value;
  document.getElementById('dynamic-note-wrap').style.display = val === 'true' ? 'block' : 'none';
}

async function saveConference(type, existingId) {
  const errEl = document.getElementById('conf-error');
  errEl.style.display = 'none';

  const samId  = document.getElementById('conf-sam').value;
  const ftiId  = document.getElementById('conf-fti').value;
  const date   = document.getElementById('conf-date').value;

  if (!samId || !ftiId || !date) {
    errEl.textContent = 'SAM Officer, FTI, and conference date are required.';
    errEl.style.display = 'block';
    return;
  }

  const payload = {
    candidate_id:       selectedCandidate.id,
    conference_type:    type,
    sam_id:             samId,
    fti_id:             ftiId,
    conference_date:    date,
    hours_at_conference: parseFloat(document.getElementById('conf-hours')?.value) || null,
  };

  if (type === 'initial_alignment') {
    Object.assign(payload, {
      prior_ems_experience:        document.getElementById('conf-prior-ems')?.value || null,
      prior_clinical_experience:   document.getElementById('conf-prior-clinical')?.value || null,
      self_identified_strengths:   document.getElementById('conf-strengths')?.value || null,
      self_identified_development: document.getElementById('conf-development')?.value || null,
      learning_style_notes:        document.getElementById('conf-learning-style')?.value || null,
      goals_phase_ii: [
        document.getElementById('conf-goal-1')?.value,
        document.getElementById('conf-goal-2')?.value,
        document.getElementById('conf-goal-3')?.value
      ].filter(Boolean)
    });
  }

  if (type === 'midpoint_calibration') {
    Object.assign(payload, {
      total_dcas_completed:           parseInt(document.getElementById('conf-dca-count')?.value)||null,
      domains_strength:               document.getElementById('conf-strengths-domains')?.value || null,
      domains_needing_development:    document.getElementById('conf-dev-domains')?.value || null,
      fti_responding_to_coaching:     document.getElementById('conf-coaching-response')?.value || null,
      fti_effectiveness_notes:        document.getElementById('conf-fti-effectiveness')?.value || null,
      fti_candidate_dynamic_concern:  document.getElementById('conf-dynamic-concern')?.value === 'true',
      fti_dynamic_notes:              document.getElementById('conf-dynamic-notes')?.value || null,
      phase_iii_approved:             document.getElementById('conf-p3-approved')?.value || null,
      phase_iii_conditions:           document.getElementById('conf-p3-conditions')?.value || null,
      goals_phase_iii: [
        document.getElementById('conf-p3-goal-1')?.value,
        document.getElementById('conf-p3-goal-2')?.value,
        document.getElementById('conf-p3-goal-3')?.value
      ].filter(Boolean)
    });
  }

  if (type === 'pre_capstone_readiness') {
    Object.assign(payload, {
      readiness_assessment:     document.getElementById('conf-p4-summary')?.value || null,
      fti_readiness_notes:      document.getElementById('conf-readiness')?.value || null,
      fti_effectiveness_notes:  document.getElementById('conf-fti-notes')?.value || null,
      capstone_approved:        document.getElementById('conf-capstone-approved')?.value === 'true',
      capstone_scheduled_date:  document.getElementById('conf-capstone-date')?.value || null,
      capstone_location:        document.getElementById('conf-capstone-location')?.value || null,
      capstone_scenario_notes:  document.getElementById('conf-scenario-notes')?.value || null
    });
  }

  let error;
  if (existingId) {
    ({ error } = await db.from('sam_conferences').update(payload).eq('id', existingId));
  } else {
    ({ error } = await db.from('sam_conferences').insert(payload));
  }

  if (error) {
    errEl.textContent = error.message;
    errEl.style.display = 'block';
    return;
  }

  document.getElementById('conf-success').textContent = 'Conference record saved.';
  document.getElementById('conf-success').style.display = 'block';
  setTimeout(() => renderConferenceList(), 1400);
}

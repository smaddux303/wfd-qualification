// pages/reference.js — DCA quick reference (updated for v10.1 manual)

function renderReference() {
  setActiveNav('reference');
  destroyCharts();
  selectedCandidate = null;

  const domainCards = Object.entries(DOMAIN_LABELS).map(([key, name]) => {
    const isCrit = DOMAIN_CRITICAL[key];
    const demandRows = DEMAND_DESCRIPTORS[key].map((d, i) =>
      `<div class="ref-score-row">
        <span class="ref-num">${i+1}</span>
        <span class="ref-desc">${d}</span>
      </div>`).join('');

    const capRows = CAP_DESCRIPTORS[key]
      ? CAP_DESCRIPTORS[key].map((d, i) =>
          `<div class="ref-score-row">
            <span class="ref-num cap">${i+1}</span>
            <span class="ref-desc">${d}</span>
          </div>`).join('')
      : null;

    const d4Note = key === 'd4' ? `
      <div class="alert alert-info" style="margin-top:10px;font-size:12px">
        <strong>Cadence scoring (v10.1):</strong> A high score means pace was appropriately matched to the situation —
        not necessarily fast. On low-acuity calls, high cadence reflects patience and attentiveness.
        On high-acuity calls, high cadence reflects urgency and decisiveness.
        A formal gap exists only when demand exceeds capability (under-urgency).
        Over-urgency on a low-demand call is a calibration concern — document in narrative but does not create a formal gap.
      </div>` : '';

    return `<div class="card">
      <div class="domain-header" style="margin-bottom:14px">
        <span class="domain-title">${name}</span>
        ${isCrit ? criticalTag() : ''}
        ${key === 'd4' ? '<span style="font-size:10px;font-family:var(--mono);color:var(--amber);border:1px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.1);padding:1px 7px;border-radius:20px">Updated v10.1</span>' : ''}
      </div>
      <div class="ref-cols">
        <div>
          <p style="font-size:10px;font-family:var(--mono);color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.08em">
            ${key === 'd4' ? 'Demand — Time Pressure' : 'Demand'}
          </p>
          ${demandRows}
        </div>
        ${capRows ? `<div>
          <p style="font-size:10px;font-family:var(--mono);color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.08em">
            ${key === 'd4' ? 'Capability — Cadence' : 'Capability'}
          </p>
          ${capRows}
        </div>` : ''}
      </div>
      ${d4Note}
    </div>`;
  }).join('');

  const triggerRows = TRIGGERS.map(t =>
    `<div class="ref-score-row"><span class="ref-num">→</span><span class="ref-desc">${t.label}</span></div>`
  ).join('');

  const closureRows = CLOSURE_PATHWAYS.map(p =>
    `<div class="ref-score-row"><span class="ref-num">→</span><span class="ref-desc">${p.label}</span></div>`
  ).join('');

  setMain(`<div class="page">
    <h1 class="section-title">DCA Quick Reference</h1>
    <p class="text-muted mb-3">Based on WFD Paramedic Qualification Manual v10.1 — governed by the WFD Firefighter Paramedic Qualification Program Directive.</p>

    ${domainCards}

    <div class="card">
      <div class="card-title">DCA trigger criteria (Section 3.3)</div>
      ${triggerRows}
      <div class="alert alert-info" style="margin-top:12px;font-size:12px">
        <strong>Phase transition DCAs (v10.1):</strong> Must have a minimum Demand score of 3 across all domains.
        A low-acuity shift cannot be used to support a phase transition evaluation.
        Contact the SAM Officer to arrange a structured simulation scenario if field conditions are insufficient.
      </div>
    </div>

    <div class="card">
      <div class="card-title">Gap closure pathways (Section 3.4)</div>
      ${closureRows}
      <p class="text-muted mt-2">Gap closure must be documented. Undocumented closure does not count. Critical Domain gaps (Clinical Management, Motor Skills) must be closed before phase advancement.</p>
    </div>

    <div class="card">
      <div class="card-title">Acuity levels</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">G</span><span class="ref-desc">Green — low risk, reversible error. High discretion.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--amber)">Y</span><span class="ref-desc">Yellow — moderate risk, limited discretion.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--red)">R</span><span class="ref-desc">Red — high risk, non-discretionary, irreversible error. Carries more evaluative weight.</span></div>
    </div>

    <div class="card">
      <div class="card-title">Phase structure (Section 3.5)</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--accent)">I</span><span class="ref-desc">Orientation and observation. Candidate observes FTI and assists as directed. FTI models and narrates decisions.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--accent)">II</span><span class="ref-desc">Guided practice. Candidate performs assessment and begins leading calls under close FTI supervision and coaching.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--accent)">III</span><span class="ref-desc">Supervised leadership. Candidate functions as team leader on most calls. FTI allows autonomy, intervenes only for safety.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--accent)">IV</span><span class="ref-desc">Capstone (called Independent Practice Evaluation in this app). Candidate functions as primary paramedic. FTI observes and evaluates. Intervention threshold is patient safety and Directive violations only.</span></div>
    </div>

    <div class="card">
      <div class="card-title">Qualification timeline (Section 3.9)</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">Min</span><span class="ref-desc">384 on-shift hours — minimum before Independent Practice Evaluation (Capstone) attempt</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">Std</span><span class="ref-desc">768 on-shift hours — standard maximum window</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--amber)">+1</span><span class="ref-desc">First extension: up to 384 additional hours (total 1,152). Requires Extension Conference, written improvement plan, and EMS Chief approval.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--red)">+2</span><span class="ref-desc">Second extension: up to 384 more hours (absolute maximum 1,536). Requires independent conference and must address first extension deficiencies.</span></div>
      <p class="text-muted mt-2">Hours are on-shift hours only. Non-qualifying staffing configurations excluded per Directive Section 6.2.</p>
    </div>

    <div class="card">
      <div class="card-title">Independent Practice Evaluation pass criteria (Manual Section 3.6 — "Capstone")</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Minimum capability score of 4 in all domains (out of 25 total)</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Compression fraction greater than 90%</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">No compression pause greater than 10 seconds</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Successful advanced airway management</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Effective CRM throughout</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">No FTI safety intervention required</span></div>
      <p class="text-muted mt-2">Scenario minimum: demand score ≥ 3 in all domains, ≥ 4 in Clinical Management and Motor Skills.</p>
    </div>

    <div class="card">
      <div class="card-title">NREMT certification — Paramedic Cadets (Section 2.6)</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">6</span><span class="ref-desc">Total examination attempts permitted</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--amber)">3</span><span class="ref-desc">After three unsuccessful attempts: must submit documentation of 30 NCCP competency credits before further attempts</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">15d</span><span class="ref-desc">Minimum wait between attempts (from date results posted — day 1 is posting date)</span></div>
      <p class="text-muted mt-2">Failure to certify within six attempts or the one-year compensation window results in return to Firefighter/EMT status per the governing Directive.</p>
    </div>

    <div class="card">
      <div class="card-title">Paramedic-On-Hire pathway (Section 3.8)</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">~8mo</span><span class="ref-desc"><strong>Phases I & II — Firefighter Qualification:</strong> Assigned to Engine/Truck companies under a Promoted Officer. Full duty-to-act applies. Medical Director QM provides clinical oversight. WFD Paramedic Qualification Program has not yet begun.</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--accent)">~2-3mo</span><span class="ref-desc"><strong>Phase III — WFD Paramedic Qualification Program:</strong> Assigned as third crewmember on Medic unit. Supervised and evaluated by designated FTI. Module B begins here. Replaces standard Phase III EMS component of the Firefighter Qualification Process.</span></div>
      <p class="text-muted mt-2">Prior experience does not exempt a Candidate from completing all phase requirements and the Independent Practice Evaluation (Capstone).</p>
    </div>

    <div class="card">
      <div class="card-title">Key manual references</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§3.2</span><span class="ref-desc">Evaluation framework and domain descriptions</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§3.3</span><span class="ref-desc">DCA trigger criteria and phase transition minimum demand requirement</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§3.4</span><span class="ref-desc">Capability gaps and closure pathways</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§3.5</span><span class="ref-desc">Clinical qualification phases I–IV</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§3.6</span><span class="ref-desc">Independent Practice Evaluation requirements (called Capstone in the Manual)</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§3.9</span><span class="ref-desc">Timeline, extensions (two available), and formal failure</span></div>
      <p class="text-muted mt-2">This program is governed by the WFD Firefighter Paramedic Qualification Program Directive. Where a conflict exists between this app and the Directive, the Directive controls.</p>
    </div>
  </div>`);
}

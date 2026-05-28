// pages/reference.js — DCA quick reference page

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

    const capRows = key !== 'd4' && CAP_DESCRIPTORS[key]
      ? CAP_DESCRIPTORS[key].map((d, i) =>
          `<div class="ref-score-row">
            <span class="ref-num cap">${i+1}</span>
            <span class="ref-desc">${d}</span>
          </div>`).join('')
      : null;

    return `<div class="card">
      <div class="domain-header" style="margin-bottom:14px">
        <span class="domain-title">${name}</span>
        ${isCrit ? criticalTag() : ''}
      </div>
      <div class="${capRows ? 'ref-cols' : ''}">
        <div>
          <p style="font-size:10px;font-family:var(--mono);color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.08em">Demand</p>
          ${demandRows}
        </div>
        ${capRows ? `<div>
          <p style="font-size:10px;font-family:var(--mono);color:var(--muted);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.08em">Capability</p>
          ${capRows}
        </div>` : ''}
      </div>
      ${key === 'd4' ? alertHTML('info', 'Time Pressure is demand-only — no capability score. A score of 3 capability on a Time Pressure 5 call carries more weight than the same score on a Time Pressure 1 call.') : ''}
    </div>`;
  }).join('');

  const triggerRows = TRIGGERS.map(t =>
    `<div class="ref-score-row"><span class="ref-num">→</span><span class="ref-desc">${t.label}</span></div>`
  ).join('');

  const closureRows = CLOSURE_PATHWAYS.map(p =>
    `<div class="ref-score-row"><span class="ref-num">→</span><span class="ref-desc">${p.label}</span></div>`
  ).join('');

  const acuityRows = [
    { color:'var(--green)', label:'G', desc:'Green — low risk, reversible error. High discretion.' },
    { color:'var(--amber)', label:'Y', desc:'Yellow — moderate risk, limited discretion.' },
    { color:'var(--red)',   label:'R', desc:'Red — high risk, non-discretionary, irreversible error. Carries more evaluative weight.' }
  ].map(a =>
    `<div class="ref-score-row">
      <span class="ref-num" style="color:${a.color}">${a.label}</span>
      <span class="ref-desc">${a.desc}</span>
    </div>`).join('');

  const phaseRows = [
    { phase:'I',   desc:'Orientation and observation. Candidate observes FTI and assists as directed. FTI models and narrates decisions.' },
    { phase:'II',  desc:'Guided practice. Candidate performs assessment and begins leading calls under close FTI supervision and coaching.' },
    { phase:'III', desc:'Supervised leadership. Candidate functions as team leader on most calls. FTI allows autonomy, intervenes only for safety.' },
    { phase:'IV',  desc:'Capstone. Candidate functions as primary paramedic. FTI observes and evaluates. Intervention threshold is patient safety only.' }
  ].map(p =>
    `<div class="ref-score-row">
      <span class="ref-num" style="color:var(--accent)">${p.phase}</span>
      <span class="ref-desc">${p.desc}</span>
    </div>`).join('');

  setMain(`<div class="page">
    <h1 class="section-title">DCA Quick Reference</h1>
    ${domainCards}

    <div class="card">
      <div class="card-title">DCA trigger criteria</div>
      ${triggerRows}
      <p class="text-muted mt-2">FTIs may also use clinical judgment to trigger a DCA when a call has significant evaluative value even without meeting a listed criterion.</p>
    </div>

    <div class="card">
      <div class="card-title">Gap closure pathways</div>
      ${closureRows}
      <p class="text-muted mt-2">Gap closure must be documented. Undocumented closure does not count. Critical Domain gaps (Clinical Management, Motor Skills) must be closed before phase advancement.</p>
    </div>

    <div class="card">
      <div class="card-title">Acuity levels</div>
      ${acuityRows}
    </div>

    <div class="card">
      <div class="card-title">Phase structure</div>
      ${phaseRows}
    </div>

    <div class="card">
      <div class="card-title">Capstone pass criteria (Section 3.7)</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Minimum capability score of 4 in all domains</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Compression fraction greater than 90%</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">No compression pause greater than 10 seconds</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Successful advanced airway management</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">Effective CRM throughout</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--green)">✓</span><span class="ref-desc">No FTI safety intervention required</span></div>
      <p class="text-muted mt-2">Scenario minimum: demand score ≥ 3 in all domains, ≥ 4 in Clinical Management and Motor Skills.</p>
    </div>

    <div class="card">
      <div class="card-title">Key manual references</div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§</span><span class="ref-desc">Section 3.2 — Evaluation framework and domain descriptions</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§</span><span class="ref-desc">Section 3.3 — DCA trigger criteria</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§</span><span class="ref-desc">Section 3.4 — Capability gaps and closure pathways</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§</span><span class="ref-desc">Section 3.5 — Field internship phases I–IV</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§</span><span class="ref-desc">Section 3.7 — Capstone evaluation requirements</span></div>
      <div class="ref-score-row"><span class="ref-num" style="color:var(--muted)">§</span><span class="ref-desc">Section 3.9 — Timeline, extensions, and formal failure</span></div>
    </div>
  </div>`);
}

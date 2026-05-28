// pages/phase-transitions.js — Phase log and advancement/regression

async function renderPhaseLog() {
  destroyCharts();
  const c = selectedCandidate;
  setMain('<div class="page"><div class="loading">Loading phase log…</div></div>');

  const { data: transitions } = await db
    .from('phase_transitions')
    .select('*, sam:sam_id(full_name), fti:fti_id(full_name)')
    .eq('candidate_id', c.id)
    .order('created_at');

  const canManagePhase = ['sam_officer','admin'].includes(currentProfile?.role);

  const rows = !transitions || transitions.length === 0
    ? '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:24px">No phase transitions recorded yet.</td></tr>'
    : transitions.map(t => {
        const dirColor = t.direction === 'advance' ? 'var(--green)' : 'var(--red)';
        const arrow    = t.direction === 'advance' ? '↑' : '↓';
        return `<tr>
          <td>${formatDate(t.created_at)}</td>
          <td style="font-family:var(--mono);color:${dirColor}">${arrow} ${t.from_phase||'—'} → ${t.to_phase}</td>
          <td style="color:${dirColor};font-family:var(--mono);font-size:11px">${t.direction.toUpperCase()}</td>
          <td style="font-size:12px;color:var(--muted)">${t.sam?.full_name||'—'}</td>
          <td style="font-size:12px;color:var(--muted)">${t.basis||'—'}</td>
        </tr>`;
      }).join('');

  const phaseForm = canManagePhase ? `
    <div class="card">
      <div class="card-title">Log phase transition</div>
      ${alertHTML('warn', 'Phase advancement requires: all Critical Domain gaps closed, SAM Conference completed for the current phase, and SAM Officer approval.')}
      <div class="form-grid">
        <div class="form-group">
          <label>Direction</label>
          <select id="pt-direction">
            <option value="advance">Advance to next phase</option>
            <option value="regress">Regress to previous phase</option>
          </select>
        </div>
        <div class="form-group">
          <label>Target phase</label>
          <select id="pt-target-phase">
            ${PHASES.map(p => `<option value="${p}" ${p===c.current_phase?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Hours at transition</label>
          <input type="number" id="pt-hours" value="${c.qualifying_hours}" />
        </div>
        <div class="form-group full">
          <label>Basis for transition * (required — specific justification)</label>
          <textarea id="pt-basis" placeholder="e.g. Candidate has demonstrated consistent organized assessment and appropriate treatment planning across 8 DCAs in Phase II. All Critical Domain gaps closed. Midpoint Calibration completed. SAM Officer approved advancement."></textarea>
        </div>
      </div>
      <div id="pt-error" class="alert alert-error" style="display:none;margin-top:12px"></div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="savePhaseTransition()">Log transition</button>
    </div>` : '';

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${c.full_name} — Phase Log</h1>
    ${candidateTabs('phase')}

    <div class="metric-row" style="grid-template-columns:1fr 1fr">
      <div class="metric">
        <div class="metric-label">Current phase</div>
        <div class="metric-value">${c.current_phase}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Hours logged</div>
        <div class="metric-value">${c.qualifying_hours}h</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:16px">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Transition</th><th>Direction</th><th>SAM Officer</th><th>Basis</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    ${phaseForm}
    ${!canManagePhase ? alertHTML('info', 'Phase transitions are logged by SAM Officers and admins.') : ''}
  </div>`);
}

async function savePhaseTransition() {
  const errEl = document.getElementById('pt-error');
  errEl.style.display = 'none';

  const direction   = document.getElementById('pt-direction').value;
  const targetPhase = document.getElementById('pt-target-phase').value;
  const basis       = document.getElementById('pt-basis').value.trim();
  const hours       = parseFloat(document.getElementById('pt-hours').value) || null;

  if (!basis) {
    errEl.textContent = 'Basis for transition is required.';
    errEl.style.display = 'block';
    return;
  }

  const c = selectedCandidate;

  const { error: transErr } = await db.from('phase_transitions').insert({
    candidate_id: c.id,
    sam_id:       currentProfile.id,
    fti_id:       c.assigned_fti_id || null,
    from_phase:   c.current_phase,
    to_phase:     targetPhase,
    direction,
    hours_at_transition: hours,
    basis
  });

  if (transErr) { errEl.textContent = transErr.message; errEl.style.display = 'block'; return; }

  // Update candidate's current phase
  const { error: updateErr } = await db.from('candidates')
    .update({ current_phase: targetPhase, qualifying_hours: hours || c.qualifying_hours })
    .eq('id', c.id);

  if (updateErr) { errEl.textContent = updateErr.message; errEl.style.display = 'block'; return; }

  selectedCandidate = { ...c, current_phase: targetPhase };
  renderPhaseLog();
}

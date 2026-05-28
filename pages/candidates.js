// pages/candidates.js — Candidate list and overview page

async function renderCandidateList() {
  setActiveNav('candidates');
  setMain('<div class="page"><div class="loading">Loading candidates…</div></div>');

  let query = db.from('candidates').select(`
    *, 
    fti:assigned_fti_id(full_name),
    sam:assigned_sam_id(full_name)
  `).order('full_name');

  if (currentProfile?.role === 'fti') {
    query = query.eq('assigned_fti_id', currentProfile.id);
  }

  const { data: candidates } = await query;

  if (!candidates || candidates.length === 0) {
    setMain(`<div class="page">
      <h1 class="section-title">Candidates</h1>
      ${alertHTML('info', 'No active candidates found. Use the Admin panel to add candidates.')}
    </div>`);
    return;
  }

  const rows = candidates.map(c => `
    <tr class="clickable" onclick="openCandidate('${c.id}')">
      <td style="font-weight:500">${c.full_name}</td>
      <td><span style="font-size:12px;color:var(--muted)">${(c.candidate_group||'').replace('_',' ')}</span></td>
      <td>${phaseBadge(c.current_phase)}</td>
      <td style="font-size:12px;color:var(--muted)">${c.fti?.full_name || '—'}</td>
      <td style="font-family:var(--mono);font-size:12px">${c.qualifying_hours}h</td>
      <td><span style="color:var(--green);font-family:var(--mono);font-size:11px">${c.program_status}</span></td>
    </tr>`).join('');

  setMain(`<div class="page">
    <h1 class="section-title">Candidates</h1>
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Group</th><th>Phase</th><th>FTI</th><th>Hours</th><th>Status</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  </div>`);
}

async function openCandidate(id) {
  setMain('<div class="page"><div class="loading">Loading…</div></div>');
  await fetchCandidate(id);
  renderCandidateOverview();
}

async function renderCandidateOverview() {
  const c = selectedCandidate;
  setMain('<div class="page"><div class="loading">Loading…</div></div>');

  const [avg, dcas, gaps] = await Promise.all([
    db.from('candidate_domain_averages').select('*').eq('candidate_id', c.id).single().then(r => r.data),
    fetchDcas(c.id),
    fetchGaps(c.id)
  ]);

  const openGaps     = gaps.filter(g => g.status === 'open').length;
  const criticalOpen = gaps.filter(g => g.status === 'open' && g.is_critical).length;
  const totalDcas    = dcas.length;

  setMain(`<div class="page">
    ${backToList()}

    <div class="page-header">
      <h1 class="section-title" style="margin:0">${c.full_name}</h1>
      ${phaseBadge(c.current_phase)}
      ${criticalOpen > 0 ? '<span class="gap-chip gap-critical"><span class="dot" style="background:var(--red)"></span>Critical gap open — advancement blocked</span>' : ''}
    </div>

    <div class="metric-row">
      <div class="metric">
        <div class="metric-label">DCAs completed</div>
        <div class="metric-value">${totalDcas}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Open gaps</div>
        <div class="metric-value ${openGaps > 0 ? 'red' : 'green'}">${openGaps}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Hours logged</div>
        <div class="metric-value">${c.qualifying_hours}</div>
      </div>
    </div>

    ${candidateTabs('overview')}

    <div class="card">
      <div class="card-title">Demand vs capability — all DCAs averaged</div>
      ${buildGapChips(avg)}
      <div class="chart-legend">
        <span><span class="legend-line" style="background:#4a7cff"></span>Avg demand</span>
        <span><span class="legend-line" style="background:#ff6b6b"></span>Avg capability</span>
      </div>
      <div style="position:relative;height:300px">
        <canvas id="radar-chart" role="img" aria-label="Radar chart of demand vs capability across five DCA domains"></canvas>
      </div>
      <p class="text-muted mt-2">Time Pressure shown as demand only. Gap = capability − demand; negative = behind demand.</p>
    </div>

    ${totalDcas > 1 ? `<div class="card">
      <div class="card-title">Capability trajectory over time</div>
      <div class="chart-legend">
        <span><span class="legend-line" style="background:#534AB7"></span>Assessment</span>
        <span><span class="legend-line" style="background:#E24B4A"></span>Clinical mgmt ⚠</span>
        <span><span class="legend-line" style="background:#D85A30"></span>Motor skills ⚠</span>
        <span><span class="legend-line" style="background:#3ecf8e"></span>CRM</span>
      </div>
      <div style="position:relative;height:220px">
        <canvas id="history-chart" role="img" aria-label="Line chart of capability scores across DCAs"></canvas>
      </div>
    </div>` : totalDcas === 0 ? alertHTML('info', 'No DCAs recorded yet. Use "+ New DCA" to add the first evaluation.') : ''}

    <div class="card">
      <div class="card-title">Candidate information</div>
      <div class="info-grid">
        <div class="info-row"><span class="info-label">Group</span><span>${(c.candidate_group||'').replace('_',' ')}</span></div>
        <div class="info-row"><span class="info-label">Attempt</span><span>${c.attempt_number} of 3</span></div>
        <div class="info-row"><span class="info-label">Program start</span><span>${formatDate(c.program_start_date)}</span></div>
        <div class="info-row"><span class="info-label">Max hours (primary)</span><span style="font-family:var(--mono)">${c.max_hours_primary}h</span></div>
        <div class="info-row"><span class="info-label">Extension granted</span><span>${c.extension_granted ? 'Yes' : 'No'}</span></div>
        ${c.notes ? `<div class="info-row full"><span class="info-label">Notes</span><span>${c.notes}</span></div>` : ''}
      </div>
    </div>
  </div>`);

  buildRadarChart(avg);
  if (totalDcas > 1) buildHistoryChart(dcas);
}

function buildGapChips(avg) {
  if (!avg) return `<p class="text-muted mb-2">No DCAs recorded yet — radar chart will appear after first evaluation.</p>`;
  const domains = [
    { key: 'gap_d1', label: 'Assessment',    critical: false },
    { key: 'gap_d2', label: 'Clinical mgmt', critical: true  },
    { key: 'gap_d3', label: 'Motor skills',  critical: true  },
    { key: 'gap_d5', label: 'CRM',           critical: false }
  ];
  const chips = domains.map(d => {
    const val = parseFloat(avg[d.key]) || 0;
    const cls = val < -0.5 ? (d.critical ? 'gap-critical' : 'gap-warn') : 'gap-ok';
    const dotColor = val < -0.5 ? (d.critical ? 'var(--red)' : 'var(--amber)') : 'var(--green)';
    const sign = val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
    return `<span class="gap-chip ${cls}"><span class="dot" style="background:${dotColor}"></span>${d.label} ${sign}${d.critical && val < -0.5 ? ' ⚠' : ''}</span>`;
  }).join('');
  return `<div class="gap-row"><span class="gap-label">Domain gaps:</span>${chips}</div>`;
}

async function loadAndRenderDcaHistory() {
  setMain('<div class="page"><div class="loading">Loading…</div></div>');
  const dcas = await fetchDcas(selectedCandidate.id);
  renderDcaHistory(dcas);
}

function renderDcaHistory(dcas) {
  destroyCharts();
  const c = selectedCandidate;

  const rows = dcas.length === 0
    ? '<tr><td colspan="9" style="color:var(--muted);text-align:center;padding:24px">No DCAs recorded yet.</td></tr>'
    : dcas.map(d => {
        const d2gap = (d.d2_demand||0) > (d.d2_capability||0);
        const d3gap = (d.d3_demand||0) > (d.d3_capability||0);
        return `<tr>
          <td>${formatDate(d.incident_date)}</td>
          <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${d.incident_number||'—'}</td>
          <td>${phaseBadge(d.phase)}</td>
          <td>${acuityBadge(d.acuity)}</td>
          <td>${scoreDisplay(d.d1_capability,'cap')}</td>
          <td style="color:${d2gap?'var(--red)':'inherit'}">${scoreDisplay(d.d2_capability,'cap')}</td>
          <td style="color:${d3gap?'var(--red)':'inherit'}">${scoreDisplay(d.d3_capability,'cap')}</td>
          <td>${scoreDisplay(d.d5_capability,'cap')}</td>
          <td style="font-size:11px;color:var(--muted)">${d.trigger_type?.replace(/_/g,' ')||'—'}</td>
        </tr>`;
      }).join('');

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${c.full_name} — DCA History</h1>
    ${candidateTabs('dcas')}
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Incident</th><th>Phase</th><th>Acuity</th>
            <th>D1</th><th>D2 ⚠</th><th>D3 ⚠</th><th>D5</th><th>Trigger</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
    ${dcas.length > 0 ? `<p class="text-muted" style="margin-top:8px">Red values indicate a gap (demand exceeds capability). ⚠ = critical domain.</p>` : ''}
  </div>`);
}

// pages/phase-transitions.js — Phase log, hours logging, advancement/regression, export

// ── Connection retry wrapper (Fix #3) ─────────────────────────
async function dbQuery(fn) {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (!result.error) return result;
      if (attempt === MAX_RETRIES) return result;
      await new Promise(r => setTimeout(r, 800 * attempt));
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await new Promise(r => setTimeout(r, 800 * attempt));
    }
  }
}

async function renderPhaseLog() {
  destroyCharts();
  const c = selectedCandidate;
  setMain(`<div class="page"><div class="loading">Loading phase log…</div></div>`);

  const [transResult, hoursResult] = await Promise.all([
    dbQuery(() =>
      db.from('phase_transitions')
        .select('*, sam:sam_id(first_name,last_name), fti:fti_id(first_name,last_name)')
        .eq('candidate_id', c.id)
        .order('created_at')
    ),
    dbQuery(() =>
      db.from('hours_log')
        .select('*, logger:logged_by(first_name,last_name)')
        .eq('candidate_id', c.id)
        .order('shift_date', { ascending: false })
    )
  ]);

  if (transResult.error) {
    setMain(`<div class="page">
      ${backToCandidate()}
      ${alertHTML('error', 'Failed to load phase log. Please try again.')}
      <button class="btn btn-primary" style="margin-top:12px" onclick="renderPhaseLog()">Retry</button>
    </div>`);
    return;
  }

  const transitions = transResult.data || [];
  const hoursEntries = hoursResult.data || [];

  const rows = transitions.length === 0
    ? '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:24px">No phase transitions recorded yet.</td></tr>'
    : transitions.map(t => {
        const dirColor = t.direction === 'advance' ? 'var(--green)' : 'var(--red)';
        const arrow    = t.direction === 'advance' ? '↑' : '↓';
        return `<tr>
          <td>${formatDate(t.created_at)}</td>
          <td style="font-family:var(--mono);color:${dirColor}">${arrow} ${t.from_phase||'—'} → ${t.to_phase}</td>
          <td style="color:${dirColor};font-family:var(--mono);font-size:11px">${t.direction.toUpperCase()}</td>
          <td style="font-size:12px;color:var(--muted)">${t.sam ? displayName(t.sam) : '—'}</td>
          <td style="font-size:12px;color:var(--muted)">${t.basis||'—'}</td>
        </tr>`;
      }).join('');

  // Fix #2 — FTIs can log hours for their assigned candidate
  const isAssignedFti = c.assigned_fti_id === currentProfile?.id;
  const canLogHours   = isAssignedFti || isManager();
  const canExport     = isAssignedFti || isManager();

  const hoursRows = hoursEntries.length === 0
    ? '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:16px">No hours logged yet.</td></tr>'
    : hoursEntries.map(h => `
      <tr>
        <td>${formatDate(h.shift_date)}</td>
        <td style="font-family:var(--mono);font-weight:500">${h.hours}h</td>
        <td style="font-size:12px;color:var(--muted)">${h.logger ? displayName(h.logger) : '—'}</td>
        <td style="font-size:12px;color:var(--muted)">${h.notes || '—'}</td>
        <td>
          ${(canLogHours) ? `<button class="btn btn-sm btn-danger" onclick="deleteHoursEntry('${h.id}')">Delete</button>` : ''}
        </td>
      </tr>`).join('');

  const hoursForm = canLogHours ? `
    <div class="card">
      <div class="card-title">Log shift hours</div>
      <p class="text-muted mb-2">Log on-shift qualifying hours. Exclude non-qualifying staffing configurations per Directive Section 6.2.</p>
      <div class="form-grid">
        <div class="form-group">
          <label>Shift date</label>
          <input type="date" id="hours-date" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Hours this shift</label>
          <input type="number" id="hours-shift" placeholder="e.g. 12" step="0.5" min="0" max="24" />
        </div>
        <div class="form-group full">
          <label>Notes (optional)</label>
          <input type="text" id="hours-notes" placeholder="e.g. No qualifying calls this shift" />
        </div>
      </div>
      <div id="hours-error"   class="alert alert-error"   style="display:none;margin-top:10px"></div>
      <div id="hours-success" class="alert alert-success" style="display:none;margin-top:10px"></div>
      <div style="display:flex;align-items:center;gap:16px;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="logShiftHours()">Add hours</button>
        <span style="font-size:13px;color:var(--muted)">
          Current total: <strong style="color:var(--text);font-family:var(--mono)" id="hours-running-total">${c.qualifying_hours}h</strong>
          of ${c.max_hours_primary}h standard window
        </span>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div class="card-title" style="margin-bottom:0">Hours log history (${hoursEntries.length} entries)</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Hours</th><th>Logged by</th><th>Notes</th><th></th>
          </tr></thead>
          <tbody id="hours-log-tbody">${hoursRows}</tbody>
        </table>
      </div>
    </div>` : '';

  const exportButtons = canExport ? `
    <div class="card">
      <div class="card-title">Export phase data</div>
      <p class="text-muted mb-2">Export data for the phase being completed. Select the phase then choose your format.</p>
      <div class="form-grid">
        <div class="form-group">
          <label>Phase to export</label>
          <select id="export-phase-select">
            ${PHASES.map(p => `<option value="${p}" ${p===c.current_phase?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button class="btn" onclick="exportPhaseCSV()">⬇ Phase CSV</button>
        <button class="btn" onclick="exportPhasePDF()">⬇ Phase PDF</button>
        <button class="btn" style="margin-left:auto" onclick="exportFullHistoryCSV()">⬇ Full history CSV</button>
        <button class="btn" onclick="exportFullHistoryPDF()">⬇ Full history PDF</button>
      </div>
    </div>` : '';

  const phaseForm = isManager() ? `
    <div class="card">
      <div class="card-title">Log phase transition</div>
      ${alertHTML('warn', 'Phase advancement requires: all Critical Domain gaps closed, SAM Conference completed, and SAM Officer approval. Phase transition DCAs require minimum Demand score of 3 across all domains.')}
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
        <div class="form-group full">
          <label>Basis for transition * (required)</label>
          <textarea id="pt-basis" placeholder="e.g. Candidate has demonstrated consistent organized assessment across 8 DCAs in Phase II. All Critical Domain gaps closed. Midpoint Calibration completed. SAM Officer approved advancement."></textarea>
        </div>
      </div>
      <div id="pt-error" class="alert alert-error" style="display:none;margin-top:12px"></div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="savePhaseTransition()">Log transition</button>
    </div>` : alertHTML('info', 'Phase transitions are logged by SAM Officers and admins.');

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${displayName(c)} — Phase Log</h1>
    ${candidateTabs('phase')}

    <div class="metric-row" style="grid-template-columns:1fr 1fr 1fr">
      <div class="metric">
        <div class="metric-label">Current phase</div>
        <div class="metric-value">${c.current_phase}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Hours logged</div>
        <div class="metric-value">${c.qualifying_hours}h</div>
      </div>
      <div class="metric">
        <div class="metric-label">Extensions</div>
        <div class="metric-value" style="font-size:16px">
          ${c.extension_granted && c.second_extension_granted ? '2 granted' :
            c.extension_granted ? '1 granted' : 'None'}
        </div>
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

    ${hoursForm}
    ${exportButtons}
    ${phaseForm}
  </div>`);
}

// ── Log shift hours — individual entry, not a running total ───
async function logShiftHours() {
  const errEl = document.getElementById('hours-error');
  const sucEl = document.getElementById('hours-success');
  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  const shiftHours = parseFloat(document.getElementById('hours-shift')?.value);
  const date       = document.getElementById('hours-date')?.value;
  const notes      = document.getElementById('hours-notes')?.value?.trim() || null;

  if (!date || isNaN(shiftHours) || shiftHours <= 0) {
    errEl.textContent = 'Please enter a valid date and number of hours.';
    errEl.style.display = 'block';
    return;
  }

  if (shiftHours > 24) {
    errEl.textContent = 'Hours cannot exceed 24 for a single shift.';
    errEl.style.display = 'block';
    return;
  }

  const c = selectedCandidate;

  const { error } = await db.from('hours_log').insert({
    candidate_id: c.id,
    logged_by:    currentProfile.id,
    shift_date:   date,
    hours:        shiftHours,
    is_migrated_balance: false,
    notes
  });

  if (error) {
    errEl.textContent = 'Error saving hours: ' + error.message;
    errEl.style.display = 'block';
    return;
  }

  sucEl.textContent = `${shiftHours}h logged for ${formatDate(date)}.`;
  sucEl.style.display = 'block';

  document.getElementById('hours-shift').value = '';
  document.getElementById('hours-notes').value = '';

  invalidateCache(c.id);
  // Refresh the whole page so the running total (synced via DB trigger) and
  // history table both reflect the new entry
  setTimeout(() => renderPhaseLog(), 700);
}

// ── Delete a hours log entry ────────────────────────────────────
async function deleteHoursEntry(entryId) {
  if (!confirm('Delete this hours log entry? This will adjust the candidate\'s total hours accordingly.')) return;

  const { error } = await db.from('hours_log').delete().eq('id', entryId);
  if (error) { alert('Error deleting entry: ' + error.message); return; }

  invalidateCache(selectedCandidate.id);
  renderPhaseLog();
}

// ── Save phase transition ──────────────────────────────────────
async function savePhaseTransition() {
  const errEl = document.getElementById('pt-error');
  errEl.style.display = 'none';

  const direction   = document.getElementById('pt-direction').value;
  const targetPhase = document.getElementById('pt-target-phase').value;
  const basis       = document.getElementById('pt-basis').value.trim();

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
    hours_at_transition: c.qualifying_hours,
    basis
  });

  if (transErr) { errEl.textContent = transErr.message; errEl.style.display = 'block'; return; }

  const { error: updateErr } = await db.from('candidates')
    .update({ current_phase: targetPhase })
    .eq('id', c.id);

  if (updateErr) { errEl.textContent = updateErr.message; errEl.style.display = 'block'; return; }

  invalidateCache(c.id);
  selectedCandidate = { ...c, current_phase: targetPhase };
  renderPhaseLog();
}

// ── Export helpers (keep existing functions below) ─────────────
async function getExportData(phase) {
  const c = selectedCandidate;
  const [dcaRes, gapRes] = await Promise.all([
    db.from('dcas').select('*').eq('candidate_id', c.id).eq('phase', phase).order('incident_date'),
    db.from('capability_gaps').select('*, dca:dca_id(phase)').eq('candidate_id', c.id)
  ]);
  const dcas = dcaRes.data || [];
  const gaps = (gapRes.data || []).filter(g => g.dca?.phase === phase);
  return { dcas, gaps };
}

async function getAllExportData() {
  const c = selectedCandidate;
  const [dcaRes, gapRes] = await Promise.all([
    db.from('dcas').select('*').eq('candidate_id', c.id).order('incident_date'),
    db.from('capability_gaps').select('*').eq('candidate_id', c.id).order('created_at')
  ]);
  return { dcas: dcaRes.data || [], gaps: gapRes.data || [] };
}

async function exportPhaseCSV() {
  const phase = document.getElementById('export-phase-select')?.value || selectedCandidate.current_phase;
  const { dcas } = await getExportData(phase);
  const c = selectedCandidate;
  const headers = [
    'Incident Date','Incident Number','Phase','Acuity','Trigger',
    'D1 Demand','D1 Capability',
    'D2 Demand (Clinical Mgmt)','D2 Capability',
    'D3 Demand (Motor Skills)','D3 Capability',
    'D4 Demand (Time Pressure)','D4 Capability (Cadence)',
    'D5 Demand (CRM)','D5 Capability',
    'Doc Accuracy','Doc Completeness','Doc Timeliness','Doc Consistency'
  ];
  const rows = dcas.map(d => [
    d.incident_date, d.incident_number||'', d.phase, d.acuity, d.trigger_type||'',
    d.d1_demand||'', d.d1_capability||'',
    d.d2_demand||'', d.d2_capability||'',
    d.d3_demand||'', d.d3_capability||'',
    d.d4_demand||'', d.d4_capability||'',
    d.d5_demand||'', d.d5_capability||'',
    d.doc_accuracy||'', d.doc_completeness||'', d.doc_timeliness||'', d.doc_consistency||''
  ].map(v => `"${v}"`).join(','));
  downloadFile([headers.join(','), ...rows].join('\n'), exportFilenameAnon(c, phase, 'csv'), 'text/csv');
}

async function exportPhasePDF() {
  const phase = document.getElementById('export-phase-select')?.value || selectedCandidate.current_phase;
  const { dcas, gaps } = await getExportData(phase);
  generatePDF(selectedCandidate, phase, dcas, gaps, false);
}

async function exportFullHistoryCSV() {
  const { dcas } = await getAllExportData();
  const c = selectedCandidate;
  const headers = [
    'Incident Date','Incident Number','Phase','Acuity','Trigger',
    'D1 Demand','D1 Capability',
    'D2 Demand (Clinical Mgmt)','D2 Capability',
    'D3 Demand (Motor Skills)','D3 Capability',
    'D4 Demand (Time Pressure)','D4 Capability (Cadence)',
    'D5 Demand (CRM)','D5 Capability',
    'Doc Accuracy','Doc Completeness','Doc Timeliness','Doc Consistency'
  ];
  const rows = dcas.map(d => [
    d.incident_date, d.incident_number||'', d.phase, d.acuity, d.trigger_type||'',
    d.d1_demand||'', d.d1_capability||'',
    d.d2_demand||'', d.d2_capability||'',
    d.d3_demand||'', d.d3_capability||'',
    d.d4_demand||'', d.d4_capability||'',
    d.d5_demand||'', d.d5_capability||'',
    d.doc_accuracy||'', d.doc_completeness||'', d.doc_timeliness||'', d.doc_consistency||''
  ].map(v => `"${v}"`).join(','));
  downloadFile([headers.join(','), ...rows].join('\n'), exportFilenameAnon(c, 'Full', 'csv'), 'text/csv');
}

async function exportFullHistoryPDF() {
  const { dcas, gaps } = await getAllExportData();
  generatePDF(selectedCandidate, 'Full Program History', dcas, gaps, true);
}

function generatePDF(candidate, phaseLabel, dcas, gaps, isFullHistory) {
  if (typeof window.jspdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => _buildPDF(candidate, phaseLabel, dcas, gaps, isFullHistory);
    document.head.appendChild(script);
  } else {
    _buildPDF(candidate, phaseLabel, dcas, gaps, isFullHistory);
  }
}

function _buildPDF(candidate, phaseLabel, dcas, gaps, isFullHistory) {
  const { jsPDF } = window.jspdf;
  const doc      = new jsPDF({ orientation:'portrait', unit:'mm', format:'letter' });
  const margin   = 20;
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y          = margin;

  function checkPage(needed) {
    if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
  }

  function heading(text, size) {
    doc.setFontSize(size || 11);
    doc.setTextColor(15,17,23);
    doc.setFont('helvetica','bold');
    doc.text(text, margin, y);
    y += (size || 11) * 0.5;
  }

  function rule() {
    y += 2;
    doc.setDrawColor(200,200,200);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  function cell(label, value, x, cellW) {
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.setTextColor(100,100,100);
    doc.text(label, x, y);
    doc.setFont('helvetica','normal');
    doc.setTextColor(30,30,30);
    const lines = doc.splitTextToSize(String(value||'—'), cellW - 2);
    doc.text(lines, x, y + 4);
    return lines.length * 4 + 6;
  }

  // Header
  doc.setFillColor(15,17,23);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('Westminster Fire Department', margin, 11);
  doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(180,180,180);
  doc.text('Paramedic Qualification Program', margin, 18);
  doc.setFontSize(9); doc.setTextColor(74,124,255);
  doc.text(`${isFullHistory ? 'Full Program History' : `Phase ${phaseLabel} Report`}`, margin, 24);
  doc.setFontSize(8); doc.setTextColor(180,180,180);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`,
    pageW - margin, 24, { align:'right' });
  y = 36;

  // Candidate info — use code and alias, not real name
  const displayName = candidate.nfl_alias || candidate.candidate_code || 'REDACTED';
  const displayCode = candidate.candidate_code || '—';

  heading('Candidate Information', 11); y += 2;
  const colW = contentW / 3;
  y += Math.max(
    cell('Candidate Code', displayCode, margin, colW),
    cell('NFL Alias', candidate.nfl_alias || '—', margin+colW, colW),
    cell('Current Phase', `Phase ${candidate.current_phase}`, margin+colW*2, colW)
  );
  y += Math.max(
    cell('Group', CANDIDATE_GROUP_LABELS[candidate.candidate_group]||candidate.candidate_group, margin, colW),
    cell('Hours Logged', `${candidate.qualifying_hours}h`, margin+colW, colW),
    cell('Attempt', `${candidate.attempt_number} of 3`, margin+colW*2, colW)
  ) + 2;
  rule();

  // DCAs
  heading(`DCA Records — ${isFullHistory?'All Phases':`Phase ${phaseLabel}`} (${dcas.length})`, 11);
  y += 4;

  if (dcas.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text('No DCA records for this period.', margin, y); y += 8;
  } else {
    dcas.forEach((d, i) => {
      checkPage(40);
      doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(74,124,255);
      doc.text(`DCA ${i+1} — ${formatDate(d.incident_date)}${d.incident_number?' #'+d.incident_number:''}`, margin, y);
      y += 5;

      const colW4 = contentW / 4;
      y += Math.max(
        cell('Phase', d.phase, margin, colW4),
        cell('Acuity', (d.acuity||'').toUpperCase(), margin+colW4, colW4),
        cell('Trigger', (d.trigger_type||'').replace(/_/g,' '), margin+colW4*2, colW4),
        cell('ePCR', d.epcrlink?'Link on file':'—', margin+colW4*3, colW4)
      ) + 2;

      const domains = [
        ['Patient Assessment', d.d1_demand, d.d1_capability],
        ['Clinical Mgmt ⚠',   d.d2_demand, d.d2_capability],
        ['Motor Skills ⚠',    d.d3_demand, d.d3_capability],
        ['Time P / Cadence',  d.d4_demand, d.d4_capability],
        ['CRM',               d.d5_demand, d.d5_capability]
      ];
      const colD = contentW * 0.45;
      const colS = (contentW * 0.55) / 2;

      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(100,100,100);
      doc.text('Domain', margin, y);
      doc.text('Demand', margin+colD, y);
      doc.text('Capability', margin+colD+colS, y);
      y += 4;
      doc.setDrawColor(220,220,220); doc.line(margin, y, pageW-margin, y); y += 3;

      doc.setFont('helvetica','normal'); doc.setTextColor(30,30,30);
      domains.forEach(([name, dem, cap]) => {
        doc.text(name, margin, y);
        doc.text(String(dem||'—'), margin+colD, y);
        const isGap = dem && cap && dem > cap;
        doc.setTextColor(...(isGap ? [239,68,68] : [30,30,30]));
        doc.text(String(cap||'—'), margin+colD+colS, y);
        doc.setTextColor(30,30,30);
        y += 5;
      });

      doc.setFontSize(8); doc.setTextColor(100,100,100);
      doc.text(`Documentation: ${[d.doc_accuracy,d.doc_completeness,d.doc_timeliness,d.doc_consistency].map(v=>v||'—').join(' / ')}`, margin, y);
      y += 6;
      doc.setDrawColor(235,235,235); doc.line(margin, y, pageW-margin, y); y += 4;
    });
  }

  rule();

  // Gaps
  heading(`Capability Gaps — ${isFullHistory?'All Phases':`Phase ${phaseLabel}`} (${gaps.length})`, 11);
  y += 4;

  if (gaps.length === 0) {
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,100);
    doc.text('No capability gaps for this period.', margin, y); y += 8;
  } else {
    gaps.forEach((g, i) => {
      checkPage(24);
      doc.setFontSize(9); doc.setFont('helvetica','bold');
      doc.setTextColor(...(g.is_critical ? [239,68,68] : [74,124,255]));
      doc.text(`Gap ${i+1} — ${g.domain_name}${g.is_critical?' (Critical Domain)':''}`, margin, y);
      doc.setTextColor(...(g.status==='open' ? [239,68,68] : [62,207,142]));
      doc.text(g.status.toUpperCase(), pageW-margin, y, { align:'right' });
      y += 5;
      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,60);
      const descLines = doc.splitTextToSize(g.gap_description||'—', contentW);
      doc.text(descLines, margin, y); y += descLines.length*4+2;
      if (g.status==='closed' && g.closure_notes) {
        doc.setTextColor(62,207,142);
        const cl = doc.splitTextToSize(`Closure: ${g.closure_notes}`, contentW);
        doc.text(cl, margin, y); y += cl.length*4+2;
      }
      y += 2;
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(150,150,150);
    doc.text(`WFD Paramedic Qualification Program  •  ${displayCode}  •  Page ${p} of ${pageCount}`,
      pageW/2, pageH-8, { align:'center' });
  }

  // Use anonymized filename
  doc.save(isFullHistory 
    ? exportFilenameAnon(candidate,'Full','pdf') 
    : exportFilenameAnon(candidate,phaseLabel,'pdf'));
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Override exportFilename to use candidate code instead of real name
function exportFilenameAnon(candidate, phase, ext) {
  const code = candidate.candidate_code || 'WFD-PM-000';
  const date = new Date().toISOString().split('T')[0];
  return `${code}_Phase${phase}_${date}.${ext}`;
}

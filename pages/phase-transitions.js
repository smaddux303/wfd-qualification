// pages/phase-transitions.js — Phase log, advancement/regression, and export

async function renderPhaseLog() {
  destroyCharts();
  const c = selectedCandidate;
  setMain('<div class="page"><div class="loading">Loading phase log…</div></div>');

  const { data: transitions } = await db
    .from('phase_transitions')
    .select('*, sam:sam_id(full_name), fti:fti_id(full_name)')
    .eq('candidate_id', c.id)
    .order('created_at');

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

  // Change #12 — export buttons for managers only
  // Change #13 — full history export
  const exportButtons = isManager() ? `
    <div class="card">
      <div class="card-title">Export phase data</div>
      <p class="text-muted mb-2">Export data for the phase being completed. Select the phase to export, then choose your format.</p>
      <div class="form-grid">
        <div class="form-group">
          <label>Phase to export</label>
          <select id="export-phase-select">
            ${PHASES.map(p => `<option value="${p}" ${p===c.current_phase?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button class="btn" onclick="exportPhaseCSV()">⬇ Download CSV</button>
        <button class="btn" onclick="exportPhasePDF()">⬇ Download PDF</button>
        <button class="btn" style="margin-left:auto" onclick="exportFullHistoryCSV()">⬇ Full history CSV</button>
        <button class="btn" onclick="exportFullHistoryPDF()">⬇ Full history PDF</button>
      </div>
    </div>` : '';

  const phaseForm = isManager() ? `
    <div class="card">
      <div class="card-title">Log phase transition</div>
      ${alertHTML('warn', 'Phase advancement requires: all Critical Domain gaps closed, SAM Conference completed for the current phase, and SAM Officer approval. Phase transition DCAs require minimum Demand score of 3 across all domains.')}
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
          <input type="number" id="pt-hours" value="${c.qualifying_hours}" step="0.5" />
        </div>
        <div class="form-group full">
          <label>Basis for transition * (required — specific justification)</label>
          <textarea id="pt-basis" placeholder="e.g. Candidate has demonstrated consistent organized assessment across 8 DCAs in Phase II. All Critical Domain gaps closed. Midpoint Calibration completed. SAM Officer approved advancement."></textarea>
        </div>
      </div>
      <div id="pt-error" class="alert alert-error" style="display:none;margin-top:12px"></div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="savePhaseTransition()">Log transition</button>
    </div>` : alertHTML('info', 'Phase transitions are logged by SAM Officers and admins.');

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${c.full_name} — Phase Log</h1>
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

    ${exportButtons}
    ${phaseForm}
  </div>`);
}

// ── Save phase transition ──────────────────────────────────────
async function savePhaseTransition() {
  const errEl     = document.getElementById('pt-error');
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

  const { error: updateErr } = await db.from('candidates')
    .update({ current_phase: targetPhase, qualifying_hours: hours || c.qualifying_hours })
    .eq('id', c.id);

  if (updateErr) { errEl.textContent = updateErr.message; errEl.style.display = 'block'; return; }

  invalidateCache(c.id);
  selectedCandidate = { ...c, current_phase: targetPhase };
  renderPhaseLog();
}

// ── Export helpers ─────────────────────────────────────────────
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

// Change #12 — Phase CSV export
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

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, exportFilename(c, phase, 'csv'), 'text/csv');
}

// Change #12 — Phase PDF export
async function exportPhasePDF() {
  const phase = document.getElementById('export-phase-select')?.value || selectedCandidate.current_phase;
  const { dcas, gaps } = await getExportData(phase);
  const c = selectedCandidate;
  generatePDF(c, phase, dcas, gaps, false);
}

// Change #13 — Full history CSV
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

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, exportFilename(c, 'Full', 'csv'), 'text/csv');
}

// Change #13 — Full history PDF
async function exportFullHistoryPDF() {
  const { dcas, gaps } = await getAllExportData();
  const c = selectedCandidate;
  generatePDF(c, 'Full Program History', dcas, gaps, true);
}

// ── PDF generation ─────────────────────────────────────────────
function generatePDF(candidate, phaseLabel, dcas, gaps, isFullHistory) {
  // Load jsPDF from CDN if not already loaded
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
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'letter' });

  const margin   = 20;
  const pageW    = doc.internal.pageSize.getWidth();
  const pageH    = doc.internal.pageSize.getHeight();
  const contentW = pageW - margin * 2;
  let y          = margin;

  function checkPage(needed) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function heading(text, size, color) {
    doc.setFontSize(size || 11);
    doc.setTextColor(...(color || [15,17,23]));
    doc.setFont('helvetica','bold');
    doc.text(text, margin, y);
    y += (size || 11) * 0.5;
  }

  function body(text, size) {
    doc.setFontSize(size || 9);
    doc.setTextColor(60,60,60);
    doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(text, contentW);
    checkPage(lines.length * 5);
    doc.text(lines, margin, y);
    y += lines.length * 5;
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
    const lines = doc.splitTextToSize(String(value || '—'), cellW - 2);
    doc.text(lines, x, y + 4);
    return lines.length * 4 + 6;
  }

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(15,17,23);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  doc.text('Westminster Fire Department', margin, 11);
  doc.setFontSize(10);
  doc.setFont('helvetica','normal');
  doc.setTextColor(180,180,180);
  doc.text('Paramedic Qualification Program', margin, 18);
  doc.setFontSize(9);
  doc.setTextColor(74,124,255);
  doc.text(`${isFullHistory ? 'Full Program History' : `Phase ${phaseLabel} Report`}`, margin, 24);

  // Date generated — top right
  doc.setFontSize(8);
  doc.setTextColor(180,180,180);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`,
    pageW - margin, 24, { align:'right' });

  y = 36;

  // ── Candidate info ──────────────────────────────────────────
  heading('Candidate Information', 11);
  y += 2;
  const colW = contentW / 3;
  const rowH = Math.max(
    cell('Name', candidate.full_name, margin, colW),
    cell('Group', CANDIDATE_GROUP_LABELS[candidate.candidate_group] || candidate.candidate_group, margin + colW, colW),
    cell('Current Phase', `Phase ${candidate.current_phase}`, margin + colW * 2, colW)
  );
  y += rowH;
  const rowH2 = Math.max(
    cell('Program Start', formatDate(candidate.program_start_date), margin, colW),
    cell('Hours Logged', `${candidate.qualifying_hours}h`, margin + colW, colW),
    cell('Attempt', `${candidate.attempt_number} of 3`, margin + colW * 2, colW)
  );
  y += rowH2 + 2;
  rule();

  // ── DCAs ────────────────────────────────────────────────────
  heading(`DCA Records — ${isFullHistory ? 'All Phases' : `Phase ${phaseLabel}`} (${dcas.length} evaluations)`, 11);
  y += 4;

  if (dcas.length === 0) {
    body('No DCA records for this period.');
    y += 4;
  } else {
    dcas.forEach((d, i) => {
      checkPage(40);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      doc.setTextColor(74,124,255);
      doc.text(`DCA ${i+1} — ${formatDate(d.incident_date)}${d.incident_number ? '  #' + d.incident_number : ''}`, margin, y);
      y += 5;

      const colW4 = contentW / 4;
      const rh = Math.max(
        cell('Phase', d.phase, margin, colW4),
        cell('Acuity', (d.acuity||'').toUpperCase(), margin + colW4, colW4),
        cell('Trigger', (d.trigger_type||'').replace(/_/g,' '), margin + colW4*2, colW4),
        cell('ePCR', d.epcrlink ? 'Link on file' : '—', margin + colW4*3, colW4)
      );
      y += rh + 2;

      // Domain scores table
      doc.setFontSize(8);
      doc.setFont('helvetica','bold');
      doc.setTextColor(100,100,100);
      const domains = [
        ['Patient Assessment', d.d1_demand, d.d1_capability],
        ['Clinical Mgmt ⚠',   d.d2_demand, d.d2_capability],
        ['Motor Skills ⚠',    d.d3_demand, d.d3_capability],
        ['Time P / Cadence',  d.d4_demand, d.d4_capability],
        ['CRM',               d.d5_demand, d.d5_capability]
      ];

      const colDomain = contentW * 0.45;
      const colScore  = (contentW * 0.55) / 2;

      doc.text('Domain', margin, y);
      doc.text('Demand', margin + colDomain, y);
      doc.text('Capability', margin + colDomain + colScore, y);
      y += 4;
      doc.setDrawColor(220,220,220);
      doc.line(margin, y, pageW - margin, y);
      y += 3;

      doc.setFont('helvetica','normal');
      doc.setTextColor(30,30,30);
      domains.forEach(([name, dem, cap]) => {
        doc.text(name, margin, y);
        doc.text(String(dem||'—'), margin + colDomain, y);
        const capColor = dem && cap && dem > cap ? [239,68,68] : [30,30,30];
        doc.setTextColor(...capColor);
        doc.text(String(cap||'—'), margin + colDomain + colScore, y);
        doc.setTextColor(30,30,30);
        y += 5;
      });

      // Doc quality
      const docFields = [
        d.doc_accuracy, d.doc_completeness, d.doc_timeliness, d.doc_consistency
      ].map(v => v || '—').join(' / ');
      doc.setFontSize(8);
      doc.setTextColor(100,100,100);
      doc.text(`Documentation: ${docFields}`, margin, y);
      y += 6;

      doc.setDrawColor(235,235,235);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
    });
  }

  rule();

  // ── Gaps ────────────────────────────────────────────────────
  heading(`Capability Gaps — ${isFullHistory ? 'All Phases' : `Phase ${phaseLabel}`} (${gaps.length} total)`, 11);
  y += 4;

  if (gaps.length === 0) {
    body('No capability gaps for this period.');
  } else {
    gaps.forEach((g, i) => {
      checkPage(24);
      doc.setFontSize(9);
      doc.setFont('helvetica','bold');
      const gapColor = g.is_critical ? [239,68,68] : [74,124,255];
      doc.setTextColor(...gapColor);
      doc.text(`Gap ${i+1} — ${g.domain_name}${g.is_critical ? ' (Critical Domain)' : ''}`, margin, y);
      doc.setTextColor(g.status === 'open' ? 239 : 62, g.status === 'open' ? 68 : 207, g.status === 'open' ? 68 : 142);
      doc.text(g.status.toUpperCase(), pageW - margin, y, { align:'right' });
      y += 5;

      doc.setFont('helvetica','normal');
      doc.setTextColor(60,60,60);
      const descLines = doc.splitTextToSize(g.gap_description || '—', contentW);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 2;

      if (g.status === 'closed' && g.closure_notes) {
        doc.setTextColor(62,207,142);
        const closeLines = doc.splitTextToSize(`Closure: ${g.closure_notes}`, contentW);
        doc.text(closeLines, margin, y);
        y += closeLines.length * 4 + 2;
      }
      y += 2;
    });
  }

  // ── Footer on each page ─────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150,150,150);
    doc.text(`WFD Paramedic Qualification Program  •  ${candidate.full_name}  •  Page ${p} of ${pageCount}`,
      pageW / 2, pageH - 8, { align:'center' });
  }

  const filename = isFullHistory
    ? exportFilename(candidate, 'Full', 'pdf')
    : exportFilename(candidate, phaseLabel, 'pdf');
  doc.save(filename);
}

// ── File download helper ───────────────────────────────────────
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// pages/gaps.js — Capability gap list and closure workflow

async function renderGapList() {
  destroyCharts();
  const c = selectedCandidate;

  const cached = candidateDataCache[c.id];
  const gaps = cached ? cached.gaps : await fetchGaps(c.id);
  const open   = gaps.filter(g => g.status === 'open');
  const closed = gaps.filter(g => g.status === 'closed');

  function gapCard(g) {
    const isCrit = g.is_critical;
    return `<div class="gap-item ${isCrit ? 'critical' : ''}">
      <div class="gap-item-header">
        <span class="gap-item-title">${g.domain_name}</span>
        ${isCrit ? criticalTag() : ''}
        ${g.status === 'open'
          ? `<span class="status-open">OPEN</span>`
          : `<span class="status-closed">CLOSED</span>`}
      </div>
      ${g.dca?.epcrlink ? `<div style="margin-bottom:6px">${epcrlinkHTML(g.dca.epcrlink, '↗ View source ePCR')}</div>` : ''}
      <p style="font-size:13px;color:var(--muted);margin-bottom:${g.status==='open'?'12px':'4px'}">${g.gap_description}</p>
      ${g.closure_notes ? `<p style="font-size:12px;color:var(--muted)"><strong style="color:var(--green)">Closure:</strong> ${g.closure_notes}</p>` : ''}
      ${g.status === 'open' ? `
        <div id="close-form-${g.id}" style="display:none;background:var(--surface);border-radius:var(--radius);padding:12px;margin-top:8px">
          <div class="form-group mb-2">
            <label>Closure pathway *</label>
            <select id="pathway-${g.id}">
              <option value="">Select…</option>
              ${CLOSURE_PATHWAYS.map(p=>`<option value="${p.value}">${p.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group mb-2">
            <label>Closure notes * — describe how the gap was demonstrated closed</label>
            <textarea id="closenotes-${g.id}" placeholder="e.g. Candidate successfully intubated on next cardiac arrest without FTI prompting or rescue."></textarea>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn btn-sm" onclick="toggleCloseForm('${g.id}', false)">Cancel</button>
            <button class="btn btn-primary btn-sm" onclick="closeGap('${g.id}')">Mark closed</button>
          </div>
        </div>
        <button class="btn btn-sm" id="open-close-${g.id}" onclick="toggleCloseForm('${g.id}', true)">Mark as closed</button>
      ` : ''}
    </div>`;
  }

  setMain(`<div class="page">
    ${backToCandidate()}
    <h1 class="section-title">${c.full_name} — Capability Gaps</h1>
    ${candidateTabs('gaps')}

    ${open.length === 0 && closed.length === 0
      ? alertHTML('info', 'No capability gaps recorded yet. Gaps are created automatically when a DCA shows demand exceeding capability.')
      : ''}

    ${open.length > 0 ? `
      <div class="card-title" style="margin-bottom:10px">Open gaps (${open.length})
        ${open.some(g=>g.is_critical) ? ' — <span style="color:var(--red);font-size:11px">Critical domain gaps block phase advancement</span>' : ''}
      </div>
      ${open.map(gapCard).join('')}
    ` : open.length === 0 && closed.length > 0 ? alertHTML('success', 'All gaps closed. No open capability gaps.') : ''}

    ${closed.length > 0 ? `
      <div class="card-title" style="margin-top:20px;margin-bottom:10px">Closed gaps (${closed.length})</div>
      <div style="opacity:0.65">${closed.map(gapCard).join('')}</div>
    ` : ''}
  </div>`);
}

function toggleCloseForm(gapId, show) {
  document.getElementById(`close-form-${gapId}`).style.display = show ? 'block' : 'none';
  const openBtn = document.getElementById(`open-close-${gapId}`);
  if (openBtn) openBtn.style.display = show ? 'none' : 'inline-block';
}

async function closeGap(gapId) {
  const pathway = document.getElementById(`pathway-${gapId}`)?.value;
  const notes   = document.getElementById(`closenotes-${gapId}`)?.value?.trim();

  if (!pathway || !notes) {
    alert('Please select a closure pathway and add closure notes before marking closed.');
    return;
  }

  const { error } = await db.from('capability_gaps').update({
    status: 'closed',
    closed_at: new Date().toISOString(),
    closure_pathway: pathway,
    closure_notes: notes
  }).eq('id', gapId);

  if (error) { alert('Error closing gap: ' + error.message); return; }
  invalidateCache(selectedCandidate.id);
  renderGapList();
}

// pages/dashboard.js — SAM Officer / Admin dashboard
// At-a-glance program status across all active candidates with attention flags

async function renderDashboard() {
  destroyCharts();
  setActiveNav('dashboard');
  setMain('<div class="page"><div class="loading">Loading dashboard…</div></div>');

  // Pull everything needed in parallel
  const [candRes, gapRes, confRes, dcaRes] = await Promise.all([
    db.from('candidates')
      .select('*, fti:assigned_fti_id(first_name,last_name)')
      .neq('program_status', 'qualified'),
    db.from('capability_gaps').select('candidate_id, status, is_critical, domain_name'),
    db.from('sam_conferences').select('candidate_id, conference_type'),
    db.from('dcas').select('candidate_id, incident_date, phase').order('incident_date', { ascending: false })
  ]);

  const candidates  = (candRes.data || []).sort(lastNameSort);
  const allGaps     = gapRes.data || [];
  const allConfs    = confRes.data || [];
  const allDcas     = dcaRes.data || [];

  // Build per-candidate flags
  function candidateFlags(c) {
    const flags = [];

    const myGaps = allGaps.filter(g => g.candidate_id === c.id && g.status === 'open');
    const critical = myGaps.filter(g => g.is_critical);
    if (critical.length > 0) {
      flags.push({ level: 'red', text: `${critical.length} critical gap${critical.length>1?'s':''} open` });
    } else if (myGaps.length > 0) {
      flags.push({ level: 'amber', text: `${myGaps.length} gap${myGaps.length>1?'s':''} open` });
    }

    // Hours proximity to limits
    const maxH = c.extension_granted && c.second_extension_granted ? 1536
               : c.extension_granted ? 1152 : 768;
    const pct = c.qualifying_hours / maxH;
    if (pct >= 0.95) {
      flags.push({ level: 'red', text: `${c.qualifying_hours}h — at/near ${maxH}h limit` });
    } else if (pct >= 0.85) {
      flags.push({ level: 'amber', text: `${c.qualifying_hours}h of ${maxH}h (${Math.round(pct*100)}%)` });
    }

    // Conference progress vs phase
    const myConfs = new Set(allConfs.filter(cf => cf.candidate_id === c.id).map(cf => cf.conference_type));
    if (['II','III','IV'].includes(c.current_phase) && !myConfs.has('initial_alignment')) {
      flags.push({ level: 'amber', text: 'Initial Alignment conference not recorded' });
    }
    if (['III','IV'].includes(c.current_phase) && !myConfs.has('midpoint_calibration')) {
      flags.push({ level: 'amber', text: 'Midpoint Calibration not recorded' });
    }
    if (c.current_phase === 'IV' && !myConfs.has('pre_capstone_readiness')) {
      flags.push({ level: 'red', text: 'Pre-IPE Readiness conference not recorded' });
    }

    // Days since last DCA
    const myDcas = allDcas.filter(d => d.candidate_id === c.id);
    if (myDcas.length > 0) {
      const lastDate = new Date(myDcas[0].incident_date);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      if (daysSince > 21) {
        flags.push({ level: 'amber', text: `No DCA in ${daysSince} days` });
      }
    } else {
      flags.push({ level: 'amber', text: 'No DCAs recorded yet' });
    }

    if (!c.assigned_fti_id) {
      flags.push({ level: 'red', text: 'No FTI assigned' });
    }

    return flags;
  }

  // Summary counts
  let redCount = 0, amberCount = 0, cleanCount = 0;
  const candidateCards = candidates.map(c => {
    const flags = candidateFlags(c);
    const hasRed   = flags.some(f => f.level === 'red');
    const hasAmber = flags.some(f => f.level === 'amber');
    if (hasRed) redCount++;
    else if (hasAmber) amberCount++;
    else cleanCount++;

    const border = hasRed ? 'rgba(239,68,68,0.4)' : hasAmber ? 'rgba(245,158,11,0.35)' : 'var(--border)';

    const flagChips = flags.length === 0
      ? '<span class="gap-chip gap-ok"><span class="dot" style="background:var(--green)"></span>On track</span>'
      : flags.map(f => `
        <span class="gap-chip ${f.level==='red'?'gap-critical':'gap-warn'}">
          <span class="dot" style="background:${f.level==='red'?'var(--red)':'var(--amber)'}"></span>${f.text}
        </span>`).join('');

    return `
      <div class="card clickable" style="border-color:${border}" onclick="openCandidate('${c.id}')">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
          <span style="font-weight:600;font-size:15px">${displayName(c)}</span>
          ${phaseBadge(c.current_phase)}
          <span style="font-size:11px;font-family:var(--mono);color:var(--muted)">${c.fti ? displayName(c.fti) : 'No FTI'}</span>
          <span style="margin-left:auto;font-family:var(--mono);font-size:12px;color:var(--muted)">${c.qualifying_hours}h</span>
        </div>
        <div class="gap-row" style="margin:0">${flagChips}</div>
      </div>`;
  }).join('');

  setMain(`<div class="page">
    <h1 class="section-title">Program Dashboard</h1>

    <div class="metric-row" style="grid-template-columns:1fr 1fr 1fr 1fr">
      <div class="metric">
        <div class="metric-label">Active candidates</div>
        <div class="metric-value">${candidates.length}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Needs attention</div>
        <div class="metric-value red">${redCount}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Watch items</div>
        <div class="metric-value" style="color:var(--amber)">${amberCount}</div>
      </div>
      <div class="metric">
        <div class="metric-label">On track</div>
        <div class="metric-value green">${cleanCount}</div>
      </div>
    </div>

    ${candidates.length === 0
      ? alertHTML('info', 'No active candidates. Add candidates in the Admin panel.')
      : candidateCards}
  </div>`);
}

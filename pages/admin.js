// pages/admin.js — Admin panel: manage users, candidates, assignments
// Changes: no D shift, delete buttons, admin ≠ SAM, group label fix, no badge numbers

async function renderAdmin() {
  setActiveNav('admin');
  destroyCharts();

  // Show skeleton immediately
  setMain('<div class="page"><h1 class="section-title">Admin Panel</h1><div class="loading">Loading…</div></div>');

  // Fetch candidates and profiles simultaneously
  const [candRes, profRes] = await Promise.all([
    db.from('candidates').select('*, fti:assigned_fti_id(full_name), sam:assigned_sam_id(full_name)').order('full_name'),
    db.from('profiles').select('*').order('full_name')
  ]);

  const candidates = candRes.data || [];
  const profiles   = profRes.data || [];
  const ftis = profiles.filter(p => p.role === 'fti');
  const sams = profiles.filter(p => p.role === 'sam_officer');

  function shiftOptions(selected) {
    return ['','A','B','C'].map(s =>
      `<option value="${s}" ${selected===s?'selected':''}>${s||'—'}</option>`
    ).join('');
  }

  function profileRow(p) {
    return `<tr>
      <td style="font-weight:500">${p.full_name}</td>
      <td><span style="font-family:var(--mono);font-size:11px;color:var(--accent)">${p.role.replace('_',' ')}</span></td>
      <td style="font-size:12px;color:var(--muted)">${p.shift||'—'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="editProfile('${p.id}','${p.full_name}','${p.role}','${p.shift||''}')">Edit</button>
        <button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="deleteProfile('${p.id}','${p.full_name}')">Delete</button>
      </td>
    </tr>`;
  }

  function candidateRow(c) {
    return `<tr>
      <td style="font-family:var(--mono);font-size:11px;color:var(--accent)">${c.candidate_code||'—'}</td>
      <td style="font-weight:500">${c.full_name}</td>
      <td style="font-size:12px;color:var(--muted)">${c.nfl_alias||'<span style="color:var(--amber);font-size:11px">No alias</span>'}</td>
      <td style="font-size:12px;color:var(--muted)">${CANDIDATE_GROUP_LABELS[c.candidate_group] || c.candidate_group}</td>
      <td>${phaseBadge(c.current_phase)}</td>
      <td style="font-size:12px;color:var(--muted)">${c.fti?.full_name||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${c.sam?.full_name||'—'}</td>
      <td><span style="font-family:var(--mono);font-size:11px;color:var(--green)">${c.program_status}</span></td>
      <td style="font-family:var(--mono);font-size:12px">${c.qualifying_hours}h</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="editCandidate('${c.id}')">Edit</button>
        <button class="btn btn-sm btn-danger" style="margin-left:4px" onclick="deleteCandidate('${c.id}','${c.full_name}')">Delete</button>
      </td>
    </tr>`;
  }

  setMain(`<div class="page">
    <h1 class="section-title">Admin Panel</h1>

    <div id="admin-error"   class="alert alert-error"   style="display:none"></div>
    <div id="admin-success" class="alert alert-success" style="display:none"></div>

    <!-- Add new candidate -->
    <div class="card">
      <div class="card-title">Add new candidate</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Full name *</label>
          <input type="text" id="new-cand-name" placeholder="Jane Smith" />
        </div>
        <div class="form-group">
          <label>Candidate group *</label>
          <select id="new-cand-group">
            <option value="">Select…</option>
            <option value="paramedic_cadet">Paramedic Cadet</option>
            <option value="paramedic_on_hire">Paramedic-On-Hire</option>
          </select>
        </div>
        <div class="form-group">
          <label>Assign FTI</label>
          <select id="new-cand-fti">
            <option value="">Select…</option>
            ${ftis.map(f=>`<option value="${f.id}">${f.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Assign SAM Officer</label>
          <select id="new-cand-sam">
            <option value="">Select…</option>
            ${sams.map(s=>`<option value="${s.id}">${s.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Starting phase</label>
          <select id="new-cand-phase">
            <option value="I">Phase I — Orientation</option>
            <option value="II">Phase II — Guided Practice</option>
            <option value="III">Phase III — Supervised Leadership (Paramedics-On-Hire)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Program start date *</label>
          <input type="date" id="new-cand-start" value="${new Date().toISOString().split('T')[0]}" />
        </div>
        <div class="form-group">
          <label>Attempt number</label>
          <select id="new-cand-attempt">
            <option value="1">1st attempt</option>
            <option value="2">2nd attempt</option>
            <option value="3">3rd attempt (final)</option>
          </select>
        </div>
        <div class="form-group full">
          <label>Notes</label>
          <textarea id="new-cand-notes" placeholder="Any relevant context…"></textarea>
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="addCandidate()">Add candidate</button>
      <div id="new-cand-alias-area"></div>
    </div>

    <!-- Add new profile -->
    <div class="card">
      <div class="card-title">Add staff profile</div>
      <p class="text-muted mb-2">First invite the user via Supabase Authentication → Invite user. Then paste their UUID here.</p>
      <div class="form-grid">
        <div class="form-group full">
          <label>Supabase user UUID *</label>
          <input type="text" id="new-prof-id" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" style="font-family:var(--mono);font-size:12px" />
        </div>
        <div class="form-group">
          <label>Full name *</label>
          <input type="text" id="new-prof-name" placeholder="Jane Smith" />
        </div>
        <div class="form-group">
          <label>Role *</label>
          <select id="new-prof-role">
            <option value="fti">FTI — Field Training Instructor</option>
            <option value="sam_officer">SAM Officer</option>
            <option value="admin">Admin (app management only)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Shift</label>
          <select id="new-prof-shift">
            ${shiftOptions('')}
          </select>
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="addProfile()">Add profile</button>
    </div>

    <!-- Update hours -->
    <div class="card">
      <div class="card-title">Update candidate hours</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Candidate</label>
          <select id="hours-cand-id">
            <option value="">Select…</option>
            ${(candidates||[]).map(c=>`<option value="${c.id}">${c.full_name} (${c.qualifying_hours}h)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>New total qualifying hours</label>
          <input type="number" id="hours-value" placeholder="e.g. 384" step="0.5" />
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="updateHours()">Update hours</button>
    </div>

    <!-- Delete DCA -->
    <div class="card">
      <div class="card-title">Delete a DCA record</div>
      <p class="text-muted mb-2">Use this to remove test DCAs or records entered in error. This also removes any gap records that were created by that DCA.</p>
      <div class="form-grid">
        <div class="form-group">
          <label>Candidate</label>
          <select id="del-dca-cand" onchange="loadDcasForDelete()">
            <option value="">Select candidate…</option>
            ${(candidates||[]).map(c=>`<option value="${c.id}">${c.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>DCA to delete</label>
          <select id="del-dca-id">
            <option value="">Select candidate first…</option>
          </select>
        </div>
      </div>
      <button class="btn btn-danger" style="margin-top:14px" onclick="deleteDca()">Delete DCA</button>
    </div>

    <!-- All candidates table -->
    <div class="card" style="padding:0;overflow:hidden;margin-top:24px">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div class="card-title" style="margin-bottom:0">All candidates (${(candidates||[]).length})</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Code</th><th>Name</th><th>NFL Alias</th><th>Group</th><th>Phase</th><th>FTI</th><th>SAM</th><th>Status</th><th>Hours</th><th></th>
          </tr></thead>
          <tbody>${(candidates||[]).map(candidateRow).join('') ||
            '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:20px">No candidates yet.</td></tr>'
          }</tbody>
        </table>
      </div>
    </div>

    <!-- Staff profiles table -->
    <div class="card" style="padding:0;overflow:hidden;margin-top:16px">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div class="card-title" style="margin-bottom:0">Staff profiles (${(profiles||[]).length})</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Shift</th><th></th></tr></thead>
          <tbody>${(profiles||[]).map(profileRow).join('')}</tbody>
        </table>
      </div>
    </div>

    <!-- Edit candidate panel -->
    <div id="edit-candidate-panel" style="display:none" class="card">
      <div class="card-title">Edit candidate</div>
      <div class="form-grid">
        <input type="hidden" id="edit-cand-id" />
        <div class="form-group">
          <label>Full name</label>
          <input type="text" id="edit-cand-name" />
        </div>
        <div class="form-group">
          <label>Assign FTI</label>
          <select id="edit-cand-fti">
            <option value="">None</option>
            ${ftis.map(f=>`<option value="${f.id}">${f.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Assign SAM Officer</label>
          <select id="edit-cand-sam">
            <option value="">None</option>
            ${sams.map(s=>`<option value="${s.id}">${s.full_name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Program status</label>
          <select id="edit-cand-status">
            ${['active','extension','waiting_period','qualified','failed_attempt_1','failed_attempt_2','failed_final']
              .map(s=>`<option value="${s}">${s.replace(/_/g,' ')}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>First extension granted</label>
          <select id="edit-cand-extension">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div class="form-group">
          <label>Second extension granted</label>
          <select id="edit-cand-second-extension">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <div class="form-group full">
          <label>Notes</label>
          <textarea id="edit-cand-notes"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-sm" onclick="document.getElementById('edit-candidate-panel').style.display='none'">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveEditCandidate()">Save changes</button>
      </div>
    </div>

    <!-- Edit profile panel -->
    <div id="edit-profile-panel" style="display:none" class="card">
      <div class="card-title">Edit profile</div>
      <div class="form-grid">
        <input type="hidden" id="edit-prof-id" />
        <div class="form-group">
          <label>Full name</label>
          <input type="text" id="edit-prof-name" />
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="edit-prof-role">
            <option value="fti">FTI</option>
            <option value="sam_officer">SAM Officer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label>Shift</label>
          <select id="edit-prof-shift">
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-sm" onclick="document.getElementById('edit-profile-panel').style.display='none'">Cancel</button>
        <button class="btn btn-primary btn-sm" onclick="saveEditProfile()">Save changes</button>
      </div>
    </div>
  </div>`);
}

// ── Add candidate ──────────────────────────────────────────────
async function addCandidate() {
  const errEl = document.getElementById('admin-error');
  const sucEl = document.getElementById('admin-success');
  errEl.style.display = 'none'; sucEl.style.display = 'none';

  const name  = document.getElementById('new-cand-name').value.trim();
  const group = document.getElementById('new-cand-group').value;
  const start = document.getElementById('new-cand-start').value;

  if (!name || !group || !start) {
    errEl.textContent = 'Name, candidate group, and program start date are required.';
    errEl.style.display = 'block';
    return;
  }

  // Auto-generate numeric code
  const candidateCode = await generateCandidateCode();

  const { data: newCand, error } = await db.from('candidates').insert({
    full_name:          name,
    candidate_code:     candidateCode,
    candidate_group:    group,
    assigned_fti_id:    document.getElementById('new-cand-fti').value || null,
    assigned_sam_id:    document.getElementById('new-cand-sam').value || null,
    current_phase:      document.getElementById('new-cand-phase').value,
    program_start_date: start,
    attempt_number:     parseInt(document.getElementById('new-cand-attempt').value)||1,
    notes:              document.getElementById('new-cand-notes').value || null,
    program_status:     'active',
    qualifying_hours:   0
  }).select().single();

  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

  sucEl.textContent = `Candidate "${name}" added with code ${candidateCode}. Now assign an NFL alias below.`;
  sucEl.style.display = 'block';

  // Show alias picker inline
  const aliasArea = document.getElementById('new-cand-alias-area');
  if (aliasArea && newCand) {
    aliasArea.innerHTML = `
      <div class="card" style="margin-top:12px">
        ${renderNflAliasPicker(newCand.id, name)}
        <button class="btn btn-primary" style="margin-top:14px"
          onclick="saveNflAlias('${newCand.id}', () => renderAdmin())">
          Save alias and continue
        </button>
        <button class="btn" style="margin-top:14px;margin-left:8px"
          onclick="renderAdmin()">
          Skip for now
        </button>
      </div>`;
    aliasArea.scrollIntoView({ behavior: 'smooth' });
  } else {
    setTimeout(() => renderAdmin(), 1400);
  }
}

// ── Add profile ────────────────────────────────────────────────
async function addProfile() {
  const errEl = document.getElementById('admin-error');
  const sucEl = document.getElementById('admin-success');
  errEl.style.display = 'none'; sucEl.style.display = 'none';

  const id   = document.getElementById('new-prof-id').value.trim();
  const name = document.getElementById('new-prof-name').value.trim();
  const role = document.getElementById('new-prof-role').value;

  if (!id || !name || !role) {
    errEl.textContent = 'UUID, full name, and role are required.';
    errEl.style.display = 'block';
    return;
  }

  const { error } = await db.from('profiles').insert({
    id,
    full_name: name,
    role,
    shift: document.getElementById('new-prof-shift').value || null
  });

  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  sucEl.textContent = `Profile for "${name}" added.`;
  sucEl.style.display = 'block';
  setTimeout(() => renderAdmin(), 1200);
}

// ── Update hours ───────────────────────────────────────────────
async function updateHours() {
  const errEl = document.getElementById('admin-error');
  const sucEl = document.getElementById('admin-success');
  errEl.style.display = 'none'; sucEl.style.display = 'none';

  const candId = document.getElementById('hours-cand-id').value;
  const hours  = parseFloat(document.getElementById('hours-value').value);

  if (!candId || isNaN(hours)) {
    errEl.textContent = 'Please select a candidate and enter valid hours.';
    errEl.style.display = 'block';
    return;
  }

  const { error } = await db.from('candidates').update({ qualifying_hours: hours }).eq('id', candId);
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }
  sucEl.textContent = 'Hours updated.';
  sucEl.style.display = 'block';
  setTimeout(() => renderAdmin(), 1000);
}

// ── Delete DCA ─────────────────────────────────────────────────
async function loadDcasForDelete() {
  const candId = document.getElementById('del-dca-cand').value;
  const sel    = document.getElementById('del-dca-id');
  sel.innerHTML = '<option value="">Loading…</option>';

  if (!candId) { sel.innerHTML = '<option value="">Select candidate first…</option>'; return; }

  const { data } = await db.from('dcas').select('id, incident_date, incident_number, acuity, phase')
    .eq('candidate_id', candId).order('incident_date', { ascending: false });

  if (!data || data.length === 0) {
    sel.innerHTML = '<option value="">No DCAs found</option>';
    return;
  }

  sel.innerHTML = '<option value="">Select DCA…</option>' +
    data.map(d => `<option value="${d.id}">${d.incident_date} — ${d.incident_number||'no incident #'} — Phase ${d.phase} — ${d.acuity?.toUpperCase()}</option>`).join('');
}

async function deleteDca() {
  const dcaId = document.getElementById('del-dca-id').value;
  if (!dcaId) { alert('Please select a DCA to delete.'); return; }

  if (!confirm('Delete this DCA and any gap records it created? This cannot be undone.')) return;

  // Gaps cascade-delete via FK, but let's be explicit
  await db.from('capability_gaps').delete().eq('dca_id', dcaId);
  const { error } = await db.from('dcas').delete().eq('id', dcaId);

  if (error) { alert('Error deleting DCA: ' + error.message); return; }

  const errEl = document.getElementById('admin-error');
  const sucEl = document.getElementById('admin-success');
  errEl.style.display = 'none';
  sucEl.textContent = 'DCA deleted.';
  sucEl.style.display = 'block';
  document.getElementById('del-dca-id').innerHTML = '<option value="">Select candidate first…</option>';
  document.getElementById('del-dca-cand').value = '';
}

// ── Delete candidate ───────────────────────────────────────────
async function deleteCandidate(id, name) {
  if (!confirm(`Delete "${name}" and ALL their records (DCAs, gaps, conferences, capstone)? This cannot be undone.`)) return;

  // Delete in dependency order
  await db.from('capability_gaps').delete().eq('candidate_id', id);
  await db.from('dcas').delete().eq('candidate_id', id);
  await db.from('phase_transitions').delete().eq('candidate_id', id);
  await db.from('sam_conferences').delete().eq('candidate_id', id);
  await db.from('capstone_evaluations').delete().eq('candidate_id', id);
  const { error } = await db.from('candidates').delete().eq('id', id);

  if (error) { alert('Error deleting candidate: ' + error.message); return; }
  renderAdmin();
}

// ── Delete profile ─────────────────────────────────────────────
async function deleteProfile(id, name) {
  if (id === currentProfile?.id) { alert("You can't delete your own profile."); return; }
  if (!confirm(`Delete profile for "${name}"? This does not delete their Supabase login — do that separately in the Supabase Auth dashboard if needed.`)) return;

  const { error } = await db.from('profiles').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  renderAdmin();
}

// ── Edit candidate ─────────────────────────────────────────────
async function editCandidate(id) {
  const { data: c } = await db.from('candidates').select('*').eq('id', id).single();
  document.getElementById('edit-cand-id').value               = c.id;
  document.getElementById('edit-cand-name').value             = c.full_name;
  document.getElementById('edit-cand-fti').value              = c.assigned_fti_id || '';
  document.getElementById('edit-cand-sam').value              = c.assigned_sam_id || '';
  document.getElementById('edit-cand-status').value           = c.program_status;
  document.getElementById('edit-cand-extension').value        = c.extension_granted ? 'true' : 'false';
  document.getElementById('edit-cand-second-extension').value = c.second_extension_granted ? 'true' : 'false';
  document.getElementById('edit-cand-notes').value            = c.notes || '';
  document.getElementById('edit-candidate-panel').style.display = 'block';
  document.getElementById('edit-candidate-panel').scrollIntoView({ behavior:'smooth' });
}

async function saveEditCandidate() {
  const id = document.getElementById('edit-cand-id').value;
  const { error } = await db.from('candidates').update({
    full_name:                document.getElementById('edit-cand-name').value,
    assigned_fti_id:          document.getElementById('edit-cand-fti').value || null,
    assigned_sam_id:          document.getElementById('edit-cand-sam').value || null,
    program_status:           document.getElementById('edit-cand-status').value,
    extension_granted:        document.getElementById('edit-cand-extension').value === 'true',
    second_extension_granted: document.getElementById('edit-cand-second-extension').value === 'true',
    notes:                    document.getElementById('edit-cand-notes').value || null
  }).eq('id', id);

  if (error) { alert(error.message); return; }
  document.getElementById('edit-candidate-panel').style.display = 'none';
  renderAdmin();
}

// ── Edit profile ───────────────────────────────────────────────
function editProfile(id, name, role, shift) {
  document.getElementById('edit-prof-id').value    = id;
  document.getElementById('edit-prof-name').value  = name;
  document.getElementById('edit-prof-role').value  = role;
  document.getElementById('edit-prof-shift').value = shift;
  document.getElementById('edit-profile-panel').style.display = 'block';
  document.getElementById('edit-profile-panel').scrollIntoView({ behavior:'smooth' });
}

async function saveEditProfile() {
  const id = document.getElementById('edit-prof-id').value;
  const { error } = await db.from('profiles').update({
    full_name: document.getElementById('edit-prof-name').value,
    role:      document.getElementById('edit-prof-role').value,
    shift:     document.getElementById('edit-prof-shift').value || null
  }).eq('id', id);

  if (error) { alert(error.message); return; }
  document.getElementById('edit-profile-panel').style.display = 'none';
  renderAdmin();
}

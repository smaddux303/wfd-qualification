// pages/admin.js — Admin panel: manage users, candidates, assignments

async function renderAdmin() {
  setActiveNav('admin');
  destroyCharts();
  setMain('<div class="page"><div class="loading">Loading admin panel…</div></div>');

  const [candidates, profiles] = await Promise.all([
    db.from('candidates').select('*, fti:assigned_fti_id(full_name), sam:assigned_sam_id(full_name)').order('full_name'),
    db.from('profiles').select('*').order('full_name')
  ]);

  const ftis = (profiles.data||[]).filter(p => p.role === 'fti');
  const sams = (profiles.data||[]).filter(p => ['sam_officer','admin'].includes(p.role));

  function profileRow(p) {
    return `<tr>
      <td style="font-weight:500">${p.full_name}</td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--muted)">${p.badge_number||'—'}</td>
      <td><span style="font-family:var(--mono);font-size:11px;color:var(--accent)">${p.role}</span></td>
      <td style="font-size:12px;color:var(--muted)">${p.shift||'—'}</td>
      <td>
        <button class="btn btn-sm" onclick="editProfile('${p.id}','${p.full_name}','${p.badge_number||''}','${p.role}','${p.shift||''}')">Edit</button>
      </td>
    </tr>`;
  }

  function candidateRow(c) {
    return `<tr>
      <td style="font-weight:500">${c.full_name}</td>
      <td style="font-size:12px;color:var(--muted)">${(c.candidate_group||'').replace('_',' ')}</td>
      <td>${phaseBadge(c.current_phase)}</td>
      <td style="font-size:12px;color:var(--muted)">${c.fti?.full_name||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${c.sam?.full_name||'—'}</td>
      <td><span style="font-family:var(--mono);font-size:11px;color:var(--green)">${c.program_status}</span></td>
      <td style="font-family:var(--mono);font-size:12px">${c.qualifying_hours}h</td>
      <td>
        <button class="btn btn-sm" onclick="editCandidate('${c.id}')">Edit</button>
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
          <label>Badge number</label>
          <input type="text" id="new-cand-badge" placeholder="WFD-099" />
        </div>
        <div class="form-group">
          <label>Candidate group *</label>
          <select id="new-cand-group">
            <option value="">Select…</option>
            <option value="paramedic_cadet">Probationary Paramedic</option>
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
    </div>

    <!-- Add new profile -->
    <div class="card">
      <div class="card-title">Add staff profile</div>
      <p class="text-muted mb-2">First create the user in Supabase Authentication → Users. Then add their profile here using the UUID Supabase assigns them.</p>
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
          <label>Badge number</label>
          <input type="text" id="new-prof-badge" placeholder="WFD-042" />
        </div>
        <div class="form-group">
          <label>Role *</label>
          <select id="new-prof-role">
            <option value="fti">FTI — Field Training Instructor</option>
            <option value="sam_officer">SAM Officer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label>Shift</label>
          <select id="new-prof-shift">
            <option value="">—</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="addProfile()">Add profile</button>
    </div>

    <!-- Update hours for a candidate -->
    <div class="card">
      <div class="card-title">Update candidate hours</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Candidate</label>
          <select id="hours-cand-id">
            <option value="">Select…</option>
            ${(candidates.data||[]).map(c=>`<option value="${c.id}">${c.full_name} (${c.qualifying_hours}h)</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>New total qualifying hours</label>
          <input type="number" id="hours-value" placeholder="e.g. 384" step="0.5" />
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="updateHours()">Update hours</button>
    </div>

    <!-- Existing candidates -->
    <div class="card" style="padding:0;overflow:hidden;margin-top:24px">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div class="card-title" style="margin-bottom:0">All candidates (${(candidates.data||[]).length})</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Group</th><th>Phase</th><th>FTI</th><th>SAM</th><th>Status</th><th>Hours</th><th></th>
          </tr></thead>
          <tbody>${(candidates.data||[]).map(candidateRow).join('') || '<tr><td colspan="8" style="color:var(--muted);text-align:center;padding:20px">No candidates yet.</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <!-- Existing profiles -->
    <div class="card" style="padding:0;overflow:hidden;margin-top:16px">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <div class="card-title" style="margin-bottom:0">Staff profiles (${(profiles.data||[]).length})</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Badge</th><th>Role</th><th>Shift</th><th></th></tr></thead>
          <tbody>${(profiles.data||[]).map(profileRow).join('')}</tbody>
        </table>
      </div>
    </div>

    <!-- Edit modals (inline) -->
    <div id="edit-candidate-panel" style="display:none" class="card" style="margin-top:16px">
      <div class="card-title">Edit candidate</div>
      <div class="form-grid">
        <input type="hidden" id="edit-cand-id" />
        <div class="form-group">
          <label>Full name</label>
          <input type="text" id="edit-cand-name" />
        </div>
        <div class="form-group">
          <label>Badge number</label>
          <input type="text" id="edit-cand-badge" />
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
          <label>Extension granted</label>
          <select id="edit-cand-extension">
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

    <div id="edit-profile-panel" style="display:none" class="card" style="margin-top:16px">
      <div class="card-title">Edit profile</div>
      <div class="form-grid">
        <input type="hidden" id="edit-prof-id" />
        <div class="form-group">
          <label>Full name</label>
          <input type="text" id="edit-prof-name" />
        </div>
        <div class="form-group">
          <label>Badge number</label>
          <input type="text" id="edit-prof-badge" />
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
            <option value="D">D</option>
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

  const { error } = await db.from('candidates').insert({
    full_name:        name,
    badge_number:     document.getElementById('new-cand-badge').value || null,
    candidate_group:  group,
    assigned_fti_id:  document.getElementById('new-cand-fti').value || null,
    assigned_sam_id:  document.getElementById('new-cand-sam').value || null,
    current_phase:    document.getElementById('new-cand-phase').value,
    program_start_date: start,
    attempt_number:   parseInt(document.getElementById('new-cand-attempt').value)||1,
    notes:            document.getElementById('new-cand-notes').value || null,
    program_status:   'active',
    qualifying_hours: 0
  });

  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

  sucEl.textContent = `Candidate "${name}" added successfully.`;
  sucEl.style.display = 'block';
  setTimeout(() => renderAdmin(), 1200);
}

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
    full_name:    name,
    badge_number: document.getElementById('new-prof-badge').value || null,
    role,
    shift:        document.getElementById('new-prof-shift').value || null
  });

  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

  sucEl.textContent = `Profile for "${name}" added.`;
  sucEl.style.display = 'block';
  setTimeout(() => renderAdmin(), 1200);
}

async function updateHours() {
  const errEl = document.getElementById('admin-error');
  const sucEl = document.getElementById('admin-success');
  errEl.style.display = 'none'; sucEl.style.display = 'none';

  const candId = document.getElementById('hours-cand-id').value;
  const hours  = parseFloat(document.getElementById('hours-value').value);

  if (!candId || isNaN(hours)) {
    errEl.textContent = 'Please select a candidate and enter a valid hour total.';
    errEl.style.display = 'block';
    return;
  }

  const { error } = await db.from('candidates').update({ qualifying_hours: hours }).eq('id', candId);
  if (error) { errEl.textContent = error.message; errEl.style.display = 'block'; return; }

  sucEl.textContent = 'Hours updated.';
  sucEl.style.display = 'block';
  setTimeout(() => renderAdmin(), 1000);
}

async function editCandidate(id) {
  const { data: c } = await db.from('candidates').select('*').eq('id', id).single();
  document.getElementById('edit-cand-id').value         = c.id;
  document.getElementById('edit-cand-name').value       = c.full_name;
  document.getElementById('edit-cand-badge').value      = c.badge_number || '';
  document.getElementById('edit-cand-fti').value        = c.assigned_fti_id || '';
  document.getElementById('edit-cand-sam').value        = c.assigned_sam_id || '';
  document.getElementById('edit-cand-status').value     = c.program_status;
  document.getElementById('edit-cand-extension').value  = c.extension_granted ? 'true' : 'false';
  document.getElementById('edit-cand-notes').value      = c.notes || '';
  document.getElementById('edit-candidate-panel').style.display = 'block';
  document.getElementById('edit-candidate-panel').scrollIntoView({ behavior:'smooth' });
}

async function saveEditCandidate() {
  const id = document.getElementById('edit-cand-id').value;
  const { error } = await db.from('candidates').update({
    full_name:       document.getElementById('edit-cand-name').value,
    badge_number:    document.getElementById('edit-cand-badge').value || null,
    assigned_fti_id: document.getElementById('edit-cand-fti').value || null,
    assigned_sam_id: document.getElementById('edit-cand-sam').value || null,
    program_status:  document.getElementById('edit-cand-status').value,
    extension_granted: document.getElementById('edit-cand-extension').value === 'true',
    notes:           document.getElementById('edit-cand-notes').value || null
  }).eq('id', id);

  if (error) { alert(error.message); return; }
  document.getElementById('edit-candidate-panel').style.display = 'none';
  renderAdmin();
}

function editProfile(id, name, badge, role, shift) {
  document.getElementById('edit-prof-id').value    = id;
  document.getElementById('edit-prof-name').value  = name;
  document.getElementById('edit-prof-badge').value = badge;
  document.getElementById('edit-prof-role').value  = role;
  document.getElementById('edit-prof-shift').value = shift;
  document.getElementById('edit-profile-panel').style.display = 'block';
  document.getElementById('edit-profile-panel').scrollIntoView({ behavior:'smooth' });
}

async function saveEditProfile() {
  const id = document.getElementById('edit-prof-id').value;
  const { error } = await db.from('profiles').update({
    full_name:    document.getElementById('edit-prof-name').value,
    badge_number: document.getElementById('edit-prof-badge').value || null,
    role:         document.getElementById('edit-prof-role').value,
    shift:        document.getElementById('edit-prof-shift').value || null
  }).eq('id', id);

  if (error) { alert(error.message); return; }
  document.getElementById('edit-profile-panel').style.display = 'none';
  renderAdmin();
}

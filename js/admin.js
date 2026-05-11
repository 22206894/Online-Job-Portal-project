// admin.js — Admin panel

var userToken    = null;
var allUsers     = [];
var allJobs      = [];
var allApps      = [];
var currentTab   = 'users';
var confirmAction = null;

// ── Auth guard — admin only ──────────────────────────────────
firebase.auth().onAuthStateChanged(function (user) {
  if (!user) { window.location.href = '../index.html'; return; }
  document.getElementById('navUser').textContent  = user.displayName || user.email;
  document.getElementById('adminName').textContent = user.displayName || user.email;

  user.getIdToken().then(function (token) {
    userToken = token;
    // Verify admin role before loading anything
    fetch(API + '/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function (r) {
        if (r.status === 403) { window.location.href = '../index.html'; return null; }
        return r.json();
      })
      .then(function (stats) {
        if (!stats) return;
        document.getElementById('statUsers').textContent     = stats.totalUsers;
        document.getElementById('statSeekers').textContent   = stats.totalSeekers;
        document.getElementById('statEmployers').textContent = stats.totalEmployers;
        document.getElementById('statJobs').textContent      = stats.totalJobs;
        document.getElementById('statApps').textContent      = stats.totalApps;
        loadUsers();
        loadJobs();
        loadApplications();
      })
      .catch(function () { window.location.href = '../index.html'; });
  });
});

// ── Tab switching ────────────────────────────────────────────
function switchTab(tab, btn) {
  ['users','jobs','applications'].forEach(function (t) {
    document.getElementById('tab-' + t).classList.add('hidden');
  });
  document.querySelectorAll('.dash-tab').forEach(function (b) { b.classList.remove('dash-tab--active'); });
  document.getElementById('tab-' + tab).classList.remove('hidden');
  btn.classList.add('dash-tab--active');
  currentTab = tab;
  document.getElementById('adminSearch').value = '';
  filterTable();
}

// ── Search / filter ──────────────────────────────────────────
function filterTable() {
  var q = document.getElementById('adminSearch').value.toLowerCase();
  if (currentTab === 'users')        renderUsers(allUsers.filter(function (u) {
    return (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.username||'').toLowerCase().includes(q);
  }));
  if (currentTab === 'jobs')         renderJobs(allJobs.filter(function (j) {
    return (j.title||'').toLowerCase().includes(q) || (j.employer_name||'').toLowerCase().includes(q) || (j.location||'').toLowerCase().includes(q);
  }));
  if (currentTab === 'applications') renderApps(allApps.filter(function (a) {
    return (a.seeker_name||'').toLowerCase().includes(q) || (a.job_title||'').toLowerCase().includes(q) || (a.seeker_email||'').toLowerCase().includes(q);
  }));
}

// ── Users ────────────────────────────────────────────────────
function loadUsers() {
  fetch(API + '/api/admin/users', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (users) { allUsers = users; renderUsers(users); })
    .catch(function () { document.getElementById('usersBody').innerHTML = '<tr><td colspan="6" class="admin-empty"><i class="bi bi-exclamation-circle"></i>Failed to load users</td></tr>'; });
}

function renderUsers(users) {
  var body = document.getElementById('usersBody');
  if (!users.length) { body.innerHTML = '<tr><td colspan="6" class="admin-empty"><i class="bi bi-people"></i>No users found</td></tr>'; return; }
  body.innerHTML = users.map(function (u) {
    return '<tr>' +
      '<td><strong>' + escHtml(u.name || '—') + '</strong></td>' +
      '<td style="color:var(--text-muted)">' + escHtml(u.email) + '</td>' +
      '<td style="color:var(--text-muted)">@' + escHtml(u.username || '—') + '</td>' +
      '<td><span class="role-badge role-badge--' + u.role + '">' + u.role + '</span></td>' +
      '<td style="color:var(--text-faint)">' + formatDate(u.created_at) + '</td>' +
      '<td><div class="admin-actions">' +
        '<select class="admin-role-select" onchange="changeRole(' + u.id + ', this.value, this)">' +
          ['seeker','employer','admin'].map(function (r) { return '<option value="' + r + '"' + (u.role===r?' selected':'') + '>' + r.charAt(0).toUpperCase()+r.slice(1) + '</option>'; }).join('') +
        '</select>' +
        '<button class="btn--danger" onclick="confirmDelete(\'user\',' + u.id + ',\'' + escHtml(u.name||u.email) + '\')"><i class="bi bi-trash"></i></button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}

function changeRole(userId, role, select) {
  fetch(API + '/api/admin/users/' + userId + '/role', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify({ role: role })
  })
    .then(function (r) { return r.json(); })
    .then(function () {
      showToast('Role updated to ' + role, 'success');
      var row = select.closest('tr');
      row.querySelector('.role-badge').className = 'role-badge role-badge--' + role;
      row.querySelector('.role-badge').textContent = role;
      var u = allUsers.find(function (u) { return u.id === userId; });
      if (u) u.role = role;
    })
    .catch(function () { showToast('Failed to update role.', 'error'); });
}

// ── Jobs ─────────────────────────────────────────────────────
function loadJobs() {
  fetch(API + '/api/admin/jobs', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (jobs) { allJobs = jobs; renderJobs(jobs); })
    .catch(function () {});
}

function renderJobs(jobs) {
  var body = document.getElementById('jobsBody');
  if (!jobs.length) { body.innerHTML = '<tr><td colspan="7" class="admin-empty"><i class="bi bi-briefcase"></i>No jobs found</td></tr>'; return; }
  body.innerHTML = jobs.map(function (j) {
    return '<tr>' +
      '<td><strong>' + escHtml(j.title) + '</strong></td>' +
      '<td style="color:var(--text-muted)">' + escHtml(j.employer_name || '—') + '</td>' +
      '<td style="color:var(--text-muted)">' + escHtml(j.location || '—') + '</td>' +
      '<td><span class="role-badge" style="background:#f3f4f6;color:var(--text-muted)">' + (j.job_type||'—') + '</span></td>' +
      '<td style="text-align:center"><strong>' + (j.applicant_count||0) + '</strong></td>' +
      '<td>' +
        '<select class="admin-status-select" onchange="changeJobStatus(' + j.id + ',this.value)">' +
          ['open','closed','pending'].map(function (s) { return '<option value="'+s+'"'+(j.status===s?' selected':'')+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>'; }).join('') +
        '</select>' +
      '</td>' +
      '<td><button class="btn--danger" onclick="confirmDelete(\'job\',' + j.id + ',\'' + escHtml(j.title) + '\')"><i class="bi bi-trash"></i></button></td>' +
    '</tr>';
  }).join('');
}

function changeJobStatus(jobId, status) {
  fetch(API + '/api/admin/jobs/' + jobId + '/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify({ status: status })
  })
    .then(function () { showToast('Job status updated to ' + status, 'success'); })
    .catch(function () { showToast('Failed to update status.', 'error'); });
}

// ── Applications ─────────────────────────────────────────────
function loadApplications() {
  fetch(API + '/api/admin/applications', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (apps) { allApps = apps; renderApps(apps); })
    .catch(function () {});
}

function renderApps(apps) {
  var body = document.getElementById('appsBody');
  if (!apps.length) { body.innerHTML = '<tr><td colspan="6" class="admin-empty"><i class="bi bi-send"></i>No applications found</td></tr>'; return; }
  body.innerHTML = apps.map(function (a) {
    var sc      = parseFloat(a.match_score) || 0;
    var scClass = sc >= 70 ? 'score-high' : sc >= 40 ? 'score-mid' : sc > 0 ? 'score-low' : 'score-none';
    var scText  = sc > 0 ? sc.toFixed(0) + '%' : '—';
    return '<tr>' +
      '<td><strong>' + escHtml(a.seeker_name || '—') + '</strong></td>' +
      '<td style="color:var(--text-muted)">' + escHtml(a.seeker_email || '—') + '</td>' +
      '<td>' + escHtml(a.job_title || '—') + '</td>' +
      '<td><span class="' + scClass + '">' + scText + '</span></td>' +
      '<td><span class="status-badge status-badge--' + a.status + '">' + a.status + '</span></td>' +
      '<td style="color:var(--text-faint)">' + formatDate(a.applied_at) + '</td>' +
    '</tr>';
  }).join('');
}

// ── Confirm delete modal ─────────────────────────────────────
function confirmDelete(type, id, name) {
  document.getElementById('confirmTitle').textContent = 'Delete ' + type + '?';
  document.getElementById('confirmMsg').textContent   = 'This will permanently delete "' + name + '". This cannot be undone.';
  var btn = document.getElementById('confirmBtn');
  btn.onclick = function () {
    var url = type === 'user' ? API + '/api/admin/users/' + id : API + '/api/admin/jobs/' + id;
    fetch(url, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + userToken } })
      .then(function () {
        closeConfirm();
        showToast(type.charAt(0).toUpperCase() + type.slice(1) + ' deleted.', 'success');
        if (type === 'user') loadUsers();
        else                 loadJobs();
      })
      .catch(function () { showToast('Failed to delete.', 'error'); });
  };
  document.getElementById('confirmOverlay').classList.add('modal-overlay--open');
}

function closeConfirm() { document.getElementById('confirmOverlay').classList.remove('modal-overlay--open'); }

// ── Helpers ──────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function handleSignOut() { firebase.auth().signOut().then(function () { window.location.href = window.location.origin + '/index.html'; }); }

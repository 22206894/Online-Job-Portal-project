// employer.js — employer dashboard

var userToken  = null;
var myJobs     = [];
var editingJob = null;

// ── Auth guard ───────────────────────────────────────────────
firebase.auth().onAuthStateChanged(function (user) {
  if (!user) { window.location.href = '../index.html'; return; }
  document.getElementById('navUser').textContent = user.displayName || user.email;
  document.getElementById('empName').textContent = user.displayName || 'Employer';
  user.getIdToken().then(function (token) {
    userToken = token;
    loadMyJobs();
    loadCompanyProfile();
    initNotifications(token);
  });
});

// ── Tab switching ────────────────────────────────────────────
function switchTab(tab, btn) {
  ['jobs','applicants','company'].forEach(function (t) {
    document.getElementById('tab-' + t).classList.add('hidden');
  });
  document.querySelectorAll('.dash-tab').forEach(function (b) { b.classList.remove('dash-tab--active'); });
  document.getElementById('tab-' + tab).classList.remove('hidden');
  if (btn) btn.classList.add('dash-tab--active');
}

// ── Load my jobs ─────────────────────────────────────────────
function loadMyJobs() {
  fetch(API + '/api/jobs?mine=true', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      myJobs = jobs;
      document.getElementById('dsJobs').textContent = jobs.filter(function(j){ return j.status==='open'; }).length;
      renderMyJobs(jobs);
      buildJobSelector(jobs);
      loadApplicantStats(jobs);
    })
    .catch(function () {
      document.getElementById('empJobsList').innerHTML =
        '<div class="jobs-empty"><i class="bi bi-exclamation-circle"></i><h3>Could not load jobs</h3><p>Make sure the server is running.</p></div>';
    });
}

function loadApplicantStats(jobs) {
  var total = 0, accepted = 0, scores = [];
  var promises = jobs.map(function (j) {
    return fetch(API + '/api/applications/job/' + j.id, { headers: { 'Authorization': 'Bearer ' + userToken } })
      .then(function (r) { return r.json(); })
      .then(function (apps) {
        total    += apps.length;
        accepted += apps.filter(function (a) { return a.status === 'accepted'; }).length;
        apps.forEach(function (a) { if (a.match_score > 0) scores.push(parseFloat(a.match_score)); });
      }).catch(function(){});
  });
  Promise.all(promises).then(function () {
    document.getElementById('dsApplicants').textContent = total;
    document.getElementById('dsAccepted').textContent   = accepted;
    var avg = scores.length ? (scores.reduce(function(a,b){return a+b;},0)/scores.length).toFixed(0)+'%' : '—';
    document.getElementById('dsAvgScore').textContent   = avg;
  });
}

// ── Render job listings ──────────────────────────────────────
function renderMyJobs(jobs) {
  var list = document.getElementById('empJobsList');
  if (!jobs.length) {
    list.innerHTML = '<div class="jobs-empty"><i class="bi bi-briefcase"></i><h3>No jobs posted yet</h3><p>Click <strong>Post a Job</strong> to get started.</p></div>';
    return;
  }
  list.innerHTML = jobs.map(function (j) {
    var statusColor = j.status === 'open' ? '#16a34a' : j.status === 'closed' ? '#dc2626' : '#ca8a04';
    return '<div class="emp-job-card">' +
      '<div class="emp-job-card__header">' +
        '<div class="emp-job-card__left">' +
          '<div class="emp-job-logo">' + (j.title||'J').substring(0,2).toUpperCase() + '</div>' +
          '<div>' +
            '<div class="emp-job-card__title">' + escHtml(j.title) + '</div>' +
            '<div class="emp-job-card__meta">' +
              (j.location ? '<span><i class="bi bi-geo-alt"></i> ' + escHtml(j.location) + '</span>' : '') +
              (j.salary   ? '<span><i class="bi bi-cash"></i> '    + escHtml(j.salary)   + '</span>' : '') +
              (j.job_type ? '<span><i class="bi bi-briefcase"></i> '+ j.job_type          + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="emp-job-card__actions">' +
          '<span class="emp-status-dot" style="background:' + statusColor + '" title="' + j.status + '"></span>' +
          '<button class="btn btn--ghost btn--sm" onclick="viewApplicants(' + j.id + ')"><i class="bi bi-people"></i> Applicants</button>' +
          '<button class="btn btn--ghost btn--sm" onclick="editJob(' + j.id + ')"><i class="bi bi-pencil"></i> Edit</button>' +
          '<button class="btn btn--ghost btn--sm emp-delete-btn" onclick="deleteJob(' + j.id + ',this)"><i class="bi bi-trash"></i></button>' +
        '</div>' +
      '</div>' +
      '<div class="emp-job-card__footer">' +
        '<span class="emp-job-card__stat"><i class="bi bi-calendar3"></i> Posted ' + timeAgo(j.created_at) + '</span>' +
        '<span class="emp-job-card__stat"><i class="bi bi-circle-fill" style="font-size:0.5rem;color:' + statusColor + '"></i> ' + j.status.charAt(0).toUpperCase()+j.status.slice(1) + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

// ── Job selector for applicants tab ─────────────────────────
function buildJobSelector(jobs) {
  var list = document.getElementById('jobSelectorList');
  list.innerHTML = jobs.map(function (j) {
    return '<div class="job-selector-item" onclick="viewApplicants(' + j.id + ')">' +
      '<div class="job-selector-item__title">' + escHtml(j.title) + '</div>' +
      '<div class="job-selector-item__meta">' + escHtml(j.location||'') + ' · ' + j.status + '</div>' +
      '<i class="bi bi-chevron-right"></i>' +
    '</div>';
  }).join('');
}

function showJobSelector() {
  document.getElementById('jobSelector').classList.remove('hidden');
  document.getElementById('applicantsList').classList.add('hidden');
}

// ── View applicants for a job ────────────────────────────────
function viewApplicants(jobId) {
  switchTab('applicants', document.querySelectorAll('.dash-tab')[1]);
  document.getElementById('jobSelector').classList.add('hidden');
  document.getElementById('applicantsList').classList.remove('hidden');
  var content = document.getElementById('applicantsContent');
  content.innerHTML = '<div class="jobs-loading"><div class="spinner-lg"></div><p>Loading applicants…</p></div>';

  var job = myJobs.find(function (j) { return j.id === jobId; });
  fetch(API + '/api/applications/job/' + jobId, { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (apps) {
      if (!apps.length) {
        content.innerHTML = '<div class="jobs-empty"><i class="bi bi-people"></i><h3>No applicants yet</h3><p>Share your job listing to attract candidates.</p></div>';
        return;
      }
      content.innerHTML =
        '<div class="applicants-header">' +
          '<h3 class="applicants-title">' + escHtml(job ? job.title : 'Job') + '</h3>' +
          '<span class="applicants-count">' + apps.length + ' applicant' + (apps.length!==1?'s':'') + ' · ranked by match score</span>' +
        '</div>' +
        apps.map(function (a, i) {
          var sc     = parseFloat(a.match_score) || 0;
          var scCol  = sc >= 70 ? '#16a34a' : sc >= 40 ? '#ca8a04' : '#dc2626';
          var init   = (a.seeker_name||'U').substring(0,2).toUpperCase();
          var rank   = i + 1;
          var rankCl = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : '';
          return '<div class="applicant-row">' +
            '<div class="applicant-row__rank ' + rankCl + '">' + rank + '</div>' +
            '<div class="applicant-row__avatar">' + init + '</div>' +
            '<div class="applicant-row__info">' +
              '<div class="applicant-row__name">' + escHtml(a.seeker_name||'Unknown') + '</div>' +
              '<div class="applicant-row__email">' + escHtml(a.seeker_email||'') + '</div>' +
            '</div>' +
            '<div class="applicant-row__score" style="color:' + scCol + '">' + (sc > 0 ? sc.toFixed(0)+'%' : '—') + '</div>' +
            '<div class="applicant-row__actions">' +
              '<span class="status-badge status-badge--' + a.status + '">' + a.status + '</span>' +
              (a.cv_filename
                ? '<a class="btn btn--ghost btn--sm" href="' + API + '/uploads/' + encodeURIComponent(a.cv_filename) + '" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf"></i> CV</a>'
                : '<span style="font-size:0.75rem;color:var(--text-faint)">No CV</span>') +
              '<button class="btn btn--ghost btn--sm" onclick="openCvReview(' + a.id + ')"><i class="bi bi-bar-chart"></i> Review</button>' +
              '<select class="status-select" onchange="updateStatus(' + a.id + ',this.value)">' +
                ['pending','reviewed','accepted','rejected'].map(function(s){
                  return '<option value="'+s+'"'+(a.status===s?' selected':'')+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>';
                }).join('') +
              '</select>' +
            '</div>' +
          '</div>';
        }).join('');
    })
    .catch(function () {
      content.innerHTML = '<div class="jobs-empty"><i class="bi bi-exclamation-circle"></i><h3>Could not load applicants</h3></div>';
    });
}

// ── Update application status ────────────────────────────────
function updateStatus(appId, status) {
  fetch(API + '/api/applications/' + appId + '/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify({ status: status })
  })
    .then(function () { showToast('Status updated to ' + status, 'success'); })
    .catch(function () { showToast('Could not update status.', 'error'); });
}

// ── Post job modal ───────────────────────────────────────────
function openPostJob() {
  editingJob = null;
  document.getElementById('jobModalTitle').textContent = 'Post a New Job';
  document.getElementById('postJobText').innerHTML     = '<i class="bi bi-plus-lg"></i> Post Job';
  document.getElementById('postJobForm').reset();
  document.getElementById('editJobId').value = '';
  document.getElementById('postJobOverlay').classList.add('modal-overlay--open');
}

function editJob(jobId) {
  var job = myJobs.find(function (j) { return j.id === jobId; });
  if (!job) return;
  editingJob = job;
  document.getElementById('jobModalTitle').textContent   = 'Edit Job';
  document.getElementById('postJobText').innerHTML       = '<i class="bi bi-check-lg"></i> Save Changes';
  document.getElementById('editJobId').value             = jobId;
  document.getElementById('pj-title').value             = job.title  || '';
  document.getElementById('pj-desc').value              = job.description || '';
  document.getElementById('pj-req').value               = job.requirements || '';
  document.getElementById('pj-loc').value               = job.location || '';
  document.getElementById('pj-salary').value            = job.salary  || '';
  document.getElementById('pj-type').value              = job.job_type || 'full-time';
  document.getElementById('pj-status').value            = job.status  || 'open';
  document.getElementById('postJobOverlay').classList.add('modal-overlay--open');
}

function closePostJob()           { document.getElementById('postJobOverlay').classList.remove('modal-overlay--open'); }
function closePostJobModal(e)     { if (e.target === document.getElementById('postJobOverlay')) closePostJob(); }

document.getElementById('postJobForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var btn  = document.getElementById('postJobBtn');
  var text = document.getElementById('postJobText');
  var spin = document.getElementById('postJobSpinner');
  btn.disabled = true; text.classList.add('hidden'); spin.classList.remove('hidden');

  var payload = {
    title:        document.getElementById('pj-title').value.trim(),
    description:  document.getElementById('pj-desc').value.trim(),
    requirements: document.getElementById('pj-req').value.trim(),
    location:     document.getElementById('pj-loc').value.trim(),
    salary:       document.getElementById('pj-salary').value.trim(),
    job_type:     document.getElementById('pj-type').value,
    status:       document.getElementById('pj-status').value,
  };

  var editId = document.getElementById('editJobId').value;
  var method = editId ? 'PUT' : 'POST';
  var url    = editId ? API + '/api/jobs/' + editId : API + '/api/jobs';

  fetch(url, {
    method:  method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body:    JSON.stringify(payload)
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);
      btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
      closePostJob();
      document.getElementById('postJobForm').reset();
      showToast(editId ? 'Job updated!' : 'Job posted!', 'success');
      loadMyJobs();
    })
    .catch(function (err) {
      btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
      showToast(err.message || 'Could not save job.', 'error');
    });
});

// ── Delete job ───────────────────────────────────────────────
function deleteJob(jobId, btn) {
  if (!confirm('Delete this job listing? This cannot be undone.')) return;
  btn.disabled = true;
  fetch(API + '/api/jobs/' + jobId, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function () { showToast('Job deleted.', 'success'); loadMyJobs(); })
    .catch(function () { btn.disabled = false; showToast('Could not delete job.', 'error'); });
}

// ── Company profile ──────────────────────────────────────────
function loadCompanyProfile() {
  fetch(API + '/api/profile/company', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (p) {
      if (!p) return;
      if (p.company_name) {
        document.getElementById('cf-name').value         = p.company_name;
        document.getElementById('companyNameDisplay').textContent = p.company_name;
        document.getElementById('empName').textContent   = p.company_name;
      }
      if (p.industry)    document.getElementById('cf-industry').value = p.industry;
      if (p.location)    document.getElementById('cf-location').value = p.location;
      if (p.size)        document.getElementById('cf-size').value     = p.size;
      if (p.website)     document.getElementById('cf-website').value  = p.website;
      if (p.description) document.getElementById('cf-desc').value     = p.description;
      document.getElementById('companyMetaDisplay').textContent = [p.industry, p.location, p.size].filter(Boolean).join(' · ');
      document.getElementById('companyLogoPreview').textContent = (p.company_name||'C').substring(0,2).toUpperCase();
    }).catch(function () {});
}

document.getElementById('companyForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var btn  = document.getElementById('companySaveBtn');
  var text = document.getElementById('companySaveText');
  var spin = document.getElementById('companySaveSpinner');
  btn.disabled = true; text.classList.add('hidden'); spin.classList.remove('hidden');

  var payload = {
    company_name: document.getElementById('cf-name').value.trim(),
    industry:     document.getElementById('cf-industry').value,
    location:     document.getElementById('cf-location').value.trim(),
    size:         document.getElementById('cf-size').value,
    website:      document.getElementById('cf-website').value.trim(),
    description:  document.getElementById('cf-desc').value.trim(),
  };

  fetch(API + '/api/profile/company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify(payload)
  })
    .then(function () {
      btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
      document.getElementById('companyNameDisplay').textContent = payload.company_name;
      document.getElementById('empName').textContent           = payload.company_name;
      document.getElementById('companyLogoPreview').textContent = (payload.company_name||'C').substring(0,2).toUpperCase();
      document.getElementById('companyMetaDisplay').textContent = [payload.industry, payload.location, payload.size].filter(Boolean).join(' · ');
      showToast('Company profile saved!', 'success');
    })
    .catch(function () {
      btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
      showToast('Could not save profile.', 'error');
    });
});

// ── CV Review modal ──────────────────────────────────────────
function openCvReview(appId) {
  var overlay = document.getElementById('cvReviewOverlay');
  var body    = document.getElementById('cvReviewBody');
  body.innerHTML = '<div class="jobs-loading"><div class="spinner-lg"></div><p>Loading breakdown…</p></div>';
  overlay.classList.add('modal-overlay--open');

  fetch(API + '/api/applications/' + appId + '/breakdown', {
    headers: { 'Authorization': 'Bearer ' + userToken }
  })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var sc    = parseFloat(d.match_score) || d.score || 0;
      var scCol = sc >= 70 ? '#16a34a' : sc >= 40 ? '#ca8a04' : '#dc2626';

      var matchedHtml = d.matched && d.matched.length
        ? d.matched.map(function (k) {
            return '<span class="cv-kw cv-kw--match"><i class="bi bi-check-circle-fill"></i> ' + escHtml(k) + '</span>';
          }).join('')
        : '<span style="color:var(--text-faint);font-size:0.85rem">None matched</span>';

      var missingHtml = d.missing && d.missing.length
        ? d.missing.map(function (m) {
            var kw = typeof m === 'object' ? m.keyword : m;
            return '<span class="cv-kw cv-kw--miss"><i class="bi bi-x-circle-fill"></i> ' + escHtml(kw) + '</span>';
          }).join('')
        : '<span style="color:#16a34a;font-size:0.85rem">All keywords matched!</span>';

      body.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
          '<div>' +
            '<h2 style="font-size:1.2rem;font-weight:800;margin-bottom:2px">' + escHtml(d.seeker_name || 'Applicant') + '</h2>' +
            '<p style="color:var(--text-muted);font-size:0.85rem">Applied for: ' + escHtml(d.job_title || '') + '</p>' +
          '</div>' +
          '<div style="font-size:2rem;font-weight:900;color:' + scCol + '">' + sc.toFixed(0) + '%</div>' +
        '</div>' +
        (d.cv_filename
          ? '<a href="' + API + '/uploads/' + encodeURIComponent(d.cv_filename) + '" target="_blank" rel="noopener" class="btn btn--primary btn--sm" style="margin-bottom:24px"><i class="bi bi-file-earmark-pdf"></i> Open Full CV (PDF)</a>'
          : '<p style="color:var(--text-faint);font-size:0.85rem;margin-bottom:24px">No CV file uploaded.</p>') +
        '<div style="margin-bottom:6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-faint)">Matched Keywords (' + (d.matched ? d.matched.length : 0) + '/' + (d.total || 0) + ')</div>' +
        '<div class="cv-kw-row" style="margin-bottom:20px">' + matchedHtml + '</div>' +
        '<div style="margin-bottom:6px;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-faint)">Missing Keywords</div>' +
        '<div class="cv-kw-row">' + missingHtml + '</div>';
    })
    .catch(function () {
      body.innerHTML = '<div class="jobs-empty"><i class="bi bi-exclamation-circle"></i><h3>Could not load breakdown</h3></div>';
    });
}

function closeCvReview(e) {
  if (e && e.target !== document.getElementById('cvReviewOverlay')) return;
  document.getElementById('cvReviewOverlay').classList.remove('modal-overlay--open');
}

// ── Helpers ──────────────────────────────────────────────────
function handleSignOut() { firebase.auth().signOut().then(function () { window.location.href = window.location.origin + '/index.html'; }); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function timeAgo(d) {
  if (!d) return 'recently';
  var days = Math.floor((Date.now()-new Date(d))/86400000);
  if (days===0) return 'today'; if (days===1) return 'yesterday';
  if (days<7) return days+'d ago'; return Math.floor(days/7)+'w ago';
}

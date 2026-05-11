// jobs.js — full job board with suggestions, save, quiz, status

// API is defined in js/config.js
var currentUser  = null;
var userToken    = null;
var cvUploaded   = false;
var appliedJobs  = new Set();
var savedJobs    = new Set();
var allJobs      = [];
var activeFilter = 'all';
var quizAnswers  = {};

// ── Auth guard ───────────────────────────────────────────────
firebase.auth().onAuthStateChanged(function (user) {
  if (!user) { window.location.href = '../index.html'; return; }
  currentUser = user;
  document.getElementById('navUser').textContent = user.displayName || user.email;
  user.getIdToken().then(function (token) {
    userToken = token;
    loadJobs();
    loadMyApplications();
    loadSavedJobs();
    loadSuggestedJobs();
    loadProfile();
    initNotifications(token);
  });
});

// ── Load jobs ────────────────────────────────────────────────
function loadJobs() {
  var search   = document.getElementById('searchInput').value.trim();
  var location = document.getElementById('locationInput').value.trim();
  var params   = [];
  if (search)                                  params.push('search='   + encodeURIComponent(search));
  if (location)                                params.push('location=' + encodeURIComponent(location));
  if (activeFilter && activeFilter !== 'all')  params.push('type='     + encodeURIComponent(activeFilter));
  var url = API + '/api/jobs' + (params.length ? '?' + params.join('&') : '');

  document.getElementById('jobsList').innerHTML =
    '<div class="jobs-loading"><div class="spinner-lg"></div><p>Loading jobs…</p></div>';

  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      allJobs = jobs;
      document.getElementById('statTotal').textContent    = jobs.length;
      document.getElementById('jobsCountLabel').textContent = jobs.length + ' jobs found';
      var best = jobs.reduce(function (m, j) { return (j.match_score || 0) > m ? (j.match_score || 0) : m; }, 0);
      if (best > 0) document.getElementById('statMatch').textContent = best.toFixed(0) + '%';
      renderJobs(jobs, 'jobsList');
    })
    .catch(function () {
      document.getElementById('jobsList').innerHTML =
        '<div class="jobs-empty"><i class="bi bi-exclamation-circle"></i><h3>Could not load jobs</h3><p>Make sure the server is running.</p></div>';
    });
}

// ── Load suggested jobs ──────────────────────────────────────
function loadSuggestedJobs() {
  if (!userToken) return;
  fetch(API + '/api/profile/suggested', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      if (!jobs.length) return;
      document.getElementById('suggestedSection').classList.remove('hidden');
      renderJobs(jobs, 'suggestedList');
    })
    .catch(function () {});
}

// ── Load my applications ─────────────────────────────────────
function loadMyApplications() {
  if (!userToken) return;
  fetch(API + '/api/applications/mine', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (apps) {
      apps.forEach(function (a) { appliedJobs.add(a.job_id); });
      document.getElementById('statApplied').textContent = apps.length;
    }).catch(function () {});
}

// ── Load saved jobs ──────────────────────────────────────────
function loadSavedJobs() {
  if (!userToken) return;
  fetch(API + '/api/profile/saved', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      jobs.forEach(function (j) { savedJobs.add(j.id); });
      var count = jobs.length;
      document.getElementById('statSaved').textContent = count;
      var badge = document.getElementById('savedCount');
      if (count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    }).catch(function () {});
}

// ── Load career profile ──────────────────────────────────────
function loadProfile() {
  if (!userToken) return;
  fetch(API + '/api/profile', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (p) {
      if (!p) return;
      document.getElementById('profileBtnText').textContent = 'Edit profile';
      if (p.target_title)       document.getElementById('pf-title').value    = p.target_title;
      if (p.experience_years)   document.getElementById('pf-exp').value      = p.experience_years;
      if (p.top_skills)         document.getElementById('pf-skills').value   = p.top_skills;
      if (p.industry)           document.getElementById('pf-industry').value = p.industry;
      if (p.salary_expectation) document.getElementById('pf-salary').value  = p.salary_expectation;
      if (p.bio)                document.getElementById('pf-bio').value      = p.bio;
      if (p.work_preference) {
        var radio = document.querySelector('input[name="pf-work"][value="' + p.work_preference + '"]');
        if (radio) radio.checked = true;
      }
    }).catch(function () {});
}

// ── Filter ───────────────────────────────────────────────────
function setFilter(filter, btn) {
  activeFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('filter-btn--active'); });
  btn.classList.add('filter-btn--active');
  loadJobs();
}

// ── Render job cards ─────────────────────────────────────────
function renderJobs(jobs, containerId) {
  var list = document.getElementById(containerId);
  if (!jobs || !jobs.length) {
    list.innerHTML = '<div class="jobs-empty"><i class="bi bi-briefcase"></i><h3>No jobs found</h3><p>Try a different search or filter.</p></div>';
    return;
  }
  list.innerHTML = jobs.map(function (job) { return buildJobCard(job); }).join('');
}

function buildJobCard(job) {
  var applied     = appliedJobs.has(job.id);
  var saved       = savedJobs.has(job.id);
  var scoreClass  = getScoreClass(job.match_score);
  var scoreLabel  = cvUploaded ? (job.match_score || 0).toFixed(0) + '%' : '—';
  var initials    = (job.employer_name || job.title || 'J').substring(0, 2).toUpperCase();
  var barWidth    = cvUploaded ? (job.match_score || 0) : 0;
  var statusBadge = applied ? '<span class="status-badge status-badge--' + getAppStatus(job.id) + '">' + getAppStatus(job.id) + '</span>' : '';

  return '<div class="job-card" onclick="openJobModal(' + job.id + ')">' +
    '<div class="job-card__top">' +
      '<div class="job-card__left">' +
        '<div class="job-card__logo">' + initials + '</div>' +
        '<div>' +
          '<div class="job-card__title">' + escHtml(job.title) + ' ' + statusBadge + '</div>' +
          '<div class="job-card__company">' + escHtml(job.employer_name || '') + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<button class="save-btn ' + (saved ? 'save-btn--saved' : '') + '" title="' + (saved ? 'Unsave' : 'Save job') + '" onclick="event.stopPropagation();toggleSave(' + job.id + ',this)">' +
          '<i class="bi bi-' + (saved ? 'heart-fill' : 'heart') + '"></i>' +
        '</button>' +
        '<div class="match-badge">' +
          '<span class="match-badge__score match-badge__score--' + scoreClass + '">' + scoreLabel + '</span>' +
          '<span class="match-badge__label">' + (cvUploaded ? 'match' : '') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="match-bar"><div class="match-bar__fill match-bar__fill--' + scoreClass + '" style="width:' + barWidth + '%"></div></div>' +
    '<div class="job-card__meta">' +
      (job.location ? '<span class="job-card__tag"><i class="bi bi-geo-alt"></i>' + escHtml(job.location) + '</span>' : '') +
      (job.salary   ? '<span class="job-card__tag"><i class="bi bi-cash"></i>'    + escHtml(job.salary)   + '</span>' : '') +
      (job.job_type ? '<span class="job-card__tag"><i class="bi bi-briefcase"></i>' + job.job_type.charAt(0).toUpperCase() + job.job_type.slice(1) + '</span>' : '') +
    '</div>' +
    '<p class="job-card__desc">' + escHtml(job.description || '') + '</p>' +
    '<div class="job-card__footer">' +
      '<span class="job-card__date">' + timeAgo(job.created_at) + '</span>' +
      '<button class="job-card__apply' + (applied ? ' job-card__apply--applied' : '') + '" ' +
        'onclick="event.stopPropagation();' + (applied ? '' : 'applyToJob(' + job.id + ',this)') + '">' +
        (applied ? '<i class="bi bi-check-lg"></i> Applied' : 'Apply now') +
      '</button>' +
    '</div>' +
  '</div>';
}

// ── App status lookup ────────────────────────────────────────
var appStatusMap = {};
function getAppStatus(jobId) { return appStatusMap[jobId] || 'pending'; }

// ── Open job modal ───────────────────────────────────────────
function openJobModal(jobId) {
  var job = allJobs.find(function (j) { return j.id === jobId; });
  if (!job) return;
  var applied    = appliedJobs.has(job.id);
  var saved      = savedJobs.has(job.id);
  var scoreClass = getScoreClass(job.match_score);
  var scoreText  = cvUploaded ? (job.match_score || 0).toFixed(0) + '%' : '—';
  var initials   = (job.employer_name || job.title || 'J').substring(0, 2).toUpperCase();

  var applyBtn = applied
    ? '<button class="modal__apply modal__apply--applied" disabled><i class="bi bi-check-lg"></i> Already Applied</button>'
    : cvUploaded
      ? '<button class="modal__apply modal__apply--oneclick" id="modalApplyBtn" onclick="applyToJob(' + job.id + ',this)"><i class="bi bi-lightning-fill"></i> 1-Click Apply <span class="oneclick-badge">CV Ready</span></button>'
      : '<button class="modal__apply" id="modalApplyBtn" onclick="applyToJob(' + job.id + ',this)"><i class="bi bi-send"></i> Apply Now</button>';

  document.getElementById('modalBody').innerHTML =
    '<div class="modal__company">' +
      '<div class="modal__logo">' + initials + '</div>' +
      '<div style="flex:1">' +
        '<div class="modal__job-title">' + escHtml(job.title) + '</div>' +
        '<div class="modal__job-meta">' + escHtml(job.employer_name || '') + '</div>' +
      '</div>' +
      '<button class="save-btn ' + (saved ? 'save-btn--saved' : '') + '" onclick="toggleSave(' + job.id + ',this)" style="font-size:1.2rem">' +
        '<i class="bi bi-' + (saved ? 'heart-fill' : 'heart') + '"></i>' +
      '</button>' +
    '</div>' +
    '<div class="modal__tags">' +
      (job.location ? '<span class="modal__tag"><i class="bi bi-geo-alt"></i>' + escHtml(job.location) + '</span>' : '') +
      (job.salary   ? '<span class="modal__tag"><i class="bi bi-cash"></i>'    + escHtml(job.salary)   + '</span>' : '') +
      (job.job_type ? '<span class="modal__tag"><i class="bi bi-briefcase"></i>' + job.job_type + '</span>' : '') +
    '</div>' +
    '<div class="modal__score-row">' +
      '<div>' +
        '<div class="modal__score-label">Your CV match score</div>' +
        '<div class="modal__score-value match-badge__score--' + scoreClass + '">' + scoreText + '</div>' +
      '</div>' +
      '<div style="text-align:right;font-size:0.8rem;color:var(--text-faint)">' +
        (cvUploaded ? 'Based on your uploaded CV' : '<a href="#" onclick="document.getElementById(\'cvInput\').click();return false" style="color:var(--blue-mid)">Upload CV to see score</a>') +
      '</div>' +
    '</div>' +
    '<div id="breakdownSection"></div>' +
    '<div class="modal__section-title">Job Description</div>' +
    '<div class="modal__text">' + escHtml(job.description || 'No description provided.') + '</div>' +
    (job.requirements ? '<div class="modal__section-title">Requirements</div><div class="modal__text">' + escHtml(job.requirements) + '</div>' : '') +
    applyBtn +
    '<div id="similarJobsSection" style="margin-top:24px">' +
      '<div class="modal__section-title">Similar Jobs</div>' +
      '<div id="similarJobsList"><div style="color:var(--text-faint);font-size:0.82rem">Loading…</div></div>' +
    '</div>';

  document.getElementById('modalOverlay').classList.add('modal-overlay--open');
  loadSimilarJobs(job.id);
  if (cvUploaded && userToken) loadBreakdown(job.id);
}

// ── Similar jobs ─────────────────────────────────────────────
function loadSimilarJobs(jobId) {
  fetch(API + '/api/applications/similar/' + jobId)
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      var container = document.getElementById('similarJobsList');
      if (!container) return;
      if (!jobs.length) { container.innerHTML = '<p style="color:var(--text-faint);font-size:0.82rem">No similar jobs found.</p>'; return; }
      container.innerHTML = jobs.map(function (j) {
        return '<div class="similar-job" onclick="closeJobModal();setTimeout(function(){openJobModal(' + j.id + ')},100)">' +
          '<div class="similar-job__title">' + escHtml(j.title) + '</div>' +
          '<div class="similar-job__meta">' + escHtml(j.employer_name || '') + ' · ' + escHtml(j.location || '') + '</div>' +
        '</div>';
      }).join('');
    }).catch(function () {});
}

// ── CV breakdown + tips ──────────────────────────────────────
function loadBreakdown(jobId) {
  fetch(API + '/api/applications/breakdown/' + jobId, {
    headers: { 'Authorization': 'Bearer ' + userToken }
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var section = document.getElementById('breakdownSection');
      if (!section || !data.total) return;

      // Keyword breakdown
      var matchedHtml = data.matched.slice(0, 12).map(function (k) {
        return '<span class="kw-tag kw-tag--matched"><i class="bi bi-check-lg"></i>' + escHtml(k) + '</span>';
      }).join('');

      var missingHtml = data.missing.slice(0, 8).map(function (m) {
        return '<span class="kw-tag kw-tag--missing"><i class="bi bi-plus"></i>' + escHtml(m.keyword) + '</span>';
      }).join('');

      // Improvement tips (top 3 missing keywords)
      var tips = data.missing.slice(0, 3);
      var tipsHtml = '';
      if (tips.length) {
        var potential = Math.min(100, data.score + tips.reduce(function (s, t) { return s + t.boost; }, 0));
        tipsHtml =
          '<div class="tips-box">' +
            '<div class="tips-box__header"><i class="bi bi-lightbulb-fill"></i> Boost your match to ~' + potential + '%</div>' +
            '<p class="tips-box__sub">Add these skills to your CV to increase your score:</p>' +
            '<div class="tips-list">' +
              tips.map(function (t) {
                return '<div class="tip-item">' +
                  '<span class="tip-item__kw">' + escHtml(t.keyword) + '</span>' +
                  '<span class="tip-item__boost">+' + t.boost + '%</span>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>';
      }

      section.innerHTML =
        '<div class="breakdown-box">' +
          '<div class="breakdown-box__header">' +
            '<span><i class="bi bi-bar-chart-line-fill"></i> Score breakdown</span>' +
            '<span class="breakdown-box__count">' + data.matched.length + ' of ' + data.total + ' keywords matched</span>' +
          '</div>' +
          (matchedHtml ? '<div class="kw-group"><span class="kw-group__label">Matched</span><div class="kw-tags">' + matchedHtml + '</div></div>' : '') +
          (missingHtml ? '<div class="kw-group"><span class="kw-group__label">Missing</span><div class="kw-tags">' + missingHtml + '</div></div>' : '') +
        '</div>' +
        tipsHtml;
    })
    .catch(function () {});
}

function closeJobModal() { document.getElementById('modalOverlay').classList.remove('modal-overlay--open'); }
function closeModal(e)   { if (e.target === document.getElementById('modalOverlay')) closeJobModal(); }

// ── Save / unsave job ────────────────────────────────────────
function toggleSave(jobId, btn) {
  if (!userToken) { showToast('Sign in to save jobs.', 'error'); return; }
  var isSaved = savedJobs.has(jobId);
  var method  = isSaved ? 'DELETE' : 'POST';
  fetch(API + '/api/profile/save/' + jobId, { method: method, headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function () {
      if (isSaved) {
        savedJobs.delete(jobId);
        btn.classList.remove('save-btn--saved');
        btn.querySelector('i').className = 'bi bi-heart';
        btn.title = 'Save job';
        showToast('Job removed from saved.', 'info');
      } else {
        savedJobs.add(jobId);
        btn.classList.add('save-btn--saved');
        btn.querySelector('i').className = 'bi bi-heart-fill';
        btn.title = 'Unsave';
        showToast('Job saved!', 'success');
      }
      document.getElementById('statSaved').textContent = savedJobs.size;
      var badge = document.getElementById('savedCount');
      badge.textContent = savedJobs.size;
      badge.classList.toggle('hidden', savedJobs.size === 0);
    }).catch(function () { showToast('Could not save job.', 'error'); });
}

// ── Show saved jobs ──────────────────────────────────────────
function showSavedJobs() {
  fetch(API + '/api/profile/saved', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      allJobs = jobs;
      document.getElementById('allJobsLabel').querySelector('i').className = 'bi bi-heart-fill';
      document.getElementById('allJobsLabel').childNodes[1] && (document.getElementById('allJobsLabel').childNodes[1].textContent = ' Saved Jobs');
      document.getElementById('jobsCountLabel').textContent = jobs.length + ' saved';
      renderJobs(jobs, 'jobsList');
    });
}

// ── Apply to job ─────────────────────────────────────────────
function applyToJob(jobId, btn) {
  if (!userToken) { showToast('Please sign in first.', 'error'); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-top-color:#fff;width:14px;height:14px;border-width:2px"></span>';
  fetch(API + '/api/applications/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify({ job_id: jobId })
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);
      appliedJobs.add(jobId);
      appStatusMap[jobId] = 'pending';
      btn.innerHTML = '<i class="bi bi-check-lg"></i> ' + (btn.classList.contains('modal__apply') ? 'Already Applied' : 'Applied');
      btn.classList.add(btn.classList.contains('modal__apply') ? 'modal__apply--applied' : 'job-card__apply--applied');
      document.getElementById('statApplied').textContent = appliedJobs.size;
      showToast('Application submitted! Good luck 🎉', 'success');
      renderJobs(allJobs, 'jobsList');
    })
    .catch(function (err) {
      btn.disabled = false;
      btn.innerHTML = 'Apply now';
      showToast(err.message || 'Failed to apply. Try again.', 'error');
    });
}

// ── CV upload ────────────────────────────────────────────────
function uploadCV(input) {
  // Sync both desktop and mobile inputs
  var mobileCVText = document.getElementById('mobileCVText');
  if (mobileCVText && input.files.length) mobileCVText.textContent = 'Replace CV';
  if (!input.files.length) return;
  var file = input.files[0];
  if (file.type !== 'application/pdf') { showToast('Please upload a PDF file.', 'error'); return; }
  var btn    = document.getElementById('cvBtnText');
  var status = document.getElementById('cvStatus');
  btn.textContent    = 'Uploading…';
  status.textContent = '';
  var formData = new FormData();
  formData.append('cv', file);
  fetch(API + '/api/cv/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + userToken }, body: formData })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);
      cvUploaded = true;
      btn.textContent = 'Replace CV';
      status.textContent = '✓ CV uploaded';
      status.className   = 'cv-status cv-status--success';
      document.getElementById('cvCardText').textContent = 'Your CV is uploaded. Match scores are now showing.';
      showToast('CV uploaded! Opening quick questions…', 'success');
      setTimeout(function () { openCvQuiz(); }, 800);
      loadJobs();
      loadSuggestedJobs();
    })
    .catch(function (err) {
      btn.textContent    = 'Upload CV';
      status.textContent = err.message || 'Upload failed.';
      status.className   = 'cv-status cv-status--error';
    });
}

// ── CV quiz ──────────────────────────────────────────────────
function openCvQuiz()  { document.getElementById('cvQuizOverlay').classList.add('modal-overlay--open'); }
function closeCvQuiz() { document.getElementById('cvQuizOverlay').classList.remove('modal-overlay--open'); }

function quizNext(step) {
  document.querySelectorAll('.quiz-step').forEach(function (s) { s.classList.remove('active'); });
  var next = document.querySelector('.quiz-step[data-step="' + step + '"]');
  if (next) next.classList.add('active');
  var pct = ((step - 1) / 4) * 100;
  document.getElementById('quizProgressBar').style.width = pct + '%';
}

function selectQuizOpt(btn, key, val) {
  btn.closest('.quiz-options').querySelectorAll('.quiz-opt').forEach(function (b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
  quizAnswers[key] = val;
}

function submitQuiz() {
  quizAnswers.title  = document.getElementById('quiz-title').value.trim();
  quizAnswers.skills = document.getElementById('quiz-skills').value.trim();
  document.getElementById('quizProgressBar').style.width = '100%';

  if (!userToken) { closeCvQuiz(); return; }
  fetch(API + '/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify({
      target_title:       quizAnswers.title,
      experience_years:   parseInt(quizAnswers.exp) || 0,
      work_preference:    quizAnswers.work || 'any',
      top_skills:         quizAnswers.skills,
    })
  })
    .then(function () {
      closeCvQuiz();
      showToast('Profile saved! Loading your matches…', 'success');
      document.getElementById('profileBtnText').textContent = 'Edit profile';
      loadSuggestedJobs();
    })
    .catch(function () { closeCvQuiz(); });
}

// ── Profile modal ────────────────────────────────────────────
function openProfileModal()  { document.getElementById('profileOverlay').classList.add('modal-overlay--open'); }
function closeProfileModal(e) {
  if (!e || e.target === document.getElementById('profileOverlay')) {
    document.getElementById('profileOverlay').classList.remove('modal-overlay--open');
  }
}

document.getElementById('profileForm').addEventListener('submit', function (e) {
  e.preventDefault();
  var btn  = document.getElementById('profileSaveBtn');
  var text = document.getElementById('profileSaveText');
  var spin = document.getElementById('profileSaveSpinner');
  btn.disabled = true; text.classList.add('hidden'); spin.classList.remove('hidden');
  fetch(API + '/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + userToken },
    body: JSON.stringify({
      target_title:       document.getElementById('pf-title').value.trim(),
      experience_years:   parseInt(document.getElementById('pf-exp').value),
      work_preference:    document.querySelector('input[name="pf-work"]:checked').value,
      top_skills:         document.getElementById('pf-skills').value.trim(),
      industry:           document.getElementById('pf-industry').value,
      salary_expectation: document.getElementById('pf-salary').value.trim(),
      bio:                document.getElementById('pf-bio').value.trim(),
    })
  })
    .then(function () {
      btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
      document.getElementById('profileBtnText').textContent = 'Edit profile';
      closeProfileModal();
      showToast('Profile saved!', 'success');
      loadSuggestedJobs();
    })
    .catch(function () {
      btn.disabled = false; text.classList.remove('hidden'); spin.classList.add('hidden');
      showToast('Could not save profile.', 'error');
    });
});

// ── Helpers ──────────────────────────────────────────────────
function getScoreClass(score) {
  if (!cvUploaded || !score) return 'none';
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return days + ' days ago';
  if (days < 30) return Math.floor(days/7) + ' weeks ago';
  return Math.floor(days/30) + ' months ago';
}
function handleSignOut() { firebase.auth().signOut().then(function () { window.location.href = window.location.origin + '/index.html'; }); }

document.getElementById('searchInput').addEventListener('keydown',   function(e){ if(e.key==='Enter') loadJobs(); });
document.getElementById('locationInput').addEventListener('keydown', function(e){ if(e.key==='Enter') loadJobs(); });

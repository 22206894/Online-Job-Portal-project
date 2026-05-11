// dashboard.js — seeker dashboard

// API is defined in js/config.js
var userToken = null;

firebase.auth().onAuthStateChanged(function (user) {
  if (!user) { window.location.href = '../index.html'; return; }
  document.getElementById('navUser').textContent = user.displayName || user.email;
  user.getIdToken().then(function (token) {
    userToken = token;
    loadApplications();
    loadSavedJobs();
    loadProfile();
    initNotifications(token);
  });
});

function switchTab(tab, btn) {
  ['applications','saved','profile'].forEach(function (t) {
    document.getElementById('tab-' + t).classList.add('hidden');
  });
  document.querySelectorAll('.dash-tab').forEach(function (b) { b.classList.remove('dash-tab--active'); });
  document.getElementById('tab-' + tab).classList.remove('hidden');
  btn.classList.add('dash-tab--active');
}

// ── Applications ─────────────────────────────────────────────
function loadApplications() {
  fetch(API + '/api/applications/mine', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (apps) {
      document.getElementById('dsTotal').textContent    = apps.length;
      document.getElementById('dsReviewed').textContent = apps.filter(function (a) { return a.status === 'reviewed'; }).length;
      document.getElementById('dsAccepted').textContent = apps.filter(function (a) { return a.status === 'accepted'; }).length;
      var best = apps.reduce(function (m, a) { return (a.match_score || 0) > m ? (a.match_score || 0) : m; }, 0);
      document.getElementById('dsBestScore').textContent = best > 0 ? best.toFixed(0) + '%' : '—';
      document.getElementById('dashSub').textContent = apps.length + ' application' + (apps.length !== 1 ? 's' : '') + ' submitted';
      var list = document.getElementById('appsList');
      if (!apps.length) {
        list.innerHTML = '<div class="jobs-empty"><i class="bi bi-send"></i><h3>No applications yet</h3><p><a href="jobs.html" style="color:var(--blue-mid)">Browse jobs</a> and start applying.</p></div>';
        return;
      }
      list.innerHTML = apps.map(function (a) {
        var sc    = a.match_score || 0;
        var scCol = sc >= 70 ? '#16a34a' : sc >= 40 ? '#ca8a04' : '#dc2626';
        var init  = (a.title || 'J').substring(0, 2).toUpperCase();
        return '<div class="app-card">' +
          '<div class="app-card__logo">' + init + '</div>' +
          '<div class="app-card__body">' +
            '<div class="app-card__title">' + escHtml(a.title || 'Job') + '</div>' +
            '<div class="app-card__meta">' + escHtml(a.location || '') + (a.salary ? ' · ' + escHtml(a.salary) : '') + '</div>' +
            buildTimeline(a.status) +
            '<div class="app-card__row" style="margin-top:8px">' +
              '<span style="font-size:0.75rem;color:var(--text-faint)">' + timeAgo(a.applied_at) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="app-card__score" style="color:' + scCol + '">' + (sc > 0 ? sc.toFixed(0) + '%' : '—') + '</div>' +
        '</div>';
      }).join('');
    }).catch(function () {
      document.getElementById('appsList').innerHTML = '<div class="jobs-empty"><i class="bi bi-exclamation-circle"></i><h3>Could not load applications</h3></div>';
    });
}

// ── Saved jobs ───────────────────────────────────────────────
function loadSavedJobs() {
  fetch(API + '/api/profile/saved', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (jobs) {
      var list = document.getElementById('savedList');
      if (!jobs.length) {
        list.innerHTML = '<div class="jobs-empty"><i class="bi bi-heart"></i><h3>No saved jobs</h3><p>Click the heart icon on any job to save it.</p></div>';
        return;
      }
      list.innerHTML = jobs.map(function (j) {
        var init = (j.employer_name || j.title || 'J').substring(0, 2).toUpperCase();
        return '<div class="app-card">' +
          '<div class="app-card__logo">' + init + '</div>' +
          '<div class="app-card__body">' +
            '<div class="app-card__title">' + escHtml(j.title) + '</div>' +
            '<div class="app-card__meta">' + escHtml(j.employer_name || '') + ' · ' + escHtml(j.location || '') + '</div>' +
            (j.salary ? '<div style="font-size:0.8rem;color:var(--text-muted)">' + escHtml(j.salary) + '</div>' : '') +
          '</div>' +
          '<a href="jobs.html" class="btn btn--primary btn--sm" style="flex-shrink:0">View</a>' +
        '</div>';
      }).join('');
    }).catch(function () {});
}

// ── Profile ──────────────────────────────────────────────────
function loadProfile() {
  fetch(API + '/api/profile', { headers: { 'Authorization': 'Bearer ' + userToken } })
    .then(function (r) { return r.json(); })
    .then(function (p) {
      var view = document.getElementById('profileView');
      if (!p) {
        view.innerHTML = '<div class="jobs-empty"><i class="bi bi-person-badge"></i><h3>No profile yet</h3><p><a href="jobs.html" style="color:var(--blue-mid)">Go to jobs page</a> to set up your career profile.</p></div>';
        return;
      }
      var skills = (p.top_skills || '').split(',').filter(Boolean).map(function (s) {
        return '<span class="profile-tag">' + escHtml(s.trim()) + '</span>';
      }).join('');
      view.innerHTML =
        '<div class="profile-view__label">Target Role</div>' +
        '<div class="profile-view__value">' + escHtml(p.target_title || '—') + '</div>' +
        '<div class="profile-view__label">Experience</div>' +
        '<div class="profile-view__value">' + (p.experience_years || 0) + ' years</div>' +
        '<div class="profile-view__label">Work Preference</div>' +
        '<div class="profile-view__value">' + escHtml(p.work_preference || 'Any') + '</div>' +
        '<div class="profile-view__label">Expected Salary</div>' +
        '<div class="profile-view__value">' + escHtml(p.salary_expectation || '—') + '</div>' +
        (skills ? '<div class="profile-view__label">Top Skills</div><div class="profile-view__row">' + skills + '</div>' : '') +
        (p.bio ? '<div class="profile-view__label">Bio</div><div class="profile-view__value">' + escHtml(p.bio) + '</div>' : '') +
        '<a href="jobs.html" class="btn btn--primary btn--sm"><i class="bi bi-pencil"></i> Edit on jobs page</a>';
    }).catch(function () {});
}

// ── Application timeline ─────────────────────────────────────
function buildTimeline(status) {
  var steps = [
    { key: 'applied',   label: 'Applied',   icon: 'bi-send' },
    { key: 'reviewed',  label: 'Reviewed',  icon: 'bi-eye' },
    { key: 'accepted',  label: 'Decision',  icon: 'bi-check-circle' },
  ];
  var order = { pending: 0, reviewed: 1, accepted: 2, rejected: 2 };
  var current = order[status] !== undefined ? order[status] : 0;
  var isRejected = status === 'rejected';

  return '<div class="timeline">' +
    steps.map(function (step, i) {
      var done    = i < current;
      var active  = i === current;
      var rejected = isRejected && i === 2;
      var cls = rejected ? 'timeline__step--rejected' : done ? 'timeline__step--done' : active ? 'timeline__step--active' : '';
      var icon = rejected ? 'bi-x-circle' : done ? 'bi-check-circle-fill' : step.icon;
      var label = rejected && i === 2 ? 'Rejected' : (active && status === 'accepted' ? 'Accepted' : step.label);
      return '<div class="timeline__step ' + cls + '">' +
        '<div class="timeline__dot"><i class="bi ' + icon + '"></i></div>' +
        '<div class="timeline__label">' + label + '</div>' +
        (i < steps.length - 1 ? '<div class="timeline__line' + (done ? ' timeline__line--done' : '') + '"></div>' : '') +
      '</div>';
    }).join('') +
  '</div>';
}

function handleSignOut() { firebase.auth().signOut().then(function () { window.location.href = window.location.origin + '/index.html'; }); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function timeAgo(d) {
  if (!d) return '';
  var days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return 'Today'; if (days === 1) return 'Yesterday';
  if (days < 7) return days + 'd ago'; if (days < 30) return Math.floor(days/7) + 'w ago';
  return Math.floor(days/30) + 'mo ago';
}

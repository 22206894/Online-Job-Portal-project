// notifications.js — notification bell for all pages
// Requires: config.js, firebase auth, a #notifBell element in the navbar

var notifOpen    = false;
var notifToken   = null;
var notifPollInt = null;

function initNotifications(token) {
  notifToken = token;
  fetchUnreadCount();
  // Poll every 30 seconds for new notifications
  notifPollInt = setInterval(fetchUnreadCount, 30000);
}

// ── Fetch unread count and update badge ──────────────────────
function fetchUnreadCount() {
  if (!notifToken) return;
  fetch(API + '/api/notifications/unread-count', {
    headers: { 'Authorization': 'Bearer ' + notifToken }
  })
    .then(function (r) { return r.json(); })
    .then(function (data) { updateBell(data.count || 0); })
    .catch(function () {});
}

function updateBell(count) {
  var badge = document.getElementById('notifBadge');
  if (!badge) return;
  badge.textContent = count > 9 ? '9+' : count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// ── Toggle notification panel ────────────────────────────────
function toggleNotifications() {
  notifOpen = !notifOpen;
  var panel = document.getElementById('notifPanel');
  if (!panel) return;
  panel.classList.toggle('notif-panel--open', notifOpen);

  if (notifOpen) {
    loadNotifications();
    // Mark all read after 2 seconds
    setTimeout(function () {
      if (!notifToken) return;
      fetch(API + '/api/notifications/read-all', {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + notifToken }
      }).then(function () { updateBell(0); }).catch(function(){});
    }, 2000);
  }
}

// Close panel when clicking outside
document.addEventListener('click', function (e) {
  if (!notifOpen) return;
  var bell  = document.getElementById('notifBell');
  var panel = document.getElementById('notifPanel');
  if (bell && panel && !bell.contains(e.target) && !panel.contains(e.target)) {
    notifOpen = false;
    panel.classList.remove('notif-panel--open');
  }
});

// ── Load and render notifications ────────────────────────────
function loadNotifications() {
  if (!notifToken) return;
  var list = document.getElementById('notifList');
  list.innerHTML = '<div class="notif-loading"><div class="spinner" style="border-top-color:var(--blue-mid);width:20px;height:20px;border-width:2px"></div></div>';

  fetch(API + '/api/notifications', {
    headers: { 'Authorization': 'Bearer ' + notifToken }
  })
    .then(function (r) { return r.json(); })
    .then(function (notifs) {
      if (!notifs.length) {
        list.innerHTML = '<div class="notif-empty"><i class="bi bi-bell-slash"></i><p>No notifications yet</p></div>';
        return;
      }
      list.innerHTML = notifs.map(function (n) {
        var icon = getNotifIcon(n.type);
        var time = timeAgoShort(n.created_at);
        return '<div class="notif-item' + (n.is_read ? '' : ' notif-item--unread') + '" onclick="handleNotifClick(\'' + (n.link||'#') + '\')">' +
          '<div class="notif-item__icon notif-icon--' + n.type.split('_')[0] + '">' + icon + '</div>' +
          '<div class="notif-item__body">' +
            '<div class="notif-item__title">' + escNotif(n.title) + '</div>' +
            '<div class="notif-item__msg">'   + escNotif(n.message) + '</div>' +
            '<div class="notif-item__time">'  + time + '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    })
    .catch(function () {
      list.innerHTML = '<div class="notif-empty"><i class="bi bi-exclamation-circle"></i><p>Could not load notifications</p></div>';
    });
}

function handleNotifClick(link) {
  notifOpen = false;
  document.getElementById('notifPanel').classList.remove('notif-panel--open');
  if (link && link !== '#') window.location.href = window.location.origin + link;
}

function getNotifIcon(type) {
  var icons = {
    application:     '<i class="bi bi-send-fill"></i>',
    status_reviewed: '<i class="bi bi-eye-fill"></i>',
    status_accepted: '<i class="bi bi-check-circle-fill"></i>',
    status_rejected: '<i class="bi bi-x-circle-fill"></i>',
  };
  return icons[type] || '<i class="bi bi-bell-fill"></i>';
}

function timeAgoShort(d) {
  if (!d) return '';
  var diff = Date.now() - new Date(d).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return mins + 'm ago';
  var hrs = Math.floor(mins / 60);
  if (hrs < 24)  return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function markAllRead() {
  if (!notifToken) return;
  fetch(API + '/api/notifications/read-all', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + notifToken }
  }).then(function () {
    updateBell(0);
    document.querySelectorAll('.notif-item--unread').forEach(function (el) {
      el.classList.remove('notif-item--unread');
    });
    showToast('All notifications marked as read.', 'success');
  }).catch(function () {});
}

function escNotif(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

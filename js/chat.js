// chat.js — Community chat using Firebase Realtime Database

var db           = firebase.database();
var chatRef      = db.ref('community_chat');
var chatOpen     = false;
var unreadCount  = 0;
var chatUsername = null;
var lastKey      = null;

// ── Get username for current user ────────────────────────────
firebase.auth().onAuthStateChanged(function (user) {
  if (!user) return;
  // Fetch username from backend
  user.getIdToken().then(function (token) {
    fetch(API + '/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        chatUsername = data.username || user.displayName || user.email.split('@')[0];
        initChat();
      })
      .catch(function () {
        chatUsername = user.displayName || user.email.split('@')[0];
        initChat();
      });
  });
});

// ── Init chat listener ───────────────────────────────────────
function initChat() {
  var messagesEl = document.getElementById('chatMessages');
  messagesEl.innerHTML = '<p style="text-align:center;color:var(--text-faint);font-size:0.8rem;padding:20px 0">Say hello to the community 👋</p>';

  // Load last 50 messages
  chatRef.limitToLast(50).on('child_added', function (snap) {
    var msg = snap.val();
    appendMessage(msg, snap.key);
    if (!chatOpen) {
      unreadCount++;
      updateBadge();
    }
  });
}

function appendMessage(msg, key) {
  var messagesEl = document.getElementById('chatMessages');
  var isMe       = msg.uid === firebase.auth().currentUser?.uid;
  var time       = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Remove placeholder
  var placeholder = messagesEl.querySelector('p');
  if (placeholder) placeholder.remove();

  var div = document.createElement('div');
  div.className = 'chat-msg ' + (isMe ? 'chat-msg--me' : 'chat-msg--other');
  div.innerHTML =
    '<div class="chat-msg__meta">' +
      '<span class="chat-msg__username">@' + escChat(msg.username) + '</span>' +
      '<span>' + time + '</span>' +
    '</div>' +
    '<div class="chat-msg__bubble">' + escChat(msg.text) + '</div>';

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  lastKey = key;
}

// ── Send message ─────────────────────────────────────────────
function sendMessage() {
  var input = document.getElementById('chatInput');
  var text  = input.value.trim();
  if (!text || !chatUsername) return;

  var user = firebase.auth().currentUser;
  if (!user) return;

  chatRef.push({
    uid:       user.uid,
    username:  chatUsername,
    text:      text,
    timestamp: Date.now()
  });

  input.value = '';
  input.focus();
}

// ── Toggle chat panel ────────────────────────────────────────
function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatPanel').classList.toggle('chat-panel--open', chatOpen);
  document.getElementById('chatBackdrop').classList.toggle('hidden', !chatOpen);

  if (chatOpen) {
    unreadCount = 0;
    updateBadge();
    setTimeout(function () {
      var msgs = document.getElementById('chatMessages');
      msgs.scrollTop = msgs.scrollHeight;
      document.getElementById('chatInput').focus();
    }, 50);
  }
}

function updateBadge() {
  var badge = document.getElementById('chatBadge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ── Enter key to send ────────────────────────────────────────
document.getElementById('chatInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') sendMessage();
});

function escChat(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

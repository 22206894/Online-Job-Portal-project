// Firebase is loaded via <script> tags in the HTML — no imports needed
// API is defined in js/config.js

const firebaseConfig = {
  apiKey:            "AIzaSyDRhGeJqCWw9vday0HAny8zgkAEfv9NbOw",
  authDomain:        "online-job-cce65.firebaseapp.com",
  projectId:         "online-job-cce65",
  storageBucket:     "online-job-cce65.firebasestorage.app",
  messagingSenderId: "299637727322",
  appId:             "1:299637727322:web:49e063371c09fab071b863",
  measurementId:     "G-6TSPJTR8BW"
};

firebase.initializeApp(firebaseConfig);

const auth     = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// ── Toast ────────────────────────────────────────────────────
function showToast(message, type) {
  var icons = { success: '✅', error: '❌', info: 'ℹ️', loading: '⏳' };
  var toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastIcon').textContent = icons[type] || 'ℹ️';
  document.getElementById('toastMsg').textContent  = message;
  toast.classList.remove('toast--hidden');
  toast.classList.add('toast--visible');
  if (type !== 'loading') {
    setTimeout(function () {
      toast.classList.remove('toast--visible');
      toast.classList.add('toast--hidden');
    }, 3500);
  }
}

// ── Login button state ───────────────────────────────────────
function setLoading(loading) {
  var btn     = document.getElementById('googleLoginBtn');
  var text    = document.getElementById('loginBtnText');
  var spinner = document.getElementById('loginSpinner');
  if (!btn) return;
  btn.disabled     = loading;
  text.textContent = loading ? 'Signing in…' : 'Continue with Google';
  spinner.className = loading ? 'spinner' : 'spinner hidden';
}

// ── Register/login with backend ──────────────────────────────
function registerWithBackend(user, role) {
  return user.getIdToken().then(function (token) {
    return fetch(API + '/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body:    JSON.stringify({ email: user.email, name: user.displayName, role: role || null })
    });
  }).then(function (res) {
    if (!res.ok) throw new Error('Backend registration failed');
    return res.json();
  });
}

// ── Redirect by role ─────────────────────────────────────────
function redirectByRole(role) {
  var origin = window.location.origin;
  var routes = {
    seeker:   origin + '/pages/jobs.html',
    employer: origin + '/pages/employer-dashboard.html',
    admin:    origin + '/pages/admin.html'
  };
  window.location.href = routes[role] || origin + '/pages/jobs.html';
}

// ── Role picker (shown for new Google users) ─────────────────
var _pendingGoogleUser = null;

function showRolePicker(user) {
  _pendingGoogleUser = user;
  var overlay = document.getElementById('roleOverlay');
  if (overlay) overlay.classList.add('modal-overlay--open');
}

function pickRole(role) {
  var overlay = document.getElementById('roleOverlay');
  if (overlay) overlay.classList.remove('modal-overlay--open');
  if (!_pendingGoogleUser) return;
  showToast('Setting up your account…', 'loading');
  registerWithBackend(_pendingGoogleUser, role).then(function (data) {
    showToast('Welcome to JobMatch!', 'success');
    setTimeout(function () { redirectByRole(data.role); }, 900);
  }).catch(function () {
    showToast('Something went wrong. Try again.', 'error');
    setLoading(false);
  });
}

// ── Google sign-in ───────────────────────────────────────────
function signInWithGoogle() {
  setLoading(true);
  showToast('Opening Google sign-in…', 'loading');

  auth.signInWithPopup(provider)
    .then(function (result) {
      var isNewUser = result.additionalUserInfo && result.additionalUserInfo.isNewUser;
      if (isNewUser) {
        // New user — ask for role first
        setLoading(false);
        showRolePicker(result.user);
      } else {
        // Existing user — register/fetch and redirect
        return registerWithBackend(result.user).then(function (data) {
          showToast('Welcome back, ' + result.user.displayName + '!', 'success');
          setTimeout(function () { redirectByRole(data.role); }, 900);
        });
      }
    })
    .catch(function (err) {
      console.error('AUTH ERROR:', err.code, err.message);
      var msg = err.code === 'auth/popup-closed-by-user'   ? 'Sign-in cancelled.'                         :
                err.code === 'auth/network-request-failed' ? 'Network error. Check your connection.'      :
                err.code === 'auth/unauthorized-domain'    ? 'Add localhost to Firebase authorized domains.' :
                err.code === 'auth/popup-blocked'          ? 'Popup was blocked. Allow popups and retry.' :
                (err.message || 'Sign-in failed. Please try again.');
      showToast(msg, 'error');
      setLoading(false);
    });
}

// ── Auto-redirect only from landing page ─────────────────────
var onLandingPage = window.location.pathname === '/' ||
                    window.location.pathname.endsWith('index.html');

auth.onAuthStateChanged(function (user) {
  if (!user || !onLandingPage) return;
  registerWithBackend(user).then(function (data) {
    redirectByRole(data.role);
  }).catch(function () {});
});

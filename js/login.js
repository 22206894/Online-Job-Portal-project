// login.js — handles email/password sign-in + quote carousel

// ── Quote carousel ────────────────────────────────────────────
var currentQuote = 0;
var quoteTimer;

function goToQuote(index) {
  var quotes = document.querySelectorAll('.quote');
  var dots   = document.querySelectorAll('.quote-dot');
  if (!quotes.length) return;
  quotes[currentQuote].classList.remove('quote--active');
  dots[currentQuote].classList.remove('quote-dot--active');
  currentQuote = index;
  quotes[currentQuote].classList.add('quote--active');
  dots[currentQuote].classList.add('quote-dot--active');
}

function nextQuote() {
  var quotes = document.querySelectorAll('.quote');
  goToQuote((currentQuote + 1) % quotes.length);
}

// Auto-advance every 5 seconds
document.addEventListener('DOMContentLoaded', function () {
  quoteTimer = setInterval(nextQuote, 5000);
});

// ── Forgot password ───────────────────────────────────────────
function handleForgotPassword(e) {
  e.preventDefault();
  var email = document.getElementById('email').value.trim();
  if (!email) {
    showToast('Enter your email address first, then click Forgot password.', 'info');
    document.getElementById('email').focus();
    return;
  }
  firebase.auth().sendPasswordResetEmail(email)
    .then(function () {
      showToast('Password reset email sent! Check your inbox.', 'success');
    })
    .catch(function (err) {
      var msg = err.code === 'auth/user-not-found'
        ? 'No account found with that email.'
        : 'Could not send reset email. Try again.';
      showToast(msg, 'error');
    });
}

function togglePw(inputId, iconId) {
  var input = document.getElementById(inputId);
  var icon  = document.getElementById(iconId);
  input.type     = input.type === 'password' ? 'text' : 'password';
  icon.className = input.type === 'text' ? 'bi bi-eye-slash' : 'bi bi-eye';
}

function setSubmitLoading(loading) {
  var btn     = document.getElementById('submitBtn');
  var text    = document.getElementById('submitText');
  var spinner = document.getElementById('submitSpinner');
  btn.disabled      = loading;
  text.textContent  = loading ? 'Signing in…' : 'Sign In';
  spinner.className = loading ? 'spinner' : 'spinner hidden';
}

function showFieldError(id, message) {
  var el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearErrors() {
  ['emailError','passwordError'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.field__input').forEach(function(el) {
    el.classList.remove('field__input--error');
  });
}

document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  clearErrors();

  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;

  if (!email) {
    showFieldError('emailError', 'Email is required.');
    document.getElementById('email').classList.add('field__input--error');
    return;
  }
  if (!password) {
    showFieldError('passwordError', 'Password is required.');
    document.getElementById('password').classList.add('field__input--error');
    return;
  }

  setSubmitLoading(true);

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(function(result) {
      return registerWithBackend(result.user);
    })
    .then(function(data) {
      showToast('Welcome back!', 'success');
      setTimeout(function() { redirectByRole(data.role); }, 900);
    })
    .catch(function(err) {
      setSubmitLoading(false);
      var msg =
        err.code === 'auth/user-not-found'    ? 'No account found with this email.'          :
        err.code === 'auth/wrong-password'    ? 'Incorrect password. Please try again.'      :
        err.code === 'auth/invalid-email'     ? 'Invalid email address.'                     :
        err.code === 'auth/too-many-requests' ? 'Too many attempts. Try again in a moment.'  :
        'Sign-in failed. Please try again.';
      showToast(msg, 'error');
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        showFieldError('emailError', 'Email not found.');
        document.getElementById('email').classList.add('field__input--error');
      }
      if (err.code === 'auth/wrong-password') {
        showFieldError('passwordError', 'Incorrect password.');
        document.getElementById('password').classList.add('field__input--error');
      }
    });
});

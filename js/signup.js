// signup.js — handles email/password sign-up form

function togglePw(inputId, iconId) {
  var input = document.getElementById(inputId);
  var icon  = document.getElementById(iconId);
  input.type        = input.type === 'password' ? 'text' : 'password';
  icon.className    = input.type === 'text' ? 'bi bi-eye-slash' : 'bi bi-eye';
}

// Real-time password strength rules
document.getElementById('password').addEventListener('input', function () {
  var v = this.value;
  setRule('rule-upper',   /[A-Z]/.test(v));
  setRule('rule-lower',   /[a-z]/.test(v));
  setRule('rule-number',  /[0-9]/.test(v));
  setRule('rule-special', /[^A-Za-z0-9]/.test(v));
  setRule('rule-length',  v.length >= 8);
});
function setRule(id, met) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('pw-rule--met', met);
}

function setSubmitLoading(loading) {
  var btn     = document.getElementById('submitBtn');
  var text    = document.getElementById('submitText');
  var spinner = document.getElementById('submitSpinner');
  btn.disabled          = loading;
  text.textContent      = loading ? 'Creating account…' : 'Create Account';
  spinner.className     = loading ? 'spinner' : 'spinner hidden';
}

function showFieldError(id, message) {
  var el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearErrors() {
  ['nameError','usernameError','emailError','passwordError','confirmError'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '';
  });
  document.querySelectorAll('.field__input').forEach(function(el) {
    el.classList.remove('field__input--error');
  });
}

function validate(name, username, email, password, confirm) {
  var ok = true;
  if (!name.trim()) {
    showFieldError('nameError', 'Full name is required.');
    document.getElementById('fullName').classList.add('field__input--error');
    ok = false;
  }
  if (!username.trim() || !/^[a-z0-9_]{3,20}$/.test(username)) {
    showFieldError('usernameError', 'Username must be 3–20 characters: letters, numbers, underscores only.');
    document.getElementById('username').classList.add('field__input--error');
    ok = false;
  }
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    showFieldError('emailError', 'Enter a valid email address.');
    document.getElementById('email').classList.add('field__input--error');
    ok = false;
  }
  if (password.length < 6) {
    showFieldError('passwordError', 'Password must be at least 6 characters.');
    document.getElementById('password').classList.add('field__input--error');
    ok = false;
  }
  if (password !== confirm) {
    showFieldError('confirmError', 'Passwords do not match.');
    document.getElementById('confirmPassword').classList.add('field__input--error');
    ok = false;
  }
  return ok;
}

document.getElementById('signupForm').addEventListener('submit', function(e) {
  e.preventDefault();
  clearErrors();

  var name     = document.getElementById('fullName').value.trim();
  var username = document.getElementById('username').value.trim().toLowerCase();
  var email    = document.getElementById('email').value.trim();
  var password = document.getElementById('password').value;
  var confirm  = document.getElementById('confirmPassword').value;
  var role     = document.querySelector('input[name="role"]:checked').value;

  if (!validate(name, username, email, password, confirm)) return;

  setSubmitLoading(true);

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(function(result) {
      return result.user.updateProfile({ displayName: name }).then(function() {
        return result.user.getIdToken();
      }).then(function(token) {
        return fetch(API + '/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body:    JSON.stringify({ email: email, name: name, username: username, role: role })
        });
      }).then(function(res) {
        if (!res.ok) throw new Error('Registration failed');
        return res.json();
      }).then(function(data) {
        showToast('Account created! Welcome, ' + name + '!', 'success');
        setTimeout(function() { redirectByRole(data.role); }, 900);
      });
    })
    .catch(function(err) {
      setSubmitLoading(false);
      console.error('Signup error:', err.code, err.message);
      var msg =
        err.code === 'auth/email-already-in-use'   ? 'This email is already registered. Try signing in.' :
        err.code === 'auth/invalid-email'           ? 'Invalid email address.' :
        err.code === 'auth/weak-password'           ? 'Password is too weak. Use at least 6 characters.' :
        err.code === 'auth/operation-not-allowed'   ? 'Email sign-up is not enabled. Enable it in Firebase console.' :
        err.code === 'auth/network-request-failed'  ? 'Network error. Check your connection.' :
        (err.message || 'Sign-up failed. Please try again.');
      showToast(msg, 'error');
      if (err.code === 'auth/email-already-in-use') {
        showFieldError('emailError', 'Already registered.');
        document.getElementById('email').classList.add('field__input--error');
      }
    });
});

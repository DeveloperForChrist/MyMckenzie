// Postgres-backed signup via backend endpoint

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.response = json;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function handleSignup(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const signupBtn = document.getElementById('signupBtn');
  const firstNameEl = document.getElementById('firstName');
  const lastNameEl = document.getElementById('lastName');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');

  const firstName = firstNameEl ? firstNameEl.value.trim() : '';
  const lastName = lastNameEl ? lastNameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';
  const password = passwordEl ? passwordEl.value : '';

  if (!firstName || !lastName || !email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  // UI feedback
  const signupSpinner = document.getElementById('signupSpinner');
  const statusMsg = document.getElementById('statusMsg');
  const previousText = signupBtn ? signupBtn.textContent : '';
  if (signupBtn) {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Signing up...';
  }
  if (signupSpinner) signupSpinner.style.display = 'block';
  if (statusMsg) statusMsg.textContent = 'Creating your account...';

  try {
    const resp = await fetchJson('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ firstName, lastName, email, password })
    });
    if (statusMsg) statusMsg.textContent = 'Signup successful. You can now sign in.';
    setTimeout(() => { window.location.href = '../auth/signin.html'; }, 800);
  } catch (error) {
    console.error('Signup error', error);
    let message = error?.response?.error || error?.message || 'Signup failed';
    const detail = error?.response?.detail;
    if (detail) message += ' - ' + detail;
    const statusMsg = document.getElementById('statusMsg');
    if (statusMsg) statusMsg.textContent = message;
    alert('Error: ' + message);
  } finally {
    if (signupBtn) {
      signupBtn.disabled = false;
      signupBtn.textContent = previousText;
    }
    if (signupSpinner) signupSpinner.style.display = 'none';
  }
}

const attachUserSignup = () => {
  const signupBtn = document.getElementById('signupBtn');
  if (!signupBtn) {
    console.warn('Signup button (#signupBtn) not found on the page');
    return;
  }

  signupBtn.addEventListener('click', handleSignup);
  // Fallback: event delegation in case direct listener fails to bind
  document.addEventListener('click', (evt) => {
    const btn = evt.target && evt.target.closest ? evt.target.closest('#signupBtn') : null;
    if (btn) handleSignup(evt);
  });
};

// Attach now if DOM is parsed (module scripts are deferred), otherwise on DOMContentLoaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', attachUserSignup);
} else {
  attachUserSignup();
}

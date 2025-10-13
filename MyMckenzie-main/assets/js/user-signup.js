// Switched to server-backed Neon flow — frontend posts to /api/signup

/* ===========================
  Sign Up Logic (users) - Server-backed (Neon/Postgres)
=========================== */

/* ===========================
  Sign Up Logic (users)
=========================== */
window.addEventListener('DOMContentLoaded', () => {
  const signupBtn = document.getElementById("signupBtn");
  if (!signupBtn) {
    console.warn('Signup button (#signupBtn) not found on the page');
    return;
  }

  signupBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const firstNameEl = document.getElementById("firstName");
    const lastNameEl = document.getElementById("lastName");
    const emailEl = document.getElementById("email");
    const passwordEl = document.getElementById("password");

    const firstName = firstNameEl ? firstNameEl.value.trim() : '';
    const lastName = lastNameEl ? lastNameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value.trim() : '';

    if (!firstName || !lastName || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }

  // UI feedback
  const signupSpinner = document.getElementById('signupSpinner');
  const statusMsg = document.getElementById('statusMsg');
  const previousText = signupBtn.textContent;
  signupBtn.disabled = true;
  signupBtn.textContent = 'Signing up...';
  if (signupSpinner) signupSpinner.style.display = 'block';
  if (statusMsg) statusMsg.textContent = 'Attempting to create account...';

    try {
      // Post to server API which will handle Neon Auth/DB operations
      const resp = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.detail || json?.error || 'Signup failed');

      if (statusMsg) statusMsg.textContent = 'Signup processed — check your email if verification is required.';
      setTimeout(() => { window.location.href = '../auth/signin.html'; }, 900);
    } catch (error) {
      console.error('Signup error', error);
      if (statusMsg) statusMsg.textContent = 'Signup failed: ' + (error?.message || error);
      alert("Error: " + (error?.message || error));
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = previousText;
      if (signupSpinner) signupSpinner.style.display = 'none';
    }
  });
});

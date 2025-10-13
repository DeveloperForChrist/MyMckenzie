/* ===========================
   Sign In Logic (server-backed Neon)
=========================== */
const signinBtn = document.getElementById('signinBtn');
if (signinBtn) {
  signinBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) { alert('Please enter both email and password.'); return; }
    try {
      const resp = await fetch('/api/signin', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email, password }) });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.detail || json?.error || 'Signin failed');
      const profile = json.profile;
      localStorage.setItem('userData', JSON.stringify(profile));
      if (profile.role === 'mckenzie') window.location.href = '../friend/friend-Dashboard.html';
      else window.location.href = '../dashboard/user-dashboard.html';
    } catch (err) { alert('Error signing in: ' + (err.message || err)); }
  });
}

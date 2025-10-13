document.getElementById('mckenzieSignupBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const experience = document.getElementById('experience').value.trim();
  const expertise = document.getElementById('expertise').value.trim();
  if (!firstName || !lastName || !email || !password) { alert('Please fill in required fields'); return; }
  try {
    const resp = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ firstName, lastName, email, password, metadata: { experience, expertise }, role: 'mckenzie' }) });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.detail || json?.error || 'Signup failed');
    alert('McKenzie Friend registered successfully. Check your email for verification.');
    window.location.href = '../auth/signin.html';
  } catch (err) { alert('Error: ' + (err.message || err)); }
});


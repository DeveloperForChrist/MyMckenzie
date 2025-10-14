import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const attachMckenzieSignup = () => {
  const btn = document.getElementById('mckenzieSignupBtn');
  if (!btn) { console.warn('McKenzie signup button not found'); return; }
  btn.addEventListener('click', async (e) => {
  e.preventDefault();
  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const experience = document.getElementById('experience').value.trim();
  const expertise = document.getElementById('expertise').value.trim();
  if (!firstName || !lastName || !email || !password) { alert('Please fill in required fields'); return; }

  btn.disabled = true;
  const prev = btn.textContent; btn.textContent = 'Registering...';

  try {
    // Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = cred;
    try { await updateProfile(user, { displayName: `${firstName} ${lastName}`.trim() }); } catch (_) {}

    // Write McKenzie profile to Firestore
    const uid = user.uid;
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      firstName,
      lastName,
      role: 'mckenzie',
      accountType: 'mckenzie',
      experience: experience || null,
      expertise: expertise || null,
      provider: 'password',
      createdAt: serverTimestamp()
    }, { merge: true });

    try { await sendEmailVerification(user); } catch (_) {}

    alert('McKenzie Friend registered successfully. Check your email for verification.');
    window.location.href = '../auth/signin.html';
  } catch (err) {
    alert('Error: ' + (err?.message || err));
  } finally {
    btn.disabled = false; btn.textContent = prev;
  }
  });
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', attachMckenzieSignup);
} else {
  attachMckenzieSignup();
}


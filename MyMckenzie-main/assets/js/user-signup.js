// Firebase client-side signup: create Auth user and write profile to Firestore

import { auth, db } from './firebase-init.js';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

const attachUserSignup = () => {
  const signupBtn = document.getElementById('signupBtn');
  if (!signupBtn) {
    console.warn('Signup button (#signupBtn) not found on the page');
    return;
  }

  signupBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const firstNameEl = document.getElementById('firstName');
    const lastNameEl = document.getElementById('lastName');
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');

    const firstName = firstNameEl ? firstNameEl.value.trim() : '';
    const lastName = lastNameEl ? lastNameEl.value.trim() : '';
    const email = emailEl ? emailEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value.trim() : '';

    if (!firstName || !lastName || !email || !password) {
      alert('Please fill in all fields.');
      return;
    }

    // UI feedback
    const signupSpinner = document.getElementById('signupSpinner');
    const statusMsg = document.getElementById('statusMsg');
    const previousText = signupBtn.textContent;
    signupBtn.disabled = true;
    signupBtn.textContent = 'Signing up...';
    if (signupSpinner) signupSpinner.style.display = 'block';
    if (statusMsg) statusMsg.textContent = 'Creating your account...';

    try {
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = cred;

      // Optional: set displayName
      try { await updateProfile(user, { displayName: `${firstName} ${lastName}`.trim() }); } catch (_) {}

      // Write profile to Firestore (users/{uid})
      const uid = user.uid;
      await setDoc(doc(db, 'users', uid), {
        uid,
        email,
        firstName,
        lastName,
        role: 'user',
        accountType: 'user',
        provider: 'password',
        createdAt: serverTimestamp()
      }, { merge: true });

      // Send email verification (optional but recommended)
      try { await sendEmailVerification(user); } catch (_) {}

      if (statusMsg) statusMsg.textContent = 'Signup successful. Please verify your email to complete setup.';
      // Redirect to sign-in after a short delay
      setTimeout(() => { window.location.href = '../auth/signin.html'; }, 1000);
    } catch (error) {
      console.error('Signup error', error);
      if (statusMsg) statusMsg.textContent = 'Signup failed: ' + (error?.message || error);
      alert('Error: ' + (error?.message || error));
    } finally {
      signupBtn.disabled = false;
      signupBtn.textContent = previousText;
      if (signupSpinner) signupSpinner.style.display = 'none';
    }
  });
};

// Attach now if DOM is parsed (module scripts are deferred), otherwise on DOMContentLoaded
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', attachUserSignup);
} else {
  attachUserSignup();
}

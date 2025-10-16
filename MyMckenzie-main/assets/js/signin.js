/* ===========================
   Sign In Logic (client-side Firebase Auth)
=========================== */
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { auth, db } from './firebase-init.js';

const signinBtn = document.getElementById('signinBtn');
if (signinBtn) {
  signinBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) { alert('Please enter both email and password.'); return; }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const { user } = cred;
      // Fetch user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) throw new Error('User profile not found');
      const profile = userDoc.data();
      localStorage.setItem('userData', JSON.stringify(profile));
      // Redirect based on role
      if (profile.role === 'friend' || profile.role === 'mckenzie') window.location.href = '../friend/friend-Dashboard.html';
      else window.location.href = '../dashboard/user-dashboard.html';
    } catch (err) { alert('Error signing in: ' + (err.message || err)); }
  });
}

// Google Sign In
const googleSigninBtn = document.getElementById('googleSigninBtn');
if (googleSigninBtn) {
  googleSigninBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      // Check if user exists in Firestore, if not create profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Create new user profile
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || '',
          email: user.email,
          role: 'user', // default role
          createdAt: new Date()
        });
      }
      const profile = userDoc.exists() ? userDoc.data() : { name: user.displayName || '', email: user.email, role: 'user' };
      localStorage.setItem('userData', JSON.stringify(profile));
      // Redirect based on role
      if (profile.role === 'friend' || profile.role === 'mckenzie') window.location.href = '../friend/friend-Dashboard.html';
      else window.location.href = '../dashboard/user-dashboard.html';
    } catch (err) { alert('Error signing in with Google: ' + (err.message || err)); }
  });
}

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function updateNavbar(user) {
  const navMenu = document.getElementById('nav-menu');
  const navbar = document.querySelector('.navbar');
  const navLogo = document.querySelector('.nav-logo');

  if (!navMenu || !navbar || !navLogo) return;

  if (user) {
    // User is signed in, fetch profile
    getDoc(doc(db, 'users', user.uid)).then((userDoc) => {
      const userData = userDoc.data();
      const displayName = userData?.name || user.email; // Use name if available, else email
      const role = userData?.role || 'user'; // default to 'user' if no role

      // Determine dashboard URL based on role
      let dashboardUrl = '../dashboard/user-dashboard.html'; // default
      if (role === 'friend' || role === 'mckenzie') {
        dashboardUrl = '../friend/friend-Dashboard.html';
      }

      // Update navbar for logged-in user
      navbar.classList.add('logged-in');
      navLogo.href = dashboardUrl; // Left logo always goes to dashboard

      // Update nav-menu to show only user menu
      navMenu.innerHTML = `
        <li class="nav-item user-menu">
          <button class="user-menu-toggle" id="user-menu-toggle">
            <div class="user-avatar">${displayName.charAt(0).toUpperCase()}</div>
            ${displayName}
          </button>
          <ul class="dropdown-menu" id="dropdown-menu">
            <li><a href="${dashboardUrl}">Dashboard</a></li>
            <li><a href="../settings/settings.html">Profile / Account Settings</a></li>
            <li><a href="#" id="sign-out-link">Sign Out</a></li>
          </ul>
        </li>
      `;

      // Add event listener for dropdown toggle
      const userMenuToggle = document.getElementById('user-menu-toggle');
      const dropdownMenu = document.getElementById('dropdown-menu');
      if (userMenuToggle && dropdownMenu) {
        userMenuToggle.addEventListener('click', (e) => {
          e.preventDefault();
          dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!userMenuToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
          }
        });
      }

      // Add event listener for sign out
      const signOutLink = document.getElementById('sign-out-link');
      if (signOutLink) {
        signOutLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('Are you sure you want to sign out?')) {
            signOut(auth).then(() => {
              // Sign-out successful, redirect to sign in page
              window.location.href = '../auth/signin.html';
            }).catch((error) => {
              console.error('Sign out error:', error);
            });
          }
        });
      }
    });
  } else {
    // User is signed out
    navbar.classList.remove('logged-in');
    navLogo.href = '../index.html'; // Reset to home

    // Show login/signup links
    navMenu.innerHTML = `
      <li class="nav-item">
        <a href="../auth/signin.html" class="nav-link">Login</a>
      </li>
      <li class="nav-item">
        <a href="../join/Join.html" class="nav-link">Sign Up</a>
      </li>
    `;
  }
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  updateNavbar(user);
});

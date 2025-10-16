import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getStorage, ref, deleteObject } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;

// Load user data from Firestore
async function loadUserData(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Populate form fields
      document.getElementById('first-name').value = userData.firstName || '';
      document.getElementById('last-name').value = userData.lastName || '';
      document.getElementById('email').value = userData.email || user.email;


    }
  } catch (error) {
    console.error('Error loading user data:', error);
    alert('Error loading user data. Please try again.');
  }
}

// Save user data to Firestore
async function saveUserData() {
  if (!currentUser) return;

  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const email = document.getElementById('email').value.trim();

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      firstName,
      lastName,
      email,
      updatedAt: new Date()
    });

    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving user data:', error);
    alert('Error saving settings. Please try again.');
  }
}

// Change password
async function changePassword() {
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  if (newPassword.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }

  try {
    await updatePassword(currentUser, newPassword);
    alert('Password changed successfully!');
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
  } catch (error) {
    console.error('Error changing password:', error);
    if (error.code === 'auth/requires-recent-login') {
      alert('Please sign in again to change your password.');
    } else {
      alert('Error changing password. Please try again.');
    }
  }
}

// Delete account
async function deleteAccount() {
  if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
    return;
  }

  try {
    // Get user data to check for profile picture
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();

    // Delete profile picture from Firebase Storage if exists
    if (userData && userData.profilePictureUrl) {
      try {
        const storageRef = ref(storage, userData.profilePictureUrl);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn('Error deleting profile picture:', storageError);
        // Continue with account deletion even if storage deletion fails
      }
    }

    // Delete user document from Firestore
    await deleteDoc(doc(db, 'users', currentUser.uid));

    // Delete user from Firebase Auth
    await currentUser.delete();

    // Sign out and redirect
    await signOut(auth);
    alert('Account deleted successfully.');
    window.location.href = '../auth/signin.html';
  } catch (error) {
    console.error('Error deleting account:', error);
    alert('Error deleting account. Please try again.');
  }
}
// Go to dashboard
function goToDashboard() {
  if (currentUser) {
    // Determine dashboard URL based on user role
    const userDocRef = doc(db, 'users', currentUser.uid);
    getDoc(userDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const role = userData.role || 'user';
        if (role === 'friend') {
          window.location.href = '../friend/friend-Dashboard.html';
        } else {
          window.location.href = '../dashboard/user-dashboard.html';
        }
      } else {
        window.location.href = '../dashboard/user-dashboard.html';
      }
    }).catch((error) => {
      console.error('Error getting user role:', error);
      window.location.href = '../dashboard/user-dashboard.html';
    });
  } else {
    window.location.href = '../dashboard/user-dashboard.html';
  }
}

// Initialize settings page
function initSettings() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadUserData(user);
    } else {
      // Redirect to sign in if not authenticated
      window.location.href = '../auth/signin.html';
    }
  });

  // Event listeners
  document.querySelector('.save-btn').addEventListener('click', saveUserData);
  document.querySelector('.delete-btn').addEventListener('click', deleteAccount);

  // Password change form
  document.getElementById('change-password-btn').addEventListener('click', changePassword);

  // Go to dashboard button
  document.getElementById('go-to-dashboard-btn').addEventListener('click', goToDashboard);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initSettings);

import { auth, db, storage } from './firebase-init.js';
import { doc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const attachProfileForm = () => {
  const form = document.getElementById('profileForm');
  if (!form) { console.warn('Profile form not found'); return; }

  // Load existing profile data
  const loadProfile = async (user) => {
    if (!user) {
      window.location.href = '../auth/signin.html';
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        // Populate first and last name from account data
        document.getElementById('firstName').value = data.firstName || '';
        document.getElementById('lastName').value = data.lastName || '';

        // Populate other profile fields
        document.getElementById('expertise').value = data.expertise || '';
        document.getElementById('bio').value = data.bio || '';
        document.getElementById('location').value = data.location || '';
        document.getElementById('yearsPractice').value = data.yearsPractice || '';

        // Load profile picture if exists
        if (data.profilePictureUrl) {
          const preview = document.getElementById('imagePreview');
          preview.innerHTML = `<img src="${data.profilePictureUrl}" alt="Profile Picture" style="max-width: 200px; max-height: 200px;">`;
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Please sign in first');
      return;
    }

    const btn = form.querySelector('.save-btn');
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = 'Saving...';

    try {
      const firstName = document.getElementById('firstName').value.trim();
      const lastName = document.getElementById('lastName').value.trim();
      const expertise = document.getElementById('expertise').value.trim();
      const bio = document.getElementById('bio').value.trim();
      const location = document.getElementById('location').value.trim();
      const yearsPractice = parseInt(document.getElementById('yearsPractice').value);
      const profilePicture = document.getElementById('profilePicture').files[0];

      let profilePictureUrl = null;
      if (profilePicture) {
        // Upload image to Firebase Storage
        const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
        await uploadBytes(storageRef, profilePicture);
        profilePictureUrl = await getDownloadURL(storageRef);
      }

      // Update Firestore document
      const updateData = {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        expertise,
        bio,
        location,
        yearsPractice,
        profileComplete: true,
        updatedAt: serverTimestamp()
      };

      if (profilePictureUrl) {
        updateData.profilePictureUrl = profilePictureUrl;
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);

      alert('Profile saved successfully! You will now appear on the marketplace.');
      window.location.href = 'friend-Dashboard.html';
    } catch (err) {
      alert('Error saving profile: ' + (err?.message || err));
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
    }
  });

  // Handle dashboard button
  const dashboardBtn = document.getElementById('go-to-dashboard-btn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      window.location.href = 'friend-Dashboard.html';
    });
  }

  // Handle image preview
  const profilePictureInput = document.getElementById('profilePicture');
  profilePictureInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; max-height: 200px;">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Listen for authentication state changes
  onAuthStateChanged(auth, (user) => {
    loadProfile(user);
  });
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', attachProfileForm);
} else {
  attachProfileForm();
}

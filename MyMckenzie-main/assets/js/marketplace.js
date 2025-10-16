import { db } from './firebase-init.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const loadMarketplaceProfiles = async () => {
  const profileContainer = document.querySelector('.profile-container');
  if (!profileContainer) {
    console.warn('Profile container not found');
    return;
  }

  // Check if we're in portal mode
  const urlParams = new URLSearchParams(window.location.search);
  const isPortalMode = urlParams.get('tab') === 'portal';

  // Update page title and description based on mode
  const pageTitle = document.getElementById('page-title');
  const pageDescription = document.getElementById('page-description');
  const sendToPortalBtn = document.getElementById('send-to-portal-btn');

  if (isPortalMode) {
    if (pageTitle) pageTitle.textContent = 'Case Portal';
    if (pageDescription) pageDescription.textContent = 'View and accept pending client cases.';
    if (sendToPortalBtn) sendToPortalBtn.style.display = 'none';
  } else {
    if (pageTitle) pageTitle.textContent = 'McKenzie Friends Directory';
    if (pageDescription) pageDescription.textContent = 'Browse profiles and contact a McKenzie Friend for help with your case.';
    if (sendToPortalBtn) sendToPortalBtn.style.display = 'inline-block';
  }

  try {
    if (isPortalMode) {
      // Load pending cases for McKenzie Friends
      await loadPendingCases();
    } else {
      // Load marketplace profiles for users
      await loadProfiles();
    }
  } catch (err) {
    console.error('Error loading marketplace content:', err);
    profileContainer.innerHTML = '<p>Error loading content. Please try again later.</p>';
  }
};

const loadProfiles = async () => {
  const profileContainer = document.querySelector('.profile-container');

  // Query users where profileComplete is true
  const q = query(collection(db, 'users'), where('profileComplete', '==', true));
  const querySnapshot = await getDocs(q);

  // Clear existing static cards
  profileContainer.innerHTML = '';

  if (querySnapshot.empty) {
    profileContainer.innerHTML = '<p>No profiles available at the moment.</p>';
    return;
  }

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const uid = doc.id;

    // Create profile card
    const card = document.createElement('div');
    card.className = 'profile-card';

    const imgSrc = data.profilePictureUrl || '../assets/img/default-profile.jpg'; // Assuming a default image if none

    card.innerHTML = `
      <img src="${imgSrc}" alt="${data.fullName || 'Profile Picture'}">
      <h3>${data.fullName || 'Anonymous'}</h3>
      <p><strong>Specialties:</strong> ${data.expertise || 'Not specified'}</p>
      <p class="bio">${data.bio || 'No bio available.'}</p>
      <a href="../contact/ContactMckenzie.html?friendId=${uid}" class="contact-btn">Contact</a>
    `;

    profileContainer.appendChild(card);
  });
};

const loadPendingCases = async () => {
  const profileContainer = document.querySelector('.profile-container');
  const user = auth.currentUser;

  if (!user) {
    profileContainer.innerHTML = '<p>Please log in to view pending cases.</p>';
    return;
  }

  // Check if user is a McKenzie Friend
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  if (!userData || (userData.role !== 'friend' && userData.role !== 'mckenzie')) {
    profileContainer.innerHTML = '<p>You do not have permission to view pending cases.</p>';
    return;
  }

  // Query pending cases
  const q = query(collection(db, 'pendingCases'), where('status', '==', 'pending'));
  const querySnapshot = await getDocs(q);

  profileContainer.innerHTML = '';

  if (querySnapshot.empty) {
    profileContainer.innerHTML = '<p>No pending cases available at the moment.</p>';
    return;
  }

  querySnapshot.forEach((docSnapshot) => {
    const caseData = docSnapshot.data();
    const caseId = docSnapshot.id;

    // Create case card
    const card = document.createElement('div');
    card.className = 'profile-card case-card';

    const timeAgo = getTimeAgo(caseData.timestamp.toDate());

    card.innerHTML = `
      <div class="case-header">
        <h3>${caseData.caseTitle}</h3>
        <span class="case-time">${timeAgo}</span>
      </div>
      <p class="case-description">${caseData.caseDescription}</p>
      <div class="case-meta">
        <p><strong>Client:</strong> ${caseData.userEmail}</p>
      </div>
      <button class="accept-case-btn" data-case-id="${caseId}">Accept Case</button>
    `;

    profileContainer.appendChild(card);
  });

  // Add event listeners for accept buttons
  document.querySelectorAll('.accept-case-btn').forEach(btn => {
    btn.addEventListener('click', (e) => acceptCase(e.target.dataset.caseId));
  });
};

const acceptCase = async (caseId) => {
  const user = auth.currentUser;
  if (!user) return;

  if (!confirm('Are you sure you want to accept this case? This will make it unavailable to other McKenzie Friends.')) {
    return;
  }

  try {
    // Update the case status
    await updateDoc(doc(db, 'pendingCases', caseId), {
      status: 'accepted',
      acceptedBy: user.uid,
      acceptedAt: new Date()
    });

    alert('Case accepted successfully! The client will be notified.');
    // Reload the cases
    loadPendingCases();
  } catch (error) {
    console.error('Error accepting case:', error);
    alert('Error accepting case. Please try again.');
  }
};

const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

const auth = getAuth();

// Modal elements
let portalModal = null;
let portalForm = null;

const createPortalModal = () => {
  // Create modal HTML
  const modalHTML = `
    <div id="portal-modal" class="portal-modal">
      <div class="portal-modal-content">
        <div class="portal-modal-header">
          <h2>Send Case to Portal</h2>
          <span class="portal-modal-close">&times;</span>
        </div>
        <div class="portal-modal-body">
          <form id="portal-form">
            <div class="form-group">
              <label for="case-title">Case Title:</label>
              <input type="text" id="case-title" required placeholder="Brief title for your case">
            </div>
            <div class="form-group">
              <label for="case-description">Case Description:</label>
              <textarea id="case-description" required placeholder="Describe your case details, what help you need, and any relevant information..." rows="6"></textarea>
            </div>
            <div class="portal-info">
              <h3>Information to be shared:</h3>
              <p><strong>Your contact info:</strong> Email address and basic profile information</p>
              <p><strong>Disclaimer:</strong> Your case details will be sent to available McKenzie Friends; the first to accept will take the case.</p>
            </div>
            <div class="portal-actions">
              <button type="button" class="portal-cancel-btn">Cancel</button>
              <button type="submit" class="portal-submit-btn">Send to Portal</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Get modal elements
  portalModal = document.getElementById('portal-modal');
  portalForm = document.getElementById('portal-form');

  // Add event listeners
  const closeBtn = portalModal.querySelector('.portal-modal-close');
  const cancelBtn = portalModal.querySelector('.portal-cancel-btn');

  closeBtn.addEventListener('click', closePortalModal);
  cancelBtn.addEventListener('click', closePortalModal);

  // Close modal when clicking outside
  portalModal.addEventListener('click', (e) => {
    if (e.target === portalModal) {
      closePortalModal();
    }
  });

  // Handle form submission
  portalForm.addEventListener('submit', handlePortalSubmit);
};

const openPortalModal = () => {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to send a case to the portal.');
    return;
  }

  if (!portalModal) {
    createPortalModal();
  }

  portalModal.style.display = 'block';
};

const closePortalModal = () => {
  if (portalModal) {
    portalModal.style.display = 'none';
  }
};

const handlePortalSubmit = async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to send a case to the portal.');
    return;
  }

  const caseTitle = document.getElementById('case-title').value.trim();
  const caseDescription = document.getElementById('case-description').value.trim();

  if (!caseTitle || !caseDescription) {
    alert('Both case title and description are required.');
    return;
  }

  try {
    await addDoc(collection(db, 'pendingCases'), {
      userId: user.uid,
      userEmail: user.email,
      caseTitle: caseTitle,
      caseDescription: caseDescription,
      timestamp: new Date(),
      status: 'pending'
    });

    alert('Your case has been sent to the McKenzie Friends portal. The first friend to accept will take on your case.');
    closePortalModal();
    portalForm.reset();
  } catch (error) {
    console.error('Error sending case to portal:', error);
    alert('Error sending case to portal. Please try again.');
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    loadMarketplaceProfiles();

    // Add event listener for send to portal button
    const sendToPortalBtn = document.getElementById('send-to-portal-btn');
    if (sendToPortalBtn) {
      sendToPortalBtn.addEventListener('click', openPortalModal);
    }
  });
} else {
  loadMarketplaceProfiles();

  // Add event listener for send to portal button
  const sendToPortalBtn = document.getElementById('send-to-portal-btn');
  if (sendToPortalBtn) {
    sendToPortalBtn.addEventListener('click', openPortalModal);
  }
}

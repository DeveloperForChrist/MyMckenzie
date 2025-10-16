import { db } from './firebase-init.js';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

const auth = getAuth();

const loadPortalCases = async () => {
  const portalCasesDiv = document.getElementById('portal-cases');
  if (!portalCasesDiv) return;

  try {
    const q = query(collection(db, 'casePortal'), where('status', '==', 'available'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      portalCasesDiv.innerHTML = '<p>No available cases in the portal at the moment.</p>';
      return;
    }

    portalCasesDiv.innerHTML = '';

    querySnapshot.forEach((docSnap) => {
      const caseData = docSnap.data();
      const caseId = docSnap.id;

      const caseCard = document.createElement('div');
      caseCard.className = 'card portal-case-card';

      const timestamp = caseData.timestamp.toDate();
      const formattedDate = timestamp.toLocaleDateString();

      caseCard.innerHTML = `
        <h3>Portal Case — ${formattedDate}</h3>
        <p><strong>User:</strong> ${caseData.userEmail}</p>
        <p><strong>Details:</strong> ${caseData.caseDetails.substring(0, 100)}${caseData.caseDetails.length > 100 ? '...' : ''}</p>
        <button class="accept-case-btn" data-case-id="${caseId}">Accept Case</button>
      `;

      portalCasesDiv.appendChild(caseCard);
    });

    // Add event listeners for accept buttons
    document.querySelectorAll('.accept-case-btn').forEach(btn => {
      btn.addEventListener('click', (e) => acceptPortalCase(e.target.dataset.caseId));
    });

  } catch (error) {
    console.error('Error loading portal cases:', error);
    portalCasesDiv.innerHTML = '<p>Error loading portal cases. Please try again later.</p>';
  }
};

const acceptPortalCase = async (caseId) => {
  const user = auth.currentUser;
  if (!user) {
    alert('You must be logged in to accept cases.');
    return;
  }

  if (!confirm('Are you sure you want to accept this case? It will be assigned to you and removed from the portal.')) {
    return;
  }

  try {
    // Update the case status to accepted
    await updateDoc(doc(db, 'casePortal', caseId), {
      status: 'accepted',
      acceptedBy: user.uid,
      acceptedAt: new Date()
    });

    // Create a new active case for the friend
    const caseDoc = await getDocs(query(collection(db, 'casePortal'), where('__name__', '==', caseId)));
    const caseData = caseDoc.docs[0].data();

    await addDoc(collection(db, 'activeCases'), {
      friendId: user.uid,
      userId: caseData.userId,
      userEmail: caseData.userEmail,
      caseDetails: caseData.caseDetails,
      acceptedAt: new Date(),
      status: 'active'
    });

    alert('Case accepted successfully! You can now manage this case.');
    loadPortalCases(); // Refresh the portal cases

  } catch (error) {
    console.error('Error accepting case:', error);
    alert('Error accepting case. Please try again.');
  }
};

// Check for new portal cases and update dashboard alert
const checkForNewCases = async () => {
  try {
    const q = query(collection(db, 'casePortal'), where('status', '==', 'available'));
    const querySnapshot = await getDocs(q);

    const newCasesCount = querySnapshot.size;

    // Update the My Cases card on dashboard if it exists
    const myCasesCard = document.querySelector('a[href="my-cases.html"] .card h3');
    if (myCasesCard && newCasesCount > 0) {
      myCasesCard.innerHTML = `My Cases <span class="notification-badge">${newCasesCount}</span>`;
    }
  } catch (error) {
    console.error('Error checking for new cases:', error);
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        loadPortalCases();
        checkForNewCases();
      }
    });
  });
} else {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadPortalCases();
      checkForNewCases();
    }
  });
}

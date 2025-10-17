// Import Firebase modules
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Handle form submission
document.getElementById('connect-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const caseData = {
    caseTitle: formData.get('caseTitle'),
    caseType: formData.get('caseType'),
    caseDetails: formData.get('caseDetails'),
    urgency: formData.get('urgency'),
    userName: formData.get('userName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    consent: formData.get('consent') === 'on',
    documents: [], // Will be populated if files are uploaded
    timestamp: new Date().toISOString(),
    status: 'pending',
    referenceNumber: 'MC' + Date.now().toString().slice(-8)
  };

  // Handle file uploads
  const files = formData.getAll('documents');
  if (files && files.length > 0) {
    for (const file of files) {
      if (file.size > 0) { // Check if file was actually selected
        caseData.documents.push({
          name: file.name,
          type: file.type,
          size: file.size,
          data: await fileToBase64(file)
        });
      }
    }
  }

  try {
    // Store case data in Firebase Firestore
    const docRef = await addDoc(collection(db, 'cases'), caseData);
    console.log('Case submitted with ID: ', docRef.id);

    // Also store locally for backward compatibility (remove later if not needed)
    const existingCases = JSON.parse(localStorage.getItem('pendingCases') || '[]');
    existingCases.push(caseData);
    localStorage.setItem('pendingCases', JSON.stringify(existingCases));

    // Show success message with popup
    showSuccessPopup(caseData.referenceNumber);
  } catch (error) {
    console.error('Error submitting case:', error);
    showToast('Error submitting case. Please try again.');
  }

  // Redirect to user dashboard after a short delay
  setTimeout(() => {
    window.location.href = 'user-dashboard.html';
  }, 4000);
});

// Handle save draft
document.getElementById('save-draft').addEventListener('click', () => {
  const formData = new FormData(document.getElementById('connect-form'));
  const draftData = {
    caseTitle: formData.get('caseTitle'),
    caseType: formData.get('caseType'),
    caseDetails: formData.get('caseDetails'),
    urgency: formData.get('urgency'),
    userName: formData.get('userName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    savedAt: new Date().toISOString()
  };

  localStorage.setItem('caseDraft', JSON.stringify(draftData));
  showToast('Draft saved successfully!');
});

// Success popup function
function showSuccessPopup(referenceNumber) {
  // Create popup overlay
  const overlay = document.createElement('div');
  overlay.className = 'success-popup-overlay';
  overlay.innerHTML = `
    <div class="success-popup">
      <div class="success-icon">
        <i class='bx bx-check-circle'></i>
      </div>
      <h2>Case Submitted Successfully!</h2>
      <p class="reference">Reference Number: <strong>${referenceNumber}</strong></p>
      <div class="success-message">
        <p>Your case has been sent to our McKenzie Friend portal.</p>
        <p>You should expect a reply within <strong>24 hours</strong> from a qualified McKenzie Friend.</p>
      </div>
      <div class="success-actions">
        <button class="success-btn" onclick="closeSuccessPopup()">Continue to Dashboard</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Auto-close after 4 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.remove();
    }
  }, 4000);
}

// Close success popup
function closeSuccessPopup() {
  const overlay = document.querySelector('.success-popup-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Make functions global
window.showSuccessPopup = showSuccessPopup;
window.closeSuccessPopup = closeSuccessPopup;

// Prefill form with user data from Firebase and conversation summary or draft if available
window.addEventListener('DOMContentLoaded', () => {
  // Check if user is authenticated and prefill their info
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Prefill form fields with user data
          const nameField = document.getElementById('user-name');
          const emailField = document.getElementById('email');

          if (nameField && userData.name) {
            nameField.value = userData.name;
          }
          if (emailField && user.email) {
            emailField.value = user.email;
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  const summary = urlParams.get('summary');

  if (summary) {
    document.getElementById('case-details').value = summary;
  }

  // Load draft if exists
  const draft = localStorage.getItem('caseDraft');
  if (draft && !summary) { // Don't load draft if we have a summary
    const draftData = JSON.parse(draft);
    Object.keys(draftData).forEach(key => {
      const element = document.getElementById(key);
      if (element && key !== 'savedAt') {
        if (element.type === 'checkbox') {
          element.checked = draftData[key];
        } else {
          element.value = draftData[key];
        }
      }
    });
    showToast('Draft loaded from previous session');
  }
});

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Toast notification function
function showToast(message) {
  let toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("visible"), 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

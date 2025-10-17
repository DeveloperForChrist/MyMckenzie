// Import Firebase modules
import { db } from './firebase-init.js';
import { collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

// Load cases from Firebase Firestore
let allCases = [];
let filteredCases = [];

const caseCardsContainer = document.getElementById('pending-cases');
const caseCountElement = document.getElementById('case-count');
const pendingCountElement = document.getElementById('pending-count');
const acceptedCountElement = document.getElementById('accepted-count');
const completedCountElement = document.getElementById('completed-count');

// Initialize filters
const caseTypeFilter = document.getElementById('case-type-filter');
const urgencyFilter = document.getElementById('urgency-filter');

if (caseTypeFilter) {
  caseTypeFilter.addEventListener('change', filterCases);
}

if (urgencyFilter) {
  urgencyFilter.addEventListener('change', filterCases);
}

// Load and display cases
async function loadCases() {
  try {
    // Fetch cases from Firebase
    const querySnapshot = await getDocs(collection(db, 'cases'));
    allCases = [];
    querySnapshot.forEach((doc) => {
      const caseData = { id: doc.id, ...doc.data() };
      if (caseData.status === 'pending') {
        allCases.push(caseData);
      }
    });

    filteredCases = [...allCases];

    // Update statistics
    updateStats();

    // Clear existing content
    caseCardsContainer.innerHTML = '';

    // If no cases, show empty state
    if (filteredCases.length === 0) {
      if (allCases.length === 0) {
        caseCardsContainer.innerHTML = `
          <div class="no-cases">
            <i class='bx bx-folder-open'></i>
            <h3>No Cases Available</h3>
            <p>New cases will appear here when clients submit them through the portal.</p>
          </div>
        `;
      } else {
        caseCardsContainer.innerHTML = `
          <div class="no-cases">
            <i class='bx bx-search-alt'></i>
            <h3>No Cases Match Your Filters</h3>
            <p>Try adjusting your filter criteria to see more cases.</p>
          </div>
        `;
      }
      if (caseCountElement) caseCountElement.textContent = '0 cases found';
      return;
    }

    // Update case count
    if (caseCountElement) {
      caseCountElement.textContent = `${filteredCases.length} case${filteredCases.length !== 1 ? 's' : ''} found`;
    }

    // Create case cards
    filteredCases.forEach((caseData, index) => {
      const caseCard = document.createElement('div');
      caseCard.className = 'case-card';
      caseCard.innerHTML = `
        <div class="case-header">
          <div class="case-number">${index + 1}</div>
          <h3>${caseData.caseTitle}</h3>
          <span class="case-ref">${caseData.referenceNumber}</span>
        </div>
        <div class="case-meta">
          <span class="case-type">${caseData.caseType}</span>
          <span class="case-urgency ${caseData.urgency.replace(' ', '-')}">${caseData.urgency}</span>
          <span class="case-date">${new Date(caseData.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="case-details">
          <p>${caseData.caseDetails}</p>
        </div>
        <div class="case-contact">
          <p><strong>Name:</strong> ${caseData.userName}</p>
          <p><strong>Email:</strong> ${caseData.email}</p>
          <p><strong>Phone:</strong> ${caseData.phone || 'Not provided'}</p>
        </div>
        <div class="case-actions">
          <button class="accept-btn" onclick="acceptCase('${caseData.id}')">Accept Case</button>
          <button class="decline-btn" onclick="declineCase('${caseData.id}')">Decline</button>
        </div>
      `;
      caseCardsContainer.appendChild(caseCard);
    });
  } catch (error) {
    console.error('Error loading cases:', error);
    caseCardsContainer.innerHTML = `
      <div class="no-cases">
        <i class='bx bx-error'></i>
        <h3>Error Loading Cases</h3>
        <p>Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Filter cases based on selected criteria
function filterCases() {
  const typeFilter = caseTypeFilter ? caseTypeFilter.value : 'all';
  const urgencyFilterValue = urgencyFilter ? urgencyFilter.value : 'all';

  filteredCases = allCases.filter(caseData => {
    const matchesType = typeFilter === 'all' || caseData.caseType === typeFilter;
    const matchesUrgency = urgencyFilterValue === 'all' || caseData.urgency.replace(' ', '-') === urgencyFilterValue;
    return matchesType && matchesUrgency;
  });

  loadCases();
}

// Update statistics
async function updateStats() {
  try {
    const querySnapshot = await getDocs(collection(db, 'cases'));
    let pending = 0, accepted = 0, completed = 0;

    querySnapshot.forEach((doc) => {
      const caseData = doc.data();
      switch (caseData.status) {
        case 'pending':
          pending++;
          break;
        case 'accepted':
          accepted++;
          break;
        case 'completed':
          completed++;
          break;
      }
    });

    if (pendingCountElement) pendingCountElement.textContent = pending;
    if (acceptedCountElement) acceptedCountElement.textContent = accepted;
    if (completedCountElement) completedCountElement.textContent = completed;
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Accept case function
window.acceptCase = async function(caseId) {
  try {
    await updateDoc(doc(db, 'cases', caseId), {
      status: 'accepted',
      acceptedAt: new Date().toISOString()
    });

    // Reload display
    await loadCases();
  } catch (error) {
    console.error('Error accepting case:', error);
    alert('Error accepting case. Please try again.');
  }
};

// Decline case function
window.declineCase = async function(caseId) {
  try {
    await deleteDoc(doc(db, 'cases', caseId));

    // Reload display
    await loadCases();
  } catch (error) {
    console.error('Error declining case:', error);
    alert('Error declining case. Please try again.');
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadCases);

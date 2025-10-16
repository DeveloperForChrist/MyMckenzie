import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  let currentUser = null;
  const urlParams = new URLSearchParams(window.location.search);
  const friendId = urlParams.get('friendId');

  if (!friendId) {
    alert('No McKenzie Friend selected. Please go back to the marketplace.');
    return;
  }

  // Check authentication state
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      // Prefill user name and email
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      document.getElementById('name').value = userData?.name || '';
      document.getElementById('email').value = user.email;

      // Prefill case details with latest conversation summary
      await prefillCaseDetails(user.uid);
    }

    // Load friend details
    await loadFriendDetails(friendId);
  });

  // Prefill case details with summary of latest conversation
  const prefillCaseDetails = async (userId) => {
    try {
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(conversationsQuery);
      if (!querySnapshot.empty) {
        const latestConversation = querySnapshot.docs[0].data();
        const summary = latestConversation.title || 'Latest conversation summary';
        document.getElementById('case-details').value = summary;
      }
    } catch (error) {
      console.error('Error fetching latest conversation:', error);
    }
  };

  // Hardcoded friend data for demo purposes
  const friendDataMap = {
    'jane-doe-id': {
      name: 'Jane Doe',
      email: 'jane.doe@mymckenzie.co.uk',
      specialties: 'Family Law, Civil Cases',
      bio: 'Experienced McKenzie Friend with 5+ years helping individuals navigate UK legal processes.'
    },
    'john-smith-id': {
      name: 'John Smith',
      email: 'john.smith@mymckenzie.co.uk',
      specialties: 'Housing Law, Tribunal Cases',
      bio: 'Skilled in assisting litigants in person with practical case management guidance.'
    },
    'emily-clark-id': {
      name: 'Emily Clark',
      email: 'emily.clark@mymckenzie.co.uk',
      specialties: 'Employment Law, Civil Litigation',
      bio: 'Passionate about providing support to those representing themselves in courts.'
    }
  };

  // Load friend details
  const loadFriendDetails = async (friendId) => {
    const friendDetailsDiv = document.getElementById('friend-details');

    // Check if friendId is in hardcoded map
    if (friendDataMap[friendId]) {
      const friendData = friendDataMap[friendId];
      friendDetailsDiv.innerHTML = `
        <p><strong>Name:</strong> ${friendData.name}</p>
        <p><strong>Email:</strong> ${friendData.email}</p>
        <p><strong>Specialties:</strong> ${friendData.specialties}</p>
        <p><strong>Bio:</strong> ${friendData.bio}</p>
      `;
      return;
    }

    // Fallback to Firestore
    try {
      const friendDoc = await getDoc(doc(db, 'users', friendId));
      if (friendDoc.exists()) {
        const friendData = friendDoc.data();
        friendDetailsDiv.innerHTML = `
          <p><strong>Name:</strong> ${friendData.name || 'N/A'}</p>
          <p><strong>Email:</strong> ${friendData.email || 'N/A'}</p>
          <p><strong>Specialties:</strong> ${friendData.specialties || 'N/A'}</p>
          <p><strong>Bio:</strong> ${friendData.bio || 'N/A'}</p>
        `;
      } else {
        friendDetailsDiv.innerHTML = '<p>Friend not found.</p>';
      }
    } catch (error) {
      console.error('Error loading friend details:', error);
      friendDetailsDiv.innerHTML = '<p>Error loading friend details.</p>';
    }
  };

  // Handle form submission
  document.getElementById('contact-mckenzie-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('You must be logged in to send a message.');
      return;
    }

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const caseDetails = document.getElementById('case-details').value.trim();

    if (!name || !email || !caseDetails) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      // Save the contact request to Firestore
      await addDoc(collection(db, 'contactRequests'), {
        fromUserId: currentUser.uid,
        toFriendId: friendId,
        name,
        email,
        caseDetails,
        timestamp: new Date(),
        status: 'pending'
      });

      alert('Your message has been sent to the McKenzie Friend!');
      // Optionally redirect back to marketplace or dashboard
      window.location.href = '../marketplace/marketplace.html';
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    }
  });
});

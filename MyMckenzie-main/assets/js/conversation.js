import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, arrayUnion, collection, query, where, orderBy, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const chatListEl = document.querySelector('.chat-list');
const inputEl = document.querySelector('#chatInput');
const sendBtn = document.querySelector('#chatSend');

function renderMessages(messages = []) {
  if (!chatListEl) return;
  chatListEl.innerHTML = '';
  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'chat-bubble ' + (m.sender === 'user' ? 'user' : 'bot');
    div.textContent = m.text;
    chatListEl.appendChild(div);
  });
  chatListEl.scrollTop = chatListEl.scrollHeight;
}

async function appendMessage(uid, message) {
  const userDoc = doc(db, 'users', uid);
  await updateDoc(userDoc, { chatHistory: arrayUnion(message) });
}

// Function to render conversation cards
async function renderConversationCards(user) {
  const loadingEl = document.getElementById('loading');
  const noConversationsEl = document.getElementById('no-conversations');

  if (loadingEl) loadingEl.style.display = 'block';
  if (noConversationsEl) noConversationsEl.style.display = 'none';

  try {
    const conversationsRef = collection(db, 'conversations');
    const querySnapshot = await getDocs(conversationsRef);

    // Filter by userId and sort by updatedAt client-side
    const userConversations = querySnapshot.docs
      .filter(doc => doc.data().userId === user.uid)
      .sort((a, b) => b.data().updatedAt.toDate() - a.data().updatedAt.toDate());

    if (loadingEl) loadingEl.style.display = 'none';

    if (userConversations.length === 0) {
      if (noConversationsEl) noConversationsEl.style.display = 'block';
      return;
    }

    const conversationContainer = document.createElement('div');
    conversationContainer.className = 'conversation-cards';

    userConversations.forEach((doc) => {
      const conversation = doc.data();
      const card = document.createElement('div');
      card.className = 'conversation-card';
      card.innerHTML = `
        <h3>${conversation.title || 'Untitled Conversation'}</h3>
        <p>Last updated: ${conversation.updatedAt.toDate().toLocaleString()}</p>
        <button class="view-conversation-btn" data-id="${doc.id}">View Conversation</button>
      `;
      conversationContainer.appendChild(card);
    });

    // Replace the chat list with conversation cards
    if (chatListEl) {
      chatListEl.innerHTML = '';
      chatListEl.appendChild(conversationContainer);

      // Add event listeners to view buttons
      document.querySelectorAll('.view-conversation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const conversationId = e.target.dataset.id;
          viewConversation(conversationId);
        });
      });
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    if (loadingEl) loadingEl.style.display = 'none';
    if (noConversationsEl) noConversationsEl.style.display = 'block';
    noConversationsEl.textContent = 'Error loading conversations. Please try again.';
  }
}

// Function to view a specific conversation
async function viewConversation(conversationId) {
  // Redirect to chatbot page with conversation ID to resume
  window.location.href = `../chatbot/chatbot.html?conversationId=${conversationId}`;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../auth/signin.html';
    return;
  }

  // Render conversation cards instead of old chat history
  await renderConversationCards(user);

  // Hide input elements since we're showing conversation cards
  if (inputEl) inputEl.style.display = 'none';
  if (sendBtn) sendBtn.style.display = 'none';
});

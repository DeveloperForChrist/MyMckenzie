import { auth, db } from './firebase-init.js';
import { doc, getDoc, updateDoc, arrayUnion } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';

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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../auth/signin.html';
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const data = userDoc.exists() ? userDoc.data() : null;
  const messages = data && data.chatHistory ? data.chatHistory : [];
  renderMessages(messages);

  if (sendBtn) sendBtn.addEventListener('click', async () => {
    const text = (inputEl && inputEl.value) ? inputEl.value.trim() : '';
    if (!text) return;
    const message = { sender: 'user', text, timestamp: new Date().toISOString() };
    await appendMessage(user.uid, message);
    renderMessages([...messages, message]);
    if (inputEl) inputEl.value = '';

    // Placeholder bot response — echo with delay (replace with real AI/chatbot integration)
    setTimeout(async () => {
      const botMsg = { sender: 'bot', text: 'MyMckenzie: We received your message — here is a sample reply.', timestamp: new Date().toISOString() };
      await appendMessage(user.uid, botMsg);
      renderMessages([...messages, message, botMsg]);
    }, 800);
  });
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

/* ===========================
   Firebase Configuration
=========================== */
const firebaseConfig = {
  apiKey: "AIzaSyDEUlr9-MiJwU87MN7U7ywRGa6TcV6sPWE",
  authDomain: "webbase-f259b.firebaseapp.com",
  projectId: "webbase-f259b",
  storageBucket: "webbase-f259b.firebasestorage.app",
  messagingSenderId: "576433026543",
  appId: "1:576433026543:web:2062fafb7450f38547321a",
  measurementId: "G-NTE61QN6T2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===========================
   DOM Elements
=========================== */
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");
const chatHistoryContainer = document.getElementById("chatHistory");
const planContainer = document.getElementById("planContainer");
const sendBtn = document.getElementById("sendBtn");
const userMessageInput = document.getElementById("userMessage");

/* ===========================
   Add Chat Message to Firestore
=========================== */
async function addChatMessage(userId, message, type = "user") {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    chatHistory: arrayUnion({
      message,
      type,
      timestamp: Date.now()
    })
  });
}

/* ===========================
   Render Chat History
=========================== */
function renderChatHistory(history) {
  chatHistoryContainer.innerHTML = "";
  history
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((msg) => {
      const div = document.createElement("div");
      div.classList.add("chat-message", msg.type === "user" ? "chat-user" : "chat-bot");
      div.innerHTML = `
        ${msg.message} 
        <div class="chat-timestamp">${new Date(msg.timestamp).toLocaleString()}</div>
      `;
      chatHistoryContainer.appendChild(div);
    });
  chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
}

/* ===========================
   Fetch User Data & Display Dashboard
=========================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signin.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    welcomeMessage.textContent = `Welcome, ${user.email}!`;
    return;
  }

  const data = userDocSnap.data();

  // Welcome message
  welcomeMessage.textContent = `Welcome, ${data.firstName} ${data.lastName}!`;

  // Plan Section
  const plan = data.plan || "Free";
  const planExpiry = data.planExpiry
    ? new Date(data.planExpiry).toLocaleDateString()
    : "Never";
  planContainer.innerHTML = `
    <div class="plan-card">
      <h3>Current Plan: ${plan}</h3>
      <p>Expiry Date: ${planExpiry}</p>
      <p>Features: ${plan === "Free" ? "Basic access" : "All premium features"}</p>
      <button id="upgradePlanBtn">Upgrade Plan</button>
    </div>
  `;

  document.getElementById("upgradePlanBtn").addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        plan: "Premium",
        planExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000 // +30 days
      });
      alert("Plan upgraded to Premium!");
      window.location.reload();
    } catch (err) {
      alert("Error upgrading plan: " + err.message);
    }
  });

  // Display chat history
  renderChatHistory(data.chatHistory || []);

  /* ===========================
     Send Message Handler
  =========================== */
  sendBtn.addEventListener("click", async () => {
    const msg = userMessageInput.value.trim();
    if (!msg) return;

    // Add user message
    await addChatMessage(user.uid, msg, "user");

    // Simulate bot response (replace with your chatbot logic)
    const botReply = `Bot reply to: "${msg}"`;
    await addChatMessage(user.uid, botReply, "bot");

    // Fetch updated history
    const updatedSnap = await getDoc(userDocRef);
    renderChatHistory(updatedSnap.data().chatHistory || []);

    // Clear input
    userMessageInput.value = "";
  });
});

/* ===========================
   Logout
=========================== */
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    alert("Logged out successfully!");
    window.location.href = "signin.html";
  } catch (error) {
    alert("Error logging out: " + error.message);
  }
});

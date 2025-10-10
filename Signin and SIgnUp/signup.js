import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ===========================
   Sign Up Logic
=========================== */
const signupBtn = document.getElementById("signupBtn");

signupBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!firstName || !lastName || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    // 1️⃣ Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2️⃣ Create Firestore document for user
    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      email,
      plan: "Free",
      planExpiry: null,
      chatHistory: []
    });

    alert("Account created successfully!");
    window.location.href = "signin.html"; // redirect to sign-in page
  } catch (error) {
    alert("Error: " + error.message);
  }
});

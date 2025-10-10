import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

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
   Sign In Logic
=========================== */
const signinBtn = document.getElementById("signinBtn");

signinBtn.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    // 1️⃣ Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2️⃣ Optionally fetch user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("User data:", userData);
      // You could store this in localStorage or session for dashboard
      localStorage.setItem("userData", JSON.stringify(userData));
    }

    // 3️⃣ Redirect to dashboard
    window.location.href = "dashboard.html";
  } catch (error) {
    alert("Error signing in: " + error.message);
  }
});

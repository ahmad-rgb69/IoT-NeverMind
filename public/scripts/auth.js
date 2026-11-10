import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { auth, setupUI } from "./index.js";

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout");

// Pantau status autentikasi user
onAuthStateChanged(auth, (user) => {
  setupUI(user);
});

// Proses Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  loginError.textContent = "";

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      loginForm.reset();
    })
    .catch((error) => {
      loginError.textContent = "Login gagal: " + error.message;
    });
});

// Proses Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth);
});
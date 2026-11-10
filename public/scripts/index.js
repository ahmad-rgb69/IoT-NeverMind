import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

// Konfigurasi Firebase proyek IoT-NeverMind kamu
const firebaseConfig = {
  apiKey: "AIzaSyCeWPdjD7KAzCodkua2kGdNb3F7VF5JNn0",
  authDomain: "iot-nevermind.firebaseapp.com",
  databaseURL:
    "https://iot-nevermind-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "iot-nevermind",
  storageBucket: "iot-nevermind.firebasestorage.app",
  messagingSenderId: "871219240095",
  appId: "1:871219240095:web:ae73659f70c067e5b596aa",
  measurementId: "G-95PFXKZZ2X",
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Elemen DOM sesuai public/index.html
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard");
const userEmailSpan = document.getElementById("user-email");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout");

// Path Database untuk GPIO 12, 13, 14
const gpioPins = ["12", "13", "14"];
const dbRefs = {
  12: ref(database, "board1/outputs/digital/12"),
  13: ref(database, "board1/outputs/digital/13"),
  14: ref(database, "board1/outputs/digital/14"),
};

// Event klik tombol ON / OFF
document.querySelectorAll("input[data-gpio]").forEach((toggle) => {
  toggle.addEventListener("change", async () => {
    const pin = toggle.getAttribute("data-gpio");
    const val = toggle.checked ? 1 : 0;

    try {
      await set(dbRefs[pin], val);
    } catch (err) {
      console.error("Gagal mengubah GPIO:", err);
      alert("Gagal mengubah GPIO. Periksa koneksi Firebase.");

      toggle.checked = !toggle.checked;
    }
  });
});

// Atur tampilan saat status login berubah
const setupUI = (user) => {
  if (user) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    userEmailSpan.textContent = user.email;

    gpioPins.forEach((pin) => {
      const stateSpan = document.getElementById(`state-${pin}`);
      const toggle = document.querySelector(`input[data-gpio="${pin}"]`);

      onValue(dbRefs[pin], (snap) => {
        const isOn = snap.val() === 1;

        stateSpan.textContent = isOn ? "ON" : "OFF";

        stateSpan.classList.toggle("text-emerald-400", isOn);
        stateSpan.classList.toggle("text-slate-400", !isOn);

        toggle.checked = isOn;
      });
    });
  } else {
    loginView.hidden = false;
    dashboardView.hidden = true;
    userEmailSpan.textContent = "";
  }
};

onAuthStateChanged(auth, (user) => setupUI(user));

// Proses Login & Logout
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  loginError.textContent = "";

  signInWithEmailAndPassword(auth, email, password)
    .then(() => loginForm.reset())
    .catch((err) => {
      loginError.textContent = "Login gagal: " + err.message;
    });
});

logoutBtn.addEventListener("click", () => signOut(auth));

export { auth, setupUI };

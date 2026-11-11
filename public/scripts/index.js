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
const topUserEmailSpan = document.getElementById("top-user-email");
const topUserBanner = document.getElementById("top-user-banner");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout");
const dropdownLogoutBtn = document.getElementById("dropdown-logout");

// Elemen DOM untuk Sensor DHT22
const suhuVal = document.getElementById("suhu-val");
const kelembapanVal = document.getElementById("kelembapan-val");
const modernSuhuVal = document.getElementById("modern-suhu-val");
const modernKelembapanVal = document.getElementById("modern-kelembapan-val");

// Active Board State ("board1" atau "board2")
let currentBoard = "board1";
const gpioPins = ["12", "13", "14", "25"];

// Cache status GPIO untuk masing-masing board
const boardStates = {
  board1: { 12: 0, 13: 0, 14: 0, 25: 0 },
  board2: { 12: 0, 13: 0, 14: 0, 25: 0 },
};

// Fungsi pembantu sinkronisasi UI pin
function updatePinUI(pin, isOn) {
  // Update status checkbox (Modern & Classic)
  document.querySelectorAll(`input[data-gpio="${pin}"]`).forEach((toggle) => {
    toggle.checked = isOn;
  });

  // Update badge teks ON / OFF
  document.querySelectorAll(`.state-${pin}`).forEach((el) => {
    el.textContent = isOn ? "ON" : "OFF";
    if (document.body.getAttribute("data-theme") === "classic") {
      el.className = `state-${pin} font-bold ${isOn ? "text-emerald-400" : "text-slate-400"}`;
    } else {
      if (isOn) {
        el.className = `state-${pin} text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400`;
      } else {
        el.className = `state-${pin} text-xs font-semibold px-2 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-400`;
      }
    }
  });

  // Update indikator dot GPIO Modern
  document.querySelectorAll(`.dot-gpio-${pin}`).forEach((dot) => {
    if (isOn) {
      dot.className = `gpio-dot dot-gpio-${pin} w-2.5 h-2.5 rounded-full bg-emerald-500 transition-colors`;
    } else {
      dot.className = `gpio-dot dot-gpio-${pin} w-2.5 h-2.5 rounded-full bg-zinc-600 transition-colors`;
    }
  });
}

// Callback saat tab board diganti oleh user
window.onBoardTabSwitched = function (boardId) {
  currentBoard = boardId;
  gpioPins.forEach((pin) => {
    const isOn = boardStates[currentBoard][pin] === 1;
    updatePinUI(pin, isOn);
  });
};

// Path Database untuk Sensor
const tempRef = ref(database, "board1/sensor/temperature");
const humRef = ref(database, "board1/sensor/humidity");

// Event klik tombol ON / OFF (menulis ke board aktif)
document.querySelectorAll("input[data-gpio]").forEach((toggle) => {
  toggle.addEventListener("change", async () => {
    const pin = toggle.getAttribute("data-gpio");
    const val = toggle.checked ? 1 : 0;
    boardStates[currentBoard][pin] = val;
    updatePinUI(pin, val === 1);

    try {
      const pinRef = ref(database, `${currentBoard}/outputs/digital/${pin}`);
      await set(pinRef, val);
    } catch (err) {
      console.error(`Gagal mengubah GPIO ${pin} di ${currentBoard}:`, err);
      alert("Gagal mengubah GPIO. Periksa koneksi Firebase.");
      boardStates[currentBoard][pin] = val === 1 ? 0 : 1;
      updatePinUI(pin, val === 0);
    }
  });
});

// Atur tampilan saat status login berubah
const setupUI = (user) => {
  if (user) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    if (topUserEmailSpan) topUserEmailSpan.textContent = user.email;
    if (topUserBanner) topUserBanner.hidden = false;
    if (dropdownLogoutBtn) dropdownLogoutBtn.hidden = false;

    // Filter tampilan GPIO berdasarkan Role Akun (Tugas 5)
    const email = user.email ? user.email.toLowerCase() : "";
    const allowedPins = {
      "user1@uniska.ac.id": ["12", "13", "14"],
      "user2@uniska.ac.id": ["25"],
      "admin@uniska.ac.id": ["12", "13", "14", "25"],
      "gumishiro2@gmail.com": ["12", "13", "14", "25"],
    };

    const currentAllowed = allowedPins[email] || ["12", "13", "14", "25"];

    ["12", "13", "14", "25"].forEach((pin) => {
      const show = currentAllowed.includes(pin);
      document.querySelectorAll(`input[data-gpio="${pin}"]`).forEach((input) => {
        const row = input.closest(".flex.items-center.justify-between, .classic-card");
        if (row) {
          row.style.display = show ? "" : "none";
        }
      });
    });

    // Mendengarkan perubahan status GPIO secara realtime untuk kedua board
    ["board1", "board2"].forEach((bId) => {
      gpioPins.forEach((pin) => {
        const pinRef = ref(database, `${bId}/outputs/digital/${pin}`);
        onValue(pinRef, (snap) => {
          const val = snap.val();
          if (val !== null) {
            boardStates[bId][pin] = val;
            if (currentBoard === bId) {
              updatePinUI(pin, val === 1);
            }
          }
        });
      });
    });

    // Mendengarkan perubahan data Sensor secara realtime
    let currentTemp = null;
    let currentHum = null;

    onValue(tempRef, (snap) => {
      const suhu = snap.val();
      if (suhu !== null) {
        currentTemp = Number(suhu);
        const formatted = currentTemp.toFixed(1);
        if (suhuVal) suhuVal.innerText = formatted;
        if (modernSuhuVal) modernSuhuVal.innerText = formatted;
        if (typeof window.updateSensorTelemetry === "function") {
          window.updateSensorTelemetry(currentTemp, currentHum);
        }
      }
    });

    onValue(humRef, (snap) => {
      const kelembapan = snap.val();
      if (kelembapan !== null) {
        currentHum = Number(kelembapan);
        const formatted = currentHum.toFixed(1);
        if (kelembapanVal) kelembapanVal.innerText = formatted;
        if (modernKelembapanVal) modernKelembapanVal.innerText = formatted;
        if (typeof window.updateSensorTelemetry === "function") {
          window.updateSensorTelemetry(currentTemp, currentHum);
        }
      }
    });
  } else {
    loginView.hidden = false;
    dashboardView.hidden = true;
    if (userEmailSpan) userEmailSpan.textContent = "";
    if (topUserEmailSpan) topUserEmailSpan.textContent = "";
    if (topUserBanner) topUserBanner.hidden = true;
    if (dropdownLogoutBtn) dropdownLogoutBtn.hidden = true;
  }
};

onAuthStateChanged(auth, (user) => setupUI(user));

// Proses Login & Logout
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    if (loginError) loginError.textContent = "";

    signInWithEmailAndPassword(auth, email, password)
      .then(() => loginForm.reset())
      .catch((err) => {
        if (loginError) loginError.textContent = "Login gagal: " + err.message;
      });
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => signOut(auth));
}

if (dropdownLogoutBtn) {
  dropdownLogoutBtn.addEventListener("click", () => signOut(auth));
}

export { auth, setupUI };

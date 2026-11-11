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

// Path Database untuk GPIO 12, 13, 14, dan 25
const gpioPins = ["12", "13", "14", "25"];
const dbRefs = {
  12: ref(database, "board1/outputs/digital/12"),
  13: ref(database, "board1/outputs/digital/13"),
  14: ref(database, "board1/outputs/digital/14"),
  25: ref(database, "board1/outputs/digital/25"),
};

// Path Database untuk Sensor
const tempRef = ref(database, "board1/sensor/temperature");
const humRef = ref(database, "board1/sensor/humidity");

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
    if (userEmailSpan) userEmailSpan.textContent = user.email;
    if (topUserEmailSpan) topUserEmailSpan.textContent = user.email;
    if (topUserBanner) topUserBanner.hidden = false;
    if (dropdownLogoutBtn) dropdownLogoutBtn.hidden = false;

    // Mendengarkan perubahan status GPIO secara realtime
    gpioPins.forEach((pin) => {
      onValue(dbRefs[pin], (snap) => {
        const isOn = snap.val() === 1;

        // Sinkronisasi status checkbox (Modern & Classic)
        document.querySelectorAll(`input[data-gpio="${pin}"]`).forEach((toggle) => {
          toggle.checked = isOn;
        });

        // Sinkronisasi badge teks ON / OFF
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

        // Sinkronisasi indikator dot GPIO Modern
        document.querySelectorAll(`.dot-gpio-${pin}`).forEach((dot) => {
          if (isOn) {
            dot.className = `gpio-dot dot-gpio-${pin} w-2.5 h-2.5 rounded-full bg-emerald-500 transition-colors`;
          } else {
            dot.className = `gpio-dot dot-gpio-${pin} w-2.5 h-2.5 rounded-full bg-zinc-600 transition-colors`;
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

// ============================================================
//  MBG TRACKER – app.js  (Versi Guru)
//  Ganti scriptURL & SPREADSHEET_URL sesuai milik kamu
// ============================================================

const scriptURL = "https://script.google.com/macros/s/AKfycbzvcQ3I1nF2EZugVG4-Z61Kfk4u9KWIPDsPX2FybBhs-QVAPyiPZ9XpIvHR9PpA9qDE/exec";

// URL Google Spreadsheet yang akan dibuka saat tombol diklik
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc/edit?usp=sharing";

// ── Whitelist email guru yang diizinkan ──────────────────────
// Tambah atau hapus email sesuai kebutuhan
const EMAIL_WHITELIST = [
  "jarvispraba@gmail.com",
  "guru2@sekolah.sch.id",
  "admin@sekolah.sch.id",
  // tambahkan email guru lain di sini
];

// ── State sesi ───────────────────────────────────────────────
let guruLogin = null;   // email guru yang sedang login
let logSesi   = [];     // array riwayat sesi { kelas, status, jam }

// ============================================================
//  INISIALISASI
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Cek apakah ada sesi tersimpan
  const savedEmail = sessionStorage.getItem("mbg_guru");
  if (savedEmail) {
    masukDashboard(savedEmail);
  } else {
    tampilHalaman("pageLogin");
  }

  tampilkanTanggal();
  muatGambar();
  muatLog();

  // Tampilkan info piring saat kelas dipilih
  document.getElementById("kelas").addEventListener("change", () => {
    document.getElementById("piringInfo").style.display = "block";
  });

  // Login dengan Enter
  document.getElementById("inputEmail").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
});

// ============================================================
//  NAVIGASI HALAMAN
// ============================================================
function tampilHalaman(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ============================================================
//  LOGIN
// ============================================================
function doLogin() {
  const email = document.getElementById("inputEmail").value.trim().toLowerCase();
  const msg   = document.getElementById("loginMsg");

  if (!email) {
    setLoginMsg("⚠️ Masukkan email terlebih dahulu.", false);
    return;
  }

  if (!isValidEmail(email)) {
    setLoginMsg("⚠️ Format email tidak valid.", false);
    return;
  }

  const diizinkan = EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(email);

  if (!diizinkan) {
    setLoginMsg("🔒 Menunggu persetujuan admin. Hubungi admin sekolah.", false);
    return;
  }

  // Login berhasil
  sessionStorage.setItem("mbg_guru", email);
  masukDashboard(email);
}

function masukDashboard(email) {
  guruLogin = email;
  document.getElementById("labelGuru").textContent = "👤 " + email;
  tampilHalaman("pageDashboard");
  tampilkanTanggal();
}

function doLogout() {
  sessionStorage.removeItem("mbg_guru");
  guruLogin = null;
  document.getElementById("inputEmail").value = "";
  document.getElementById("loginMsg").textContent = "";
  tampilHalaman("pageLogin");
}

function setLoginMsg(teks, sukses) {
  const el = document.getElementById("loginMsg");
  el.textContent = teks;
  el.className = "login-msg" + (sukses ? " sukses" : "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
//  TANGGAL
// ============================================================
function tampilkanTanggal() {
  const el = document.getElementById("tanggal");
  if (!el) return;
  const now  = new Date();
  const opsi = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  el.textContent = now.toLocaleDateString("id-ID", opsi);
}

// ============================================================
//  GAMBAR (localStorage)
// ============================================================
function uploadGambar(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Batasi ukuran file: maks 2 MB
  if (file.size > 2 * 1024 * 1024) {
    tampilkanToast("⚠️ Ukuran gambar maks 2 MB", "gagal");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    localStorage.setItem("mbg_gambar", dataUrl);
    tampilGambar(dataUrl);
    tampilkanToast("Gambar berhasil diupload ✅", "sukses");
  };
  reader.readAsDataURL(file);

  // Reset input agar bisa upload ulang file yang sama
  event.target.value = "";
}

function muatGambar() {
  const saved = localStorage.getItem("mbg_gambar");
  if (saved) tampilGambar(saved);
}

function tampilGambar(src) {
  document.getElementById("imgPreview").src = src;
  document.getElementById("imgPreviewWrap").classList.remove("hidden");
  document.getElementById("imgPlaceholder").classList.add("hidden");
}

function hapusGambar() {
  localStorage.removeItem("mbg_gambar");
  document.getElementById("imgPreview").src = "";
  document.getElementById("imgPreviewWrap").classList.add("hidden");
  document.getElementById("imgPlaceholder").classList.remove("hidden");
  tampilkanToast("Gambar dihapus", "");
}

// ============================================================
//  KIRIM DATA KE GOOGLE APPS SCRIPT
// ============================================================
async function kirim(status) {
  const kelas = document.getElementById("kelas").value;

  if (!kelas) {
    tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal");
    const sel = document.getElementById("kelas");
    sel.style.borderColor = "#FF0000";
    setTimeout(() => (sel.style.borderColor = "#BBD5DA"), 1500);
    return;
  }

  setTombol(true);

  const payload = { kelas, status, guru: guruLogin };

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      tampilkanToast(`Data berhasil dikirim ✅`, "sukses");
      tambahLog(kelas, status);
    } else {
      throw new Error("Response tidak OK");
    }
  } catch (err) {
    console.error(err);
    tampilkanToast("Gagal mengirim data ❌", "gagal");
  } finally {
    setTombol(false);
  }
}

function setTombol(disabled) {
  document.getElementById("btnAmbil").disabled   = disabled;
  document.getElementById("btnKembali").disabled = disabled;
}

// ============================================================
//  LOG SESI
// ============================================================
function tambahLog(kelas, status) {
  const jam = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  logSesi.unshift({ kelas, status, jam });
  simpanLog();
  renderLog();
}

function renderLog() {
  const list = document.getElementById("logList");

  if (logSesi.length === 0) {
    list.innerHTML = `<li class="kosong">Belum ada aktivitas.</li>`;
    return;
  }

  list.innerHTML = logSesi.map(item => {
    const isAmbil = item.status === "Mengambil";
    return `<li>
      <span>${item.kelas} <span style="color:#888;font-weight:400">· ${item.jam}</span></span>
      <span class="log-status ${isAmbil ? "status-ambil" : "status-kembali"}">${item.status}</span>
    </li>`;
  }).join("");
}

function simpanLog() {
  localStorage.setItem("mbg_log", JSON.stringify(logSesi));
}

function muatLog() {
  const saved = localStorage.getItem("mbg_log");
  if (saved) {
    try { logSesi = JSON.parse(saved); } catch { logSesi = []; }
  }
  renderLog();
}

// ============================================================
//  HAPUS SEMUA DATA (dengan konfirmasi)
// ============================================================
function konfirmasiHapusSemua() {
  document.getElementById("modalHapus").classList.remove("hidden");
}

function tutupModal() {
  document.getElementById("modalHapus").classList.add("hidden");
}

function hapusSemua() {
  logSesi = [];
  simpanLog();
  renderLog();
  tutupModal();
  tampilkanToast("Semua data dihapus", "");
}

// ============================================================
//  HAPUS PER KELAS
// ============================================================
function showHapusKelas() {
  // Kumpulkan kelas unik dari log
  const kelasAda = [...new Set(logSesi.map(i => i.kelas))];

  if (kelasAda.length === 0) {
    tampilkanToast("⚠️ Belum ada data untuk dihapus", "gagal");
    return;
  }

  const sel = document.getElementById("selectHapusKelas");
  sel.innerHTML = `<option value="" disabled selected>-- Pilih Kelas --</option>`;
  kelasAda.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });

  document.getElementById("modalHapusKelas").classList.remove("hidden");
}

function tutupModalKelas() {
  document.getElementById("modalHapusKelas").classList.add("hidden");
}

function hapusPerKelas() {
  const kelas = document.getElementById("selectHapusKelas").value;
  if (!kelas) {
    tampilkanToast("⚠️ Pilih kelas terlebih dahulu", "gagal");
    return;
  }

  logSesi = logSesi.filter(i => i.kelas !== kelas);
  simpanLog();
  renderLog();
  tutupModalKelas();
  tampilkanToast(`Data ${kelas} dihapus ✅`, "sukses");
}

// ============================================================
//  BUKA SPREADSHEET
// ============================================================
function bukaSpreadsheet() {
  window.open(SPREADSHEET_URL, "_blank");
}

// ============================================================
//  TOAST
// ============================================================
let toastTimer;
function tampilkanToast(pesan, tipe = "") {
  const toast = document.getElementById("toast");
  toast.textContent = pesan;
  toast.className = `toast ${tipe} show`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

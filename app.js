// ============================================================
//  MBG TRACKER – app.js
//  Ganti nilai scriptURL dengan URL Google Apps Script kamu
// ============================================================

const scriptURL = "https://script.google.com/macros/s/AKfycbz0WOs09DN-nXso_ll6Yi8Yu4V2a47flUcyrA3FYfAhuXSsa_uBtg4yJTjU73-N9Ko2/exec";

// ── Menu harian (ubah sesuai kebutuhan) ──────────────────────
const menuHarian = [
  { icon: "🍚", nama: "Nasi Putih" },
  { icon: "🍗", nama: "Ayam Goreng" },
  { icon: "🥦", nama: "Sayur Bening" },
  { icon: "🍎", nama: "Buah Apel" },
  { icon: "🥛", nama: "Susu Kotak" },
  { icon: "🍮", nama: "Puding Coklat" },
];

// ── Inisialisasi saat halaman dimuat ─────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  tampilkanTanggal();
  tampilkanMenu();
});

// ── Tampilkan tanggal & jam di header ────────────────────────
function tampilkanTanggal() {
  const el = document.getElementById("tanggal");
  const now = new Date();
  const opsi = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  el.textContent = now.toLocaleDateString("id-ID", opsi);
}

// ── Render menu harian ───────────────────────────────────────
function tampilkanMenu() {
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = menuHarian
    .map(
      (m) => `<div class="menu-item">
                <span class="mi-icon">${m.icon}</span>
                <span>${m.nama}</span>
              </div>`
    )
    .join("");
}

// ── Kirim data ke Google Apps Script ─────────────────────────
async function kirim(status) {
  const kelas = document.getElementById("kelas").value;

  // Validasi kelas
  if (!kelas) {
    tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal");
    // Animasi shake pada select
    const sel = document.getElementById("kelas");
    sel.style.borderColor = "#FF0000";
    setTimeout(() => (sel.style.borderColor = "#BBD5DA"), 1500);
    return;
  }

  // Nonaktifkan tombol saat loading
  setTombol(true);

  const payload = { kelas, status };

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Apps Script butuh text/plain agar tidak trigger CORS preflight
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

// ── Nonaktifkan / aktifkan tombol ────────────────────────────
function setTombol(disabled) {
  document.getElementById("btnAmbil").disabled    = disabled;
  document.getElementById("btnKembali").disabled  = disabled;
}

// ── Tambah entri ke log sesi ─────────────────────────────────
function tambahLog(kelas, status) {
  const list = document.getElementById("logList");

  // Hapus placeholder "kosong" jika ada
  const kosong = list.querySelector(".kosong");
  if (kosong) kosong.remove();

  const jam = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const isAmbil = status === "Mengambil";

  const li = document.createElement("li");
  li.innerHTML = `
    <span>${kelas} <span style="color:#888;font-weight:400">· ${jam}</span></span>
    <span class="log-status ${isAmbil ? "status-ambil" : "status-kembali"}">${status}</span>
  `;
  list.prepend(li); // terbaru di atas
}

// ── Hapus log sesi ───────────────────────────────────────────
function hapusLog() {
  const list = document.getElementById("logList");
  list.innerHTML = `<li class="kosong">Belum ada aktivitas.</li>`;
}

// ── Toast notification ───────────────────────────────────────
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

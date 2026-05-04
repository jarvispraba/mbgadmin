// ============================================================
//  MBG TRACKER – app.js  (Versi Guru v4)
// ============================================================

const scriptURL = "https://script.google.com/macros/s/AKfycbxWyLth-9PXQloKxtAKjqb-cZoR0NIzj2PcjaQCxjCE6LugRcPveZHm6YCe99lwSttI/exec";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc/edit?usp=sharing";

// ── Whitelist email guru ─────────────────────────────────────
const EMAIL_WHITELIST = [
  "jarvispraba@gmail.com",
  "guru2@sekolah.sch.id",
  "admin@sekolah.sch.id",
];

// ── State ────────────────────────────────────────────────────
let guruLogin = null;
let logSesi   = [];   // [{ kelas, tanggal, namaPengambil, omprengDiambil, namaPengembali, omprengDikembalikan, alergi, approved, status, jam }]

// ============================================================
//  INISIALISASI
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const savedEmail = sessionStorage.getItem("mbg_guru");
  if (savedEmail) {
    masukDashboard(savedEmail);
  } else {
    tampilHalaman("pageLogin");
  }

  tampilkanTanggal();
  muatLog();

  document.getElementById("inputEmail").addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });

  // Cek selisih ompreng secara real-time
  document.getElementById("omprengDikembalikan").addEventListener("input", cekSelisih);
  document.getElementById("omprengDiambil").addEventListener("input", cekSelisih);
});

// ============================================================
//  NAVIGASI
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

  if (!email) { setLoginMsg("⚠️ Masukkan email terlebih dahulu.", false); return; }
  if (!isValidEmail(email)) { setLoginMsg("⚠️ Format email tidak valid.", false); return; }

  const diizinkan = EMAIL_WHITELIST.map(e => e.toLowerCase()).includes(email);
  if (!diizinkan) {
    setLoginMsg("🔒 Menunggu persetujuan admin. Hubungi admin sekolah.", false);
    return;
  }

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
  tutupModalLogout();
  tampilHalaman("pageLogin");
}

function konfirmasiLogout() {
  document.getElementById("modalLogout").classList.remove("hidden");
}

function tutupModalLogout() {
  document.getElementById("modalLogout").classList.add("hidden");
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

function getTanggalHari() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

// ============================================================
//  CEK SELISIH OMPRENG (real-time)
// ============================================================
function cekSelisih() {
  const diambil      = parseInt(document.getElementById("omprengDiambil").value) || 0;
  const dikembalikan = parseInt(document.getElementById("omprengDikembalikan").value) || 0;
  const wrap         = document.getElementById("peringatanSelisih");
  const pesan        = document.getElementById("pesanSelisih");

  if (dikembalikan > 0 && diambil > 0 && dikembalikan < diambil) {
    const selisih = diambil - dikembalikan;
    pesan.textContent = `Jumlah ompreng yang dikembalikan kurang ${selisih} (diambil: ${diambil}, dikembalikan: ${dikembalikan})`;
    wrap.classList.remove("hidden");
  } else {
    wrap.classList.add("hidden");
  }
}

// ============================================================
//  KELAS CHANGE
// ============================================================
function onKelasChange() {
  // Kosongkan field saat ganti kelas
  ["namaPengambil","omprengDiambil","namaPengembali","omprengDikembalikan","jumlahAlergi","namaApproved"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("peringatanSelisih").classList.add("hidden");
}

// ============================================================
//  VALIDASI FORM
// ============================================================
function validasiAmbil() {
  const kelas = document.getElementById("kelas").value;
  const nama  = document.getElementById("namaPengambil").value.trim();
  const jml   = document.getElementById("omprengDiambil").value;

  if (!kelas) {
    sorotError("kelas"); tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal"); return false;
  }
  if (!nama) {
    sorotError("namaPengambil"); tampilkanToast("⚠️ Isi nama pengambil!", "gagal"); return false;
  }
  if (!jml || parseInt(jml) < 0) {
    sorotError("omprengDiambil"); tampilkanToast("⚠️ Isi jumlah ompreng diambil!", "gagal"); return false;
  }
  return true;
}

function validasiKembali() {
  const kelas = document.getElementById("kelas").value;
  const nama  = document.getElementById("namaPengembali").value.trim();
  const jml   = document.getElementById("omprengDikembalikan").value;

  if (!kelas) {
    sorotError("kelas"); tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal"); return false;
  }
  if (!nama) {
    sorotError("namaPengembali"); tampilkanToast("⚠️ Isi nama pengembali!", "gagal"); return false;
  }
  if (!jml || parseInt(jml) < 0) {
    sorotError("omprengDikembalikan"); tampilkanToast("⚠️ Isi jumlah ompreng dikembalikan!", "gagal"); return false;
  }
  return true;
}

function sorotError(id) {
  const el = document.getElementById(id);
  el.classList.add("error");
  setTimeout(() => el.classList.remove("error"), 2000);
}

// ============================================================
//  KIRIM DATA
// ============================================================
async function kirim(aksi) {
  if (aksi === "Mengambil"    && !validasiAmbil())   return;
  if (aksi === "Mengembalikan" && !validasiKembali()) return;

  const kelas             = document.getElementById("kelas").value;
  const namaPengambil     = document.getElementById("namaPengambil").value.trim();
  const omprengDiambil    = parseInt(document.getElementById("omprengDiambil").value) || 0;
  const namaPengembali    = document.getElementById("namaPengembali").value.trim();
  const omprengDikembalikan = parseInt(document.getElementById("omprengDikembalikan").value) || 0;
  const jumlahAlergi      = parseInt(document.getElementById("jumlahAlergi").value) || 0;
  const tanggal           = getTanggalHari();

  // Peringatan selisih saat submit mengembalikan
  if (aksi === "Mengembalikan" && omprengDiambil > 0 && omprengDikembalikan < omprengDiambil) {
    const selisih = omprengDiambil - omprengDikembalikan;
    tampilkanToast(`⚠️ Ompreng kurang ${selisih}! Data tetap dikirim.`, "warn");
  }

  setTombol(true);

  const payload = {
    action: aksi === "Mengambil" ? "add" : "update",
    kelas,
    tanggal,
    namaPengambil,
    omprengDiambil,
    namaPengembali,
    omprengDikembalikan,
    jumlahAlergi,
    guru: guruLogin,
    status: aksi,
  };

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      tampilkanToast(`Data ${aksi} berhasil dikirim ✅`, "sukses");
      updateLog(kelas, tanggal, aksi, {
        namaPengambil, omprengDiambil,
        namaPengembali, omprengDikembalikan,
        jumlahAlergi
      });
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

// ============================================================
//  KIRIM APPROVED
// ============================================================
async function kirimApproved() {
  const kelas    = document.getElementById("kelas").value;
  const approved = document.getElementById("namaApproved").value.trim();
  const tanggal  = getTanggalHari();

  if (!kelas)    { sorotError("kelas");        tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal"); return; }
  if (!approved) { sorotError("namaApproved"); tampilkanToast("⚠️ Isi nama guru yang menyetujui!", "gagal"); return; }

  setTombol(true);

  const payload = {
    action: "approved",
    kelas,
    tanggal,
    approved,
    guru: guruLogin,
  };

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      tampilkanToast(`Approved oleh ${approved} ✅`, "sukses");
      updateLogApproved(kelas, tanggal, approved);
    } else {
      throw new Error("Response tidak OK");
    }
  } catch (err) {
    console.error(err);
    tampilkanToast("Gagal mengirim approved ❌", "gagal");
  } finally {
    setTombol(false);
  }
}

function setTombol(disabled) {
  document.getElementById("btnAmbil").disabled   = disabled;
  document.getElementById("btnKembali").disabled = disabled;
}

// ============================================================
//  LOG SESI (1 kelas + 1 tanggal = 1 entri)
// ============================================================
function updateLog(kelas, tanggal, aksi, data) {
  const jam = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const idx = logSesi.findIndex(i => i.kelas === kelas && i.tanggal === tanggal);

  if (idx >= 0) {
    // Update entri yang sudah ada
    if (aksi === "Mengambil") {
      logSesi[idx].namaPengambil  = data.namaPengambil;
      logSesi[idx].omprengDiambil = data.omprengDiambil;
      logSesi[idx].jamAmbil       = jam;
    } else {
      logSesi[idx].namaPengembali       = data.namaPengembali;
      logSesi[idx].omprengDikembalikan  = data.omprengDikembalikan;
      logSesi[idx].jumlahAlergi         = data.jumlahAlergi;
      logSesi[idx].jamKembali           = jam;
    }
    // Hitung status
    logSesi[idx].status = hitungStatus(logSesi[idx]);
  } else {
    // Buat entri baru
    const entri = {
      kelas, tanggal,
      namaPengambil:       aksi === "Mengambil" ? data.namaPengambil : "",
      omprengDiambil:      aksi === "Mengambil" ? data.omprengDiambil : 0,
      namaPengembali:      aksi === "Mengembalikan" ? data.namaPengembali : "",
      omprengDikembalikan: aksi === "Mengembalikan" ? data.omprengDikembalikan : 0,
      jumlahAlergi:        data.jumlahAlergi || 0,
      approved:            "",
      jamAmbil:            aksi === "Mengambil" ? jam : "",
      jamKembali:          aksi === "Mengembalikan" ? jam : "",
    };
    entri.status = hitungStatus(entri);
    logSesi.unshift(entri);
  }

  simpanLog();
  renderLog();
}

function updateLogApproved(kelas, tanggal, approved) {
  const idx = logSesi.findIndex(i => i.kelas === kelas && i.tanggal === tanggal);
  if (idx >= 0) {
    logSesi[idx].approved = approved;
  } else {
    logSesi.unshift({ kelas, tanggal, approved, status: "—", namaPengambil: "", namaPengembali: "" });
  }
  simpanLog();
  renderLog();
}

function hitungStatus(entri) {
  const adaAmbil   = entri.namaPengambil && entri.omprengDiambil > 0;
  const adaKembali = entri.namaPengembali && entri.omprengDikembalikan >= 0 && entri.jamKembali;
  if (adaAmbil && adaKembali) return "Selesai";
  if (adaAmbil) return "Sudah Mengambil";
  if (adaKembali) return "Sudah Mengembalikan";
  return "—";
}

function renderLog() {
  const wrap = document.getElementById("logList");

  if (logSesi.length === 0) {
    wrap.innerHTML = `<p class="kosong">Belum ada aktivitas.</p>`;
    return;
  }

  wrap.innerHTML = logSesi.map(item => {
    const selisih = item.omprengDiambil > 0 && item.omprengDikembalikan >= 0 && item.jamKembali
      ? item.omprengDiambil - item.omprengDikembalikan
      : null;

    const statusClass = item.status === "Selesai" ? "badge-selesai"
      : item.status === "Sudah Mengambil" ? "badge-ambil"
      : item.status === "Sudah Mengembalikan" ? "badge-kembali"
      : "badge-info";

    return `<div class="log-item">
      <div class="log-item-header">
        <span class="log-kelas">${item.kelas}</span>
        <span class="log-jam">${item.tanggal}</span>
      </div>
      <div class="log-detail">
        <span class="log-badge ${statusClass}">${item.status}</span>
        ${item.namaPengambil ? `<span class="log-badge badge-info">📤 ${item.namaPengambil} (${item.omprengDiambil})</span>` : ""}
        ${item.namaPengembali ? `<span class="log-badge badge-kembali">📥 ${item.namaPengembali} (${item.omprengDikembalikan})</span>` : ""}
        ${item.jumlahAlergi > 0 ? `<span class="log-badge badge-info">🤧 Alergi: ${item.jumlahAlergi}</span>` : ""}
        ${selisih !== null && selisih > 0 ? `<span class="log-badge badge-selisih">⚠️ Kurang ${selisih}</span>` : ""}
        ${item.approved ? `<span class="log-badge badge-approved">✔️ ${item.approved}</span>` : ""}
      </div>
    </div>`;
  }).join("");
}

function simpanLog() {
  localStorage.setItem("mbg_log_v4", JSON.stringify(logSesi));
}

function muatLog() {
  const saved = localStorage.getItem("mbg_log_v4");
  if (saved) {
    try { logSesi = JSON.parse(saved); } catch { logSesi = []; }
  }
  renderLog();
}

// ============================================================
//  HAPUS SEMUA
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
  const kelasAda = [...new Set(logSesi.map(i => i.kelas))];
  if (kelasAda.length === 0) {
    tampilkanToast("⚠️ Belum ada data untuk dihapus", "gagal");
    return;
  }

  const sel = document.getElementById("selectHapusKelas");
  sel.innerHTML = `<option value="" disabled selected>-- Pilih Kelas --</option>`;
  kelasAda.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k; opt.textContent = k;
    sel.appendChild(opt);
  });

  document.getElementById("modalHapusKelas").classList.remove("hidden");
}

function tutupModalKelas() {
  document.getElementById("modalHapusKelas").classList.add("hidden");
}

async function hapusPerKelas() {
  const kelas = document.getElementById("selectHapusKelas").value;
  if (!kelas) { tampilkanToast("⚠️ Pilih kelas terlebih dahulu", "gagal"); return; }

  logSesi = logSesi.filter(i => i.kelas !== kelas);
  simpanLog();
  renderLog();
  tutupModalKelas();
  tampilkanToast(`Menghapus data ${kelas}...`, "");

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action: "delete", kelas, guru: guruLogin }),
    });
    if (res.ok) {
      tampilkanToast(`Data ${kelas} dihapus dari spreadsheet ✅`, "sukses");
    } else {
      throw new Error();
    }
  } catch {
    tampilkanToast(`Data lokal dihapus, gagal sinkron spreadsheet ⚠️`, "gagal");
  }
}

// ============================================================
//  SPREADSHEET
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
  toastTimer = setTimeout(() => { toast.className = "toast"; }, 3500);
}

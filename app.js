// ============================================================
//  MBG TRACKER – app.js  (Versi Guru v5)
// ============================================================

const scriptURL = "https://script.google.com/macros/s/AKfycbzvBrfgjbsVTSebOKUsjFx8CZzHuo40ouTH5a5BfjWEixT3ZZRwTQ3gM859NSQOS-37/exec";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc/edit?usp=sharing";

const EMAIL_WHITELIST = [
  "jarvispraba@gmail.com",
  "guru2@sekolah.sch.id",
  "admin@sekolah.sch.id",
];

let guruLogin = null;
let logSesi   = [];
let modeAktif = null; // 'ambil' | 'kembali'

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
});

// ============================================================
//  NAVIGASI
// ============================================================
function tampilHalaman(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ============================================================
//  MODE: AMBIL / KEMBALI
// ============================================================
function setMode(mode) {
  modeAktif = mode;

  // Update tombol mode
  document.getElementById("btnModeAmbil").classList.toggle("active", mode === "ambil");
  document.getElementById("btnModeKembali").classList.toggle("active", mode === "kembali");

  // Tampilkan form yang sesuai
  document.getElementById("formAmbil").classList.toggle("hidden", mode !== "ambil");
  document.getElementById("formKembali").classList.toggle("hidden", mode !== "kembali");

  // Reset field form yang ditampilkan
  resetFormAktif(mode);
}

function resetFormAktif(mode) {
  if (mode === "ambil") {
    ["namaPengambil", "omprengDiambil", "jumlahAlergi"].forEach(id => {
      document.getElementById(id).value = "";
      document.getElementById(id).classList.remove("error");
    });
  } else {
    ["namaPengembali", "omprengDikembalikan"].forEach(id => {
      document.getElementById(id).value = "";
      document.getElementById(id).classList.remove("error");
    });
    document.getElementById("peringatanSelisih").classList.add("hidden");
  }
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
  el.textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

// Format tanggal konsisten untuk spreadsheet: DD MMMM YYYY
function getTanggalHari() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

// ============================================================
//  CEK SELISIH OMPRENG (real-time, hanya di form kembali)
// ============================================================
function cekSelisih() {
  // Ambil data ompreng diambil dari log sesi kelas yang dipilih hari ini
  const kelas   = document.getElementById("kelas").value;
  const tanggal = getTanggalHari();
  const entri   = logSesi.find(i => i.kelas === kelas && i.tanggal === tanggal);

  const diambil      = entri ? (entri.omprengDiambil || 0) : 0;
  const dikembalikan = parseInt(document.getElementById("omprengDikembalikan").value) || 0;
  const wrap         = document.getElementById("peringatanSelisih");
  const pesan        = document.getElementById("pesanSelisih");

  if (dikembalikan > 0 && diambil > 0 && dikembalikan < diambil) {
    const selisih = diambil - dikembalikan;
    pesan.textContent = `Ompreng kurang ${selisih} (diambil: ${diambil}, dikembalikan: ${dikembalikan})`;
    wrap.classList.remove("hidden");
  } else {
    wrap.classList.add("hidden");
  }
}

// ============================================================
//  KELAS CHANGE
// ============================================================
function onKelasChange() {
  // Reset mode dan sembunyikan kedua form
  modeAktif = null;
  document.getElementById("btnModeAmbil").classList.remove("active");
  document.getElementById("btnModeKembali").classList.remove("active");
  document.getElementById("formAmbil").classList.add("hidden");
  document.getElementById("formKembali").classList.add("hidden");
  document.getElementById("peringatanSelisih").classList.add("hidden");
}

// ============================================================
//  VALIDASI
// ============================================================
function validasiAmbil() {
  const kelas = document.getElementById("kelas").value;
  const nama  = document.getElementById("namaPengambil").value.trim();
  const jml   = document.getElementById("omprengDiambil").value;

  if (!kelas) { sorotError("kelas"); tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal"); return false; }
  if (!nama)  { sorotError("namaPengambil"); tampilkanToast("⚠️ Isi nama pengambil!", "gagal"); return false; }
  if (jml === "" || parseInt(jml) < 0) { sorotError("omprengDiambil"); tampilkanToast("⚠️ Isi jumlah ompreng diambil!", "gagal"); return false; }
  return true;
}

function validasiKembali() {
  const kelas = document.getElementById("kelas").value;
  const nama  = document.getElementById("namaPengembali").value.trim();
  const jml   = document.getElementById("omprengDikembalikan").value;

  if (!kelas) { sorotError("kelas"); tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal"); return false; }
  if (!nama)  { sorotError("namaPengembali"); tampilkanToast("⚠️ Isi nama pengembali!", "gagal"); return false; }
  if (jml === "" || parseInt(jml) < 0) { sorotError("omprengDikembalikan"); tampilkanToast("⚠️ Isi jumlah ompreng dikembalikan!", "gagal"); return false; }
  return true;
}

function sorotError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("error");
  setTimeout(() => el.classList.remove("error"), 2000);
}

// ============================================================
//  KIRIM DATA
// ============================================================
async function kirim(aksi) {
  if (aksi === "Mengambil"     && !validasiAmbil())   return;
  if (aksi === "Mengembalikan" && !validasiKembali()) return;

  const kelas               = document.getElementById("kelas").value;
  const namaPengambil       = document.getElementById("namaPengambil").value.trim();
  const omprengDiambil      = parseInt(document.getElementById("omprengDiambil").value) || 0;
  const namaPengembali      = document.getElementById("namaPengembali").value.trim();
  const omprengDikembalikan = parseInt(document.getElementById("omprengDikembalikan").value) || 0;
  const jumlahAlergi        = parseInt(document.getElementById("jumlahAlergi").value) || 0;
  const tanggal             = getTanggalHari();

  // Peringatan selisih saat submit
  if (aksi === "Mengembalikan") {
    const entri = logSesi.find(i => i.kelas === kelas && i.tanggal === tanggal);
    const diambil = entri ? (entri.omprengDiambil || 0) : 0;
    if (diambil > 0 && omprengDikembalikan < diambil) {
      tampilkanToast(`⚠️ Ompreng kurang ${diambil - omprengDikembalikan}! Data tetap dikirim.`, "warn");
    }
  }

  setTombol(true);

  const payload = {
    action:               aksi === "Mengambil" ? "add" : "update",
    kelas,
    tanggal,
    namaPengambil,
    omprengDiambil,
    namaPengembali,
    omprengDikembalikan,
    jumlahAlergi,
    guru: guruLogin,
  };

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      tampilkanToast(`Data ${aksi} berhasil dikirim ✅`, "sukses");
      updateLog(kelas, tanggal, aksi, { namaPengambil, omprengDiambil, namaPengembali, omprengDikembalikan, jumlahAlergi });
      resetFormAktif(modeAktif); // reset field setelah submit
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
  const btnA = document.getElementById("btnAmbil");
  const btnK = document.getElementById("btnKembali");
  if (btnA) btnA.disabled = disabled;
  if (btnK) btnK.disabled = disabled;
}

// ============================================================
//  LOG SESI
// ============================================================
function updateLog(kelas, tanggal, aksi, data) {
  const jam = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const idx = logSesi.findIndex(i => i.kelas === kelas && i.tanggal === tanggal);

  if (idx >= 0) {
    if (aksi === "Mengambil") {
      logSesi[idx].namaPengambil  = data.namaPengambil;
      logSesi[idx].omprengDiambil = data.omprengDiambil;
      logSesi[idx].jumlahAlergi   = data.jumlahAlergi;
      logSesi[idx].jamAmbil       = jam;
    } else {
      logSesi[idx].namaPengembali       = data.namaPengembali;
      logSesi[idx].omprengDikembalikan  = data.omprengDikembalikan;
      logSesi[idx].jamKembali           = jam;
    }
    logSesi[idx].status = hitungStatus(logSesi[idx]);
  } else {
    const entri = {
      kelas, tanggal,
      namaPengambil:       aksi === "Mengambil" ? data.namaPengambil : "",
      omprengDiambil:      aksi === "Mengambil" ? data.omprengDiambil : 0,
      jumlahAlergi:        data.jumlahAlergi || 0,
      namaPengembali:      aksi === "Mengembalikan" ? data.namaPengembali : "",
      omprengDikembalikan: aksi === "Mengembalikan" ? data.omprengDikembalikan : 0,
      jamAmbil:            aksi === "Mengambil" ? jam : "",
      jamKembali:          aksi === "Mengembalikan" ? jam : "",
    };
    entri.status = hitungStatus(entri);
    logSesi.unshift(entri);
  }

  simpanLog();
  renderLog();
}

function hitungStatus(entri) {
  const adaAmbil   = entri.namaPengambil && entri.omprengDiambil > 0;
  const adaKembali = entri.namaPengembali && entri.jamKembali;
  if (adaAmbil && adaKembali) return "Selesai";
  if (adaAmbil)   return "Diambil";
  if (adaKembali) return "Dikembalikan";
  return "—";
}

function renderLog() {
  const wrap = document.getElementById("logList");
  if (logSesi.length === 0) {
    wrap.innerHTML = `<p class="kosong">Belum ada aktivitas.</p>`;
    return;
  }

  wrap.innerHTML = logSesi.map(item => {
    const statusClass = item.status === "Selesai"      ? "label-selesai"
                      : item.status === "Diambil"      ? "label-ambil"
                      : item.status === "Dikembalikan" ? "label-kembali"
                      : "label-kembali";

    // Hitung selisih jika ada data keduanya
    const selisih = (item.omprengDiambil > 0 && item.jamKembali && item.omprengDikembalikan < item.omprengDiambil)
      ? item.omprengDiambil - item.omprengDikembalikan
      : 0;

    let rows = "";

    if (item.namaPengambil) {
      rows += `<div class="log-row">
        <span class="log-row-label label-ambil">Ambil</span>
        <span class="log-detail-text">${item.namaPengambil} · Ompreng: ${item.omprengDiambil}${item.jumlahAlergi > 0 ? ` · Alergi: ${item.jumlahAlergi}` : ""}</span>
      </div>`;
    }

    if (item.namaPengembali) {
      rows += `<div class="log-row">
        <span class="log-row-label label-kembali">Kembali</span>
        <span class="log-detail-text">${item.namaPengembali} · Ompreng: ${item.omprengDikembalikan}${selisih > 0 ? ` <span style="color:#FF0000">⚠️ kurang ${selisih}</span>` : ""}</span>
      </div>`;
    }

    return `<div class="log-item">
      <div class="log-item-header">
        <span class="log-kelas">${item.kelas}</span>
        <span class="log-row-label ${statusClass}">${item.status}</span>
      </div>
      ${rows}
      <div style="font-size:0.72rem;color:#aaa;margin-top:6px">${item.tanggal}</div>
    </div>`;
  }).join("");
}

function simpanLog() {
  localStorage.setItem("mbg_log_v5", JSON.stringify(logSesi));
}

function muatLog() {
  const saved = localStorage.getItem("mbg_log_v5");
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

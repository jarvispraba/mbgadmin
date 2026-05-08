// ============================================================
//  MBG TRACKER – app.js  (Versi Guru v6)
// ============================================================

const scriptURL = "https://script.google.com/macros/s/AKfycbzGPsi4JJYSjY0dmj5rEYdRKEkzwY7rgsOF2zeDf677sFYA2_ye4uhpM2561a_5M4RT/exec";
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc/edit?usp=sharing";

const EMAIL_WHITELIST = [
  "jarvispraba@gmail.com",
  "guru2@sekolah.sch.id",
  " ",
];

// ── Konstanta batas input ────────────────────────────────────
const MAKS_NAMA  = 30;
const MAKS_ANGKA = 40;
const MIN_ANGKA  = 0;

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
  document.getElementById("btnModeAmbil").classList.toggle("active", mode === "ambil");
  document.getElementById("btnModeKembali").classList.toggle("active", mode === "kembali");
  document.getElementById("formAmbil").classList.toggle("hidden", mode !== "ambil");
  document.getElementById("formKembali").classList.toggle("hidden", mode !== "kembali");
  resetFormAktif(mode);
}

function resetFormAktif(mode) {
  if (mode === "ambil") {
    ["namaPengambil", "omprengDiambil", "jumlahAlergi"].forEach(id => {
      document.getElementById(id).value = "";
      document.getElementById(id).classList.remove("error");
    });
    const h = document.getElementById("hintNamaPengambil");
    if (h) h.textContent = "";
  } else {
    ["namaPengembali", "omprengDikembalikan"].forEach(id => {
      document.getElementById(id).value = "";
      document.getElementById(id).classList.remove("error");
    });
    const h = document.getElementById("hintNamaPengembali");
    if (h) h.textContent = "";
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

function getTanggalHari() {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit", month: "long", year: "numeric"
  });
}

// ============================================================
//  HELPERS VALIDASI INPUT
// ============================================================

// Sanitasi nama: hapus angka & karakter selain huruf dan spasi
function sanitasiNama(el) {
  const bersih = el.value.replace(/[^a-zA-Z\s]/g, "");
  if (el.value !== bersih) {
    el.value = bersih;
    // Pertahankan posisi kursor setelah sanitasi
  }
}

// Clamp angka ke MIN–MAKS saat user mengetik (fix bug angka berubah sendiri)
function clampAngka(el) {
  const raw = el.value;
  if (raw === "" || raw === "-") return; // biarkan kosong saat sedang mengetik

  const val = parseInt(raw, 10); // radix 10 wajib — hindari parsing octal/hex
  if (isNaN(val) || val < MIN_ANGKA) {
    el.value = "";
    return;
  }
  if (val > MAKS_ANGKA) {
    el.value = MAKS_ANGKA;
    el.classList.add("error");
    tampilkanToast(`⚠️ Maksimal ${MAKS_ANGKA}`, "gagal");
    setTimeout(() => el.classList.remove("error"), 2000);
    return;
  }
  // Tulis ulang nilai bersih — mencegah nilai "ganda" atau trailing karakter
  el.value = val;
  el.classList.remove("error");
}

// Tampilkan hint sisa karakter nama
function cekPanjangNama(el, hintId) {
  const panjang = el.value.length;
  const hint    = document.getElementById(hintId);
  if (!hint) return;

  if (panjang >= MAKS_NAMA) {
    hint.textContent = `Batas ${MAKS_NAMA} karakter tercapai`;
    hint.className   = "input-hint";
    el.classList.add("error");
  } else if (panjang >= MAKS_NAMA - 5) {
    hint.textContent = `${MAKS_NAMA - panjang} karakter tersisa`;
    hint.className   = "input-hint";
    el.classList.remove("error");
  } else {
    hint.textContent = "";
    el.classList.remove("error");
  }
}

// Ambil angka bersih (parseInt radix 10, clamp ke MIN–MAKS)
function ambilAngka(id) {
  const val = parseInt(document.getElementById(id).value, 10);
  if (isNaN(val)) return 0;
  return Math.min(Math.max(val, MIN_ANGKA), MAKS_ANGKA);
}

// Ambil teks bersih (trim + potong maks karakter)
function ambilTeks(id) {
  return document.getElementById(id).value.trim().slice(0, MAKS_NAMA);
}

function sorotError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("error");
  setTimeout(() => el.classList.remove("error"), 2500);
}

// ============================================================
//  CEK SELISIH OMPRENG (real-time di form kembali)
// ============================================================
function cekSelisih() {
  const kelas   = document.getElementById("kelas").value;
  const tanggal = getTanggalHari();
  const entri   = logSesi.find(i => i.kelas === kelas && i.tanggal === tanggal);

  const diambil      = entri ? (entri.omprengDiambil || 0) : 0;
  const dikembalikan = parseInt(document.getElementById("omprengDikembalikan").value, 10) || 0;
  const wrap         = document.getElementById("peringatanSelisih");
  const pesan        = document.getElementById("pesanSelisih");

  if (diambil > 0 && dikembalikan > 0 && dikembalikan < diambil) {
    const selisih = diambil - dikembalikan;
    const pesanUnik = [
      `😅 Waduh! Omprengnya ke mana nih? Kurang ${selisih} nih!`,
      `🍽️ Kayaknya ada yang belum balik… kurang ${selisih} ompreng!`,
      `🤔 Hmm, kok kurang ${selisih} ya? Cek lagi yuk!`,
      `⚠️ Eh tunggu, kurang ${selisih} ompreng! Jangan-jangan masih di kelas?`
    ];
    pesan.textContent = pesanUnik[selisih % pesanUnik.length]; // konsisten per nilai selisih
    wrap.classList.remove("hidden");
  } else {
    wrap.classList.add("hidden");
  }
}

// ============================================================
//  KELAS CHANGE
// ============================================================
function onKelasChange() {
  modeAktif = null;
  document.getElementById("btnModeAmbil").classList.remove("active");
  document.getElementById("btnModeKembali").classList.remove("active");
  document.getElementById("formAmbil").classList.add("hidden");
  document.getElementById("formKembali").classList.add("hidden");
  document.getElementById("peringatanSelisih").classList.add("hidden");
}

// ============================================================
//  VALIDASI FORM
// ============================================================
function validasiAmbil() {
  const kelas  = document.getElementById("kelas").value;
  const nama   = ambilTeks("namaPengambil");
  const rawJml = document.getElementById("omprengDiambil").value;
  const jml    = ambilAngka("omprengDiambil");

  if (!kelas) {
    sorotError("kelas");
    tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal");
    return false;
  }
  if (!nama) {
    sorotError("namaPengambil");
    tampilkanToast("⚠️ Isi nama pengambil!", "gagal");
    return false;
  }
  if (rawJml === "") {
    sorotError("omprengDiambil");
    tampilkanToast("⚠️ Isi jumlah ompreng diambil!", "gagal");
    return false;
  }
  if (jml < MIN_ANGKA || jml > MAKS_ANGKA) {
    sorotError("omprengDiambil");
    tampilkanToast(`⚠️ Jumlah ompreng harus ${MIN_ANGKA}–${MAKS_ANGKA}!`, "gagal");
    return false;
  }
  return true;
}

function validasiKembali() {
  const kelas    = document.getElementById("kelas").value;
  const nama     = ambilTeks("namaPengembali");
  const rawJml   = document.getElementById("omprengDikembalikan").value;
  const jml      = ambilAngka("omprengDikembalikan");
  const tanggal  = getTanggalHari();

  if (!kelas) {
    sorotError("kelas");
    tampilkanToast("⚠️ Pilih kelas terlebih dahulu!", "gagal");
    return false;
  }
  if (!nama) {
    sorotError("namaPengembali");
    tampilkanToast("⚠️ Isi nama pengembali!", "gagal");
    return false;
  }
  if (rawJml === "") {
    sorotError("omprengDikembalikan");
    tampilkanToast("⚠️ Isi jumlah ompreng dikembalikan!", "gagal");
    return false;
  }
  if (jml < MIN_ANGKA || jml > MAKS_ANGKA) {
    sorotError("omprengDikembalikan");
    tampilkanToast(`⚠️ Jumlah ompreng harus ${MIN_ANGKA}–${MAKS_ANGKA}!`, "gagal");
    return false;
  }

  // ❌ BLOK jika ompreng dikembalikan < diambil
  const entri   = logSesi.find(i => i.kelas === kelas && i.tanggal === tanggal);
  const diambil = entri ? (entri.omprengDiambil || 0) : 0;
  if (diambil > 0 && jml < diambil) {
    const selisih = diambil - jml;
    sorotError("omprengDikembalikan");
    // Tampilkan peringatan unik & fun
    const wrap  = document.getElementById("peringatanSelisih");
    const pesan = document.getElementById("pesanSelisih");
    const pesanUnik = [
      `😅 Waduh! Omprengnya ke mana nih? Kurang ${selisih} nih!`,
      `🍽️ Kayaknya ada yang belum balik… kurang ${selisih} ompreng!`,
      `🤔 Hmm, kok kurang ${selisih} ya? Cek lagi yuk!`,
      `⚠️ Eh tunggu, kurang ${selisih} ompreng! Jangan-jangan masih di kelas?`
    ];
    pesan.textContent = pesanUnik[Math.floor(Math.random() * pesanUnik.length)];
    wrap.classList.remove("hidden");
    tampilkanToast(`⚠️ Ompreng kurang ${selisih}! Data tidak dapat dikirim.`, "gagal");
    return false; // ← BLOK submit
  }

  return true;
}

// ============================================================
//  KIRIM DATA
// ============================================================
async function kirim(aksi) {
  if (aksi === "Mengambil"     && !validasiAmbil())   return;
  if (aksi === "Mengembalikan" && !validasiKembali()) return;

  const kelas               = document.getElementById("kelas").value;
  const namaPengambil       = ambilTeks("namaPengambil");
  const omprengDiambil      = ambilAngka("omprengDiambil");
  const namaPengembali      = ambilTeks("namaPengembali");
  const omprengDikembalikan = ambilAngka("omprengDikembalikan");
  const jumlahAlergi        = ambilAngka("jumlahAlergi");
  const tanggal             = getTanggalHari();

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
      updateLog(kelas, tanggal, aksi, {
        namaPengambil, omprengDiambil,
        namaPengembali, omprengDikembalikan,
        jumlahAlergi
      });
      resetFormAktif(modeAktif);
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
//  LOG SESI (1 kelas + 1 tanggal = 1 entri)
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

    const selisih = (item.omprengDiambil > 0 && item.jamKembali &&
                     item.omprengDikembalikan < item.omprengDiambil)
      ? item.omprengDiambil - item.omprengDikembalikan : 0;

    // Hitung status ompreng: tuntas atau selisih
    const statusOmpreng = item.jamKembali
      ? (selisih === 0 ? " · <span style=\"color:#16a34a\">✔ tuntas</span>"
                       : ` · <span style="color:#FF0000">⚠️ kurang ${selisih}</span>`)
      : "";

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
        <span class="log-detail-text">${item.namaPengembali} · Ompreng: ${item.omprengDikembalikan}${statusOmpreng}</span>
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
  localStorage.setItem("mbg_log_v6", JSON.stringify(logSesi));
}

function muatLog() {
  // Coba muat dari v6, fallback ke v5 agar data lama tidak hilang
  const saved = localStorage.getItem("mbg_log_v6") || localStorage.getItem("mbg_log_v5");
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
  tampilkanToast("Menghapus semua data...", "");

  // Sinkron hapus semua ke spreadsheet
  fetch(scriptURL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action: "delete_all", guru: guruLogin }),
  })
    .then(res => {
      if (res.ok) tampilkanToast("Semua data dihapus dari spreadsheet ✅", "sukses");
      else throw new Error();
    })
    .catch(() => tampilkanToast("Data lokal dihapus, gagal sinkron spreadsheet ⚠️", "gagal"));
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

// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)  v7
//  Deploy → New Deployment → Web App
//    Execute as: Me  |  Who has access: Anyone
//
//  STRUKTUR SPREADSHEET (1 baris per kelas per hari):
//  Kelas | Tanggal | Nama Pengambil | Pengambilan | Nama Pengembali | Pengembalian | Status | Alergi | Guru
// ============================================================

var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1";

var COL = {
  KELAS:          1,
  TANGGAL:        2,
  NAMA_PENGAMBIL: 3,
  PENGAMBILAN:    4,   // jumlah ompreng diambil
  NAMA_PENGEMBALI:5,
  PENGEMBALIAN:   6,   // jumlah ompreng dikembalikan
  STATUS:         7,   // "tuntas" atau "-2" (selisih negatif)
  ALERGI:         8,
  GURU:           9,
};

var TOTAL_COLS = 9;

// ── doPost ───────────────────────────────────────────────────
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action || "add";

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    pastikanHeader(sheet);

    // ── DELETE ALL ──────────────────────────────────────────
    if (action === "delete_all") {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // Hapus semua baris data (baris 2 ke bawah), header tetap
        sheet.deleteRows(2, lastRow - 1);
      }
      return jsonResponse({ result: "success", action: "delete_all" });
    }

    // ── DELETE (per kelas) ──────────────────────────────────
    if (action === "delete") {
      var kelas = data.kelas || "";
      if (!kelas) return jsonResponse({ result: "error", message: "Kelas kosong" });

      var lastRow = sheet.getLastRow();
      var deleted = 0;
      for (var i = lastRow; i >= 2; i--) {
        if (String(sheet.getRange(i, COL.KELAS).getValue()) === kelas) {
          sheet.deleteRow(i);
          deleted++;
        }
      }
      return jsonResponse({ result: "success", action: "delete", kelas: kelas, deleted: deleted });
    }

    // ── ADD (Mengambil) → buat baris baru atau update kolom pengambilan ──
    if (action === "add") {
      var tanggal  = String(data.tanggal || "");
      var existRow = cariBarisKelasHari(sheet, data.kelas, tanggal);
      var pengambilan = Number(data.omprengDiambil) || 0;

      if (existRow > 0) {
        // Baris sudah ada → update kolom pengambilan saja
        sheet.getRange(existRow, COL.NAMA_PENGAMBIL).setValue(data.namaPengambil || "");
        sheet.getRange(existRow, COL.PENGAMBILAN).setValue(pengambilan);
        sheet.getRange(existRow, COL.ALERGI).setValue(Number(data.jumlahAlergi) || 0);
        sheet.getRange(existRow, COL.GURU).setValue(data.guru || "—");
        // Hitung ulang status jika pengembalian sudah ada
        sheet.getRange(existRow, COL.STATUS).setValue(hitungStatus(sheet, existRow));
      } else {
        // Buat baris baru — kolom pengembalian & status kosong dulu
        var row = buatRowKosong(data.kelas, tanggal);
        row[COL.NAMA_PENGAMBIL - 1] = data.namaPengambil || "";
        row[COL.PENGAMBILAN    - 1] = pengambilan;
        row[COL.ALERGI         - 1] = Number(data.jumlahAlergi) || 0;
        row[COL.STATUS         - 1] = "";   // belum ada pengembalian
        row[COL.GURU           - 1] = data.guru || "—";
        sheet.appendRow(row);
      }
      return jsonResponse({ result: "success", action: "add", kelas: data.kelas });
    }

    // ── UPDATE (Mengembalikan) → update kolom pengembalian + status ──────
    if (action === "update") {
      var tanggal      = String(data.tanggal || "");
      var pengembalian = Number(data.omprengDikembalikan) || 0;
      var rowIdx       = cariBarisKelasHari(sheet, data.kelas, tanggal);

      if (rowIdx > 0) {
        // Update kolom pengembalian pada baris yang sama
        sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).setValue(data.namaPengembali || "");
        sheet.getRange(rowIdx, COL.PENGEMBALIAN).setValue(pengembalian);
        sheet.getRange(rowIdx, COL.GURU).setValue(data.guru || "—");
        // Hitung status: tuntas atau selisih negatif
        sheet.getRange(rowIdx, COL.STATUS).setValue(hitungStatus(sheet, rowIdx));
      } else {
        // Belum ada baris pengambilan → buat baris baru dengan data pengembalian
        var row = buatRowKosong(data.kelas, tanggal);
        row[COL.NAMA_PENGEMBALI - 1] = data.namaPengembali || "";
        row[COL.PENGEMBALIAN    - 1] = pengembalian;
        row[COL.STATUS          - 1] = "";
        row[COL.GURU            - 1] = data.guru || "—";
        sheet.appendRow(row);
      }
      return jsonResponse({ result: "success", action: "update", kelas: data.kelas });
    }

    return jsonResponse({ result: "error", message: "Action tidak dikenal: " + action });

  } catch (err) {
    return jsonResponse({ result: "error", message: err.toString() });
  }
}

// ── doGet ────────────────────────────────────────────────────
function doGet(e) {
  return jsonResponse({ result: "MBG Tracker API aktif ✅ (v8)" });
}

// ── Cari baris berdasarkan kelas + tanggal ───────────────────
function cariBarisKelasHari(sheet, kelas, tanggal) {
  var lastRow = sheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    var k = String(sheet.getRange(i, COL.KELAS).getValue());
    var t = String(sheet.getRange(i, COL.TANGGAL).getValue());
    if (k === kelas && t === tanggal) return i;
  }
  return -1;
}

// ── Buat array baris kosong ──────────────────────────────────
function buatRowKosong(kelas, tanggal) {
  var row = [];
  for (var i = 0; i < TOTAL_COLS; i++) row.push("");
  row[COL.KELAS   - 1] = kelas;
  row[COL.TANGGAL - 1] = tanggal; // string → tidak jadi tahun 1900
  return row;
}

// ── Hitung status: "tuntas" atau selisih negatif (misal: -2) ─
function hitungStatus(sheet, rowIdx) {
  var pengambilan  = Number(sheet.getRange(rowIdx, COL.PENGAMBILAN).getValue())  || 0;
  var pengembalian = Number(sheet.getRange(rowIdx, COL.PENGEMBALIAN).getValue()) || 0;

  // Hanya hitung jika kedua kolom sudah terisi
  if (pengambilan === 0 || pengembalian === 0) return "";

  var selisih = pengembalian - pengambilan; // negatif jika kurang
  return selisih === 0 ? "tuntas" : String(selisih); // contoh: -2
}

// ── Pastikan header ada ──────────────────────────────────────
function pastikanHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Kelas", "Tanggal",
      "Nama Pengambil", "Pengambilan",
      "Nama Pengembali", "Pengembalian",
      "Status", "Alergi", "Guru"
    ]);
    var h = sheet.getRange(1, 1, 1, TOTAL_COLS);
    h.setFontWeight("bold");
    h.setBackground("#BBD5DA");
  }
}

// ── JSON response ────────────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

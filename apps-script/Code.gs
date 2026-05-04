// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)  v4
//  Deploy → New Deployment → Web App
//    Execute as: Me  |  Who has access: Anyone
// ============================================================

var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1";

// Kolom spreadsheet (1-indexed)
var COL = {
  KELAS:               1,
  TANGGAL:             2,
  NAMA_PENGAMBIL:      3,
  OMPRENG_DIAMBIL:     4,
  NAMA_PENGEMBALI:     5,
  OMPRENG_DIKEMBALIKAN:6,
  JUMLAH_ALERGI:       7,
  STATUS:              8,
  APPROVED:            9,
  GURU:               10,
};

var TOTAL_COLS = 10;

// ── doPost ───────────────────────────────────────────────────
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action || "add";

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    pastikanHeader(sheet);

    // ── DELETE ──────────────────────────────────────────────
    if (action === "delete") {
      var kelas = data.kelas || "";
      if (!kelas) return jsonResponse({ result: "error", message: "Kelas kosong" });

      var lastRow = sheet.getLastRow();
      var deleted = 0;
      for (var i = lastRow; i >= 2; i--) {
        if (sheet.getRange(i, COL.KELAS).getValue() === kelas) {
          sheet.deleteRow(i);
          deleted++;
        }
      }
      return jsonResponse({ result: "success", action: "delete", kelas: kelas, deleted: deleted });
    }

    // ── APPROVED ────────────────────────────────────────────
    if (action === "approved") {
      var rowIdx = cariBarisKelasHari(sheet, data.kelas, data.tanggal);
      if (rowIdx > 0) {
        sheet.getRange(rowIdx, COL.APPROVED).setValue(data.approved || "");
        sheet.getRange(rowIdx, COL.GURU).setValue(data.guru || "—");
      } else {
        // Buat baris baru jika belum ada
        var newRow = buatRowKosong(data.kelas, data.tanggal);
        newRow[COL.APPROVED - 1] = data.approved || "";
        newRow[COL.GURU - 1]     = data.guru || "—";
        sheet.appendRow(newRow);
      }
      return jsonResponse({ result: "success", action: "approved" });
    }

    // ── ADD (Mengambil) → buat baris baru ───────────────────
    if (action === "add") {
      // Cek apakah sudah ada baris untuk kelas + tanggal ini
      var existRow = cariBarisKelasHari(sheet, data.kelas, data.tanggal);
      if (existRow > 0) {
        // Update kolom pengambilan saja
        sheet.getRange(existRow, COL.NAMA_PENGAMBIL).setValue(data.namaPengambil || "");
        sheet.getRange(existRow, COL.OMPRENG_DIAMBIL).setValue(data.omprengDiambil || 0);
        sheet.getRange(existRow, COL.STATUS).setValue(hitungStatus(sheet, existRow));
        sheet.getRange(existRow, COL.GURU).setValue(data.guru || "—");
      } else {
        var row = buatRowKosong(data.kelas, data.tanggal);
        row[COL.NAMA_PENGAMBIL  - 1] = data.namaPengambil  || "";
        row[COL.OMPRENG_DIAMBIL - 1] = data.omprengDiambil || 0;
        row[COL.JUMLAH_ALERGI   - 1] = data.jumlahAlergi   || 0;
        row[COL.STATUS          - 1] = "Sudah Mengambil";
        row[COL.GURU            - 1] = data.guru || "—";
        sheet.appendRow(row);
      }
      return jsonResponse({ result: "success", action: "add", kelas: data.kelas });
    }

    // ── UPDATE (Mengembalikan) → update baris yang ada ──────
    if (action === "update") {
      var rowIdx = cariBarisKelasHari(sheet, data.kelas, data.tanggal);
      if (rowIdx > 0) {
        sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).setValue(data.namaPengembali || "");
        sheet.getRange(rowIdx, COL.OMPRENG_DIKEMBALIKAN).setValue(data.omprengDikembalikan || 0);
        sheet.getRange(rowIdx, COL.JUMLAH_ALERGI).setValue(data.jumlahAlergi || 0);
        sheet.getRange(rowIdx, COL.STATUS).setValue(hitungStatus(sheet, rowIdx));
        sheet.getRange(rowIdx, COL.GURU).setValue(data.guru || "—");
      } else {
        // Belum ada baris → buat baru dengan data pengembalian
        var row = buatRowKosong(data.kelas, data.tanggal);
        row[COL.NAMA_PENGEMBALI       - 1] = data.namaPengembali       || "";
        row[COL.OMPRENG_DIKEMBALIKAN  - 1] = data.omprengDikembalikan  || 0;
        row[COL.JUMLAH_ALERGI         - 1] = data.jumlahAlergi         || 0;
        row[COL.STATUS                - 1] = "Sudah Mengembalikan";
        row[COL.GURU                  - 1] = data.guru || "—";
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
  return jsonResponse({ result: "MBG Tracker API aktif ✅ (v4)" });
}

// ── Helper: cari baris berdasarkan kelas + tanggal ───────────
function cariBarisKelasHari(sheet, kelas, tanggal) {
  var lastRow = sheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    var k = sheet.getRange(i, COL.KELAS).getValue();
    var t = sheet.getRange(i, COL.TANGGAL).getValue();
    if (k === kelas && t === tanggal) return i;
  }
  return -1;
}

// ── Helper: buat array baris kosong ─────────────────────────
function buatRowKosong(kelas, tanggal) {
  var row = [];
  for (var i = 0; i < TOTAL_COLS; i++) row.push("");
  row[COL.KELAS   - 1] = kelas;
  row[COL.TANGGAL - 1] = tanggal;
  return row;
}

// ── Helper: hitung status dari isi baris ────────────────────
function hitungStatus(sheet, rowIdx) {
  var pengambil  = sheet.getRange(rowIdx, COL.NAMA_PENGAMBIL).getValue();
  var pengembali = sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).getValue();
  if (pengambil && pengembali) return "Selesai";
  if (pengambil)  return "Sudah Mengambil";
  if (pengembali) return "Sudah Mengembalikan";
  return "—";
}

// ── Helper: pastikan header ada ─────────────────────────────
function pastikanHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Kelas", "Tanggal", "Nama Pengambil", "Ompreng Diambil",
      "Nama Pengembali", "Ompreng Dikembalikan", "Jumlah Alergi",
      "Status", "Approved", "Guru"
    ]);
    var h = sheet.getRange(1, 1, 1, TOTAL_COLS);
    h.setFontWeight("bold");
    h.setBackground("#BBD5DA");
  }
}

// ── Helper: JSON response ────────────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

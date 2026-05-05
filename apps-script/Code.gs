// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)  v5
//  Deploy → New Deployment → Web App
//    Execute as: Me  |  Who has access: Anyone
// ============================================================

var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1";

// Kolom spreadsheet (1-indexed)
// Kelas | Tanggal | Nama Pengambil | Ompreng Diambil | Jumlah Alergi |
// Nama Pengembali | Ompreng Dikembalikan | Status | Guru
var COL = {
  KELAS:                1,
  TANGGAL:              2,
  NAMA_PENGAMBIL:       3,
  OMPRENG_DIAMBIL:      4,
  JUMLAH_ALERGI:        5,
  NAMA_PENGEMBALI:      6,
  OMPRENG_DIKEMBALIKAN: 7,
  STATUS:               8,
  GURU:                 9,
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

    // ── ADD (Mengambil) → buat baris baru atau update ────────
    if (action === "add") {
      var tanggal  = String(data.tanggal || "");
      var existRow = cariBarisKelasHari(sheet, data.kelas, tanggal);

      if (existRow > 0) {
        // Sudah ada baris hari ini → update kolom pengambilan
        sheet.getRange(existRow, COL.NAMA_PENGAMBIL).setValue(data.namaPengambil || "");
        sheet.getRange(existRow, COL.OMPRENG_DIAMBIL).setValue(Number(data.omprengDiambil) || 0);
        sheet.getRange(existRow, COL.JUMLAH_ALERGI).setValue(Number(data.jumlahAlergi) || 0);
        sheet.getRange(existRow, COL.STATUS).setValue(hitungStatus(sheet, existRow));
        sheet.getRange(existRow, COL.GURU).setValue(data.guru || "—");
      } else {
        // Buat baris baru
        var row = buatRowKosong(data.kelas, tanggal);
        row[COL.NAMA_PENGAMBIL  - 1] = data.namaPengambil  || "";
        row[COL.OMPRENG_DIAMBIL - 1] = Number(data.omprengDiambil) || 0;
        row[COL.JUMLAH_ALERGI   - 1] = Number(data.jumlahAlergi)   || 0;
        row[COL.STATUS          - 1] = "Diambil";
        row[COL.GURU            - 1] = data.guru || "—";
        sheet.appendRow(row);
      }
      return jsonResponse({ result: "success", action: "add", kelas: data.kelas });
    }

    // ── UPDATE (Mengembalikan) → update baris yang ada ───────
    if (action === "update") {
      var tanggal  = String(data.tanggal || "");
      var rowIdx   = cariBarisKelasHari(sheet, data.kelas, tanggal);

      if (rowIdx > 0) {
        sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).setValue(data.namaPengembali || "");
        sheet.getRange(rowIdx, COL.OMPRENG_DIKEMBALIKAN).setValue(Number(data.omprengDikembalikan) || 0);
        sheet.getRange(rowIdx, COL.STATUS).setValue(hitungStatus(sheet, rowIdx));
        sheet.getRange(rowIdx, COL.GURU).setValue(data.guru || "—");
      } else {
        // Belum ada baris pengambilan → buat baris baru dengan data pengembalian
        var row = buatRowKosong(data.kelas, tanggal);
        row[COL.NAMA_PENGEMBALI       - 1] = data.namaPengembali       || "";
        row[COL.OMPRENG_DIKEMBALIKAN  - 1] = Number(data.omprengDikembalikan) || 0;
        row[COL.STATUS                - 1] = "Dikembalikan";
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
  return jsonResponse({ result: "MBG Tracker API aktif ✅ (v5)" });
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
  row[COL.TANGGAL - 1] = tanggal;  // string, bukan Date → tidak akan jadi 1900
  return row;
}

// ── Hitung status dari isi baris ────────────────────────────
function hitungStatus(sheet, rowIdx) {
  var pengambil        = sheet.getRange(rowIdx, COL.NAMA_PENGAMBIL).getValue();
  var pengembali       = sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).getValue();
  var omprengDiambil   = Number(sheet.getRange(rowIdx, COL.OMPRENG_DIAMBIL).getValue()) || 0;
  var omprengKembali   = Number(sheet.getRange(rowIdx, COL.OMPRENG_DIKEMBALIKAN).getValue()) || 0;

  if (pengambil && pengembali) {
    var selisih = omprengDiambil - omprengKembali;
    return selisih === 0 ? "tuntas" : String(selisih * -1); // contoh: -2
  }
  if (pengambil)  return "Diambil";
  if (pengembali) return "Dikembalikan";
  return "—";
}

// ── Pastikan header ada ──────────────────────────────────────
function pastikanHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Kelas", "Tanggal", "Nama Pengambil", "Ompreng Diambil",
      "Jumlah Alergi", "Nama Pengembali", "Ompreng Dikembalikan",
      "Status", "Guru"
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

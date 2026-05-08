// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)  v8 FINAL
//  Deploy → New Deployment → Web App
//    Execute as: Me  |  Who has access: Anyone
//
//  STRUKTUR SPREADSHEET (1 baris per kelas per hari):
//  Kelas | Tanggal | Nama Pengambil | Ompreng Diambil |
//  Nama Pengembali | Ompreng Dikembalikan | Jumlah Alergi | Status | Guru
// ============================================================

var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1";

// Kolom (1-indexed) — sesuai header spreadsheet
var COL = {
  KELAS:                1,
  TANGGAL:              2,
  NAMA_PENGAMBIL:       3,
  OMPRENG_DIAMBIL:      4,
  NAMA_PENGEMBALI:      5,
  OMPRENG_DIKEMBALIKAN: 6,
  JUMLAH_ALERGI:        7,
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

    // ── DELETE ALL ──────────────────────────────────────────
    if (action === "delete_all") {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1);
      }
      return jsonResponse({ result: "success", action: "delete_all" });
    }

    // ── DELETE per kelas ────────────────────────────────────
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

    // ── ADD (Sudah Mengambil) ────────────────────────────────
    // Logic: buat baris baru. Jika hari ini sudah ada → update baris yang sama
    if (action === "add") {
      var tanggal     = String(data.tanggal || "");
      var omprengAmbil = parseInt(String(data.omprengDiambil), 10) || 0;
      var existRow    = cariBarisKelasHari(sheet, data.kelas, tanggal);

      if (existRow > 0) {
        // Sudah ada baris hari ini → update kolom pengambilan saja
        sheet.getRange(existRow, COL.NAMA_PENGAMBIL).setValue(data.namaPengambil || "");
        sheet.getRange(existRow, COL.OMPRENG_DIAMBIL).setValue(omprengAmbil);
        sheet.getRange(existRow, COL.JUMLAH_ALERGI).setValue(parseInt(String(data.jumlahAlergi), 10) || 0);
        sheet.getRange(existRow, COL.GURU).setValue(data.guru || "—");
        sheet.getRange(existRow, COL.STATUS).setValue(hitungStatus(sheet, existRow));
      } else {
        // Buat baris baru — kolom pengembalian kosong dulu
        var row = buatRowKosong(data.kelas, tanggal);
        row[COL.NAMA_PENGAMBIL  - 1] = data.namaPengambil || "";
        row[COL.OMPRENG_DIAMBIL - 1] = omprengAmbil;
        row[COL.JUMLAH_ALERGI   - 1] = parseInt(String(data.jumlahAlergi), 10) || 0;
        row[COL.STATUS          - 1] = "Sudah Mengambil";
        row[COL.GURU            - 1] = data.guru || "—";
        sheet.appendRow(row);
      }
      return jsonResponse({ result: "success", action: "add", kelas: data.kelas });
    }

    // ── UPDATE (Sudah Mengembalikan) ─────────────────────────
    // Logic: SELALU cari baris kelas+tanggal → update. JANGAN buat baris baru.
    if (action === "update") {
      var tanggal      = String(data.tanggal || "");
      var omprengKembali = parseInt(String(data.omprengDikembalikan), 10) || 0;
      var rowIdx       = cariBarisKelasHari(sheet, data.kelas, tanggal);

      if (rowIdx > 0) {
        // ✅ Update baris yang sama — tidak buat baris baru
        sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).setValue(data.namaPengembali || "");
        sheet.getRange(rowIdx, COL.OMPRENG_DIKEMBALIKAN).setValue(omprengKembali);
        sheet.getRange(rowIdx, COL.GURU).setValue(data.guru || "—");
        sheet.getRange(rowIdx, COL.STATUS).setValue(hitungStatus(sheet, rowIdx));
      } else {
        // Belum ada baris pengambilan → buat baris baru dengan data pengembalian
        var row = buatRowKosong(data.kelas, tanggal);
        row[COL.NAMA_PENGEMBALI       - 1] = data.namaPengembali || "";
        row[COL.OMPRENG_DIKEMBALIKAN  - 1] = omprengKembali;
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
  return jsonResponse({ result: "MBG Tracker API aktif ✅ (v8 FINAL)" });
}

// ── Cari baris berdasarkan kelas + tanggal ───────────────────
// Membaca seluruh data sekaligus (lebih efisien dari cell-by-cell)
function cariBarisKelasHari(sheet, kelas, tanggal) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  // Baca kolom Kelas dan Tanggal sekaligus
  var dataKelas   = sheet.getRange(2, COL.KELAS,   lastRow - 1, 1).getValues();
  var dataTanggal = sheet.getRange(2, COL.TANGGAL, lastRow - 1, 1).getValues();

  for (var i = 0; i < dataKelas.length; i++) {
    if (String(dataKelas[i][0]) === kelas && String(dataTanggal[i][0]) === tanggal) {
      return i + 2; // +2 karena index 0 = baris 2
    }
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

// ── Hitung status ────────────────────────────────────────────
function hitungStatus(sheet, rowIdx) {
  var pengambil  = sheet.getRange(rowIdx, COL.NAMA_PENGAMBIL).getValue();
  var pengembali = sheet.getRange(rowIdx, COL.NAMA_PENGEMBALI).getValue();
  var diambil    = parseInt(String(sheet.getRange(rowIdx, COL.OMPRENG_DIAMBIL).getValue()), 10) || 0;
  var dikembali  = parseInt(String(sheet.getRange(rowIdx, COL.OMPRENG_DIKEMBALIKAN).getValue()), 10) || 0;

  if (pengambil && pengembali) {
    return "Sudah Selesai";
  }
  if (pengambil)  return "Sudah Mengambil";
  if (pengembali) return "Sudah Mengembalikan";
  return "—";
}

// ── Pastikan header ada ──────────────────────────────────────
function pastikanHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Kelas", "Tanggal",
      "Nama Pengambil", "Ompreng Diambil",
      "Nama Pengembali", "Ompreng Dikembalikan",
      "Jumlah Alergi", "Status", "Guru"
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

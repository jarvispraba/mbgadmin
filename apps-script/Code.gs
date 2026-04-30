// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)
//  Paste kode ini di: script.google.com → New Project
// ============================================================

// ID Spreadsheet target
// Ambil dari URL spreadsheet: .../spreadsheets/d/[ID]/edit
var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1"; // Ganti jika nama sheet berbeda

// ── doPost: menerima data dari website ───────────────────────
function doPost(e) {
  try {
    // Parse JSON dari body request
    var data   = JSON.parse(e.postData.contents);
    var kelas  = data.kelas  || "Tidak diketahui";
    var status = data.status || "Tidak diketahui";

    // Waktu otomatis (zona WIB)
    var now     = new Date();
    var tanggal = now.toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric"
    });
    var jam = now.toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });

    // Buka spreadsheet & sheet
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Buat header jika sheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Kelas", "Status", "Tanggal", "Jam"]);
      // Format header
      var headerRange = sheet.getRange(1, 1, 1, 4);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#BBD5DA");
    }

    // Tambah baris data baru
    sheet.appendRow([kelas, status, tanggal, jam]);

    // Kembalikan respons sukses
    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", kelas: kelas, status: status }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Kembalikan respons error
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doGet: cek apakah API aktif (opsional) ───────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "MBG Tracker API aktif ✅" }))
    .setMimeType(ContentService.MimeType.JSON);
}

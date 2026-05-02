// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)  v2 – Versi Guru
//  Paste kode ini di: script.google.com → New Project
//  Lalu Deploy → New Deployment → Web App
//    Execute as: Me
//    Who has access: Anyone
// ============================================================

var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1"; // Ganti jika nama sheet berbeda

// ── doPost: menerima data dari website ───────────────────────
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var kelas  = data.kelas  || "Tidak diketahui";
    var status = data.status || "Tidak diketahui";
    var guru   = data.guru   || "—";   // email guru yang menginput

    // Waktu otomatis (zona WIB)
    var now     = new Date();
    var tanggal = now.toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric"
    });
    var jam = now.toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // Buat header jika sheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Kelas", "Status", "Guru", "Tanggal", "Jam"]);
      var headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#BBD5DA");
    }

    // Tambah baris data baru (sekarang ada kolom Guru)
    sheet.appendRow([kelas, status, guru, tanggal, jam]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", kelas: kelas, status: status, guru: guru }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doGet: cek apakah API aktif ──────────────────────────────
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "MBG Tracker API aktif ✅ (Versi Guru)" }))
    .setMimeType(ContentService.MimeType.JSON);
}

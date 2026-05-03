// ============================================================
//  MBG TRACKER – Google Apps Script (Code.gs)  v3 – Versi Guru
//  Paste kode ini di: script.google.com → New Project
//  Lalu Deploy → New Deployment → Web App
//    Execute as: Me
//    Who has access: Anyone
// ============================================================

var SPREADSHEET_ID = "1NsPx0F0eYdipUNROnK28baL0_ncKI9auOXWbLrvfZHc";
var SHEET_NAME     = "Sheet1";

// ── doPost: menerima data dari website ───────────────────────
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action || "add";   // "add" atau "delete"
    var kelas  = data.kelas  || "";
    var guru   = data.guru   || "—";

    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    // ── ACTION: DELETE ──────────────────────────────────────
    if (action === "delete") {
      if (!kelas) {
        return jsonResponse({ result: "error", message: "Kelas tidak boleh kosong" });
      }

      var lastRow    = sheet.getLastRow();
      var deletedCount = 0;

      // Loop dari bawah ke atas agar index tidak bergeser saat hapus
      for (var i = lastRow; i >= 2; i--) {
        var nilaiKelas = sheet.getRange(i, 1).getValue();
        if (nilaiKelas === kelas) {
          sheet.deleteRow(i);
          deletedCount++;
        }
      }

      return jsonResponse({
        result: "success",
        action: "delete",
        kelas: kelas,
        deleted: deletedCount
      });
    }

    // ── ACTION: ADD (default) ───────────────────────────────
    var status = data.status || "Tidak diketahui";

    // Waktu otomatis
    var now     = new Date();
    var tanggal = now.toLocaleDateString("id-ID", {
      day: "2-digit", month: "long", year: "numeric"
    });
    var jam = now.toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });

    // Buat header jika sheet masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Kelas", "Status", "Guru", "Tanggal", "Jam"]);
      var headerRange = sheet.getRange(1, 1, 1, 5);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#BBD5DA");
    }

    sheet.appendRow([kelas, status, guru, tanggal, jam]);

    return jsonResponse({
      result: "success",
      action: "add",
      kelas: kelas,
      status: status,
      guru: guru
    });

  } catch (err) {
    return jsonResponse({ result: "error", message: err.toString() });
  }
}

// ── doGet: cek apakah API aktif ──────────────────────────────
function doGet(e) {
  return jsonResponse({ result: "MBG Tracker API aktif ✅ (v3 – Versi Guru)" });
}

// ── Helper: buat JSON response ───────────────────────────────
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

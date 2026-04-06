/**
 * Lấy danh sách lịch sử thu chi
 * @returns {Array} Mảng các giao dịch thu chi
 */
function getSoTayData() {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_SOTAY);
  const data = sheet.getDataRange().getValues();
  
  let list = [];
  // Duyệt từ dòng 2 (bỏ qua tiêu đề)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // Nếu có ID giao dịch
      list.push({
        TRANSACTION_ID: data[i][0].toString(), // ← FIX: DataContext dùng TRANSACTION_ID
        CREATED_AT:  data[i][1],            // ← FIX: DataContext dùng CREATED_AT
        TRANS_TYPE:  data[i][2],
        CATEGORY:   data[i][3],
        AMOUNT:    Number(data[i][4]) || 0,
        NOTES:    data[i][5] || ""
      });
    }
  }
  // Trả về danh sách đảo ngược (mới nhất lên đầu)
  return list.reverse();
}

/**
 * Thêm một giao dịch thu chi mới từ App
 * @param {Object} payload Dữ liệu giao dịch
 */
function addSoTayEntry(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_SOTAY);
  
  const id = "TXN-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);
  const ngay = new Date();
  const phanLoai = payload.TRANS_TYPE || "Chi";
  const danhMuc = payload.CATEGORY || "Khác";
  const soTien = Number(payload.AMOUNT) || 0;
  const ghiChu = payload.NOTES || "";

  sheet.appendRow([
    id,
    ngay,
    phanLoai,
    danhMuc,
    soTien,
    ghiChu
  ]);

  return { id: id, message: "Ghi sổ thành công" };
}

/**
 * Xóa một giao dịch sổ tay theo ID
 * @param {Object} payload { id: "TXN-..." }
 */
function deleteSoTayEntry(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_SOTAY);
  const data = sheet.getDataRange().getValues();

  const idCanXoa = payload.id || payload.orderId; // hỗ trợ cả 2 key
  if (!idCanXoa) throw new Error("Thiếu ID để xóa ghi chép sổ tay.");

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toString() === idCanXoa.toString()) {
      sheet.deleteRow(i + 1); // +1 vì index 0-based → số dòng sheet 1-based
      return { id: idCanXoa, message: "Đã xóa ghi chép " + idCanXoa };
    }
  }
  throw new Error("Không tìm thấy ghi chép: " + idCanXoa);
}
/**
 * ============================================================================
 * FILE: Helper.gs
 * CHỨC NĂNG: Hàm tiện ích dùng chung cho toàn bộ hệ thống
 *
 * BAO GỒM:
 *   successResponse()  → Đóng gói JSON phản hồi thành công
 *   errorResponse()    → Đóng gói JSON phản hồi lỗi
 *   generateOrderID()  → Tạo mã đơn hàng  VD: ORD-260304-8392
 *   generateSoTayID()  → Tạo mã sổ tay    VD: ST-260304-4721
 * ============================================================================
 */


/**
 * Đóng gói phản hồi thành công trả về App.
 * App kiểm tra: if (result.status === 'success') { ... }
 *
 * @param {*}      data    Dữ liệu trả về (mảng, object, string...)
 * @param {string} message Thông điệp mô tả (hiện trong console khi debug)
 */
function successResponse(data, message) {
  const response = {
    status:  "success",
    message: message || "Thành công",
    data:    data !== undefined ? data : null
  };
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Đóng gói phản hồi lỗi trả về App.
 * App kiểm tra: if (result.status === 'error') { showToast(result.message) }
 *
 * @param {string} message Mô tả lỗi (hiển thị trên toast đỏ của App)
 */
function errorResponse(message) {
  const response = {
    status:  "error",
    message: message || "Lỗi không xác định"
  };
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}


/**
 * Sinh mã đơn hàng tự động.
 * Format: ORD-[yyMMdd]-[4 số ngẫu nhiên]
 * Ví dụ:  ORD-260304-8392
 *
 * Dùng Session.getScriptTimeZone() để đảm bảo đúng ngày GMT+7,
 * tránh lệch ngày khi GAS chạy trên server múi giờ khác.
 */
function generateOrderID() {
  const now       = new Date();
  const timeZone  = Session.getScriptTimeZone();
  const dateStr   = Utilities.formatDate(now, timeZone, "yyMMdd");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return "ORD-" + dateStr + "-" + randomNum;
}


/**
 * Sinh mã sổ tay thu/chi tự động.
 * Format: ST-[yyMMdd]-[4 số ngẫu nhiên]
 * Ví dụ:  ST-260304-4721
 */
function generateSoTayID() {
  const now       = new Date();
  const timeZone  = Session.getScriptTimeZone();
  const dateStr   = Utilities.formatDate(now, timeZone, "yyMMdd");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return "ST-" + dateStr + "-" + randomNum;
}
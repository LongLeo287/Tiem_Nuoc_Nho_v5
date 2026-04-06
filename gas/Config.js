/**
 * ============================================================================
 * FILE: Config.gs
 * LAST PUSH: 2026-03-31 02:01 | Antigravity — Thêm chức năng Lock/Unlock và đưa Đơn Nháp lên Server
 * CHỨC NĂNG: Khai báo cấu hình và hằng số toàn hệ thống
 * ============================================================================
 */

const CONFIG = {
  // ─────────────────────────────────────────────────────────────────────────
  // VERSION: Mỗi lần push mới, dòng này được cập nhật để xác nhận đã deploy
  // ─────────────────────────────────────────────────────────────────────────
  GAS_VERSION: "2026-03-31 02:01 | Antigravity — System Drafts and Concurrent Locks",

  // ── ID Google Sheet (bắt buộc nếu GAS là standalone script) ───────────────
  SPREADSHEET_ID: "1eDKINZkDDsQWWhz54i0kSr7wzWAO3l5-6NAur5AvkwA",

  // ── 10 Sheets chính ────────────────────────────────────────────────────────
  SHEET_MENU: "MENU",
  SHEET_ORDERS: "ORDERS",
  SHEET_INVENTORY: "NGUYEN_LIEU",
  SHEET_RECIPE: "DINH_LUONG",
  SHEET_IMPORT: "NHAP_KHO",
  SHEET_FINANCE: "FINANCE_REPORT",
  SHEET_DASHBOARD: "DASHBOARD",
  SHEET_SOTAY: "SOTAY_THUCHI",
  SHEET_STAFF: "STAFF_MANAGEMENT",
  SHEET_CHAM_CONG: "CHAM_CONG",

  // ── Sheet bổ sung ──────────────────────────────────────────────────────────
  SHEET_EINVOICE_LOG: "EINVOICE_LOG", // ← BỔ SUNG: Log hóa đơn điện tử
  SHEET_BANG_LUONG:   "BANG_LUONG",   // ← BỔ SUNG: Bảng lương tổng hợp từ CHAM_CONG
};

/**
 * Hàm trả về Spreadsheet.
 * Dùng openById() để hoạt động cả với standalone script lẫn container-bound.
 */
function getActiveDB() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}


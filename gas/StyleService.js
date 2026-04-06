/**
 * ============================================================================
 * FILE: StyleService.gs — V3 FIXED
 * BRAND: Tiệm Nước Nhỏ — màu từ POS App (--color-primary: #C9252C)
 *
 * CÁC FIX so với V2:
 *   ✅ Không dùng applyRowBanding(999 rows) — tránh màu tràn vào hàng trống
 *   ✅ Alternating color chỉ áp dụng cho ĐÚNG SỐ HÀNG CÓ DỮ LIỆU
 *   ✅ Font size, weight, color riêng biệt theo cột
 *   ✅ resize cột bằng setColumnWidth() — đúng API GAS
 *   ✅ resize hàng bằng setRowHeight() — đúng API GAS
 *   ✅ Clear format hàng trống để không bị tràn màu
 *
 * CÁCH CHẠY: applyDesignSystem() hoặc tự động từ setupAllSheets()
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS — Brand colors từ index.css của POS App
// ─────────────────────────────────────────────────────────────
var DS = {
  // Brand
  RED: "#C9252C", // Header background
  RED_DARK: "#991b1b", // Accent / hover
  RED_TINT: "#fff5f5", // Alternating even rows

  // Neutrals (Stone palette)
  WHITE: "#ffffff", // Odd rows / background
  STONE_50: "#fafaf9",
  STONE_200: "#e7e5e4", // Border
  STONE_400: "#a8a29e", // Muted text
  STONE_600: "#57534e", // Secondary text
  STONE_900: "#1c1917", // Primary text

  // Tab Colors — cùng tone nóng
  TAB_SALES: "#C9252C", // MENU, ORDERS
  TAB_FINANCE: "#7f1d1d", // DASHBOARD, FINANCE_REPORT
  TAB_STOCK: "#9a3412", // NGUYEN_LIEU, NHAP_KHO, DINH_LUONG
  TAB_HR: "#92400e", // STAFF, CHAM_CONG
  TAB_CASH: "#b45309", // SOTAY_THUCHI
  TAB_INVOICE: "#7f1d1d", // EINVOICE_LOG

  // Sizing
  H_HEADER: 38, // Header row height
  H_DATA: 26, // Data row height
  FONT: "Arial",
  SZ_HEADER: 11,
  SZ_DATA: 10,
  SZ_SMALL: 9,
};

// Số hàng dữ liệu tối đa để style (tránh style 1000 hàng trống)
var MAX_STYLE_ROWS = 500;

// ─────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────
function applyDesignSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Utilities.sleep(100);

  _applySheet(ss, CONFIG.SHEET_MENU, DS.TAB_SALES, _colsMenu());
  _applySheet(ss, CONFIG.SHEET_ORDERS, DS.TAB_SALES, _colsOrders());
  _applySheet(ss, CONFIG.SHEET_INVENTORY, DS.TAB_STOCK, _colsNguyenLieu());
  _applySheet(ss, CONFIG.SHEET_RECIPE, DS.TAB_STOCK, _colsDinhLuong());
  _applySheet(ss, CONFIG.SHEET_IMPORT, DS.TAB_STOCK, _colsNhapKho());
  _applySheet(ss, CONFIG.SHEET_SOTAY, DS.TAB_CASH, _colsSoTay());
  _applySheet(ss, CONFIG.SHEET_STAFF, DS.TAB_HR, _colsStaff());
  _applySheet(ss, CONFIG.SHEET_CHAM_CONG, DS.TAB_HR, _colsChamCong());
  _applySheet(ss, CONFIG.SHEET_FINANCE, DS.TAB_FINANCE, _colsFinance());
  _applySheet(ss, CONFIG.SHEET_EINVOICE_LOG, DS.TAB_INVOICE, _colsEInvoice());
  _applyDashboard(ss);

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert("✅ Design đã được áp dụng đồng bộ!");
}

// ─────────────────────────────────────────────────────────────
// CỘT WIDTH CONFIGS
// ─────────────────────────────────────────────────────────────
// Format: [width, alignment, bold, color]
// alignment: 'L'=left, 'C'=center, 'R'=right
// bold: true/false
// color: hex string hoặc null (dùng mặc định DS.STONE_900)

function _colsMenu() {
  return [
    [95, "C", true, null], // MENU_ID
    [200, "L", true, DS.STONE_900], // MENU_NAME
    [110, "R", true, DS.RED_DARK], // PRICE — nổi bật
    [140, "L", false, DS.STONE_600], // CATEGORY
    [75, "C", false, null], // STATUS
    [75, "C", false, null], // HAS_CUSTOMIZATIONS
  ];
}

function _colsOrders() {
  return [
    [125, "C", true, DS.STONE_900], // ORDER_ID
    [155, "C", false, DS.STONE_600], // CREATED_AT
    [70, "C", true, null], // TABLE_NO
    [230, "L", false, DS.STONE_400], // ITEMS (JSON, muted)
    [110, "R", false, null], // SUBTOTAL
    [90, "R", false, DS.STONE_600], // DISCOUNT
    [90, "R", false, DS.STONE_600], // VAT_AMOUNT
    [120, "R", true, DS.RED], // TOTAL_AMOUNT — quan trọng nhất
    [130, "C", true, null], // ORDER_STATUS
    [130, "C", false, DS.STONE_600], // THANH_TOAN
    [170, "L", false, null], // CUSTOMER_NAME
    [110, "C", false, null], // PHONE
    [200, "L", false, DS.STONE_400], // NOTES (muted)
  ];
}

function _colsNguyenLieu() {
  return [
    [90, "C", true, null], // MATERIAL_ID
    [180, "L", true, DS.STONE_900], // MATERIAL_NAME
    [75, "C", false, DS.STONE_600], // UNIT
    [90, "R", true, null], // STOCK_QTY
    [110, "R", false, DS.STONE_600], // ALERT_QTY
    [130, "C", true, null], // STOCK_STATUS
    [150, "C", false, DS.STONE_400], // LAST_UPDATED
  ];
}

function _colsDinhLuong() {
  return [
    [90, "C", true, null], // MENU_ID
    [180, "L", false, null], // MENU_NAME
    [90, "C", false, DS.STONE_600], // MATERIAL_ID
    [180, "L", false, null], // MATERIAL_NAME
    [90, "R", true, null], // QUANTITY
    [80, "C", false, DS.STONE_600], // UNIT
    [200, "L", false, DS.STONE_400], // NOTES
  ];
}

function _colsNhapKho() {
  return [
    [110, "C", true, null], // IMPORT_ID
    [150, "C", false, DS.STONE_600], // CREATED_AT
    [90, "C", false, null], // MATERIAL_ID
    [100, "R", true, null], // IMPORT_QTY
    [110, "R", false, null], // UNIT_PRICE
    [200, "L", false, DS.STONE_400], // NOTES
    [120, "R", true, DS.RED_DARK], // TOTAL_ITEM_PRICE — nổi bật
  ];
}

function _colsSoTay() {
  return [
    [100, "C", true, null], // TRANSACTION_ID
    [150, "C", false, DS.STONE_600], // CREATED_AT
    [80, "C", true, null], // TRANS_TYPE (THU/CHI)
    [160, "L", false, null], // CATEGORY
    [120, "R", true, DS.RED_DARK], // AMOUNT
    [210, "L", false, DS.STONE_400], // NOTES
    [160, "L", false, DS.STONE_600], // CREATED_BY
  ];
}

function _colsStaff() {
  return [
    [80, "C", true, null], // STAFF_ID
    [180, "L", true, DS.STONE_900], // STAFF_NAME
    [115, "C", false, null], // PHONE
    [130, "C", false, null], // POSITION
    [110, "C", false, DS.STONE_600], // EMPLOYMENT_TYPE
    [120, "R", true, DS.RED_DARK], // BASE_SALARY
    [110, "C", false, DS.STONE_600], // START_DATE
    [80, "C", false, null], // STATUS
    [200, "L", false, DS.STONE_400], // NOTES
  ];
}

function _colsChamCong() {
  return [
    [120, "C", true, null], // LOG_ID
    [100, "C", false, null], // date
    [80, "C", true, null], // STAFF_ID
    [85, "C", false, null], // TIME_IN
    [85, "C", false, null], // TIME_OUT
    [85, "R", true, null], // TOTAL_HOURS
    [130, "R", true, DS.RED_DARK], // ESTIMATED_SALARY
    [90, "C", false, DS.STONE_600], // MONTH_YEAR
    [200, "L", false, DS.STONE_400], // NOTES
  ];
}

function _colsFinance() {
  return [
    [120, "C", true, null], // Mã Đơn
    [150, "C", false, DS.STONE_600], // Ngày
    [130, "R", false, null], // Doanh Thu Trước Thuế
    [130, "R", false, DS.STONE_600], // Thuế HKD
    [130, "R", true, DS.RED_DARK], // Doanh Thu Ròng
    [120, "R", false, DS.STONE_400], // Tiền Hủy Đơn
  ];
}

function _colsEInvoice() {
  return [
    [120, "C", true, null], // LOG_ID
    [120, "C", true, null], // ORDER_ID
    [150, "C", false, DS.STONE_600], // timestamp
    [120, "R", false, null], // amount
    [120, "R", false, null], // TAX_AMOUNT
    [100, "C", true, null], // status
    [120, "C", false, DS.STONE_600], // INVOICE_NO
    [80, "C", false, null], // PROVIDER
    [200, "L", false, DS.STONE_400], // ERROR_MSG
  ];
}

// ─────────────────────────────────────────────────────────────
// CORE: ÁP DỤNG STYLE CHO 1 SHEET
// ─────────────────────────────────────────────────────────────
function _applySheet(ss, sheetName, tabColor, colDefs) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log("[Style] NOT FOUND: " + sheetName);
    return;
  }

  var numCols = colDefs.length;
  var lastRow = sheet.getLastRow();
  var dataRows = Math.min(Math.max(lastRow - 1, 0), MAX_STYLE_ROWS);

  // 1) Tab color
  sheet.setTabColor(tabColor);

  // 2) Clear tất cả định dạng cũ (header + data)
  if (lastRow > 0) {
    sheet.getRange(1, 1, lastRow, numCols).clearFormat();
  }

  // 3) Style Header (Hàng 1)
  _styleHeader(sheet, numCols);

  // 4) Style Data rows (chỉ hàng có data)
  if (dataRows > 0) {
    _styleDataRows(sheet, numCols, dataRows, colDefs);
  }

  // 5) Resize cột
  _resizeCols(sheet, colDefs);

  // 6) Resize hàng
  sheet.setRowHeight(1, DS.H_HEADER);
  if (dataRows > 0) {
    sheet.setRowHeights(2, dataRows, DS.H_DATA);
  }

  // 7) Borders (chỉ trên vùng có data)
  if (lastRow > 0) {
    var totalRows = Math.min(lastRow, MAX_STYLE_ROWS + 1);
    _drawBorders(sheet, totalRows, numCols);
  }

  // 8) Freeze
  sheet.setFrozenRows(1);

  Logger.log("[Style] " + sheetName + " ✅ (dataRows=" + dataRows + ")");
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function _styleHeader(sheet, numCols) {
  var hdr = sheet.getRange(1, 1, 1, numCols);
  hdr
    .setBackground(DS.RED)
    .setFontColor(DS.WHITE)
    .setFontFamily(DS.FONT)
    .setFontSize(DS.SZ_HEADER)
    .setFontWeight("bold")
    .setFontStyle("normal")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setWrap(false);
}

function _styleDataRows(sheet, numCols, dataRows, colDefs) {
  var alignMap = { L: "left", C: "center", R: "right" };

  // Base style cho toàn vùng data
  var fullRange = sheet.getRange(2, 1, dataRows, numCols);
  fullRange
    .setFontFamily(DS.FONT)
    .setFontSize(DS.SZ_DATA)
    .setFontStyle("normal")
    .setVerticalAlignment("middle")
    .setWrap(false);

  // Alternating row colors — chỉ trên data rows thực tế
  for (var r = 2; r <= dataRows + 1; r++) {
    var rowColor = r % 2 === 0 ? DS.WHITE : DS.RED_TINT;
    sheet.getRange(r, 1, 1, numCols).setBackground(rowColor);
  }

  // Per-column styling (alignment, bold, color)
  for (var c = 0; c < colDefs.length; c++) {
    var def = colDefs[c];
    var align = alignMap[def[1]] || "left";
    var isBold = def[2];
    var color = def[3] || DS.STONE_900;

    var colRange = sheet.getRange(2, c + 1, dataRows, 1);
    colRange.setHorizontalAlignment(align);
    if (isBold) colRange.setFontWeight("bold");
    colRange.setFontColor(color);
  }
}

function _resizeCols(sheet, colDefs) {
  for (var i = 0; i < colDefs.length; i++) {
    sheet.setColumnWidth(i + 1, colDefs[i][0]);
  }
}

function _drawBorders(sheet, totalRows, numCols) {
  if (totalRows < 1) return;
  // Outer border đậm (màu red nhạt)
  sheet
    .getRange(1, 1, totalRows, numCols)
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      DS.RED_TINT,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM,
    );
  // Inner grid mỏng (stone-200)
  sheet
    .getRange(1, 1, totalRows, numCols)
    .setBorder(
      null,
      null,
      null,
      null,
      true,
      true,
      DS.STONE_200,
      SpreadsheetApp.BorderStyle.SOLID,
    );
  // Đường kẻ dưới header đậm hơn
  sheet
    .getRange(1, 1, 1, numCols)
    .setBorder(
      null,
      null,
      true,
      null,
      null,
      null,
      DS.RED,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM,
    );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD — Style đặc biệt (không dùng alternating, per-row color riêng)
// ─────────────────────────────────────────────────────────────
function _applyDashboard(ss) {
  var sheet = ss.getSheetByName(CONFIG.SHEET_DASHBOARD);
  if (!sheet) return;

  sheet.setTabColor(DS.TAB_FINANCE);

  var lastRow = sheet.getLastRow();
  var numCols = 3;
  if (lastRow < 1) return;

  // Clear cũ
  sheet.getRange(1, 1, lastRow, numCols).clearFormat();

  // Header
  _styleHeader(sheet, numCols);
  sheet.setRowHeight(1, DS.H_HEADER);

  // Không dùng alternating — DASHBOARD có màu per-row được set bởi SetupService
  // Chỉ set font cho toàn bộ data
  if (lastRow > 1) {
    var dataRange = sheet.getRange(2, 1, lastRow - 1, numCols);
    dataRange
      .setFontFamily(DS.FONT)
      .setFontStyle("normal")
      .setVerticalAlignment("middle")
      .setWrap(false);

    // Col A: label — bold, medium size
    sheet
      .getRange(2, 1, lastRow - 1, 1)
      .setFontSize(DS.SZ_DATA)
      .setFontWeight("bold")
      .setFontColor(DS.STONE_900)
      .setHorizontalAlignment("left");

    // Col B: value — lớn hơn, bold, màu đỏ brand, căn phải
    sheet
      .getRange(2, 2, lastRow - 1, 1)
      .setFontSize(12)
      .setFontWeight("bold")
      .setFontColor(DS.RED)
      .setHorizontalAlignment("right");

    // Col C: NOTES — nhỏ, italic, muted
    sheet
      .getRange(2, 3, lastRow - 1, 1)
      .setFontSize(DS.SZ_SMALL)
      .setFontStyle("italic")
      .setFontWeight("normal")
      .setFontColor(DS.STONE_400)
      .setHorizontalAlignment("left");

    // Row heights
    for (var i = 2; i <= lastRow; i++) {
      sheet.setRowHeight(i, 30);
    }
  }

  // Borders
  _drawBorders(sheet, lastRow, numCols);
  sheet.setFrozenRows(1);

  // Column widths
  sheet.setColumnWidth(1, 350);
  sheet.setColumnWidth(2, 210);
  sheet.setColumnWidth(3, 320);

  // Style đặc biệt TONG CONG (dòng cuối Finance ở row 1002 — không trong Dashboard)
  Logger.log("[Style] DASHBOARD ✅");
}

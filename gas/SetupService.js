/**
 * ============================================================================
 * FILE: SetupService.gs — V3 COMPLETE
 * CHỨC NĂNG: Khởi tạo / Sửa chữa toàn bộ cấu trúc Spreadsheet
 *
 * THAY ĐỔI SO VỚI V2:
 *   - Thêm sheet EINVOICE_LOG (được dùng bởi InvoiceService.gs)
 *   - Sửa NHAP_KHO: đúng thứ tự cột theo InventoryService.gs
 *     (A:ma_phieu B:thoi_gian C:ma_nl D:so_luong_nhap E:don_gia_nhap F:ghi_chu G:thanh_tien_nhap)
 *   - Sửa CHAM_CONG: thêm công thức tự động total_hours (F) và luong_tam_tinh (G)
 *   - Sửa NGUYEN_LIEU: thêm cột F (trang_thai_kho) và G (last_updated)
 *   - Sửa FINANCE_REPORT: liên kết trực tiếp từng dòng ORDERS bằng QUERY
 *   - DASHBOARD: thêm công thức lợi nhuận ròng tiêu chuẩn
 *
 * CÁCH CHẠY:
 *   Mở Apps Script Editor → chọn hàm setupAllSheets → nhấn ▶ Run
 *   Có thể chạy lại nhiều lần mà không mất dữ liệu.
 * ============================================================================
 */

// ============================================================================
// ENTRY POINT
// ============================================================================

function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();


  _setupMenu(ss);
  _setupOrders(ss);
  _setupNguyenLieu(ss);
  _setupDinhLuong(ss);
  _setupNhapKho(ss);
  _setupSoTay(ss);
  _setupStaff(ss);
  _setupChamCong(ss);
  _setupDashboard(ss);
  _setupFinanceReport(ss);
  _setupEInvoiceLog(ss); // ← MỚI

  // ── Áp dụng Design System đồng bộ cho toàn bộ sheets ──────
  applyDesignSystem();

  SpreadsheetApp.flush();
  Logger.log("=== SETUP + DESIGN HOÀN TẤT ===");
}

// ============================================================================
// HELPERS
// ============================================================================

function _getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function _setHeader(sheet, headers, bgColor) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  range
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground(bgColor || "#f3f4f6")
    .setFontColor("#1f2937")
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);
}

function _checkbox(sheet, col, fromRow, toRow) {
  sheet
    .getRange(fromRow, col, toRow - fromRow + 1, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireCheckbox()
        .setAllowInvalid(false)
        .build(),
    );
}

function _dropdownValidation(sheet, col, fromRow, toRow, values) {
  sheet
    .getRange(fromRow, col, toRow - fromRow + 1, 1)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireValueInList(values, true)
        .setAllowInvalid(false)
        .build(),
    );
}

function _autoResizeCols(sheet, numCols) {
  for (var i = 1; i <= numCols; i++) {
    sheet.autoResizeColumn(i);
  }
}

// ============================================================================
// 1. MENU
// Cột: ma_mon | ten_mon | gia_ban | danh_muc | trang_thai | has_customizations
// ============================================================================

function _setupMenu(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_MENU);
  _setHeader(
    sheet,
    [
      "MENU_ID",
      "MENU_NAME",
      "PRICE",
      "CATEGORY",
      "STATUS",
      "HAS_CUSTOMIZATIONS",
    ],
    "#dbeafe",
  );
  sheet.getRange("C2:C1000").setNumberFormat("#,##0");
  _checkbox(sheet, 5, 2, 1000);
  _checkbox(sheet, 6, 2, 1000);
  _dropdownValidation(sheet, 4, 2, 1000, [
    "Cà phê",
    "Trà",
    "Trà Trái Cây",
    "Sinh tố",
    "Nước ép",
    "Sữa & Cacao",
    "Sữa chua",
    "Giải khát",
    "Nước ngọt",
    "Thuốc Lá",
    "Khác",
  ]);
  _autoResizeCols(sheet, 6);
  Logger.log("[Setup] MENU ✅");
}

// ============================================================================
// 2. ORDERS
// Cột: ORDER_ID | TIMESTAMP | TABLE_NO | ITEMS | SUBTOTAL | DISCOUNT |
//       VAT_AMOUNT | THANH_TIEN | TRANG_THAI | THANH_TOAN | CUSTOMER_NAME |
//       PHONE | NOTES
// ============================================================================

function _setupOrders(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_ORDERS);
  _setHeader(
    sheet,
        [
      "ORDER_ID",       // A (1)
      "CREATED_AT",     // B (2)
      "TABLE_NO",       // C (3)
      "ITEMS",          // D (4)
      "NOTES",          // E (5)
      "SUBTOTAL",       // F (6)
      "DISCOUNT",       // G (7)
      "VAT_AMOUNT",     // H (8)
      "TOTAL_AMOUNT",   // I (9)
      "ORDER_STATUS",   // J (10)
      "PAYMENT_METHOD", // K (11)
      "BRANCH_NAME",    // L (12)
      "PAYMENT_STATUS", // M (13)
      "LOCKED_BY",      // N (14)
      "LOCKED_AT",      // O (15)
    ],
    "#dcfce7",
  );

  ["F", "G", "H", "I"].forEach(function (col) {
    sheet.getRange(col + "2:" + col + "1000").setNumberFormat("#,##0");
  });
  sheet.getRange("B2:B1000").setNumberFormat("yyyy-mm-dd hh:mm:ss");

  // Col K (11): trạng thái đơn hàng
  _dropdownValidation(sheet, 11, 2, 1000, [
    "Chờ xử lý",
    "Đã nhận",
    "Đang làm",
    "Hoàn thành",
    "Đã hủy",
  ]);
  // Col L (12): phương thức thanh toán
  _dropdownValidation(sheet, 12, 2, 1000, [
    "Tiền mặt",
    "Chuyển khoản",
    "MoMo",
    "VNPay",
    "Chưa xác định",
  ]);
  // Col M (13): trạng thái thanh toán
  _dropdownValidation(sheet, 13, 2, 1000, [
    "Chưa thanh toán",
    "Chờ thanh toán",
    "Đã thanh toán",
    "Công nợ",
  ]);

  // Làm rộng cột ITEMS (chứa JSON)
  sheet.setColumnWidth(5, 250);
  _autoResizeCols(sheet, 3);
  sheet.autoResizeColumn(7);
  sheet.autoResizeColumn(8);
  sheet.autoResizeColumn(9);
  sheet.autoResizeColumn(10);
  Logger.log("[Setup] ORDERS ✅");
}

// ============================================================================
// 3. NGUYEN_LIEU (Tồn kho nguyên liệu)
// Cột: ma_nl | ten_nl | don_vi | ton_kho | muc_canh_bao | trang_thai_kho | last_updated
// Lưu ý: InventoryService.gs ghi vào cột D (ton_kho)
// ============================================================================

function _setupNguyenLieu(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_INVENTORY);
  _setHeader(
    sheet,
    [
      "MATERIAL_ID",
      "MATERIAL_NAME",
      "UNIT",
      "STOCK_QTY",
      "ALERT_QTY",
      "STOCK_STATUS",
      "LAST_UPDATED",
    ],
    "#fef9c3",
  );
  sheet.getRange("D2:E1000").setNumberFormat("#,##0.##");
  sheet.getRange("G2:G1000").setNumberFormat("yyyy-mm-dd hh:mm:ss");

  // Công thức tự động tại cột F: trang_thai_kho
  var lastRow = Math.max(sheet.getLastRow(), 2);
  var maxRow = Math.max(lastRow, 200);
  for (var i = 2; i <= maxRow; i++) {
    sheet
      .getRange(i, 6)
      .setFormula(
        "=IF(D" +
          i +
          '="","",IF(D' +
          i +
          '<=0,"🔴 HẾT HÀNG",IF(D' +
          i +
          "<E" +
          i +
          ',"⚠️ THẤP","✅ ĐỦ HÀNG")))',
      );
  }

  _autoResizeCols(sheet, 7);
  Logger.log("[Setup] NGUYEN_LIEU ✅");
}

// ============================================================================
// 4. DINH_LUONG (Định mức nguyên liệu cho từng món)
// Cột: ma_mon | ten_mon | ma_nl | ten_nl | dinh_luong | don_vi | ghi_chu
// ============================================================================

function _setupDinhLuong(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_RECIPE);
  _setHeader(
    sheet,
    ["MENU_ID", "MENU_NAME", "MATERIAL_ID", "MATERIAL_NAME", "QUANTITY", "UNIT", "NOTES"],
    "#f3e8ff",
  );
  sheet.getRange("E2:E1000").setNumberFormat("#,##0.###");
  _autoResizeCols(sheet, 7);
  Logger.log("[Setup] DINH_LUONG ✅");
}

// ============================================================================
// 5. NHAP_KHO (Phiếu nhập kho)
//
// QUAN TRỌNG: Thứ tự cột phải khớp chính xác với InventoryService.gs:
//   A: ma_phieu | B: thoi_gian | C: ma_nl | D: so_luong_nhap |
//   E: don_gia_nhap | F: ghi_chu | G: thanh_tien_nhap (= D * E, công thức)
//
// InventoryService.gs ghi 6 cột A-F, cột G là công thức sheet tự tính.
// ============================================================================

function _setupNhapKho(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_IMPORT);
  _setHeader(
    sheet,
    [
      "IMPORT_ID",
      "CREATED_AT",
      "MATERIAL_ID",
      "IMPORT_QTY",
      "UNIT_PRICE",
      "ITEM_NOTES",
      "TOTAL_ITEM_PRICE",
      "TOTAL_IMPORT_PRICE",
      "SUPPLIER",
      "GENERAL_NOTES",
    ],
    "#ffedd5",
  );

  sheet.getRange("B2:B1000").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange("D2:D1000").setNumberFormat("#,##0.##"); // Số lượng
  sheet.getRange("E2:E1000").setNumberFormat("#,##0"); // Đơn giá
  sheet.getRange("G2:G1000").setNumberFormat("#,##0"); // Thành tiền

  // Cột G: Thành tiền = so_luong × don_gia (chỉ khi D và E đều có số)
  for (var i = 2; i <= 500; i++) {
    sheet
      .getRange(i, 7)
      .setFormula(
        "=IF(OR(D" +
          i +
          '="",E' +
          i +
          '=""),"",IFERROR(D' +
          i +
          "*E" +
          i +
          ",0))",
      );
  }

  _autoResizeCols(sheet, 7);
  Logger.log("[Setup] NHAP_KHO ✅");
}

// ============================================================================
// 6. SOTAY_THUCHI (Sổ tay Thu Chi)
// Cột: id_thu_chi | thoi_gian | phan_loai | danh_muc | so_tien | ghi_chu | nguoi_tao
// ============================================================================

function _setupSoTay(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_SOTAY);
  _setHeader(
    sheet,
    [
      "TRANSACTION_ID",
      "CREATED_AT",
      "TRANS_TYPE",
      "CATEGORY",
      "AMOUNT",
      "NOTES",
      "CREATED_BY",
    ],
    "#fce7f3",
  );
  sheet.getRange("B2:B1000").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange("E2:E1000").setNumberFormat("#,##0");

  _dropdownValidation(sheet, 3, 2, 1000, ["Thu", "Chi"]);
  _dropdownValidation(sheet, 4, 2, 1000, [
    "Doanh thu bán hàng",
    "Thu khác",
    "Nguyên vật liệu",
    "Lương nhân viên",
    "Thuê mặt bằng",
    "Điện nước",
    "Thiết bị & sửa chữa",
    "Marketing",
    "Chi phí vận hành",
    "Chi khác",
  ]);
  _autoResizeCols(sheet, 6); // 6 cột (bỏ nguoi_tao)
  Logger.log("[Setup] SOTAY_THUCHI ✅");
}

// ============================================================================
// 7. STAFF_MANAGEMENT (Quản lý nhân viên)
// Cột: ma_nv | ten_nv | sdt | vi_tri | loai_hinh | muc_luong | ngay_vao_lam | trang_thai | note
// Lưu ý: StaffService.gs ghi vào cột H (trang_thai = checkbox)
// ============================================================================

function _setupStaff(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_STAFF);
  _setHeader(
    sheet,
    [
      "STAFF_ID",
      "STAFF_NAME",
      "PHONE",
      "POSITION",
      "EMPLOYMENT_TYPE",
      "BASE_SALARY",
      "START_DATE",
      "STATUS",
      "NOTES",
    ],
    "#e0f2fe",
  );
  sheet.getRange("F2:F1000").setNumberFormat("#,##0"); // Mức lương
  sheet.getRange("G2:G1000").setNumberFormat("yyyy-mm-dd"); // Ngày vào làm

  _dropdownValidation(sheet, 4, 2, 1000, [
    "Pha chế",
    "Phục vụ",
    "Thu ngân",
    "Quản lý",
    "Khác",
  ]);
  _dropdownValidation(sheet, 5, 2, 1000, [
    "Full-time",
    "Part-time",
    "Thử việc",
  ]);
  _checkbox(sheet, 8, 2, 1000); // Cột H: Đang làm việc

  _autoResizeCols(sheet, 9);
  Logger.log("[Setup] STAFF_MANAGEMENT ✅");
}

// ============================================================================
// 8. CHAM_CONG (Chấm công - Nhật ký vào/ra)
// Cột: log_id | date | ma_nv | time_in | time_out | total_hours | luong_tam_tinh | month_year | note
//
// QUAN TRỌNG:
//   - StaffService.gs ghi 8 cột (A-H) trực tiếp bằng appendRow
//   - Cột F (total_hours): GAS tự tính = (time_out - time_in) bằng code
//   - Cột G (luong_tam_tinh): Tính từ total_hours × mức lương/giờ của nhân viên
//   - Công thức sheet chỉ là BACKUP khi GAS không tính được
// ============================================================================

function _setupChamCong(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_CHAM_CONG);
  _setHeader(
    sheet,
    [
      "LOG_ID",
      "WORK_DATE",
      "STAFF_ID",
      "TIME_IN",
      "TIME_OUT",
      "TOTAL_HOURS",
      "ESTIMATED_SALARY",
      "MONTH_YEAR",
      "NOTES",
    ],
    "#f0fdf4",
  );

  sheet.getRange("B2:B1000").setNumberFormat("yyyy-mm-dd");
  sheet.getRange("F2:F1000").setNumberFormat("0.00"); // Tổng giờ (thập phân)
  sheet.getRange("G2:G1000").setNumberFormat("#,##0"); // Lương tạm tính

  // Các cột: D (time_in), E (time_out) — dạng text "HH:mm:ss" do GAS ghi
  // Không set công thức ARRAYFORMULA vì GAS ghi từng dòng

  _autoResizeCols(sheet, 9);
  Logger.log("[Setup] CHAM_CONG ✅");
}

// ============================================================================
// 9. DASHBOARD — 18 KPIs tự động từ toàn bộ sheets
// ============================================================================

function _setupDashboard(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_DASHBOARD);

  // Header
  sheet
    .getRange("A1")
    .setValue("KPI_NAME")
    .setFontWeight("bold")
    .setBackground("#1d4ed8")
    .setFontColor("white");
  sheet
    .getRange("B1")
    .setValue("VALUE")
    .setFontWeight("bold")
    .setBackground("#1d4ed8")
    .setFontColor("white");
  sheet
    .getRange("C1")
    .setValue("NOTES")
    .setFontWeight("bold")
    .setBackground("#1d4ed8")
    .setFontColor("white");
  sheet.setFrozenRows(1);

  var rows = [
    // ── DOANH THU ────────────────────────────────────────────────────────────
    [
      "🏆 DOANH THU NĂM (lũy kế)",
      '=IFERROR(SUMIF(ORDERS!K2:K,"Hoàn thành",ORDERS!J2:J),0)',
      "⚠️ GAS đọc ô B2 để kích hoạt hóa đơn điện tử",
      "#fef08a",
    ],

    [
      "📅 Doanh thu hôm nay",
      '=IFERROR(SUMPRODUCT((ORDERS!K2:K="Hoàn thành")*(LEFT(TEXT(ORDERS!B2:B,"yyyy-mm-dd"),10)=TEXT(TODAY(),"yyyy-mm-dd"))*ORDERS!J2:J),0)',
      "",
      "#f0fdf4",
    ],

    [
      "📆 Doanh thu tháng này",
      '=IFERROR(SUMPRODUCT((ORDERS!K2:K="Hoàn thành")*(LEFT(TEXT(ORDERS!B2:B,"yyyy-mm"),7)=TEXT(TODAY(),"yyyy-mm"))*ORDERS!J2:J),0)',
      "",
      "#f0fdf4",
    ],

    [
      "📆 Doanh thu tháng trước",
      '=IFERROR(SUMPRODUCT((ORDERS!K2:K="Hoàn thành")*(LEFT(TEXT(ORDERS!B2:B,"yyyy-mm"),7)=TEXT(EDATE(TODAY(),-1),"yyyy-mm"))*ORDERS!J2:J),0)',
      "",
      "#f0fdf4",
    ],

    // ── ĐƠN HÀNG ─────────────────────────────────────────────────────────────
    [
      "🛍️ Đơn hoàn thành hôm nay",
      '=IFERROR(SUMPRODUCT((ORDERS!K2:K="Hoàn thành")*(LEFT(TEXT(ORDERS!B2:B,"yyyy-mm-dd"),10)=TEXT(TODAY(),"yyyy-mm-dd"))),0)',
      "",
      "#eff6ff",
    ],

    [
      "🛍️ Đơn hoàn thành tháng này",
      '=IFERROR(SUMPRODUCT((ORDERS!K2:K="Hoàn thành")*(LEFT(TEXT(ORDERS!B2:B,"yyyy-mm"),7)=TEXT(TODAY(),"yyyy-mm"))),0)',
      "",
      "#eff6ff",
    ],

    [
      "⏳ Đơn đang chờ / đang làm",
      '=IFERROR(COUNTIF(ORDERS!K2:K,"Chờ xử lý")+COUNTIF(ORDERS!K2:K,"Đang làm")+COUNTIF(ORDERS!K2:K,"Đã nhận"),0)',
      "Cần xử lý ngay",
      "#fff7ed",
    ],

    [
      "❌ Đơn đã hủy (tháng này)",
      '=IFERROR(SUMPRODUCT((ORDERS!K2:K="Đã hủy")*(LEFT(TEXT(ORDERS!B2:B,"yyyy-mm"),7)=TEXT(TODAY(),"yyyy-mm"))),0)',
      "",
      "#fef2f2",
    ],

    // ── GIÁ TRỊ TRUNG BÌNH ───────────────────────────────────────────────────
    [
      "💰 Giá trị đơn trung bình (hôm nay)",
      "=IFERROR(B3/B6,0)",
      "Doanh thu hôm nay ÷ số đơn",
      "#eff6ff",
    ],

    // ── NGƯỠNG THUẾ HKD 2026 ─────────────────────────────────────────────────
    [
      "🚦 Trạng thái ngưỡng thuế 2026",
      '=IF(B2>=500000000,"🚨 ĐÃ VƯỢT — Phải xuất HĐ điện tử",IF(B2>=450000000,"⚠️ GẦN NGƯỠNG 500M ("&TEXT(500000000-B2,"#,##0")&"đ còn lại)","✅ AN TOÀN ("&TEXT(500000000-B2,"#,##0")&"đ còn lại)"))',
      "Ngưỡng HKD: 500.000.000đ/năm (Nghị định 174/2025)",
      "#fef08a",
    ],

    [
      "💸 Thuế HKD ước tính (3.9% = 2.4% VAT + 1.5% PIT)",
      "=IF(B2>500000000,ROUND((B2-500000000)*0.039,0),0)",
      "Chỉ tính phần vượt ngưỡng 500M",
      "#fef2f2",
    ],

    // ── SỔ TAY THU CHI ───────────────────────────────────────────────────────
    [
      "💵 Tổng THU tháng này (Sổ tay)",
      '=IFERROR(SUMPRODUCT((SOTAY_THUCHI!C2:C="Thu")*(LEFT(TEXT(SOTAY_THUCHI!B2:B,"yyyy-mm"),7)=TEXT(TODAY(),"yyyy-mm"))*SOTAY_THUCHI!E2:E),0)',
      "",
      "#f0fdf4",
    ],

    [
      "💸 Tổng CHI tháng này (Sổ tay)",
      '=IFERROR(SUMPRODUCT((SOTAY_THUCHI!C2:C="Chi")*(LEFT(TEXT(SOTAY_THUCHI!B2:B,"yyyy-mm"),7)=TEXT(TODAY(),"yyyy-mm"))*SOTAY_THUCHI!E2:E),0)',
      "",
      "#fef2f2",
    ],

    [
      "📊 Dòng tiền ròng tháng này",
      "=B13-B14",
      "Thu - Chi (Sổ tay)",
      "#f0fdf4",
    ],

    // ── NHÂN SỰ & KHO ────────────────────────────────────────────────────────
    [
      "👥 Tổng lương tháng này (Chấm công)",
      '=IFERROR(SUMPRODUCT((CHAM_CONG!H2:H=TEXT(TODAY(),"mm/yyyy"))*CHAM_CONG!G2:G),0)',
      "Lấy từ cột luong_tam_tinh",
      "#eff6ff",
    ],

    [
      "📦 Chi phí nhập kho tháng này",
      '=IFERROR(SUMPRODUCT((LEFT(TEXT(NHAP_KHO!B2:B,"yyyy-mm"),7)=TEXT(TODAY(),"yyyy-mm"))*IFERROR(NHAP_KHO!G2:G,0)),0)',
      "Tổng cột thanh_tien_nhap",
      "#fff7ed",
    ],

    [
      "⚠️ Nguyên liệu cần nhập (tồn kho thấp)",
      '=IFERROR(COUNTIF(NGUYEN_LIEU!F2:F,"⚠️ THẤP")+COUNTIF(NGUYEN_LIEU!F2:F,"🔴 HẾT HÀNG"),0)',
      "Xem sheet NGUYEN_LIEU để biết chi tiết",
      "#fef2f2",
    ],

    // ── LỢI NHUẬN ────────────────────────────────────────────────────────────
    [
      "🏦 Lợi nhuận ước tính tháng này",
      "=B4-B12-B14-B16-B17",
      "Doanh thu tháng - Thuế - Chi sổ tay - Lương - Nhập kho",
      "#fef08a",
    ],
  ];

  for (var i = 0; i < rows.length; i++) {
    var rowNum = i + 2;
    var r = rows[i];
    sheet.getRange(rowNum, 1).setValue(r[0]).setFontWeight("bold");
    sheet.getRange(rowNum, 2).setFormula(r[1]);
    if (r[2]) {
      sheet
        .getRange(rowNum, 3)
        .setValue(r[2])
        .setFontColor("#6b7280")
        .setFontStyle("italic");
    }
    sheet.getRange(rowNum, 1, 1, 3).setBackground(r[3] || "#ffffff");
    // Dòng text (row 11 = trạng thái thuế): không format số
    if (i !== 9) {
      sheet.getRange(rowNum, 2).setNumberFormat("#,##0");
    }
  }

  sheet.setColumnWidth(1, 340);
  sheet.setColumnWidth(2, 190);
  sheet.setColumnWidth(3, 320);
  Logger.log("[Setup] DASHBOARD ✅ (19 KPIs)");
}

// ============================================================================
// 10. FINANCE_REPORT (Báo cáo tài chính theo đơn hàng)
// Cột: Ma Đơn | Ngày | Doanh Thu | Thuế HKD | Doanh Thu Ròng | Tiền Hủy Đơn
//
// Dữ liệu được lấy qua QUERY từ ORDERS, không dùng ARRAYFORMULA để tránh conflict
// ============================================================================

function _setupFinanceReport(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_FINANCE);

  _setHeader(
    sheet,
    [
      "ORDER_ID",
      "REPORT_DATE",
      "PRE_TAX_REVENUE",
      "TAX_AMOUNT",
      "NET_REVENUE",
      "CANCELED_AMOUNT",
    ],
    "#fce7f3",
  );

  sheet.getRange("C2:F1000").setNumberFormat("#,##0");
  sheet.getRange("B2:B1000").setNumberFormat("yyyy-mm-dd");

  // Ghi chú hướng dẫn ở dòng 2 và 3
  sheet
    .getRange("A2")
    .setValue("← Dữ liệu được GAS tự động ghi mỗi khi có đơn hoàn thành")
    .setFontColor("#9ca3af")
    .setFontStyle("italic");

  // Dòng TỔNG CỘNG cố định ở hàng 1002
  var summaryRow = 1002;
  sheet
    .getRange(summaryRow, 1)
    .setValue("TỔNG CỘNG")
    .setFontWeight("bold")
    .setBackground("#fbbf24");
  sheet.getRange(summaryRow, 2).setValue("").setBackground("#fbbf24");
  sheet
    .getRange(summaryRow, 3)
    .setFormula("=IFERROR(SUM(C3:C1001),0)")
    .setFontWeight("bold")
    .setBackground("#fbbf24")
    .setNumberFormat("#,##0");
  sheet
    .getRange(summaryRow, 4)
    .setFormula("=IFERROR(SUM(D3:D1001),0)")
    .setFontWeight("bold")
    .setBackground("#fbbf24")
    .setNumberFormat("#,##0");
  sheet
    .getRange(summaryRow, 5)
    .setFormula("=IFERROR(SUM(E3:E1001),0)")
    .setFontWeight("bold")
    .setBackground("#fbbf24")
    .setNumberFormat("#,##0");
  sheet
    .getRange(summaryRow, 6)
    .setFormula("=IFERROR(SUM(F3:F1001),0)")
    .setFontWeight("bold")
    .setBackground("#fbbf24")
    .setNumberFormat("#,##0");

  _autoResizeCols(sheet, 6);
  Logger.log("[Setup] FINANCE_REPORT ✅");
}

// ============================================================================
// 11. EINVOICE_LOG — MỚI
// Dùng bởi InvoiceService.gs để ghi log mỗi lần phát hành hóa đơn điện tử
//
// Cột: log_id | order_id | timestamp | amount | tax_amount | status |
//       invoice_no | provider | error_msg
// ============================================================================

function _setupEInvoiceLog(ss) {
  var sheet = _getOrCreate(ss, CONFIG.SHEET_EINVOICE_LOG);

  _setHeader(
    sheet,
    [
      "LOG_ID",
      "ORDER_ID",
      "CREATED_AT",
      "AMOUNT",
      "TAX_AMOUNT",
      "STATUS",
      "INVOICE_NO",
      "PROVIDER",
      "ERROR_MSG",
    ],
    "#fee2e2",
  );

  sheet.getRange("C2:C1000").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  sheet.getRange("D2:E1000").setNumberFormat("#,##0");

  _dropdownValidation(sheet, 6, 2, 1000, [
    "SUCCESS",
    "FAILED",
    "EXEMPT",
    "PENDING",
  ]);
  _dropdownValidation(sheet, 8, 2, 1000, ["VNPT", "VIETTEL", "MISA", "MANUAL"]);

  _autoResizeCols(sheet, 9);
  Logger.log("[Setup] EINVOICE_LOG ✅");
}

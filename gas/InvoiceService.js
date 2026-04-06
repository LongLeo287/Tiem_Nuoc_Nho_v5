/**
 * ============================================================================
 * FILE: InvoiceService.gs
 * CHỨC NĂNG: Xử lý Hóa đơn Điện tử (E-Invoice)
 * CHÍNH SÁCH 2026: Tự động kích hoạt khi doanh thu năm vượt 500.000.000 VNĐ
 * ============================================================================
 */

const REVENUE_THRESHOLD = 500000000;

/**
 * Kiểm tra và phát hành hóa đơn điện tử nếu cần thiết.
 * @param {Object} orderData Dữ liệu đơn hàng vừa tạo
 */
function processEInvoice(orderData) {
  const annualRevenue = getAnnualRevenue();

  if (annualRevenue > REVENUE_THRESHOLD) {
    console.log(
      `[E-INVOICE] Ngưỡng 500M đã vượt. Bắt đầu phát hành hóa đơn cho đơn: ${orderData.orderId}`,
    );
    return triggerInvoiceAPI(orderData);
  } else {
    console.log(
      `[E-INVOICE] Doanh thu hiện tại (${annualRevenue}) chưa chạm ngưỡng. Bỏ qua phát hành tự động.`,
    );
    return { status: "EXEMPT", message: "Dưới ngưỡng 500tr" };
  }
}

/**
 * Giả lập việc lấy tổng doanh thu từ sheet DASHBOARD hoặc FINANCE_REPORT
 */
function getAnnualRevenue() {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_DASHBOARD);
  if (!sheet) return 0;

  // Giả sử tổng doanh thu năm nằm ở ô B2 của Sheet Dashboard
  const revenue = sheet.getRange("B2").getValue();
  return Number(revenue) || 0;
}

/**
 * Logic kết nối API với nhà cung cấp hóa đơn điện tử (VNPT, Viettel, v.v.)
 */
function triggerInvoiceAPI(orderData) {
  // TODO: Implement Fetch with real API Key
  console.log("Connecting to E-Invoice Provider API...");

  return {
    status: "ISSUED",
    invoiceNo:
      "E-" +
      Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd") +
      "-" +
      orderData.orderId.split("-")[2],
    amount: orderData.thanhTien,
  };
}

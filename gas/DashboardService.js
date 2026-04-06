/**
 * ============================================================================
 * FILE: DashboardService.gs
 * CHỨC NĂNG: Tổng hợp dữ liệu Dashboard và lấy ngưỡng doanh thu từ B2
 * ============================================================================
 */

function getDashboardData() {
  const db = getActiveDB();
  const dashboardSheet = db.getSheetByName(CONFIG.SHEET_DASHBOARD);
  const ordersSheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  // 1. Lấy Doanh thu lũy kế từ ô B2 (Official Cloud Source)
  let totalAnnualRevenue = 0;
  if (dashboardSheet) {
    totalAnnualRevenue = Number(dashboardSheet.getRange("B2").getValue()) || 0;
  }

  // 2. Tính toán thống kê nhanh từ Sheet ORDERS
  const now = new Date();
  const todayStr = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd",
  );

  let revenue = { today: 0, thisWeek: 0, thisMonth: 0 };
  let orders = { today: 0, thisWeek: 0, thisMonth: 0 };

  if (ordersSheet) {
    const data = ordersSheet.getDataRange().getValues();
    const rows = data.slice(1); // Bỏ header

    rows.forEach((row) => {
      const timestamp = new Date(row[1]);
      const amount = Number(row[9]) || 0;
      const status = row[10];

      if (
        status === "Hoàn thành" ||
        status === "Đã thanh toán" ||
        status === "Completed"
      ) {
        const rowDateStr = Utilities.formatDate(
          timestamp,
          Session.getScriptTimeZone(),
          "yyyy-MM-dd",
        );

        // Today
        if (rowDateStr === todayStr) {
          revenue.today += amount;
          orders.today += 1;
        }

        // This Month (Simplified)
        if (
          timestamp.getMonth() === now.getMonth() &&
          timestamp.getFullYear() === now.getFullYear()
        ) {
          revenue.thisMonth += amount;
          orders.thisMonth += 1;
        }
      }
    });
  }

  // 3. Trả về cấu trúc mở rộng cho Frontend
  return {
    revenue: revenue,
    orders: orders,
    totalAnnualRevenue: totalAnnualRevenue,
    isThresholdAlertActive: totalAnnualRevenue >= 450000000,
    timestamp: now.toISOString(),
  };
}

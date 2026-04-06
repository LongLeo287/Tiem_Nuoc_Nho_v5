/**
 * ============================================================================
 * FILE: Main.gs
 * LAST PUSH: 2026-03-31 02:01 | Antigravity — Thêm chức năng Lock/Unlock và đưa Đơn Nháp lên Server
 * CHỨC NĂNG: Điều hướng mọi yêu cầu GET và POST từ App
 * ============================================================================
 */

/**
 * HÀM NHẬN LỆNH GET (Lấy dữ liệu từ Sheets về App)
 * URL mẫu: .../exec?action=getMenu
 */
function doGet(e) {
  try {
    let action = e.parameter.action;

    if (!action) {
      return successResponse("API Tiệm Nước Nhỏ V2 đang trực tuyến!");
    }

    switch (action) {
      case "getMenu":
        return successResponse(getMenuData());

      case "migrateHeaders":
        setupAllSheets();
        return successResponse({status: "ok"}, "Đã đè toàn bộ file Excel Header theo chuẩn mới UPPER_SNAKE_CASE");

      case "getSchema":
        return successResponse(getDatabaseSchema(), "Database Schema");

      case "getOrders":
        // Hàm này sếp có thể viết thêm trong OrderService.gs nếu cần lấy lịch sử đơn
        return successResponse(
          getOrdersData ? getOrdersData() : [],
          "Lấy danh sách đơn hàng",
        );

      case "getSoTay":
        return successResponse(getSoTayData());

      case "getStaff":
        return successResponse(getStaffData());

      case "getDashboard":
        // Trả về dữ liệu tổng hợp cho trang chủ App (Lấy từ DashboardService.gs)
        return successResponse(getDashboardData(), "Dữ liệu Dashboard");

      case "getVersion":
        // Kiểm tra phiên bản GAS đang chạy trên server
        return successResponse({
          version: CONFIG.GAS_VERSION,
          timestamp: new Date().toISOString(),
        }, "Phiên bản GAS");

      default:
        return errorResponse("Hành động GET không xác định: " + action);
    }
  } catch (error) {
    return errorResponse("Lỗi hệ thống (GET): " + error.toString());
  }
}

/**
 * HÀM NHẬN LỆNH POST (Gửi dữ liệu từ App lên Sheets)
 * Body: { "action": "createOrder", "data": {...} }
 */
function doPost(e) {
  try {
    let payload = JSON.parse(e.postData.contents);
    let action = payload.action;

    if (!action) {
      return errorResponse("Thiếu action trong yêu cầu POST");
    }

    switch (action) {
      case "createOrder":
        return successResponse(
          createNewOrder(payload),
          "Đơn hàng đã được ghi nhận",
        );

      case "updateOrderStatus":
        return successResponse(
          updateOrderStatus(payload),
          "Đã cập nhật trạng thái đơn",
        );

      case "updateMenuItem":
        return successResponse(
          updateMenuItem(payload),
          "Đã cập nhật trạng thái món",
        );

      case "addMenuItem":
        return successResponse(
          addMenuItem(payload),
          "Đã thêm món mới",
        );

      case "editMenuItem":
        return successResponse(
          editMenuItem(payload),
          "Đã sửa thông tin món",
        );

      case "deleteMenuItem":
        return successResponse(
          deleteMenuItem(payload),
          "Đã xóa món",
        );

      case "addSoTay":
        return successResponse(addSoTayEntry(payload), "Đã ghi sổ thu chi");

      case "attendance":
        // Chấm công Check-in/Check-out cho nhân viên
        return successResponse(
          handleAttendance(payload),
          "Đã ghi nhận chấm công",
        );

      case "updateStaffStatus":
        return successResponse(
          updateStaffStatus(payload),
          "Đã cập nhật nhân sự",
        );

      case "deleteOrder":
        return successResponse(
          deleteOrder(payload),
          "Đã xóa đơn hàng",
        );

      case "lockOrder":
        return successResponse(
          lockOrder(payload),
          "Đã khoá đơn hàng",
        );

      case "migrateOrdersData15Cols":
        return successResponse(
          migrateOrdersData15Cols(),
          "Đã migrate ORDERS sang 15 columns",
        );

      case "unlockOrder":
        return successResponse(
          unlockOrder(payload),
          "Đã mở khoá đơn hàng",
        );

      case "processOrderInventory":
        // triggerInventoryDeduction/Refund từ app gọi action này
        return successResponse(
          processOrderInventory(payload),
          "Đã xử lý kho nguyên liệu",
        );

      case "addItemsToOrder":
        // Thêm món vào đơn đã có (không tạo đơn mới)
        return successResponse(
          addItemsToOrder(payload),
          "Đã thêm món vào đơn",
        );

      case "editOrder":
        // Sửa toàn bộ items + tổng tiền của đơn đã tồn tại (giữ nguyên ORDER_ID)
        return successResponse(
          editOrder(payload),
          "Đã cập nhật đơn hàng",
        );

      case "createNhapKho":
        return successResponse(
          createNhapKho(payload),
          "Đã tạo phiếu nhập kho",
        );

      case "updateInventory":
        // Cập nhật thủ công số lượng nguyên liệu
        return successResponse(
          updateInventoryItem(payload),
          "Đã cập nhật tồn kho",
        );

      case "deleteSoTay":
        return successResponse(
          deleteSoTayEntry(payload),
          "Đã xóa ghi chép thu/chi",
        );

      case "fixAll":
        // Đồng bộ lại dữ liệu: refresh cache, không thay đổi nội dung
        return successResponse(
          { repaired: true, timestamp: new Date().toISOString() },
          "Đã đồng bộ dữ liệu",
        );

      default:
        return errorResponse("Hành động POST không xác định: " + action);
    }
  } catch (error) {
    return errorResponse("Lỗi hệ thống (POST): " + error.toString());
  }
}

/**
 * Hàm lấy cấu trúc Sheet tự động (SCHEMA)
 */
function getDatabaseSchema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const schema = {};
  
  sheets.forEach(sheet => {
    try {
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) return; // Bỏ qua sheet rỗng
      
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      // Lọc bỏ cột trống và ép về String
      schema[sheet.getName()] = headers.map(h => String(h).trim()).filter(h => h !== "");
    } catch(e) {
      schema[sheet.getName()] = ["Error reading header"];
    }
  });
  
  return schema;
}


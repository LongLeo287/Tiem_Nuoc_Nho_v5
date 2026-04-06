/**
 * ============================================================================
 * FILE: OrderService.gs
 * LAST PUSH: 2026-03-31 02:01 | Antigravity — Thêm chức năng Lock/Unlock và đưa Đơn Nháp lên Server
 * CHỨC NĂNG: Xử lý toàn bộ nghiệp vụ Đơn hàng
 * BAO GỒM:
 *   - createNewOrder()    → Tạo đơn mới, ghi vào sheet ORDERS
 *   - getOrdersData()     → Đọc toàn bộ đơn hàng, trả về JSON cho App
 *   - updateOrderStatus() → Cập nhật trạng thái + trạng thái thanh toán
 *   - deleteOrder()       → Xóa vĩnh viễn một đơn hàng (chỉ Manager)
 * ============================================================================
 *
 * CẤU TRÚC 13 CỘT CỦA SHEET ORDERS (A → M):
 *   A: ORDER_ID       B: CREATED_AT      C: TABLE_NO
 *   D: ITEMS          E: SUBTOTAL       F: DISCOUNT
 *   G: VAT_AMOUNT     H: TOTAL_AMOUNT     I: ORDER_STATUS
 *   J: THANH_TOAN     K: CUSTOMER_NAME  L: PHONE
 *   M: NOTES          N: PAYMENT_STATUS O: LOCKED_BY
 *
 * LƯU Ý: Dòng 1 của sheet phải là dòng tiêu đề với đúng tên cột trên.
 * ============================================================================
 */

// ============================================================================
// 1. HÀM LẤY DANH SÁCH ĐƠN HÀNG (Dành cho action: getOrders)
// ============================================================================

/**
 * Đọc toàn bộ sheet ORDERS và đóng gói thành mảng JSON trả về App.
 * Bỏ qua các dòng trống (không có ORDER_ID).
 * Trả về mảng rỗng nếu sheet chưa có dữ liệu hoặc không tìm thấy.
 */
function getOrdersData() {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  // Bảo vệ: Nếu sheet chưa tạo thì trả về mảng rỗng, không crash
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();

  // Nếu chỉ có 1 dòng (dòng tiêu đề) hoặc sheet trống → trả về rỗng
  if (data.length <= 1) return [];

  const headers = data[0]; // Dòng 1: tên cột
  const rows = data.slice(1); // Từ dòng 2 trở đi: dữ liệu thật

  const orderList = [];

  rows.forEach(function (row) {
    const orderId = row[0]; // Cột A: ORDER_ID

    // Bỏ qua dòng trống (không có mã đơn)
    if (!orderId || orderId.toString().trim() === "") return;

    // Parse mảng items từ JSON string (cột D)
    let items = [];
    try {
      const rawItems = row[3]; // Cột D: ITEMS
      if (rawItems && rawItems !== "") {
        items = JSON.parse(rawItems.toString());
      }
    } catch (e) {
      // Nếu JSON bị hỏng, giữ mảng rỗng, không crash toàn bộ response
      items = [];
    }

    // Đóng gói object với đúng key mà DataContext.tsx đang mapping
    orderList.push({
      ORDER_ID: orderId.toString().trim(),
      CREATED_AT: row[1] ? row[1].toString() : new Date().toISOString(),
      TABLE_NO: row[2] ? row[2].toString() : "",
      ITEMS: items, // Mảng [{id, qty}] đã parse
      SUBTOTAL: Number(row[4]) || 0,
      DISCOUNT: Number(row[5]) || 0,
      VAT_AMOUNT: Number(row[6]) || 0,
      TOTAL_AMOUNT: Number(row[7]) || 0, // Tổng tiền thực thu
      STATUS: row[8] ? row[8].toString() : "Hoàn thành",
      PAYMENT_METHOD: row[9] ? row[9].toString() : "Tiền mặt",
      CUSTOMER_NAME: row[10] ? row[10].toString() : "Khách",
      PHONE: row[11] ? row[11].toString() : "",
      NOTES: row[12] ? row[12].toString() : "",
      // Col N (index 13): trạng thái thanh toán riêng
      PAYMENT_STATUS: row[13] ? row[13].toString() : "Chưa thanh toán",
      // Col O (index 14): trạng thái khoá đơn (editing lock)
      LOCKED_BY: row[14] ? row[14].toString() : "",
    });
  });

  // Sắp xếp mới nhất lên đầu để App hiển thị đúng thứ tự
  orderList.sort(function (a, b) {
    return new Date(b.CREATED_AT) - new Date(a.CREATED_AT);
  });

  return orderList;
}

// ============================================================================
// 2. HÀM TẠO ĐƠN HÀNG MỚI (Dành cho action: createOrder)
// ============================================================================

/**
 * Nhận payload từ DataContext.tsx và ghi đúng 13 cột vào sheet ORDERS.
 *
 * PAYLOAD NHẬN TỪ APP (DataContext.tsx → createOrder):
 * {
 *   action:        "createOrder",
 *   items:         [{id: "CF01", qty: 2}, ...],  ← mảng {id, qty}
 *   customerName:  "Nguyễn Văn A",
 *   phoneNumber:   "0901234567",
 *   tableNumber:   "Bàn 3",
 *   paymentMethod: "Tiền mặt",
 *   notes:         "Ít đá",
 *   total:         75000,    ← tổng tiền (sau khi App tính)
 *   subtotal:      75000,    ← tiền trước giảm giá
 *   discount:      0,        ← tiền giảm giá
 *   vatAmount:     0         ← tiền VAT (nếu có)
 * }
 *
 * LƯU Ý: Nếu App không gửi subtotal/discount/vatAmount, GAS tự tính lại
 * từ total để đảm bảo dữ liệu không bao giờ bị = 0.
 */
function createNewOrder(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  if (!sheet)
    throw new Error(
      "Không tìm thấy sheet ORDERS. Vui lòng tạo sheet này trước.",
    );

  // --- [A] Tạo ID đơn hàng tự động ---
  const orderId = generateOrderID();

  // --- [B] Timestamp theo múi giờ của script (GMT+7) ---
  const now = new Date();
  const timeZone = Session.getScriptTimeZone();
  const dateStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");

  // --- [C] Thông tin cơ bản ---
  const tableNo = payload.tableNumber || "Mang đi";
  const customerName = payload.customerName || "";
  const phoneNumber = payload.phoneNumber || "";
  const notes = payload.notes || "";
  const thanhToan = payload.paymentMethod || "Tiền mặt";

  // --- [D] Tiền nong — KHÔNG để = 0 ---
  // Ưu tiên: dùng số App gửi lên, fallback tính từ total, fallback = 0
  const total = Number(payload.total) || 0;
  const subtotal = Number(payload.subtotal) || total; // Nếu không gửi, lấy total
  const discount = Number(payload.discount) || 0;
  const vatAmount = Number(payload.vatAmount) || 0;
  // thanhTien = số tiền thực thu cuối cùng
  const thanhTien = Number(payload.thanhTien) || total; // Fallback = total

  // --- [E] Serialize mảng items thành JSON string ---
  // App gửi: [{id: "CF01", qty: 2}], ta lưu đúng format này
  const items = payload.items || [];
  const itemsStr = JSON.stringify(items);

  // --- [F] Trạng thái mặc định ---
  // Mặc định là "Completed" khi khách thanh toán ngay tại quầy.
  // Nếu App muốn trạng thái khác (VD: "Pending"), truyền payload.status
  const trangThai = payload.status || "Hoàn thành"; // App tạo đơn với 'Chờ xử lý' → GAS nhận đúng

  // --- [G] Ghi vào sheet ORDERS (đúng 14 cột A → N) ---
  sheet.appendRow([
    orderId,         // Cột A: ORDER_ID
    dateStr,         // Cột B: CREATED_AT
    tableNo,         // Cột C: TABLE_NO
    itemsStr,        // Cột D: ITEMS (JSON string)
    subtotal,        // Cột E: SUBTOTAL
    discount,        // Cột F: DISCOUNT
    vatAmount,       // Cột G: VAT_AMOUNT
    thanhTien,       // Cột H: TOTAL_AMOUNT ← FIX: không còn = 0 nữa
    trangThai,       // Cột I: ORDER_STATUS
    thanhToan,       // Cột J: THANH_TOAN (phương thức: Tiền mặt / Chuyển khoản)
    customerName,    // Cột K: CUSTOMER_NAME
    phoneNumber,     // Cột L: PHONE
    notes,           // Cột M: NOTES
    "Chưa thanh toán", // Cột N: PAYMENT_STATUS (mặc định chưa thu tiền)
    "",              // Cột O: LOCKED_BY (mặc định rỗng)
  ]);

  // --- [H] Xử lý Hóa đơn điện tử (Nếu vượt ngưỡng 500tr) ---
  const invoiceResult = processEInvoice({
    orderId: orderId,
    thanhTien: thanhTien,
  });

  // --- [I] Ghi vào FINANCE_REPORT (chỉ khi đơn Hoàn thành) ---
  if (trangThai === "Hoàn thành") {
    try {
      logToFinanceReport({
        orderId: orderId,
        dateStr: dateStr,
        thanhTien: thanhTien,
        trangThai: trangThai,
        tiHuyDon: 0,
      });
    } catch (e) {
      console.warn("[FINANCE_REPORT] Không thể ghi log tài chính:", e.message);
    }
  }

  // --- [J] Trả kết quả về cho App ---
  return {
    orderId: orderId,
    thanhTien: thanhTien,
    trangThai: trangThai,
    invoice: invoiceResult,
    loiNhan: "Đã chốt đơn " + orderId + " cho " + (customerName || "khách"),
  };
}

// ============================================================================
// 3. HÀM CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG (Dành cho action: updateOrderStatus)
// ============================================================================

/**
 * Tìm đúng dòng chứa ORDER_ID (cột A) và cập nhật:
 *   - Cột I (ORDER_STATUS)       → status mới
 *   - Cột J (THANH_TOAN)       → paymentStatus (nếu có gửi)
 *
 * PAYLOAD NHẬN TỪ APP:
 * {
 *   action:        "updateOrderStatus",
 *   orderId:       "ORD-260302-8392",
 *   status:        "Hoàn thành" | "Đã hủy" | "Chờ xử lý" | "Đang làm" | "Đã nhận",
 *   paymentStatus: "Đã thanh toán" | "Chưa thanh toán" (tuỳ chọn)
 * }
 */
function updateOrderStatus(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  if (!sheet) throw new Error("Không tìm thấy sheet ORDERS.");

  const orderIdCanTim = payload.orderId;
  const trangThaiMoi = payload.status;

  // Bắt lỗi thiếu tham số bắt buộc
  if (!orderIdCanTim || !trangThaiMoi) {
    throw new Error("Thiếu orderId hoặc status để cập nhật trạng thái.");
  }

  const data = sheet.getDataRange().getValues();

  // Quét từ dòng 2 (index 1) để tìm đúng ORDER_ID ở cột A
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === orderIdCanTim.toString().trim()) {
      const hangCanSua = i + 1; // Chuyển từ index mảng (0-based) → số dòng sheet (1-based)

      // Cập nhật ORDER_STATUS → Cột I = cột số 9
      sheet.getRange(hangCanSua, 9).setValue(trangThaiMoi);

      // Cập nhật PAYMENT_STATUS → Cột N = cột số 14 (nếu App có gửi)
      // Col N riêng cho payment status, không đụng vào Col J (THANH_TOAN = phương thức TT)
      if (payload.paymentStatus !== undefined) {
        sheet.getRange(hangCanSua, 14).setValue(payload.paymentStatus);
      }

      // Nếu chuyển sang "Đã hủy" → ghi tiền hủy vào FINANCE_REPORT
      if (trangThaiMoi === "Đã hủy") {
        try {
          const thanhTienHuy = Number(data[i][7]) || 0; // cột H = TOTAL_AMOUNT
          const tz = Session.getScriptTimeZone();
          const ngayHuy = Utilities.formatDate(
            new Date(),
            tz,
            "yyyy-MM-dd HH:mm:ss",
          );
          logToFinanceReport({
            orderId: orderIdCanTim + "_HUY",
            dateStr: ngayHuy,
            thanhTien: 0,
            trangThai: "Đã hủy",
            tiHuyDon: thanhTienHuy,
          });
        } catch (e) {
          console.warn("[FINANCE_REPORT] Không ghi được đơn hủy:", e.message);
        }
      }

      return {
        orderId: orderIdCanTim,
        status: trangThaiMoi,
      };
    }
  }

  // Không tìm thấy → ném lỗi để Main.gs bắt và trả về errorResponse
  throw new Error("Không tìm thấy đơn hàng có mã: " + orderIdCanTim);
}

// ============================================================================
// 4. HÀM XÓA ĐƠN HÀNG (Dành cho action: deleteOrder — chỉ Manager)
// ============================================================================

/**
 * Tìm và xóa vĩnh viễn dòng chứa ORDER_ID khỏi sheet ORDERS.
 * Lưu ý: Đây là thao tác không thể hoàn tác. Frontend phải confirm trước.
 *
 * PAYLOAD NHẬN TỪ APP:
 * {
 *   action:  "deleteOrder",
 *   orderId: "ORD-260302-8392"
 * }
 */
function deleteOrder(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  if (!sheet) throw new Error("Không tìm thấy sheet ORDERS.");

  const orderIdCanXoa = payload.orderId;

  if (!orderIdCanXoa) {
    throw new Error("Thiếu orderId để xóa đơn hàng.");
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === orderIdCanXoa.toString().trim()) {
      const hangCanXoa = i + 1; // Chuyển sang số dòng thật trong sheet

      sheet.deleteRow(hangCanXoa);

      return {
        orderId: orderIdCanXoa,
        loiNhan: "Đã xóa đơn hàng " + orderIdCanXoa,
      };
    }
  }

  throw new Error("Không tìm thấy đơn hàng cần xóa: " + orderIdCanXoa);
}

// ============================================================================
// 5. HÀM GHI LOG VÀO FINANCE_REPORT
// ============================================================================

/**
 * Tự động ghi 1 dòng vào sheet FINANCE_REPORT sau mỗi đơn hàng hoàn thành.
 *
 * CẤU TRÚC FINANCE_REPORT (6 cột):
 *   A: Mã Đơn | B: Ngày | C: Doanh Thu Trước Thuế |
 *   D: Thuế HKD (3.9%) | E: Doanh Thu Ròng | F: Tiền Hủy Đơn
 *
 * Logic thuế:
 *   - Thuế HKD chỉ áp dụng khi doanh thu NĂM (lấy từ DASHBOARD!B2) > 500M
 *   - Chỉ tính thuế trên PHẦN VƯỢT NGƯỠNG của từng đơn
 *   - Tại đây tính ước tính per-order; tổng kết chính thức vẫn ở DASHBOARD!B12
 *
 * @param {Object} params
 *   orderId   {string}  Mã đơn hàng
 *   dateStr   {string}  Timestamp của đơn
 *   thanhTien {number}  Tổng tiền thực thu (TOTAL_AMOUNT)
 *   trangThai {string}  Trạng thái đơn
 *   tiHuyDon  {number}  Tiền hủy đơn (= thanhTien nếu đơn bị hủy, else 0)
 */
function logToFinanceReport(params) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_FINANCE);

  if (!sheet) {
    console.warn(
      "[FINANCE_REPORT] Sheet không tồn tại. Chạy setupAllSheets() trước.",
    );
    return;
  }

  const thanhTien = Number(params.thanhTien) || 0;
  const tiHuyDon = Number(params.tiHuyDon) || 0;

  // Lấy doanh thu năm hiện tại từ DASHBOARD!B2 để tính ngưỡng thuế
  let doanhThuNam = 0;
  try {
    const dashSheet = db.getSheetByName(CONFIG.SHEET_DASHBOARD);
    if (dashSheet) {
      doanhThuNam = Number(dashSheet.getRange("B2").getValue()) || 0;
    }
  } catch (e) {
    console.warn("[FINANCE_REPORT] Không đọc được DASHBOARD!B2:", e.message);
  }

  // Tính thuế HKD 3.9% = 2.4% VAT + 1.5% PIT (chỉ trên phần vượt 500M)
  const NGUONG_THUE = 500000000;
  const THUE_SUAT = 0.039;
  let thueMon = 0;

  if (doanhThuNam > NGUONG_THUE) {
    // Đã vượt ngưỡng → toàn bộ đơn này chịu thuế
    thueMon = Math.round(thanhTien * THUE_SUAT);
  } else if (doanhThuNam + thanhTien > NGUONG_THUE) {
    // Đơn này vừa chạm ngưỡng → chỉ tính phần vượt
    const phanVuot = doanhThuNam + thanhTien - NGUONG_THUE;
    thueMon = Math.round(phanVuot * THUE_SUAT);
  }

  const doanhThuRong = thanhTien - thueMon;

  // Ghi vào dòng cuối của FINANCE_REPORT (trước dòng TỔNG CỘNG ở 1002)
  // Tìm dòng trống đầu tiên sau header (row 2)
  const allData = sheet.getDataRange().getValues();
  let targetRow = 2; // Mặc định dòng 2

  for (let i = 1; i < allData.length; i++) {
    const cellA = allData[i][0] ? allData[i][0].toString().trim() : "";
    if (cellA === "" || cellA === "TỔNG CỘNG") {
      targetRow = i + 1; // i là 0-based index, +1 là số dòng sheet
      break;
    }
    targetRow = i + 2; // Dòng cuối có dữ liệu + 1
  }

  // Không được ghi đè dòng TỔNG CỘNG (hàng 1002)
  if (targetRow >= 1002) targetRow = 1001;

  sheet.getRange(targetRow, 1).setValue(params.orderId);
  sheet.getRange(targetRow, 2).setValue(params.dateStr);
  sheet.getRange(targetRow, 3).setValue(thanhTien).setNumberFormat("#,##0");
  sheet.getRange(targetRow, 4).setValue(thueMon).setNumberFormat("#,##0");
  sheet.getRange(targetRow, 5).setValue(doanhThuRong).setNumberFormat("#,##0");
  sheet.getRange(targetRow, 6).setValue(tiHuyDon).setNumberFormat("#,##0");

  Logger.log(
    "[FINANCE_REPORT] Đã ghi dòng " + targetRow + " cho đơn " + params.orderId,
  );
}

// ============================================================================
// 6. THÊM MÓN VÀO ĐƠN HIỆN CÓ (Dành cho action: addItemsToOrder)
// ============================================================================

/**
 * Thêm món vào đơn đã tồn tại (khách gọi thêm mà không tạo đơn mới).
 * Merge items mới vào items cũ (nếu trùng id thì cộng qty), tính lại tổng tiền.
 *
 * PAYLOAD TỪ APP:
 * {
 *   action:    "addItemsToOrder",
 *   orderId:   "ORD-260316-1234",
 *   newItems:  [{id: "CF01", qty: 1, price: 35000}, ...],  ← món thêm
 *   menuData:  [{id: "CF01", price: 35000}, ...]           ← optional, để GAS tự tính giá
 * }
 */
function addItemsToOrder(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  if (!sheet) throw new Error("Không tìm thấy sheet ORDERS.");

  const orderId = payload.orderId;
  const newItems = payload.newItems || [];

  if (!orderId) throw new Error("Thiếu orderId.");
  if (!newItems.length) throw new Error("Không có món nào để thêm.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() !== orderId.toString().trim()) continue;

    const hang = i + 1;

    // ── [1] Parse items cũ ────────────────────────────────────────────────────
    let existingItems = [];
    try {
      const raw = data[i][3]; // Cột D: ITEMS
      if (raw && raw.toString().trim().startsWith("[")) {
        existingItems = JSON.parse(raw.toString());
      }
    } catch (e) {
      existingItems = [];
    }

    // ── [2] Merge: cộng qty nếu trùng id, thêm mới nếu chưa có ───────────────
    newItems.forEach(function (newItem) {
      const existing = existingItems.find(function (it) {
        return String(it.id) === String(newItem.id);
      });
      if (existing) {
        existing.qty = (Number(existing.qty) || 1) + (Number(newItem.qty) || 1);
      } else {
        existingItems.push({
          id: newItem.id,
          qty: Number(newItem.qty) || 1,
          price: Number(newItem.price) || 0,
          size: newItem.size || "M",
          NOTES: newItem.NOTES || "",
        });
      }
    });

    // ── [3] Tính lại tổng tiền từ items đã merge ──────────────────────────────
    // Ưu tiên dùng price trong item (App gửi kèm), fallback = 0
    const thuThemTien = newItems.reduce(function (sum, it) {
      return sum + (Number(it.price) || 0) * (Number(it.qty) || 1);
    }, 0);

    const thanhTienCu = Number(data[i][7]) || 0; // Cột H: TOTAL_AMOUNT
    const subtotalCu  = Number(data[i][4]) || 0; // Cột E: SUBTOTAL
    const thanhTienMoi = thanhTienCu + thuThemTien;
    const subtotalMoi  = subtotalCu  + thuThemTien;

    // ── [4] Ghi lại vào sheet ─────────────────────────────────────────────────
    sheet.getRange(hang, 4).setValue(JSON.stringify(existingItems)); // Cột D: ITEMS
    sheet.getRange(hang, 5).setValue(subtotalMoi);                   // Cột E: SUBTOTAL
    sheet.getRange(hang, 8).setValue(thanhTienMoi);                  // Cột H: TOTAL_AMOUNT

    Logger.log("[addItemsToOrder] Đơn " + orderId + " +thêm " + newItems.length + " món, tổng mới: " + thanhTienMoi);

    return {
      orderId: orderId,
      itemsAdded: newItems.length,
      thanhTienMoi: thanhTienMoi,
      loiNhan: "Đã thêm " + newItems.length + " món vào đơn " + orderId,
    };
  }

  throw new Error("Không tìm thấy đơn hàng: " + orderId);
}


// ============================================================================
// 7. SỬA TOÀN BỘ ĐƠN HÀNG — GIỮ NGUYÊN ORDER_ID (action: editOrder)
// ============================================================================

/**
 * Cập nhật một đơn hàng đã tồn tại trong sheet ORDERS.
 * Giữ nguyên ORDER_ID và CREATED_AT gốc, chỉ thay đổi:
 *   - ITEMS (cột D)       → items mới từ App
 *   - SUBTOTAL (cột E)    → tổng tiền mới
 *   - TOTAL_AMOUNT (cột H)  → tổng thực thu mới
 *   - TABLE_NO (cột C)    → nếu App gửi tableNumber
 *   - CUSTOMER_NAME (cột K) → nếu App gửi customerName
 *   - NOTES (cột M)       → nếu App gửi notes
 *   - ORDER_STATUS (cột I)  → nếu App gửi status
 *
 * PAYLOAD TỪ APP:
 * {
 *   action:       "editOrder",
 *   orderId:      "ORD-260317-1234",   ← BẮT BUỘC
 *   items:        [{id, qty, size, NOTES, temperature, sugarLevel, iceLevel}],
 *   total:        95000,
 *   subtotal:     95000,
 *   tableNumber:  "Bàn 2",             ← tuỳ chọn
 *   customerName: "Nguyễn Văn A",      ← tuỳ chọn
 *   notes:        "Ít đá",             ← tuỳ chọn
 *   status:       "Chờ xử lý"          ← tuỳ chọn
 * }
 */
function editOrder(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);

  if (!sheet) throw new Error("Không tìm thấy sheet ORDERS.");

  const orderId = payload.orderId;
  if (!orderId) throw new Error("Thiếu orderId để sửa đơn.");

  const items    = payload.items || [];
  const total    = Number(payload.total)    || 0;
  const subtotal = Number(payload.subtotal) || total;

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() !== orderId.toString().trim()) continue;

    const hang = i + 1; // index 0-based → số dòng sheet (1-based)

    // Cập nhật items (cột D = 4)
    sheet.getRange(hang, 4).setValue(JSON.stringify(items));

    // Cập nhật tổng tiền (cột E = SUBTOTAL, cột H = TOTAL_AMOUNT)
    sheet.getRange(hang, 5).setValue(subtotal);
    sheet.getRange(hang, 8).setValue(total);

    // Các trường tuỳ chọn — chỉ ghi nếu App gửi
    if (payload.tableNumber   !== undefined) sheet.getRange(hang, 3).setValue(payload.tableNumber);
    if (payload.customerName  !== undefined) sheet.getRange(hang, 11).setValue(payload.customerName);
    if (payload.notes         !== undefined) sheet.getRange(hang, 13).setValue(payload.notes);
    if (payload.status        !== undefined) sheet.getRange(hang, 9).setValue(payload.status);

    // Tự động mở khoá sau khi chỉnh sửa xong và lưu
    sheet.getRange(hang, 15).setValue("");

    Logger.log("[editOrder] Đơn " + orderId + " đã được cập nhật — tổng mới: " + total);

    return {
      orderId:  orderId,
      thanhTien: total,
      loiNhan:  "Đã cập nhật đơn " + orderId,
    };
  }

  throw new Error("Không tìm thấy đơn hàng cần sửa: " + orderId);
}

// ============================================================================
// 8. HÀM KHOÁ / MỞ KHOÁ ĐƠN HÀNG (Dành cho tính năng nhiều người sửa)
// ============================================================================

function lockOrder(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);
  if (!sheet) throw new Error("Không tìm thấy sheet ORDERS.");

  const orderId = payload.orderId;
  const lockedBy = payload.lockedBy || "Một nhân viên";

  if (!orderId) throw new Error("Thiếu orderId để khoá đơn.");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === orderId.toString().trim()) {
      const hang = i + 1;
      
      const currentLock = data[i][14] ? data[i][14].toString() : "";
      if (currentLock && currentLock !== "" && currentLock !== lockedBy && currentLock !== "undefined") {
         throw new Error("Đơn đang bị sửa bởi: " + currentLock);
      }

      sheet.getRange(hang, 15).setValue(lockedBy);
      return { orderId: orderId, lockedBy: lockedBy, success: true };
    }
  }
  throw new Error("Không tìm thấy đơn hàng: " + orderId);
}

function unlockOrder(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_ORDERS);
  if (!sheet) throw new Error("Không tìm thấy sheet ORDERS.");

  const orderId = payload.orderId;
  if (!orderId) throw new Error("Thiếu orderId để mở khoá.");

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === orderId.toString().trim()) {
      const hang = i + 1;
      sheet.getRange(hang, 15).setValue("");
      return { orderId: orderId, success: true };
    }
  }
  throw new Error("Không tìm thấy đơn hàng: " + orderId);
}

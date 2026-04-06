/**
 * ============================================================================
 * FILE: InventoryService.gs
 * CHỨC NĂNG: Quản lý Kho Nguyên Liệu
 *
 * SHEET: NGUYEN_LIEU — 5 cột (A → E)
 *   A: ma_nl (mã nguyên liệu)   B: ten_nl (tên)   C: don_vi (đơn vị)
 *   D: ton_kho (số lượng hiện tại)   E: muc_canh_bao (ngưỡng cảnh báo thấp)
 *
 * SHEET: NHAP_KHO — 5 cột (A → E)
 *   A: ma_phieu   B: thoi_gian   C: ma_nl   D: so_luong_nhap   E: don_gia_nhap   F: ghi_chu
 *
 * CÁC HÀM XUẤT (được gọi từ Main.gs):
 *   updateInventoryItem() → POST action=updateInventory
 *   createNhapKho()       → POST action=createNhapKho
 * ============================================================================
 */


// ============================================================================
// 1. CẬP NHẬT SỐ LƯỢNG TỒN KHO (action: updateInventory)
// ============================================================================

/**
 * Tìm nguyên liệu theo ma_nl (cột A) và cộng/trừ số lượng vào cột D (ton_kho).
 *
 * PAYLOAD TỪ StaffView.tsx:
 * {
 *   action:         "updateInventory",
 *   ma_nl:          "NL001",
 *   itemName:       "Cà phê",         ← dùng để báo lỗi rõ hơn
 *   quantityChange: -5                ← số âm = trừ kho, số dương = cộng kho
 * }
 */
function updateInventoryItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_INVENTORY);

  if (!sheet) throw new Error("Không tìm thấy sheet " + CONFIG.SHEET_INVENTORY);
  if (!payload.ma_nl) throw new Error("Thiếu ma_nl để cập nhật kho.");

  const data           = sheet.getDataRange().getValues();
  const quantityChange = Number(payload.quantityChange) || 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.ma_nl.toString().trim()) {
      const hang       = i + 1;
      const tonKhoCu   = Number(data[i][3]) || 0; // Cột D: ton_kho
      const tonKhoMoi  = tonKhoCu + quantityChange;

      // Không cho tồn kho xuống âm
      if (tonKhoMoi < 0) {
        throw new Error(
          "Tồn kho '" + (payload.itemName || payload.ma_nl) +
          "' không đủ. Hiện có: " + tonKhoCu + ", cần trừ: " + Math.abs(quantityChange)
        );
      }

      sheet.getRange(hang, 4).setValue(tonKhoMoi); // Ghi vào Cột D

      return {
        ma_nl:       payload.ma_nl,
        ton_kho_cu:  tonKhoCu,
        ton_kho_moi: tonKhoMoi
      };
    }
  }

  throw new Error("Không tìm thấy nguyên liệu có mã: " + payload.ma_nl);
}


// ============================================================================
// 2. TẠO PHIẾU NHẬP KHO (action: createNhapKho)
// ============================================================================

/**
 * Ghi phiếu nhập kho vào sheet NHAP_KHO và tự động cộng vào tồn kho NGUYEN_LIEU.
 *
 * PAYLOAD TỪ StaffView.tsx:
 * {
 *   action:         "createNhapKho",
 *   ma_nl:          "NL001",
 *   so_luong_nhap:  50,
 *   don_gia_nhap:   15000,
 *   ghi_chu:        "Mua từ nhà cung cấp A"
 * }
 */
function createNhapKho(payload) {
  const db = getActiveDB();

  if (!payload.ma_nl)          throw new Error("Thiếu ma_nl.");
  if (!payload.so_luong_nhap)  throw new Error("Thiếu so_luong_nhap.");

  const soLuongNhap = Number(payload.so_luong_nhap) || 0;
  const donGiaNhap  = Number(payload.don_gia_nhap)  || 0;

  // ── [1] Ghi vào sheet NHAP_KHO ────────────────────────────────────────────
  const nhapKhoSheet = db.getSheetByName(CONFIG.SHEET_IMPORT);
  if (!nhapKhoSheet) throw new Error("Không tìm thấy sheet " + CONFIG.SHEET_IMPORT);

  const timeZone = Session.getScriptTimeZone();
  const now      = new Date();
  const dateStr  = Utilities.formatDate(now, timeZone, "yyMMdd");
  const maPhieu  = "NK-" + dateStr + "-" + Math.floor(1000 + Math.random() * 9000);
  const thoiGian = Utilities.formatDate(now, timeZone, "yyyy-MM-dd HH:mm:ss");

  nhapKhoSheet.appendRow([
    maPhieu,                      // Cột A: ma_phieu
    thoiGian,                     // Cột B: thoi_gian
    payload.ma_nl.toString().trim(), // Cột C: ma_nl
    soLuongNhap,                  // Cột D: so_luong_nhap
    donGiaNhap,                   // Cột E: don_gia_nhap
    payload.ghi_chu || ""         // Cột F: ghi_chu
  ]);

  // ── [2] Cộng thẳng vào tồn kho NGUYEN_LIEU ────────────────────────────────
  // Dùng lại updateInventoryItem với quantityChange dương
  try {
    updateInventoryItem({
      ma_nl:          payload.ma_nl,
      quantityChange: soLuongNhap   // Số dương = cộng vào kho
    });
  } catch (e) {
    // Nếu nguyên liệu chưa có trong NGUYEN_LIEU → bỏ qua, không crash phiếu nhập
    console.warn("[createNhapKho] Không thể cập nhật NGUYEN_LIEU:", e.message);
  }

  return {
    maPhieu:       maPhieu,
    ma_nl:         payload.ma_nl,
    so_luong_nhap: soLuongNhap
  };
}


// ============================================================================
// 3. XỬ LÝ KHO THEO ĐƠN HÀNG (action: processOrderInventory)
// ============================================================================

/**
 * Trừ hoặc hoàn kho nguyên liệu dựa trên ITEMS của đơn hàng + DINH_LUONG.
 *
 * PAYLOAD TỪ inventoryWorker.ts:
 * {
 *   action:  "processOrderInventory",
 *   orderId: "ORD-260316-1234",
 *   type:    "deduct" | "refund"
 * }
 */
function processOrderInventory(payload) {
  const db      = getActiveDB();
  const orderId = payload.orderId;
  const type    = payload.type || "deduct"; // 'deduct' = trừ, 'refund' = hoàn

  // ── [1] Lấy Items từ ORDERS sheet ─────────────────────────────────────────
  const ordersSheet = db.getSheetByName(CONFIG.SHEET_ORDERS);
  if (!ordersSheet) return { orderId, processed: 0, message: "Không tìm thấy ORDERS" };

  const ordersData = ordersSheet.getDataRange().getValues();
  let orderItems   = [];

  for (let i = 1; i < ordersData.length; i++) {
    if (ordersData[i][0].toString().trim() === orderId.toString().trim()) {
      try {
        const raw = ordersData[i][3]; // Cột D: ITEMS (JSON)
        orderItems = raw ? JSON.parse(raw.toString()) : [];
      } catch (e) { orderItems = []; }
      break;
    }
  }

  if (!orderItems.length) {
    return { orderId, processed: 0, message: "Không tìm thấy items hoặc đơn trống" };
  }

  // ── [2] Lookup DINH_LUONG để tính lượng nguyên liệu ───────────────────────
  const dinhLuongSheet = db.getSheetByName(CONFIG.SHEET_RECIPE);
  if (!dinhLuongSheet) {
    return { orderId, processed: 0, message: "Không tìm thấy sheet DINH_LUONG" };
  }
  const dinhLuongData = dinhLuongSheet.getDataRange().getValues();

  const warnings = [];
  let processed  = 0;

  // ── [3] Với mỗi item trong đơn, tính và cập nhật kho ──────────────────────
  orderItems.forEach(function (item) {
    const maMonId = String(item.id || item.ma_mon || "").trim();
    const qty     = Number(item.qty || 1);
    if (!maMonId || qty === 0) return;

    // Tìm tất cả công thức cho món này trong DINH_LUONG
    for (var r = 1; r < dinhLuongData.length; r++) {
      const row = dinhLuongData[r];
      if (!row[0] || row[0].toString().trim() !== maMonId) continue;

      const maNl       = row[2] ? row[2].toString().trim() : "";
      const tenNl      = row[3] ? row[3].toString() : maNl;
      const dinhLuong  = Number(row[4]) || 0;
      const soLuong    = dinhLuong * qty;

      if (!maNl || soLuong === 0) continue;

      try {
        updateInventoryItem({
          ma_nl:          maNl,
          itemName:       tenNl,
          quantityChange: type === "refund" ? soLuong : -soLuong,
        });
        processed++;
      } catch (e) {
        warnings.push(e.message);
      }
    }
  });

  return { orderId, processed, warnings };
}
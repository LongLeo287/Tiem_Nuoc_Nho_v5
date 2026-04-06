/**
 * ============================================================================
 * FILE: MenuService.gs
 * CHỨC NĂNG: Quản lý toàn bộ Thực đơn (MENU)
 *
 * SHEET: MENU — 6 cột (A → F)
 *   A: ma_mon   B: ten_mon   C: gia_ban   D: danh_muc
 *   E: trang_thai (checkbox)   F: has_customizations (checkbox)
 *
 * CÁC HÀM XUẤT (được gọi từ Main.gs):
 *   getMenuData()    → GET  action=getMenu
 *   updateMenuItem() → POST action=updateMenuItem  (bật/tắt trạng thái)
 *   addMenuItem()    → POST action=addMenuItem      (thêm món mới)
 *   editMenuItem()   → POST action=editMenuItem     (sửa thông tin món)
 *   deleteMenuItem() → POST action=deleteMenuItem   (xóa món)
 * ============================================================================
 */


// ============================================================================
// 1. LẤY DANH SÁCH MÓN ĂN (action: getMenu)
// ============================================================================

/**
 * Quét toàn bộ sheet MENU, trả về mảng JSON cho App.
 * Key trả về khớp với DataContext.tsx đang mapping:
 *   ma_mon, ten_mon, gia_ban, danh_muc, trang_thai, has_customizations
 */
function getMenuData() {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");

  const data     = sheet.getDataRange().getValues();
  const menuList = [];

  // Bỏ qua dòng 1 (tiêu đề), duyệt từ dòng 2
  for (let i = 1; i < data.length; i++) {
    const row   = data[i];
    const maMon = row[0];

    // Bỏ qua dòng trống
    if (!maMon || maMon.toString().trim() === "") continue;

    menuList.push({
      ma_mon:             maMon.toString().trim(),
      ten_mon:            row[1] ? row[1].toString().trim() : "",
      gia_ban:            Number(row[2]) || 0,
      danh_muc:           row[3] ? row[3].toString().trim() : "Khác",
      trang_thai:         row[4] === true,   // Cột E: checkbox → bool
      has_customizations: row[5] === true    // Cột F: checkbox → bool
    });
  }

  return menuList;
}


// ============================================================================
// 2. CẬP NHẬT TRẠNG THÁI MÓN (action: updateMenuItem)
// Dùng khi bật/tắt "Còn món" hoặc "Có tuỳ chọn" trực tiếp từ Menu grid
// ============================================================================

/**
 * PAYLOAD:
 * { action: "updateMenuItem", ma_mon: "CF01",
 *   trang_thai?: true/false, has_customizations?: true/false }
 */
function updateMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.ma_mon) throw new Error("Thiếu ma_mon để cập nhật.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.ma_mon.toString().trim()) {
      const hang = i + 1; // index mảng → số dòng sheet

      // Chỉ cập nhật cột nào được gửi lên (không ghi đè cột còn lại)
      if (payload.trang_thai !== undefined) {
        sheet.getRange(hang, 5).setValue(payload.trang_thai);
      }
      if (payload.has_customizations !== undefined) {
        sheet.getRange(hang, 6).setValue(payload.has_customizations);
      }

      return {
        ma_mon:             payload.ma_mon,
        trang_thai:         payload.trang_thai,
        has_customizations: payload.has_customizations
      };
    }
  }

  throw new Error("Không tìm thấy món có mã: " + payload.ma_mon);
}


// ============================================================================
// 3. THÊM MÓN MỚI (action: addMenuItem)
// ============================================================================

/**
 * PAYLOAD TỪ MenuManager.tsx:
 * {
 *   action:             "addMenuItem",
 *   ma_mon:             "CF01",
 *   ten_mon:            "Cà phê sữa",
 *   gia_ban:            35000,
 *   danh_muc:           "Cà phê",
 *   co_san:             true,         ← trang_thai
 *   has_customizations: false,
 *   inventoryQty:       50            ← bỏ qua, không lưu vào MENU sheet
 * }
 */
function addMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.ma_mon)  throw new Error("Thiếu ma_mon.");
  if (!payload.ten_mon) throw new Error("Thiếu ten_mon.");

  // Kiểm tra trùng mã món — không cho thêm mã đã tồn tại
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.ma_mon.toString().trim()) {
      throw new Error("Mã món '" + payload.ma_mon + "' đã tồn tại. Vui lòng dùng mã khác.");
    }
  }

  // co_san từ App = trang_thai trong Sheet (true = còn món)
  const trangThai = payload.co_san !== undefined ? payload.co_san : true;

  // Ghi vào sheet — đúng 6 cột A → F
  sheet.appendRow([
    payload.ma_mon.toString().trim(),              // A: ma_mon
    payload.ten_mon.toString().trim(),             // B: ten_mon
    Number(payload.gia_ban) || 0,                  // C: gia_ban
    payload.danh_muc ? payload.danh_muc.toString().trim() : "Khác", // D: danh_muc
    trangThai,                                     // E: trang_thai (checkbox)
    payload.has_customizations === true            // F: has_customizations (checkbox)
  ]);

  return { ma_mon: payload.ma_mon, ten_mon: payload.ten_mon };
}


// ============================================================================
// 4. SỬA THÔNG TIN MÓN (action: editMenuItem)
// ============================================================================

/**
 * PAYLOAD TỪ MenuManager.tsx:
 * {
 *   action:             "editMenuItem",
 *   ma_mon:             "CF01",       ← dùng để tìm dòng, KHÔNG đổi mã
 *   ten_mon:            "Cà phê đen",
 *   gia_ban:            30000,
 *   danh_muc:           "Cà phê",
 *   co_san:             true,
 *   has_customizations: true,
 *   inventoryQty:       0             ← bỏ qua
 * }
 */
function editMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.ma_mon) throw new Error("Thiếu ma_mon để sửa.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.ma_mon.toString().trim()) {
      const hang = i + 1;

      // Cập nhật từng cột — chỉ cột nào được gửi mới ghi đè
      if (payload.ten_mon  !== undefined) sheet.getRange(hang, 2).setValue(payload.ten_mon.toString().trim());
      if (payload.gia_ban  !== undefined) sheet.getRange(hang, 3).setValue(Number(payload.gia_ban) || 0);
      if (payload.danh_muc !== undefined) sheet.getRange(hang, 4).setValue(payload.danh_muc.toString().trim());

      // co_san → trang_thai (cột E)
      if (payload.co_san !== undefined) {
        sheet.getRange(hang, 5).setValue(payload.co_san);
      }
      if (payload.has_customizations !== undefined) {
        sheet.getRange(hang, 6).setValue(payload.has_customizations === true);
      }

      return { ma_mon: payload.ma_mon, ten_mon: payload.ten_mon };
    }
  }

  throw new Error("Không tìm thấy món có mã: " + payload.ma_mon);
}


// ============================================================================
// 5. XÓA MÓN (action: deleteMenuItem)
// ============================================================================

/**
 * PAYLOAD TỪ MenuManager.tsx:
 * { action: "deleteMenuItem", ma_mon: "CF01" }
 */
function deleteMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.ma_mon) throw new Error("Thiếu ma_mon để xóa.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.ma_mon.toString().trim()) {
      sheet.deleteRow(i + 1);
      return { ma_mon: payload.ma_mon, loiNhan: "Đã xóa món " + payload.ma_mon };
    }
  }

  throw new Error("Không tìm thấy món cần xóa: " + payload.ma_mon);
}
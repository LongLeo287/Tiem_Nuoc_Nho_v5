/**
 * ============================================================================
 * FILE: MenuService.gs
 * CHỨC NĂNG: Quản lý toàn bộ Thực đơn (MENU)
 *
 * SHEET: MENU — 6 cột (A → F)
 *   A: MENU_ID   B: MENU_NAME   C: PRICE   D: CATEGORY
 *   E: STATUS (checkbox)   F: HAS_CUSTOMIZATIONS (checkbox)
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
 *   MENU_ID, MENU_NAME, PRICE, CATEGORY, STATUS, HAS_CUSTOMIZATIONS
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
      MENU_ID:             maMon.toString().trim(),
      MENU_NAME:            row[1] ? row[1].toString().trim() : "",
      PRICE:            Number(row[2]) || 0,
      CATEGORY:           row[3] ? row[3].toString().trim() : "Khác",
      STATUS:         row[4] === true,   // Cột E: checkbox → bool
      HAS_CUSTOMIZATIONS: row[5] === true    // Cột F: checkbox → bool
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
 * { action: "updateMenuItem", MENU_ID: "CF01",
 *   STATUS?: true/false, HAS_CUSTOMIZATIONS?: true/false }
 */
function updateMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.MENU_ID) throw new Error("Thiếu MENU_ID để cập nhật.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.MENU_ID.toString().trim()) {
      const hang = i + 1; // index mảng → số dòng sheet

      // Chỉ cập nhật cột nào được gửi lên (không ghi đè cột còn lại)
      if (payload.STATUS !== undefined) {
        sheet.getRange(hang, 5).setValue(payload.STATUS);
      }
      if (payload.HAS_CUSTOMIZATIONS !== undefined) {
        sheet.getRange(hang, 6).setValue(payload.HAS_CUSTOMIZATIONS);
      }

      return {
        MENU_ID:             payload.MENU_ID,
        STATUS:         payload.STATUS,
        HAS_CUSTOMIZATIONS: payload.HAS_CUSTOMIZATIONS
      };
    }
  }

  throw new Error("Không tìm thấy món có mã: " + payload.MENU_ID);
}


// ============================================================================
// 3. THÊM MÓN MỚI (action: addMenuItem)
// ============================================================================

/**
 * PAYLOAD TỪ MenuManager.tsx:
 * {
 *   action:             "addMenuItem",
 *   MENU_ID:             "CF01",
 *   MENU_NAME:            "Cà phê sữa",
 *   PRICE:            35000,
 *   CATEGORY:           "Cà phê",
 *   co_san:             true,         ← STATUS
 *   HAS_CUSTOMIZATIONS: false,
 *   inventoryQty:       50            ← bỏ qua, không lưu vào MENU sheet
 * }
 */
function addMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.MENU_ID)  throw new Error("Thiếu MENU_ID.");
  if (!payload.MENU_NAME) throw new Error("Thiếu MENU_NAME.");

  // Kiểm tra trùng mã món — không cho thêm mã đã tồn tại
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.MENU_ID.toString().trim()) {
      throw new Error("Mã món '" + payload.MENU_ID + "' đã tồn tại. Vui lòng dùng mã khác.");
    }
  }

  // co_san từ App = STATUS trong Sheet (true = còn món)
  const trangThai = payload.co_san !== undefined ? payload.co_san : true;

  // Ghi vào sheet — đúng 6 cột A → F
  sheet.appendRow([
    payload.MENU_ID.toString().trim(),              // A: MENU_ID
    payload.MENU_NAME.toString().trim(),             // B: MENU_NAME
    Number(payload.PRICE) || 0,                  // C: PRICE
    payload.CATEGORY ? payload.CATEGORY.toString().trim() : "Khác", // D: CATEGORY
    trangThai,                                     // E: STATUS (checkbox)
    payload.HAS_CUSTOMIZATIONS === true            // F: HAS_CUSTOMIZATIONS (checkbox)
  ]);

  return { MENU_ID: payload.MENU_ID, MENU_NAME: payload.MENU_NAME };
}


// ============================================================================
// 4. SỬA THÔNG TIN MÓN (action: editMenuItem)
// ============================================================================

/**
 * PAYLOAD TỪ MenuManager.tsx:
 * {
 *   action:             "editMenuItem",
 *   MENU_ID:             "CF01",       ← dùng để tìm dòng, KHÔNG đổi mã
 *   MENU_NAME:            "Cà phê đen",
 *   PRICE:            30000,
 *   CATEGORY:           "Cà phê",
 *   co_san:             true,
 *   HAS_CUSTOMIZATIONS: true,
 *   inventoryQty:       0             ← bỏ qua
 * }
 */
function editMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.MENU_ID) throw new Error("Thiếu MENU_ID để sửa.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.MENU_ID.toString().trim()) {
      const hang = i + 1;

      // Cập nhật từng cột — chỉ cột nào được gửi mới ghi đè
      if (payload.MENU_NAME  !== undefined) sheet.getRange(hang, 2).setValue(payload.MENU_NAME.toString().trim());
      if (payload.PRICE  !== undefined) sheet.getRange(hang, 3).setValue(Number(payload.PRICE) || 0);
      if (payload.CATEGORY !== undefined) sheet.getRange(hang, 4).setValue(payload.CATEGORY.toString().trim());

      // co_san → STATUS (cột E)
      if (payload.co_san !== undefined) {
        sheet.getRange(hang, 5).setValue(payload.co_san);
      }
      if (payload.HAS_CUSTOMIZATIONS !== undefined) {
        sheet.getRange(hang, 6).setValue(payload.HAS_CUSTOMIZATIONS === true);
      }

      return { MENU_ID: payload.MENU_ID, MENU_NAME: payload.MENU_NAME };
    }
  }

  throw new Error("Không tìm thấy món có mã: " + payload.MENU_ID);
}


// ============================================================================
// 5. XÓA MÓN (action: deleteMenuItem)
// ============================================================================

/**
 * PAYLOAD TỪ MenuManager.tsx:
 * { action: "deleteMenuItem", MENU_ID: "CF01" }
 */
function deleteMenuItem(payload) {
  const db    = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_MENU);

  if (!sheet) throw new Error("Không tìm thấy sheet MENU.");
  if (!payload.MENU_ID) throw new Error("Thiếu MENU_ID để xóa.");

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === payload.MENU_ID.toString().trim()) {
      sheet.deleteRow(i + 1);
      return { MENU_ID: payload.MENU_ID, loiNhan: "Đã xóa món " + payload.MENU_ID };
    }
  }

  throw new Error("Không tìm thấy món cần xóa: " + payload.MENU_ID);
}
/**
 * ============================================================================
 * FILE: CustomFunctions.gs
 * CHỨC NĂNG: Hàm tự tạo (Custom Functions) dùng TRỰC TIẾP trên Google Sheets
 *
 * CÁCH DÙNG TRONG SHEET: Gõ tên hàm vào ô như một công thức bình thường.
 * VD: =DEM_SO_LUONG_MON("CF01", ORDERS!E2:E, ORDERS!K2:K)
 *
 * LƯU Ý: Các hàm này KHÔNG phải API endpoint — không gọi từ App được.
 *        Chúng chỉ chạy khi bạn dùng trong ô Google Sheets.
 *
 * DANH SÁCH HÀM:
 *   DEM_SO_LUONG_MON()   → Đếm tổng số lượng một món đã bán
 *   TINH_DOANH_THU()     → Tính tổng doanh thu theo khoảng ngày
 *   TOM_TAT_SOTAY()      → Tính tổng Thu hoặc Chi trong sheet SOTAY
 * ============================================================================
 */


/**
 * Đếm tổng số lượng của một món ăn đã bán (chỉ đơn Completed).
 *
 * CÁCH DÙNG: =DEM_SO_LUONG_MON("CF01", ORDERS!E2:E, ORDERS!K2:K)
 *
 * @param {string}              maMon       Mã món cần đếm (VD: "CF01")
 * @param {Array<Array<string>>} cotJson     Cột chứa JSON items (Cột D của ORDERS)
 * @param {Array<Array<string>>} cotTrangThai Cột chứa trạng thái đơn (Cột I của ORDERS)
 * @return {number} Tổng số lượng đã bán
 * @customfunction
 */
function DEM_SO_LUONG_MON(maMon, cotJson, cotTrangThai) {
  // Nếu ô mã món trống → trả về 0 ngay, không làm Sheet bị nặng
  if (!maMon || maMon === "") return 0;

  let tongSoLuong = 0;

  for (let i = 0; i < cotJson.length; i++) {
    const jsonString = cotJson[i][0];
    const trangThai  = cotTrangThai[i][0];

    // Chỉ đếm đơn đã hoàn thành ("Completed" hoặc "Hoàn thành")
    const daHoanThanh = trangThai === "Completed" || trangThai === "Hoàn thành";
    if (!jsonString || !daHoanThanh) continue;

    try {
      const danhSachMon = JSON.parse(jsonString);
      for (let j = 0; j < danhSachMon.length; j++) {
        const idMon = String(danhSachMon[j].id  || "").trim();
        const soLuong = Number(danhSachMon[j].qty || 0);
        if (idMon === String(maMon).trim()) {
          tongSoLuong += soLuong;
        }
      }
    } catch (e) {
      continue; // JSON hỏng → bỏ qua dòng đó
    }
  }

  return tongSoLuong;
}


/**
 * Tính tổng doanh thu trong một khoảng ngày (chỉ đơn Completed).
 *
 * CÁCH DÙNG: =TINH_DOANH_THU("2026-03-01", "2026-03-31", ORDERS!B2:B, ORDERS!J2:J, ORDERS!K2:K)
 *
 * @param {string}               ngayBatDau  Ngày bắt đầu, format "yyyy-MM-dd"
 * @param {string}               ngayKetThuc Ngày kết thúc, format "yyyy-MM-dd"
 * @param {Array<Array<string>>} cotNgay      Cột CREATED_AT (Cột B của ORDERS)
 * @param {Array<Array<number>>} cotTien      Cột TOTAL_AMOUNT (Cột H của ORDERS)
 * @param {Array<Array<string>>} cotTrangThai Cột ORDER_STATUS (Cột I của ORDERS)
 * @return {number} Tổng doanh thu trong khoảng ngày
 * @customfunction
 */
function TINH_DOANH_THU(ngayBatDau, ngayKetThuc, cotNgay, cotTien, cotTrangThai) {
  if (!ngayBatDau || !ngayKetThuc) return 0;

  const batDau   = new Date(ngayBatDau);
  batDau.setHours(0, 0, 0, 0);

  const ketThuc  = new Date(ngayKetThuc);
  ketThuc.setHours(23, 59, 59, 999);

  let tongDoanhThu = 0;

  for (let i = 0; i < cotNgay.length; i++) {
    const rawDate   = cotNgay[i][0];
    const soTien    = Number(cotTien[i][0]) || 0;
    const trangThai = cotTrangThai[i][0];

    if (!rawDate) continue;

    // Chỉ tính đơn đã hoàn thành
    const daHoanThanh = trangThai === "Completed" || trangThai === "Hoàn thành";
    if (!daHoanThanh) continue;

    try {
      const orderDate = new Date(rawDate);
      if (orderDate >= batDau && orderDate <= ketThuc) {
        tongDoanhThu += soTien;
      }
    } catch (e) {
      continue;
    }
  }

  return tongDoanhThu;
}


/**
 * Tính tổng Thu hoặc Chi trong sheet SOTAY theo tháng.
 *
 * CÁCH DÙNG:
 *   =TOM_TAT_SOTAY("Thu", 3, 2026, SOTAY!C2:C, SOTAY!E2:E, SOTAY!B2:B)
 *   =TOM_TAT_SOTAY("Chi", 3, 2026, SOTAY!C2:C, SOTAY!E2:E, SOTAY!B2:B)
 *
 * @param {string}               loai        "Thu" hoặc "Chi"
 * @param {number}               thang       Tháng (1-12)
 * @param {number}               nam         Năm (VD: 2026)
 * @param {Array<Array<string>>} cotLoai      Cột TRANS_TYPE (Cột C của SOTAY)
 * @param {Array<Array<number>>} cotSoTien    Cột AMOUNT (Cột E của SOTAY)
 * @param {Array<Array<string>>} cotThoiGian  Cột CREATED_AT (Cột B của SOTAY)
 * @return {number} Tổng số tiền theo loại và tháng
 * @customfunction
 */
function TOM_TAT_SOTAY(loai, thang, nam, cotLoai, cotSoTien, cotThoiGian) {
  if (!loai || !thang || !nam) return 0;

  let tongTien = 0;

  for (let i = 0; i < cotLoai.length; i++) {
    const phanLoai  = cotLoai[i][0];
    const soTien    = Number(cotSoTien[i][0]) || 0;
    const rawDate   = cotThoiGian[i][0];

    if (!phanLoai || !rawDate) continue;

    // So khớp loại (Thu/Chi), không phân biệt hoa thường
    if (phanLoai.toString().trim().toLowerCase() !== loai.toString().trim().toLowerCase()) continue;

    try {
      const d = new Date(rawDate);
      // Tháng trong JS bắt đầu từ 0 → cộng thêm 1 khi so sánh
      if (d.getMonth() + 1 === Number(thang) && d.getFullYear() === Number(nam)) {
        tongTien += soTien;
      }
    } catch (e) {
      continue;
    }
  }

  return tongTien;
}
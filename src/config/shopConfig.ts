/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │           CẤU HÌNH TIỆM — chỉnh ở đây, áp dụng khắp app   │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Muốn đổi thông tin tiệm, wifi, tài khoản ngân hàng…
 * → CHỈ CẦN SỬA FILE NÀY, không đụng code chỗ nào khác.
 */

// ─── THÔNG TIN TIỆM ───────────────────────────────────────────────────────────
export const SHOP = {
  /** Tên tiệm hiển thị trên app, hóa đơn, tiêu đề */
  name: 'Tiệm Nước Nhỏ',

  /** Địa chỉ tiệm */
  address: '248/14 Bùi Đình Túy, P.12, Bình Thạnh, TP.HCM',

  /** Số điện thoại tiệm (dùng cho hotline, không phải MoMo) */
  phone: '0769284483',

  /** Chi nhánh (để trống nếu chỉ có 1 chi nhánh) */
  branch: '',
} as const;

// ─── WIFI ─────────────────────────────────────────────────────────────────────
export const WIFI = {
  /** Tên mạng WiFi (SSID) */
  ssid: 'TiemNuocNho_5G',

  /** Mật khẩu WiFi */
  password: '12345678',
} as const;

// ─── THANH TOÁN — TIMO / BVBANK ───────────────────────────────────────────────
export const TIMO = {
  /** BIN ngân hàng Timo (Bản Việt) — không đổi */
  bin: '963388',

  /** Số tài khoản Timo */
  account: '8007041038207',

  /** Tên chủ tài khoản (IN HOA, đúng như ngân hàng) */
  ownerName: 'TRAN MAI NHI',

  /** Màu thương hiệu Timo */
  color: '#6F3CD7',

  /**
   * Raw VietQR string lấy từ app Timo.
   * Cách lấy: Timo → Nhận tiền → Mã QR → Chia sẻ → đọc nội dung QR bằng app quét
   *
   * ⚠️  Khi đổi tài khoản Timo, cập nhật chuỗi này.
   */
  baseQrString: '00020101021138570010A00000072701270006963388011380070410382070208QRIBFTTA53037045802VN6304E04B',
} as const;

// ─── THANH TOÁN — MOMO ────────────────────────────────────────────────────────
export const MOMO = {
  /** Số điện thoại MoMo */
  phone: '0769284483',

  /** Tên hiển thị (trong app) */
  ownerName: 'TRẦN MAI NHI',

  /** Màu thương hiệu MoMo */
  color: '#A50064',

  /**
   * Raw VietQR string lấy trực tiếp từ app MoMo.
   * Cách lấy: MoMo → Nhận tiền → Mã QR → Sao chép / Chia sẻ → lấy nội dung QR
   * (dùng app quét QR bất kỳ để đọc nội dung chuỗi bên dưới)
   *
   * ⚠️  Mỗi tài khoản MoMo có chuỗi RIÊNG — không dùng chung được.
   *     Khi đổi tài khoản MoMo, cập nhật chuỗi này.
   */
  baseQrString: '00020101021138630010A000000727013300069710250119PSP26021123000000070208QRIBFTTA53037045802VN62190515MOMOW2W4015735863043783',
} as const;

// ─── MÁY IN NHIỆT (tuỳ chọn) ─────────────────────────────────────────────────
export const PRINTER = {
  /** IP mặc định máy in nhiệt trên mạng LAN */
  defaultIp: '',
} as const;

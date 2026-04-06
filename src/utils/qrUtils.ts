/**
 * qrUtils.ts — EMV QR builder thuần JS (VietQR + MoMo + bất kỳ ngân hàng nào)
 * Không dùng thư viện bên ngoài → hoạt động trên mọi môi trường Vite/ESM.
 */

/** CRC16/CCITT — chuẩn EMV QR (poly=0x1021, init=0xFFFF) */
function crc16(s: string): string {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1);
      c &= 0xFFFF;
    }
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}

/** Build TLV string: ID(2) + LENGTH(2) + VALUE */
function tlv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

/**
 * Chuyển tiếng Việt có dấu → ASCII không dấu.
 * Cần thiết vì EMV QR sub-tag 08 chỉ nên dùng ASCII.
 */
function stripDiacritics(s: string): string {
  const map: Record<string, string> = {
    à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a',
    ă: 'a', ắ: 'a', ặ: 'a', ằ: 'a', ẳ: 'a', ẵ: 'a',
    ấ: 'a', ầ: 'a', ẩ: 'a', ẫ: 'a', ậ: 'a',
    è: 'e', é: 'e', ê: 'e', ë: 'e',
    ế: 'e', ề: 'e', ể: 'e', ễ: 'e', ệ: 'e',
    ì: 'i', í: 'i', î: 'i', ï: 'i',
    ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o',
    ố: 'o', ồ: 'o', ổ: 'o', ỗ: 'o', ộ: 'o',
    ơ: 'o', ớ: 'o', ờ: 'o', ở: 'o', ỡ: 'o', ợ: 'o',
    ù: 'u', ú: 'u', û: 'u', ü: 'u',
    ư: 'u', ứ: 'u', ừ: 'u', ử: 'u', ữ: 'u', ự: 'u',
    ý: 'y', ỳ: 'y', ỷ: 'y', ỹ: 'y', ỵ: 'y',
    đ: 'd',
    // Uppercase
    À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A',
    Ă: 'A', Ắ: 'A', Ặ: 'A', Ằ: 'A', Ẳ: 'A', Ẵ: 'A',
    Ấ: 'A', Ầ: 'A', Ẩ: 'A', Ẫ: 'A', Ậ: 'A',
    È: 'E', É: 'E', Ê: 'E', Ë: 'E',
    Ế: 'E', Ề: 'E', Ể: 'E', Ễ: 'E', Ệ: 'E',
    Ì: 'I', Í: 'I', Î: 'I', Ï: 'I',
    Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O',
    Ố: 'O', Ồ: 'O', Ổ: 'O', Ỗ: 'O', Ộ: 'O',
    Ơ: 'O', Ớ: 'O', Ờ: 'O', Ở: 'O', Ỡ: 'O', Ợ: 'O',
    Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U',
    Ư: 'U', Ứ: 'U', Ừ: 'U', Ử: 'U', Ữ: 'U', Ự: 'U',
    Ý: 'Y', Ỳ: 'Y', Ỷ: 'Y', Ỹ: 'Y', Ỵ: 'Y',
    Đ: 'D',
  };
  return s.split('').map(c => map[c] ?? c).join('').replace(/[^\x20-\x7E]/g, '').trim();
}

/**
 * Tạo QR động từ raw QR string (VietQR / MoMo EMV).
 *
 * Logic:
 *  1. Strip CRC suffix (8 ký tự cuối: "6304XXXX")
 *  2. Đổi initMethod "11" (static) → "12" (dynamic)
 *  3. Chèn tag 54 (amount) trước tag 58 (country code "VN")
 *  4. Chèn tag 62 sub-tag 08 (Purpose of Transaction / nội dung CK)
 *     - Nếu tag 62 đã tồn tại → append thêm subtag 08 vào bên trong
 *     - Nếu chưa có → tạo mới và chèn trước tag 63
 *  5. Tính lại CRC và append
 *
 * @param baseQr      Raw QR string từ app ngân hàng / ví
 * @param amount      Số tiền VND. Không truyền → QR tĩnh (không embed amount)
 * @param description Nội dung chuyển khoản (tự động strip dấu → ASCII, max 25 ký tự)
 */
export function buildDynamicQr(baseQr: string, amount?: number, description?: string): string {
  // 1. Bỏ CRC cuối ("6304XXXX" = 8 ký tự)
  let body = baseQr.slice(0, -8);

  // 2. Đổi initMethod 11 → 12 (dynamic)
  body = body.replace('010211', '010212');

  // 3. Chèn tag 54 (amount) trước tag 58 ("5802VN")
  if (amount && amount > 0) {
    const amountStr = amount.toString();
    const amountTag = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
    body = body.replace('5802VN', amountTag + '5802VN');
  }

  // 4. Chèn nội dung chuyển khoản (tag 62, sub-tag 08: Purpose of Transaction)
  if (description && description.trim()) {
    // Strip dấu → ASCII, chỉ giữ ký tự printable, max 25 ký tự
    const desc = stripDiacritics(description).replace(/[^\x20-\x7E]/g, '').slice(0, 25);

    if (desc) {
      const subtag08 = tlv('08', desc); // e.g. "0811NguyenA_ORD1"

      // Tìm tag 62 ngay sau "5802VN" (an toàn, không nhầm với subtag khác)
      const idx58 = body.indexOf('5802VN');
      if (idx58 >= 0) {
        const afterCountry = body.slice(idx58 + 6); // phần sau "5802VN"

        if (afterCountry.startsWith('62')) {
          // MoMo: đã có tag 62 → đọc content hiện tại, append subtag 08
          const existingLen = parseInt(afterCountry.slice(2, 4), 10);
          const existingContent = afterCountry.slice(4, 4 + existingLen);
          const newContent = existingContent + subtag08;
          const newTag62 = tlv('62', newContent);
          body = body.slice(0, idx58 + 6) + newTag62;
        } else {
          // Timo: không có tag 62 → tạo mới chứa subtag 08
          body = body.slice(0, idx58 + 6) + tlv('62', subtag08) + afterCountry;
        }
      }
    }
  }

  // 5. Tính lại CRC
  const payload = body + '6304';
  return payload + crc16(payload);
}

/** Alias cho Timo VietQR */
export const buildTimoQr = (baseQr: string, amount?: number, description?: string) =>
  buildDynamicQr(baseQr, amount, description);

/** Alias cho MoMo VietQR */
export const buildMomoQr = (baseQr: string, amount?: number, description?: string) =>
  buildDynamicQr(baseQr, amount, description);

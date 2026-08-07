/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │           CẤU HÌNH GOOGLE APPS SCRIPT                       │
 * └─────────────────────────────────────────────────────────────┘
 *
 * URL Apps Script KHÔNG hardcode trong mã nguồn.
 *
 * Lý do: URL /exec của một Apps Script đã publish là endpoint không
 * xác thực — ai có URL cũng gọi được. Để nó trong repo công khai
 * đồng nghĩa mở toàn bộ Google Sheet cho bất kỳ ai đọc repo.
 *
 * Cách cấu hình:
 *   - Khi build: đặt biến môi trường VITE_GAS_URL
 *   - Hoặc để trống, người dùng tự nhập trong màn hình Cài đặt
 *     (giá trị lưu ở localStorage key 'appsScriptUrl')
 */
export const DEFAULT_GAS_URL: string = import.meta.env.VITE_GAS_URL ?? '';

/** Có cấu hình sẵn URL mặc định khi build hay không */
export const HAS_DEFAULT_GAS_URL: boolean = DEFAULT_GAS_URL !== '';

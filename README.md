**[▶ Xem trang giới thiệu dự án](https://tiem-nuoc-nho.vercel.app)**

# 🥤 Tiệm Nước Nhỏ POS (Phiên bản 5)

Hệ thống quản lý bán hàng (Point of Sale) đa nền tảng dành riêng cho Tiệm Nước Nhỏ, được thiết kế với tiêu chí: **Nhanh – Đẹp – Đa Năng**.
Hệ thống kết hợp Frontend React linh hoạt cùng Backend Serverless (Google Apps Script) để tối ưu chi phí hạ tầng và đảm bảo quản lý dữ liệu realtime qua Google Sheets.

## ✨ Tính năng nổi bật ("Pro Max" UX/UI)

- 📱 **Giao diện Responsive Hoàn Hảo**:
  - **Chế độ Mobile**: Tối ưu với Bottom Navigation, thao tác bằng một ngón tay, cảm giác mượt mà y như native App dành cho nhân viên pha chế di chuyển.
  - **Chế độ Desktop/Tablet ("Pro Max")**: Tự động mở rộng thành hệ thống POS với Sidebar cố định, hỗ trợ Layout Grid đa cột. Tận dụng tối đa không gian hiển thị, lý tưởng cho quầy thu ngân cố định.
- 🛒 **Quản lý Giỏ hàng & Đơn Nháp**: Cho phép Order nhanh chóng, lưu nháp (mở khóa bàn) và chuyển đổi trạng thái mượt mà.
- 🗂️ **Lịch sử Giao Dịch Chuyên Nghiệp**: Lưu và truy xuất hàng ngàn đơn hàng trên bảng theo dõi rộng rãi kèm trạng thái thanh toán.
- 🤖 **Tích hợp Trợ lý AI**: Sẵn sàng tích hợp Gemini cho phân tích dữ liệu bán hàng.
- ☁️ **Backend Serverless bằng Google Apps Script**: Database hoàn toàn dựa trên Google Sheets (dễ dàng chỉnh sửa, backup, phân quyền), đồng bộ liên tục với App.

## 🛠 Công nghệ sử dụng

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion (hiệu ứng mượt mà), Lucide React (Icons).
- **Backend/Database:** Google Apps Script (triển khai dạng Web App), Google Sheets làm Database.
- **Khác:** `vietnam-qr-pay` để tự động tạo mã QR thanh toán ngân hàng, `better-sqlite3` cho môi trường dev local.

## 🚀 Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Khởi chạy Frontend (Local)

```bash
# Cài đặt thư viện
npm install

# Khởi chạy Vite Server
npm run dev
```

Truy cập hệ thống tại: `http://localhost:5006`

### 2. Triển khai Backend (Google Apps Script)

Di chuyển vào thư mục `gas/` (nơi chứa source code của Google Apps Script) và push lên:

```bash
cd gas
clasp push
```

*Lưu ý:* Yêu cầu bạn đã đăng nhập và thiết lập CLASP (`clasp login`) từ trước.

## 👥 Đội ngũ / Đóng góp
Dự án được xây dựng và duy trì nhằm phục vụ số hoá quy trình bán hàng hiệu quả và tức thời cho Tiệm Nước Nhỏ. Mọi đóng góp về tính năng hay phản hồi lỗi vui lòng báo cáo tại hệ thống quản lý nội bộ.

---
*Developed with ❤️ for Tiệm Nước Nhỏ*

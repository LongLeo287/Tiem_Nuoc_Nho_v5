// Giả lập database (Prisma hoặc SQL)
const db = {
  stock_alerts: {
    create: async (data: any) => console.log('Tạo cảnh báo mới:', data),
    findFirst: async (query: any) => null // Chưa có cảnh báo chưa giải quyết
  }
};

/**
 * Khi nguyên liệu giảm xuống dưới mức an toàn (safety_stock):
 * - Chèn bản ghi vào bảng `stock_alerts`
 */
export async function checkStockAlerts(ingredient: any) {
  if (ingredient.current_stock < ingredient.safety_stock) {
    // Kiểm tra xem đã có cảnh báo chưa giải quyết cho nguyên liệu này chưa
    const existingAlert = await db.stock_alerts.findFirst({
      where: {
        ingredient_id: ingredient.id,
        is_resolved: false
      }
    });

    if (!existingAlert) {
      // Insert record vào bảng stock_alerts
      await db.stock_alerts.create({
        data: {
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          current_stock: ingredient.current_stock,
          safety_stock: ingredient.safety_stock,
          triggered_at: new Date(),
          is_resolved: false
        }
      });
      
      console.log(`[Alert] Đã tạo cảnh báo tồn kho thấp cho: ${ingredient.name}`);
    }
  }
}

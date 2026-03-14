import { checkStockAlerts } from './stockAlerts';

/**
 * Xử lý trừ kho nguyên liệu dựa trên đơn hàng
 */
export async function triggerInventoryDeduction(orderId: string, appsScriptUrl: string) {
  if (!appsScriptUrl) return;
  
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'processOrderInventory',
        orderId,
        type: 'deduct'
      }),
    });
    
    const result = await response.json();
    if (result.status === 'success') {
      console.log(`[Inventory] Đã trừ kho cho đơn hàng ${orderId}`);
      if (result.warnings && result.warnings.length > 0) {
        // Trigger a custom event for warnings
        window.dispatchEvent(new CustomEvent('inventoryWarning', { detail: result.warnings }));
      }
    }
  } catch (error) {
    console.error(`[Inventory] Lỗi trừ kho:`, error);
  }
}

/**
 * Hoàn kho khi đơn hàng bị hủy
 */
export async function triggerInventoryRefund(orderId: string, appsScriptUrl: string) {
  if (!appsScriptUrl) return;
  
  try {
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'processOrderInventory',
        orderId,
        type: 'refund'
      }),
    });
    
    const result = await response.json();
    if (result.status === 'success') {
      console.log(`[Inventory] Đã hoàn kho cho đơn hàng ${orderId}`);
      window.dispatchEvent(new CustomEvent('inventoryRefunded', { detail: { orderId } }));
    }
  } catch (error) {
    console.error(`[Inventory] Lỗi hoàn kho:`, error);
  }
}

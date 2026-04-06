import { getDb, SyncAction } from './localDb';
import { useNotificationStore } from './useNotification'; 

export const handleConflict = async (action: SyncAction, serverData: any) => {
  const db = await getDb();
  
  // 1. Loại bỏ phiên bản local (Discard local version)
  // 2. Ghi đè IndexedDB bằng dữ liệu mới nhất từ server
  if (action.entity === 'orders') {
    await db.put('orders', serverData);
  }
  
  // 3. Re-render UI silently: 
  // Dispatch một event để UI tự động cập nhật lại với dữ liệu từ server.
  window.dispatchEvent(new CustomEvent('pos:data-updated', { 
    detail: { entity: action.entity, data: serverData } 
  }));

  // 4. Hiển thị toast thông báo màu vàng
  // Sử dụng hàm addNotification từ store/hook
  const { addNotification } = useNotificationStore.getState();
  addNotification({
    type: 'warning',
    message: 'Dữ liệu đã được cập nhật từ thiết bị khác',
    // Auto-dismiss được xử lý trong useNotification hook (8 giây)
  });
};

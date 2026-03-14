import { getDb, SyncAction } from './localDb';
import { handleConflict } from './conflictResolver';

const SYNC_INTERVAL = 5000; // 5 giây
let isSyncing = false;

// Hàm mô phỏng gửi dữ liệu lên server
const sendToServer = async (action: SyncAction) => {
  // Trong thực tế, bạn sẽ dùng fetch() để gọi API
  // const response = await fetch('/api/sync', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(action),
  // });
  // return response;
  
  // Giả lập API call
  return new Promise<{ ok: boolean; status: number; json: () => Promise<any> }>((resolve) => {
    setTimeout(() => {
      resolve({ ok: true, status: 200, json: async () => ({}) });
    }, 500);
  });
};

export const startSyncWorker = () => {
  // Chạy background loop bằng setInterval
  setInterval(async () => {
    if (isSyncing) return;
    
    // Kiểm tra kết nối mạng trước khi sync
    if (!navigator.onLine) return;

    isSyncing = true;
    try {
      const db = await getDb();
      // Lấy các action đang pending từ sync_queue
      const pendingActions = await db.getAllFromIndex('sync_queue', 'by-status', 'pending');
      
      if (pendingActions.length === 0) {
        isSyncing = false;
        return;
      }

      // Xử lý tuần tự từng action
      for (const action of pendingActions) {
        try {
          const response = await sendToServer(action);
          
          if (response.ok) {
            // Thành công: xóa khỏi queue, đánh dấu đã sync
            await db.delete('sync_queue', action.id);
          } else if (response.status === 409) {
            // Xung đột phiên bản (Version conflict)
            const serverData = await response.json();
            await handleConflict(action, serverData);
            // Sau khi xử lý xung đột, xóa action khỏi queue
            await db.delete('sync_queue', action.id);
          } else {
            throw new Error('Server error');
          }
        } catch (error) {
          // Thất bại: tăng retry_count và áp dụng exponential backoff
          action.retry_count += 1;
          
          if (action.retry_count >= 3) {
            action.status = 'failed';
          }
          
          await db.put('sync_queue', action);
          
          // Exponential backoff: đợi 1s, 2s, 4s
          const backoffTime = Math.pow(2, action.retry_count - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    } catch (error) {
      console.error('Sync worker error:', error);
    } finally {
      isSyncing = false;
    }
  }, SYNC_INTERVAL);
};

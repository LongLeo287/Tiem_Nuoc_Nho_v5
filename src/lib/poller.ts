import { useEffect, useRef, useState } from 'react';
import { getDb } from './localDb';

// Hàm lấy dữ liệu thay đổi từ server (Delta Sync)
export const fetchDeltaSync = async () => {
  const lastSyncedAt = localStorage.getItem('last_synced_at') || new Date(0).toISOString();
  
  try {
    // Gọi API với tham số last_synced_at
    // const response = await fetch(`/api/sync?since=${lastSyncedAt}`);
    // if (!response.ok) throw new Error('Sync failed');
    // const data = await response.json();
    
    // Giả lập API response trả về ONLY records updated after that timestamp
    const data = {
      orders: [], // Chỉ chứa các order được cập nhật
      timestamp: new Date().toISOString()
    };
    
    if (data.orders && data.orders.length > 0) {
      const db = await getDb();
      const tx = db.transaction('orders', 'readwrite');
      for (const order of data.orders) {
        await tx.store.put(order);
      }
      await tx.done;
      
      // Báo cho UI biết có dữ liệu mới để re-render
      window.dispatchEvent(new CustomEvent('pos:data-updated'));
    }
    
    // Cập nhật thời gian sync cuối
    localStorage.setItem('last_synced_at', data.timestamp);
    
  } catch (error) {
    console.error('Delta sync error:', error);
  }
};

// Custom hook: useSmartPolling
export const useSmartPolling = () => {
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Theo dõi tương tác người dùng (Track last user interaction timestamp)
  useEffect(() => {
    const handleInteraction = () => {
      setLastInteraction(Date.now());
    };

    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('mousedown', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
    };
  }, []);

  // Logic điều chỉnh chu kỳ Polling (Dynamic interval logic)
  useEffect(() => {
    const setupPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      const now = Date.now();
      const timeSinceLastInteraction = now - lastInteraction;
      const isIdle = timeSinceLastInteraction >= 2 * 60 * 1000; // 2 phút

      // Nếu idle >= 2 phút -> poll mỗi 30s. Ngược lại -> poll mỗi 5s.
      const pollInterval = isIdle ? 30000 : 5000;

      intervalRef.current = setInterval(() => {
        if (navigator.onLine) {
          fetchDeltaSync();
        }
      }, pollInterval);
    };

    setupPolling();

    // Cần setup lại định kỳ để kiểm tra trạng thái idle
    const checkIdleInterval = setInterval(setupPolling, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(checkIdleInterval);
    };
  }, [lastInteraction]);
};

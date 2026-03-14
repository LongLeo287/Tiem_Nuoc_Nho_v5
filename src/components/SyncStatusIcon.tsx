import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff } from 'lucide-react';
import { getDb } from '../lib/localDb';

export function SyncStatusIcon() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  // Detect offline via window.addEventListener('online'/'offline')
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect syncing when sync_queue has pending items
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkSyncStatus = async () => {
      if (!isOnline) {
        setIsSyncing(false);
        return;
      }

      try {
        const db = await getDb();
        const pendingCount = await db.countFromIndex('sync_queue', 'by-status', 'pending');
        setIsSyncing(pendingCount > 0);
      } catch (error) {
        console.error('Error checking sync status:', error);
      }
    };

    // Kiểm tra định kỳ mỗi 1 giây
    interval = setInterval(checkSyncStatus, 1000);
    checkSyncStatus(); // Kiểm tra ngay lần đầu

    return () => clearInterval(interval);
  }, [isOnline]);

  // State: offline -> cloud icon, red, no animation
  if (!isOnline) {
    return (
      <div className="flex items-center justify-center text-red-500" title="Offline">
        <CloudOff className="w-6 h-6" />
      </div>
    );
  }

  // State: syncing -> cloud icon with pulse animation
  // State: online -> cloud icon, static, green
  return (
    <div 
      className={`flex items-center justify-center ${isSyncing ? 'text-blue-500' : 'text-emerald-500'}`}
      title={isSyncing ? 'Đang đồng bộ...' : 'Đã đồng bộ'}
    >
      <Cloud className={`w-6 h-6 ${isSyncing ? 'animate-pulse' : ''}`} />
    </div>
  );
}

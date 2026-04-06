import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  isExiting?: boolean; // Cờ để kích hoạt animation fade-out
}

// Simple global state for notifications
let globalNotifications: Notification[] = [];
let listeners: ((notifications: Notification[]) => void)[] = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener([...globalNotifications]));
};

export const useNotificationStore = {
  getState: () => ({
    notifications: globalNotifications,
    addNotification: (notif: Omit<Notification, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      globalNotifications = [...globalNotifications, { ...notif, id }];
      notifyListeners();
      return id;
    },
    removeNotification: (id: string) => {
      globalNotifications = globalNotifications.filter(n => n.id !== id);
      notifyListeners();
    },
    markAsExiting: (id: string) => {
      globalNotifications = globalNotifications.map(n => 
        n.id === id ? { ...n, isExiting: true } : n
      );
      notifyListeners();
    }
  }),
  subscribe: (listener: (notifications: Notification[]) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};

export const useNotification = () => {
  const [notifications, setNotifications] = useState<Notification[]>(globalNotifications);

  useEffect(() => {
    const unsubscribe = useNotificationStore.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const { addNotification, removeNotification, markAsExiting } = useNotificationStore.getState();

  // Xử lý auto-dismiss 8s
  useEffect(() => {
    const timers: Record<string, NodeJS.Timeout> = {};

    notifications.forEach(notif => {
      // Chỉ đặt timer nếu thông báo chưa ở trạng thái exiting và chưa có timer
      if (!notif.isExiting && !timers[notif.id]) {
        // Đặt timer 8000ms (8 giây)
        timers[notif.id] = setTimeout(() => {
          // Bắt đầu animation fade-out (opacity 1 -> 0, 300ms)
          markAsExiting(notif.id);
          
          // Đợi 300ms cho animation hoàn tất rồi mới xóa khỏi state
          setTimeout(() => {
            removeNotification(notif.id);
          }, 300);
          
        }, 8000);
      }
    });

    return () => {
      // Use clearTimeout on unmount to prevent memory leaks
      Object.values(timers).forEach(clearTimeout);
    };
  }, [notifications, markAsExiting, removeNotification]);

  return { notifications, addNotification, removeNotification };
};

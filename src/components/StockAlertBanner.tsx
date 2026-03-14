import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ShoppingCart } from 'lucide-react';
import { usePermission } from '../hooks/usePermission';
import { motion, AnimatePresence } from 'framer-motion';

interface StockAlert {
  id: string;
  ingredient_id: number;
  ingredient_name: string;
  current_stock: number;
  safety_stock: number;
  unit: string;
  triggered_at: string;
  is_resolved: boolean;
}

interface StockAlertBannerProps {
  appMode?: 'order' | 'management';
}

export const StockAlertBanner: React.FC<StockAlertBannerProps> = ({ appMode }) => {
  const { isManager } = usePermission();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Chỉ Manager và ở chế độ Management mới thấy banner này
    if (!isManager || appMode === 'order') return;

    const fetchAlerts = async () => {
      try {
        // Gọi API lấy danh sách cảnh báo chưa giải quyết
        // Trong thực tế: const res = await fetch('/api/alerts');
        // Giả lập dữ liệu:
        const mockData: StockAlert[] = [
          {
            id: '1',
            ingredient_id: 101,
            ingredient_name: 'Cà phê hạt',
            current_stock: 400,
            safety_stock: 500,
            unit: 'g',
            triggered_at: new Date().toISOString(),
            is_resolved: false
          }
        ];
        setAlerts(mockData);
      } catch (error) {
        console.error('Lỗi khi tải cảnh báo tồn kho:', error);
      }
    };

    fetchAlerts();
    
    // Poll for new alerts every 30 seconds
    const intervalId = setInterval(fetchAlerts, 30000);
    return () => clearInterval(intervalId);
  }, [isManager]);

  const handleResolve = async (id: string) => {
    try {
      // Gọi API đánh dấu đã giải quyết
      // await fetch(`/api/alerts/${id}`, { method: 'PATCH' });
      
      // Tự động dismiss nếu alert đã được giải quyết
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Lỗi khi giải quyết cảnh báo:', error);
    }
  };

  const handleCreateOrder = (alert: StockAlert) => {
    // Mở CreatePurchaseOrderModal
    console.log('Mở modal tạo đơn nhập hàng cho:', alert.ingredient_name);
    // Trong thực tế, bạn sẽ dispatch một action hoặc set state để mở modal
  };

  if (!isManager || appMode === 'order' || alerts.length === 0 || !isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col gap-2 p-4 pt-16 pointer-events-none">
      <AnimatePresence>
        {alerts.map(alert => {
          // Nền vàng cho cảnh báo (current < safety × 1.5)
          // Nền đỏ cho nguy cấp (current < safety)
          const isCritical = alert.current_stock < alert.safety_stock;
          const bgColor = isCritical ? 'bg-red-500' : 'bg-yellow-500';
          const textColor = isCritical ? 'text-white' : 'text-stone-900';
          const iconColor = isCritical ? 'text-white' : 'text-stone-900';

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`pointer-events-auto flex items-center justify-between p-3 rounded-xl shadow-lg ${bgColor} ${textColor}`}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className={`w-5 h-5 ${iconColor}`} />
                <div>
                  <p className="text-sm font-bold">
                    {isCritical ? 'Sắp hết nguyên liệu!' : 'Cảnh báo tồn kho'}
                  </p>
                  <p className="text-xs opacity-90">
                    {alert.ingredient_name}: {alert.current_stock} / {alert.safety_stock} {alert.unit}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCreateOrder(alert)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isCritical 
                      ? 'bg-white text-red-600 hover:bg-red-50' 
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Nhập hàng ngay
                </button>
                <button
                  onClick={() => handleResolve(alert.id)}
                  className={`p-1.5 rounded-lg hover:bg-black/10 transition-colors`}
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

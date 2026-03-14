import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { OrderData, DashboardData, SoTayItem, MenuItem, OrderRow, CartItem } from '../types';
import { triggerInventoryDeduction, triggerInventoryRefund } from '../lib/inventoryWorker';

interface DataContextType {
  menuItems: MenuItem[];
  inventoryItems: MenuItem[];
  orders: OrderData[];
  financeData: OrderData[];
  dashboardData: DashboardData | null;
  soTayData: SoTayItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refreshInterval: number;
  autoSyncEnabled: boolean;
  lastUpdated: Date | null;
  isOnline: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  fetchAllData: (showFullLoader?: boolean) => Promise<void>;
  updateOrderStatus: (orderId: string, status: string, additionalData?: any) => Promise<boolean>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  createOrder: (orderData: any, showLoader?: boolean) => Promise<boolean>;
  fixAll: () => Promise<boolean>;
  addSoTay: (item: { phan_loai: string; danh_muc: string; so_tien: number; ghi_chu: string; thoi_gian?: string; nguoi_tao?: string }) => Promise<boolean>;
  deleteSoTay: (id: string) => Promise<boolean>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Header chuẩn cho mọi POST request lên GAS
// GAS doPost() đọc qua e.postData.contents nên dùng text/plain
const GAS_POST_HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };

export const DataProvider: React.FC<{ children: React.ReactNode; appsScriptUrl: string }> = ({ children, appsScriptUrl }) => {

  // ── Menu State ──────────────────────────────────────────────────────────────
  const [menuOverrides, setMenuOverrides] = useState<Record<string, Partial<MenuItem>>>(() => {
    const saved = localStorage.getItem('menu_overrides');
    return saved ? JSON.parse(saved) : {};
  });

  const [rawMenuItems, setRawMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('menu_data');
    return saved ? JSON.parse(saved) : [];
  });

  const menuItems = React.useMemo(() => {
    return rawMenuItems.map(item => ({
      ...item,
      ...(menuOverrides[item.id] || {})
    }));
  }, [rawMenuItems, menuOverrides]);

  const inventoryItems = React.useMemo(
    () => menuItems.filter(item => item.inventoryQty !== undefined),
    [menuItems]
  );

  // Cập nhật override local (bật/tắt hết hàng tức thì không cần chờ sync)
  const updateMenuItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setMenuOverrides(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...updates } };
      localStorage.setItem('menu_overrides', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Orders / Dashboard / SoTay State ───────────────────────────────────────
  const [orders, setOrders] = useState<OrderData[]>(() => {
    const saved = localStorage.getItem('orders_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [dashboardData, setDashboardData]   = useState<DashboardData | null>(null);
  const [soTayData, setSoTayData]           = useState<SoTayItem[]>([]);
  const [isLoading, setIsLoading]           = useState(false);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [isOnline, setIsOnline]             = useState(true);

  const [refreshInterval, setRefreshIntervalState] = useState(() => {
    const saved = localStorage.getItem('refreshInterval');
    return saved ? Math.max(15, Number(saved)) : 30;
  });
  const [autoSyncEnabled, setAutoSyncEnabledState] = useState(() => {
    const saved = localStorage.getItem('autoSyncEnabled');
    return saved !== 'false';
  });

  const isFetchingRef    = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const setRefreshInterval = (interval: number) => {
    const safeInterval = Math.max(15, interval);
    setRefreshIntervalState(safeInterval);
    localStorage.setItem('refreshInterval', String(safeInterval));
  };

  const setAutoSyncEnabled = (enabled: boolean) => {
    setAutoSyncEnabledState(enabled);
    localStorage.setItem('autoSyncEnabled', String(enabled));
  };

  // ── fetchAllData ────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (showFullLoader = false) => {
    if (!appsScriptUrl || isFetchingRef.current) return;

    const now = Date.now();
    // Throttle: không fetch lại nếu vừa fetch trong vòng 5 giây (trừ khi full reload)
    if (now - lastFetchTimeRef.current < 5000 && !showFullLoader) return;

    isFetchingRef.current = true;
    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      // Gọi song song 4 API cùng lúc để nhanh nhất có thể
      const [menuRes, ordersRes, dashboardRes, soTayRes] = await Promise.all([
        fetch(`${appsScriptUrl}?action=getMenu`).then(r => r.json()).catch(() => null),
        fetch(`${appsScriptUrl}?action=getOrders`).then(r => r.json()).catch(() => null),
        fetch(`${appsScriptUrl}?action=getDashboard`).then(r => r.json()).catch(() => null),
        fetch(`${appsScriptUrl}?action=getSoTay`).then(r => r.json()).catch(() => null),
      ]);

      // ── [1] XỬ LÝ MENU ─────────────────────────────────────────────────────
      // GAS trả về: { status: 'success', data: [{ma_mon, ten_mon, gia_ban, danh_muc, trang_thai, has_customizations}] }
      const menuData = menuRes?.status === 'success' && Array.isArray(menuRes.data)
        ? menuRes.data : null;

      if (menuData) {
        const menuMap = new Map<string, MenuItem>();
        menuData.forEach((item: any) => {
          const id = String(item.ma_mon || '').trim();
          if (!id || menuMap.has(id)) return;
          menuMap.set(id, {
            id,
            name:               String(item.ten_mon || ''),
            price:              Number(item.gia_ban) || 0,
            category:           String(item.danh_muc || 'Khác'),
            // trang_thai = true → còn hàng → isOutOfStock = false
            isOutOfStock:       item.trang_thai === false,
            hasCustomizations:  item.has_customizations === true,
          });
        });
        const mappedMenu   = Array.from(menuMap.values());
        const menuString   = JSON.stringify(mappedMenu);
        if (localStorage.getItem('menu_data') !== menuString) {
          setRawMenuItems(mappedMenu);
          localStorage.setItem('menu_data', menuString);
        }
      }

      // ── [2] XỬ LÝ ORDERS ───────────────────────────────────────────────────
      // GAS (OrderService.gs) đã trả về object đã group sẵn, ITEMS là mảng [{id, qty}]
      // Keys: ORDER_ID, TIMESTAMP, TABLE_NO, ITEMS, SUBTOTAL, THANH_TIEN,
      //       STATUS, PAYMENT_METHOD, CUSTOMER_NAME, PHONE, NOTES
      const ordersData = ordersRes?.status === 'success' && Array.isArray(ordersRes.data)
        ? ordersRes.data : null;

      if (ordersData) {
        const mappedOrders: OrderData[] = ordersData.map((row: any) => {
          // Parse items: GAS trả về mảng [{id, qty}] hoặc JSON string → chuyển sang CartItem[]
          let rawItems: any[] = [];
          if (Array.isArray(row.ITEMS)) {
            rawItems = row.ITEMS;
          } else if (typeof row.ITEMS === 'string' && row.ITEMS.trim().startsWith('[')) {
            try {
              rawItems = JSON.parse(row.ITEMS);
            } catch (e) {
              console.error('Error parsing ITEMS JSON:', e);
            }
          }

          const cartItems: CartItem[] = rawItems.map((it: any) => {
            // Tìm tên + giá từ menuItems hiện tại (để hiển thị đẹp)
            const menuItem = rawMenuItems.find(m => m.id === String(it.id));
            return {
              id:          String(it.id),
              cartItemId:  `${row.ORDER_ID}-${it.id}`,
              name:        menuItem?.name || String(it.id),
              price:       menuItem?.price || 0,
              unitPrice:   menuItem?.price || 0,
              quantity:    Number(it.qty) || 1,
              category:    menuItem?.category || '',
              isOutOfStock: false,
              note:        String(it.note || ''),
              size:        String(it.size || 'M'),
              temperature: String(it.temperature || ''),
              sugarLevel:  String(it.sugarLevel || ''),
              iceLevel:    String(it.iceLevel || ''),
            };
          });

          return {
            orderId:       String(row.ORDER_ID || ''),
            customerName:  String(row.CUSTOMER_NAME || 'Khách'),
            phoneNumber:   String(row.PHONE || ''),
            tableNumber:   String(row.TABLE_NO || ''),
            items:         cartItems,
            // Dùng THANH_TIEN (tiền thực thu) làm total chính
            total:         Number(row.THANH_TIEN) || 0,
            timestamp:     String(row.TIMESTAMP || new Date().toISOString()),
            notes:         String(row.NOTES || ''),
            paymentMethod: String(row.PAYMENT_METHOD || 'Tiền mặt'),
            orderStatus:   String(row.STATUS || 'Completed'),
          };
        });

        const ordersString = JSON.stringify(mappedOrders);
        if (localStorage.getItem('orders_data') !== ordersString) {
          setOrders(mappedOrders);
          localStorage.setItem('orders_data', ordersString);
        }
      }

      // ── [3] XỬ LÝ DASHBOARD ────────────────────────────────────────────────
      // GAS trả về đúng interface DashboardData: { revenue, orders, topItems }
      if (dashboardRes?.status === 'success' && dashboardRes.data) {
        const dashboardString = JSON.stringify(dashboardRes.data);
        if (JSON.stringify(dashboardData) !== dashboardString) {
          setDashboardData(dashboardRes.data);
        }
      }

      // ── [4] XỬ LÝ SỔ TAY ───────────────────────────────────────────────────
      // GAS trả về: [{id_thu_chi, thoi_gian, phan_loai, danh_muc, so_tien, ghi_chu}]
      const soTayArr = soTayRes?.status === 'success' && Array.isArray(soTayRes.data)
        ? soTayRes.data : null;

      if (soTayArr) {
        const mappedSoTay: SoTayItem[] = soTayArr.map((item: any, idx: number) => ({
          id_thu_chi: String(item.id_thu_chi || `st-${idx}`),
          phan_loai:  String(item.phan_loai  || 'Chi') as 'Thu' | 'Chi',
          danh_muc:   String(item.danh_muc   || 'Khác'),
          so_tien:    Number(item.so_tien)   || 0,
          ghi_chu:    String(item.ghi_chu    || ''),
          thoi_gian:  String(item.thoi_gian  || new Date().toISOString()),
        }));
        const soTayString = JSON.stringify(mappedSoTay);
        if (JSON.stringify(soTayData) !== soTayString) {
          setSoTayData(mappedSoTay);
        }
      }

      setLastUpdated(new Date());
      setIsOnline(true);
      lastFetchTimeRef.current = Date.now();

    } catch (err) {
      console.error('[DataContext] fetchAllData error:', err);
      setIsOnline(false);
      setError('Lỗi kết nối máy chủ');
    } finally {
      if (showFullLoader) setIsLoading(false);
      else setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [appsScriptUrl]);

  // ── Auto-sync polling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!autoSyncEnabled || !appsScriptUrl) return;
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !isFetchingRef.current) {
        fetchAllData(false);
      }
    }, refreshInterval * 1000);
    return () => clearInterval(intervalId);
  }, [fetchAllData, refreshInterval, autoSyncEnabled, appsScriptUrl]);

  // ── Initial load ────────────────────────────────────────────────────────────
  const hasInitialFetched = useRef(false);
  useEffect(() => {
    if (appsScriptUrl && (autoSyncEnabled || !hasInitialFetched.current)) {
      fetchAllData(true);
      hasInitialFetched.current = true;
    }
  }, [appsScriptUrl, autoSyncEnabled, fetchAllData]);

  // ── updateOrderStatus ───────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, status: string, additionalData?: any) => {
    if (!appsScriptUrl) return false;
    setIsLoading(true);

    // Chuẩn hoá status: map slug tiếng Anh (StaffView) → tiếng Việt (GAS lưu, UI filter)
    const STATUS_MAP: Record<string, string> = {
      'processing':  'Đang làm',
      'completed':   'Hoàn thành',
      'cancelled':   'Đã hủy',
      'Cancelled':   'Đã hủy',
      'Completed':   'Hoàn thành',
      'Pending':     'Chờ xử lý',
      'Chờ xử lý':  'Chờ xử lý',
      'Đã nhận':    'Đã nhận',
      'Đang làm':   'Đang làm',
      'Hoàn thành': 'Hoàn thành',
      'Đã hủy':     'Đã hủy',
      'Công nợ':    'Công nợ',
    };
    const normalizedStatus = STATUS_MAP[status] || status;

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({
          action: 'updateOrderStatus',
          orderId,
          status: normalizedStatus,
          ...additionalData,
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        // Trigger inventory actions based on status
        if (normalizedStatus === 'Hoàn thành' || normalizedStatus === 'Đã thanh toán') {
          triggerInventoryDeduction(orderId, appsScriptUrl);
        } else if (normalizedStatus === 'Đã hủy') {
          triggerInventoryRefund(orderId, appsScriptUrl);
        }

        await fetchAllData(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[DataContext] updateOrderStatus error:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ── deleteOrder ─────────────────────────────────────────────────────────────
  const deleteOrder = async (orderId: string) => {
    if (!appsScriptUrl) return false;
    setIsLoading(true);
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS, // FIX: header bị thiếu ở version cũ
        body: JSON.stringify({ action: 'deleteOrder', orderId }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        // Optimistic update: xóa khỏi local state ngay, không cần chờ refetch
        setOrders(prev => prev.filter(o => o.orderId !== orderId));
        return true;
      }
      return false;
    } catch (err) {
      console.error('[DataContext] deleteOrder error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ── createOrder ─────────────────────────────────────────────────────────────
  // FIX CHÍNH: Gửi đủ total/subtotal/thanhTien để GAS không ghi 0đ vào Sheet
  const createOrder = async (orderData: any, showLoader = true) => {
    if (!appsScriptUrl) return false;
    if (showLoader) setIsLoading(true);
    try {
      // Chuyển items từ CartItem[] → [{id, qty, size, note, temperature, sugarLevel, iceLevel}] đúng format GAS mong đợi
      const itemsPayload = orderData.items.map((item: CartItem) => ({
        id:   item.id,
        qty:  item.quantity,
        size: item.size || 'M',
        note: item.note || '',
        temperature: item.temperature || '',
        sugarLevel:  item.sugarLevel || '',
        iceLevel:    item.iceLevel || '',
      }));

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({
          action:        'createOrder',
          items:         itemsPayload,
          customerName:  orderData.customerName  || '',
          phoneNumber:   orderData.phoneNumber   || '',
          tableNumber:   orderData.tableNumber   || '',
          paymentMethod: orderData.paymentMethod || 'Tiền mặt',
          notes:         orderData.notes         || '',
          // FIX: 3 trường tiền — GAS dùng thanhTien làm giá trị chính
          total:         Number(orderData.total) || 0,
          subtotal:      Number(orderData.total) || 0,
          thanhTien:     Number(orderData.total) || 0,
          staffId:       orderData.staffId || '',
          staffName:     orderData.staffName || '',
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData(false);
        return true;
      }
      console.error('[DataContext] createOrder GAS error:', result.message);
      return false;
    } catch (e) {
      console.error('[DataContext] createOrder error:', e);
      return false;
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // ── fixAll ──────────────────────────────────────────────────────────────────
  const fixAll = async () => {
    if (!appsScriptUrl) return false;
    setIsLoading(true);
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({ action: 'fixAll' }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData(false);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ── addSoTay ────────────────────────────────────────────────────────────────
  const addSoTay = async (item: {
    phan_loai: string; danh_muc: string; so_tien: number;
    ghi_chu: string; thoi_gian?: string; nguoi_tao?: string;
  }) => {
    if (!appsScriptUrl) return false;
    setIsLoading(true);
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({ action: 'addSoTay', ...item }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData(false);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ── deleteSoTay ─────────────────────────────────────────────────────────────
  const deleteSoTay = async (id: string) => {
    if (!appsScriptUrl) return false;
    setIsLoading(true);
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({ action: 'deleteSoTay', id }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData(false);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DataContext.Provider value={{
      menuItems,
      inventoryItems,
      orders,
      financeData:   orders, // FinanceDashboard tự tính từ orders + soTayData
      dashboardData,
      soTayData,
      isLoading,
      isRefreshing,
      error,
      refreshInterval,
      autoSyncEnabled,
      lastUpdated,
      isOnline,
      setAutoSyncEnabled,
      setRefreshInterval,
      fetchAllData,
      updateOrderStatus,
      deleteOrder,
      createOrder,
      fixAll,
      addSoTay,
      deleteSoTay,
      updateMenuItem,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
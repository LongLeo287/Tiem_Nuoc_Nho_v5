import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { OrderData, DashboardData, SoTayItem, MenuItem, OrderRow, CartItem } from '../types';
import { triggerInventoryDeduction, triggerInventoryRefund } from '../lib/inventoryWorker';
import { supabaseFetch as fetch } from '../lib/supabaseFetch';

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
  lockOrder: (orderId: string, staffName: string) => Promise<{ success: boolean; message?: string }>;
  unlockOrder: (orderId: string) => Promise<{ success: boolean; message?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Header chuẩn cho mọi POST request lên GAS
// GAS doPost() đọc qua e.postData.contents nên dùng text/plain
const GAS_POST_HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };

/**
 * fetchWithRetry — wrap fetch với retry tự động khi thất bại.
 * @param url   GAS endpoint
 * @param init  RequestInit
 * @param retries  số lần retry tối đa (mặc định 2)
 * @param backoff  delay đầu tiên ms (tăng gấp đôi mỗi lần)
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2,
  backoff = 800,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // HTTP lỗi (4xx/5xx) — không retry
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === retries) throw err;
      // Chờ trước khi retry (exponential backoff)
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, attempt)));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

export const DataProvider: React.FC<{ children: React.ReactNode; appsScriptUrl: string }> = ({ children, appsScriptUrl }) => {

  // ── Menu State ──────────────────────────────────────────────────────────────
  const [menuOverrides, setMenuOverrides] = useState<Record<string, Partial<MenuItem>>>(() => {
    try {
      const saved = localStorage.getItem('menu_overrides');
      return saved ? (JSON.parse(saved) || {}) : {};
    } catch { return {}; }
  });

  const [rawMenuItems, setRawMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem('menu_data');
      return saved ? (JSON.parse(saved) || []) : [];
    } catch { return []; }
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

  // ── lockOrder / unlockOrder ────────────────────────────────────────────────
  const lockOrder = async (orderId: string, staffName: string) => {
    if (!appsScriptUrl) return { success: false, message: 'URL không hợp lệ' };
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({ action: 'lockOrder', orderId, staffName }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setRawOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, lockedBy: staffName } : o));
        return { success: true };
      }
      return { success: false, message: result.message || 'Lỗi khoá đơn' };
    } catch (e) {
      console.error('[DataContext] lockOrder error:', e);
      return { success: false, message: 'Lỗi kết nối' };
    }
  };

  const unlockOrder = async (orderId: string) => {
    if (!appsScriptUrl) return { success: false, message: 'URL không hợp lệ' };
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify({ action: 'unlockOrder', orderId }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setRawOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, lockedBy: undefined } : o));
        return { success: true };
      }
      return { success: false, message: result.message || 'Lỗi mở khoá đơn' };
    } catch (e) {
      console.error('[DataContext] unlockOrder error:', e);
      return { success: false, message: 'Lỗi kết nối' };
    }
  };

  // ── Orders / Dashboard / SoTay State ───────────────────────────────────────
  // rawOrders: raw data từ API/localStorage (có thể có tên/giá cũ hoặc thiếu)
  const [rawOrders, setRawOrders] = useState<OrderData[]>(() => {
    try {
      const saved = localStorage.getItem('orders_data');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      
      // Backfill paymentStatus for old records in localStorage that may be missing it
      return parsed.map(o => ({
        ...o,
        paymentStatus: o.paymentStatus ||
          (o.orderStatus === 'Hoàn thành' && o.paymentMethod && o.paymentMethod !== 'Chưa xác định'
            ? 'Đã thanh toán'
            : o.orderStatus === 'Công nợ' ? 'Công nợ' : 'Chưa thanh toán'),
      }));
    } catch { return []; }
  });

  // orders: computed từ rawOrders + menuItems, resolve tên/giá realtime
  // Giống pattern rawMenuItems + menuOverrides → menuItems
  const orders = React.useMemo(() => {
    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    return rawOrders.map(order => ({
      ...order,
      // Null-safe: order.items có thể undefined nếu data cũ trong localStorage
      items: (Array.isArray(order.items) ? order.items : []).map(item => {
        // String(item.id): tránh type mismatch number vs string giữa localStorage và menuMap
        const live = item?.id != null ? menuMap.get(String(item.id)) : undefined;
        return {
          ...item,
          name:      live?.name     ?? item.name     ?? String(item.id ?? ''),
          price:     live?.price    ?? item.price    ?? 0,
          unitPrice: live?.price    ?? item.unitPrice ?? 0,
          category:  live?.category ?? item.category ?? '',
        };
      }),
    }));
  }, [rawOrders, menuItems]);
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
      // GAS trả về: { status: 'success', data: [{ma_mon, ten_mon, gia_ban, danh_muc, trang_thai, has_customizations}] }
      const menuData = menuRes?.status === 'success' && Array.isArray(menuRes.data)
        ? menuRes.data : null;

      // freshMenuItems: dùng data vừa fetch (nếu có) hoặc fallback về rawMenuItems
      // để orders mapping trong cùng call này không bị stale closure
      let freshMenuItems: MenuItem[] = rawMenuItems;

      if (menuData) {
        const menuMap = new Map<string, MenuItem>();
        menuData.forEach((item: any) => {
          const id = String(item.MENU_ID || item.ma_mon || '').trim();
          if (!id || menuMap.has(id)) return;
          menuMap.set(id, {
            id,
            name:               String(item.MENU_NAME || item.ten_mon || ''),
            price:              Number(item.PRICE || item.gia_ban) || 0,
            category:           String(item.CATEGORY || item.danh_muc || 'Khác'),
            // STATUS = true → còn hàng → isOutOfStock = false
            isOutOfStock:       (item.STATUS !== undefined ? item.STATUS : item.trang_thai) === false,
            hasCustomizations:  item.HAS_CUSTOMIZATIONS === true || item.has_customizations === true,
          });
        });
        const mappedMenu   = Array.from(menuMap.values());
        freshMenuItems     = mappedMenu; // ← dùng ngay trong cùng call
        const menuString   = JSON.stringify(mappedMenu);
        if (localStorage.getItem('menu_data') !== menuString) {
          setRawMenuItems(mappedMenu);
          localStorage.setItem('menu_data', menuString);
        }
      }

      // ── [2] XỬ LÝ ORDERS ───────────────────────────────────────────────────
      // Normalize tên cột: GAS có thể trả về Order_ID, order_id, ma_don, v.v.
      // → Chuyển tất cả về dạng chuẩn ALL_CAPS trước khi map.
      const normalizeOrderRow = (row: any): any => {
        const upper: Record<string, any> = {};
        Object.keys(row).forEach(k => { upper[k.toUpperCase().replace(/[\s-]/g, '_')] = row[k]; });

        const get = (...keys: string[]) => {
          for (const key of keys) {
            const v = upper[key.toUpperCase().replace(/[\s-]/g, '_')];
            if (v !== undefined && v !== null && v !== '') return v;
          }
          return undefined;
        };

        // Parse ITEMS: JSON string hoặc array
        let rawItems = get('ITEMS', 'CART_ITEMS', 'MON_GOI');
        if (typeof rawItems === 'string' && rawItems.trim().startsWith('[')) {
          try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; }
        }
        if (!Array.isArray(rawItems)) rawItems = [];

        // Normalize timestamp: GAS có thể trả về 'YYYY-MM-DD HH:mm:ss' hoặc Date
        let ts = get('CREATED_AT', 'TIMESTAMP', 'THOI_GIAN', 'NGAY_TAO', 'DATE');
        if (ts && typeof ts === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:/.test(ts)) {
          ts = ts.replace(' ', 'T'); // → ISO 8601
        }

        const status = get('ORDER_STATUS', 'TRANG_THAI', 'STATUS') ?? 'Chờ xử lý';
        const paymentMethod = get('PAYMENT_METHOD', 'THANH_TOAN', 'HINH_THUC_TT') ?? 'Tiền mặt';

        let paymentStatus = get('PAYMENT_STATUS', 'TRANG_THAI_TT', 'TRANG_THAI_THANH_TOAN');
        if (!paymentStatus) {
          if (status === 'Công nợ') paymentStatus = 'Công nợ';
          else if (
            status === 'Hoàn thành' &&
            paymentMethod &&
            paymentMethod !== 'Chưa xác định'
          ) paymentStatus = 'Đã thanh toán';
          else paymentStatus = 'Chưa thanh toán';
        }

        return {
          ORDER_ID:       get('ORDER_ID', 'MA_DON', 'MA_DON_HANG', 'ID') ?? '',
          CREATED_AT:     ts ?? new Date().toISOString(),
          CUSTOMER_NAME:  get('CUSTOMER_NAME', 'TEN_KHACH', 'TEN_KHACH_HANG', 'KHACH_HANG', 'NAME') ?? 'Khách',
          PHONE:          get('PHONE', 'SDT', 'SO_DIEN_THOAI', 'PHONE_NUMBER') ?? '',
          TABLE_NO:       get('TABLE_NO', 'SO_BAN', 'BAN', 'TABLE') ?? '',
          ITEMS:          rawItems,
          SUBTOTAL:       Number(get('SUBTOTAL', 'TONG_CONG', 'TONG') || 0),
          TOTAL_AMOUNT:   Number(get('TOTAL_AMOUNT', 'THANH_TIEN', 'TONG_TIEN', 'TOTAL', 'AMOUNT', 'THUC_THU') || get('SUBTOTAL', 'TONG_CONG', 'TONG') || 0),
          ORDER_STATUS:         status,
          PAYMENT_METHOD: paymentMethod,
          PAYMENT_STATUS: paymentStatus,
          NOTES:          get('NOTES', 'GHI_CHU', 'NOTE') ?? '',
          LOCKED_BY:      get('LOCKED_BY', 'KHOA_BOI') ?? '',
        };
      };

      const ordersData = ordersRes?.status === 'success' && Array.isArray(ordersRes.data)
        ? ordersRes.data : null;

      if (ordersData) {
        const mappedOrders: OrderData[] = ordersData.map((rawRow: any) => {
          const row = normalizeOrderRow(rawRow);
          // Parse items: đã được normalize thành array ở trên
          const rawItems: any[] = row.ITEMS;

          const cartItems: CartItem[] = rawItems.map((it: any) => {
            // Hỗ trợ cả format mới {id, qty} và cũ {ma_mon, ten_mon, gia_ban, qty}
            const itemId = String(it.id || it.ma_mon || '');
            const menuItem = freshMenuItems.find(m => m.id === itemId);
            return {
              id:          itemId,
              cartItemId:  `${row.ORDER_ID}-${itemId}`,
              name:        menuItem?.name || it.name || it.ten_mon || itemId,
              price:       menuItem?.price ?? Number(it.price || it.gia_ban) ?? 0,
              unitPrice:   menuItem?.price ?? Number(it.price || it.gia_ban) ?? 0,
              quantity:    Number(it.qty || it.quantity || it.so_luong) || 1,
              category:    menuItem?.category || '',
              isOutOfStock: false,
              note:        String(it.note || it.ghi_chu || ''),
              size:        String(it.size || it.kich_co || 'M'),
              temperature: String(it.temperature || it.nhiet_do || ''),
              sugarLevel:  String(it.sugarLevel || it.duong || ''),
              iceLevel:    String(it.iceLevel || it.da || ''),
            };
          });

          return {
            orderId:       String(row.ORDER_ID || ''),
            customerName:  String(row.CUSTOMER_NAME || 'Khách'),
            phoneNumber:   String(row.PHONE || ''),
            tableNumber:   String(row.TABLE_NO || ''),
            items:         cartItems,
            total:         Number(row.TOTAL_AMOUNT) || 0,
            timestamp:     String(row.CREATED_AT || new Date().toISOString()),
            notes:         String(row.NOTES || ''),
            paymentMethod: String(row.PAYMENT_METHOD || 'Tiền mặt'),
            orderStatus:   String(row.ORDER_STATUS || 'Chờ xử lý'),
            paymentStatus: String(row.PAYMENT_STATUS || 'Chưa thanh toán'),
            lockedBy:      String(row.LOCKED_BY || ''),
          };
        });

        const ordersString = JSON.stringify(mappedOrders);
        if (localStorage.getItem('orders_data') !== ordersString) {
          setRawOrders(mappedOrders);
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
          id_thu_chi: String(item.TRANSACTION_ID || item.id_thu_chi || `st-${idx}`),
          phan_loai:  String(item.TRANS_TYPE || item.phan_loai  || 'Chi') as 'Thu' | 'Chi',
          danh_muc:   String(item.CATEGORY || item.danh_muc   || 'Khác'),
          so_tien:    Number(item.AMOUNT || item.so_tien)   || 0,
          ghi_chu:    String(item.NOTES || item.ghi_chu    || ''),
          thoi_gian:  String(item.CREATED_AT || item.thoi_gian  || new Date().toISOString()),
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
    // KHÔNG setIsLoading → không chặn UI

    // Chuẩn hoá status
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
      'Đang sửa':   'Đang sửa',
    };
    const normalizedStatus = STATUS_MAP[status] || status;

    // Optimistic: cập nhật local state ngay, không chờ API
    setRawOrders(prev => prev.map(o =>
      o.orderId === orderId ? {
        ...o,
        orderStatus: normalizedStatus,
        // Fix: cũng update paymentStatus + paymentMethod nếu có trong additionalData
        ...(additionalData?.paymentStatus  ? { paymentStatus:  additionalData.paymentStatus  } : {}),
        ...(additionalData?.paymentMethod  ? { paymentMethod:  additionalData.paymentMethod  } : {}),
      } : o
    ));

    // Snapshot để rollback nếu cần
    const snapshot = rawOrders.find(o => o.orderId === orderId);

    try {
      const response = await fetchWithRetry(appsScriptUrl, {
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
        if (normalizedStatus === 'Hoàn thành' || normalizedStatus === 'Đã thanh toán') {
          triggerInventoryDeduction(orderId, appsScriptUrl);
        } else if (normalizedStatus === 'Đã hủy') {
          triggerInventoryRefund(orderId, appsScriptUrl);
        }
        fetchAllData(false); // sync ngầm, không block
        return true;
      }
      // GAS trả lỗi → rollback
      if (snapshot) {
        setRawOrders(prev => prev.map(o => o.orderId === orderId ? snapshot : o));
      }
      return false;
    } catch (e) {
      console.error('[DataContext] updateOrderStatus failed after retries:', e);
      // Rollback optimistic update
      if (snapshot) {
        setRawOrders(prev => prev.map(o => o.orderId === orderId ? snapshot : o));
      }
      return false;
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
        setRawOrders(prev => prev.filter(o => o.orderId !== orderId));
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

  // ── createOrder / editOrder ─────────────────────────────────────────────────
  // isEditing → gọi editOrder (giữ nguyên orderId trên Sheet)
  // isNew     → gọi createOrder (GAS tự sinh orderId mới)
  const createOrder = async (orderData: any, showLoader = true) => {
    if (!appsScriptUrl) return false;
    if (showLoader) setIsLoading(true);
    try {
      const itemsPayload = orderData.items.map((item: CartItem) => ({
        id:          item.id,
        qty:         item.quantity,
        size:        item.size        || 'M',
        note:        item.note        || '',
        temperature: item.temperature || '',
        sugarLevel:  item.sugarLevel  || '',
        iceLevel:    item.iceLevel    || '',
      }));

      const isEditing = !!orderData.orderId &&
        rawOrders.some(o => o.orderId === orderData.orderId);

      // Optimistic local update (hiển thị ngay, không chờ API)
      if (isEditing) {
        setRawOrders(prev => prev.map(o =>
          o.orderId === orderData.orderId
            ? {
                ...o,
                items:        orderData.items,
                total:        Number(orderData.total) || 0,
                tableNumber:  orderData.tableNumber  ?? o.tableNumber,
                customerName: orderData.customerName ?? o.customerName,
                notes:        orderData.notes        ?? o.notes,
                orderStatus:  orderData.orderStatus  ?? o.orderStatus,
              }
            : o
        ));
      }

      const body: Record<string, any> = isEditing
        ? {
            action:       'editOrder',
            orderId:      orderData.orderId,
            items:        itemsPayload,
            total:        Number(orderData.total) || 0,
            subtotal:     Number(orderData.total) || 0,
            tableNumber:  orderData.tableNumber  ?? '',
            customerName: orderData.customerName ?? '',
            notes:        orderData.notes        ?? '',
            ...(orderData.orderStatus ? { status: orderData.orderStatus } : {}),
          }
        : {
            action:        'createOrder',
            items:         itemsPayload,
            customerName:  orderData.customerName  || '',
            phoneNumber:   orderData.phoneNumber   || '',
            tableNumber:   orderData.tableNumber   || '',
            paymentMethod: orderData.paymentMethod || 'Tiền mặt',
            notes:         orderData.notes         || '',
            status:        orderData.orderStatus   || 'Chờ xử lý',
            paymentStatus: orderData.paymentStatus || 'Chưa thanh toán',
            total:         Number(orderData.total) || 0,
            subtotal:      Number(orderData.total) || 0,
            thanhTien:     Number(orderData.total) || 0,
            staffId:       orderData.staffId       || '',
            staffName:     orderData.staffName     || '',
          };

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: GAS_POST_HEADERS,
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData(false);
        return true;
      }
      console.error('[DataContext] createOrder/editOrder GAS error:', result.message);
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
      lockOrder,
      unlockOrder,
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

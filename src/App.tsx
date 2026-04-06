import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Coffee, Settings as SettingsIcon, Clock, BarChart3, Bell, QrCode, LayoutDashboard, Wallet, Package, Users, PlusCircle, AlertCircle, CheckCircle2, Banknote, Eye, EyeOff, LogIn, CheckSquare, AlertTriangle } from 'lucide-react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu } from './components/Menu';
import { Cart } from './components/Cart';
import { Settings } from './components/Settings';
import { OrderHistory } from './components/OrderHistory';
import { StaffView } from './components/StaffView';
import { MenuManager } from './components/MenuManager';
import { NotificationsPanel } from './components/NotificationsPanel';
import { GlobalQrModal } from './components/GlobalQrModal';
import { QuickQrFab } from './components/QuickQrFab';
import { QuickTransactionForm } from './components/QuickTransactionForm';
import { CartItem } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { UIProvider, useUI } from './context/UIContext';
import { DataProvider, useData } from './context/DataContext';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshCw, Loader2, X } from 'lucide-react';
import { notificationService } from './services/NotificationService';

import { RoleGuard } from './components/ui/RoleGuard';
import { StockAlertBanner } from './components/StockAlertBanner';

const DEFAULT_URL = 'https://script.google.com/macros/s/REMOVED_GAS_DEPLOYMENT_ID/exec';

interface AppContentProps {
  appsScriptUrl: string;
  setAppsScriptUrl: (url: string) => void;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [pins, setPins] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handlePinChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...pins];
    next[idx] = digit;
    setPins(next);
    setError('');
    if (digit && idx < 3) pinRefs[idx + 1].current?.focus();
    // Auto-login khi nhập đủ 4 số
    if (digit && idx === 3) {
      const fullPin = [...next.slice(0, 3), digit].join('');
      if (fullPin.length === 4 && username.trim()) {
        const ok = login(username.trim(), fullPin);
        if (!ok) {
          setError('Tên đăng nhập hoặc PIN không đúng');
          setShaking(true);
          setTimeout(() => { setShaking(false); setPins(['', '', '', '']); pinRefs[0].current?.focus(); }, 500);
        }
      }
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (pins[idx]) {
        const next = [...pins]; next[idx] = ''; setPins(next);
      } else if (idx > 0) {
        pinRefs[idx - 1].current?.focus();
      }
    } else if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogin = () => {
    const fullPin = pins.join('');
    if (!username.trim() || fullPin.length < 4) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    const ok = login(username.trim(), fullPin);
    if (!ok) {
      setError('Tên đăng nhập hoặc PIN không đúng');
      setShaking(true);
      setTimeout(() => { setShaking(false); setPins(['', '', '', '']); pinRefs[0].current?.focus(); }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-stone-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] bg-[#C9252C] flex items-center justify-center mb-4 shadow-lg shadow-red-900/40">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Tiệm Nước Nhỏ</h1>
          <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mt-1">Đăng nhập để tiếp tục</p>
        </div>

        {/* Form */}
        <motion.div
          animate={shaking ? { x: [0, -10, 10, -8, 8, 0] } : {}}
          transition={{ duration: 0.5 }}
          className="space-y-5"
        >
          {/* Username */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1.5 block">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && pinRefs[0].current?.focus()}
              placeholder="admin / staff"
              className="w-full bg-stone-800 border border-stone-700 text-white placeholder-stone-600 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-[#C9252C] transition-colors"
              autoComplete="username"
            />
          </div>

          {/* PIN — 4 ô số kiểu Netflix */}
          <div>
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 block text-center">PIN</label>
            <div className="flex justify-center gap-3">
              {pins.map((p, i) => (
                <input
                  key={i}
                  ref={pinRefs[i]}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={p}
                  onChange={e => handlePinChange(i, e.target.value)}
                  onKeyDown={e => handlePinKeyDown(i, e)}
                  className={`w-14 h-14 text-center text-xl font-black rounded-2xl border-2 outline-none bg-stone-800 text-white transition-all duration-150
                    ${p ? 'border-[#C9252C] bg-stone-700' : 'border-stone-600'}
                    focus:border-[#C9252C] focus:bg-stone-700`}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs font-bold text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full py-3.5 bg-[#C9252C] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-red-900/40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" /> Đăng nhập
          </button>
        </motion.div>

        <p className="text-center text-stone-600 text-[10px] font-bold mt-6 uppercase tracking-widest">Tiệm Nước Nhỏ &copy; 2025</p>
      </motion.div>
    </div>
  );
}

// ─── Check-in Screen ──────────────────────────────────────────────────────────
function CheckInScreen() {
  const { currentUser, checkIn, logout } = useAuth();

  const handleCheckIn = () => {
    checkIn();
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-stone-950 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        <div className="w-20 h-20 rounded-[24px] bg-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-900/40">
          <CheckSquare className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">Xin chào, {currentUser?.name}!</h2>
        <p className="text-stone-400 text-sm font-bold mt-2 mb-8">Bấm Check-in để bắt đầu ca làm việc</p>

        <button
          onClick={handleCheckIn}
          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <CheckSquare className="w-5 h-5" /> Check-in
        </button>

        <button
          onClick={logout}
          className="w-full py-3 mt-3 text-stone-500 text-xs font-black uppercase tracking-widest active:text-stone-300 transition-colors"
        >
          Đăng xuất
        </button>
      </motion.div>
    </div>
  );
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isCheckedIn } = useAuth();
  if (!isAuthenticated) return <LoginScreen />;
  if (!isAdmin && !isCheckedIn) return <CheckInScreen />;
  return <>{children}</>;
}

function AppContent({ appsScriptUrl, setAppsScriptUrl }: AppContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isFabHidden, setIsFabHidden, isNavHidden, setIsNavHidden, showToast, toasts, removeToast } = useUI();
  const { isRefreshing, isLoading, orders } = useData();
  const { cart, cartCount, updateQuantity, updateCartItem, clearCart, restoreCart, saveDraft, availableDrafts } = useCart();
  const { currentUser, isAuthenticated, isAdmin } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [showQuickTransaction, setShowQuickTransaction] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState<any>(null);
  const [paymentPendingNotification, setPaymentPendingNotification] = useState<any>(null);

  const [appMode, setAppMode] = useState<'order' | 'management'>(() => {
    return (localStorage.getItem('appMode') as 'order' | 'management') || 'order';
  });
  const lastMainScrollTopRef = useRef(0);

  // Chuyển tab trực tiếp — không chặn
  const handleTabClick = (to: string, mode?: 'order' | 'management') => {
    const alreadyHere = location.pathname === to && (!mode || appMode === mode);
    if (alreadyHere) return;
    if (mode) setAppMode(mode);
    navigate(to);
  };

  const prevOrderStatusesRef = useRef<Record<string, string>>({});
  const prevIsAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    localStorage.setItem('appMode', appMode);
  }, [appMode]);

  useEffect(() => {
    setIsNavHidden(false);
  }, [location.pathname, setIsNavHidden]);

  // ─ Auto-save khi đổi tab (pathname thay đổi mà cart còn hàng) ──────────────
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    // chỉ save nếu rời khỏi trang Cart (/cart)
    if (prev === '/cart' && location.pathname !== '/cart' && cart.length > 0) {
      const editId = localStorage.getItem('editing_order_id') ?? undefined;
      saveDraft({ editingOrderId: editId });
      clearCart();
      showToast('💾 Đã lưu nháp tự động!');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((data) => {
      if (data.type === 'NEW_ORDER_NOTIFICATION') {
        setNewOrderNotification(data.order);
        
        const isMuted = localStorage.getItem('notificationMuted') === 'true';
        if (!isMuted) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.8;
          audio.play().catch(e => console.log('Audio play failed:', e));
        }

        setTimeout(() => setNewOrderNotification(null), 8000);
      }
    });
    return unsubscribe;
  }, []);

  // Theo dõi đơn chuyển sang paymentStatus 'Chờ thanh toán' → thông báo admin
  useEffect(() => {
    if (!isAdmin) return;
    const prevStatuses = prevOrderStatusesRef.current;
    orders.forEach(order => {
      const prev = prevStatuses[order.orderId];
      // Trigger khi paymentStatus đổi sang 'Chờ thanh toán' (logic mới)
      // hoặc orderStatus đổi sang 'Chờ thanh toán' (backward-compat)
      const isCurrPending =
        order.paymentStatus === 'Chờ thanh toán' ||
        order.orderStatus === 'Chờ thanh toán';
      if (isCurrPending && prev && prev !== 'Chờ thanh toán') {
        setPaymentPendingNotification(order);
        setTimeout(() => setPaymentPendingNotification(null), 10000);
      }
    });
    // Cập nhật map: track paymentStatus
    const next: Record<string, string> = {};
    orders.forEach(o => {
      next[o.orderId] = o.paymentStatus === 'Chờ thanh toán'
        ? 'Chờ thanh toán'
        : (o.orderStatus || '');
    });
    prevOrderStatusesRef.current = next;
  }, [orders, isAdmin]);

  useEffect(() => {
    setIsFabHidden(showNotifications || isQrModalOpen);
  }, [showNotifications, isQrModalOpen, setIsFabHidden]);

  useEffect(() => {
    const handleInventoryWarning = (e: any) => {
      showToast(e.detail.message, 'warning');
    };
    const handleInventoryRefunded = (e: any) => {
      showToast(e.detail.message, 'success');
    };

    window.addEventListener('inventoryWarning', handleInventoryWarning);
    window.addEventListener('inventoryRefunded', handleInventoryRefunded);

    return () => {
      window.removeEventListener('inventoryWarning', handleInventoryWarning);
      window.removeEventListener('inventoryRefunded', handleInventoryRefunded);
    };
  }, [showToast]);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const currentScrollTop = el.scrollTop;
    
    if (location.pathname === '/cart') {
      setIsNavHidden(false);
      return;
    }

    const lastScrollTop = lastMainScrollTopRef.current;
    const delta = currentScrollTop - lastScrollTop;

    if (currentScrollTop < 10) {
      if (isNavHidden) setIsNavHidden(false);
      lastMainScrollTopRef.current = currentScrollTop;
      return;
    }

    const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 80;
    
    if (delta > 20) {
      if (!isNavHidden) setIsNavHidden(true);
      lastMainScrollTopRef.current = currentScrollTop;
    } else if (delta < -20 && !isNearBottom) {
      if (isNavHidden) setIsNavHidden(false);
      lastMainScrollTopRef.current = currentScrollTop;
    } else {
      lastMainScrollTopRef.current = currentScrollTop;
    }
  };

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Tiệm Nước Nhỏ';
      case '/cart': return 'Đơn hàng';
      case '/history': return 'Lịch sử';
      case '/staff': return 'Quản lý';
      case '/settings': return 'Cài đặt';
      default: return 'Tiệm Nước Nhỏ';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-stone-50 dark:bg-black text-stone-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar (lg only) */}
      <div className="hidden lg:flex flex-col w-[260px] bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 h-[100dvh] sticky top-0 shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none">
        <div className="p-6 flex flex-col gap-5 border-b border-stone-100 dark:border-stone-800 h-[104px] justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#C9252C] flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/40">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-stone-800 dark:text-white tracking-tight">Tiệm Nước Nhỏ</h1>
          </div>
        </div>
        <div className="px-4 py-4 border-b border-stone-100 dark:border-stone-800">
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            <button onClick={() => handleTabClick('/', 'order')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${appMode === 'order' ? 'bg-white dark:bg-stone-700 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
              <Coffee className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-wider">Order</span>
            </button>
            {isAuthenticated && isAdmin && (
              <button onClick={() => handleTabClick('/staff', 'management')} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg ${appMode === 'management' ? 'bg-white dark:bg-stone-700 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                <LayoutDashboard className="w-4 h-4" /> <span className="text-[10px] font-black uppercase tracking-wider">Quản lý</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
          {((appMode === 'order' ? [
            { to: '/', icon: Coffee, label: 'Dashboard POS', desc: 'Thực đơn & Order' },
            { to: '/history', icon: Clock, label: 'Lịch sử', desc: 'Đơn hàng gần đây' },
            ...(isAdmin ? [] : [{ to: '/settings', icon: SettingsIcon, label: 'Cài đặt', desc: 'Kết nối ứng dụng' }]),
          ] : [
            { to: '/staff/dashboard', icon: BarChart3, label: 'Tổng quan', desc: 'Báo cáo doanh thu', roles: ['manager'] },
            { to: '/staff/operations', icon: LayoutDashboard, label: 'Vận hành', desc: 'Quản lý quầy', roles: ['manager'] },
            { to: '/staff/finance', icon: Wallet, label: 'Tài chính', desc: 'Kiểm soát dòng tiền', roles: ['manager'] },
            { to: '/staff/users', icon: Users, label: 'Nhân sự', desc: 'Quản trị nhân viên', roles: ['manager'] },
            { to: '/settings', icon: SettingsIcon, label: 'Cài đặt', desc: 'Cấu hình hệ thống' },
          ]) as Array<{ to: string; icon: any; label: string; desc?: string; badge?: number; roles?: string[] }>).filter(item => {
            if (item.to === '/' || item.to === '/cart' || item.to === '/settings') return true;
            if (!isAuthenticated) return false;
            if (item.roles && !item.roles.includes(currentUser?.role || '')) return false;
            return true;
          }).map((item, index) => {
            const isActive = item.to === '/' ? location.pathname === '/' : (location.pathname.startsWith(item.to) || (item.to === '/staff/dashboard' && location.pathname === '/staff'));
            const Icon = item.icon;
            return (
              <button
                key={`desk-${item.to}-${index}`}
                onClick={() => handleTabClick(item.to)}
                // Use relative positioning so that pseudo-elements can be attached
                className={`w-full group relative flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-red-50 dark:bg-red-900/20 text-[#C9252C] dark:text-red-400' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50'}`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="desktop-active-indicator"
                    className="absolute left-0 w-1 h-8 bg-[#C9252C] rounded-r-lg" 
                  />
                )}
                <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-white dark:bg-stone-800 shadow-sm text-[#C9252C] dark:text-red-400' : 'bg-transparent text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-300'}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <div className="flex-1 text-left flex flex-col min-w-0">
                  <span className={`text-[13px] font-black truncate leading-tight ${isActive ? '' : ''}`}>{item.label}</span>
                  {item.desc && <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 truncate">{item.desc}</span>}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                   <div className="w-5 h-5 flex items-center justify-center bg-[#C9252C] text-white text-[10px] font-black rounded-full flex-shrink-0">
                     {item.badge}
                   </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Container Chính */}
      <div className="flex flex-col flex-1 relative min-w-0 h-[100dvh]">
      <StockAlertBanner appMode={appMode} />

      {/* Full Screen Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-black/40 dark:bg-black/60 flex items-center justify-center">
          <div className="bg-white dark:bg-stone-900/80 backdrop-blur-xl px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-stone-100 dark:border-white/8">
            <Loader2 className="w-5 h-5 text-[#C9252C] animate-spin" />
            <p className="text-xs font-black uppercase tracking-widest text-stone-700 dark:text-white">Đang xử lý...</p>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl ${
                toast.type === 'error' ? 'bg-red-50/90 dark:bg-red-900/30 border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400' :
                toast.type === 'warning' ? 'bg-amber-50/90 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400' :
                'bg-white/90 dark:bg-stone-900/80 border-white/50 dark:border-white/8 text-stone-800 dark:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : 
                 toast.type === 'warning' ? <AlertCircle className="w-4 h-4" /> : 
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
              </div>
              <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5 opacity-50" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* New Order Notification Toast */}
      <AnimatePresence>
        {newOrderNotification && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[56px] left-0 right-0 z-[99] px-3 py-1.5 bg-stone-900/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-white/8 flex items-center gap-2.5"
          >
            <div className="w-6 h-6 bg-[#C9252C] rounded-md flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400 flex-shrink-0">Đơn mới!</span>
              <span className="text-xs font-bold text-white truncate">{newOrderNotification.branchName || 'Khách hàng'}</span>
              <span className="text-[9px] text-white/40 flex-shrink-0">{newOrderNotification.total?.toLocaleString()}đ · {newOrderNotification.items?.length || 0} món</span>
            </div>
            <button 
              onClick={() => setNewOrderNotification(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 text-white/50" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Pending Notification (admin only) */}
      <AnimatePresence>
        {paymentPendingNotification && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[56px] left-0 right-0 z-[98] px-3 py-1.5 bg-violet-900/90 backdrop-blur-xl border-b border-violet-500/30 flex items-center gap-2.5"
          >
            <div className="w-6 h-6 bg-violet-500 rounded-md flex items-center justify-center flex-shrink-0">
              <Banknote className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-300 flex-shrink-0">Yêu cầu TT!</span>
              <span className="text-xs font-bold text-white truncate">{paymentPendingNotification.branchName || 'Khách hàng'}</span>
              <span className="text-[9px] text-white/50 flex-shrink-0">{paymentPendingNotification.total?.toLocaleString()}đ · {paymentPendingNotification.items?.length || 0} món</span>
            </div>
            <button
              onClick={() => setPaymentPendingNotification(null)}
              className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3 text-white/50" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 lg:sticky lg:inset-auto z-40 px-4 py-3 flex justify-between items-center bg-white/80 dark:bg-stone-900/60 backdrop-blur-[48px] saturate-[1.8] border-b border-stone-100/50 dark:border-stone-800 lg:border-none lg:bg-transparent lg:dark:bg-transparent lg:shadow-none w-full lg:max-w-none mx-auto lg:mt-2 lg:px-6">
        <div className="flex bg-stone-100/80 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200/50 dark:border-stone-700/50 lg:hidden">
          <button 
            onClick={() => handleTabClick('/', 'order')}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl ${appMode === 'order' ? 'bg-white dark:bg-stone-700 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'}`}
          >
            <Coffee className={`w-4 h-4 ${appMode === 'order' ? 'text-[#C9252C] dark:text-red-400' : ''}`} />
            {appMode === 'order' && (
              <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                Order
              </span>
            )}
          </button>

          {isAuthenticated && isAdmin && (
            <button 
              onClick={() => handleTabClick('/staff', 'management')}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl ${appMode === 'management' ? 'bg-white dark:bg-stone-700 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'}`}
            >
              <LayoutDashboard className={`w-4 h-4 ${appMode === 'management' ? 'text-[#C9252C] dark:text-red-400' : ''}`} />
              {appMode === 'management' && (
                <span className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap">
                  Quản lý
                </span>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button 
              onClick={() => setShowQuickTransaction(true)}
              className="p-1.5 bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              title="Thu/Chi nhanh"
            >
              <PlusCircle className="w-4.5 h-4.5" />
            </button>
          )}
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-1.5 bg-stone-100/80 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 backdrop-blur-sm"
          >
            <Bell className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      <NotificationsPanel 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        appsScriptUrl={appsScriptUrl} 
        appMode={appMode}
      />

      {/* Main Content */}
      <main 
        className="flex-grow overflow-y-auto w-full lg:max-w-none mx-auto relative pt-[56px] lg:pt-0 px-0 lg:px-6 flex flex-col min-w-0"
        onScroll={handleMainScroll}
      >
        <div className="h-full flex flex-col min-h-0 min-w-0">
          <AnimatePresence mode="popLayout">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full lg:flex lg:flex-col lg:min-h-0 min-w-0">
                  <Menu 
                    appsScriptUrl={appsScriptUrl}
                    onNavigateSettings={() => {}}
                  />
                </motion.div>
              } />
              <Route path="/cart" element={
                <div className="lg:hidden h-full flex flex-col min-h-0 min-w-0">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full flex flex-col min-h-0 min-w-0">
                    <Cart
                      appsScriptUrl={appsScriptUrl}
                      onNavigateSettings={() => {}}
                    />
                  </motion.div>
                </div>
              } />
              <Route path="/history" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full w-full">
                  {isAuthenticated ? <OrderHistory /> : <Settings appsScriptUrl={appsScriptUrl} setAppsScriptUrl={setAppsScriptUrl} appMode={appMode} />}
                </motion.div>
              } />
              <Route path="/staff/*" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full w-full">
                  {isAuthenticated ? <StaffView appsScriptUrl={appsScriptUrl} appMode={appMode} /> : <Settings appsScriptUrl={appsScriptUrl} setAppsScriptUrl={setAppsScriptUrl} appMode={appMode} />}
                </motion.div>
              } />
              <Route path="/settings" element={
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full w-full">
                  <Settings
                    appsScriptUrl={appsScriptUrl}
                    setAppsScriptUrl={(url) => {
                      setAppsScriptUrl(url);
                      localStorage.setItem('appsScriptUrl', url);
                    }}
                    appMode={appMode}
                  />
                </motion.div>
              } />
            </Routes>
          </AnimatePresence>
        </div>
      </main>


      {/* Quick QR FAB */}
      <QuickQrFab 
        onClick={() => setIsQrModalOpen(true)}
        appMode={appMode}
      />

      <GlobalQrModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} />

      {/* Quick Transaction Modal */}
      <AnimatePresence>
        {showQuickTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white/90 dark:bg-stone-900/80 backdrop-blur-xl rounded-[32px] overflow-hidden shadow-2xl border border-stone-100/50 dark:border-white/8"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-black text-stone-800 dark:text-white tracking-tight">Thu/Chi nhanh</h3>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Nhập nhanh khoản phát sinh</p>
                  </div>
                  <button 
                    onClick={() => setShowQuickTransaction(false)}
                    className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>

                <QuickTransactionForm onSuccess={() => setShowQuickTransaction(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation — Floating Glass Pill (iOS 26 style) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 lg:hidden">
        <nav className="
          relative
          bg-white/25 dark:bg-stone-900/60
          backdrop-blur-[48px] saturate-[1.8]
          border border-white/50 dark:border-white/8
          rounded-[28px]
          shadow-[0_8px_32px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.45)]
          dark:shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)]
          px-3 py-2 flex justify-around items-center gap-1
        ">
          {((appMode === 'order' ? [
            { to: '/', icon: Coffee, label: 'Menu' },
            { to: '/cart', icon: ShoppingBag, label: 'Giỏ', badge: cartCount > 0 ? cartCount : availableDrafts.length },
            { to: '/history', icon: Clock, label: 'Lịch sử' },
            ...(isAdmin ? [] : [{ to: '/settings', icon: SettingsIcon, label: 'Cài đặt' }]),
          ] : [
            { to: '/staff/dashboard', icon: BarChart3, label: 'Dashboard', roles: ['manager'] },
            { to: '/staff/operations', icon: LayoutDashboard, label: 'Vận Hành', roles: ['manager'] },
            { to: '/staff/finance', icon: Wallet, label: 'Tài Chính', roles: ['manager'] },
            { to: '/staff/users', icon: Users, label: 'Nhân sự', roles: ['manager'] },
            { to: '/settings', icon: SettingsIcon, label: 'Cài đặt' },
          ]) as Array<{ to: string; icon: any; label: string; badge?: number; roles?: string[] }>).filter(item => {
            if (item.to === '/' || item.to === '/cart' || item.to === '/settings') return true;
            if (!isAuthenticated) return false;
            if (item.roles && !item.roles.includes(currentUser?.role || '')) return false;
            return true;
          }).map((item, index) => {
            const isActive = item.to === '/' ? location.pathname === '/' : (location.pathname.startsWith(item.to) || (item.to === '/staff/dashboard' && location.pathname === '/staff'));
            const Icon = item.icon;

            return (
              <button
                key={`${item.to}-${index}`}
                id={item.to === '/cart' ? 'bottom-nav-cart' : undefined}
                onClick={() => handleTabClick(item.to)}
                className="relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-[20px] min-w-[56px]"
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-white/40 dark:bg-white/10 rounded-[20px]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <div className="relative z-10">
                  <motion.div
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Icon
                      className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-[#C9252C]' : 'text-stone-500 dark:text-stone-400'}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </motion.div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#C9252C] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`relative z-10 text-[8px] font-black uppercase tracking-widest transition-colors duration-200 ${isActive ? 'text-[#C9252C]' : 'text-stone-400 dark:text-stone-500 opacity-70'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>

    {/* Desktop Right Panel (lg only) - Cart always visible */}
    {appMode === 'order' && (
      <div className="hidden lg:flex flex-col w-[380px] xl:w-[420px] bg-white dark:bg-stone-950 border-l border-stone-200 dark:border-stone-800 h-[100dvh] sticky top-0 shrink-0 z-40 relative">
        <Cart
          appsScriptUrl={appsScriptUrl}
          onNavigateSettings={() => {}}
          asSidePanel={true}
        />
      </div>
    )}

  </div>
  );
}

export default function App() {
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    const saved = localStorage.getItem('appsScriptUrl');
    const lastDefault = localStorage.getItem('lastDefaultUrl');
    
    if (lastDefault !== DEFAULT_URL) {
      localStorage.setItem('lastDefaultUrl', DEFAULT_URL);
      if (!saved || saved.includes('script.google.com')) {
        localStorage.setItem('appsScriptUrl', DEFAULT_URL);
        return DEFAULT_URL;
      }
    }
    return saved || DEFAULT_URL;
  });

  return (
    <ThemeProvider>
      <UIProvider>
        <DataProvider appsScriptUrl={appsScriptUrl}>
          <AuthProvider>
            <CartProvider>
              <HashRouter>
                <AuthGate>
                  <AppContent appsScriptUrl={appsScriptUrl} setAppsScriptUrl={setAppsScriptUrl} />
                </AuthGate>
              </HashRouter>
            </CartProvider>
          </AuthProvider>
        </DataProvider>
      </UIProvider>
    </ThemeProvider>
  );
}

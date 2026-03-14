import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Coffee, Settings as SettingsIcon, Clock, BarChart3, Bell, QrCode, LayoutDashboard, Wallet, Package, Users, PlusCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
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

const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbyRaY34OoolS8He-s8hz1-z1EtWZda7jF1DLyAfsw-nxHjAzm6IN7g2dvcSy5r4ljtl/exec';

interface AppContentProps {
  appsScriptUrl: string;
  setAppsScriptUrl: (url: string) => void;
}

function AppContent({ appsScriptUrl, setAppsScriptUrl }: AppContentProps) {
  const location = useLocation();
  const { isFabHidden, setIsFabHidden, isNavHidden, setIsNavHidden, showToast, toasts, removeToast } = useUI();
  const { isRefreshing, isLoading } = useData();
  const { cart, cartCount, updateQuantity, updateCartItem, clearCart, restoreCart } = useCart();
  const { currentUser, isAuthenticated, isAdmin } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [showQuickTransaction, setShowQuickTransaction] = useState(false);
  const [newOrderNotification, setNewOrderNotification] = useState<any>(null);
  
  const [appMode, setAppMode] = useState<'order' | 'management'>(() => {
    return (localStorage.getItem('appMode') as 'order' | 'management') || 'order';
  });

  const lastMainScrollTopRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('appMode', appMode);
  }, [appMode]);

  useEffect(() => {
    setIsNavHidden(false);
  }, [location.pathname, setIsNavHidden]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((data) => {
      if (data.type === 'NEW_ORDER_NOTIFICATION') {
        setNewOrderNotification(data.order);
        
        // Play notification sound if not muted
        const isMuted = localStorage.getItem('notificationMuted') === 'true';
        if (!isMuted) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.volume = 0.8;
          audio.play().catch(e => console.log('Audio play failed:', e));
        }

        // Automatically hide after 8 seconds
        setTimeout(() => setNewOrderNotification(null), 8000);
      }
    });
    return unsubscribe;
  }, []);

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
    const currentScrollTop = e.currentTarget.scrollTop;
    
    // Disable hiding for Cart tab
    if (location.pathname === '/cart') {
      setIsNavHidden(false);
      return;
    }

    const lastScrollTop = lastMainScrollTopRef.current;
    const delta = currentScrollTop - lastScrollTop;
    
    // Always show when near top
    if (currentScrollTop < 10) {
      if (isNavHidden) setIsNavHidden(false);
      lastMainScrollTopRef.current = currentScrollTop;
      return;
    }

    // Scrolling down -> Hide
    if (delta > 20) {
      if (!isNavHidden) setIsNavHidden(true);
      lastMainScrollTopRef.current = currentScrollTop;
    } 
    // Scrolling up -> Show (more sensitive)
    else if (delta < -10) {
      if (isNavHidden) setIsNavHidden(false);
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
    <div className="flex flex-col h-[100dvh] bg-stone-50 dark:bg-black text-stone-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      <StockAlertBanner appMode={appMode} />
      {/* Background Refresh Indicator */}
      {isRefreshing && (
        <div 
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-stone-900 px-4 py-2 rounded-full shadow-xl border border-stone-100 dark:border-stone-800 flex items-center gap-2 pointer-events-none"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#C9252C]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Đang cập nhật...</span>
        </div>
      )}

      {/* Full Screen Loading Overlay */}
      {isLoading && (
        <div 
          className="fixed inset-0 z-[200] bg-white/60 dark:bg-black/60 flex items-center justify-center"
        >
          <div className="bg-white dark:bg-stone-900 p-8 rounded-[40px] shadow-2xl flex flex-col items-center gap-4 border border-stone-100 dark:border-stone-800">
            <Loader2 className="w-10 h-10 text-[#C9252C]" />
            <p className="text-sm font-black uppercase tracking-widest text-stone-800 dark:text-white">Đang xử lý...</p>
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
              className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border ${
                toast.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400' :
                toast.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400' :
                'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-800 dark:text-white'
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
      {newOrderNotification && (
        <div
          className="fixed top-0 left-1/2 translate-x-[-50%] z-[100] w-[90%] max-w-sm bg-stone-900 dark:bg-white text-white dark:text-black p-4 rounded-2xl shadow-2xl border border-white/10 dark:border-black/10 flex items-center gap-4 mt-5"
        >
          <div className="w-12 h-12 bg-[#C9252C] rounded-xl flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div className="flex-grow min-w-0">
            <h4 className="font-black text-[10px] uppercase tracking-widest text-red-400 mb-0.5">Đơn hàng mới!</h4>
            <p className="text-sm font-bold truncate">{newOrderNotification.customerName || 'Khách hàng'}</p>
            <p className="text-[10px] font-medium opacity-60">{newOrderNotification.total?.toLocaleString()}đ • {newOrderNotification.items?.length || 0} món</p>
          </div>
          <button 
            onClick={() => setNewOrderNotification(null)}
            className="p-2 hover:bg-white/10 dark:hover:bg-black/10 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex justify-between items-center bg-white dark:bg-black border-b border-stone-100 dark:border-stone-800">
        <div className="flex bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl border border-stone-200 dark:border-stone-800">
          <button 
            onClick={() => { setAppMode('order'); window.location.hash = '#/'; }}
            className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl ${appMode === 'order' ? 'bg-white dark:bg-stone-800 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'}`}
          >
            <Coffee className={`w-4 h-4 ${appMode === 'order' ? 'text-[#C9252C] dark:text-red-400' : ''}`} />
            {appMode === 'order' && (
              <span
                className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
              >
                Order
              </span>
            )}
          </button>

          {isAuthenticated && (
            <button 
              onClick={() => { setAppMode('management'); window.location.hash = '#/staff'; }}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl ${appMode === 'management' ? 'bg-white dark:bg-stone-800 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600'}`}
            >
              <LayoutDashboard className={`w-4 h-4 ${appMode === 'management' ? 'text-[#C9252C] dark:text-red-400' : ''}`} />
              {appMode === 'management' && (
                <span
                  className="text-[11px] font-black uppercase tracking-wider whitespace-nowrap"
                >
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
              className="p-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              title="Thu/Chi nhanh"
            >
              <PlusCircle className="w-4.5 h-4.5" />
            </button>
          )}
          <button 
            onClick={() => setShowNotifications(true)}
            className="relative p-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700"
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
        className="flex-grow overflow-y-auto w-full relative pt-[56px]"
        onScroll={handleMainScroll}
      >
        <div className="h-full">
          <Routes location={location}>
            <Route path="/" element={
              <Menu 
                appsScriptUrl={appsScriptUrl}
                onNavigateSettings={() => {}}
              />
            } />
            <Route path="/cart" element={
              <Cart
                appsScriptUrl={appsScriptUrl}
                onNavigateSettings={() => {}}
              />
            } />
            <Route path="/history" element={isAuthenticated ? <OrderHistory /> : <Settings appsScriptUrl={appsScriptUrl} setAppsScriptUrl={setAppsScriptUrl} appMode={appMode} />} />
            <Route path="/staff/*" element={isAuthenticated ? <StaffView appsScriptUrl={appsScriptUrl} appMode={appMode} /> : <Settings appsScriptUrl={appsScriptUrl} setAppsScriptUrl={setAppsScriptUrl} appMode={appMode} />} />
            <Route path="/settings" element={
              <Settings
                appsScriptUrl={appsScriptUrl}
                setAppsScriptUrl={(url) => {
                  setAppsScriptUrl(url);
                  localStorage.setItem('appsScriptUrl', url);
                }}
                appMode={appMode}
              />
            } />
          </Routes>
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
              className="w-full max-w-md bg-white dark:bg-stone-900 rounded-[32px] overflow-hidden shadow-2xl border border-stone-100 dark:border-stone-800"
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <nav className="bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 px-2 pt-2 pb-6 flex justify-around items-center">
          {((appMode === 'order' ? [
            { to: '/', icon: Coffee, label: 'Menu' },
            { to: '/cart', icon: ShoppingBag, label: 'Giỏ', badge: cartCount },
            { to: '/history', icon: Clock, label: 'Lịch sử' },
            { to: '/settings', icon: SettingsIcon, label: 'Cài đặt' },
          ] : [
            { to: '/staff/dashboard', icon: BarChart3, label: 'Dashboard', roles: ['manager'] },
            { to: '/staff/operations', icon: LayoutDashboard, label: 'Vận Hành', roles: ['staff', 'manager'] },
            { to: '/staff/finance', icon: Wallet, label: 'Tài Chính', roles: ['manager'] },
            { to: '/staff/users', icon: Users, label: 'Nhân sự', roles: ['manager'] },
            { to: '/settings', icon: SettingsIcon, label: 'Cài đặt' },
          ]) as Array<{ to: string; icon: any; label: string; badge?: number; roles?: string[] }>).filter(item => {
            // Always show Menu, Cart, Settings (Settings is needed for Login)
            if (item.to === '/' || item.to === '/cart' || item.to === '/settings') return true;
            
            // Require authentication for everything else (History, Staff Dashboard, etc.)
            if (!isAuthenticated) return false;

            // Role check
            if (item.roles && !item.roles.includes(currentUser?.role || '')) return false;
            
            return true;
          }).map((item, index) => {
            const isActive = item.to === '/' ? location.pathname === '/' : (location.pathname.startsWith(item.to) || (item.to === '/staff/dashboard' && location.pathname === '/staff'));
            const Icon = item.icon;
            
            const linkContent = (
              <Link
                key={`${item.to}-${index}`}
                to={item.to}
                id={item.to === '/cart' ? 'bottom-nav-cart' : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-0.5 px-2 ${
                  isActive ? 'text-[#C9252C]' : 'text-stone-400 dark:text-stone-500'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl ${isActive ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C9252C] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C9252C] rounded-full"
                  />
                )}
              </Link>
            );

            return linkContent;
          })}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    const saved = localStorage.getItem('appsScriptUrl');
    const lastDefault = localStorage.getItem('lastDefaultUrl');
    
    // Check if we need to migrate to the new default URL
    if (lastDefault !== DEFAULT_URL) {
      localStorage.setItem('lastDefaultUrl', DEFAULT_URL);
      // Force update to new URL if the saved one looks like an old Google Script URL or is empty
      // This ensures users get the fix for the "Failed to fetch" error
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
                <AppContent appsScriptUrl={appsScriptUrl} setAppsScriptUrl={setAppsScriptUrl} />
              </HashRouter>
            </CartProvider>
          </AuthProvider>
        </DataProvider>
      </UIProvider>
    </ThemeProvider>
  );
}


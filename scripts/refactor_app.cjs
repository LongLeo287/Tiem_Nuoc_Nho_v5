const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const newWrapper = `<div className="flex flex-col lg:flex-row min-h-[100dvh] bg-stone-50 dark:bg-black font-sans relative overflow-hidden w-full">
      {/* Desktop Sidebar (lg only) */}
      <div className="hidden lg:flex flex-col w-[260px] bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 h-[100dvh] sticky top-0 shrink-0 z-50">
        <div className="p-6 flex flex-col gap-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-[#C9252C] flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-900/40">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-stone-800 dark:text-white tracking-tight">Tiệm Nước Nhỏ</h1>
          </div>
          {/* App Mode Switcher (Desktop) */}
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
            <button onClick={() => handleTabClick('/', 'order')} className={\`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg \${appMode === 'order' ? 'bg-white dark:bg-stone-700 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}\`}>
              <Coffee className="w-4 h-4" /> <span className="text-[10px] font-black uppercase">Order</span>
            </button>
            {isAuthenticated && isAdmin && (
              <button onClick={() => handleTabClick('/staff', 'management')} className={\`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg \${appMode === 'management' ? 'bg-white dark:bg-stone-700 text-[#C9252C] dark:text-red-400 shadow-sm' : 'text-stone-400 hover:text-stone-600'}\`}>
                <LayoutDashboard className="w-4 h-4" /> <span className="text-[10px] font-black uppercase">Quản lý</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {((appMode === 'order' ? [
            { to: '/', icon: Coffee, label: 'Menu' },
            { to: '/cart', icon: ShoppingBag, label: 'Giỏ hàng', badge: cartCount > 0 ? cartCount : availableDrafts.length },
            { to: '/history', icon: Clock, label: 'Lịch sử đơn' },
            { to: '/settings', icon: SettingsIcon, label: 'Cài đặt' },
          ] : [
            { to: '/staff/dashboard', icon: BarChart3, label: 'Dashboard', roles: ['manager'] },
            { to: '/staff/operations', icon: LayoutDashboard, label: 'Vận Hành', roles: ['staff', 'manager'] },
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
                key={\`desk-\${item.to}-\${index}\`}
                onClick={() => handleTabClick(item.to)}
                className={\`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all \${isActive ? 'bg-red-50 dark:bg-red-900/20 text-[#C9252C] dark:text-red-400' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}\`}
              >
                <Icon className={\`w-5 h-5 \${isActive ? 'text-[#C9252C] dark:text-red-400' : ''}\`} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-bold text-sm flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                   <span className="bg-[#C9252C] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Container Chính */}
      <div className="flex flex-col flex-1 relative min-w-0 h-[100dvh]">`;

c = c.replace(/<div className="flex flex-col min-h-full">/, newWrapper);

// Change Header to hide on lg ONLY its app switcher, but keep notification buttons? 
// No, the header also has New Order notification, Payment notification.
// We should make the Header sticky instead of fixed on LG.
// But we can't easily replace it via Regex since it spans multiple lines. 
// Just find the <header ... > line.
c = c.replace(/<header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex justify-between items-center bg-white\/80 dark:bg-stone-900\/60 backdrop-blur-\[48px\] saturate-\[1\.8\] border-b border-stone-100\/50 dark:border-white\/8">/, 
  '<header className="fixed top-0 left-0 right-0 lg:sticky lg:inset-auto z-40 px-4 py-3 flex justify-between items-center bg-white/80 dark:bg-stone-900/60 backdrop-blur-[48px] saturate-[1.8] border-b border-stone-100/50 dark:border-white/8 max-w-7xl mx-auto w-full">');

// On LG, we don't need the App mode switcher in the header because it's in the Sidebar now.
c = c.replace(/<div className="flex bg-stone-100\/80 dark:bg-stone-800\/80 p-1 rounded-2xl border border-stone-200\/50 dark:border-white\/8">/,
  '<div className="flex bg-stone-100/80 dark:bg-stone-800/80 p-1 rounded-2xl border border-stone-200/50 dark:border-white/8 lg:hidden">');

// Main needs max-w-7xl on desktop
c = c.replace(/<main \s*className="flex-grow overflow-y-auto w-full relative pt-\[56px\]"/,
  '<main className="flex-grow overflow-y-auto w-full max-w-7xl mx-auto relative pt-[56px] lg:pt-0 px-0 lg:px-6"');

// Bottom nav needs lg:hidden
c = c.replace(/<div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5">/,
  '<div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-5 lg:hidden">');

// Close the wrapper div at the very end. The last div in AppContent is </div>.
const lastDivIndex = c.lastIndexOf('</div>');
c = c.substring(0, lastDivIndex) + '</div>\n</div>' + c.substring(lastDivIndex + 6);

// Remove 'min-h-full' if any remains?
fs.writeFileSync('src/App.tsx', c);
console.log('App.tsx Sidebar added.');

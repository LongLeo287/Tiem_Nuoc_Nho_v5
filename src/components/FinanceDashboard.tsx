import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Wallet, ArrowUpRight, ArrowDownRight, 
  Trash2, ChevronDown, Filter, Calendar,
  AlertCircle, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation, PanInfo } from 'motion/react';
import { useData } from '../context/DataContext';
import { format, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { SoTayItem } from '../types';

// Swipeable Transaction Item Component
const SwipeableTransaction = ({ transaction, onDelete }: { transaction: SoTayItem, onDelete: () => void }) => {
  const controls = useAnimation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<SoTayItem | null>(null);
  
  // Queue for deletion to prevent concurrent issues
  const deletionQueue = useRef<Promise<void>>(Promise.resolve());

  const handleDragEnd = async (event: any, info: PanInfo) => {
    // If swiped left enough, trigger delete
    if (info.offset.x < -80) {
      // Haptic feedback
      if ('vibrate' in navigator) navigator.vibrate(20);
      setItemToRemove(transaction);
    } else {
      // Snap back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const confirmDelete = async () => {
    if (itemToRemove) {
      // Add to queue
      deletionQueue.current = deletionQueue.current.then(async () => {
        setIsDeleting(true);
        await controls.start({ x: -window.innerWidth, opacity: 0, transition: { duration: 0.2 } });
        onDelete();
        setItemToRemove(null);
      });
    }
  };

  if (isDeleting) return null;

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-red-500 mb-3">
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center text-white">
        <Trash2 className="w-6 h-6" />
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative bg-white dark:bg-stone-900 p-4 rounded-[24px] border border-stone-100 dark:border-stone-800 flex items-center justify-between shadow-sm touch-pan-y"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            transaction.phan_loai === 'Thu' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-600'
          }`}>
            {transaction.phan_loai === 'Thu' ? <ArrowDownRight className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-sm font-bold text-stone-800 dark:text-white line-clamp-1">{transaction.ghi_chu}</p>
            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
              {format(new Date(transaction.thoi_gian), 'HH:mm dd/MM', { locale: vi })} • {transaction.danh_muc}
            </p>
          </div>
        </div>
        <span className={`font-black text-base whitespace-nowrap ml-2 ${
          transaction.phan_loai === 'Thu' ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {transaction.phan_loai === 'Thu' ? '+' : '-'}{Number(transaction.so_tien).toLocaleString()}
        </span>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {itemToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-stone-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-stone-100 dark:border-stone-800"
            >
              <h3 className="text-xl font-extrabold text-stone-800 dark:text-white mb-3">Xóa giao dịch?</h3>
              <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">Bạn có chắc chắn muốn xóa giao dịch <span className="font-bold text-stone-800 dark:text-white">{itemToRemove.ghi_chu}</span> không?</p>
              <div className="flex gap-3">
                <button onClick={() => { setItemToRemove(null); controls.start({ x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } }); }} className="flex-1 py-4 rounded-2xl font-bold text-stone-400 dark:text-stone-500 tap-active">Hủy</button>
                <button onClick={confirmDelete} className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-500 tap-active shadow-lg shadow-red-100 dark:shadow-none">Xóa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function FinanceDashboard() {
  const { orders, soTayData, addSoTay, deleteSoTay } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isScrolled, setIsScrolled] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const now = new Date();
    
    // Filter Orders
    const completedOrders = orders.filter(o => o.orderStatus === 'Hoàn thành' || o.paymentStatus === 'Đã thanh toán');
    
    const todayOrders = completedOrders.filter(o => isSameDay(new Date(o.timestamp), now));
    const weekOrders = completedOrders.filter(o => isSameWeek(new Date(o.timestamp), now, { weekStartsOn: 1 }));
    const monthOrders = completedOrders.filter(o => isSameMonth(new Date(o.timestamp), now));

    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0);

    // Filter Transactions (SoTay)
    const todayIncome = soTayData.filter(t => t.phan_loai === 'Thu' && isSameDay(new Date(t.thoi_gian), now)).reduce((sum, t) => sum + Number(t.so_tien), 0);
    const weekIncome = soTayData.filter(t => t.phan_loai === 'Thu' && isSameWeek(new Date(t.thoi_gian), now, { weekStartsOn: 1 })).reduce((sum, t) => sum + Number(t.so_tien), 0);
    const monthIncome = soTayData.filter(t => t.phan_loai === 'Thu' && isSameMonth(new Date(t.thoi_gian), now)).reduce((sum, t) => sum + Number(t.so_tien), 0);

    const todayExpense = soTayData.filter(t => t.phan_loai === 'Chi' && isSameDay(new Date(t.thoi_gian), now)).reduce((sum, t) => sum + Number(t.so_tien), 0);
    const weekExpense = soTayData.filter(t => t.phan_loai === 'Chi' && isSameWeek(new Date(t.thoi_gian), now, { weekStartsOn: 1 })).reduce((sum, t) => sum + Number(t.so_tien), 0);
    const monthExpense = soTayData.filter(t => t.phan_loai === 'Chi' && isSameMonth(new Date(t.thoi_gian), now)).reduce((sum, t) => sum + Number(t.so_tien), 0);

    return {
      today: { revenue: todayRevenue + todayIncome, expense: todayExpense, net: todayRevenue + todayIncome - todayExpense },
      week: { revenue: weekRevenue + weekIncome, expense: weekExpense, net: weekRevenue + weekIncome - weekExpense },
      month: { revenue: monthRevenue + monthIncome, expense: monthExpense, net: monthRevenue + monthIncome - monthExpense },
    };
  }, [orders, soTayData]);

  // --- Transactions List ---
  const sortedTransactions = useMemo(() => {
    return [...soTayData].sort((a, b) => new Date(b.thoi_gian).getTime() - new Date(a.thoi_gian).getTime());
  }, [soTayData]);

  const visibleTransactions = sortedTransactions.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const handleDeleteTransaction = async (id_thu_chi?: string) => {
    if (!id_thu_chi) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      const success = await deleteSoTay(id_thu_chi);
      if (success) {
        // fetchAllData is called inside deleteSoTay
      }
    }
  };

  // --- Scroll Detection for Sticky Header ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // --- Add Transaction Modal State ---
  const [newTransType, setNewTransType] = useState<'Thu' | 'Chi'>('Chi');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [newTransDesc, setNewTransDesc] = useState('');
  const [newTransCat, setNewTransCat] = useState('Khác');

  const handleAddTransaction = () => {
    if (!newTransAmount || !newTransDesc) return;
    
    addSoTay({
      so_tien: Number(newTransAmount),
      phan_loai: newTransType,
      danh_muc: newTransCat,
      ghi_chu: newTransDesc,
      thoi_gian: new Date().toISOString(),
      nguoi_tao: 'Admin'
    });
    
    setShowAddModal(false);
    setNewTransAmount('');
    setNewTransDesc('');
    setNewTransCat('Khác');
  };

  return (
    <div className="flex flex-col bg-stone-50 dark:bg-black/20 min-h-full pb-24 relative">
      <div ref={observerRef} className="absolute top-0 left-0 w-full h-1" />
      
      {/* Sticky Header / Compact Mode */}
      <div className={`sticky top-0 z-30 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl border-b border-stone-100 dark:border-stone-800 shadow-sm px-4 py-3 -mx-6 -mt-6 mb-6' 
          : 'bg-transparent px-4 py-2 -mx-6 -mt-6 mb-4'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className={`font-black text-stone-800 dark:text-white tracking-tight transition-all duration-300 ${
              isScrolled ? 'text-lg' : 'text-2xl'
            }`}>
              Tài Chính
            </h2>
            {isScrolled && (
              <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {stats.today.revenue.toLocaleString()}đ
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className={`bg-[#C9252C] text-white rounded-full flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-none tap-active transition-all duration-300 ${
              isScrolled ? 'w-9 h-9' : 'w-11 h-11'
            }`}
          >
            <Plus className={isScrolled ? 'w-5 h-5' : 'w-6 h-6'} />
          </button>
        </div>
      </div>

      {/* Bento Grid / Stacked Cards */}
      <div className="space-y-4 px-4 -mx-4">
        {/* Cashflow Alert (if expense > 80% of revenue) */}
        {stats.today.revenue > 0 && stats.today.expense > stats.today.revenue * 0.8 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-[24px] p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-red-800 dark:text-red-300 mb-0.5">Cảnh báo dòng tiền</p>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 leading-relaxed">
                Chi phí hôm nay đã chiếm {Math.round((stats.today.expense / stats.today.revenue) * 100)}% doanh thu. Hãy kiểm tra lại các khoản chi!
              </p>
            </div>
          </div>
        )}

        {/* Today Card - Full Width */}
        <div className="bg-emerald-500 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-200 dark:shadow-none relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-20">
            <Wallet className="w-40 h-40 transform rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 opacity-80" />
              <p className="text-xs font-black uppercase tracking-widest opacity-80">Doanh thu hôm nay</p>
            </div>
            <div className="flex items-baseline gap-1">
              <h3 className="text-5xl font-black tracking-tighter">{stats.today.revenue.toLocaleString()}</h3>
              <span className="text-xl font-bold opacity-80">đ</span>
            </div>
            
            <div className="mt-6 flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10 flex-1">
                <p className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Lợi nhuận</p>
                <p className="text-lg font-black">{stats.today.net.toLocaleString()}đ</p>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10 flex-1">
                <p className="text-[10px] font-bold uppercase opacity-80 mb-0.5">Chi phí</p>
                <p className="text-lg font-black">{stats.today.expense.toLocaleString()}đ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profit Highlight Card */}
        <div className={`rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden ${
          stats.today.net >= 0 
            ? 'bg-gradient-to-br from-[#C9252C] to-[#991B1B] shadow-red-200 dark:shadow-none' 
            : 'bg-gradient-to-br from-stone-700 to-stone-900 shadow-stone-200 dark:shadow-none'
        }`}>
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <TrendingUp className="w-32 h-32 transform rotate-12" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Lợi nhuận ròng hôm nay</p>
            <div className="flex items-baseline gap-1">
              <h3 className="text-4xl font-black tracking-tighter">{stats.today.net.toLocaleString()}</h3>
              <span className="text-lg font-bold opacity-80">đ</span>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[9px] font-bold uppercase opacity-70 block mb-1">Tuần này</span>
                <p className="text-lg font-black">{stats.week.net.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[9px] font-bold uppercase opacity-70 block mb-1">Tháng này</span>
                <p className="text-lg font-black">{stats.month.net.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Week & Month Cards - 2 Columns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-stone-900 rounded-[24px] p-5 border border-stone-100 dark:border-stone-800 shadow-sm">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Tuần này</p>
            <p className="text-2xl font-black text-stone-800 dark:text-white tracking-tight">{stats.week.revenue.toLocaleString()}đ</p>
            <div className="mt-2 text-[10px] font-bold text-stone-400">
              Lãi: <span className="text-emerald-500">{stats.week.net.toLocaleString()}đ</span>
            </div>
          </div>
          <div className="bg-white dark:bg-stone-900 rounded-[24px] p-5 border border-stone-100 dark:border-stone-800 shadow-sm">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Tháng này</p>
            <p className="text-2xl font-black text-stone-800 dark:text-white tracking-tight">{stats.month.revenue.toLocaleString()}đ</p>
            <div className="mt-2 text-[10px] font-bold text-stone-400">
              Lãi: <span className="text-emerald-500">{stats.month.net.toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions List (Lazy Loading & Swipe Gestures) */}
      <div className="mt-8 px-4 -mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-stone-800 dark:text-white text-sm uppercase tracking-widest">Sổ thu chi</h3>
          <div className="flex items-center gap-1 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
            <Filter className="w-3 h-3" />
            <span>Gần đây</span>
          </div>
        </div>
        
        <div className="space-y-0">
          {visibleTransactions.map((t, idx) => (
            <SwipeableTransaction 
              key={t.id_thu_chi || idx} 
              transaction={t} 
              onDelete={() => handleDeleteTransaction(t.id_thu_chi)} 
            />
          ))}
          
          {sortedTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400 bg-white dark:bg-stone-900 rounded-[24px] border border-stone-100 dark:border-stone-800">
              <Wallet className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-xs font-bold">Chưa có giao dịch nào</p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {visibleCount < sortedTransactions.length && (
          <button 
            onClick={handleLoadMore}
            className="w-full py-4 mt-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-[24px] text-xs font-black text-stone-500 uppercase tracking-widest tap-active shadow-sm"
          >
            Tải thêm giao dịch
          </button>
        )}
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative bg-white dark:bg-stone-900 w-full max-w-md rounded-[32px] p-6 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-stone-800 dark:text-white">Thêm giao dịch</h3>
                <button onClick={() => setShowAddModal(false)} className="w-11 h-11 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl">
                <button 
                  onClick={() => setNewTransType('Thu')}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all tap-active ${
                    newTransType === 'Thu' 
                      ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' 
                      : 'text-stone-400'
                  }`}
                >
                  Thu nhập
                </button>
                <button 
                  onClick={() => setNewTransType('Chi')}
                  className={`flex-1 py-3 rounded-xl font-black text-sm transition-all tap-active ${
                    newTransType === 'Chi' 
                      ? 'bg-white dark:bg-stone-700 text-red-600 shadow-sm' 
                      : 'text-stone-400'
                  }`}
                >
                  Chi tiêu
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Số tiền</label>
                  <input 
                    type="number" 
                    value={newTransAmount}
                    onChange={e => setNewTransAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-4 py-4 text-2xl font-black text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Mô tả</label>
                  <input 
                    type="text" 
                    value={newTransDesc}
                    onChange={e => setNewTransDesc(e.target.value)}
                    placeholder="Ví dụ: Mua nguyên liệu..."
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-4 py-4 font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 mb-1.5 uppercase tracking-wider">Danh mục</label>
                  <select 
                    value={newTransCat}
                    onChange={e => setNewTransCat(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border-none rounded-2xl px-4 py-4 font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 appearance-none"
                  >
                    <option value="Nguyên liệu">Nguyên liệu</option>
                    <option value="Điện nước">Điện nước</option>
                    <option value="Mặt bằng">Mặt bằng</option>
                    <option value="Lương nhân viên">Lương nhân viên</option>
                    <option value="Khác">Khác</option>
                    <option value="Bán hàng">Bán hàng</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleAddTransaction}
                className="w-full py-4 bg-[#C9252C] text-white font-black rounded-2xl shadow-lg shadow-red-200 dark:shadow-none tap-active hover:bg-red-700 transition-colors text-lg"
              >
                Lưu giao dịch
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

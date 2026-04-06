import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Plus, Minus, X, Search, Pencil, Trash2, Check, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  isOutOfStock?: boolean;
  hasCustomizations?: boolean;
  inventoryQty?: number;
}

interface OrderItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  temperature?: string;
  sugarLevel?: string;
  iceLevel?: string;
  size?: string;
  note?: string;
}

interface Order {
  orderId: string;
  tableNumber?: string;
  items: OrderItem[];
  total: number;
  orderStatus?: string;
}

interface OrderItemSheetProps {
  order: Order;
  menuItems: MenuItem[];
  onClose: () => void;
  onSave: (newItems: OrderItem[], newTotal: number) => Promise<boolean>;
}

type ActiveTab = 'menu' | 'order';

// ─── Main Component ────────────────────────────────────────────────────────────
export function OrderItemSheet({ order, menuItems: rawMenuItems, onClose, onSave }: OrderItemSheetProps) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  // Items to be added (both roles)
  const [pendingItems, setPendingItems] = useState<OrderItem[]>([]);
  // Admin's editable copy of existing order items
  const [localOrderItems, setLocalOrderItems] = useState<OrderItem[]>(order.items);
  // Modals
  const [pickingItem, setPickingItem] = useState<MenuItem | null>(null);
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Toast
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(p => ({ ...p, visible: false })), 2000);
  }, []);

  // ── Menu filtering ──────────────────────────────────────────────────────────
  const availableItems = useMemo(() =>
    rawMenuItems.filter(m => !m.isOutOfStock),
    [rawMenuItems]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableItems.map(i => i.category || 'Khác').filter(Boolean)));
    return ['Tất cả', ...cats];
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    if (search) return availableItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory !== 'Tất cả') return availableItems.filter(i => (i.category || 'Khác') === activeCategory);
    return availableItems;
  }, [availableItems, search, activeCategory]);

  // ── Has unsaved changes ──────────────────────────────────────────────────────
  const hasChanges = pendingItems.length > 0 ||
    JSON.stringify(localOrderItems) !== JSON.stringify(order.items);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!hasChanges) return;
    setIsSubmitting(true);
    const finalItems = [...localOrderItems, ...pendingItems];
    const newTotal = finalItems.reduce((s, i) => s + (i.unitPrice ?? i.price ?? 0) * i.quantity, 0);
    const success = await onSave(finalItems, newTotal);
    setIsSubmitting(false);
    if (success) onClose();
  }, [hasChanges, localOrderItems, pendingItems, onSave, onClose]);

  // ── Admin: modify local order items ─────────────────────────────────────────
  const handleChangeQty = useCallback((idx: number, delta: number) => {
    setLocalOrderItems(prev => {
      const updated = [...prev];
      const newQty = (updated[idx].quantity || 1) + delta;
      if (newQty <= 0) {
        updated.splice(idx, 1);
        showToast(`Đã xóa ${prev[idx].name}`);
      } else {
        updated[idx] = { ...updated[idx], quantity: newQty };
      }
      return updated;
    });
  }, [showToast]);

  const handleDeleteItem = useCallback((idx: number) => {
    setLocalOrderItems(prev => {
      const name = prev[idx].name;
      showToast(`Đã xóa ${name}`);
      return prev.filter((_, i) => i !== idx);
    });
  }, [showToast]);

  const handleEditItem = useCallback((item: OrderItem, idx: number) => {
    setEditingItem(item);
    setEditingIndex(idx);
  }, []);

  const handleSaveEditedItem = useCallback((updated: OrderItem) => {
    setLocalOrderItems(prev => {
      const copy = [...prev];
      copy[editingIndex] = updated;
      return copy;
    });
    setEditingItem(null);
    setEditingIndex(-1);
    showToast(`Đã cập nhật ${updated.name}`);
  }, [editingIndex, showToast]);

  // ── Add pending item ─────────────────────────────────────────────────────────
  const handleConfirmAdd = useCallback((item: OrderItem) => {
    setPendingItems(prev => [...prev, item]);
    setPickingItem(null);
    showToast(`Đã chọn ${item.name}`);
  }, [showToast]);

  const removePending = useCallback((idx: number) => {
    setPendingItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Cart total for display ───────────────────────────────────────────────────
  const orderTotal = localOrderItems.reduce((s, i) => s + (i.unitPrice ?? i.price ?? 0) * i.quantity, 0);
  const pendingTotal = pendingItems.reduce((s, i) => s + (i.unitPrice ?? i.price ?? 0) * i.quantity, 0);

  const closeSheet = () => {
    if (!pickingItem && !editingItem) onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
        onClick={closeSheet}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        drag="y" dragConstraints={{ top: 0 }} dragElastic={0.15}
        onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 500) onClose(); }}
        className="fixed bottom-0 left-0 right-0 bg-stone-50 dark:bg-stone-950 rounded-t-[32px] max-h-[90vh] flex flex-col shadow-2xl"
        style={{ zIndex: 81 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab shrink-0">
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2 flex items-center justify-between shrink-0">
          <div>
            {(order.orderId || order.tableNumber) && (
              <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                #{order.orderId.slice(-8)}{order.tableNumber ? ` · Bàn ${order.tableNumber}` : ''}
              </p>
            )}
            <h2 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-widest">
              {activeTab === 'menu' ? 'Thêm món vào đơn' : `Đơn hiện tại · ${localOrderItems.length} món`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab pills — cả 2 vai trò đều thấy */}
        <div className="px-4 pb-2 shrink-0 flex gap-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === 'menu'
                ? 'bg-[#C9252C] text-white shadow-sm shadow-red-200/40'
                : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
            }`}
          >
            + Thêm món
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === 'order'
                ? 'bg-stone-800 dark:bg-white text-white dark:text-stone-900 shadow-sm'
                : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
            }`}
          >
            Trong đơn {localOrderItems.length > 0 && `(${localOrderItems.length})`}
          </button>
        </div>

        {/* ── TAB: THÊM MÓN ── */}
        {activeTab === 'menu' && (
          <>
            {/* Search */}
            <div className="px-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm món nhanh..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 pl-9 pr-9 rounded-xl font-bold text-[13px] text-stone-800 dark:text-white placeholder:text-stone-400 outline-none focus:border-[#C9252C]/40"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 tap-active">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills */}
            {!search && (
              <div className="px-4 pb-2 shrink-0 overflow-x-auto no-scrollbar">
                <div className="flex gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeCategory === cat
                          ? 'bg-[#C9252C] text-white shadow-sm shadow-red-200/40'
                          : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pending items summary */}
            {pendingItems.length > 0 && (
              <div className="mx-4 mb-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 shrink-0">
                <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1.5">
                  Đã chọn ({pendingItems.length} món)
                </p>
                <div className="space-y-1">
                  {pendingItems.map((it, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">
                        {it.quantity}× {it.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-400">
                          {((it.unitPrice ?? it.price ?? 0) * it.quantity).toLocaleString('vi-VN')}đ
                        </span>
                        <button onClick={() => removePending(i)} className="w-5 h-5 flex items-center justify-center text-red-400 tap-active">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Menu list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-1">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setPickingItem(item)}
                  className="group bg-white dark:bg-stone-900 rounded-2xl p-4 flex items-center justify-between gap-4 border border-stone-100 dark:border-stone-800 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] leading-tight truncate text-stone-800 dark:text-white">{item.name}</h3>
                    <p className="text-[#C9252C] font-black text-[15px] mt-0.5">{item.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-[#C9252C] flex items-center justify-center shadow-sm shadow-red-200 dark:shadow-none shrink-0">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-stone-400 text-sm font-medium">Không tìm thấy món nào</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB: TRONG ĐƠN — tất cả người dùng đều sửa/xóa được ── */}
        {activeTab === 'order' && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 pt-1">
            {localOrderItems.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-stone-400 text-sm font-medium">Đơn trống — chuyển sang tab Thêm món</p>
              </div>
            ) : (
              <>
                {localOrderItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-stone-900 rounded-2xl p-4 flex items-center gap-3 border border-stone-100 dark:border-stone-800 shadow-sm"
                  >
                    {/* Số lượng — tất cả người dùng */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleChangeQty(idx, -1)}
                        className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 tap-active">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-black text-sm text-stone-800 dark:text-white">{item.quantity}</span>
                      <button onClick={() => handleChangeQty(idx, 1)}
                        className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 tap-active">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] text-stone-800 dark:text-white truncate">{item.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.temperature && <span className="text-[10px] text-stone-400">{item.temperature}</span>}
                        {item.sugarLevel && item.sugarLevel !== 'Bình thường' && (
                          <span className="text-[10px] text-stone-400">· {item.sugarLevel}</span>
                        )}
                        {item.note && <span className="text-[10px] text-stone-400 italic truncate">· {item.note}</span>}
                      </div>
                      <p className="text-[#C9252C] font-black text-[12px] mt-0.5">
                        {((item.unitPrice ?? item.price ?? 0) * item.quantity).toLocaleString('vi-VN')}đ
                      </p>
                    </div>

                    {/* Sửa & Xóa — tất cả người dùng */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleEditItem(item, idx)}
                        className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active" title="Sửa">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(idx)}
                        className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-500 tap-active" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Order total */}
                <div className="bg-stone-100 dark:bg-stone-800/60 rounded-2xl px-4 py-3 flex items-center justify-between mt-2">
                  <span className="text-stone-500 dark:text-stone-400 font-black text-[11px] uppercase tracking-widest">Tổng đơn</span>
                  <span className="text-[#C9252C] font-black text-lg tracking-tighter">
                    {orderTotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Submit button ── */}
        {hasChanges && (
          <div className="px-4 pb-6 pt-3 shrink-0 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
            <button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full py-4 bg-emerald-600 text-white font-black text-[13px] uppercase tracking-wider rounded-2xl tap-active disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? 'Đang lưu...' : (
                pendingItems.length > 0
                  ? `✓ Xác nhận thêm ${pendingItems.reduce((s, i) => s + i.quantity, 0)} món · +${pendingTotal.toLocaleString('vi-VN')}đ`
                  : `✓ Lưu thay đổi đơn`
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            key="ois-toast"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed top-6 left-4 right-4 flex justify-center pointer-events-none"
            style={{ zIndex: 90 }}
          >
            <div className="bg-white dark:bg-stone-900 text-stone-800 dark:text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-stone-100 dark:border-stone-800 max-w-sm">
              <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <p className="text-[13px] font-bold truncate">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customization picker modal (add new item) */}
      <AnimatePresence>
        {pickingItem && (
          <ItemPickerModal
            key="ois-picker"
            item={pickingItem}
            onClose={() => setPickingItem(null)}
            onConfirm={handleConfirmAdd}
          />
        )}
      </AnimatePresence>

      {/* Edit existing item modal (admin only) */}
      <AnimatePresence>
        {editingItem && (
          <ItemEditModal
            key="ois-edit"
            item={editingItem}
            onClose={() => { setEditingItem(null); setEditingIndex(-1); }}
            onSave={handleSaveEditedItem}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Item Picker Modal (add new item to order) ─────────────────────────────────
const ItemPickerModal: React.FC<{
  item: MenuItem;
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
}> = ({ item, onClose, onConfirm }) => {
  const nameUpper = item.name.toUpperCase();
  const impliedTemp = nameUpper.includes('NÓNG') || nameUpper.includes('HOT') ? 'Nóng'
    : nameUpper.includes('ĐÁ') || nameUpper.includes('ICE') ? 'Đá' : null;

  const [qty, setQty] = useState(1);
  const [temp, setTemp] = useState(impliedTemp || 'Đá');
  const [sugar, setSugar] = useState('Bình thường');
  const [ice, setIce] = useState('Bình thường');
  const [note, setNote] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center"
      style={{ zIndex: 85 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-t-[40px] w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-t border-stone-100 dark:border-stone-800"
      >
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full" />
        </div>
        <div className="px-6 py-2 flex justify-between items-center border-b border-stone-50 dark:border-stone-800/50">
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Thêm vào đơn</p>
            <h2 className="text-xl font-black text-[#C9252C] tracking-tighter uppercase">{item.name}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Số lượng */}
          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Số lượng
            </h4>
            <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-2xl p-1 border border-stone-100 dark:border-stone-800 w-fit">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-12 text-center font-black text-xl text-stone-800 dark:text-white">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </section>

          {/* Nhiệt độ — ẩn khi tên đã gợi ý */}
          {!impliedTemp && (
            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Nhiệt độ
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {['Nóng', 'Đá', 'Đá riêng'].map(t => (
                  <button key={t} onClick={() => setTemp(t)}
                    className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                      temp === t
                        ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                    }`}>{t}</button>
                ))}
              </div>
            </section>
          )}

          {/* Lượng đá */}
          {temp !== 'Nóng' && impliedTemp !== 'Nóng' && (
            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đá
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {['Ít', 'Vừa', 'Bình thường'].map(l => (
                  <button key={l} onClick={() => setIce(l)}
                    className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                      ice === l
                        ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                    }`}>{l}</button>
                ))}
              </div>
            </section>
          )}

          {/* Lượng đường */}
          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đường
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['Ít ngọt', 'Vừa', 'Bình thường', 'Ngọt', 'Đường kiêng'].map(l => (
                <button key={l}
                  onClick={() => setSugar(l === 'Đường kiêng' ? '1 gói đường kiêng' : l)}
                  className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                    (l === 'Đường kiêng' ? sugar === '1 gói đường kiêng' : sugar === l)
                      ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                      : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                  }`}>{l}</button>
              ))}
            </div>
          </section>

          {/* Ghi chú */}
          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-stone-200 dark:bg-stone-700 rounded-full" />Ghi chú
            </h4>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Không lấy ống hút, thêm nhiều đá..."
              className="w-full bg-stone-50 dark:bg-stone-900/30 border border-stone-100 dark:border-stone-800 p-4 rounded-2xl resize-none text-[13px] font-medium focus:border-[#C9252C]/30 outline-none placeholder:text-stone-300"
              rows={2} />
          </section>
        </div>

        <div className="p-6 bg-white dark:bg-stone-900 border-t border-stone-50 dark:border-stone-800/50">
          <div className="flex items-center justify-between mb-5">
            <div className="text-right">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tổng cộng</p>
              <p className="text-2xl font-black text-[#C9252C] tracking-tighter">{(item.price * qty).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
          <button
            onClick={() => onConfirm({
              id: item.id,
              name: item.name,
              quantity: qty,
              unitPrice: item.price,
              temperature: impliedTemp || temp,
              sugarLevel: sugar,
              iceLevel: (impliedTemp === 'Nóng' || temp === 'Nóng') ? undefined : ice,
              size: 'Tiêu chuẩn',
              note,
            })}
            className="w-full py-4 bg-[#C9252C] text-white font-black text-[15px] uppercase tracking-wider rounded-2xl tap-active flex items-center justify-center gap-3 shadow-lg shadow-red-200 dark:shadow-none"
          >
            <ShoppingBag className="w-5 h-5" />Thêm vào đơn
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Item Edit Modal (admin: edit existing order item) ─────────────────────────
const ItemEditModal: React.FC<{
  item: OrderItem;
  onClose: () => void;
  onSave: (item: OrderItem) => void;
}> = ({ item, onClose, onSave }) => {
  const [qty, setQty] = useState(item.quantity);
  const [temp, setTemp] = useState(item.temperature || 'Đá');
  const [sugar, setSugar] = useState(item.sugarLevel || 'Bình thường');
  const [ice, setIce] = useState(item.iceLevel || 'Bình thường');
  const [note, setNote] = useState(item.note || '');
  const unitPrice = item.unitPrice ?? item.price ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center"
      style={{ zIndex: 88 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
        onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) onClose(); }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-t-[40px] w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-t border-stone-100 dark:border-stone-800"
      >
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full" />
        </div>
        <div className="px-6 py-2 flex justify-between items-center border-b border-stone-50 dark:border-stone-800/50">
          <div>
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sửa món</p>
            <h2 className="text-xl font-black text-[#C9252C] tracking-tighter uppercase">{item.name}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Nhiệt độ
            </h4>
            <div className="grid grid-cols-3 gap-2.5">
              {['Nóng', 'Đá', 'Đá riêng'].map(t => (
                <button key={t} onClick={() => setTemp(t)}
                  className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                    temp === t ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                      : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                  }`}>{t}</button>
              ))}
            </div>
          </section>

          {temp === 'Đá' && (
            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đá
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {['Ít', 'Vừa', 'Bình thường'].map(l => (
                  <button key={l} onClick={() => setIce(l)}
                    className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                      ice === l ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                    }`}>{l}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đường
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['Ít ngọt', 'Vừa', 'Bình thường', 'Ngọt', 'Đường kiêng'].map(l => (
                <button key={l}
                  onClick={() => setSugar(l === 'Đường kiêng' ? '1 gói đường kiêng' : l)}
                  className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                    (l === 'Đường kiêng' ? sugar === '1 gói đường kiêng' : sugar === l)
                      ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                      : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                  }`}>{l}</button>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-stone-200 dark:bg-stone-700 rounded-full" />Ghi chú
            </h4>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Không lấy ống hút, thêm nhiều đá..."
              className="w-full bg-stone-50 dark:bg-stone-900/30 border border-stone-100 dark:border-stone-800 p-4 rounded-2xl resize-none text-[13px] font-medium focus:border-[#C9252C]/30 outline-none placeholder:text-stone-300"
              rows={2} />
          </section>
        </div>

        <div className="p-6 bg-white dark:bg-stone-900 border-t border-stone-50 dark:border-stone-800/50">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-2xl p-1 border border-stone-100 dark:border-stone-800">
              <button onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-12 text-center font-black text-xl text-stone-800 dark:text-white">{qty}</span>
              <button onClick={() => setQty(qty + 1)}
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tổng cộng</p>
              <p className="text-2xl font-black text-[#C9252C] tracking-tighter">{(unitPrice * qty).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
          <button
            onClick={() => onSave({
              ...item, quantity: qty, temperature: temp, sugarLevel: sugar,
              iceLevel: temp === 'Đá' ? ice : (temp === 'Đá riêng' ? 'Bình thường' : undefined),
              note,
            })}
            className="w-full py-4 bg-stone-800 dark:bg-white text-white dark:text-stone-900 font-black text-[15px] uppercase tracking-wider rounded-2xl tap-active flex items-center justify-center gap-3 shadow-lg"
          >
            <Check className="w-5 h-5" />Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

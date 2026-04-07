import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Plus, Minus, X, Check, Search, ShoppingBag, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, CartItem } from '../types';
import { useData } from '../context/DataContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GroupedMenuItem extends MenuItem {
  variants?: {
    [key: string]: { id: string; price: number; isOutOfStock: boolean };
  };
}

type ActiveTab = 'menu' | 'order';

interface AddMenuSheetProps {
  onClose: () => void;
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────
export function AddMenuSheet({ onClose }: AddMenuSheetProps) {
  const { menuItems: rawMenuItems } = useData();
  const { cart, addToCart, updateQuantity, updateCartItem } = useCart();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedItem, setSelectedItem] = useState<GroupedMenuItem | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const toastRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2000);
  }, []);

  // ── Normalize menu items — deduplicate Nóng/Đá variants ─────────────────────
  const menuItems = useMemo(() => {
    const map = new Map<string, GroupedMenuItem>();
    rawMenuItems.forEach(item => {
      const match = item.name.match(/\s*[\(\-]?\s*(Nóng|Đá|Hot|Ice)\s*[\)]?$/i);
      let variantType = 'default';
      if (match) {
        const t = match[1].toLowerCase();
        if (t.includes('nóng') || t.includes('hot')) variantType = 'Nóng';
        else if (t.includes('đá') || t.includes('ice')) variantType = 'Đá';
      }
      const norm = item.name.replace(/\s*[\(\-]?\s*(Nóng|Đá|Hot|Ice)\s*[\)]?$/i, '').trim();
      if (!map.has(norm)) {
        map.set(norm, {
          ...item, name: norm,
          variants: { [variantType]: { id: item.id, price: item.price, isOutOfStock: item.isOutOfStock } },
        });
      } else {
        const ex = map.get(norm)!;
        if (!ex.variants) ex.variants = {};
        ex.variants[variantType] = { id: item.id, price: item.price, isOutOfStock: item.isOutOfStock };
        if (variantType === 'Đá' || variantType === 'default') { ex.id = item.id; ex.price = item.price; }
      }
    });
    return Array.from(map.values());
  }, [rawMenuItems]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(
      menuItems.map(i => i.category).filter((c): c is string => typeof c === 'string' && c.trim() !== '')
    ));
    return ['Tất cả', ...cats];
  }, [menuItems]);

  const filtered = useMemo(() => {
    if (search) return menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    if (activeCategory !== 'Tất cả') return menuItems.filter(i => i.category === activeCategory);
    return menuItems;
  }, [menuItems, search, activeCategory]);

  const getCartQty = (id: string) => cart.filter(c => c.id === id).reduce((s, c) => s + c.quantity, 0);

  // Tap card → instant add (1 qty)
  const handleInstantAdd = useCallback((item: GroupedMenuItem) => {
    if (item.isOutOfStock) return;
    addToCart({
      ...item,
      cartItemId: Math.random().toString(36).substr(2, 9),
      quantity: 1,
      size: 'Tiêu chuẩn',
      toppings: [],
      unitPrice: item.price,
      note: '',
    });
    showToast(`Đã thêm ${item.name}`);
  }, [addToCart, showToast]);

  // + button → customization modal
  const handleAddQuick = useCallback((e: React.MouseEvent, item: GroupedMenuItem) => {
    e.stopPropagation();
    if (item.isOutOfStock) return;
    setPendingQuantity(1);
    setSelectedItem(item);
  }, []);

  const handleAddToCart = useCallback((cartItem: CartItem) => {
    addToCart(cartItem);
    setSelectedItem(null);
    showToast(`Đã thêm ${cartItem.name}`);
  }, [addToCart, showToast]);

  // Admin: edit existing cart item
  const handleEditCartItem = useCallback((item: CartItem) => {
    setEditingCartItem(item);
  }, []);

  // Admin: remove item from cart
  const handleRemoveCartItem = useCallback((item: CartItem) => {
    updateQuantity(item.cartItemId, -item.quantity);
    showToast(`Đã xóa ${item.name}`);
  }, [updateQuantity, showToast]);

  const handleSaveCartItem = useCallback((updatedItem: CartItem) => {
    updateCartItem(updatedItem.cartItemId, updatedItem);
    setEditingCartItem(null);
    showToast(`Đã cập nhật ${updatedItem.name}`);
  }, [updateCartItem, showToast]);

  const cartTotal = cart.reduce((s, i) => s + (i.unitPrice || i.price) * i.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => { if (info.offset.y > 150 || info.velocity.y > 900) onClose(); }}
        className="fixed bottom-0 left-0 right-0 bg-stone-50 dark:bg-stone-950 rounded-t-[32px] max-h-[90vh] flex flex-col shadow-2xl"
        style={{ zIndex: 81 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 cursor-grab shrink-0">
          <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" />
        </div>

        {/* Header row */}
        <div className="px-4 pb-2 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-black text-stone-800 dark:text-white uppercase tracking-widest">
            {activeTab === 'menu' ? 'Thêm món vào đơn' : `Đơn hiện tại · ${cart.length} món`}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab pills — "Trong đơn" only for admin */}
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
          {isAdmin && (
            <button
              onClick={() => setActiveTab('order')}
              className={`flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all ${
                activeTab === 'order'
                  ? 'bg-stone-800 dark:bg-white text-white dark:text-stone-900 shadow-sm'
                  : 'bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
              }`}
            >
              Trong đơn {cart.length > 0 && `(${cart.length})`}
            </button>
          )}
        </div>

        {/* ── TAB: THÊM MÓN — mirror Menu.tsx list view ── */}
        {activeTab === 'menu' && (
          <>
            {/* Search — mirror Menu.tsx */}
            <div className="px-4 pb-2 shrink-0">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#C9252C] z-10 transition-colors">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm món ngon..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-11 bg-stone-50 dark:bg-stone-800/50 border-none focus:ring-2 focus:ring-[#C9252C]/20 pl-10 pr-10 rounded-2xl font-bold text-[14px] text-stone-800 dark:text-white placeholder:text-stone-400 outline-none transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 z-10 tap-active">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Category pills — mirror Menu.tsx */}
            {!search && (
               <div className="px-4 pb-2 shrink-0 overflow-x-auto whitespace-nowrap custom-scrollbar hide-scrollbar border-t border-stone-100 dark:border-stone-800 pt-2 mt-1">
                <div className="flex items-center gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`shrink-0 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                        activeCategory === cat
                          ? 'text-white bg-[#C9252C] shadow-md shadow-red-200 dark:shadow-none scale-105'
                          : 'bg-transparent text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-800 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Item list — mirror Menu.tsx list view */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2.5 pt-1">
              {filtered.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleInstantAdd(item)}
                  className={`group relative bg-white dark:bg-stone-900 rounded-2xl p-4 flex items-center justify-between gap-4 border border-stone-100 dark:border-stone-800 shadow-sm ${
                    item.isOutOfStock
                      ? 'opacity-50 grayscale pointer-events-none cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <h3 className={`font-bold text-[15px] leading-tight truncate ${
                        item.isOutOfStock ? 'text-stone-400 line-through decoration-stone-400 decoration-1' : 'text-stone-800 dark:text-white'
                      }`}>
                        {item.name}
                      </h3>
                      {!item.isOutOfStock && item.inventoryQty !== undefined && (
                        <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                          item.inventoryQty <= 2
                            ? 'text-red-500 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
                            : item.inventoryQty <= 5
                            ? 'text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30'
                            : 'text-stone-400 bg-stone-50 border-stone-100 dark:bg-stone-800/50 dark:border-stone-700'
                        }`}>
                          {item.inventoryQty <= 5 ? 'Sắp hết · ' : ''}{item.inventoryQty} còn
                        </span>
                      )}
                    </div>
                    <p className="text-[#C9252C] font-black text-[15px]">{item.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  {item.hasCustomizations !== false && (
                    <button
                      onClick={e => handleAddQuick(e, item)}
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm tap-active shrink-0 bg-[#C9252C] text-white shadow-red-200 dark:shadow-none"
                      title="Tùy chọn"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 rounded-[24px] flex items-center justify-center mb-6">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-stone-800 dark:text-white font-black text-lg mb-2">Không tìm thấy</h3>
                  <p className="text-stone-400 dark:text-stone-500 font-medium text-sm">Thử từ khóa khác hoặc đổi danh mục</p>
                </div>
              )}
            </div>
          </>
        )}


        {/* ── TAB: TRONG ĐƠN (admin only) ── */}
        {activeTab === 'order' && isAdmin && (
          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2 pt-1">
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-stone-400 text-sm font-medium">Chưa có món nào trong đơn</p>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div
                    key={item.cartItemId}
                    className="bg-white dark:bg-stone-900 rounded-2xl p-4 flex items-center gap-3 border border-stone-100 dark:border-stone-800 shadow-sm"
                  >
                    {/* Qty control */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          updateQuantity(item.cartItemId, -1);
                          if (item.quantity <= 1) showToast(`Đã xóa ${item.name}`);
                        }}
                        className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 tap-active"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-black text-sm text-stone-800 dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, 1)}
                        className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-600 dark:text-stone-300 tap-active"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] text-stone-800 dark:text-white truncate">{item.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.temperature && (
                          <span className="text-[10px] text-stone-400 font-medium">{item.temperature}</span>
                        )}
                        {item.sugarLevel && item.sugarLevel !== 'Bình thường' && (
                          <span className="text-[10px] text-stone-400 font-medium">· {item.sugarLevel}</span>
                        )}
                        {item.note && (
                          <span className="text-[10px] text-stone-400 font-medium italic truncate">· {item.note}</span>
                        )}
                      </div>
                      <p className="text-[#C9252C] font-black text-[12px] mt-0.5">
                        {((item.unitPrice || item.price) * item.quantity).toLocaleString('vi-VN')}đ
                      </p>
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleEditCartItem(item)}
                        className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active"
                        title="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveCartItem(item)}
                        className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-500 tap-active"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="bg-stone-100 dark:bg-stone-800/60 rounded-2xl px-4 py-3 flex items-center justify-between mt-2">
                  <span className="text-stone-500 dark:text-stone-400 font-black text-[11px] uppercase tracking-widest">Tổng đơn</span>
                  <span className="text-[#C9252C] font-black text-lg tracking-tighter">{cartTotal.toLocaleString('vi-VN')}đ</span>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            key="sheet-toast"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-6 left-4 right-4 flex justify-center pointer-events-none"
            style={{ zIndex: 90 }}
          >
            <div className="bg-white dark:bg-stone-900 text-stone-800 dark:text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-stone-100 dark:border-stone-800 max-w-sm pointer-events-auto">
              <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <p className="text-[13px] font-bold truncate">{toast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add: Customization Modal */}
      <AnimatePresence>
        {selectedItem && (
          <SheetCustomizationModal
            key="sheet-custom-modal"
            item={selectedItem}
            currentQty={getCartQty(selectedItem.id)}
            initialQuantity={pendingQuantity}
            onClose={() => setSelectedItem(null)}
            onAdd={handleAddToCart}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {/* Admin Edit: Edit existing cart item */}
      <AnimatePresence>
        {editingCartItem && (
          <SheetEditItemModal
            key="sheet-edit-modal"
            item={editingCartItem}
            onClose={() => setEditingCartItem(null)}
            onSave={handleSaveCartItem}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Customization Modal — mirrors Menu.tsx CustomizationModal ────────────────
const SheetCustomizationModal: React.FC<{
  item: GroupedMenuItem;
  currentQty: number;
  initialQuantity?: number;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  showToast: (msg: string) => void;
}> = ({ item, currentQty, initialQuantity = 1, onClose, onAdd, showToast }) => {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [temperature, setTemperature] = useState('Đá');
  const [sugarLevel, setSugarLevel] = useState('Bình thường');
  const [iceLevel, setIceLevel] = useState('Bình thường');
  const [note, setNote] = useState('');

  const hasCustomizations = item.hasCustomizations !== false;
  const getVariant = (temp: string) => {
    if (!item.variants) return null;
    if (temp === 'Nóng') return item.variants['Nóng'];
    if (temp === 'Đá' || temp === 'Đá riêng') return item.variants['Đá'];
    return null;
  };
  const currentVariant = getVariant(temperature);
  const basePrice = currentVariant ? currentVariant.price : item.price;
  const baseId = currentVariant ? currentVariant.id : item.id;

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
          <h2 className="text-xl font-black text-[#C9252C] tracking-tighter uppercase">{item.name}</h2>
          <button onClick={onClose} className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {hasCustomizations && (
            <div className="space-y-6">
              <section>
                <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Nhiệt độ
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {['Nóng', 'Đá', 'Đá riêng'].map(temp => (
                    <button key={temp} onClick={() => setTemperature(temp)}
                      className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                        temperature === temp
                          ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                      }`}>{temp}</button>
                  ))}
                </div>
              </section>
              {temperature === 'Đá' && (
                <section>
                  <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                    <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đá
                  </h4>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['Ít', 'Vừa', 'Bình thường'].map(level => (
                      <button key={level} onClick={() => setIceLevel(level)}
                        className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                          iceLevel === level
                            ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                            : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                        }`}>{level}</button>
                    ))}
                  </div>
                </section>
              )}
              <section>
                <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đường
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {['Ít ngọt', 'Vừa', 'Bình thường', 'Ngọt', 'Đường kiêng'].map(level => (
                    <button key={level}
                      onClick={() => setSugarLevel(level === 'Đường kiêng' ? '1 gói đường kiêng' : level)}
                      className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                        (level === 'Đường kiêng' ? sugarLevel === '1 gói đường kiêng' : sugarLevel === level)
                          ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                      }`}>{level}</button>
                  ))}
                </div>
              </section>
            </div>
          )}
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
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-12 text-center font-black text-xl text-stone-800 dark:text-white">{quantity}</span>
              <button onClick={() => {
                if (item.inventoryQty !== undefined && currentQty + quantity + 1 > item.inventoryQty) {
                  showToast(`Chỉ còn ${item.inventoryQty} trong kho!`); return;
                }
                setQuantity(quantity + 1);
              }} className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tổng cộng</p>
              <p className="text-2xl font-black text-[#C9252C] tracking-tighter">{(basePrice * quantity).toLocaleString()}đ</p>
            </div>
          </div>
          <button
            onClick={() => onAdd({
              ...item, id: baseId, price: basePrice,
              cartItemId: Math.random().toString(36).substr(2, 9),
              quantity, size: 'Tiêu chuẩn', toppings: [],
              unitPrice: basePrice, temperature, sugarLevel,
              iceLevel: temperature === 'Đá' ? iceLevel : (temperature === 'Đá riêng' ? 'Bình thường' : undefined),
              note,
            })}
            className="w-full py-4 bg-[#C9252C] text-white font-black text-[15px] uppercase tracking-wider rounded-2xl tap-active flex items-center justify-center gap-3 shadow-lg shadow-red-200 dark:shadow-none"
          >
            <ShoppingBag className="w-5 h-5" />Thêm vào giỏ hàng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Admin Edit Modal — edit an existing CartItem in the order ────────────────
const SheetEditItemModal: React.FC<{
  item: CartItem;
  onClose: () => void;
  onSave: (item: CartItem) => void;
  showToast: (msg: string) => void;
}> = ({ item, onClose, onSave, showToast }) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [temperature, setTemperature] = useState(item.temperature || 'Đá');
  const [sugarLevel, setSugarLevel] = useState(item.sugarLevel || 'Bình thường');
  const [iceLevel, setIceLevel] = useState(item.iceLevel || 'Bình thường');
  const [note, setNote] = useState(item.note || '');

  const unitPrice = item.unitPrice || item.price;

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
          <div className="space-y-6">
            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Nhiệt độ
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {['Nóng', 'Đá', 'Đá riêng'].map(temp => (
                  <button key={temp} onClick={() => setTemperature(temp)}
                    className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                      temperature === temp
                        ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                    }`}>{temp}</button>
                ))}
              </div>
            </section>
            {temperature === 'Đá' && (
              <section>
                <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đá
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {['Ít', 'Vừa', 'Bình thường'].map(level => (
                    <button key={level} onClick={() => setIceLevel(level)}
                      className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                        iceLevel === level
                          ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                      }`}>{level}</button>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full" />Lượng đường
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {['Ít ngọt', 'Vừa', 'Bình thường', 'Ngọt', 'Đường kiêng'].map(level => (
                  <button key={level}
                    onClick={() => setSugarLevel(level === 'Đường kiêng' ? '1 gói đường kiêng' : level)}
                    className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                      (level === 'Đường kiêng' ? sugarLevel === '1 gói đường kiêng' : sugarLevel === level)
                        ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]'
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                    }`}>{level}</button>
                ))}
              </div>
            </section>
          </div>
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
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Minus className="w-5 h-5" />
              </button>
              <span className="w-12 text-center font-black text-xl text-stone-800 dark:text-white">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tổng cộng</p>
              <p className="text-2xl font-black text-[#C9252C] tracking-tighter">{(unitPrice * quantity).toLocaleString()}đ</p>
            </div>
          </div>
          <button
            onClick={() => onSave({
              ...item, quantity, temperature, sugarLevel,
              iceLevel: temperature === 'Đá' ? iceLevel : (temperature === 'Đá riêng' ? 'Bình thường' : undefined),
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

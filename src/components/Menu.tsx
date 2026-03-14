import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { Plus, Minus, X, Check, Search, Heart, AlertCircle, RefreshCw, ChevronRight, ShoppingBag, Settings as SettingsIcon, Package, ArrowUp, LayoutGrid, List, Coffee } from 'lucide-react';
import { VirtuosoGrid, VirtuosoGridHandle } from 'react-virtuoso';
import { motion, AnimatePresence } from 'motion/react';
import { MenuItem, CartItem } from '../types';
import { useData } from '../context/DataContext';
import { useCart } from '../context/CartContext';
import { useUI } from '../context/UIContext';
import { BackToTopFab } from './BackToTopFab';

export const SIZES = [
  { id: 'STD', name: 'Tiêu chuẩn', price: 0 },
];

export const TOPPINGS: { id: string; name: string; price: number }[] = [];

interface MenuProps {
  appsScriptUrl: string;
  onNavigateSettings: () => void;
}

interface GroupedMenuItem extends MenuItem {
  variants?: {
    [key: string]: {
      id: string;
      price: number;
      isOutOfStock: boolean;
    };
  };
}



export function Menu({ appsScriptUrl, onNavigateSettings }: MenuProps) {
  const { menuItems: rawMenuItems, isLoading, isRefreshing, error, fetchAllData, createOrder, lastUpdated, updateMenuItem } = useData();
  const { cart, addToCart } = useCart();
  const virtuosoRef = React.useRef<VirtuosoGridHandle>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const { isNavHidden, setIsFabHidden } = useUI();
  const isHeaderHidden = isNavHidden;
  const lastScrollTop = React.useRef(0);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) setScrollParent(main);
  }, []);

  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'name_asc'>('default');
  const [selectedItem, setSelectedItem] = useState<GroupedMenuItem | null>(null);
  const [outOfStockItem, setOutOfStockItem] = useState<GroupedMenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(window.innerWidth < 640 ? 'list' : 'grid');
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'success' | 'warning' }>({ message: '', visible: false });
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setViewMode('list');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    setIsFabHidden(!!selectedItem || !!outOfStockItem);
    return () => setIsFabHidden(false);
  }, [selectedItem, outOfStockItem, setIsFabHidden]);

  useEffect(() => {
    if (categoryScrollRef.current) {
      const activeBtn = categoryScrollRef.current.querySelector<HTMLButtonElement>(`button[data-active="true"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeCategory]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    // Removed scroll listener for back to top as it's now handled in BackToTopFab
  }, []);

  useEffect(() => {
    const updateTimeAgo = () => {
      if (!lastUpdated) {
        setTimeAgo('');
        return;
      }
      const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) setTimeAgo('Vừa xong');
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)} phút trước`);
      else setTimeAgo(`${Math.floor(seconds / 3600)} giờ trước`);
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    const handleOutOfStock = (e: any) => {
      const item = e.detail;
      showToast(`Món "${item.name}" vừa hết hàng!`, 'warning');
      
      // Play alert sound only if user is not looking at the screen
      if (document.hidden) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (err) {
          console.error('Error playing sound:', err);
        }
      }
    };

    window.addEventListener('itemOutOfStock', handleOutOfStock);
    return () => window.removeEventListener('itemOutOfStock', handleOutOfStock);
  }, []);

  const menuItems = useMemo(() => {
    const uniqueItemsMap = new Map<string, GroupedMenuItem>();
    
    rawMenuItems.forEach((item) => {
      const match = item.name.match(/\s*[\(\-]?\s*(Nóng|Đá|Hot|Ice)\s*[\)]?$/i);
      let variantType = 'default';
      if (match) {
        const typeStr = match[1].toLowerCase();
        if (typeStr.includes('nóng') || typeStr.includes('hot')) variantType = 'Nóng';
        else if (typeStr.includes('đá') || typeStr.includes('ice')) variantType = 'Đá';
      }

      const normalizedName = item.name
        .replace(/\s*[\(\-]?\s*(Nóng|Đá|Hot|Ice)\s*[\)]?$/i, "")
        .trim();
      
      if (!uniqueItemsMap.has(normalizedName)) {
        uniqueItemsMap.set(normalizedName, {
          ...item,
          name: normalizedName,
          variants: {
            [variantType]: { id: item.id, price: item.price, isOutOfStock: item.isOutOfStock }
          }
        });
      } else {
        const existingItem = uniqueItemsMap.get(normalizedName)!;
        if (!existingItem.variants) existingItem.variants = {};
        existingItem.variants[variantType] = { id: item.id, price: item.price, isOutOfStock: item.isOutOfStock };
        
        // If default/Ice variant, update the main item display
        if (variantType === 'Đá' || variantType === 'default') {
           existingItem.id = item.id;
           existingItem.price = item.price;
        }
      }
    });
    
    return Array.from(uniqueItemsMap.values());
  }, [JSON.stringify(rawMenuItems)]); // Use JSON.stringify to only re-run if content actually changes

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem('favorites', JSON.stringify(next));
      return next;
    });
  };

  const CATEGORIES = useMemo(() => {
    return Array.from(new Set(menuItems.map((item) => item.category)))
      .filter((cat): cat is string => typeof cat === 'string' && cat.trim().toLowerCase() !== 'tất cả' && cat.trim().toLowerCase() !== 'yêu thích');
  }, [menuItems]);

  const displayCategories = useMemo(() => {
    const cats = ['Tất cả', ...CATEGORIES];
    if (favorites.length > 0) {
      cats.splice(1, 0, 'Yêu thích');
    }
    return cats;
  }, [CATEGORIES, favorites.length]);

  const filteredItems = useMemo(() => {
    let items = menuItems;

    if (searchQuery) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else if (activeCategory === 'Yêu thích') {
      items = items.filter((item) => favorites.includes(item.id));
    } else if (activeCategory !== 'Tất cả') {
      items = items.filter((item) => item.category === activeCategory);
    }
    
    if (sortBy === 'price_asc') {
      items = [...items].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      items = [...items].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name_asc') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    return items;
  }, [menuItems, searchQuery, activeCategory, favorites, sortBy]);

  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' = 'success') => {
    setToast(prev => {
      // If already visible and same type, update message without re-triggering entry animation
      if (prev.visible && prev.type === type) {
        return { ...prev, message };
      }
      return { message, visible: true, type };
    });
    
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const getCartQuantity = (itemId: string) => {
    return cart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.quantity, 0);
  };

  // Virtualization components
  const GridList = useMemo(() => React.forwardRef(({ style, children, ...props }: any, ref: any) => (
    <div
      ref={ref}
      {...props}
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '1rem',
        paddingTop: style?.paddingTop || '1rem',
        paddingRight: style?.paddingRight || '1rem',
        paddingBottom: style?.paddingBottom || '1rem',
        paddingLeft: style?.paddingLeft || '1rem',
      }}
      className="sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {children}
    </div>
  )), []);

  const GridItem = useMemo(() => ({ children, ...props }: any) => (
    <div {...props} className="h-full">
      {children}
    </div>
  ), []);

  const handleAddToCart = (cartItem: CartItem, e?: React.MouseEvent) => {
    if (cartItem.isOutOfStock) {
      showToast(`Sản phẩm "${cartItem.name}" hiện đã hết hàng!`, 'warning');
      return;
    }

    const currentQty = getCartQuantity(cartItem.id);
    if (cartItem.inventoryQty !== undefined && currentQty + cartItem.quantity > cartItem.inventoryQty) {
      showToast(`Rất tiếc, chỉ còn ${cartItem.inventoryQty} sản phẩm trong kho!`, 'warning');
      return;
    }

    addToCart(cartItem);
    setSelectedItem(null);
    
    showToast(`Đã thêm ${cartItem.name} vào giỏ hàng`);
  };

  const performAddDirectly = useCallback((item: MenuItem, type: 'Mang về' | 'Tại chỗ', x?: number, y?: number) => {
    if (item.isOutOfStock) {
      showToast(`Sản phẩm "${item.name}" hiện đã hết hàng!`, 'warning');
      return;
    }

    const currentQty = getCartQuantity(item.id);
    if (item.inventoryQty !== undefined && currentQty + 1 > item.inventoryQty) {
      showToast(`Rất tiếc, chỉ còn ${item.inventoryQty} sản phẩm trong kho!`, 'warning');
      return;
    }

    addToCart({
      ...item,
      cartItemId: Math.random().toString(36).substr(2, 9),
      quantity: 1,
      size: "Tiêu chuẩn",
      toppings: [],
      unitPrice: item.price,
      note: type,
    });

    showToast(`Đã thêm ${item.name} (${type}) vào giỏ hàng`);
  }, [addToCart, getCartQuantity]);

  // ... (rest of the component)

  const handleOpenModal = useCallback((item: MenuItem) => {
    if (item.hasCustomizations === false) {
      // Default to "Tại chỗ" if clicked on the card body
      performAddDirectly(item, 'Tại chỗ');
    } else {
      setSelectedItem(item);
    }
  }, [performAddDirectly]);

  const handleAddQuick = useCallback((e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation();
    if (item.hasCustomizations === false) {
      performAddDirectly(item, 'Tại chỗ', e.clientX, e.clientY);
    } else {
      setSelectedItem(item);
    }
  }, [performAddDirectly]);

  if (!appsScriptUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-extrabold text-stone-800 dark:text-white mb-2">Chưa cấu hình dữ liệu</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-8 max-w-xs">
          Bạn cần thiết lập đường dẫn Google Apps Script để tải danh sách thực đơn.
        </p>
        <button
          onClick={onNavigateSettings}
          className="w-full py-4 bg-[#C9252C] text-white font-bold rounded-2xl tap-active shadow-lg shadow-red-100 dark:shadow-none"
        >
          Đi tới Cài đặt
        </button>
      </div>
    );
  }

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="flex flex-col min-h-full pb-20">
        <div className="px-4 pt-4 pb-2">
          <div className="h-8 bg-stone-100 dark:bg-stone-800 rounded-lg w-2/3 mb-2" />
          <div className="h-8 bg-stone-100 dark:bg-stone-800 rounded-lg w-1/2" />
        </div>
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-black/95 px-4 pt-3 pb-3 space-y-3 border-b border-stone-100/50 dark:border-stone-800/50 shadow-sm">
           {/* Skeleton Header */}
           <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded-xl" />
           <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 w-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex-shrink-0" />
              ))}
           </div>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-2xl p-3 border border-stone-100 dark:border-stone-800 shadow-sm flex flex-col">
              <div className="w-full aspect-square bg-stone-100 dark:bg-stone-800 rounded-xl mb-3" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded w-3/4" />
                <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded w-1/2" />
              </div>
              <div className="flex justify-between items-end mt-4">
                <div className="h-5 bg-stone-100 dark:bg-stone-800 rounded w-1/3" />
                <div className="h-9 w-9 bg-stone-100 dark:bg-stone-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-[40px] flex items-center justify-center mb-8 shadow-xl shadow-red-500/10"
        >
          <AlertCircle className="w-12 h-12" />
        </motion.div>
        <h2 className="text-2xl font-black text-stone-800 dark:text-white mb-3 tracking-tight">Không thể tải thực đơn</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-10 max-w-xs text-sm leading-relaxed font-medium">
          {error.includes('Rate Limit') 
            ? 'Hệ thống đang bận do có quá nhiều người truy cập cùng lúc. Vui lòng đợi 1-2 phút rồi nhấn nút Thử lại.'
            : 'Có lỗi xảy ra khi kết nối với hệ thống. Vui lòng kiểm tra lại đường dẫn Apps Script trong phần Cài đặt.'}
        </p>
        <div className="w-full max-w-xs space-y-4">
          <button
            onClick={() => fetchAllData(true)}
            className="w-full py-4.5 bg-[#C9252C] text-white font-black text-xs uppercase tracking-widest rounded-2xl tap-active shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Thử lại ngay
          </button>
          <button
            onClick={onNavigateSettings}
            className="w-full py-4.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-black text-xs uppercase tracking-widest rounded-2xl tap-active hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            Cấu hình lại Apps Script
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Static Header Container */}
      <div 
        className={`fixed left-0 right-0 z-30 bg-white dark:bg-stone-900 px-4 pt-3 pb-2 space-y-3 border-b border-stone-100 dark:border-stone-800 transition-all duration-300 ease-in-out ${
          isHeaderHidden ? '-translate-y-full top-0 opacity-0 pointer-events-none' : 'translate-y-0 top-[56px] opacity-100'
        }`}
      >
        {/* Loading Indicator - Static */}
        {(isLoading || isRefreshing) && menuItems.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#C9252C] z-50" />
        )}

        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2 items-center relative z-50">
            {/* Search Bar */}
            <div className="relative flex-grow group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#C9252C] z-10">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="Tìm món ngon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => setTimeout(() => setIsSearchExpanded(false), 200)}
                className="w-full h-11 bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-[#C9252C] focus:bg-white dark:focus:bg-stone-950 pl-10 pr-10 rounded-2xl font-bold text-[14px] text-stone-800 dark:text-white placeholder:text-stone-400 outline-none relative z-0"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 z-10 tap-active"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-stone-200 dark:bg-stone-700 rounded-full">
                    <X className="h-4 w-4" />
                  </div>
                </button>
              )}
              
              {/* Autocomplete Suggestions */}
              {isSearchExpanded && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-3xl overflow-hidden z-50 shadow-2xl ring-1 ring-black/5">
                  <div className="max-h-[400px] overflow-y-auto py-3 no-scrollbar">
                    <div className="px-4 pb-2">
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Gợi ý kết quả</p>
                    </div>
                    {menuItems
                      .filter(item => 
                        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.category.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((suggestion) => {
                        const parts = suggestion.name.split(new RegExp(`(${searchQuery})`, 'gi'));
                        return (
                          <div
                            key={suggestion.id}
                            className="w-full px-2"
                          >
                            <div className="flex items-center gap-3 p-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-2xl transition-all group/item">
                              <button
                                onClick={() => {
                                  setSearchQuery(suggestion.name);
                                  setIsSearchExpanded(false);
                                }}
                                className="flex-1 flex items-center gap-3 text-left min-w-0"
                              >
                                <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 flex-shrink-0 overflow-hidden border border-stone-100 dark:border-stone-700">
                                  {suggestion.image ? (
                                    <img 
                                      src={suggestion.image} 
                                      alt={suggestion.name} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                                      <Coffee className="w-5 h-5" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-[13px] text-stone-800 dark:text-white truncate">
                                    {parts.map((part, i) => (
                                      <span key={i} className={part.toLowerCase() === searchQuery.toLowerCase() ? 'text-[#C9252C] bg-red-50 dark:bg-red-900/20 px-0.5 rounded' : ''}>
                                        {part}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">{suggestion.category}</span>
                                    <span className="w-1 h-1 rounded-full bg-stone-200 dark:bg-stone-700" />
                                    <span className="text-[11px] font-black text-[#C9252C]">{suggestion.price.toLocaleString()}đ</span>
                                  </div>
                                </div>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(suggestion);
                                }}
                                className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 flex items-center justify-center tap-active hover:bg-[#C9252C] hover:text-white transition-all"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {menuItems.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                      <div className="px-4 py-12 text-center">
                        <div className="w-16 h-16 bg-stone-50 dark:bg-stone-800/50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-200 dark:text-stone-700">
                          <Search className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Không tìm thấy món nào khớp</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-1.5">
              {/* View Mode Toggle */}
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800 rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                title={viewMode === 'grid' ? 'Chuyển sang dạng danh sách' : 'Chuyển sang dạng lưới'}
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
              </button>

              {/* Sort Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={`w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-2xl ${
                    sortBy !== 'default' 
                      ? 'bg-[#C9252C] text-white' 
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                  }`}
                >
                  <ArrowUp className={`w-5 h-5 ${sortBy === 'price_desc' ? 'rotate-180' : ''}`} />
                </button>
                
                {showSortMenu && (
                  <>
                    <div 
                      onClick={() => setShowSortMenu(false)}
                      className="fixed inset-0 z-40"
                    />
                    <div className="absolute right-0 top-14 w-52 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 z-50 overflow-hidden">
                      <div className="p-2 space-y-1">
                        {[
                          { id: 'default', label: 'Mặc định', icon: LayoutGrid, iconClass: '' },
                          { id: 'price_asc', label: 'Giá: Thấp đến Cao', icon: ArrowUp, iconClass: '' },
                          { id: 'price_desc', label: 'Giá: Cao đến Thấp', icon: ArrowUp, iconClass: 'rotate-180' },
                          { id: 'name_asc', label: 'Tên: A-Z', icon: List, iconClass: '' },
                        ].map((option) => (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id as any);
                              setShowSortMenu(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-black ${
                              sortBy === option.id 
                                ? 'bg-red-50 dark:bg-red-900 text-[#C9252C] dark:text-red-400' 
                                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                            }`}
                          >
                            <option.icon className={`w-4 h-4 ${option.iconClass}`} />
                            {option.label}
                            {sortBy === option.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Reload Button */}
              <button
                onClick={() => fetchAllData(false)}
                disabled={isRefreshing || isLoading}
                title="Làm mới dữ liệu thực đơn"
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800 rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 disabled:opacity-50 relative"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'text-[#C9252C]' : ''}`} />
                {timeAgo && (
                  <div className="absolute -bottom-1.5 bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap scale-75 origin-bottom">
                    {timeAgo.replace(' trước', '')}
                  </div>
                )}
              </button>
            </div>
          </div>

          <div 
            ref={categoryScrollRef}
            className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar relative"
          >
            {displayCategories.map((category, index) => {
              const isActive = activeCategory === category && !searchQuery;
              return (
                <button
                  key={`category-${category}-${index}`}
                  data-active={isActive}
                  onClick={() => {
                    setActiveCategory(category);
                    setSearchQuery('');
                    setIsSearchExpanded(false);
                  }}
                  className={`relative flex-shrink-0 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-[#C9252C] shadow-lg shadow-red-900/20 scale-105'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 active:scale-95'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {category === 'Yêu thích' && (
                      <Heart className={`w-3 h-3 ${isActive ? 'fill-current' : ''}`} />
                    )}
                    {category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`flex-grow relative pb-32 min-h-[600px] transition-all duration-300 ease-in-out ${isHeaderHidden ? 'pt-[70px]' : 'pt-[180px]'}`}>
        {filteredItems.length > 0 ? (
          <VirtuosoGrid
            ref={virtuosoRef}
            customScrollParent={scrollParent || undefined}
            data={filteredItems}
            style={{ height: '100%' }}
            computeItemKey={(index, item) => item.name}
            components={{
              List: React.forwardRef((props, ref) => (
                <div 
                  {...props} 
                  ref={ref as any} 
                  className={viewMode === 'grid' 
                    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 pb-8" 
                    : "flex flex-col gap-2.5 px-4 pb-8"} 
                />
              )),
              Item: React.forwardRef((props, ref) => (
                <div {...props} ref={ref as any} className="h-full" />
              )),
            }}
            itemContent={(index, item) => (
              <MenuItemCard 
                item={item} 
                onOpenModal={() => handleOpenModal(item)}
                onAddQuick={(e) => handleAddQuick(e, item)}
                onOutOfStockClick={() => {
                  setOutOfStockItem(item);
                }}
                isFavorite={favorites.includes(item.id)}
                onToggleFavorite={() => toggleFavorite(item.id)}
                viewMode={viewMode}
              />
            )}
          />
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center h-[50vh]">
            <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 rounded-[24px] flex items-center justify-center mb-6">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-stone-800 dark:text-white font-black text-lg mb-2">Không tìm thấy món nào</h3>
            <p className="text-stone-400 dark:text-stone-500 font-medium text-sm max-w-[200px]">Thử tìm từ khóa khác hoặc chọn danh mục khác xem sao</p>
          </div>
        )}

        <BackToTopFab />
      </div>

      <AnimatePresence>
        {selectedItem && (
          <CustomizationModal 
            key="customization-modal"
            item={selectedItem} 
            currentQty={getCartQuantity(selectedItem.id)}
            onClose={() => setSelectedItem(null)} 
            onAdd={handleAddToCart} 
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      {toast.visible && (
        <div 
          key="toast"
          className="fixed top-4 left-4 right-4 z-[100] flex justify-center pointer-events-none"
        >
          <div className={`${toast.type === 'warning' ? 'bg-orange-500 text-white' : 'bg-white/95 dark:bg-stone-900/95 backdrop-blur-md text-stone-800 dark:text-white'} px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-stone-100/50 dark:border-stone-800/50 max-w-sm w-full pointer-events-auto ring-1 ring-black/5 dark:ring-white/5`}>
            <div className={`w-8 h-8 shrink-0 ${toast.type === 'warning' ? 'bg-white/20' : 'bg-[#C9252C]'} rounded-full flex items-center justify-center shadow-inner`}>
              {toast.type === 'warning' ? <AlertCircle className="w-5 h-5 text-white" /> : <Check className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate leading-tight">
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && menuItems.length > 0 && (
        <div 
          key="error-toast"
          className="fixed top-4 left-4 right-4 z-[60]"
        >
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-bold">Lỗi cập nhật thực đơn</span>
            </div>
            <button 
              onClick={() => fetchAllData(false)} 
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {outOfStockItem && (
        <div key="out-of-stock-modal" className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={() => setOutOfStockItem(null)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-stone-900 rounded-[32px] p-6 max-w-sm w-full mx-4 shadow-2xl border border-stone-100 dark:border-stone-800 text-center"
          >
            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400 dark:text-stone-500">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-stone-800 dark:text-white mb-2">Món này đã hết hàng</h3>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
              Rất tiếc, <strong>{outOfStockItem.name}</strong> hiện tại đã hết. Vui lòng chọn món khác nhé!
            </p>
            <button 
              onClick={() => setOutOfStockItem(null)}
              className="w-full py-4 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white font-bold rounded-2xl tap-active"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const MenuItemCard = memo(({ 
  item, 
  onOpenModal, 
  onAddQuick, 
  onOutOfStockClick, 
  isFavorite, 
  onToggleFavorite,
  viewMode = 'grid'
}: { 
  item: GroupedMenuItem; 
  onOpenModal: () => void; 
  onAddQuick: (e: React.MouseEvent) => void;
  onOutOfStockClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  viewMode?: 'grid' | 'list';
}) => {
  const colors = [
    'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30', 
    'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30', 
    'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30', 
    'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30', 
    'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30'
  ];
  const colorIndex = item.name.length % colors.length;
  const colorClass = colors[colorIndex];

  const handleItemClick = (e: React.MouseEvent) => {
    if (item.isOutOfStock) {
      onOutOfStockClick();
      return;
    }
    
    // Check if item has customizations (variants or hasCustomizations flag)
    const hasVariants = item.variants && Object.keys(item.variants).length > 0;
    const needsCustomization = item.hasCustomizations || hasVariants;

    if (needsCustomization) {
      onOpenModal();
    } else {
      // Direct add to cart
      onAddQuick(e);
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        onClick={handleItemClick}
        className={`group relative bg-white dark:bg-stone-900 rounded-2xl p-4 flex items-center justify-between gap-4 border border-stone-100 dark:border-stone-800 shadow-sm cursor-pointer ${item.isOutOfStock ? 'opacity-60 grayscale bg-stone-50/50 dark:bg-stone-900/50' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h3 className={`font-bold text-[15px] leading-tight truncate ${item.isOutOfStock ? 'text-stone-400 line-through decoration-stone-400 decoration-1' : 'text-stone-800 dark:text-white'}`}>
              {item.name}
            </h3>
            {item.inventoryQty !== undefined && item.inventoryQty > 0 && item.inventoryQty < 5 && !item.isOutOfStock && (
              <motion.span 
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border ${
                  item.inventoryQty <= 2 
                    ? 'text-red-500 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' 
                    : 'text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30'
                }`}
              >
                Sắp hết ({item.inventoryQty})
              </motion.span>
            )}
          </div>
          <p className="text-[#C9252C] font-black text-[15px]">
            {item.price.toLocaleString('vi-VN')}đ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-2 rounded-full flex-shrink-0 ${
              isFavorite 
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
                : 'text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item.isOutOfStock) onOutOfStockClick();
              else onAddQuick(e);
            }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm tap-active flex-shrink-0 ${
              item.isOutOfStock 
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500' 
                : 'bg-[#C9252C] text-white shadow-red-200 dark:shadow-none'
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={handleItemClick}
      className={`group relative bg-white dark:bg-stone-900 rounded-[32px] p-4 flex flex-col justify-between h-full border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer ${item.isOutOfStock ? 'opacity-60 grayscale bg-stone-50/50 dark:bg-stone-900/50' : ''} ${colorClass}`}
    >
      {item.isOutOfStock && (
        <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-[32px]">
          <div className="bg-stone-800/90 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full transform -rotate-6 shadow-xl border border-white/10 tracking-widest">Hết hàng</div>
        </div>
      )}

      <div className="mb-2">
        <div className="flex justify-between items-start gap-2 mb-1">
           <div className="flex-1 min-w-0">
             <h3 className={`font-black text-[14px] leading-tight line-clamp-2 uppercase tracking-tight ${item.isOutOfStock ? 'text-stone-400 line-through decoration-stone-400 decoration-1' : 'text-stone-800 dark:text-white'}`}>
              {item.name}
            </h3>
            {item.inventoryQty !== undefined && item.inventoryQty > 0 && item.inventoryQty < 5 && !item.isOutOfStock && (
              <motion.span 
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-2 border shadow-sm ${
                  item.inventoryQty <= 2 
                    ? 'text-red-500 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30' 
                    : 'text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30'
                }`}
              >
                Sắp hết ({item.inventoryQty})
              </motion.span>
            )}
           </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-2 rounded-full flex-shrink-0 transition-all active:scale-90 ${
              isFavorite 
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20 shadow-sm' 
                : 'text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`}
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <p className="text-[#C9252C] font-black text-xl tracking-tighter">
            {item.price.toLocaleString('vi-VN')}
            <span className="text-[10px] align-top ml-0.5 uppercase">đ</span>
          </p>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (item.isOutOfStock) onOutOfStockClick();
              else onAddQuick(e);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md tap-active transition-all active:scale-90 ${
              item.isOutOfStock 
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500' 
                : 'bg-[#C9252C] text-white shadow-red-200 dark:shadow-none hover:bg-red-700'
            }`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
});

const EditMenuModal: React.FC<{ 
  item: GroupedMenuItem; 
  onClose: () => void; 
  onSave: (id: string, updates: Partial<MenuItem>) => void;
}> = ({ item, onClose, onSave }) => {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price.toString());
  const [category, setCategory] = useState(item.category);
  const [image, setImage] = useState(item.image || '');

  const handleSave = () => {
    onSave(item.id, {
      name,
      price: Number(price),
      category,
      image
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-[32px] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 flex-grow overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-stone-800 dark:text-white">Chỉnh sửa món</h2>
            <button onClick={onClose} className="w-11 h-11 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 hover:text-stone-800 dark:hover:text-white tap-active">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Hình ảnh</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-xl overflow-hidden flex items-center justify-center relative">
                  {image ? (
                    <img src={image} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black opacity-40">{name.charAt(0).toUpperCase()}</span>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1 text-xs text-stone-500 dark:text-stone-400">
                  Nhấn vào ô bên trái để tải ảnh lên (tối đa 2MB). Ảnh sẽ được lưu cục bộ trên thiết bị này.
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Tên món</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none px-4 py-3 rounded-xl font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Giá bán (đ)</label>
              <input 
                type="number" 
                value={price} 
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none px-4 py-3 rounded-xl font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-1">Danh mục</label>
              <input 
                type="text" 
                value={category} 
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-stone-100 dark:bg-stone-800 border-none px-4 py-3 rounded-xl font-bold text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-[#C9252C] text-white font-black rounded-2xl tap-active shadow-lg shadow-red-200 dark:shadow-none"
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
};

const CustomizationModal: React.FC<{ item: GroupedMenuItem; currentQty: number; onClose: () => void; onAdd: (item: CartItem, e: React.MouseEvent) => void; showToast: (msg: string, type?: 'success' | 'warning') => void }> = ({ item, currentQty, onClose, onAdd, showToast }) => {
  const [quantity, setQuantity] = useState(1);
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

  const finalUnitPrice = basePrice;
  const finalTotalPrice = finalUnitPrice * quantity;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 rounded-t-[40px] w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-t border-stone-100 dark:border-stone-800"
      >
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full" />
        </div>
        <div className="px-6 py-2 flex justify-between items-center border-b border-stone-50 dark:border-stone-800/50">
          <div>
            <h2 className="text-xl font-black text-[#C9252C] tracking-tighter uppercase">
              {item.name}
            </h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 tap-active hover:bg-stone-200 dark:hover:bg-stone-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">
          <div className="space-y-6">
            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full"></span>
                Nhiệt độ
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {['Nóng', 'Đá', 'Đá riêng'].map(temp => (
                  <button
                    key={temp}
                    onClick={() => setTemperature(temp)}
                    className={`py-3 rounded-2xl font-bold text-[13px] border tap-active ${
                      temperature === temp 
                        ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]' 
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/30'
                    }`}
                  >
                    {temp}
                  </button>
                ))}
              </div>
            </section>

            {(temperature === 'Đá') && (
              <section>
                <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <span className="w-1 h-3 bg-[#C9252C] rounded-full"></span>
                  Lượng đá
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {['Ít', 'Vừa', 'Bình thường'].map(level => (
                    <button
                      key={level}
                      onClick={() => setIceLevel(level)}
                      className={`py-3 rounded-2xl font-bold text-[13px] border tap-active ${
                        iceLevel === level 
                          ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]' 
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/30'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                <span className="w-1 h-3 bg-[#C9252C] rounded-full"></span>
                Lượng đường
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {['Ít ngọt', 'Vừa', 'Bình thường', 'Ngọt', 'Đường kiêng'].map(level => (
                  <button
                    key={level}
                    onClick={() => setSugarLevel(level === 'Đường kiêng' ? '1 gói đường kiêng' : level)}
                    className={`py-3 rounded-2xl font-bold text-[13px] border tap-active ${
                      (level === 'Đường kiêng' ? sugarLevel === '1 gói đường kiêng' : sugarLevel === level)
                        ? 'border-[#C9252C] bg-[#C9252C]/5 dark:bg-[#C9252C]/10 text-[#C9252C]' 
                        : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/30'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section>
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[11px] uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 bg-stone-200 dark:bg-stone-700 rounded-full"></span>
              Ghi chú thêm
            </h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Không lấy ống hút, thêm nhiều đá..."
              className="w-full bg-stone-50 dark:bg-stone-900/30 border border-stone-100 dark:border-stone-800 p-4 rounded-2xl resize-none text-[13px] font-medium focus:ring-2 focus:ring-[#C9252C]/10 focus:border-[#C9252C]/30 outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
              rows={2}
            />
          </section>
        </div>

        <div className="p-6 bg-white dark:bg-stone-900 border-t border-stone-50 dark:border-stone-800/50 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-2xl p-1 border border-stone-100 dark:border-stone-800">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 tap-active shadow-sm border border-stone-100 dark:border-stone-700"><Minus className="w-5 h-5" /></button>
              <span className="w-12 text-center font-black text-xl text-stone-800 dark:text-white">{quantity}</span>
              <button 
                onClick={() => {
                  if (item.inventoryQty !== undefined && currentQty + quantity + 1 > item.inventoryQty) {
                    showToast(`Chỉ còn ${item.inventoryQty} sản phẩm trong kho!`, 'warning');
                    return;
                  }
                  setQuantity(quantity + 1);
                }} 
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 tap-active shadow-sm border border-stone-100 dark:border-stone-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Tổng cộng</p>
              <p className="text-2xl font-black text-[#C9252C] tracking-tighter">{finalTotalPrice.toLocaleString()}đ</p>
            </div>
          </div>
          <button
            onClick={(e) => onAdd({
              ...item,
              id: baseId,
              price: basePrice,
              cartItemId: Math.random().toString(36).substr(2, 9),
              quantity,
              size: "Tiêu chuẩn",
              toppings: [],
              unitPrice: finalUnitPrice,
              temperature: temperature,
              sugarLevel: sugarLevel,
              iceLevel: temperature === 'Đá' ? iceLevel : (temperature === 'Đá riêng' ? 'Bình thường' : undefined),
              note: note,
            }, e)}
            className="w-full py-4.5 bg-[#C9252C] text-white font-black text-[15px] uppercase tracking-wider rounded-2xl tap-active flex items-center justify-center gap-3 hover:bg-red-700"
          >
            <ShoppingBag className="w-5 h-5" />
            Thêm vào giỏ hàng
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

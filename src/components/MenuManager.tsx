import React, { useState, useEffect, useMemo } from 'react';
import { currencyInputProps, quantityInputProps } from '../utils/inputUtils';

import { 
  Plus, Edit2, Trash2, Save, X, Search, RefreshCw, AlertCircle, 
  Check, ChevronRight, Package, Settings as SettingsIcon, Filter, 
  MoreVertical, Power, TrendingUp, Calendar as CalendarIcon, Hash, 
  Coffee, DollarSign, Tag, Sparkles, Zap, BarChart3, ArrowRight,
  Info, LayoutGrid, List, SlidersHorizontal, Wand2
} from 'lucide-react';
import { Solar, Lunar } from 'lunar-javascript';
import { generateContent } from "../lib/aiClient";
import { useData } from '../context/DataContext';

interface MenuManagerProps {
  appsScriptUrl: string;
}

interface MenuItem {
  ma_mon: string;
  ten_mon: string;
  gia_ban: number;
  danh_muc: string;
  co_san: boolean;
  has_customizations: boolean;
  inventoryQty?: number;
}

export function MenuManager({ appsScriptUrl }: MenuManagerProps) {
  const { 
    menuItems: rawMenuItems, 
    orders, 
    isLoading: isDataLoading, 
    isRefreshing, 
    error: dataError, 
    fetchAllData, 
    lastUpdated 
  } = useData();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [forecastDays, setForecastDays] = useState<7 | 14 | 30>(7);
  const [showForecast, setShowForecast] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingSeasonal, setIsGeneratingSeasonal] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState<any[] | null>(null);
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [inventoryValue, setInventoryValue] = useState<number>(0);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [viewLayout, setViewLayout] = useState<'grid' | 'list'>('grid');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [timeAgo, setTimeAgo] = useState<string>('');

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

    const handleOpenAddModal = () => {
      setEditingItem(null);
      setFormData({
        ten_mon: '',
        gia_ban: 0,
        danh_muc: '',
        co_san: true,
        has_customizations: false,
        inventoryQty: 0,
        ma_mon: ''
      });
      setIsModalOpen(true);
    };

    window.addEventListener('open-add-menu-modal', handleOpenAddModal);


    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('open-add-menu-modal', handleOpenAddModal);
    };
  }, [lastUpdated]);

  // Map rawMenuItems to local MenuItem format
  const menuItems = useMemo(() => {
    if (!rawMenuItems) return [];
    return rawMenuItems.map(item => ({
      ma_mon: item.id,
      ten_mon: item.name,
      gia_ban: item.price,
      danh_muc: item.category,
      co_san: !item.isOutOfStock,
      has_customizations: item.hasCustomizations,
      inventoryQty: item.inventoryQty
    }));
  }, [rawMenuItems]);
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    ten_mon: '',
    gia_ban: 0,
    danh_muc: '',
    co_san: true,
    has_customizations: false,
    inventoryQty: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (dataError) setError(dataError);
  }, [dataError]);

  const existingCategories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map(i => i.danh_muc)))
      .filter(Boolean)
      .filter(cat => cat.trim().toLowerCase() !== 'tất cả');
    return cats.sort();
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.ten_mon.toLowerCase().includes(query) ||
        item.ma_mon.toLowerCase().includes(query) ||
        item.danh_muc.toLowerCase().includes(query)
      );
    }

    if (activeCategory !== 'Tất cả') {
      items = items.filter(item => item.danh_muc === activeCategory);
    }
    
    return items;
  }, [menuItems, searchQuery, activeCategory]);

  const stats = useMemo(() => {
    return {
      total: menuItems.length,
      outOfStock: menuItems.filter(i => !i.co_san).length,
      lowStock: menuItems.filter(i => i.inventoryQty !== undefined && i.inventoryQty <= 5).length,
      categories: existingCategories.length
    };
  }, [menuItems, existingCategories]);

  const inventoryForecast = useMemo(() => {
    const now = new Date();
    const startTime = new Date(now.getTime() - forecastDays * 24 * 60 * 60 * 1000);
    const periodOrders = orders.filter(o => new Date(o.timestamp) >= startTime && o.orderStatus === 'Hoàn thành');
    
    const consumptionMap: Record<string, number> = {};
    periodOrders.forEach(order => {
      order.items.forEach(item => {
        consumptionMap[item.name] = (consumptionMap[item.name] || 0) + item.quantity;
      });
    });

    return menuItems
      .filter(item => item.inventoryQty !== undefined)
      .map(item => {
        const consumptionInPeriod = consumptionMap[item.ten_mon] || 0;
        const dailyConsumption = consumptionInPeriod / forecastDays;
        const daysLeft = dailyConsumption > 0 ? (item.inventoryQty || 0) / dailyConsumption : Infinity;
        const suggestedRestock = Math.max(0, Math.ceil(dailyConsumption * forecastDays) - (item.inventoryQty || 0));

        return {
          ...item,
          dailyConsumption,
          daysLeft,
          suggestedRestock,
          predictedOutOfStockDate: daysLeft === Infinity ? null : new Date(now.getTime() + daysLeft * 24 * 60 * 60 * 1000)
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [menuItems, orders, forecastDays]);

  const [forecastSearchQuery, setForecastSearchQuery] = useState('');

  const filteredForecast = useMemo(() => {
    if (!forecastSearchQuery.trim()) return inventoryForecast;
    const query = forecastSearchQuery.toLowerCase();
    return inventoryForecast.filter(item => 
      item.ten_mon.toLowerCase().includes(query) || 
      item.ma_mon.toLowerCase().includes(query) ||
      item.danh_muc.toLowerCase().includes(query)
    );
  }, [inventoryForecast, forecastSearchQuery]);

  const generateAIInsights = async () => {
    if (isGeneratingInsights) return;
    setIsGeneratingInsights(true);
    try {
      const salesData = inventoryForecast.map(item => ({
        name: item.ten_mon,
        dailySales: item.dailyConsumption.toFixed(2),
        stock: item.inventoryQty,
        daysLeft: item.daysLeft === Infinity ? 'N/A' : Math.ceil(item.daysLeft)
      }));

      const prompt = `Dựa trên dữ liệu bán hàng 7 ngày qua: ${JSON.stringify(salesData)}. 
      Hãy phân tích xu hướng:
      1. Món nào đang "hot" (tăng trưởng nhanh)?
      2. Món nào cần nhập hàng gấp hơn dự kiến?
      3. Gợi ý chiến lược tồn kho ngắn hạn.
      Trả về kết quả bằng tiếng Việt, ngắn gọn, súc tích, định dạng Markdown.`;

      const response = await generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiInsights(response.text || "Không thể tạo phân tích lúc này.");
    } catch (err) {
      setAiInsights("Lỗi khi kết nối với AI.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const generateSeasonalAnalysis = async () => {
    if (isGeneratingSeasonal) return;
    setIsGeneratingSeasonal(true);
    try {
      const now = new Date();
      const solar = Solar.fromDate(now);
      const lunar = solar.getLunar();
      const lunarDateStr = `Ngày ${lunar.getDay()} tháng ${lunar.getMonth()} năm ${lunar.getYear()} (Âm lịch)`;
      const lunarLeStr = lunar.getFestivals().join(', ') || 'Không có lễ hội âm lịch';

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const longTermOrders = orders.filter(o => new Date(o.timestamp) >= ninetyDaysAgo && o.orderStatus === 'Hoàn thành');
      
      const monthlySales: Record<string, Record<string, number>> = {};
      longTermOrders.forEach(order => {
        const month = new Date(order.timestamp).toLocaleString('vi-VN', { month: 'long' });
        if (!monthlySales[month]) monthlySales[month] = {};
        order.items.forEach(item => {
          monthlySales[month][item.name] = (monthlySales[month][item.name] || 0) + item.quantity;
        });
      });

      const prompt = `Dựa trên dữ liệu bán hàng 90 ngày qua: ${JSON.stringify(monthlySales)}. 
      Hôm nay là ngày ${now.toLocaleDateString('vi-VN')}.
      Thông tin lịch âm Việt Nam: ${lunarDateStr}. Các lễ hội âm lịch hôm nay: ${lunarLeStr}.
      Hãy phân tích mùa vụ và dự báo cho các dịp đặc biệt, ĐẶC BIỆT lưu ý các ngày lễ tết theo LỊCH ÂM của Việt Nam (như Tết Nguyên Đán, Rằm tháng Giêng, Giỗ tổ Hùng Vương, Giải phóng miền Nam 30/4, Quốc tế lao động 1/5, Rằm tháng Bảy, Trung Thu, v.v.) trong năm 2026:
      1. Xu hướng thay đổi theo tháng và theo các dịp lễ tết âm/dương lịch sắp tới?
      2. Dự báo nhu cầu cho các ngày lễ/sự kiện sắp tới dựa trên lịch sử và đặc thù văn hóa Việt Nam (sử dụng thông tin lịch âm đã cung cấp).
      3. Gợi ý các món nên đẩy mạnh hoặc chuẩn bị nguyên liệu sớm.
      Trả về kết quả bằng tiếng Việt, chuyên nghiệp, định dạng Markdown.`;

      const response = await generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiInsights(response.text || "Không thể tạo phân tích mùa vụ.");
    } catch (err) {
      setAiInsights("Lỗi khi kết nối với AI để phân tích mùa vụ.");
    } finally {
      setIsGeneratingSeasonal(false);
    }
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      ma_mon: `M${Date.now().toString().slice(-6)}`,
      ten_mon: '',
      gia_ban: 0,
      danh_muc: existingCategories[0] || 'Cà phê',
      co_san: true,
      has_customizations: false,
      inventoryQty: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (ma_mon: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa món này không?')) return;
    setIsLoading(true);
    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteMenuItem', ma_mon }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData();
      } else {
        throw new Error(result.message || 'Lỗi khi xóa món');
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const payload = {
        action: 'editMenuItem',
        ma_mon: item.ma_mon,
        ten_mon: item.ten_mon,
        gia_ban: item.gia_ban,
        danh_muc: item.danh_muc,
        co_san: !item.co_san,
        has_customizations: item.has_customizations,
        inventoryQty: item.inventoryQty
      };
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      const result = await response.json();
      if (result.status === 'success') {
        await fetchAllData();
      }
    } catch (err) {
      console.error("Failed to toggle availability", err);
    }
  };

  const handleInventorySave = async (ma_mon: string) => {
    setIsUpdatingInventory(true);
    try {
      const item = menuItems.find(i => i.ma_mon === ma_mon);
      if (!item) return;
      const payload = {
        action: 'editMenuItem',
        ma_mon: item.ma_mon,
        ten_mon: item.ten_mon,
        gia_ban: item.gia_ban,
        danh_muc: item.danh_muc,
        co_san: item.co_san,
        has_customizations: item.has_customizations,
        inventoryQty: inventoryValue
      };
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setEditingInventoryId(null);
        await fetchAllData();
      }
    } catch (err) {
      alert('Lỗi kết nối khi cập nhật tồn kho');
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const handlePriceBlur = () => {
    if (formData.gia_ban && formData.gia_ban > 0 && formData.gia_ban < 1000) {
      setFormData(prev => ({ ...prev, gia_ban: prev.gia_ban! * 1000 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        action: editingItem ? 'editMenuItem' : 'addMenuItem',
        ma_mon: formData.ma_mon,
        ten_mon: formData.ten_mon,
        gia_ban: Number(formData.gia_ban),
        danh_muc: formData.danh_muc,
        co_san: formData.co_san,
        has_customizations: formData.has_customizations,
        inventoryQty: Number(formData.inventoryQty || 0)
      };
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      const result = await response.json();
      if (result.status === 'success') {
        setIsModalOpen(false);
        await fetchAllData();
      } else {
        throw new Error(result.message || 'Lỗi từ máy chủ');
      }
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">


      {/* ── Unified Dynamic Island: Search, Controls & Categories ── */}
      <div className="sticky top-[44px] lg:top-[44px] z-[35] w-full flex-shrink-0 -mx-1 px-1 py-4 lg:py-6 bg-stone-50/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="glass-premium rounded-[32px] lg:rounded-[40px] pointer-events-auto border border-white/60 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.12)] flex flex-col p-2 lg:p-3 w-full gap-2">
          {/* Row 1: Search + Controls */}
          <div className="flex gap-2 items-center relative z-50">
            {/* Search Bar */}
            <div className="relative flex-grow group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#C9252C] z-10 transition-colors">
                <Search className="h-4 w-4 lg:h-5 lg:w-5" />
              </div>
              <input 
                type="text"
                placeholder="Tìm kiếm món, mã số..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchExpanded(true)}
                onBlur={() => setTimeout(() => setIsSearchExpanded(false), 200)}
                className="w-full h-12 lg:h-14 bg-white/50 dark:bg-stone-900/50 border border-transparent focus:border-[#C9252C]/30 focus:bg-white dark:focus:bg-stone-900 pl-10 lg:pl-12 pr-10 rounded-[24px] lg:rounded-[28px] font-bold text-[14px] lg:text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400 outline-none relative z-0 transition-all shadow-inner dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-[#C9252C] z-10 tap-active transition-colors"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-stone-200/50 dark:bg-stone-700/50 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
                    <X className="h-4 w-4" />
                  </div>
                </button>
              )}

              {/* Autocomplete Suggestions */}
              {isSearchExpanded && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-[24px] shadow-2xl overflow-hidden z-50 p-2">
                  {menuItems
                    .filter(item => 
                      item.ten_mon.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      item.danh_muc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      item.ma_mon.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map((suggestion) => (
                      <button
                        key={suggestion.ma_mon}
                        onClick={() => {
                          setSearchQuery(suggestion.ten_mon);
                          setIsSearchExpanded(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-[20px] flex items-center justify-between transition-colors mb-1 last:mb-0"
                      >
                        <div>
                          <div className="font-bold text-[14px] text-stone-800 dark:text-white">{suggestion.ten_mon}</div>
                          <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-0.5">{suggestion.danh_muc}</div>
                        </div>
                        <div className="text-[14px] font-black text-emerald-600 dark:text-emerald-400">{suggestion.gia_ban.toLocaleString()}đ</div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="flex gap-1.5 flex-shrink-0">
              {/* View Mode Toggle */}
              <button
                onClick={() => setViewLayout(viewLayout === 'grid' ? 'list' : 'grid')}
                className="w-12 h-12 lg:w-14 lg:h-14 flex-shrink-0 flex items-center justify-center bg-transparent lg:bg-white/40 dark:lg:bg-stone-900/40 rounded-[24px] lg:rounded-[28px] text-stone-600 dark:text-stone-400 hover:bg-white/50 dark:hover:bg-stone-800 transition-colors border border-transparent"
                title={viewLayout === 'grid' ? 'Chuyển sang dạng danh sách' : 'Chuyển sang dạng lưới'}
              >
                {viewLayout === 'grid' ? <List className="w-5 h-5 lg:w-6 lg:h-6" /> : <LayoutGrid className="w-5 h-5 lg:w-6 lg:h-6" />}
              </button>

              {/* AI Lab Toggle */}
              <button 
                onClick={() => setShowForecast(!showForecast)}
                className={`w-12 h-12 lg:w-14 lg:h-14 flex-shrink-0 flex items-center justify-center rounded-[24px] lg:rounded-[28px] transition-all border border-transparent tap-active ${
                  showForecast 
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                    : 'bg-transparent lg:bg-white/40 dark:lg:bg-stone-900/40 text-stone-600 dark:text-stone-400 hover:bg-white/50 dark:hover:bg-stone-800'
                }`}
                title="AI Insights Lab"
              >
                <Wand2 className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
            </div>
          </div>

          {/* Row 2: Category Tabs */}
          <div className="flex gap-1.5 lg:gap-2 overflow-x-auto pt-1 pb-2 lg:pb-3 -mb-2 px-1 no-scrollbar w-full custom-scrollbar hide-scrollbar">
            {['Tất cả', ...existingCategories].map((cat, index) => {
              const isActive = activeCategory === cat && !searchQuery;
              return (
                <button
                  key={`${cat}-${index}`}
                  data-active={isActive}
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearchQuery('');
                  }}
                  className={`relative flex-shrink-0 px-5 py-2.5 lg:py-3 rounded-[20px] lg:rounded-[24px] text-[11px] lg:text-[12px] font-black uppercase tracking-widest transition-all duration-300 border ${
                    isActive
                      ? 'text-white bg-gradient-to-r from-[#C9252C] to-[#E53935] border-transparent shadow-[0_4px_16px_rgba(201,37,44,0.3)] dark:shadow-[0_4px_16px_rgba(201,37,44,0.15)] lg:scale-[1.02]'
                      : 'bg-transparent text-stone-500 dark:text-stone-400 border-transparent hover:bg-white/50 dark:hover:bg-stone-800/50 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-1.5">
                    {cat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        {showForecast ? (
          <div
            key="ai-lab"
            className="space-y-8"
          >
            {/* AI Lab Header */}
            <div className="bg-stone-900 dark:bg-stone-800 rounded-[32px] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full -mr-48 -mt-48" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black uppercase tracking-tight">AI Insights Lab</h2>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Phân tích dữ liệu & Dự báo thông minh</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={generateAIInsights}
                      disabled={isGeneratingInsights}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-left group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <TrendingUp className="w-8 h-8 text-emerald-400" />
                        <ArrowRight className="w-5 h-5 text-stone-500 group-hover:translate-x-1" />
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-widest mb-1">Dự báo ngắn hạn</h3>
                      <p className="text-[10px] text-stone-400 font-medium">Phân tích 7 ngày qua để tối ưu tồn kho</p>
                    </button>
                    
                    <button 
                      onClick={generateSeasonalAnalysis}
                      disabled={isGeneratingSeasonal}
                      className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 p-6 rounded-3xl text-left group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <CalendarIcon className="w-8 h-8 text-blue-400" />
                        <ArrowRight className="w-5 h-5 text-stone-500 group-hover:translate-x-1" />
                      </div>
                      <h3 className="font-black text-sm uppercase tracking-widest mb-1">Phân tích mùa vụ</h3>
                      <p className="text-[10px] text-stone-400 font-medium">Dự báo dựa trên lịch âm & lễ hội Việt Nam</p>
                    </button>
                  </div>
                </div>
              </div>

              {/* Forecast Results */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                  <div className="relative flex-grow max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input 
                      type="text"
                      placeholder="Tìm kiếm nguyên liệu dự báo..."
                      value={forecastSearchQuery}
                      onChange={(e) => setForecastSearchQuery(e.target.value)}
                      className="w-full glass-premium border border-stone-200 dark:border-stone-800 pl-10 pr-10 py-3 rounded-2xl font-medium text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm"
                    />
                    {forecastSearchQuery && (
                      <button
                        onClick={() => setForecastSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 tap-active"
                      >
                        <X className="h-4 w-4 bg-stone-200 dark:bg-stone-800 rounded-full p-0.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Hiển thị: {filteredForecast.length} mặt hàng</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredForecast.map((item, idx) => (
                    <div
                      key={item.ma_mon}
                      className={`relative z-10 glass-premium p-6 rounded-[32px] border shadow-sm transition-all ${
                        item.inventoryQty === 0 
                          ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/5' 
                          : item.daysLeft <= 3 
                            ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/5' 
                            : 'border-white/50 dark:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-stone-800 dark:text-white text-base leading-tight">{item.ten_mon}</h4>
                            {item.inventoryQty === 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-red-500 text-white text-[8px] font-black uppercase tracking-widest animate-pulse">Hết hàng</span>
                            ) : item.daysLeft <= 3 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest">Sắp hết</span>
                            ) : null}
                          </div>
                          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mt-1">{item.danh_muc}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.daysLeft <= 3 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                          {item.daysLeft === Infinity ? 'Ổn định' : `${Math.ceil(item.daysLeft)} ngày`}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="h-2 bg-white/40 dark:bg-stone-800/40 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${Math.min(100, (item.inventoryQty || 0) / 0.5)}%` }}
                            className={`h-full ${item.daysLeft <= 3 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-stone-400">Tồn kho: {item.inventoryQty}</span>
                          <span className="text-stone-800 dark:text-white">Tiêu thụ: {item.dailyConsumption.toFixed(1)}/ngày</span>
                        </div>
                      </div>

                      {item.suggestedRestock > 0 && (
                        <div className="mt-6 pt-6 border-t border-stone-50 dark:border-stone-800 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Gợi ý nhập hàng</span>
                            <span className="text-lg font-black text-[#C9252C]">+{item.suggestedRestock}</span>
                          </div>
                          <button 
                            onClick={() => handleEdit(item)}
                            className="w-12 h-12 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-400 hover:text-stone-800"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {aiInsights && (
                <div 
                  className="glass-premium p-8 rounded-[32px]"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="w-6 h-6 text-emerald-500" />
                    <h3 className="text-lg font-black uppercase tracking-tight">Kết quả phân tích AI</h3>
                  </div>
                  <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-medium text-stone-600 dark:text-stone-400">
                    {aiInsights}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              key="menu-list"
            >
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-24 h-24 bg-stone-100 dark:bg-stone-900 rounded-[40px] flex items-center justify-center mb-6">
                    <Coffee className="w-10 h-10 text-stone-300" />
                  </div>
                  <h3 className="text-xl font-black text-stone-800 dark:text-white uppercase tracking-tight">Không tìm thấy món nào</h3>
                  <p className="text-sm text-stone-400 mt-2">Thử thay đổi từ khóa hoặc danh mục lọc</p>
                </div>
              ) : (
                <div className={viewLayout === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 xl:gap-5 px-1 pb-8" : "space-y-4"}>
                  {filteredItems.map((item, idx) => {
                    const colors = [
                      'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30', 
                      'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30', 
                      'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30', 
                      'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30', 
                      'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30'
                    ];
                    const colorIndex = item.ten_mon.length % colors.length;
                    const colorClass = colors[colorIndex];

                    if (viewLayout === 'list') {
                      return (
                        <div
                          key={item.ma_mon}
                          className={`group relative z-10 bg-white dark:bg-stone-900 rounded-2xl p-4 flex items-center justify-between gap-4 border border-stone-100 dark:border-stone-800 shadow-sm transition-all duration-300 ${!item.co_san ? 'opacity-50 grayscale bg-stone-50/50 dark:bg-stone-900/50' : ''}`}
                        >
                          {!item.co_san && (
                            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
                                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} 
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h3 className={`font-bold text-[15px] leading-tight truncate ${!item.co_san ? 'text-stone-400 line-through decoration-stone-400 decoration-1' : 'text-stone-800 dark:text-white'}`}>
                                {item.ten_mon}
                              </h3>
                              {item.inventoryQty !== undefined && item.co_san && (
                                <span className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border ${item.inventoryQty === 0 ? 'text-red-500 bg-red-50 border-red-100' : item.inventoryQty <= 5 ? 'text-orange-500 bg-orange-50 border-orange-100' : 'text-stone-400 bg-stone-50 border-stone-100'}`}>
                                  {item.inventoryQty === 0 ? 'Hết hàng' : item.inventoryQty <= 5 ? `Sắp hết · ${item.inventoryQty} còn` : `${item.inventoryQty} còn`}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[#C9252C] font-black text-[15px]">
                                {item.gia_ban.toLocaleString('vi-VN')}đ
                              </p>
                              <span className="text-[9px] font-mono font-bold text-stone-300 uppercase tracking-tighter">#{item.ma_mon}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                             <button onClick={(e) => handleToggleAvailability(item, e)} className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.co_san ? 'bg-stone-50 text-stone-400 hover:text-red-500' : 'bg-emerald-100 text-emerald-600'}`}>
                               <Power className="w-5 h-5" />
                             </button>
                            <button onClick={() => handleEdit(item)} className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center shrink-0 text-stone-400 hover:text-stone-800 shadow-sm">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(item.ma_mon)} className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center shrink-0 text-stone-300 hover:text-red-500 shadow-sm">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.ma_mon}
                        className={`group relative z-10 bg-white dark:bg-stone-900 rounded-[28px] lg:rounded-[32px] p-5 flex flex-col justify-between h-full border border-stone-100/80 dark:border-stone-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 ${!item.co_san ? 'opacity-60 grayscale bg-stone-50/50 dark:bg-stone-900/50' : ''} ${colorClass}`}
                      >
                        {!item.co_san && (
                          <div className="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-[28px] lg:rounded-3xl pointer-events-none">
                            <div className="bg-stone-800/90 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full transform -rotate-6 shadow-xl border border-white/10 tracking-widest">Tạm ngưng</div>
                          </div>
                        )}

                        <div className="mb-2 relative z-30">
                          <div className="flex justify-between items-start gap-2 mb-1">
                             <div className="flex-1 min-w-0">
                               <h3 className={`font-black text-[14px] leading-tight line-clamp-2 uppercase tracking-tight ${!item.co_san ? 'text-stone-400 line-through decoration-stone-400 decoration-1' : 'text-stone-800 dark:text-white'}`}>
                                {item.ten_mon}
                              </h3>
                              {item.inventoryQty !== undefined && item.co_san && (
                                <span
                                  className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full mt-1.5 border ${
                                    item.inventoryQty === 0
                                      ? 'text-red-500 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30'
                                      : item.inventoryQty <= 5
                                      ? 'text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30'
                                      : 'text-stone-400 bg-stone-50 border-stone-100 dark:bg-stone-800/50 dark:border-stone-700'
                                  }`}
                                >
                                  {item.inventoryQty === 0 ? 'Hết hàng' : item.inventoryQty <= 5 ? `Sắp hết · ${item.inventoryQty} còn` : `${item.inventoryQty} còn`}
                                </span>
                              )}
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest leading-none drop-shadow-sm">{item.danh_muc}</span>
                                <span className="text-[8px] font-mono font-bold text-stone-300 uppercase opacity-50 tracking-tighter self-end">{item.ma_mon}</span>
                              </div>
                             </div>
                            <button
                              onClick={(e) => handleToggleAvailability(item, e)}
                              className={`p-2 rounded-full flex-shrink-0 transition-all active:scale-90 ${
                                item.co_san 
                                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 hover:text-red-500 hover:bg-stone-50 shadow-sm' 
                                  : 'text-stone-400 bg-white shadow-sm'
                              }`}
                              title={item.co_san ? 'Đang bán (Bấm để tạm ngưng)' : 'Tạm ngưng (Bấm để mở lại)'}
                            >
                              <Power className={`w-4.5 h-4.5`} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-auto pt-5 border-t border-stone-100 dark:border-stone-800 relative z-30">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[#C9252C] font-black text-[18px] xl:text-[20px] tracking-tight shrink-0">
                              {item.gia_ban.toLocaleString('vi-VN')}
                              <span className="text-[11px] align-top ml-0.5 uppercase tracking-widest text-[#C9252C]/70">đ</span>
                            </p>
                            
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => handleEdit(item)}
                                className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-stone-100/80 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 transition-colors tap-active"
                                title="Cập nhật"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.ma_mon)}
                                className="w-10 h-10 rounded-[14px] flex items-center justify-center bg-stone-100/80 dark:bg-stone-800 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 text-stone-400 transition-colors tap-active"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl">
          <div 
            className="glass-premium w-full max-w-xl rounded-t-[48px] sm:rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-t sm:border border-white/50 dark:border-white/10"
          >
              {/* Modal Header */}
              <div className="p-10 border-b border-stone-50 dark:border-stone-800 flex justify-between items-center glass-premium sticky top-0 z-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-[#C9252C] text-white rounded-[28px] flex items-center justify-center shadow-xl shadow-red-200 dark:shadow-none">
                    {editingItem ? <Edit2 className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white leading-none mb-1 tracking-tighter uppercase">
                      {editingItem ? 'Cập nhật' : 'Thêm món'}
                    </h2>
                    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                      {editingItem ? `Đang chỉnh sửa: ${editingItem.ten_mon}` : 'Nhập thông tin món mới vào hệ thống'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-14 h-14 bg-stone-50 dark:bg-stone-800 rounded-[24px] flex items-center justify-center text-stone-400 hover:text-stone-900 transition-all tap-active">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto flex-grow scrollbar-hide">
                {/* Tên món Section */}
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-2">Tên món ăn</label>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
                      <Coffee className="w-6 h-6" />
                    </div>
                    <input 
                      type="text" 
                      required
                      value={formData.ten_mon}
                      onChange={e => {
                        const newName = e.target.value;
                        if (!editingItem) {
                          const prefix = newName.split(' ').map(w => w.charAt(0).toUpperCase()).join('').substring(0, 3);
                          const suffix = Date.now().toString().slice(-4);
                          const generatedMaMon = newName ? `${prefix}-${suffix}` : `M-${suffix}`;
                          setFormData({...formData, ten_mon: newName, ma_mon: generatedMaMon});
                        } else {
                          setFormData({...formData, ten_mon: newName});
                        }
                      }}
                      className="w-full pl-16 pr-6 py-6 bg-stone-50 dark:bg-stone-800 rounded-[32px] font-black text-2xl text-stone-900 dark:text-white border-2 border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 outline-none shadow-inner"
                      placeholder="VD: Cà phê sữa đá"
                    />
                  </div>
                </div>

                {/* Giá & Mã món Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-2">Giá niêm yết</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#C9252C]">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <input 
                        type="number" 
                        required
                        value={formData.gia_ban === 0 ? '' : formData.gia_ban}
                        onChange={e => setFormData({...formData, gia_ban: Number(e.target.value)})}
                        onBlur={handlePriceBlur}
                        {...currencyInputProps}
                        className="w-full pl-16 pr-12 py-6 bg-stone-50 dark:bg-stone-800 rounded-[32px] font-black text-2xl text-[#C9252C] border-2 border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 outline-none shadow-inner"
                        placeholder="0"
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-stone-300 font-black text-xl">đ</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-2">Mã món</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
                        <Hash className="w-6 h-6" />
                      </div>
                      <input 
                        type="text" 
                        value={formData.ma_mon || ''}
                        onChange={e => setFormData({...formData, ma_mon: e.target.value.toUpperCase()})}
                        className="w-full pl-16 pr-6 py-6 bg-stone-50 dark:bg-stone-800 rounded-[32px] font-mono font-black text-stone-900 dark:text-white border-2 border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 outline-none shadow-inner text-lg"
                        placeholder="VD: CF01"
                      />
                    </div>
                  </div>
                </div>

                {/* Kho & Danh mục Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-2">Số lượng tồn</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
                        <Package className="w-6 h-6" />
                      </div>
                      <input 
                        type="number" 
                        value={formData.inventoryQty}
                        onChange={e => setFormData({...formData, inventoryQty: Number(e.target.value)})}
                        {...quantityInputProps}
                        min={0}
                        className="w-full pl-16 pr-6 py-6 bg-stone-50 dark:bg-stone-800 rounded-[32px] font-black text-xl text-stone-900 dark:text-white border-2 border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 outline-none shadow-inner"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-[0.2em] ml-2">Danh mục</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-300">
                        <Tag className="w-6 h-6" />
                      </div>
                      <input 
                        type="text"
                        list="category-list"
                        required
                        value={formData.danh_muc}
                        onChange={e => setFormData({...formData, danh_muc: e.target.value})}
                        className="w-full pl-16 pr-6 py-6 bg-stone-50 dark:bg-stone-800 rounded-[32px] font-black text-xl text-stone-900 dark:text-white border-2 border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 outline-none shadow-inner"
                        placeholder="Chọn..."
                      />
                      <datalist id="category-list">
                        {existingCategories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, co_san: !formData.co_san})}
                    className={`p-8 rounded-[40px] border-2 flex flex-col items-center gap-4 tap-active ${
                      formData.co_san 
                        ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30' 
                        : 'bg-stone-50 border-stone-100 dark:bg-stone-800 dark:border-stone-700'
                    }`}
                  >
                    <div className={`w-14 h-8 rounded-full relative ${formData.co_san ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md ${formData.co_san ? 'left-7' : 'left-1'}`} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${formData.co_san ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'}`}>
                      {formData.co_san ? 'Đang bán' : 'Tạm ngưng'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({...formData, has_customizations: !formData.has_customizations})}
                    className={`p-8 rounded-[40px] border-2 flex flex-col items-center gap-4 tap-active ${
                      formData.has_customizations 
                        ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' 
                        : 'bg-stone-50 border-stone-100 dark:bg-stone-800 dark:border-stone-700'
                    }`}
                  >
                    <div className={`w-14 h-8 rounded-full relative ${formData.has_customizations ? 'bg-blue-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md ${formData.has_customizations ? 'left-7' : 'left-1'}`} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${formData.has_customizations ? 'text-blue-600 dark:text-blue-400' : 'text-stone-400'}`}>
                      {formData.has_customizations ? 'Có Option' : 'Cơ bản'}
                    </span>
                  </button>
                </div>

                {/* Submit Button */}
                <div className="pt-6 pb-10">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-8 bg-gradient-to-r from-[#C9252C] to-[#991B1B] text-white rounded-[40px] font-black text-xl uppercase tracking-[0.2em] shadow-2xl shadow-red-200 dark:shadow-none tap-active flex items-center justify-center gap-4 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-8 h-8" />
                    ) : (
                      <>
                        <Save className="w-8 h-8" />
                        {editingItem ? 'Lưu thay đổi' : 'Thêm món'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

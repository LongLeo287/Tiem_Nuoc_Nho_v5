import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Save, X, Search, RefreshCw, AlertCircle, 
  Check, ChevronRight, Package, Settings as SettingsIcon, Filter, 
  MoreVertical, Power, TrendingUp, Calendar as CalendarIcon, Hash, 
  Coffee, DollarSign, Tag, Sparkles, Zap, BarChart3, ArrowRight,
  Info, LayoutGrid, List, SlidersHorizontal, Wand2
} from 'lucide-react';
import { Solar, Lunar } from 'lunar-javascript';
import { GoogleGenAI, Type } from "@google/genai";
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

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
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

      const response = await ai.models.generateContent({
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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
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

      const response = await ai.models.generateContent({
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
    <div className="flex flex-col h-full bg-[#F8F9FA] dark:bg-black font-sans">
      {/* Editorial Header */}
      <div className="relative px-6 pt-10 pb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9252C]/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10">
          <div 
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
          >
            <div>
              <h1 className="text-5xl font-black text-stone-900 dark:text-white leading-[0.9] tracking-tighter uppercase">
                Quản lý<br />
                <span className="text-[#C9252C]">Thực đơn</span>
              </h1>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-black bg-stone-200 dark:bg-stone-800" />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                  {stats.total} món • {stats.categories} danh mục • {stats.outOfStock} hết hàng
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchAllData(false)}
                disabled={isRefreshing}
                className="w-14 h-14 bg-white dark:bg-stone-900 rounded-[24px] flex items-center justify-center text-stone-400 hover:text-stone-900 dark:hover:text-white tap-active shadow-sm border border-stone-100 dark:border-stone-800"
              >
                <RefreshCw className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => {
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
                }}
                className="h-14 px-8 bg-[#C9252C] text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 dark:shadow-none tap-active flex items-center gap-3 hover:bg-red-700"
              >
                <Plus className="w-6 h-6" />
                <span>Thêm món</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="px-6 -mt-8 mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-20">
        {[
          { label: 'Tổng số món', value: stats.total, icon: Coffee, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Hết hàng', value: stats.outOfStock, icon: X, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Sắp hết', value: stats.lowStock, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Danh mục', value: stats.categories, icon: Tag, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-stone-900 p-4 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm"
          >
            <div className={`w-10 h-10 ${stat.bg} dark:bg-opacity-10 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">{stat.label}</p>
            <p className="text-2xl font-black text-stone-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="px-6 mb-6 flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text"
              placeholder="Tìm kiếm món ăn, mã số..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchExpanded(true)}
              onBlur={() => setTimeout(() => setIsSearchExpanded(false), 200)}
              className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 pl-10 pr-10 py-3 rounded-2xl font-medium text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400 focus:ring-2 focus:ring-[#C9252C]/20 focus:border-[#C9252C] outline-none shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 tap-active"
              >
                <X className="h-4 w-4 bg-stone-200 dark:bg-stone-800 rounded-full p-0.5" />
              </button>
            )}
            
            {/* Autocomplete Suggestions */}
              {isSearchExpanded && searchQuery.trim() && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl shadow-xl overflow-hidden z-50"
                >
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
                        className="w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800 border-b border-stone-50 dark:border-stone-800/50 last:border-0 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-sm text-stone-800 dark:text-white">{suggestion.ten_mon}</div>
                          <div className="text-[10px] font-medium text-stone-400 uppercase tracking-widest">{suggestion.danh_muc}</div>
                        </div>
                        <div className="text-sm font-black text-[#C9252C]">{suggestion.gia_ban.toLocaleString()}đ</div>
                      </button>
                    ))}
                  {menuItems.filter(item => item.ten_mon.toLowerCase().includes(searchQuery.toLowerCase()) || item.danh_muc.toLowerCase().includes(searchQuery.toLowerCase()) || item.ma_mon.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-stone-500 dark:text-stone-400">
                      Không tìm thấy món nào
                    </div>
                  )}
                </div>
              )}
          </div>
          
          {/* AI Lab Toggle */}
          <button 
            onClick={() => setShowForecast(!showForecast)}
            className={`h-11 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 tap-active border shadow-sm flex-shrink-0 ${
              showForecast 
                ? 'bg-[#C9252C] text-white border-[#C9252C] shadow-red-200 dark:shadow-none' 
                : 'bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span className="hidden sm:inline">AI Lab</span>
          </button>
          
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewLayout(viewLayout === 'grid' ? 'list' : 'grid')}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 tap-active shadow-sm"
            title={viewLayout === 'grid' ? 'Chuyển sang dạng danh sách' : 'Chuyển sang dạng lưới'}
          >
            {viewLayout === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </button>
        </div>

        {/* Category Navigation */}
        <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
          {['Tất cả', ...existingCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-xl whitespace-nowrap text-[13px] font-bold tap-active border ${
                activeCategory === cat && !searchQuery
                  ? 'bg-[#C9252C] text-white border-[#C9252C] shadow-sm shadow-red-200 dark:shadow-none'
                  : 'bg-white dark:bg-stone-900/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto px-6 pb-32">
          {showForecast ? (
            <div
              key="ai-lab"
              className="space-y-8"
            >
              {/* AI Lab Header */}
              <div className="bg-stone-900 dark:bg-stone-800 rounded-[40px] p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-48 -mt-48" />
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
                      className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 pl-10 pr-10 py-3 rounded-2xl font-medium text-[15px] text-stone-800 dark:text-white placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none shadow-sm"
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
                      className={`bg-white dark:bg-stone-900 p-6 rounded-[32px] border shadow-sm transition-all ${
                        item.inventoryQty === 0 
                          ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/5' 
                          : item.daysLeft <= 3 
                            ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/5' 
                            : 'border-stone-100 dark:border-stone-800'
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
                        <div className="h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
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
                  className="bg-white dark:bg-stone-900 p-8 rounded-[40px] border border-stone-100 dark:border-stone-800 shadow-sm"
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
                <div className={viewLayout === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                  {filteredItems.map((item, idx) => (
                    <div
                      key={item.ma_mon}
                      className={`group bg-white dark:bg-stone-900 rounded-[32px] border border-stone-100 dark:border-stone-800 shadow-sm hover:shadow-xl relative overflow-hidden ${!item.co_san ? 'opacity-50 grayscale bg-stone-50/50 dark:bg-stone-900/50' : ''} ${viewLayout === 'list' ? 'flex items-center p-4' : 'p-6'}`}
                    >
                      {!item.co_san && (
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
                             style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} 
                        />
                      )}
                      {/* Status Indicators */}
                      <div className={viewLayout === 'list' ? "flex-shrink-0 mr-6" : "flex justify-between items-start mb-6"}>
                        <div className="flex gap-2">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.co_san ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-stone-200 text-stone-600 border-stone-300'}`}>
                            {item.co_san ? 'Đang bán' : 'Tạm ngưng'}
                          </span>
                          {item.inventoryQty !== undefined && item.inventoryQty <= 5 && item.co_san && (
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border animate-pulse ${
                              item.inventoryQty === 0 
                                ? 'bg-red-500 text-white border-red-600' 
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {item.inventoryQty === 0 ? 'Hết hàng' : 'Sắp hết'}
                            </span>
                          )}
                        </div>
                        {viewLayout === 'grid' && (
                          <button 
                            onClick={(e) => handleToggleAvailability(item, e)}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.co_san ? 'bg-stone-50 text-stone-400 hover:text-red-500' : 'bg-emerald-100 text-emerald-600'}`}
                          >
                            <Power className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Main Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`text-lg font-black leading-tight truncate ${!item.co_san ? 'text-stone-400 line-through decoration-stone-400 decoration-2' : 'text-stone-800 dark:text-white group-hover:text-[#C9252C]'}`}>
                            {item.ten_mon}
                          </h4>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className={`text-2xl font-black ${!item.co_san ? 'text-stone-400' : 'text-[#C9252C]'}`}>{item.gia_ban.toLocaleString()}đ</p>
                          <span className="text-[9px] font-mono font-bold text-stone-300 uppercase tracking-tighter">#{item.ma_mon}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 dark:bg-stone-800 rounded-lg">
                            <Tag className="w-3 h-3 text-stone-400" />
                            <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">{item.danh_muc}</span>
                          </div>
                          {item.inventoryQty !== undefined && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-50 dark:bg-stone-800 rounded-lg">
                              <Package className="w-3 h-3 text-stone-400" />
                              <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">Kho: {item.inventoryQty}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={viewLayout === 'list' ? "flex gap-2 ml-6" : "mt-8 pt-6 border-t border-stone-50 dark:border-stone-800 flex justify-between items-center"}>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="w-12 h-12 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-stone-400 hover:text-stone-800 dark:hover:text-white shadow-sm"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.ma_mon)}
                            className="w-12 h-12 bg-stone-50 dark:bg-stone-800 rounded-2xl text-stone-300 hover:text-red-500 shadow-sm"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {viewLayout === 'grid' && (
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-stone-300 uppercase tracking-[0.2em]">Cập nhật</span>
                            <span className="text-[10px] font-bold text-stone-400">Hôm nay</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-xl">
          <div 
            className="bg-white dark:bg-stone-900 w-full max-w-xl rounded-t-[48px] sm:rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-t sm:border border-stone-100 dark:border-stone-800"
          >
              {/* Modal Header */}
              <div className="p-10 border-b border-stone-50 dark:border-stone-800 flex justify-between items-center bg-white dark:bg-stone-900 sticky top-0 z-10">
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

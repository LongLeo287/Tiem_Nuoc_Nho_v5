import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, ShoppingBag, Calendar, ChevronRight, Package, CreditCard, User, AlertCircle, X, Check, Share2, Coffee } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { useData } from '../context/DataContext';
import { Virtuoso } from 'react-virtuoso';
import { Invoice } from './Invoice';

interface OrderHistoryItem {
  orderId: string;
  customerName: string;
  phoneNumber?: string;
  timestamp: string;
  total: number;
  items: any[];
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

export function OrderHistory() {
  const { orders, menuItems } = useData();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [aiEmptyState, setAiEmptyState] = useState<{title: string, content: string, button: string, emoji: string} | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'success' | 'warning' }>({ message: '', visible: false });
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  
  const prevStockStatus = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize or update stock status ref
    const currentStatus: Record<string, boolean> = {};
    menuItems.forEach(item => {
      const isOutOfStock = item.isOutOfStock || (item.inventoryQty !== undefined && item.inventoryQty <= 0);
      
      // If it was in stock and now it's out of stock
      if (prevStockStatus.current[item.id] === false && isOutOfStock === true) {
        setToast({
          message: `Món "${item.name}" vừa hết hàng!`,
          visible: true,
          type: 'warning'
        });
        
        // Play alert sound only if user is not looking at the screen
        if (document.hidden) {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // E5
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (err) {
            console.error('Error playing sound:', err);
          }
        }
        
        // Auto hide toast
        setTimeout(() => {
          setToast(prev => ({ ...prev, visible: false }));
        }, 5000);
      }
      
      currentStatus[item.id] = isOutOfStock;
    });
    
    prevStockStatus.current = currentStatus;
  }, [menuItems]);

  const emptyStates = [
    {
      title: "Chưa có ly nào!",
      content: "Lịch sử uống nước của bạn đang trống trơn. Barista đang buồn thiu vì chưa được phục vụ bạn đó!",
      button: "Đặt ly đầu tiên ngay",
      emoji: "🥤"
    },
    {
      title: "Ký ức trống rỗng...",
      content: "Bạn chưa có kỷ niệm nào với quán. Hãy tạo ra những ký ức ngọt ngào bằng một ly trà sữa full topping nhé!",
      button: "Tạo kỷ niệm ngay",
      emoji: "💭"
    },
    {
      title: "Thánh 'nhịn' uống?",
      content: "Sao bạn có thể chịu được cơn khát này hay vậy? Mau order một ly nước mát lạnh để giải tỏa đi nào!",
      button: "Giải khát ngay",
      emoji: "🌵"
    },
    {
      title: "Sổ nợ sạch trơn",
      content: "Chưa có hóa đơn nào được ghi lại. Bạn là khách hàng gương mẫu hay là chưa từng ghé quán vậy?",
      button: "Ghé quán online ngay",
      emoji: "📝"
    },
    {
      title: "Buồn so...",
      content: "Nhìn lịch sử trống trải mà lòng quán buồn so. Order một ly nước để tụi mình vui lên đi!",
      button: "Làm quán vui ngay",
      emoji: "😢"
    },
    {
      title: "Người lạ ơi!",
      content: "Người lạ ơi, xin hãy ghé mua giùm tôi... một ly nước. Lịch sử trống quá nè!",
      button: "Làm quen ngay",
      emoji: "👋"
    },
    {
      title: "Chưa mở hàng",
      content: "Bạn chưa mở hàng cho quán đơn nào cả. Nhanh tay đặt món để lấy hên cho quán đi nào!",
      button: "Mở hàng ngay",
      emoji: "🍀"
    },
    {
      title: "Ẩn danh?",
      content: "Bạn đang hoạt động ẩn danh hay sao mà không thấy đơn nào lưu lại vậy? Hiện hình bằng một đơn hàng đi!",
      button: "Hiện hình!",
      emoji: "🥷"
    },
    {
      title: "Trí nhớ cá vàng",
      content: "App không phải cá vàng đâu, mà là bạn chưa uống gì thật đó. Đừng để bụng đói cồn cào nữa!",
      button: "Nạp năng lượng",
      emoji: "🐠"
    },
    {
      title: "Fan cứng đâu rồi?",
      content: "Fan cứng của quán đâu rồi? Sao để lịch sử trống trơn thế này? Điểm danh bằng một ly trà sữa nào!",
      button: "Điểm danh!",
      emoji: "🙋"
    }
  ];

  const randomState = useMemo(() => {
    // 1. Get cached AI messages
    const cached = localStorage.getItem('ai_history_messages');
    const aiMessages = cached ? JSON.parse(cached) : [];
    
    // 2. Combine with static messages
    const allMessages = [...emptyStates, ...aiMessages];
    
    // 3. Pick one randomly
    return allMessages[Math.floor(Math.random() * allMessages.length)];
  }, [orders.length === 0]);

  const generateAIEmptyState = async () => {
    if (isGeneratingAI) return;

    // Check if AI is enabled in settings
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    if (!isAIEnabled) return;

    // Clear error if it's older than 10 minutes
    const lastError = localStorage.getItem('ai_history_error_time');
    if (lastError && Date.now() - parseInt(lastError) > 10 * 60 * 1000) {
      localStorage.removeItem('ai_history_error_time');
    }

    // 1. Luân phiên: Chỉ gọi AI 30% số lần hoặc khi chưa có mẫu AI nào lưu lại
    const cached = localStorage.getItem('ai_history_messages');
    const aiMessages = cached ? JSON.parse(cached) : [];
    const shouldCallAI = aiMessages.length < 5 || Math.random() < 0.3;

    if (!shouldCallAI) return;

    // 2. Rate limit: Don't try again if we hit a quota error recently
    if (localStorage.getItem('ai_history_error_time')) {
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Get menu data for context
      const availableItems = menuItems.filter(i => !i.isOutOfStock).map(i => i.name);
      
      // Get sales trends (top 3 items in last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentOrders = orders.filter(o => new Date(o.timestamp) >= thirtyDaysAgo);
      const salesCount: Record<string, number> = {};
      recentOrders.forEach(o => o.items.forEach(i => salesCount[i.name] = (salesCount[i.name] || 0) + i.quantity));
      const trendingItems = Object.entries(salesCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      const menuContext = trendingItems.length > 0 
        ? `Các món đang hot: ${trendingItems.join(', ')}. Các món có sẵn: ${availableItems.slice(0, 10).join(', ')}.`
        : `Các món có sẵn: ${availableItems.slice(0, 10).join(', ')}.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Tạo 1 thông báo lịch sử đơn hàng trống cho app quán nước. 
        Style: Nhắc kỷ niệm, rủ rê quay lại, GenZ, cá nhân hóa. 
        Dựa vào dữ liệu này để gợi ý món cụ thể: ${menuContext}
        Tiêu đề < 25 ký tự, Nội dung < 80 ký tự. 
        Trả về JSON: title, content, button, emoji.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              button: { type: Type.STRING },
              emoji: { type: Type.STRING }
            },
            required: ["title", "content", "button", "emoji"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      if (result.title && result.content && result.button) {
        localStorage.removeItem('ai_history_error_time');

        const isDuplicate = aiMessages.some((msg: any) => msg.title === result.title || msg.content === result.content);
        if (!isDuplicate) {
          const newCache = [result, ...aiMessages].slice(0, 20); // Lưu tối đa 20 mẫu từ AI
          localStorage.setItem('ai_history_messages', JSON.stringify(newCache));
        }
      }
    } catch (e: any) {
      // Ẩn thông báo lỗi, tự động dùng mẫu cũ
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        localStorage.setItem('ai_history_error_time', Date.now().toString());
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  useEffect(() => {
    if (orders.length === 0) {
      generateAIEmptyState();
    }
  }, [orders.length]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const filtered = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
      if (timeRange === 'day') return orderDate.toDateString() === now.toDateString();
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= weekAgo;
      }
      if (timeRange === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      if (timeRange === 'year') return orderDate.getFullYear() === now.getFullYear();
      return true;
    });
    
    // Sort by timestamp descending (newest first)
    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, timeRange]);

  const totalRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + order.total, 0);
  }, [filteredOrders]);

  if (orders.length === 0) {
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    const displayState = isAIEnabled ? randomState : emptyStates[0];
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6 relative">
          {/* AI Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {isAIEnabled ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> AI Bật</>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700"></span> AI Tắt</>
            )}
          </div>

          <div className="relative mb-6">
            <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800 rounded-[24px] flex items-center justify-center text-4xl shadow-sm">
              {displayState.emoji}
            </div>
          </div>
          <h2 className="text-xl font-black text-stone-800 dark:text-white mb-2 text-center">{displayState.title}</h2>
          <p className="text-stone-500 dark:text-stone-400 mb-8 text-sm leading-relaxed max-w-xs mx-auto text-center">
            {displayState.content}
          </p>
          <div className="w-full max-w-[240px] flex justify-center">
            <button
              onClick={() => window.location.hash = '#/'}
              className="w-full py-3.5 bg-gradient-to-r from-[#C9252C] to-[#991B1B] text-white font-black rounded-2xl tap-active shadow-lg shadow-red-200 dark:shadow-none uppercase tracking-widest text-xs"
            >
              {displayState.button}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col p-4 space-y-5 pb-24">
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <h2 className="text-stone-400 dark:text-stone-500 font-black text-[10px] uppercase tracking-widest">Lịch sử đơn hàng</h2>
        <span className="text-stone-400 dark:text-stone-500 font-bold text-[10px] bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg">{filteredOrders.length} đơn</span>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide flex-shrink-0">
        {[
          { id: 'day', label: 'Hôm nay' },
          { id: 'week', label: 'Tuần này' },
          { id: 'month', label: 'Tháng này' },
          { id: 'year', label: 'Năm nay' },
        ].map((range) => (
          <button
            key={range.id}
            onClick={() => setTimeRange(range.id as any)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest tap-active border ${
              timeRange === range.id
                ? 'bg-[#C9252C] text-white border-[#C9252C] shadow-md shadow-red-100 dark:shadow-none'
                : 'bg-white dark:bg-stone-900 text-stone-400 dark:text-stone-500 border-stone-100 dark:border-stone-800 shadow-sm dark:shadow-none'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-hidden rounded-2xl bg-stone-50/50 dark:bg-stone-900/50 border border-stone-100 dark:border-stone-800">
        <Virtuoso
          className="h-full"
          data={filteredOrders}
          components={{
            EmptyPlaceholder: () => (
              <div className="text-center py-16 flex flex-col items-center justify-center px-6">
                <div className="w-16 h-16 bg-stone-50 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4 text-stone-300 dark:text-stone-600 shadow-sm">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-stone-800 dark:text-white font-black text-base mb-1">Chưa có đơn hàng nào</h3>
                <p className="text-stone-400 dark:text-stone-500 font-medium text-xs max-w-[200px] leading-relaxed">
                  Không tìm thấy đơn hàng trong khoảng thời gian này.
                </p>
              </div>
            )
          }}
          itemContent={(index, order) => (
            <div
              key={`history-item-${order.orderId}`}
              className="card p-3 sm:p-4 space-y-3 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800 last:border-0"
            >
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded-md border border-stone-100 dark:border-stone-700">#{order.orderId}</span>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border shadow-sm ${
                    order.orderStatus === 'Hoàn thành' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/30 dark:text-emerald-400' :
                    order.orderStatus === 'Đã hủy' ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400' :
                    order.orderStatus === 'Đang làm' ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400' :
                    order.orderStatus === 'Công nợ' ? 'bg-yellow-50 border-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:border-yellow-900/30 dark:text-yellow-400' :
                    'bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-900/20 dark:border-orange-900/30 dark:text-orange-400'
                  }`}>
                    {order.orderStatus === 'Hoàn thành' ? <Check className="w-3 h-3" /> :
                     order.orderStatus === 'Đã hủy' ? <X className="w-3 h-3" /> :
                     order.orderStatus === 'Đang làm' ? <Coffee className="w-3 h-3" /> :
                     order.orderStatus === 'Công nợ' ? <AlertCircle className="w-3 h-3" /> :
                     <Clock className="w-3 h-3" />}
                    {order.orderStatus || 'Đã nhận'}
                  </span>
                </div>
                <p className="text-[#C9252C] font-black text-sm tracking-tighter">{order.total.toLocaleString()}đ</p>
              </div>
              
              <div className="flex items-center justify-between gap-2 text-stone-800 dark:text-white">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3 h-3 text-stone-400 dark:text-stone-500 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-bold text-xs truncate leading-none">{order.customerName}</h3>
                    {order.phoneNumber && <span className="text-[8px] text-stone-400 dark:text-stone-500 font-medium mt-0.5">{order.phoneNumber}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[8px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-tighter flex-shrink-0">
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(order.timestamp).toLocaleDateString('vi-VN')} {new Date(order.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              
              <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl p-3 space-y-2.5 border border-stone-100/50 dark:border-stone-700/50">
                {order.items.map((item, idx) => (
                  <div key={`history-order-item-${order.orderId}-${idx}`} className="flex justify-between items-start text-sm gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-6 h-6 bg-white dark:bg-stone-700 rounded-lg flex items-center justify-center text-[10px] font-black text-[#C9252C] shadow-sm border border-stone-100 dark:border-stone-600 flex-shrink-0 mt-0.5">
                        {item.quantity}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-stone-700 dark:text-stone-300 truncate">{item.name}</span>
                        {(item.temperature || item.sugarLevel || item.iceLevel) && (
                          <span className="text-[9px] text-stone-400 font-medium leading-tight mt-0.5">
                            {[item.temperature, item.sugarLevel, item.iceLevel].filter(Boolean).join(' • ')}
                          </span>
                        )}
                        {item.note && <span className="text-[10px] text-stone-400 italic leading-tight mt-0.5">"{item.note}"</span>}
                      </div>
                    </div>
                    <span className="text-stone-400 dark:text-stone-500 font-bold text-[9px] uppercase tracking-wider bg-white dark:bg-stone-700 px-1.5 py-0.5 rounded-md border border-stone-100 dark:border-stone-600 flex-shrink-0">{item.size}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-stone-400 dark:text-stone-500">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{order.paymentMethod}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                      order.paymentStatus === 'Đã thanh toán' 
                        ? 'border-red-100 dark:border-red-900/30 text-[#C9252C] dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                        : 'border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                      {order.paymentStatus === 'Đã thanh toán' ? 'Đã trả' : 'Chưa trả'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrderForInvoice(order)}
                  className="w-11 h-11 flex items-center justify-center bg-stone-50 dark:bg-stone-800 rounded-xl text-stone-400 hover:text-[#C9252C] tap-active border border-stone-100 dark:border-stone-700"
                  title="Xuất hóa đơn"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* Invoice Modal */}
        {selectedOrderForInvoice && (
          <Invoice 
            order={selectedOrderForInvoice} 
            onClose={() => setSelectedOrderForInvoice(null)} 
          />
        )}

      {/* Toast Notification */}
        {toast.visible && (
          <div 
            className="fixed bottom-24 left-4 right-4 z-[60]"
          >
            <div className={`${toast.type === 'warning' ? 'bg-orange-500 dark:bg-orange-600' : 'bg-stone-900 dark:bg-white'} text-white dark:text-black px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 dark:border-black/10`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 ${toast.type === 'warning' ? 'bg-white/20' : 'bg-[#C9252C]'} rounded-full flex items-center justify-center`}>
                  {toast.type === 'warning' ? <AlertCircle className="w-4 h-4 text-white" /> : <Check className="w-4 h-4 text-white" />}
                </div>
                <span className="text-sm font-bold">{toast.message}</span>
              </div>
              <button onClick={() => setToast({ ...toast, visible: false })} className="text-white/60 dark:text-stone-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

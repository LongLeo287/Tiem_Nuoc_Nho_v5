import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Minus, ArrowRight, AlertCircle, Edit2, X, ShoppingBag, Clock, CheckCircle2, RefreshCw, ChevronRight, Sparkles, User, Share2, FileText, Save, History, LayoutGrid, List, DollarSign, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { CartItem, OrderData } from '../types';
import { SIZES, TOPPINGS } from './Menu';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/NotificationService';
import { Invoice } from './Invoice';

import { useCart } from '../context/CartContext';
import { CartItemRow } from './CartItemRow';

interface CartProps {
  appsScriptUrl: string;
  onNavigateSettings: () => void;
}

export function Cart({ appsScriptUrl, onNavigateSettings }: CartProps) {
  const { setIsFabHidden } = useUI();
  const { orders, createOrder, fetchAllData, updateOrderStatus } = useData();
  const { currentUser } = useAuth();
  const { cart, updateQuantity, updateCartItem, clearCart, restoreCart, saveCartForLater, loadSavedCart, deleteSavedCart, savedCarts } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản'>('Tiền mặt');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitEnabled, setIsAutoSubmitEnabled] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderData | null>(() => {
    const saved = localStorage.getItem('submittedOrder');
    return saved ? JSON.parse(saved) : null;
  });

  const [aiEmptyState, setAiEmptyState] = useState<{title: string, content: string, button: string, emoji: string} | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showInvoice, setShowInvoice] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  
  useEffect(() => {
    if (submittedOrder) {
      setIsItemsExpanded(submittedOrder.items.length <= 3);
    }
  }, [submittedOrder]);
  const [showSavedCarts, setShowSavedCarts] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPaymentExpanded, setIsPaymentExpanded] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);

  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = React.useCallback((message: string) => {
    setToast({ message, visible: true });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const handleUpdateQuantity = React.useCallback((item: CartItem, delta: number) => {
    if (delta > 0 && item.inventoryQty !== undefined && item.quantity + delta > item.inventoryQty) {
      showToast(`Chỉ còn ${item.inventoryQty} sản phẩm trong kho!`);
      return;
    }
    
    // Visual feedback: trigger a small scale animation or just rely on the state update
    // Since this is a functional component, the state update will trigger a re-render.
    // We can add a class or motion effect if needed.
    updateQuantity(item.cartItemId, delta);
    
    // Haptic feedback
    triggerVibrate(20);
  }, [updateQuantity]);

  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);

  const handleRemoveItem = React.useCallback((item: CartItem) => {
    setItemToRemove(item);
  }, []);

  const confirmRemoveItem = () => {
    if (itemToRemove) {
      handleUpdateQuantity(itemToRemove, -itemToRemove.quantity);
      setItemToRemove(null);
    }
  };

  const emptyStates = [
    {
      title: "Cốc của bạn đang buồn hiu...",
      content: "Chưa có giọt nước nào trong đơn cả. Đừng để cổ họng khô khốc, \"chốt đơn\" ngay ly trà sữa full topping đi!",
      button: "Uống ngay cho đã!",
      emoji: "🥺"
    },
    {
      title: "Sạch bóng ly cốc!",
      content: "Chưa thấy một dấu vết nào của sự giải khát ở đây cả. Bạn định nhịn uống để dành tiền lấy vợ/chồng à?",
      button: "Phung phí chút đi!",
      emoji: "💸"
    },
    {
      title: "Một sự trống trải...",
      content: "Lịch sử order của bạn còn sạch hơn cả ly nước lọc. Mau \"vấy bẩn\" nó bằng vài ly trà sữa béo ngậy đi!",
      button: "Lên đơn cho đỡ khát",
      emoji: "💅"
    },
    {
      title: "Tìm đỏ mắt không thấy đơn!",
      content: "Lục tung cái app này lên cũng không thấy bạn đã uống gì. Đừng để máy pha cà phê ngồi chơi xơi nước nữa bạn ơi!",
      button: "Tạo công ăn việc làm ngay",
      emoji: "👀"
    },
    {
      title: "Trống trơn!",
      content: "Nhìn gì mà nhìn? Chưa đặt ly nào thì lấy đâu ra lịch sử mà xem. Quay lại menu gấp!",
      button: "Đi đặt nước ngay đi!",
      emoji: "🙄"
    },
    {
      title: "Giỏ hàng đang 'khát'",
      content: "Giỏ hàng đang trống trải như ví tiền cuối tháng vậy. Chọn nước ngay thôi đồng chí ơi!",
      button: "Triển thôi!",
      emoji: "💀"
    },
    {
      title: "Barista đang đợi",
      content: "Đừng để Barista đợi chờ trong vô vọng, lên đơn ngay và luôn nào!",
      button: "Lên đơn!",
      emoji: "👨‍🍳"
    },
    {
      title: "Máy xay mốc meo rồi",
      content: "Máy xay đang mốc meo rồi, chọn đại một ly sinh tố cho vui cửa vui nhà đi!",
      button: "Cứu khát!",
      emoji: "🕸️"
    },
    {
      title: "Tính xem bói hả?",
      content: "Tính xem bói hay sao mà chưa chọn món nào thế? Quay lại thực đơn ngay!",
      button: "Xem menu!",
      emoji: "🔮"
    },
    {
      title: "Hông có gì giải nhiệt",
      content: "Hông chọn món là hông có gì giải nhiệt đâu nha. Quay lại menu thôi nè!",
      button: "Triển ngay!",
      emoji: "🫠"
    },
    {
      title: "Menu bao la",
      content: "Menu bao la mà chưa thấy món nào vào 'mắt xanh' của bạn sao? Thử lại xem!",
      button: "Thử lại!",
      emoji: "✨"
    },
    {
      title: "Đang đợi chốt đơn",
      content: "Tình trạng: Đang đợi chốt đơn. Đừng để tui đợi lâu, tui dỗi đó!",
      button: "Chốt đơn!",
      emoji: "😤"
    },
    {
      title: "Uống không khí hả?",
      content: "Ủa rồi có chọn món không hay định uống không khí? Quay lại menu gấp!",
      button: "Uống món ngon!",
      emoji: "🤡"
    },
    {
      title: "Trống như NYC",
      content: "Order trống trơn như người yêu cũ vậy. Quay lại tìm 'mối' mới trong menu đi!",
      button: "Tìm mối mới!",
      emoji: "💔"
    },
    {
      title: "Ảo thuật gia à?",
      content: "Định làm ảo thuật cho ly nước tự hiện ra à? Phải chọn thì mới có đơn chứ!",
      button: "Chọn món!",
      emoji: "🎩"
    }
  ];

  const randomState = useMemo(() => {
    // 1. Get cached AI messages
    const cached = localStorage.getItem('ai_generated_messages');
    const aiMessages = cached ? JSON.parse(cached) : [];
    
    // 2. Combine with static messages
    const allMessages = [...emptyStates, ...aiMessages];
    
    // 3. Pick one randomly
    return allMessages[Math.floor(Math.random() * allMessages.length)];
  }, [cart.length === 0]);

  const generateAIEmptyState = async () => {
    if (isGeneratingAI) return;
    
    // Check if AI is enabled in settings
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    if (!isAIEnabled) return;

    // Clear error if it's older than 10 minutes
    const lastError = localStorage.getItem('ai_last_error_time');
    if (lastError && Date.now() - parseInt(lastError) > 10 * 60 * 1000) {
      localStorage.removeItem('ai_last_error_time');
    }

    // 1. Luân phiên: Chỉ gọi AI 30% số lần hoặc khi chưa có mẫu AI nào lưu lại
    const cached = localStorage.getItem('ai_generated_messages');
    const aiMessages = cached ? JSON.parse(cached) : [];
    const shouldCallAI = aiMessages.length < 5 || Math.random() < 0.3;
    
    if (!shouldCallAI) return;

    // 2. Rate limit: Don't try again if we hit a quota error recently
    if (localStorage.getItem('ai_last_error_time')) {
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Get menu data for context
      const menuData = localStorage.getItem('menu_data');
      let menuContext = "";
      if (menuData) {
        try {
          const items = JSON.parse(menuData);
          const available = items.filter((i: any) => !i.isOutOfStock).map((i: any) => i.name);
          const randomItems = available.sort(() => 0.5 - Math.random()).slice(0, 3);
          if (randomItems.length > 0) {
            menuContext = `Hãy nhắc đến các món này: ${randomItems.join(', ')}.`;
          }
        } catch (e) {}
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Model tối ưu nhất cho text
        contents: `Tạo 1 thông báo giỏ hàng trống cho app quán nước. 
        Style: GenZ, lầy lội, phũ, thả thính. ${menuContext}
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
        localStorage.removeItem('ai_last_error_time');
        
        const isDuplicate = aiMessages.some((msg: any) => msg.title === result.title || msg.content === result.content);
        if (!isDuplicate) {
          const newCache = [result, ...aiMessages].slice(0, 20); // Lưu tối đa 20 mẫu từ AI
          localStorage.setItem('ai_generated_messages', JSON.stringify(newCache));
        }
      }
    } catch (e: any) {
      // Ẩn thông báo lỗi, tự động dùng mẫu cũ
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        localStorage.setItem('ai_last_error_time', Date.now().toString());
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  useEffect(() => {
    if (cart.length === 0) {
      generateAIEmptyState();
    }
  }, [cart.length]);

  useEffect(() => {
    setIsFabHidden(showClearConfirm || !!editingItem);
    return () => setIsFabHidden(false);
  }, [showClearConfirm, editingItem, setIsFabHidden]);

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  useEffect(() => {
    if (submittedOrder) {
      const globalOrder = orders.find(o => o.orderId === submittedOrder.orderId);
      if (globalOrder && globalOrder.orderStatus !== submittedOrder.orderStatus) {
        setSubmittedOrder(globalOrder);
        localStorage.setItem('submittedOrder', JSON.stringify(globalOrder));
      }
    }
  }, [orders, submittedOrder]);

  const triggerVibrate = (pattern: number | number[] = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  const handleOrder = async (e: React.FormEvent) => {
    triggerVibrate([50, 30, 50]);
    e.preventDefault();
    if (!appsScriptUrl) {
      onNavigateSettings();
      return;
    }

    if (cart.length === 0) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    // ID tạm để hiển thị local — GAS sẽ tạo ID chính thức khi ghi Sheet
    const ma_don = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const orderData: OrderData = {
      orderId:       ma_don,
      customerName,
      phoneNumber,
      tableNumber,
      items:         cart,
      total,                  // DataContext.createOrder sẽ đọc field này để gửi lên GAS
      timestamp:     new Date().toISOString(),
      notes,
      paymentMethod,
      orderStatus:   'Chờ xử lý',
      paymentStatus: paymentMethod === 'Tiền mặt' ? 'Chưa thanh toán' : 'Đã thanh toán',
      staffId:       currentUser?.id,
      staffName:     currentUser?.name,
    };

    try {
      const success = await createOrder(orderData, false);

      if (!success) {
        throw new Error('Có lỗi xảy ra khi gửi đơn hàng.');
      }

      setSubmitStatus('success');
      showToast('Tạo đơn thành công! Kho đã được cập nhật.');
      
      // Notify via WebSocket
      notificationService.notifyNewOrder(orderData);
      
      clearCart();
      setCustomerName('');
      setTableNumber('');
      setNotes('');

      if (isAutoSubmitEnabled) {
        setSubmittedOrder(null);
        localStorage.removeItem('submittedOrder');
      } else {
        setSubmittedOrder(orderData);
        localStorage.setItem('submittedOrder', JSON.stringify(orderData));
      }

      localStorage.removeItem('sync_error');
    } catch (error: any) {
      localStorage.setItem('sync_error', 'true');
      setErrorMessage(error.message || 'Có lỗi xảy ra khi gửi đơn hàng. Vui lòng thử lại.');
      setSubmitStatus('error');
      showToast('Hệ thống bận, chưa thể chốt đơn. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Auto-close success screen when unmounting (switching tabs)
    return () => {
      setSubmittedOrder(null);
      localStorage.removeItem('submittedOrder');
    };
  }, []);

  const mapCartToBackend = (items: CartItem[]) => {
    return items.map(item => ({
      ma_mon: item.id || (item as any).ma_mon, 
      so_luong: item.quantity,
      has_customizations: item.hasCustomizations ?? false,
      ten_mon: item.name
    }));
  };

  const handleCancelOrder = async () => {
    if (!submittedOrder) return;
    setIsSubmitting(true);
    try {
      const cartItemsPayload = mapCartToBackend(submittedOrder.items);
      const success = await updateOrderStatus(submittedOrder.orderId, 'Cancelled', { cartItems: cartItemsPayload });
      
      if (success) {
        showToast('Hủy đơn thành công!');
        setSubmittedOrder(null);
        localStorage.removeItem('submittedOrder');
        clearCart();
        setSubmitStatus('idle');
      } else {
        throw new Error('Lỗi khi hủy đơn');
      }
    } catch (err) {
      alert('Không thể hủy đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditOrder = async () => {
    if (!submittedOrder) return;
    setIsSubmitting(true);
    try {
      const cartItemsPayload = mapCartToBackend(submittedOrder.items);
      // Cancel old order first
      await updateOrderStatus(submittedOrder.orderId, 'Cancelled', { cartItems: cartItemsPayload });
      
      // Restore cart
      restoreCart(submittedOrder.items);

      setCustomerName(submittedOrder.customerName);
      setPhoneNumber(submittedOrder.phoneNumber || '');
      setTableNumber(submittedOrder.tableNumber || '');
      setNotes(submittedOrder.notes || '');
      setSubmittedOrder(null);
      localStorage.removeItem('submittedOrder');
      setSubmitStatus('idle');
    } catch (err) {
      alert('Không thể chỉnh sửa lúc này. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewOrder = () => {
    setSubmittedOrder(null);
    localStorage.removeItem('submittedOrder');
    setSubmitStatus('idle');
    clearCart();
  };

  const handleSaveForLater = () => {
    if (cart.length === 0) return;
    setIsSaving(true);
    setTimeout(() => {
      saveCartForLater(saveName);
      setSaveName('');
      setIsSaving(false);
      showToast('Đã lưu đơn tạm thành công!');
    }, 500);
  };

    if (submittedOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 py-10 text-center relative">
        <button 
          onClick={handleNewOrder}
          className="absolute top-4 right-4 w-11 h-11 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors tap-active"
        >
          <X className="w-5 h-5" />
        </button>

        <div 
          className="w-24 h-24 bg-red-50 dark:bg-red-900/20 text-[#C9252C] dark:text-red-400 rounded-[32px] flex items-center justify-center mb-8"
        >
          <CheckCircle2 className="w-12 h-12" />
        </div>
        
        <h2 className="text-3xl font-black text-stone-800 dark:text-white mb-2">Đặt hàng thành công!</h2>
        <p className="text-stone-500 dark:text-stone-400 mb-8">Mã đơn: <span className="text-stone-800 dark:text-white font-bold">{submittedOrder.orderId}</span></p>

        <div className="w-full bg-white dark:bg-stone-900 rounded-[32px] p-6 shadow-sm border border-stone-100 dark:border-stone-800 text-left space-y-4 mb-8">
          <div className="flex justify-between items-center pb-4 border-b border-stone-50 dark:border-stone-800">
            <span className="text-stone-400 dark:text-stone-500 font-bold text-xs uppercase tracking-widest">Trạng thái</span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              submittedOrder.orderStatus === 'Hoàn thành' ? 'bg-red-50 dark:bg-red-900/20 text-[#C9252C] dark:text-red-400' :
              submittedOrder.orderStatus === 'Đã hủy' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
              'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              {submittedOrder.orderStatus}
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-400 dark:text-stone-500">Số điện thoại</span>
              <span className="font-bold text-stone-800 dark:text-white">{submittedOrder.phoneNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400 dark:text-stone-500">Thanh toán</span>
              <span className="font-bold text-stone-800 dark:text-white">{submittedOrder.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-400 dark:text-stone-500">Tổng tiền</span>
              <span className="font-black text-[#C9252C] dark:text-red-400 text-lg">{submittedOrder.total.toLocaleString()}đ</span>
            </div>
          </div>

          {/* Items Accordion */}
          <div className="pt-4 border-t border-stone-50 dark:border-stone-800">
            <button 
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="w-full flex items-center justify-between text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Danh sách món ({submittedOrder.items.length})</span>
              <ChevronRight className={`w-4 h-4 ${isItemsExpanded ? 'rotate-90' : ''}`} />
            </button>
            
            {isItemsExpanded && (
              <div className="overflow-hidden">
                <div className="pt-4 space-y-3">
                  {submittedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-stone-800 dark:text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-stone-400 dark:text-stone-500">
                          {item.quantity}x • {item.temperature}
                          {item.size !== 'Tiêu chuẩn' && ` • Size ${item.size}`}
                        </p>
                      </div>
                      <span className="font-bold text-stone-600 dark:text-stone-400">{(item.unitPrice * item.quantity).toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => setShowInvoice(true)}
            className="w-full py-4 bg-stone-800 dark:bg-white text-white dark:text-black font-black rounded-2xl tap-active flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest text-xs"
          >
            <FileText className="w-4 h-4" />
            Xuất hóa đơn
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleEditOrder}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-[#B91C1C] dark:text-red-300 font-bold rounded-2xl tap-active flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Sửa đơn
            </button>
            <button
              onClick={handleCancelOrder}
              disabled={isSubmitting}
              className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl tap-active flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Hủy đơn
            </button>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleNewOrder}
              className="w-auto px-12 py-4 bg-[#C9252C] text-white font-black rounded-2xl tap-active shadow-xl shadow-red-100 dark:shadow-none flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Đặt đơn mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    // Use randomState which now includes cached AI messages, or fallback to static if AI disabled
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
            <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800 rounded-[24px] flex items-center justify-center text-4xl">
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

        {/* Saved Carts Section */}
        {savedCarts.length > 0 && (
          <div className="px-6 pb-32">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" />
                Đơn tạm đã lưu ({savedCarts.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {savedCarts.map((saved) => (
                <div 
                  key={saved.id}
                  className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-stone-50 dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-800 dark:text-white text-sm">{saved.name}</h4>
                      <p className="text-[10px] text-stone-400 font-medium">
                        {saved.items.length} món • {new Date(saved.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => deleteSavedCart(saved.id)}
                      className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => loadSavedCart(saved.id)}
                      className="px-4 py-2 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest tap-active"
                    >
                      Mở lại
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-72 bg-stone-50 dark:bg-black">
      <div className="p-3 space-y-3">
        {/* Cart Items Header */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-stone-800 dark:text-white font-black text-lg uppercase tracking-tighter">Giỏ hàng</h2>
              <span className="px-2 py-0.5 bg-[#C9252C]/10 text-[#C9252C] rounded-full text-[9px] font-black tracking-widest uppercase">{cart.length} món</span>
            </div>
            <div className="flex items-center gap-1">
              {savedCarts.length > 0 && (
                <button 
                  onClick={() => setShowSavedCarts(!showSavedCarts)}
                  className={`p-1.5 rounded-lg tap-active shadow-sm border ${showSavedCarts ? 'bg-stone-800 dark:bg-white text-white dark:text-black border-stone-800 dark:border-white' : 'bg-white dark:bg-stone-900 text-stone-400 border-stone-100 dark:border-stone-800'}`}
                >
                  <History className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={() => setShowClearConfirm(true)} 
                className="text-red-500 font-black text-[9px] uppercase tracking-widest tap-active bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded-lg flex items-center gap-1 border border-red-100/20 dark:border-red-900/20 shadow-sm"
              >
                <X className="w-3 h-3" />
                Làm trống
              </button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            {cart.map((item) => (
              <CartItemRow
                key={item.cartItemId}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onEdit={setEditingItem}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
        </section>

        {/* Collapsible Order Form */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-3 border border-stone-100 dark:border-stone-800 shadow-sm space-y-3">
          <button 
            onClick={() => setIsPaymentExpanded(!isPaymentExpanded)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-[#C9252C] rounded-xl flex items-center justify-center border border-red-100 dark:border-red-900/30 shadow-inner">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-stone-800 dark:text-white text-[11px] uppercase tracking-widest">Thông tin nhận món</h2>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${isPaymentExpanded ? 'rotate-90' : ''}`} />
          </button>
          
          {isPaymentExpanded && (
            <div className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={showCustomerDetails} 
                  onChange={() => setShowCustomerDetails(!showCustomerDetails)}
                  className="w-3 h-3 rounded border-stone-300 text-[#C9252C] focus:ring-[#C9252C]"
                />
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400">Hiển thị tên và SĐT</label>
              </div>
              
              {showCustomerDetails && (
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Tên khách hàng</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nhập tên..."
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 rounded-lg font-bold text-[11px] text-stone-800 dark:text-white border border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 shadow-inner outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="09xx..."
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 rounded-lg font-bold text-[11px] text-stone-800 dark:text-white border border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 shadow-inner outline-none"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-0.5">
                <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Số bàn / Vị trí <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Bàn 05"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 rounded-lg font-bold text-[11px] text-stone-800 dark:text-white border border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 shadow-inner outline-none"
                  required
                />
              </div>
              
              <div className="space-y-0.5">
                <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-1">Ghi chú</label>
                <textarea 
                  placeholder="Lời nhắn..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={1}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 rounded-lg text-[11px] font-bold text-stone-800 dark:text-white shadow-inner outline-none resize-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Price Breakdown */}
        <section className="bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 space-y-1.5 overflow-hidden">
          <button 
            onClick={() => setIsPriceExpanded(!isPriceExpanded)}
            className="w-full flex items-center justify-between p-3"
          >
             <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-xl flex items-center justify-center border border-stone-300 dark:border-stone-700">
                 <DollarSign className="w-4 h-4" />
               </div>
               <span className="text-[11px] font-black text-stone-800 dark:text-white uppercase tracking-widest">Thanh toán</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#C9252C]">{total.toLocaleString()}đ</span>
                <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${isPriceExpanded ? 'rotate-90' : ''}`} />
             </div>
          </button>
          
          {isPriceExpanded && (
            <div className="px-3 pb-3 space-y-1.5 pt-0">
              <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Tạm tính</span>
                <span className="text-[11px] font-black text-stone-600 dark:text-stone-300">{total.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Phí dịch vụ</span>
                <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Miễn phí</span>
              </div>
              <div className="h-px bg-stone-200 dark:bg-stone-800 my-1" />
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-stone-800 dark:text-white uppercase tracking-widest">Tổng cộng</span>
                <span className="text-sm font-black text-[#C9252C]">{total.toLocaleString()}đ</span>
              </div>
            </div>
          )}
        </section>
      </div>


      {submitStatus === 'error' && (
        <div className="px-3 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-[20px] flex items-center gap-3 border border-red-100 dark:border-red-900/30">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Sticky Footer Summary */}
      <div className="fixed bottom-16 left-0 right-0 p-5 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-stone-100/50 dark:border-stone-800/50 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] dark:shadow-none">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-5 px-2">
            <div className="relative">
              <p className="text-stone-400 dark:text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Tổng thanh toán</p>
              <div className="flex items-baseline gap-2">
                <p 
                  className="text-3xl font-black text-[#C9252C] tracking-tighter"
                >
                  {total.toLocaleString()}
                  <span className="text-sm align-top ml-1">đ</span>
                </p>
                {isSubmitting && (
                  <div>
                    <Sparkles className="w-4 h-4 text-red-400" />
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-stone-400 dark:text-stone-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1.5">Số lượng</p>
              <p 
                className="text-stone-800 dark:text-white font-black text-xl tracking-tight"
              >
                {cart.reduce((s, i) => s + i.quantity, 0)} món
              </p>
            </div>
          </div>
          <button
            onClick={handleOrder}
            disabled={isSubmitting || !customerName || cart.length === 0}
            className="w-full bg-[#C9252C] text-white py-5 rounded-[28px] font-black text-[15px] shadow-2xl shadow-red-200 dark:shadow-none tap-active flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale relative overflow-hidden uppercase tracking-[0.15em] group"
          >
            {isSubmitting ? (
              <div
                key="submitting"
                className="flex items-center gap-3"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Đang xử lý...</span>
              </div>
            ) : (
              <div
                key="idle"
                className="flex items-center gap-3"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>Xác nhận đặt đơn</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
          <div className="bg-white dark:bg-stone-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-stone-100 dark:border-stone-800">
            <h3 className="text-xl font-extrabold text-stone-800 dark:text-white mb-3">Xác nhận xóa hết?</h3>
            <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">Bạn có chắc chắn muốn xóa tất cả món trong giỏ hàng không?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-4 rounded-2xl font-bold text-stone-400 dark:text-stone-500 tap-active">Hủy</button>
              <button onClick={() => { clearCart(); setShowClearConfirm(false); }} className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-500 tap-active shadow-lg shadow-red-100 dark:shadow-none flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                Xóa hết
              </button>
            </div>
          </div>
        </div>
      )}

      {itemToRemove && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
          <div className="bg-white dark:bg-stone-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-stone-100 dark:border-stone-800">
            <h3 className="text-xl font-extrabold text-stone-800 dark:text-white mb-3">Xóa món này?</h3>
            <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">Bạn có chắc chắn muốn xóa <span className="font-bold text-stone-800 dark:text-white">{itemToRemove.name}</span> khỏi giỏ hàng?</p>
            <div className="flex gap-3">
              <button onClick={() => setItemToRemove(null)} className="flex-1 py-4 rounded-2xl font-bold text-stone-400 dark:text-stone-500 tap-active">Hủy</button>
              <button onClick={confirmRemoveItem} className="flex-1 py-4 rounded-2xl font-bold text-white bg-red-500 tap-active shadow-lg shadow-red-100 dark:shadow-none flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {editingItem && (
          <EditCartItemModal
            item={editingItem}
            onClose={() => setEditingItem(null)}
            onSave={(updated) => {
              updateCartItem(editingItem.cartItemId, updated);
              setEditingItem(null);
            }}
          />
        )}
      </AnimatePresence>

      {showInvoice && submittedOrder && (
        <Invoice 
          order={submittedOrder} 
          onClose={() => setShowInvoice(false)} 
        />
      )}

      {toast.visible && (
        <div 
          key="toast"
          className="fixed top-6 left-4 right-4 z-[100] flex justify-center pointer-events-none"
        >
          <div className="bg-white dark:bg-stone-900 text-stone-800 dark:text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-3 border border-stone-100 dark:border-stone-800 max-w-sm w-full pointer-events-auto">
            <div className="w-8 h-8 shrink-0 bg-[#C9252C] rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p 
                key={toast.message}
                className="text-[13px] font-bold truncate"
              >
                {toast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditCartItemModal({ item, onClose, onSave }: { item: CartItem; onClose: () => void; onSave: (item: CartItem) => void }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [temperature, setTemperature] = useState(item.temperature || 'Đá');
  const [sugarLevel, setSugarLevel] = useState(item.sugarLevel || 'Bình thường');
  const [iceLevel, setIceLevel] = useState(item.iceLevel || 'Bình thường');
  const [note, setNote] = useState(item.note || '');

  const unitPrice = item.price;
  const hasCustomizations = item.hasCustomizations !== false;

  const handleUpdateQty = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty < 1) return;
    if (delta > 0 && item.inventoryQty !== undefined && newQty > item.inventoryQty) {
      alert(`Chỉ còn ${item.inventoryQty} sản phẩm trong kho!`);
      return;
    }
    setQuantity(newQty);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-[60]"
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
          {hasCustomizations && (
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
          )}

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
              <button onClick={() => handleUpdateQty(-1)} className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 tap-active shadow-sm border border-stone-100 dark:border-stone-700"><Minus className="w-5 h-5" /></button>
              <span className="w-12 text-center font-black text-xl text-stone-800 dark:text-white">{quantity}</span>
              <button 
                onClick={() => handleUpdateQty(1)} 
                className="w-11 h-11 bg-white dark:bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 dark:text-stone-400 tap-active shadow-sm border border-stone-100 dark:border-stone-700"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Thành tiền</p>
              <p className="text-2xl font-black text-[#C9252C] tracking-tighter">{(unitPrice * quantity).toLocaleString()}đ</p>
            </div>
          </div>
          <button
            onClick={() => onSave({
              ...item,
              quantity,
              unitPrice,
              temperature: hasCustomizations ? temperature : undefined,
              sugarLevel: hasCustomizations ? sugarLevel : undefined,
              iceLevel: hasCustomizations ? (temperature === 'Đá' ? iceLevel : (temperature === 'Đá riêng' ? 'Bình thường' : undefined)) : undefined,
              note,
            })}
            className="w-full py-4.5 bg-[#C9252C] text-white font-black text-[15px] uppercase tracking-wider rounded-2xl tap-active shadow-[0_10px_30px_rgba(201,37,44,0.3)] dark:shadow-none flex items-center justify-center gap-3 hover:bg-red-700"
          >
            <Save className="w-5 h-5" />
            Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
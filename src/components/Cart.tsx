import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Plus, Minus, AlertCircle, Edit2, X, ShoppingBag, Clock, CheckCircle2, RefreshCw, ChevronRight, Sparkles, User, FileText, Save, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { CartItem, OrderData } from '../types';
import { SIZES, TOPPINGS } from './Menu';
import { useUI } from '../context/UIContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/NotificationService';
import { Invoice } from './Invoice';
import { GlobalQrModal } from './GlobalQrModal';
import { AddMenuSheet } from './AddMenuSheet';

import { useCart } from '../context/CartContext';
import { CartItemRow } from './CartItemRow';

const BRANCHES = [
  { id: 'chi-nhanh-1', label: 'Chi nhánh 1' },
  { id: 'chi-nhanh-2', label: 'Chi nhánh 2' },
  { id: 'chi-nhanh-3', label: 'Chi nhánh 3' },
];

interface CartProps {
  appsScriptUrl: string;
  onNavigateSettings: () => void;
}

export function Cart({ appsScriptUrl, onNavigateSettings }: CartProps) {
  const { setIsFabHidden, setPendingWorkLabel } = useUI();
  const { orders, createOrder, deleteOrder, fetchAllData, updateOrderStatus, lockOrder, unlockOrder } = useData();
  const { currentUser, isAdmin } = useAuth();
  const { cart, updateQuantity, updateCartItem, clearCart, restoreCart } = useCart();
  const [branchName, setBranchName] = useState('');
    const [tableNumber, setTableNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSubmitEnabled, setIsAutoSubmitEnabled] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<OrderData | null>(() => {
    try {
      const saved = localStorage.getItem('submittedOrder');
      return saved ? (JSON.parse(saved) || null) : null;
    } catch { return null; }
  });

  const savedCarts = useMemo(() => {
    return orders
      .filter(o => o.orderStatus === 'Nháp')
      .map(o => ({
        id: o.orderId,
        name: o.branchName || `Nháp ${o.orderId}`,
        items: o.items,
        timestamp: new Date(o.timestamp),
        context: { tableNumber: o.tableNumber, branch: BRANCHES.find(b => b.label === o.branchName)?.id || '', notes: o.notes },
        lockedBy: o.lockedBy
      }));
  }, [orders]);

  const [aiEmptyState, setAiEmptyState] = useState<{title: string, content: string, button: string, emoji: string} | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [showInvoice, setShowInvoice] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  // Persist across tab navigation (THÊM MÓN → Menu → back to Cart)
  // isAdmin guard: staff MUST NOT enter edit-bill mode
  const [editingOrderId, setEditingOrderId] = useState<string | null>(
    () => isAdmin ? (localStorage.getItem('editing_order_id') || null) : null
  );
  
  useEffect(() => {
    if (submittedOrder && submittedOrder.items) {
      setIsItemsExpanded((submittedOrder.items || []).length <= 3);
    }
  }, [submittedOrder]);

  // ─ Edit bill bridge (đến từ OrderHistory “Sửa bill”) ─────────
  useEffect(() => {
    if (!isAdmin) {
      // Staff: xóa mọi trạng thái edit bill còn sót của admin
      localStorage.removeItem('edit_bill_order');
      localStorage.removeItem('editing_order_id');
      localStorage.removeItem('editing_context');
      return;
    }
    const pendingEdit = localStorage.getItem('edit_bill_order');
    if (!pendingEdit) return;
    
    // Nếu đang sửa dở 1 bill khác mà lại bấm sửa bill mới -> unlock bill cũ
    const oldEditingId = localStorage.getItem('editing_order_id');
    if (oldEditingId) {
      unlockOrder(oldEditingId).catch(console.error);
    }
    
    try {
      const order = JSON.parse(pendingEdit);
      localStorage.removeItem('edit_bill_order');
      clearCart();
      restoreCart(order.items);
      setEditingOrderId(order.orderId);
      setTableNumber(order.tableNumber || '');
      setNotes((order as any).notes || '');
      const matchBranch = BRANCHES.find(b => b.label === order.branchName);
      if (matchBranch) setBranch(matchBranch.id);
    } catch (e) {
      console.error('edit_bill_order restore failed', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Báo cáo pending work lên UIContext để App.tsx có thể chặn nav ─────────
  useEffect(() => {
    if (editingOrderId) {
      setPendingWorkLabel(`đang sửa bill #${editingOrderId.slice(-6)}`);
    } else if ((cart || []).length > 0) {
      setPendingWorkLabel(`đang tạo đơn (${(cart || []).length} món)`);
    } else {
      setPendingWorkLabel(null);
    }
    return () => setPendingWorkLabel(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingOrderId, (cart || []).length]);

  // ─ Guard theo dõi isAdmin thay đổi (vd: admin logout → staff login mà Cart không remount) ─
  useEffect(() => {
    if (!isAdmin) {
      // Xóa ngay edit bill state để staff không thấy màn sửa bill của admin
      const oldEditingId = localStorage.getItem('editing_order_id') || editingOrderId;
      if (oldEditingId) {
        unlockOrder(oldEditingId).catch(console.error);
        setEditingOrderId(null);
        clearCart(); // cart đang chứa items của admin → clear
      }
      localStorage.removeItem('edit_bill_order');
      localStorage.removeItem('editing_order_id');
      localStorage.removeItem('editing_context');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]); // Re-runs whenever role changes

  // Restore tableNumber/branch/notes khi Cart remount ở chế độ sửa đơn
  useEffect(() => {
    if (!isAdmin) return; // Staff không có chế độ sửa đơn
    const id = localStorage.getItem('editing_order_id');
    if (!id || localStorage.getItem('edit_bill_order')) return; // let bridge handle it
    try {
      const ctx = JSON.parse(localStorage.getItem('editing_context') || '{}');
      if (ctx.tableNumber) setTableNumber(ctx.tableNumber);
      if (ctx.branch)      setBranch(ctx.branch);
      if (ctx.notes !== undefined) setNotes(ctx.notes);
      setEditingOrderId(id);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync editing context → localStorage bất cứ khi nào thay đổi
  useEffect(() => {
    if (editingOrderId) {
      localStorage.setItem('editing_order_id', editingOrderId);
      localStorage.setItem('editing_context', JSON.stringify({ tableNumber, branch, notes }));
    } else {
      localStorage.removeItem('editing_order_id');
      localStorage.removeItem('editing_context');
    }
  }, [editingOrderId, tableNumber, branch, notes]);
  const [isSaving, setIsSaving] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);


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
    return allMessages[Math.floor(Math.random() * (allMessages || []).length)];
  }, [(cart || []).length === 0]);

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
    const shouldCallAI = (aiMessages || []).length < 5 || Math.random() < 0.3;
    
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
          if ((randomItems || []).length > 0) {
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
    if ((cart || []).length === 0) {
      generateAIEmptyState();
    }
  }, [(cart || []).length]);

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

  // Direct order submit — payment happens separately by staff

  const doSubmitOrder = () => {
    if (!appsScriptUrl) { onNavigateSettings(); return; }
    if ((cart || []).length === 0) return;

    setSubmitStatus('idle');

    // Nếu đang sửa đơn → dùng orderId cũ để cập nhật, không tạo mới
    const ma_don = editingOrderId ?? `ORD-${Date.now().toString(36).toUpperCase()}`;
    const branchLabel = BRANCHES.find(b => b.id === branch)?.label || '';

    const orderData: OrderData = {
      orderId:       ma_don,
      branchName:  branchLabel,
            tableNumber,
      items:         cart,
      total,
      timestamp:     new Date().toISOString(),
      notes,
      paymentMethod: 'Chưa xác định',
      orderStatus:   editingOrderId
        ? (orders.find(o => o.orderId === editingOrderId)?.orderStatus ?? 'Chờ xử lý')
        : 'Chờ xử lý',
      paymentStatus: 'Chưa thanh toán',
      staffId:       currentUser?.id,
      staffName:     currentUser?.name,
    };

    // — Optimistic: hiện success ngay, sync Google Sheet ngầm sau —
    setSubmitStatus('success');
    showToast('Đặt đơn thành công!');
    notificationService.notifyNewOrder(orderData);
    clearCart();
    setBranchName('');
    setTableNumber('');
    setNotes('');
    setShowQrModal(false); // đóng QR modal nếu đang mở

    if (isAutoSubmitEnabled) {
      setSubmittedOrder(null);
      localStorage.removeItem('submittedOrder');
    } else {
      setSubmittedOrder(orderData);
      localStorage.setItem('submittedOrder', JSON.stringify(orderData));
    }

    // Fire-and-forget sync — không block UI
    createOrder(orderData, false).then(success => {
      if (!success) localStorage.setItem('sync_error', 'true');
      else localStorage.removeItem('sync_error');
    }).catch(() => {
      localStorage.setItem('sync_error', 'true');
    });

    // Xong → clear editingOrderId
    setEditingOrderId(null);
  };

  const handleOrder = () => {
    triggerVibrate([50, 30, 50]);
    if (!appsScriptUrl) { onNavigateSettings(); return; }
    if ((cart || []).length === 0) return;
    doSubmitOrder();
  };

  useEffect(() => {
    // Auto-close success screen when unmounting (switching tabs)
    return () => {
      setSubmittedOrder(null);
      localStorage.removeItem('submittedOrder');
    };
  }, []);


  // Hủy đơn — optimistic
  const handleCancelOrder = () => {
    if (!submittedOrder) return;
    // Hiện kết quả ngay
    showToast('Đã hủy đơn!');
    setSubmittedOrder(null);
    localStorage.removeItem('submittedOrder');
    clearCart();
    setEditingOrderId(null);
    setSubmitStatus('idle');
    // Sync ngầm
    updateOrderStatus(submittedOrder.orderId, 'Đã hủy').catch(() => {});
  };

  // Sửa đơn — giữ orderId gốc, quay về cart
  const handleEditOrder = () => {
    if (!submittedOrder) return;
    // Lưu orderId cũ để dùng lại khi submit
    setEditingOrderId(submittedOrder.orderId);
    // Khôi phục cart
    restoreCart(submittedOrder.items);
    setTableNumber(submittedOrder.tableNumber || '');
    setNotes((submittedOrder as any).notes || '');
    // Tìm lại branch từ branchName
    const matchBranch = BRANCHES.find(b => b.label === submittedOrder.branchName);
    if (matchBranch) setBranch(matchBranch.id);
    // Clear submitted order → hiện cart
    setSubmittedOrder(null);
    localStorage.removeItem('submittedOrder');
    setSubmitStatus('idle');
    // Sync hủy đơn cũ ngầm
    updateOrderStatus(submittedOrder.orderId, 'Đang sửa').catch(() => {});
  };

  // Đặt đơn mới — về tab Menu
  const handleNewOrder = () => {
    if (editingOrderId) {
      // Background unlock, no await needed
      unlockOrder(editingOrderId).catch(() => {});
    }
    setSubmittedOrder(null);
    localStorage.removeItem('submittedOrder');
    setSubmitStatus('idle');
    setEditingOrderId(null);
    clearCart();
    window.location.hash = '#/';
  };

  const handleSaveForLater = () => {
    if ((cart || []).length === 0) return;
    setIsSaving(true);
    
    const ctxName = tableNumber ? `Bàn ${tableNumber}` : branch ? (BRANCHES.find(b=>b.id===branch)?.label || '') : '';
    const finalName = ctxName || `Đơn lúc ${new Date().toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}`;
    const ma_don = editingOrderId ?? `DRF-${Date.now().toString(36).toUpperCase()}`;

    const orderData: OrderData = {
      orderId:       ma_don,
      branchName:  finalName,
            tableNumber,
      items:         cart,
      total,
      timestamp:     new Date().toISOString(),
      notes,
      paymentMethod: 'Chưa xác định',
      orderStatus:   'Nháp',
      paymentStatus: 'Chưa thanh toán',
      staffId:       currentUser?.id,
      staffName:     currentUser?.name,
    };

    createOrder(orderData, false).then(success => {
      setIsSaving(false);
      if (success) {
        showToast('Đã lưu nháp lên hệ thống!');
        clearCart();
        if (editingOrderId) unlockOrder(editingOrderId).catch(() => {});
        setEditingOrderId(null);
        setTableNumber('');
        setNotes('');
      } else {
        showToast('Có lỗi xảy ra khi lưu nháp.');
        clearCart();
        setEditingOrderId(null);
      }
    });
  };

    if (submittedOrder) {
    return (
      <div className="flex flex-col min-h-full pb-48 bg-stone-50 dark:bg-black">
        {/* Scrollable content */}
        <div className="flex-1 flex flex-col items-center px-5 pt-8 pb-4 text-center relative">
        {/* Close */}
        <button 
          onClick={handleNewOrder}
          className="absolute top-4 right-4 w-10 h-10 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center text-stone-500 tap-active"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title compact — bỏ icon lớn */}
        <div className="flex flex-col items-center mb-5">
          <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-widest">Xác nhận thành công</span>
          </span>
          <h2 className="text-2xl font-black text-stone-800 dark:text-white tracking-tight">{submittedOrder.orderId}</h2>
        </div>

        {/* Info Card */}
        <div className="w-full bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-sm border border-stone-100 dark:border-stone-800 text-left space-y-4 mb-6">
          {/* Status row */}
          <div className="flex justify-between items-center pb-3 border-b border-stone-50 dark:border-stone-800">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Trạng thái</span>
            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              submittedOrder.orderStatus === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
              submittedOrder.orderStatus === 'Đã hủy' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
              'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            }`}>
              {submittedOrder.orderStatus}
            </span>
          </div>

          <div className="space-y-3">
            {/* SĐT — chỉ hiện nếu có */}
            {submittedOrder.phoneNumber_unused && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Số điện thoại</span>
                <span className="font-bold text-stone-800 dark:text-white">{submittedOrder.phoneNumber_unused}</span>
              </div>
            )}
            {/* Bàn */}
            {submittedOrder.tableNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-400">Bàn số</span>
                <span className="font-bold text-stone-800 dark:text-white">{submittedOrder.tableNumber}</span>
              </div>
            )}
            {/* Thanh toán — đổi "Chưa xác định" → badge đẹp */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Thanh toán</span>
              {submittedOrder.paymentStatus === 'Đã thanh toán' ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã thanh toán
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs">
                  <Clock className="w-3.5 h-3.5" /> Chờ thanh toán
                </span>
              )}
            </div>
            {/* Tổng tiền */}
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-50 dark:border-stone-800">
              <span className="text-stone-400 text-sm">Tổng tiền</span>
              <span className="font-black text-[#C9252C] text-2xl tracking-tighter">{submittedOrder.total.toLocaleString()}<span className="text-sm">đ</span></span>
            </div>
          </div>

          {/* Items accordion */}
          <div className="pt-3 border-t border-stone-50 dark:border-stone-800">
            <button 
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="w-full flex items-center justify-between text-stone-400 dark:text-stone-500 hover:text-stone-600"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Danh sách món ({(submittedOrder?.items || []).length})</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${isItemsExpanded ? 'rotate-90' : ''}`} />
            </button>
            {isItemsExpanded && (
              <div className="pt-3 space-y-2.5">
                {submittedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-bold text-stone-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">
                        {item.quantity}x • {item.temperature}
                        {item.size !== 'Tiêu chuẩn' && ` • Size ${item.size}`}
                      </p>
                    </div>
                    <span className="font-bold text-stone-600 dark:text-stone-400">{(item.unitPrice * item.quantity).toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        </div>

        {/* Action bar — no void gap */}
        <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-stone-100/50 dark:border-stone-800/50 z-40 shadow-[0_-12px_30px_rgba(0,0,0,0.07)] dark:shadow-none">
          <div className="max-w-md mx-auto space-y-2">
            <button
              onClick={handleNewOrder}
              className="w-full py-3.5 bg-[#C9252C] text-white font-black rounded-2xl tap-active shadow-lg shadow-red-200 dark:shadow-none flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              <Plus className="w-4 h-4" />
              Đặt đơn mới
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleEditOrder}
                className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold rounded-xl tap-active flex items-center justify-center gap-1.5 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Sửa đơn
              </button>
              <button
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl tap-active flex items-center justify-center gap-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                Hủy đơn
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if ((cart || []).length === 0) {
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    // Use randomState which now includes cached AI messages, or fallback to static if AI disabled
    const displayState = isAIEnabled ? randomState : emptyStates[0];
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6 relative">
          <motion.div
            className="relative mb-6"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            <div className="w-24 h-24 bg-stone-100 dark:bg-stone-800 rounded-[28px] flex items-center justify-center text-5xl shadow-inner">
              {displayState.emoji}
            </div>
          </motion.div>
          <h2 className="text-2xl font-black text-stone-800 dark:text-white mb-2 text-center">{displayState.title}</h2>
          <p className="text-stone-500 dark:text-stone-400 mb-8 text-sm leading-relaxed max-w-xs mx-auto text-center">
            {displayState.content}
          </p>
          <div className="w-full max-w-[240px] flex justify-center">
            <button
              onClick={() => window.location.hash = '#/'}
              className="w-full py-3.5 bg-[#C9252C] text-white font-black rounded-2xl tap-active shadow-lg shadow-red-200/60 dark:shadow-none uppercase tracking-widest text-xs"
            >
              {displayState.button}
            </button>
          </div>
        </div>

        {/* Saved Carts Section */}
        {(savedCarts || []).length > 0 && (
          <div className="px-6 pb-32">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" />
                Đơn tạm đã lưu ({(savedCarts || []).length})
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
                        {(saved.items || []).length} món • {new Date(saved.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved.lockedBy && saved.lockedBy !== '' && saved.lockedBy !== (currentUser?.name || '') && (
                       <span className="text-[10px] text-amber-500 font-bold px-2">🔒 {saved.lockedBy} đang sửa</span>
                    )}
                    <button 
                      onClick={() => {
                        if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn đơn nháp này?')) {
                          deleteOrder(saved.id);
                        }
                      }}
                      className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (saved.lockedBy && saved.lockedBy !== '' && saved.lockedBy !== (currentUser?.name || '')) {
                          showToast(`Đơn đang được mở bởi ${saved.lockedBy}`);
                          return;
                        }
                        
                        // Nếu đang sửa đơn khác -> unlock đơn cũ
                        if (editingOrderId && editingOrderId !== saved.id) {
                          unlockOrder(editingOrderId).catch(console.error);
                        }
                        
                        showToast('Đang khoá đơn để sửa...');
                        const lres = await lockOrder(saved.id, currentUser?.name || 'Nhân viên');
                        if (!lres.success) {
                          showToast(lres.message || 'Lỗi khoá đơn, vui lòng thử lại');
                          return;
                        }

                        restoreCart(saved.items);
                        setEditingOrderId(saved.id);
                        if (saved.context) {
                          setTableNumber(saved.context.tableNumber || '');
                          setBranch(saved.context.branch || '');
                          setNotes(saved.context.notes || '');
                        }
                        showToast('Đã mở đơn nháp');
                      }}
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
    <div className="flex flex-col h-full bg-stone-50 dark:bg-black">
      {/* Editing mode banner — not scrollable */}
      {editingOrderId && (
        <div className="mx-3 mt-3 shrink-0 flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950 border border-amber-200/70 dark:border-amber-800/60 rounded-xl shadow-sm">
          <Edit2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            Đang sửa bill #{editingOrderId.slice(-8)}
          </span>
        </div>
      )}
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-52">
      <div className="p-3 space-y-3">
        {/* Cart Items Header */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#C9252C] text-white rounded-full text-[10px] font-black tracking-widest uppercase">{(cart || []).length} món</span>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleSaveForLater} 
                disabled={isSaving}
                className="text-amber-600 dark:text-amber-500 font-black text-[9px] uppercase tracking-widest tap-active bg-amber-50 dark:bg-amber-900/10 px-2 py-1.5 rounded-lg flex items-center gap-1 border border-amber-100/20 dark:border-amber-900/20 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Lưu tạm
              </button>
              <button
                onClick={() => editingOrderId ? setShowAddMenu(true) : (window.location.hash = '#/')}
                className="text-emerald-600 dark:text-emerald-400 font-black text-[9px] uppercase tracking-widest tap-active bg-emerald-50 dark:bg-emerald-900/10 px-2 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-100 dark:border-emerald-900/20 shadow-sm"
              >
                <Plus className="w-3 h-3" />
                Thêm món
              </button>
              <button 
                onClick={() => setShowClearConfirm(true)} 
                className="text-red-500 font-black text-[9px] uppercase tracking-widest tap-active bg-red-50 dark:bg-red-900/10 px-2 py-1.5 rounded-lg flex items-center gap-1 border border-red-100/20 dark:border-red-900/20 shadow-sm"
              >
                <X className="w-3 h-3" />
                Làm trống
              </button>
            </div>
          </div>
          
          <AnimatePresence mode="popLayout">
            {cart.map((item) => (
              <CartItemRow
                key={item.cartItemId}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onEdit={setEditingItem}
                onRemove={handleRemoveItem}
              />
            ))}
          </AnimatePresence>
        </section>

        {/* Order Form */}
        <section className="bg-white dark:bg-stone-900 rounded-2xl p-3 border border-stone-100 dark:border-stone-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 bg-red-50 dark:bg-red-900/20 text-[#C9252C] rounded-lg flex items-center justify-center border border-red-100 dark:border-red-900/30">
              <User className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-black text-stone-800 dark:text-white text-[11px] uppercase tracking-widest">Thông tin đặt món</h2>
          </div>

          <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
            {/* Chi nhánh */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-0.5">
                Chi nhánh <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                {BRANCHES.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBranch(b.id)}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] border transition-all ${
                      branch === b.id
                        ? 'bg-[#C9252C] text-white border-[#C9252C]'
                        : 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Số bàn */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-0.5">
                Số bàn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Bàn 05..."
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 rounded-lg font-bold text-[12px] text-stone-800 dark:text-white border border-transparent focus:border-[#C9252C]/30 focus:bg-white dark:focus:bg-stone-900 outline-none"
                required
              />
            </div>

            {/* Ghi chú */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest ml-0.5">Ghi chú</label>
              <textarea
                placeholder="Ghi chú thêm..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={1}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-transparent focus:border-[#C9252C]/20 focus:bg-white dark:focus:bg-stone-900 rounded-lg text-[11px] font-bold text-stone-800 dark:text-white outline-none resize-none"
              />
            </div>
          </div>
        </section>

        {/* Price Breakdown – always visible */}
        <section className="bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2">
            <span className="w-0.5 h-4 bg-[#C9252C] rounded-full" />
            <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">Tạm tính</span>
          </div>
          {/* Rows */}
          <div className="px-3 pb-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">Tạm tính</span>
              <span className="text-[12px] font-black text-stone-700 dark:text-stone-200">{total.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400">Phí dịch vụ</span>
              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Miễn phí</span>
            </div>
            <div className="h-px bg-stone-200 dark:bg-stone-800" />
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-black text-stone-800 dark:text-white uppercase tracking-widest">Tổng cộng</span>
              <span className="text-[14px] font-black text-[#C9252C]">{total.toLocaleString()}đ</span>
            </div>
          </div>
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
      </div>{/* end flex-1 scroll */}

      {/* Sticky Footer Summary */}
      <div className="fixed bottom-20 left-0 right-0 px-4 py-3 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border-t border-stone-100/50 dark:border-stone-800/50 z-40 shadow-[0_-12px_30px_rgba(0,0,0,0.07)] dark:shadow-none">
        <div className="max-w-md mx-auto space-y-2">
          {/* Amount row — always visible */}
          <div className="flex items-baseline gap-1">
            <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-none mr-1">Tổng tiền</p>
            <span className="text-2xl font-black text-[#C9252C] tracking-tighter leading-none">
              {total.toLocaleString()}
            </span>
            <span className="text-xs font-black text-[#C9252C]">đ</span>
            {isSubmitting && <Sparkles className="w-3 h-3 text-red-400 ml-1" />}
          </div>

          {/* Button row */}
          <div className="flex gap-2">
            {/* Hủy — chỉ edit mode */}
            {editingOrderId && (
              <button
                onClick={() => { 
                  if (editingOrderId) unlockOrder(editingOrderId).catch(() => {});
                  setEditingOrderId(null); 
                  clearCart(); 
                  window.location.hash = '#/history'; 
                }}
                className="flex-1 py-3.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-2xl font-black text-sm tap-active flex items-center justify-center gap-2 uppercase tracking-wider"
              >
                <X className="w-4 h-4" /> Hủy
              </button>
            )}

            {/* CTA — fills remaining space */}
            <button
              onClick={handleOrder}
              disabled={isSubmitting || !tableNumber || !branch || (cart || []).length === 0}
              className="flex-1 bg-[#C9252C] text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-red-200/60 dark:shadow-none tap-active flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale uppercase tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : !branch ? (
                <span className="text-xs font-bold normal-case tracking-normal opacity-80">Chọn chi nhánh</span>
              ) : !tableNumber ? (
                <span className="text-xs font-bold normal-case tracking-normal opacity-80">Nhập số bàn</span>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>{editingOrderId ? 'Lưu' : 'Đặt đơn'}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <GlobalQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />

      <AnimatePresence>
        {showAddMenu && (
          <AddMenuSheet
            onClose={() => setShowAddMenu(false)}
          />
        )}
      </AnimatePresence>

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
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(item.quantity);
  const [temperature, setTemperature] = useState(item.temperature || 'Đá');
  const [sugarLevel, setSugarLevel] = useState(item.sugarLevel || 'Bình thường');
  const [iceLevel, setIceLevel] = useState(item.iceLevel || 'Bình thường');
  const [note, setNote] = useState(item.note || '');
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitCount, setSplitCount] = useState(1);

  const unitPrice = item.price;
  const hasCustomizations = item.hasCustomizations !== false;

  // Detect if options actually changed compared to original
  const optionsChanged = hasCustomizations && (
    temperature !== (item.temperature || 'Đá') ||
    sugarLevel !== (item.sugarLevel || 'Bình thường') ||
    iceLevel !== (item.iceLevel || 'Bình thường') ||
    note !== (item.note || '')
  );

  const buildUpdatedItem = (qty: number, useNewOptions: boolean): CartItem => ({
    ...item,
    quantity: qty,
    unitPrice,
    temperature: hasCustomizations && useNewOptions ? temperature : item.temperature,
    sugarLevel: hasCustomizations && useNewOptions ? sugarLevel : item.sugarLevel,
    iceLevel: hasCustomizations && useNewOptions
      ? (temperature === 'Đá' ? iceLevel : (temperature === 'Đá riêng' ? 'Bình thường' : undefined))
      : item.iceLevel,
    note: useNewOptions ? note : item.note,
  });

  const handleSave = () => {
    // If options changed and qty > 1, ask how many to apply to
    if (optionsChanged && item.quantity > 1) {
      setSplitCount(1);
      setShowSplitDialog(true);
      return;
    }
    // No split needed: update quantity + options for entire entry
    onSave(buildUpdatedItem(quantity, true));
  };

  const handleSplitConfirm = () => {
    if (splitCount >= item.quantity) {
      // Apply to all
      onSave(buildUpdatedItem(item.quantity, true));
    } else {
      // Split: keep original qty-splitCount with old options
      onSave(buildUpdatedItem(item.quantity - splitCount, false));
      // Add new entry with splitCount and new options
      addToCart({
        ...buildUpdatedItem(splitCount, true),
        cartItemId: Math.random().toString(36).substr(2, 9),
      });
    }
    setShowSplitDialog(false);
  };

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
        
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-hide">
          {hasCustomizations && (
            <div className="space-y-4">
              <section>
                <h4 className="text-stone-400 dark:text-stone-500 font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-0.5 h-2.5 bg-[#C9252C] rounded-full"></span>
                  Nhiệt độ
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Nóng', 'Đá', 'Đá riêng'].map(temp => (
                    <button
                      key={temp}
                      onClick={() => setTemperature(temp)}
                      className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                        temperature === temp 
                          ? 'border-[#C9252C] bg-[#C9252C]/10 text-[#C9252C]' 
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      {temp}
                    </button>
                  ))}
                </div>
              </section>

              {(temperature === 'Đá') && (
                <section>
                  <h4 className="text-stone-400 dark:text-stone-500 font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-0.5 h-2.5 bg-[#C9252C] rounded-full"></span>
                    Lượng đá
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Ít', 'Vừa', 'Bình thường'].map(level => (
                      <button
                        key={level}
                        onClick={() => setIceLevel(level)}
                        className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                          iceLevel === level 
                            ? 'border-[#C9252C] bg-[#C9252C]/10 text-[#C9252C]' 
                            : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h4 className="text-stone-400 dark:text-stone-500 font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <span className="w-0.5 h-2.5 bg-[#C9252C] rounded-full"></span>
                  Lượng đường
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Ít ngọt', 'Vừa', 'Bình thường', 'Ngọt', 'Đường kiêng'].map(level => (
                    <button
                      key={level}
                      onClick={() => setSugarLevel(level === 'Đường kiêng' ? '1 gói đường kiêng' : level)}
                      className={`py-2.5 rounded-xl font-bold text-[12px] border tap-active transition-all ${
                        (level === 'Đường kiêng' ? sugarLevel === '1 gói đường kiêng' : sugarLevel === level)
                          ? 'border-[#C9252C] bg-[#C9252C]/10 text-[#C9252C]' 
                          : 'border-stone-100 dark:border-stone-800 text-stone-500 dark:text-stone-400'
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
            <h4 className="text-stone-400 dark:text-stone-500 font-black text-[9px] uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-0.5 h-2.5 bg-stone-300 dark:bg-stone-700 rounded-full"></span>
              Ghi chú
            </h4>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Không lấy ống hút, thêm nhiều đá..."
              className="w-full bg-stone-50 dark:bg-stone-900/30 border border-stone-100 dark:border-stone-800 px-3 py-2 rounded-xl resize-none text-[12px] font-medium focus:border-[#C9252C]/30 outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600"
              rows={1}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-xl p-0.5 border border-stone-100 dark:border-stone-800">
              <button onClick={() => handleUpdateQty(-1)} className="w-8 h-8 bg-white dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700"><Minus className="w-4 h-4" /></button>
              <span className="w-9 text-center font-black text-[16px] text-stone-800 dark:text-white">{quantity}</span>
              <button onClick={() => handleUpdateQty(1)} className="w-8 h-8 bg-white dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 tap-active shadow-sm border border-stone-100 dark:border-stone-700"><Plus className="w-4 h-4" /></button>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Thành tiền</p>
              <p className="text-xl font-black text-[#C9252C] tracking-tight">{(unitPrice * quantity).toLocaleString()}đ</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3.5 bg-[#C9252C] text-white font-black text-[14px] uppercase tracking-wider rounded-2xl tap-active shadow-lg flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Lưu thay đổi
          </button>
        </div>

        {/* Split dialog — slides up over footer when options changed */}
        <AnimatePresence>
          {showSplitDialog && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="absolute inset-x-0 bottom-0 bg-white dark:bg-stone-900 border-t-2 border-[#C9252C]/30 rounded-t-[32px] shadow-2xl px-6 pt-5 pb-6 z-10"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-0.5">Tùy chọn đã thay đổi</p>
                  <h3 className="text-[16px] font-black text-stone-800 dark:text-white">Áp dụng cho bao nhiêu ly?</h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">Tổng: <strong className="text-stone-700 dark:text-stone-300">{item.quantity} ly</strong></p>
                </div>
                <button onClick={() => setShowSplitDialog(false)} className="w-8 h-8 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center tap-active">
                  <X className="w-3.5 h-3.5 text-stone-500" />
                </button>
              </div>

              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-xl p-0.5 border border-stone-100 dark:border-stone-800">
                  <button
                    onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                    className="w-10 h-10 bg-white dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 tap-active border border-stone-100 dark:border-stone-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-black text-xl text-stone-800 dark:text-white">{splitCount}</span>
                  <button
                    onClick={() => setSplitCount(Math.min(item.quantity, splitCount + 1))}
                    className="w-10 h-10 bg-white dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-500 tap-active border border-stone-100 dark:border-stone-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-right">
                  {splitCount < item.quantity ? (
                    <div>
                      <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">Kết quả</p>
                      <p className="text-[12px] font-black text-stone-600 dark:text-stone-300">{item.quantity - splitCount} ly cũ · {splitCount} ly mới</p>
                    </div>
                  ) : (
                    <p className="text-[12px] font-black text-[#C9252C]">Áp dụng tất cả</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleSplitConfirm}
                className="w-full py-3.5 bg-[#C9252C] text-white font-black text-[13px] uppercase tracking-wider rounded-2xl tap-active shadow-lg shadow-red-200 dark:shadow-none"
              >
                {splitCount >= item.quantity ? 'Áp dụng tất cả' : `Tách ${splitCount} ly`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

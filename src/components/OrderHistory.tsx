import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock, Package, CreditCard, Check, X, Share2, Coffee,
  AlertCircle, ChevronRight, FileText, Sparkles, TrendingUp, Banknote, Edit2, Plus, Search,
} from 'lucide-react';

import { GoogleGenAI, Type } from "@google/genai";
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from './Invoice';
import { BackToTopFab } from './BackToTopFab';
import { GlobalQrModal } from './GlobalQrModal';
import { OrderItemSheet } from './OrderItemSheet';

// ─── types ────────────────────────────────────────────────────────────────────
interface OrderHistoryItem {
  orderId: string;
  branchName: string;
  
  timestamp: string;
  total: number;
  items: any[];
  orderStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  tableNumber?: string;
  hasAddedItems?: boolean;
  lockedBy?: string;
}


// ─── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  'Đang xử lý': {
    bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200/70 dark:border-orange-800/40',
    text: 'Đang xử lý',
    icon: <Clock className="w-3 h-3" />,
  },
  'Đang pha chế': {
    bg: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200/70 dark:border-blue-800/40',
    text: 'Đang pha',
    icon: <Coffee className="w-3 h-3" />,
  },
  'Hoàn thành': {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/40',
    text: 'Hoàn thành',
    icon: <Check className="w-3 h-3" />,
  },
  'Đã hủy': {
    bg: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200/70 dark:border-red-800/40',
    text: 'Đã hủy',
    icon: <X className="w-3 h-3" />,
  },
  'Chờ xử lý': {
    bg: 'bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border-stone-200/70 dark:border-stone-700',
    text: 'Chờ xử lý',
    icon: <Clock className="w-3 h-3" />,
  },
  'Công nợ': {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200/70 dark:border-yellow-800/40',
    text: 'Công nợ',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};
const getStatus = (s?: string) =>
  STATUS_CONFIG[s ?? ''] ?? {
    bg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200/70 dark:border-orange-800/40',
    text: s || 'Chờ xử lý',
    icon: <Clock className="w-3 h-3" />,
  };

const fmtTime = (ts: string) => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  index,
  isExpanded,
  onToggle,
  onUpdateStatus,
  onInvoice,
  isAdmin,
}: {
  order: OrderHistoryItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateStatus: (id: string, status: string, extra?: any) => void;
  onInvoice: (order: OrderHistoryItem) => void;
  isAdmin: boolean;
}) {
  const status = getStatus(order.orderStatus);
  const isDone = order.orderStatus === 'Hoàn thành' || order.orderStatus === 'Đã hủy';
  // isPendingPayment: đơn hoàn thành nhưng chưa thanh toán
  const isPendingPayment =
    (order.paymentStatus === 'Chờ thanh toán' || order.paymentStatus === 'Đã duyệt') &&
    order.orderStatus === 'Hoàn thành';
  const isApproved = order.paymentStatus === 'Đã duyệt';
  const isPaid = order.paymentStatus === 'Đã thanh toán';
  const isDebt = order.paymentStatus === 'Công nợ';

  const { menuItems, updateOrderStatus: updateOrderStatusCtx, lockOrder } = useData();
  const { currentUser } = useAuth();
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [showQrForPayment, setShowQrForPayment] = useState(false);
  const [showAdminPayChoice, setShowAdminPayChoice] = useState(false);
  const [showAdminQr, setShowAdminQr] = useState(false);
  // Unified: admin sees 2 tabs (thêm món + trong đơn), staff sees only thêm món
  const [showOrderSheet, setShowOrderSheet] = useState(false);

  const handleRequestPayment = (method: 'Tiền mặt' | 'Chuyển khoản') => {
    if (method === 'Chuyển khoản') {
      setShowPaymentChoice(false);
      setShowQrForPayment(true);
    } else {
      setShowPaymentChoice(false);
      onUpdateStatus(order.orderId, order.orderStatus || 'Hoàn thành', {
        paymentStatus: 'Chờ thanh toán',
        paymentMethod: 'Tiền mặt',
      });
    }
  };

  const handleConfirmTransfer = () => {
    setShowQrForPayment(false);
    onUpdateStatus(order.orderId, order.orderStatus || 'Hoàn thành', {
      paymentStatus: 'Chờ thanh toán',
      paymentMethod: 'Chuyển khoản',
    });
  };

  // Admin tự thu tiền (không cần staff bấm trước)
  const resolvedStatus = (s?: string) =>
    s === 'Chờ thanh toán' ? 'Hoàn thành' : (s || 'Hoàn thành');

  const handleAdminCollect = (method: 'Tiền mặt' | 'Chuyển khoản') => {
    if (method === 'Chuyển khoản') {
      setShowAdminPayChoice(false);
      setShowAdminQr(true);
    } else {
      setShowAdminPayChoice(false);
      onUpdateStatus(order.orderId, resolvedStatus(order.orderStatus), {
        paymentStatus: 'Đã thanh toán',
        paymentMethod: 'Tiền mặt',
      });
    }
  };

  const handleAdminConfirmQr = () => {
    setShowAdminQr(false);
    onUpdateStatus(order.orderId, resolvedStatus(order.orderStatus), {
      paymentStatus: 'Đã thanh toán',
      paymentMethod: 'Chuyển khoản',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3) }}
      className={`bg-white dark:bg-stone-900 rounded-2xl border overflow-hidden ${
        order.hasAddedItems
          ? 'border-emerald-400 dark:border-emerald-600 shadow-emerald-100 dark:shadow-emerald-900/20 shadow-md'
          : 'border-stone-100 dark:border-stone-800'
      }`}
    >
      {/* ── Header row ──────────────────────────────── */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* ID + time */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-black text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded-md tracking-widest uppercase border border-stone-100 dark:border-stone-700">
              #{order.orderId.slice(-8)}
            </span>
            {order.lockedBy && order.lockedBy !== '' && order.lockedBy !== (currentUser?.name || '') && (
              <span className="text-[9px] font-black text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md tracking-widest uppercase border border-amber-200/70 dark:border-amber-800/40">
                🔒 {order.lockedBy} sửa
              </span>
            )}
            <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 tracking-wide">
              {fmtTime(order.timestamp)}
            </span>
            {order.tableNumber && (
              <span className="text-[9px] font-black text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800 px-1.5 py-0.5 rounded-md border border-stone-100 dark:border-stone-700 uppercase tracking-widest">
                Bàn {order.tableNumber}
              </span>
            )}
          </div>
        </div>
        {/* Total + status + hasAddedItems badge */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <p className="text-[#C9252C] font-black text-base tracking-tighter leading-none">
            {order.total.toLocaleString()}<span className="text-xs">đ</span>
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${status.bg}`}>
            {status.icon}
            {status.text}
          </span>
          {order.hasAddedItems && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 animate-pulse">
              <Plus className="w-2.5 h-2.5" /> Thêm món
            </span>
          )}
        </div>
      </div>

      {/* ── Items: Admin → OrderItemSheet, Staff → dropdown ── */}
      <button
        onClick={isAdmin ? () => setShowOrderSheet(true) : onToggle}
        className="w-full mx-0 border-t border-stone-50 dark:border-stone-800 px-4 py-2 flex items-center justify-between tap-active"
      >
        <span className="text-[9px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">
          {(order.items || []).length} món
          {!isExpanded && (
            <span className="text-stone-300 dark:text-stone-600 ml-2 font-normal normal-case tracking-normal text-[9px]">
              {(order.items || []).slice(0, 2).map(i => i.name).join(', ')}{(order.items || []).length > 2 ? '...' : ''}
            </span>
          )}
        </span>
        <ChevronRight className={`w-3.5 h-3.5 text-stone-300 dark:text-stone-600 transition-transform duration-200 ${!isAdmin && isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {/* Staff inline dropdown (unchanged) */}
      {!isAdmin && (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 space-y-2 bg-stone-50/40 dark:bg-stone-950/30">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 py-1.5 border-b border-stone-100/60 dark:border-stone-800/50 last:border-0">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-lg bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 flex items-center justify-center text-[10px] font-black text-[#C9252C] flex-shrink-0 mt-0.5">
                        {item.quantity}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-[12px] text-stone-700 dark:text-stone-300 truncate">{item.name}</p>
                        {(item.temperature || item.sugarLevel || item.iceLevel) && (
                          <p className="text-[9px] text-stone-400 dark:text-stone-500 mt-0.5">
                            {[item.temperature, item.sugarLevel, item.iceLevel].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {item.size && item.size !== 'Tiêu chuẩn' && (
                      <span className="text-[8px] font-black text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                        {item.size}
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                      {((item.unitPrice || 0) * item.quantity).toLocaleString()}đ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* ── Unified OrderItemSheet (admin: 2 tabs, staff: thêm món only) ── */}
      <AnimatePresence>
        {showOrderSheet && (
          <OrderItemSheet
            order={order}
            menuItems={menuItems}
            onClose={() => setShowOrderSheet(false)}
            onSave={async (newItems, newTotal) => {
              const success = await updateOrderStatusCtx(order.orderId, order.orderStatus || 'Chờ xử lý', {
                items: newItems,
                total: newTotal,
                hasAddedItems: true,
              });
              return !!success;
            }}
          />
        )}
      </AnimatePresence>
      {/* ── Admin action buttons (chỉ khi đơn chưa xong hoặc đang chờ TT) ── */}
      {isAdmin && (
        <div className="px-3 pb-3">
          {/* ADMIN: Staff yêu cầu thanh toán, chờ duyệt */}
          {isPendingPayment && !isApproved && !isPaid && !isDebt && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest text-center">
                🔔 Staff yêu cầu thanh toán
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus(order.orderId, 'Hoàn thành', {
                    paymentStatus: 'Đã duyệt',
                  })}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  <Check className="w-3 h-3" /> Duyệt cho staff thu
                </button>
                <button
                  onClick={() => setShowAdminPayChoice(true)}
                  className="flex items-center justify-center px-3 py-2.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  Tự thu
                </button>
              </div>
            </div>
          )}

          {/* ADMIN: Đã duyệt, đợi staff thu */}
          {isApproved && !isPaid && !isDebt && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">
                ✅ Đã duyệt — đợi staff thu tiền
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateStatus(order.orderId, 'Hoàn thành', {
                    paymentStatus: 'Đã thanh toán', paymentMethod: 'Tiền mặt',
                  })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  💵 Tự thu TM
                </button>
                <button
                  onClick={() => setShowAdminQr(true)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  🏦 Tự thu CK
                </button>
              </div>
            </div>
          )}

          {/* Admin confirm QR transfer */}
          {isPendingPayment && !isPaid && !isDebt && showQrForPayment && (
            <div className="mt-1.5 space-y-1.5">
              <GlobalQrModal isOpen={showQrForPayment} onClose={() => setShowQrForPayment(false)} />
              <button
                onClick={handleConfirmTransfer}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
              >
                <Check className="w-3 h-3 inline mr-1" /> Xác nhận đã chuyển
              </button>
            </div>
          )}

          {/* Công nợ — Admin có thể thu sau */}
          {isDebt && isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => onUpdateStatus(order.orderId, 'Hoàn thành', {
                  paymentStatus: 'Đã thanh toán', paymentMethod: 'Tiền mặt',
                })}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
              >
                💵 Thu tiền mặt
              </button>
              <button
                onClick={() => onUpdateStatus(order.orderId, 'Hoàn thành', {
                  paymentStatus: 'Đã thanh toán', paymentMethod: 'Chuyển khoản',
                })}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/40 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
              >
                🏦 Đã chuyển khoản
              </button>
            </div>
          )}

          {/* ADMIN: đơn bình thường (chưa xong) — flow Đang xử lý → Đang pha chế → Hoàn thành */}
          {!isDone && !isPendingPayment && (
            <div className="flex gap-2">
              {/* Nút hành động chính */}
              {order.orderStatus !== 'Đang pha chế' && order.orderStatus !== 'Đang xử lý' && (
                <button
                  onClick={() => onUpdateStatus(order.orderId, 'Đang xử lý')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200/70 dark:border-orange-800/40 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  <Clock className="w-3 h-3" /> Nhận đơn
                </button>
              )}
              {order.orderStatus === 'Đang xử lý' && (
                <button
                  onClick={() => onUpdateStatus(order.orderId, 'Đang pha chế')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/40 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  <Coffee className="w-3 h-3" /> Bắt đầu pha
                </button>
              )}
              {order.orderStatus === 'Đang pha chế' && (
                <button
                  onClick={() => onUpdateStatus(order.orderId, 'Hoàn thành')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  <Check className="w-3 h-3" /> Hoàn tất
                </button>
              )}
              {/* Sửa bill — icon nhỏ gọn */}
              <button
                onClick={async () => {
                  if (order.lockedBy && order.lockedBy !== '' && order.lockedBy !== (currentUser?.name || '')) {
                    alert(`Đơn đang được mở bởi ${order.lockedBy}`);
                    return;
                  }
                  
                  // Optimistic lock
                  const lres = await lockOrder(order.orderId, currentUser?.name || 'Admin');
                  if (!lres.success) {
                    alert(lres.message || 'Lỗi khoá đơn. Vui lòng thử lại.');
                    return;
                  }
                  
                  localStorage.setItem('edit_bill_order', JSON.stringify(order));
                  window.location.hash = '#/cart';
                }}
                title="Sửa bill"
                className="flex items-center justify-center w-9 py-2 bg-stone-900/5 dark:bg-white/5 text-stone-400 dark:text-stone-500 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl tap-active hover:border-[#C9252C]/40 hover:text-[#C9252C] dark:hover:text-[#C9252C] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {/* Hủy đơn */}
              <button
                onClick={() => onUpdateStatus(order.orderId, 'Đã hủy')}
                className="flex items-center justify-center w-9 py-2 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200/70 dark:border-red-800/40 rounded-xl tap-active"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Admin Payment Choices UI - extracted out to be usable from multiple places */}
          {showAdminPayChoice && (
            <div className="flex gap-2">
              <button
                onClick={() => handleAdminCollect('Ti\u1ec1n m\u1eb7t')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-stone-700 dark:bg-stone-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
              >
                💵 Tiền mặt
              </button>
              <button
                onClick={() => handleAdminCollect('Chuy\u1ec3n kho\u1ea3n')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
              >
                🏦 CK
              </button>
              <button
                onClick={() => {
                  setShowAdminPayChoice(false);
                  onUpdateStatus(order.orderId, 'Ho\u00e0n th\u00e0nh', {
                    paymentStatus: 'C\u00f4ng n\u1ee3',
                    paymentMethod: 'C\u00f4ng n\u1ee3',
                  });
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
              >
                📋 Nợ
              </button>
              <button
                onClick={() => setShowAdminPayChoice(false)}
                className="flex items-center justify-center px-2.5 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl tap-active"
              >
                <X className="w-3 h-3 text-stone-400" />
              </button>
            </div>
          )}

          {/* ADMIN: Hoàn thành nhưng chưa thu tiền (và không phải công nợ, và isPendingPayment FALSE) */}
          {isDone && !isPaid && !isPendingPayment && !isDebt && order.orderStatus !== 'Đã hủy' && !showAdminPayChoice && (
            <button
              onClick={() => setShowAdminPayChoice(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active shadow-sm"
            >
              <Check className="w-3 h-3" /> Thu tiền
            </button>
          )}

        </div>
      )}

      {!isAdmin && (order.orderStatus === 'Đang làm' || order.orderStatus === 'Hoàn thành' || isPendingPayment) && !isPaid && !isDebt && (
        <div className="px-3 pb-3">
          {isApproved ? (
            /* Admin đã duyệt → Staff xác nhận hình thức thu và đánh dấu đã thu */
            showPaymentChoice ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPaymentChoice(false);
                    onUpdateStatus(order.orderId, 'Ho\u00e0n th\u00e0nh', {
                      paymentStatus: '\u0110\u00e3 thanh to\u00e1n',
                      paymentMethod: 'Ti\u1ec1n m\u1eb7t',
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-stone-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  💵 Tiền mặt
                </button>
                <button
                  onClick={() => { setShowPaymentChoice(false); setShowQrForPayment(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active"
                >
                  🏦 Chuyển khoản
                </button>
                <button
                  onClick={() => setShowPaymentChoice(false)}
                  className="flex items-center justify-center px-3 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl tap-active"
                >
                  <X className="w-3 h-3 text-stone-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPaymentChoice(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active shadow-sm"
              >
                <Banknote className="w-3 h-3" /> Xác nhận thanh toán
              </button>
            )
          ) : isPendingPayment ? (
            /* Đã gửi yêu cầu, đợi admin duyệt */
            <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-800/30">
              <Banknote className="w-3 h-3 text-violet-500" />
              <span className="text-[9px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest">Chờ admin duyệt</span>
            </div>
          ) : (
            <button
              onClick={() => onUpdateStatus(order.orderId, order.orderStatus || 'Ho\u00e0n th\u00e0nh', {
                paymentStatus: 'Ch\u1edd thanh to\u00e1n',
              })}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-violet-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest tap-active shadow-sm"
            >
              <Banknote className="w-3 h-3" /> Yêu cầu thanh toán
            </button>
          )}
        </div>
      )}


      {/* ── Footer: payment + invoice ───────────────── */}
      <div className="px-4 pb-3.5 flex items-center justify-between gap-2 border-t border-stone-50 dark:border-stone-800 pt-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <CreditCard className="w-3.5 h-3.5 text-stone-300 dark:text-stone-600" />
          <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
            {isDebt ? 'Chưa thanh toán' : (order.paymentMethod === 'Chưa xác định' ? '—' : order.paymentMethod)}
          </span>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
            isPaid
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/70 dark:border-emerald-800/40'
              : isDebt
              ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200/70 dark:border-yellow-800/40'
              : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200/70 dark:border-amber-800/40'
          }`}>
            {isPaid ? 'Đã TT' : isDebt ? 'Công nợ' : 'Chưa TT'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Nút thêm món — staff, chưa thanh toán, chưa hủy */}
          {!isAdmin && !isPaid && order.orderStatus !== 'Đã hủy' && (
            <button
              onClick={() => setShowOrderSheet(true)}
              className="w-8 h-8 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 rounded-xl tap-active transition-colors"
              title="Thêm món"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Nút công nợ nhỏ — chỉ hiện khi đơn Hoàn thành chưa thanh toán */}
          {isPendingPayment && !isPaid && !isDebt && isAdmin && (
            <button
              onClick={() => onUpdateStatus(order.orderId, 'Hoàn thành', {
                paymentStatus: 'Công nợ', paymentMethod: 'Công nợ',
              })}
              className="w-8 h-8 flex items-center justify-center bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 border border-yellow-200/70 dark:border-yellow-800/40 rounded-xl tap-active transition-colors"
              title="Ghi công nợ"
            >
              <AlertCircle className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onInvoice(order)}
            className="w-8 h-8 flex items-center justify-center bg-stone-50 dark:bg-stone-800 rounded-xl text-stone-400 hover:text-[#C9252C] dark:hover:text-[#C9252C] tap-active border border-stone-100 dark:border-stone-700 transition-colors flex-shrink-0"
            title="Xem hóa đơn"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* QR Modal — Admin tự thu tiền */}
      <GlobalQrModal
        isOpen={showAdminQr}
        onClose={() => setShowAdminQr(false)}
        amount={order.total}
        branchName={order.branchName}
        orderCode={order.orderId}
        onConfirm={handleAdminConfirmQr}
      />
      {/* QR Modal — mỗi card tự quản lý (staff) */}
      <GlobalQrModal
        isOpen={showQrForPayment}
        onClose={() => setShowQrForPayment(false)}
        amount={order.total}
        branchName={order.branchName}
        orderCode={order.orderId}
        onConfirm={handleConfirmTransfer}
      />
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function OrderHistory() {
  const { orders, menuItems, updateOrderStatus, fetchAllData } = useData();
  const { isAdmin } = useAuth();
  const { setIsFabHidden } = useUI();
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'success' | 'warning' }>({ message: '', visible: false });
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const prevStockStatus = useRef<Record<string, boolean>>({});

  // Reset FAB + fetch fresh data khi vào tab này
  useEffect(() => {
    setIsFabHidden(false);
    fetchAllData(false); // Đảm bảo admin thấy data mới nhất ngay khi mở tab
  }, []);

  // Stock alert
  useEffect(() => {
    const currentStatus: Record<string, boolean> = {};
    menuItems.forEach(item => {
      const isOOS = item.isOutOfStock || (item.inventoryQty !== undefined && item.inventoryQty <= 0);
      if (prevStockStatus.current[item.id] === false && isOOS) {
        setToast({ message: `"${item.name}" vừa hết hàng!`, visible: true, type: 'warning' });
        setTimeout(() => setToast(p => ({ ...p, visible: false })), 5000);
      }
      currentStatus[item.id] = isOOS;
    });
    prevStockStatus.current = currentStatus;
  }, [menuItems]);

  // AI empty state
  const emptyStates = [
    { title: 'Chưa có ly nào!', content: 'Lịch sử trống trơn. Barista đang chờ!', button: 'Đặt ly đầu tiên', emoji: '🥤' },
    { title: 'Ký ức trống rỗng...', content: 'Hãy tạo ra kỷ niệm ngọt ngào bằng một ly trà sữa!', button: 'Tạo kỷ niệm', emoji: '💭' },
    { title: "Thánh 'nhịn' uống?", content: 'Mau order một ly nước mát lạnh nào!', button: 'Giải khát ngay', emoji: '🌵' },
    { title: 'Buồn so...', content: 'Nhìn lịch sử trống mà lòng quán buồn so.', button: 'Làm quán vui ngay', emoji: '😢' },
  ];

  const randomState = useMemo(() => {
    try {
      const cached = localStorage.getItem('ai_history_messages');
      const aiMessages = cached ? (JSON.parse(cached) || []) : [];
      const all = [...emptyStates, ...aiMessages];
      return all[Math.floor(Math.random() * (all || []).length)];
    } catch {
      return emptyStates[Math.floor(Math.random() * (emptyStates || []).length)];
    }
  }, [(orders || []).length === 0]);

  const generateAIEmptyState = async () => {
    if (isGeneratingAI || localStorage.getItem('ai_history_error_time')) return;
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    if (!isAIEnabled) return;
    
    setIsGeneratingAI(true);
    try {
      const cached = localStorage.getItem('ai_history_messages');
      const aiMessages = cached ? (JSON.parse(cached) || []) : [];
      if ((aiMessages || []).length >= 5 && Math.random() >= 0.3) {
        setIsGeneratingAI(false);
        return;
      }
      
      const availableItems = menuItems.filter(i => !i.isOutOfStock).map(i => i.name);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tạo 1 thông báo lịch sử đơn hàng trống cho app quán nước. GenZ, ngắn gọn. Tiêu đề <25 ký tự, Nội dung <80 ký tự. JSON: title, content, button, emoji. Gợi ý món: ${availableItems.slice(0, 5).join(', ')}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, button: { type: Type.STRING }, emoji: { type: Type.STRING } }, required: ['title','content','button','emoji'] }
        }
      });
      const result = JSON.parse(response.text || '{}');
      if (result.title && result.content) {
        const isDuplicate = aiMessages.some((m: any) => m.title === result.title);
        if (!isDuplicate) {
          localStorage.setItem('ai_history_messages', JSON.stringify([result, ...aiMessages].slice(0, 20)));
        }
      }
    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('quota')) {
        localStorage.setItem('ai_history_error_time', Date.now().toString());
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  useEffect(() => { if ((orders || []).length === 0) generateAIEmptyState(); }, [(orders || []).length]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders
      .filter(order => {
        const d = new Date(order.timestamp);
        // Staff: luôn chỉ hôm nay, không cho đổi filter
        if (!isAdmin) return d.toDateString() === now.toDateString();
        if (timeRange === 'day')   return d.toDateString() === now.toDateString();
        if (timeRange === 'week')  return d >= new Date(now.getTime() - 7 * 86400000);
        if (timeRange === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (timeRange === 'year')  return d.getFullYear() === now.getFullYear();
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, timeRange, isAdmin]);

  const stats = useMemo(() => {
    const completed = filteredOrders.filter(o => o.orderStatus === 'Hoàn thành');
    // Cần xử lý = chưa xong HOẶC xong nhưng chưa thanh toán (không tính Đã hủy và Công nợ)
    const pending = filteredOrders.filter(o =>
      o.orderStatus !== 'Đã hủy' &&
      (o.orderStatus !== 'Hoàn thành' || (o.paymentStatus !== 'Đã thanh toán' && o.paymentStatus !== 'Công nợ'))
    );
    const revenue = completed.reduce((s, o) => s + o.total, 0);
    return { total: (filteredOrders || []).length, completed: (completed || []).length, pending: (pending || []).length, revenue };
  }, [filteredOrders]);

  const displayOrders = useMemo(() => {
    if (statusFilter === 'completed') return filteredOrders.filter(o => o.orderStatus === 'Hoàn thành');
    if (statusFilter === 'pending')   return filteredOrders.filter(o =>
      o.orderStatus !== 'Đã hủy' &&
      (o.orderStatus !== 'Hoàn thành' || (o.paymentStatus !== 'Đã thanh toán' && o.paymentStatus !== 'Công nợ'))
    );
    return filteredOrders;
  }, [filteredOrders, statusFilter]);

  // ── Empty global state ───────────────────────────
  if (!orders || (orders || []).length === 0) {
    const isAIEnabled = localStorage.getItem('enableAI') !== 'false';
    const ds = isAIEnabled ? randomState : emptyStates[0];
    return (
      <div className="flex flex-col h-full items-center justify-center text-center px-6">
        <div className="relative mb-6">
          <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800 rounded-[24px] flex items-center justify-center text-4xl shadow-sm">
            {ds.emoji}
          </div>
          {isAIEnabled && <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-black" />}
        </div>
        <h2 className="text-xl font-black text-stone-800 dark:text-white mb-2">{ds.title}</h2>
        <p className="text-stone-400 dark:text-stone-500 text-sm leading-relaxed max-w-xs mb-8">{ds.content}</p>
        <button
          onClick={() => window.location.hash = '#/'}
          className="py-3.5 px-8 bg-[#C9252C] text-white font-black rounded-2xl tap-active shadow-lg shadow-red-200/60 dark:shadow-none uppercase tracking-widest text-xs"
        >
          {ds.button}
        </button>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────
  return (
    <div className="flex flex-col pb-24 bg-stone-50 dark:bg-black min-h-full">
      {/* Time filter — admin: tùy chọn; staff: cố định hôm nay */}
      <div className="sticky top-0 z-20 bg-stone-50 dark:bg-black">
      {isAdmin ? (
        <div className="flex gap-1.5 overflow-x-auto px-4 pt-5 pb-3 no-scrollbar">
          {([
            { id: 'day',   label: 'Hôm nay' },
            { id: 'week',  label: 'Tuần này' },
            { id: 'month', label: 'Tháng này' },
            { id: 'year',  label: 'Năm nay' },
          ] as const).map(r => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest tap-active transition-all ${
                timeRange === r.id
                  ? 'bg-[#C9252C] text-white shadow-lg shadow-red-900/20 scale-105'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 pt-5 pb-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
          <span className="text-[10px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest">Đơn hôm nay</span>
          {stats.pending > 0 && (
            <span className="ml-auto text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/30">{stats.pending} chờ</span>
          )}
        </div>
      )}
      </div>

      {/* Stats — chỉ admin thấy doanh thu */}
      {isAdmin && (filteredOrders || []).length > 0 && (
        <div className="mx-4 mb-3 grid grid-cols-3 gap-2">
          {/* Đơn xong — filter button */}
          <button
            onClick={() => setStatusFilter(f => f === 'completed' ? 'all' : 'completed')}
            className={`rounded-2xl p-3 border text-center transition-all tap-active ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-900/20'
                : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
            }`}
          >
            <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
              statusFilter === 'completed' ? 'text-emerald-100' : 'text-stone-400 dark:text-stone-500'
            }`}>Đơn xong</p>
            <p className={`text-lg font-black leading-none ${
              statusFilter === 'completed' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
            }`}>{stats.completed}</p>
          </button>
          {/* Đang chờ — filter button */}
          <button
            onClick={() => setStatusFilter(f => f === 'pending' ? 'all' : 'pending')}
            className={`rounded-2xl p-3 border text-center transition-all tap-active ${
              statusFilter === 'pending'
                ? 'bg-amber-500 border-amber-400 shadow-lg shadow-amber-900/20'
                : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'
            }`}
          >
            <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${
              statusFilter === 'pending' ? 'text-amber-100' : 'text-stone-400 dark:text-stone-500'
            }`}>Cần xử lý</p>
            <p className={`text-lg font-black leading-none ${
              statusFilter === 'pending' ? 'text-white' : stats.pending > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'
            }`}>{stats.pending}</p>
          </button>
          {/* Doanh thu — static */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-3 border border-stone-100 dark:border-stone-800 text-center">
            <p className="text-[8px] font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-0.5">Doanh thu</p>
            <p className="text-[13px] font-black text-[#C9252C] leading-none">{(stats.revenue / 1000).toFixed(0)}K</p>
          </div>
        </div>
      )}

      {/* Order list */}
      <div className="flex flex-col gap-3 px-4">
        <AnimatePresence mode="popLayout">
          {(displayOrders || []).length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <div className="w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mb-4 text-stone-300 dark:text-stone-600">
                <Package className="w-8 h-8" />
              </div>
              <p className="font-black text-stone-400 dark:text-stone-500 text-sm">Không có đơn nào</p>
              <p className="text-stone-300 dark:text-stone-600 text-xs mt-1">trong khoảng thời gian này</p>
            </motion.div>
          ) : (
            displayOrders.map((order, i) => (
              <OrderCard
                key={order.orderId}
                order={order as OrderHistoryItem}
                index={i}
                isExpanded={expandedOrderId === order.orderId}
                onToggle={() => setExpandedOrderId(prev => prev === order.orderId ? null : order.orderId)}
                onUpdateStatus={updateOrderStatus}
                onInvoice={setSelectedOrderForInvoice}
                isAdmin={isAdmin}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Invoice modal */}
      {selectedOrderForInvoice && (
        <Invoice order={selectedOrderForInvoice} onClose={() => setSelectedOrderForInvoice(null)} />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast.visible && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-24 left-4 right-4 z-[60]"
          >
            <div className={`flex items-center justify-between px-4 py-3 rounded-2xl shadow-xl border border-white/10 ${
              toast.type === 'warning'
                ? 'bg-orange-500 text-white'
                : 'bg-stone-900 dark:bg-white text-white dark:text-black'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${toast.type === 'warning' ? 'bg-white/20' : 'bg-[#C9252C]'}`}>
                  {toast.type === 'warning' ? <AlertCircle className="w-3.5 h-3.5 text-white" /> : <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-sm font-bold">{toast.message}</span>
              </div>
              <button onClick={() => setToast(p => ({ ...p, visible: false }))} className="opacity-60 tap-active">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <BackToTopFab />
    </div>
  );
}

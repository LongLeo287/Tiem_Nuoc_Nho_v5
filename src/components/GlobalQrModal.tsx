import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { MOMO, TIMO } from '../config/shopConfig';
import { buildTimoQr, buildMomoQr } from '../utils/qrUtils';

interface GlobalQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount?: number;
  onConfirm?: () => void;
  customerName?: string;
  orderCode?: string;
}

type BankKey = 'momo' | 'timo';

const QR_API = (data: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=500x500&ecc=M&margin=8&data=${encodeURIComponent(data)}`;

/**
 * GlobalQrModal — ZERO-SCROLL layout (fit vừa iPhone SE 375×667).
 *
 * Chiều cao ước tính:
 *   Drag handle  : 16px
 *   Tab          : 44px
 *   QR block     : 16+168+16 = 200px
 *   Info card    : ~96px
 *   Divider      : 1px
 *   Actions      : ~148px
 *   ──────────────────────
 *   Tổng         : ~505px  ✓ (< 560px safe area)
 */
export function GlobalQrModal({ isOpen, onClose, amount, onConfirm, customerName, orderCode }: GlobalQrModalProps) {
  const [activeTab, setActiveTab] = useState<BankKey>('timo');
  const [timoQrUrl, setTimoQrUrl] = useState('');
  const [momoQrUrl, setMomoQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [zoomedQr, setZoomedQr] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const desc = [customerName, orderCode].filter(Boolean).join('_').slice(0, 25);
    setTimoQrUrl(QR_API(buildTimoQr(TIMO.baseQrString, amount && amount > 0 ? amount : undefined, desc || undefined)));
    setMomoQrUrl(QR_API(buildMomoQr(MOMO.baseQrString, amount && amount > 0 ? amount : undefined, desc || undefined)));
  }, [amount, isOpen, customerName, orderCode]);

  const handleCopyMomo = async () => {
    await navigator.clipboard.writeText(MOMO.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const activeQrUrl = activeTab === 'timo' ? timoQrUrl : momoQrUrl;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

        <div
          className="relative w-full max-w-sm mx-auto bg-white dark:bg-stone-950 rounded-t-[28px] sm:rounded-[28px] shadow-2xl z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* ① Drag handle */}
          <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-3 mb-2 sm:hidden" />

          {/* ② Tab Timo / MoMo */}
          <div className="px-4 pb-2">
            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-2xl gap-1">
              {(['timo', 'momo'] as BankKey[]).map(key => {
                const b = key === 'timo' ? TIMO : MOMO;
                const on = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key)}
                    className={`flex-1 py-1.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${on ? 'text-white shadow-sm' : 'text-stone-500 dark:text-stone-400'}`}
                    style={on ? { backgroundColor: b.color } : {}}
                  >
                    <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black text-white shrink-0"
                      style={{ backgroundColor: b.color, opacity: on ? 0.85 : 1 }}>
                      {key === 'timo' ? 'Ti' : 'M'}
                    </span>
                    {key === 'timo' ? 'Timo' : 'MoMo'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ③ QR — 200px, tap để phóng to (không hiện hint text) */}
          <div className="bg-white rounded-[20px] mx-3 mb-2 py-3 flex justify-center">
            <button
              className="flex flex-col items-center active:scale-[0.97] transition-transform cursor-zoom-in"
              onClick={() => activeQrUrl && setZoomedQr(activeQrUrl)}
              aria-label="Phóng to mã QR"
            >
              {activeTab === 'timo' ? (
                timoQrUrl
                  ? <img src={timoQrUrl} alt="QR Timo" className="w-[200px] h-[200px] block" style={{ imageRendering: 'pixelated' }} />
                  : <div className="w-[200px] h-[200px] flex items-center justify-center"><div className="w-7 h-7 border-4 border-stone-200 border-t-stone-500 rounded-full animate-spin" /></div>
              ) : (
                momoQrUrl
                  ? <img src={momoQrUrl} alt="QR MoMo" className="w-[200px] h-[200px] block" style={{ imageRendering: 'pixelated' }} />
                  : <div className="w-[200px] h-[200px] flex items-center justify-center"><div className="w-7 h-7 border-4 border-stone-200 border-t-[#A50064] rounded-full animate-spin" /></div>
              )}
            </button>
          </div>

          {/* ④ Info card — text lớn hơn */}
          {activeTab === 'timo' ? (
            <div className="mx-3 mb-2 px-3 py-2.5 rounded-2xl border border-[#6F3CD7]/20" style={{ background: 'linear-gradient(135deg,rgba(111,60,215,.06),rgba(111,60,215,.12))' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0" style={{ backgroundColor: '#6F3CD7' }}>Ti</div>
                <div><p className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none">Ngân hàng</p><p className="text-xs font-black text-stone-800 dark:text-white leading-tight">Timo · BVBANK</p></div>
              </div>
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Số tài khoản</p>
              <p className="text-xl font-black text-stone-900 dark:text-white tracking-wider leading-tight mb-0.5">{TIMO.account}</p>
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Chủ tài khoản</p>
              <p className="text-xs font-black text-stone-700 dark:text-stone-200">{TIMO.ownerName}</p>
            </div>
          ) : (
            <div className="mx-3 mb-2 px-3 py-2.5 rounded-2xl border border-[#A50064]/20" style={{ background: 'linear-gradient(135deg,rgba(165,0,100,.06),rgba(165,0,100,.12))' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0" style={{ backgroundColor: '#A50064' }}>M</div>
                <div><p className="text-[8px] font-black text-stone-400 uppercase tracking-widest leading-none">Ví điện tử</p><p className="text-xs font-black text-stone-800 dark:text-white leading-tight">MoMo</p></div>
              </div>
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Số điện thoại</p>
              <div className="flex items-center justify-between mb-0.5">
                <p className="text-xl font-black text-stone-900 dark:text-white tracking-wider leading-tight">{MOMO.phone}</p>
                <button onClick={handleCopyMomo} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black transition-all"
                  style={{ background: copied ? '#A50064' : 'rgba(165,0,100,.12)', color: copied ? '#fff' : '#A50064' }}>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Đã copy' : 'Copy'}
                </button>
              </div>
              <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-0.5">Tên</p>
              <p className="text-xs font-black text-stone-700 dark:text-stone-200">{MOMO.ownerName}</p>
            </div>
          )}

          {/* ⑤ Actions — text lớn hơn */}
          <div className="px-4 pt-2 pb-4 space-y-2 shrink-0 border-t border-stone-100 dark:border-stone-800">
            {(customerName || orderCode) && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Nội dung CK</span>
                <span className="text-xs font-black text-stone-700 dark:text-stone-200 truncate max-w-[190px] text-right">
                  {[customerName, orderCode].filter(Boolean).join('_')}
                </span>
              </div>
            )}
            {onConfirm && amount && amount > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30">
                <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Cần thanh toán</span>
                <span className="text-lg font-black text-[#C9252C] tracking-tighter">{amount.toLocaleString('vi-VN')}đ</span>
              </div>
            )}
            {onConfirm && (
              <button onClick={onConfirm} className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                ✅ Xác nhận đã chuyển tiền
              </button>
            )}
            <button onClick={onClose} className="w-full py-2 text-stone-400 dark:text-stone-500 text-xs font-black uppercase tracking-widest">
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* ── Fullscreen QR Zoom Overlay ── */}
      {zoomedQr && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setZoomedQr(null)}
        >
          <div className="flex flex-col items-center gap-4" style={{ animation: 'qrZoomIn 0.18s ease-out' }}>
            <div className="bg-white rounded-[28px] p-4 shadow-2xl">
              <img src={zoomedQr} alt="QR phóng to" className="w-[min(88vw,440px)] h-[min(88vw,440px)] block" style={{ imageRendering: 'pixelated' }} />
            </div>
            <p className="text-white/60 text-xs font-black uppercase tracking-widest">Chạm để đóng</p>
          </div>
          <style>{`@keyframes qrZoomIn{from{opacity:0;transform:scale(.75)}to{opacity:1;transform:scale(1)}}`}</style>
        </div>
      )}
    </>
  );
}

import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { useReactToPrint } from 'react-to-print';
import { Share2, Download, X, Coffee, Printer, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { SHOP } from '../config/shopConfig';

interface InvoiceProps {
  order: any;
  onClose: () => void;
}

export const Invoice: React.FC<InvoiceProps> = ({ order, onClose }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Native OS print hook (React-To-Print creates an isolated iframe with copied CSS)
  const handleNativePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `hoadon-${order.orderId}`
  });

  // Print state
  const [printState, setPrintState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [printMsg, setPrintMsg]     = useState('');

  // Get IPs from settings
  const printerIp = localStorage.getItem('printerIp') || '';
  const hardwareProxyUrl = localStorage.getItem('hardwareProxyUrl') || 'http://localhost:3000';

  // --- Thermal print via server.ts /api/print ---
  const handleThermalPrint = async () => {
    if (!printerIp) {
      setPrintState('error');
      setPrintMsg('Vui lòng vào Cài đặt để cấu hình IP máy in');
      setTimeout(() => setPrintState('idle'), 4000);
      return;
    }

    setPrintState('loading');
    setPrintMsg('');

    try {
      const res = await fetch(`${hardwareProxyUrl}/api/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIp,
          printerPort: 9100,
          order,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPrintState('success');
        setPrintMsg(data.message || 'Đã gửi lệnh in nền!');
        setTimeout(() => setPrintState('idle'), 2500);
      } else {
        throw new Error(data.error || 'Lỗi không xác định');
      }
    } catch (err: any) {
      // Thất bại khi gửi lệnh API (do chưa chạy server.ts hoặc sai IP máy con)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setPrintMsg(`Lỗi Cò mồi: Không kết nối được Proxy ${hardwareProxyUrl}! Vui lòng gõ npx tsx server.ts`);
        setPrintState('error');
      } else {
        setPrintState('error');
        setPrintMsg(err.message || 'Không kết nối được máy in');
      }
      setTimeout(() => setPrintState('idle'), 4000);
    }
  };

  const handleShare = async () => {
    if (invoiceRef.current === null) return;
    try {
      const dataUrl = await toPng(invoiceRef.current, {
        cacheBust: true,
        backgroundColor: '#fff',
        pixelRatio: 2,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `invoice-${order.orderId}.png`, { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: `Hóa đơn ${order.orderId}` });
      } else {
        const link = document.createElement('a');
        link.download = `invoice-${order.orderId}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Error sharing invoice:', err);
    }
  };

  const handleDownload = async () => {
    if (invoiceRef.current === null) return;
    try {
      const dataUrl = await toPng(invoiceRef.current, { cacheBust: true, backgroundColor: '#fff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `invoice-${order.orderId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading invoice:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; size: 80mm auto; }
        }
      ` }} />

      <div className="bg-white dark:bg-stone-900 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl print:shadow-none print:rounded-none print:max-w-none relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-stone-100/80 dark:bg-stone-800/80 rounded-full text-stone-500 tap-active print:hidden backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Print status bar */}
        {printState !== 'idle' && (
          <div className={`mx-4 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold print:hidden
            ${printState === 'loading' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : ''}
            ${printState === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300' : ''}
            ${printState === 'error'   ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300' : ''}
          `}>
            {printState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
            {printState === 'success' && <CheckCircle className="w-4 h-4" />}
            {printState === 'error'   && <AlertCircle className="w-4 h-4" />}
            {printState === 'loading' ? 'Đang gửi lệnh in...' : printMsg}
          </div>
        )}

        {/* Invoice Content */}
        <div className="p-4 overflow-y-auto max-h-[75vh] sm:max-h-[65vh] print:max-h-none print:overflow-visible print:p-0">
          <div id="printable-invoice" ref={invoiceRef} className="bg-white p-6 text-stone-800 font-sans print:p-2 print:border-none print:shadow-none">
            <div className="text-center mb-6 border-b-2 border-dashed border-stone-200 pb-6">
              <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-14 h-14 object-contain rounded-2xl"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fb = target.nextElementSibling as HTMLElement;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
                <div style={{ display: 'none' }} className="w-12 h-12 bg-red-50 text-[#C9252C] rounded-2xl flex items-center justify-center">
                  <Coffee className="w-6 h-6" />
                </div>
              </div>
              <h1 className="text-xl font-black uppercase tracking-tighter mb-1">
                {SHOP.name.toUpperCase()}
              </h1>
              {order.branchName && order.branchName !== SHOP.name && (
                <p className="text-[10px] text-stone-500 font-bold">{order.branchName}</p>
              )}
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Hóa đơn thanh toán</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-400 font-bold uppercase tracking-widest">Mã đơn</span>
                <span className="font-black">#{order.orderId}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-stone-400 font-bold uppercase tracking-widest">Ngày đặt</span>
                <span className="font-bold">{new Date(order.timestamp).toLocaleString('vi-VN')}</span>
              </div>
              {order.tableNumber && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-stone-400 font-bold uppercase tracking-widest">Số bàn</span>
                  <span className="font-bold">{order.tableNumber}</span>
                </div>
              )}
            </div>

            <div className="border-t border-b border-dashed border-stone-200 py-4 mb-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] text-stone-400 font-black uppercase tracking-widest">
                    <th className="pb-2">Món</th>
                    <th className="pb-2 text-center">SL</th>
                    <th className="pb-2 text-right">Tiền</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                  {order.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-[8px] text-stone-400 font-medium">
                            {item.temperature}{item.iceLevel ? `, ${item.iceLevel} đá` : ''}{item.sugarLevel ? `, ${item.sugarLevel} đường` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{(item.unitPrice * item.quantity).toLocaleString()}đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-black">
                <span>TỔNG CỘNG</span>
                <span className="text-[#C9252C]">{order.total.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                <span>Thanh toán</span>
                <span>{order.paymentMethod}</span>
              </div>
            </div>

            <div className="mt-8 text-center border-t-2 border-dashed border-stone-200 pt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Cảm ơn quý khách!</p>
              <p className="text-[8px] text-stone-300 mt-1 italic">Hẹn gặp lại bạn lần sau</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 bg-stone-50 dark:bg-stone-800/50 flex flex-wrap sm:flex-nowrap gap-2.5 print-hidden">
          {/* Share */}
          <button
            onClick={handleShare}
            className="w-full sm:flex-1 py-3.5 bg-[#C9252C] text-white font-black rounded-2xl tap-active flex items-center justify-center gap-2 shadow-lg shadow-red-100 dark:shadow-none uppercase tracking-widest text-[10px]"
          >
            <Share2 className="w-4 h-4" /> Chia sẻ
          </button>

          <div className="flex w-full sm:w-auto gap-2.5">
            {/* Native OS Print */}
            <button
              onClick={() => handleNativePrint()}
              className="flex-1 sm:w-16 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center tap-active border border-blue-200 dark:border-blue-800/50"
              title="In thông qua Chrome/Safari/AirPrint"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Thermal Print */}
            <button
              onClick={handleThermalPrint}
              disabled={printState === 'loading'}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center tap-active border transition-colors
                ${printerIp
                  ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 border-stone-700 dark:border-stone-200'
                  : 'bg-white dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700'
                }
                ${printState === 'loading' ? 'opacity-60' : ''}
              `}
              title={printerIp ? `In nhiệt LAN via Cò mồi — ${printerIp}:9100` : 'Chưa cấu hình IP máy in'}
            >
              {printState === 'loading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Printer className="w-4 h-4" />
              }
              {printerIp && printState === 'idle' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-stone-800" />
              )}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-12 h-12 bg-white dark:bg-stone-800 text-stone-400 rounded-2xl flex items-center justify-center tap-active border border-stone-200 dark:border-stone-700"
              title="Tải về PNG"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

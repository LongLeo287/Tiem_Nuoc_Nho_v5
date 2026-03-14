import React, { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface QuickTransactionFormProps {
  onSuccess: () => void;
}

export function QuickTransactionForm({ onSuccess }: QuickTransactionFormProps) {
  const { addSoTay } = useData();
  const { currentUser } = useAuth();
  const [type, setType] = useState<'Thu' | 'Chi'>('Chi');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Khác');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = type === 'Thu' 
    ? ['Bán hàng', 'Vốn', 'Khác'] 
    : ['Nguyên liệu', 'Tiền điện/nước', 'Mặt bằng', 'Lương', 'Khác'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const success = await addSoTay({
        phan_loai: type,
        danh_muc: category,
        so_tien: Number(amount),
        ghi_chu: note,
        nguoi_tao: currentUser?.name || 'Ẩn danh'
      });

      if (success) {
        onSuccess();
      } else {
        alert('Lỗi khi lưu giao dịch');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl">
        <button
          type="button"
          onClick={() => { setType('Chi'); setCategory('Khác'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${type === 'Chi' ? 'bg-white dark:bg-stone-700 text-red-600 shadow-sm' : 'text-stone-400'}`}
        >
          <ArrowDownRight className="w-4 h-4" />
          CHI TIỀN
        </button>
        <button
          type="button"
          onClick={() => { setType('Thu'); setCategory('Khác'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${type === 'Thu' ? 'bg-white dark:bg-stone-700 text-emerald-600 shadow-sm' : 'text-stone-400'}`}
        >
          <ArrowUpRight className="w-4 h-4" />
          THU TIỀN
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Số tiền (VNĐ)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl text-xl font-black text-stone-800 dark:text-white focus:ring-2 focus:ring-[#C9252C]/20 outline-none transition-all"
              required
              autoFocus
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 font-black">đ</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Danh mục</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl text-sm font-bold text-stone-800 dark:text-white outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Ghi chú</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ghi chú..."
            className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 rounded-2xl text-sm font-medium text-stone-800 dark:text-white outline-none min-h-[80px] resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !amount}
        className="w-full py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-stone-900/10 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            ĐANG LƯU...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4" />
            XÁC NHẬN
          </>
        )}
      </button>
    </form>
  );
}

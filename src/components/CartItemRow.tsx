import React, { memo } from 'react';
import { ShoppingBag, Minus, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem } from '../types';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (item: CartItem, delta: number) => void;
  onEdit: (item: CartItem) => void;
  onRemove: (item: CartItem) => void;
}

export const CartItemRow = memo(({ item, onUpdateQuantity, onEdit, onRemove }: CartItemRowProps) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm flex items-start gap-3 group hover:shadow-md transition-shadow"
    >
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex justify-between items-start mb-1.5">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-stone-800 dark:text-white text-xs truncate pr-2 tracking-tight leading-tight uppercase">{item.name}</h3>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-[7px] font-black uppercase tracking-widest border border-stone-200/50 dark:border-stone-700/50">{item.size}</span>
              <span className="px-1 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-md text-[7px] font-black uppercase tracking-widest border border-stone-200/50 dark:border-stone-700/50">{item.temperature}</span>
              {item.toppings.length > 0 && (
                <span className="px-1 py-0.5 bg-red-50 dark:bg-red-900/10 text-[#C9252C] rounded-md text-[7px] font-black uppercase tracking-widest border border-red-100/20 dark:border-red-900/20">+{item.toppings.length} Topping</span>
              )}
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="font-black text-[#C9252C] text-xs tracking-tight">{(item.unitPrice * item.quantity).toLocaleString()}đ</span>
            {item.quantity > 1 && (
              <span className="text-[8px] font-bold text-stone-400 dark:text-stone-500 mt-0.5">{item.unitPrice.toLocaleString()}đ</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center bg-stone-100 dark:bg-stone-950 rounded-lg p-0.5 border border-stone-200 dark:border-stone-800 shadow-inner">
            <button 
              onClick={() => onUpdateQuantity(item, -1)}
              className="w-6 h-6 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:text-[#C9252C] tap-active bg-white dark:bg-stone-900 rounded-md shadow-sm border border-stone-100 dark:border-stone-700 transition-all active:scale-90"
            >
              <Minus className="w-3 h-3" />
            </button>
            <motion.span 
              key={item.quantity}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-6 text-center font-black text-stone-800 dark:text-white text-xs tracking-tighter"
            >
              {item.quantity}
            </motion.span>
            <button 
              onClick={() => onUpdateQuantity(item, 1)}
              className="w-6 h-6 flex items-center justify-center text-stone-600 dark:text-stone-400 hover:text-[#C9252C] tap-active bg-white dark:bg-stone-900 rounded-md shadow-sm border border-stone-100 dark:border-stone-700 transition-all active:scale-90"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => onEdit(item)}
              className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-800 dark:hover:text-white tap-active bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-100 dark:border-stone-700 transition-all active:scale-90"
              title="Chỉnh sửa"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onRemove(item)}
              className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-white tap-active bg-red-50 dark:bg-red-900/20 hover:bg-red-500 dark:hover:bg-red-600 rounded-lg border border-red-100 dark:border-red-900/30 transition-all active:scale-90 shadow-sm"
              title="Xóa khỏi giỏ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prev, next) => {
  return (
    prev.item.quantity === next.item.quantity &&
    prev.item.name === next.item.name &&
    prev.item.unitPrice === next.item.unitPrice &&
    prev.item.size === next.item.size &&
    prev.item.temperature === next.item.temperature &&
    prev.item.toppings.length === next.item.toppings.length
  );
});

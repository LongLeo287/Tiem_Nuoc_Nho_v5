import React, { memo } from 'react';
import { Minus, Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CartItem } from '../types';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (item: CartItem, delta: number) => void;
  onEdit: (item: CartItem) => void;
  onRemove: (item: CartItem) => void;
}

export const CartItemRow = memo(({ item, onUpdateQuantity, onEdit, onRemove }: CartItemRowProps) => {
  const note = (item as any).note;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="bg-white dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800 overflow-hidden"
    >
      {/* Row 1: qty badge + name + price */}
      <div className="flex items-center gap-2 px-2.5 pt-2.5 pb-1">
        {/* Quantity badge */}
        <div className="w-5 h-5 bg-[#C9252C] rounded-md flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-white leading-none">{item.quantity}</span>
        </div>

        {/* Name */}
        <p className="flex-1 min-w-0 font-black text-stone-800 dark:text-white text-[13px] tracking-tight truncate">
          {item.name}
        </p>

        {/* Total price */}
        <span className="font-black text-[#C9252C] text-[13px] tracking-tight shrink-0">
          {(item.unitPrice * item.quantity).toLocaleString()}đ
        </span>
      </div>

      {/* Row 2: tags/note + stepper + actions */}
      <div className="flex items-center gap-2 px-2.5 pb-2">
        {/* Tags / note */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
          {item.temperature && (
            <span className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded text-[8px] font-black uppercase tracking-wide shrink-0">
              {item.temperature}
            </span>
          )}
          {item.size && item.size !== 'Tiêu chuẩn' && (
            <span className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded text-[8px] font-black uppercase tracking-wide shrink-0">
              {item.size}
            </span>
          )}
          {note && (
            <span className="text-[9px] text-amber-500 dark:text-amber-400 font-medium italic truncate">
              {note}
            </span>
          )}
          {item.quantity > 1 && (
            <span className="text-[8px] text-stone-400 dark:text-stone-500 font-medium shrink-0">
              {item.unitPrice.toLocaleString()}đ × {item.quantity}
            </span>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center bg-stone-50 dark:bg-stone-950 rounded-lg border border-stone-100 dark:border-stone-800 shrink-0">
          <button
            onClick={() => onUpdateQuantity(item, -1)}
            className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-[#C9252C] tap-active transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <motion.span
            key={item.quantity}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-6 text-center font-black text-stone-800 dark:text-white text-xs"
          >
            {item.quantity}
          </motion.span>
          <button
            onClick={() => onUpdateQuantity(item, 1)}
            className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-[#C9252C] tap-active transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(item)}
            className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-white tap-active bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-100 dark:border-stone-700 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => onRemove(item)}
            className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-white tap-active bg-red-50 dark:bg-red-900/20 hover:bg-red-500 dark:hover:bg-red-600 rounded-lg border border-red-100/50 dark:border-red-900/20 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
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
    prev.item.toppings?.length === next.item.toppings?.length
  );
});
